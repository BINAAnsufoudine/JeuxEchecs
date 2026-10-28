    // Remplace les matériaux d'un personnage par des copies teintées (rendues par resetMateUltimate)
    tintCharacter(u, c, color, amount) {
      if (!u.swaps) u.swaps = [];
      const T = this.THREE, list = [];
      c.parts.root.traverse((o) => {
        if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color || o.material.blending === T.AdditiveBlending) return;
        u.swaps.push([o, o.material]);
        o.material = o.material.clone(); o.material.userData.baseColor = o.material.color.clone(); list.push(o.material);
        if (amount) o.material.color.lerp(new T.Color(color), amount);
      });
      return list;
    }
    untint(u, c) {
      if (!u.swaps) return;
      u.swaps = u.swaps.filter(([o, m]) => {
        let mine = false; c.parts.root.traverse((x) => { if (x === o) mine = true; });
        if (!mine) return true;
        o.material.dispose(); o.material = m; return false;
      });
    }
    // Tour blanche : tornade de feu blanc, avance jusqu'au roi, l'aspire et le réduit en cendres en tournant
    tickFireTornado(u, c, e, t, M, clamp, smooth) {
      const target = u.target, from = u.fromPos, actor = u.actor, king = u.king;
      const travelStart = 0.7, arrive = 2.4, end = u.duration;
      if (c === actor) {
        c.anim = null; c.holder.position.set(from.x, 0, from.z);
        c.holder.rotation.y = Math.atan2(target.x - from.x, target.z - from.z);
        // la tour tourne sur elle-même de plus en plus vite et disparaît dans la tornade, puis revient à la fin
        const back = e > end - 0.6;
        c.parts.root.visible = e < 0.6 || back;
        if (e < 0.6) { M.animate(c.parts, t, 'cast', 1); c.parts.root.rotation.set(0, e * e * 40, 0); }
        else if (back) { M.animate(c.parts, t, 'idle', 1); c.parts.root.rotation.set(0, 0, 0); }
        const grow = smooth(e / 0.7) * (1 - smooth((e - (end - 1.0)) / 0.6));
        const go = smooth((e - travelStart) / (arrive - travelStart));
        const tw = u.tornado;
        tw.visible = grow > 0.01;
        tw.position.set(from.x + (target.x - from.x) * go + Math.sin(t * 5) * 0.06, 0, from.z + (target.z - from.z) * go + Math.cos(t * 4) * 0.06);
        tw.scale.set(Math.max(0.01, grow), Math.max(0.01, grow), Math.max(0.01, grow));
        tw.rotation.y = t * 11;
        tw.children.forEach((ring) => { if (ring.userData.layer !== undefined) ring.rotation.y = t * (2 + ring.userData.layer * 0.4); });
        u.tornadoFlames.forEach((fl) => { fl.scale.y = 0.7 + Math.abs(Math.sin(t * 15 + fl.userData.phase)) * 0.6; });
        u.tornadoCore.material.opacity = 0.22 + Math.abs(Math.sin(t * 9)) * 0.12;
        const fade = 1 - clamp((e - (end - 0.8)) / 0.8);
        u.trail.forEach((g) => {
          g.visible = e > travelStart && g.userData.f <= go + 0.02 && fade > 0;
          g.children.forEach((fl) => {
            if (fl.userData.phase === undefined) { fl.material.opacity = 0.5 * fade; return; }
            fl.scale.y = (0.7 + Math.abs(Math.sin(t * 14 + fl.userData.phase)) * 0.5) * fade; fl.material.opacity = 0.85 * fade;
          });
        });
        u.fireLight.position.set(tw.position.x, 1.2, tw.position.z);
        u.fireLight.intensity = grow * (4 + Math.random() * 1.5);
        if (e > arrive && e < arrive + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.08; }
      } else if (c === king) {
        c.anim = null; c.holder.position.set(target.x, 0, target.z);
        if (e < arrive) { M.animate(c.parts, t, 'guard', 1); return true; }
        M.animate(c.parts, t, 'ko', 1);
        // aspiré dans la tornade : il monte, tourne et blanchit en brûlant, puis tombe en cendres
        if (!u.kingTint) u.kingTint = this.tintCharacter(u, c, 0xffffff, 0);
        const lift = smooth((e - arrive) / 0.8), burn = smooth((e - arrive - 0.9) / 1.6);
        const white = new this.THREE.Color(0xf4f4f4), w = smooth((e - arrive) / 1.4);
        u.kingTint.forEach((m) => m.color.copy(m.userData.baseColor).lerp(white, w));
        c.parts.root.position.set(Math.sin(t * 9) * 0.12 * lift, lift * 1.1 + Math.sin(t * 6) * 0.08, Math.cos(t * 9) * 0.12 * lift);
        c.parts.root.rotation.set(Math.sin(t * 7) * 0.4 * lift, (e - arrive) * (6 + (e - arrive) * 6), 0);
        const s = Math.max(0.005, 1 - burn);
        c.parts.root.scale.set(u.kingBase.scale.x * s, u.kingBase.scale.y * s, u.kingBase.scale.z * s);
        u.ashes.forEach((ash, i) => {
          const age = Math.max(0, e - (arrive + 1.0 + (i % 9) * 0.12)), a = i * 2.399 + age * 6, r = 0.25 + age * 0.25;
          ash.position.set(target.x + Math.cos(a) * r, 0.4 + age * (0.9 + (i % 3) * 0.2), target.z + Math.sin(a) * r);
          ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.35) : 0;
          ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1, age * 0.4) : 0.001);
        });
        if (burn >= 1) c.holder.visible = false;
      }
      return true;
    }
    // Tour noire : golem de feu noir, écrase le roi de ses deux poings, bondit dans le ciel et retombe en boule de feu noire
    tickFireGolem(u, c, e, t, M, clamp, smooth) {
      const T = this.THREE, target = u.target, from = u.fromPos, actor = u.actor, king = u.king;
      const dx = target.x - from.x, dz = target.z - from.z, len = Math.hypot(dx, dz) || 1;
      const stand = { x: target.x - dx / len * 0.75, z: target.z - dz / len * 0.75 };
      const runStart = 0.9, runEnd = 1.9, slam = 2.4, leap = 2.8, apex = 3.6, impact = 4.3, reform = 4.9;
      if (c === actor) {
        c.anim = null; c.holder.rotation.y = Math.atan2(dx, dz);
        const grow = smooth(e / 0.8);
        if (!u.golemTint) u.golemTint = this.tintCharacter(u, c, 0x120a0e, 0);
        const coal = new T.Color(0x140a10);
        if (e < reform) u.golemTint.forEach((m) => m.color.copy(m.userData.baseColor).lerp(coal, 0.85 * grow));
        else if (u.golemTint.length) { this.untint(u, c); u.golemTint = []; }
        const big = e < reform ? 1 + 0.9 * grow : 1;
        c.parts.root.scale.copy(u.actorBase.scale).multiplyScalar(big);
        c.parts.root.visible = e < leap + 0.35 || e >= reform;
        let pos = { x: from.x, y: 0, z: from.z };
        if (e < runStart) M.animate(c.parts, t, 'guard', 1);
        else if (e < runEnd) {
          M.animate(c.parts, t, 'run');
          const p = smooth((e - runStart) / (runEnd - runStart));
          pos = { x: from.x + (stand.x - from.x) * p, y: Math.abs(Math.sin(p * Math.PI * 3)) * 0.12, z: from.z + (stand.z - from.z) * p };
        } else if (e < leap) {
          M.animate(c.parts, t, 'guard', 1);
          pos = { x: stand.x, y: 0, z: stand.z };
          // les deux mains liées se lèvent au-dessus de la tête puis s'abattent sur le roi
          const raise = smooth((e - runEnd) / (slam - 0.15 - runEnd)), down = smooth((e - (slam - 0.15)) / 0.15);
          const ax = -0.4 - raise * 2.6 + down * 2.4;
          c.parts.armL.rotation.set(ax, 0, -0.25); c.parts.armR.rotation.set(ax, 0, 0.25);
          c.parts.torso.rotation.x = -0.2 * raise + 0.55 * down;
        } else if (e < reform) {
          // bond très haut au-dessus du roi, puis chute en boule de feu noire
          const up = smooth((e - leap) / (apex - leap)), fall = clamp((e - apex) / (impact - apex));
          pos = e < apex ? { x: stand.x + (target.x - stand.x) * up, y: up * 7, z: stand.z + (target.z - stand.z) * up } : { x: target.x, y: Math.max(0.5, 7 - fall * fall * 6.5), z: target.z };
          M.animate(c.parts, t, 'run');
        } else { M.animate(c.parts, t, 'idle', 1); pos = { x: target.x, y: 0, z: target.z }; }
        c.holder.position.set(pos.x, pos.y, pos.z);
        // flammes noires sur le golem
        u.golemFlames.visible = grow > 0.05 && e < leap + 0.35;
        u.golemFlames.position.set(pos.x, pos.y, pos.z);
        u.golemFlames.scale.setScalar(Math.max(0.01, grow * big * 0.8));
        u.golemFlames.children.forEach((fl) => { fl.scale.y = 0.7 + Math.abs(Math.sin(t * 13 + fl.userData.phase)) * 0.6; fl.position.y = fl.userData.y + Math.sin(t * 5 + fl.userData.phase) * 0.04; });
        // boule de feu noire
        const ballOn = e > leap + 0.3 && e < impact;
        u.ball.visible = ballOn;
        u.ball.position.set(pos.x, pos.y + 0.6, pos.z);
        u.ball.scale.setScalar(Math.max(0.01, smooth((e - leap - 0.3) / 0.3)));
        u.ball.rotation.set(t * 4, t * 3, 0);
        u.ballSpikes.forEach((f, i) => { f.scale.y = 0.7 + Math.abs(Math.sin(t * 17 + i)) * 0.6; });
        // impact : onde de choc, trou, fissures, fumée et flammes noires
        const after = e - impact;
        u.crater.visible = after > 0;
        u.crater.children[0].scale.setScalar(Math.max(0.01, smooth(after / 0.25)));
        u.crater.children[1].scale.setScalar(Math.max(0.01, smooth(after / 0.25)));
        u.cracks.forEach((seg) => { seg.visible = after > seg.userData.order * 0.06; });
        u.craterFlames.forEach((fl) => { fl.scale.y = 0.6 + Math.abs(Math.sin(t * 12 + fl.userData.phase)) * 0.6; fl.visible = after > 0.05; });
        u.shock.material.opacity = after > 0 && after < 0.7 ? 0.8 * (1 - after / 0.7) : 0;
        u.shock.scale.setScalar(1 + clamp(after / 0.7) * 5);
        u.smoke.forEach((puff, i) => {
          const age = after - (i % 6) * 0.15;
          puff.material.opacity = age > 0 ? Math.max(0, 0.6 - age * 0.25) : 0;
          const a = i * 2.399;
          puff.position.set(target.x + Math.cos(a) * (0.3 + age * 0.3), 0.3 + age * 0.7, target.z + Math.sin(a) * (0.3 + age * 0.3));
          puff.scale.setScalar(1 + Math.max(0, age) * 0.8);
        });
        u.fireLight.position.set(pos.x, pos.y + 1, pos.z);
        u.fireLight.intensity = (after > 0 ? 6 * Math.max(0.25, 1 - after) : grow * 2.5) + Math.random() * 0.6;
        if (e >= slam && e < slam + 0.2) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.14; }
        if (after >= 0 && after < 0.45) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.35 * (1 - after / 0.45); }
      } else if (c === king) {
        c.anim = null; c.holder.position.set(target.x, 0, target.z);
        if (e < slam) { M.animate(c.parts, t, 'guard', 1); return true; }
        // écrasé au sol par les poings du golem, puis englouti par l'impact
        M.animate(c.parts, t, 'ko', 1);
        c.parts.root.rotation.set(-Math.PI / 2, 0, 0);
        c.parts.root.position.y = 0.04;
        c.parts.root.scale.set(u.kingBase.scale.x * 1.1, u.kingBase.scale.y * 0.45, u.kingBase.scale.z * 1.1);
        if (e >= impact) c.holder.visible = false;
      }
      return true;
    }

    // Dragon de foudre noire : orage, appel de la foudre, descente en spirale, enroulement autour du roi
    tickBlackDragon(u, c, e, t, M, clamp, smooth) {
      const T = this.THREE, target = u.target, actor = u.actor, king = u.king;
      const descend = 1.3, impact = 3.2, fadeOut = u.duration - 0.7;
      const jag = (l, a, b, amp) => {
        const arr = l.geometry.attributes.position.array, n = arr.length / 3;
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1), j = i === 0 || i === n - 1 ? 0 : amp;
          arr[i * 3] = a.x + (b.x - a.x) * f + (Math.random() - 0.5) * j;
          arr[i * 3 + 1] = a.y + (b.y - a.y) * f + (Math.random() - 0.5) * j * 0.6;
          arr[i * 3 + 2] = a.z + (b.z - a.z) * f + (Math.random() - 0.5) * j;
        }
        l.geometry.attributes.position.needsUpdate = true;
      };
      if (c === actor) {
        c.anim = null; c.holder.position.set(u.fromPos.x, 0, u.fromPos.z);
        c.holder.rotation.y = Math.atan2(target.x - u.fromPos.x, target.z - u.fromPos.z);
        M.animate(c.parts, t, e < impact + 0.4 ? 'cast' : 'idle', clamp(e / 0.3));
        // Le ciel s'assombrit, les nuages d'orage se forment au-dessus du roi
        const dim = clamp(e / 0.8) * (1 - clamp((e - fadeOut) / 0.7));
        if (u.sky) {
          this.skyDim = dim;
          const night = new T.Color(0x07040c);
          if (u.sky.background && this.scene.background && this.scene.background.isColor) this.scene.background.copy(u.sky.background).lerp(night, dim * 0.9);
          if (u.sky.fog && this.scene.fog && this.scene.fog.color) this.scene.fog.color.copy(u.sky.fog).lerp(night, dim * 0.85);
          if (!this.weather) { this.sun.intensity = u.sky.sun * (1 - 0.85 * dim); this.hemi.intensity = u.sky.hemi * (1 - 0.75 * dim); }
          this.renderer.toneMappingExposure = u.sky.exposure * (1 - 0.45 * dim);
        }
        u.clouds.rotation.y = t * 0.25;
        u.clouds.children.forEach((puff, i) => { puff.material.opacity = 0.8 * dim; puff.position.y = (i % 3) * 0.2 + Math.sin(t * 1.3 + i) * 0.08; });
        // Le fou lève les bras et envoie la foudre vers les nuages
        const castOn = e > 0.6 && e < descend + 0.2;
        u.castBolt.material.opacity = castOn ? 0.5 + Math.random() * 0.5 : 0;
        if (castOn) jag(u.castBolt, { x: u.fromPos.x, y: 1.3, z: u.fromPos.z }, { x: target.x, y: 4.8, z: target.z }, 0.5);
        // Trajet du dragon : spirale qui descend des nuages jusqu'au roi
        const path = (s) => {
          const a = s * Math.PI * 3.2, r = 1.5 * (1 - s) + 0.35;
          return { x: target.x + Math.cos(a) * r, y: 4.7 - s * 3.95, z: target.z + Math.sin(a) * r };
        };
        const coil = (i, n) => {
          const a = -i * 0.55 + t * 2.6, r = 0.46 + (i / n) * 0.12;
          return { x: target.x + Math.cos(a) * r, y: 0.15 + (n - i) * 0.055, z: target.z + Math.sin(a) * r };
        };
        const head = smooth((e - descend) / (impact - descend)), wrap = smooth((e - impact) / 0.5), gone = clamp((e - fadeOut) / 0.6);
        const n = u.dragon.length, pts = [];
        u.dragon.forEach((seg, i) => {
          const s = head - (i + 1) * 0.03, p = path(Math.max(0, s)), q = coil(i + 1, n + 1);
          const pos = { x: p.x + (q.x - p.x) * wrap, y: p.y + (q.y - p.y) * wrap, z: p.z + (q.z - p.z) * wrap };
          seg.visible = e > descend && (s > 0 || wrap > 0) && gone < 1;
          seg.position.set(pos.x, pos.y + Math.sin(t * 9 + i * 0.7) * 0.04, pos.z);
          seg.scale.setScalar(Math.max(0.01, 1 - gone));
          seg.children[1].material.opacity = (0.45 + Math.abs(Math.sin(t * 17 + i)) * 0.35) * (1 - gone);
          pts.push(seg.position);
        });
        const hp = path(head), hq = { x: target.x, y: 0.15 + (n + 1) * 0.055 + 0.15, z: target.z };
        const h = u.dragonHead;
        h.visible = e > descend && gone < 1;
        h.position.set(hp.x + (hq.x - hp.x) * wrap, hp.y + (hq.y - hp.y) * wrap, hp.z + (hq.z - hp.z) * wrap);
        h.scale.setScalar(Math.max(0.01, 1.5 * (1 - gone)));
        // la tête regarde vers où elle va, puis plonge sur le roi une fois enroulée
        const ahead = e < impact ? path(Math.min(1, head + 0.04)) : { x: target.x, y: 0.4, z: target.z };
        if (Math.hypot(ahead.x - h.position.x, ahead.y - h.position.y, ahead.z - h.position.z) > 0.01) h.lookAt(ahead.x, ahead.y, ahead.z);
        // éclairs qui crépitent le long du corps
        u.crackles.forEach((l, k) => {
          const on = pts.length > 8 && e > descend + 0.1 && gone < 1 && Math.random() < 0.7;
          l.material.opacity = on ? 0.6 + Math.random() * 0.4 : 0;
          if (on) { const i = Math.floor(Math.random() * (pts.length - 6)); jag(l, pts[i], pts[i + 4 + (k % 3)], 0.35); }
        });
        // à l'impact : la foudre tombe des nuages sur le roi à plusieurs reprises
        const beat = (e - impact) % 0.45, striking = e > impact && e < fadeOut && beat < 0.16;
        u.strikes.forEach((l, k) => {
          l.material.opacity = striking ? 1 - beat / 0.16 : 0;
          if (striking) jag(l, { x: target.x + (k - 1) * 0.4, y: 4.8, z: target.z }, { x: target.x, y: 0.5, z: target.z }, 0.6);
        });
        u.flashLight.position.set(h.position.x, h.position.y + 0.4, h.position.z);
        u.flashLight.intensity = e < descend ? (castOn ? 2.5 : 0) : (striking ? 9 * (1 - beat / 0.16) : 0) + 2.2 * (1 - gone) + Math.random() * 0.6;
        if (e >= impact && e < impact + 0.25) { this.shakeUntil = t + 0.05; this.shakeAmp = 0.16; }
        else if (striking && beat < 0.05) { this.shakeUntil = t + 0.04; this.shakeAmp = 0.07; }
      } else if (c === king) {
        c.anim = null; c.holder.position.set(target.x, 0, target.z);
        M.animate(c.parts, t, e < impact ? 'guard' : 'ko', 1);
        if (e > impact && e < u.duration - 0.1) this.burn(u.burn || (u.burn = { c: king }), t);
        const ashes = smooth((e - impact - 0.3) / 1.6);
        c.parts.root.position.y = -ashes * 0.3 + (e > impact ? Math.sin(t * 34) * 0.035 * (1 - ashes) : 0);
        c.parts.root.scale.set(u.kingBase.scale.x * (1 - ashes * 0.94), u.kingBase.scale.y * Math.max(0.008, 1 - ashes * 0.995), u.kingBase.scale.z * (1 - ashes * 0.94));
        u.ashes.forEach((ash, i) => {
          const age = Math.max(0, e - (impact + 0.5 + (i % 7) * 0.12)), angle = i * 2.399;
          ash.position.set(target.x + Math.cos(angle) * (0.12 + age * 0.16), 0.12 + age * (0.7 + (i % 3) * 0.12), target.z + Math.sin(angle) * (0.12 + age * 0.16));
          ash.material.opacity = age > 0 ? Math.max(0, 0.85 - age * 0.3) : 0;
          ash.scale.setScalar(age > 0 ? 0.6 + Math.min(1.1, age * 0.4) : 0.001);
        });
        if (e >= u.duration) {
          c.parts.root.scale.set(u.kingBase.scale.x * 0.005, u.kingBase.scale.y * 0.005, u.kingBase.scale.z * 0.005);
          if (u.burn && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
        }
      }
      // fin de l'orage : le ciel revient tel qu'il était
      if (e >= u.duration && u.sky) this.restoreSky(u);
      return true;
    }

    resetMateUltimate() {
      const u = this.mateUltimate;
      if (!u) return;
      if (u.apocalypse) this.restoreFoxWorld(u);
      if (u.hiddenEnemies) u.hiddenEnemies.forEach(([piece, visible]) => { piece.holder.visible = visible; });
      if (u.flameVictims) u.flameVictims.forEach((victim) => {
        victim.character.holder.visible = victim.visible;
        victim.character.parts.root.position.copy(victim.position);
        victim.character.parts.root.scale.copy(victim.scale);
      });
      if (u.camera) this.setCamera(this.flipped, true);
      if (u.actor && u.actor.parts.riderRoot) u.actor.parts.riderRoot.visible = true;
      if (u.actorRoot) u.actorRoot.visible = true;
      if (u.burn && u.burn.flames && !u.burnEnded) { this.endBurn(u.burn); u.burnEnded = true; }
      if (u.extraHeads) u.extraHeads.forEach((h) => { h.parent && h.parent.remove(h); h.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
      if (u.hiddenParts) u.hiddenParts.forEach((o) => { o.visible = true; });
      if (u.actor && u.actor.parts.riderRoot && u.piece === 'N') { u.actor.parts.riderRoot.scale.setScalar(0.68); u.actor.parts.riderRoot.position.y = 0.43; }
      if (u.actorRoot && u.actorBase) { u.actorRoot.position.copy(u.actorBase.position); u.actorRoot.rotation.copy(u.actorBase.rotation); u.actorRoot.scale.copy(u.actorBase.scale); }
      if (u.kingRoot && u.kingBase) { u.kingRoot.position.copy(u.kingBase.position); u.kingRoot.rotation.copy(u.kingBase.rotation); u.kingRoot.scale.copy(u.kingBase.scale); }
      if (u.actor && u.actorHolderBase) u.actor.holder.position.copy(u.actorHolderBase);
      if (u.king && u.kingHolderBase) {
        u.king.holder.position.copy(u.kingHolderBase);
        u.king.holder.visible = u.kingHolderVisible;
      }
      if (u.fox && u.fox.parent) {
        u.fox.parent.remove(u.fox);
        u.fox.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
      }
      if (u.blackBanshee && u.blackBanshee.parent) {
        u.blackBanshee.parent.remove(u.blackBanshee);
        u.blackBanshee.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
      }
      for (const model of [u.angel, u.susanoo, u.phoenix]) if (model && model.parent) {
        model.parent.remove(model);
        model.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
      }
      if (u.fx) { this.scene.remove(u.fx); u.fx.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }); }
      if (u.fireLight) this.scene.remove(u.fireLight);
      if (u.flashLight) this.scene.remove(u.flashLight);
      if (u.sky) this.restoreSky(u);
      if (u.swaps) { u.swaps.forEach(([o, m]) => { o.material.dispose(); o.material = m; }); u.swaps = null; }
      if (u.actorRoot) u.actorRoot.visible = true;
      if (u.actorLight) this.scene.remove(u.actorLight);
      if (u.columnLight) this.scene.remove(u.columnLight);
      if (u.energyLight) this.scene.remove(u.energyLight);
      if (u.actor) u.actor.parts.fast = u.oldFast;
      this.mateUltimate = null; this.mateUltimateKey = '';
    }

    setMateFire(squares) {
      const T = this.THREE;
      const key = [...new Set(squares)].sort((a, b) => a - b).join(',');
      if (key === this.mateFireKey) return;
      this.mateFireKey = key;
      this.mateFireGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      this.mateFireGroup.clear();
      for (const sq of key ? key.split(',').map(Number) : []) {
        const tile = new T.Group(), p = this.sqToPos(sq);
        tile.userData.phase = Math.random() * Math.PI * 2;
        for (let i = 0; i < 3; i++) {
          const height = 0.42 + (i % 2) * 0.12;
          const radius = 0.13 - (i % 2) * 0.025;
          const color = i === 0 ? 0xff3c12 : i === 1 ? 0xff8a16 : 0xffd84a;
          const flame = new T.Mesh(
            new T.ConeGeometry(radius, height, 7),
            new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.84, blending: T.AdditiveBlending, depthWrite: false }),
          );
          const angle = i * Math.PI * 2 / 3;
          flame.position.set(p.x + Math.cos(angle) * 0.16, height / 2 + 0.025, p.z + Math.sin(angle) * 0.16);
          flame.userData.phase = i * 2.4 + tile.userData.phase;
          flame.userData.baseHeight = 0.8 + (i % 2) * 0.25;
          tile.add(flame);
        }
        this.mateFireGroup.add(tile);
      }
    }

