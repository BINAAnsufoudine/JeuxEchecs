  class Board3D {
    constructor(container, onSquare) {
      this.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.speed = this.reducedMotion ? 1.2 : 0.75;
      const THREE = root.THREE;
      if (!THREE) throw new Error('three.js absent');
      this.THREE = THREE;
      this.container = container;
      this.onSquare = onSquare;
      Board3D.instance = this;
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      // Un plafond plus bas réduit fortement le coût du rendu sur les écrans haute densité.
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.98;
      container.appendChild(this.renderer.domElement);
      this.renderer.domElement.className = 'board3d';

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x18211f);
      this.environmentTexture = this.makeStudioEnvironment();
      this.scene.environment = this.environmentTexture;
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      this.hemi = new THREE.HemisphereLight(0xeaf1ff, 0x3a342d, 0.88);
      this.scene.add(this.hemi);
      const sun = new THREE.DirectionalLight(0xffe8c9, 1.05);
      sun.position.set(-5, 11, 7);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
      sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
      sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 30;
      sun.shadow.bias = -0.00025;
      sun.shadow.normalBias = 0.025;
      sun.shadow.radius = 4;
      this.scene.add(sun);
      this.sun = sun;
      const fill = new THREE.DirectionalLight(0xc8dcff, 0.28);
      fill.position.set(5, 6, -7); this.scene.add(fill);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x28332f, roughness: 0.94 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = GROUND; floor.receiveShadow = true;
      this.scene.add(floor);
      this.floor = floor;
      this.woodTexture = this.makeWoodTexture();

      // Socle en bois
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(SIZE + 0.3, 0.5, SIZE + 0.3),
        new THREE.MeshStandardMaterial({ map: this.woodTexture, color: 0x543821, roughness: 0.35, metalness: 0.01, bumpMap: this.woodTexture, bumpScale: 0.035 }),
      );
      base.position.y = -0.27;
      base.castShadow = true; base.receiveShadow = true;
      this.scene.add(base);
      this.base = base;
      this.terrainGroup = new THREE.Group(); this.terrainGroup.position.y = GROUND + 0.535; this.scene.add(this.terrainGroup);
      this.terrain = null;
      this.weatherGroup = new THREE.Group(); this.scene.add(this.weatherGroup);
      this.weather = null; this.weatherBolts = [];
      this.weatherFlash = null;
      this.lightningLight = new THREE.PointLight(0xc9e2ff, 0, 35, 2);
      this.lightningLight.position.set(0, 8, 0); this.scene.add(this.lightningLight);

      // Plateau : une texture canvas (cases + coordonnées)
      this.boardCanvas = document.createElement('canvas');
      this.boardCanvas.width = this.boardCanvas.height = TEX;
      this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
      this.boardTex.encoding = THREE.sRGBEncoding;
      this.boardTex.anisotropy = 4;
      this.boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshStandardMaterial({ map: this.boardTex, roughness: 0.38, metalness: 0.005, bumpMap: this.woodTexture, bumpScale: 0.022 }));
      this.boardMesh.rotation.x = -Math.PI / 2;
      this.boardMesh.receiveShadow = true;
      this.scene.add(this.boardMesh);

      this.overlay = new THREE.Group();
      this.scene.add(this.overlay);
      this.tutorialStarGeometry = null;
      this.tutorialStarMaterial = null;
      this.pieces = new THREE.Group();
      this.scene.add(this.pieces);
      this.mateFireGroup = new THREE.Group();
      this.scene.add(this.mateFireGroup);
      this.mateFireKey = '';

      this.chars = new Map(); // case -> personnage
      this.dying = [];
      this.mateUltimate = null;
      this.mateUltimateKey = '';
      this.captureScars = [];
      this.checkGroup = new THREE.Group(); this.scene.add(this.checkGroup);
      // échec : disque noir sous le roi, trait noir au sol jusqu'à la pièce qui donne l'échec
      this.checkDiskGeo = new THREE.CircleGeometry(0.49, 48);
      this.checkLineGeo = new THREE.PlaneGeometry(1, 0.07);
      this.checkMat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide });
      this.checkLinks = []; this.checkKey = '';
      this.shadowTex = this.makeShadowTexture();
      this.flipped = null;
      this.boardKey = '';
      this.boardTextureKey = '';
      this.elevation = 38;
      this.cameraTarget = new THREE.Vector3(0, 0.3, 0);
      this.captureCamera = null;
      this.attackCamera = null;

      this.raycaster = new THREE.Raycaster();
      this.bindInput();
      this.resize();
      if (root.ResizeObserver) new ResizeObserver(() => this.resize()).observe(container);
      else window.addEventListener('resize', () => this.resize());
      // La boucle ne doit jamais s'arrêter : une erreur ponctuelle ne fige plus l'affichage
      let fails = 0, lost = false;
      const cv = this.renderer.domElement;
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; this.container.dispatchEvent(new CustomEvent('board3dcontext', { bubbles: true, detail: { lost: true } })); });
      cv.addEventListener('webglcontextrestored', () => { lost = false; this.boardTextureKey = ''; this.resize(); this.container.dispatchEvent(new CustomEvent('board3dcontext', { bubbles: true, detail: { lost: false } })); });
      const loop = (t) => {
        requestAnimationFrame(loop);
        if (lost) return;
        try { this.tick(t); fails = 0; }
        catch (err) {
          if (fails++ === 0) console.error('Erreur 3D', err);
          if (fails === 3) { try { this.clearTransient(); } catch { /* ignoré */ } }
        }
      };
      requestAnimationFrame(loop);
    }

    resize() {
      const w = this.container.clientWidth || 300, h = this.container.clientHeight || w;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    sqToPos(sq) { return { x: (sq & 7) - 3.5, z: (sq >> 3) - 3.5 }; }

    drawBoard(light, dark, coords, flipped, board = []) {
      const terrain = this.terrain;
      const squareLight = terrain ? terrain.squares[0] : light;
      const squareDark = terrain ? terrain.squares[1] : dark;
      const key = light + dark + coords + flipped + (terrain ? terrain.name : '') + board.map((p) => p || '.').join('');
      if (key === this.boardTextureKey) return;
      this.boardTextureKey = key;
      const c = this.boardCanvas.getContext('2d');
      const cell = TEX / SIZE, off = BORDER * cell;
      const g = c.createLinearGradient(0, 0, TEX, TEX);
      const frame = terrain ? terrain.frame : ['#987148', '#694728', '#3f291b'];
      g.addColorStop(0, frame[0]); g.addColorStop(0.48, frame[1]); g.addColorStop(1, frame[2]);
      c.fillStyle = g; c.fillRect(0, 0, TEX, TEX);
      // Veines discrètes dans le bois du cadre, dessinées une fois par thème.
      for (let i = 0; i < 74; i++) {
        const y = (i + 0.5) * TEX / 74, sway = 4 + (i % 5) * 3;
        c.strokeStyle = i % 3 ? 'rgba(255,225,176,0.035)' : 'rgba(24,12,5,0.10)';
        c.lineWidth = i % 4 === 0 ? 2 : 1;
        c.beginPath(); c.moveTo(0, y);
        c.bezierCurveTo(TEX * 0.28, y - sway, TEX * 0.68, y + sway, TEX, y - sway * 0.3); c.stroke();
      }
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const x = off + f * cell, y = off + r * cell;
        c.fillStyle = (r + f) % 2 ? squareDark : squareLight;
        c.fillRect(x, y, cell + 0.5, cell + 0.5);
        const polish = c.createLinearGradient(x, y, x + cell, y + cell);
        polish.addColorStop(0, 'rgba(255,255,255,0.10)');
        polish.addColorStop(0.52, 'rgba(255,255,255,0.015)');
        polish.addColorStop(1, 'rgba(20,14,9,0.10)');
        c.fillStyle = polish; c.fillRect(x, y, cell, cell);
        c.strokeStyle = 'rgba(35,24,15,0.12)'; c.lineWidth = 2;
        c.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        const piece = board[r * 8 + f];
        if (piece) {
          const white = piece === piece.toUpperCase();
          c.save();
          c.translate(x + cell * 0.5, y + cell * 0.5);
          if (flipped) c.rotate(Math.PI);
          c.font = `${Math.round(cell * 0.94)}px "DejaVu Sans", "Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", serif`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineWidth = cell * 0.065; c.lineJoin = 'round';
          c.strokeStyle = white ? 'rgba(35,29,22,0.96)' : 'rgba(255,255,255,0.96)';
          c.fillStyle = white ? '#fffdf6' : '#171719';
          c.shadowColor = white ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)';
          c.shadowBlur = cell * 0.09;
          const icon = PIECE_GLYPHS[piece.toLowerCase()] + '\uFE0E';
          c.strokeText(icon, 0, 0); c.fillText(icon, 0, 0);
          c.restore();
        }
      }
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 4;
      c.strokeRect(off, off, cell * 8, cell * 8);
      if (coords) {
        c.fillStyle = '#f3dfbf'; c.font = `bold ${Math.round(cell * 0.34)}px system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let i = 0; i < 8; i++) {
          const m = off + (i + 0.5) * cell;
          // Lettres lisibles du côté du joueur, même plateau tourné
          const label = (s, x, y) => { c.save(); c.translate(x, y); if (flipped) c.rotate(Math.PI); c.fillText(s, 0, 0); c.restore(); };
          label(FILES[i], m, TEX - off / 2); label(FILES[i], m, off / 2);
          label(String(8 - i), off / 2, m); label(String(8 - i), TEX - off / 2, m);
        }
      }
      this.boardTex.needsUpdate = true;
    }

    setTerrain(id) {
      const terrain = TERRAINS[id] || TERRAINS.forest;
      this.terrain = terrain;
      this.scene.background.setHex(terrain.sky);
      this.scene.fog = new this.THREE.Fog(terrain.sky, 32, 85);
      this.skyBase = new this.THREE.Color(terrain.sky);
      this.floor.material.color.setHex(terrain.ground);
      this.base.material.color.setHex(terrain.wood);
      this.hemi.color.setHex(terrain.sky);
      this.hemi.groundColor.setHex(terrain.ground);
      this.sun.color.setHex(terrain.kind === 'desert' || terrain.kind === 'steppe' || terrain.kind === 'beach' ? 0xffe1af : 0xffffff);
      this.boardTextureKey = '';
      this.buildTerrain(terrain);
      this.buildAnimals(terrain);
      this.buildScenery(terrain);
    }

    setWeather(id) {
      const T = this.THREE, weather = WEATHERS[id] || WEATHERS.sun, terrain = this.terrain || TERRAINS.forest;
      this.weather = weather;
      // le vent fait aussi bouger les tenues des pièces
      if (window.Models3D && window.Models3D.setWind) window.Models3D.setWind(weather.wind || 0);
      const overcast = weather.overcast || 0;
      const sky = new T.Color(terrain.sky).lerp(new T.Color(weather.tint), overcast);
      this.scene.background.copy(sky);
      this.scene.fog = new T.Fog(sky, weather.fogFar * 0.38, weather.fogFar);
      this.skyBase = sky.clone();
      this.backdropTint = new T.Color(0xffffff).lerp(new T.Color(weather.tint || 0x888888), overcast * 0.8);
      this.hemi.intensity = weather.hemi;
      this.hemi.color.copy(sky);
      this.sun.intensity = weather.sun;
      this.sun.color.setHex(weather.sunColor || 0xffffff);
      this.lightningLight.intensity = 0;
      this.weatherFlash = null;
      this.nextLightning = weather.lightning ? (this.lastT || 0) + 1.8 + Math.random() * 2.2 : 0;
      this.boardTextureKey = '';
      this.buildWeather(weather);
    }

    buildWeather(weather) {
      const T = this.THREE, oldGeo = new Set(), oldMat = new Set();
      this.weatherGroup.traverse((o) => {
        if (o.geometry) oldGeo.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => oldMat.add(m));
      });
      this.weatherGroup.clear();
      oldGeo.forEach((g) => g.dispose()); oldMat.forEach((m) => m.dispose());
      this.weatherBolts = []; this.weatherRain = null; this.weatherSnow = null; this.weatherWind = null;

      if (weather.sunDisc) {
        // soleil haut dans le ciel, ou bas et orangé au coucher
        const sun = new T.Mesh(new T.SphereGeometry(weather.sunLow ? 1.4 : 0.72, 16, 12), new T.MeshBasicMaterial({ color: weather.sunDisc, fog: false }));
        sun.position.set(-8, weather.sunLow ? 2.2 : 8.5, weather.sunLow ? -16 : -9); this.weatherGroup.add(sun);
        if (weather.sunLow) {
          const halo = new T.Mesh(new T.SphereGeometry(3, 16, 12), new T.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0.25, fog: false, depthWrite: false, blending: T.AdditiveBlending }));
          halo.position.copy(sun.position); this.weatherGroup.add(halo);
        }
      }

      if (weather.snow) {
        // flocons qui descendent lentement en se balançant
        const count = weather.snow, positions = new Float32Array(count * 3), seeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 17; positions[i * 3 + 1] = Math.random() * 12; positions[i * 3 + 2] = (Math.random() - 0.5) * 17;
          seeds[i] = Math.random() * 10;
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(positions, 3));
        const flakes = new T.Points(geo, new T.PointsMaterial({ color: 0xffffff, size: 0.11, transparent: true, opacity: 0.95, depthWrite: false }));
        flakes.frustumCulled = false; this.weatherGroup.add(flakes);
        this.weatherSnow = { positions, seeds, count, geometry: geo };
      }

      if (weather.gusts) {
        // rafales : traits de vent et feuilles qui traversent le plateau
        const count = weather.gusts, positions = new Float32Array(count * 6), speeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          const x = (Math.random() - 0.5) * 20, y = 0.2 + Math.random() * 4, z = (Math.random() - 0.5) * 17, l = 0.4 + Math.random() * 0.9;
          positions.set([x, y, z, x + l, y + 0.02, z + 0.05], i * 6);
          speeds[i] = 7 + Math.random() * 6;
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(positions, 3));
        const streaks = new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: weather.rain ? 0.22 : 0.32, depthWrite: false }));
        streaks.frustumCulled = false; this.weatherGroup.add(streaks);
        const leaves = [];
        for (let i = 0; i < (weather.leaves || 0); i++) {
          const leaf = new T.Mesh(new T.PlaneGeometry(0.1, 0.06), new T.MeshBasicMaterial({ color: [0x6f9a3c, 0xb8a04a, 0xc77a2e][i % 3], side: T.DoubleSide, transparent: true, opacity: 0.9 }));
          leaf.position.set((Math.random() - 0.5) * 20, 0.2 + Math.random() * 3, (Math.random() - 0.5) * 16); leaf.userData.seed = Math.random() * 10;
          this.weatherGroup.add(leaf); leaves.push(leaf);
        }
        this.weatherWind = { positions, speeds, count, geometry: geo, leaves };
      }

      if (weather.cloud) {
        const cloudMat = new T.MeshStandardMaterial({ color: weather.tint, roughness: 1 });
        const cloudGeo = new T.SphereGeometry(1, 10, 7);
        const clouds = [[-8,7,-8,2.8,0.7,1.4],[0,8,-10,3.5,0.8,1.3],[8,7,-7,2.6,0.7,1.4],[-9,7,1,2.5,0.65,1.3],[9,7,2,2.8,0.7,1.5]];
        clouds.forEach(([x,y,z,sx,sy,sz]) => {
          const cloud = new T.Mesh(cloudGeo, cloudMat); cloud.position.set(x,y,z); cloud.scale.set(sx,sy,sz);
          cloud.castShadow = false; cloud.receiveShadow = false; this.weatherGroup.add(cloud);
        });
      }

      if (weather.rain) {
        const count = weather.rain, positions = new Float32Array(count * 6), speeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
          const at = i * 6, x = (Math.random() - 0.5) * 17, y = Math.random() * 12, z = (Math.random() - 0.5) * 17;
          positions[at] = x; positions[at + 1] = y; positions[at + 2] = z;
          positions[at + 3] = x - 0.055; positions[at + 4] = y - 0.34; positions[at + 5] = z + 0.035;
          speeds[i] = weather.speed * (0.72 + Math.random() * 0.65);
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(positions, 3));
        const material = new T.LineBasicMaterial({ color: 0xc6d9e7, transparent: true, opacity: weather.rainOpacity || 0.52, depthWrite: false });
        const rain = new T.LineSegments(geo, material); rain.frustumCulled = false; this.weatherGroup.add(rain);
        this.weatherRain = { positions, speeds, count, geometry: geo };
      }
    }

    makeLightning(t) {
      const T = this.THREE, x = (Math.random() - 0.5) * 7, z = (Math.random() - 0.5) * 7;
      const points = [new T.Vector3(x, 9.5, z)];
      for (let i = 1; i < 9; i++) points.push(new T.Vector3(x + (Math.random() - 0.5) * 1.25, 9.5 - i * 1.15, z + (Math.random() - 0.5) * 1.25));
      const geometry = new T.BufferGeometry().setFromPoints(points);
      const material = new T.LineBasicMaterial({ color: 0xe1efff, transparent: true, opacity: 0.96, blending: T.AdditiveBlending });
      const bolt = new T.Line(geometry, material); this.weatherGroup.add(bolt);
      this.weatherBolts.push({ bolt, until: t + 0.18 });
      this.weatherFlash = { start: t, end: t + 0.28 };
      this.nextLightning = t + 4 + Math.random() * 7;
    }

    tickWeather(t, dt) {
      if (!this.weather) return;
      if (this.weatherRain) {
        const { positions, speeds, count, geometry } = this.weatherRain;
        for (let i = 0; i < count; i++) {
          const at = i * 6;
          const lean = 0.09 + (this.weather.wind || 0) * 0.55;
          positions[at + 1] -= speeds[i] * dt;
          positions[at] += speeds[i] * dt * (this.weather.wind ? lean : -0.09);
          positions[at + 4] -= speeds[i] * dt;
          positions[at + 3] += speeds[i] * dt * (this.weather.wind ? lean : -0.09);
          if (positions[at + 1] < -0.45) {
            const w = this.weather.wind || 0;
            const x = (Math.random() - 0.5) * 17 - w * 4, y = 7 + Math.random() * 6, z = (Math.random() - 0.5) * 17;
            positions[at] = x; positions[at + 1] = y; positions[at + 2] = z;
            positions[at + 3] = x - 0.055 - w * 0.2; positions[at + 4] = y - 0.34; positions[at + 5] = z + 0.035;
          }
        }
        geometry.attributes.position.needsUpdate = true;
      }
      if (this.weatherSnow) {
        const { positions, seeds, count, geometry } = this.weatherSnow;
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 1] -= (0.45 + (seeds[i] % 1) * 0.35) * dt;
          positions[i * 3] += Math.sin(t * 0.9 + seeds[i]) * 0.25 * dt;
          positions[i * 3 + 2] += Math.cos(t * 0.7 + seeds[i]) * 0.2 * dt;
          if (positions[i * 3 + 1] < -0.4) { positions[i * 3] = (Math.random() - 0.5) * 17; positions[i * 3 + 1] = 10 + Math.random() * 2; positions[i * 3 + 2] = (Math.random() - 0.5) * 17; }
        }
        geometry.attributes.position.needsUpdate = true;
      }
      if (this.weatherWind) {
        const { positions, speeds, count, geometry, leaves } = this.weatherWind;
        // rafales : le vent forcit et faiblit
        const gust = 0.7 + 0.3 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 2.3);
        for (let i = 0; i < count; i++) {
          const d = speeds[i] * gust * dt;
          positions[i * 6] += d; positions[i * 6 + 3] += d;
          if (positions[i * 6] > 11) { const l = positions[i * 6 + 3] - positions[i * 6]; positions[i * 6] = -11 - Math.random() * 3; positions[i * 6 + 3] = positions[i * 6] + l; }
        }
        geometry.attributes.position.needsUpdate = true;
        leaves.forEach((leaf) => {
          const s = leaf.userData.seed;
          leaf.position.x += (3.5 + (s % 2)) * gust * dt;
          leaf.position.y += Math.sin(t * 3 + s) * 0.6 * dt;
          leaf.rotation.set(t * 4 + s, t * 3, t * 5 + s);
          if (leaf.position.x > 11) { leaf.position.x = -11; leaf.position.y = 0.2 + Math.random() * 3; leaf.position.z = (Math.random() - 0.5) * 16; }
        });
      }
      if (this.weather.lightning && t >= this.nextLightning) this.makeLightning(t);
      this.weatherBolts = this.weatherBolts.filter(({ bolt, until }) => {
        if (t < until) return true;
        this.weatherGroup.remove(bolt); bolt.geometry.dispose(); bolt.material.dispose(); return false;
      });
      let flash = 0;
      if (this.weatherFlash && t < this.weatherFlash.end) {
        const age = t - this.weatherFlash.start;
        flash = age < 0.07 ? 7 : age < 0.15 ? 1.2 : age < 0.2 ? 5 : 0;
      } else this.weatherFlash = null;
      this.lightningLight.intensity = flash;
      this.sun.intensity = this.weather.sun + flash * 0.23;
      this.hemi.intensity = this.weather.hemi + flash * 0.08;
      // Ciel assombri par une technique (éclairs du fou noir) : les éclairs n'en brillent que plus
      const dim = this.skyDim || 0;
      if (dim > 0) { this.sun.intensity *= 1 - 0.85 * dim; this.hemi.intensity *= 1 - 0.75 * dim; }
      const night = this.night || 0;
      if (night > 0) { this.sun.intensity *= 1 - 0.7 * night; this.hemi.intensity *= 1 - 0.45 * night; }
    }

    // Animaux du décor : ceux qui représentent le mieux chaque paysage se promènent, sautent, volent ou nagent autour du plateau
    buildAnimals(terrain) {
      const T = this.THREE;
      if (!this.animalGroup) { this.animalGroup = new T.Group(); this.animalGroup.position.y = GROUND + 0.535; this.scene.add(this.animalGroup); }
      this.animalGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      this.animalGroup.clear();
      this.animals = [];
      const mat = (color) => new T.MeshStandardMaterial({ color, roughness: 0.85 });
      const mesh = (geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; return o; };
      const box = new T.BoxGeometry(1, 1, 1), ball = new T.SphereGeometry(0.5, 12, 9), cone = new T.ConeGeometry(0.5, 1, 7), cyl = new T.CylinderGeometry(0.5, 0.5, 1, 7);
      const eyeM = mat(0x111111);
      const put = (p, o, rx = 0, ry = 0, rz = 0) => { o.rotation.set(rx, ry, rz); p.add(o); return o; };
      // Quadrupède : corps, cou, tête, pattes articulées (cerf, vache, chameau, chèvre…)
      const quad = (o) => {
        const g = new T.Group(), m = mat(o.color), dark = mat(o.dark || 0x2b2018);
        const L = o.len, H = o.h, W = o.w, legH = o.legH;
        g.add(mesh(ball, m, 0, legH + H / 2, 0, W, H, L));
        if (o.spots) for (let i = 0; i < 4; i++) g.add(mesh(ball, mat(o.spots), (i % 2 ? 0.5 : -0.5) * W * 0.55, legH + H * 0.6, (i - 1.5) * L * 0.18, W * 0.35, H * 0.35, L * 0.2));
        if (o.wool) for (let i = 0; i < 6; i++) g.add(mesh(ball, m, (i % 2 ? 0.3 : -0.3) * W, legH + H * 0.62, (i / 5 - 0.5) * L * 0.7, W * 0.6, H * 0.6, W * 0.6));
        if (o.humps) for (let i = 0; i < o.humps; i++) g.add(mesh(ball, m, 0, legH + H * 0.95, (o.humps === 1 ? 0 : (i ? -0.18 : 0.18)) * L, W * 0.6, H * 0.6, L * 0.3));
        const neck = new T.Group(); neck.position.set(0, legH + H * 0.7, L * 0.42); g.add(neck);
        neck.add(mesh(cyl, m, 0, o.neck / 2, 0, W * 0.35, o.neck, W * 0.35));
        const head = new T.Group(); head.position.set(0, o.neck, 0.02); neck.add(head);
        neck.rotation.x = o.neckTilt || 0.5; head.rotation.x = -(o.neckTilt || 0.5);
        head.add(mesh(ball, m, 0, 0, o.head * 0.4, o.head * 0.75, o.head * 0.7, o.head * 1.3));
        head.add(mesh(ball, o.muzzle ? mat(o.muzzle) : dark, 0, -o.head * 0.08, o.head * 1.0, o.head * 0.45, o.head * 0.38, o.head * 0.4));
        for (const s of [-1, 1]) {
          head.add(mesh(ball, eyeM, s * o.head * 0.3, o.head * 0.12, o.head * 0.62, o.head * 0.12, o.head * 0.12, o.head * 0.12));
          if (o.ears) put(head, mesh(cone, m, s * o.head * 0.32, o.head * 0.42, o.head * 0.1, o.head * 0.18, o.head * o.ears, o.head * 0.12), 0, 0, -s * 0.5);
          if (o.horns) put(head, mesh(cone, mat(o.hornColor || 0xd8ccb0), s * o.head * 0.22, o.head * 0.55, -o.head * 0.05, o.head * 0.12, o.head * o.horns, o.head * 0.12), -0.5, 0, -s * 0.25);
          if (o.antlers) {
            const a = new T.Group(); a.position.set(s * o.head * 0.22, o.head * 0.4, 0); a.rotation.z = -s * 0.35; head.add(a);
            a.add(mesh(cyl, mat(0x8a6a44), 0, o.head * 0.45, 0, o.head * 0.07, o.head * 0.9, o.head * 0.07));
            for (let k = 0; k < 3; k++) put(a, mesh(cyl, mat(0x8a6a44), s * o.head * 0.15, o.head * (0.35 + k * 0.22), o.head * 0.05, o.head * 0.05, o.head * 0.35, o.head * 0.05), 0, 0, -s * 0.9);
          }
        }
        if (o.mane) neck.add(mesh(box, mat(o.mane), 0, o.neck * 0.55, -W * 0.15, W * 0.12, o.neck * 1.05, W * 0.18));
        const tail = mesh(cyl, o.tailColor ? mat(o.tailColor) : m, 0, legH + H * 0.75, -L * 0.52, W * 0.1, H * 0.7, W * 0.1); tail.rotation.x = 0.5; g.add(tail);
        const legs = [];
        for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
          const pivot = new T.Group(); pivot.position.set(sx * W * 0.3, legH, sz * L * 0.32); g.add(pivot);
          pivot.add(mesh(cyl, m, 0, -legH / 2, 0, W * 0.16, legH, W * 0.16));
          pivot.add(mesh(cyl, dark, 0, -legH + 0.02, 0, W * 0.18, 0.05, W * 0.18));
          legs.push(pivot);
        }
        g.scale.setScalar(o.scale || 1);
        return { g, legs, neck, tail };
      };
      // Oiseau en vol : corps fuselé et deux ailes qui battent
      const bird = (color, span, beakColor = 0xe0a030) => {
        const g = new T.Group(), m = mat(color);
        g.add(mesh(ball, m, 0, 0, 0, span * 0.22, span * 0.2, span * 0.55));
        g.add(mesh(ball, m, 0, span * 0.06, span * 0.3, span * 0.17, span * 0.17, span * 0.2));
        put(g, mesh(cone, mat(beakColor), 0, span * 0.05, span * 0.45, span * 0.06, span * 0.14, span * 0.06), Math.PI / 2, 0, 0);
        const wings = [];
        for (const s of [-1, 1]) {
          const w = new T.Group(); w.position.set(s * span * 0.08, span * 0.04, 0); g.add(w);
          w.add(mesh(box, m, s * span * 0.27, 0, 0, span * 0.55, span * 0.03, span * 0.26));
          wings.push(w);
        }
        return { g, wings };
      };
      // Petites bêtes : lapin, grenouille, crabe, lézard, tortue, canard, cochon, papillon
      const small = (kind) => {
        const g = new T.Group();
        if (kind === 'rabbit') {
          const m = mat(0x9b9188);
          g.add(mesh(ball, m, 0, 0.14, 0, 0.22, 0.2, 0.3)); g.add(mesh(ball, m, 0, 0.24, 0.14, 0.15, 0.15, 0.16));
          for (const s of [-1, 1]) { g.add(mesh(ball, m, s * 0.04, 0.36, 0.12, 0.04, 0.16, 0.03)); g.add(mesh(ball, eyeM, s * 0.05, 0.26, 0.21, 0.025, 0.025, 0.025)); }
          g.add(mesh(ball, mat(0xffffff), 0, 0.16, -0.16, 0.07, 0.07, 0.07));
        } else if (kind === 'frog') {
          const m = mat(0x4f9a3a);
          g.add(mesh(ball, m, 0, 0.07, 0, 0.2, 0.11, 0.24));
          for (const s of [-1, 1]) { g.add(mesh(ball, m, s * 0.06, 0.13, 0.08, 0.07, 0.07, 0.07)); g.add(mesh(ball, eyeM, s * 0.07, 0.15, 0.1, 0.035, 0.035, 0.035)); g.add(mesh(ball, m, s * 0.1, 0.04, -0.08, 0.08, 0.05, 0.14)); }
        } else if (kind === 'crab') {
          const m = mat(0xd2462e);
          g.add(mesh(ball, m, 0, 0.07, 0, 0.26, 0.09, 0.18));
          for (const s of [-1, 1]) {
            g.add(mesh(ball, m, s * 0.16, 0.08, 0.1, 0.09, 0.06, 0.07));
            g.add(mesh(cyl, m, s * 0.04, 0.13, 0.05, 0.015, 0.06, 0.015)); g.add(mesh(ball, eyeM, s * 0.04, 0.17, 0.05, 0.03, 0.03, 0.03));
            for (let k = 0; k < 3; k++) put(g, mesh(cyl, m, s * 0.15, 0.04, (k - 1) * 0.06, 0.015, 0.12, 0.015), 0, 0, s * 1.1);
          }
        } else if (kind === 'lizard') {
          const m = mat(0x8a7a3c);
          g.add(mesh(ball, m, 0, 0.04, 0, 0.08, 0.05, 0.3)); g.add(mesh(ball, m, 0, 0.05, 0.17, 0.07, 0.05, 0.09));
          put(g, mesh(cone, m, 0, 0.03, -0.27, 0.04, 0.3, 0.04), -Math.PI / 2, 0, 0);
          for (const s of [-1, 1]) for (const z of [0.08, -0.08]) put(g, mesh(cyl, m, s * 0.07, 0.02, z, 0.015, 0.08, 0.015), 0, 0, s * 1.2);
        } else if (kind === 'turtle') {
          g.add(mesh(ball, mat(0x5c6b2c), 0, 0.09, 0, 0.32, 0.16, 0.38)); g.add(mesh(ball, mat(0x9aa86a), 0, 0.06, 0.22, 0.1, 0.08, 0.12));
          for (const s of [-1, 1]) for (const z of [0.12, -0.12]) g.add(mesh(ball, mat(0x9aa86a), s * 0.14, 0.03, z, 0.08, 0.04, 0.1));
        } else if (kind === 'duck') {
          const m = mat(0xf1efe6);
          g.add(mesh(ball, m, 0, 0.1, 0, 0.18, 0.13, 0.28)); g.add(mesh(ball, mat(0x2f6e3a), 0, 0.24, 0.12, 0.11, 0.11, 0.11));
          g.add(mesh(box, mat(0xe6a22a), 0, 0.22, 0.2, 0.06, 0.02, 0.08));
          for (const s of [-1, 1]) g.add(mesh(ball, eyeM, s * 0.045, 0.26, 0.16, 0.02, 0.02, 0.02));
        } else if (kind === 'pig') {
          const m = mat(0xe9a9a4);
          g.add(mesh(ball, m, 0, 0.22, 0, 0.32, 0.28, 0.46)); g.add(mesh(ball, m, 0, 0.26, 0.26, 0.22, 0.2, 0.18)); put(g, mesh(cyl, mat(0xd98a86), 0, 0.25, 0.36, 0.09, 0.05, 0.09), Math.PI / 2, 0, 0);
          for (const s of [-1, 1]) { g.add(mesh(cone, m, s * 0.08, 0.38, 0.24, 0.06, 0.08, 0.04)); g.add(mesh(ball, eyeM, s * 0.06, 0.3, 0.33, 0.025, 0.025, 0.025)); for (const z of [0.12, -0.12]) g.add(mesh(cyl, m, s * 0.1, 0.06, z, 0.06, 0.12, 0.06)); }
          // un peu de boue sur le dos
          g.add(mesh(ball, mat(0x5a4632), 0.05, 0.33, -0.08, 0.16, 0.06, 0.18));
        } else if (kind === 'butterfly') {
          const wings = [];
          put(g, mesh(cyl, mat(0x222222), 0, 0, 0, 0.012, 0.08, 0.012), Math.PI / 2, 0, 0);
          for (const s of [-1, 1]) { const w = new T.Group(); g.add(w); w.add(mesh(ball, mat(s > 0 ? 0xf2a43a : 0xf2a43a), s * 0.05, 0, 0, 0.09, 0.008, 0.07)); wings.push(w); }
          g.userData.wings = wings;
        }
        return g;
      };
      const groundY = -0.535;
      const place = (g, behave, extra = {}) => {
        const a = { g, behave, ang: Math.random() * Math.PI * 2, r: (extra.r || 5.2 + Math.random() * 1.3) + 1.4, speed: extra.speed || 0.06, dir: Math.random() < 0.5 ? 1 : -1, phase: Math.random() * 10, pauseUntil: 0, ...extra };
        g.position.set(Math.cos(a.ang) * a.r, groundY + (a.y || 0), Math.sin(a.ang) * a.r);
        this.animalGroup.add(g); this.animals.push(a); return a;
      };
      const herd = (n, make, extra) => { const ang = Math.random() * Math.PI * 2; for (let i = 0; i < n; i++) { const q = make(); place(q.g, 'walk', { legs: q.legs, neck: q.neck, ...extra, ang: ang + i * 0.45 + Math.random() * 0.1, r: 5.3 + (i % 2) * 0.8 }); } };
      const flock = (n, color, span, extra = {}) => { for (let i = 0; i < n; i++) { const b = bird(color, span, extra.beak); place(b.g, 'fly', { wings: b.wings, r: 4.5 + Math.random() * 2.5, y: 5 + Math.random() * 2.5, speed: 0.25 + Math.random() * 0.1, ...extra }); } };
      const critters = (n, kind, behave, extra = {}) => { for (let i = 0; i < n; i++) place(small(kind), behave, { speed: 0.12, r: 5.0 + Math.random() * 1.6, ...extra }); };
      const k = terrain.kind;
      if (k === 'forest') {
        herd(2, () => quad({ color: 0x9a6a3c, dark: 0x3b2a1c, muzzle: 0x3b2a1c, len: 0.9, h: 0.42, w: 0.38, legH: 0.55, neck: 0.42, head: 0.24, ears: 0.6, antlers: true, tailColor: 0xf3eadb, scale: 0.8 }), { speed: 0.05 });
        critters(3, 'rabbit', 'hop', { speed: 0.18 });
        flock(4, 0x3a3530, 0.45);
      } else if (k === 'desert') {
        herd(2, () => quad({ color: 0xc9a066, len: 1.1, h: 0.5, w: 0.45, legH: 0.8, neck: 0.75, neckTilt: 0.85, head: 0.24, ears: 0.3, humps: 2, scale: 0.85 }), { speed: 0.035 });
        critters(3, 'lizard', 'dash', { speed: 0.5 });
        flock(2, 0x2c2522, 0.9, { beak: 0xd0b07a, y: 7, speed: 0.12 });
      } else if (k === 'grass') {
        herd(2, () => quad({ color: 0xf2efe7, spots: 0x2a2522, muzzle: 0xe9b1a8, len: 1.0, h: 0.5, w: 0.48, legH: 0.48, neck: 0.25, neckTilt: 0.2, head: 0.27, ears: 0.25, horns: 0.25, scale: 0.85 }), { speed: 0.03, graze: true });
        herd(3, () => quad({ color: 0xf4f1ea, dark: 0x2a2522, muzzle: 0x2a2522, len: 0.6, h: 0.34, w: 0.36, legH: 0.3, neck: 0.15, neckTilt: 0.3, head: 0.18, ears: 0.35, wool: true, scale: 0.85 }), { speed: 0.04, graze: true });
        critters(4, 'butterfly', 'flutter', { r: 5.6 + Math.random() * 2, y: 0.8 });
      } else if (k === 'steppe') {
        herd(2, () => quad({ color: 0x7a4e2c, mane: 0x2a1c12, tailColor: 0x2a1c12, len: 1.0, h: 0.45, w: 0.4, legH: 0.7, neck: 0.55, neckTilt: 0.7, head: 0.26, ears: 0.35, scale: 0.85 }), { speed: 0.07 });
        herd(3, () => quad({ color: 0xc89a5e, muzzle: 0xf2ead8, len: 0.7, h: 0.32, w: 0.3, legH: 0.55, neck: 0.4, neckTilt: 0.6, head: 0.18, ears: 0.5, horns: 1.6, hornColor: 0x3a2c22, tailColor: 0xf2ead8, scale: 0.8 }), { speed: 0.09 });
        flock(1, 0x5a3f28, 1.0, { beak: 0xe0b040, y: 7.5, speed: 0.1 });
      } else if (k === 'mud') {
        for (let i = 0; i < 3; i++) place(small('pig'), 'walk', { speed: 0.035, graze: true, r: 5.3 + i * 0.4 });
        critters(4, 'frog', 'hop', { speed: 0.14 });
        flock(3, 0x2a2a2a, 0.35);
      } else if (k === 'rock') {
        herd(3, () => quad({ color: 0xece8de, dark: 0x3a332c, muzzle: 0x9a9088, len: 0.65, h: 0.36, w: 0.32, legH: 0.42, neck: 0.32, neckTilt: 0.55, head: 0.2, ears: 0.35, horns: 1.4, hornColor: 0x4a4038, scale: 0.85 }), { speed: 0.05, perch: true });
        flock(2, 0x4a3524, 1.1, { beak: 0xe0b040, y: 8, speed: 0.09 });
      } else if (k === 'water') {
        for (let i = 0; i < 4; i++) place(small('duck'), 'swim', { speed: 0.05, r: 5.6 + Math.random() * 1.8, y: 0.02 });
        critters(3, 'frog', 'hop', { speed: 0.14 });
        herd(1, () => quad({ color: 0xeef0f0, dark: 0xd8a83a, muzzle: 0xd8a83a, len: 0.35, h: 0.3, w: 0.26, legH: 0.75, neck: 0.55, neckTilt: 0.3, head: 0.12, scale: 0.9 }), { speed: 0.02, graze: true });
      } else if (k === 'beach') {
        critters(4, 'crab', 'scuttle', { speed: 0.25 });
        critters(2, 'turtle', 'walk', { speed: 0.02 });
        flock(4, 0xf4f4f0, 0.6, { beak: 0xf0b030, y: 4.5 });
      }
    }
    tickAnimals(t, dt) {
      if (!this.animals || !this.animals.length || !this.animalGroup.visible) return;
      const groundY = -0.535;
      for (const a of this.animals) {
        const g = a.g;
        if (a.behave === 'fly') {
          a.ang += a.dir * a.speed * dt;
          g.position.set(Math.cos(a.ang) * a.r, a.y + Math.sin(t * 0.7 + a.phase) * 0.4, Math.sin(a.ang) * a.r);
          g.rotation.set(0, Math.atan2(-Math.sin(a.ang) * a.dir, Math.cos(a.ang) * a.dir), -a.dir * 0.25);
          const flap = Math.sin(t * (a.speed > 0.2 ? 11 : 4) + a.phase) * (a.speed > 0.2 ? 0.7 : 0.25);
          a.wings[0].rotation.z = flap; a.wings[1].rotation.z = -flap;
          continue;
        }
        if (a.behave === 'flutter') {
          a.ang += a.dir * a.speed * 0.6 * dt + Math.sin(t * 1.3 + a.phase) * 0.004;
          g.position.set(Math.cos(a.ang) * a.r, groundY + a.y + Math.sin(t * 2.2 + a.phase) * 0.35, Math.sin(a.ang) * a.r);
          g.rotation.y = Math.atan2(-Math.sin(a.ang) * a.dir, Math.cos(a.ang) * a.dir);
          const f = Math.sin(t * 22 + a.phase) * 1.1; g.userData.wings[0].rotation.z = f; g.userData.wings[1].rotation.z = -f;
          continue;
        }
        // pauses : les bêtes s'arrêtent, broutent ou regardent autour d'elles, puis repartent (parfois dans l'autre sens)
        if (t > a.pauseUntil && Math.random() < dt * 0.12) { a.pauseUntil = t + 1.5 + Math.random() * 3.5; if (Math.random() < 0.3) a.dir *= -1; }
        const moving = t > a.pauseUntil;
        if (moving) { a.ang += a.dir * a.speed * dt; a.r += Math.sin(t * 0.3 + a.phase) * 0.004; a.r = Math.max(5.0, Math.min(6.8, a.r)); }
        let lift = 0;
        if (a.behave === 'hop') lift = moving ? Math.abs(Math.sin(t * 5 + a.phase)) * 0.18 : 0;
        if (a.behave === 'swim') lift = Math.sin(t * 2 + a.phase) * 0.015;
        g.position.set(Math.cos(a.ang) * a.r, groundY + (a.y || 0) + lift, Math.sin(a.ang) * a.r);
        const heading = Math.atan2(-Math.sin(a.ang) * a.dir, Math.cos(a.ang) * a.dir);
        g.rotation.y = a.behave === 'scuttle' ? heading + Math.PI / 2 : heading;
        if (a.legs) a.legs.forEach((leg, i) => { leg.rotation.x = moving ? Math.sin(t * 7 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45 : 0; });
        if (a.neck) a.neck.rotation.x = (a.graze && !moving ? 1.3 : 0.5) + Math.sin(t * 1.5 + a.phase) * 0.06;
        if (a.behave === 'dash' && moving) a.ang += a.dir * a.speed * dt * (Math.sin(t * 3 + a.phase) > 0.6 ? 2 : 0);
      }
    }

    // Sol peint selon le paysage (herbe, sable, boue, cailloux…) et panorama de fond (collines, dunes, montagnes, mer…)
    groundTexture(terrain) {
      const T = this.THREE, c = document.createElement('canvas'); c.width = c.height = 512;
      const g = c.getContext('2d'), k = terrain.kind, base = new T.Color(terrain.ground);
      const rnd = (() => { let x = 12345; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
      const col = (dl, alpha = 1) => { const cc = base.clone().offsetHSL(0, 0, dl); return `rgba(${Math.round(cc.r * 255)},${Math.round(cc.g * 255)},${Math.round(cc.b * 255)},${alpha})`; };
      g.fillStyle = col(0); g.fillRect(0, 0, 512, 512);
      // grain de fond
      for (let i = 0; i < 2600; i++) { g.fillStyle = col((rnd() - 0.5) * 0.12, 0.5); g.fillRect(rnd() * 512, rnd() * 512, 2 + rnd() * 4, 2 + rnd() * 4); }
      if (k === 'forest' || k === 'grass') {
        for (let i = 0; i < 1800; i++) { const x = rnd() * 512, y = rnd() * 512; g.strokeStyle = col(0.04 + rnd() * 0.12, 0.8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y - 5 - rnd() * 6); g.stroke(); }
        if (k === 'grass') for (let i = 0; i < 60; i++) { g.fillStyle = ['#f6f2d0', '#f3d34a', '#e98fb0', '#ffffff'][i % 4]; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 2.2, 0, 7); g.fill(); }
        if (k === 'forest') for (let i = 0; i < 90; i++) { g.fillStyle = ['#6b4a26', '#8a6a2a', '#4d3a1f'][i % 3]; g.save(); g.translate(rnd() * 512, rnd() * 512); g.rotate(rnd() * 6); g.beginPath(); g.ellipse(0, 0, 5, 2.5, 0, 0, 7); g.fill(); g.restore(); }
      } else if (k === 'desert' || k === 'beach') {
        for (let y = 0; y < 512; y += 9) { g.strokeStyle = col(0.06, 0.45); g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x / 40 + y) * 3); g.stroke(); }
        for (let i = 0; i < 40; i++) { g.fillStyle = k === 'beach' ? '#f4ead8' : col(-0.12, 0.7); g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 1.5 + rnd() * 2, 0, 7); g.fill(); }
      } else if (k === 'steppe') {
        for (let i = 0; i < 900; i++) { const x = rnd() * 512, y = rnd() * 512; g.strokeStyle = rnd() < 0.5 ? '#c9b36d' : '#8f7d45'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y - 4 - rnd() * 5); g.stroke(); }
        for (let i = 0; i < 25; i++) { g.strokeStyle = col(-0.15, 0.5); g.lineWidth = 1.2; g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
      } else if (k === 'mud') {
        for (let i = 0; i < 45; i++) { g.fillStyle = col(-0.1 - rnd() * 0.06, 0.75); g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 10 + rnd() * 30, 6 + rnd() * 16, rnd() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(160,170,160,0.25)'; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 4 + rnd() * 6, 2, 0, 0, 7); g.fill(); }
      } else if (k === 'rock') {
        for (let i = 0; i < 220; i++) { g.fillStyle = col((rnd() - 0.3) * 0.3, 0.9); g.beginPath(); const x = rnd() * 512, y = rnd() * 512, r = 2 + rnd() * 8; g.moveTo(x + r, y); for (let a = 1; a < 6; a++) g.lineTo(x + Math.cos(a * 1.25) * r * (0.7 + rnd() * 0.4), y + Math.sin(a * 1.25) * r * (0.7 + rnd() * 0.4)); g.fill(); }
      } else if (k === 'water') {
        for (let i = 0; i < 28; i++) { g.fillStyle = 'rgba(90,150,160,0.55)'; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 14 + rnd() * 26, 8 + rnd() * 12, rnd() * 3, 0, 7); g.fill(); }
        for (let i = 0; i < 900; i++) { const x = rnd() * 512, y = rnd() * 512; g.strokeStyle = col(0.08, 0.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y - 5); g.stroke(); }
      }
      const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(26, 26); tex.anisotropy = 4;
      if (T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
      return tex;
    }
    panoramaTexture(terrain) {
      const T = this.THREE, c = document.createElement('canvas'); c.width = 2048; c.height = 512;
      const g = c.getContext('2d'), k = terrain.kind, sky = new T.Color(terrain.sky);
      const hex = (cc) => `#${cc.getHexString()}`;
      const grad = g.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, hex(sky.clone().offsetHSL(0, 0.05, 0.12))); grad.addColorStop(0.7, hex(sky)); grad.addColorStop(1, hex(sky.clone().offsetHSL(0, 0, 0.06)));
      g.fillStyle = grad; g.fillRect(0, 0, 2048, 512);
      const rnd = (() => { let x = 777; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
      // nuages légers
      for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; const x = rnd() * 2048, y = 40 + rnd() * 120; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x + j * 28, y + (j % 2) * 6, 40, 14, 0, 0, 7); g.fill(); } }
      const ridge = (color, base, amp, freq, rough) => {
        g.fillStyle = color; g.beginPath(); g.moveTo(0, 512);
        for (let x = 0; x <= 2048; x += 8) g.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * freq + rough)) - amp * 0.35 * Math.sin(x * freq * 3.1 + rough * 2) - (rough > 0 ? rnd() * amp * 0.08 : 0));
        g.lineTo(2048, 512); g.fill();
      };
      const ground = new T.Color(terrain.ground), shade = (dl, h = 0) => hex(ground.clone().offsetHSL(h, 0, dl).lerp(sky, 0.35 - dl));
      if (k === 'rock') { ridge('#8d939a', 360, 180, 0.006, 1.3); ridge('#6c7277', 410, 120, 0.011, 2.1); ridge(shade(0), 460, 50, 0.02, 0.4); }
      else if (k === 'desert') { ridge('#c99a63', 400, 60, 0.004, 0.2); ridge('#b98a52', 440, 45, 0.008, 1.7); g.fillStyle = '#9a6f45'; g.fillRect(300, 330, 160, 80); g.fillRect(1500, 345, 120, 70); ridge(shade(0.05), 470, 30, 0.012, 0.9); }
      else if (k === 'beach') {
        g.fillStyle = '#1aa3c4'; g.fillRect(0, 380, 2048, 132); g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 40; i++) g.fillRect(rnd() * 2048, 390 + rnd() * 100, 30 + rnd() * 40, 2);
        for (let i = 0; i < 6; i++) { const x = 150 + i * 340 + rnd() * 80; g.strokeStyle = '#3d3020'; g.lineWidth = 8; g.beginPath(); g.moveTo(x, 470); g.quadraticCurveTo(x + 20, 400, x + 10, 340); g.stroke(); g.fillStyle = '#2d6b3a'; for (let a = 0; a < 6; a++) { g.beginPath(); g.ellipse(x + 10 + Math.cos(a) * 30, 340 + Math.sin(a) * 10, 34, 7, a, 0, 7); g.fill(); } }
      } else if (k === 'forest') { ridge('#5c7a5e', 380, 70, 0.005, 0.6); for (let x = 0; x < 2048; x += 22) { const h = 70 + rnd() * 60; g.fillStyle = rnd() < 0.5 ? '#2f5434' : '#3b6640'; g.beginPath(); g.moveTo(x, 470); g.lineTo(x + 18, 470 - h); g.lineTo(x + 36, 470); g.fill(); } }
      else if (k === 'grass') { ridge('#8db37a', 400, 70, 0.004, 0.3); ridge('#79a65e', 440, 50, 0.007, 1.9); for (let i = 0; i < 18; i++) { const x = rnd() * 2048; g.fillStyle = '#4f7a3c'; g.beginPath(); g.arc(x, 420, 18, 0, 7); g.fill(); g.fillRect(x - 3, 420, 6, 30); } }
      else if (k === 'steppe') { ridge('#a6a3a8', 380, 90, 0.003, 2.4); ridge('#b9a575', 445, 30, 0.006, 0.8); }
      else if (k === 'mud') { ridge('#7d7a6e', 400, 80, 0.005, 1.1); ridge('#5f594a', 450, 40, 0.01, 0.5); }
      else { ridge('#86a3a0', 400, 70, 0.005, 1.6); g.fillStyle = '#7fb0b8'; g.fillRect(0, 440, 2048, 30); ridge('#5f7f73', 470, 25, 0.012, 0.2); }
      const tex = new T.CanvasTexture(c); tex.wrapS = T.RepeatWrapping; tex.repeat.set(1, 1);
      if (T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
      return tex;
    }
    buildScenery(terrain) {
      const T = this.THREE;
      const oldG = this.floor.material.map; this.floor.material.map = this.groundTexture(terrain); this.floor.material.color.setHex(0xffffff); this.floor.material.needsUpdate = true; if (oldG) oldG.dispose();
      if (!this.backdrop) {
        this.backdrop = new T.Mesh(new T.CylinderGeometry(70, 70, 36, 48, 1, true), new T.MeshBasicMaterial({ side: T.BackSide, fog: false, depthWrite: false }));
        this.backdrop.position.y = 16.5; this.backdrop.renderOrder = -1; this.scene.add(this.backdrop);
      }
      const oldP = this.backdrop.material.map; this.backdrop.material.map = this.panoramaTexture(terrain); this.backdrop.material.needsUpdate = true; if (oldP) oldP.dispose();
    }

    buildTerrain(terrain) {
      const T = this.THREE, oldGeo = new Set(), oldMat = new Set();
      this.terrainGroup.traverse((o) => {
        if (o.geometry) oldGeo.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => oldMat.add(m));
      });
      this.terrainGroup.clear();
      oldGeo.forEach((g) => g.dispose()); oldMat.forEach((m) => m.dispose());

      const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: 0.94, ...extra });
      const stone = mat(terrain.kind === 'desert' || terrain.kind === 'steppe' ? 0x9a805c : 0x777974);
      const wood = mat(terrain.kind === 'forest' ? 0x553b27 : 0x766044);
      const green = mat(terrain.kind === 'forest' ? 0x315d35 : 0x477a38);
      const paleGreen = mat(terrain.id === 'dojo' ? 0xd28a9e : terrain.kind === 'forest' ? 0x527543 : 0x82a84c);
      const sand = mat(terrain.kind === 'beach' ? 0xbfa468 : 0xd2b06f);
      const drySoil = mat(0xb09a6b);
      const water = mat(0x5598a2, { roughness: 0.18, metalness: 0.16, transparent: true, opacity: 0.82 });
      const mud = mat(0x493b2d, { roughness: 0.45 });
      const points = [[-5.8,-5.4],[-3.7,-6.3],[0,-6.1],[3.7,-6.3],[5.8,-5.4],[-6.1,-2.8],[-6.5,0],[-6.1,2.8],[-5.8,5.4],[-3.7,6.3],[0,6.1],[3.7,6.3],[5.8,5.4],[6.1,2.8],[6.5,0],[6.1,-2.8]];
      const add = (geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, cast = true) => {
        const m = new T.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
        m.castShadow = cast; m.receiveShadow = true; this.terrainGroup.add(m); return m;
      };
      const disk = new T.CircleGeometry(1, 20);
      const rockGeo = new T.IcosahedronGeometry(0.5, 0);
      const moundGeo = new T.SphereGeometry(0.5, 9, 6);
      const trunkGeo = new T.CylinderGeometry(0.12, 0.2, 1.2, 7);
      const crownGeo = new T.IcosahedronGeometry(0.72, 1);
      const spikeGeo = new T.ConeGeometry(0.17, 1.1, 7);
      const stemGeo = new T.CylinderGeometry(0.055, 0.075, 0.9, 6);

      // Plage : la mer turquoise borde le sable des deux côtés du plateau
      if (terrain.kind === 'beach') {
        const sea = mat(0x0f8fb0, { roughness: 0.2, metalness: 0.12 });
        const foam = mat(0xdcefee, { roughness: 0.6 });
        const seaGeo = new T.PlaneGeometry(120, 22), foamGeo = new T.PlaneGeometry(120, 0.6);
        for (const s of [-1, 1]) {
          const w = add(seaGeo, sea, 0, -0.52, s * 21.5, 1, 1, 1, false); w.rotation.x = -Math.PI / 2;
          const f = add(foamGeo, foam, 0, -0.51, s * 10.3, 1, 1, 1, false); f.rotation.x = -Math.PI / 2;
        }
      }
      const frondGeo = new T.ConeGeometry(0.16, 1.5, 4), trunkPalmGeo = new T.CylinderGeometry(0.1, 0.18, 2.5, 7), nutGeo = new T.SphereGeometry(0.1, 6, 5);
      const palmGreen = mat(0x2f8f4a), palmTrunk = mat(0x8a6a45), nutMat = mat(0x5a3b22), tide = mat(0x1fb0c4, { roughness: 0.18, metalness: 0.14, transparent: true, opacity: 0.88 });
      const palm = (x, z, lean) => {
        const g = new T.Group();
        const trunk = new T.Mesh(trunkPalmGeo, palmTrunk); trunk.position.y = 1.25; trunk.castShadow = true; g.add(trunk);
        for (let k = 0; k < 7; k++) {
          const arm = new T.Group(); arm.position.y = 2.5; arm.rotation.y = (k / 7) * Math.PI * 2;
          const frond = new T.Mesh(frondGeo, palmGreen); frond.position.x = 0.65; frond.rotation.z = -Math.PI / 2 - 0.5; frond.scale.z = 0.3; frond.castShadow = true;
          arm.add(frond); g.add(arm);
        }
        for (let k = 0; k < 3; k++) { const nut = new T.Mesh(nutGeo, nutMat); nut.position.set(Math.cos(k * 2.1) * 0.14, 2.38, Math.sin(k * 2.1) * 0.14); g.add(nut); }
        g.position.set(x, -0.5, z); g.rotation.z = lean; g.rotation.y = x * 0.7;
        this.terrainGroup.add(g);
      };

      // Quelques reliefs proches du socle relient visuellement le plateau au terrain.
      for (let i = 0; i < points.length; i++) {
        // devant et derrière le plateau, le décor est reculé pour ne pas cacher les pièces (le sol est au ras du plateau)
        const x = points[i][0], z = points[i][1] * (Math.abs(points[i][1]) > 5 ? 1.35 : 1), jitter = (i % 3) * 0.16;
        if (terrain.kind === 'beach') {
          add(moundGeo, sand, x, -0.32, z, 1.7, 0.3, 1);
          if (i % 4 === 0) palm(x, z, (i % 8 === 0 ? 1 : -1) * 0.12);
          else if (i % 4 === 2) { const pool = add(disk, tide, x, -0.512, z, 1.3, 1, 0.8, false); pool.rotation.x = -Math.PI / 2; }
          else if (i % 4 === 1) add(rockGeo, stone, x + 0.2, -0.3, z + 0.1, 0.5, 0.3, 0.42);
        } else if (terrain.kind === 'forest') {
          if (i % 2 === 0) {
            add(trunkGeo, wood, x, 0.05, z, 0.8, 0.9 + jitter, 0.8);
            add(crownGeo, green, x, 0.85, z, 1.2, 1.25, 1.2);
            add(crownGeo, paleGreen, x + 0.32, 1.1, z - 0.16, 0.75, 0.82, 0.75);
          } else add(moundGeo, paleGreen, x, -0.24, z, 0.95, 0.3, 0.85);
        } else if (terrain.kind === 'desert') {
          add(moundGeo, sand, x, -0.32, z, 1.6, 0.35, 0.9);
          if (i % 4 === 0) {
            add(stemGeo, green, x + 0.25, 0.35, z, 1.2, 1.2, 1.2);
            add(stemGeo, green, x + 0.07, 0.62, z, 1, 0.42, 1).rotation.z = Math.PI / 2;
            add(stemGeo, green, x + 0.43, 0.68, z, 1, 0.36, 1).rotation.z = Math.PI / 2;
          }
        } else if (terrain.kind === 'grass') {
          add(moundGeo, paleGreen, x, -0.34, z, 1.25, 0.22, 1.05);
          if (i % 3 === 0) for (let j = 0; j < 3; j++) add(spikeGeo, green, x + (j - 1) * 0.15, -0.1, z + 0.1, 0.35, 0.45, 0.35);
        } else if (terrain.kind === 'steppe') {
          add(moundGeo, drySoil, x, -0.32, z, 1.6, 0.28, 0.85);
          if (i % 3 === 0) add(rockGeo, stone, x + 0.25, -0.08, z, 0.65, 0.48, 0.58);
        } else if (terrain.kind === 'mud') {
          const puddle = add(disk, mud, x, -0.515, z, 1.3, 1, 0.74, false); puddle.rotation.x = -Math.PI / 2;
          if (i % 3 === 0) add(rockGeo, stone, x + 0.35, -0.1, z + 0.22, 0.55, 0.34, 0.62);
        } else if (terrain.kind === 'rock') {
          add(rockGeo, stone, x, -0.1, z, 1.2 + jitter, 1.1, 0.95);
          if (i % 2 === 0) add(rockGeo, paleGreen, x + 0.42, -0.22, z + 0.25, 0.62, 0.46, 0.58);
        } else {
          if (i % 2 === 0) {
            const puddle = add(disk, water, x, -0.514, z, 1.45, 1, 0.9, false); puddle.rotation.x = -Math.PI / 2;
          } else {
            add(stemGeo, green, x, -0.03, z, 0.45, 0.48, 0.45);
            add(stemGeo, paleGreen, x + 0.16, -0.05, z + 0.12, 0.38, 0.43, 0.38);
          }
        }
      }
      if (terrain.id === 'dojo') {
        const vermilion = mat(0x9e352c), darkWood = mat(0x38251f);
        const post = new T.BoxGeometry(0.2, 1.45, 0.2), crossbar = new T.BoxGeometry(3.1, 0.2, 0.3), lintel = new T.BoxGeometry(3.45, 0.22, 0.38);
        for (const z of [-7.4, 7.4]) {
          add(post, vermilion, -0.92, 0.68, z); add(post, vermilion, 0.92, 0.68, z);
          add(crossbar, darkWood, 0, 1.52, z); add(lintel, vermilion, 0, 1.82, z);
        }
      }
    }

    makeShadowTexture() {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,0.34)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      return new this.THREE.CanvasTexture(c);
    }

    makeStudioEnvironment() {
      const T = this.THREE, canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const context = canvas.getContext('2d');
      const backdrop = context.createLinearGradient(0, 0, 0, canvas.height);
      backdrop.addColorStop(0, '#242b38'); backdrop.addColorStop(0.43, '#aeb9c3');
      backdrop.addColorStop(0.58, '#6b747d'); backdrop.addColorStop(1, '#20262e');
      context.fillStyle = backdrop; context.fillRect(0, 0, canvas.width, canvas.height);
      for (const [x, y, radius, color] of [
        [92, 82, 86, 'rgba(255,244,224,0.88)'], [350, 76, 108, 'rgba(208,229,255,0.78)'],
        [242, 120, 62, 'rgba(255,255,255,0.55)'],
      ]) {
        const glow = context.createRadialGradient(x, y, 2, x, y, radius);
        glow.addColorStop(0, color); glow.addColorStop(0.26, color.replace(/0\.\d+\)$/, '0.32)'));
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = glow; context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      const texture = new T.CanvasTexture(canvas);
      texture.mapping = T.EquirectangularReflectionMapping;
      texture.encoding = T.sRGBEncoding;
      texture.needsUpdate = true;
      return texture;
    }

    makeWoodTexture() {
      const T = this.THREE, canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d');
      context.fillStyle = '#dedbd4'; context.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 180; i++) {
        const y = i * 256 / 180, sway = 1 + (i % 7) * 0.45;
        context.beginPath(); context.moveTo(0, y);
        context.bezierCurveTo(72, y - sway, 184, y + sway, 256, y - sway * 0.3);
        context.strokeStyle = i % 4 ? 'rgba(52,38,22,0.045)' : 'rgba(255,255,255,0.12)';
        context.lineWidth = i % 9 === 0 ? 1.4 : 0.7; context.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const x = 12 + (i * 83) % 232, y = 12 + (i * 137) % 232;
        context.strokeStyle = 'rgba(70,48,25,0.07)'; context.lineWidth = 0.8;
        context.beginPath(); context.ellipse(x, y, 2 + i % 3, 7 + i % 5, 0.04, 0, Math.PI * 2); context.stroke();
      }
      const texture = new T.CanvasTexture(canvas);
      texture.encoding = T.sRGBEncoding;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.repeat.set(2, 1); texture.anisotropy = 4;
      return texture;
    }

