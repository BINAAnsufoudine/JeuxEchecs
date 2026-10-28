    square(color, opacity) {
      const T = this.THREE;
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      return m;
    }

    /* opts : board, selected, targets, marks, last, check, hint, flipped, showMoves, coords, light, dark, animate */
    update(o) {
      const T = this.THREE;
      this.outcome = o.outcome || null;
      this.drawBoard(o.light, o.dark, o.coords, !!o.flipped, o.board);
      this.setCamera(o.flipped);

      this.overlay.clear();
      this.ply = o.ply == null ? null : o.ply;
      if (o.tutorialStars && o.tutorialStars.length) {
        if (!this.tutorialStarGeometry) {
          const shape = new T.Shape(), outer = 0.39, inner = 0.17;
          for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? inner : outer;
            const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
            if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
          }
          shape.closePath();
          this.tutorialStarGeometry = new T.ShapeGeometry(shape);
          this.tutorialStarMaterial = new T.MeshBasicMaterial({ color: 0xffd33f, side: T.DoubleSide, transparent: true, opacity: 0.96, depthWrite: false, toneMapped: false });
        }
        for (const sq of o.tutorialStars) {
          const occupied = !!o.board[sq], p = this.sqToPos(sq), star = new T.Mesh(this.tutorialStarGeometry, this.tutorialStarMaterial);
          star.rotation.x = -Math.PI / 2;
          star.position.set(p.x + (occupied ? 0.2 : 0), 0.065, p.z + (occupied ? 0.2 : 0));
          if (occupied) star.scale.setScalar(0.68);
          star.renderOrder = 5;
          this.overlay.add(star);
        }
      }
      if (this.boardCracks && this.boardCracks.length) {
        this.boardCracks = this.boardCracks.filter((c) => {
          if (this.ply != null && c.ply != null && this.ply >= c.ply) return true;
          this.scene.remove(c.object); this.disposeGroup(c.object); return false;
        });
      }
      // Pion à un pas de la promotion : un anneau doré pulse sous ses pieds
      for (let sq = 0; sq < 64; sq++) {
        const pc = o.board[sq];
        if (!((pc === 'P' && sq >> 3 === 1) || (pc === 'p' && sq >> 3 === 6))) continue;
        const p = this.sqToPos(sq), g = new T.Group();
        const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: 0xffd65a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        ring.rotation.x = -Math.PI / 2; g.add(ring);
        const beam = new T.Mesh(new T.CylinderGeometry(0.3, 0.36, 1.1, 20, 1, true), new T.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
        beam.position.y = 0.55; g.add(beam);
        g.position.set(p.x, 0.03, p.z); g.userData.pulse = sq; this.overlay.add(g);
      }
      this.setMateFire((o.mateUltimate && o.mateUltimate.piece.toLowerCase() === 'q') || THEME_MATE[root.PieceTheme] ? [] : o.mateFire || []);
      let capture = null;
      const mark = (sq, color, opacity) => {
        if (sq < 0 || sq == null) return;
        const m = this.square(color, opacity); const p = this.sqToPos(sq);
        m.position.set(p.x, 0.01, p.z); this.overlay.add(m);
      };
      if (o.last) { mark(o.last.from, 0xf1c232, 0.35); mark(o.last.to, 0xf1c232, 0.45); }
      if (o.selected >= 0) mark(o.selected, 0x4fc3f7, 0.55);
      if (o.check >= 0) mark(o.check, 0xff3b30, 0.6);
      if (o.hint) { mark(o.hint.from, 0x7c4dff, 0.5); mark(o.hint.to, 0x7c4dff, 0.5); }
      if (o.marks) for (const sq of o.marks) mark(sq, 0x35a9ff, 0.52);
      if (o.showMoves) for (const t of o.targets) {
        const p = this.sqToPos(t.to);
        const capture = !!o.board[t.to] || t.flag === 'ep';
        const geo = capture ? new T.RingGeometry(0.36, 0.46, 32) : new T.CircleGeometry(0.15, 24);
        const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x1b2a22, transparent: true, opacity: 0.45, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.02, p.z);
        this.overlay.add(m);
      }

      // Réutilise les personnages déjà sur le plateau ; seul celui qui joue se déplace
      const now = this.now();
      const old = this.chars, next = new Map();
      // une case vide compte (sinon un pion qui avance sans dépasser une autre pièce donnait la même clé)
      const boardKey = o.board.map((p) => p || '.').join('');
      const boardChanged = boardKey !== this.boardKey;
      this.boardKey = boardKey;
      // Un nouveau coup peut commencer pendant la fin de l'animation précédente :
      // on conserve alors son animation en cours et on anime uniquement le nouveau coup.
      if (boardChanged && !o.animate) this.clearTransient();
      // Nouveau coup pendant qu'une caméra automatique filme encore l'action précédente :
      // elle revient tout de suite à la vue normale (elle se recentrera sur la nouvelle action s'il y en a une)
      if (boardChanged && o.animate) {
        const now = this.now();
        for (const cam of [this.captureCamera, this.attackCamera]) if (cam && !cam.restoreStart) cam.holdUntil = Math.min(cam.holdUntil, now);
      }
      const take = (sq, piece) => {
        const c = old.get(sq);
        if (c && (!piece || c.piece === piece)) { old.delete(sq); return c; }
        return null;
      };
      const moveChar = (c, from, to, extra = {}) => {
        if (c.anim) this.endToss(c); // la pièce rejoue avant la fin de sa propre attaque : on termine proprement l'ancienne
        const a = this.sqToPos(from), b = this.sqToPos(to);
        const dist = Math.hypot(b.x - a.x, b.z - a.z);
        c.anim = Object.assign({ from: a, to: b, t0: now, dur: 0.35 + dist * 0.09 }, extra);
        c.holder.position.set(a.x, 0, a.z);
      };
      let attackCameraStarted = false;
      if (o.animate && o.last) {
        const m = o.last;
        const white = m.piece === m.piece.toUpperCase();
        let duel = null, toss = null, shot = null, knightAttack = null, escort = null;
        const kind = m.piece.toLowerCase();
        const vSq = m.flag === 'ep' ? m.to + (white ? 8 : -8) : m.to;
        const far = Math.max(Math.abs((m.from & 7) - (vSq & 7)), Math.abs((m.from >> 3) - (vSq >> 3))) > 1;
        if (m.captured && !o.mateUltimate) {
          const v = take(vSq);
          if (v && v.anim) { this.endToss(v); v.anim = null; } // la pièce prise arrête net sa propre attaque en cours (sinon ses effets restaient figés)
          const a = this.sqToPos(m.from), b = this.sqToPos(vSq);
          capture = { from: a, to: b, victim: v };
          const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
          const ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
          const die = (o) => { if (v) { v.holder.position.set(b.x, 0, b.z); this.dying.push(Object.assign({ c: v, dx: ux, dz: uz, from: a, base: v.parts.root.scale.x }, o)); } };
          const themeFx = THEME_FX[root.PieceTheme], ocean = !!themeFx;
          if (ocean && far && m.flag !== 'ep') {
            // Thèmes de créatures : jet (tour, dame) ou salve (cavalier, fou), aux couleurs du thème :
            // eau et encre (océan), liane et épines (plantes), sable et cailloux (animaux), plumes (oiseaux)
            const jet = kind === 'q' || kind === 'r';
            const proj = WAR_PROJ[root.PieceTheme] && WAR_PROJ[root.PieceTheme][kind] && WAR_PROJ[root.PieceTheme][kind][white ? 'w' : 'b'];
            shot = { tech: proj ? 'proj' : jet ? 'water' : 'bubble', proj, white, pal: themeFx[white ? 'w' : 'b'], victim: v, target: b, fire: proj ? 0.55 : 0.7 };
            shot.flight = jet ? 0.45 + len * 0.09 : 0.3 + len * 0.07;
            if (proj) shot.flight = { shell: 0.12 + len * 0.025, laser: 0.55, missiles: 0.35 + len * 0.06, bombs: 0.9, boulder: 0.6 + len * 0.08, firepot: 0.55 + len * 0.08 }[proj] || 0.35 + len * 0.07;
            shot.impact = shot.fire + shot.flight;
            shot.runStart = shot.impact + 0.9;
            die({ t0: now + EXR + shot.impact, hit: true, swept: true, counter: { start: now, end: now + EXR, at: a } });
          } else if (root.PieceTheme === 'modern' && kind === 'k' && m.flag !== 'ep') {
            // Guerriers modernes : le général appelle deux soldats qui entrent sur le plateau, se placent devant lui
            // de chaque côté et mitraillent la cible ; ensuite seulement il prend la case.
            escort = { white, from: a, target: b, dir: { x: ux, z: uz }, wait: 2.1, flying: !!(v && v.parts.fly) }; // engin volant : tir au bazooka
            die({ t0: now + 1.85, hit: true });
          } else if (ocean && kind === 'k' && m.flag !== 'ep') {
            // roi des thèmes de créatures et de guerriers : combat au corps à corps, comme les autres pièces côte à côte
            const gap = Math.min(0.62, len);
            duel = { stop: { x: b.x - ux * gap, z: b.z - uz * gap }, foe: b, len: 2.6, rate: 1.5, brawl: true };
            duel.approach = 0.35 + Math.max(0, len - gap) * 0.09;
            duel.len += X2;
            die({ t0: now + duel.approach + duel.len, from: duel.stop, start: now + duel.approach, ex: true, far: true }); // sans cela, la pièce prise restait affichée
          } else if (m.flag === 'ep') {
            // Prise en passant : le pion file en un éclair à côté de sa cible, dont la tête tombe au sol
            knightAttack = { style: 'enpassant', start: now, from: a, target: b, to: this.sqToPos(m.to), duration: 2.6, victim: v, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'n') {
            const style = white
              ? (Math.random() < 0.5 ? 'tunnel-eat' : 'tunnel-impact')
              : (Math.random() < 0.5 ? 'eagle-release' : 'eagle-slam');
            // tunnel percutant : le chien et son ninja se changent d'abord en tourbillon
            const pre = style === 'tunnel-impact' ? 0.6 : 0;
            const duration = pre + (style === 'tunnel-eat' ? 2.8 : style === 'tunnel-impact' ? 2.45 : style === 'eagle-release' ? 3.65 : 3.85);
            knightAttack = { style, start: now, from: a, target: b, duration, pre, victim: v, hitCount: 0 };
            die({ t0: now + duration, knightAttack });
          } else if (far && kind === 'q') {
            // Dame : une ligne de flammes (blanches et éblouissantes ou noires) court au sol jusqu'à la cible et la consume
            const travel = 0.3 + len * 0.09;
            knightAttack = { style: 'flameline', white, start: now, from: a, target: b, travel, duration: 0.45 + travel + 2.0, victim: v, dir: { x: ux, z: uz }, len, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'k') {
            // Roi blanc : Jugement du Hokage (symbole « 火 » dans le ciel, rayon de lumière dorée).
            // Roi noir : Main de l'Empereur (une main d'ombre géante sort du sol et écrase la cible).
            knightAttack = { style: white ? 'judgment' : 'emperorhand', white, start: now, from: a, target: b, duration: white ? 3.6 : 3.4, victim: v, dir: { x: ux, z: uz }, len, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (far && kind === 'r' && white) {
            // Tour blanche : elle devient une boule de feu qui roule jusqu'à sa cible en laissant des flammes derrière elle
            const run = 0.18 + len * 0.045;
            knightAttack = { style: 'fireroll', start: now, from: a, target: b, run, duration: 0.5 + run + 1.7, victim: v, dir: { x: ux, z: uz }, len, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (far && kind === 'b' && white) {
            // Fou blanc : boule d'énergie blanche en main, il court frapper sa cible et la projette au loin
            const run = 0.2 + len * 0.06;
            knightAttack = { style: 'orb', start: now, from: a, target: b, run, duration: 0.5 + run + 1.9, victim: v, dir: { x: ux, z: uz }, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (far && (kind === 'q' || kind === 'r')) {
            // Technique à distance lancée depuis sa case : boule de feu (dame), dragon d'eau (tour blanche)
            // ou dragon de feu (tour noire, même au contact) qui réduit sa cible en cendres
            const fireDragon = kind === 'r' && !white;
            shot = { tech: kind === 'q' ? 'fire' : 'water', fireDragon, victim: v, target: b, fire: kind === 'q' ? 0.8 : 0.9 };
            shot.flight = kind === 'q' ? 0.25 + len * 0.06 : 0.45 + len * 0.09;
            shot.impact = shot.fire + shot.flight;
            shot.runStart = shot.impact + 0.9;
            const fireball = kind === 'q';
            die({ t0: now + EXR + shot.impact, hit: true, burn: fireball || fireDragon, burnAt: now + EXR + shot.impact, swept: kind === 'r' && !fireDragon, counter: { start: now, end: now + EXR, at: a } });
          } else if (far && kind === 'b' && !white) {
            // Fou noir : la main chargée d'éclairs, il fonce transpercer sa cible sous un ciel assombri.
            const run = 0.25 + len * 0.055, pierce = 0.7 + run;
            knightAttack = { style: 'chidori', start: now, from: a, target: b, run, pierce, duration: pierce + 2.75, victim: v, dir: { x: ux, z: uz }, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else {
            // Pièces côte à côte : elles se battent uniquement aux poings et aux pieds
            const gap = Math.min(0.62, len);
            duel = { stop: { x: b.x - ux * gap, z: b.z - uz * gap }, foe: b, len: DUEL, rate: 1.5, brawl: true };
            if (kind === 'k') duel.len = 2.6; // enchaînement de coups de poing et de pied
            duel.approach = 0.35 + Math.max(0, len - gap) * 0.09;
            duel.len += X2; // assaut + riposte, puis le coup final
            const o = { t0: now + duel.approach + duel.len, from: duel.stop, start: now + duel.approach, ex: true, far: true };
            die(o);
          }
        }
        let mover = take(m.from, m.piece);
        const landed = o.board[m.to];
        if (mover && landed !== m.piece) { this.pieces.remove(mover.holder); mover = null; } // promotion
        if (!mover && landed) mover = this.makeChar(landed);
        if (mover) {
          const knightLeap = kind === 'n' && !duel && !toss && !shot && !knightAttack;
          moveChar(mover, m.from, m.to, {
            leap: knightLeap,
            high: knightLeap ? (white ? 1.05 : 2.25) : undefined,
            knightFlight: knightLeap && !white,
            duel, toss, shot, knightAttack,
          });
          if (knightAttack) mover.anim.dur = knightAttack.duration;
          else if (knightLeap) mover.anim.dur = (white ? 0.38 : 0.68) + Math.hypot(mover.anim.to.x - mover.anim.from.x, mover.anim.to.z - mover.anim.from.z) * (white ? 0.045 : 0.07);
          if (duel) mover.anim.dur = duel.approach;
          if (toss || shot) { mover.anim.t0 = now + EXR; mover.anim.pre = now; } // la cible tire d'abord
          if (escort) { mover.anim.t0 = now + escort.wait; mover.anim.wait = true; this.addEscort(escort, now); }
          const followAttack = (shot || toss || knightAttack) && Math.hypot(mover.anim.to.x - mover.anim.from.x, mover.anim.to.z - mover.anim.from.z) > 2;
          this.busyUntil = now + mover.anim.dur + (escort ? escort.wait + 0.2 : 0) + (duel ? duel.len + 0.35 : 0) + (toss ? EXR + toss.runStart : 0) + (shot ? EXR + shot.runStart : 0) + (knightAttack ? 0.35 : 0);
          // laisse la victime embrochée finir d'être éjectée avant tout autre coup
          if (toss) this.busyUntil = Math.max(this.busyUntil, now + EXR + toss.impact + 0.2 + 2.4);
          const burning = this.dying.find((x) => x.c === (capture && capture.victim) && x.burn);
          if (burning) this.busyUntil = Math.max(this.busyUntil, burning.t0 + BURN_TIME);
          next.set(m.to, mover);
          if (kind === 'p' && landed !== m.piece && !o.mateUltimate) {
            const at = Math.max(now + mover.anim.dur, (this.busyUntil || now) - 0.35);
            this.addPromotionFx(mover, this.sqToPos(m.to), at);
            this.busyUntil = Math.max(this.busyUntil, at + 2.0);
          }
          if (followAttack) {
            this.startAttackCamera(mover, mover.anim.from, mover.anim.to, now);
            attackCameraStarted = true;
          }
        }
        if (m.flag === 'castle') {
          const kingside = m.to > m.from;
          const rf = kingside ? m.from + 3 : m.from - 4, rt = kingside ? m.from + 1 : m.from - 1;
          const rook = take(rf);
          // Roque : le roi et la tour échangent leurs places d'un bond croisé, puis un dôme protecteur se lève
          // Guerriers modernes : le tank roule au sol et c'est le roi qui saute par-dessus
          const kingJumps = root.PieceTheme === 'modern';
          if (mover) { mover.anim.leap = true; mover.anim.dur = 0.7; if (kingJumps) mover.anim.high = 1.6; }
          if (rook) { moveChar(rook, rf, rt, { leap: !kingJumps }); rook.anim.dur = 0.7; if (!kingJumps) rook.anim.high = 1.5; next.set(rt, rook); }
          const k = this.sqToPos(m.to), r = this.sqToPos(rt);
          this.addCastleDome({ x: (k.x + r.x) / 2, z: (k.z + r.z) / 2 }, white, now + 0.7);
          this.busyUntil = Math.max(this.busyUntil || now, now + 1.1);
        }
      }
      for (let sq = 0; sq < 64; sq++) {
        const piece = o.board[sq];
        if (!piece || next.has(sq)) continue;
        const c = take(sq, piece) || this.makeChar(piece);
        const p = this.sqToPos(sq);
        // un personnage encore en route (duel en cours) termine son animation
        const arriving = c.anim && Math.abs(c.anim.to.x - p.x) < 0.01 && Math.abs(c.anim.to.z - p.z) < 0.01;
        if (!arriving) { this.endToss(c); c.anim = null; c.holder.position.set(p.x, 0, p.z); }
        next.set(sq, c);
      }
      for (const c of old.values()) this.pieces.remove(c.holder);
      const captureFoes = this.captureFoes(o.board);
      const watch = this.nearestFoes(o.board);
      for (const [sq, c] of next) {
        c.selected = sq === o.selected; c.inCheck = sq === o.check;
        const foe = captureFoes.get(sq);
        c.foe = foe == null ? null : this.sqToPos(foe);
        const seen = watch.get(sq);
        c.watch = seen == null ? null : this.sqToPos(seen);
      }
      this.chars = next;
      if (capture && capture.victim && !attackCameraStarted) this.startCaptureCamera(capture.from, capture.to, capture.victim, now);
      // Pièce liée au moment de prendre : sa technique est plus puissante (onde d'énergie, éclat, tremblement renforcé)
      if (capture && capture.victim && o.last && (this.ropes || []).some(([a, b]) => a === o.last.from || b === o.last.from)) {
        const d = this.dying.find((x) => x.c === capture.victim);
        const at = d ? (d.knightAttack ? now + Math.max(0.6, d.knightAttack.duration * 0.55) : d.t0) : now + 0.8;
        this.addPowerBurst(capture.to, o.last.piece === o.last.piece.toUpperCase(), at);
        this.powerUntil = Math.max(this.powerUntil || 0, (this.busyUntil || now) + 0.2);
        // aura électrique sur l'attaquant, l'échiquier tremble à l'impact et la case se fissure pour de bon
        const attacker = next.get(o.last.to);
        if (attacker) this.addElectricAura(attacker, now, at + 0.7);
        this.addBoardQuake(at);
        this.addPermanentCracks(o.last.to, at, o.ply);
      }
      if (o.mateUltimate && o.animate && o.mateUltimate.id !== this.mateUltimateKey) {
        const actor = next.get(o.mateUltimate.attackerTo);
        this.mateUltimateKey = o.mateUltimate.id;
        this.mateUltimate = actor ? {
          ...o.mateUltimate, actor, king: next.get(o.mateUltimate.to),
          start: now + (actor.anim ? actor.anim.dur : 0.35) + 0.15,
          fromPos: { ...this.sqToPos(o.mateUltimate.attackerTo) }, target: this.sqToPos(o.mateUltimate.to),
          duration: o.mateUltimate.piece === 'k' ? 9.6 : o.mateUltimate.piece === 'K' ? 7.8 : o.mateUltimate.piece.toLowerCase() === 'q' ? 6.8 : o.mateUltimate.piece.toLowerCase() === 'p' ? 3.6 : o.mateUltimate.piece === 'N' ? 4.8 : o.mateUltimate.piece === 'n' ? 5.4 : o.mateUltimate.piece === 'b' ? 5.8 : o.mateUltimate.piece === 'R' ? 6.0 : o.mateUltimate.piece === 'r' ? 7.0 : 3.4,
        } : null;
        if (this.mateUltimate && THEME_MATE[root.PieceTheme]) {
          const white = o.mateUltimate.piece === o.mateUltimate.piece.toUpperCase();
          this.mateUltimate.themed = THEME_MATE[root.PieceTheme][white ? 'w' : 'b'];
          this.mateUltimate.duration = 4.8;
        }
        if (this.mateUltimate) {
          this.makeMateUltimateFx(this.mateUltimate);
          this.busyUntil = Math.max(this.busyUntil || now, this.mateUltimate.start + this.mateUltimate.duration);
        }
      }
      if (!this.outcome && this.mateUltimate) this.resetMateUltimate();
      this.setCheckChains(o.board, o.check);
      this.updateVaults(o.board, o.animate);
      if (!this.outcome) for (const c of this.chars.values()) { c.endPose = null; c.endPoseAt = null; c.drawTo = null; }
      if (this.outcome === '1/2-1/2') this.planDrawFormation(now);
      this.ropes = this.findRopes(o.board);
      this.ropesPrev = this.ropes;
      this.setArrows(o.arrows || []);
    }

    // Interrompt proprement toute animation en cours (saut dans une partie rejouée, coup pendant un duel)
    // Saute toutes les animations en cours : chaque pièce se pose sur sa case au prochain update
    skipAnimations() {
      this.clearTransient();
      if (this.mateUltimate) this.resetMateUltimate();
      this.boardKey = null;
    }

    clearTransient() {
      if (this.effects) { this.effects.forEach((fx) => fx.end()); this.effects = []; }
      for (const c of this.chars.values()) {
        const a = c.anim;
        this.endToss(c);
        if (a && a.knightAttack) this.endShot(a.knightAttack);
        if (a && a.toss && a.toss.proj) {
          this.scene.remove(a.toss.proj);
          a.toss.proj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
          a.toss.proj = null;
        }
        c.anim = null;
        c.holder.visible = true;
        c.parts.root.visible = true;
        if (c.parts.riderRoot) c.parts.riderRoot.visible = true;
        if (c.shadow) { c.shadow.visible = true; c.shadow.scale.setScalar(1); }
      }
      for (const d of this.dying) {
        this.pieces.remove(d.c.holder);
        this.endBurn(d);
        this.endCounter(d);
        if (d.knightAttack) this.endShot(d.knightAttack);
        if (d.spikes && d.spikes.proj) {
          this.scene.remove(d.spikes.proj);
          d.spikes.proj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
          d.spikes.proj = null;
        }
      }
      this.dying = [];
      for (const scar of this.captureScars) {
        this.scene.remove(scar.object);
        scar.object.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      }
      this.captureScars = [];
      // la caméra automatique s'arrêtait là où elle était (zoomée sur une ancienne action) : on revient à la vue normale
      const autoCam = this.captureCamera || this.attackCamera;
      this.captureCamera = null;
      this.attackCamera = null;
      if (autoCam) this.setCamera(this.flipped, true);
      if (this.spark) this.spark.visible = false;
      this.shakeUntil = 0;
      this.busyUntil = 0;
    }

    // Flèches de replay : { from, to, color } posées à plat au-dessus du plateau
    setArrows(list) {
      const T = this.THREE;
      const key = list.map((a) => `${a.from}-${a.to}-${a.color}`).join(',');
      if (key === this.arrowKey) return;
      this.arrowKey = key;
      if (!this.arrowGroup) { this.arrowGroup = new T.Group(); this.scene.add(this.arrowGroup); }
      for (const child of [...this.arrowGroup.children]) {
        this.arrowGroup.remove(child);
        child.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
      }
      for (const a of list) {
        const p = this.sqToPos(a.from), q = this.sqToPos(a.to);
        const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz) - 0.12;
        if (len <= 0.5) continue;
        const hex = { red: 0xe53935, blue: 0x2f7bff, violet: 0xa855f7 }[a.color] || 0x2ecc40;
        const mat = new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.88, depthTest: false });
        const shaftLen = len - 0.42;
        const shaft = new T.Mesh(new T.BoxGeometry(shaftLen, 0.05, 0.13), mat);
        shaft.position.set(shaftLen / 2, 0, 0);
        const head = new T.Mesh(new T.ConeGeometry(0.24, 0.42, 16), mat);
        head.rotation.z = -Math.PI / 2;
        head.position.set(len - 0.21, 0, 0);
        const arrow = new T.Group();
        arrow.add(shaft, head);
        arrow.position.set(p.x, 0.45, p.z);
        arrow.rotation.y = -Math.atan2(dz, dx);
        arrow.renderOrder = 999;
        shaft.renderOrder = head.renderOrder = 999;
        this.arrowGroup.add(arrow);
      }
    }

