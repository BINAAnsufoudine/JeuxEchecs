    // Angle de vue : côté du joueur + rotation choisie en glissant depuis le bord du plateau
    viewYaw() { return (this.flipped ? Math.PI : 0) + (this.yaw || 0); }
    setCamera(flipped, force) {
      if (flipped === this.flipped && !force) return;
      if (flipped !== this.flipped) this.yaw = 0; // changement de camp : on revient en face
      this.flipped = flipped;
      const a = this.viewYaw(), sn = Math.sin(a), cs = Math.cos(a);
      const radius = 13.31 * (this.zoom || 1), elevation = this.elevation * Math.PI / 180;
      const horizontal = radius * Math.cos(elevation);
      this.camera.position.set(horizontal * sn, 0.3 + radius * Math.sin(elevation), horizontal * cs);
      this.cameraTarget.set(0.45 * sn, 0.3, 0.45 * cs);
      this.camera.lookAt(this.cameraTarget);
    }

    // Toute action du joueur sur la vue reprend la main sur les caméras automatiques (prise, mat)
    takeCamera() {
      this.captureCamera = null;
      this.attackCamera = null;
      if (this.mateUltimate && this.mateUltimate.camera) this.mateUltimate.camera.released = true;
    }

    startCaptureCamera(from, to, victim, now) {
      const dying = this.dying.find((d) => d.c === victim);
      const impactEnd = dying
        ? dying.knightAttack ? dying.t0 : dying.t0 + (dying.impaled ? 2.4 : 1.1)
        : now + 1;
      const holdUntil = Math.max(impactEnd, this.busyUntil || now);
      const center = { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 };
      const dx = to.x - from.x, dz = to.z - from.z;
      const length = Math.hypot(dx, dz) || 1;
      const sideA = { x: -dz / length, z: dx / length };
      const sideB = { x: -sideA.x, z: -sideA.z };
      const currentX = this.camera.position.x - center.x, currentZ = this.camera.position.z - center.z;
      const side = sideA.x * currentX + sideA.z * currentZ >= sideB.x * currentX + sideB.z * currentZ ? sideA : sideB;
      const yaw = Math.atan2(side.x, side.z), elevation = 42 * Math.PI / 180, radius = 8.3;
      const horizontal = radius * Math.cos(elevation);
      this.captureCamera = {
        start: now,
        holdUntil,
        fromPosition: this.camera.position.clone(),
        fromTarget: this.cameraTarget.clone(),
        toPosition: new this.THREE.Vector3(center.x + horizontal * Math.sin(yaw), 0.65 + radius * Math.sin(elevation), center.z + horizontal * Math.cos(yaw)),
        toTarget: new this.THREE.Vector3(center.x, 0.65, center.z),
      };
    }

    tickCaptureCamera(t) {
      const c = this.captureCamera;
      if (!c) return;
      const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
      if (t <= c.holdUntil) {
        const u = smooth((t - c.start) / 0.45);
        this.camera.position.lerpVectors(c.fromPosition, c.toPosition, u);
        this.cameraTarget.lerpVectors(c.fromTarget, c.toTarget, u);
      } else {
        if (!c.restoreStart) {
          c.restoreStart = t;
          c.restorePosition = this.camera.position.clone();
          c.restoreTarget = this.cameraTarget.clone();
          const yaw = this.viewYaw(), sn = Math.sin(yaw), cs = Math.cos(yaw);
          const radius = 13.31 * (this.zoom || 1), elevation = this.elevation * Math.PI / 180;
          const horizontal = radius * Math.cos(elevation);
          c.endPosition = new this.THREE.Vector3(horizontal * sn, 0.3 + radius * Math.sin(elevation), horizontal * cs);
          c.endTarget = new this.THREE.Vector3(0.45 * sn, 0.3, 0.45 * cs);
        }
        const u = smooth((t - c.restoreStart) / 0.55);
        this.camera.position.lerpVectors(c.restorePosition, c.endPosition, u);
        this.cameraTarget.lerpVectors(c.restoreTarget, c.endTarget, u);
        if (u >= 1) this.captureCamera = null;
      }
      this.camera.lookAt(this.cameraTarget);
    }

    // Cadre l'attaque à distance, puis suit l'attaquant depuis l'arrière jusqu'à sa cible.
    startAttackCamera(actor, from, to, now) {
      const dx = to.x - from.x, dz = to.z - from.z;
      const length = Math.hypot(dx, dz) || 1;
      const dir = { x: dx / length, z: dz / length };
      const radius = Math.max(8.5, Math.min(12, length + 4));
      const side = { x: -dir.z, z: dir.x };
      const center = new this.THREE.Vector3((from.x + to.x) * 0.5, 0.85, (from.z + to.z) * 0.5);
      const widePosition = new this.THREE.Vector3(from.x - dir.x * radius + side.x * 1.5, 0.45 + radius * 0.64, from.z - dir.z * radius + side.z * 1.5);
      const wideTarget = center;
      this.captureCamera = null;
      this.attackCamera = {
        start: now,
        holdUntil: Math.max(now + 1.2, this.busyUntil || now),
        actor, dir, side, radius,
        fromPosition: this.camera.position.clone(),
        fromTarget: this.cameraTarget.clone(),
        widePosition, wideTarget,
      };
    }

    tickAttackCamera(t) {
      const c = this.attackCamera;
      if (!c) return;
      const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
      if (t <= c.holdUntil) {
        const approach = smooth((t - c.start) / 0.5);
        if (approach < 1) {
          this.camera.position.lerpVectors(c.fromPosition, c.widePosition, approach);
          this.cameraTarget.lerpVectors(c.fromTarget, c.wideTarget, approach);
        } else {
          const p = c.actor.holder.position;
          const followPosition = new this.THREE.Vector3(
            p.x - c.dir.x * 7.5 + c.side.x * 1.2,
            5.4,
            p.z - c.dir.z * 7.5 + c.side.z * 1.2,
          );
          const followTarget = new this.THREE.Vector3(p.x + c.dir.x * 2.4, 0.85, p.z + c.dir.z * 2.4);
          this.camera.position.lerp(followPosition, 0.16);
          this.cameraTarget.lerp(followTarget, 0.2);
        }
      } else {
        if (!c.restoreStart) {
          c.restoreStart = t;
          c.restorePosition = this.camera.position.clone();
          c.restoreTarget = this.cameraTarget.clone();
          const yaw = this.viewYaw(), sn = Math.sin(yaw), cs = Math.cos(yaw);
          const radius = 13.31 * (this.zoom || 1), elevation = this.elevation * Math.PI / 180;
          const horizontal = radius * Math.cos(elevation);
          c.endPosition = new this.THREE.Vector3(horizontal * sn, 0.3 + radius * Math.sin(elevation), horizontal * cs);
          c.endTarget = new this.THREE.Vector3(0.45 * sn, 0.3, 0.45 * cs);
        }
        const u = smooth((t - c.restoreStart) / 0.55);
        this.camera.position.lerpVectors(c.restorePosition, c.endPosition, u);
        this.cameraTarget.lerpVectors(c.restoreTarget, c.endTarget, u);
        if (u >= 1) this.attackCamera = null;
      }
      this.camera.lookAt(this.cameraTarget);
    }

    tickMateCamera(t) {
      const u = this.mateUltimate;
      if (!u || !u.camera || u.camera.released || t < u.start) return;
      const c = u.camera, elapsed = t - u.start;
      const smooth = (value) => { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); };
      if (elapsed < 0.4) {
        this.camera.position.copy(c.fromPosition);
        this.cameraTarget.lerpVectors(c.fromTarget, c.actionTarget, smooth(elapsed / 0.4));
      } else if (elapsed < 1.8) {
        this.camera.position.copy(c.fromPosition);
        this.cameraTarget.copy(c.actionTarget);
      } else {
        const zoom = smooth((elapsed - 1.8) / 1.25);
        this.camera.position.lerpVectors(c.fromPosition, c.widePosition, zoom);
        this.cameraTarget.lerpVectors(c.actionTarget, c.wideTarget, zoom);
      }
      this.camera.lookAt(this.cameraTarget);
    }

