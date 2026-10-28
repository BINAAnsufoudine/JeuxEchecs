    rebuildPieces() {
      // changement de thème : on termine d'abord les animations en cours pour ne laisser aucun effet orphelin
      this.clearTransient();
      if (this.mateUltimate) this.resetMateUltimate();
      for (const g of this.tracers || []) { for (const o of [g, g.userData.muzzle, g.userData.hit]) { this.scene.remove(o); o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); } }
      this.tracers = new Set();
      for (const c of this.chars.values()) this.pieces.remove(c.holder);
      this.chars = new Map();
      this.boardKey = null;
    }

    makeChar(piece) {
      const T = this.THREE;
      const parts = root.Models3D.build(T, piece);
      parts.root.traverse((o) => {
        if (!o.isMesh) return;
        o.userData.char = parts;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        o.castShadow = !materials.some((m) => m.blending === T.AdditiveBlending);
      });
      const holder = new T.Group();
      const k = root.Models3D.SIZE[piece.toLowerCase()];
      const shadow = new T.Mesh(new T.PlaneGeometry(1.1 * k, 1.1 * k), new T.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012;
      holder.add(shadow); holder.add(parts.root);
      holder.rotation.y = this.viewYaw();
      this.pieces.add(holder);
      return { piece, parts, holder, shadow, yaw: holder.rotation.y };
    }

    // Mode léger : pixel ratio 1, pas d'ombres portées, 30 images/s au plus
    setLite(on) {
      on = !!on;
      if (this.liteApplied && on === this.lite) return;
      this.lite = on; this.liteApplied = true;
      this.renderer.setPixelRatio(on ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
      this.sun.castShadow = !on;
      this.resize();
    }

    // Horloge des animations : ralentie (speed < 1) pour qu'on profite de chaque mouvement
    now() { return performance.now() / 1000 * this.speed; }
    // Temps réel (ms) avant la fin des animations en cours, pour l'interface
    busyLeftMs() { return this.busyUntil ? (this.busyUntil - this.now()) / this.speed * 1000 : 0; }

    tick(nowMs) {
      // Le plateau est conservé entre les écrans, mais ne doit pas animer ni
      // redessiner ses pièces tant qu'il est masqué.
      if (!this.renderer.domElement.getClientRects().length) return;
      if (this.lite && nowMs - (this.lastFrameMs || 0) < 31) return;
      if (nowMs - (this.lastFrameMs || nowMs) > 1000) { this.perfStart = nowMs; this.perfFrames = 0; this.slowRuns = 0; }
      this.lastFrameMs = nowMs;
      // Cadence mesurée sur 3 s : deux fenêtres lentes de suite → l'appli propose le mode léger
      this.perfFrames = (this.perfFrames || 0) + 1;
      if (!this.perfStart) this.perfStart = nowMs;
      if (nowMs - this.perfStart > 3000) {
        const fps = (this.perfFrames * 1000) / (nowMs - this.perfStart);
        this.slowRuns = fps < 20 ? (this.slowRuns || 0) + 1 : 0;
        if (this.slowRuns >= 2 && !this.lite && this.onSlow) this.onSlow();
        this.perfFrames = 0; this.perfStart = nowMs;
      }
      const t = nowMs / 1000 * this.speed;
      const dt = Math.min(0.25, Math.max(0, t - (this.lastT || t)));
      this.lastT = t;
      this.tickWater(t);
      this.tickVaults(t);
      this.hideTracers(t);
      const ease = 1 - Math.exp(-dt * 11); // rotation indépendante du nombre d'images par seconde
      const M = root.Models3D;
      const restYaw = this.viewYaw(); // tous regardent le joueur
      for (const tile of this.mateFireGroup.children) {
        for (const flame of tile.children) {
          const flicker = Math.sin(t * 19 + flame.userData.phase);
          flame.scale.y = flame.userData.baseHeight * (0.82 + Math.abs(flicker) * 0.32);
          flame.position.y = flame.geometry.parameters.height * flame.scale.y / 2 + 0.025;
          flame.material.opacity = 0.66 + Math.max(0, flicker) * 0.3;
          flame.rotation.z = Math.sin(t * 11 + flame.userData.phase) * 0.1;
        }
      }
      const turn = (c, target) => {
        let d = target - c.holder.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        c.holder.rotation.y += d * ease;
      };
      for (const c of this.chars.values()) {
        let state = 'idle', k = 0;
        this.trail(c, false, t);
        if (this.tickMateUltimate(c, t, M)) continue;
        if (c.anim) {
          const a = c.anim, el = t - a.t0;
          const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
          const glide = (p0, p1, u, leap) => {
            const e = ease(u);
            c.holder.position.set(p0.x + (p1.x - p0.x) * e, 0, p0.z + (p1.z - p0.z) * e);
            turn(c, Math.atan2(p1.x - p0.x, p1.z - p0.z));
            M.animate(c.parts, t, a.knightFlight ? 'knight-flight' : 'run');
            // Thème Oiseaux : sur plus d'une case, l'oiseau s'envole, plane puis se pose
            const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z), bird = root.PieceTheme === 'birds' && dist > 1.2;
            const arc = bird ? Math.min(1, Math.sin(Math.PI * u) * 1.6) * Math.min(2.2, 0.7 + dist * 0.28) : Math.sin(Math.PI * u) * (leap ? a.high || 0.9 : 0.12);
            c.parts.root.position.y = arc;
            c.shadow.scale.setScalar(Math.max(0.35, 1 - arc * 0.4));
            if (c.parts.fast && u < 1) this.trail(c, true, t);
          };
          const arrive = () => { this.endToss(c); c.anim = null; c.holder.position.set(a.to.x, 0, a.to.z); c.shadow.scale.setScalar(1); };
          if (a.knightAttack) {
            this.tickKnightAttack(c, a.knightAttack, el, t, M);
            if (el >= a.dur) {
              this.endShot(a.knightAttack);
              c.parts.root.visible = true; if (c.parts.riderRoot) c.parts.riderRoot.visible = true;
              c.anim = null; c.holder.position.set(a.to.x, 0, a.to.z);
              c.parts.root.rotation.set(0, 0, 0); c.parts.root.position.set(0, 0, 0); c.shadow.scale.setScalar(1);
            }
            continue;
          }
          if (a.wait && el < 0) { c.holder.position.set(a.from.x, 0, a.from.z); M.animate(c.parts, t, 'idle'); continue; } // le roi attend ses soldats
          if (a.pre && el < 0) {
            // Riposte de la cible avant l'attaque. Thème Ninjas : l'attaquant esquive par une technique de substitution
            // (fumée, bûche). Autres thèmes : pas de mur, il encaisse le coup de plein fouet puis lance son attaque.
            const tg = (a.shot || a.toss).target, u = t - a.pre;
            c.holder.position.set(a.from.x, 0, a.from.z);
            turn(c, Math.atan2(tg.x - a.from.x, tg.z - a.from.z));
            if (!THEME_FX[root.PieceTheme]) { this.substitution(c, a, u, t, M); continue; }
            M.setEarthWall(c.parts, 0);
            const hitAt = 0.85, hurt = u > hitAt && u < hitAt + 0.35 ? Math.sin((u - hitAt) / 0.35 * Math.PI) : 0;
            M.animate(c.parts, t, hurt > 0 ? 'ko' : 'guard', hurt > 0 ? hurt * 0.35 : 1);
            c.parts.root.position.z = -hurt * 0.2; // projeté en arrière par l'impact
            c.parts.root.rotation.x = -hurt * 0.35;
            if (u > hitAt && !a.hurtShake) { a.hurtShake = true; this.shakeUntil = t + 0.15; this.shakeAmp = 0.05; }
            continue;
          }
          if (a.shot) {
            M.setEarthWall(c.parts, 0);
            if (a.subst && !a.subst.shown) { a.subst.shown = true; c.parts.root.visible = true; if (c.parts.riderRoot) c.parts.riderRoot.visible = true; if (c.shadow) c.shadow.visible = true; }
            const s = a.shot;
            if (el < s.runStart) {
              c.holder.position.set(a.from.x, 0, a.from.z);
              turn(c, Math.atan2(s.target.x - a.from.x, s.target.z - a.from.z));
              M.animate(c.parts, t, 'cast', Math.min(1, el / s.fire));
            } else {
              const u = Math.min(1, (el - s.runStart) / a.dur);
              glide(a.from, a.to, u, false);
              if (u >= 1) arrive();
            }
            if (s.ended) { /* effet déjà nettoyé : ne rien recréer */ } else if (s.tech === 'fire') this.flyFire(c, s, el, t); else if (s.tech === 'bubble') this.flyBubbles(c, s, el, t); else if (s.tech === 'proj') this.flyProj(c, s, el, t); else this.flyDragon(c, s, el, t);
            continue;
          }
          if (a.toss) {
            M.setEarthWall(c.parts, 0);
            const s = a.toss;
            if (el < s.runStart) {
              c.holder.position.set(a.from.x, 0, a.from.z);
              turn(c, Math.atan2(s.target.x - a.from.x, s.target.z - a.from.z));
              M.animate(c.parts, t, 'throw', Math.min(1, el / (s.windup + 0.15)));
              this.flySpikes(c, s, el, t);
            } else {
              const u = Math.min(1, (el - s.runStart) / a.dur);
              glide(a.from, a.to, u, false);
              if (u >= 1) arrive();
            }
            continue;
          }
          if (!a.duel) {
            const u = Math.min(1, Math.max(0, el / a.dur));
            glide(a.from, a.to, u, a.leap);
            if (u >= 1) arrive();
          } else if (el < a.dur) {
            glide(a.from, a.duel.stop, Math.max(0, el / a.dur), a.leap);
          } else if (el < a.dur + a.duel.len) {
            // duel : la technique de chaque pièce (karaté, katana, sabre, flammes…)
            const d0 = el - a.dur;
            this.brawlMode(c, true);
            c.holder.position.set(a.duel.stop.x, 0, a.duel.stop.z);
            turn(c, Math.atan2(a.duel.foe.x - a.duel.stop.x, a.duel.foe.z - a.duel.stop.z));
            if (d0 >= X1 && d0 < X2) {
              // la cible riposte : l'attaquant pare et recule d'un pas
              M.animate(c.parts, t, 'guard', 1);
              c.parts.root.position.z = -Math.sin(((d0 - X1) / (X2 - X1)) * Math.PI) * 0.1;
              continue;
            }
            const d = d0 < X1 ? d0 : d0 - X2;
            const hits = d0 < X1 ? d0 * 1.7 : d * a.duel.rate;
            const finisher = d0 >= a.duel.len - 0.35;
            if (c.parts.weapon === 'element') M.animate(c.parts, t, 'punch', 0.5); // jet de flammes continu
            else M.animate(c.parts, t, 'punch', finisher ? 2.35 : hits);
            c.parts.root.position.z = c.parts.weapon === 'element' ? 0 : Math.sin(hits * Math.PI * 2) * 0.06;
            c.shadow.scale.setScalar(1);
            if (c.parts.mg && root.PieceTheme === 'modern') this.mgBurst(c, a.duel.foe, t); // guerriers modernes : rafales de mitrailleuse
            else if (c.parts.weapon !== 'element') this.flash(a.duel.stop, a.duel.foe, hits, c.parts.fast ? 0xffffff : 0xffe066);
          } else {
            const u = Math.min(1, (el - a.dur - a.duel.len) / 0.35);
            this.brawlMode(c, false);
            c.parts.root.position.z = 0;
            glide(a.duel.stop, a.to, u, false);
            if (u >= 1) arrive();
          }
          continue;
        }
        if (!this.outcome && c.foe && !c.selected) {
          // ennemi voisin : ils se battent en continu, l'un attaque pendant que l'autre se protège
          const white = c.piece === c.piece.toUpperCase();
          const p = c.holder.position;
          turn(c, Math.atan2(c.foe.x - p.x, c.foe.z - p.z));
          const cyc = t * 0.7 + (white ? 0 : 0.5), ph = cyc % 1;
          if (ph < 0.5) M.animate(c.parts, t, 'punch', Math.floor(cyc) + ph * 2);
          else M.animate(c.parts, t, 'guard', Math.min(1, Math.sin((ph - 0.5) * 2 * Math.PI) * 2.5));
          c.parts.root.position.x = 0;
          continue;
        }
        if (this.outcome && c.drawTo) { this.tickDrawFormation(c, t, M); continue; }
        if (this.outcome) {
          const winner = this.outcome === '1-0' ? 'w' : this.outcome === '0-1' ? 'b' : null;
          const side = c.piece === c.piece.toUpperCase() ? 'w' : 'b';
          const pose = winner && side === winner ? 'victory' : 'kneel';
          if (c.endPose !== pose) { c.endPose = pose; c.endPoseAt = t; }
          M.animate(c.parts, t, pose, Math.min(1, (t - c.endPoseAt) / 0.5));
          continue;
        }
        if (c.selected) state = 'select';
        // Les personnages ne suivent plus la caméra : ils fixent l'adversaire le plus proche (ou le plus fort à égalité)
        const at = c.holder.position;
        const look = c.faceTarget || c.watch;
        turn(c, (look ? Math.atan2(look.x - at.x, look.z - at.z) : restYaw) + (c.parts.yawOffset || 0));
        if (c.inCheck && !c.selected) { state = 'panic'; k = 0; } // le roi en échec agite les bras en l'air
        M.animate(c.parts, t, state, k);
        if (c.inCheck) c.parts.root.position.x = Math.sin(t * 40) * 0.025; // le roi tremble en échec
        else c.parts.root.position.x = 0;
      }
      // Pièces prises : K.O., projetées, emportées ou brûlées, puis disparues
      this.dying = this.dying.filter((d) => {
        if (d.knightAttack) {
          if (this.tickKnightVictim(d, t, M)) return true;
          this.pieces.remove(d.c.holder);
          return false;
        }
        const u = (t - d.t0) / (d.impaled ? 2.4 : d.burn ? BURN_TIME : d.far || d.explode || d.swept ? 1.1 : 0.8);
        if (d.burn && t > (d.burnAt !== undefined ? d.burnAt : (d.start || d.t0) + X2 + 0.15)) this.burn(d, t);
        if (u < 0 && d.impaled && d.spikes.spikes && d.spikes.spikes[d.spikes.spikes.length - 1].scale.y > 0.02) {
          // la cible est soulevée au sommet de la dernière pique pendant qu'elle surgit
          M.animate(d.c.parts, t, 'ko');
          this.impalePose(d);
          return true;
        }
        if (u < 0) {
          // pendant le duel, la cible se défend : mur de terre (pion), mur de glace (roi), ou riposte
          const p = d.c.holder.position;
          let dd = Math.atan2(d.from.x - p.x, d.from.z - p.z) - d.c.holder.rotation.y;
          d.c.holder.rotation.y += Math.atan2(Math.sin(dd), Math.cos(dd)) * ease;
          const e = t - (d.start || 0);
          if (d.ex) this.brawlMode(d.c, true); // côte à côte : aux poings et aux pieds, sans mur de protection
          if (d.counter && t < d.counter.end) this.counterShot(d, t); // riposte à distance avec sa propre technique
          else if (d.ex && e >= 0 && e < X1) M.animate(d.c.parts, t, 'guard', Math.min(1, e * 4)); // encaisse l'assaut
          else if (d.ex && e >= X1 && e < X2) {
            // riposte au corps à corps, aux poings et aux pieds
            this.brawlMode(d.c, true);
            const hits = (e - X1) * 2.2;
            M.animate(d.c.parts, t, 'punch', d.c.parts.weapon === 'element' ? 0.5 : hits);
            if (d.c.parts.weapon !== 'element') this.flash(d.c.holder.position, d.from, hits, d.c.parts.fast ? 0xffffff : 0x9ad7ff);
          } else if (d.ex && !d.c.parts.wall) M.animate(d.c.parts, t, e < 0 ? 'idle' : 'guard', e < 0 ? 0 : 1); // attend, puis subit le coup final
          else if (d.c.parts.wall && t > (d.start || d.t0)) M.animate(d.c.parts, t, 'guard', Math.min(1, (t - d.start) * 4));
          else if (d.hit) M.animate(d.c.parts, t, 'idle'); // touché de loin ou trop vite : pas le temps de riposter
          else M.animate(d.c.parts, t, 'punch', t * 1.5 + 0.5);
          return true;
        }
        if (d.counter) this.endCounter(d);
        if (u >= 1) {
          this.pieces.remove(d.c.holder); this.endBurn(d);
          if (d.spikes && d.spikes.proj) {
            this.scene.remove(d.spikes.proj);
            d.spikes.proj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
            d.spikes.proj = null;
          }
          return false;
        }
        M.animate(d.c.parts, t, 'ko');
        const r = d.c.parts.root;
        if (d.impaled) {
          // Embrochée un instant, la cible glisse le long de la dernière pique puis est projetée hors du plateau.
          this.impalePose(d);
        } else if (d.burn) {
          // brûlée sur place jusqu'aux cendres : elle s'affaisse et s'enfonce
          r.position.set(0, -u * 0.3, 0);
          r.rotation.set(-u * 0.5, 0, 0);
          r.scale.set(d.base * (1 - u * 0.3), d.base * Math.max(0.05, 1 - u), d.base * (1 - u * 0.3));
          d.c.shadow.visible = false;
          return true;
        } else if (d.explode) {
          // soufflé par l'explosion : projeté haut, tourne vite et rétrécit
          r.position.set(d.dx * u * 9, Math.sin(Math.PI * u) * 2.2, d.dz * u * 9);
          r.rotation.set(u * 16, u * 6, u * 9);
        } else if (d.far) {
          // Coup final du duel : la cible est éjectée hors de l'échiquier.
          r.position.set(d.dx * u * 9, Math.sin(Math.PI * u) * 2.6, d.dz * u * 9);
          r.rotation.set(u * 14, u * 3, u * 6);
        } else if (d.swept) {
          // emporté par le dragon d'eau
          r.position.set(d.dx * u * 9, 0.3 + Math.sin(u * 9) * 0.15, d.dz * u * 9);
          r.rotation.set(u * 4, u * 12, 0);
        } else {
          r.position.set(d.dx * u * 1.6, Math.sin(Math.PI * u) * 1.1, d.dz * u * 1.6);
          r.rotation.set(u * 9, 0, u * 4);
        }
        if (!d.impaled) r.scale.setScalar(d.base * (1 - u * (d.far || d.explode || d.swept ? 0.4 : 0.8)));
        d.c.shadow.visible = false;
        return true;
      });
      if (this.spark && t > (this.sparkUntil || 0)) this.spark.visible = false;
      this.drawRopes(t);
      this.drawCheckChains();
      this.tickWeather(t, dt / this.speed);
      this.tickAnimals(t, dt / this.speed);
      this.tickEffects(t);
      this.tickDayNight(t, dt);
      this.tickCaptureScars(t);
      this.tickCaptureCamera(t);
      this.tickAttackCamera(t);
      this.tickMateCamera(t);
      // tremblement de l'image au lancer et à l'impact
      if (this.shakeUntil > t) { const a = (this.shakeAmp || 0.05) * (this.powerUntil > t ? 1.7 : 1); this.scene.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a); }
      else this.scene.position.set(0, 0, 0);
      // la nuit et le coucher de soleil assombrissent l'image (sans toucher aux réglages des techniques)
      const ex = this.renderer.toneMappingExposure, nt = this.night || 0;
      this.renderer.toneMappingExposure = ex * (1 - 0.45 * nt - 0.1 * (this.sunset || 0) * (1 - nt));
      this.renderer.render(this.scene, this.camera);
      this.renderer.toneMappingExposure = ex;
    }

