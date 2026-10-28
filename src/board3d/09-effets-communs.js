    // Traînée de vitesse derrière le samouraï
    trail(c, on, t) {
      if (!c.parts.fast) return;
      const T = this.THREE;
      if (!c.trail) {
        c.trail = new T.Group();
        const m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false });
        for (let i = 0; i < 6; i++) {
          const l = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.9), m);
          l.position.set((i % 3 - 1) * 0.16, 0.25 + i * 0.13, -0.6 - (i % 2) * 0.2);
          c.trail.add(l);
        }
        c.holder.add(c.trail);
      }
      c.trail.visible = on;
      if (on) c.trail.children.forEach((l, i) => { l.scale.z = 0.6 + Math.random() * 0.8; l.material.opacity = 0.35 + Math.random() * 0.3; });
    }

    // Brûlure : la cible noircit, des flammes la lèchent
    burn(d, t) {
      const T = this.THREE;
      if (!d.flames) {
        d.mats = [];
        d.c.parts.root.traverse((o) => {
          if (!o.isMesh || o.material.blending === T.AdditiveBlending) return;
          o.material = o.material.clone(); d.mats.push(o.material);
        });
        d.flames = new T.Group();
        const mk = (color, r, h) => new T.Mesh(new T.ConeGeometry(r, h, 8, 1, true), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        for (let i = 0; i < 7; i++) {
          const f = mk(i % 2 ? 0xffd04a : 0xff5a1a, 0.08 + (i % 3) * 0.03, 0.35 + (i % 3) * 0.15);
          const a = (i / 7) * Math.PI * 2;
          f.userData = { a, r: 0.12 + (i % 2) * 0.1, y: 0.25 + (i % 4) * 0.2, seed: i * 1.7 };
          d.flames.add(f);
        }
        d.c.holder.add(d.flames);
        d.black = new T.Color(0x1a1412);
      }
      for (const m of d.mats) if (m.color) m.color.lerp(d.black, 0.04);
      for (const f of d.flames.children) {
        const u = f.userData, w = Math.sin(t * 18 + u.seed);
        f.position.set(Math.cos(u.a + t * 2) * u.r, u.y + w * 0.05, Math.sin(u.a + t * 2) * u.r);
        f.scale.set(1 + w * 0.2, 1 + Math.sin(t * 23 + u.seed) * 0.35, 1 + w * 0.2);
      }
    }
    endBurn(d) {
      if (!d.flames) return;
      d.c.holder.remove(d.flames);
      d.flames.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      for (const m of d.mats) m.dispose();
    }

    // Victime embrochée : suit la pointe de la dernière pique tout au long de sa montée
    impalePose(d) {
      const last = d.spikes.spikes[d.spikes.spikes.length - 1];
      const r = d.c.parts.root;
      r.position.set(0, d.spikes.tipH * last.scale.y, 0);
      r.rotation.set(-Math.PI / 2, 0, 0);
      r.scale.setScalar(d.base);
      d.c.shadow.visible = false;
    }

    // Le fou fait monter une rangée de pics du sol jusqu'à la cible.
    flySpikes(c, s, el, t) {
      const T = this.THREE;
      if (el < s.windup) return;
      if (!s.proj) {
        s.proj = new T.Group();
        s.spikes = [];
        s.start = new T.Vector3(c.holder.position.x, 0, c.holder.position.z);
        const end = new T.Vector3(s.target.x, 0, s.target.z);
        const count = Math.max(6, Math.ceil(s.start.distanceTo(end) * 1.35));
        const stone = new T.MeshStandardMaterial({ color: 0x8f795e, roughness: 0.95 });
        const edge = new T.MeshStandardMaterial({ color: 0xc0ad8c, roughness: 0.82 });
        for (let i = 0; i < count; i++) {
          const f = (i + 0.5) / count;
          const height = 1.1 + f * 3.5;
          const spike = new T.Group();
          const body = new T.Mesh(new T.ConeGeometry(0.22, height, 5).translate(0, height / 2, 0), stone);
          body.position.y = 0.015;
          spike.add(body);
          const shard = new T.Mesh(new T.ConeGeometry(0.09, height * 0.72, 4).translate(0, height * 0.36, 0), edge);
          shard.position.set(0.1, 0.02, 0.07);
          spike.add(shard);
          spike.position.lerpVectors(s.start, end, f);
          spike.scale.y = 0.001;
          s.tipH = height;
          s.proj.add(spike); s.spikes.push(spike);
        }
        this.scene.add(s.proj);
      }
      const u = Math.max(0, Math.min(1, (el - s.windup) / s.flight));
      s.spikes.forEach((spike, i) => {
        const start = i / Math.max(1, s.spikes.length - 1) * 0.62;
        spike.scale.y = s.stuck ? 1 : Math.max(0.001, Math.min(1, (u - start) / 0.18));
      });
      if (el < s.impact) {
        // Les pics se dressent à la suite, de l'attaquant vers sa cible.
      } else if (!s.stuck) {
        s.stuck = true;
        this.shakeUntil = t + 0.1; this.shakeAmp = 0.03;
      }
    }

    endToss(c) {
      if (c.anim && c.anim.shot) this.endShot(c);
      // attaque spéciale interrompue (coup suivant joué avant la fin) : ses effets ne doivent pas rester à l'écran
      if (c.anim && c.anim.knightAttack) {
        this.endShot(c.anim.knightAttack);
        c.parts.root.visible = true; if (c.parts.riderRoot) c.parts.riderRoot.visible = true;
        c.parts.root.rotation.set(0, 0, 0); c.parts.root.position.set(0, 0, 0); if (c.shadow) c.shadow.scale.setScalar(1);
      }
      const s = c.anim && c.anim.toss;
      if (!s) return;
      if (s.proj && !s.stuck) this.scene.remove(s.proj);
      if (c.parts.shuriken) c.parts.shuriken.visible = true; // il en ressort un autre en arrivant
    }

    tickKnightAttack(c, a, el, t, M) {
      if (a.style === 'chidori') { this.tickChidori(c, a, el, t, M); return; }
      if (a.style === 'orb') { this.tickOrb(c, a, el, t, M); return; }
      if (a.style === 'fireroll') { this.tickFireroll(c, a, el, t, M); return; }
      if (a.style === 'flameline') { this.tickFlameline(c, a, el, t, M); return; }
      if (a.style === 'judgment') { this.tickJudgment(c, a, el, t, M); return; }
      if (a.style === 'emperorhand') { this.tickEmperorHand(c, a, el, t, M); return; }
      if (a.style === 'enpassant') { this.tickEnPassant(c, a, el, t, M); return; }
      if (a.pre && a.style === 'tunnel-impact') {
        if (this.tickWhirlwind(c, a, el, t, M)) return;
        el -= a.pre;
      }
      const T = this.THREE, white = a.style.startsWith('tunnel') || a.style.startsWith('spin');
      const from = new T.Vector3(a.from.x, 0, a.from.z), target = new T.Vector3(a.target.x, 0, a.target.z);
      const travelEnd = white ? 0.88 : 1.08;
      const u = Math.max(0, Math.min(1, el / travelEnd));
      const pos = from.clone().lerp(target, u);
      const toward = Math.atan2(target.x - from.x, target.z - from.z);
      c.holder.rotation.y = toward;

      if (white) {
        // le forage laisse un trou dans le sol sur la case de départ, puis sur la case d'arrivée
        if (el >= 0.1 && !a.holeFrom) { a.holeFrom = true; this.createCrater(a.from, t); }
        if (el >= travelEnd - 0.1 && !a.holeTo) { a.holeTo = true; this.createCrater(a.target, t); this.shakeUntil = t + 0.15; this.shakeAmp = 0.08; }
        // Le ninja se baisse/disparaît pendant le forage : on ne voit que le chien tourner.
        if (c.parts.riderRoot) c.parts.riderRoot.visible = el >= 1.55;
        if (a.style === 'tunnel-eat') {
          M.animate(c.parts, t, el > 0.9 ? 'idle' : 'run');
          const depth = el < 0.18 ? -1.35 * (el / 0.18) : el < travelEnd - 0.12 ? -1.35 : -1.35 * (1 - (el - (travelEnd - 0.12)) / 0.12);
          c.holder.position.set(pos.x, el < travelEnd ? depth : 0, pos.z);
          c.parts.root.rotation.set(0, 0, el < 1.55 ? el * 31 : 0);
          this.tunnelDust(c, a, t);
          if (c.parts.mountHead) c.parts.mountHead.rotation.x = el > 1.65 ? -0.25 - Math.abs(Math.sin(t * 12)) * 0.35 : 0;
          if (c.parts.mountJaw) c.parts.mountJaw.scale.y = el > 1.65 ? 0.02 + Math.abs(Math.sin(t * 12)) * 0.065 : 0.015;
        } else {
          M.animate(c.parts, t, el > 0.82 ? 'idle' : 'run');
          const depth = el < 0.18 ? -1.35 * (el / 0.18) : el < travelEnd - 0.12 ? -1.35 : -1.35 * (1 - (el - (travelEnd - 0.12)) / 0.12);
          const jump = el < travelEnd ? depth : el < 1.55 ? Math.sin(Math.PI * (el - travelEnd) / (1.55 - travelEnd)) * 0.6 : 0;
          c.holder.position.set(pos.x, jump, pos.z);
          c.parts.root.rotation.set(0, 0, el < 1.55 ? el * 31 : 0);
        }
        if (el >= 0.92 && el < 1.58) {
          const h = (el - 0.92) / 0.3;
          const hit = Math.min(2, Math.floor(h) + 1);
          if (hit > a.hitCount) {
            a.hitCount = hit;
            this.flash(a.target, a.target, hit, 0xffdca0);
          }
          if (c.parts.mountLegs) c.parts.mountLegs.forEach((leg, i) => {
            leg.rotation.x = i % 2 ? -Math.max(0, Math.sin((h % 1) * Math.PI)) * 1.5 : 0;
          });
        } else if (c.parts.mountLegs) c.parts.mountLegs.forEach((leg) => { leg.rotation.x = 0; });
      } else {
        M.animate(c.parts, t, 'run');
        this.trail(c, el > 0.15 && el < 2.1, t);
        this.launchMiniEagles(a, el, t);
        // l'aigle saisit sa proie dans ses serres, monte avec elle puis redescend et l'écrase sur sa case
        const UP = 1.95, DOWN = 2.62, TOP = 2.7, clamp = (x) => Math.max(0, Math.min(1, x));
        if (el < travelEnd) {
          c.holder.position.set(pos.x, Math.sin(Math.PI * u) * 0.9, pos.z);
        } else if (el < UP) {
          const r = clamp((el - travelEnd) / (UP - travelEnd));
          c.holder.position.set(target.x, TOP * r * r * (3 - 2 * r), target.z);
        } else if (el < DOWN) {
          const d = clamp((el - UP) / (DOWN - UP));
          c.holder.position.set(target.x, TOP * (1 - d * d), target.z);
        } else c.holder.position.set(target.x, 0, target.z); // posé sur la proie écrasée
        a.eagleY = c.holder.position.y;
        if (el >= DOWN && !a.craterMade) {
          a.craterMade = true;
          // la case se fissure sous l'impact (les fissures restent jusqu'à la fin de la partie)
          const sq = Math.round(a.target.z + 3.5) * 8 + Math.round(a.target.x + 3.5);
          this.addPermanentCracks(sq, t, this.ply);
          this.shakeUntil = t + 0.45; this.shakeAmp = 0.14;
          if (a.style !== 'eagle-release') {
            this.createCrater(a.target, t);
            this.explode(a, new T.Vector3(a.target.x, 0.38, a.target.z), el, t,
              [0xfff0c8, 0xb98552, 0xffd35a], [0x513b2a, 0x9e7140], false);
          }
        }
        if (el >= 0.92 && !a.eaglesExploded) {
          a.eaglesExploded = true;
          a.eagles && a.eagles.forEach((bird) => { bird.visible = false; });
          this.explode(a, new T.Vector3(a.target.x, 0.52, a.target.z), el, t,
            [0xffffff, 0xe7f4ff, 0xa9dfff], [0xffffff, 0xb9e5ff], true);
          this.shakeUntil = t + 0.25; this.shakeAmp = 0.09;
        }
      }
      if (a.whirl) {
        // le tourbillon suit le chien sous terre, jaillit avec lui puis se dissipe et les rend visibles
        const gone = Math.max(0, Math.min(1, (el - 1.45) / 0.25));
        c.parts.root.visible = gone >= 1;
        if (c.parts.riderRoot) c.parts.riderRoot.visible = gone >= 1;
        a.whirl.visible = gone < 1;
        a.whirl.position.set(c.holder.position.x, c.holder.position.y + 0.42, c.holder.position.z);
        a.whirl.rotation.set(Math.PI / 2, toward, 0);
        a.whirl.scale.setScalar(Math.max(0.01, 1 + gone * 0.6));
        this.spinWhirl(a, t, 1 - gone);
      }
      if (a.boom) this.boomStep(a, el);
    }

    // Onde de puissance d'une pièce liée : colonne d'énergie, double anneau et éclat de lumière sur la cible
    addPowerBurst(at, white, start) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const color = white ? 0xffd36a : 0xb36bff;
      const glow = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
      const rings = [0, 1].map((i) => { const r = new T.Mesh(new T.RingGeometry(0.4, 0.62, 48), glow(i ? 0xffffff : color, 0)); r.rotation.x = -Math.PI / 2; r.position.y = 0.05 + i * 0.02; g.add(r); return r; });
      const pillar = new T.Mesh(new T.CylinderGeometry(0.25, 0.5, 4, 24, 1, true), glow(color, 0)); pillar.position.y = 2; g.add(pillar);
      const ball = new T.Mesh(new T.SphereGeometry(0.5, 20, 14), glow(0xffffff, 0)); ball.position.y = 0.7; g.add(ball);
      const light = new T.PointLight(color, 0, 8, 2); light.position.y = 1.2; g.add(light);
      this.addEffect({ start, dur: 1.4, tick: (e, t) => {
        g.visible = true;
        const k = Math.min(1, e / 1.4), f = 1 - k;
        rings.forEach((r, i) => { const w = Math.min(1, (e - i * 0.15) / 0.9); r.scale.setScalar(1 + Math.max(0, w) * (6 + i * 2)); r.material.opacity = w > 0 ? 0.8 * (1 - w) : 0; });
        pillar.material.opacity = 0.45 * f; pillar.scale.set(1 + k, 1, 1 + k);
        ball.material.opacity = e < 0.4 ? 0.8 * (1 - e / 0.4) : 0; ball.scale.setScalar(1 + e * 3);
        light.intensity = 8 * f;
        if (e < 0.25) { this.shakeUntil = t + 0.05; this.shakeAmp = Math.max(this.shakeAmp || 0, 0.12); }
      }, end: () => this.disposeGroup(g) });
    }
    // Pièce liée qui attaque : éclairs bleutés qui crépitent autour d'elle jusqu'à l'impact
    addElectricAura(c, start, until) {
      const T = this.THREE, g = new T.Group(); this.scene.add(g);
      const mats = [0xbfe8ff, 0x6fb8ff, 0xffffff].map((color) => new T.LineBasicMaterial({ color, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const bolts = Array.from({ length: 7 }, (_, i) => { const l = new T.Line(new T.BufferGeometry(), mats[i % 3]); g.add(l); return l; });
      const light = new T.PointLight(0x8fd0ff, 0, 4, 2); light.position.y = 0.9; g.add(light);
      const shell = new T.Mesh(new T.SphereGeometry(0.55, 16, 12), new T.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      shell.position.y = 0.75; shell.scale.set(1, 1.5, 1); g.add(shell);
      this.addEffect({ start, dur: until - start, tick: (e, t) => {
        const p = c.holder.position; g.position.set(p.x, p.y, p.z);
        for (const b of bolts) {
          // éclair en zigzag de bas en haut autour du corps, redessiné à chaque image
          if (Math.random() < 0.35) { b.visible = false; continue; }
          b.visible = true;
          const a0 = Math.random() * Math.PI * 2, r = 0.32 + Math.random() * 0.18, pts = [];
          for (let k = 0; k <= 6; k++) {
            const a = a0 + (Math.random() - 0.5) * 0.9, y = 0.1 + k * 0.24;
            pts.push(new T.Vector3(Math.cos(a) * (r + (Math.random() - 0.5) * 0.12), y, Math.sin(a) * (r + (Math.random() - 0.5) * 0.12)));
          }
          b.geometry.dispose(); b.geometry = new T.BufferGeometry().setFromPoints(pts);
        }
        const flick = 0.6 + Math.random() * 0.4;
        light.intensity = 3.5 * flick; shell.material.opacity = 0.12 * flick;
      }, end: () => this.disposeGroup(g) });
    }
    // L'échiquier tremble fort à l'impact d'une pièce liée
    addBoardQuake(start) {
      this.addEffect({ start, dur: 0.75, tick: (e, t) => { this.shakeUntil = t + 0.05; this.shakeAmp = Math.max(this.shakeAmp || 0, 0.28 * (1 - e / 0.75)); }, end: () => {} });
    }
    // Fissures sur la case de la pièce prise : elles restent jusqu'à la fin de la partie
    addPermanentCracks(sq, start, ply) {
      const T = this.THREE, at = this.sqToPos(sq), g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const m = new T.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0.85, depthWrite: false });
      const glowM = new T.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
      const glowParts = [];
      const branch = (x, z, ang, len, width, depth) => {
        let px = x, pz = z;
        const n = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
          ang += (Math.random() - 0.5) * 0.9;
          const l = len / n, nx = Math.max(-0.49, Math.min(0.49, px + Math.cos(ang) * l)), nz = Math.max(-0.49, Math.min(0.49, pz + Math.sin(ang) * l));
          const dx = nx - px, dz = nz - pz, d = Math.hypot(dx, dz);
          if (d < 0.01) break;
          const w = width * (1 - i / (n + 1));
          const seg = new T.Mesh(new T.PlaneGeometry(d, w), m); seg.rotation.x = -Math.PI / 2; seg.rotation.z = -Math.atan2(dz, dx);
          seg.position.set((px + nx) / 2, 0.021, (pz + nz) / 2); g.add(seg);
          const gl = new T.Mesh(new T.PlaneGeometry(d, w * 2.6), glowM); gl.rotation.copy(seg.rotation); gl.position.copy(seg.position); gl.position.y = 0.022; g.add(gl); glowParts.push(gl);
          if (depth < 2 && Math.random() < 0.4) branch(nx, nz, ang + (Math.random() < 0.5 ? 0.7 : -0.7), len * 0.5, w * 0.7, depth + 1);
          px = nx; pz = nz;
        }
      };
      const arms = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < arms; i++) branch(0, 0, i / arms * Math.PI * 2 + Math.random() * 0.5, 0.42 + Math.random() * 0.12, 0.035, 0);
      const pit = new T.Mesh(new T.CircleGeometry(0.07, 12), m); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.021; g.add(pit);
      (this.boardCracks = this.boardCracks || []).push({ object: g, ply });
      // les fissures apparaissent à l'impact avec une lueur électrique qui s'éteint
      this.addEffect({ start, dur: 1.2, tick: (e) => { g.visible = true; glowM.opacity = 0.8 * Math.max(0, 1 - e / 1.2); }, end: () => { g.visible = true; glowParts.forEach((x) => g.remove(x)); } });
    }
    // Combat rapproché : la pièce range son arme et se bat aux poings et aux pieds
    brawlMode(c, on) {
      const p = c.parts;
      if (on && p.savedWeapon === undefined) {
        p.savedWeapon = p.weapon; p.weapon = 'brawl'; p.noWall = true;
        if (p.blade) p.blade.visible = false;
      } else if (!on && p.savedWeapon !== undefined) {
        p.weapon = p.savedWeapon; p.savedWeapon = undefined; p.noWall = false;
        if (p.blade) p.blade.visible = true;
      }
    }
    // Effets passagers posés dans la scène : { start, dur, tick(e, t), end() }
    addEffect(fx) { (this.effects = this.effects || []).push(fx); return fx; }
    tickEffects(t) {
      if (this.overlay) for (const g of this.overlay.children) {
        if (g.userData.pulse == null) continue;
        const k = 0.5 + 0.5 * Math.sin(t * 4 + g.userData.pulse);
        g.children[0].material.opacity = 0.35 + k * 0.5;
        g.children[0].scale.setScalar(0.92 + k * 0.16);
        g.children[1].material.opacity = 0.06 + k * 0.12;
      }
      if (!this.effects || !this.effects.length) return;
      // un effet peut en créer un autre pendant son tick (roquette tirée par l'escorte) : on ne le perd pas
      const list = this.effects; this.effects = [];
      const keep = list.filter((fx) => {
        const e = t - fx.start;
        if (e < 0) return true;
        fx.tick(e, t);
        if (e >= fx.dur) { fx.end(); return false; }
        return true;
      });
      this.effects = keep.concat(this.effects);
    }
    disposeGroup(g) {
      this.scene.remove(g);
      g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    // Roque : dôme protecteur, blanc ou noir selon le camp, qui s'efface en quelques secondes
    addCastleDome(at, white, start) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const color = white ? 0xdff2ff : 0x7a3ad0;
      const shell = new T.Mesh(new T.SphereGeometry(1.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      const grid = new T.Mesh(new T.IcosahedronGeometry(1.27, 2), new T.MeshBasicMaterial({ color: white ? 0xffffff : 0xb98cff, wireframe: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      const ring = new T.Mesh(new T.RingGeometry(1.15, 1.3, 48), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
      const clip = new T.Plane(new T.Vector3(0, 1, 0), 0);
      grid.material.clippingPlanes = [clip]; this.renderer.localClippingEnabled = true;
      g.add(shell, grid, ring);
      this.addEffect({ start, dur: 3.2, tick: (e, t) => {
        g.visible = true;
        const rise = Math.min(1, e / 0.35), fade = 1 - Math.max(0, Math.min(1, (e - 2.2) / 1.0));
        g.scale.set(1, Math.max(0.01, rise), 1);
        shell.material.opacity = 0.28 * fade + (e < 0.35 ? 0.25 * (1 - e / 0.35) : 0);
        grid.material.opacity = (0.22 + Math.abs(Math.sin(t * 6)) * 0.12) * fade;
        grid.rotation.y = t * 0.6;
        ring.material.opacity = 0.6 * fade; ring.scale.setScalar(1 + Math.sin(t * 5) * 0.03);
      }, end: () => this.disposeGroup(g) });
    }
    // Promotion : colonne de lumière, la nouvelle pièce grandit dans la lumière avec son aura ; la dame déclenche une onde d'énergie
    addPromotionFx(c, at, start) {
      const T = this.THREE, g = new T.Group(); g.position.set(at.x, 0, at.z); g.visible = false; this.scene.add(g);
      const white = c.piece === c.piece.toUpperCase(), queen = c.piece.toLowerCase() === 'q';
      const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false });
      const column = new T.Mesh(new T.CylinderGeometry(0.3, 0.36, 6, 24, 1, true), glow(white ? 0xfff4c8 : 0xd7b8ff, 0));
      column.position.y = 3;
      const core = new T.Mesh(new T.CylinderGeometry(0.1, 0.14, 6, 16, 1, true), glow(0xffffff, 0));
      core.position.y = 3;
      const base = new T.Mesh(new T.RingGeometry(0.2, 0.6, 40), glow(white ? 0xffd65a : 0xb07cff, 0));
      base.rotation.x = -Math.PI / 2; base.position.y = 0.03;
      const motes = [];
      for (let i = 0; i < 16; i++) {
        const m = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), glow(i % 2 ? 0xffffff : white ? 0xffe28a : 0xc9a0ff, 0.9));
        m.userData = { a: i * 2.399, h: (i % 8) * 0.25 }; motes.push(m); g.add(m);
      }
      const wave = new T.Mesh(new T.SphereGeometry(0.5, 24, 16), glow(white ? 0xfff0b0 : 0xc39bff, 0));
      wave.position.y = 0.6; wave.visible = queen;
      const shock = new T.Mesh(new T.RingGeometry(0.5, 0.7, 48), glow(0xffffff, 0));
      shock.rotation.x = -Math.PI / 2; shock.position.y = 0.05; shock.visible = queen;
      g.add(column, core, base, wave, shock);
      const light = new T.PointLight(white ? 0xffe9b0 : 0xc59bff, 0, 6, 2); light.position.y = 1.2; g.add(light);
      const baseScale = c.parts.root.scale.x;
      c.parts.root.scale.setScalar(baseScale * 0.6); // encore à la taille d'un pion pendant son dernier pas
      this.addEffect({ start, dur: 2.0, tick: (e, t) => {
        g.visible = true;
        const inn = Math.min(1, e / 0.3), out = 1 - Math.max(0, Math.min(1, (e - 1.4) / 0.6));
        column.material.opacity = 0.2 * inn * out; core.material.opacity = 0.3 * inn * out;
        column.scale.set(1 + Math.sin(t * 9) * 0.04, 1, 1 + Math.sin(t * 9) * 0.04);
        base.material.opacity = 0.8 * inn * out; base.scale.setScalar(1 + e * 0.4);
        motes.forEach((m) => { const a = m.userData.a + t * 4, r = 0.35 + Math.sin(t * 3 + m.userData.a) * 0.06; m.position.set(Math.cos(a) * r, (m.userData.h + e * 1.2) % 2.2, Math.sin(a) * r); m.material.opacity = 0.9 * out; });
        // la pièce s'éveille : elle grandit dans la lumière
        const grow = e < 1.1 ? 0.6 + 0.4 * (1 - Math.pow(1 - e / 1.1, 3)) : 1;
        c.parts.root.scale.setScalar(baseScale * grow * (e > 1.0 && e < 1.3 ? 1 + Math.sin((e - 1.0) / 0.3 * Math.PI) * 0.12 : 1));
        if (queen && e > 1.0) {
          const w = Math.min(1, (e - 1.0) / 0.6);
          wave.scale.setScalar(1 + w * 5); wave.material.opacity = 0.5 * (1 - w);
          shock.scale.setScalar(1 + w * 6); shock.material.opacity = 0.7 * (1 - w);
          if (e < 1.15) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.1; }
        }
        light.intensity = 3.5 * inn * out;
      }, end: () => { c.parts.root.scale.setScalar(baseScale); this.disposeGroup(g); } });
    }
