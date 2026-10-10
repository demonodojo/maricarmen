'use strict';
(() => {
const T = window.THREE;
const FACADE_Z = -14;
const FACADE_ROW = 154;
const BUILD_DEPTH = 60;

const L = (a, b, t, d, z, c, o) => ({ k: 'L', a, b, t, d, z, c, o });
const B = (a, ox, oy, w, h, d, z, c, o) => ({ k: 'B', a, ox, oy, w, h, d, z, c, o });

const SPECS = {
  mari: (() => {
    const ST = '#e3c19b', STD = '#b8926c', SHO = '#3b2418', CG = '#9b59b6', CGD = '#6e3a88';
    const SK = '#f2c29b', SKD = '#d49a74', SKT = '#4f3d33', HR = '#d6d7df';
    return [
      L('hip', 'bk', 2, 2, -1.5, STD), L('bk', 'bf', 2, 2, -1.5, STD), B('bf', -1, -1, 4, 2, 3, -1.5, SHO),
      L('hip', 'fk', 2, 2, 1.5, ST), L('fk', 'ff', 2, 2, 1.5, ST), B('ff', -1, -1, 4, 2, 3, 1.5, SHO),
      L('sh', 'be', 2, 2, -3, CGD), L('be', 'bh', 2, 2, -3, CGD), B('bh', -1, -1, 2, 2, 2, -3, SKD),
      L('hip', 'sh', 5, 5, 0, CG),
      B('hip', -4, -1, 9, 5, 7, 0, SKT),
      B('hip', -7, -2, 5, 4, 2, 4.5, '#8a2f2f', { when: (f) => !f.lying }),
      L('sh', 'fe', 2, 2, 3, CG), L('fe', 'fh', 2, 2, 3, CG), B('fh', -1, -1, 2, 2, 2, 3, SK, { fist: true }),
      B('hd', -1, 2, 3, 1, 5, 0, '#f4f0e8'),
      B('hd', -3, -3, 6, 6, 6, 0, SK), B('hd', 3, 0, 1, 1, 1.5, 0, SK),
      B('hd', -4, -5, 7, 2, 7, 0, HR), B('hd', -3, -6, 5, 1, 5, 0, HR), B('hd', -4, -3, 2, 5, 7, 0, HR),
      B('hd', 0, -2, 3, 1, 6.6, 0, '#4a4a4a'), B('hd', 1, -1, 1, 1, 6.4, 0, '#222222'),
      B('hd', 1, 1, 2, 1, 6.2, 0, '#a85a50'),
      B('fh', -2, 0, 5, 5, 3, 4, '#7a3b2b', { when: (f) => f.bag }),
      L('fh', 'caneEnd', 1, 1, 4, '#6b4a2a', { when: (f) => f.cane }),
    ];
  })(),
  skin: (() => {
    const JK = '#3f4a2c', JKD = '#2f3820', JE = '#3b4f86', JED = '#2d3c66', BOOT = '#5a1414';
    const SKIN = '#f0c09a', SKD = '#d0a07a';
    return [
      L('hip', 'bk', 3, 3, -2, JED), L('bk', 'bf', 3, 3, -2, JED), B('bf', -1, -2, 5, 3, 4, -2, BOOT),
      L('sh', 'be', 3, 3, -4, JKD), L('be', 'bh', 2, 2, -4, JKD), B('bh', -1, -1, 2, 2, 2, -4, SKD, { fist: true }),
      B('bh', -1, -6, 2, 5, 2, -4, '#2e8b3e', { when: (f) => f.bottle }),
      L('hip', 'fk', 3, 3, 2, JE), L('fk', 'ff', 3, 3, 2, JE), B('ff', -1, -2, 5, 3, 4, 2, BOOT),
      L('hip', 'sh', 6, 6, 0, JK),
      B('hd', -3, -3, 6, 6, 6, 0, SKIN), B('hd', -2, -4, 5, 1, 5, 0, SKIN), B('hd', 3, 0, 1, 1, 1.5, 0, SKIN),
      B('hd', 1, -1, 1, 1, 6.4, 0, '#111111'), B('hd', 1, 1, 2, 1, 6.2, 0, '#8a3030'),
      L('sh', 'fe', 3, 3, 4, JK), L('fe', 'fh', 2, 2, 4, JK), B('fh', -1, -1, 2, 2, 2, 4, SKIN),
    ];
  })(),
  geo: (() => {
    const BK = '#1d1f24', BKD = '#121317', VEST = '#3a3f46', BOOT = '#050505', HEL = '#0c0d10', SKIN = '#d9a882';
    return [
      L('hip', 'bk', 3, 3, -2, BKD), L('bk', 'bf', 3, 3, -2, BKD), B('bf', -1, -1, 5, 2, 4, -2, BOOT),
      L('sh', 'be', 3, 3, -4, BKD), L('be', 'bh', 2, 2, -4, BKD), B('bh', -1, -1, 2, 2, 2, -4, '#000000'),
      L('hip', 'fk', 3, 3, 2, BK), L('fk', 'ff', 3, 3, 2, BK), B('ff', -1, -1, 5, 2, 4, 2, BOOT),
      L('hip', 'sh', 6, 6, 0, BK), B('sh', -3, 0, 6, 8, 7, 0, VEST),
      B('hd', -3, -3, 6, 6, 6, 0, BK), B('hd', 0, -1, 3, 1, 6.4, 0, SKIN),
      B('hd', -4, -5, 8, 3, 7.4, 0, HEL), B('hd', 0, -4, 4, 1, 7.6, 0, '#5a6a7a'),
      L('sh', 'fe', 3, 3, 4, BK), L('fe', 'fh', 2, 2, 4, BK), B('fh', -1, -1, 2, 2, 2, 4, '#000000'),
      B('fh', -1, -1, 6, 2, 2, 4, '#e8d020', { when: (f) => f.shoot }),
    ];
  })(),
  officer: (() => {
    const C = '#1d1d21', CD = '#121215', BOOT = '#050505', SKIN = '#eec3a2', SKD = '#cc9f80', GOLD = '#e2b443';
    return [
      L('hip', 'bk', 3, 3, -2, CD), L('bk', 'bf', 3, 3, -2, BOOT), B('bf', -1, -1, 5, 2, 4, -2, BOOT),
      L('sh', 'be', 3, 3, -4, CD), L('be', 'bh', 2, 2, -4, CD), B('bh', -1, -1, 2, 2, 2, -4, '#111111', { fist: true }),
      L('bh', 'saberEnd', 1, 1, -4, '#dcdce4', { when: (f) => f.saber }),
      L('hip', 'fk', 3, 3, 2, C), L('fk', 'ff', 3, 3, 2, BOOT), B('ff', -1, -1, 5, 2, 4, 2, BOOT),
      L('hip', 'sh', 6, 6, 0, C), B('hip', -4, -1, 9, 7, 7, 0, C), B('hip', -3, -2, 6, 1, 6.6, 0, '#3a2a1a'),
      B('sh', -2, -2, 5, 1, 6.8, 0, GOLD, { when: (f) => f.gold }),
      B('sh', -1, 3, 2, 2, 6.8, 0, '#c41e1e', { when: (f) => f.gold }),
      B('hd', -3, -3, 6, 6, 6, 0, SKIN), B('hd', 3, 0, 1, 1, 1.5, 0, SKIN), B('hd', -2, -1, 1, 2, 6.2, 0, SKD),
      B('hd', 1, -1, 1, 1, 6.4, 0, '#111111'),
      B('hd', -4, -6, 8, 3, 7, 0, C), B('hd', -4, -7, 9, 1, 7.4, 0, C), B('hd', 1, -4, 5, 1, 7.4, 0, '#111111'),
      B('hd', 0, -6, 2, 1, 7.6, 0, '#c0c0c0'),
      L('sh', 'fe', 3, 3, 4, C), L('fe', 'fh', 2, 2, 4, C), B('fh', -1, -1, 2, 2, 2, 4, SKIN),
      B('arm', -1, -1, 3, 2, 3.6, 4, '#c41e1e'),
    ];
  })(),
  cop: (() => {
    const PA = '#1e2a4d', PD = '#141c35', J = '#283862', JD = '#1b2647', PAD = '#0e111c';
    const BOOT = '#0a0a0a', HEL = '#121c38', SKIN = '#e0b08a';
    return [
      L('hip', 'bk', 3, 3, -2, PD), L('bk', 'bf', 3, 3, -2, PD), B('bf', -1, -1, 5, 2, 4, -2, BOOT),
      L('sh', 'be', 3, 3, -4, JD), L('be', 'bh', 2, 2, -4, JD), B('bh', -1, -1, 2, 2, 2, -4, '#111111'),
      L('bh', 'btEnd', 2, 2, -4, '#090909', { when: (f) => !f.shoot }),
      L('hip', 'fk', 3, 3, 2, PA), L('fk', 'ff', 3, 3, 2, PA),
      B('fk', -1, -1, 3, 3, 3.6, 2, PAD), B('ff', -1, -1, 5, 2, 4, 2, BOOT),
      L('hip', 'sh', 6, 6, 0, J), B('hip', -3, -1, 6, 2, 6.4, 0, PAD), B('sh', -2, -2, 5, 3, 6.6, 0, PAD),
      B('hd', -4, -5, 8, 6, 8, 0, HEL), B('hd', -3, -6, 6, 1, 7, 0, HEL), B('hd', -4, 1, 3, 2, 7, 0, HEL),
      B('hd', 0, 1, 3, 2, 6, 0, SKIN),
      B('hd', 1, -2, 4, 4, 8.4, 0, '#8cc8eb', { opacity: 0.7 }),
      B('hd', -4, -6, 8, 1, 8.6, 0, '#e2b443', { when: (f) => f.gold }),
      B('sh', -2, -3, 5, 1, 7, 0, '#e2b443', { when: (f) => f.gold }),
      L('sh', 'fe', 3, 3, 4, J), L('fe', 'fh', 2, 2, 4, J), B('fh', -1, -1, 2, 2, 2, 4, '#111111'),
      B('fh', -3, -1, 9, 2, 2, 4, '#333333', { when: (f) => f.shoot }),
      B('fh', 5, -2, 3, 3, 2.4, 4, '#555555', { when: (f) => f.shoot }),
      B('shUp', 0, 0, 3, 24, 16, 5, '#aacdeb', { opacity: 0.5, when: (f) => f.shieldUp && !f.lying }),
      B('shDown', 0, 0, 3, 16, 14, 6, '#aacdeb', { opacity: 0.45, when: (f) => !f.shieldUp && !f.lying }),
    ];
  })(),
  nazi: (() => {
    const U = '#5d6449', UD = '#454b36', BOOT = '#0d0d0d', HEL = '#3c4232', SKIN = '#efc3a0', SKD = '#cf9f7c';
    return [
      L('hip', 'bk', 3, 3, -2, UD), L('bk', 'bf', 3, 3, -2, BOOT), B('bf', -1, -1, 5, 2, 4, -2, BOOT),
      L('sh', 'be', 3, 3, -4, UD), L('be', 'bh', 2, 2, -4, UD), B('bh', -1, -1, 2, 2, 2, -4, SKD, { fist: true }),
      L('hip', 'fk', 3, 3, 2, U), L('fk', 'ff', 3, 3, 2, BOOT), B('ff', -1, -1, 5, 2, 4, 2, BOOT),
      L('hip', 'sh', 6, 6, 0, U), B('hip', -3, -2, 6, 1, 6.4, 0, '#4a3220'),
      B('hd', -3, -3, 6, 6, 6, 0, SKIN), B('hd', 3, 0, 1, 1, 1.5, 0, SKIN),
      B('hd', 1, -1, 1, 1, 6.4, 0, '#111111'), B('hd', 0, -2, 3, 1, 6.4, 0, '#5a3a1a'),
      B('hd', 1, 1, 2, 1, 6.2, 0, '#8a3030'),
      B('hd', -4, -6, 7, 3, 7, 0, HEL), B('hd', -3, -7, 5, 1, 6, 0, HEL),
      B('hd', -5, -3, 9, 1, 8, 0, HEL), B('hd', -5, -2, 2, 3, 8, 0, HEL),
      L('sh', 'fe', 3, 3, 4, U), L('fe', 'fh', 2, 2, 4, U), B('fh', -1, -1, 2, 2, 2, 4, SKIN),
      B('arm', -1, -1, 3, 2, 3.6, 4, '#c41e1e'), B('arm', 0, -1, 1, 1, 3.8, 4, '#f2f2f2'),
    ];
  })(),
  para: (() => {
    const U = '#4d5a34', UD = '#3a4428', BOOT = '#2a2418', SKIN = '#efc3a0';
    return [
      L('hip', 'bk', 3, 3, -2, UD), L('bk', 'bf', 3, 3, -2, BOOT), B('bf', -1, -1, 5, 2, 4, -2, BOOT),
      L('sh', 'be', 3, 3, -4, UD), L('be', 'bh', 2, 2, -4, UD), B('bh', -1, -1, 2, 2, 2, -4, SKIN),
      L('hip', 'fk', 3, 3, 2, U), L('fk', 'ff', 3, 3, 2, BOOT), B('ff', -1, -1, 5, 2, 4, 2, BOOT),
      L('hip', 'sh', 6, 6, 0, U),
      B('hd', -3, -3, 6, 6, 6, 0, SKIN), B('hd', 1, -1, 1, 1, 6.4, 0, '#111111'),
      B('hd', -4, -6, 8, 3, 7, 0, '#2c2418'),
      L('sh', 'fe', 3, 3, 4, U), L('fe', 'fh', 2, 2, 4, U), B('fh', -1, -1, 2, 2, 2, 4, SKIN),
      B('chute', 0, 0, 18, 2, 12, 0, '#f4f0e4', { when: (f) => f.chute }),
      B('chute', 7, 0, 4, 2, 12, 0, '#c41e1e', { when: (f) => f.chute }),
    ];
  })(),
};

function create(canvas, opt) {
  const { cityC, skyC, W, H } = opt;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(40, 16 / 9, 1, 2000);
  const tex = (c) => {
    const t = new T.CanvasTexture(c);
    t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;
    return t;
  };
  const crop = (x, y, w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(cityC, x, y, w, h, 0, 0, w, h);
    return c;
  };

  scene.background = tex(skyC);
  scene.fog = new T.Fog(0xb0d6f6, 420, 900);
  scene.add(new T.AmbientLight(0xffffff, 0.55));
  const sun = new T.DirectionalLight(0xfff4e0, 0.75);
  sun.position.set(-120, 220, 160);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 200, bottom: -80, near: 10, far: 700 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);

  const mats = new Map();
  const mat = (c, opacity) => {
    const k = c + '|' + (opacity || 1);
    if (!mats.has(k)) {
      mats.set(k, new T.MeshLambertMaterial(opacity ? { color: c, transparent: true, opacity } : { color: c }));
    }
    return mats.get(k);
  };
  const unit = new T.BoxGeometry(1, 1, 1);
  const box = (w, h, d, material, x, y, z) => {
    const m = new T.Mesh(unit, material);
    m.scale.set(w, h, d); m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const wx = (x) => x - W / 2;
  const wz = (z) => FACADE_Z + 16 + (z || 0);

  // ---------------------------------------------------------- calle
  const BUILDINGS = [
    { x0: 0, x1: 92, top: 38, side: '#a86a48', cols: [16, 56], rows: [46, 74] },
    { x0: 92, x1: 228, top: 5, side: '#cdb98d', cols: [108, 152, 196], rows: [16, 46, 76] },
    { x0: 228, x1: 320, top: 28, side: '#c98880', cols: [242, 286], rows: [40, 70] },
  ];
  for (const b of BUILDINGS) {
    const w = b.x1 - b.x0, h = FACADE_ROW - b.top;
    const front = new T.MeshLambertMaterial({ map: tex(crop(b.x0, b.top, w, h)) });
    const side = mat(b.side);
    for (const shift of [-W, 0, W]) {
      const m = new T.Mesh(unit, [side, side, side, side, front, side]);
      m.scale.set(w, h, BUILD_DEPTH);
      m.position.set(wx(b.x0 + w / 2) + shift, h / 2, FACADE_Z - BUILD_DEPTH / 2);
      m.receiveShadow = true;
      scene.add(m);
      for (const cx of b.cols) for (const ry of b.rows) {
        const slab = box(24, 2, 7, mat('#8a8278'), wx(cx + 8) + shift, FACADE_ROW - (ry + 22), FACADE_Z + 3.5);
        slab.castShadow = true; slab.receiveShadow = true;
      }
    }
  }

  const awning = new T.Mesh(new T.PlaneGeometry(84, 12), new T.MeshLambertMaterial({ map: tex(crop(4, 109, 84, 9)), side: T.DoubleSide }));
  awning.rotation.x = -0.7;
  awning.position.set(wx(46), FACADE_ROW - 109 - 4.6, FACADE_Z + 4);
  awning.castShadow = true;
  scene.add(awning);

  const green = new T.MeshBasicMaterial({ color: '#3fe06a' });
  box(4, 13, 3, green, wx(311), FACADE_ROW - 90, FACADE_Z + 5);
  box(12, 5, 3, green, wx(311), FACADE_ROW - 90, FACADE_Z + 5);
  box(8, 1, 1, mat('#333333'), wx(304), FACADE_ROW - 90, FACADE_Z + 2);

  const swTex = tex(crop(0, 154, 16, 16));
  swTex.wrapS = swTex.wrapT = T.RepeatWrapping;
  swTex.repeat.set(800 / 16, 24 / 16);
  const sidewalk = box(800, 1, 24, new T.MeshLambertMaterial({ map: swTex }), 0, -0.5, FACADE_Z + 12);
  sidewalk.receiveShadow = true;
  box(42, 2, 4, mat('#d6cdbd'), 0, 1, FACADE_Z + 2).receiveShadow = true;
  box(800, 1.4, 2, mat('#d4ccbf'), 0, -0.3, FACADE_Z + 25).receiveShadow = true;
  box(800, 1, 300, mat('#4a4a54'), 0, -1.2, FACADE_Z + 176).receiveShadow = true;
  const lane = mat('#e7e2d6'), laneY = mat('#e2c14a');
  for (const [lz, yellow] of [[24, false], [42, true], [60, false], [78, false]]) {
    const z = wz(lz);
    for (let i = -8; i <= 8; i++) if (i % 2 === 0) box(16, 0.25, 1.1, yellow ? laneY : lane, i * 36, -0.55, z);
  }

  const lampM = mat('#2e3a33'), lampGlass = new T.MeshBasicMaterial({ color: '#f6e8a6' });
  for (const lx of [70, 250]) {
    const X = wx(lx + 1), Z = FACADE_Z + 21;
    box(2, 62, 2, lampM, X, 31, Z).castShadow = true;
    box(4, 4, 4, lampM, X, 2, Z);
    box(6, 7, 6, lampM, X, 64, Z).castShadow = true;
    box(4, 5, 6.4, lampGlass, X, 64, Z);
    box(4, 2, 4, lampM, X, 69, Z);
  }

  // ---------------------------------------------------------- personajes
  const rigs = new Map();
  const depthOf = new WeakMap();

  function makeRig(type) {
    const g = new T.Group();
    const parts = SPECS[type].map((s) => {
      const op = s.o && s.o.opacity;
      const m = new T.Mesh(unit, mat(s.c, op));
      m.castShadow = !op;
      g.add(m);
      return { s, m };
    });
    scene.add(g);
    return { g, parts };
  }

  function poseRig(rig, pose, x, h, z, dir, k, flags) {
    const J = Object.assign({}, pose);
    if (pose.bt) J.btEnd = [pose.bh[0] + pose.bt[0], pose.bh[1] + pose.bt[1]];
    J.shUp = [pose.fh[0] + 1, -29];
    J.shDown = [-6, -16];
    J.arm = [(pose.sh[0] + pose.fe[0]) / 2, (pose.sh[1] + pose.fe[1]) / 2];
    J.caneEnd = flags.canePunch ? [pose.fh[0] + 9, pose.fh[1]] : [pose.fh[0] + 2, 0];
    J.saberEnd = [pose.bh[0] + 11, pose.bh[1] + 1];
    J.chute = [pose.hd[0] - 8, pose.hd[1] - 16];
    rig.g.position.set(x, h + 1, z);
    rig.g.scale.set(dir * k, k, k);
    for (const { s, m } of rig.parts) {
      const show = !(s.o && s.o.when) || s.o.when(flags);
      m.visible = show;
      if (!show) continue;
      if (s.k === 'L') {
        const a = J[s.a], b = J[s.b];
        const dx = b[0] - a[0], dy = -(b[1] - a[1]);
        m.scale.set(s.t, Math.hypot(dx, dy) + s.t, s.d);
        m.position.set((a[0] + b[0]) / 2, -(a[1] + b[1]) / 2, s.z);
        m.rotation.set(0, 0, Math.atan2(-dx, dy));
      } else {
        const a = J[s.a];
        const big = s.o && s.o.fist && flags.fist;
        const w = big ? 3 : s.w, hh = big ? 3 : s.h, d = big ? 3 : s.d;
        m.scale.set(w, hh, d);
        m.position.set(a[0] + s.ox + w / 2, -(a[1] + s.oy + hh / 2), s.z);
        m.rotation.set(0, 0, 0);
      }
    }
  }

  function makeCraft(type) {
    const g = new T.Group();
    let rotor = null;
    if (type === 'heli') {
      const body = new T.Mesh(unit, mat('#3d4a38'));
      body.scale.set(16, 7, 8); body.position.set(0, 8, 0); body.castShadow = true; g.add(body);
      const cabin = new T.Mesh(unit, mat('#8ec8e8', 0.65));
      cabin.scale.set(7, 4, 7); cabin.position.set(3, 10, 0); g.add(cabin);
      const tail = new T.Mesh(unit, mat('#2c3528'));
      tail.scale.set(16, 2.4, 2.4); tail.position.set(-14, 10, 0); g.add(tail);
      rotor = new T.Mesh(unit, mat('#1a1a1a'));
      rotor.scale.set(30, 0.7, 2.2); rotor.position.set(2, 14, 0); g.add(rotor);
      const skid = new T.Mesh(unit, mat('#111111'));
      skid.scale.set(14, 1, 8); skid.position.set(1, 2, 0); g.add(skid);
    } else {
      const body = new T.Mesh(unit, mat('#d5d8dc'));
      body.scale.set(26, 4, 4); body.position.set(0, 6, 0); body.castShadow = true; g.add(body);
      const wing = new T.Mesh(unit, mat('#b7bec6'));
      wing.scale.set(7, 1.2, 28); wing.position.set(2, 6, 0); wing.castShadow = true; g.add(wing);
      const fin = new T.Mesh(unit, mat('#d5d8dc'));
      fin.scale.set(6, 5, 1.2); fin.position.set(-12, 9, 0); g.add(fin);
      const nose = new T.Mesh(unit, mat('#d24a3a'));
      nose.scale.set(4, 2.4, 2.4); nose.position.set(14, 6, 0); g.add(nose);
    }
    scene.add(g);
    return { g, parts: [], craft: true, rotor };
  }

  function syncCharacter(seen, c) {
    if (c.type === 'heli' || c.type === 'plane') {
      let rig = rigs.get(c.obj);
      if (!rig || !rig.craft) {
        if (rig) scene.remove(rig.g);
        rig = makeCraft(c.type); rigs.set(c.obj, rig);
      }
      seen.add(c.obj);
      rig.g.visible = c.visible;
      rig.g.position.set(wx(c.obj.x), c.obj.y, c.z == null ? 0 : wz(c.z));
      rig.g.rotation.y = (c.dir || 1) > 0 ? 0 : Math.PI;
      if (rig.rotor) rig.rotor.rotation.y += 0.9;
      return;
    }
    let rig = rigs.get(c.obj);
    if (!rig || rig.craft) {
      if (rig) scene.remove(rig.g);
      rig = makeRig(SPECS[c.type] ? c.type : 'cop'); rigs.set(c.obj, rig);
    }
    seen.add(c.obj);
    rig.g.visible = c.visible;
    if (!depthOf.has(c.obj)) depthOf.set(c.obj, c.type === 'mari' ? 0 : Math.random() * 8 - 4);
    const z = c.z == null ? depthOf.get(c.obj) : wz(c.z);
    poseRig(rig, c.pose, wx(c.obj.x), c.obj.y, z, c.dir || c.obj.dir, c.k || 1, c.flags);
  }

  // ---------------------------------------------------------- objetos
  const props = new Map();
  const tortillaGeo = new T.CylinderGeometry(4, 4, 2.5, 10);
  const medalGeo = new T.CylinderGeometry(3.5, 3.5, 1, 10);
  const PROJ = {
    ball: [3, 3, 3, '#2a2a2a', 0],
    gas: [5, 4, 4, '#6b7350', 0.2],
    taser: [6, 2, 2, '#fff36a', 0],
    bottle: [2, 5, 2, '#2e8b3e', 0.25],
    grenade: [4, 4, 4, '#3c4a2c', 0.15],
    slipper: [6, 2, 3, '#c0392b', 0.4],
  };
  function syncProp(seen, obj, make) {
    let m = props.get(obj);
    if (!m) { m = make(); m.castShadow = true; scene.add(m); props.set(obj, m); }
    seen.add(obj);
    return m;
  }

  // ---------------------------------------------------------- cámara
  let introStart = performance.now();
  function intro() { introStart = performance.now(); }

  function render(wd) {
    const seen = new Set();
    for (const c of wd.characters) syncCharacter(seen, c);
    for (const p of wd.projs) {
      const look = PROJ[p.kind] || PROJ.ball;
      const m = syncProp(seen, p, () => box(look[0], look[1], look[2], mat(look[3]), 0, 0, 0));
      m.position.set(wx(p.x), p.h + look[1] / 2, wd.plane ? wz(p.z || 0) : 0);
      if (look[4]) m.rotation.z = -(p.t || 0) * look[4] * Math.sign(p.vx || 1);
    }
    for (const p of wd.pickups) {
      const medal = p.kind === 'medal';
      const m = syncProp(seen, p, () => (medal
        ? new T.Mesh(medalGeo, new T.MeshBasicMaterial({ color: '#ffd23f' }))
        : new T.Mesh(tortillaGeo, mat('#f2c94c'))));
      m.position.set(wx(p.x), p.h + (medal ? 4 : 1.5), wd.plane ? wz(p.z || 0) : 0);
      if (medal) { m.rotation.x = Math.PI / 2; m.rotation.z += 0.08; } else m.rotation.y += 0.05;
      m.visible = p.visible;
    }
    for (const [obj, rig] of rigs) if (!seen.has(obj)) { scene.remove(rig.g); rigs.delete(obj); }
    for (const [obj, m] of props) if (!seen.has(obj)) { scene.remove(m); props.delete(obj); }

    const now = performance.now();
    const k = Math.min(1, (now - introStart) / 2500);
    const e = k * k * (3 - 2 * k);
    const tx = wx(wd.focusX) * 0.5;
    const sway = Math.sin(now / 5000) * 0.28 * e;
    const shx = wd.shake ? (Math.random() * 2 - 1) * wd.shake : 0;
    const shy = wd.shake ? (Math.random() * 2 - 1) * wd.shake : 0;
    if (wd.plane) {
      const fz = wz(wd.focusZ || 0);
      camera.position.set(tx * 0.35 + shx, 128 + shy, fz + 150);
      camera.lookAt(tx * 0.7, 14, fz - 40);
    } else {
      camera.position.set(tx + Math.sin(sway) * 205 + shx, 58 + 24 * e + shy, Math.cos(sway) * 205);
      camera.lookAt(tx * 0.8, 56, 0);
    }
    renderer.render(scene, camera);
  }

  const v = new T.Vector3();
  function project(x, h, z, plane) {
    v.set(wx(x), h + 1, plane ? wz(z || 0) : 0).project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  }

  function resize(w, h) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
  }

  return { render, project, intro, resize };
}

window.Render3D = { create };
})();
