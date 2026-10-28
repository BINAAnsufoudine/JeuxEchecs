    createCrater(at, t) {
      const T = this.THREE, crater = new T.Group();
      const pit = new T.Mesh(new T.CircleGeometry(0.34, 24), new T.MeshBasicMaterial({ color: 0x21170f, transparent: true, opacity: 0.95, side: T.DoubleSide }));
      pit.rotation.x = -Math.PI / 2; pit.position.y = 0.025; crater.add(pit);
      const rim = new T.Mesh(new T.TorusGeometry(0.32, 0.075, 7, 20), new T.MeshStandardMaterial({ color: 0x59402b, roughness: 1 }));
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.04; crater.add(rim);
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2, size = 0.09 + (i % 3) * 0.025;
        const rock = new T.Mesh(new T.DodecahedronGeometry(size, 0), new T.MeshStandardMaterial({ color: i % 2 ? 0x806044 : 0x493426, roughness: 1 }));
        rock.position.set(Math.cos(angle) * 0.31, 0.045, Math.sin(angle) * 0.31); rock.scale.y = 0.55; crater.add(rock);
      }
      crater.position.set(at.x, 0, at.z); this.scene.add(crater);
      this.captureScars.push({ object: crater, until: t + 5, start: t });
    }

    tickCaptureScars(t) {
      this.captureScars = this.captureScars.filter((scar) => {
        if (t >= scar.until) {
          this.scene.remove(scar.object);
          scar.object.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
          return false;
        }
        return true;
      });
    }

    fx(s, o) { this.scene.add(o); (s.fx = s.fx || []).push(o); return o; }
    glow(color, opacity = 0.9) {
      const T = this.THREE;
      return new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
    }
    handsOf(c) {
      const T = this.THREE, v = new T.Vector3();
      c.holder.updateMatrixWorld(true);
      c.parts.armL.getWorldPosition(v);
      const w = new T.Vector3(); c.parts.armR.getWorldPosition(w);
      const fwd = new T.Vector3(Math.sin(c.holder.rotation.y), 0, Math.cos(c.holder.rotation.y));
      return v.add(w).multiplyScalar(0.5).addScaledVector(fwd, 0.35);
    }

    // Technique de la boule de feu (dame) : jaillit des mains, traînée de flammes, explosion sur la cible
    flyFire(c, s, el, t) {
      const T = this.THREE;
      if (el >= s.fire && !s.ball && !s.boom) {
        s.start = this.handsOf(c);
        const ball = new T.Group();
        ball.add(new T.Mesh(new T.SphereGeometry(0.16, 14, 10), this.glow(0xfff1a8, 1)));
        ball.add(new T.Mesh(new T.SphereGeometry(0.28, 14, 10), this.glow(0xff7a1a, 0.7)));
        ball.add(new T.Mesh(new T.SphereGeometry(0.38, 14, 10), this.glow(0xd8301a, 0.35)));
        s.ball = this.fx(s, ball);
        s.puffs = [];
        this.shakeUntil = t + 0.12; this.shakeAmp = 0.03;
      }
      // pendant les signes des mains, une flamme grossit entre les paumes
      if (el < s.fire) {
        if (!s.charge) s.charge = this.fx(s, new T.Mesh(new T.SphereGeometry(0.1, 10, 8), this.glow(0xff9a2a, 0.8)));
        s.charge.position.copy(this.handsOf(c));
        s.charge.scale.setScalar(0.3 + (el / s.fire) * 1.2 + Math.random() * 0.2);
      } else if (s.charge) s.charge.visible = false;
      const end = new T.Vector3(s.target.x, 0.6, s.target.z);
      if (s.ball && el < s.impact) {
        const u = Math.max(0, (el - s.fire) / s.flight);
        const pos = s.start.clone().lerp(end, u); pos.y += Math.sin(Math.PI * u) * 0.2;
        s.ball.position.copy(pos);
        s.ball.children.forEach((m, i) => m.scale.setScalar(0.9 + Math.random() * 0.3 + i * 0.05));
        if (!s.lastPuff || el - s.lastPuff > 0.02) {
          s.lastPuff = el;
          const puff = this.fx(s, new T.Mesh(new T.SphereGeometry(0.16, 8, 6), this.glow(Math.random() < 0.5 ? 0xff6a1a : 0xffb02e, 0.7)));
          puff.position.copy(pos);
          s.puffs.push({ m: puff, t0: el });
        }
      }
      if (s.ball && el >= s.impact && !s.boom) {
        this.scene.remove(s.ball); s.ball = null;
        this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffc34d], [0xff8a2a, 0x3b2a1a]);
      }
      this.boomStep(s, el);
      for (const p of s.puffs || []) {
        const age = el - p.t0;
        p.m.scale.setScalar(Math.max(0.05, 1 - age * 2.5));
        p.m.material.opacity = Math.max(0, 0.7 - age * 1.6);
        p.m.position.y += 0.006;
      }
    }

    // Technique du dragon d'eau (tour) : un serpent d'eau jaillit, ondule dans les airs et s'abat sur la cible
    flyDragon(c, s, el, t) {
      const T = this.THREE;
      const N = 22;
      if (el >= s.fire && !s.dragon && !s.splashDone) {
        s.start = this.handsOf(c);
        const g = new T.Group();
        const water = s.fireDragon
          ? new T.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.92 })
          : new T.MeshToonMaterial({ color: s.pal ? s.pal.jet : 0x3fa9f5, transparent: true, opacity: 0.9 });
        const foam = new T.MeshBasicMaterial({ color: s.fireDragon ? 0x3a1608 : s.pal ? s.pal.foam : 0xe6f7ff });
        for (let i = 0; i < N; i++) {
          // Dragon de feu : corps du jaune (tête) au rouge sombre (queue), avec des flammes le long du dos
          const segMat = s.fireDragon ? new T.MeshBasicMaterial({ color: new T.Color(0xffb020).lerp(new T.Color(0xc41a06), Math.min(1, i / N * 1.6)), transparent: true, opacity: 0.95, toneMapped: false }) : water;
          const seg = new T.Mesh(new T.SphereGeometry(0.24 * (1 - i / N * 0.65), 12, 8), segMat);
          if (s.fireDragon && i % 2 === 0) {
            const flame = new T.Mesh(new T.ConeGeometry(0.07 * (1 - i / N * 0.6), 0.26, 6), new T.MeshBasicMaterial({ color: i % 4 ? 0xff4a12 : 0xffb52a, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
            flame.position.y = 0.2 * (1 - i / N * 0.6); seg.add(flame);
          }
          g.add(seg);
        }
        // tête : gueule, cornes, yeux
        const head = g.children[0];
        head.scale.set(1.25, 1.05, 1.7);
        for (const sd of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.035, 0.22, 6), foam); horn.position.set(sd * 0.08, 0.14, -0.08); horn.rotation.x = -0.9; head.add(horn);
          const eye = new T.Mesh(new T.SphereGeometry(0.028, 8, 6), new T.MeshBasicMaterial({ color: 0xffef5a })); eye.position.set(sd * 0.09, 0.06, 0.08); head.add(eye);
        }
        const jaw = new T.Mesh(new T.ConeGeometry(0.1, 0.2, 8), water); jaw.rotation.x = Math.PI / 2; jaw.position.set(0, -0.04, 0.18); head.add(jaw);
        s.dragon = this.fx(s, g);
        this.shakeUntil = t + 0.15; this.shakeAmp = 0.03;
      }
      const end = new T.Vector3(s.target.x, 0.55, s.target.z);
      if (s.dragon) {
        const dir = end.clone().sub(s.start); dir.y = 0;
        const side = new T.Vector3(-dir.z, 0, dir.x).normalize();
        const pathAt = (u) => {
          const p = s.start.clone().lerp(end, Math.min(1, u));
          p.y += Math.sin(Math.PI * Math.min(1, u)) * 1.1;
          return p.addScaledVector(side, Math.sin(u * 9) * 0.22 * (1 - Math.min(1, u) * 0.6));
        };
        const head = (el - s.fire) / s.flight;
        s.dragon.children.forEach((m, i) => {
          const u = head - i * 0.04;
          m.visible = u > 0 && u < 1.08;
          if (!m.visible) return;
          m.position.copy(pathAt(u));
          if (i === 0) m.lookAt(pathAt(u + 0.03));
        });
        if (head - (N - 1) * 0.04 > 1.08) { this.scene.remove(s.dragon); s.dragon = null; s.splashDone = true; }
      }
      if (el >= s.impact && !s.boom && !s.splashed) {
        s.splashed = true;
        if (s.fireDragon) this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffb347], [0xff4500, 0x2a1a12], false);
        else if (s.pal) this.explode(s, end, el, t, s.pal.boom, s.pal.debris, true);
        else this.explode(s, end, el, t, [0xd6f2ff, 0x3fa9f5, 0x9fdcff], [0x3fa9f5, 0xe6f7ff], true);
      }
      this.boomStep(s, el);
    }

    // Thèmes guerriers : armes propres à chaque pièce.
    // Antiquité : javelot, carreau de baliste, pierre de catapulte, volée de flèches, pot de feu.
    // Moderne : salve de missiles (hélicoptère), laser (drone), obus (tank), bombes larguées (avion).
    flyProj(c, s, el, t) {
      const T = this.THREE, kind = s.proj;
      const end = new T.Vector3(s.target.x, 0.5, s.target.z);
      if (!s.start && el >= s.fire) {
        // départ : bout du canon, des lance-roquettes ou de l'arme, sinon les mains
        if (c.parts.muzzle) { c.holder.updateMatrixWorld(true); s.start = c.parts.muzzle.getWorldPosition(new T.Vector3()); } else s.start = this.handsOf(c);
        s.items = []; s.puffs = [];
        const mat = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.2 }, o));
        // projectile allongé le long de +z (orienté ensuite vers sa trajectoire)
        const shaft = (len, r, color, tip, tipColor, fletch) => {
          const g = new T.Group();
          const sh = new T.Mesh(new T.CylinderGeometry(r, r, len, 6), mat(color)); sh.rotation.x = Math.PI / 2; g.add(sh);
          if (tip) { const h = new T.Mesh(new T.ConeGeometry(r * 3, tip, 6), mat(tipColor, { metalness: 0.8, roughness: 0.25 })); h.rotation.x = Math.PI / 2; h.position.z = len / 2 + tip / 2; g.add(h); }
          if (fletch) for (let i = 0; i < 3; i++) { const f = new T.Mesh(new T.BoxGeometry(0.004, r * 7, len * 0.18), mat(fletch)); f.rotation.z = i * Math.PI / 1.5; f.position.z = -len * 0.42; g.add(f); }
          return g;
        };
        const add = (o, delay = 0, off = new T.Vector3(), arc = 0.6, spin = 0) => { o.visible = false; this.fx(s, o); s.items.push({ o, delay, off, arc, spin }); return o; };
        const spread = (i, n, w) => new T.Vector3((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * w).add(new T.Vector3(0, 0, 0)).multiplyScalar(n > 1 ? 1 : 0);
        if (kind === 'spear') { add(shaft(0.85, 0.02, '#8d6e63', 0.12, '#cfd8dc'), 0, new T.Vector3(), 0.9); s.trail = [0xfff3d6, 0xe0d4b8]; }
        else if (kind === 'spears') { for (let i = 0; i < 3; i++) add(shaft(0.7, 0.017, '#8d6e63', 0.1, '#cfd8dc'), i * 0.08, spread(i, 3, 0.5), 1.0); s.trail = [0xfff3d6, 0xe0d4b8]; }
        else if (kind === 'bolt') { add(shaft(1.05, 0.03, '#6d4c41', 0.16, '#90a4ae', '#eeeeee'), 0, new T.Vector3(), 0.25); s.trail = [0xfff3d6, 0xe0d4b8]; }
        else if (kind === 'arrows') for (let i = 0; i < 9; i++) add(shaft(0.48, 0.011, '#8d6e63', 0.07, '#9e9e9e', s.white ? '#d32f2f' : '#212121'), i * 0.05, spread(i, 9, 0.7), 1.6);
        else if (kind === 'boulder') { const b = new T.Mesh(new T.DodecahedronGeometry(0.24, 0), mat('#8d8478', { roughness: 0.95, flatShading: true })); add(b, 0, new T.Vector3(), 2.2, 6); s.trail = [0xd7ccc8, 0xbcaaa4]; }
        else if (kind === 'firepot') { const g = new T.Group(); g.add(new T.Mesh(new T.SphereGeometry(0.14, 12, 10), mat('#6d4c41'))); g.add(new T.Mesh(new T.SphereGeometry(0.22, 12, 10), this.glow(0xff7a1a, 0.7))); add(g, 0, new T.Vector3(), 1.8, 3); s.trail = [0xff6a1a, 0xffb02e]; }
        else if (kind === 'shell') {
          const sh = shaft(0.22, 0.045, '#b08d2e', 0.07, '#8d6e2e'); sh.add(new T.Mesh(new T.SphereGeometry(0.06, 8, 6), this.glow(0xffd54f, 0.9)));
          add(sh, 0, new T.Vector3(), 0.05); s.trail = [0xffe082, 0xbdbdbd];
          this.shakeUntil = t + 0.2; this.shakeAmp = 0.06;
          s.muzzleFlash = this.fx(s, new T.Mesh(new T.SphereGeometry(0.3, 12, 10), this.glow(0xffc34d, 0.95))); s.muzzleFlash.position.copy(s.start);
        }
        else if (kind === 'missiles') { for (let i = 0; i < 4; i++) { const m = shaft(0.34, 0.032, '#eceff1', 0.08, '#c62828'); const fl = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), this.glow(0xffa726, 0.9)); fl.position.z = -0.13; m.add(fl); add(m, i * 0.09, new T.Vector3(i % 2 ? 0.12 : -0.12, 0, 0), 0.5); } s.trail = [0xeeeeee, 0xcfd8dc]; }
        else if (kind === 'bombs') for (let i = 0; i < 3; i++) { const bmb = shaft(0.3, 0.06, '#455a64', 0.08, '#37474f'); add(bmb, i * 0.12, new T.Vector3((i - 1) * 0.25, 0, (i - 1) * 0.1), 0); bmb.userData.drop = true; }
        else if (kind === 'laser') {
          const beam = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 1, 8), this.glow(s.white ? 0x4fc3f7 : 0xff1744, 0.95));
          const core = new T.Mesh(new T.CylinderGeometry(0.007, 0.007, 1, 6), this.glow(0xffffff, 1)); beam.add(core);
          s.beam = this.fx(s, beam); s.beam.visible = false;
        }
      }
      if (s.muzzleFlash) { const k = Math.max(0, 1 - (el - s.fire) / 0.3); s.muzzleFlash.visible = k > 0; s.muzzleFlash.scale.setScalar(0.5 + k); }
      if (s.start && el < s.impact + 0.05) {
        const u0 = (el - s.fire) / s.flight;
        if (s.beam) {
          // le rayon relie l'arme à la cible et grésille
          const a = s.start, d = end.clone().sub(a), L = d.length();
          s.beam.visible = u0 >= 0; s.beam.position.copy(a).addScaledVector(d, 0.5);
          s.beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
          s.beam.scale.set(0.7 + Math.random() * 0.6, L, 0.7 + Math.random() * 0.6);
        }
        for (const it of s.items || []) {
          const u = (el - s.fire - it.delay) / s.flight;
          it.o.visible = u >= 0 && u < 1;
          if (!it.o.visible) continue;
          const tgt = end.clone().add(it.off);
          let pos, next;
          if (it.o.userData.drop) {
            // bombe : tombe du ciel à la verticale de la cible
            const top = tgt.clone(); top.y = 4.5;
            pos = top.clone().lerp(tgt, u * u); next = top.clone().lerp(tgt, Math.min(1, (u + 0.02) ** 2));
          } else {
            const at = (k) => { const p = s.start.clone().lerp(tgt, k); p.y += Math.sin(Math.PI * k) * it.arc; return p; };
            pos = at(u); next = at(Math.min(1, u + 0.02));
          }
          it.o.position.copy(pos);
          if (it.spin) it.o.rotation.set(el * it.spin, el * it.spin * 0.7, 0); else it.o.lookAt(next);
          if (s.trail && (!it.last || el - it.last > 0.025)) {
            it.last = el;
            const puff = this.fx(s, new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: s.trail[Math.random() < 0.5 ? 0 : 1], transparent: true, opacity: 0.7, depthWrite: false })));
            puff.position.copy(pos); s.puffs.push({ m: puff, t0: el });
          }
        }
      }
      if (el >= s.impact && !s.exploded) {
        s.exploded = true; // une seule explosion, même si l'effet est encore appelé après son nettoyage
        for (const it of s.items || []) it.o.visible = false;
        if (s.beam) s.beam.visible = false;
        const fire = kind === 'shell' || kind === 'missiles' || kind === 'bombs' || kind === 'firepot' || kind === 'laser';
        if (fire) this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffc34d], [0x3b2a1a, 0xff8a2a]);
        else this.explode(s, end, el, t, [0xf5e6c4, 0xc9a66b, 0xe0c895], [0x8d6e63, 0x9e9e9e], true);
        if (kind === 'bombs' || kind === 'shell') { this.shakeUntil = t + 0.6; this.shakeAmp = 0.14; }
      }
      this.boomStep(s, el);
      for (const p of s.puffs || []) {
        const age = el - p.t0;
        p.m.scale.setScalar(Math.max(0.05, 1 + age * 2));
        p.m.material.opacity = Math.max(0, 0.7 - age * 1.4);
        p.m.position.y += 0.004;
      }
    }

    // Thème Océan : une salve de bulles part des nageoires, file en ondulant et éclate sur la cible
    flyBubbles(c, s, el, t) {
      const T = this.THREE;
      const N = 14;
      if (el < s.fire) {
        if (!s.charge) s.charge = this.fx(s, new T.Mesh(new T.SphereGeometry(0.1, 12, 8), new T.MeshBasicMaterial({ color: s.pal.charge, transparent: true, opacity: 0.55, depthWrite: false })));
        s.charge.position.copy(this.handsOf(c));
        s.charge.scale.setScalar(0.4 + (el / s.fire) * 1.6);
      } else if (s.charge) s.charge.visible = false;
      if (el >= s.fire && !s.bubbles && !s.boom) {
        s.start = this.handsOf(c);
        s.bubbles = [];
        for (let i = 0; i < N; i++) {
          const r = 0.1 + Math.random() * 0.12;
          const b = new T.Mesh(new T.SphereGeometry(r, 12, 8), new T.MeshBasicMaterial({ color: s.pal.bub, transparent: true, opacity: 0.75, depthWrite: false }));
          const shine = new T.Mesh(new T.SphereGeometry(r * 0.3, 6, 4), new T.MeshBasicMaterial({ color: 0xffffff }));
          shine.position.set(-r * 0.4, r * 0.45, r * 0.3); b.add(shine);
          b.userData = { lag: i * 0.035, ph: Math.random() * 6, off: (Math.random() - 0.5) * 0.3 };
          s.bubbles.push(this.fx(s, b));
        }
      }
      const end = new T.Vector3(s.target.x, 0.6, s.target.z);
      if (s.bubbles && el < s.impact + 0.3) {
        const dir = end.clone().sub(s.start); dir.y = 0;
        const side = new T.Vector3(-dir.z, 0, dir.x).normalize();
        for (const b of s.bubbles) {
          const u = Math.max(0, Math.min(1, (el - s.fire - b.userData.lag) / s.flight));
          b.visible = el - s.fire > b.userData.lag && u < 1;
          const p = s.start.clone().lerp(end, u);
          p.y += Math.sin(Math.PI * u) * 0.35 + Math.sin(el * 9 + b.userData.ph) * 0.05;
          p.addScaledVector(side, Math.sin(u * 7 + b.userData.ph) * 0.12 + b.userData.off * (1 - u));
          b.position.copy(p);
        }
      }
      if (el >= s.impact && !s.exploded) {
        s.exploded = true;
        if (s.bubbles) for (const b of s.bubbles) b.visible = false;
        this.explode(s, end, el, t, s.pal.burst, s.pal.bits, true);
      }
      this.boomStep(s, el);
    }

    // Impact : noyau, halo, onde au sol et éclats (feu ou gerbe d'eau)
    explode(s, at, el, t, [c1, c2, c3], debrisColors, water) {
      const T = this.THREE;
      const boom = new T.Group(); boom.position.copy(at);
      const core = new T.Mesh(new T.SphereGeometry(0.3, 16, 12), this.glow(c1, 1));
      const fire = new T.Mesh(new T.SphereGeometry(0.45, 16, 12), water ? new T.MeshBasicMaterial({ color: c2, transparent: true, opacity: 0.6, depthWrite: false }) : this.glow(c2));
      const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: c3, transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -0.5;
      boom.add(core, fire, ring);
      s.debris = [];
      for (let i = 0; i < (water ? 22 : 14); i++) {
        const d = new T.Mesh(water ? new T.SphereGeometry(0.04, 6, 4) : new T.BoxGeometry(0.06, 0.06, 0.06), new T.MeshBasicMaterial({ color: debrisColors[i % 2] }));
        const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 2;
        d.userData.v = new T.Vector3(Math.cos(a) * sp, 2 + Math.random() * 2.5, Math.sin(a) * sp);
        boom.add(d); s.debris.push(d);
      }
      s.boom = this.fx(s, boom); s.boomT = el;
      this.shakeUntil = t + 0.4; this.shakeAmp = water ? 0.07 : 0.12;
    }
    boomStep(s, el) {
      if (!s.boom) return;
      const b = (el - s.boomT);
      const [core, fire, ring] = s.boom.children;
      const g = Math.min(1, b / 0.18);
      core.scale.setScalar(0.4 + g * 1.4); core.material.opacity = Math.max(0, 1 - b / 0.4);
      fire.scale.setScalar(0.5 + g * 1.8 + b * 0.6); fire.material.opacity = Math.max(0, 0.9 - b / 0.7);
      ring.scale.setScalar(1 + b * 6); ring.material.opacity = Math.max(0, 0.8 - b / 0.5);
      for (const d of s.debris) {
        const v = d.userData.v;
        d.position.set(v.x * b, Math.max(-0.55, v.y * b - 4.9 * b * b), v.z * b);
        d.rotation.set(b * 10, b * 7, 0);
      }
      if (b > 1.2) { this.scene.remove(s.boom); s.boom = null; }
    }

    endShot(c) {
      const s = c && c.fx ? c : c && c.anim && c.anim.shot;
      if (!s) return;
      if (s.sky && s.style === 'flameline') { this.renderer.toneMappingExposure = s.sky.exposure; s.sky = null; }
      if (s.expo != null) { this.renderer.toneMappingExposure = s.expo; s.expo = null; }
      if (s.sky) this.restoreSky(s);
      for (const o of s.fx || []) {
        this.scene.remove(o);
        o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      }
      if (s.headClone) { this.scene.remove(s.headClone); s.headClone = null; }
      s.fx = []; s.ball = null; s.boom = null; s.dragon = null; s.ended = true;
    }

