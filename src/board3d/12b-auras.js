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

    /* Saga des Auras : un mat par pièce (AURA_MATE). Sorën et Mélyx ont la Constellation et la Nova, dans 05-mats-themes.js.
       Blancs : Cercle du Temple, Comète de Nilo, Aube Tranchante, Forteresse, Souffle des Nuages.
       Noirs : Nuée d'Ombre, Prime, Réseau, Éruption, Chute de Comète. */
    makeAuraMate(u, at, keep, basic, std) {
      const T = this.THREE, P = u.target, style = u.themed, g = u.fx, A = this.sqToPos(u.attackerTo);
      const ball = (r, c, o = 0.9) => new T.Mesh(new T.SphereGeometry(r, 16, 12), basic(c, o));
      if (style === 'temple') {
        for (let i = 0; i < 8; i++) {
          const m = new T.Group(); g.add(m);
          const body = new T.Mesh(new T.ConeGeometry(0.16, 0.6, 10), std(0xe4dcc8)); body.position.y = 0.3; m.add(body);
          const head = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), std(0xf1c8a4)); head.position.y = 0.68; m.add(head);
          const band = new T.Mesh(new T.TorusGeometry(0.1, 0.018, 6, 14), std(0x3a9cff)); band.rotation.x = Math.PI / 2; band.position.y = 0.71; m.add(band);
          keep(m, { a: i / 8 * Math.PI * 2 });
        }
        u.joined = at(new T.Mesh(new T.TorusGeometry(1.25, 0.05, 8, 48), basic(0x4cc3ff, 0)), 0, 0.5, 0); u.joined.rotation.x = Math.PI / 2;
        u.blind = at(ball(1, 0xffffff, 0), 0, 0.8, 0);
      } else if (style === 'nilocomet') {
        const c = new T.Group(); g.add(c);
        c.add(ball(0.38, 0x2f8fe0, 0.85), ball(0.22, 0xffffff, 1));
        const tail = new T.Mesh(new T.ConeGeometry(0.36, 3.4, 12, 1, true), basic(0x4cc3ff, 0.55)); tail.position.y = 1.75; c.add(tail);
        u.comet = c;
      } else if (style === 'dawncross') {
        const d = new T.Vector3(P.x - A.x, 0, P.z - A.z), len = Math.max(0.1, d.length());
        u.streak = new T.Mesh(new T.BoxGeometry(0.1, 0.1, len), basic(0xffd27a, 0));
        u.streak.position.set((A.x + P.x) / 2, 0.7, (A.z + P.z) / 2); u.streak.rotation.y = Math.atan2(d.x, d.z); g.add(u.streak);
        const c = new T.Group(); c.position.set(P.x, 1, P.z); c.rotation.y = Math.atan2(this.camera.position.x - P.x, this.camera.position.z - P.z); g.add(c);
        for (const s of [-1, 1]) { const b = new T.Mesh(new T.BoxGeometry(0.2, 3.4, 0.03), basic(0xffd27a, 1)); b.rotation.z = s * Math.PI / 4; b.add(new T.Mesh(new T.BoxGeometry(0.07, 3.4, 0.04), basic(0xffffff, 1))); c.add(b); }
        u.dawn = c; c.visible = false;
      } else if (style === 'fortress') {
        for (let i = 0; i < 3; i++) {
          const w = new T.Mesh(new T.CylinderGeometry(1, 1, 2.2, 8, 1, true, i / 3 * Math.PI * 2, Math.PI * 2 / 3 - 0.04), std(0x59617a, { side: T.DoubleSide, flatShading: true, roughness: 0.9 }));
          at(w, 0, 1.1, 0); keep(w, { i });
        }
        u.roof = at(new T.Mesh(new T.ConeGeometry(0.95, 0.7, 8), std(0x454c63, { flatShading: true })), 0, 6, 0);
        u.runes = at(new T.Mesh(new T.TorusGeometry(0.82, 0.03, 6, 40), basic(0x4cc3ff, 0)), 0, 1.1, 0); u.runes.rotation.x = Math.PI / 2;
      } else if (style === 'cloudbreath') {
        u.column = at(new T.Mesh(new T.CylinderGeometry(0.85, 1.1, 14, 24, 1, true), basic(0xbfeaff, 0)), 0, 7, 0);
        for (let i = 0; i < 18; i++) { const c = at(ball(0.3 + (i % 3) * 0.1, 0xffffff, 0.92)); c.scale.y = 0.6; keep(c, { a: i * 1.1, h: i / 18 }); }
      } else if (style === 'crystalcomet') {
        const c = new T.Group(); g.add(c);
        const core = new T.Mesh(new T.OctahedronGeometry(0.8, 0), std(0x2c2042, { emissive: 0x7a2bff, emissiveIntensity: 0.7, metalness: 0.5, roughness: 0.2, flatShading: true })); core.scale.y = 1.7; c.add(core);
        const tail = new T.Mesh(new T.ConeGeometry(0.62, 3.6, 8, 1, true), basic(0xc04bff, 0.5)); tail.position.y = 2.4; c.add(tail);
        u.comet = c;
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, s = at(new T.Mesh(new T.OctahedronGeometry(0.22, 0), std(0x2c2042, { emissive: 0x7a2bff, emissiveIntensity: 0.7, flatShading: true })), Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8); s.scale.y = 2.4; s.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); keep(s, { spike: true }); }
      } else if (style === 'eruption') {
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, c = at(new T.Mesh(new T.BoxGeometry(0.07, 0.02, 1.5), basic(0xff7a1a, 0.95)), Math.cos(a) * 0.85, 0.03, Math.sin(a) * 0.85); c.rotation.y = -a + Math.PI / 2; keep(c, { crack: true }); }
        u.column = at(new T.Mesh(new T.CylinderGeometry(0.55, 0.85, 8, 16, 1, true), basic(0xff7a1a, 0.92)), 0, 4, 0);
        u.columnCore = at(new T.Mesh(new T.CylinderGeometry(0.3, 0.5, 8, 12), basic(0xffd27a, 0.95)), 0, 4, 0);
        for (let i = 0; i < 14; i++) { const r = at(new T.Mesh(new T.DodecahedronGeometry(0.1 + i % 3 * 0.05, 0), std(0x2b2326, { emissive: 0xff5a1a, emissiveIntensity: 0.6, flatShading: true }))); keep(r, { rock: true, a: i * 2.4, sp: 1 + i % 4 * 0.5, up: 5 + i % 3 }); }
        u.cooled = at(new T.Mesh(new T.DodecahedronGeometry(0.72, 0), std(0x3f3437, { flatShading: true, roughness: 1 })), 0, 0.55, 0); u.cooled.scale.setScalar(0.01);
      } else if (style === 'lasernet') {
        u.drones = [];
        for (let i = 0; i < 5; i++) {
          const d = new T.Group(); g.add(d);
          const hull = new T.Mesh(new T.SphereGeometry(0.2, 12, 10), std(0x3a2354, { metalness: 0.5 })); hull.scale.y = 0.8; d.add(hull);
          const eye = new T.Mesh(new T.SphereGeometry(0.08, 10, 8), new T.MeshBasicMaterial({ color: 0x9ef7ff })); eye.position.z = 0.17; d.add(eye);
          u.drones.push(d);
        }
        u.webs = [];
        for (let i = 0; i < 10; i++) { const l = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 6), basic(i < 5 ? 0x9ef7ff : 0xff3d6e, 0.95)); l.visible = false; g.add(l); u.webs.push(l); }
      } else if (style === 'bounty') {
        u.chain = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6), std(0xb9bcc7, { metalness: 0.9 })); g.add(u.chain);
        u.chainFrom = new T.Vector3(A.x, 0.7, A.z);
        for (let i = 0; i < 3; i++) { const r = at(new T.Mesh(new T.TorusGeometry(0.34, 0.03, 6, 22), std(0xb9bcc7, { metalness: 0.9 })), 0, 0.3 + i * 0.28, 0); r.rotation.x = Math.PI / 2; keep(r, { rope: i }); }
        u.net = at(new T.Mesh(new T.SphereGeometry(0.95, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: 0xdfe2ea, wireframe: true, transparent: true })), 0, 8, 0);
      } else if (style === 'shadeswarm') {
        for (let i = 0; i < 34; i++) { const f = new T.Mesh(new T.ConeGeometry(0.1, 0.34, 8), basic(i % 3 ? 0x7a2bff : 0xc04bff, 0.95)); g.add(f); keep(f, { a: i * 0.7, h: (i % 7) / 7, sp: 3 + i % 4 }); }
        u.engulf = at(ball(1, 0x7a2bff, 0.85), 0, 0.8, 0); u.engulf.scale.setScalar(0.01);
      }
    }
    tickAuraMate(u, t, e, clamp, smooth, hit, after) {
      const T = this.THREE, P = u.target, style = u.themed, parts = u.mateParts, fade = (d) => (after > 0 ? Math.max(0, 1 - after / d) : 1);
      this.skyDim = Math.max(this.skyDim || 0, smooth(e / 1.2) * 0.75 * fade(1.5));
      const link = (m, a, b) => { const d = b.clone().sub(a), L = Math.max(0.01, d.length()); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.scale.set(1, L, 1); };
      const dive = (from, k) => { u.comet.position.set(P.x + from.x * (1 - k), 0.5 + from.y * (1 - k), P.z + from.z * (1 - k)); u.comet.rotation.y = t * 6; u.comet.visible = e > 0.7 && after < 0.05; };
      if (style === 'temple') {
        const k = smooth((e - 0.4) / 1.7);
        for (const m of parts) { const a = m.userData.a + (1 - k) * 1.5, r = 4.2 - k * 2.95; m.position.set(P.x + Math.cos(a) * r, 0, P.z + Math.sin(a) * r); m.rotation.y = -a - Math.PI / 2; m.visible = e > 0.3 && after < 1.2; }
        u.joined.material.opacity = smooth((e - 2.1) / 0.5) * 0.9 * fade(0.5); u.joined.rotation.z = t * 2;
        u.blind.material.opacity = after > 0 ? fade(0.8) : smooth((e - 2.7) / 0.3) * 0.9; u.blind.scale.setScalar(0.3 + smooth((e - 2.7) / 0.3) * 1.2 + Math.max(0, after) * 3);
      } else if (style === 'nilocomet') {
        const k = clamp((e - 0.8) / 2.2);
        dive(new T.Vector3(-3 + Math.cos(t * 7) * 0.7, 11, 2 + Math.sin(t * 7) * 0.7), k * k);
      } else if (style === 'dawncross') {
        u.streak.material.opacity = e > 0.7 && e < 1.2 ? Math.sin((e - 0.7) / 0.5 * Math.PI) : 0;
        const k = smooth((e - 2.85) / 0.2); // l'instant de silence, puis la croix
        u.dawn.visible = e > 2.85 && after < 1.5; u.dawn.scale.setScalar(0.2 + k * 0.8 + Math.max(0, after) * 0.3);
        u.dawn.children.forEach((b) => { b.material.opacity = fade(1.5); b.children[0].material.opacity = fade(1.5); });
      } else if (style === 'fortress') {
        const rise = smooth((e - 0.4) / 1.2), close = smooth((e - 1.6) / 1.2);
        for (const w of parts) { w.scale.set(1.9 - close, Math.max(0.01, rise), 1.9 - close); w.position.y = 1.1 * rise; w.rotation.y = (1 - close) * (1.2 + w.userData.i); w.visible = after < 1.4; }
        u.roof.position.y = 6 - smooth((e - 2.2) / 0.8) * 3.65; u.roof.visible = e > 2.2 && after < 1.4;
        u.runes.material.opacity = smooth((e - 1.9) / 0.6) * fade(1.4);
      } else if (style === 'cloudbreath') {
        u.column.material.opacity = smooth((e - 0.6) / 1.2) * 0.42 * fade(1.8); u.column.rotation.y = t * 2;
        for (const c of parts) { const d = c.userData, a = d.a + t * 3, h = (d.h + t * 0.3) % 1, r = 1.15 - h * 0.35; c.position.set(P.x + Math.cos(a) * r, 0.2 + h * 5, P.z + Math.sin(a) * r); c.visible = e > 0.6 && after < 1.8; }
      } else if (style === 'crystalcomet') {
        const k = clamp((e - 0.9) / 2.1);
        dive(new T.Vector3(3, 13, -2.5), k * k);
        for (const s of parts) { s.visible = after > 0; s.position.y = smooth(after / 0.25) * 0.42; }
      } else if (style === 'eruption') {
        const up = after > 0 ? smooth(after / 0.3) : smooth((e - 2.7) / 0.3) * 0.25;
        for (const p of parts) {
          if (p.userData.crack) { p.scale.z = Math.max(0.01, smooth((e - 0.5) / 1.8)); continue; }
          const d = p.userData, a = after; p.visible = a > 0 && a < 1.5;
          p.position.set(P.x + Math.cos(d.a) * d.sp * a, Math.max(0, d.up * a - 4.9 * a * a), P.z + Math.sin(d.a) * d.sp * a); p.rotation.set(a * 6, a * 4, 0);
        }
        for (const c of [u.column, u.columnCore]) { c.visible = e > 2.7 && after < 1.1; c.scale.y = Math.max(0.01, up); c.position.y = 4 * up; c.material.opacity = 0.92 * fade(1.1); }
        u.cooled.scale.setScalar(Math.max(0.01, smooth((after - 0.7) / 0.5))); // tout se refroidit en roche
      } else if (style === 'lasernet') {
        const tight = smooth((e - 1.1) / 1.9), r = 2.5 - tight * 1.55, spots = u.drones.map((d, i) => {
          const a = i / 5 * Math.PI * 2 + t * 1.4, v = new T.Vector3(P.x + Math.cos(a) * r, 1 + Math.sin(a * 2) * 0.35, P.z + Math.sin(a) * r);
          d.position.copy(v); d.lookAt(P.x, 0.6, P.z); d.visible = e > 0.3 && after < 1; return v;
        });
        const on = e > 1 && after < 0.7, king = new T.Vector3(P.x, 0.6, P.z);
        u.webs.forEach((l, i) => { l.visible = on; if (on) link(l, spots[i % 5], i < 5 ? spots[(i + 2) % 5] : king); });
      } else if (style === 'bounty') {
        const k = smooth((e - 0.5) / 0.7), to = new T.Vector3(P.x, 0.6, P.z);
        link(u.chain, u.chainFrom, u.chainFrom.clone().lerp(to, k)); u.chain.visible = e > 0.5;
        for (const r of parts) { const s = smooth((e - 1.1 - r.userData.rope * 0.25) / 0.4); r.visible = s > 0; r.scale.setScalar(2.2 - s * 1.2); }
        u.net.position.y = 8 - smooth((e - 2) / 1) * 8;
      } else if (style === 'shadeswarm') {
        const k = smooth((e - 0.5) / 2.3);
        for (const f of parts) { const d = f.userData, a = d.a + t * d.sp, r = 2.6 - k * 2.05; f.position.set(P.x + Math.cos(a) * r, 0.15 + d.h * 1.9, P.z + Math.sin(a) * r); f.visible = e > 0.4 && after < 0.2; }
        u.engulf.scale.setScalar(Math.max(0.01, after > 0 ? 0.75 + after * 0.5 : smooth((e - 2.5) / 0.5) * 0.75)); u.engulf.material.opacity = 0.85 * fade(1.6);
      }
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

