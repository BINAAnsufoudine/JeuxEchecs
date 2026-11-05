    /* L'Âge des Sabres : attaques (une par pièce, à toute distance) et mats (un par pièce, celui de la pièce qui mate).
       Les attaques passent par le mécanisme des attaques spéciales (knightAttack) : a.sabre donne la pièce qui attaque,
       a.hit l'instant du coup, a.moveAt l'instant où l'attaquant rejoint sa case. Tout est visuel, rien ne touche aux règles.
       Feu : orange et or côté blanc, violet côté noir. Modèles dans sabres3d.js. */
    sabrePal(white) {
      return white ? { hot: 0xfff1a8, mid: 0xffb13b, deep: 0xff6a1a, arc: 0xffffff, dragon: 0xffe066, ash: 0x8d8590 }
        : { hot: 0xead0ff, mid: 0xb45cff, deep: 0x6a1fd0, arc: 0xc98cff, dragon: 0xb45cff, ash: 0x6d6478 };
    }
    // Feu et énergie : couleur franche, sans mélange additif (sur le ciel clair du crépuscule, tout virerait au blanc)
    sabreFire(color, opacity = 0.9) {
      return new this.THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
    }
    // Faisceau de flammes (cônes qui dansent) ; sabreFlicker les anime
    sabreFlames(white, r = 0.3, h = 0.8, n = 9, opacity = 0.88) {
      const T = this.THREE, g = new T.Group(), pal = this.sabrePal(white), geo = new T.ConeGeometry(1, 1, 7);
      g.userData.flames = [];
      for (let i = 0; i < n; i++) {
        const a = i * 2.4, rr = r * (0.2 + (i % 3) * 0.36), m = new T.Mesh(geo, this.sabreFire([pal.mid, pal.deep, pal.hot][i % 3], opacity));
        m.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        m.userData.h = h * (0.55 + (i % 4) * 0.24); m.userData.w = r * (n > 12 ? 0.2 : 0.34 + (i % 2) * 0.16); m.userData.ph = i * 1.7;
        g.add(m); g.userData.flames.push(m);
      }
      return g;
    }
    sabreFlicker(g, t, k = 1) {
      g.visible = k > 0.01;
      for (const m of g.userData.flames) {
        const h = m.userData.h * k * (0.78 + 0.4 * Math.abs(Math.sin(t * 15 + m.userData.ph)));
        m.scale.set(m.userData.w * k, Math.max(0.01, h), m.userData.w * k); m.position.y = h / 2;
      }
    }
    // Lame d'énergie : croissant en voile courbe, visible sous tous les angles (axe +z = sens de la marche)
    sabreSail(w, h, color, opacity = 0.92) {
      const T = this.THREE, geo = new T.PlaneGeometry(1, 1, 22, 10), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), v = pos.getY(i), a = u * 2.3, R = w / 2, thin = Math.pow(Math.max(0, Math.cos(v * Math.PI)), 0.55);
        pos.setXYZ(i, Math.sin(a) * R * thin, v * h, (Math.cos(a) - 1) * R * thin);
      }
      geo.computeVertexNormals();
      const m = this.sabreFire(color, opacity); m.side = T.DoubleSide;
      return new T.Mesh(geo, m);
    }
    sabreFace(c, x, z) {
      const p = c.holder.position; if (Math.hypot(x - p.x, z - p.z) < 0.02) return;
      const d = Math.atan2(x - p.x, z - p.z) - c.holder.rotation.y;
      c.holder.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * 0.3;
    }
    sabreLink(m, a, b) {
      const T = this.THREE, d = b.clone().sub(a), L = Math.max(0.01, d.length());
      m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.scale.set(1, L, 1);
    }
    // Copie d'une arme du modèle, avec ses propres matériaux : l'effet peut les libérer sans toucher aux pièces
    sabreProp(o) { o.traverse((x) => { if (x.isMesh) { x.geometry = x.geometry.clone(); x.material = x.material.clone(); } }); return o; }
    // Impact : anneau au sol, boule de lumière, éclats
    sabreBurst(at, t, colors, n = 16, big = 1, y = 0.75) {
      const T = this.THREE, g = new T.Group(), dur = 0.75, bits = [];
      g.position.set(at.x, 0, at.z); this.scene.add(g);
      const ringMat = this.sabreFire(colors[0], 0.9); ringMat.side = T.DoubleSide;
      const ring = new T.Mesh(new T.RingGeometry(0.3, 0.46, 30), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
      const ball = new T.Mesh(new T.SphereGeometry(0.34 * big, 14, 10), this.sabreFire(colors[1] == null ? colors[0] : colors[1], 0.8)); ball.position.y = y; g.add(ball);
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(new T.TetrahedronGeometry(0.06, 0), this.sabreFire(colors[i % colors.length], 1)), a = Math.random() * 6.3, s = (1 + Math.random() * 2.2) * big;
        m.userData.v = [Math.cos(a) * s, 1.4 + Math.random() * 2.6, Math.sin(a) * s]; g.add(m); bits.push(m);
      }
      this.addEffect({ start: t, dur, tick: (e) => {
        const k = Math.min(1, e / dur);
        ring.scale.setScalar((1 + k * 4) * big); ringMat.opacity = 0.9 * (1 - k);
        ball.scale.setScalar(1 + k * 1.5); ball.material.opacity = 0.85 * (1 - k);
        for (const m of bits) { const v = m.userData.v; m.position.set(v[0] * e, Math.max(0.05, y + v[1] * e - 4.9 * e * e), v[2] * e); m.rotation.set(e * 9, e * 6, 0); m.material.opacity = 1 - k; }
      }, end: () => this.disposeGroup(g) });
    }

    // Déplacement à très haute vitesse : un sillage de feu qui suit la pièce et s'efface, un éclat à l'arrivée
    sabreDash(from, to, white, t, dur) {
      const T = this.THREE, pal = this.sabrePal(white), g = new T.Group(), d = new T.Vector3(to.x - from.x, 0, to.z - from.z), L = Math.max(0.01, d.length()), fade = 0.55;
      g.position.set(from.x, 0, from.z); g.rotation.y = Math.atan2(d.x, d.z); this.scene.add(g);
      const box = new T.BoxGeometry(1, 1, 1), lines = [[0, 0.8, 0.2, pal.hot], [-0.2, 0.5, 0.09, pal.mid], [0.2, 0.5, 0.09, pal.mid], [-0.1, 1.15, 0.06, pal.deep], [0.1, 0.2, 0.06, pal.deep]].map(([x, y, w, color]) => {
        const m = new T.Mesh(box, this.sabreFire(color, 0.9)); m.position.set(x, y, 0); m.userData.w = w; g.add(m); return m;
      });
      let arrived = false;
      this.addEffect({ start: t, dur: dur + fade, tick: (e, now) => {
        const k = Math.min(1, e / dur), out = Math.max(0, (e - dur) / fade);
        for (const m of lines) { m.scale.set(m.userData.w * (1 - out), m.userData.w * (1 - out), Math.max(0.01, L * k)); m.position.z = L * k / 2; m.material.opacity = 0.9 * (1 - out); }
        if (!arrived && e >= dur) { arrived = true; this.sabreBurst(to, now, [pal.mid, pal.hot], 12, 0.7); }
      }, end: () => this.disposeGroup(g) });
    }

    /* ---------- Préparation d'une attaque ---------- */
    sabreAttack(kind, white, from, target, to, victim, now, len, dir) {
      const a = { style: 'sabre', sabre: kind === 'k' && white ? 'K' : kind, white, start: now, from, target, to, victim, dir, len, fx: [], pal: this.sabrePal(white) };
      a.fireHex = [a.pal.hot, a.pal.mid, a.pal.deep];
      const near = (gap) => ({ x: target.x - dir.x * gap, z: target.z - dir.z * gap });
      a.moveFrom = from;
      if (a.sabre === 'p') { const gap = Math.min(0.62, len); a.stop = near(gap); a.approach = 0.3 + Math.max(0, len - gap) * 0.09; a.clash = a.approach + 1.05; a.hit = a.clash + 0.25; a.moveAt = a.hit + 0.75; a.moveFrom = a.stop; }
      else if (a.sabre === 'n') { a.stop = near(Math.min(1, len)); a.approach = 0.75; a.hit = 0.75; a.moveAt = a.hit + 1.55; a.moveFrom = a.stop; }
      else if (a.sabre === 'q') { a.wind = 0.5; a.fly = 0.35 + len * 0.08; a.hit = a.wind + a.fly; a.back = 0.35 + len * 0.06; a.moveAt = a.hit + a.back + 0.15; }
      else if (a.sabre === 'r') { a.wind = 0.6; a.fly = 0.3 + len * 0.07; a.hit = a.wind + a.fly; a.back = 0.4 + len * 0.07; a.moveAt = a.hit + a.back + 0.15; }
      else if (a.sabre === 'b') { a.wind = 0.55; a.fly = 0.22 + len * 0.05; a.hit = a.wind + a.fly; a.moveAt = a.hit + 0.55; }
      else if (a.sabre === 'K') { a.wind = 0.5; a.hit = 0.62; a.stop = { x: target.x + dir.x * 0.72, z: target.z + dir.z * 0.72 }; a.moveAt = 1.6; a.moveFrom = a.stop; }
      else { const gap = Math.min(0.72, len); a.stop = near(gap); a.approach = 0.3 + Math.max(0, len - gap) * 0.09; a.hit = a.approach + 0.75; a.moveAt = a.hit + 0.95; a.moveFrom = a.stop; } // shōgun
      a.duration = a.moveAt + 0.3 + Math.hypot(to.x - a.moveFrom.x, to.z - a.moveFrom.z) * 0.09;
      return a;
    }
    // Boule enflammée ou naginata : le projectile, son feu et son lien avec la main
    sabreProjectile(a) {
      const T = this.THREE, g = new T.Group(), models = root.ThemeModels.sabres, rook = a.sabre === 'r';
      if (rook) { const ball = this.sabreProp(models.ball(T, a.white)); g.add(ball); g.userData.spin = ball; }
      else { const spin = new T.Group(), n = this.sabreProp(models.naginata(T, a.white)); n.rotation.x = Math.PI / 2; n.position.y = -0.14; spin.add(n); g.add(spin); g.userData.spin = spin; }
      const fire = new T.Group(); g.add(fire); g.userData.fire = fire; fire.userData.parts = [];
      // tourbillon de feu horizontal, ou traînée de la boule : cônes couchés tournant autour de l'axe de marche
      const cone = new T.ConeGeometry(1, 1, 7), ring = [a.pal.hot, a.pal.mid, a.pal.deep];
      for (let i = 0; i < (rook ? 10 : 16); i++) {
        const m = new T.Mesh(cone, this.sabreFire(ring[(i + 1) % 3], 0.88)), ang = i * 2.4;
        m.userData = { ang, r: rook ? 0.1 : 0.14 + (i % 4) * 0.09, z: rook ? -0.05 - (i % 5) * 0.08 : 0.25 - i * 0.07, s: 0.1 + (i % 3) * 0.05, l: rook ? 0.45 + (i % 4) * 0.13 : 0.34 + (i % 3) * 0.1 };
        m.rotation.x = -Math.PI / 2; fire.add(m); fire.userData.parts.push(m);
      }
      if (!rook) for (let i = 0; i < 3; i++) { const o = new T.Mesh(new T.TorusGeometry(0.3 + i * 0.12, 0.03, 6, 28), this.sabreFire(ring[(i + 1) % 3], 0.85)); o.position.z = 0.15 - i * 0.28; fire.add(o); }
      return g;
    }
    tickSabreProjectile(g, t, k) {
      const fire = g.userData.fire;
      fire.visible = k > 0.02;
      fire.rotation.z = t * 13;
      for (const m of fire.userData.parts) {
        const d = m.userData, w = Math.sin(t * 18 + d.ang) * 0.015;
        m.position.set(Math.cos(d.ang) * (d.r + w), Math.sin(d.ang) * (d.r + w), d.z * k);
        m.scale.set(d.s * k, d.l * k * (0.8 + Math.abs(Math.sin(t * 16 + d.ang)) * 0.45), d.s * k);
      }
    }

    /* ---------- L'attaquant ---------- */
    tickSabreAttack(c, a, el, t, M) {
      const T = this.THREE, p = c.parts, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      if (!a.sabreRestore) a.sabreRestore = () => { if (p.naginata) p.naginata.visible = true; if (p.ball) p.ball.visible = true; if (p.lance) p.lance.rotation.x = 0; };
      const hand = () => (p.muzzle ? p.muzzle.getWorldPosition(new T.Vector3()) : this.handsOf(c));
      const struck = (colors, big = 1, shake = 0.08) => { if (a.struck) return; a.struck = true; this.sabreBurst(a.target, t, colors, 16, big); this.shakeUntil = t + 0.3; this.shakeAmp = shake; };
      const going = el >= a.moveAt, kind = a.sabre;
      if (going) {
        const u = clamp((el - a.moveAt) / (a.duration - a.moveAt));
        this.sabreFace(c, a.to.x, a.to.z);
        c.holder.position.set(a.moveFrom.x + (a.to.x - a.moveFrom.x) * u, 0, a.moveFrom.z + (a.to.z - a.moveFrom.z) * u);
        M.animate(p, t, 'run'); p.root.position.y = 0;
      }
      if (kind === 'q' || kind === 'r') {
        if (!going) {
          c.holder.position.set(a.from.x, 0, a.from.z); this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, 'idle');
          const w = clamp(el / a.wind), throwing = el < a.wind + 0.25;
          if (throwing) { const s = w < 1 ? -2.9 * w : -2.9 + (el - a.wind) * 7; p.armR.rotation.set(s, 0, 0.25); p.torso.rotation.y = 0.5 * w * (1 - clamp((el - a.wind) * 4)); }
          else p.armR.rotation.set(-1.3, 0, 0.3);
        }
        const hold = el < a.wind || el >= a.hit + a.back;
        if (p.naginata) p.naginata.visible = hold; if (p.ball) p.ball.visible = hold;
        if (el >= a.wind && el < a.hit + a.back && !a.ended) {
          if (!a.proj) {
            a.proj = this.fx(a, this.sabreProjectile(a)); a.proj.rotation.y = Math.atan2(a.dir.x, a.dir.z);
            a.launch = hand();
            a.lineMat = new T.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.3 });
            if (kind === 'r' || !a.white) a.line = this.fx(a, new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 6), a.lineMat));
          }
          const end = new T.Vector3(a.target.x, 0.85, a.target.z), now = hand();
          let k, pos;
          if (el < a.hit) { k = (el - a.wind) / a.fly; pos = a.launch.clone().lerp(end, k); pos.y += Math.sin(k * Math.PI) * (kind === 'r' ? 0.55 : 0.12); }
          else { k = (el - a.hit) / a.back; pos = end.clone().lerp(now, k * k); pos.y += Math.sin(k * Math.PI) * 0.3; }
          a.proj.position.copy(pos);
          a.proj.userData.spin.rotation[kind === 'r' ? 'x' : 'z'] = t * 22;
          this.tickSabreProjectile(a.proj, t, el < a.hit ? (kind === 'r' ? 0.45 + clamp(k) * 0.75 : 0.6 + clamp(k * 3) * 0.6) : Math.max(0, 1 - (el - a.hit) / 0.25));
          if (a.line) this.sabreLink(a.line, now, pos);
          if (el >= a.hit) struck(a.fireHex, 1.15, 0.12);
        } else if (a.proj) { a.proj.visible = false; if (a.line) a.line.visible = false; }
      } else if (kind === 'b') {
        if (!going) {
          c.holder.position.set(a.from.x, 0, a.from.z); this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, 'idle');
          const w = smooth(el / a.wind), cut = smooth((el - a.wind) / 0.12);
          p.armR.rotation.set(-2.8 * w + cut * 1.9, 0, 0.9 * (1 - cut) - 0.5 * cut);
          p.armL.rotation.set(-2.8 * w + cut * 1.9, 0, -0.9 * (1 - cut) + 0.5 * cut);
        }
        if (el >= a.wind && !a.arcs) {
          a.arcs = new T.Group(); a.arcs.rotation.y = this.viewYaw(); this.fx(a, a.arcs);
          for (const s of [-1, 1]) { const tilt = new T.Group(); tilt.rotation.z = s * Math.PI / 4; const m = this.sabreSail(0.46, 2, a.pal.arc), core = this.sabreSail(0.2, 1.7, a.white ? 0xffe9b0 : 0xffffff, 0.9); core.position.z = 0.03; tilt.add(m, core); a.arcs.add(tilt); }
          a.launch = hand(); a.launch.y = 0.85;
          a.arcAt = a.launch.clone();
        }
        if (a.arcs && !a.ended) {
          const end = new T.Vector3(a.target.x, 0.85, a.target.z), after = el - a.hit;
          if (after < 0) a.arcAt.copy(a.launch).lerp(end, (el - a.wind) / a.fly);
          else a.arcAt.set(end.x + a.dir.x * after * 13, 0.85, end.z + a.dir.z * after * 13);
          a.arcs.position.copy(a.arcAt); a.arcs.visible = after < 0.95;
          if (el >= a.hit) struck([a.pal.arc, a.pal.mid], 0.9, 0.08);
        }
      } else if (kind === 'K') {
        if (!going) {
          const dash = clamp((el - a.wind) / 0.12);
          c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * dash, 0, a.from.z + (a.stop.z - a.from.z) * dash);
          if (el < a.wind) this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, 'idle');
          if (el < a.wind) { p.armR.rotation.set(-0.5, 0, -0.6); p.torso.rotation.y = 0.6; p.root.position.y = -0.05 * smooth(el / a.wind); } // main sur la poignée, ramassé
          else { const follow = clamp((el - a.wind) / 0.3); p.armR.rotation.set(-1.6 + follow * 0.2, 0, 0.5 + follow); p.torso.rotation.y = -0.5; }
        }
        if (el >= a.wind && !a.stroke) {
          // le trait blanc reste un instant dans l'air
          const d = new T.Vector3(a.stop.x - a.from.x, 0, a.stop.z - a.from.z), L = d.length() + 0.8;
          a.stroke = this.fx(a, new T.Mesh(new T.BoxGeometry(0.05, 0.05, L), this.glow(0xffffff, 1)));
          a.stroke.add(new T.Mesh(new T.BoxGeometry(0.16, 0.16, L), this.glow(0xdfeaff, 0.4)));
          a.stroke.position.set((a.from.x + a.stop.x) / 2, 0.82, (a.from.z + a.stop.z) / 2); a.stroke.rotation.y = Math.atan2(d.x, d.z);
        }
        if (a.stroke) { const k = clamp((el - a.hit) / 0.75); a.stroke.visible = k < 1; a.stroke.scale.set(1 - k, 1 - k, 1); }
        if (el >= a.hit) struck([0xffffff, 0xdfeaff], 0.7, 0.05);
      } else if (kind === 'k') {
        if (!going) {
          const w = clamp(el / a.approach);
          if (el < a.approach) { c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * w, 0, a.from.z + (a.stop.z - a.from.z) * w); M.animate(p, t, 'run'); }
          else {
            c.holder.position.set(a.stop.x, 0, a.stop.z);
            const k = (el - a.approach) / 0.75, up = k < 0.75 ? smooth(k / 0.6) : 1 - smooth((k - 0.75) / 0.22), s = -2.9 * up - 0.5 * (1 - up);
            M.animate(p, t, 'idle'); p.armR.rotation.set(s, 0, -0.45); p.armL.rotation.set(s, 0, 0.45); p.torso.rotation.x = 0.45 * (k >= 0.75 ? clamp((k - 0.75) * 5) : 0);
          }
          this.sabreFace(c, a.target.x, a.target.z);
        }
        if (el >= a.hit && !a.struck) {
          // le nodachi frappe le sol : la case tremble et se fend
          const P = a.target, sq = this.terrain && this.terrain.squares, plate = this.fx(a, new T.Mesh(new T.BoxGeometry(0.98, 0.05, 0.98), new T.MeshStandardMaterial({ color: sq ? sq[1] : '#5c3a24', roughness: 0.85 })));
          plate.position.set(P.x, 0.03, P.z); a.plate = plate;
          for (let i = 0; i < 6; i++) { const r = this.fx(a, new T.Mesh(new T.BoxGeometry(0.03, 0.012, 0.42), new T.MeshBasicMaterial({ color: 0x120d12 }))), ang = i * 1.05; r.position.set(P.x + Math.cos(ang) * 0.24, 0.062, P.z + Math.sin(ang) * 0.24); r.rotation.y = -ang + Math.PI / 2; }
          struck([0xbfb4c4, a.pal.mid], 1.25, 0.2);
        }
        if (a.plate) { const u = clamp((el - a.hit) / 0.7); a.plate.position.y = 0.03 + (u < 1 ? Math.abs(Math.sin(el * 42)) * 0.1 * (1 - u) : 0); a.plate.rotation.set((1 - u) * Math.sin(el * 37) * 0.09, 0, (1 - u) * Math.cos(el * 31) * 0.09); }
      } else if (kind === 'n') {
        if (!going) {
          const k = clamp(el / a.approach), e = k * k * (3 - 2 * k), lift = smooth((el - a.hit) / 0.3);
          c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * e, 0, a.from.z + (a.stop.z - a.from.z) * e);
          this.sabreFace(c, a.target.x, a.target.z);
          M.animate(p, t, el < a.approach ? 'run' : 'idle');
          p.root.position.y = Math.sin(k * Math.PI) * 0.75;
          if (p.lance) p.lance.rotation.x = -0.32 * lift * (1 - smooth((el - a.hit - 1) / 0.25));
          a.tipPos = p.lanceTip ? p.lanceTip.getWorldPosition(new T.Vector3()) : new T.Vector3(a.stop.x, 0.9, a.stop.z);
          if (el >= a.hit) struck([0xffffff, a.pal.mid], 0.55, 0.06);
        }
      } else if (!going) { // ashigaru : duel au sabre, puis il transperce
        const k = clamp(el / a.approach);
        if (el < a.approach) { c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * k, 0, a.from.z + (a.stop.z - a.from.z) * k); M.animate(p, t, 'run'); }
        else {
          c.holder.position.set(a.stop.x, 0, a.stop.z);
          if (el < a.clash) {
            const hits = (el - a.approach) * 3.4; M.animate(p, t, 'punch', hits);
            p.root.position.z = Math.sin(hits * Math.PI * 2) * 0.05;
            this.flash(a.stop, a.target, hits, a.white ? 0xffe6a0 : 0xd8b4ff);
          } else {
            const u = smooth((el - a.clash) / 0.25);
            M.animate(p, t, 'idle'); p.armR.rotation.set(-1.6, 0, 0); p.torso.rotation.x = 0.3 * u; p.root.position.z = 0.28 * u;
          }
        }
        this.sabreFace(c, a.target.x, a.target.z);
        if (el >= a.hit) struck([0xffffff, a.pal.mid], 0.5, 0.05);
      }
    }

    /* ---------- La pièce prise ---------- */
    tickSabreVictim(d, a, c, el, t, M) {
      if (el >= a.duration || a.ended) return false; // attaque finie, ou interrompue par le coup suivant
      const p = c.parts, r = p.root, B = a.target, dir = a.dir, after = el - a.hit, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const kind = a.sabre;
      if (after < 0) {
        const from = a.stop && kind !== 'K' ? a.stop : a.from;
        this.sabreFace(c, from.x, from.z);
        if (kind === 'p' && el > a.approach) { M.animate(p, t, 'punch', (el - a.approach) * 3.4 + 0.5); r.position.z = 0; }
        else if (kind === 'p' || kind === 'K') M.animate(p, t, 'idle');
        else M.animate(p, t, 'guard', 1);
        return true;
      }
      if (c.shadow) c.shadow.visible = false;
      if (kind === 'q' || kind === 'r') {
        // enflammée et éjectée loin dans le décor
        if (!a.victimFire) a.victimFire = this.fx(a, this.sabreFlames(a.white, 0.34, 1.1, 11));
        const u = clamp(after / 1.3), far = u * (2 - u) * 14;
        c.holder.position.set(B.x + dir.x * far, 0, B.z + dir.z * far);
        M.animate(p, t, 'ko'); r.position.y = Math.sin(u * Math.PI) * 3 + 0.05; r.rotation.set(u * 9, u * 3, u * 5);
        c.holder.visible = u < 1;
        a.victimFire.position.set(c.holder.position.x, r.position.y + 0.1, c.holder.position.z);
        this.sabreFlicker(a.victimFire, t, u < 1 ? 1 : 0);
      } else if (kind === 'b') {
        // emportée par les deux arcs hors du plateau
        const at = a.arcAt || new this.THREE.Vector3(B.x, 0.85, B.z);
        c.holder.position.set(at.x, 0, at.z);
        M.animate(p, t, 'ko'); r.position.y = 0.3; r.rotation.set(after * 5, after * 9, 0);
        c.holder.visible = after < 0.95;
      } else if (kind === 'n') {
        // accrochée à la lance une seconde, puis elle tombe
        const tip = a.tipPos || new this.THREE.Vector3(B.x, 0.9, B.z), fall = smooth((after - 1) / 0.5);
        M.animate(p, t, 'ko');
        c.holder.position.set(tip.x + (B.x - tip.x) * fall, Math.max(0, (tip.y - 0.42) * (1 - fall)), tip.z + (B.z - tip.z) * fall);
        r.position.y = 0; r.rotation.set(0.35 + fall * 1.1, 0, Math.sin(el * 9) * 0.05 * (1 - fall));
        c.holder.visible = el < a.moveAt;
      } else if (kind === 'p') {
        M.animate(p, t, 'ko', 1);
        const fall = smooth((after - 0.35) / 0.35);
        r.position.y = 0; r.rotation.set(-1.5 * fall, 0, 0);
        c.holder.visible = el < a.moveAt;
      } else if (kind === 'K') {
        // un instant immobile, puis elle s'effondre : le coup est déjà passé
        const fall = smooth((after - 0.55) / 0.35);
        M.animate(p, t, fall > 0 ? 'ko' : 'idle');
        r.rotation.set(1.5 * fall, 0, 0); r.position.y = 0;
        c.holder.visible = el < a.moveAt;
      } else {
        const up = clamp(after / 0.5), fall = smooth((after - 0.45) / 0.3);
        M.animate(p, t, 'ko');
        r.position.y = Math.sin(up * Math.PI) * 0.75; r.rotation.set(up * 2 + fall, 0, 0);
        c.holder.visible = el < a.moveAt;
      }
      return true;
    }

    /* ---------- Mats ---------- */
    makeSabreMate(u, at, keep, basic, std) {
      const T = this.THREE, P = u.target, g = u.fx, style = u.themed, A = this.sqToPos(u.attackerTo), white = u.piece === u.piece.toUpperCase(), pal = this.sabrePal(white);
      const s = u.sabre = { white, pal, A, dir: new T.Vector3(P.x - A.x, 0, P.z - A.z), flames: [] };
      g.visible = false; // rien ne se montre avant le début du mat, pendant que l'attaquant rejoint sa case
      s.len = Math.max(0.01, s.dir.length()); s.dir.normalize();
      const yaw = this.viewYaw();
      const crestBits = (color) => {
        s.bits = [];
        for (const k of [-1, 1]) { const m = new T.Mesh(new T.TorusGeometry(0.22, 0.03, 6, 12, 2), std(color, { metalness: 0.7, roughness: 0.3 })); m.visible = false; m.userData.k = k; g.add(m); s.bits.push(m); }
      };
      if (style === 'sakura') {
        s.stroke = new T.Group(); s.stroke.position.set(P.x, 2.4, P.z); s.stroke.rotation.set(0, yaw, 0.42);
        s.stroke.add(new T.Mesh(new T.BoxGeometry(26, 0.11, 0.11), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })), new T.Mesh(new T.BoxGeometry(26, 0.34, 0.34), basic(0xdfeaff, 0.4)));
        g.add(s.stroke);
        const leaf = new T.PlaneGeometry(0.16, 0.11), tints = [basic(0xf4b6c6, 0.95), basic(0xeaa0b6, 0.95), basic(0xfbe0e7, 0.95)];
        s.petals = [];
        for (let i = 0; i < 240; i++) { const m = new T.Mesh(leaf, tints[i % 3]); m.userData = { a: Math.random() * 6.3, r: 0.3 + Math.random() * 2.6, y: Math.random() * 4.5, sp: 0.5 + Math.random() * 1.1, fall: 1.5 + Math.random() * 1.6, spin: Math.random() * 6 }; m.visible = false; g.add(m); s.petals.push(m); }
        crestBits(0xb07a3c);
      } else if (style === 'lunepourpre') {
        s.moon = new T.Group(); s.moon.position.set(-Math.sin(yaw) * 20 + Math.cos(yaw) * 6, 9, -Math.cos(yaw) * 20 - Math.sin(yaw) * 6);
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 4.4, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 3, 0);
        s.nightMat = new T.MeshBasicMaterial({ color: 0x0e090e, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; } // le soleil couchant s'efface devant la lune rouge
        s.night = new T.Mesh(new T.SphereGeometry(32, 24, 12), s.nightMat); g.add(s.night);
        const lunar = new T.MeshBasicMaterial({ color: 0xc41e2e, transparent: true, opacity: 0, fog: false, toneMapped: false }), halo = new T.MeshBasicMaterial({ color: 0x8a1020, transparent: true, opacity: 0, fog: false, depthWrite: false, side: T.BackSide, toneMapped: false });
        s.moon.add(new T.Mesh(new T.SphereGeometry(3, 28, 18), lunar), new T.Mesh(new T.SphereGeometry(3.9, 24, 16), halo)); g.add(s.moon); s.moonMats = [lunar, halo];
        s.ink = [];
        const inkMat = new T.MeshBasicMaterial({ color: 0x050305, transparent: true, opacity: 0.95, depthWrite: false }), blob = new T.SphereGeometry(1, 12, 8);
        for (let i = 0; i < 26; i++) { const m = new T.Mesh(blob, inkMat), l = (i % 5 - 2) * 0.32; m.userData = { k: Math.floor(i / 5) * 0.06, l, h: 0.5 + (i % 4) * 0.32, w: 0.38 + (i % 3) * 0.14 }; m.visible = false; g.add(m); s.ink.push(m); }
        s.ash = [];
        const ashMat = basic(0x8d8590, 0.9), bit = new T.BoxGeometry(0.05, 0.05, 0.05);
        for (let i = 0; i < 80; i++) { const m = new T.Mesh(bit, ashMat); m.userData = { x: (Math.random() - 0.5) * 11, z: (Math.random() - 0.5) * 11, y: Math.random() * 7, sp: 0.4 + Math.random() * 0.8 }; m.visible = false; g.add(m); s.ash.push(m); }
        crestBits(0xc9a24a);
      } else if (style === 'dragonw' || style === 'dragonb') {
        // nuages sombres d'où descend le dragon
        const cloud = new T.SphereGeometry(1, 12, 8), cloudMat = new T.MeshBasicMaterial({ color: white ? 0x2a2433 : 0x161020, transparent: true, opacity: 0, depthWrite: false });
        s.cloudMat = cloudMat;
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 12.5 + (i % 4) * 1.2, c = new T.Mesh(cloud, cloudMat); c.position.set(Math.cos(a) * r, 5.5 + (i % 3) * 0.8, Math.sin(a) * r); c.scale.set(3.4, 1, 2.6); c.rotation.y = -a; g.add(c); }
        s.segs = [];
        const n = 48, mid = this.sabreFire(pal.dragon, 0.97), deep = this.sabreFire(pal.deep, 0.45), hot = this.sabreFire(pal.hot, 0.95), scale = new T.SphereGeometry(1, 12, 8), spine = new T.ConeGeometry(0.5, 1.5, 5);
        for (let i = 0; i < n; i++) {
          const m = new T.Group(), r = 0.44 * Math.pow(1 - i / n, 0.6) + 0.05;
          const body = new T.Mesh(scale, mid), halo = new T.Mesh(scale, deep); body.scale.setScalar(r); halo.scale.setScalar(r * 1.45); m.add(body, halo);
          if (i % 3 === 0) { const c = new T.Mesh(spine, hot); c.position.y = r * 1.25; c.scale.setScalar(r * 0.8); m.add(c); }
          m.visible = false; g.add(m); s.segs.push(m);
        }
        const head = new T.Group(); s.head = head; g.add(head);
        const skull = new T.Mesh(new T.SphereGeometry(0.5, 14, 10), mid); skull.scale.set(0.95, 0.75, 1.3); head.add(skull);
        const snout = new T.Mesh(new T.BoxGeometry(0.46, 0.2, 0.62), hot); snout.position.set(0, 0.04, 0.66); head.add(snout);
        s.jaw = new T.Mesh(new T.BoxGeometry(0.4, 0.09, 0.62), mid); s.jaw.position.set(0, -0.2, 0.55); head.add(s.jaw);
        for (const k of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.08, 0.8, 6), hot); horn.position.set(k * 0.25, 0.35, -0.4); horn.rotation.set(-1.1, 0, k * -0.3); head.add(horn);
          const eye = new T.Mesh(new T.SphereGeometry(0.075, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff })); eye.position.set(k * 0.27, 0.2, 0.3); head.add(eye);
          for (let i = 0; i < 3; i++) { const fang = new T.Mesh(new T.ConeGeometry(0.04, 0.16, 4), new T.MeshBasicMaterial({ color: 0xffffff })); fang.rotation.x = Math.PI; fang.position.set(k * 0.17, -0.1, 0.5 + i * 0.17); head.add(fang); }
        }
        head.visible = false;
        s.handFire = this.sabreFlames(white, 0.14, 0.55, 8); g.add(s.handFire);
        s.embers = [];
        const spark = new T.SphereGeometry(0.05, 6, 4);
        for (let i = 0; i < 60; i++) { const m = new T.Mesh(spark, hot); m.visible = false; g.add(m); s.embers.push(m); }
      } else if (style === 'fracasw' || style === 'fracasb') {
        const models = root.ThemeModels.sabres;
        s.ball = new T.Group(); s.ball.add(this.sabreProp(models.ball(T, white)));
        s.ball.scale.setScalar(1.6); g.add(s.ball);
        s.ballFire = this.sabreFlames(white, 0.4, 1.4, 14); g.add(s.ballFire);
        s.chain = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6), new T.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.8, roughness: 0.3 })); g.add(s.chain);
        // sous les cases : le trou sombre, puis les 64 cases qui volent en éclats depuis le point d'impact
        const squares = (this.terrain && this.terrain.squares) || ['#d9b98a', '#5c3a24'];
        const lightMat = new T.MeshStandardMaterial({ color: squares[0], roughness: 0.8 }), darkMat = new T.MeshStandardMaterial({ color: squares[1], roughness: 0.8 }), tile = new T.BoxGeometry(0.98, 0.09, 0.98);
        s.pit = new T.Mesh(new T.PlaneGeometry(8.02, 8.02), new T.MeshBasicMaterial({ color: 0x0a0708 })); s.pit.rotation.x = -Math.PI / 2; s.pit.position.y = 0.018; s.pit.visible = false; g.add(s.pit);
        s.tiles = [];
        for (let i = 0; i < 64; i++) {
          const f = i & 7, r = i >> 3, m = new T.Mesh(tile, (f + r) % 2 ? darkMat : lightMat), x = f - 3.5, z = r - 3.5, d = Math.hypot(x - P.x, z - P.z), ang = Math.atan2(z - P.z, x - P.x);
          m.position.set(x, 0.05, z); m.visible = false;
          m.userData = { x, z, delay: d * 0.035, vx: Math.cos(ang) * (2.4 + Math.random() * 2.6) + (Math.random() - 0.5), vz: Math.sin(ang) * (2.4 + Math.random() * 2.6) + (Math.random() - 0.5), vy: 8.5 - Math.min(5, d * 0.7) + Math.random() * 3, rx: (Math.random() - 0.5) * 14, rz: (Math.random() - 0.5) * 14 };
          g.add(m); s.tiles.push(m);
        }
        s.cracks = [];
        for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + Math.random() * 0.2, L = 3 + Math.random() * 4, m = at(new T.Mesh(new T.BoxGeometry(0.06, 0.02, L), basic(pal.mid, 0.95)), Math.cos(a) * L / 2, 0.03, Math.sin(a) * L / 2); m.rotation.y = -a + Math.PI / 2; m.visible = false; s.cracks.push(m); }
      } else if (style === 'arcw' || style === 'arcb') {
        s.sail = new T.Group(); s.sail.rotation.y = yaw; g.add(s.sail);
        const big = this.sabreSail(1.25, 3.6, pal.arc, 0.92); big.position.y = 1.8; big.rotation.z = -0.28; s.sail.add(big);
        const core = this.sabreSail(0.6, 3.1, white ? 0xffe9b0 : 0xffffff, 0.9); core.position.set(0, 1.8, 0.05); core.rotation.z = -0.28; s.sail.add(core);
        s.sail.visible = false;
        // feu sur chaque case traversée
        s.trail = [];
        for (let k = 1; k < 12; k++) {
          const x = A.x + s.dir.x * k, z = A.z + s.dir.z * k;
          if (Math.abs(x) > 4 || Math.abs(z) > 4) break;
          const f = this.sabreFlames(white, 0.4, 0.95, 8); f.position.set(x, 0.02, z); f.userData.s = k; f.visible = false; g.add(f); s.trail.push(f);
        }
        // pièces adverses dans le couloir de l'arc
        const enemyWhite = !white; s.swept = new Map();
        for (const c of this.chars.values()) {
          if (c === u.king || (c.piece === c.piece.toUpperCase()) !== enemyWhite) continue;
          const dx = c.holder.position.x - A.x, dz = c.holder.position.z - A.z, along = dx * s.dir.x + dz * s.dir.z, side = Math.abs(dx * s.dir.z - dz * s.dir.x);
          if (along > 0.3 && side < 1.05) s.swept.set(c, { along, off: (dx * s.dir.z - dz * s.dir.x) * -1, spin: 1 + Math.random() * 2, position: c.holder.position.clone(), visible: c.holder.visible, rotation: c.parts.root.rotation.clone() });
        }
      } else if (style === 'ridew' || style === 'rideb') {
        s.riderFire = this.sabreFlames(white, 0.36, 0.8, 14, 0.55); g.add(s.riderFire);
        s.horseFire = this.sabreFlames(white, 0.5, 0.5, 16, 0.55); g.add(s.horseFire);
        s.kingFire = this.sabreFlames(white, 0.3, 0.9, 9); g.add(s.kingFire);
        const dist = Math.min(1.05, s.len);
        s.stop = { x: P.x - s.dir.x * dist, z: P.z - s.dir.z * dist };
      } else if (style === 'lamew' || style === 'lameb') {
        s.blade = this.sabreFlames(white, 0.11, 0.42, 7); g.add(s.blade);
        s.kingFire = this.sabreFlames(white, 0.36, 1.25, 13); g.add(s.kingFire);
        s.slashes = [];
        for (let i = 0; i < 3; i++) {
          const m = this.sabreSail(0.4, 1.5, pal.mid, 0.95); m.position.set(P.x, 0.8, P.z); m.rotation.set(0, yaw, [-0.8, 0.8, 0][i]); m.visible = false; g.add(m); s.slashes.push(m);
        }
        const dist = Math.min(0.62, s.len);
        s.stop = { x: P.x - s.dir.x * dist, z: P.z - s.dir.z * dist };
      }
    }
    // Trajet du dragon : descente, premier tour du plateau, morsure, deuxième tour en montant vers les nuages
    sabreDragonPos(s, P, q) {
      const T = this.THREE, ring = (k, y, r = 5.5) => { const a = -2.2 + k * Math.PI * 2; return new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r); };
      if (q < 0) return new T.Vector3(-9 + q, 11, -9);
      if (q < 0.9) return new T.Vector3(-9, 11, -9).lerp(ring(0, 2.6), q / 0.9);
      if (q < 2.9) return ring((q - 0.9) / 2, 2.6 + Math.sin((q - 0.9) * Math.PI) * 0.5);
      if (q < 3.5) { const k = (q - 2.9) / 0.6; return ring(1, 2.6).lerp(new T.Vector3(P.x, 0.95, P.z), k * k); }
      if (q < 3.95) return new T.Vector3(P.x, 0.95, P.z).lerp(ring(1.25, 3, 5.5), (q - 3.5) / 0.45);
      return ring(1.25 + (q - 3.95) / 2.6, 3 + (q - 3.95) * 2.6, 5.5);
    }
    tickSabreMateFx(u, t, e, clamp, smooth, hit, after) {
      const T = this.THREE, s = u.sabre, P = u.target, style = u.themed, fade = (d) => (after > 0 ? Math.max(0, 1 - after / d) : 1), A = s.A;
      u.fx.visible = true;
      if (this.checkGroup) this.checkGroup.visible = false;
      if (s.stop && e > 0.8) { u.pillar.material.opacity = 0; u.aura.material.opacity = 0; }
      const breakCrest = () => {
        if (after < 0 || s.broken) return;
        s.broken = true;
        const crest = u.king && u.king.parts.crest;
        if (crest) { crest.visible = false; (u.hiddenParts = u.hiddenParts || []).push(crest); }
        for (const m of s.bits) m.visible = true;
      };
      const dropBits = () => { if (!s.bits) return; for (const m of s.bits) { const k = clamp(after / 0.8), d = m.userData.k; m.visible = after >= 0; m.position.set(P.x + d * (0.16 + k * 0.42), Math.max(0.06, 1.35 - k * k * 1.3), P.z + d * k * 0.2); m.rotation.set(k * 5, d * k * 3, d * 0.8); } };
      if (style === 'sakura') {
        this.skyDim = Math.max(this.skyDim || 0, smooth(e / 1.6) * 0.7 * fade(2));
        s.stroke.visible = e > 2.15 && e < 2.75; s.stroke.scale.set(smooth((e - 2.15) / 0.1), 1 - clamp((e - 2.3) / 0.45), 1 - clamp((e - 2.3) / 0.45));
        for (const m of s.petals) {
          const d = m.userData, a = d.a + (after + 3) * d.sp, h = ((d.y - Math.max(0, after) * d.fall) % 4.5 + 4.5) % 4.5, r = d.r * (0.35 + 0.65 * (1 - clamp(after / 1.4)) ) + 0.2;
          m.visible = after > -0.15 && after < 2.2; m.position.set(P.x + Math.cos(a) * r, 0.05 + h, P.z + Math.sin(a) * r); m.rotation.set(d.spin + t * 3, d.spin + t * 2, 0);
        }
        breakCrest(); dropBits();
      } else if (style === 'lunepourpre') {
        this.skyDim = Math.max(this.skyDim || 0, smooth(e / 1.3) * 0.92 * fade(2.2));
        const rise = smooth((e - 0.3) / 1.4), f = fade(2.2);
        s.moonMats[0].opacity = rise; s.moonMats[1].opacity = rise * 0.6; s.nightMat.opacity = smooth(e / 1.3);
        const k = clamp((e - 2.3) / (hit - 2.3)), dir = s.dir, side = new T.Vector3(-dir.z, 0, dir.x);
        for (const m of s.ink) {
          const d = m.userData, w = clamp(k * 1.25 - d.k);
          m.visible = e > 2.3 && after < 1.5;
          m.position.set(A.x + dir.x * s.len * w + side.x * d.l, d.h * 0.5, A.z + dir.z * s.len * w + side.z * d.l);
          const sc = (d.w + (after > 0 ? after * 0.7 : 0)) * (1 - clamp((after - 0.7) / 0.8));
          m.scale.set(Math.max(0.01, sc), Math.max(0.01, sc * (1.5 + Math.sin(t * 9 + d.l) * 0.3)), Math.max(0.01, sc));
        }
        for (const m of s.ash) { const d = m.userData; m.visible = after > -0.2 && after < 2.2; m.position.set(d.x, ((d.y - after * d.sp) % 7 + 7) % 7, d.z); m.rotation.set(t * 2, t, 0); }
        breakCrest(); dropBits();
      } else if (style === 'dragonw' || style === 'dragonb') {
        this.skyDim = Math.max(this.skyDim || 0, smooth((e - 0.7) / 0.8) * 0.88 * fade(2.8));
        s.cloudMat.opacity = smooth((e - 0.7) / 0.8) * 0.9 * fade(3);
        const q = e - 1.1, end = hit + 2.9;
        if (u.actor.parts.tip) { u.actor.parts.tip.getWorldPosition(s.handFire.position); this.sabreFlicker(s.handFire, t, smooth((e - 0.3) / 0.4) * fade(0.6)); }
        s.segs.forEach((m, i) => { const q2 = q - i * 0.02; m.visible = q2 > 0 && e < end; if (m.visible) { m.position.copy(this.sabreDragonPos(s, P, q2)); m.lookAt(this.sabreDragonPos(s, P, q2 + 0.03)); m.scale.setScalar(1 - smooth((e - end + 0.7) / 0.7) * 0.9); } });
        s.head.visible = q > 0 && e < end;
        if (s.head.visible) {
          const pos = this.sabreDragonPos(s, P, q); s.head.position.copy(pos); s.head.lookAt(this.sabreDragonPos(s, P, q + 0.03));
          s.head.scale.setScalar(1.25 * (1 - smooth((e - end + 0.7) / 0.7) * 0.9));
          s.mouth = pos.clone();
          s.jaw.rotation.x = (after > 0 ? 0.08 : 0.5 * Math.abs(Math.sin(t * 6)));
        }
        s.embers.forEach((m, i) => { const ph = (t * 0.7 + i * 0.137) % 1, q2 = q - i * 0.07; m.visible = q2 > 0 && e < end; if (m.visible) { m.position.copy(this.sabreDragonPos(s, P, q2)); m.position.x += Math.sin(i * 7) * 0.5; m.position.z += Math.cos(i * 5) * 0.5; m.position.y += Math.sin(i * 3) * 0.3 - ph * 1.2; m.scale.setScalar(1 - ph * 0.8); } });
      } else if (style === 'fracasw' || style === 'fracasb') {
        const hand = u.actor.parts.muzzle ? u.actor.parts.muzzle.getWorldPosition(new T.Vector3()) : new T.Vector3(A.x, 1.2, A.z), king = new T.Vector3(P.x, 0.85, P.z);
        const whirl = hand.clone().add(new T.Vector3(Math.cos(t * 9) * 0.65, 0.55, Math.sin(t * 9) * 0.65));
        let pos = whirl, power = 0.55;
        for (const T0 of [1.1, 2.0, 2.9]) {
          if (e > T0 - 0.32 && e <= T0) { const k = (e - (T0 - 0.32)) / 0.32; pos = whirl.clone().lerp(king, k * k); power = 1; }
          else if (e > T0 && e <= T0 + 0.38) pos = king.clone().lerp(whirl, (e - T0) / 0.38);
          if (e >= T0 && !s['hit' + T0]) { s['hit' + T0] = true; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot, 0xffffff], 12, 0.9); this.shakeUntil = t + 0.22; this.shakeAmp = 0.1; }
        }
        if (e > 3.3) {
          const top = new T.Vector3(P.x, 6.5, P.z), ground = new T.Vector3(P.x, 0.35, P.z);
          if (e < 3.95) pos = whirl.clone().lerp(top, smooth((e - 3.3) / 0.65));
          else if (after < 0) { const k = (e - 3.95) / (hit - 3.95); pos = top.clone().lerp(ground, k * k * k); }
          else pos = ground.clone().setY(0.2);
          power = 1.15;
        }
        s.ball.position.copy(pos); s.ball.rotation.set(t * 8, t * 5, 0);
        s.ballFire.position.copy(pos).setY(pos.y - 0.12); this.sabreFlicker(s.ballFire, t, power * fade(1.4));
        this.sabreLink(s.chain, hand, pos);
        // le plateau se brise
        if (after >= 0) {
          if (!s.shattered) { s.shattered = true; s.pit.visible = true; for (const m of s.cracks) m.visible = true; for (const m of s.tiles) m.visible = true; this.shakeUntil = t + 1.1; this.shakeAmp = 0.34; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot, 0xffffff], 34, 2.1); }
          for (const m of s.tiles) {
            const d = m.userData, a = Math.max(0, after - d.delay), y = 0.05 + d.vy * a - 6 * a * a;
            m.position.set(d.x + d.vx * a, y, d.z + d.vz * a); m.rotation.set(d.rx * a, 0, d.rz * a); m.visible = y > -1.2;
          }
          for (const m of s.cracks) m.material.opacity = 0.95 * Math.max(0.35, 1 - after / 3);
        }
      } else if (style === 'arcw' || style === 'arcb') {
        const launch = 1.4, gone = after > 1.6;
        const travelled = e < launch ? 0 : after < 0 ? s.len * (e - launch) / (hit - launch) : s.len + after * 9;
        s.arcS = travelled;
        s.sail.visible = e >= launch && !gone;
        s.sail.position.set(A.x + s.dir.x * travelled, Math.sin(t * 8) * 0.04, A.z + s.dir.z * travelled);
        s.sail.scale.setScalar(smooth((e - launch) / 0.25));
        for (const f of s.trail) { const k = travelled >= f.userData.s ? clamp(1 - (after - 2.1) / 0.9) : 0; this.sabreFlicker(f, t, k); }
        if (e >= hit && !s.arcBurst) { s.arcBurst = true; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot, 0xffffff], 20, 1.5); this.shakeUntil = t + 0.4; this.shakeAmp = 0.18; }
      } else if (style === 'ridew' || style === 'rideb') {
        const on = smooth((e - 0.2) / 0.7);
        if (!s.tinted) {
          s.tinted = true; const hotColor = s.white ? 0xff8a26 : 0x9440ff;
          this.tintCharacter(u, u.actor, hotColor, 0.72).forEach((m) => { if (m.emissive) { m.emissive.setHex(hotColor); m.emissiveIntensity = 0.75; } });
        }
        const h = u.actor.holder.position, y = u.actor.parts.root.position.y;
        s.riderFire.position.set(h.x, y + 0.55, h.z); this.sabreFlicker(s.riderFire, t, on);
        s.horseFire.position.set(h.x, y + 0.05, h.z); this.sabreFlicker(s.horseFire, t, on);
        if (u.king) { const k = u.king.holder.position; s.kingFire.position.set(k.x, k.y + 0.05, k.z); this.sabreFlicker(s.kingFire, t, smooth((e - 2.2) / 0.5) * fade(1.6)); }
        for (const T0 of [2.7, 3.15, 3.6, 4.05]) if (e >= T0 && !s['hit' + T0]) { s['hit' + T0] = true; this.sabreBurst(u.king ? u.king.holder.position : P, t, [s.pal.mid, s.pal.hot], 10, 0.7, 0.4); this.shakeUntil = t + 0.15; this.shakeAmp = 0.1; }
      } else if (style === 'lamew' || style === 'lameb') {
        const tip = u.actor.parts.tip ? u.actor.parts.tip.getWorldPosition(new T.Vector3()) : new T.Vector3(A.x, 1, A.z);
        s.blade.position.copy(tip).setY(tip.y - 0.25); this.sabreFlicker(s.blade, t, smooth((e - 0.15) / 0.4));
        s.slashes.forEach((m, i) => { const T0 = 1.0 + i * 0.6, k = clamp((e - T0) / 0.32); m.visible = e >= T0 && k < 1; m.material.opacity = 0.95 * (1 - k); m.scale.setScalar(0.6 + k * 0.7); if (e >= T0 && !s['hit' + i]) { s['hit' + i] = true; this.sabreBurst(P, t, [s.pal.mid, s.pal.hot], 12, 0.8); this.shakeUntil = t + 0.14; this.shakeAmp = 0.08; } });
        if (u.king) { const k = u.king.holder.position; s.kingFire.position.set(k.x, 0.03, k.z); this.sabreFlicker(s.kingFire, t, smooth((e - 2.2) / 0.5) * fade(1.8)); }
      }
    }
    tickSabreMate(c, t, M, u, hit) {
      const T = this.THREE, e = t - u.start, after = e - hit, P = u.target, s = u.sabre, style = u.themed, p = c.parts, r = p.root;
      const clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      if (c === u.actor) {
        c.anim = null;
        const F = u.fromPos, face = () => this.sabreFace(c, P.x, P.z);
        c.holder.position.set(F.x, 0, F.z);
        if (style === 'ridew' || style === 'rideb') {
          const jump = clamp((e - 1) / 0.8), k = jump * jump * (3 - 2 * jump);
          c.holder.position.set(F.x + (s.stop.x - F.x) * k, 0, F.z + (s.stop.z - F.z) * k); face();
          M.animate(p, t, e > 1 && e < 1.8 ? 'run' : 'idle');
          r.position.y += Math.sin(jump * Math.PI) * 1.7;
          p.rear = smooth((e - 2.15) / 0.4) * (1 - smooth(after / 0.5));
          if (p.lance) p.lance.rotation.x = 0.2 * (p.rear || 0);
          p.rider.rotation.x = 0.7 * p.rear;
          if (p.lanceTip) s.tip = p.lanceTip.getWorldPosition(new T.Vector3());
        } else if (style === 'lamew' || style === 'lameb') {
          const w = clamp((e - 0.3) / 0.45);
          c.holder.position.set(F.x + (s.stop.x - F.x) * w, 0, F.z + (s.stop.z - F.z) * w); face();
          if (e < 0.75) M.animate(p, t, e > 0.3 ? 'run' : 'idle');
          else if (e < 2.6) M.animate(p, t, 'punch', (e - 0.75) / 0.6 + 0.0);
          else M.animate(p, t, 'victory', 1);
        } else if (style === 'fracasw' || style === 'fracasb') {
          face(); M.animate(p, t, e < hit ? 'punch' : 'victory', e < hit ? e * 1.2 : 1); if (p.ball) p.ball.visible = false;
        } else if (style === 'arcw' || style === 'arcb') {
          face();
          if (e < 1.5) { M.animate(p, t, 'idle'); const w = smooth((e - 0.2) / 1), cut = smooth((e - 1.3) / 0.14); p.armR.rotation.set(-2.9 * w + cut * 2, 0, 0.3 - cut * 0.7); p.armL.rotation.set(-2.9 * w + cut * 2, 0, -0.3 + cut * 0.7); }
          else M.animate(p, t, e < hit + 0.5 ? 'idle' : 'victory', 1);
        } else if (style === 'sakura') {
          face();
          if (e < 2.1) { M.animate(p, t, 'idle'); p.armR.rotation.set(-0.5, 0, -0.6); p.torso.rotation.y = 0.6; p.root.position.y = -0.05; }
          else if (e < hit) { M.animate(p, t, 'idle'); const k = clamp((e - 2.1) / 0.15); p.armR.rotation.set(-1.7, 0, -0.6 + k * 2); p.torso.rotation.y = 0.6 - k * 1.1; }
          else M.animate(p, t, 'victory', 1);
        } else if (style === 'lunepourpre') {
          face();
          if (e < hit - 0.55) { M.animate(p, t, 'idle'); const up = smooth(e / 1.5); p.armR.rotation.set(-2.9 * up - 0.9 * (1 - up), 0, -0.45); p.armL.rotation.set(-2.9 * up - 0.9 * (1 - up), 0, 0.45); }
          else if (e < hit) { M.animate(p, t, 'idle'); const k = smooth((e - hit + 0.55) / 0.2); p.armR.rotation.set(-2.9 + k * 2.2, 0, -0.45); p.armL.rotation.set(-2.9 + k * 2.2, 0, 0.45); p.torso.rotation.x = 0.4 * k; }
          else M.animate(p, t, 'victory', 1);
        } else if (style === 'dragonw' || style === 'dragonb') {
          // les mains et la naginata se lèvent vers le ciel pour invoquer le dragon
          const k = smooth(e / 0.6), shake = Math.sin(t * 9) * 0.03 * k;
          face(); M.animate(p, t, after < 0 ? 'idle' : 'victory', 1);
          if (after < 0) { p.armR.rotation.set(0, 0, 0.3 + 2.4 * k + shake); p.armL.rotation.set(0, 0, -0.3 - 2.4 * k - shake); p.head.rotation.x = -0.55 * k; p.torso.rotation.x = -0.12 * k; }
          if (p.naginata) p.naginata.rotation.x = Math.PI / 2 * k;
        } else { face(); M.animate(p, t, e < hit ? 'cast' : 'victory', e < hit ? clamp(e / 0.6) : 1); }
        this.tickThemeMateFx(u, t, e, clamp, smooth, hit, after);
        return true;
      }
      // le roi
      c.anim = null; c.holder.position.set(P.x, 0, P.z);
      if (style === 'dragonw' || style === 'dragonb') {
        if (after < 0) { M.animate(p, t, 'panic', 1); return true; }
        M.animate(p, t, 'ko', 1);
        if (s.head.visible && s.mouth) { c.holder.position.set(s.mouth.x, Math.max(0, s.mouth.y - 0.55), s.mouth.z); r.position.y = 0; r.rotation.set(1.1, after * 2, 0.4); c.holder.visible = e < hit + 2.4; }
        else c.holder.visible = false;
        return true;
      }
      if (style === 'fracasw' || style === 'fracasb') {
        if (after < 0) {
          let jolt = 0; for (const T0 of [1.1, 2, 2.9]) if (e > T0 && e < T0 + 0.4) jolt = Math.sin((e - T0) / 0.4 * Math.PI);
          M.animate(p, t, jolt > 0 ? 'ko' : 'panic', jolt > 0 ? jolt * 0.35 : 1); if (jolt > 0) { r.position.y = 0; r.rotation.x = -0.4 * jolt; } else r.rotation.x = 0;
        } else { M.animate(p, t, 'ko', 1); r.rotation.set(0, 0, 0); r.position.y = 0; r.scale.set(u.kingBase.scale.x * 1.3, u.kingBase.scale.y * Math.max(0.12, 1 - after * 6), u.kingBase.scale.z * 1.3); }
        return true;
      }
      if (style === 'arcw' || style === 'arcb') {
        if (after < 0) { M.animate(p, t, 'panic', 1); return true; }
        const pos = s.sail.position;
        M.animate(p, t, 'ko', 1);
        c.holder.position.set(pos.x, 0, pos.z); r.position.y = 0.7; r.rotation.set(after * 5, after * 8, 0);
        c.holder.visible = after < 1.5;
        return true;
      }
      if (style === 'ridew' || style === 'rideb') {
        if (e < 1.8) { M.animate(p, t, 'panic', 1); return true; }
        M.animate(p, t, 'ko', 1);
        if (after < 0 && s.tip) {
          // accroché à la lance, devant le samouraï ; les sabots le frappent
          c.holder.position.set(s.tip.x, Math.max(0, s.tip.y - 0.5), s.tip.z); r.position.y = 0;
          r.rotation.set(0.3 + Math.sin(e * 15) * 0.14, 0, Math.sin(e * 11) * 0.1);
          s.lastTip = s.tip.clone();
        } else {
          const L = s.lastTip || new T.Vector3(P.x, 1, P.z), f = smooth(after / 0.55);
          c.holder.position.set(L.x + (P.x - L.x) * f, Math.max(0, L.y - 0.5) * (1 - f), L.z + (P.z - L.z) * f); r.position.y = 0;
          r.rotation.set(0.3 + f * 1.25, 0, 0);
        }
        return true;
      }
      if (style === 'lamew' || style === 'lameb') {
        if (after < 0) {
          let jolt = 0; for (const T0 of [1, 1.6, 2.2]) if (e > T0 && e < T0 + 0.3) jolt = Math.sin((e - T0) / 0.3 * Math.PI);
          M.animate(p, t, jolt > 0 ? 'ko' : 'panic', 1); if (jolt > 0) { r.position.y = 0; r.rotation.x = -0.35 * jolt; } else r.rotation.x = 0;
        } else { M.animate(p, t, 'ko', 1); r.rotation.set(1.5 * smooth(after / 0.5), 0, 0); r.position.y = 0; }
        return true;
      }
      if (after < 0) { M.animate(p, t, 'panic', 1); return true; }
      // Pluie de Sakura, Lune Pourpre : le cimier se brise, puis le roi tombe
      const fall = smooth((after - 0.6) / 0.4);
      M.animate(p, t, fall > 0 ? 'ko' : 'idle', 1); r.rotation.set(1.5 * fall, 0, 0); r.position.y = 0;
      return true;
    }
    // Arc géant : les pièces sur le chemin sont emportées quand l'arc les atteint
    tickSabreSwept(c, t, M, u) {
      const s = u.sabre, d = s.swept.get(c);
      if (s.arcS == null || s.arcS < d.along) return false;
      const k = s.arcS - d.along, pos = s.sail.position, side = { x: -s.dir.z, z: s.dir.x };
      c.anim = null;
      M.animate(c.parts, t, 'ko', 1);
      c.holder.position.set(pos.x + side.x * d.off, 0, pos.z + side.z * d.off);
      c.parts.root.position.y = 0.4 + Math.min(1.6, k * 0.4);
      c.parts.root.rotation.set(k * 2 * d.spin, k * 3, 0);
      c.holder.visible = s.sail.visible;
      if (c.shadow) c.shadow.visible = false;
      return true;
    }
    endSabreMate(u) {
      const s = u.sabre;
      if (this.checkGroup) this.checkGroup.visible = true;
      if (s.weatherShown != null && this.weatherGroup) this.weatherGroup.visible = s.weatherShown;
      if (s.swept) for (const [c, d] of s.swept) { c.holder.position.copy(d.position); c.holder.visible = d.visible; c.parts.root.rotation.copy(d.rotation); c.parts.root.position.set(0, 0, 0); if (c.shadow) c.shadow.visible = true; }
      if (u.actor) { const p = u.actor.parts; p.rear = 0; if (p.naginata) p.naginata.rotation.x = 0; if (p.ball) p.ball.visible = true; if (p.lance) p.lance.rotation.x = 0; if (p.rider) p.rider.rotation.x = 0; }
    }

