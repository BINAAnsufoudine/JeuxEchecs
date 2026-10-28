    // Riposte à distance de la pièce prise : chacune lance sa propre technique sur l'attaquant
    // Technique de substitution : juste avant que la riposte ne l'atteigne, l'attaquant disparaît dans un nuage
    // de fumée et laisse à sa place une bûche qui encaisse le coup, puis il réapparaît pour lancer son attaque.
    substitution(c, a, u, t, M) {
      const T = this.THREE, swap = 0.62, back = 1.0, pos = a.from;
      M.setEarthWall(c.parts, 0);
      M.animate(c.parts, t, u < swap ? 'guard' : 'cast', 1);
      c.parts.root.visible = u < swap || u >= back;
      if (c.parts.riderRoot) c.parts.riderRoot.visible = c.parts.root.visible;
      if (c.shadow) c.shadow.visible = c.parts.root.visible;
      a.subst = a.subst || {};
      const puff = (at) => {
        const g = new T.Group(); g.position.set(at.x, 0, at.z); this.scene.add(g);
        const balls = [];
        for (let i = 0; i < 9; i++) {
          const m = new T.Mesh(new T.SphereGeometry(0.17, 10, 8), new T.MeshBasicMaterial({ color: i % 3 ? 0xe8e8e8 : 0xbdbdbd, transparent: true, opacity: 0.85, depthWrite: false }));
          const ang = (i / 9) * Math.PI * 2;
          m.userData = { dx: Math.cos(ang) * 0.35, dz: Math.sin(ang) * 0.35, y: 0.25 + (i % 3) * 0.25 };
          g.add(m); balls.push(m);
        }
        this.addEffect({ start: t, dur: 0.45, tick: (e) => {
          const k = e / 0.45;
          for (const m of balls) { m.position.set(m.userData.dx * (0.4 + k), m.userData.y + k * 0.3, m.userData.dz * (0.4 + k)); m.scale.setScalar(0.6 + k * 1.2); m.material.opacity = 0.85 * (1 - k); }
        }, end: () => { this.scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); } });
      };
      if (u >= swap && !a.subst.out) {
        a.subst.out = true;
        puff(pos);
        // la bûche prend sa place : elle encaisse la riposte, bascule et roule un peu en arrière
        const log = new T.Group(); log.position.set(pos.x, 0, pos.z); this.scene.add(log);
        const wood = new T.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 }), ring = new T.MeshStandardMaterial({ color: 0xd7b98e, roughness: 0.8 });
        const trunk = new T.Mesh(new T.CylinderGeometry(0.16, 0.17, 0.62, 12), wood); trunk.position.y = 0.31; log.add(trunk);
        for (const y of [0.62, 0]) { const r = new T.Mesh(new T.CircleGeometry(0.16, 12), ring); r.rotation.x = y ? -Math.PI / 2 : Math.PI / 2; r.position.y = y + (y ? 0.001 : -0.001); log.add(r); }
        const knot = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 0.12, 6), wood); knot.rotation.z = Math.PI / 2; knot.position.set(0.17, 0.42, 0); log.add(knot); log.scale.setScalar(1.3);
        log.rotation.y = c.holder.rotation.y;
        const fwd = { x: Math.sin(c.holder.rotation.y), z: Math.cos(c.holder.rotation.y) };
        this.addEffect({ start: t, dur: back - swap + 0.25, tick: (e) => {
          const hit = Math.max(0, e - (0.85 - swap));
          log.rotation.x = -Math.min(1.45, hit * 7); // touchée, elle tombe en arrière
          log.position.set(pos.x - fwd.x * Math.min(0.3, hit * 1.2), 0, pos.z - fwd.z * Math.min(0.3, hit * 1.2));
          log.visible = e < back - swap + 0.05;
        }, end: () => { this.scene.remove(log); log.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); wood.dispose(); ring.dispose(); } });
      }
      if (u >= back && !a.subst.in) { a.subst.in = true; puff(pos); }
    }

    // Projectile de riposte propre à la pièce ciblée, selon le thème (orienté le long de +z)
    counterProj(c, kind) {
      const T = this.THREE, theme = root.themeOf(c.piece), white = c.piece === c.piece.toUpperCase();
      const pal = THEME_FX[theme][white ? 'w' : 'b'];
      const g = new T.Group(); g.userData.themed = true;
      const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0.2 }, o));
      const shaft = (len, r, color, tipColor) => {
        const sh = new T.Mesh(new T.CylinderGeometry(r, r, len, 6), std(color)); sh.rotation.x = Math.PI / 2; g.add(sh);
        const tip = new T.Mesh(new T.ConeGeometry(r * 3, len * 0.18, 6), std(tipColor, { metalness: 0.8 })); tip.rotation.x = Math.PI / 2; tip.position.z = len * 0.59; g.add(tip);
      };
      const glowBall = (r, c1, c2) => { g.add(new T.Mesh(new T.SphereGeometry(r, 12, 8), this.glow(c1, 1)), new T.Mesh(new T.SphereGeometry(r * 1.8, 12, 8), this.glow(c2, 0.5))); };
      const weapon = (WAR_PROJ[theme] && WAR_PROJ[theme][kind] && WAR_PROJ[theme][kind][white ? 'w' : 'b']) || (theme === 'modern' ? 'bullet' : theme === 'ancient' ? 'spear' : 'orb');
      if (weapon === 'spear' || weapon === 'spears') shaft(0.75, 0.018, '#8d6e63', '#cfd8dc');
      else if (weapon === 'bolt') shaft(0.95, 0.028, '#6d4c41', '#90a4ae');
      else if (weapon === 'arrows') shaft(0.5, 0.011, '#8d6e63', '#9e9e9e');
      else if (weapon === 'boulder') { g.add(new T.Mesh(new T.DodecahedronGeometry(0.2, 0), std(0x8d8478, { flatShading: true, roughness: 0.95 }))); g.userData.spin = true; }
      else if (weapon === 'firepot') { g.add(new T.Mesh(new T.SphereGeometry(0.12, 10, 8), std(0x6d4c41))); g.add(new T.Mesh(new T.SphereGeometry(0.2, 10, 8), this.glow(0xff7a1a, 0.7))); }
      else if (weapon === 'missiles' || weapon === 'bombs') { shaft(0.36, 0.032, '#eceff1', '#c62828'); const f = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), this.glow(0xffa726, 0.9)); f.position.z = -0.2; g.add(f); }
      else if (weapon === 'shell') { shaft(0.24, 0.045, '#b08d2e', '#8d6e2e'); g.add(new T.Mesh(new T.SphereGeometry(0.07, 8, 6), this.glow(0xffd54f, 0.9))); }
      else if (weapon === 'laser') { const beam = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.9, 8), this.glow(white ? 0x4fc3f7 : 0xff1744, 0.95)); beam.rotation.x = Math.PI / 2; g.add(beam); }
      else if (weapon === 'bullet') { for (let i = 0; i < 3; i++) { const tr = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.3, 5), this.glow(0xffe082, 0.95)); tr.rotation.x = Math.PI / 2; tr.position.set((i - 1) * 0.06, (i % 2) * 0.05, -i * 0.25); g.add(tr); } }
      else if (kind === 'q' || kind === 'r') { const jet = new T.Mesh(new T.CylinderGeometry(0.06, 0.1, 0.7, 10), new T.MeshToonMaterial({ color: pal.jet, transparent: true, opacity: 0.9 })); jet.rotation.x = Math.PI / 2; g.add(jet); glowBall(0.08, pal.foam, pal.charge); } // créatures : jet du thème
      else glowBall(0.1, pal.bub, pal.charge); // créatures : bulle, graine, caillou, plume aux couleurs du thème
      return g;
    }

    counterShot(d, t) {
      const T = this.THREE, M = root.Models3D, k = d.counter, c = d.c, el = t - k.start;
      const kind = c.piece.toLowerCase(), cast = 'qrk'.includes(kind);
      if (el < 0.85) M.animate(c.parts, t, cast ? 'cast' : kind === 'b' ? 'throw' : 'punch', cast ? Math.min(1, el / 0.5) : Math.min(1, el / 0.45));
      else M.animate(c.parts, t, 'idle');
      if (el >= 0.3 && !k.proj && !k.done) {
        const g = THEME_FX[root.themeOf(c.piece)] ? this.counterProj(c, kind) : new T.Group();
        if (g.userData.themed) { /* arme propre à la pièce, aux couleurs du thème */ }
        else if (kind === 'b' && c.parts.shuriken) { g.add(this.cloneClean(c.parts.shuriken)); g.scale.setScalar(c.parts.root.scale.x * 1.1); }
        else {
          const col = { q: [0xfff1a8, 0xff7a1a], r: [0xd8f6ff, 0x2a8cff], k: [0xeaffff, 0x5fd8ff], n: [0xffffff, 0x9fb8ff], p: [0xffffff, 0xffc04a] }[kind] || [0xffffff, 0xffe066];
          const long = kind === 'p' || kind === 'k' || kind === 'n';
          const core = new T.Mesh(long ? new T.ConeGeometry(0.06, 0.42, 6) : new T.SphereGeometry(0.12, 12, 8), this.glow(col[0], 1));
          const halo = new T.Mesh(long ? new T.ConeGeometry(0.12, 0.5, 6) : new T.SphereGeometry(0.24, 12, 8), this.glow(col[1], 0.55));
          if (long) { core.rotation.x = halo.rotation.x = Math.PI / 2; }
          g.add(core, halo);
          g.scale.setScalar(1.5);
        }
        if (c.parts.muzzle) { c.holder.updateMatrixWorld(true); k.start3 = c.parts.muzzle.getWorldPosition(new T.Vector3()); } else k.start3 = this.handsOf(c);
        k.proj = g; this.scene.add(g);
      }
      if (k.proj) {
        const u = Math.min(1, (el - 0.3) / 0.55);
        const end = new T.Vector3(k.at.x, 0.7, k.at.z);
        const pos = k.start3.clone().lerp(end, u); pos.y += Math.sin(Math.PI * u) * 0.25;
        k.proj.position.copy(pos);
        k.proj.lookAt(end);
        if (kind === 'b' && !k.proj.userData.themed) k.proj.rotation.z = -el * 28;
        if (k.proj.userData.spin) k.proj.rotation.set(el * 7, el * 5, 0);
        if (u >= 1) {
          // parée par l'attaquant : éclat à l'impact
          this.scene.remove(k.proj); k.proj = null; k.done = true;
          this.shakeUntil = t + 0.08; this.shakeAmp = 0.02;
          const pal = THEME_FX[root.themeOf(c.piece)] && THEME_FX[root.themeOf(c.piece)][c.piece === c.piece.toUpperCase() ? 'w' : 'b'];
          k.burst = new T.Mesh(new T.SphereGeometry(0.2, 12, 8), this.glow(pal ? pal.burst[1] : kind === 'q' ? 0xff7a1a : kind === 'r' ? 0x2a8cff : 0xffe9a0, 0.85));
          k.burst.position.copy(end); k.burstT = el; this.scene.add(k.burst);
        }
      }
      if (k.burst) {
        // éclat sur la garde de l'attaquant
        const v = (el - k.burstT) / 0.25;
        k.burst.scale.setScalar(1 + v * 2.2); k.burst.material.opacity = Math.max(0, 0.85 * (1 - v));
        if (v >= 1) this.endBurst(k);
      }
    }
    endCounter(d) {
      const k = d.counter;
      if (k && k.proj) { this.scene.remove(k.proj); k.proj = null; k.done = true; }
      if (k) this.endBurst(k);
    }
    endBurst(k) {
      if (!k.burst) return;
      this.scene.remove(k.burst); k.burst.geometry.dispose(); k.burst.material.dispose(); k.burst = null;
    }

    // Étincelle au point d'impact pendant un duel
    // Escorte du général (guerriers modernes) : deux soldats de son camp entrent depuis le bord du plateau,
    // se postent devant lui de part et d'autre, mitraillent la cible puis repartent
    addEscort(esc, now) {
      const T = this.THREE, M = root.Models3D, P = esc.from, d = esc.dir, side = { x: -d.z, z: d.x };
      const soldiers = [-1, 1].map((sd) => {
        const parts = M.build(T, esc.white ? 'P' : 'p'), holder = new T.Group(); holder.add(parts.root); this.pieces.add(holder);
        const post = { x: P.x + d.x * 0.55 + side.x * sd * 0.6, z: P.z + d.z * 0.55 + side.z * sd * 0.6 };
        // entrée : depuis l'extérieur du plateau, du côté du soldat
        const out = { x: P.x + side.x * sd * 6.5 - d.x * 1.5, z: P.z + side.z * sd * 6.5 - d.z * 1.5 };
        holder.position.set(out.x, 0, out.z);
        if (esc.flying) {
          // bazooka sur l'épaule à la place du fusil
          if (parts.gun) parts.gun.visible = false;
          const tube = new T.Group(); tube.position.set(0.06, 0.15, 0.02); parts.torso.add(tube);
          const body = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.3, 10), new T.MeshStandardMaterial({ color: 0x4b5320, roughness: 0.7 })); body.rotation.x = Math.PI / 2; tube.add(body);
          const mouth = new T.Mesh(new T.CylinderGeometry(0.03, 0.022, 0.05, 10), new T.MeshStandardMaterial({ color: 0x2e3318 })); mouth.rotation.x = Math.PI / 2; mouth.position.z = 0.16; tube.add(mouth);
          parts.bazooka = tube; parts.bazookaTip = new T.Object3D(); parts.bazookaTip.position.z = 0.2; tube.add(parts.bazookaTip);
          parts.pose = null; // pas de pose fusil : il tient le bazooka
        }
        return { parts, holder, post, out };
      });
      // roquette tirée au bazooka vers l'engin volant, avec traînée de fumée et explosion en l'air
      const fireRocket = (s, t0) => {
        const from = s.parts.bazookaTip.getWorldPosition(new T.Vector3()), to = new T.Vector3(esc.target.x, 0.9, esc.target.z);
        const rocket = new T.Group(); const rb = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.16, 8), new T.MeshStandardMaterial({ color: 0x5d6b2f })); rb.rotation.x = Math.PI / 2; rocket.add(rb);
        const fl = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), this.glow(0xffa726, 0.9)); fl.position.z = -0.1; rocket.add(fl);
        this.scene.add(rocket); const puffs = [];
        const boom = new T.Mesh(new T.SphereGeometry(0.3, 14, 10), this.glow(0xff8a2a, 0.9)); boom.visible = false; boom.position.copy(to); this.scene.add(boom);
        this.addEffect({ start: t0, dur: 1.1, tick: (e) => {
          const u = Math.min(1, e / 0.4);
          rocket.visible = u < 1; rocket.position.copy(from).lerp(to, u); rocket.lookAt(to);
          if (u < 1 && Math.random() < 0.8) { const pf = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), new T.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.7, depthWrite: false })); pf.position.copy(rocket.position); pf.userData.t = e; this.scene.add(pf); puffs.push(pf); }
          for (const pf of puffs) { const a = e - pf.userData.t; pf.scale.setScalar(1 + a * 3); pf.material.opacity = Math.max(0, 0.7 - a * 1.2); }
          if (u >= 1) { const k = (e - 0.4) / 0.7; boom.visible = k < 1; boom.scale.setScalar(0.5 + k * 2.2); boom.material.opacity = 0.9 * (1 - k); if (!s.boomShake) { s.boomShake = true; this.shakeUntil = this.now() + 0.3; this.shakeAmp = 0.08; } }
        }, end: () => { for (const o of [rocket, boom, ...puffs]) { this.scene.remove(o); o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); } } });
      };
      const run = (s, a, b, u, t) => {
        s.holder.position.set(a.x + (b.x - a.x) * u, 0, a.z + (b.z - a.z) * u);
        s.holder.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        M.animate(s.parts, t, 'run');
      };
      const tIn = 0.8, tFire = 1.85, tOut = 2.7;
      this.addEffect({ start: now, dur: tOut, tick: (e, t) => {
        for (const s of soldiers) {
          if (e < tIn) run(s, s.out, s.post, e / tIn, t);
          else if (e < tFire) {
            s.holder.position.set(s.post.x, 0, s.post.z);
            s.holder.rotation.y = Math.atan2(esc.target.x - s.post.x, esc.target.z - s.post.z);
            M.animate(s.parts, t, esc.flying ? 'guard' : 'punch', 1);
            if (esc.flying) {
              // épaule le bazooka (canon vers la cible en hauteur), puis tire une roquette
              s.parts.armR.rotation.set(-1.4, 0, -0.2); s.parts.armL.rotation.set(-1.2, 0, 0.5);
              if (s.parts.bazooka) s.parts.bazooka.rotation.x = -0.35;
              if (!s.fired && e > tIn + 0.25 + soldiers.indexOf(s) * 0.2) { s.fired = true; s.holder.updateMatrixWorld(true); fireRocket(s, t); }
            } else if (s.parts.mg) this.mgBurst(s, esc.target, t);
          } else run(s, s.post, s.out, (e - tFire) / (tOut - tFire), t);
        }
      }, end: () => {
        for (const s of soldiers) {
          this.pieces.remove(s.holder);
          if (s.tracer) for (const o of [s.tracer, s.tracer.userData.muzzle, s.tracer.userData.hit]) { this.scene.remove(o); if (this.tracers) this.tracers.delete(s.tracer); }
        }
      } });
    }

    // Rafale de mitrailleuse : balles traçantes de l'arme vers la cible, éclair au canon et étincelles à l'impact
    mgBurst(c, foe, t) {
      const T = this.THREE;
      if (!c.tracer) {
        const g = new T.Group();
        for (let i = 0; i < 4; i++) { const tr = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.35, 5), new T.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false })); g.add(tr); }
        g.userData.muzzle = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), new T.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
        g.userData.hit = new T.Mesh(new T.IcosahedronGeometry(0.09, 0), new T.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
        this.scene.add(g, g.userData.muzzle, g.userData.hit);
        c.tracer = g; (this.tracers = this.tracers || new Set()).add(g);
      }
      const g = c.tracer; c.holder.updateMatrixWorld(true);
      const from = c.parts.mg.getWorldPosition(new T.Vector3()), to = new T.Vector3(foe.x, 0.55, foe.z), d = to.clone().sub(from), L = d.length();
      const dir = d.clone().normalize(), q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      g.children.forEach((tr, i) => { const u = ((t * 9 + i / 4) % 1); tr.position.copy(from).addScaledVector(d, u); tr.quaternion.copy(q); tr.visible = u * L > 0.1; });
      const on = Math.sin(t * 60) > 0;
      g.userData.muzzle.position.copy(from); g.userData.muzzle.visible = on; g.userData.muzzle.scale.setScalar(0.7 + Math.random() * 0.6);
      g.userData.hit.position.copy(to).addScaledVector(dir, -0.15); g.userData.hit.visible = !on; g.userData.hit.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      g.visible = true; g.userData.until = t + 0.06;
    }
    hideTracers(t) {
      for (const g of this.tracers || []) if (g.visible && !(t < g.userData.until)) { g.visible = false; g.userData.muzzle.visible = false; g.userData.hit.visible = false; }
    }

    flash(a, b, hits, color) {
      const T = this.THREE;
      if (!this.spark) {
        this.spark = new T.Mesh(new T.IcosahedronGeometry(0.12, 0), new T.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
        this.scene.add(this.spark);
      }
      const hit = hits % 1;
      const s = hit > 0.35 && hit < 0.6 ? 1 + Math.random() * 0.8 : 0;
      this.spark.material.color.setHex(color || 0xffe066);
      this.spark.visible = s > 0;
      this.spark.position.set((a.x + b.x) / 2, 0.75 + Math.random() * 0.1, (a.z + b.z) / 2);
      this.spark.scale.setScalar(s);
      this.spark.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.sparkUntil = this.now() + 0.05;
    }

