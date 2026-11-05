    /* Saga des Auras : armes à distance, pouvoirs spéciaux et événements différés.
       Les pouvoirs sont de courts effets sur la case (addEffect) : ils ne changent rien aux règles. */
    auraAt(at, fn) { (this.auraEvents = this.auraEvents || []).push({ at, fn }); }
    tickAuraEvents(t) {
      if (!this.auraEvents || !this.auraEvents.length) return;
      const due = this.auraEvents.filter((e) => t >= e.at);
      this.auraEvents = this.auraEvents.filter((e) => t < e.at);
      due.forEach((e) => e.fn());
    }
    // Une pièce tombe : cratère sur la dalle, pouvoir de la victime, colère de Nilo, filet de Krax
    auraOnFall(victim, at, t0, attacker) {
      const fighter = (p) => root.themeOf(p) === 'auras';
      if (!fighter(attacker) && !fighter(victim.piece)) return;
      this.auraAt(t0, () => {
        const t = this.lastT || 0;
        this.createCrater(at, t, true);
        if (attacker === 'n' && fighter(attacker)) this.auraBurst('net', at, t);
        if (!fighter(victim.piece)) return;
        const style = { P: 'blind', p: 'smoke', B: 'parry', b: 'field', R: 'wall', r: 'rock', q: 'double' }[victim.piece];
        if (style) this.auraBurst(style, at, t);
        if (victim.piece === victim.piece.toUpperCase()) for (const c of this.chars.values()) if (c.piece === 'N') c.auraFlare = t + 1.6;
      });
    }
    auraBurst(style, at, t) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); this.scene.add(g);
      const glow = (c, o = 0.8) => { const m = this.glow(c, o); m.side = T.DoubleSide; return m; };
      const add = (geo, mat, y = 0.5) => { const m = new T.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
      const dur = { blind: 0.5, smoke: 0.9, parry: 0.6, field: 0.8, wall: 0.9, rock: 1.0, double: 0.8, net: 0.8, blink: 0.35 }[style];
      let step = () => {};
      if (style === 'blind') { const m = add(new T.SphereGeometry(0.5, 16, 12), glow(0xffffff, 1)); step = (k) => { m.scale.setScalar(0.3 + k * 2.2); m.material.opacity = 1 - k; }; }
      else if (style === 'smoke' || style === 'blink') {
        const color = style === 'smoke' ? 0x7a2bff : 0xbfeaff, balls = [];
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, m = add(new T.SphereGeometry(0.13, 10, 8), glow(color, 0.75)); m.userData = { x: Math.cos(a), z: Math.sin(a) }; balls.push(m); }
        step = (k) => balls.forEach((m) => { m.position.set(m.userData.x * (0.1 + k * 0.5), 0.3 + k * 0.5, m.userData.z * (0.1 + k * 0.5)); m.scale.setScalar(0.6 + k * 1.3); m.material.opacity = 0.75 * (1 - k); });
      } else if (style === 'parry') { const m = add(new T.TorusGeometry(0.38, 0.025, 8, 28), glow(0xffd27a, 0.95), 0.6); step = (k) => { m.rotation.y = k * 7; m.scale.setScalar(0.8 + k * 0.7); m.material.opacity = 0.95 * (1 - k); }; }
      else if (style === 'field') { const m = add(new T.IcosahedronGeometry(0.52, 1), Object.assign(glow(0x9ef7ff, 0.5), { wireframe: true })); step = (k) => { m.rotation.y = k * 3; m.material.opacity = 0.5 * (1 - k * k); }; }
      else if (style === 'wall') {
        const plates = [];
        for (let i = 0; i < 3; i++) { const a = -0.7 + i * 0.7, m = add(new T.CylinderGeometry(0.22, 0.26, 0.03, 6), glow(0x7fd8ff, 0.8)); m.rotation.x = Math.PI / 2; m.rotation.y = 0; m.position.set(Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5); plates.push(m); }
        step = (k) => plates.forEach((m) => { m.position.y = Math.min(0.55, k * 2); m.material.opacity = 0.8 * (1 - Math.max(0, k - 0.6) / 0.4); });
      } else if (style === 'rock') {
        const m = add(new T.DodecahedronGeometry(0.42, 0), new T.MeshStandardMaterial({ color: 0x3f3437, flatShading: true, transparent: true })), c = add(new T.SphereGeometry(0.46, 10, 8), glow(0xff7a1a, 0));
        step = (k) => { m.scale.setScalar(Math.min(1, k * 3)); c.material.opacity = k > 0.55 ? 0.8 * (1 - k) * 2 : 0; m.material.opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1; };
      } else if (style === 'double') {
        const m = add(new T.CylinderGeometry(0.13, 0.19, 0.85, 12), glow(0xc04bff, 0.55), 0.55);
        step = (k) => { m.position.x = 0.15 + k * 0.45; m.material.opacity = 0.55 * (1 - k); };
      } else if (style === 'net') {
        const m = add(new T.SphereGeometry(0.46, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), Object.assign(glow(0xdfe2ea, 0.9), { wireframe: true, blending: T.NormalBlending }), 0);
        step = (k) => { m.scale.setScalar(Math.min(1, 0.3 + k * 3)); m.material.opacity = k > 0.7 ? 0.9 * (1 - k) / 0.3 : 0.9; };
      }
      step(0);
      this.addEffect({ start: t, dur, tick: (e) => step(Math.min(1, e / dur)), end: () => this.disposeGroup(g) });
    }
    // En échec : dôme de lumière pour Oro, pesanteur (les cases s'enfoncent) pour Vorax
    tickAuraCheck(c, t) {
      const T = this.THREE, on = c.inCheck && (c.piece === 'K' || c.piece === 'k') && root.themeOf(c.piece) === 'auras';
      if (!on) { if (c.auraDome) c.auraDome.visible = false; return; }
      if (!c.auraDome) {
        const white = c.piece === 'K';
        const m = new T.Mesh(white ? new T.SphereGeometry(0.58, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2) : new T.RingGeometry(0.42, 1.0, 32), this.glow(white ? 0xbfeaff : 0x7a2bff, 0.35));
        m.material.side = T.DoubleSide; if (!white) { m.rotation.x = -Math.PI / 2; m.position.y = 0.03; }
        c.auraDome = m; c.holder.add(m);
      }
      c.auraDome.visible = true;
      c.auraDome.scale.setScalar(1 + Math.sin(t * 5) * 0.05);
    }

    // Armes à distance, orientées le long de +z
    auraProjMesh(kind, white, pal) {
      const T = this.THREE, g = new T.Group();
      const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.4, metalness: 0.5 }, o));
      const ball = (r, c1, c2) => g.add(new T.Mesh(new T.SphereGeometry(r, 12, 8), this.glow(c1, 1)), new T.Mesh(new T.SphereGeometry(r * 1.8, 12, 8), this.glow(c2, 0.5)));
      const bolt = (r, len) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, len, 10), this.glow(pal.jet, 0.95)); m.rotation.x = Math.PI / 2; g.add(m); };
      if (kind === 'burst') ball(0.075, 0xffffff, pal.jet);
      else if (kind === 'darkfire') { g.add(new T.Mesh(new T.SphereGeometry(0.1, 12, 8), new T.MeshBasicMaterial({ color: 0x12081f }))); g.add(new T.Mesh(new T.SphereGeometry(0.19, 12, 8), this.glow(0xc04bff, 0.6))); }
      else if (kind === 'disc') { const m = new T.Mesh(new T.TorusGeometry(0.15, 0.03, 6, 22), this.glow(pal.jet, 1)); m.rotation.x = Math.PI / 2; g.add(m); }
      else if (kind === 'breath') { for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.TorusGeometry(0.12 + i * 0.06, 0.016, 6, 22), this.glow(0xffffff, 0.8)); m.position.z = -i * 0.14; g.add(m); } }
      else if (kind === 'gravity') { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, m = new T.Mesh(new T.OctahedronGeometry(0.075, 0), std(0xc04bff, { emissive: 0x7a2bff })); m.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0); g.add(m); } }
      else if (kind === 'hook') { const m = new T.Mesh(new T.TorusGeometry(0.1, 0.022, 6, 14, 4.4), std(0xdfe2ea)); g.add(m); const c = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.5, 6), std(0xb9bcc7)); c.rotation.x = Math.PI / 2; c.position.z = -0.32; g.add(c); }
      else if (kind === 'slash') { const m = new T.Mesh(new T.TorusGeometry(0.34, 0.035, 6, 20, 2.2), this.glow(0xfff2b8, 1)); m.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 1.1); g.add(m); }
      else if (kind === 'shield') { const m = new T.Mesh(new T.CylinderGeometry(0.17, 0.2, 0.03, 6), std(0xc9d2e4)); g.add(m); g.add(new T.Mesh(new T.SphereGeometry(0.05, 8, 6), this.glow(0x4cc3ff, 1))); }
      else if (kind === 'magma') { g.add(new T.Mesh(new T.DodecahedronGeometry(0.15, 0), std(0x2b2326, { flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0.5 }))); g.add(new T.Mesh(new T.SphereGeometry(0.22, 10, 8), this.glow(0xff7a1a, 0.55))); }
      else bolt(0.04, 0.7); // rayons : un trait de lumière quand ils servent de riposte
      return g;
    }
    auraMissiles(kind, s, add) {
      const T = this.THREE, pal = s.pal, make = () => this.auraProjMesh(kind, s.white, pal), none = new T.Vector3();
      s.trail = kind === 'magma' ? [0xff7a1a, 0x3f3437] : kind === 'hook' ? [0xb9bcc7, 0x8d8d99] : [pal.charge, pal.jet];
      if (kind === 'burst') for (let i = 0; i < 6; i++) add(make(), i * 0.06, new T.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4), 0.3);
      else if (kind === 'magma') add(make(), 0, none, 1.9, 6);
      else if (kind === 'shield') add(make(), 0, none, 0.35, 12);
      else add(make(), 0, none, 0.08);
    }
    startAuraBeams(s, kind) {
      const T = this.THREE, spec = AURA_BEAMS[kind];
      s.auraBeams = spec.off.map((off) => {
        const b = new T.Mesh(new T.CylinderGeometry(spec.r, spec.r, 1, 12), this.glow(s.pal.jet, 0.85));
        b.add(new T.Mesh(new T.CylinderGeometry(spec.r * 0.45, spec.r * 0.45, 1, 10), this.glow(0xffffff, 1)));
        b.userData.off = off; b.visible = false; return this.fx(s, b);
      });
    }
    tickAuraBeams(s, end, el) {
      const T = this.THREE, u = Math.min(1, (el - s.fire) / s.flight * 1.3), dir = end.clone().sub(s.start), side = new T.Vector3(-dir.z, 0, dir.x).normalize();
      for (const b of s.auraBeams) {
        const a = s.start.clone().addScaledVector(side, b.userData.off), d = a.clone().lerp(end, u).sub(a), L = Math.max(0.01, d.length());
        b.visible = u > 0; b.position.copy(a).addScaledVector(d, 0.5);
        b.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
        const w = 0.8 + Math.random() * 0.35; b.scale.set(w, L, w);
      }
    }
    // Charge de l'énergie dans les mains (ou le sceptre) avant le tir
    auraCharge(c, s, el) {
      const T = this.THREE;
      if (el >= s.fire) { if (s.auraGlow) s.auraGlow.visible = false; return; }
      if (!s.auraGlow) s.auraGlow = this.fx(s, new T.Mesh(new T.SphereGeometry(0.1, 12, 8), this.glow(s.pal.charge, 0.8)));
      if (c.parts.muzzle) { c.holder.updateMatrixWorld(true); c.parts.muzzle.getWorldPosition(s.auraGlow.position); } else s.auraGlow.position.copy(this.handsOf(c));
      s.auraGlow.scale.setScalar(0.3 + (el / s.fire) * 1.5);
    }

