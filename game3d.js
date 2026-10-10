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
};

function create(canvas, opt) {
  const { cityC, skyC, W, H } = opt;
  const renderer = new T.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(480, 270, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.BasicShadowMap;

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

  function poseRig(rig, pose, x, h, z, dir, flags) {
    const J = Object.assign({}, pose);
    if (pose.bt) J.btEnd = [pose.bh[0] + pose.bt[0], pose.bh[1] + pose.bt[1]];
    J.shUp = [pose.fh[0] + 1, -29];
    J.shDown = [-6, -16];
    J.arm = [(pose.sh[0] + pose.fe[0]) / 2, (pose.sh[1] + pose.fe[1]) / 2];
    for (const { s, m } of rig.parts) {
      const show = !(s.o && s.o.when) || s.o.when(flags);
      m.visible = show;
      if (!show) continue;
      if (s.k === 'L') {
        const a = J[s.a], b = J[s.b];
        const dx = (b[0] - a[0]) * dir, dy = -(b[1] - a[1]);
        m.scale.set(s.t, Math.hypot(dx, dy) + s.t, s.d);
        m.position.set(x + ((a[0] + b[0]) / 2) * dir, h + 1 - (a[1] + b[1]) / 2, z + s.z);
        m.rotation.set(0, 0, Math.atan2(-dx, dy));
      } else {
        const a = J[s.a];
        const big = s.o && s.o.fist && flags.fist;
        const w = big ? 3 : s.w, hh = big ? 3 : s.h, d = big ? 3 : s.d;
        m.scale.set(w, hh, d);
        m.position.set(x + (a[0] + s.ox + w / 2) * dir, h + 1 - (a[1] + s.oy + hh / 2), z + s.z);
        m.rotation.set(0, 0, 0);
      }
    }
  }

  function syncCharacter(seen, c) {
    let rig = rigs.get(c.obj);
    if (!rig) { rig = makeRig(c.type); rigs.set(c.obj, rig); }
    seen.add(c.obj);
    rig.g.visible = c.visible;
    if (!depthOf.has(c.obj)) depthOf.set(c.obj, c.type === 'mari' ? 0 : Math.random() * 8 - 4);
    poseRig(rig, c.pose, wx(c.obj.x), c.obj.y, depthOf.get(c.obj), c.obj.dir, c.flags);
  }

  // ---------------------------------------------------------- objetos
  const props = new Map();
  const tortillaGeo = new T.CylinderGeometry(4, 4, 2.5, 10);
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
      const ball = p.kind === 'ball';
      const m = syncProp(seen, p, () => (ball
        ? box(3, 3, 3, mat('#2a2a2a'), 0, 0, 0)
        : box(5, 4, 4, mat('#6b7350'), 0, 0, 0)));
      m.position.set(wx(p.x), p.h + (ball ? 0.5 : 2), 0);
      if (!ball) m.rotation.z = -p.t * 0.2 * Math.sign(p.vx);
    }
    for (const p of wd.pickups) {
      const m = syncProp(seen, p, () => new T.Mesh(tortillaGeo, mat('#f2c94c')));
      m.position.set(wx(p.x), p.h + 1.5, 0);
      m.rotation.y += 0.05;
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
    camera.position.set(tx + Math.sin(sway) * 205 + shx, 58 + 24 * e + shy, Math.cos(sway) * 205);
    camera.lookAt(tx * 0.8, 56, 0);
    renderer.render(scene, camera);
  }

  const v = new T.Vector3();
  function project(x, h) {
    v.set(wx(x), h + 1, 0).project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  }

  return { render, project, intro };
}

window.Render3D = { create };
})();
