    // Les animations de duel ne concernent que deux voisins dont l'un peut
    // réellement capturer l'autre selon les règles légales des échecs.
    // Pour chaque pièce, l'adversaire le plus proche ; à distance égale, le plus fort
    nearestFoes(board) {
      const STRENGTH = { q: 9, r: 5, b: 3.2, n: 3, k: 4, p: 1 };
      const out = new Map();
      for (let a = 0; a < 64; a++) {
        const pa = board[a];
        if (!pa) continue;
        const white = pa === pa.toUpperCase();
        let best = -1, bestD = Infinity, bestS = -1;
        for (let b = 0; b < 64; b++) {
          const pb = board[b];
          if (!pb || (pb === pb.toUpperCase()) === white) continue;
          const dr = (a >> 3) - (b >> 3), df = (a & 7) - (b & 7), d = dr * dr + df * df;
          const st = STRENGTH[pb.toLowerCase()] || 0;
          if (d < bestD || (d === bestD && st > bestS)) { best = b; bestD = d; bestS = st; }
        }
        if (best >= 0) out.set(a, best);
      }
      return out;
    }

    captureFoes(board) {
      const foes = new Map(), chess = root.Chess;
      if (!chess || !chess.legalMoves) return foes;
      for (const turn of ['w', 'b']) {
        const state = { board, turn, castling: '', ep: -1, half: 0, full: 1 };
        for (const move of chess.legalMoves(state)) {
          if (!move.captured) continue;
          const dr = Math.abs((move.from >> 3) - (move.to >> 3));
          const df = Math.abs((move.from & 7) - (move.to & 7));
          if (Math.max(dr, df) !== 1) continue; // les animations restent limitées aux voisins
          if (!foes.has(move.from)) foes.set(move.from, move.to);
          if (!foes.has(move.to)) foes.set(move.to, move.from);
        }
      }
      return foes;
    }

    // Identifie toutes les pièces qui attaquent effectivement le roi en échec.
    checkersOf(board, kingSq) {
      if (kingSq == null || kingSq < 0 || !board[kingSq] || !root.Chess) return [];
      const turn = board[kingSq] === board[kingSq].toUpperCase() ? 'b' : 'w';
      const state = { board, turn, castling: '', ep: -1, half: 0, full: 1 };
      return [...new Set(root.Chess.pseudoMoves(state).filter((m) => m.to === kingSq).map((m) => m.from))];
    }

    // Crée une chaîne persistante seulement lorsque la configuration d'échec change.
    setCheckChains(board, kingSq) {
      const checkers = this.checkersOf(board, kingSq);
      const key = checkers.length ? `${kingSq}:${checkers.join(',')}` : '';
      if (key === this.checkKey) return;
      this.checkKey = key; this.checkGroup.clear(); this.checkLinks = [];
      if (!key) return;
      const disk = new this.THREE.Mesh(this.checkDiskGeo, this.checkMat);
      disk.rotation.x = -Math.PI / 2; disk.renderOrder = 3; this.checkGroup.add(disk);
      this.checkLinks.push({ disk, kingSq });
      for (const checkerSq of checkers) {
        // le même disque noir sous la pièce qui donne l'échec, et le trait qui relie les deux disques
        const cd = new this.THREE.Mesh(this.checkDiskGeo, this.checkMat);
        cd.rotation.x = -Math.PI / 2; cd.renderOrder = 3; this.checkGroup.add(cd);
        this.checkLinks.push({ disk: cd, kingSq: checkerSq });
        const line = new this.THREE.Mesh(this.checkLineGeo, this.checkMat);
        line.rotation.x = -Math.PI / 2; line.renderOrder = 3; this.checkGroup.add(line);
        this.checkLinks.push({ line, checkerSq, kingSq });
      }
    }

    // Suit les deux pièces pendant leurs déplacements et relie le roi à son assaillant.
    drawCheckChains() {
      // le roi en échec et la pièce qui le menace se font face, même de loin
      for (const c of this.chars.values()) c.faceTarget = null;
      for (const link of this.checkLinks) {
        const king = this.chars.get(link.kingSq);
        if (link.disk) {
          link.disk.visible = !!king;
          if (king) { link.disk.position.set(king.holder.position.x, 0.045, king.holder.position.z); link.disk.scale.setScalar(1 + Math.sin(performance.now() / 180) * 0.04); }
          continue;
        }
        const attacker = this.chars.get(link.checkerSq);
        if (!attacker || !king) { link.line.visible = false; continue; }
        link.line.visible = true;
        const a = attacker.holder.position, b = king.holder.position;
        attacker.faceTarget = { x: b.x, z: b.z }; king.faceTarget = { x: a.x, z: a.z };
        const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
        // trait au sol, d'un disque à l'autre
        link.line.scale.set(Math.max(0.01, len - 0.98), 1, 1);
        const mid = 0.5;
        link.line.position.set(a.x + dx * mid, 0.044, a.z + dz * mid);
        link.line.rotation.z = -Math.atan2(dz, dx);
      }
    }

    // Deux tours du même camp, alignées sans rien entre elles, sont reliées par un fil de feu
    // Deux pièces identiques du même camp sont liées quand elles se protègent l'une l'autre
    // (ligne libre pour les tours, les dames et les fous, saut pour les cavaliers) ou quand elles se touchent
    findRopes(board) {
      const pairs = [];
      const lineClear = (a, b, step) => { for (let s = a + step; s !== b; s += step) if (board[s]) return false; return true; };
      // Pions : ceux des colonnes qui se suivent forment un îlot et sont liés, quelle que soit leur rangée.
      for (const pawn of ['P', 'p']) {
        const files = Array.from({ length: 8 }, () => []);
        for (let i = 0; i < 64; i++) if (board[i] === pawn) files[i & 7].push(i);
        for (let f = 0; f < 8; f++) {
          if (!files[f].length) continue;
          // chaque pion est relié à un pion de la colonne voisine de droite (l'îlot entier est ainsi lié)
          if (f < 7 && files[f + 1].length) for (const a of files[f]) pairs.push([a, files[f + 1][0]]);
        }
      }
      for (const piece of ['R', 'r', 'Q', 'q', 'B', 'b', 'N', 'n']) {
        const kind = piece.toLowerCase(), sqs = [];
        for (let i = 0; i < 64; i++) if (board[i] === piece) sqs.push(i);
        for (let i = 0; i < sqs.length; i++) for (let j = i + 1; j < sqs.length; j++) {
          const a = sqs[i], b = sqs[j], dr = (b >> 3) - (a >> 3), df = (b & 7) - (a & 7);
          const adjacent = Math.max(Math.abs(dr), Math.abs(df)) === 1;
          let linked = adjacent;
          if (!linked && kind === 'n') linked = (Math.abs(dr) === 1 && Math.abs(df) === 2) || (Math.abs(dr) === 2 && Math.abs(df) === 1);
          const straight = dr === 0 || df === 0, diagonal = Math.abs(dr) === Math.abs(df);
          if (!linked && (kind === 'r' || kind === 'q') && straight) linked = lineClear(a, b, dr === 0 ? Math.sign(df) : 8 * Math.sign(dr));
          if (!linked && (kind === 'b' || kind === 'q') && diagonal) linked = lineClear(a, b, 8 * Math.sign(dr) + Math.sign(df));
          if (linked) pairs.push([a, b]);
        }
      }
      return pairs;
    }

    // Pièces liées : un cercle à leurs pieds qui s'élargit en boucle
    drawRopes(t) {
      const T = this.THREE;
      if (!this.ropeGroup) {
        this.ropeGroup = new T.Group(); this.scene.add(this.ropeGroup);
        this.ropeCore = new T.MeshBasicMaterial({ color: 0xfff1a8 });
        this.ropeFire = new T.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false });
      }
      for (const m of this.ropeGroup.children) if (!m.userData.shared) m.geometry.dispose();
      this.ropeGroup.clear();
      if (!this.auraMat) {
        // halo lumineux posé au sol : anneau doux qui s'estompe vers l'extérieur
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const cx = cv.getContext('2d'), g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.45, 'rgba(255,255,255,0.55)'); g.addColorStop(0.62, 'rgba(255,255,255,1)');
        g.addColorStop(0.72, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
        const tex = new T.CanvasTexture(cv);
        const haloMat = (color) => new T.MeshBasicMaterial({ color, map: tex, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
        this.auraMat = { w: haloMat(0xffd36a), b: haloMat(0xb36bff),
          rw: new T.MeshBasicMaterial({ color: 0xfff0b8, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }),
          rb: new T.MeshBasicMaterial({ color: 0xd9b3ff, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }) };
        this.haloGeo = new T.PlaneGeometry(1.15, 1.15);
        this.auraRing = new T.RingGeometry(0.39, 0.44, 48);
      }
      const pulse = 0.6 + Math.abs(Math.sin(t * 2.6)) * 0.4;
      this.auraMat.w.opacity = pulse; this.auraMat.b.opacity = pulse;
      this.auraMat.rw.opacity = this.auraMat.rb.opacity = 0.35 + Math.abs(Math.sin(t * 2.6)) * 0.45;
      const glowing = new Set();
      // pièces liées : un cercle à leurs pieds qui s'élargit en boucle (une fois arrivées sur leur case)
      for (const [a, b] of this.ropes || []) {
        const ca = this.chars.get(a), cb = this.chars.get(b);
        if (!ca || !cb || ca.anim || cb.anim) continue;
        for (const [c, sq] of [[ca, a], [cb, b]]) {
          if (glowing.has(c)) continue;
          glowing.add(c);
          const white = c.piece === c.piece.toUpperCase(), p = c.holder.position;
          const ring = new T.Mesh(this.auraRing, white ? this.auraMat.rw : this.auraMat.rb);
          ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.026, p.z);
          ring.scale.setScalar(0.8 + ((t * 0.6 + sq * 0.13) % 1) * 0.6); ring.userData.shared = true; // onde qui s'élargit
          this.ropeGroup.add(ring);
        }
      }
    }

    // Object3D.clone() sérialise userData en JSON : la référence circulaire userData.char le ferait planter
    cloneClean(obj) {
      const saved = [];
      obj.traverse((o) => { if (o.userData && o.userData.char) { saved.push([o, o.userData.char]); delete o.userData.char; } });
      try { return obj.clone(); }
      finally { saved.forEach(([o, ch]) => { o.userData.char = ch; }); }
    }

    // Changement de thème des personnages : on les recrée tous au prochain affichage
    // Voûte d'énergie : un roi roqué, à l'abri derrière ses trois pions encore en place, est protégé
    // par un dôme lumineux ; dès que le roque est brisé (un pion du bouclier part ou le roi sort), la voûte éclate.
    sheltered(board, white) {
      const k = board.indexOf(white ? 'K' : 'k');
      if (k < 0) return -1;
      const row = k >> 3, file = k & 7, home = white ? 7 : 0, step = white ? -1 : 1;
      if (row !== home || (file > 2 && file < 6)) return -1; // roi resté au centre : pas de roque
      const files = file >= 6 ? [5, 6, 7] : [0, 1, 2];
      const pawn = white ? 'P' : 'p';
      for (const f of files) if (board[(home + step) * 8 + f] !== pawn && board[(home + 2 * step) * 8 + f] !== pawn) return -1;
      return k;
    }
    updateVaults(board, animate) {
      const T = this.THREE, now = this.now();
      this.vaults = this.vaults || {};
      for (const white of [true, false]) {
        const key = white ? 'w' : 'b', sq = board ? this.sheltered(board, white) : -1, v = this.vaults[key];
        if (sq >= 0 && v && v.sq === sq) continue;
        if (v) { // la voûte éclate (roque brisé) ou suit le roi
          const old = v.g; v.breakAt = now; this.vaults[key] = null;
          const dur = animate ? 0.6 : 0.01;
          this.addEffect({ start: now, dur, tick: (e) => { const k = e / dur; old.scale.setScalar(1 + k * 0.6); old.children.forEach((m) => { m.material.opacity = m.userData.base * (1 - k); }); }, end: () => { this.scene.remove(old); old.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); } });
        }
        if (sq < 0) continue;
        const color = white ? 0x7fd8ff : 0xc77dff, p = this.sqToPos(sq), g = new T.Group();
        g.position.set(p.x, 0, p.z);
        const dome = new T.Mesh(new T.SphereGeometry(0.7, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        const grid = new T.Mesh(new T.SphereGeometry(0.71, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false }));
        const ring = new T.Mesh(new T.RingGeometry(0.66, 0.74, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
        dome.userData.base = 0.22; grid.userData.base = 0.45; ring.userData.base = 0.6;
        dome.scale.y = grid.scale.y = 1.9; // assez haute pour couvrir tout le roi
        g.add(dome, grid, ring); this.scene.add(g);
        this.vaults[key] = { sq, g, born: animate ? now : now - 10 };
      }
    }
    tickVaults(t) {
      if (!this.vaults) return;
      for (const v of Object.values(this.vaults)) {
        if (!v) continue;
        const grow = Math.min(1, (t - v.born) / 0.5), pulse = 1 + Math.sin(t * 2.4) * 0.025;
        v.g.scale.setScalar(Math.max(0.01, grow * grow * (3 - 2 * grow)) * pulse);
        v.g.children[1].rotation.y = t * 0.25;
        v.g.children.forEach((m) => { m.material.opacity = m.userData.base * (0.75 + 0.25 * Math.sin(t * 3 + m.userData.base * 10)); });
      }
    }

    // Thème Océan : une fine couche d'eau translucide, avec des reflets qui ondulent, recouvre le plateau
    tickWater(t) {
      const on = root.PieceTheme === 'ocean' || root.PieceThemeBlack === 'ocean';
      if (!on && !this.waterLayer) return;
      if (!this.waterLayer) {
        const T = this.THREE, c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = 'rgb(30,175,230)'; g.fillRect(0, 0, 256, 256);
        // reflets clairs en vaguelettes, dessinés de façon à se raccorder quand la texture se répète
        g.strokeStyle = 'rgba(235,250,255,0.55)'; g.lineCap = 'round';
        for (let i = 0; i < 46; i++) {
          const x = (i * 97) % 256, y = (i * 53) % 256, w = 18 + (i % 5) * 7;
          g.lineWidth = 1.5 + (i % 3);
          for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
            g.beginPath(); g.moveTo(x + dx - w / 2, y + dy);
            g.quadraticCurveTo(x + dx, y + dy - 5, x + dx + w / 2, y + dy); g.stroke();
          }
        }
        const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(3, 3);
        const m = new T.Mesh(new T.PlaneGeometry(SIZE - 0.04, SIZE - 0.04), new T.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0.1, emissive: 0x0b5f86, emissiveIntensity: 0.25, depthWrite: false }));
        // sous les repères de cases (0,01) pour qu'ils restent bien visibles
        m.rotation.x = -Math.PI / 2; m.position.y = 0.005;
        this.scene.add(m); this.waterLayer = m;
      }
      this.waterLayer.visible = on;
      if (!on) return;
      const tex = this.waterLayer.material.map;
      tex.offset.set(Math.sin(t * 0.21) * 0.06 + t * 0.012, Math.cos(t * 0.17) * 0.05 + t * 0.008);
      this.waterLayer.material.opacity = 0.38 + Math.sin(t * 0.9) * 0.04;
    }

