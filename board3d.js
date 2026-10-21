/* Cavalier — échiquier 3D (Three.js). Les personnages sont des modèles 3D animés (models3d.js). */
(function (root) {
  'use strict';

  const TEX = 1024, BORDER = 0.6, SIZE = 8 + BORDER * 2;
  const FILES = 'abcdefgh';
  const ROTATION_SENSITIVITY = 0.3;
  const MAX_ROTATION_STEP = 0.12;
  const PIECE_GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const TERRAINS = {
    forest: { name: 'Forêt', sky: 0x9eb5a1, ground: 0x304b35, wood: 0x493522, frame: ['#765735', '#503a25', '#302218'], squares: ['#c6d3a6', '#58734b'], kind: 'forest' },
    desert: { name: 'Désert', sky: 0xd9bb91, ground: 0xb58b53, wood: 0x78502d, frame: ['#c79b61', '#9a693e', '#70492d'], squares: ['#f0d79e', '#aa7743'], kind: 'desert' },
    prairie: { name: 'Prairie verte', sky: 0xa9c895, ground: 0x6c9651, wood: 0x68482b, frame: ['#98734a', '#72502f', '#4d3825'], squares: ['#d7e6ab', '#78a654'], kind: 'grass' },
    steppe: { name: 'Plaine sèche', sky: 0xd1c194, ground: 0x9c895b, wood: 0x6d5032, frame: ['#a8875d', '#775a39', '#503d2c'], squares: ['#e3d2a3', '#9d8353'], kind: 'steppe' },
    mud: { name: 'Terrain boueux', sky: 0x9ca19a, ground: 0x514b3d, wood: 0x49352b, frame: ['#786451', '#514237', '#342b27'], squares: ['#c7b79d', '#796451'], kind: 'mud' },
    rock: { name: 'Terrain rocheux', sky: 0xa9afb4, ground: 0x62686b, wood: 0x55483c, frame: ['#8a8175', '#5b544d', '#393735'], squares: ['#d0d0c9', '#777c7e'], kind: 'rock' },
    water: { name: 'Terrain avec flaques', sky: 0x9bbbc1, ground: 0x526f66, wood: 0x59432f, frame: ['#806b50', '#5a4734', '#3d3027'], squares: ['#d0dfd8', '#63827a'], kind: 'water' },
    beach: { name: 'Plage tropicale', sky: 0x6cc5e8, ground: 0xa88a54, wood: 0x8a6a42, frame: ['#b98d57', '#8a6238', '#5f4226'], squares: ['#ead6a0', '#b98a4c'], kind: 'beach' },
  };
  // overcast : part de gris dans le ciel ; wind : force du vent (pluie penchée, rafales) ; snow : flocons
  const WEATHERS = {
    sun: { name: 'Soleil', sky: 0x000000, tint: 0x000000, sun: 1.05, hemi: 0.58, rain: 0, cloud: 0, fogFar: 85, overcast: 0, sunColor: 0xfff1d5, sunDisc: 0xffe39a },
    cloudy: { name: 'Ciel nuageux', sky: 0x000000, tint: 0x87939a, sun: 0.42, hemi: 0.42, rain: 0, cloud: 1, fogFar: 78, overcast: 0.36 },
    drizzle: { name: 'Pluie fine', sky: 0x000000, tint: 0x71828a, sun: 0.34, hemi: 0.36, rain: 360, cloud: 1, fogFar: 72, speed: 3.1, overcast: 0.48, rainOpacity: 0.4 },
    heavy: { name: 'Grosse pluie', sky: 0x000000, tint: 0x4c5c65, sun: 0.25, hemi: 0.3, rain: 950, cloud: 1, fogFar: 59, speed: 6.2, overcast: 0.68 },
    heavystorm: { name: 'Grosse pluie orageuse', sky: 0x000000, tint: 0x3a4654, sun: 0.22, hemi: 0.28, rain: 1100, cloud: 1, fogFar: 52, speed: 7, overcast: 0.76, lightning: true },
    windstorm: { name: 'Orage et grand vent', sky: 0x000000, tint: 0x35404c, sun: 0.2, hemi: 0.27, rain: 900, cloud: 1, fogFar: 52, speed: 7.2, overcast: 0.78, lightning: true, wind: 1.6, gusts: 160 },
    sunwind: { name: 'Soleil et vent', sky: 0x000000, tint: 0x000000, sun: 1.0, hemi: 0.56, rain: 0, cloud: 0, fogFar: 85, overcast: 0, sunColor: 0xfff1d5, sunDisc: 0xffe39a, wind: 1.1, gusts: 120, leaves: 40 },
    snow: { name: 'Neige fine', sky: 0x000000, tint: 0xc9d3dc, sun: 0.55, hemi: 0.62, rain: 0, cloud: 1, fogFar: 62, overcast: 0.55, snow: 700 },
    sunset: { name: 'Coucher de soleil', sky: 0x000000, tint: 0xe8916a, sun: 0.85, hemi: 0.46, rain: 0, cloud: 0, fogFar: 80, overcast: 0.55, sunColor: 0xffa060, sunDisc: 0xff8a3c, sunLow: true },
    storm: { name: 'Orage et éclairs', sky: 0x000000, tint: 0x3a4654, sun: 0.22, hemi: 0.28, rain: 820, cloud: 1, fogFar: 55, speed: 6.8, overcast: 0.76, lightning: true },
  };
  const DUEL = 1.3; // durée du coup final de chaque prise (secondes)
  // Avant chaque prise, les deux pièces s'affrontent : l'attaquant frappe, la cible riposte avec sa propre arme
  const X1 = 0.6, X2 = 1.4; // corps à corps : assaut jusqu'à X1, riposte de la cible jusqu'à X2
  const EXR = 1.1; // à distance : la cible tire d'abord sa propre technique sur l'attaquant
const BURN_TIME = 1.8; // durée de la combustion jusqu'aux cendres

  class Board3D {
    constructor(container, onSquare) {
      this.speed = 0.75;
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
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.535; floor.receiveShadow = true;
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
      this.terrainGroup = new THREE.Group(); this.scene.add(this.terrainGroup);
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
      this.checkLinkGeo = new THREE.TorusGeometry(0.065, 0.022, 6, 10);
      this.checkLinkMat = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.78, roughness: 0.3 });
      this.checkLinks = []; this.checkKey = '';
      this.shadowTex = this.makeShadowTexture();
      this.flipped = null;
      this.boardKey = '';
      this.elevation = 38;
      this.cameraTarget = new THREE.Vector3(0, 0.3, 0);
      this.captureCamera = null;

      this.raycaster = new THREE.Raycaster();
      this.bindInput();
      this.resize();
      if (root.ResizeObserver) new ResizeObserver(() => this.resize()).observe(container);
      else window.addEventListener('resize', () => this.resize());
      // La boucle ne doit jamais s'arrêter : une erreur ponctuelle ne fige plus l'affichage
      let fails = 0, lost = false;
      const cv = this.renderer.domElement;
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
      cv.addEventListener('webglcontextrestored', () => { lost = false; this.boardKey = ''; this.resize(); });
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
      if (key === this.boardKey) return;
      this.boardKey = key;
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
      this.boardKey = '';
      this.buildTerrain(terrain);
      this.buildAnimals(terrain);
      this.buildScenery(terrain);
    }

    setWeather(id) {
      const T = this.THREE, weather = WEATHERS[id] || WEATHERS.sun, terrain = this.terrain || TERRAINS.forest;
      this.weather = weather;
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
      this.boardKey = '';
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
      if (!this.animalGroup) { this.animalGroup = new T.Group(); this.scene.add(this.animalGroup); }
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
        const a = { g, behave, ang: Math.random() * Math.PI * 2, r: extra.r || 5.2 + Math.random() * 1.3, speed: extra.speed || 0.06, dir: Math.random() < 0.5 ? 1 : -1, phase: Math.random() * 10, pauseUntil: 0, ...extra };
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
      const paleGreen = mat(terrain.kind === 'forest' ? 0x527543 : 0x82a84c);
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
        const [x, z] = points[i], jitter = (i % 3) * 0.16;
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

    square(color, opacity) {
      const T = this.THREE;
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      return m;
    }

    /* opts : board, selected, targets, last, check, hint, flipped, showMoves, coords, light, dark, animate */
    update(o) {
      const T = this.THREE;
      this.outcome = o.outcome || null;
      this.drawBoard(o.light, o.dark, o.coords, !!o.flipped, o.board);
      this.setCamera(o.flipped);

      this.overlay.clear();
      this.ply = o.ply == null ? null : o.ply;
      // Pion à un pas de la promotion : un anneau doré pulse sous ses pieds
      for (let sq = 0; sq < 64; sq++) {
        const pc = o.board[sq];
        if (!((pc === 'P' && sq >> 3 === 1) || (pc === 'p' && sq >> 3 === 6))) continue;
        const p = this.sqToPos(sq), g = new T.Group();
        const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: 0xffd65a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
        ring.rotation.x = -Math.PI / 2; g.add(ring);
        const beam = new T.Mesh(new T.CylinderGeometry(0.3, 0.36, 1.1, 20, 1, true), new T.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
        beam.position.y = 0.55; g.add(beam);
        g.position.set(p.x, 0.03, p.z); g.userData.pulse = sq; this.overlay.add(g);
      }
      this.setMateFire(o.mateUltimate && o.mateUltimate.piece.toLowerCase() === 'q' ? [] : o.mateFire || []);
      let capture = null;
      const mark = (sq, color, opacity) => {
        if (sq < 0 || sq == null) return;
        const m = this.square(color, opacity); const p = this.sqToPos(sq);
        m.position.set(p.x, 0.01, p.z); this.overlay.add(m);
      };
      if (o.last) { mark(o.last.from, 0xf1c232, 0.35); mark(o.last.to, 0xf1c232, 0.45); }
      if (o.selected >= 0) mark(o.selected, 0x4fc3f7, 0.55);
      if (o.check >= 0) mark(o.check, 0xff3b30, 0.6);
      if (o.hint) { mark(o.hint.from, 0x7c4dff, 0.5); mark(o.hint.to, 0x7c4dff, 0.5); }
      if (o.showMoves) for (const t of o.targets) {
        const p = this.sqToPos(t.to);
        const capture = !!o.board[t.to] || t.flag === 'ep';
        const geo = capture ? new T.RingGeometry(0.36, 0.46, 32) : new T.CircleGeometry(0.15, 24);
        const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0x1b2a22, transparent: true, opacity: 0.45, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.02, p.z);
        this.overlay.add(m);
      }

      // Réutilise les personnages déjà sur le plateau ; seul celui qui joue se déplace
      const now = this.now();
      const old = this.chars, next = new Map();
      const boardKey = o.board.join('');
      const boardChanged = boardKey !== this.boardKey;
      this.boardKey = boardKey;
      if (boardChanged && (!o.animate || (this.busyUntil || 0) > now)) this.clearTransient();
      const take = (sq, piece) => {
        const c = old.get(sq);
        if (c && (!piece || c.piece === piece)) { old.delete(sq); return c; }
        return null;
      };
      const moveChar = (c, from, to, extra = {}) => {
        const a = this.sqToPos(from), b = this.sqToPos(to);
        const dist = Math.hypot(b.x - a.x, b.z - a.z);
        c.anim = Object.assign({ from: a, to: b, t0: now, dur: 0.35 + dist * 0.09 }, extra);
        c.holder.position.set(a.x, 0, a.z);
      };
      if (o.animate && o.last) {
        const m = o.last;
        const white = m.piece === m.piece.toUpperCase();
        let duel = null, toss = null, shot = null, knightAttack = null;
        const kind = m.piece.toLowerCase();
        const vSq = m.flag === 'ep' ? m.to + (white ? 8 : -8) : m.to;
        const far = Math.max(Math.abs((m.from & 7) - (vSq & 7)), Math.abs((m.from >> 3) - (vSq >> 3))) > 1;
        if (m.captured && !o.mateUltimate) {
          const v = take(vSq);
          const a = this.sqToPos(m.from), b = this.sqToPos(vSq);
          capture = { from: a, to: b, victim: v };
          const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
          const ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
          const die = (o) => { if (v) { v.holder.position.set(b.x, 0, b.z); this.dying.push(Object.assign({ c: v, dx: ux, dz: uz, from: a, base: v.parts.root.scale.x }, o)); } };
          if (m.flag === 'ep') {
            // Prise en passant : le pion file en un éclair à côté de sa cible, dont la tête tombe au sol
            knightAttack = { style: 'enpassant', start: now, from: a, target: b, to: this.sqToPos(m.to), duration: 2.6, victim: v, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'n') {
            const style = white
              ? (Math.random() < 0.5 ? 'tunnel-eat' : 'tunnel-impact')
              : (Math.random() < 0.5 ? 'eagle-release' : 'eagle-slam');
            // tunnel percutant : le chien et son ninja se changent d'abord en tourbillon
            const pre = style === 'tunnel-impact' ? 0.6 : 0;
            const duration = pre + (style === 'tunnel-eat' ? 2.8 : style === 'tunnel-impact' ? 2.45 : style === 'eagle-release' ? 3.65 : 3.85);
            knightAttack = { style, start: now, from: a, target: b, duration, pre, victim: v, hitCount: 0 };
            die({ t0: now + duration, knightAttack });
          } else if (far && kind === 'q') {
            // Dame : une ligne de flammes (blanches et éblouissantes ou noires) court au sol jusqu'à la cible et la consume
            const travel = 0.3 + len * 0.09;
            knightAttack = { style: 'flameline', white, start: now, from: a, target: b, travel, duration: 0.45 + travel + 2.0, victim: v, dir: { x: ux, z: uz }, len, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'r' && white) {
            // Tour blanche : elle devient une boule de feu qui roule jusqu'à sa cible en laissant des flammes derrière elle
            const run = 0.18 + len * 0.045;
            knightAttack = { style: 'fireroll', start: now, from: a, target: b, run, duration: 0.5 + run + 1.7, victim: v, dir: { x: ux, z: uz }, len, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if (kind === 'b' && white) {
            // Fou blanc : boule d'énergie blanche en main, il court frapper sa cible et la projette au loin
            const run = 0.2 + len * 0.06;
            knightAttack = { style: 'orb', start: now, from: a, target: b, run, duration: 0.5 + run + 1.9, victim: v, dir: { x: ux, z: uz }, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else if ((far && (kind === 'q' || kind === 'r')) || (kind === 'r' && !white)) {
            // Technique à distance lancée depuis sa case : boule de feu (dame), dragon d'eau (tour blanche)
            // ou dragon de feu (tour noire, même au contact) qui réduit sa cible en cendres
            const fireDragon = kind === 'r' && !white;
            shot = { tech: kind === 'q' ? 'fire' : 'water', fireDragon, victim: v, target: b, fire: kind === 'q' ? 0.8 : 0.9 };
            shot.flight = kind === 'q' ? 0.25 + len * 0.06 : 0.45 + len * 0.09;
            shot.impact = shot.fire + shot.flight;
            shot.runStart = shot.impact + 0.9;
            const fireball = kind === 'q';
            die({ t0: now + EXR + shot.impact, hit: true, burn: fireball || fireDragon, burnAt: now + EXR + shot.impact, swept: kind === 'r' && !fireDragon, counter: { start: now, end: now + EXR, at: a } });
          } else if (far && kind === 'b' && !white) {
            // Fou noir : la main chargée d'éclairs, il fonce transpercer sa cible sous un ciel assombri.
            const run = 0.25 + len * 0.055, pierce = 0.7 + run;
            knightAttack = { style: 'chidori', start: now, from: a, target: b, run, pierce, duration: pierce + 2.75, victim: v, dir: { x: ux, z: uz }, fx: [] };
            die({ t0: now + knightAttack.duration, knightAttack });
          } else {
            // Corps à corps : l'attaquant s'arrête face à sa cible, puis la technique propre à chaque pièce
            const gap = Math.min(0.62, len);
            duel = { stop: { x: b.x - ux * gap, z: b.z - uz * gap }, foe: b, len: DUEL, rate: 1.5 };
            if (kind === 'k') duel.len = 2.6; // enchaînement de coups de poing et de pied
            duel.approach = 0.35 + Math.max(0, len - gap) * 0.09;
            duel.len += X2; // assaut + riposte, puis le coup final
            const o = { t0: now + duel.approach + duel.len, from: duel.stop, start: now + duel.approach, ex: true, far: true };
            if (kind === 'r') Object.assign(o, { burn: true }); // brûlé par les flammes au coup final
            die(o);
          }
        }
        let mover = take(m.from, m.piece);
        const landed = o.board[m.to];
        if (mover && landed !== m.piece) { this.pieces.remove(mover.holder); mover = null; } // promotion
        if (!mover && landed) mover = this.makeChar(landed);
        if (mover) {
          moveChar(mover, m.from, m.to, { leap: false, duel, toss, shot, knightAttack });
          if (knightAttack) mover.anim.dur = knightAttack.duration;
          else if (kind === 'n' && !duel) mover.anim.dur = 0.16 + Math.hypot(mover.anim.to.x - mover.anim.from.x, mover.anim.to.z - mover.anim.from.z) * 0.035; // déplacement éclair
          if (duel) mover.anim.dur = duel.approach;
          if (toss || shot) { mover.anim.t0 = now + EXR; mover.anim.pre = now; } // la cible tire d'abord
          this.busyUntil = now + mover.anim.dur + (duel ? duel.len + 0.35 : 0) + (toss ? EXR + toss.runStart : 0) + (shot ? EXR + shot.runStart : 0) + (knightAttack ? 0.35 : 0);
          // laisse la victime embrochée finir d'être éjectée avant tout autre coup
          if (toss) this.busyUntil = Math.max(this.busyUntil, now + EXR + toss.impact + 0.2 + 2.4);
          const burning = this.dying.find((x) => x.c === (capture && capture.victim) && x.burn);
          if (burning) this.busyUntil = Math.max(this.busyUntil, burning.t0 + BURN_TIME);
          next.set(m.to, mover);
          if (kind === 'p' && landed !== m.piece && !o.mateUltimate) {
            const at = Math.max(now + mover.anim.dur, (this.busyUntil || now) - 0.35);
            this.addPromotionFx(mover, this.sqToPos(m.to), at);
            this.busyUntil = Math.max(this.busyUntil, at + 2.0);
          }
        }
        if (m.flag === 'castle') {
          const kingside = m.to > m.from;
          const rf = kingside ? m.from + 3 : m.from - 4, rt = kingside ? m.from + 1 : m.from - 1;
          const rook = take(rf);
          // Roque : le roi et la tour échangent leurs places d'un bond croisé, puis un dôme protecteur se lève
          if (mover) { mover.anim.leap = true; mover.anim.dur = 0.7; }
          if (rook) { moveChar(rook, rf, rt, { leap: true }); rook.anim.dur = 0.7; rook.anim.high = 1.5; next.set(rt, rook); }
          const k = this.sqToPos(m.to), r = this.sqToPos(rt);
          this.addCastleDome({ x: (k.x + r.x) / 2, z: (k.z + r.z) / 2 }, white, now + 0.7);
          this.busyUntil = Math.max(this.busyUntil || now, now + 1.1);
        }
      }
      for (let sq = 0; sq < 64; sq++) {
        const piece = o.board[sq];
        if (!piece || next.has(sq)) continue;
        const c = take(sq, piece) || this.makeChar(piece);
        const p = this.sqToPos(sq);
        // un personnage encore en route (duel en cours) termine son animation
        const arriving = c.anim && Math.abs(c.anim.to.x - p.x) < 0.01 && Math.abs(c.anim.to.z - p.z) < 0.01;
        if (!arriving) { this.endToss(c); c.anim = null; c.holder.position.set(p.x, 0, p.z); }
        next.set(sq, c);
      }
      for (const c of old.values()) this.pieces.remove(c.holder);
      const captureFoes = this.captureFoes(o.board);
      const watch = this.nearestFoes(o.board);
      for (const [sq, c] of next) {
        c.selected = sq === o.selected; c.inCheck = sq === o.check;
        const foe = captureFoes.get(sq);
        c.foe = foe == null ? null : this.sqToPos(foe);
        const seen = watch.get(sq);
        c.watch = seen == null ? null : this.sqToPos(seen);
      }
      this.chars = next;
      if (capture && capture.victim) this.startCaptureCamera(capture.from, capture.to, capture.victim, now);
      // Pièce liée au moment de prendre : sa technique est plus puissante (onde d'énergie, éclat, tremblement renforcé)
      if (capture && capture.victim && o.last && (this.ropes || []).some(([a, b]) => a === o.last.from || b === o.last.from)) {
        const d = this.dying.find((x) => x.c === capture.victim);
        const at = d ? (d.knightAttack ? now + Math.max(0.6, d.knightAttack.duration * 0.55) : d.t0) : now + 0.8;
        this.addPowerBurst(capture.to, o.last.piece === o.last.piece.toUpperCase(), at);
        this.powerUntil = Math.max(this.powerUntil || 0, (this.busyUntil || now) + 0.2);
      }
      if (o.mateUltimate && o.animate && o.mateUltimate.id !== this.mateUltimateKey) {
        const actor = next.get(o.mateUltimate.attackerTo);
        this.mateUltimateKey = o.mateUltimate.id;
        this.mateUltimate = actor ? {
          ...o.mateUltimate, actor, king: next.get(o.mateUltimate.to),
          start: now + (actor.anim ? actor.anim.dur : 0.35) + 0.15,
          fromPos: { ...this.sqToPos(o.mateUltimate.attackerTo) }, target: this.sqToPos(o.mateUltimate.to),
          duration: o.mateUltimate.piece === 'k' ? 9.6 : o.mateUltimate.piece === 'K' ? 7.8 : o.mateUltimate.piece.toLowerCase() === 'q' ? 6.8 : o.mateUltimate.piece.toLowerCase() === 'p' ? 3.6 : o.mateUltimate.piece === 'N' ? 4.8 : o.mateUltimate.piece === 'n' ? 5.4 : o.mateUltimate.piece === 'b' ? 5.8 : o.mateUltimate.piece === 'R' ? 6.0 : o.mateUltimate.piece === 'r' ? 7.0 : 3.4,
        } : null;
        if (this.mateUltimate) {
          this.makeMateUltimateFx(this.mateUltimate);
          this.busyUntil = Math.max(this.busyUntil || now, this.mateUltimate.start + this.mateUltimate.duration);
        }
      }
      if (!this.outcome && this.mateUltimate) this.resetMateUltimate();
      this.setCheckChains(o.board, o.check);
      if (!this.outcome) for (const c of this.chars.values()) { c.endPose = null; c.endPoseAt = null; c.drawTo = null; }
      if (this.outcome === '1/2-1/2') this.planDrawFormation(now);
      this.ropes = this.findRopes(o.board);
      this.ropesPrev = this.ropes;
      this.setArrows(o.arrows || []);
    }

    // Interrompt proprement toute animation en cours (saut dans une partie rejouée, coup pendant un duel)
    clearTransient() {
      if (this.effects) { this.effects.forEach((fx) => fx.end()); this.effects = []; }
      for (const c of this.chars.values()) {
        const a = c.anim;
        this.endToss(c);
        if (a && a.knightAttack) this.endShot(a.knightAttack);
        if (a && a.toss && a.toss.proj) {
          this.scene.remove(a.toss.proj);
          a.toss.proj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
          a.toss.proj = null;
        }
        c.anim = null;
        c.holder.visible = true;
        c.parts.root.visible = true;
        if (c.parts.riderRoot) c.parts.riderRoot.visible = true;
        if (c.shadow) { c.shadow.visible = true; c.shadow.scale.setScalar(1); }
      }
      for (const d of this.dying) {
        this.pieces.remove(d.c.holder);
        this.endBurn(d);
        this.endCounter(d);
        if (d.knightAttack) this.endShot(d.knightAttack);
        if (d.spikes && d.spikes.proj) {
          this.scene.remove(d.spikes.proj);
          d.spikes.proj.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
          d.spikes.proj = null;
        }
      }
      this.dying = [];
      for (const scar of this.captureScars) {
        this.scene.remove(scar.object);
        scar.object.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      }
      this.captureScars = [];
      this.captureCamera = null;
      if (this.spark) this.spark.visible = false;
      this.shakeUntil = 0;
      this.busyUntil = 0;
    }

    // Flèches de replay : { from, to, color } posées à plat au-dessus du plateau
    setArrows(list) {
      const T = this.THREE;
      const key = list.map((a) => `${a.from}-${a.to}-${a.color}`).join(',');
      if (key === this.arrowKey) return;
      this.arrowKey = key;
      if (!this.arrowGroup) { this.arrowGroup = new T.Group(); this.scene.add(this.arrowGroup); }
      for (const child of [...this.arrowGroup.children]) {
        this.arrowGroup.remove(child);
        child.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
      }
      for (const a of list) {
        const p = this.sqToPos(a.from), q = this.sqToPos(a.to);
        const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz) - 0.12;
        if (len <= 0.5) continue;
        const hex = { red: 0xe53935, blue: 0x2f7bff, violet: 0xa855f7 }[a.color] || 0x2ecc40;
        const mat = new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.88, depthTest: false });
        const shaftLen = len - 0.42;
        const shaft = new T.Mesh(new T.BoxGeometry(shaftLen, 0.05, 0.13), mat);
        shaft.position.set(shaftLen / 2, 0, 0);
        const head = new T.Mesh(new T.ConeGeometry(0.24, 0.42, 16), mat);
        head.rotation.z = -Math.PI / 2;
        head.position.set(len - 0.21, 0, 0);
        const arrow = new T.Group();
        arrow.add(shaft, head);
        arrow.position.set(p.x, 0.45, p.z);
        arrow.rotation.y = -Math.atan2(dz, dx);
        arrow.renderOrder = 999;
        shaft.renderOrder = head.renderOrder = 999;
        this.arrowGroup.add(arrow);
      }
    }

    makeMateUltimateFx(u) {
      const T = this.THREE, kind = u.piece.toLowerCase();
      const actor = u.actor, king = u.king;
      this.captureCamera = null;
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
        u.angel = this.makeWhiteAngel(); actor.holder.add(u.angel);
        u.angelBaseScale = this.formScaleMatchingActor(actor, u.angel);
        u.floatH = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y * 0.95; // flotte à hauteur des têtes
        u.angel.scale.setScalar(0.05); actor.parts.root.visible = false;
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
        u.banshee = this.makeBlackBanshee(); actor.holder.add(u.banshee);
        u.bansheeBaseScale = this.formScaleMatchingActor(actor, u.banshee);
        u.floatH = new T.Box3().setFromObject(actor.parts.root).getSize(new T.Vector3()).y * 0.95; // flotte à hauteur des têtes
        u.banshee.scale.setScalar(0.06); actor.parts.root.visible = false;
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
      const body = new T.Mesh(new T.ConeGeometry(0.62, 1.4, 12), robe); body.position.y = 0.72; banshee.add(body);
      const head = new T.Mesh(new T.SphereGeometry(0.32, 18, 14), face); head.position.set(0, 1.55, 0.08); banshee.add(head);
      const hood = new T.Mesh(new T.ConeGeometry(0.45, 0.72, 8), robe); hood.position.set(0, 1.77, -0.02); banshee.add(hood);
      const veil = new T.Mesh(new T.ConeGeometry(0.3, 0.85, 9), edge); veil.position.set(0, 1.14, -0.08); banshee.add(veil);
      for (const side of [-1, 1]) {
        const arm = new T.Mesh(new T.CylinderGeometry(0.1, 0.17, 0.86, 8), robe); arm.position.set(side * 0.54, 1.1, 0.04); arm.rotation.z = side * -0.72; banshee.add(arm);
        const wisp = new T.Mesh(new T.ConeGeometry(0.16, 1.0, 6), edge); wisp.position.set(side * 0.7, 0.6, -0.16); wisp.rotation.z = side * -0.45; banshee.add(wisp);
        const eyeMesh = new T.Mesh(new T.SphereGeometry(0.055, 8, 6), eye); eyeMesh.position.set(side * 0.13, 1.58, 0.36); banshee.add(eyeMesh);
      }
      banshee.userData.wisps = banshee.children.filter((child) => child.geometry && child.geometry.type === 'ConeGeometry');
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
      const u = this.mateUltimate;
      if (!u || t < u.start || (c !== u.actor && c !== u.king)) return false;
      const kind = u.piece.toLowerCase(), e = t - u.start, target = u.target;
      const clamp = (x) => Math.max(0, Math.min(1, x));
      const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
      const actor = u.actor, king = u.king;
      if (kind === 'q' && u.piece === 'Q') {
        const queenPos = this.sqToPos(u.attackerTo);
        if (c === actor) {
          c.anim = null; c.holder.position.set(queenPos.x, 0, queenPos.z); c.parts.root.visible = false;
          const grow = smooth(e / 0.9);
          u.angel.scale.setScalar(0.05 + grow * u.angelBaseScale);
          u.angel.position.y = grow * u.floatH + Math.sin(t * 3.2) * 0.08;
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
          c.anim = null; c.holder.position.set(queenPos.x, 0, queenPos.z); c.parts.root.visible = false;
          const grow = smooth(e / 0.9);
          u.banshee.scale.setScalar(0.06 + grow * u.bansheeBaseScale);
          u.banshee.position.y = grow * u.floatH + Math.sin(t * 3.2) * 0.1;
          u.banshee.rotation.y = Math.sin(t * 1.3) * 0.14;
          u.banshee.userData.wisps.forEach((w, i) => { w.rotation.z = (i % 2 ? -1 : 1) * (0.18 + Math.sin(t * 7 + i) * 0.22); });
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
      if (u.banshee && u.banshee.parent) {
        u.banshee.parent.remove(u.banshee);
        u.banshee.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
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

    // Les animations de duel ne concernent que deux voisins dont l'un peut
    // réellement capturer l'autre selon les règles légales des échecs.
    // Pour chaque pièce, l'adversaire le plus proche ; à distance égale, le plus fort
    nearestFoes(board) {
      const STRENGTH = { q: 9, r: 5, b: 3.2, n: 3, k: 4, p: 1 };
      const out = new Map();
      for (let a = 0; a < 64; a++) {
        const pa = board[a];
        if (!pa) continue;
        const white = pa === pa.toUpperCase();
        let best = -1, bestD = Infinity, bestS = -1;
        for (let b = 0; b < 64; b++) {
          const pb = board[b];
          if (!pb || (pb === pb.toUpperCase()) === white) continue;
          const dr = (a >> 3) - (b >> 3), df = (a & 7) - (b & 7), d = dr * dr + df * df;
          const st = STRENGTH[pb.toLowerCase()] || 0;
          if (d < bestD || (d === bestD && st > bestS)) { best = b; bestD = d; bestS = st; }
        }
        if (best >= 0) out.set(a, best);
      }
      return out;
    }

    captureFoes(board) {
      const foes = new Map(), chess = root.Chess;
      if (!chess || !chess.legalMoves) return foes;
      for (const turn of ['w', 'b']) {
        const state = { board, turn, castling: '', ep: -1, half: 0, full: 1 };
        for (const move of chess.legalMoves(state)) {
          if (!move.captured) continue;
          const dr = Math.abs((move.from >> 3) - (move.to >> 3));
          const df = Math.abs((move.from & 7) - (move.to & 7));
          if (Math.max(dr, df) !== 1) continue; // les animations restent limitées aux voisins
          if (!foes.has(move.from)) foes.set(move.from, move.to);
          if (!foes.has(move.to)) foes.set(move.to, move.from);
        }
      }
      return foes;
    }

    // Identifie toutes les pièces qui attaquent effectivement le roi en échec.
    checkersOf(board, kingSq) {
      if (kingSq == null || kingSq < 0 || !board[kingSq] || !root.Chess) return [];
      const turn = board[kingSq] === board[kingSq].toUpperCase() ? 'b' : 'w';
      const state = { board, turn, castling: '', ep: -1, half: 0, full: 1 };
      return [...new Set(root.Chess.pseudoMoves(state).filter((m) => m.to === kingSq).map((m) => m.from))];
    }

    // Crée une chaîne persistante seulement lorsque la configuration d'échec change.
    setCheckChains(board, kingSq) {
      const checkers = this.checkersOf(board, kingSq);
      const key = checkers.length ? `${kingSq}:${checkers.join(',')}` : '';
      if (key === this.checkKey) return;
      this.checkKey = key; this.checkGroup.clear(); this.checkLinks = [];
      if (!key) return;
      const king = this.sqToPos(kingSq);
      for (const checkerSq of checkers) {
        const checker = this.sqToPos(checkerSq);
        const count = Math.max(4, Math.ceil(Math.hypot(king.x - checker.x, king.z - checker.z) * 4));
        for (let i = 0; i < count; i++) {
          const link = new this.THREE.Mesh(this.checkLinkGeo, this.checkLinkMat);
          this.checkGroup.add(link);
          this.checkLinks.push({ mesh: link, checkerSq, kingSq, i, count });
        }
      }
    }

    // Suit les deux pièces pendant leurs déplacements et relie le roi à son assaillant.
    drawCheckChains() {
      const T = this.THREE, axis = new T.Vector3(0, 0, 1);
      for (const link of this.checkLinks) {
        const attacker = this.chars.get(link.checkerSq), king = this.chars.get(link.kingSq);
        if (!attacker || !king) { link.mesh.visible = false; continue; }
        link.mesh.visible = true;
        const start = new T.Vector3(attacker.holder.position.x, 0.76, attacker.holder.position.z);
        const end = new T.Vector3(king.holder.position.x, 0.76, king.holder.position.z);
        const direction = end.clone().sub(start);
        const u = (link.i + 0.5) / link.count;
        link.mesh.position.copy(start).lerp(end, u);
        direction.normalize();
        link.mesh.quaternion.setFromUnitVectors(axis, direction);
        link.mesh.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis, link.i % 2 ? Math.PI / 2 : 0));
      }
    }

    // Deux tours du même camp, alignées sans rien entre elles, sont reliées par un fil de feu
    // Deux pièces identiques du même camp sont liées quand elles se protègent l'une l'autre
    // (ligne libre pour les tours, les dames et les fous, saut pour les cavaliers) ou quand elles se touchent
    findRopes(board) {
      const pairs = [];
      const lineClear = (a, b, step) => { for (let s = a + step; s !== b; s += step) if (board[s]) return false; return true; };
      for (const piece of ['R', 'r', 'Q', 'q', 'B', 'b', 'N', 'n']) {
        const kind = piece.toLowerCase(), sqs = [];
        for (let i = 0; i < 64; i++) if (board[i] === piece) sqs.push(i);
        for (let i = 0; i < sqs.length; i++) for (let j = i + 1; j < sqs.length; j++) {
          const a = sqs[i], b = sqs[j], dr = (b >> 3) - (a >> 3), df = (b & 7) - (a & 7);
          const adjacent = Math.max(Math.abs(dr), Math.abs(df)) === 1;
          let linked = adjacent;
          if (!linked && kind === 'n') linked = (Math.abs(dr) === 1 && Math.abs(df) === 2) || (Math.abs(dr) === 2 && Math.abs(df) === 1);
          const straight = dr === 0 || df === 0, diagonal = Math.abs(dr) === Math.abs(df);
          if (!linked && (kind === 'r' || kind === 'q') && straight) linked = lineClear(a, b, dr === 0 ? Math.sign(df) : 8 * Math.sign(dr));
          if (!linked && (kind === 'b' || kind === 'q') && diagonal) linked = lineClear(a, b, 8 * Math.sign(dr) + Math.sign(df));
          if (linked) pairs.push([a, b]);
        }
      }
      return pairs;
    }

    // Fil de feu entre deux tours liées : cœur jaune, gaine orange qui ondule et scintille
    drawRopes(t) {
      const T = this.THREE;
      if (!this.ropeGroup) {
        this.ropeGroup = new T.Group(); this.scene.add(this.ropeGroup);
        this.ropeCore = new T.MeshBasicMaterial({ color: 0xfff1a8 });
        this.ropeFire = new T.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false });
      }
      for (const m of this.ropeGroup.children) if (!m.userData.shared) m.geometry.dispose();
      this.ropeGroup.clear();
      this.ropeFire.opacity = 0.45 + Math.random() * 0.25;
      if (!this.auraMat) {
        this.auraMat = { w: new T.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }),
          b: new T.MeshBasicMaterial({ color: 0xb36bff, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }) };
        this.auraGeo = new T.CylinderGeometry(0.36, 0.44, 1.5, 24, 1, true);
        this.auraRing = new T.RingGeometry(0.34, 0.46, 32);
      }
      const pulse = 0.22 + Math.abs(Math.sin(t * 3)) * 0.18;
      this.auraMat.w.opacity = pulse; this.auraMat.b.opacity = pulse;
      const glowing = new Set();
      for (const [a, b] of this.ropes || []) {
        const ca = this.chars.get(a), cb = this.chars.get(b);
        if (!ca || !cb || ca.anim || cb.anim) continue; // le fil se rallume une fois arrivées
        for (const c of [ca, cb]) {
          if (glowing.has(c)) continue;
          glowing.add(c);
          const m = c.piece === c.piece.toUpperCase() ? this.auraMat.w : this.auraMat.b, p = c.holder.position;
          const shell = new T.Mesh(this.auraGeo, m); shell.position.set(p.x, 0.75, p.z); shell.rotation.y = t; shell.userData.shared = true; this.ropeGroup.add(shell);
          const ring = new T.Mesh(this.auraRing, m); ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.03, p.z); ring.scale.setScalar(1 + Math.sin(t * 4 + a) * 0.08); ring.userData.shared = true; this.ropeGroup.add(ring);
        }
        const pb0 = cb.holder.position, pa0 = ca.holder.position, h = 0.62;
        const len = Math.hypot(pb0.x - pa0.x, pb0.z - pa0.z);
        // le fil part de la main de chaque géant, côté de l'autre
        const ux = (pb0.x - pa0.x) / len, uz = (pb0.z - pa0.z) / len;
        const pa = { x: pa0.x + ux * 0.3, z: pa0.z + uz * 0.3 }, pb = { x: pb0.x - ux * 0.3, z: pb0.z - uz * 0.3 };
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const u = i / 16, w = Math.sin(u * Math.PI) * (0.05 * Math.sin(t * 9 + u * 14 + a));
          pts.push(new T.Vector3(pa.x + (pb.x - pa.x) * u - uz * w, h + Math.sin(u * Math.PI) * 0.06 + w, pa.z + (pb.z - pa.z) * u + ux * w));
        }
        const curve = new T.CatmullRomCurve3(pts);
        this.ropeGroup.add(new T.Mesh(new T.TubeGeometry(curve, 32, 0.018, 6, false), this.ropeCore));
        this.ropeGroup.add(new T.Mesh(new T.TubeGeometry(curve, 32, 0.055 + Math.random() * 0.012, 8, false), this.ropeFire));
      }
    }

    // Object3D.clone() sérialise userData en JSON : la référence circulaire userData.char le ferait planter
    cloneClean(obj) {
      const saved = [];
      obj.traverse((o) => { if (o.userData && o.userData.char) { saved.push([o, o.userData.char]); delete o.userData.char; } });
      try { return obj.clone(); }
      finally { saved.forEach(([o, ch]) => { o.userData.char = ch; }); }
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
            M.animate(c.parts, t, 'run');
            const arc = Math.sin(Math.PI * u) * (leap ? a.high || 0.9 : 0.12);
            c.parts.root.position.y = arc;
            c.shadow.scale.setScalar(1 - arc * 0.4);
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
          if (a.pre && el < 0) {
            // L'attaquant lève un mur de terre pour parer la riposte, avant de lancer sa technique.
            const tg = (a.shot || a.toss).target, u = t - a.pre;
            c.holder.position.set(a.from.x, 0, a.from.z);
            turn(c, Math.atan2(tg.x - a.from.x, tg.z - a.from.z));
            M.animate(c.parts, t, 'guard', 1);
            M.setEarthWall(c.parts, Math.min(1, u / 0.28));
            const hitAt = 0.85;
            c.parts.root.position.z = u > hitAt && u < hitAt + 0.2 ? -Math.sin((u - hitAt) / 0.2 * Math.PI) * 0.12 : 0;
            continue;
          }
          if (a.shot) {
            M.setEarthWall(c.parts, 0);
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
            if (s.tech === 'fire') this.flyFire(c, s, el, t); else this.flyDragon(c, s, el, t);
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
            if (c.parts.weapon !== 'element') this.flash(a.duel.stop, a.duel.foe, hits, c.parts.fast ? 0xffffff : 0xffe066);
          } else {
            const u = Math.min(1, (el - a.dur - a.duel.len) / 0.35);
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
        turn(c, (c.watch ? Math.atan2(c.watch.x - at.x, c.watch.z - at.z) : restYaw) + (c.parts.yawOffset || 0));
        if (c.inCheck && c.parts.wall) { state = 'guard'; k = 1; } // le roi en échec lève son mur de glace
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
          if (d.counter && t < d.counter.end) this.counterShot(d, t); // riposte à distance avec sa propre technique
          else if (d.ex && e >= 0 && e < X1) M.animate(d.c.parts, t, 'guard', Math.min(1, e * 4)); // encaisse l'assaut
          else if (d.ex && e >= X1 && e < X2) {
            // riposte au corps à corps avec ses propres armes
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
        if (el < travelEnd) {
          c.holder.position.set(pos.x, Math.sin(Math.PI * u) * 0.9, pos.z);
        } else if (a.style === 'eagle-release') {
          const uDrop = Math.max(0, Math.min(1, (el - 2.0) / 1.65));
          c.holder.position.set(target.x + Math.sin(uDrop * Math.PI) * 0.65, 2.5 * (1 - uDrop), target.z + Math.cos(uDrop * Math.PI) * 0.55 - 0.55);
        } else {
          const dive = Math.max(0, Math.min(1, (el - 1.95) / 0.72));
          c.holder.position.set(target.x, el < 1.95 ? 0.75 + (el - travelEnd) / (1.95 - travelEnd) * 2.2 : 2.95 * (1 - dive), target.z);
          if (el >= 2.62 && !a.craterMade) {
            a.craterMade = true;
            this.createCrater(a.target, t);
            this.shakeUntil = t + 0.45; this.shakeAmp = 0.14;
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
        a.whirl.position.set(c.holder.position.x, Math.max(-0.2, c.holder.position.y), c.holder.position.z);
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
      this.effects = this.effects.filter((fx) => {
        const e = t - fx.start;
        if (e < 0) return true;
        fx.tick(e, t);
        if (e >= fx.dur) { fx.end(); return false; }
        return true;
      });
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
        a.whirl = new T.Group();
        a.whirlBands = [];
        for (let i = 0; i < 7; i++) {
          const r = 0.16 + i * 0.07;
          const band = new T.Mesh(new T.TorusGeometry(r, 0.022 + i * 0.003, 6, 28, Math.PI * 1.3),
            new T.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0xd9ecf5, transparent: true, opacity: 0.75, depthWrite: false, side: T.DoubleSide }));
          band.rotation.x = Math.PI / 2; band.position.y = 0.12 + i * 0.22;
          band.userData = { speed: 9 + i * 1.5, phase: i * 0.9 };
          a.whirl.add(band); a.whirlBands.push(band);
        }
        a.whirlBits = [];
        for (let i = 0; i < 14; i++) {
          const bit = new T.Mesh(new T.PlaneGeometry(0.07, 0.04), new T.MeshBasicMaterial({ color: i % 3 ? 0xcfe6c4 : 0xb7a57a, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
          bit.userData = { a: i * 2.399, h: (i % 7) * 0.22, r: 0.25 + (i % 4) * 0.1 };
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
      a.whirl.position.set(a.from.x, 0, a.from.z);
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
      if (a.style === 'eagle-release') {
        const lift = Math.max(0, Math.min(1, (el - 1.08) / 0.92));
        const fall = Math.max(0, Math.min(1, (el - 2.0) / 1.65));
        const y = el < 2.0 ? 0.12 + lift * 2.55 : 2.67 * (1 - fall);
        c.holder.position.set(a.target.x, y, a.target.z);
        c.parts.root.rotation.set(-Math.min(1, Math.max(0, el - 2.0)) * 3, 0, fall * 5);
      } else {
        if (el < 2.62) {
          const lift = Math.max(0, Math.min(1, (el - 1.08) / 1.54));
          c.holder.position.set(a.target.x, 0.12 + lift * 2.75, a.target.z);
          c.parts.root.rotation.set(0.35, 0, Math.sin(el * 8) * 0.1);
        } else {
          c.holder.position.set(a.target.x, 0.08, a.target.z);
          c.parts.root.rotation.set(-Math.PI / 2, 0, 0.2);
          c.parts.root.scale.set(d.base * 0.95, d.base * 0.48, d.base * 0.95);
        }
      }
      return el < a.duration;
    }

    createCrater(at, t) {
      const T = this.THREE, crater = new T.Group();
      const pit = new T.Mesh(new T.CircleGeometry(0.34, 24), new T.MeshBasicMaterial({ color: 0x21170f, transparent: true, opacity: 0.95, side: T.DoubleSide }));
      pit.rotation.x = -Math.PI / 2; pit.position.y = 0.025; crater.add(pit);
      const rim = new T.Mesh(new T.TorusGeometry(0.32, 0.075, 7, 20), new T.MeshStandardMaterial({ color: 0x59402b, roughness: 1 }));
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.04; crater.add(rim);
      for (let i = 0; i < 7; i++) {
        const angle = i / 7 * Math.PI * 2, size = 0.09 + (i % 3) * 0.025;
        const rock = new T.Mesh(new T.DodecahedronGeometry(size, 0), new T.MeshStandardMaterial({ color: i % 2 ? 0x806044 : 0x493426, roughness: 1 }));
        rock.position.set(Math.cos(angle) * 0.31, 0.045, Math.sin(angle) * 0.31); rock.scale.y = 0.55; crater.add(rock);
      }
      crater.position.set(at.x, 0, at.z); this.scene.add(crater);
      this.captureScars.push({ object: crater, until: t + 5, start: t });
    }

    tickCaptureScars(t) {
      this.captureScars = this.captureScars.filter((scar) => {
        if (t >= scar.until) {
          this.scene.remove(scar.object);
          scar.object.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
          return false;
        }
        return true;
      });
    }

    fx(s, o) { this.scene.add(o); (s.fx = s.fx || []).push(o); return o; }
    glow(color, opacity = 0.9) {
      const T = this.THREE;
      return new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false });
    }
    handsOf(c) {
      const T = this.THREE, v = new T.Vector3();
      c.holder.updateMatrixWorld(true);
      c.parts.armL.getWorldPosition(v);
      const w = new T.Vector3(); c.parts.armR.getWorldPosition(w);
      const fwd = new T.Vector3(Math.sin(c.holder.rotation.y), 0, Math.cos(c.holder.rotation.y));
      return v.add(w).multiplyScalar(0.5).addScaledVector(fwd, 0.35);
    }

    // Technique de la boule de feu (dame) : jaillit des mains, traînée de flammes, explosion sur la cible
    flyFire(c, s, el, t) {
      const T = this.THREE;
      if (el >= s.fire && !s.ball && !s.boom) {
        s.start = this.handsOf(c);
        const ball = new T.Group();
        ball.add(new T.Mesh(new T.SphereGeometry(0.16, 14, 10), this.glow(0xfff1a8, 1)));
        ball.add(new T.Mesh(new T.SphereGeometry(0.28, 14, 10), this.glow(0xff7a1a, 0.7)));
        ball.add(new T.Mesh(new T.SphereGeometry(0.38, 14, 10), this.glow(0xd8301a, 0.35)));
        s.ball = this.fx(s, ball);
        s.puffs = [];
        this.shakeUntil = t + 0.12; this.shakeAmp = 0.03;
      }
      // pendant les signes des mains, une flamme grossit entre les paumes
      if (el < s.fire) {
        if (!s.charge) s.charge = this.fx(s, new T.Mesh(new T.SphereGeometry(0.1, 10, 8), this.glow(0xff9a2a, 0.8)));
        s.charge.position.copy(this.handsOf(c));
        s.charge.scale.setScalar(0.3 + (el / s.fire) * 1.2 + Math.random() * 0.2);
      } else if (s.charge) s.charge.visible = false;
      const end = new T.Vector3(s.target.x, 0.6, s.target.z);
      if (s.ball && el < s.impact) {
        const u = Math.max(0, (el - s.fire) / s.flight);
        const pos = s.start.clone().lerp(end, u); pos.y += Math.sin(Math.PI * u) * 0.2;
        s.ball.position.copy(pos);
        s.ball.children.forEach((m, i) => m.scale.setScalar(0.9 + Math.random() * 0.3 + i * 0.05));
        if (!s.lastPuff || el - s.lastPuff > 0.02) {
          s.lastPuff = el;
          const puff = this.fx(s, new T.Mesh(new T.SphereGeometry(0.16, 8, 6), this.glow(Math.random() < 0.5 ? 0xff6a1a : 0xffb02e, 0.7)));
          puff.position.copy(pos);
          s.puffs.push({ m: puff, t0: el });
        }
      }
      if (s.ball && el >= s.impact && !s.boom) {
        this.scene.remove(s.ball); s.ball = null;
        this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffc34d], [0xff8a2a, 0x3b2a1a]);
      }
      this.boomStep(s, el);
      for (const p of s.puffs || []) {
        const age = el - p.t0;
        p.m.scale.setScalar(Math.max(0.05, 1 - age * 2.5));
        p.m.material.opacity = Math.max(0, 0.7 - age * 1.6);
        p.m.position.y += 0.006;
      }
    }

    // Technique du dragon d'eau (tour) : un serpent d'eau jaillit, ondule dans les airs et s'abat sur la cible
    flyDragon(c, s, el, t) {
      const T = this.THREE;
      const N = 22;
      if (el >= s.fire && !s.dragon && !s.splashDone) {
        s.start = this.handsOf(c);
        const g = new T.Group();
        const water = s.fireDragon
          ? new T.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.92 })
          : new T.MeshToonMaterial({ color: 0x3fa9f5, transparent: true, opacity: 0.85 });
        const foam = new T.MeshBasicMaterial({ color: s.fireDragon ? 0x3a1608 : 0xe6f7ff });
        for (let i = 0; i < N; i++) {
          // Dragon de feu : corps du jaune (tête) au rouge sombre (queue), avec des flammes le long du dos
          const segMat = s.fireDragon ? new T.MeshBasicMaterial({ color: new T.Color(0xffb020).lerp(new T.Color(0xc41a06), Math.min(1, i / N * 1.6)), transparent: true, opacity: 0.95, toneMapped: false }) : water;
          const seg = new T.Mesh(new T.SphereGeometry(0.24 * (1 - i / N * 0.65), 12, 8), segMat);
          if (s.fireDragon && i % 2 === 0) {
            const flame = new T.Mesh(new T.ConeGeometry(0.07 * (1 - i / N * 0.6), 0.26, 6), new T.MeshBasicMaterial({ color: i % 4 ? 0xff4a12 : 0xffb52a, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
            flame.position.y = 0.2 * (1 - i / N * 0.6); seg.add(flame);
          }
          g.add(seg);
        }
        // tête : gueule, cornes, yeux
        const head = g.children[0];
        head.scale.set(1.25, 1.05, 1.7);
        for (const sd of [-1, 1]) {
          const horn = new T.Mesh(new T.ConeGeometry(0.035, 0.22, 6), foam); horn.position.set(sd * 0.08, 0.14, -0.08); horn.rotation.x = -0.9; head.add(horn);
          const eye = new T.Mesh(new T.SphereGeometry(0.028, 8, 6), new T.MeshBasicMaterial({ color: 0xffef5a })); eye.position.set(sd * 0.09, 0.06, 0.08); head.add(eye);
        }
        const jaw = new T.Mesh(new T.ConeGeometry(0.1, 0.2, 8), water); jaw.rotation.x = Math.PI / 2; jaw.position.set(0, -0.04, 0.18); head.add(jaw);
        s.dragon = this.fx(s, g);
        this.shakeUntil = t + 0.15; this.shakeAmp = 0.03;
      }
      const end = new T.Vector3(s.target.x, 0.55, s.target.z);
      if (s.dragon) {
        const dir = end.clone().sub(s.start); dir.y = 0;
        const side = new T.Vector3(-dir.z, 0, dir.x).normalize();
        const pathAt = (u) => {
          const p = s.start.clone().lerp(end, Math.min(1, u));
          p.y += Math.sin(Math.PI * Math.min(1, u)) * 1.1;
          return p.addScaledVector(side, Math.sin(u * 9) * 0.22 * (1 - Math.min(1, u) * 0.6));
        };
        const head = (el - s.fire) / s.flight;
        s.dragon.children.forEach((m, i) => {
          const u = head - i * 0.04;
          m.visible = u > 0 && u < 1.08;
          if (!m.visible) return;
          m.position.copy(pathAt(u));
          if (i === 0) m.lookAt(pathAt(u + 0.03));
        });
        if (head - (N - 1) * 0.04 > 1.08) { this.scene.remove(s.dragon); s.dragon = null; s.splashDone = true; }
      }
      if (el >= s.impact && !s.boom && !s.splashed) {
        s.splashed = true;
        if (s.fireDragon) this.explode(s, end, el, t, [0xfff1a8, 0xff6a1a, 0xffb347], [0xff4500, 0x2a1a12], false);
        else this.explode(s, end, el, t, [0xd6f2ff, 0x3fa9f5, 0x9fdcff], [0x3fa9f5, 0xe6f7ff], true);
      }
      this.boomStep(s, el);
    }

    // Impact : noyau, halo, onde au sol et éclats (feu ou gerbe d'eau)
    explode(s, at, el, t, [c1, c2, c3], debrisColors, water) {
      const T = this.THREE;
      const boom = new T.Group(); boom.position.copy(at);
      const core = new T.Mesh(new T.SphereGeometry(0.3, 16, 12), this.glow(c1, 1));
      const fire = new T.Mesh(new T.SphereGeometry(0.45, 16, 12), water ? new T.MeshBasicMaterial({ color: c2, transparent: true, opacity: 0.6, depthWrite: false }) : this.glow(c2));
      const ring = new T.Mesh(new T.RingGeometry(0.3, 0.42, 32), new T.MeshBasicMaterial({ color: c3, transparent: true, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = -0.5;
      boom.add(core, fire, ring);
      s.debris = [];
      for (let i = 0; i < (water ? 22 : 14); i++) {
        const d = new T.Mesh(water ? new T.SphereGeometry(0.04, 6, 4) : new T.BoxGeometry(0.06, 0.06, 0.06), new T.MeshBasicMaterial({ color: debrisColors[i % 2] }));
        const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 2;
        d.userData.v = new T.Vector3(Math.cos(a) * sp, 2 + Math.random() * 2.5, Math.sin(a) * sp);
        boom.add(d); s.debris.push(d);
      }
      s.boom = this.fx(s, boom); s.boomT = el;
      this.shakeUntil = t + 0.4; this.shakeAmp = water ? 0.07 : 0.12;
    }
    boomStep(s, el) {
      if (!s.boom) return;
      const b = (el - s.boomT);
      const [core, fire, ring] = s.boom.children;
      const g = Math.min(1, b / 0.18);
      core.scale.setScalar(0.4 + g * 1.4); core.material.opacity = Math.max(0, 1 - b / 0.4);
      fire.scale.setScalar(0.5 + g * 1.8 + b * 0.6); fire.material.opacity = Math.max(0, 0.9 - b / 0.7);
      ring.scale.setScalar(1 + b * 6); ring.material.opacity = Math.max(0, 0.8 - b / 0.5);
      for (const d of s.debris) {
        const v = d.userData.v;
        d.position.set(v.x * b, Math.max(-0.55, v.y * b - 4.9 * b * b), v.z * b);
        d.rotation.set(b * 10, b * 7, 0);
      }
      if (b > 1.2) { this.scene.remove(s.boom); s.boom = null; }
    }

    endShot(c) {
      const s = c && c.fx ? c : c && c.anim && c.anim.shot;
      if (!s) return;
      if (s.sky && s.style === 'flameline') { this.renderer.toneMappingExposure = s.sky.exposure; s.sky = null; }
      if (s.sky) this.restoreSky(s);
      for (const o of s.fx || []) {
        this.scene.remove(o);
        o.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); });
      }
      if (s.headClone) { this.scene.remove(s.headClone); s.headClone = null; }
      s.fx = []; s.ball = null; s.boom = null; s.dragon = null;
    }

    // Riposte à distance de la pièce prise : chacune lance sa propre technique sur l'attaquant
    counterShot(d, t) {
      const T = this.THREE, M = root.Models3D, k = d.counter, c = d.c, el = t - k.start;
      const kind = c.piece.toLowerCase(), cast = 'qrk'.includes(kind);
      if (el < 0.85) M.animate(c.parts, t, cast ? 'cast' : kind === 'b' ? 'throw' : 'punch', cast ? Math.min(1, el / 0.5) : Math.min(1, el / 0.45));
      else M.animate(c.parts, t, 'idle');
      if (el >= 0.3 && !k.proj && !k.done) {
        const g = new T.Group();
        if (kind === 'b' && c.parts.shuriken) { g.add(this.cloneClean(c.parts.shuriken)); g.scale.setScalar(c.parts.root.scale.x * 1.1); }
        else {
          const col = { q: [0xfff1a8, 0xff7a1a], r: [0xd8f6ff, 0x2a8cff], k: [0xeaffff, 0x5fd8ff], n: [0xffffff, 0x9fb8ff], p: [0xffffff, 0xffc04a] }[kind] || [0xffffff, 0xffe066];
          const long = kind === 'p' || kind === 'k' || kind === 'n';
          const core = new T.Mesh(long ? new T.ConeGeometry(0.06, 0.42, 6) : new T.SphereGeometry(0.12, 12, 8), this.glow(col[0], 1));
          const halo = new T.Mesh(long ? new T.ConeGeometry(0.12, 0.5, 6) : new T.SphereGeometry(0.24, 12, 8), this.glow(col[1], 0.55));
          if (long) { core.rotation.x = halo.rotation.x = Math.PI / 2; }
          g.add(core, halo);
          g.scale.setScalar(1.5);
        }
        k.start3 = this.handsOf(c);
        k.proj = g; this.scene.add(g);
      }
      if (k.proj) {
        const u = Math.min(1, (el - 0.3) / 0.55);
        const end = new T.Vector3(k.at.x, 0.7, k.at.z);
        const pos = k.start3.clone().lerp(end, u); pos.y += Math.sin(Math.PI * u) * 0.25;
        k.proj.position.copy(pos);
        k.proj.lookAt(end);
        if (kind === 'b') k.proj.rotation.z = -el * 28;
        if (u >= 1) {
          // parée par l'attaquant : éclat à l'impact
          this.scene.remove(k.proj); k.proj = null; k.done = true;
          this.shakeUntil = t + 0.08; this.shakeAmp = 0.02;
          k.burst = new T.Mesh(new T.SphereGeometry(0.2, 12, 8), this.glow(kind === 'q' ? 0xff7a1a : kind === 'r' ? 0x2a8cff : 0xffe9a0, 0.85));
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
