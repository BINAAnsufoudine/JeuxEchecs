    bindInput() {
      const el = this.renderer.domElement;
      let down = null, spin = null, lastBorderTap = 0;
      const pointers = new Map();
      let pinch = 0;
      const tilt = (dy) => {
        this.takeCamera();
        this.elevation = Math.max(18, Math.min(88, this.elevation + dy * 0.35));
        this.setCamera(this.flipped, true);
      };
      const zoomBy = (factor) => {
        this.takeCamera();
        this.zoom = Math.max(0.45, Math.min(1.7, (this.zoom || 1) * factor));
        this.setCamera(this.flipped, true);
      };
      el.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(e.deltaY * 0.0015)); }, { passive: false });
      // angle du doigt autour du centre du plateau, à l'écran
      const angleAt = (x, y) => {
        const c = new this.THREE.Vector3(0, 0, 0).project(this.camera), r = el.getBoundingClientRect();
        return Math.atan2(y - (r.top + ((1 - c.y) / 2) * r.height), x - (r.left + ((c.x + 1) / 2) * r.width));
      };
      el.addEventListener('pointerdown', (e) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [p, q] = [...pointers.values()];
          pinch = Math.hypot(p.x - q.x, p.y - q.y);
          spin = null;
          if (down) down.dragged = true;
          return;
        }
        down = { x: e.clientX, y: e.clientY, lastY: e.clientY, dragged: false, tilting: false };
        spin = null;
        // après la partie, on fait pivoter le plateau en glissant n'importe où
        if (this.outcome || this.onBorder(e.clientX, e.clientY)) {
          spin = { a: angleAt(e.clientX, e.clientY), moved: false, tilting: false, lastY: e.clientY };
        }
        try { el.setPointerCapture(e.pointerId); } catch { /* sans capture */ }
      });
      el.addEventListener('pointermove', (e) => {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const [p, q] = [...pointers.values()], d = Math.hypot(p.x - q.x, p.y - q.y);
          if (pinch > 0 && d > 0) zoomBy(pinch / d);
          pinch = d;
          return;
        }
        if (!down) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (spin) {
          if (!spin.moved && Math.hypot(dx, dy) < 8) return;
          if (spin.tilting || Math.abs(dy) > Math.abs(dx) * 1.1) {
            spin.tilting = true; spin.moved = true; down.dragged = true;
            tilt(e.clientY - spin.lastY); spin.lastY = e.clientY;
            return;
          }
          const a = angleAt(e.clientX, e.clientY);
          let d = a - spin.a; d = Math.atan2(Math.sin(d), Math.cos(d));
          spin.moved = true; spin.a = a;
          d = Math.max(-MAX_ROTATION_STEP, Math.min(MAX_ROTATION_STEP, d));
          this.takeCamera();
          this.yaw = (this.yaw || 0) + d * ROTATION_SENSITIVITY;
          this.setCamera(this.flipped, true);
          return;
        }
        if (down.tilting || (Math.hypot(dx, dy) >= 8 && Math.abs(dy) > Math.abs(dx) * 1.1)) {
          down.tilting = true; down.dragged = true;
          tilt(e.clientY - down.lastY); down.lastY = e.clientY;
        } else if (Math.hypot(dx, dy) >= 8) down.dragged = true;
      });
      el.addEventListener('pointerup', (e) => {
        pointers.delete(e.pointerId); pinch = 0;
        if (pointers.size && down) { down = null; spin = null; return; }
        if (spin) {
          const moved = spin.moved; spin = null; down = null;
          if (!moved) {
            // double toucher sur le bord : retour à la vue de face
            const now = performance.now();
            if (now - lastBorderTap < 400) { this.takeCamera(); this.yaw = 0; this.zoom = 1; this.setCamera(this.flipped, true); }
            lastBorderTap = now;
          }
          return;
        }
        if (!down || down.dragged || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) { down = null; return; }
        down = null;
        const { sq, boardSq } = this.pick(e.clientX, e.clientY);
        if (sq >= 0) this.onSquare(sq, boardSq);
      });
      el.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pinch = 0; down = null; spin = null; });
    }

    // Le doigt est-il sur le cadre en bois (hors des 64 cases) ou juste autour du plateau ?
    onBorder(x, y) {
      const T = this.THREE, rect = this.renderer.domElement.getBoundingClientRect();
      this.raycaster.setFromCamera(new T.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1), this.camera);
      const b = this.raycaster.intersectObject(this.boardMesh, false)[0];
      if (!b) return !this.raycaster.intersectObjects([...this.chars.values()].map((c) => c.parts.root), true).length;
      return Math.abs(b.point.x) > 4 || Math.abs(b.point.z) > 4;
    }

    // Position écran du centre d'une case (utile aux tests)
    screenOf(sq) {
      const p = this.sqToPos(sq), v = new this.THREE.Vector3(p.x, 0.05, p.z).project(this.camera);
      const r = this.renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    }

    pick(x, y) {
      const T = this.THREE;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const v = new T.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(v, this.camera);
      // Case occupée sous le doigt d'abord ; sinon le personnage touché ; sinon la case vide
      let boardSq = -1;
      const b = this.raycaster.intersectObject(this.boardMesh, false)[0];
      if (b) {
        const f = Math.floor(b.point.x + 4), r = Math.floor(b.point.z + 4);
        if (f >= 0 && f <= 7 && r >= 0 && r <= 7) boardSq = r * 8 + f;
      }
      if (boardSq >= 0 && this.chars.has(boardSq)) return { sq: boardSq, boardSq };
      const roots = [...this.chars.values()].map((c) => c.parts.root);
      for (const h of this.raycaster.intersectObjects(roots, true)) {
        const ch = h.object.userData.char;
        if (!ch || h.object.material.blending === T.AdditiveBlending) continue; // l'aura ne compte pas
        for (const [sq, c] of this.chars) if (c.parts === ch) return { sq, boardSq };
      }
      return { sq: boardSq, boardSq };
    }
  }

  root.Board3D = Board3D;
})(window);
