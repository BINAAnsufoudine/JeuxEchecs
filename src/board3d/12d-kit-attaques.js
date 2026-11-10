    /* Attaques décrites par une fiche (KIT_ATTACKS, dans 00-constantes.js) : thèmes L'Empire des Baobabs et L'Âge des Géants.
       Une fiche dit comment la pièce va frapper : au contact (gap) ou à distance (fly), avec ou sans bond (leap), ce qui part
       de sa main (shot), ce qui se passe à l'impact (impact) et comment finit la pièce prise (end). Tout est visuel. */
    kitAttack(spec, white, from, target, to, victim, now, len, dir) {
      const a = { style: 'kit', kit: spec, white, start: now, from, target, to, victim, dir, len, fx: [], pal: KIT_PAL[spec.pal || 'baobabs'][white ? 'w' : 'b'] };
      a.customTick = (c, x, el, t, M) => this.tickKitAttack(c, x, el, t, M);
      a.customVictim = (d, x, c, el, t, M) => this.tickKitVictim(d, x, c, el, t, M);
      const wind = spec.wind || 0.5;
      if (spec.gap != null) {
        const gap = Math.min(spec.gap, len);
        a.stop = { x: target.x - dir.x * gap, z: target.z - dir.z * gap };
        a.approach = spec.leap ? 0.7 : 0.3 + Math.max(0, len - gap) * 0.09;
        a.hit = a.approach + wind;
        a.moveFrom = a.stop;
      } else {
        a.stop = from; a.approach = 0; a.wind = wind;
        a.fly = spec.fly ? spec.fly[0] + len * spec.fly[1] : 0;
        a.hit = wind + a.fly;
        a.moveFrom = from;
      }
      a.moveAt = a.hit + (spec.recover || 0.85);
      a.duration = a.moveAt + 0.3 + Math.hypot(to.x - a.moveFrom.x, to.z - a.moveFrom.z) * 0.09;
      return a;
    }
    tickKitAttack(c, a, el, t, M) {
      const T = this.THREE, p = c.parts, s = a.kit, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      if (!a.sabreRestore) a.sabreRestore = () => { p.trunkUp = null; };
      if (el >= a.moveAt) {
        const u = clamp((el - a.moveAt) / (a.duration - a.moveAt));
        this.sabreFace(c, a.to.x, a.to.z);
        c.holder.position.set(a.moveFrom.x + (a.to.x - a.moveFrom.x) * u, 0, a.moveFrom.z + (a.to.z - a.moveFrom.z) * u);
        M.animate(p, t, 'run'); p.root.position.y = 0; p.trunkUp = null;
      } else if (el < a.approach) {
        const k = clamp(el / a.approach), e = k * k * (3 - 2 * k);
        c.holder.position.set(a.from.x + (a.stop.x - a.from.x) * e, 0, a.from.z + (a.stop.z - a.from.z) * e);
        this.sabreFace(c, a.target.x, a.target.z);
        M.animate(p, t, 'run');
        if (s.leap) p.root.position.y = Math.sin(k * Math.PI) * s.leap;
      } else {
        c.holder.position.set(a.stop.x, 0, a.stop.z);
        this.sabreFace(c, a.target.x, a.target.z);
        const k = (el - a.approach) / Math.max(0.01, a.hit - a.approach);
        if (s.spin && el < a.hit) { M.animate(p, t, 'idle'); c.holder.rotation.y += 0.55; }
        else if (s.pose === 'trunk') { M.animate(p, t, 'idle'); p.trunkUp = el < a.hit ? 0.1 + clamp(k) * 1.2 : 1.3 * (1 - clamp((el - a.hit) / 0.5)); }
        else if (s.gap != null) { M.animate(p, t, 'punch', el < a.hit ? clamp(k) * 0.5 + Math.floor(k * (s.blows || 1)) : 0.9); p.root.position.z = Math.sin(clamp(k) * Math.PI) * 0.08; }
        else M.animate(p, t, 'cast', clamp(el / a.wind));
      }
      if (!a.launched && s.shot && el >= (a.approach + (a.wind || 0))) {
        a.launched = true; a.startPos = p.muzzle ? p.muzzle.getWorldPosition(new T.Vector3()) : this.handsOf(c);
        a.shotObj = this.fx(a, this.kitShot(a, s.shot));
      }
      if (a.shotObj && !a.ended) this.tickKitShot(a, a.shotObj, el, t);
      if (s.during && !a.ended) this.tickKitDuring(a, s.during, el, t, c);
      if (el >= a.hit && !a.struck) {
        a.struck = true;
        this.sabreBurst(a.target, t, [a.pal[0], a.pal[1], a.pal[2]], 16, s.big || 1);
        this.shakeUntil = t + 0.3; this.shakeAmp = s.shake || 0.1;
        if (s.impact) this.kitImpact(a, s.impact, t);
      }
      if (a.impactObj && !a.ended) this.tickKitImpact(a, a.impactObj, el, t);
    }
    // Ce qui part de la main : un groupe orienté vers la cible (axe +z)
    kitShot(a, kind) {
      const T = this.THREE, g = new T.Group(), P = a.pal, fire = (c, o) => this.sabreFire(c, o), dirY = Math.atan2(a.dir.x, a.dir.z);
      g.rotation.y = dirY; g.userData.kind = kind;
      const spearMesh = (c, core) => { const m = new T.Group(), sh = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.85, 7), fire(c, 1)); sh.rotation.x = Math.PI / 2; m.add(sh); const tip = new T.Mesh(new T.ConeGeometry(0.05, 0.2, 6), fire(core, 1)); tip.rotation.x = Math.PI / 2; tip.position.z = 0.5; m.add(tip); return m; };
      if (kind === 'ray' || kind === 'flame') {
        const m = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 1, 12), fire(P[0], 0.92)), core = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1, 10), fire(P[3] || 0xffffff, 1));
        m.rotation.x = core.rotation.x = Math.PI / 2; g.add(m, core); g.userData.beam = [m, core];
      } else if (kind === 'volley' || kind === 'embers') {
        g.userData.items = [];
        for (let i = 0; i < 7; i++) {
          const m = kind === 'volley' ? spearMesh(P[0], P[1]) : new T.Mesh(new T.SphereGeometry(0.09, 10, 8), fire(P[i % 3], 1));
          m.userData.off = [(i - 3) * 0.13, (i % 3 - 1) * 0.1, -Math.abs(i - 3) * 0.16]; g.add(m); g.userData.items.push(m);
        }
      } else if (kind === 'shadow') g.add(spearMesh(P[1], P[0]));
      else if (kind === 'wave') {
        g.userData.items = [];
        for (let i = 0; i < 4; i++) { const m = new T.Mesh(new T.TorusGeometry(0.34 + i * 0.1, 0.03, 6, 28), fire(P[i % 3], 0.9)); m.position.z = -i * 0.34; g.add(m); g.userData.items.push(m); }
      } else if (kind === 'spirit') {
        const m = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), fire(0xf4f4f8, 0.8)); m.position.y = 0.2; g.add(m);
        const tail = new T.Mesh(new T.ConeGeometry(0.24, 0.7, 12), fire(0xf4f4f8, 0.55)); tail.rotation.x = Math.PI; tail.position.y = -0.25; g.add(tail);
        for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), new T.MeshBasicMaterial({ color: 0x111111 })); e.position.set(s * 0.1, 0.25, 0.22); g.add(e); }
        g.rotation.y = 0;
      }
      return g;
    }
    tickKitShot(a, g, el, t) {
      const T = this.THREE, kind = g.userData.kind, s = a.kit, launch = a.approach + (a.wind || 0), end = new T.Vector3(a.target.x, 0.8, a.target.z);
      const k = a.fly ? (el - launch) / a.fly : 1, after = el - a.hit;
      if (kind === 'ray' || kind === 'flame') {
        const mid = a.startPos.clone().lerp(end, 0.5), L = a.startPos.distanceTo(end), w = (el < a.hit + 0.35 ? 1 : Math.max(0, 1 - (el - a.hit - 0.35) * 5)) * (0.8 + Math.sin(t * 40) * 0.2);
        g.position.copy(mid); g.lookAt(end);
        for (const m of g.userData.beam) m.scale.set(Math.max(0.01, w), L * Math.min(1, Math.max(0.05, k)), Math.max(0.01, w));
        g.visible = w > 0.02;
        return;
      }
      const pos = a.startPos.clone().lerp(end, Math.min(1, k));
      if (after > 0) pos.set(end.x + a.dir.x * after * 13, 0.8, end.z + a.dir.z * after * 13);
      g.position.copy(pos);
      a.shotAt = pos;
      g.visible = after < (s.carry ? 1 : 0.02) || (kind === 'shadow' && after < 0.35);
      if (g.userData.items) for (const [i, m] of g.userData.items.entries()) {
        if (m.userData.off) { const o = m.userData.off; m.position.set(o[0], o[1], o[2]); } else m.scale.setScalar(1 + Math.sin(t * 12 + i) * 0.1);
      }
    }
    // Pendant le coup : griffures, onde au sol, feu sur l'arme…
    tickKitDuring(a, kind, el, t, c) {
      const T = this.THREE;
      if (kind === 'roar' && el >= a.approach && !a.roared) {
        a.roared = true;
        const ring = this.fx(a, new T.Mesh(new T.TorusGeometry(0.4, 0.035, 6, 30), this.sabreFire(a.pal[0], 0.9)));
        ring.position.copy(c.parts.head.getWorldPosition(new T.Vector3())); ring.rotation.y = Math.atan2(a.dir.x, a.dir.z); a.roar = ring;
      }
      if (a.roar) { const k = Math.min(1, (el - a.approach) / 0.45); a.roar.scale.setScalar(0.5 + k * 2.2); a.roar.material.opacity = 0.9 * (1 - k); a.roar.visible = k < 1; }
      if (kind === 'fire' && c.parts.tip) {
        if (!a.weaponFire) a.weaponFire = this.fx(a, this.sabreFlames(a.pal, 0.13, 0.5, 8));
        c.parts.tip.getWorldPosition(a.weaponFire.position);
        this.sabreFlicker(a.weaponFire, t, el < a.hit + 0.4 ? 1 : 0);
      }
    }
    kitImpact(a, kind, t) {
      const T = this.THREE, P = a.target, g = this.fx(a, new T.Group()); g.position.set(P.x, 0, P.z); g.userData.kind = kind; g.userData.t0 = a.hit; a.impactObj = g;
      if (kind === 'claws') {
        for (let i = 0; i < 3; i++) { const m = this.sabreSail(0.22, 1.5, a.pal[i % 2], 0.95); m.position.set((i - 1) * 0.34, 0.85, 0.3); m.rotation.set(0, this.viewYaw(), 0.32); g.add(m); }
      } else if (kind === 'cracks' || kind === 'quake') {
        const n = kind === 'quake' ? 9 : 6;
        for (let i = 0; i < n; i++) {
          const ang = i * 1.05, r = new T.Mesh(new T.BoxGeometry(0.035, 0.014, 0.46), new T.MeshBasicMaterial({ color: a.pal[3] != null && kind === 'quake' ? a.pal[1] : 0x1a100a }));
          r.position.set(Math.cos(ang) * 0.26, 0.05, Math.sin(ang) * 0.26); r.rotation.y = -ang + Math.PI / 2; g.add(r);
        }
        if (kind === 'quake') { // le sol se fend sur toute la ligne de la charge
          const line = new T.Mesh(new T.BoxGeometry(0.07, 0.016, a.len), new T.MeshBasicMaterial({ color: a.pal[1] })); line.position.set(-a.dir.x * a.len / 2, 0.05, -a.dir.z * a.len / 2); line.rotation.y = Math.atan2(a.dir.x, a.dir.z); g.add(line);
          this.shakeUntil = t + 0.7; this.shakeAmp = 0.2;
        }
      } else if (kind === 'slash') {
        const m = this.sabreSail(0.3, 1.5, a.pal[0], 0.95); m.position.set(0, 0.85, 0.2); m.rotation.set(0, this.viewYaw(), -0.5); g.add(m);
      }
    }
    tickKitImpact(a, g, el) {
      const k = Math.min(1, (el - g.userData.t0) / 0.75);
      if (g.userData.kind === 'claws' || g.userData.kind === 'slash') { g.children.forEach((m) => { m.material.opacity = 0.95 * (1 - k); }); g.visible = k < 1; }
    }

    /* ---------- La pièce prise ---------- */
    tickKitVictim(d, a, c, el, t, M) {
      if (el >= a.duration || a.ended) return false;
      const p = c.parts, r = p.root, B = a.target, dir = a.dir, after = el - a.hit, clamp = (x) => Math.max(0, Math.min(1, x)), smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, s = a.kit;
      if (after < 0) {
        this.sabreFace(c, a.stop.x, a.stop.z);
        if (s.gap != null && s.blows > 1 && el > a.approach) { M.animate(p, t, 'punch', (el - a.approach) * 3 + 0.5); r.position.z = 0; } else M.animate(p, t, 'guard', 1);
        return true;
      }
      if (c.shadow) c.shadow.visible = false;
      M.animate(p, t, 'ko', 1);
      r.position.y = 0;
      const end = s.end || 'fall';
      if (s.burn) {
        if (!a.victimFire) a.victimFire = this.fx(a, this.sabreFlames(a.pal, 0.3, 0.9, 9));
        a.victimFire.position.set(c.holder.position.x, Math.max(0, c.holder.position.y) + r.position.y, c.holder.position.z);
      }
      if (end === 'fling') {
        const u = clamp(after / 1.25), far = u * (2 - u) * 13;
        c.holder.position.set(B.x + dir.x * far, 0, B.z + dir.z * far);
        r.position.y = Math.sin(u * Math.PI) * 2.8 + 0.05; r.rotation.set(u * 9, u * 3, u * 5);
        c.holder.visible = u < 1;
        if (a.victimFire) { a.victimFire.position.set(c.holder.position.x, r.position.y, c.holder.position.z); this.sabreFlicker(a.victimFire, t, u < 1 ? 1 : 0); }
        return true;
      }
      if (end === 'carry') {
        const at = a.shotAt || new this.THREE.Vector3(B.x, 0.8, B.z);
        c.holder.position.set(at.x, 0, at.z); r.position.y = 0.3; r.rotation.set(after * 5, after * 9, 0);
        c.holder.visible = after < 1;
        return true;
      }
      if (end === 'skyward') { // emportée dans les airs
        const u = clamp(after / 1.1);
        c.holder.position.set(B.x + dir.x * u * 7, 0, B.z + dir.z * u * 7);
        r.position.y = u * u * 7; r.rotation.set(1.2, u * 6, 0);
        c.holder.visible = u < 1;
        return true;
      }
      if (end === 'crush') {
        const f = smooth(after / 0.25);
        r.rotation.set(1.5 * f, 0, 0); r.scale.y = d.base * (1 - f * 0.6);
      } else if (end === 'bounce') {
        const up = clamp(after / 0.5), f = smooth((after - 0.45) / 0.3);
        r.position.y = Math.sin(up * Math.PI) * 0.75; r.rotation.set(up * 2 + f, 0, 0);
      } else r.rotation.set(-1.5 * smooth((after - 0.2) / 0.35), 0, 0); // elle tombe à la renverse
      if (a.victimFire) this.sabreFlicker(a.victimFire, t, 1 - clamp((after - 0.5) / 0.4));
      c.holder.visible = el < a.moveAt;
      return true;
    }

    /* ---------- Mats à fiche : un par camp ---------- */
    // Ciel du mat : dessiné avant tous les effets transparents, sinon il les recouvre
    kitSky(mat) { const m = new this.THREE.Mesh(new this.THREE.SphereGeometry(30, 20, 10), mat); m.renderOrder = -10; return m; }
    makeKitMate(u, at, keep, basic, std) {
      const T = this.THREE, P = u.target, g = u.fx, style = u.themed, A = this.sqToPos(u.attackerTo), yaw = this.viewYaw();
      const s = u.kitMate = { A, dir: new T.Vector3(P.x - A.x, 0, P.z - A.z), yaw }; s.len = Math.max(0.01, s.dir.length()); s.dir.normalize();
      g.visible = false;
      if (style === 'ancetres') {
        // tambours, puis des silhouettes dorées sortent de terre et emportent le roi vers le soleil couchant
        const gold = this.sabreFire(0xffc247, 0.82);
        s.drums = [];
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, d = new T.Group(), body = new T.Mesh(new T.CylinderGeometry(0.3, 0.18, 0.6, 12), std(0x8a5a2c)), top = new T.Mesh(new T.CylinderGeometry(0.31, 0.31, 0.03, 12), std(0xf3ead8)); body.position.y = 0.3; top.position.y = 0.61; d.add(body, top); d.position.set(P.x + Math.cos(a) * 2.2, 0, P.z + Math.sin(a) * 2.2); d.userData.top = top; g.add(d); s.drums.push(d); }
        s.anc = [];
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * Math.PI * 2, f = new T.Group(), body = new T.Mesh(new T.ConeGeometry(0.28, 1.1, 10), gold), head = new T.Mesh(new T.SphereGeometry(0.15, 10, 8), gold);
          body.position.y = 0.55; head.position.y = 1.2; f.add(body, head);
          for (const k of [-1, 1]) { const arm = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.6, 6), gold); arm.position.set(k * 0.2, 1.0, 0.08); arm.rotation.z = -k * 0.5; arm.rotation.x = -0.8; f.add(arm); }
          f.userData.a = a; g.add(f); s.anc.push(f);
        }
      } else if (style === 'meteores') {
        // le ciel s'embrase, une météorite tombe sur le roi, l'onde de choc couche les fougères
        u.camera.widePosition.set(Math.sin(yaw) * 15, 5, Math.cos(yaw) * 15); u.camera.wideTarget.set(0, 2.8, 0);
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0xb8351a, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.rock = new T.Group();
        const core = new T.Mesh(new T.DodecahedronGeometry(0.75, 0), std(0x2a1a14, { flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0.5 })); s.rock.add(core);
        const flames = this.sabreFlames([0xffb13b, 0xfff1a8, 0xff5a1a], 0.75, 3.4, 16); flames.position.y = 0.2; s.rock.add(flames); s.fire = flames; g.add(s.rock);
        s.rocks = [];
        for (let i = 0; i < 9; i++) { const m = new T.Group(); m.add(new T.Mesh(new T.SphereGeometry(0.11, 8, 6), this.sabreFire(0xffd24d, 1))); const tail = new T.Mesh(new T.ConeGeometry(0.1, 1.5, 7), this.sabreFire(0xff6a1a, 0.8)); tail.position.y = 0.75; m.add(tail); m.userData = { x: (i * 37 % 13) - 6, z: (i * 53 % 11) - 5, d: 0.5 + i * 0.26 }; g.add(m); s.rocks.push(m); }
      } else if (style === 'couleelave') {
        // le volcan explose, une rivière de lave descend jusqu'au roi et l'engloutit sous la cendre
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 5, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 2.6, -Math.cos(yaw) * 1.6);
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0x1a0e0e, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.top = new T.Vector3(-Math.sin(yaw) * 10.8, 4.2, -Math.cos(yaw) * 10.8);
        s.bursts = [];
        const hot = this.sabreFire(0xff6a1a, 1), yellow = this.sabreFire(0xffd24d, 1), bomb = new T.SphereGeometry(0.2, 8, 6);
        for (let i = 0; i < 26; i++) { const a = i * 2.4, m = new T.Mesh(bomb, i % 3 ? hot : yellow); m.userData = { vx: Math.cos(a) * (1 + (i % 4) * 0.7), vz: Math.sin(a) * (1 + (i % 4) * 0.7), vy: 7 + (i % 5) * 1.3, d: (i % 6) * 0.18 }; g.add(m); s.bursts.push(m); }
        const foot = new T.Vector3(-Math.sin(yaw) * 6.2, 0.06, -Math.cos(yaw) * 6.2), d = new T.Vector3(P.x - foot.x, 0, P.z - foot.z), L = d.length();
        s.river = new T.Group(); s.river.position.copy(foot); s.river.rotation.y = Math.atan2(d.x, d.z); g.add(s.river); s.riverLen = L;
        const flow = new T.Mesh(new T.BoxGeometry(1.5, 0.08, 1), this.sabreFire(0xff5a1a, 1)), crust = new T.Mesh(new T.BoxGeometry(0.7, 0.1, 1), this.sabreFire(0xffd24d, 1)); s.river.add(flow, crust); s.flow = [flow, crust];
        s.pool = at(new T.Mesh(new T.CylinderGeometry(1, 1, 0.1, 24), this.sabreFire(0xff5a1a, 1)), 0, 0.07, 0);
        s.ash = [];
        const ash = basic(0x8d8590, 0.9), bit = new T.BoxGeometry(0.05, 0.05, 0.05);
        for (let i = 0; i < 90; i++) { const m = new T.Mesh(bit, ash); m.userData = { x: (Math.random() - 0.5) * 12, z: (Math.random() - 0.5) * 12, y: Math.random() * 7, sp: 0.5 + Math.random() * 0.8 }; m.visible = false; g.add(m); s.ash.push(m); }
      } else if (style === 'orage') {
        // La reine danse, le ciel se couvre de nuages noirs, la pluie tombe dans un grand vent ; un gros éclair
        // frappe le roi, puis de petits éclairs frappent chaque pièce adverse : tout le camp part en cendres.
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 5.4, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 2.2, 0);
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0x15171d, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.clouds = [];
        const puffGeo = new T.SphereGeometry(1, 12, 9);
        for (let i = 0; i < 30; i++) {
          const m = new T.Mesh(puffGeo, new T.MeshBasicMaterial({ color: i % 3 ? 0x1c1e25 : 0x2c2f38, transparent: true, opacity: 0, depthWrite: false, fog: false }));
          const a = i * 2.399, r = 1 + (i % 6) * 1.2;
          m.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 6.2 + (i % 4) * 0.35, ph: i * 0.9 };
          m.scale.set(1.5 + (i % 3) * 0.4, 0.55, 1.2 + (i % 2) * 0.4); g.add(m); s.clouds.push(m);
        }
        s.rain = [];
        const drop = new T.BoxGeometry(0.014, 0.55, 0.014), water = this.sabreFire(0xa9c4dc, 0.55);
        for (let i = 0; i < 240; i++) { const m = new T.Mesh(drop, water); m.userData = { x: (Math.random() - 0.5) * 13, z: (Math.random() - 0.5) * 13, y: Math.random() * 7, sp: 9 + Math.random() * 4 }; m.rotation.z = 0.38; m.visible = false; g.add(m); s.rain.push(m); }
        s.gusts = [];
        const leaf = new T.PlaneGeometry(0.12, 0.07);
        for (let i = 0; i < 40; i++) { const m = new T.Mesh(leaf, new T.MeshBasicMaterial({ color: i % 2 ? 0x6b7a2a : 0x9a6a2c, side: T.DoubleSide })); m.userData = { z: (Math.random() - 0.5) * 11, y: 0.2 + Math.random() * 2.6, sp: 4 + Math.random() * 3, off: Math.random() * 14 }; m.visible = false; g.add(m); s.gusts.push(m); }
        // éclair : ligne brisée du ciel jusqu'à la case
        const bolt = (x, z, width, top) => {
          const b = new T.Group(), core = this.sabreFire(0xffffff, 1), glow = this.sabreFire(0x9fd0ff, 0.5);
          let p = new T.Vector3(x + (Math.random() - 0.5) * 1.5, top, z + (Math.random() - 0.5) * 1.5);
          const n = 9;
          for (let i = 1; i <= n; i++) {
            const k = i / n, q = i === n ? new T.Vector3(x, 0.3, z) : new T.Vector3(x + (Math.random() - 0.5) * 0.9 * (1 - k), top - (top - 0.3) * k, z + (Math.random() - 0.5) * 0.9 * (1 - k));
            const d = q.clone().sub(p), L = d.length(), mid = p.clone().add(q).multiplyScalar(0.5);
            for (const [mat, w] of [[core, width], [glow, width * 3.2]]) {
              const seg = new T.Mesh(new T.CylinderGeometry(w, w, L, 5), mat);
              seg.position.copy(mid); seg.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); b.add(seg);
            }
            p = q;
          }
          b.visible = false; g.add(b); return b;
        };
        const ashMat = std(0x3a3634, { roughness: 1 }), emberMat = this.sabreFire(0xff7a2a, 0.9);
        const pile = (x, z, big) => {
          const a = new T.Group(); a.position.set(x, 0, z);
          const heap = new T.Mesh(new T.ConeGeometry(0.3 * big, 0.2 * big, 10), ashMat); heap.position.y = 0.1 * big; a.add(heap);
          for (let i = 0; i < 5; i++) { const e2 = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), emberMat); e2.position.set(Math.cos(i * 1.3) * 0.18 * big, 0.05, Math.sin(i * 1.3) * 0.18 * big); a.add(e2); }
          a.scale.setScalar(0.01); a.visible = false; g.add(a); return a;
        };
        const flames = (x, z, big) => { const f = this.sabreFlames([0xffb13b, 0xfff1a8, 0xff5a1a], 0.3 * big, 0.95 * big, 9); f.position.set(x, 0, z); f.visible = false; g.add(f); return f; };
        s.bigBolt = bolt(P.x, P.z, 0.07, 9);
        s.kingFire = flames(P.x, P.z, 1.3); s.kingAsh = pile(P.x, P.z, 1.3);
        // les autres pièces du camp du roi, de la plus proche à la plus éloignée
        const kingWhite = u.king && u.king.piece === u.king.piece.toUpperCase();
        const foes = [...this.chars.values()].filter((c) => c !== u.king && c.holder.visible && (c.piece === c.piece.toUpperCase()) === kingWhite)
          .sort((a, b) => a.holder.position.distanceTo(u.king.holder.position) - b.holder.position.distanceTo(u.king.holder.position));
        u.flameVictims = foes.map((character, i) => {
          const x = character.holder.position.x, z = character.holder.position.z;
          return { character, at: 0.45 + i * 0.12, position: character.parts.root.position.clone(), scale: character.parts.root.scale.clone(), visible: character.holder.visible,
            bolt: bolt(x, z, 0.03, 7), fire: flames(x, z, 0.9), ash: pile(x, z, 0.9), x, z };
        });
      } else if (style === 'harmattan') {
        // ciel jaune, tempête de sable, yeux de léopard dans la poussière
        u.camera.widePosition.set(Math.sin(yaw) * 14.5, 4.4, Math.cos(yaw) * 14.5); u.camera.wideTarget.set(0, 2.6, 0); // la caméra descend pour montrer le ciel
        if (this.weatherGroup) { s.weatherShown = this.weatherGroup.visible; this.weatherGroup.visible = false; }
        s.skyMat = new T.MeshBasicMaterial({ color: 0xc9992f, transparent: true, opacity: 0, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false });
        g.add(this.kitSky(s.skyMat));
        s.sand = [];
        const sand = this.sabreFire(0xd9b25a, 0.7), sandDark = this.sabreFire(0xa8772e, 0.7), grain = new T.SphereGeometry(0.16, 8, 6);
        for (let i = 0; i < 90; i++) { const m = new T.Mesh(grain, i % 3 ? sand : sandDark); m.userData = { a: i * 0.7, h: (i % 13) / 13, r: 0.5 + (i % 7) * 0.3, sp: 3 + (i % 4) }; m.scale.y = 0.6; g.add(m); s.sand.push(m); }
        s.eyes = [];
        const eye = new T.MeshBasicMaterial({ color: 0xffe14d, toneMapped: false });
        for (let i = 0; i < 4; i++) { const pair = new T.Group(); for (const k of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.11, 10, 8), eye); e.scale.y = 0.55; e.position.x = k * 0.28; pair.add(e); } pair.position.set(P.x + Math.sin(yaw + i * 1.6) * 2.2, 1.4 + (i % 2) * 1.1, P.z + Math.cos(yaw + i * 1.6) * 2.2); pair.rotation.y = yaw; g.add(pair); s.eyes.push(pair); }
      }
    }
    // Danse de la reine avant l'orage : elle tourne sur elle-même en sautillant, puis lève les bras vers le ciel
    kitDance(u, c, e, smooth) {
      const root = c.parts.root, base = u.actorBase, k = smooth(e / 2.2);
      root.rotation.y = base.rotation.y + k * Math.PI * 4;
      root.position.y = base.position.y + (e < 2.2 ? Math.abs(Math.sin(e * 7)) * 0.14 : 0);
    }
    endKitMate(u) {
      if (this.checkGroup) this.checkGroup.visible = true;
      for (const f of this.volcanoFerns || []) f.rotation.set(0, 0, 0);
      if (u.kitMate.weatherShown != null && this.weatherGroup) this.weatherGroup.visible = u.kitMate.weatherShown;
    }
    tickKitMate(u, t, e, clamp, smooth, hit, after) {
      const T = this.THREE, s = u.kitMate, P = u.target, style = u.themed, fade = (d) => (after > 0 ? Math.max(0, 1 - after / d) : 1);
      u.fx.visible = true;
      if (this.checkGroup) this.checkGroup.visible = false; // le trait d'échec ne suit pas le roi emporté
      if (style === 'ancetres') {
        for (const [i, d] of s.drums.entries()) { const beat = Math.abs(Math.sin(t * 9 + i)); d.scale.y = Math.max(0.01, smooth(e / 0.4) * (1 - clamp((after - 1) / 0.4))); d.userData.top.position.y = 0.61 + beat * 0.04; d.visible = after < 1.4; }
        for (const m of s.anc) {
          const d = m.userData, rise = smooth((e - 1.1) / 1.2), close = smooth((e - 2.1) / 0.9), r = 2.5 - close * 1.5, up = after > 0 ? after * after * 2.4 : 0;
          m.position.set(P.x + Math.cos(d.a) * r - Math.sin(s.yaw) * up * 1.5, up + (rise - 1) * 1.7, P.z + Math.sin(d.a) * r - Math.cos(s.yaw) * up * 1.5);
          m.rotation.y = Math.atan2(P.x - m.position.x, P.z - m.position.z); m.visible = e > 1.1 && after < 1.9;
        }
        s.pull = after > 0 ? new T.Vector3(P.x - Math.sin(s.yaw) * after * after * 3.6, after * after * 2.4, P.z - Math.cos(s.yaw) * after * after * 3.6) : null;
      } else if (style === 'meteores') {
        s.skyMat.opacity = smooth((e - 0.2) / 1);
        const k = clamp((e - 0.7) / (hit - 0.7)), f = new T.Vector3(-Math.sin(s.yaw) * 13 + 6, 16, -Math.cos(s.yaw) * 13);
        s.rock.position.set(P.x + (f.x - P.x) * (1 - k * k), 0.4 + (f.y - 0.4) * (1 - k * k), P.z + (f.z - P.z) * (1 - k * k));
        s.rock.visible = e > 0.7 && after < 0.05; s.rock.rotation.y = t * 3; this.sabreFlicker(s.fire, t, 1);
        for (const m of s.rocks) { const d = m.userData, q = clamp((e - d.d) / 0.7); m.visible = q > 0 && q < 1; m.position.set(d.x + 3 * (1 - q), 13 * (1 - q), d.z - 2 * (1 - q)); }
        if (after > 0 && !s.boom) { s.boom = true; this.sabreBurst(P, t, [0xff8a2a, 0xffd24d, 0x2a1a14], 30, 2.2); this.shakeUntil = t + 0.9; this.shakeAmp = 0.3; }
        // l'onde de choc couche les fougères, en s'éloignant du point d'impact
        for (const f2 of this.volcanoFerns || []) {
          const dx = f2.position.x - P.x, dz = f2.position.z - P.z, dist = Math.hypot(dx, dz), w = smooth((after * 7 - dist) / 2.5) * (1 - smooth((after - 1.1) / 0.9) * 0.55);
          f2.rotation.set(dz / dist * w * 1.15, 0, -dx / dist * w * 1.15);
        }
      } else if (style === 'couleelave') {
        s.skyMat.opacity = smooth((e - 0.2) / 0.9);
        const q0 = 0.8;
        for (const m of s.bursts) { const d = m.userData, a = e - q0 - d.d, q = a % 1.7; m.visible = a > 0 && after < 1.2; m.position.set(s.top.x + d.vx * q, s.top.y + d.vy * q - 4.9 * q * q, s.top.z + d.vz * q); }
        if (e > q0 && !s.boom) { s.boom = true; this.shakeUntil = t + 2.1; this.shakeAmp = 0.1; }
        const k = smooth((e - 1) / (hit - 1)) * s.riverLen, wide = 1 + Math.sin(t * 7) * 0.06;
        for (const [i, m] of s.flow.entries()) { m.scale.z = Math.max(0.01, k); m.position.z = k / 2; m.position.y = i * 0.02; m.scale.x = wide * (i ? 0.9 + Math.sin(t * 5) * 0.2 : 1); }
        s.river.visible = e > 1;
        s.pool.visible = after > 0; s.pool.scale.setScalar(Math.min(1.3, 0.2 + after * 2.2));
        for (const m of s.ash) { const d = m.userData; m.visible = e > 1.2; m.position.set(d.x, ((d.y - e * d.sp) % 7 + 7) % 7, d.z); m.rotation.set(t * 2, t, 0); }
      } else if (style === 'orage') {
        const storm = smooth((e - 0.9) / 1.4) * fade(3);
        s.skyMat.opacity = storm * 0.92;
        // éclairs lointains dans les nuages avant la frappe
        const flicker = e > 2.4 && e < hit && Math.sin(e * 23) > 0.93;
        s.skyMat.color.setHex(flicker || (after > 0 && after < 0.12) ? 0x58607a : 0x15171d);
        this.skyDim = Math.max(this.skyDim || 0, storm * 0.95);
        for (const m of s.clouds) { const d = m.userData, k = smooth((e - 0.8) / 1.6); m.position.set(d.x * (1.6 - k * 0.6) + Math.sin(t * 0.7 + d.ph) * 0.4, d.y + (1 - k) * 2, d.z * (1.6 - k * 0.6)); m.material.opacity = 0.95 * k * fade(3); m.visible = k > 0.01; }
        const raining = e > 2 && after < 3.2;
        for (const m of s.rain) { const d = m.userData, y = ((d.y - e * d.sp) % 7 + 7) % 7; m.visible = raining; m.position.set(d.x - y * 0.4, y, d.z); }
        for (const m of s.gusts) { const d = m.userData, q = ((e * d.sp + d.off) % 14) - 7; m.visible = e > 1.8 && after < 3; m.position.set(q, d.y + Math.sin(t * 6 + d.off) * 0.25, d.z); m.rotation.set(t * 7 + d.off, t * 5, 0); }
        // gros éclair sur le roi, qui brûle jusqu'aux cendres
        s.bigBolt.visible = after > 0 && after < 0.4 && Math.sin(after * 70) > -0.4;
        if (after > 0 && !s.boom) { s.boom = true; this.sabreBurst(P, t, [0xcfe6ff, 0xffffff, 0x5a7aa8], 26, 1.8); this.shakeUntil = t + 0.9; this.shakeAmp = 0.28; }
        const kb = smooth((after - 0.1) / 0.3) * (1 - smooth((after - 1.1) / 0.5));
        this.sabreFlicker(s.kingFire, t, kb);
        s.kingAsh.visible = after > 0.7; s.kingAsh.scale.setScalar(Math.max(0.01, smooth((after - 0.7) / 0.6)));
        // petits éclairs sur chaque pièce adverse, qui part en cendres à son tour
        for (const v of u.flameVictims) {
          const a = after - v.at, root = v.character.parts.root;
          v.bolt.visible = a > 0 && a < 0.25 && Math.sin(a * 80) > -0.3;
          if (a > 0 && !v.hit) { v.hit = true; this.sabreBurst({ x: v.x, z: v.z }, t, [0xcfe6ff, 0xffffff], 8, 0.7); }
          this.sabreFlicker(v.fire, t, smooth((a - 0.05) / 0.25) * (1 - smooth((a - 0.9) / 0.4)));
          const k = smooth((a - 0.1) / 0.9);
          if (a > 0) { root.scale.set(v.scale.x * (1 - k * 0.96), v.scale.y * Math.max(0.02, 1 - k), v.scale.z * (1 - k * 0.96)); v.character.holder.visible = a < 1; }
          v.ash.visible = a > 0.6; v.ash.scale.setScalar(Math.max(0.01, smooth((a - 0.6) / 0.5)));
        }
      } else if (style === 'harmattan') {
        s.skyMat.opacity = smooth((e - 0.2) / 1);
        const k = smooth((e - 0.5) / 2.2);
        for (const m of s.sand) { const d = m.userData, a = d.a + t * d.sp, r = (3.6 - k * 2.5) * (0.4 + d.r * 0.4), y = 0.1 + ((d.h + t * 0.28) % 1) * 3.6; m.position.set(P.x + Math.cos(a) * r, y, P.z + Math.sin(a) * r); m.visible = e > 0.5 && after < 1.4; m.material.opacity = 0.75 * fade(1.4); }
        for (const [i, p] of s.eyes.entries()) { const on = e > 1.1 + i * 0.25 && after < 0.8; p.visible = on && Math.sin(t * 2.3 + i * 2) > -0.75; }
      }
    }

