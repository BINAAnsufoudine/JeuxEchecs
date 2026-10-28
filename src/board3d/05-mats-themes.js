    makeThemeMate(u) {
      const T = this.THREE, P = u.target, g = u.fx, style = u.themed;
      const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.1 }, o));
      const basic = (color, opacity = 0.85) => new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide });
      const at = (o, x = 0, y = 0, z = 0) => { o.position.set(P.x + x, y, P.z + z); g.add(o); return o; };
      const parts = u.mateParts = [];
      const keep = (o, data = {}) => { o.userData = Object.assign(o.userData || {}, data); parts.push(o); return o; };
      if (style === 'wave') {
        // un mur d'eau courbé qui arrive de derrière l'attaquant et s'abat sur le roi
        const dir = new T.Vector3(P.x - u.fromPos.x, 0, P.z - u.fromPos.z).normalize();
        const wave = new T.Group(); wave.position.set(P.x, 0, P.z); wave.rotation.y = Math.atan2(dir.x, dir.z); g.add(wave);
        // mur d'eau (axe x = largeur, avance vers +z) avec une crête d'écume qui s'enroule vers l'avant
        const tilt = new T.Group(); wave.add(tilt);
        const body = new T.Mesh(new T.BoxGeometry(3.4, 2.2, 0.45), basic(0x1e88e5, 0.78)); body.position.y = 1.1; tilt.add(body);
        const lip = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 3.4, 16, 1, false), basic(0x64b5f6, 0.85)); lip.rotation.z = Math.PI / 2; lip.position.set(0, 2.2, 0.25); tilt.add(lip);
        const foam = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 3.5, 12), basic(0xffffff, 0.95)); foam.rotation.z = Math.PI / 2; foam.position.set(0, 2.45, 0.5); tilt.add(foam);
        u.waveTilt = tilt;
        u.wave = keep(wave, { dir });
      } else if (style === 'whirlpool') {
        for (let i = 0; i < 4; i++) { const r = at(new T.Mesh(new T.TorusGeometry(0.4 + i * 0.35, 0.06, 6, 40), basic(i % 2 ? 0x1a237e : 0x4527a0, 0.8)), 0, 0.03 + i * 0.01, 0); r.rotation.x = -Math.PI / 2; keep(r, { spin: 4 - i }); }
        u.funnel = at(new T.Mesh(new T.ConeGeometry(1.4, 2.2, 28, 1, true), basic(0x283593, 0.45)), 0, 1.1, 0); u.funnel.rotation.x = Math.PI;
      } else if (style === 'roots') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2, root = new T.Group(); at(root, Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
          const r = new T.Mesh(new T.ConeGeometry(0.09, 1.8, 7), std(0x6d4c41, { roughness: 0.9 })); r.position.y = 0.9; root.add(r);
          const flower = new T.Mesh(new T.SphereGeometry(0.1, 8, 6), std(i % 2 ? 0xf06292 : 0xffeb3b)); flower.position.y = 1.8; root.add(flower);
          root.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); keep(root, { a });
        }
      } else if (style === 'jaws') {
        u.stem = at(new T.Mesh(new T.CylinderGeometry(0.16, 0.24, 1, 10), std(0x33691e)), 0, 0, 0);
        for (const s of [-1, 1]) {
          const jaw = new T.Group(); at(jaw, 0, 0, 0);
          const lobe = new T.Mesh(new T.SphereGeometry(0.85, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x7b1f2a, { side: T.DoubleSide })); lobe.scale.y = 0.55; if (s < 0) lobe.rotation.x = Math.PI; jaw.add(lobe);
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, th = new T.Mesh(new T.ConeGeometry(0.04, 0.22, 4), std(0xf1f8e9)); th.position.set(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82); if (s < 0) th.rotation.x = Math.PI; jaw.add(th); }
          keep(jaw, { side: s });
        }
      } else if (style === 'stampede') {
        const dir = new T.Vector3(P.x - u.fromPos.x, 0, P.z - u.fromPos.z).normalize();
        for (let i = 0; i < 9; i++) {
          const beast = new T.Group(); g.add(beast);
          const hide = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), std(i % 3 ? 0x8d6e63 : 0x5d4037)); hide.scale.set(0.8, 0.75, 1.3); beast.add(hide);
          const head = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), std(0x4e342e)); head.position.set(0, 0.12, 0.42); beast.add(head);
          for (const s of [-1, 1]) { const horn = new T.Mesh(new T.ConeGeometry(0.03, 0.18, 5), std(0xefebe9)); horn.position.set(s * 0.1, 0.25, 0.45); horn.rotation.z = -s * 0.8; beast.add(horn); }
          keep(beast, { dir, lane: (i % 3 - 1) * 0.55 + (Math.random() - 0.5) * 0.2, delay: Math.floor(i / 3) * 0.28 + Math.random() * 0.1 });
        }
        u.dust = at(new T.Mesh(new T.SphereGeometry(1.2, 14, 10), basic(0xc9a66b, 0.0)), 0, 0.5, 0);
      } else if (style === 'quake') {
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3, crack = at(new T.Mesh(new T.BoxGeometry(0.06, 0.02, 1.1 + Math.random() * 0.8), basic(0xff5722, 0.95)), Math.cos(a) * 0.7, 0.02, Math.sin(a) * 0.7); crack.rotation.y = -a + Math.PI / 2; keep(crack, { crack: true }); }
        for (let i = 0; i < 12; i++) { const rock = at(new T.Mesh(new T.DodecahedronGeometry(0.1 + Math.random() * 0.1, 0), std(0x6d6d6d, { flatShading: true })), 0, -1, 0); keep(rock, { rock: true, a: Math.random() * Math.PI * 2, sp: 1 + Math.random() * 1.5, up: 3 + Math.random() * 3 }); }
      } else if (style === 'eagle') {
        const eagle = new T.Group(); g.add(eagle);
        const body = new T.Mesh(new T.SphereGeometry(0.35, 12, 10), std(0x6d4c2f)); body.scale.set(0.8, 0.7, 1.4); eagle.add(body);
        const head = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), std(0xf5f5f5)); head.position.set(0, 0.12, 0.5); eagle.add(head);
        const beak = new T.Mesh(new T.ConeGeometry(0.07, 0.2, 6), std(0xffc107)); beak.rotation.x = Math.PI / 2 + 0.6; beak.position.set(0, 0.06, 0.7); head.parent.add(beak);
        u.wings = [];
        for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 0.2, 0.05, 0); const m = new T.Mesh(new T.BoxGeometry(1.5, 0.04, 0.5), std(0x5d4037)); m.position.x = s * 0.75; w.add(m); eagle.add(w); u.wings.push(w); }
        u.eagle = keep(eagle);
      } else if (style === 'crows') {
        for (let i = 0; i < 26; i++) {
          const crow = new T.Group(); g.add(crow);
          crow.add(new T.Mesh(new T.SphereGeometry(0.09, 8, 6), std(0x111114)));
          for (const s of [-1, 1]) { const w = new T.Mesh(new T.BoxGeometry(0.24, 0.015, 0.09), std(0x1b1b20)); w.position.x = s * 0.13; crow.add(w); }
          keep(crow, { a: Math.random() * Math.PI * 2, h: Math.random(), r: 0.5 + Math.random() * 0.6, sp: 4 + Math.random() * 3 });
        }
        u.funnel = at(new T.Mesh(new T.ConeGeometry(1.2, 3, 24, 1, true), basic(0x37474f, 0.3)), 0, 1.5, 0); u.funnel.rotation.x = Math.PI;
      } else if (style === 'firearrows') {
        for (let i = 0; i < 24; i++) {
          const arrow = new T.Group(); g.add(arrow);
          const sh = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.55, 5), std(0x6d4c41)); arrow.add(sh);
          const fl = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), new T.MeshBasicMaterial({ color: 0xff8f00, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); fl.position.y = -0.28; arrow.add(fl);
          keep(arrow, { x: (Math.random() - 0.5) * 1.6, z: (Math.random() - 0.5) * 1.6, delay: 0.6 + Math.random() * 1.9 });
        }
      } else if (style === 'boulder') {
        u.rock = at(new T.Mesh(new T.DodecahedronGeometry(1.0, 1), std(0x7d756c, { flatShading: true, roughness: 0.95 })), 0, 12, 0);
        u.shadowDisk = at(new T.Mesh(new T.CircleGeometry(1.1, 24), basic(0x000000, 0)), 0, 0.03, 0); u.shadowDisk.rotation.x = -Math.PI / 2;
      } else if (style === 'airstrike') {
        u.jets = [];
        for (const s of [-1, 1]) { const jet = new T.Group(); const b = new T.Mesh(new T.ConeGeometry(0.15, 1, 8), std(0x9e9e9e, { metalness: 0.5 })); b.rotation.x = Math.PI / 2; jet.add(b); const w = new T.Mesh(new T.BoxGeometry(1.1, 0.03, 0.35), std(0x757575)); jet.add(w); g.add(jet); u.jets.push(keep(jet, { s })); }
        for (let i = 0; i < 6; i++) { const m = new T.Group(); const c = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.4, 6), std(0xeceff1)); m.add(c); const f = new T.Mesh(new T.SphereGeometry(0.06, 6, 4), new T.MeshBasicMaterial({ color: 0xff9100 })); f.position.y = 0.22; m.add(f); g.add(m); keep(m, { missile: true, x: (Math.random() - 0.5) * 1.2, z: (Math.random() - 0.5) * 1.2, delay: 1.5 + i * 0.18 }); }
      } else if (style === 'orbital') {
        u.target3 = at(new T.Mesh(new T.RingGeometry(0.5, 0.62, 32), basic(0xff1744, 0.9)), 0, 0.04, 0); u.target3.rotation.x = -Math.PI / 2;
        u.beam = at(new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 30, 20, 1, true), new T.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false })), 0, 15, 0);
        u.beamCore = at(new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 30, 12), new T.MeshBasicMaterial({ color: 0xffffff })), 0, 15, 0);
        u.beam.visible = u.beamCore.visible = false;
      }
      // éclair d'impact commun
      u.flash = at(new T.Mesh(new T.SphereGeometry(1, 18, 12), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })), 0, 0.6, 0);
      const fireStyles = ['firearrows', 'airstrike', 'orbital', 'quake'];
      u.flash.material.color.setHex(fireStyles.includes(style) ? 0xffa726 : style === 'wave' || style === 'whirlpool' ? 0xb3e5fc : style === 'roots' || style === 'jaws' ? 0xc5e1a5 : 0xfff3e0);
      // Mise en scène commune, aussi riche que les mats ninjas : l'attaquant se charge dans une colonne de lumière
      // aux couleurs du thème, le ciel s'assombrit, puis l'impact projette une onde au sol, des éclats et une lumière,
      // et laisse une trace sur la case du roi.
      const tint = THEME_MATE_COLORS[style] || [0xffffff, 0x888888];
      u.tint = tint;
      const A = this.sqToPos(u.attackerTo);
      u.pillar = new T.Mesh(new T.CylinderGeometry(0.42, 0.55, 6, 24, 1, true), new T.MeshBasicMaterial({ color: tint[0], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      u.pillar.position.set(A.x, 3, A.z); g.add(u.pillar);
      u.aura = new T.Mesh(new T.RingGeometry(0.35, 0.6, 40), new T.MeshBasicMaterial({ color: tint[0], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      u.aura.rotation.x = -Math.PI / 2; u.aura.position.set(A.x, 0.03, A.z); g.add(u.aura);
      u.shock = at(new T.Mesh(new T.RingGeometry(0.5, 0.75, 48), new T.MeshBasicMaterial({ color: tint[0], transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })), 0, 0.04, 0);
      u.shock.rotation.x = -Math.PI / 2;
      u.scar = at(new T.Mesh(new T.CircleGeometry(0.62, 28), new T.MeshBasicMaterial({ color: tint[1], transparent: true, opacity: 0, depthWrite: false })), 0, 0.025, 0);
      u.scar.rotation.x = -Math.PI / 2;
      u.shards = [];
      for (let i = 0; i < 26; i++) {
        const m = at(new T.Mesh(new T.TetrahedronGeometry(0.05 + Math.random() * 0.06, 0), new T.MeshBasicMaterial({ color: i % 3 ? tint[0] : tint[1], transparent: true, opacity: 0.95 })), 0, 0.4, 0);
        const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
        m.userData.v = { x: Math.cos(a) * sp, y: 2.5 + Math.random() * 3.5, z: Math.sin(a) * sp }; m.visible = false; u.shards.push(m);
      }
      u.light = new T.PointLight(tint[0], 0, 9); u.light.position.set(P.x, 1.6, P.z); g.add(u.light);
    }
    tickThemeMate(c, t, M, u) {
      const T = this.THREE, e = t - u.start, P = u.target, style = u.themed;
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const hit = 3.0, after = e - hit;
      if (c === u.actor) {
        c.anim = null; c.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
        M.animate(c.parts, t, e < hit ? 'cast' : 'victory', e < hit ? clamp(e / 0.6) : 1);
        // une seule fois par image : l'effet est animé avec l'attaquant
        this.tickThemeMateFx(u, t, e, clamp, smooth, hit, after);
        return true;
      }
      if (c === u.king) {
        c.anim = null; c.holder.position.set(P.x, 0, P.z);
        const root = c.parts.root;
        if (e < hit) { M.animate(c.parts, t, 'panic', 1); return true; }
        M.animate(c.parts, t, 'ko', 1);
        // le roi est emporté, englouti ou renversé selon l'attaque
        if (style === 'eagle') { root.position.y = Math.min(6, after * after * 2.5); c.holder.visible = after < 1.6; }
        else if (style === 'whirlpool') { root.position.y = -smooth(after / 1.2) * 0.9; root.rotation.y = after * 8; c.holder.visible = after < 1.3; }
        else if (style === 'crows') { root.position.y = Math.min(4, after * 2.2); root.rotation.y = after * 10; c.holder.visible = after < 1.5; }
        else if (style === 'jaws') { c.holder.visible = after < 0.15; }
        else if (style === 'boulder') { root.scale.y = u.kingBase.scale.y * Math.max(0.2, 1 - after * 4); }
        else { root.rotation.z = Math.PI / 2 * smooth(after / 0.4); root.position.y = 0.05; } // tombe sur le côté
        return true;
      }
      return false;
    }
    tickThemeMateFx(u, t, e, clamp, smooth, hit, after) {
      const P = u.target, style = u.themed, grow = smooth((e - 0.6) / 2.2);
      if (e >= hit && !u.hitDone) { u.hitDone = true; this.shakeUntil = t + 0.8; this.shakeAmp = 0.16; }
      if (u.flash) { const f = after > 0 ? Math.max(0, 1 - after / 0.7) : 0; u.flash.material.opacity = f * 0.85; u.flash.scale.setScalar(0.4 + (1 - f) * 2.4); }
      if (u.pillar) {
        // charge de l'attaquant : colonne et anneau de lumière qui pulsent, puis s'éteignent à l'impact
        const charge = smooth(e / 0.8) * (after > 0 ? Math.max(0, 1 - after / 0.5) : 1);
        u.pillar.material.opacity = charge * (0.28 + Math.sin(t * 9) * 0.08); u.pillar.scale.set(1 + Math.sin(t * 6) * 0.05, smooth(e / 0.8), 1 + Math.sin(t * 6) * 0.05); u.pillar.rotation.y = t * 1.5;
        u.aura.material.opacity = charge * 0.8; u.aura.scale.setScalar(1 + Math.sin(t * 7) * 0.12);
        // le ciel s'assombrit pendant l'attaque et revient doucement après
        this.skyDim = Math.min(0.55, grow * 0.55) * (after > 0 ? Math.max(0, 1 - after / 1.5) : 1);
        // impact : onde au sol, éclats, lumière, et trace qui reste sur la case
        const k = after > 0 ? after : -1;
        u.shock.material.opacity = k >= 0 ? Math.max(0, 0.9 - k * 1.1) : 0; u.shock.scale.setScalar(k >= 0 ? 1 + k * 6 : 1);
        u.scar.material.opacity = k >= 0 ? Math.min(0.55, k * 2) : 0;
        u.light.intensity = k >= 0 ? Math.max(0, 6 - k * 7) : grow * 0.6;
        for (const m of u.shards) {
          m.visible = k >= 0 && k < 1.6;
          if (!m.visible) continue;
          const v = m.userData.v;
          m.position.set(P.x + v.x * k, Math.max(0.05, 0.4 + v.y * k - 4.9 * k * k), P.z + v.z * k);
          m.rotation.set(k * 9, k * 7, 0);
        }
      }
      if (style === 'wave') {
        // la vague grossit en arrivant de loin, puis s'écrase
        const k = smooth((e - 0.4) / 2.6), w = u.wave, d = w.userData.dir;
        w.position.set(P.x - d.x * (1 - k) * 5, after > 0 ? -after * 1.2 : 0, P.z - d.z * (1 - k) * 5);
        w.scale.set(0.5 + k * 0.6, 0.2 + k * 1.0, 1);
        u.waveTilt.rotation.x = after > 0 ? Math.min(1.4, after * 3) : 0; // elle s'abat vers l'avant
        w.visible = after < 1.2;
      } else if (style === 'whirlpool') {
        for (const r of u.mateParts) { r.rotation.z = t * r.userData.spin; r.scale.setScalar(0.2 + grow); r.visible = after < 1.8; }
        u.funnel.scale.set(grow, grow, grow); u.funnel.rotation.y = t * 5; u.funnel.visible = after < 1.6;
      } else if (style === 'roots') {
        for (const r of u.mateParts) { r.scale.set(1, Math.max(0.01, grow), 1); const a = r.userData.a, close = smooth((e - 2.2) / 0.8); r.rotation.set(Math.sin(a) * (0.35 - close * 0.6), 0, -Math.cos(a) * (0.35 - close * 0.6)); }
      } else if (style === 'jaws') {
        const rise = smooth((e - 0.6) / 1.4), close = smooth((e - 2.4) / 0.6);
        u.stem.scale.set(1, Math.max(0.01, rise * 1.2), 1); u.stem.position.y = rise * 0.6;
        for (const j of u.mateParts) { j.position.set(P.x, 0.4 + rise * 1.4 - (after > 0 ? Math.min(1.6, after * 2) : 0), P.z); j.rotation.x = j.userData.side * (1.1 - close * 1.1); }
        u.stem.visible = after < 0.9;
      } else if (style === 'stampede') {
        for (const b of u.mateParts) {
          const d = b.userData.dir, k = clamp((e - 0.8 - b.userData.delay) / 2.2), side = new this.THREE.Vector3(-d.z, 0, d.x);
          b.visible = k > 0 && k < 1;
          b.position.set(P.x + d.x * (k - 0.5) * 9 + side.x * b.userData.lane, Math.abs(Math.sin(t * 14 + b.userData.lane * 5)) * 0.12, P.z + d.z * (k - 0.5) * 9 + side.z * b.userData.lane);
          b.rotation.y = Math.atan2(d.x, d.z);
        }
        u.dust.material.opacity = smooth((e - 1.6) / 1) * 0.55 * (after > 0 ? Math.max(0, 1 - after / 1.6) : 1); u.dust.scale.setScalar(1 + grow * 0.8);
      } else if (style === 'quake') {
        for (const p of u.mateParts) {
          if (p.userData.crack) { p.scale.z = Math.max(0.01, smooth(after / 0.4)); p.visible = after > 0; }
          else if (p.userData.rock) { const a = after; p.visible = a > 0 && a < 1.6; const d = p.userData; p.position.set(P.x + Math.cos(d.a) * d.sp * a, Math.max(0, d.up * a - 4.9 * a * a), P.z + Math.sin(d.a) * d.sp * a); p.rotation.set(a * 6, a * 4, 0); }
        }
        if (e > 1.2 && e < hit && (e % 0.6) < 0.1) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.05; } // le gorille martèle sa poitrine
      } else if (style === 'eagle') {
        // l'aigle descend en spirale du ciel, plonge sur le roi et l'emporte
        const k = smooth((e - 0.4) / 2.6), a = (1 - k) * 4;
        const ey = after > 0 ? 0.9 + Math.min(6, after * after * 2.5) : 9 - k * 8.1;
        u.eagle.position.set(P.x + Math.cos(a) * (1 - k) * 4, ey, P.z + Math.sin(a) * (1 - k) * 4);
        u.eagle.rotation.set(after > 0 ? -0.5 : 0.6 * k, -a + Math.PI / 2, 0);
        u.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * (after > 0 ? 14 : 6)) * 0.5; });
        u.eagle.visible = after < 1.6;
      } else if (style === 'crows') {
        for (const b of u.mateParts) { const d = b.userData, a = d.a + t * d.sp, r = d.r * (0.6 + grow * 0.8); b.position.set(P.x + Math.cos(a) * r, 0.2 + d.h * 2.6 * (0.3 + grow) + (after > 0 ? after * 2.2 : 0), P.z + Math.sin(a) * r); b.rotation.y = -a; b.children[1].rotation.z = Math.sin(t * 30 + d.a) * 0.6; b.children[2].rotation.z = -Math.sin(t * 30 + d.a) * 0.6; b.visible = e > 0.6 && after < 1.6; }
        u.funnel.scale.set(grow, grow, grow); u.funnel.rotation.y = t * 6; u.funnel.visible = after < 1.4;
      } else if (style === 'firearrows') {
        for (const a of u.mateParts) { const d = a.userData, k = clamp((e - d.delay) / 0.45); a.visible = k > 0 && (k < 1 || e < hit + 1.2); const y = k < 1 ? 7 * (1 - k) : 0.2; a.position.set(P.x + d.x * (k < 1 ? 1.4 - k * 0.4 : 1), y, P.z + d.z * (k < 1 ? 1.4 - k * 0.4 : 1)); a.rotation.set(0.25, 0, 0.1); }
      } else if (style === 'boulder') {
        const k = clamp((e - 0.9) / 2.1);
        u.rock.position.y = after > 0 ? 0.7 - Math.min(0.4, after * 0.6) : 12 - 11.3 * k * k; u.rock.rotation.set(t * 2, t * 1.5, 0);
        u.shadowDisk.material.opacity = k * 0.55; u.shadowDisk.scale.setScalar(0.3 + k * 0.7);
      } else if (style === 'airstrike') {
        for (const j of u.jets) { const k = clamp((e - 0.5) / 1.6), s = j.userData.s; j.visible = k > 0 && k < 1; j.position.set(P.x + s * 0.8, 5, P.z + (k - 0.5) * 22); j.rotation.set(0, 0, s * 0.2); }
        for (const m of u.mateParts) if (m.userData.missile) { const d = m.userData, k = clamp((e - d.delay) / (hit - d.delay)); m.visible = k > 0 && k < 1; m.position.set(P.x + d.x * (1 - k * 0.6), 5 - k * 4.8, P.z + d.z * (1 - k * 0.6)); m.rotation.set(Math.PI, 0, 0); }
      } else if (style === 'orbital') {
        const lock = smooth((e - 0.4) / 1.2);
        u.target3.scale.setScalar(2.5 - lock * 1.5); u.target3.rotation.z = t * 3; u.target3.visible = after < 0.6;
        const on = e > 2.6 && after < 1.2, wide = on ? (e < hit ? smooth((e - 2.6) / 0.4) * 0.4 : 1 + Math.sin(t * 40) * 0.1) : 0;
        u.beam.visible = u.beamCore.visible = on; u.beam.scale.set(wide, 1, wide); u.beamCore.scale.set(wide, 1, wide);
      }
    }

