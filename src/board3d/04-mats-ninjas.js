    makeMateUltimateFx(u) {
      const T = this.THREE, kind = u.piece.toLowerCase();
      const actor = u.actor, king = u.king;
      this.captureCamera = null;
      this.attackCamera = null;
      const yaw = this.viewYaw(), radius = 18.5, elevation = 48 * Math.PI / 180;
      const horizontal = radius * Math.cos(elevation);
      const actionPos = this.sqToPos(u.attackerTo);
      const actionCenter = { x: (actionPos.x + u.target.x) * 0.5, z: (actionPos.z + u.target.z) * 0.5 };
      u.camera = {
        fromPosition: this.camera.position.clone(),
        fromTarget: this.cameraTarget.clone(),
        actionTarget: new T.Vector3(actionCenter.x, 2.6, actionCenter.z),
        widePosition: new T.Vector3(horizontal * Math.sin(yaw), 0.3 + radius * Math.sin(elevation), horizontal * Math.cos(yaw)),
        wideTarget: new T.Vector3(
          actionCenter.x * 0.18,
          0.55,
          actionCenter.z * 0.18,
        ),
      };
      u.actorRoot = actor.parts.root;
      u.kingRoot = king && king.parts.root;
      u.actorBase = { position: u.actorRoot.position.clone(), rotation: u.actorRoot.rotation.clone(), scale: u.actorRoot.scale.clone() };
      u.actorHolderBase = actor.holder.position.clone();
      u.kingBase = u.kingRoot && { position: u.kingRoot.position.clone(), rotation: u.kingRoot.rotation.clone(), scale: u.kingRoot.scale.clone() };
      u.kingHolderBase = king && king.holder.position.clone();
      u.kingHolderVisible = king && king.holder.visible;
      if (u.fromPos) actor.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
      u.fx = new T.Group(); this.scene.add(u.fx);
      if (u.themed) { this.makeThemeMate(u); return; }
      if (kind === 'n' && u.piece === u.piece.toUpperCase()) {
        // Le ninja se fond dans son chien blanc, qui devient une bête à deux têtes.
        u.hiddenParts = u.actorRoot.children.filter((o) => o.isMesh && o.position.z >= 0.28 && o.visible);
        u.extraHeads = [];
        const fur = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
        const dark = new T.MeshStandardMaterial({ color: 0x25232a, roughness: 0.6 });
        const eyes = new T.MeshBasicMaterial({ color: 0xff2a1a });
        const fang = new T.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.4 });
        for (const side of [-1, 1]) {
          const neck = new T.Group(); neck.position.set(side * 0.17, 0.36, 0.2); neck.rotation.y = side * 0.22; u.actorRoot.add(neck);
          const ball = (material, pos, scale) => { const m = new T.Mesh(new T.SphereGeometry(1, 16, 12), material); m.position.set(...pos); m.scale.set(...scale); neck.add(m); return m; };
          ball(fur, [0, 0.03, 0.08], [0.13, 0.13, 0.16]);
          ball(fur, [0, 0.07, 0.2], [0.19, 0.19, 0.19]);
          ball(fur, [0, 0.0, 0.37], [0.12, 0.09, 0.14]);
          ball(dark, [0, 0.02, 0.5], [0.032, 0.028, 0.024]);
          const jaw = new T.Group(); jaw.position.set(0, -0.06, 0.3); neck.add(jaw);
          const jawMesh = new T.Mesh(new T.SphereGeometry(1, 12, 8), fur); jawMesh.position.set(0, -0.02, 0.06); jawMesh.scale.set(0.1, 0.035, 0.12); jaw.add(jawMesh);
          for (const s of [-1, 1]) {
            ball(eyes, [s * 0.085, 0.13, 0.34], [0.026, 0.026, 0.02]);
            const ear = new T.Mesh(new T.ConeGeometry(0.06, 0.18, 6), fur); ear.position.set(s * 0.11, 0.27, 0.16); ear.rotation.z = s * -0.35; neck.add(ear);
            const top = new T.Mesh(new T.ConeGeometry(0.018, 0.08, 5), fang); top.position.set(s * 0.05, -0.08, 0.42); top.rotation.x = Math.PI; neck.add(top);
            const low = new T.Mesh(new T.ConeGeometry(0.016, 0.07, 5), fang); low.position.set(s * 0.045, 0.02, 0.14); jaw.add(low);
          }
          neck.userData = { side, jaw }; neck.scale.setScalar(0.01); u.extraHeads.push(neck);
        }
        u.fusionRing = new T.Mesh(new T.TorusGeometry(0.55, 0.05, 8, 40), new T.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
        u.fusionRing.rotation.x = Math.PI / 2; u.fx.add(u.fusionRing);
        u.dust = [];
        for (let i = 0; i < 3; i++) {
          const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: 0xcdbfa6, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
          ring.rotation.x = -Math.PI / 2; ring.position.set(u.target.x, 0.04, u.target.z); u.fx.add(ring); u.dust.push(ring);
        }
        // Lambeaux du roi arrachés par les deux gueules.
        u.shreds = [];
        const kingWhite = king && king.piece === king.piece.toUpperCase();
        for (let i = 0; i < 26; i++) {
          const color = i % 4 === 0 ? 0xc9a227 : i % 3 === 0 ? 0x8b1e2a : kingWhite ? 0xf1ece0 : 0x26232b;
          const shred = new T.Mesh(new T.BoxGeometry(0.07 + Math.random() * 0.06, 0.03, 0.05 + Math.random() * 0.05), new T.MeshStandardMaterial({ color, roughness: 0.8, transparent: true, opacity: 1 }));
          shred.visible = false; shred.userData.seed = i; u.fx.add(shred); u.shreds.push(shred);
        }
        u.fireLight = new T.PointLight(0xdcecff, 0, 4, 2); this.scene.add(u.fireLight);
      } else if (u.piece === 'R') {
        // Tour blanche : tornade de flammes blanches qui avance jusqu'au roi et l'emporte en le brûlant
        const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
        u.tornado = new T.Group(); u.tornado.visible = false; u.fx.add(u.tornado);
        u.tornadoFlames = [];
        for (let layer = 0; layer < 9; layer++) {
          const ring = new T.Group(); ring.position.y = 0.12 + layer * 0.26; ring.userData.layer = layer; u.tornado.add(ring);
          const r = 0.16 + layer * 0.075;
          for (let k = 0; k < 8; k++) {
            const a = k * Math.PI / 4 + layer * 0.45;
            const fl = new T.Mesh(new T.ConeGeometry(0.07 + layer * 0.012, 0.34 + layer * 0.03, 6, 1, true), glow(k % 3 === 0 ? 0xffffff : k % 3 === 1 ? 0xe6f6ff : 0xc4e4ff, 0.8));
            fl.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); fl.rotation.set(0, -a, 0.5); fl.userData.phase = layer * 1.1 + k;
            ring.add(fl); u.tornadoFlames.push(fl);
          }
        }
        u.tornadoCore = new T.Mesh(new T.CylinderGeometry(0.8, 0.14, 2.4, 20, 1, true), glow(0xf4fbff, 0.28));
        u.tornadoCore.position.y = 1.2; u.tornado.add(u.tornadoCore);
        // traînée de flammes blanches sur le chemin
        u.trail = [];
        const dx = u.target.x - u.fromPos.x, dz = u.target.z - u.fromPos.z, n = Math.max(5, Math.round(Math.hypot(dx, dz) * 4));
        for (let i = 1; i <= n; i++) {
          const g = new T.Group(), f = i / n;
          g.position.set(u.fromPos.x + dx * f, 0.02, u.fromPos.z + dz * f);
          for (let k = 0; k < 3; k++) {
            const fl = new T.Mesh(new T.ConeGeometry(0.06 + k * 0.02, 0.24 + k * 0.08, 6, 1, true), glow(k === 1 ? 0xffffff : 0xd8eeff, 0.85));
            fl.position.set((k - 1) * 0.08, 0.12 + k * 0.03, (i + k) % 2 ? 0.05 : -0.05); fl.userData.phase = i * 1.3 + k; g.add(fl);
          }
          const scorch = new T.Mesh(new T.CircleGeometry(0.16, 16), new T.MeshBasicMaterial({ color: 0x3a3a40, transparent: true, opacity: 0.5, depthWrite: false }));
          scorch.rotation.x = -Math.PI / 2; scorch.position.y = -0.012; g.add(scorch);
          g.visible = false; g.userData.f = f; u.fx.add(g); u.trail.push(g);
        }
        u.ashes = [];
        for (let i = 0; i < 26; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.03 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 3 ? 0xd9d6d0 : 0x8f8b86, transparent: true, opacity: 0 }));
          u.fx.add(ash); u.ashes.push(ash);
        }
        u.fireLight = new T.PointLight(0xeef7ff, 0, 7, 2); this.scene.add(u.fireLight);
      } else if (u.piece === 'r') {
        // Tour noire : golem de feu noir, double coup de poings, puis boule de feu noire tombée du ciel
        // feu noir : flammes opaques très sombres, avec quelques braises rouge sombre qui luisent
        const dark = (k) => k % 4 === 3
          ? new T.MeshBasicMaterial({ color: 0x9a1430, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })
          : new T.MeshBasicMaterial({ color: k % 2 ? 0x050307 : 0x10060e, side: T.DoubleSide });
        u.golemFlames = new T.Group(); u.golemFlames.visible = false; u.fx.add(u.golemFlames);
        for (let i = 0; i < 16; i++) {
          const a = i * 2.399, h = 0.3 + (i % 4) * 0.12;
          const fl = new T.Mesh(new T.ConeGeometry(0.09 + (i % 3) * 0.03, h, 7, 1, true), dark(i));
          fl.position.set(Math.cos(a) * 0.32, 0.2 + (i % 6) * 0.26, Math.sin(a) * 0.32); fl.userData = { phase: i * 1.3, y: fl.position.y };
          u.golemFlames.add(fl);
        }
        u.ball = new T.Group(); u.ball.visible = false; u.fx.add(u.ball);
        u.ball.add(new T.Mesh(new T.SphereGeometry(0.55, 20, 16), new T.MeshBasicMaterial({ color: 0x07040a })));
        u.ball.add(new T.Mesh(new T.SphereGeometry(0.66, 20, 16), new T.MeshBasicMaterial({ color: 0x6a1a3a, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false })));
        u.ballSpikes = [];
        for (let i = 0; i < 18; i++) {
          const th = i * 2.399, ph = Math.acos(1 - 2 * (i + 0.5) / 18);
          const dir = new T.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
          const f = new T.Mesh(new T.ConeGeometry(0.14, 0.5, 6, 1, true), dark(i));
          f.position.copy(dir).multiplyScalar(0.6); f.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
          u.ball.add(f); u.ballSpikes.push(f);
        }
        // Le trou laissé par l'impact, les fissures du plateau et les flammes noires qui y brûlent
        u.crater = new T.Group(); u.crater.position.set(u.target.x, 0, u.target.z); u.crater.visible = false; u.fx.add(u.crater);
        const hole = new T.Mesh(new T.CircleGeometry(0.62, 28), new T.MeshBasicMaterial({ color: 0x020102 }));
        hole.rotation.x = -Math.PI / 2; hole.position.y = 0.035; u.crater.add(hole);
        const rim = new T.Mesh(new T.RingGeometry(0.6, 0.86, 28), new T.MeshBasicMaterial({ color: 0x2a1d16, transparent: true, opacity: 0.9, depthWrite: false }));
        rim.rotation.x = -Math.PI / 2; rim.position.y = 0.033; u.crater.add(rim);
        u.cracks = [];
        for (let c = 0; c < 11; c++) {
          let a = c * Math.PI * 2 / 11 + Math.random() * 0.3, x = Math.cos(a) * 0.7, z = Math.sin(a) * 0.7;
          const len = 1.6 + Math.random() * 1.9, steps = 6;
          for (let s = 0; s < steps; s++) {
            a += (Math.random() - 0.5) * 0.7;
            const l = len / steps, nx = x + Math.cos(a) * l, nz = z + Math.sin(a) * l;
            // les fissures s'arrêtent au bord du plateau
            if (Math.abs(u.target.x + nx) > 3.95 || Math.abs(u.target.z + nz) > 3.95) break;
            const seg = new T.Mesh(new T.BoxGeometry(l + 0.02, 0.012, 0.05 - s * 0.006), new T.MeshBasicMaterial({ color: s % 2 ? 0x0a0608 : 0x160a12 }));
            seg.position.set((x + nx) / 2, 0.034, (z + nz) / 2); seg.rotation.y = -Math.atan2(nz - z, nx - x);
            seg.userData.order = s; seg.visible = false; u.crater.add(seg); u.cracks.push(seg);
            x = nx; z = nz;
          }
        }
        u.craterFlames = [];
        for (let i = 0; i < 10; i++) {
          const a = i * Math.PI * 2 / 10, h = 0.5 + (i % 3) * 0.25;
          const fl = new T.Mesh(new T.ConeGeometry(0.12, h, 7, 1, true), dark(i));
          fl.position.set(Math.cos(a) * 0.45, h / 2, Math.sin(a) * 0.45); fl.userData = { phase: i * 1.7 };
          u.crater.add(fl); u.craterFlames.push(fl);
        }
        u.shock = new T.Mesh(new T.RingGeometry(0.5, 0.75, 40), new T.MeshBasicMaterial({ color: 0x3a1a2a, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
        u.shock.rotation.x = -Math.PI / 2; u.shock.position.set(u.target.x, 0.06, u.target.z); u.fx.add(u.shock);
        u.smoke = [];
        for (let i = 0; i < 12; i++) {
          const puff = new T.Mesh(new T.SphereGeometry(0.22 + (i % 3) * 0.08, 10, 8), new T.MeshBasicMaterial({ color: 0x1a1418, transparent: true, opacity: 0, depthWrite: false }));
          u.fx.add(puff); u.smoke.push(puff);
        }
        u.fireLight = new T.PointLight(0x9a2a4a, 0, 7, 2); this.scene.add(u.fireLight);
      } else if (u.piece === 'b') {
        // Fou noir : des nuages d'orage noirs, d'où descend en spirale un dragon de foudre violette.
        const glow = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
        const ink = (color) => new T.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false });
        u.clouds = new T.Group(); u.clouds.position.set(u.target.x, 4.9, u.target.z); u.fx.add(u.clouds);
        for (let i = 0; i < 14; i++) {
          const puff = new T.Mesh(new T.SphereGeometry(0.32 + (i % 4) * 0.12, 14, 10), new T.MeshBasicMaterial({ color: i % 3 ? 0x17121f : 0x2a1d3a, transparent: true, opacity: 0, depthWrite: false }));
          const a = i * 2.399, r = 0.2 + (i % 5) * 0.28;
          puff.position.set(Math.cos(a) * r, (i % 3) * 0.2, Math.sin(a) * r); puff.scale.y = 0.45; u.clouds.add(puff);
        }
        u.dragon = [];
        const n = 28;
        for (let i = 0; i < n; i++) {
          const seg = new T.Group(), r = 0.24 - (i / n) * 0.16;
          seg.add(new T.Mesh(new T.SphereGeometry(r * 0.7, 10, 8), ink(0x0d0614)));
          seg.add(new T.Mesh(new T.SphereGeometry(r, 12, 10), glow(i % 2 ? 0x9b4dff : 0xc79bff, 0.6)));
          if (i % 3 === 1) { const fin = new T.Mesh(new T.ConeGeometry(r * 0.35, r * 1.5, 5), glow(0xe2c8ff, 0.8)); fin.position.y = r * 0.95; seg.add(fin); }
          seg.visible = false; u.fx.add(seg); u.dragon.push(seg);
        }
        // Tête : gueule allongée, cornes et yeux blancs
        const head = new T.Group(), skull = new T.Mesh(new T.SphereGeometry(0.2, 14, 10), ink(0x10071a));
        skull.scale.set(1, 0.8, 1.6); head.add(skull);
        const aura = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), glow(0xa45cff, 0.55)); aura.scale.set(1, 0.85, 1.7); head.add(aura);
        const jaw = new T.Mesh(new T.ConeGeometry(0.13, 0.42, 8), ink(0x10071a)); jaw.rotation.x = Math.PI / 2; jaw.position.set(0, -0.09, 0.26); head.add(jaw);
        for (const side of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.045, 0.36, 6), glow(0xe8d6ff, 0.95)); horn.position.set(side * 0.11, 0.17, -0.14); horn.rotation.set(-1.0, 0, side * -0.3); head.add(horn);
          const eye = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), glow(0xffffff, 1)); eye.position.set(side * 0.1, 0.06, 0.22); head.add(eye);
          const whisker = new T.Mesh(new T.CylinderGeometry(0.008, 0.002, 0.5, 4), glow(0xc79bff, 0.9)); whisker.position.set(side * 0.12, -0.04, 0.42); whisker.rotation.set(Math.PI / 2, 0, side * 0.6); head.add(whisker);
        }
        head.visible = false; u.fx.add(head); u.dragonHead = head;
        // Éclairs qui crépitent le long du corps, et foudres qui tombent sur le roi
        const line = (color, count) => {
          const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(count * 3), 3));
          const l = new T.Line(g, new T.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
          l.frustumCulled = false; u.fx.add(l); return l;
        };
        u.crackles = Array.from({ length: 5 }, (_, i) => line(i % 2 ? 0xffffff : 0xb98aff, 7));
        u.strikes = Array.from({ length: 3 }, (_, i) => line(i === 1 ? 0xf2e6ff : 0x9b4dff, 10));
        u.castBolt = line(0xc79bff, 10);
        u.ashes = [];
        for (let i = 0; i < 22; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.035 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 3 ? 0x2a2230 : 0x9b4dff, transparent: true, opacity: 0 }));
          u.fx.add(ash); u.ashes.push(ash);
        }
        u.flashLight = new T.PointLight(0xa45cff, 0, 9, 2); this.scene.add(u.flashLight);
        u.sky = {
          background: this.scene.background && this.scene.background.isColor ? this.scene.background.clone() : null,
          fog: this.scene.fog && this.scene.fog.color ? this.scene.fog.color.clone() : null,
          sun: this.sun.intensity, hemi: this.hemi.intensity, exposure: this.renderer.toneMappingExposure,
        };
      } else if (kind === 'n') {
        // L'aigle et son ninja fusionnent en phénix de feu.
        u.phoenix = this.makePhoenix(); u.phoenix.visible = false; actor.holder.add(u.phoenix);
        u.phoenixScale = this.formScaleMatchingActor(actor, u.phoenix) * 1.05;
        u.phoenix.scale.setScalar(0.05);
        const fireMat = new T.MeshBasicMaterial({ color: 0xff6a16, transparent: true, opacity: 0.85, depthWrite: false });
        // Tourbillon de flammes au moment de la fusion.
        u.vortex = [];
        for (let i = 0; i < 12; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.08 + (i % 3) * 0.03, 0.4 + (i % 4) * 0.12, 7), fireMat.clone());
          flame.material.color.setHex(i % 2 ? 0xff3a0b : 0xffb52a); flame.visible = false;
          flame.userData.a = i * Math.PI * 2 / 12; u.fx.add(flame); u.vortex.push(flame);
        }
        // Brasier autour du roi pendant l'étreinte des ailes.
        u.flames = [];
        for (let i = 0; i < 11; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.1 + (i % 3) * 0.035, 0.45 + (i % 4) * 0.12, 7), fireMat.clone());
          const angle = i * Math.PI * 2 / 11;
          flame.position.set(u.target.x + Math.cos(angle) * 0.42, 0.65 + (i % 3) * 0.18, u.target.z + Math.sin(angle) * 0.42);
          flame.rotation.z = Math.cos(angle) * 0.3; flame.visible = false; u.fx.add(flame); u.flames.push(flame);
        }
        u.ashes = [];
        for (let i = 0; i < 22; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.035 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 3 ? 0x56524e : 0xff8a32, transparent: true, opacity: 0 }));
          u.fx.add(ash); u.ashes.push(ash);
        }
        u.fireLight = new T.PointLight(0xff6a16, 0, 7, 2); this.scene.add(u.fireLight);
      } else if (kind === 'b') {
        // L'éclair du fou appelle trois foudres verticales au-dessus du roi.
        u.bolts = [];
        for (let j = 0; j < 3; j++) {
          const points = [new T.Vector3(u.target.x + (j - 1) * 0.35, 6.4, u.target.z - 0.2)];
          for (let i = 1; i < 8; i++) points.push(new T.Vector3(u.target.x + (j - 1) * 0.35 + (Math.random() - 0.5) * 0.45, 6.4 - i * 0.78, u.target.z + (Math.random() - 0.5) * 0.35));
          points.push(new T.Vector3(u.target.x, 0.55, u.target.z));
          const line = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color: j === 1 ? 0xffffff : 0x7bd8ff, transparent: true, opacity: 0, blending: T.AdditiveBlending }));
          u.fx.add(line); u.bolts.push(line);
        }
        const transform = [new T.Vector3(u.fromPos.x, 5.2, u.fromPos.z), new T.Vector3(u.fromPos.x - 0.22, 4.2, u.fromPos.z), new T.Vector3(u.fromPos.x + 0.16, 3.2, u.fromPos.z + 0.1), new T.Vector3(u.fromPos.x - 0.1, 2.1, u.fromPos.z - 0.08), new T.Vector3(u.fromPos.x, 0.8, u.fromPos.z)];
        u.transformBolt = new T.Line(new T.BufferGeometry().setFromPoints(transform), new T.LineBasicMaterial({ color: 0xc8f5ff, transparent: true, opacity: 0, blending: T.AdditiveBlending }));
        u.fx.add(u.transformBolt);
        u.flashLight = new T.PointLight(0x9be8ff, 0, 8, 2); u.flashLight.position.set(u.target.x, 3.5, u.target.z); this.scene.add(u.flashLight);
        u.actorLight = new T.PointLight(0x89e5ff, 0, 3.5, 2); this.scene.add(u.actorLight);
        u.oldFast = actor.parts.fast; actor.parts.fast = true;
        u.ashes = [];
        for (let i = 0; i < 20; i++) {
          const ash = new T.Mesh(new T.IcosahedronGeometry(0.035 + Math.random() * 0.04, 0), new T.MeshBasicMaterial({ color: i % 2 ? 0x56524e : 0xaaa49a, transparent: true, opacity: 0 }));
          ash.userData.seed = i;
          u.fx.add(ash); u.ashes.push(ash);
        }
      } else if (kind === 'q' && u.piece === 'Q') {
        // La Dame reste sur l’échiquier : elle invoque un ange distinct.
        u.angel = this.makeWhiteAngel(); u.fx.add(u.angel);
        u.angelBaseScale = this.formScaleMatchingActor(actor, u.angel);
        u.floatH = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y * 0.95; // flotte à hauteur des têtes
        u.angel.scale.setScalar(0.05);
        const summonPos = this.sqToPos(u.attackerTo);
        u.angel.position.set(summonPos.x, 0, summonPos.z);
        u.hiddenEnemies = [...this.chars.values()].filter((piece) => piece.piece === piece.piece.toLowerCase()).map((piece) => [piece, piece.holder.visible]);
        u.energyShots = [];
        const energyMaterial = new T.MeshBasicMaterial({ color: 0xf3fbff, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false });
        for (const [index, sq] of (u.energySquares || []).entries()) {
          const ball = new T.Mesh(new T.SphereGeometry(0.15, 12, 10), energyMaterial.clone());
          ball.visible = false; u.fx.add(ball);
          u.energyShots.push({ ball, target: this.sqToPos(sq), victim: this.chars.get(sq), index });
        }
        u.whiteFlames = [];
        for (const [index, sq] of (u.whiteFlameSquares || []).entries()) {
          const pos = this.sqToPos(sq), group = new T.Group();
          group.position.set(pos.x, 0.03, pos.z); group.visible = false; u.fx.add(group);
          const height = 1.5;
          const flame = new T.Mesh(
            new T.ConeGeometry(0.27, height, 8, 1, true),
            new T.MeshBasicMaterial({ color: 0xf4fcff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }),
          );
          flame.position.y = height / 2;
          flame.userData.base = height; flame.userData.phase = index * 1.7;
          group.add(flame);
          const queenPos = this.sqToPos(u.attackerTo);
          const distance = Math.hypot(pos.x - queenPos.x, pos.z - queenPos.z);
          u.whiteFlames.push({ group, flame, start: 0.65 + distance * 0.12 });
        }
        u.whiteBeam = new T.Group();
        u.whiteBeam.position.set(u.target.x, 0, u.target.z); u.whiteBeam.visible = false; u.fx.add(u.whiteBeam);
        const beamOuter = new T.Mesh(new T.ConeGeometry(0.72, 11, 12, 1, true), new T.MeshBasicMaterial({ color: 0xe9f7ff, transparent: true, opacity: 0.78, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
        beamOuter.position.y = 5.5; u.whiteBeam.add(beamOuter);
        const beamCore = new T.Mesh(new T.CylinderGeometry(0.12, 0.24, 10.8, 12), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, blending: T.AdditiveBlending, depthWrite: false }));
        beamCore.position.y = 5.4; u.whiteBeam.add(beamCore);
        u.crackLines = [];
        const crackMaterial = new T.LineBasicMaterial({ color: 0x18202d, transparent: true, opacity: 0, depthWrite: false });
        const center = this.sqToPos(u.to);
        for (let i = 0; i < 9; i++) {
          const angle = i * Math.PI * 2 / 9 + (Math.random() - 0.5) * 0.22;
          const edgeDistance = Math.min(3.9 / Math.max(0.01, Math.abs(Math.cos(angle))), 3.9 / Math.max(0.01, Math.abs(Math.sin(angle))));
          const points = [new T.Vector3(center.x, 0.055, center.z)];
          for (let j = 1; j <= 7; j++) {
            const distance = edgeDistance * j / 7;
            points.push(new T.Vector3(
              Math.max(-3.9, Math.min(3.9, center.x + Math.cos(angle) * distance + (j < 7 ? (Math.random() - 0.5) * 0.24 : 0))),
              0.055,
              Math.max(-3.9, Math.min(3.9, center.z + Math.sin(angle) * distance + (j < 7 ? (Math.random() - 0.5) * 0.24 : 0))),
            ));
          }
          const crack = new T.Line(new T.BufferGeometry().setFromPoints(points), crackMaterial.clone());
          crack.userData.delay = 3.15 + Math.random() * 0.45; u.fx.add(crack); u.crackLines.push(crack);
        }
        u.energyLight = new T.PointLight(0xd9f2ff, 0, 12, 2); u.energyLight.position.set(u.target.x, 4.5, u.target.z); this.scene.add(u.energyLight);
      } else if (kind === 'q') {
        // La Dame reste sur l’échiquier : la Banshee est invoquée comme entité distincte.
        u.blackBanshee = this.makeBlackBanshee(); u.fx.add(u.blackBanshee);
        u.blackBansheeBaseScale = this.formScaleMatchingActor(actor, u.blackBanshee);
        u.floatH = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y * 0.95; // flotte à hauteur des têtes
        u.blackBanshee.scale.setScalar(0.05);
        const summonPos = this.sqToPos(u.attackerTo);
        u.blackBanshee.position.set(summonPos.x, 0, summonPos.z);
        u.sky = {
          background: this.scene.background && this.scene.background.isColor ? this.scene.background.clone() : null,
          fog: this.scene.fog && this.scene.fog.color ? this.scene.fog.color.clone() : null,
          sun: this.sun.intensity, hemi: this.hemi.intensity, exposure: this.renderer.toneMappingExposure,
        };
        u.clouds = new T.Group(); u.clouds.position.set(u.target.x, 5.2, u.target.z); u.fx.add(u.clouds);
        for (let i = 0; i < 20; i++) {
          const puff = new T.Mesh(
            new T.SphereGeometry(0.85 + (i % 4) * 0.16, 12, 9),
            new T.MeshStandardMaterial({ color: i % 3 ? 0x100d18 : 0x211a2a, roughness: 1, transparent: true, opacity: 0, depthWrite: false }),
          );
          const angle = i * 2.399, radius = 0.35 + (i % 5) * 0.42;
          puff.position.set(Math.cos(angle) * radius, (i % 3) * 0.14, Math.sin(angle) * radius);
          puff.scale.set(1.2, 0.42, 0.85); puff.userData.baseY = puff.position.y;
          u.clouds.add(puff);
        }
        const flameVictims = (u.flameSquares || [])
          .map((sq) => this.chars.get(sq))
          .filter((piece) => piece && piece !== king && piece.piece === piece.piece.toUpperCase());
        u.flameVictims = flameVictims.map((character, index) => ({
          character,
          start: 1.35 + 1.8 * index / Math.max(1, flameVictims.length - 1),
          position: character.parts.root.position.clone(),
          scale: character.parts.root.scale.clone(),
          visible: character.holder.visible,
          phase: index * 1.73,
        }));
        u.blackFlames = [];
        const material = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
        for (const sq of u.flameSquares || []) {
          const pos = this.sqToPos(sq), column = sq === u.to, group = new T.Group();
          group.position.set(pos.x, 0, pos.z); u.fx.add(group);
          const heights = column ? [8.5, 12.5] : [0.42 + Math.random() * 0.16, 0.68 + Math.random() * 0.22];
          heights.forEach((height, i) => {
            const flame = new T.Mesh(new T.ConeGeometry(column ? 0.42 - i * 0.1 : 0.16 - i * 0.035, height, 8, 1, true), material(i ? 0x351146 : 0x09050d, column ? 0.92 : 0.9));
            flame.position.set((i ? 0.06 : 0), height / 2, i ? -0.04 : 0); flame.userData.base = height; flame.userData.phase = sq * 0.31 + i * 2.2; group.add(flame);
            if (column && i === 1) {
              const core = new T.Mesh(new T.ConeGeometry(0.13, 9.5, 7, 1, true), material(0x69228a, 0.78));
              core.position.y = 4.75; core.userData.base = 9.5; core.userData.phase = sq; group.add(core);
            }
          });
          u.blackFlames.push(group);
        }
        const queenPos = this.sqToPos(u.attackerTo);
        for (let i = 0; i < 9; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.12 + (i % 3) * 0.04, 0.65 + (i % 2) * 0.24, 7), material(i % 2 ? 0x4a175f : 0x08040c, 0.95));
          const angle = i * Math.PI * 2 / 9;
          flame.position.set(queenPos.x + Math.cos(angle) * 0.48, 0.35, queenPos.z + Math.sin(angle) * 0.48);
          flame.userData.phase = i * 1.7; flame.userData.base = flame.geometry.parameters.height;
          u.fx.add(flame); u.blackFlames.push(flame);
        }
        u.fireLight = new T.PointLight(0x581270, 0, 10, 2); u.fireLight.position.set(queenPos.x, 2, queenPos.z); this.scene.add(u.fireLight);
        u.columnLight = new T.PointLight(0x69228a, 0, 18, 2); u.columnLight.position.set(u.target.x, 5.5, u.target.z); this.scene.add(u.columnLight);
      } else if (kind === 'k' && u.piece === 'k') {
        actor.parts.root.visible = false;
        u.susanoo = this.makeSusanoo(); actor.holder.add(u.susanoo); u.susanoo.scale.setScalar(0.05);
        // Deux météorites invoquées, qui s'écrasent l'une après l'autre de part et d'autre du samouraï.
        u.meteors = [{ x: -2.1, z: -1.5, start: 1.15, impact: 3.45 }, { x: 2.0, z: 1.7, start: 1.75, impact: 4.15 }].map((spec) => {
          const group = new T.Group();
          const rock = new T.Mesh(new T.IcosahedronGeometry(1.18, 1), new T.MeshStandardMaterial({ color: 0x30251f, roughness: 0.96, emissive: 0x641a08, emissiveIntensity: 0.7 }));
          rock.scale.set(1, 0.82, 1.08); group.add(rock);
          const core = new T.Mesh(new T.SphereGeometry(0.74, 16, 12), new T.MeshBasicMaterial({ color: 0xff7625, transparent: true, opacity: 0.68, blending: T.AdditiveBlending, depthWrite: false }));
          group.add(core);
          const flames = [];
          for (let i = 0; i < 12; i++) {
            const flame = new T.Mesh(new T.ConeGeometry(0.16 + (i % 3) * 0.06, 1.05 + (i % 4) * 0.28, 7), new T.MeshBasicMaterial({ color: i % 2 ? 0xff3a0b : 0xffc14b, transparent: true, opacity: 0.84, blending: T.AdditiveBlending, depthWrite: false }));
            const angle = i * Math.PI * 2 / 12;
            flame.position.set(Math.cos(angle) * 0.74, 0.45 + (i % 3) * 0.12, Math.sin(angle) * 0.74);
            flame.rotation.z = Math.cos(angle) * 0.6; group.add(flame); flames.push(flame);
          }
          // Arrivée en biais depuis le ciel, du côté opposé à l'impact.
          const from = { x: spec.x * 2.4, y: 13, z: spec.z * 2.4 };
          group.position.set(from.x, from.y, from.z); u.fx.add(group);
          const shockwave = new T.Mesh(new T.RingGeometry(0.8, 1, 48), new T.MeshBasicMaterial({ color: 0xff8a32, transparent: true, opacity: 0, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
          shockwave.rotation.x = -Math.PI / 2; shockwave.position.set(spec.x, 0.025, spec.z); shockwave.scale.setScalar(0.01); u.fx.add(shockwave);
          return { ...spec, from, group, flames, shockwave };
        });
        u.fireLight = new T.PointLight(0xff5b1b, 0, 16, 2); u.fireLight.position.set(0, 2, 0); this.scene.add(u.fireLight);
        u.debris = [];
        for (let i = 0; i < 48; i++) {
          const rubble = new T.Mesh(new T.DodecahedronGeometry(0.22 + Math.random() * 0.24, 0), new T.MeshStandardMaterial({ color: i % 3 ? 0x302820 : 0x5d3d2a, roughness: 1, emissive: 0x431407, emissiveIntensity: 0.42 }));
          rubble.visible = false;
          const fire = new T.Mesh(new T.ConeGeometry(0.12 + Math.random() * 0.08, 0.6 + Math.random() * 0.5, 6), new T.MeshBasicMaterial({ color: i % 2 ? 0xff4a12 : 0xffae32, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false }));
          fire.position.y = 0.34; rubble.add(fire); rubble.userData.fire = fire;
          u.fx.add(rubble); u.debris.push(rubble);
        }
      } else if (kind === 'k') {
        actor.parts.root.visible = false;
        u.fox = this.makeGiantFox();
        u.fox.scale.setScalar(0.05); actor.holder.add(u.fox);
        const sphereMat = new T.MeshStandardMaterial({ color: 0x05040a, emissive: 0x100a1d, roughness: 0.18, metalness: 0.25 });
        u.energy = new T.Mesh(new T.SphereGeometry(1, 32, 24), sphereMat);
        u.energy.position.set(0, 6.4, 0); u.energy.scale.setScalar(0.08); u.fx.add(u.energy);
        u.energyHalo = new T.Mesh(new T.SphereGeometry(1.25, 24, 16), new T.MeshBasicMaterial({ color: 0x261333, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false }));
        u.energy.add(u.energyHalo);
        u.energyRings = [];
        for (let i = 0; i < 3; i++) {
          const ring = new T.Mesh(new T.TorusGeometry(1.25 + i * 0.28, 0.025, 8, 48), new T.MeshBasicMaterial({ color: i % 2 ? 0x4a1d5c : 0x18121f, transparent: true, opacity: 0.72, blending: T.AdditiveBlending }));
          ring.rotation.set(i * 0.7, i * 0.9, i * 0.4); u.energy.add(ring); u.energyRings.push(ring);
        }
        u.shockwave = new T.Mesh(new T.RingGeometry(0.8, 1, 48), new T.MeshBasicMaterial({ color: 0x17101c, transparent: true, opacity: 0.95, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
        u.shockwave.rotation.x = -Math.PI / 2; u.shockwave.position.y = 0.025; u.shockwave.scale.setScalar(0.01); u.fx.add(u.shockwave);
        u.fireLight = new T.PointLight(0xff4c16, 0, 10, 2); u.fireLight.position.set(0, 1.5, 0); this.scene.add(u.fireLight);
        u.fireColumns = [];
        for (let i = 0; i < 14; i++) {
          const flame = new T.Mesh(new T.ConeGeometry(0.16 + (i % 3) * 0.05, 0.65 + (i % 4) * 0.25, 7), new T.MeshBasicMaterial({ color: i % 2 ? 0xff4716 : 0xffb52a, transparent: true, opacity: 0.82, blending: T.AdditiveBlending, depthWrite: false }));
          const angle = i * Math.PI * 2 / 14, radius = 0.8 + (i % 3) * 0.34;
          flame.position.set(Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius); u.fx.add(flame); u.fireColumns.push(flame);
        }
        u.debris = [];
        for (let i = 0; i < 32; i++) {
          const rubble = new T.Mesh(new T.DodecahedronGeometry(0.12 + Math.random() * 0.2, 0), new T.MeshStandardMaterial({ color: i % 3 ? 0x342a25 : 0x625044, roughness: 1 }));
          rubble.visible = false; u.fx.add(rubble); u.debris.push(rubble);
        }
      }
    }

    formScaleMatchingActor(actor, form) {
      const T = this.THREE;
      actor.parts.root.updateMatrixWorld(true);
      const actorHeight = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y;
      form.scale.setScalar(1); actor.holder.updateMatrixWorld(true); form.updateMatrixWorld(true);
      const formHeight = new T.Box3().setFromObject(form).getSize(new T.Vector3()).y;
      return actorHeight / Math.max(formHeight, 0.001);
    }

    makeGiantFox() {
      const T = this.THREE, fox = new T.Group();
      const coat = new T.MeshStandardMaterial({ color: 0xc84c18, roughness: 0.83, emissive: 0x2b0800 });
      const cream = new T.MeshStandardMaterial({ color: 0xf0d6af, roughness: 0.9 });
      const dark = new T.MeshStandardMaterial({ color: 0x191316, roughness: 0.65 });
      const gold = new T.MeshBasicMaterial({ color: 0xffd44f });
      const sphere = (parent, material, position, scale) => { const mesh = new T.Mesh(new T.SphereGeometry(1, 20, 14), material); mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh; };
      sphere(fox, coat, [0, 0.65, 0], [0.72, 0.78, 1.05]);
      sphere(fox, cream, [0, 0.55, 0.68], [0.43, 0.52, 0.48]);
      sphere(fox, coat, [0, 1.45, 0.38], [0.57, 0.52, 0.55]);
      sphere(fox, cream, [0, 1.29, 0.83], [0.36, 0.24, 0.38]);
      sphere(fox, dark, [0, 1.36, 1.16], [0.13, 0.1, 0.12]);
      for (const side of [-1, 1]) {
        const ear = new T.Mesh(new T.ConeGeometry(0.23, 0.72, 5), coat); ear.position.set(side * 0.36, 2.03, 0.27); ear.rotation.z = side * -0.24; fox.add(ear);
        const inner = new T.Mesh(new T.ConeGeometry(0.11, 0.44, 5), cream); inner.position.set(side * 0.36, 2.02, 0.31); inner.rotation.z = side * -0.24; fox.add(inner);
        sphere(fox, gold, [side * 0.24, 1.52, 0.82], [0.09, 0.075, 0.045]);
        sphere(fox, dark, [side * 0.24, 1.52, 0.86], [0.025, 0.064, 0.02]);
      }
      for (const x of [-0.46, 0.46]) for (const z of [-0.6, 0.65]) {
        const leg = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 0.8, 10), coat); leg.position.set(x, 0.12, z); fox.add(leg);
        sphere(fox, dark, [x, -0.27, z + 0.06], [0.22, 0.12, 0.3]);
      }
      const tail = new T.Mesh(new T.ConeGeometry(0.42, 1.8, 10), coat); tail.position.set(0, 0.78, -1.35); tail.rotation.x = Math.PI / 2.8; fox.add(tail);
      sphere(fox, cream, [0, 0.38, -1.92], [0.32, 0.33, 0.26]);
      fox.userData.coat = coat;
      return fox;
    }

    makeBlackBanshee() {
      const T = this.THREE, banshee = new T.Group();
      const robe = new T.MeshStandardMaterial({ color: 0x100b18, roughness: 0.86, emissive: 0x210b2f });
      const edge = new T.MeshBasicMaterial({ color: 0x652187 });
      const face = new T.MeshStandardMaterial({ color: 0x211726, roughness: 0.9 });
      const eye = new T.MeshBasicMaterial({ color: 0xd18cff });
      const wisps = [];
      const body = new T.Mesh(new T.ConeGeometry(0.62, 1.4, 12), robe); body.position.y = 0.72; banshee.add(body);
      const head = new T.Mesh(new T.SphereGeometry(0.32, 18, 14), face); head.position.set(0, 1.55, 0.08); banshee.add(head);
      const hood = new T.Mesh(new T.ConeGeometry(0.45, 0.72, 8), robe); hood.position.set(0, 1.77, -0.02); banshee.add(hood);
      const veil = new T.Mesh(new T.ConeGeometry(0.3, 0.85, 9), edge); veil.position.set(0, 1.14, -0.08); banshee.add(veil);
      for (const side of [-1, 1]) {
        const arm = new T.Mesh(new T.CylinderGeometry(0.1, 0.17, 0.86, 8), robe); arm.position.set(side * 0.54, 1.1, 0.04); arm.rotation.z = side * -0.72; banshee.add(arm);
        const wisp = new T.Mesh(new T.ConeGeometry(0.16, 1.0, 6), edge); wisp.position.set(side * 0.7, 0.6, -0.16); wisp.rotation.z = side * -0.45; wisp.userData.baseRotation = wisp.rotation.z; banshee.add(wisp); wisps.push(wisp);
        const eyeMesh = new T.Mesh(new T.SphereGeometry(0.055, 8, 6), eye); eyeMesh.position.set(side * 0.13, 1.58, 0.36); banshee.add(eyeMesh);
      }
      banshee.userData.wisps = wisps;
      return banshee;
    }

    makeWhiteAngel() {
      const T = this.THREE, angel = new T.Group();
      const robe = new T.MeshStandardMaterial({ color: 0xf5f8ff, roughness: 0.48, metalness: 0.08, emissive: 0x6b7ca8, emissiveIntensity: 0.22 });
      const silver = new T.MeshStandardMaterial({ color: 0xc8d9f5, roughness: 0.38, metalness: 0.42, emissive: 0x5a83c4, emissiveIntensity: 0.28 });
      const skin = new T.MeshStandardMaterial({ color: 0xf1dfd0, roughness: 0.82 });
      const glow = new T.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.92, blending: T.AdditiveBlending, depthWrite: false });
      const sphere = (parent, material, position, scale) => {
        const mesh = new T.Mesh(new T.SphereGeometry(1, 18, 14), material);
        mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
      };
      const gown = new T.Mesh(new T.ConeGeometry(0.62, 1.55, 12), robe); gown.position.y = 0.78; angel.add(gown);
      sphere(angel, robe, [0, 1.43, 0], [0.36, 0.56, 0.3]);
      sphere(angel, skin, [0, 2.02, 0.05], [0.25, 0.3, 0.23]);
      const hair = new T.Mesh(new T.SphereGeometry(0.28, 16, 12), silver); hair.position.set(0, 2.17, -0.04); hair.scale.set(1, 0.75, 0.9); angel.add(hair);
      const halo = new T.Mesh(new T.TorusGeometry(0.39, 0.045, 10, 48), glow); halo.position.set(0, 2.52, -0.02); angel.add(halo);
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.24, 1.62, -0.16); wing.rotation.y = side * -0.18; angel.add(wing);
        const span = new T.Mesh(new T.SphereGeometry(1, 16, 12), robe); span.position.set(side * 0.62, 0.12, -0.03); span.scale.set(0.72, 0.23, 0.12); wing.add(span);
        for (let i = 0; i < 6; i++) {
          const feather = new T.Mesh(new T.ConeGeometry(0.14, 0.72 + (i % 3) * 0.12, 7), i % 2 ? silver : robe);
          feather.position.set(side * (0.3 + i * 0.19), -0.08 - i * 0.025, -0.04);
          feather.rotation.z = side * (Math.PI / 2 + 0.16 + i * 0.035); wing.add(feather);
        }
        wings.push(wing);
      }
      angel.userData.wings = wings;
      angel.userData.halo = halo;
      return angel;
    }

    makeSusanoo() {
      const T = this.THREE, warrior = new T.Group();
      const armor = new T.MeshStandardMaterial({ color: 0x123e83, roughness: 0.3, metalness: 0.58, emissive: 0x071e54, emissiveIntensity: 0.7 });
      const edge = new T.MeshStandardMaterial({ color: 0x62caff, roughness: 0.22, metalness: 0.42, emissive: 0x197fff, emissiveIntensity: 1.2 });
      const dark = new T.MeshStandardMaterial({ color: 0x10192e, roughness: 0.4, metalness: 0.48 });
      const sphere = (parent, material, position, scale) => {
        const mesh = new T.Mesh(new T.SphereGeometry(1, 16, 12), material);
        mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
      };
      const torso = new T.Mesh(new T.BoxGeometry(1.05, 1.28, 0.58), armor); torso.position.y = 1.28; warrior.add(torso);
      const chest = new T.Mesh(new T.BoxGeometry(0.76, 0.43, 0.1), edge); chest.position.set(0, 1.53, 0.33); warrior.add(chest);
      const skirt = new T.Mesh(new T.ConeGeometry(0.78, 0.75, 8), dark); skirt.position.y = 0.64; skirt.rotation.x = Math.PI; warrior.add(skirt);
      sphere(warrior, armor, [0, 2.18, 0.05], [0.38, 0.42, 0.34]);
      const mask = new T.Mesh(new T.BoxGeometry(0.44, 0.2, 0.12), edge); mask.position.set(0, 2.13, 0.33); warrior.add(mask);
      const helmet = new T.Mesh(new T.CylinderGeometry(0.17, 0.42, 0.48, 8), dark); helmet.position.set(0, 2.53, 0.01); warrior.add(helmet);
      for (const side of [-1, 1]) {
        const horn = new T.Mesh(new T.ConeGeometry(0.16, 0.8, 6), edge); horn.position.set(side * 0.35, 2.72, -0.02); horn.rotation.z = side * -0.45; warrior.add(horn);
        const shoulder = new T.Mesh(new T.BoxGeometry(0.78, 0.34, 0.54), armor); shoulder.position.set(side * 0.68, 1.86, 0); shoulder.rotation.z = side * -0.12; warrior.add(shoulder);
        const arm = new T.Mesh(new T.CylinderGeometry(0.18, 0.23, 0.9, 8), dark); arm.position.set(side * 0.74, 1.25, 0.08); arm.rotation.z = side * 0.14; warrior.add(arm);
        const leg = new T.Mesh(new T.CylinderGeometry(0.2, 0.27, 0.92, 8), armor); leg.position.set(side * 0.3, 0.05, 0); warrior.add(leg);
      }
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.46, 1.72, -0.26); warrior.add(wing);
        for (let i = 0; i < 7; i++) {
          const feather = new T.Mesh(new T.ConeGeometry(0.17, 1.1 + (i % 3) * 0.18, 6), i % 2 ? edge : armor);
          feather.position.set(side * (0.28 + i * 0.2), 0.1 + i * 0.035, -0.04);
          feather.rotation.z = side * (Math.PI / 2 + 0.18 + i * 0.045); wing.add(feather);
        }
        wings.push(wing);
      }
      warrior.userData.wings = wings;
      warrior.userData.armor = armor;
      return warrior;
    }

    makePhoenix() {
      const T = this.THREE, bird = new T.Group(), flames = [];
      const plumage = new T.MeshStandardMaterial({ color: 0xe8500e, roughness: 0.55, emissive: 0xb02800, emissiveIntensity: 0.5 });
      const gold = new T.MeshStandardMaterial({ color: 0xffb22a, roughness: 0.4, emissive: 0xc06a00, emissiveIntensity: 0.4 });
      const eye = new T.MeshBasicMaterial({ color: 0xfff6c8 });
      // Mélange normal : les flammes restent orangées même sur un décor clair.
      const fire = (color, opacity = 0.88) => new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide });
      const sphere = (parent, material, position, scale) => { const m = new T.Mesh(new T.SphereGeometry(1, 18, 14), material); m.position.set(...position); m.scale.set(...scale); parent.add(m); return m; };
      sphere(bird, plumage, [0, 0.95, 0], [0.26, 0.3, 0.42]);
      sphere(bird, gold, [0, 0.9, 0.22], [0.2, 0.24, 0.24]);
      const neck = sphere(bird, plumage, [0, 1.22, 0.3], [0.14, 0.2, 0.14]); neck.rotation.x = -0.4;
      sphere(bird, plumage, [0, 1.42, 0.38], [0.16, 0.15, 0.18]);
      const beak = new T.Mesh(new T.ConeGeometry(0.06, 0.22, 8), gold); beak.position.set(0, 1.38, 0.6); beak.rotation.x = Math.PI / 2 + 0.25; bird.add(beak);
      for (const side of [-1, 1]) sphere(bird, eye, [side * 0.09, 1.46, 0.5], [0.03, 0.03, 0.02]);
      // Crête de flammes sur la tête.
      for (let i = 0; i < 4; i++) {
        const crest = new T.Mesh(new T.ConeGeometry(0.045, 0.32 + i * 0.05, 6), fire(i % 2 ? 0xffd04a : 0xff4a12));
        crest.position.set(0, 1.62 + i * 0.02, 0.36 - i * 0.09); crest.rotation.x = -0.5 - i * 0.18; bird.add(crest); flames.push(crest);
      }
      // Longue queue de flammes.
      for (let i = 0; i < 9; i++) {
        const len = 1.5 + (i % 3) * 0.35;
        const tail = new T.Mesh(new T.ConeGeometry(0.075, len, 7), fire(i % 3 === 0 ? 0xff3a0b : i % 3 === 1 ? 0xffb52a : 0xff7a1a));
        tail.position.set((i - 4) * 0.055, 0.66, -0.35 - len / 2); tail.rotation.x = -Math.PI / 2 - 0.3; tail.rotation.z = (i - 4) * 0.08; bird.add(tail); flames.push(tail);
      }
      // Ailes : plumes ardentes articulées depuis l'épaule.
      const wings = [];
      for (const side of [-1, 1]) {
        const wing = new T.Group(); wing.position.set(side * 0.2, 1.05, -0.02); wing.userData.side = side; bird.add(wing);
        sphere(wing, plumage, [side * 0.38, 0, 0], [0.42, 0.06, 0.2]);
        for (let i = 0; i < 8; i++) {
          const feather = new T.Mesh(new T.ConeGeometry(0.09, 0.62 + i * 0.05, 6), fire(i % 2 ? 0xff5a12 : 0xffc14b));
          feather.position.set(side * (0.18 + i * 0.13), -0.05 - i * 0.012, -0.12);
          feather.rotation.x = -Math.PI / 2 + 0.25; feather.rotation.z = side * (0.15 + i * 0.05); wing.add(feather); flames.push(feather);
        }
        wings.push(wing);
      }
      for (const side of [-1, 1]) {
        const claw = new T.Mesh(new T.ConeGeometry(0.04, 0.32, 6), gold); claw.position.set(side * 0.1, 0.56, 0.05); claw.rotation.x = Math.PI; bird.add(claw);
      }
      flames.forEach((f, i) => { f.userData.phase = i * 1.37; });
      bird.userData = { wings, flames, plumage };
      return bird;
    }

    devastateForFox(u) {
      if (u.apocalypse) return;
      const T = this.THREE;
      u.apocalypse = {
        background: this.scene.background && this.scene.background.clone(), fog: this.scene.fog,
        floorY: this.floor.position.y, floorColor: this.floor.material.color.clone(),
        hemi: this.hemi.intensity, sun: this.sun.intensity,
        visibility: [this.boardMesh, this.base, this.terrainGroup, ...(this.animalGroup ? [this.animalGroup] : []), ...(this.backdrop ? [this.backdrop] : []), this.overlay, this.weatherGroup, this.mateFireGroup, this.checkGroup].map((o) => [o, o.visible]),
        chars: [...this.chars.values()].map((c) => [c, c.holder.visible]),
        dying: this.dying.map((d) => [d.c.holder, d.c.holder.visible]),
        scars: this.captureScars.map((s) => [s.object, s.object.visible]),
        spark: this.spark && this.spark.visible,
      };
      this.boardMesh.visible = false; this.base.visible = false; this.terrainGroup.visible = false; if (this.animalGroup) this.animalGroup.visible = false; if (this.backdrop) this.backdrop.visible = false;
      this.overlay.visible = false; this.weatherGroup.visible = false; this.mateFireGroup.visible = false; this.checkGroup.visible = false;
      for (const c of this.chars.values()) c.holder.visible = c === u.actor;
      this.dying.forEach((d) => { d.c.holder.visible = false; });
      this.captureScars.forEach((s) => { s.object.visible = false; });
      if (this.spark) this.spark.visible = false;
      this.floor.position.y = -0.03; this.floor.material.color.setHex(0x211a17);
      this.scene.background = new T.Color(0x120c10);
      this.scene.fog = new T.Fog(0x21100c, 8, 38);
      this.hemi.intensity = 0.48; this.sun.intensity = 0.22;
      this.scene.add(u.fx);
      this.shakeUntil = this.now() + 1.3; this.shakeAmp = 0.3;
    }

    restoreFoxWorld(u) {
      const a = u && u.apocalypse;
      if (!a) return;
      this.scene.background = a.background;
      this.scene.fog = a.fog;
      this.floor.position.y = a.floorY; this.floor.material.color.copy(a.floorColor);
      this.hemi.intensity = a.hemi; this.sun.intensity = a.sun;
      a.visibility.forEach(([object, visible]) => { object.visible = visible; });
      a.chars.forEach(([character, visible]) => { character.holder.visible = visible; });
      a.dying.forEach(([object, visible]) => { object.visible = visible; });
      a.scars.forEach(([object, visible]) => { object.visible = visible; });
      if (this.spark && a.spark != null) this.spark.visible = a.spark;
    }

    tickMateUltimate(c, t, M) {
      const T = this.THREE;
      const u = this.mateUltimate;
      if (!u || t < u.start || (c !== u.actor && c !== u.king)) return false;
      if (u.themed) return this.tickThemeMate(c, t, M, u);
      const kind = u.piece.toLowerCase(), e = t - u.start, target = u.target;
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const actor = u.actor, king = u.king;
      if (kind === 'q' && u.piece === 'Q') {
        const queenPos = this.sqToPos(u.attackerTo);
        if (c === actor) {
          c.anim = null; c.holder.position.set(queenPos.x, 0, queenPos.z); c.parts.root.visible = true;
          const grow = smooth(e / 0.9);
          u.angel.scale.setScalar(0.05 + grow * u.angelBaseScale);
          u.angel.position.set(queenPos.x, grow * u.floatH + Math.sin(t * 3.2) * 0.08, queenPos.z);
          u.angel.userData.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * (0.12 + Math.sin(t * 5.2 + i) * 0.25); });
          u.angel.userData.halo.rotation.y = t * 1.4;
          for (const shot of u.energyShots || []) {
            const launch = 0.82 + shot.index * 0.075;
            const progress = clamp((e - launch) / 0.58);
            shot.ball.visible = e >= launch && progress < 1;
            shot.ball.position.set(
              queenPos.x + (shot.target.x - queenPos.x) * progress,
              1.85 + Math.sin(progress * Math.PI) * 0.5,
              queenPos.z + (shot.target.z - queenPos.z) * progress,
            );
            if (progress >= 1 && !shot.hit) {
              shot.hit = true;
              if (shot.victim) shot.victim.holder.visible = false;
            }
          }
          for (const fire of u.whiteFlames || []) {
            const age = e - fire.start;
            fire.group.visible = age > 0;
            const grow = smooth(age / 0.3);
            const flicker = 0.78 + Math.abs(Math.sin(t * 15 + fire.flame.userData.phase)) * 0.55;
            fire.flame.scale.y = grow * flicker;
            fire.flame.position.y = fire.flame.userData.base * fire.flame.scale.y / 2;
            fire.flame.material.opacity = grow * (0.58 + Math.abs(Math.sin(t * 12 + fire.flame.userData.phase)) * 0.32);
          }
          const beamGrow = smooth((e - 2.05) / 0.72);
          u.whiteBeam.visible = beamGrow > 0;
          u.whiteBeam.scale.y = Math.max(0.015, beamGrow);
          if (u.energyLight) u.energyLight.intensity = e > 2 ? 2 + Math.abs(Math.sin(t * 10)) * 5 : grow * 1.4;
          if (u.crackLines) u.crackLines.forEach((line) => { line.material.opacity = smooth((e - line.userData.delay) / 0.55) * 0.9; });
          if (e > 3.6) {
            this.shakeUntil = t + 0.035; this.shakeAmp = 0.045;
            for (const enemy of this.chars.values()) if (enemy.piece === enemy.piece.toLowerCase()) enemy.holder.visible = false;
          }
        } else if (c === king) {
          c.anim = null;
          const vanish = smooth((e - 2.55) / 1.65);
          c.parts.root.position.y = Math.sin(t * 24) * 0.08 + vanish * 0.15;
          c.parts.root.scale.set(u.kingBase.scale.x * (1 - vanish), u.kingBase.scale.y * (1 - vanish), u.kingBase.scale.z * (1 - vanish));
          if (e > 2.4) { this.shakeUntil = t + 0.035; this.shakeAmp = 0.035; }
        }
        return true;
      }
      if (kind === 'q') {
        const queenPos = this.sqToPos(u.attackerTo);
        if (c === actor) {
          c.anim = null; c.holder.position.set(queenPos.x, 0, queenPos.z); c.parts.root.visible = true;
          const grow = smooth(e / 0.9);
          u.blackBanshee.scale.setScalar(Math.max(0.05, grow * u.blackBansheeBaseScale));
          const approach = smooth((e - 0.85) / 1.35);
          u.blackBanshee.position.set(
            queenPos.x + (target.x - queenPos.x) * approach,
            grow * u.floatH + Math.sin(t * 3.2) * 0.08 + Math.sin(approach * Math.PI) * 0.7,
            queenPos.z + (target.z - queenPos.z) * approach,
          );
          const dx = target.x - queenPos.x, dz = target.z - queenPos.z;
          u.blackBanshee.rotation.y = Math.atan2(dx, dz) + Math.sin(t * 1.8) * 0.16;
          u.blackBanshee.userData.wisps.forEach((wisp, i) => {
            wisp.rotation.z = wisp.userData.baseRotation + Math.sin(t * 5.2 + i) * 0.24;
          });
          const dim = clamp(e / 0.8) * (1 - clamp((e - (u.duration - 0.7)) / 0.7));
          if (u.sky) {
            this.skyDim = dim;
            const night = new T.Color(0x07040c);
            if (u.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(u.sky.background).lerp(night, dim * 0.9);
            if (u.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(u.sky.fog).lerp(night, dim * 0.85);
            if (!this.weather) { this.sun.intensity = u.sky.sun * (1 - 0.85 * dim); this.hemi.intensity = u.sky.hemi * (1 - 0.75 * dim); }
            this.renderer.toneMappingExposure = u.sky.exposure * (1 - 0.45 * dim);
          }
          u.clouds.rotation.y = t * 0.12;
          u.clouds.children.forEach((puff, i) => {
            puff.material.opacity = 0.88 * dim;
            puff.position.y = puff.userData.baseY + Math.sin(t * 1.3 + i) * 0.09;
          });
          if (u.fireLight) u.fireLight.intensity = 1.1 + Math.abs(Math.sin(t * 8)) * 1.8;
          if (u.columnLight) u.columnLight.intensity = 1.4 + Math.abs(Math.sin(t * 11)) * 3.2;
        } else if (c === king) {
          c.anim = null;
          const burn = smooth((e - 1.5) / 3.6);
          c.parts.root.position.y = u.kingBase.position.y + Math.sin(t * 26) * 0.12 + burn * 0.1;
          c.parts.root.scale.set(u.kingBase.scale.x * (1 - burn), u.kingBase.scale.y * (1 - burn), u.kingBase.scale.z * (1 - burn));
          if (burn >= 1) c.holder.visible = false;
          if (e > 2.2) { this.shakeUntil = t + 0.035; this.shakeAmp = 0.035; }
        }
        if (c === actor) for (const victim of u.flameVictims || []) {
          const burn = smooth((e - victim.start) / 0.85);
          if (burn <= 0) continue;
          const root = victim.character.parts.root;
          root.position.y = victim.position.y + Math.sin(t * 24 + victim.phase) * 0.045 + burn * 0.12;
          root.scale.set(victim.scale.x * (1 - burn), victim.scale.y * (1 - burn), victim.scale.z * (1 - burn));
          if (burn >= 1) victim.character.holder.visible = false;
        }
        if (u.blackFlames) for (const item of u.blackFlames) {
          const flames = item.isGroup ? item.children : [item];
          for (const flame of flames) {
            const flicker = 0.78 + Math.abs(Math.sin(t * 13 + flame.userData.phase)) * 0.6;
            flame.scale.y = flicker;
            flame.position.y = flame.userData.base * flicker / 2;
            if (flame.material) flame.material.opacity = Math.min(1, (flame.material.opacity > 0.5 ? 0.82 : 0.72) + Math.sin(t * 19 + flame.userData.phase) * 0.12);
          }
        }
        return true;
      }
      if (kind === 'k' && u.piece === 'k') {
        const impactAt = u.meteors[0].impact;
        if (c === actor) {
          c.anim = null; c.holder.position.set(0, 0, 0); c.holder.rotation.y = Math.sin(t * 0.42) * 0.12;
          c.parts.root.visible = false;
          const grow = smooth(e / 1.2);
          u.susanoo.visible = true; u.susanoo.scale.setScalar(0.05 + grow * 1.2);
          u.susanoo.rotation.y = Math.sin(t * 0.55) * 0.08;
          u.susanoo.userData.armor.emissiveIntensity = 0.55 + Math.abs(Math.sin(t * 8)) * 0.7;
          u.susanoo.userData.wings.forEach((wing, i) => { wing.rotation.z = (i ? -1 : 1) * (0.08 + Math.sin(t * 4.5 + i) * 0.18); });
          let shake = 0;
          for (const m of u.meteors) {
            const descent = smooth((e - m.start) / (m.impact - m.start));
            m.group.visible = e < m.impact;
            m.group.position.set(m.from.x + (m.x - m.from.x) * descent, m.from.y + (1.4 - m.from.y) * descent, m.from.z + (m.z - m.from.z) * descent);
            m.group.rotation.set(t * 0.72, t * 0.55, t * 0.68);
            m.flames.forEach((flame, i) => { flame.scale.y = 0.8 + Math.abs(Math.sin(t * 15 + i)) * 0.75; });
            if (e >= m.impact) {
              const blast = Math.min(1, (e - m.impact) / 0.9);
              m.shockwave.scale.setScalar(0.1 + blast * 14); m.shockwave.material.opacity = 0.96 * (1 - blast);
              shake = Math.max(shake, 0.26 * (1 - blast * 0.4));
            }
          }
          if (e >= impactAt) {
            this.devastateForFox(u);
            if (u.fireLight) u.fireLight.intensity = 5 + Math.abs(Math.sin(t * 6)) * 4;
            if (u.debris) u.debris.forEach((rock, i) => {
              // Chaque météorite projette la moitié des rochers enflammés autour de son point d'impact.
              const m = u.meteors[i % 2];
              if (e < m.impact) { rock.visible = false; return; }
              const age = Math.max(0, e - m.impact - (i % 8) * 0.025), angle = i * 2.399;
              const radius = 1.6 + (i % 6) * 0.4;
              rock.visible = true;
              const spread = age < 0.72 ? 0.35 + age * radius * 1.8 : radius;
              const y = age < 0.72 ? Math.max(0.1, Math.sin(age * Math.PI) * (2.5 + (i % 4) * 0.8)) : 0.2 + (i % 3) * 0.08;
              rock.position.set(m.x + Math.cos(angle) * spread, y, m.z + Math.sin(angle) * spread);
              rock.rotation.set(age * 7 + i, age * 9, age * 6);
              rock.userData.fire.scale.y = 0.7 + Math.abs(Math.sin(t * 13 + i)) * 0.9;
              rock.userData.fire.material.opacity = 0.6 + Math.abs(Math.sin(t * 15 + i)) * 0.35;
            });
          }
          if (shake > 0) { this.shakeUntil = t + 0.045; this.shakeAmp = shake; }
        } else if (c === king && e >= impactAt) {
          c.anim = null; c.holder.visible = false;
        }
        return true;
      }
      if (kind === 'k') {
        const impactAt = 2.65;
        if (c === actor) {
          c.anim = null; c.holder.position.set(0, 0, 0); c.holder.rotation.y = Math.sin(t * 0.45) * 0.15;
          c.parts.root.visible = false;
          const grow = smooth(e / 1.05);
          u.fox.visible = true; u.fox.scale.setScalar(0.05 + grow * 3.0);
          u.fox.rotation.y = Math.sin(t * 0.7) * 0.08;
          u.fox.userData.coat.emissiveIntensity = 0.45 + Math.abs(Math.sin(t * 9)) * 0.9;
          if (u.energy) {
            const fall = smooth((e - 1.4) / 1.18);
            u.energy.visible = e < impactAt;
            u.energy.position.set(0, e < 1.4 ? 6.2 + Math.sin(t * 3) * 0.18 : 6.2 - fall * 5.7, 0);
            const charge = 0.25 + smooth(e / 0.7) * 1.65;
            u.energy.scale.setScalar(charge * (e < 1.4 ? 1 + Math.sin(t * 8) * 0.06 : 1 + fall * 0.25));
            u.energy.rotation.y += 0.035; u.energy.rotation.x = Math.sin(t * 1.8) * 0.2;
            if (u.energyRings) u.energyRings.forEach((ring, i) => { ring.rotation.x += 0.025 * (i + 1); ring.rotation.z -= 0.02 * (i + 1); });
          }
          if (u.fireColumns) u.fireColumns.forEach((flame, i) => {
            flame.visible = e > 0.45;
            flame.position.y = 0.35 + Math.abs(Math.sin(t * 12 + i)) * (0.45 + grow * 0.8);
            flame.material.opacity = 0.55 + Math.abs(Math.sin(t * 15 + i)) * 0.4;
          });
          if (e >= impactAt) {
            this.devastateForFox(u);
            if (u.fireLight) u.fireLight.intensity = 4 + Math.abs(Math.sin(t * 7)) * 3;
            const blast = Math.min(1, (e - impactAt) / 0.8);
            if (u.shockwave) { u.shockwave.scale.setScalar(0.1 + blast * 13); u.shockwave.material.opacity = 0.95 * (1 - blast); }
            if (u.debris) u.debris.forEach((rubble, i) => {
              const age = clamp((e - impactAt) * 0.7 + (i % 6) * 0.07), angle = i * 2.399;
              rubble.visible = age < 1;
              rubble.position.set(Math.cos(angle) * (0.3 + age * (2.5 + (i % 4) * 0.5)), Math.max(-0.02, Math.sin(age * Math.PI) * (1.5 + (i % 3) * 0.5)), Math.sin(angle) * (0.3 + age * (2.5 + (i % 4) * 0.5)));
              rubble.rotation.set(age * 8, age * 11, age * 6);
            });
            u.fox.scale.setScalar(3.05); // le renard reste seul au milieu du terrain détruit
          }
        } else if (c === king && e >= impactAt) {
          c.anim = null; c.holder.visible = false;
        }
        return true;
      }
      if (u.piece === 'b') return this.tickBlackDragon(u, c, e, t, M, clamp, smooth);
      if (u.piece === 'R') return this.tickFireTornado(u, c, e, t, M, clamp, smooth);
      if (u.piece === 'r') return this.tickFireGolem(u, c, e, t, M, clamp, smooth);
      if (kind === 'n') {
        const dx = target.x - u.fromPos.x, dz = target.z - u.fromPos.z, len = Math.hypot(dx, dz) || 1;
        if (u.piece === 'N') {
          // Chien à deux têtes : fusion, bond sur le roi, trois piétinements, puis déchiquetage.
          const stand = { x: target.x - dx / len * 0.32, z: target.z - dz / len * 0.32 };
          const stompStart = 1.25, stompEnd = 2.75, slams = clamp((e - stompStart) / (stompEnd - stompStart)) * 3;
          if (c === actor) {
            c.anim = null; c.holder.rotation.y = Math.atan2(dx, dz);
            const fuse = smooth(e / 0.5);
            if (c.parts.riderRoot) {
              c.parts.riderRoot.visible = fuse < 1;
              c.parts.riderRoot.scale.setScalar(0.68 * (1 - fuse * 0.95));
              c.parts.riderRoot.position.y = 0.43 - fuse * 0.25;
            }
            u.hiddenParts.forEach((o) => { o.visible = e < 0.3; });
            const heads = smooth((e - 0.3) / 0.3);
            u.actorRoot.scale.copy(u.actorBase.scale).multiplyScalar(1 + heads * 0.4);
            u.fusionRing.position.set(u.fromPos.x, 0.45, u.fromPos.z);
            u.fusionRing.scale.setScalar(0.4 + smooth(e / 0.6) * 1.6);
            u.fusionRing.material.opacity = e < 0.7 ? Math.sin(Math.PI * clamp(e / 0.7)) * 0.9 : 0;
            if (u.fireLight) { u.fireLight.position.set(c.holder.position.x, 1, c.holder.position.z); u.fireLight.intensity = e < 0.7 ? Math.sin(Math.PI * clamp(e / 0.7)) * 4 : 0; }
            let pitch = Math.sin(t * 15) * 0.05, lift = 0;
            if (e < 0.55) {
              M.animate(c.parts, t, 'guard', 1);
              c.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
            } else if (e < stompStart) {
              M.animate(c.parts, t, 'run');
              const p = smooth((e - 0.55) / (stompStart - 0.55));
              c.holder.position.set(u.fromPos.x + (stand.x - u.fromPos.x) * p, Math.sin(Math.PI * p) * 0.9, u.fromPos.z + (stand.z - u.fromPos.z) * p);
            } else if (e < stompEnd) {
              M.animate(c.parts, t, 'run');
              c.holder.position.set(stand.x, 0, stand.z);
              // Se cabre puis retombe de tout son poids sur le roi.
              const ph = slams % 1;
              pitch = -0.6 * Math.sin(Math.PI * ph); lift = 0.18 * Math.sin(Math.PI * ph);
              if (ph < 0.08) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.12; }
            } else {
              M.animate(c.parts, t, 'guard', 1);
              const p = smooth((e - stompEnd) / 0.4);
              c.holder.position.set(stand.x + (target.x - stand.x) * p * 0.5, 0, stand.z + (target.z - stand.z) * p * 0.5);
              pitch = 0.12 + Math.sin(t * 22) * 0.05;
            }
            u.actorRoot.rotation.set(pitch, 0, e > stompEnd ? Math.sin(t * 18) * 0.06 : 0);
            u.actorRoot.position.y = u.actorBase.position.y + lift;
            u.extraHeads.forEach((neck) => {
              const side = neck.userData.side;
              neck.scale.setScalar(Math.max(0.01, heads));
              if (e > stompEnd) {
                // Les deux gueules mordent tour à tour et secouent la tête pour arracher.
                const bite = Math.sin(t * 13 + (side > 0 ? Math.PI : 0));
                neck.rotation.set(0.45 + bite * 0.3, side * 0.22 + Math.sin(t * 31 + side) * 0.3, 0);
                neck.userData.jaw.rotation.x = 0.15 + Math.max(0, -bite) * 0.5;
              } else {
                neck.rotation.set(-0.1 + Math.abs(Math.sin(t * 9 + side)) * -0.2, side * 0.22, 0);
                neck.userData.jaw.rotation.x = 0.1 + Math.abs(Math.sin(t * 11 + side)) * 0.35;
              }
            });
            u.dust.forEach((ring, i) => {
              const age = slams - i;
              ring.visible = age > 0 && age < 1;
              ring.scale.setScalar(1 + clamp(age) * 3);
              ring.material.opacity = age > 0 ? 0.55 * (1 - clamp(age)) : 0;
            });
            u.shreds.forEach((shred, i) => {
              const age = e - (stompEnd + 0.1 + (i % 9) * 0.15);
              shred.visible = age > 0;
              if (age <= 0) return;
              const angle = i * 2.399, reach = Math.min(age, 0.9) * (1.2 + (i % 4) * 0.35);
              shred.position.set(target.x + Math.cos(angle) * reach, Math.max(0.03, 0.5 + age * 2.4 - age * age * 4), target.z + Math.sin(angle) * reach);
              shred.rotation.set(age * 9 + i, age * 7, age * 11);
            });
            if (e >= u.duration) { c.holder.position.set(target.x, 0, target.z); u.actorRoot.rotation.set(0, 0, 0); u.actorRoot.position.y = u.actorBase.position.y; }
          } else if (c === king) {
            c.anim = null; c.holder.position.set(target.x, 0, target.z);
            const crushed = Math.floor(slams + 0.92);
            const squash = 1 - Math.min(3, crushed) * 0.17;
            const shred = smooth((e - stompEnd - 0.1) / 1.4);
            const s = 1 - shred;
            c.parts.root.scale.set(u.kingBase.scale.x * (1 + (1 - squash) * 0.6) * s, u.kingBase.scale.y * squash * s, u.kingBase.scale.z * (1 + (1 - squash) * 0.6) * s);
            c.parts.root.position.y = u.kingBase.position.y;
            c.parts.root.rotation.set(0, e > stompEnd ? Math.sin(t * 27) * 0.4 : 0, e > stompEnd ? Math.sin(t * 19) * 0.3 : 0);
            if (shred >= 1) c.holder.visible = false;
          }
          return true;
        }
        // Phénix : fusion dans un tourbillon de feu, vol jusqu'au roi, étreinte des ailes jusqu'aux cendres.
        const front = { x: target.x - dx / len * 0.75, z: target.z - dz / len * 0.75 };
        const bird = u.phoenix, wrapStart = 2.6;
        if (c === actor) {
          c.anim = null; c.holder.rotation.y = Math.atan2(dx, dz);
          const fuse = smooth(e / 0.8);
          if (e < 0.8) {
            M.animate(c.parts, t, 'run');
            c.parts.root.visible = true;
            c.parts.root.rotation.set(0, e * 14, 0);
            c.parts.root.scale.copy(u.actorBase.scale).multiplyScalar(1 - fuse * 0.85);
          } else c.parts.root.visible = false;
          u.vortex.forEach((flame, i) => {
            flame.visible = e < 1.0;
            const a = flame.userData.a + t * 9, r = 0.55 * (1 - fuse * 0.6);
            flame.position.set(c.holder.position.x + Math.cos(a) * r, c.holder.position.y + 0.25 + (i % 4) * 0.18 + fuse * 0.3, c.holder.position.z + Math.sin(a) * r);
            flame.material.opacity = e < 1.0 ? 0.85 * (1 - clamp((e - 0.8) / 0.2)) : 0;
          });
          bird.visible = e > 0.45;
          bird.scale.setScalar(0.05 + smooth((e - 0.45) / 0.6) * u.phoenixScale);
          if (e < 0.9) c.holder.position.set(u.fromPos.x, fuse * 1.0, u.fromPos.z);
          else if (e < 2.1) {
            const f = smooth((e - 0.9) / 1.2);
            c.holder.position.set(u.fromPos.x + (front.x - u.fromPos.x) * f, (1 - f) * 1.0 + Math.sin(Math.PI * f) * 1.0, u.fromPos.z + (front.z - u.fromPos.z) * f);
          } else c.holder.position.set(front.x, 0, front.z);
          // Battements en vol, ailes déployées à l'atterrissage, puis repliées sur le roi.
          const spread = smooth((e - 2.1) / 0.4), wrap = smooth((e - wrapStart) / 0.7);
          bird.userData.wings.forEach((wing) => {
            const side = wing.userData.side;
            wing.rotation.z = e < 2.1 ? side * Math.sin(t * 14) * 0.55 : side * (-0.35 * spread * (1 - wrap) + Math.sin(t * 6) * 0.04);
            wing.rotation.y = -side * wrap * 1.3;
          });
          bird.position.y = e < 2.1 ? Math.sin(t * 14) * 0.04 : 0;
          bird.rotation.x = e > wrapStart ? wrap * 0.2 : 0;
          bird.userData.plumage.emissiveIntensity = 0.9 + Math.abs(Math.sin(t * 9)) * 0.7;
          bird.userData.flames.forEach((f) => { const w = 0.8 + Math.abs(Math.sin(t * 15 + f.userData.phase)) * 0.5; f.scale.set(1, w, 1); });
          if (u.fireLight) { u.fireLight.position.set(c.holder.position.x, c.holder.position.y + 1.2, c.holder.position.z); u.fireLight.intensity = bird.visible ? 0.8 + Math.abs(Math.sin(t * 8)) * 0.8 + wrap * 1.2 : 0; }
          if (e >= u.duration) c.holder.position.set(target.x, 0, target.z);
        } else if (c === king) {
          c.anim = null; c.holder.position.set(target.x, 0, target.z);
          const blaze = e > wrapStart + 0.2;
          if (u.flames) u.flames.forEach((f, i) => {
            f.visible = blaze && e < u.duration - 0.3;
            f.position.y = 0.55 + Math.abs(Math.sin(t * 12 + i)) * 0.45; f.material.opacity = 0.45 + Math.abs(Math.sin(t * 15 + i)) * 0.5;
          });
          if (blaze && e < u.duration - 0.1) this.burn(u.burn || (u.burn = { c: king }), t);
          const ashes = smooth((e - wrapStart - 0.4) / 2.0);
          c.parts.root.position.y = -ashes * 0.3 + (blaze ? Math.sin(t * 30) * 0.03 : 0);
          c.parts.root.rotation.x = -ashes * 0.4;
          c.parts.root.scale.set(u.kingBase.scale.x * (1 - ashes * 0.94), u.kingBase.scale.y * Math.max(0.008, 1 - ashes * 0.995), u.kingBase.scale.z * (1 - ashes * 0.94));
          u.ashes.forEach((ash, i) => {
            const age = Math.max(0, e - (wrapStart + 0.8 + (i % 7) * 0.12)), angle = i * 2.399;
            ash.position.set(target.x + Math.cos(angle) * (0.12 + age * 0.16), 0.12 + age * (0.65 + (i % 3) * 0.12), target.z + Math.sin(angle) * (0.12 + age * 0.16));
            ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.3) : 0;
            ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1.1, age * 0.4) : 0.001);
          });
          if (e >= u.duration) {
            c.parts.root.scale.set(u.kingBase.scale.x * 0.005, u.kingBase.scale.y * 0.005, u.kingBase.scale.z * 0.005);
            if (u.burn && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
          }
        }
        return true;
      }
      if (c === actor) {
        c.anim = null; c.holder.rotation.y = Math.atan2(target.x - u.fromPos.x, target.z - u.fromPos.z);
        if (kind === 'p') {
          M.animate(c.parts, t, e < 1.9 ? 'run' : 'victory', 1);
          const rush = smooth(e / 0.55), land = smooth((e - 1.45) / 0.6);
          c.holder.position.set(u.fromPos.x + (target.x - u.fromPos.x) * rush, e < 0.75 ? Math.sin(Math.PI * e / 0.75) * 1.1 : 0, u.fromPos.z + (target.z - u.fromPos.z) * rush);
          c.parts.root.position.y = e >= 1.9 ? 0.72 : 0;
          c.parts.root.rotation.set(0, 0, 0);
          if (e > 1.45) c.holder.position.set(target.x, land * 0.55, target.z);
        } else {
          const p = smooth(e / 0.48), dx = target.x - u.fromPos.x, dz = target.z - u.fromPos.z, len = Math.hypot(dx, dz) || 1;
          const hug = { x: target.x - dx / len * 0.42, z: target.z - dz / len * 0.42 };
          if (e < 0.48) {
            M.animate(c.parts, t, 'run'); this.trail(c, true, t);
            c.holder.position.set(u.fromPos.x + (hug.x - u.fromPos.x) * p, Math.sin(Math.PI * p) * 0.42, u.fromPos.z + (hug.z - u.fromPos.z) * p);
          } else {
            M.animate(c.parts, t, 'guard', 1);
            c.holder.position.set(hug.x, 0, hug.z);
            // Les bras s'ouvrent puis entourent le roi pour le maintenir pendant la foudre.
            const embrace = smooth((e - 0.48) / 0.35);
            c.parts.armL.rotation.set(-0.9, 0, -0.3 - embrace * 0.72);
            c.parts.armR.rotation.set(-0.9, 0, 0.3 + embrace * 0.72);
            c.parts.torso.rotation.x = 0.16 + embrace * 0.12;
          }
          c.parts.root.rotation.set(0, 0, Math.sin(t * 28) * 0.035);
          if (kind === 'b') {
            const transformation = e < 0.55 ? clamp((e - 0.12) / 0.25) : 0;
            if (u.transformBolt) u.transformBolt.material.opacity = transformation * (e < 0.48 ? 1 : 0);
            if (u.actorLight) { u.actorLight.position.set(c.holder.position.x, 0.9, c.holder.position.z); u.actorLight.intensity = 0.25 + Math.abs(Math.sin(t * 21)) * 1.5; }
          }
        }
        if (e >= u.duration) {
          c.holder.position.set(target.x, kind === 'p' ? 0.55 : 0, target.z);
          c.parts.root.position.y = kind === 'p' ? 0.72 : 0;
          c.parts.root.rotation.set(0, 0, 0);
        }
      }
      if (king) {
        king.anim = null; king.holder.position.set(target.x, 0, target.z);
        if (kind === 'p') {
          if (e < 0.6) king.parts.root.position.y = smooth(e / 0.6) * 2.35;
          else if (e < 2.1) king.parts.root.position.y = 2.35 - smooth((e - 0.6) / 1.5) * 2.25;
          else { king.parts.root.position.y = 0.035; king.parts.root.rotation.set(-Math.PI / 2, 0, 0); king.parts.root.scale.y = u.kingBase.scale.y * 0.48; }
        } else if (kind === 'b') {
          const beat = e % 0.58, strike = beat < 0.2, flash = strike ? 1 - beat / 0.2 : 0;
          if (u.bolts) u.bolts.forEach((b, i) => { b.material.opacity = strike ? flash * (i === 1 ? 1 : 0.9) : 0; });
          if (u.flashLight) u.flashLight.intensity = flash * 7.5;
          if (e > 0.82 && e < u.duration - 0.1) this.burn(u.burn || (u.burn = { c: king }), t);
          const ashes = smooth((e - 0.9) / 2.4);
          king.parts.root.position.y = -ashes * 0.36 + (strike ? Math.random() * 0.12 : 0);
          king.parts.root.rotation.x = -ashes * 0.45;
          king.parts.root.scale.set(u.kingBase.scale.x * (1 - ashes * 0.94), u.kingBase.scale.y * Math.max(0.008, 1 - ashes * 0.995), u.kingBase.scale.z * (1 - ashes * 0.94));
          if (u.ashes) u.ashes.forEach((ash, i) => {
            const delay = 1.2 + (i % 7) * 0.12, age = Math.max(0, e - delay), angle = i * 2.399;
            ash.position.set(target.x + Math.cos(angle) * (0.12 + age * 0.14), 0.12 + age * (0.62 + (i % 3) * 0.12), target.z + Math.sin(angle) * (0.12 + age * 0.14));
            ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.27) : 0;
            ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1.1, age * 0.4) : 0.001);
          });
          if (e >= u.duration) {
            king.parts.root.scale.set(u.kingBase.scale.x * 0.005, u.kingBase.scale.y * 0.005, u.kingBase.scale.z * 0.005);
            if (u.burn && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
          }
        } else {
          king.parts.root.position.y = e < 1.2 ? Math.sin(Math.PI * clamp(e / 1.2)) * 1.1 : Math.max(0.03, 1.1 - (e - 1.2) * 1.7);
          if (e > 2.0) { king.parts.root.rotation.set(-Math.PI / 2, 0, 0); king.parts.root.scale.y = u.kingBase.scale.y * 0.52; king.parts.root.position.y = 0.03; }
        }
      }
      if (u.piece === 'B' && this.mateUltimate === u) {
        const hit = (e % 0.72) < 0.18;
        if (hit) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.06; }
      }
      return true;
    }

    /* ---------- Attaques de mat des thèmes ----------
       Déroulé commun (4,8 s) : la pièce qui mate lance sa technique (0 → 0,6 s), l'effet grandit
       autour du roi (0,6 → 3 s), impact à 3 s (le roi tombe, le plateau tremble), puis la fumée retombe.
       ocean : vague géante (Blancs) / tourbillon des abysses (Noirs)
       plants : racines géantes qui emprisonnent le roi / mâchoire de plante carnivore géante
       land : charge du troupeau dans la poussière / le sol se fend sous un coup de poing
       birds : un aigle géant pique du ciel / tornade de corbeaux
       ancient : pluie de flèches enflammées / rocher géant de trébuchet
       modern : frappe aérienne de missiles / rayon laser venu de l'orbite */
