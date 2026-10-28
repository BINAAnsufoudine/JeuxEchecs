    // Prise en passant : le pion passe en un éclair à côté de sa cible et la fauche
    tickEnPassant(c, a, el, t, M) {
      const T = this.THREE, dash0 = 0.25, dash1 = 0.5;
      const u = Math.max(0, Math.min(1, (el - dash0) / (dash1 - dash0)));
      const e2 = u * u * (3 - 2 * u);
      c.holder.position.set(a.from.x + (a.to.x - a.from.x) * e2, 0, a.from.z + (a.to.z - a.from.z) * e2);
      c.holder.rotation.y = Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z);
      if (el < dash0) M.animate(c.parts, t, 'guard', 1);
      else if (el < dash1 + 0.1) { M.animate(c.parts, t, 'run'); this.trail(c, true, t); }
      else M.animate(c.parts, t, el < 1.2 ? 'punch' : 'idle', el < 1.2 ? 0.5 : 0);
      if (!a.slash) {
        // trait de lumière qui fend l'air au passage
        a.slash = new T.Mesh(new T.PlaneGeometry(1.2, 0.05), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
        a.slash.position.set((a.target.x + a.to.x) / 2, 0.75, (a.target.z + a.to.z) / 2);
        a.slash.rotation.set(0, Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z) + Math.PI / 2, 0.4);
        this.fx(a, a.slash);
      }
      const s = el - (dash0 + dash1) / 2 - 0.05;
      a.slash.material.opacity = s > 0 && s < 0.35 ? 1 - s / 0.35 : 0;
      a.slash.scale.set(1 + Math.max(0, s) * 2, 1, 1);
      if (s > 0 && s < 0.1) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.05; }
    }
    // La tête de la cible tombe au sol et roule ; le corps reste debout
    tickEnPassantVictim(d, a, c, el, t, M) {
      const T = this.THREE, cut = 0.42;
      c.holder.position.set(a.target.x, 0, a.target.z);
      if (el < cut) { M.animate(c.parts, t, 'idle'); return el < a.duration; }
      const head = c.parts.head;
      if (head && !a.headClone) {
        head.updateWorldMatrix(true, true);
        const pos = new T.Vector3(), quat = new T.Quaternion(), scl = new T.Vector3();
        head.matrixWorld.decompose(pos, quat, scl);
        // copie visuelle de la tête (clone() échoue : userData.char est circulaire)
        const copy = (o) => {
          const n = o.isMesh ? new T.Mesh(o.geometry, o.material) : new T.Group();
          n.position.copy(o.position); n.quaternion.copy(o.quaternion); n.scale.copy(o.scale); n.visible = o.visible;
          o.children.forEach((ch) => n.add(copy(ch)));
          return n;
        };
        const clone = copy(head); clone.visible = true;
        clone.position.copy(pos); clone.quaternion.copy(quat); clone.scale.copy(scl);
        this.scene.add(clone);
        head.visible = false;
        a.headClone = clone; a.headY = pos.y; a.headQuat = quat.clone();
        const dir = new T.Vector3(a.to.x - a.from.x, 0, a.to.z - a.from.z).normalize();
        a.headVel = { x: dir.x * 0.9 + (Math.random() - 0.5) * 0.3, y: 0.8, z: dir.z * 0.9 + (Math.random() - 0.5) * 0.3 };
        a.headRest = 0.06 * scl.y / 0.5;
      }
      // le corps reste figé debout
      if (a.headClone) {
        const h = a.headClone, f = el - cut;
        const ground = Math.max(0.06, a.headRest || 0.08);
        if (!a.headLanded) {
          h.position.x = a.target.x + a.headVel.x * f + (h.position.x - h.position.x);
          h.position.z = a.target.z + a.headVel.z * f;
          h.position.y = a.headY + a.headVel.y * f - 4.9 * f * f;
          h.rotation.set(f * 9, f * 3, f * 5);
          if (h.position.y <= ground) { h.position.y = ground; a.headLanded = el; a.landX = h.position.x; a.landZ = h.position.z; this.shakeUntil = t + 0.04; this.shakeAmp = 0.03; }
        } else {
          // petite roulade avant de s'arrêter
          const r = Math.min(1, (el - a.headLanded) / 0.6), k = 1 - (1 - r) * (1 - r);
          h.position.set(a.landX + a.headVel.x * 0.35 * k, ground, a.landZ + a.headVel.z * 0.35 * k);
          h.rotation.z += (1 - r) * 0.25;
        }
      }
      if (el >= a.duration) {
        if (a.headClone) { this.scene.remove(a.headClone); a.headClone = null; }
        return false;
      }
      return true;
    }
    // Partie nulle : les deux rois marchent au centre et se saluent, les autres pièces se rangent derrière leur roi
    planDrawFormation(now) {
      const start = Math.max(now, this.busyUntil || now) + 0.4;
      const order = { q: 0, r: 1, b: 2, n: 3, p: 4 };
      let planned = false;
      for (const side of ['w', 'b']) {
        const sign = side === 'w' ? 1 : -1;
        const list = [...this.chars.entries()].filter(([, c]) => (c.piece === c.piece.toUpperCase() ? 'w' : 'b') === side);
        const king = list.find(([, c]) => c.piece.toLowerCase() === 'k');
        const others = list.filter(([, c]) => c.piece.toLowerCase() !== 'k').sort((x, y) => order[x[1].piece.toLowerCase()] - order[y[1].piece.toLowerCase()] || x[0] - y[0]);
        if (king) {
          const c = king[1];
          if (!c.drawTo) { const p = this.sqToPos(king[0]); c.drawFrom = { x: p.x, z: p.z }; c.drawTo = { x: 0, z: 0.55 * sign }; c.drawAt = start; c.drawFace = sign > 0 ? Math.PI : 0; c.drawKing = true; planned = true; }
        }
        const rows = [others.filter(([, c]) => c.piece.toLowerCase() !== 'p'), others.filter(([, c]) => c.piece.toLowerCase() === 'p')].filter((r) => r.length);
        rows.forEach((row, ri) => {
          row.forEach(([sq, c], i) => {
            if (c.drawTo) return;
            const p = this.sqToPos(sq), x = (i - (row.length - 1) / 2) * 0.85;
            c.drawFrom = { x: p.x, z: p.z }; c.drawTo = { x, z: (1.65 + ri * 1.0) * sign };
            c.drawAt = start + 0.15 + ri * 0.2 + Math.abs(x) * 0.05; c.drawFace = sign > 0 ? Math.PI : 0; planned = true;
          });
        });
      }
      if (planned) this.busyUntil = Math.max(this.busyUntil || now, start + 2.4);
    }
    tickDrawFormation(c, t, M) {
      const e = t - c.drawAt, dur = 1.6;
      const u = Math.max(0, Math.min(1, e / dur)), k = u * u * (3 - 2 * u);
      const x = c.drawFrom.x + (c.drawTo.x - c.drawFrom.x) * k, z = c.drawFrom.z + (c.drawTo.z - c.drawFrom.z) * k;
      c.holder.position.set(x, 0, z);
      if (e > 0 && u < 1) {
        const dx = c.drawTo.x - c.drawFrom.x, dz = c.drawTo.z - c.drawFrom.z;
        if (Math.hypot(dx, dz) > 0.01) c.holder.rotation.y = Math.atan2(dx, dz);
        M.animate(c.parts, t, 'run');
        return;
      }
      c.holder.rotation.y = c.drawFace;
      M.animate(c.parts, t, 'idle');
      if (e <= 0) return;
      // les rois se saluent, les autres baissent la tête
      const after = e - dur;
      if (c.drawKing) {
        const bow = after > 0.2 && after < 1.6 ? Math.sin((after - 0.2) / 1.4 * Math.PI) : 0;
        if (c.parts.torso) c.parts.torso.rotation.x = 0.6 * bow;
      } else if (c.parts.head) c.parts.head.rotation.x = 0.35 * Math.min(1, after / 0.5);
    }
    // Ciel qui passe du jour au coucher de soleil puis à la nuit au fil de la partie
    tickDayNight(t, dt) {
      const T = this.THREE;
      const ply = this.ply == null ? 0 : this.ply;
      const sunsetT = Math.max(0, Math.min(1, (ply - 30) / 40)), nightT = Math.max(0, Math.min(1, (ply - 70) / 40));
      // transition douce d'une valeur à l'autre (retour en arrière dans un replay compris)
      const ease = 1 - Math.exp(-dt * 1.5);
      this.sunset = (this.sunset || 0) + (sunsetT - (this.sunset || 0)) * ease;
      this.night = (this.night || 0) + (nightT - (this.night || 0)) * ease;
      if (!this.nightSky) {
        const g = new T.Group(), n = 260, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, el = 0.15 + Math.random() * 1.25, r = 55;
          pos[i * 3] = Math.cos(a) * Math.cos(el) * r; pos[i * 3 + 1] = Math.sin(el) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * r;
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        const stars = new T.Points(geo, new T.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0, fog: false, depthWrite: false }));
        const moon = new T.Mesh(new T.SphereGeometry(2.2, 24, 16), new T.MeshBasicMaterial({ color: 0xf4f1df, transparent: true, opacity: 0, fog: false }));
        moon.position.set(-24, 26, -38);
        const halo = new T.Mesh(new T.SphereGeometry(3.6, 24, 16), new T.MeshBasicMaterial({ color: 0xbfcfff, transparent: true, opacity: 0, fog: false, blending: T.AdditiveBlending, depthWrite: false }));
        halo.position.copy(moon.position);
        g.add(stars, moon, halo); this.scene.add(g);
        this.nightSky = { g, stars, moon, halo };
      }
      const ns = this.nightSky, n = this.night;
      ns.g.visible = n > 0.01;
      ns.stars.material.opacity = n * (0.75 + Math.sin(t * 2) * 0.05);
      ns.moon.material.opacity = n; ns.halo.material.opacity = 0.18 * n;
      const u = this.mateUltimate;
      if (!this.skyBase || (u && u.apocalypse)) return;
      const sky = this.skyBase.clone().lerp(new T.Color(0xe08a5c), this.sunset * (1 - n) * 0.55).lerp(new T.Color(0x0a1024), n * 0.85);
      const dim = this.skyDim || 0;
      if (dim > 0) sky.lerp(new T.Color(0x05070d), dim * 0.9);
      if (this.scene.background && this.scene.background.isColor) this.scene.background.copy(sky);
      if (this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(sky);
      if (this.backdrop) this.backdrop.material.color.copy(this.backdropTint || new T.Color(0xffffff)).lerp(new T.Color(0xe8a070), this.sunset * (1 - n) * 0.4).multiplyScalar(1 - 0.75 * n - 0.6 * dim);
      if (this.sun && this.sunset * (1 - n) > 0.005) this.sun.color.setRGB(1, 1 - this.sunset * (1 - n) * 0.25, 1 - this.sunset * (1 - n) * 0.45);
    }

    // Cavalier blanc : le chien et son ninja tournent sur eux-mêmes et se changent en tourbillon de vent
    tickWhirlwind(c, a, el, t, M) {
      const T = this.THREE;
      if (!a.whirl) {
        // tourbillon couché à l'horizontale dans l'axe de l'attaque, anneaux fermés et serrés
        a.whirl = new T.Group(); a.whirl.rotation.order = 'YXZ';
        a.whirlBands = [];
        for (let i = 0; i < 7; i++) {
          const r = 0.2 + Math.abs(i - 3) * 0.035;
          const band = new T.Mesh(new T.TorusGeometry(r, 0.026, 6, 32, Math.PI * 1.9),
            new T.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0xd9ecf5, transparent: true, opacity: 0.75, depthWrite: false, side: T.DoubleSide }));
          band.rotation.x = Math.PI / 2; band.position.y = (i - 3) * 0.13;
          band.userData = { speed: 9 + i * 1.5, phase: i * 0.9 };
          a.whirl.add(band); a.whirlBands.push(band);
        }
        a.whirlBits = [];
        for (let i = 0; i < 14; i++) {
          const bit = new T.Mesh(new T.PlaneGeometry(0.07, 0.04), new T.MeshBasicMaterial({ color: i % 3 ? 0xcfe6c4 : 0xb7a57a, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
          bit.userData = { a: i * 2.399, h: ((i % 7) - 3) * 0.13, r: 0.2 + (i % 3) * 0.05 };
          a.whirl.add(bit); a.whirlBits.push(bit);
        }
        a.whirl.scale.setScalar(0.01);
        this.fx(a, a.whirl);
      }
      if (el >= a.pre) return false;
      const k = el / a.pre;
      c.holder.position.set(a.from.x, 0, a.from.z);
      c.holder.rotation.y = Math.atan2(a.target.x - a.from.x, a.target.z - a.from.z);
      M.animate(c.parts, t, 'run');
      // ils tournent de plus en plus vite, puis disparaissent dans le vent
      c.parts.root.rotation.set(0, k * k * 30, 0);
      c.parts.root.visible = k < 0.75;
      if (c.parts.riderRoot) c.parts.riderRoot.visible = k < 0.75;
      a.whirl.visible = true;
      a.whirl.position.set(a.from.x, 0.42, a.from.z);
      a.whirl.rotation.set(Math.PI / 2, Math.atan2(a.target.x - a.from.x, a.target.z - a.from.z), 0);
      a.whirl.scale.setScalar(Math.max(0.01, Math.min(1, k * 1.4)));
      this.spinWhirl(a, t, 1);
      return true;
    }
    spinWhirl(a, t, fade) {
      a.whirlBands.forEach((b) => {
        b.rotation.z = t * b.userData.speed + b.userData.phase;
        b.material.opacity = (0.45 + Math.abs(Math.sin(t * 7 + b.userData.phase)) * 0.35) * fade;
      });
      a.whirlBits.forEach((bit, i) => {
        const d = bit.userData, ang = d.a + t * (8 + (i % 3));
        bit.position.set(Math.cos(ang) * d.r, d.h + Math.sin(t * 5 + i) * 0.05, Math.sin(ang) * d.r);
        bit.rotation.set(t * 6 + i, t * 4, 0);
        bit.material.opacity = 0.85 * fade;
      });
    }

    tunnelDust(c, a, t) {
      const T = this.THREE;
      if (!a.dust) {
        a.dust = new T.Group();
        for (let i = 0; i < 9; i++) {
          const dust = new T.Mesh(new T.SphereGeometry(0.09 + (i % 3) * 0.035, 7, 5),
            new T.MeshBasicMaterial({ color: i % 2 ? 0x9c7448 : 0xd0ae7a, transparent: true, opacity: 0.55, depthWrite: false }));
          dust.userData.phase = i * Math.PI * 2 / 9;
          a.dust.add(dust);
        }
        this.fx(a, a.dust);
      }
      const p = c.holder.position;
      a.dust.children.forEach((dust, i) => {
        const angle = dust.userData.phase + t * 12;
        const r = 0.3 + Math.sin(t * 17 + i) * 0.08;
        dust.position.set(p.x + Math.cos(angle) * r, 0.04 + (i % 3) * 0.12, p.z + Math.sin(angle) * r);
        dust.scale.setScalar(0.7 + Math.max(0, Math.sin(t * 14 + i)) * 0.7);
      });
    }

    makeMiniEagle() {
      const T = this.THREE, bird = new T.Group();
      const white = new T.MeshBasicMaterial({ color: 0xf6fbff });
      const cream = new T.MeshBasicMaterial({ color: 0xdceaf4 });
      const gold = new T.MeshBasicMaterial({ color: 0xffce42 });
      const ball = (parent, material, x, y, z, sx, sy, sz) => {
        const m = new T.Mesh(new T.SphereGeometry(1, 8, 6), material);
        m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
      };
      ball(bird, white, 0, 0, 0, 0.12, 0.09, 0.2);
      ball(bird, white, 0, 0.06, 0.17, 0.09, 0.08, 0.09);
      const beak = new T.Mesh(new T.ConeGeometry(0.035, 0.11, 5), gold);
      beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.02, 0.27); bird.add(beak);
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.07, 0.035, -0.01); wing.userData.side = side;
        ball(wing, white, side * 0.1, 0, 0, 0.15, 0.025, 0.075);
        for (let i = 0; i < 3; i++) ball(wing, cream, side * (0.16 + i * 0.025), -0.01, -0.04 + i * 0.045, 0.085, 0.018, 0.025);
        bird.add(wing); wings.push(wing);
      }
      bird.userData.wings = wings;
      return bird;
    }

    launchMiniEagles(a, el, t) {
      const T = this.THREE;
      if (!a.eagles) {
        a.eagles = [this.makeMiniEagle(), this.makeMiniEagle()];
        a.eagles.forEach((bird) => this.fx(a, bird));
      }
      const start = new T.Vector3(a.from.x, 0.75, a.from.z);
      const end = new T.Vector3(a.target.x, 0.62, a.target.z);
      a.eagles.forEach((bird, i) => {
        const u = Math.max(0, Math.min(1, (el - i * 0.12) / 0.8));
        const p = start.clone().lerp(end, u);
        p.y += Math.sin(Math.PI * u) * 0.85 + (i ? 0.2 : 0);
        bird.position.copy(p); bird.lookAt(end);
        bird.userData.wings.forEach((w) => { w.rotation.z = w.userData.side * Math.sin(t * 34 + i) * 0.9; });
      });
    }

    // Éclair en zigzag entre deux points (géométrie réutilisée, points retirés à chaque image)
    zigzag(line, p0, p1, jitter) {
      const pos = line.geometry.attributes.position, n = pos.count;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1), j = i === 0 || i === n - 1 ? 0 : jitter;
        pos.setXYZ(i, p0.x + (p1.x - p0.x) * f + (Math.random() - 0.5) * j, p0.y + (p1.y - p0.y) * f + (Math.random() - 0.5) * j, p0.z + (p1.z - p0.z) * f + (Math.random() - 0.5) * j);
      }
      pos.needsUpdate = true;
    }
    makeChidoriFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const bolt = (color, n) => add(new T.Line(
        new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3)),
        new T.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }),
      ));
      a.ball = add(new T.Mesh(new T.SphereGeometry(0.1, 16, 12), new T.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })));
      a.glow = new T.Mesh(new T.SphereGeometry(0.2, 16, 12), new T.MeshBasicMaterial({ color: 0x4fb4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      a.ball.add(a.glow);
      a.handBolts = Array.from({ length: 6 }, (_, i) => bolt(i % 2 ? 0xffffff : 0x7fd0ff, 5));
      a.trailBolts = Array.from({ length: 3 }, () => bolt(0x9fdcff, 9));
      a.victimBolts = Array.from({ length: 7 }, (_, i) => bolt(i % 3 ? 0x8fd8ff : 0xffffff, 7));
      a.skyBolts = Array.from({ length: 2 }, () => bolt(0xe6f6ff, 11));
      a.light = add(new T.PointLight(0x7fc8ff, 0, 6, 2));
      a.sky = {
        background: this.scene.background && this.scene.background.isColor ? this.scene.background.clone() : null,
        fog: this.scene.fog && this.scene.fog.color ? this.scene.fog.color.clone() : null,
        sun: this.sun.intensity, hemi: this.hemi.intensity, exposure: this.renderer.toneMappingExposure,
      };
      a.hand = new T.Vector3(); a.tmp = new T.Vector3(); a.tmp2 = new T.Vector3();
    }
    restoreSky(a) {
      if (a.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(a.sky.background);
      if (a.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(a.sky.fog);
      if (!this.weather) { this.sun.intensity = a.sky.sun; this.hemi.intensity = a.sky.hemi; }
      this.renderer.toneMappingExposure = a.sky.exposure;
      a.sky = null; this.skyDim = 0;
    }
    // Fou noir : charge d'éclairs, course, transpercement ; le ciel s'assombrit pendant toute l'attaque
    tickChidori(c, a, el, t, M) {
      const T = this.THREE;
      if (!a.ball) this.makeChidoriFx(a);
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target, dir = a.dir;
      const stop = { x: to.x - dir.x * 0.32, z: to.z - dir.z * 0.32 };
      const runEnd = 0.7 + a.run, release = a.pierce + 1.35;
      c.holder.rotation.y = Math.atan2(dir.x, dir.z);
      // Le ciel s'assombrit dès la charge et revient à la fin
      const dim = clamp(el / 0.45) * (1 - clamp((el - (a.duration - 0.55)) / 0.5));
      if (a.sky) {
        this.skyDim = dim;
        const night = new T.Color(0x05070d);
        if (a.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(a.sky.background).lerp(night, dim * 0.9);
        if (a.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(a.sky.fog).lerp(night, dim * 0.85);
        // Sans météo, l'éclairage n'est pas recalculé à chaque image : on l'assombrit ici
        if (!this.weather) { this.sun.intensity = a.sky.sun * (1 - 0.85 * dim); this.hemi.intensity = a.sky.hemi * (1 - 0.75 * dim); }
        this.renderer.toneMappingExposure = a.sky.exposure * (1 - 0.5 * dim);
      }
      if (el < 0.7) {
        // Charge : la main droite crépite d'éclairs
        M.animate(c.parts, t, 'cast', clamp(el / 0.3));
        c.parts.armR.rotation.set(-0.6, 0, 0.9);
        c.holder.position.set(from.x, 0, from.z);
      } else if (el < runEnd) {
        const u = (el - 0.7) / a.run;
        M.animate(c.parts, t, 'run');
        c.parts.armR.rotation.set(0.9, 0, 0.35); // main chargée tenue en arrière pendant la course
        c.parts.torso.rotation.x = 0.35;
        c.holder.position.set(from.x + (stop.x - from.x) * u, 0, from.z + (stop.z - from.z) * u);
        this.trail(c, true, t);
      } else if (el < a.duration - 0.35) {
        // Transpercement : bras tendu dans la cible, puis il retire sa main
        M.animate(c.parts, t, 'idle');
        const hold = el < release;
        c.parts.armR.rotation.set(hold ? -1.55 : -0.5, 0, hold ? 0.05 : 0.3);
        c.parts.torso.rotation.x = hold ? 0.22 : 0;
        c.holder.position.set(stop.x, 0, stop.z);
      } else {
        // Il prend la case de la victime disparue
        const u = clamp((el - (a.duration - 0.35)) / 0.35);
        M.animate(c.parts, t, 'run');
        c.holder.position.set(stop.x + (to.x - stop.x) * u, 0, stop.z + (to.z - stop.z) * u);
      }
      c.parts.armR.updateMatrixWorld(true);
      a.hand.set(0, -0.24, 0); c.parts.armR.localToWorld(a.hand);
      const pulse = 0.8 + Math.abs(Math.sin(t * 37)) * 0.4;
      const grow = clamp(el / 0.5) * (el < release ? 1 : 1 - clamp((el - release) / 0.3));
      a.ball.position.copy(a.hand);
      a.ball.scale.setScalar(Math.max(0.01, grow * pulse * (el > runEnd ? 1.3 : 1)));
      a.ball.material.opacity = grow * 0.95; a.glow.material.opacity = grow * 0.45;
      const tmp = a.tmp, tmp2 = a.tmp2;
      for (const line of a.handBolts) {
        line.material.opacity = grow > 0.05 && Math.random() < 0.8 ? grow : 0;
        const ang = Math.random() * Math.PI * 2, reach = 0.25 + Math.random() * 0.2;
        tmp.set(a.hand.x + Math.cos(ang) * reach, a.hand.y + (Math.random() - 0.3) * 0.5, a.hand.z + Math.sin(ang) * reach);
        this.zigzag(line, a.hand, tmp, 0.09);
      }
      // Traînée d'éclairs pendant la course
      a.trailBolts.forEach((line, i) => {
        const on = el >= 0.7 && el < runEnd + 0.15;
        line.material.opacity = on ? 0.85 : 0;
        if (!on) return;
        tmp2.set(c.holder.position.x, 0.45 + i * 0.1, c.holder.position.z);
        tmp.set(from.x, 0.35 + i * 0.12, from.z).lerp(tmp2, 0.55);
        this.zigzag(line, tmp, tmp2, 0.12);
      });
      // Électrocution de la cible, et la foudre qui tombe du ciel sombre
      const shock = el >= runEnd && el < a.pierce + 1.4;
      for (const line of a.victimBolts) {
        line.material.opacity = shock && Math.random() < 0.85 ? 0.95 : 0;
        if (!line.material.opacity) continue;
        const ang = Math.random() * Math.PI * 2;
        tmp2.set(to.x + (Math.random() - 0.5) * 0.2, 0.2 + Math.random(), to.z + (Math.random() - 0.5) * 0.2);
        tmp.set(to.x + Math.cos(ang) * 0.5, 0.75 + (Math.random() - 0.5) * 1.1, to.z + Math.sin(ang) * 0.5);
        this.zigzag(line, tmp2, tmp, 0.12);
      }
      a.skyBolts.forEach((line, i) => {
        const beat = (el - runEnd - i * 0.17) % 0.42;
        const on = shock && beat >= 0 && beat < 0.09;
        line.material.opacity = on ? 1 : 0;
        if (on) this.zigzag(line, tmp.set(to.x + (i - 0.5) * 0.8, 9, to.z - 0.5), tmp2.set(to.x, 0.9, to.z), 0.7);
      });
      if (shock) a.light.position.set(to.x, 1.1, to.z); else a.light.position.copy(a.hand);
      a.light.intensity = shock ? 4 + Math.random() * 6 : grow * (1.5 + Math.random() * 1.5);
      if (shock && Math.random() < 0.3) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.04; }
      if (el >= a.duration) this.endShot(a);
    }
    // Fou blanc : boule d'énergie blanche tenue en main, course, frappe, la boule grossit et projette la cible
    makeOrbFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
      a.orb = add(new T.Group());
      a.orb.add(new T.Mesh(new T.SphereGeometry(1, 20, 14), glow(0xffffff, 0.95)));
      a.orb.add(new T.Mesh(new T.SphereGeometry(1.45, 20, 14), glow(0xbfe4ff, 0.35)));
      a.rings = [0, 1, 2].map((i) => {
        const ring = new T.Mesh(new T.TorusGeometry(1.15, 0.07, 6, 32), glow(i === 1 ? 0xdff2ff : 0xffffff, 0.7));
        ring.rotation.set(i * 1.1, i * 0.7, 0); a.orb.add(ring); return ring;
      });
      a.blast = add(new T.Mesh(new T.RingGeometry(0.3, 0.45, 40), glow(0xe8f6ff, 0)));
      a.blast.rotation.x = -Math.PI / 2;
      a.light = add(new T.PointLight(0xdcefff, 0, 5, 2));
      a.hand = new T.Vector3();
    }
    tickOrb(c, a, el, t, M) {
      if (!a.orb) this.makeOrbFx(a);
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target, dir = a.dir;
      const stop = { x: to.x - dir.x * 0.42, z: to.z - dir.z * 0.42 };
      const runEnd = 0.5 + a.run, hit = runEnd, burst = hit + 0.5;
      c.holder.rotation.y = Math.atan2(dir.x, dir.z);
      if (el < 0.5) {
        // La boule se forme dans la main droite
        M.animate(c.parts, t, 'cast', clamp(el / 0.3));
        c.parts.armR.rotation.set(-1.2, 0, 0.5);
        c.holder.position.set(from.x, 0, from.z);
      } else if (el < runEnd) {
        M.animate(c.parts, t, 'run');
        c.parts.armR.rotation.set(-1.0, 0, 0.6); // boule tenue sur le côté pendant la course
        const u = (el - 0.5) / a.run;
        c.holder.position.set(from.x + (stop.x - from.x) * u, 0, from.z + (stop.z - from.z) * u);
        if (c.parts.fast) this.trail(c, true, t);
      } else if (el < a.duration - 0.35) {
        // Frappe bras tendu, puis le bras reste en avant pendant l'explosion
        M.animate(c.parts, t, 'idle');
        c.parts.armR.rotation.set(-1.6, 0, 0.05);
        c.parts.torso.rotation.x = 0.2;
        c.holder.position.set(stop.x, 0, stop.z);
      } else {
        const u = clamp((el - (a.duration - 0.35)) / 0.35);
        M.animate(c.parts, t, 'run');
        c.holder.position.set(stop.x + (to.x - stop.x) * u, 0, stop.z + (to.z - stop.z) * u);
      }
      c.parts.armR.updateMatrixWorld(true);
      a.hand.set(0, -0.26, 0); c.parts.armR.localToWorld(a.hand);
      // Taille : petite en main, elle grossit au contact puis éclate
      const form = clamp(el / 0.45), grow = clamp((el - hit) / 0.45), pop = clamp((el - burst) / 0.3);
      const size = (0.09 + form * 0.05 + grow * 0.32) * (1 + pop * 0.8);
      a.orb.visible = pop < 1;
      a.orb.position.copy(a.hand);
      if (el >= hit) a.orb.position.lerp({ x: to.x - dir.x * 0.05, y: 0.75, z: to.z - dir.z * 0.05 }, grow * 0.6);
      a.orb.scale.setScalar(Math.max(0.001, size));
      a.orb.children[0].material.opacity = 0.95 * (1 - pop);
      a.orb.children[1].material.opacity = (0.3 + Math.abs(Math.sin(t * 25)) * 0.15) * (1 - pop);
      a.rings.forEach((ring, i) => { ring.rotation.x += 0.35 + i * 0.1; ring.rotation.y += 0.27 - i * 0.05; ring.material.opacity = 0.7 * (1 - pop); });
      a.blast.position.set(to.x, 0.04, to.z);
      a.blast.material.opacity = el >= burst ? 0.85 * (1 - clamp((el - burst) / 0.6)) : 0;
      a.blast.scale.setScalar(1 + clamp((el - burst) / 0.6) * 7);
      a.light.position.copy(a.orb.position);
      a.light.intensity = (el >= burst ? 7 * (1 - pop) : 1 + form + grow * 4) * (pop >= 1 ? 0 : 1);
      if (el >= burst && el < burst + 0.25) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.1; }
      if (el >= a.duration) this.endShot(a);
    }
    // Cible du fou blanc : encaisse la boule, puis projetée loin derrière elle, dans l'axe de l'attaque
    tickOrbVictim(d, a, c, el, t, M) {
      const hit = 0.5 + a.run, launch = hit + 0.45;
      const p = a.target;
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < hit) { c.holder.position.set(p.x, 0, p.z); M.animate(c.parts, t, 'guard', 1); return true; }
      if (el < launch) {
        // Repoussée par la boule qui grossit contre elle
        M.animate(c.parts, t, 'ko', 1);
        const push = (el - hit) / (launch - hit);
        c.holder.position.set(p.x + a.dir.x * push * 0.25, 0, p.z + a.dir.z * push * 0.25);
        c.parts.root.rotation.set(-0.5 * push, 0, Math.sin(t * 40) * 0.08);
        return true;
      }
      const u = Math.max(0, Math.min(1, (el - launch) / (a.duration - 0.35 - launch)));
      M.animate(c.parts, t, 'ko', 1);
      c.holder.position.set(p.x + a.dir.x * (0.25 + u * 7.5), Math.sin(Math.PI * u) * 2.2, p.z + a.dir.z * (0.25 + u * 7.5));
      c.parts.root.rotation.set(-0.5 - u * 9, u * 4, u * 6);
      c.parts.root.scale.setScalar(d.base * (1 - u * 0.6));
      if (u >= 1) c.holder.visible = false;
      return el < a.duration;
    }
    // Tour blanche : transformation en boule de feu, roulade éclair avec traînée de flammes, percussion
    makeFirerollFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
      a.ball = add(new T.Group());
      a.ball.add(new T.Mesh(new T.SphereGeometry(0.34, 20, 16), glow(0xff8a1c, 0.95)));
      a.ball.add(new T.Mesh(new T.SphereGeometry(0.2, 16, 12), glow(0xffe08a, 1)));
      a.spikes = [];
      for (let i = 0; i < 16; i++) {
        const f = new T.Mesh(new T.ConeGeometry(0.09, 0.32, 6), glow(i % 2 ? 0xff4a12 : 0xffb52a, 0.85));
        const th = i * 2.399, ph = Math.acos(1 - 2 * (i + 0.5) / 16);
        const dir = new T.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
        f.position.copy(dir).multiplyScalar(0.36); f.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
        a.ball.add(f); a.spikes.push(f);
      }
      a.ball.visible = false;
      // traînée : des flammes posées le long du chemin, qui s'allument au passage de la boule
      a.trail = [];
      const n = Math.max(6, Math.round(a.len * 5));
      for (let i = 0; i < n; i++) {
        const g = new T.Group(), f = i / n;
        g.position.set(a.from.x + (a.target.x - a.from.x) * f, 0.02, a.from.z + (a.target.z - a.from.z) * f);
        for (let k = 0; k < 3; k++) {
          const fl = new T.Mesh(new T.ConeGeometry(0.06 + k * 0.02, 0.22 + k * 0.08, 6), glow(k === 1 ? 0xffc14b : 0xff5a12, 0.85));
          fl.position.set((k - 1) * 0.07, 0.1 + k * 0.03, ((i + k) % 2 ? 0.05 : -0.05)); fl.userData.phase = i * 1.3 + k; g.add(fl);
        }
        const scorch = new T.Mesh(new T.CircleGeometry(0.14, 16), new T.MeshBasicMaterial({ color: 0x24160d, transparent: true, opacity: 0.6, depthWrite: false }));
        scorch.rotation.x = -Math.PI / 2; scorch.position.y = -0.01; g.add(scorch);
        g.visible = false; g.userData.f = f; add(g); a.trail.push(g);
      }
      a.light = add(new T.PointLight(0xff7a1a, 0, 6, 2));
    }
    tickFireroll(c, a, el, t, M) {
      if (!a.ball) {
        this.makeFirerollFx(a);
        // la boule a la taille de la tour : son diamètre (flammes comprises) égale la hauteur du personnage
        c.parts.root.updateMatrixWorld(true);
        const h = new this.THREE.Box3().setFromObject(c.parts.root).getSize(new this.THREE.Vector3()).y;
        a.size = Math.max(0.6, h) / 1.04;
      }
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target, dir = a.dir;
      const hitAt = 0.5 + a.run, stop = { x: to.x - dir.x * 0.38, z: to.z - dir.z * 0.38 };
      c.holder.rotation.y = Math.atan2(dir.x, dir.z);
      const grow = clamp(el / 0.35), back = clamp((el - hitAt - 0.55) / 0.3);
      // le personnage disparaît dans la boule, puis réapparaît après le choc
      c.parts.root.visible = el < 0.25 || back >= 1;
      if (el < 0.5) { M.animate(c.parts, t, 'cast', clamp(el / 0.3)); c.holder.position.set(from.x, 0, from.z); }
      let bx = from.x, bz = from.z;
      if (el >= 0.5 && el < hitAt) {
        const u = (el - 0.5) / a.run;
        bx = from.x + (stop.x - from.x) * u; bz = from.z + (stop.z - from.z) * u;
      } else if (el >= hitAt) { bx = stop.x; bz = stop.z; }
      if (back >= 1) {
        M.animate(c.parts, t, 'run');
        const u = clamp((el - hitAt - 0.85) / 0.4);
        c.holder.position.set(stop.x + (to.x - stop.x) * u, 0, stop.z + (to.z - stop.z) * u);
      } else if (el >= 0.5) c.holder.position.set(bx, 0, bz);
      a.ball.visible = el > 0.15 && back < 1;
      a.ball.position.set(bx, 0.52 * a.size, bz);
      a.ball.scale.setScalar(Math.max(0.01, a.size * grow * (1 - back) * (el >= hitAt && el < hitAt + 0.15 ? 1.15 : 1)));
      // roule dans le sens du déplacement
      a.ball.rotation.set(0, 0, 0);
      a.ball.rotateOnWorldAxis(new this.THREE.Vector3(dir.z, 0, -dir.x), el * 22);
      a.spikes.forEach((f, i) => { f.scale.y = 0.75 + Math.abs(Math.sin(t * 17 + i)) * 0.6; });
      const f = el < 0.5 ? 0 : clamp((el - 0.5) / a.run) * (1 - 0.38 / Math.max(0.4, a.len));
      a.trail.forEach((g) => {
        g.visible = el >= 0.5 && g.userData.f <= f + 0.02;
        const fade = 1 - clamp((el - (a.duration - 0.5)) / 0.5);
        g.children.forEach((fl) => {
          if (!fl.userData.phase && fl.userData.phase !== 0) { fl.material.opacity = 0.6 * fade; return; }
          fl.scale.y = (0.7 + Math.abs(Math.sin(t * 14 + fl.userData.phase)) * 0.5) * fade;
          fl.material.opacity = 0.85 * fade;
        });
      });
      a.light.position.set(bx, a.size, bz);
      a.light.intensity = a.ball.visible ? 3 + Math.random() * 1.5 : 0;
      if (el >= hitAt && el < hitAt + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.12; }
      if (el >= a.duration) { c.parts.root.visible = true; this.endShot(a); }
    }
    // Dame : flammes blanches éblouissantes (dame blanche) ou noires (dame noire) qui brûlent le sol jusqu'à la cible
    makeFlamelineFx(a) {
      const T = this.THREE;
      const add = (o) => { this.scene.add(o); a.fx.push(o); return o; };
      const W = a.white;
      // blanches : lumineuses et additives ; noires : opaques et sombres pour rester visibles
      const flameMat = (k) => new T.MeshBasicMaterial(W
        ? { color: k % 2 ? 0xffffff : 0xcfe9ff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }
        : { color: k % 2 ? 0x07050c : 0x3a1450, transparent: true, opacity: 0.92, depthWrite: false, side: T.DoubleSide });
      a.trail = [];
      const n = Math.max(6, Math.round(a.len * 5));
      for (let i = 1; i <= n; i++) {
        const g = new T.Group(), f = i / n;
        g.position.set(a.from.x + (a.target.x - a.from.x) * f, 0.02, a.from.z + (a.target.z - a.from.z) * f);
        for (let k = 0; k < 3; k++) {
          const fl = new T.Mesh(new T.ConeGeometry(0.06 + k * 0.02, 0.24 + k * 0.08, 7, 1, true), flameMat(k));
          fl.position.set((k - 1) * 0.07, 0.12 + k * 0.03, ((i + k) % 2 ? 0.05 : -0.05)); fl.userData.phase = i * 1.3 + k; g.add(fl);
        }
        const scorch = new T.Mesh(new T.CircleGeometry(0.15, 16), new T.MeshBasicMaterial({ color: W ? 0x3a3a40 : 0x120a16, transparent: true, opacity: 0.55, depthWrite: false }));
        scorch.rotation.x = -Math.PI / 2; scorch.position.y = -0.012; g.add(scorch);
        g.visible = false; g.userData.f = f; add(g); a.trail.push(g);
      }
      // tête de la vague de flammes et grand brasier sur la cible
      a.head = add(new T.Mesh(new T.SphereGeometry(0.16, 14, 10), new T.MeshBasicMaterial(W ? { color: 0xffffff, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false } : { color: 0x2a0e3a, transparent: true, opacity: 0.95, depthWrite: false })));
      a.blaze = add(new T.Group());
      a.blaze.position.set(a.target.x, 0, a.target.z);
      for (let k = 0; k < 9; k++) {
        const ang = k * Math.PI * 2 / 9, h = 0.9 + (k % 3) * 0.35;
        const fl = new T.Mesh(new T.ConeGeometry(0.13 + (k % 2) * 0.05, h, 8, 1, true), flameMat(k));
        fl.position.set(Math.cos(ang) * 0.2, h / 2, Math.sin(ang) * 0.2); fl.userData = { phase: k * 1.7, base: h }; a.blaze.add(fl);
      }
      const core = new T.Mesh(new T.ConeGeometry(0.22, 1.6, 9, 1, true), flameMat(1));
      core.position.y = 0.8; core.userData = { phase: 0.5, base: 1.6 }; a.blaze.add(core);
      a.blaze.scale.setScalar(0.01); a.blaze.visible = false;
      a.light = add(new T.PointLight(W ? 0xf2f8ff : 0x7a2aa0, 0, 7, 2));
      if (W) a.sky = { exposure: this.renderer.toneMappingExposure };
    }
    tickFlameline(c, a, el, t, M) {
      if (!a.trail) this.makeFlamelineFx(a);
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const from = a.from, to = a.target;
      const launch = 0.45, arrive = launch + a.travel, end = a.duration;
      c.holder.rotation.y = Math.atan2(a.dir.x, a.dir.z);
      if (el < end - 0.35) {
        c.holder.position.set(from.x, 0, from.z);
        M.animate(c.parts, t, el < arrive + 0.3 ? 'cast' : 'idle', clamp(el / 0.3));
      } else {
        // la dame prend la case de sa victime consumée
        M.animate(c.parts, t, 'run');
        const u = clamp((el - (end - 0.35)) / 0.35);
        c.holder.position.set(from.x + (to.x - from.x) * u, 0, from.z + (to.z - from.z) * u);
      }
      const prog = clamp((el - launch) / a.travel);
      a.head.visible = el >= launch && el < arrive;
      a.head.position.set(from.x + (to.x - from.x) * prog, 0.18, from.z + (to.z - from.z) * prog);
      a.head.scale.setScalar(0.8 + Math.abs(Math.sin(t * 25)) * 0.5);
      const fade = 1 - clamp((el - (end - 0.5)) / 0.5);
      a.trail.forEach((g) => {
        g.visible = el >= launch && g.userData.f <= prog + 0.02 && fade > 0;
        g.children.forEach((fl) => {
          if (fl.userData.phase === undefined) { fl.material.opacity = 0.55 * fade; return; }
          fl.scale.y = (0.7 + Math.abs(Math.sin(t * 14 + fl.userData.phase)) * 0.5) * fade;
          fl.material.opacity = (a.white ? 0.9 : 0.92) * fade;
        });
      });
      // à l'arrivée, les flammes grandissent et engloutissent la cible
      const grow = clamp((el - arrive) / 0.6);
      a.blaze.visible = el >= arrive && fade > 0;
      a.blaze.scale.set(Math.max(0.01, grow * fade), Math.max(0.01, grow * fade * (1 + Math.sin(t * 9) * 0.06)), Math.max(0.01, grow * fade));
      a.blaze.children.forEach((fl) => { fl.scale.y = 0.75 + Math.abs(Math.sin(t * 12 + fl.userData.phase)) * 0.45; });
      a.blaze.rotation.y = t * 1.5;
      const lightAt = el < arrive ? a.head.position : a.blaze.position;
      a.light.position.set(lightAt.x, 0.8, lightAt.z);
      a.light.intensity = el < launch ? 0 : (a.white ? 6 : 4) * fade + Math.random();
      // lumière éblouissante de la dame blanche : l'image se voile de blanc un instant
      if (a.sky) this.renderer.toneMappingExposure = a.sky.exposure * (1 + (el >= launch ? 0.9 * Math.max(0, 1 - Math.abs(el - arrive) / 0.6) : 0));
      if (el >= arrive && el < arrive + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.06; }
      if (el >= end) { if (a.sky) { this.renderer.toneMappingExposure = a.sky.exposure; a.sky = null; } this.endShot(a); }
    }
    // ---------- Attaques du roi (prise sans mat) ----------
    // Le roi reste sur sa case pendant la technique, puis prend la case de sa victime
    kingStance(c, a, el, t, M, end) {
      const clamp = (x) => Math.max(0, Math.min(1, x));
      c.holder.rotation.y = Math.atan2(a.dir.x, a.dir.z);
      if (el < end) {
        c.holder.position.set(a.from.x, 0, a.from.z);
        M.animate(c.parts, t, el < end - 0.6 ? 'cast' : 'idle', clamp(el / 0.35));
      } else {
        M.animate(c.parts, t, 'run');
        const u = clamp((el - end) / (a.duration - end));
        c.holder.position.set(a.from.x + (a.target.x - a.from.x) * u, 0, a.from.z + (a.target.z - a.from.z) * u);
      }
    }
    // Roi blanc : le ciel s'assombrit, un « 火 » géant apparaît au-dessus de la cible et un rayon doré la frappe
    tickJudgment(c, a, el, t, M) {
      const T = this.THREE, clamp = (x) => Math.max(0, Math.min(1, x)), p = a.target;
      const SHOW = 0.7, STRIKE = 1.55, WALK = a.duration - 0.6;
      if (!a.sigil) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 256;
        const cx = cv.getContext('2d');
        cx.font = 'bold 200px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.shadowColor = '#ffcf4a'; cx.shadowBlur = 28; cx.fillStyle = '#fff3c4'; cx.fillText('火', 128, 138);
        cx.lineWidth = 6; cx.strokeStyle = '#ffb21a'; cx.beginPath(); cx.arc(128, 128, 118, 0, Math.PI * 2); cx.stroke();
        const glow = (color, o = 0) => new T.MeshBasicMaterial({ color, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
        const sigilTex = new T.CanvasTexture(cv);
        a.sigil = this.fx(a, new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ map: sigilTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })));
        // au moment du rayon, le symbole s'imprime au sol sur la case et y reste quelques secondes
        // empreinte au sol : symbole doré cerné de brun, en mélange normal pour rester visible sur les cases claires
        const mc = document.createElement('canvas'); mc.width = mc.height = 256;
        const mx = mc.getContext('2d');
        mx.lineWidth = 12; mx.strokeStyle = '#6b3d00'; mx.beginPath(); mx.arc(128, 128, 114, 0, Math.PI * 2); mx.stroke();
        mx.lineWidth = 6; mx.strokeStyle = '#ffc83a'; mx.beginPath(); mx.arc(128, 128, 114, 0, Math.PI * 2); mx.stroke();
        mx.font = 'bold 190px serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle';
        mx.lineWidth = 14; mx.strokeStyle = '#6b3d00'; mx.strokeText('火', 128, 136);
        mx.fillStyle = '#ffcf4a'; mx.fillText('火', 128, 136);
        const mark = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), new T.MeshBasicMaterial({ map: new T.CanvasTexture(mc), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
        mark.rotation.x = -Math.PI / 2; mark.position.set(p.x, 0.03, p.z); mark.rotation.z = -Math.atan2(a.dir.x, a.dir.z); mark.visible = false; this.scene.add(mark);
        const markLife = 5;
        this.addEffect({ start: a.start + STRIKE, dur: markLife, tick: (e) => {
          mark.visible = true;
          mark.material.opacity = Math.min(1, e / 0.2) * (1 - Math.max(0, (e - (markLife - 1.2)) / 1.2)) * (0.85 + 0.15 * Math.sin(e * 6));
        }, end: () => { this.scene.remove(mark); mark.geometry.dispose(); if (mark.material.map) mark.material.map.dispose(); mark.material.dispose(); } });
        a.sigil.position.set(p.x, 2.25, p.z);
        a.beam = this.fx(a, new T.Mesh(new T.CylinderGeometry(0.28, 0.42, 2.2, 24, 1, true), glow(0xffd36a)));
        a.beam.position.set(p.x, 1.1, p.z);
        a.core = this.fx(a, new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 2.2, 12, 1, true), glow(0xffffff)));
        a.core.position.set(p.x, 1.1, p.z);
        a.ring = this.fx(a, new T.Mesh(new T.RingGeometry(0.3, 0.5, 40), glow(0xffe08a)));
        a.ring.rotation.x = -Math.PI / 2; a.ring.position.set(p.x, 0.04, p.z);
        a.sparks = this.fx(a, new T.Group());
        for (let i = 0; i < 26; i++) {
          const sp = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), glow(i % 2 ? 0xffffff : 0xffc23a, 0));
          sp.userData.v = { x: (Math.random() - 0.5) * 2.2, y: (Math.random() - 0.2) * 1.6, z: (Math.random() - 0.5) * 2.2 };
          a.sparks.add(sp);
        }
        a.sparks.position.set(p.x, 2.25, p.z);
        a.light = this.fx(a, new T.PointLight(0xffd36a, 0, 9, 2)); a.light.position.set(p.x, 1.6, p.z);
        a.expo = this.renderer.toneMappingExposure;
      }
      this.kingStance(c, a, el, t, M, WALK);
      // le ciel s'assombrit le temps du jugement
      const dark = clamp(el / 0.5) * (1 - clamp((el - 2.6) / 0.6));
      this.renderer.toneMappingExposure = a.expo * (1 - 0.45 * dark) * (el >= STRIKE && el < STRIKE + 0.25 ? 1.9 : 1);
      // le symbole apparaît, tourne lentement face à la caméra puis se dissout en étincelles
      const appear = clamp((el - SHOW) / 0.5), dissolve = clamp((el - 2.1) / 0.6);
      a.sigil.material.opacity = appear * (1 - dissolve);
      a.sigil.scale.setScalar(0.6 + appear * 0.4 + dissolve * 0.3);
      a.sigil.lookAt(this.camera.position.x, a.sigil.position.y, this.camera.position.z);
      a.sparks.children.forEach((sp) => {
        const v = sp.userData.v, k = dissolve;
        sp.position.set(v.x * k, v.y * k - 1.2 * k * k, v.z * k);
        sp.material.opacity = el >= 2.1 ? 0.95 * (1 - clamp((el - 2.5) / 0.5)) : 0;
      });
      // le rayon frappe la cible d'en haut
      const beam = el >= STRIKE ? 1 - clamp((el - STRIKE - 0.5) / 0.6) : 0;
      a.beam.material.opacity = 0.55 * beam; a.core.material.opacity = 0.95 * beam;
      a.beam.scale.set(0.6 + beam * 0.6, 1, 0.6 + beam * 0.6);
      a.core.scale.set(1 + Math.sin(t * 40) * 0.2, 1, 1 + Math.sin(t * 40) * 0.2);
      const wave = clamp((el - STRIKE) / 0.7);
      a.ring.material.opacity = el >= STRIKE ? 0.85 * (1 - wave) : 0; a.ring.scale.setScalar(1 + wave * 4);
      a.light.intensity = 9 * beam + (appear * (1 - dissolve)) * 2;
      if (el >= STRIKE && el < STRIKE + 0.3) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.12; }
      if (el >= a.duration) { this.renderer.toneMappingExposure = a.expo; this.endShot(a); }
    }
    // Roi noir : une main d'ombre géante sort du sol derrière lui, passe par-dessus et écrase la cible
    tickEmperorHand(c, a, el, t, M) {
      const T = this.THREE, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const RISE = 0.35, SWING = 1.15, SLAM = 1.55, SINK = 2.1, WALK = a.duration - 0.6;
      if (!a.hand) {
        const shade = new T.MeshStandardMaterial({ color: 0x120818, emissive: 0x3a1066, emissiveIntensity: 0.55, roughness: 0.7, transparent: true, opacity: 0.92 });
        const hand = new T.Group();
        const palm = new T.Mesh(new T.BoxGeometry(1.0, 0.22, 1.1), shade); hand.add(palm);
        [-0.36, -0.12, 0.12, 0.36].forEach((x, i) => {
          const f = new T.Mesh(new T.BoxGeometry(0.2, 0.18, 0.75 + (i === 1 || i === 2 ? 0.12 : 0)), shade);
          f.position.set(x, 0, 0.88 + (i === 1 || i === 2 ? 0.06 : 0)); hand.add(f);
        });
        const thumb = new T.Mesh(new T.BoxGeometry(0.22, 0.18, 0.55), shade); thumb.position.set(0.62, 0, 0.25); thumb.rotation.y = -0.7; hand.add(thumb);
        const wrist = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 1.6, 12), shade); wrist.rotation.x = Math.PI / 2; wrist.position.z = -1.2; hand.add(wrist);
        // halo violet autour de la main
        const aura = new T.Mesh(new T.SphereGeometry(1.25, 16, 12), new T.MeshBasicMaterial({ color: 0x9b4dff, transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        aura.scale.set(0.9, 0.35, 1.4); aura.position.z = 0.1; hand.add(aura);
        a.hand = this.fx(a, hand); a.shade = shade; a.handAura = aura;
        // empreinte de main laissée sur la case
        const print = new T.Group();
        const ink = new T.MeshBasicMaterial({ color: 0x1a0b26, transparent: true, opacity: 0, depthWrite: false });
        const pp = new T.Mesh(new T.PlaneGeometry(0.42, 0.44), ink); pp.rotation.x = -Math.PI / 2; print.add(pp);
        [-0.15, -0.05, 0.05, 0.15].forEach((x, i) => { const f = new T.Mesh(new T.PlaneGeometry(0.08, 0.3 + (i === 1 || i === 2 ? 0.05 : 0)), ink); f.rotation.x = -Math.PI / 2; f.position.set(x, 0, 0.36); print.add(f); });
        const th = new T.Mesh(new T.PlaneGeometry(0.08, 0.22), ink); th.rotation.x = -Math.PI / 2; th.rotation.z = 0.8; th.position.set(0.27, 0, 0.12); print.add(th);
        print.position.set(a.target.x, 0.024, a.target.z); print.rotation.y = Math.atan2(a.dir.x, a.dir.z);
        a.print = this.fx(a, print); a.ink = ink;
        a.dust = this.fx(a, new T.Mesh(new T.RingGeometry(0.3, 0.6, 40), new T.MeshBasicMaterial({ color: 0x8a6fb0, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide })));
        a.dust.rotation.x = -Math.PI / 2; a.dust.position.set(a.target.x, 0.05, a.target.z);
        a.light = this.fx(a, new T.PointLight(0xa45bff, 0, 7, 2));
      }
      this.kingStance(c, a, el, t, M, WALK);
      const yaw = Math.atan2(a.dir.x, a.dir.z);
      const behind = { x: a.from.x - a.dir.x * 1.3, z: a.from.z - a.dir.z * 1.3 };
      const hand = a.hand;
      hand.visible = el >= RISE && el < SINK + 0.9;
      if (el < SWING) {
        // la main sort du sol derrière le roi, paume vers l'avant, doigts vers le ciel
        const u = smooth((el - RISE) / (SWING - RISE));
        hand.position.set(behind.x, -1.6 + u * 4.1, behind.z);
        hand.rotation.set(-Math.PI / 2 + 0.2, yaw, 0);
      } else if (el < SLAM) {
        // elle bascule par-dessus le roi et s'abat sur la cible
        const u = smooth((el - SWING) / (SLAM - SWING));
        hand.position.set(behind.x + (a.target.x - behind.x) * u, 2.5 + Math.sin(u * Math.PI) * 1.2 - u * 2.3, behind.z + (a.target.z - behind.z) * u);
        hand.rotation.set(-Math.PI / 2 + 0.2 + u * (Math.PI / 2 - 0.2), yaw, 0);
      } else {
        // posée à plat sur la case, puis elle s'enfonce dans le sol
        const k = smooth((el - SINK) / 0.8);
        hand.position.set(a.target.x - a.dir.x * 0.45, 0.2 - k * 1.4, a.target.z - a.dir.z * 0.45);
        hand.rotation.set(0, yaw, 0);
      }
      a.shade.opacity = 0.92 * (1 - clamp((el - SINK - 0.3) / 0.6));
      a.handAura.material.opacity = 0.18 + Math.abs(Math.sin(t * 6)) * 0.1;
      a.light.position.set(hand.position.x, Math.max(0.5, hand.position.y + 0.6), hand.position.z);
      a.light.intensity = hand.visible ? 3 + (el >= SLAM && el < SLAM + 0.3 ? 6 : 0) : 0;
      // impact : tremblement, poussière et empreinte de main
      const hit = clamp((el - SLAM) / 0.8);
      a.dust.material.opacity = el >= SLAM ? 0.7 * (1 - hit) : 0; a.dust.scale.setScalar(1 + hit * 3.5);
      a.ink.opacity = el >= SLAM ? 0.75 * (1 - clamp((el - a.duration + 0.8) / 0.8)) : 0;
      if (el >= SLAM && el < SLAM + 0.35) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.22; }
      if (el >= a.duration) this.endShot(a);
    }
    // Victime d'un roi : foudroyée et dissoute en lumière (roi blanc) ou écrasée à plat (roi noir)
    tickKingVictim(d, a, c, el, t, M) {
      const p = a.target, hitAt = a.style === 'judgment' ? 1.55 : 1.55;
      c.holder.position.set(p.x, 0, p.z);
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < hitAt) { M.animate(c.parts, t, 'guard', 1); return true; }
      M.animate(c.parts, t, 'ko', 1);
      const k = Math.max(0, Math.min(1, (el - hitAt) / 1.0));
      if (a.style === 'judgment') {
        if (!d.tint) {
          d.tint = [];
          c.parts.root.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.blending !== this.THREE.AdditiveBlending) { o.material = o.material.clone(); d.tint.push(o.material); } });
        }
        const gold = new this.THREE.Color(0xffe08a);
        d.tint.forEach((m) => m.color.lerp(gold, 0.08));
        c.holder.position.y = k * 0.6;
        c.parts.root.scale.set(d.base * (1 - k), d.base * (1 + k * 0.6) * (1 - k * 0.9), d.base * (1 - k));
      } else {
        c.parts.root.scale.set(d.base * (1 + k * 0.5), d.base * Math.max(0.08, 1 - Math.min(1, (el - hitAt) / 0.15) * 0.92), d.base * (1 + k * 0.5));
      }
      if (k >= 1) {
        c.holder.visible = false;
        if (d.tint && !d.tintFreed) { d.tint.forEach((m) => m.dispose()); d.tintFreed = true; }
      }
      return el < a.duration;
    }
    // Cible des flammes de la dame : elle se tord dans le brasier puis se consume et disparaît
    tickFlamelineVictim(d, a, c, el, t, M) {
      const arrive = 0.45 + a.travel, p = a.target;
      c.holder.position.set(p.x, 0, p.z);
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < arrive) { M.animate(c.parts, t, 'guard', 1); return true; }
      M.animate(c.parts, t, 'ko', 1);
      if (!d.tint) {
        d.tint = [];
        c.parts.root.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.blending !== this.THREE.AdditiveBlending) { o.material = o.material.clone(); d.tint.push(o.material); } });
      }
      const burn = Math.max(0, Math.min(1, (el - arrive - 0.3) / 1.3));
      const ash = new this.THREE.Color(a.white ? 0xffffff : 0x0c0910);
      d.tint.forEach((m) => m.color.lerp(ash, 0.06));
      c.parts.root.position.set(Math.sin(t * 30) * 0.03 * (1 - burn), 0, 0);
      c.parts.root.scale.set(d.base * (1 - burn * 0.4), d.base * Math.max(0.01, 1 - burn), d.base * (1 - burn * 0.4));
      if (burn >= 1) {
        c.holder.visible = false;
        if (!d.tintFreed) { d.tint.forEach((m) => m.dispose()); d.tintFreed = true; }
      }
      return el < a.duration;
    }
    // Cible de la boule de feu : elle s'embrase au choc puis est éjectée au loin en brûlant
    tickFirerollVictim(d, a, c, el, t, M) {
      const hitAt = 0.5 + a.run, p = a.target;
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < hitAt) { c.holder.position.set(p.x, 0, p.z); M.animate(c.parts, t, 'guard', 1); return true; }
      this.burn(d, t);
      M.animate(c.parts, t, 'ko', 1);
      const u = Math.max(0, Math.min(1, (el - hitAt - 0.15) / (a.duration - hitAt - 0.3)));
      c.holder.position.set(p.x + a.dir.x * u * 7, Math.sin(Math.PI * u) * 2.3, p.z + a.dir.z * u * 7);
      c.parts.root.rotation.set(-u * 9, u * 5, u * 4);
      c.parts.root.scale.setScalar(d.base * (1 - u * 0.5));
      if (u >= 1 || el >= a.duration) { this.endBurn(d); return false; }
      return true;
    }
    // Cible du fou noir : électrocutée, elle tombe à genoux puis disparaît
    tickChidoriVictim(d, a, c, el, t, M) {
      const runEnd = 0.7 + a.run, p = a.target;
      const shockEnd = a.pierce + 1.4, kneelEnd = shockEnd + 0.55;
      c.holder.position.set(p.x, 0, p.z);
      c.holder.rotation.y = Math.atan2(-a.dir.x, -a.dir.z);
      if (el < runEnd) { M.animate(c.parts, t, 'guard', 1); return true; }
      if (el < shockEnd) {
        // Secousses électriques
        M.animate(c.parts, t, 'ko', 1);
        c.parts.root.position.set((Math.random() - 0.5) * 0.06, 0.04 + Math.random() * 0.05, (Math.random() - 0.5) * 0.06);
        c.parts.root.rotation.set(-0.25 + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3);
        return true;
      }
      c.parts.root.rotation.set(0, 0, 0);
      M.animate(c.parts, t, 'kneel', Math.min(1, (el - shockEnd) / 0.5));
      if (el >= kneelEnd) {
        const fade = Math.max(0, Math.min(1, (el - kneelEnd) / (a.duration - 0.4 - kneelEnd)));
        c.parts.root.scale.set(d.base * (1 - fade * 0.3), d.base * Math.max(0.001, 1 - fade), d.base * (1 - fade * 0.3));
        if (fade >= 1) { c.holder.visible = false; return el < a.duration; }
      }
      return el < a.duration;
    }

    tickKnightVictim(d, t, M) {
      const a = d.knightAttack, c = d.c, el = t - a.start;
      if (a.style === 'chidori') return this.tickChidoriVictim(d, a, c, el, t, M);
      if (a.style === 'orb') return this.tickOrbVictim(d, a, c, el, t, M);
      if (a.style === 'fireroll') return this.tickFirerollVictim(d, a, c, el, t, M);
      if (a.style === 'flameline') return this.tickFlamelineVictim(d, a, c, el, t, M);
      if (a.style === 'judgment' || a.style === 'emperorhand') return this.tickKingVictim(d, a, c, el, t, M);
      if (a.style === 'enpassant') return this.tickEnPassantVictim(d, a, c, el, t, M);
      if (a.style === 'tunnel-eat') {
        if (el < 1.55) { c.holder.position.set(a.target.x, 0, a.target.z); return true; }
        M.animate(c.parts, t, 'ko');
        const vanish = Math.max(0, Math.min(1, (el - 1.55) / (a.duration - 1.55)));
        c.parts.root.scale.setScalar(d.base * (1 - vanish));
        c.holder.position.set(a.target.x, 0, a.target.z);
        return el < a.duration;
      }
      if (a.style === 'tunnel-impact') {
        const pre = a.pre || 0, e2 = el - pre;
        if (e2 < 1.5) { c.holder.position.set(a.target.x, 0, a.target.z); return true; }
        const u = Math.max(0, Math.min(1, (e2 - 1.5) / (a.duration - pre - 1.5)));
        M.animate(c.parts, t, 'ko');
        c.holder.position.set(a.target.x + d.dx * u * 7, Math.sin(Math.PI * u) * 1.8, a.target.z + d.dz * u * 7);
        c.parts.root.rotation.set(u * 10, u * 8, u * 6);
        c.parts.root.scale.setScalar(d.base * (1 - u * 0.55));
        return u < 1;
      }
      M.animate(c.parts, t, el < 1.08 ? 'guard' : 'ko', 1);
      if (el < 2.62) {
        // suspendue sous les serres de l'aigle, elle suit exactement sa montée puis sa descente
        const y = el < 1.08 ? 0 : Math.max(0, (a.eagleY || 0) - 0.62);
        c.holder.position.set(a.target.x, y, a.target.z);
        c.parts.root.rotation.set(el < 1.08 ? 0 : 0.35, 0, el < 1.08 ? 0 : Math.sin(el * 8) * 0.1);
      } else {
        // écrasée à plat sur sa case
        c.holder.position.set(a.target.x, 0.06, a.target.z);
        c.parts.root.rotation.set(-Math.PI / 2, 0, 0.2);
        c.parts.root.scale.set(d.base * 0.95, d.base * 0.48, d.base * 0.95);
      }
      return el < a.duration;
    }

