'use strict';
(() => {
const W = 320, H = 180, GROUND = 164;
const GRAV = 0.3, JUMPV = 4.6;
const MAX_HP = 8;

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fit() {
  let s = Math.min(innerWidth / W, innerHeight / H);
  if (s >= 3) s = Math.floor(s);
  cv.style.width = Math.floor(W * s) + 'px';
  cv.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 200));
document.addEventListener('fullscreenchange', fit);
document.addEventListener('webkitfullscreenchange', fit);
fit();

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

// ---------------------------------------------------------------- FUENTE 3x5
const FONT = {
  A:[2,5,7,5,5],B:[6,5,6,5,6],C:[3,4,4,4,3],D:[6,5,5,5,6],E:[7,4,6,4,7],F:[7,4,6,4,4],G:[3,4,5,5,3],
  H:[5,5,7,5,5],I:[7,2,2,2,7],J:[1,1,1,5,2],K:[5,5,6,5,5],L:[4,4,4,4,7],M:[5,7,7,5,5],N:[6,5,5,5,5],
  'Ñ':[6,5,5,5,5],O:[2,5,5,5,2],P:[6,5,6,4,4],Q:[2,5,5,6,3],R:[6,5,6,5,5],S:[3,4,2,1,6],T:[7,2,2,2,2],
  U:[5,5,5,5,7],V:[5,5,5,5,2],W:[5,5,7,7,5],X:[5,5,2,5,5],Y:[5,5,2,2,2],Z:[7,1,2,4,7],
  '0':[7,5,5,5,7],'1':[2,6,2,2,7],'2':[6,1,2,4,7],'3':[6,1,2,1,6],'4':[5,5,7,1,1],'5':[7,4,6,1,6],
  '6':[3,4,6,5,2],'7':[7,1,2,2,2],'8':[2,5,2,5,2],'9':[2,5,3,1,6],
  '!':[2,2,2,0,2],'¡':[2,0,2,2,2],'?':[6,1,2,0,2],'¿':[2,0,2,4,3],'.':[0,0,0,0,2],',':[0,0,0,2,4],
  ':':[0,2,0,2,0],'-':[0,0,7,0,0],'+':[0,2,7,2,0],'/':[1,1,2,4,4],"'":[2,2,0,0,0],'(':[1,2,2,2,1],
  ')':[4,2,2,2,4],'=':[0,7,0,7,0],'<':[1,2,4,2,1],'>':[4,2,1,2,4],' ':[0,0,0,0,0],
};
function norm(s) {
  return String(s).toUpperCase()
    .replace(/[ÁÀÂ]/g, 'A').replace(/[ÉÈÊ]/g, 'E').replace(/[ÍÌÎ]/g, 'I')
    .replace(/[ÓÒÔ]/g, 'O').replace(/[ÚÙÛÜ]/g, 'U');
}
function textOn(g, str, x, y, c, s = 1, align = 'left', shadow = null) {
  str = norm(str);
  const w = str.length * 4 * s - s;
  if (align === 'center') x -= Math.floor(w / 2);
  else if (align === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);
  if (shadow) textOn(g, str, x + s, y + s, shadow, s);
  g.fillStyle = c;
  for (let i = 0; i < str.length; i++) {
    const gl = FONT[str[i]] || FONT['?'];
    if (str[i] === 'Ñ') g.fillRect(x + i * 4 * s, y - 2 * s, 3 * s, s);
    for (let r = 0; r < 5; r++) for (let b = 0; b < 3; b++)
      if (gl[r] & (4 >> b)) g.fillRect(x + (i * 4 + b) * s, y + r * s, s, s);
  }
}
const text = (...a) => textOn(ctx, ...a);

// ---------------------------------------------------------------- PINCEL PIXEL
// Dibuja relativo a (ox, oy) mirando a la derecha; dir=-1 lo refleja.
function pen(ox, oy, dir) {
  ox = Math.round(ox); oy = Math.round(oy);
  const px = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(dir > 0 ? ox + x : ox - x - w + 1, oy + y, w, h);
  };
  const line = (a, b, s, c) => {
    let x0 = a[0], y0 = a[1];
    const x1 = b[0], y1 = b[1];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor(s / 2);
    for (;;) {
      px(x0 - o, y0 - o, s, s, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  return { px, line };
}

// ---------------------------------------------------------------- POSES
const MS = { hip:[0,-10], sh:[1,-17], hd:[2,-21], bk:[-1,-5], bf:[-2,0], fk:[1,-5], ff:[2,0],
             be:[0,-13], bh:[1,-10], fe:[2,-13], fh:[4,-11] };
const MP = {
  stand: MS,
  walk1: { ...MS, bk:[-2,-5], bf:[-4,0], fk:[2,-5], ff:[4,0], be:[-1,-13], bh:[-2,-10], fe:[3,-13], fh:[5,-11] },
  walk2: { ...MS, bk:[1,-5], bf:[2,0], fk:[-1,-5], ff:[-2,0], be:[1,-13], bh:[3,-11], fe:[1,-13], fh:[1,-10] },
  crouch: { hip:[0,-5], sh:[2,-11], hd:[4,-14], bk:[-3,-3], bf:[-3,0], fk:[3,-4], ff:[3,0],
            be:[1,-8], bh:[3,-6], fe:[4,-8], fh:[6,-9] },
  jump: { hip:[0,-11], sh:[1,-18], hd:[2,-22], bk:[-2,-7], bf:[-4,-4], fk:[3,-8], ff:[2,-3],
          be:[-1,-21], bh:[0,-24], fe:[3,-20], fh:[5,-23] },
  punch: { hip:[0,-10], sh:[2,-17], hd:[3,-21], bk:[-2,-5], bf:[-3,0], fk:[2,-5], ff:[3,0],
           be:[0,-13], bh:[2,-12], fe:[7,-16], fh:[11,-16], fist:true },
  elbow: { hip:[0,-10], sh:[2,-17], hd:[3,-21], bk:[-2,-5], bf:[-3,0], fk:[2,-5], ff:[3,0],
           be:[0,-13], bh:[2,-11], fe:[7,-18], fh:[4,-20], elb:true },
  knee: { hip:[0,-10], sh:[0,-17], hd:[1,-21], bk:[-1,-5], bf:[-1,0], fk:[6,-12], ff:[4,-6],
          be:[2,-15], bh:[4,-17], fe:[4,-14], fh:[6,-16] },
  kickH: { hip:[0,-10], sh:[-3,-16], hd:[-4,-20], bk:[-1,-5], bf:[-1,0], fk:[6,-14], ff:[12,-19],
           be:[-5,-13], bh:[-7,-10], fe:[-1,-13], fh:[1,-15] },
  kickL: { hip:[0,-6], sh:[-1,-12], hd:[-1,-16], bk:[-3,-3], bf:[-4,0], fk:[5,-3], ff:[12,-1],
           be:[-3,-9], bh:[-1,-6], fe:[1,-9], fh:[3,-7] },
  jkick: { hip:[0,-11], sh:[-2,-18], hd:[-3,-22], bk:[-2,-7], bf:[-4,-3], fk:[5,-10], ff:[11,-9],
           be:[-4,-19], bh:[-6,-22], fe:[0,-15], fh:[2,-17] },
  hurt: { hip:[-1,-10], sh:[-3,-17], hd:[-4,-21], bk:[0,-5], bf:[1,0], fk:[0,-5], ff:[2,0],
          be:[-2,-20], bh:[0,-23], fe:[0,-19], fh:[3,-22] },
  ko: { hip:[-6,-2], sh:[2,-3], hd:[7,-3], bk:[-10,-2], bf:[-14,-1], fk:[-10,-3], ff:[-14,-2],
        be:[3,-1], bh:[6,-1], fe:[2,-5], fh:[4,-7] },
};

const ES = { hip:[0,-13], sh:[0,-23], hd:[1,-28], bk:[-1,-7], bf:[-2,0], fk:[1,-7], ff:[2,0],
             be:[-1,-18], bh:[0,-14], fe:[3,-19], fh:[6,-18], bt:[1,6] };
const EP = {
  stand: ES,
  walk1: { ...ES, bk:[-2,-7], bf:[-4,0], fk:[3,-7], ff:[4,0] },
  walk2: { ...ES, bk:[2,-7], bf:[3,0], fk:[-1,-7], ff:[-2,0] },
  windH: { hip:[-1,-13], sh:[-2,-23], hd:[-1,-28], bk:[-3,-7], bf:[-4,0], fk:[1,-7], ff:[3,0],
           be:[-4,-27], bh:[-6,-31], bt:[-2,-7], fe:[1,-19], fh:[4,-16] },
  attH: { hip:[1,-13], sh:[3,-22], hd:[4,-27], bk:[-2,-7], bf:[-4,0], fk:[4,-7], ff:[6,0],
          be:[6,-22], bh:[10,-21], bt:[8,1], fe:[4,-17], fh:[6,-14] },
  windL: { hip:[-1,-13], sh:[-2,-23], hd:[-1,-28], bk:[0,-7], bf:[0,0], fk:[-4,-9], ff:[-7,-4],
           be:[-3,-18], bh:[-1,-21], bt:[1,-6], fe:[2,-19], fh:[4,-21] },
  attL: { hip:[0,-12], sh:[-3,-22], hd:[-3,-27], bk:[-2,-7], bf:[-3,0], fk:[5,-6], ff:[12,-1],
          be:[-5,-18], bh:[-7,-15], bt:[-2,5], fe:[0,-19], fh:[2,-21] },
  shoot: { hip:[0,-13], sh:[0,-23], hd:[1,-28], bk:[-2,-7], bf:[-3,0], fk:[2,-7], ff:[3,0],
           be:[2,-20], bh:[5,-21], bt:[0,0], fe:[4,-20], fh:[7,-21] },
  hurt: { hip:[-1,-13], sh:[-4,-22], hd:[-5,-26], bk:[0,-7], bf:[1,0], fk:[1,-7], ff:[3,0],
          be:[-6,-24], bh:[-8,-28], bt:[-2,-5], fe:[-1,-26], fh:[1,-30] },
  fly: { hip:[-1,-13], sh:[-4,-22], hd:[-5,-26], bk:[3,-11], bf:[6,-15], fk:[4,-12], ff:[8,-14],
         be:[-6,-24], bh:[-8,-28], bt:[-2,-5], fe:[-1,-26], fh:[1,-30] },
  down: { hip:[2,-2], sh:[-8,-3], hd:[-13,-3], bk:[7,-3], bf:[12,-1], fk:[7,-5], ff:[12,-2],
          be:[-6,-1], bh:[-3,0], bt:[3,0], fe:[-7,-5], fh:[-4,-7] },
};

// ---------------------------------------------------------------- DIBUJO PERSONAJES
function shadow(x, h, w = 12) {
  const s = Math.max(4, Math.round(w - h / 4));
  R(ctx, Math.round(x - s / 2), GROUND - 1, s, 2, 'rgba(0,0,0,0.28)');
}

function drawMari(m, poseName) {
  const p = MP[poseName] || MP.stand;
  shadow(m.x, m.y, poseName === 'ko' ? 22 : 12);
  if (m.inv > 0 && m.state !== 'ko' && (frame >> 2) % 2) return;
  const P = pen(m.x, GROUND - 1 - Math.round(m.y), m.dir);
  const ST = '#e3c19b', STD = '#b8926c', SHO = '#3b2418';
  const CG = '#9b59b6', CGD = '#6e3a88', CGL = '#b885d0';
  const SK = '#f2c29b', SKD = '#d49a74';
  const SKT = '#4f3d33', SKTD = '#3a2c24';
  const HR = '#d6d7df', HRD = '#9a9caa';

  P.line(p.hip, p.bk, 2, STD); P.line(p.bk, p.bf, 2, STD);
  P.px(p.bf[0] - 1, p.bf[1] - 1, 4, 2, SHO);
  P.line(p.sh, p.be, 2, CGD); P.line(p.be, p.bh, 2, CGD);
  P.px(p.bh[0] - 1, p.bh[1] - 1, 2, 2, SKD);
  P.line(p.hip, p.fk, 2, ST); P.line(p.fk, p.ff, 2, ST);
  P.px(p.ff[0] - 1, p.ff[1] - 1, 4, 2, SHO);
  P.line(p.hip, p.sh, 5, CG);
  P.line([p.hip[0] + 2, p.hip[1] - 1], [p.sh[0] + 2, p.sh[1]], 1, CGL);
  P.px(p.hip[0] - 4, p.hip[1] - 1, 9, 4, SKT);
  P.px(p.hip[0] - 4, p.hip[1] + 3, 9, 1, SKTD);
  if (poseName !== 'ko') {
    // bolso colgado al hombro
    P.line(p.sh, [p.hip[0] - 4, p.hip[1] - 2], 1, '#3a1a12');
    P.px(p.hip[0] - 7, p.hip[1] - 2, 5, 4, '#8a2f2f');
    P.px(p.hip[0] - 7, p.hip[1] - 2, 5, 1, '#b04848');
    P.px(p.hip[0] - 5, p.hip[1], 1, 1, '#e2b443');
  }
  P.line(p.sh, p.fe, 2, CG); P.line(p.fe, p.fh, 2, CG);
  if (p.elb) P.px(p.fe[0] - 1, p.fe[1] - 1, 3, 3, CGD);
  if (p.fist) P.px(p.fh[0] - 1, p.fh[1] - 1, 3, 3, SK);
  else P.px(p.fh[0] - 1, p.fh[1] - 1, 2, 2, SK);

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 1, hy + 2, 3, 1, '#f4f0e8'); // cuello de la blusa
  P.px(hx - 3, hy - 3, 6, 6, SK);
  P.px(hx + 3, hy, 1, 1, SK);
  P.px(hx - 2, hy - 1, 1, 2, SKD);
  P.px(hx - 4, hy - 4, 7, 2, HR);
  P.px(hx - 3, hy - 5, 2, 1, HR); P.px(hx, hy - 5, 2, 1, HR);
  P.px(hx - 4, hy - 2, 2, 4, HR);
  P.px(hx - 4, hy + 1, 1, 1, HRD); P.px(hx - 4, hy - 4, 1, 1, HRD); P.px(hx + 2, hy - 3, 1, 1, HRD);
  P.px(hx, hy - 2, 3, 1, '#4a4a4a');
  P.px(hx - 1, hy - 2, 1, 1, '#4a4a4a');
  if (m.state === 'hurt' || poseName === 'ko') P.px(hx, hy - 1, 2, 1, '#222');
  else P.px(hx + 1, hy - 1, 1, 1, '#222');
  P.px(hx, hy, 1, 1, '#f0a090');
  P.px(hx + 1, hy + 1, 2, 1, '#a85a50');
}

function copShieldUp(e) {
  return e.type === 'cop' && (e.state === 'walk' || e.state === 'idle' || e.state === 'hurt');
}

function drawCop(e, p, P, poseName) {
  const PA = '#1e2a4d', PD = '#141c35', J = '#283862', JD = '#1b2647';
  const PAD = '#0e111c', BOOT = '#0a0a0a', HEL = '#121c38', SKIN = '#e0b08a';
  const lying = poseName === 'down' || poseName === 'fly';

  P.line(p.hip, p.bk, 3, PD); P.line(p.bk, p.bf, 3, PD);
  P.px(p.bf[0] - 1, p.bf[1] - 1, 5, 2, BOOT);
  P.line(p.sh, p.be, 3, JD); P.line(p.be, p.bh, 2, JD);
  P.px(p.bh[0] - 1, p.bh[1] - 1, 2, 2, '#111');
  if (poseName !== 'shoot') P.line(p.bh, [p.bh[0] + p.bt[0], p.bh[1] + p.bt[1]], 2, '#090909');
  P.line(p.hip, p.fk, 3, PA); P.line(p.fk, p.ff, 3, PA);
  P.px(p.fk[0] - 1, p.fk[1] - 1, 3, 3, PAD);
  P.px(p.ff[0] - 1, p.ff[1] - 1, 5, 2, BOOT);
  P.line(p.hip, p.sh, 6, J);
  P.px(p.hip[0] - 3, p.hip[1] - 1, 6, 2, PAD);
  P.px(p.sh[0] - 2, p.sh[1] - 2, 5, 3, PAD);
  P.px(p.sh[0] + 1, p.sh[1] + 2, 1, 1, '#e7c548');

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 4, hy - 5, 8, 6, HEL);
  P.px(hx - 3, hy - 6, 6, 1, HEL);
  P.px(hx - 2, hy - 5, 3, 1, '#2f4170');
  P.px(hx - 4, hy + 1, 3, 2, HEL);
  P.px(hx, hy + 1, 3, 2, SKIN);
  P.px(hx + 2, hy - 1, 1, 1, '#000');
  P.px(hx + 1, hy - 2, 4, 4, 'rgba(140,200,235,0.7)');
  P.px(hx + 4, hy - 2, 1, 4, '#cfeaff');

  P.line(p.sh, p.fe, 3, J); P.line(p.fe, p.fh, 2, J);
  P.px(p.fh[0] - 1, p.fh[1] - 1, 2, 2, '#111');

  if (poseName === 'shoot') {
    P.px(p.fh[0] - 3, p.fh[1] - 1, 9, 2, '#333');
    P.px(p.fh[0] + 5, p.fh[1] - 2, 3, 3, '#555');
    P.px(p.fh[0] - 1, p.fh[1] + 1, 2, 2, '#333');
  }
  if (!lying) {
    if (copShieldUp(e)) {
      const x0 = p.fh[0] + 1;
      P.px(x0, -29, 3, 24, 'rgba(170,205,235,0.5)');
      P.px(x0 + 2, -29, 1, 24, 'rgba(235,248,255,0.85)');
      P.px(x0, -29, 3, 1, '#dfefff'); P.px(x0, -6, 3, 1, '#dfefff');
    } else {
      P.px(-6, -16, 3, 16, 'rgba(170,205,235,0.45)');
      P.px(-6, -16, 3, 1, '#dfefff');
    }
  }
}

function drawNazi(e, p, P, poseName) {
  const U = '#5d6449', UD = '#454b36', BOOT = '#0d0d0d', HEL = '#3c4232', SKIN = '#efc3a0', SKD = '#cf9f7c';

  P.line(p.hip, p.bk, 3, UD); P.line(p.bk, p.bf, 3, BOOT);
  P.px(p.bf[0] - 1, p.bf[1] - 1, 5, 2, BOOT);
  P.line(p.sh, p.be, 3, UD); P.line(p.be, p.bh, 2, UD);
  if (poseName === 'attH') P.px(p.bh[0] - 1, p.bh[1] - 1, 3, 3, SKIN);
  else P.px(p.bh[0] - 1, p.bh[1] - 1, 2, 2, SKD);
  P.line(p.hip, p.fk, 3, U); P.line(p.fk, p.ff, 3, BOOT);
  P.px(p.ff[0] - 1, p.ff[1] - 1, 5, 2, BOOT);
  P.line(p.hip, p.sh, 6, U);
  P.px(p.hip[0] - 3, p.hip[1] - 2, 6, 1, '#4a3220');
  P.px(p.hip[0] + 1, p.hip[1] - 2, 1, 1, '#c9c9c9');
  P.px(p.sh[0] + 1, p.sh[1] - 1, 2, 1, '#2e3324');

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 3, hy - 3, 6, 6, SKIN);
  P.px(hx + 3, hy, 1, 1, SKIN);
  P.px(hx - 2, hy - 1, 1, 2, SKD);
  P.px(hx + 1, hy - 1, 1, 1, '#111');
  P.px(hx, hy - 2, 2, 1, '#5a3a1a'); P.px(hx + 2, hy - 1, 1, 1, '#5a3a1a');
  P.px(hx + 1, hy + 1, 2, 1, '#8a3030');
  P.px(hx - 4, hy - 6, 7, 3, HEL);
  P.px(hx - 3, hy - 7, 5, 1, HEL);
  P.px(hx - 5, hy - 3, 9, 1, HEL);
  P.px(hx - 5, hy - 2, 2, 3, HEL);
  P.px(hx - 2, hy - 6, 3, 1, '#58614a');

  P.line(p.sh, p.fe, 3, U); P.line(p.fe, p.fh, 2, U);
  P.px(p.fh[0] - 1, p.fh[1] - 1, 2, 2, SKIN);
  const mx = Math.round((p.sh[0] + p.fe[0]) / 2), my = Math.round((p.sh[1] + p.fe[1]) / 2);
  P.px(mx - 1, my - 1, 3, 2, '#c41e1e');
  P.px(mx, my - 1, 1, 1, '#f2f2f2');
}

function enemyPose(e) {
  switch (e.state) {
    case 'walk': return ['walk1', 'stand', 'walk2', 'stand'][(e.anim >> 3) % 4];
    case 'wind': return e.atkH === 'H' ? 'windH' : 'windL';
    case 'attack': return e.atkH === 'H' ? 'attH' : 'attL';
    case 'aimShoot': return 'shoot';
    case 'hurt': return 'hurt';
    case 'tripped': return e.t < 10 ? 'hurt' : 'down';
    case 'dead': return 'fly';
    case 'ko': return 'down';
    default: return 'stand';
  }
}

function drawEnemy(e) {
  const poseName = enemyPose(e);
  const lying = poseName === 'down';
  shadow(e.x, e.y, lying ? 24 : 14);
  if (e.state === 'ko' && e.t < 30 && (frame >> 1) % 2) return;
  const p = EP[poseName];
  const P = pen(e.x, GROUND - 1 - Math.round(e.y), e.dir);
  if (e.type === 'cop') drawCop(e, p, P, poseName);
  else drawNazi(e, p, P, poseName);

  if (e.state === 'tripped' && e.t >= 10) {
    for (let i = 0; i < 3; i++) {
      const a = frame * 0.15 + i * 2.1;
      const sx = Math.round(e.x - e.dir * 13 + Math.cos(a) * 6);
      const sy = Math.round(GROUND - 12 + Math.sin(a) * 2);
      R(ctx, sx, sy, 1, 1, '#ffe14d');
      R(ctx, sx - 1, sy, 3, 1, 'rgba(255,225,77,0.5)');
    }
  }
}

function drawTelegraph(e) {
  if ((frame >> 2) % 2 === 0) return;
  let c = null;
  if (e.state === 'wind') c = e.atkH === 'H' ? '#ff3b3b' : '#ffe14d';
  else if (e.state === 'aimShoot') c = e.kindShot === 'ball' ? '#ff3b3b' : '#ffe14d';
  if (c) text('!', e.x - 2, GROUND - 46, c, 2, 'left', '#000');
}

// ---------------------------------------------------------------- ESCENARIO
let seed = 7;
const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function mk() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
const skyC = mk(), cityC = mk();

function speckle(g, x, y, w, h, c, n) {
  for (let i = 0; i < n; i++) R(g, x + Math.floor(srand() * w), y + Math.floor(srand() * h), 1 + (srand() < 0.5 ? 1 : 0), 1, c);
}

function windowAt(g, x, y, shut, shutD, flowers) {
  R(g, x - 1, y - 1, 18, 22, '#efe4cc');
  R(g, x, y, 16, 20, '#34465f');
  R(g, x + 2, y + 2, 1, 5, '#6f86a3'); R(g, x + 3, y + 2, 1, 2, '#6f86a3'); R(g, x + 11, y + 10, 1, 3, '#56708f');
  R(g, x + 7, y, 2, 20, '#efe4cc'); R(g, x, y + 8, 16, 1, '#efe4cc');
  R(g, x - 6, y - 1, 5, 22, shut); R(g, x + 17, y - 1, 5, 22, shut);
  for (let k = 1; k < 22; k += 2) { R(g, x - 6, y - 1 + k, 5, 1, shutD); R(g, x + 17, y - 1 + k, 5, 1, shutD); }
  R(g, x - 4, y + 21, 24, 2, '#8a8278'); R(g, x - 4, y + 23, 24, 1, '#5e574f');
  if (flowers) {
    for (const fx of [x, x + 11]) {
      R(g, fx, y + 17, 5, 4, '#b5562e');
      R(g, fx, y + 15, 5, 2, '#3d8a3d');
      R(g, fx + 1, y + 14, 1, 1, '#ff3b3b'); R(g, fx + 3, y + 15, 1, 1, '#ff3b3b'); R(g, fx + 4, y + 13, 1, 1, '#ff6fa0');
    }
  }
  railAt(g, x, y);
}
function railAt(g, x, y) {
  R(g, x - 4, y + 13, 24, 1, '#1e1e1e');
  for (let i = 0; i < 24; i += 2) R(g, x - 4 + i, y + 13, 1, 8, '#1e1e1e');
}

function buildBG() {
  let g = skyC.getContext('2d');
  const bands = ['#4a86d4', '#5f9ae0', '#78afe9', '#93c3f0', '#b0d6f6'];
  for (let y = 0; y < 130; y++) {
    const f = y / 26, i = Math.min(4, Math.floor(f)), fr = f - i;
    R(g, 0, y, W, 1, bands[i]);
    if (i < 4 && fr > 0.75) for (let x = (y & 1); x < W; x += 2) R(g, x, y, 1, 1, bands[i + 1]);
  }
  for (let x = 0; x < W; ) {
    const w = 8 + Math.floor(srand() * 14), top = 22 + Math.floor(srand() * 18);
    R(g, x, top, w, 60, '#a7c1dc');
    for (let wy = top + 3; wy < 60; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) R(g, wx, wy, 1, 2, '#93aecb');
    x += w + Math.floor(srand() * 4);
  }
  R(g, 30, 10, 4, 30, '#a7c1dc'); R(g, 29, 8, 6, 3, '#a7c1dc'); R(g, 31, 4, 2, 4, '#a7c1dc');

  g = cityC.getContext('2d');
  // edificio izquierdo (bar)
  R(g, 0, 40, 92, 114, '#c4825a');
  speckle(g, 0, 42, 92, 60, '#b0704c', 260);
  R(g, 0, 38, 94, 3, '#e0b08a'); R(g, 0, 41, 92, 1, '#8f5a3c');
  for (const wy of [46, 74]) for (const wx of [16, 56]) windowAt(g, wx, wy, '#3f7a4a', '#2f5e38', srand() < 0.6);
  R(g, 0, 98, 92, 56, '#a86a48');
  R(g, 14, 99, 64, 9, '#2b2b2b'); R(g, 14, 99, 64, 1, '#444');
  textOn(g, 'BAR PACO', 46, 101, '#ffd23f', 1, 'center');
  for (let x = 4; x < 88; x++) {
    const c = ((x >> 2) & 1) ? '#ececec' : '#c62828';
    R(g, x, 109, 1, 8, c);
    if ((x & 3) === 1 || (x & 3) === 2) R(g, x, 117, 1, 1, c);
  }
  R(g, 6, 119, 50, 35, '#3a2a20'); R(g, 8, 121, 46, 31, '#5a4632');
  R(g, 10, 123, 42, 2, '#f3c46a');
  for (let i = 0; i < 9; i++) R(g, 12 + i * 4, 127, 2, 5, ['#3f8a3f', '#7a3a1a', '#d8d8d8'][i % 3]);
  R(g, 8, 140, 46, 12, '#7a4a2a'); R(g, 8, 140, 46, 1, '#a0683c');
  R(g, 62, 119, 22, 35, '#4a2c1a'); R(g, 65, 122, 16, 18, '#f0c36a'); R(g, 73, 122, 1, 18, '#4a2c1a');
  R(g, 80, 138, 2, 2, '#e2b443');

  // edificio central (casa de Maricarmen)
  R(g, 92, 8, 136, 146, '#e6cf9c');
  speckle(g, 92, 10, 136, 90, '#d9c08a', 260);
  R(g, 92, 8, 3, 94, '#f1deb2'); R(g, 225, 8, 3, 94, '#d2b880');
  R(g, 90, 5, 140, 3, '#f3e3bd'); R(g, 92, 8, 136, 1, '#b99f6c');
  for (const wy of [16, 46, 76]) for (const wx of [108, 152, 196]) windowAt(g, wx, wy, '#3f7a4a', '#2f5e38', srand() < 0.55);
  R(g, 92, 100, 136, 54, '#cdb98d');
  R(g, 92, 100, 136, 2, '#efdcb0');
  for (let y = 108, row = 0; y < 154; y += 7, row++) {
    R(g, 92, y, 136, 1, '#b5a175');
    for (let x = 92 + (row % 2) * 7; x < 228; x += 14) R(g, x, y - 6, 1, 6, '#b5a175');
  }
  for (const wx of [105, 195]) {
    R(g, wx, 113, 20, 28, '#ddd2b8'); R(g, wx + 2, 115, 16, 24, '#2c3a4c');
    R(g, wx + 4, 117, 1, 6, '#4f6680');
    for (let i = 0; i < 16; i += 3) R(g, wx + 2 + i, 115, 1, 24, '#151515');
    R(g, wx + 2, 121, 16, 1, '#151515'); R(g, wx + 2, 133, 16, 1, '#151515');
  }
  // el portal
  R(g, 141, 104, 38, 50, '#ddd2b8');
  R(g, 141, 104, 38, 1, '#f0e8d6');
  R(g, 157, 102, 6, 6, '#e8dfca'); R(g, 157, 107, 6, 1, '#b8ab90');
  R(g, 145, 110, 30, 44, '#2a170b');
  R(g, 145, 110, 3, 1, '#ddd2b8'); R(g, 145, 111, 1, 2, '#ddd2b8');
  R(g, 172, 110, 3, 1, '#ddd2b8'); R(g, 174, 111, 1, 2, '#ddd2b8');
  R(g, 147, 112, 26, 7, '#2e3f55'); R(g, 149, 113, 3, 1, '#5d7896');
  for (let i = 0; i < 27; i += 4) R(g, 147 + i, 112, 1, 7, '#141414');
  R(g, 147, 115, 26, 1, '#141414');
  R(g, 147, 120, 26, 34, '#6e3d1e');
  R(g, 159, 120, 2, 34, '#3a1d0c');
  for (const lx of [149, 162]) {
    R(g, lx, 123, 9, 12, '#5c3117'); R(g, lx, 123, 9, 1, '#8a5532'); R(g, lx, 134, 9, 1, '#46230f');
    R(g, lx, 138, 9, 11, '#5c3117'); R(g, lx, 138, 9, 1, '#8a5532'); R(g, lx, 148, 9, 1, '#46230f');
  }
  R(g, 156, 136, 2, 2, '#e2b443'); R(g, 163, 136, 2, 2, '#e2b443');
  R(g, 147, 150, 26, 4, '#a8853a'); R(g, 147, 150, 26, 1, '#d4ad55');
  R(g, 181, 107, 9, 10, '#ffffff'); R(g, 182, 108, 7, 8, '#2856a8');
  textOn(g, '7', 184, 109, '#ffffff');
  R(g, 182, 121, 7, 11, '#9aa0aa'); R(g, 183, 122, 5, 3, '#444');
  for (let i = 0; i < 3; i++) R(g, 184, 126 + i * 2, 3, 1, '#e0e0e0');

  // edificio derecho (farmacia)
  R(g, 228, 30, 92, 124, '#d99a8f');
  speckle(g, 228, 32, 92, 66, '#c9877c', 220);
  R(g, 226, 28, 94, 3, '#f0c0b5'); R(g, 228, 31, 92, 1, '#a86a60');
  for (const wy of [40, 70]) for (const wx of [242, 286]) windowAt(g, wx, wy, '#2f5f8a', '#234a6c', srand() < 0.6);
  R(g, 228, 98, 92, 56, '#c98880');
  R(g, 236, 102, 76, 9, '#1f8a4a'); R(g, 236, 102, 76, 1, '#3fbf6f');
  textOn(g, 'FARMACIA', 274, 104, '#ffffff', 1, 'center');
  R(g, 236, 114, 56, 40, '#dfe7e2'); R(g, 238, 116, 52, 36, '#5d7f84');
  for (const sy of [124, 134, 144]) {
    R(g, 238, sy, 52, 1, '#cfd8d6');
    for (let x = 240; x < 288; x += 3) R(g, x, sy - 3, 2, 3, ['#e85a5a', '#f2f2f2', '#5ab0e8', '#f2c94c'][(x + sy) % 4]);
  }
  R(g, 296, 114, 18, 40, '#335a4e'); R(g, 298, 116, 14, 24, '#6a8e93'); R(g, 310, 134, 2, 2, '#e2b443');
  R(g, 300, 90, 6, 1, '#333');
  R(g, 309, 83, 4, 13, '#178a35'); R(g, 305, 87, 12, 5, '#178a35');
  R(g, 310, 84, 2, 11, '#3fe06a'); R(g, 306, 88, 10, 3, '#3fe06a');

  // acera, bordillo y calzada
  R(g, 0, 154, W, 16, '#bfb7aa');
  for (let x = 0; x < W; x += 16) R(g, x, 154, 1, 16, '#a69e91');
  R(g, 0, 162, W, 1, '#a69e91');
  speckle(g, 0, 155, W, 14, '#cdc6ba', 160);
  R(g, 139, 154, 42, 2, '#d6cdbd'); R(g, 139, 156, 42, 1, '#9d9486');
  R(g, 0, 170, W, 2, '#d4ccbf'); R(g, 0, 172, W, 1, '#7d776d');
  R(g, 0, 173, W, 7, '#4a4a54');
  speckle(g, 0, 173, W, 7, '#56565f', 140);

  for (const lx of [70, 250]) {
    R(g, lx, 92, 2, 62, '#2e3a33'); R(g, lx - 1, 150, 4, 4, '#2e3a33');
    R(g, lx - 2, 86, 6, 7, '#2e3a33'); R(g, lx - 1, 87, 4, 5, '#f6e8a6'); R(g, lx - 1, 84, 4, 2, '#2e3a33');
  }
}

const clouds = [{ x: 20, y: 9, s: 0.08 }, { x: 250, y: 16, s: 0.05 }, { x: 140, y: 1, s: 0.06 }, { x: 300, y: 23, s: 0.04 }];
function drawCloud(x, y) {
  x = Math.round(x);
  R(ctx, x + 3, y, 8, 2, '#f4f8ff'); R(ctx, x + 9, y - 1, 4, 1, '#f4f8ff');
  R(ctx, x, y + 2, 16, 3, '#f4f8ff'); R(ctx, x + 1, y + 5, 14, 1, '#d6e4f4');
}

function drawVecina() {
  const x = 152, y = 76;
  R(ctx, x, y, 16, 20, '#1b1822');
  R(ctx, x + 3, y + 11, 10, 9, '#4f8fd0');
  for (const [a, b] of [[4, 13], [8, 15], [11, 12], [6, 17], [10, 18]]) R(ctx, x + a, y + b, 1, 1, '#fff');
  R(ctx, x + 5, y + 4, 6, 7, '#f1c6a0');
  R(ctx, x + 4, y + 2, 8, 3, '#e889b5'); R(ctx, x + 4, y + 5, 1, 3, '#e889b5'); R(ctx, x + 11, y + 5, 1, 3, '#e889b5');
  R(ctx, x + 5, y + 2, 1, 1, '#fff'); R(ctx, x + 8, y + 2, 1, 1, '#fff'); R(ctx, x + 10, y + 2, 1, 1, '#fff');
  R(ctx, x + 6, y + 7, 1, 1, '#222'); R(ctx, x + 9, y + 7, 1, 1, '#222'); R(ctx, x + 7, y + 9, 2, 1, '#b05050');
  R(ctx, x + 13, y + ((frame >> 3) % 2 ? 5 : 8), 2, 6, '#f1c6a0');
  railAt(ctx, x, y);
}

function drawTortilla(x, y) {
  x = Math.round(x) - 4; y = Math.round(y) - 5;
  R(ctx, x + 1, y, 6, 1, '#f6d365');
  R(ctx, x, y + 1, 8, 2, '#f2c94c'); R(ctx, x + 2, y + 1, 2, 1, '#fff2a8');
  R(ctx, x, y + 3, 8, 1, '#c98a2c'); R(ctx, x + 1, y + 4, 6, 1, '#9a6420');
}

function heart(x, y, full) {
  const rows = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
  ctx.fillStyle = full ? '#ff3b5c' : '#4a2030';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (rows[r][c] === 'X') ctx.fillRect(x + c, y + r, 1, 1);
  if (full) R(ctx, x + 1, y + 1, 1, 1, '#ffc0cc');
}

// ---------------------------------------------------------------- AUDIO
const AU = { ac: null, master: null, mus: null, sfx: null, noise: null, pulse: null, pulse12: null,
             musicOn: true, playing: false, step: 0, next: 0, bpm: 140 };

const LEAD = [
  'A4 - C5 - E5 - A5 - G5 - E5 - C5 - D5 -',
  'C5 - - - A4 - C5 - F5 - E5 - C5 - A4 -',
  'B4 - D5 - G5 - - - F5 - E5 - D5 - B4 -',
  'G#4 - B4 - E5 - - - D5 - C5 - B4 - G#4 -',
  'E5 E5 . E5 . C5 E5 - G5 - - - G4 - - -',
  'F5 - A5 - F5 - C5 - A4 - C5 - F5 - A5 -',
  'G5 - F5 - D5 - B4 - D5 - G5 - B5 - D6 -',
  'E5 - - - B4 - - - G#4 - B4 - E5 - - -',
].join(' ').split(/\s+/);
const CHORDS = {
  A: { root: 'A', arp: ['A4', 'C5', 'E5'] },
  F: { root: 'F', arp: ['F4', 'A4', 'C5'] },
  G: { root: 'G', arp: ['G4', 'B4', 'D5'] },
  E: { root: 'E', arp: ['E4', 'G#4', 'B4'] },
};
const CHORD_SEQ = ['A', 'F', 'G', 'E', 'A', 'F', 'G', 'E'];

function nf(n) {
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  const idx = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, ((+m[3] + 1) * 12 + idx - 69) / 12);
}

function makePulse(ac, duty) {
  const n = 48, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return ac.createPeriodicWave(re, im);
}

function initAudio() {
  if (AU.ac) { if (AU.ac.state === 'suspended') AU.ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ac = AU.ac = new AC();
  AU.master = ac.createGain(); AU.master.gain.value = 0.5; AU.master.connect(ac.destination);
  AU.mus = ac.createGain(); AU.mus.gain.value = 0.55; AU.mus.connect(AU.master);
  AU.sfx = ac.createGain(); AU.sfx.gain.value = 0.85; AU.sfx.connect(AU.master);
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  AU.noise = b;
  AU.pulse = makePulse(ac, 0.25);
  AU.pulse12 = makePulse(ac, 0.125);
  setInterval(schedule, 25);
  if (state === 'title') startMusic();
}

function tone(f, t, dur, wave, vol, dest, slide) {
  const ac = AU.ac, o = ac.createOscillator(), g = ac.createGain();
  if (typeof wave === 'string') o.type = wave; else o.setPeriodicWave(wave);
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.setValueAtTime(vol, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(t, dur, vol, ftype, freq, dest) {
  const ac = AU.ac, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = AU.noise; f.type = ftype; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

function playStep(s, t) {
  const st = 60 / AU.bpm / 4, bar = Math.floor(s / 16), i = s % 16, secB = bar >= 4;
  const tok = LEAD[s];
  if (tok !== '-' && tok !== '.') {
    let len = 1;
    while (LEAD[(s + len) % LEAD.length] === '-') len++;
    tone(nf(tok), t, len * st * 0.95, AU.pulse, 0.085, AU.mus);
  }
  const ch = CHORDS[CHORD_SEQ[bar]];
  if (i % 2 === 0) tone(nf(ch.root + (i % 4 === 0 ? '2' : '3')), t, st * 1.8, 'triangle', 0.3, AU.mus);
  tone(nf(ch.arp[s % 3]), t, st * 0.6, AU.pulse12, 0.025, AU.mus);
  if ((secB ? [0, 6, 8, 14] : [0, 8]).includes(i)) tone(150, t, 0.12, 'sine', 0.55, AU.mus, 40);
  if (i === 4 || i === 12) {
    noise(t, 0.13, 0.22, 'bandpass', 1800, AU.mus);
    tone(190, t, 0.06, 'triangle', 0.15, AU.mus, 120);
  }
  if (i % 2 === 0) noise(t, 0.03, i % 4 === 2 ? 0.09 : 0.05, 'highpass', 7000, AU.mus);
}

function schedule() {
  const ac = AU.ac;
  if (!AU.playing || !AU.musicOn || paused) { AU.next = ac.currentTime + 0.05; return; }
  while (AU.next < ac.currentTime + 0.12) {
    playStep(AU.step, AU.next);
    AU.next += 60 / AU.bpm / 4;
    AU.step = (AU.step + 1) % LEAD.length;
  }
}

function startMusic() {
  if (!AU.ac) return;
  AU.playing = true; AU.step = 0; AU.next = AU.ac.currentTime + 0.06;
}

function sfx(n) {
  const ac = AU.ac;
  if (!ac) return;
  const t = ac.currentTime, d = AU.sfx;
  const arp = (notes, gap, len, wave = AU.pulse, vol = 0.1) =>
    notes.forEach((nn, i) => tone(nf(nn), t + i * gap, len, wave, vol, d));
  switch (n) {
    case 'swing': noise(t, 0.06, 0.12, 'highpass', 2500, d); break;
    case 'hit': tone(220, t, 0.1, 'square', 0.16, d, 60); noise(t, 0.08, 0.3, 'bandpass', 900, d); break;
    case 'kill': tone(330, t, 0.25, 'square', 0.15, d, 50); noise(t, 0.22, 0.3, 'lowpass', 1200, d); break;
    case 'nazi': arp(['E6', 'G6', 'B6', 'E7'], 0.05, 0.07, AU.pulse12, 0.08); break;
    case 'block': tone(1400, t, 0.07, 'square', 0.07, d); tone(1900, t + 0.03, 0.07, 'square', 0.05, d); break;
    case 'jump': tone(260, t, 0.14, AU.pulse, 0.12, d, 720); break;
    case 'land': noise(t, 0.05, 0.1, 'lowpass', 500, d); break;
    case 'hurt': tone(520, t, 0.3, 'sawtooth', 0.13, d, 90); break;
    case 'shoot': noise(t, 0.12, 0.25, 'bandpass', 600, d); tone(110, t, 0.1, 'square', 0.12, d, 50); break;
    case 'pickup': arp(['C6', 'E6', 'G6', 'C7'], 0.06, 0.08); break;
    case 'level': arp(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.08, 0.1); break;
    case 'dodge': tone(900, t, 0.06, AU.pulse12, 0.06, d, 1300); break;
    case 'deflect': tone(600, t, 0.12, AU.pulse, 0.1, d, 1500); break;
    case 'start': arp(['A4', 'C5', 'E5', 'A5'], 0.07, 0.09); break;
    case 'over': arp(['E5', 'D#5', 'D5', 'C#5', 'C5', 'B4', 'A#4', 'A4'], 0.16, 0.18, AU.pulse, 0.11);
      tone(nf('A3'), t + 1.3, 0.8, 'triangle', 0.3, d); break;
  }
}

// ---------------------------------------------------------------- ESTADO
const keys = {}, pressed = {};
const PREVENT = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
addEventListener('keydown', (e) => {
  if (PREVENT.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  initAudio();
  if (e.code === 'KeyF' && !e.repeat) toggleFullscreen();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
cv.addEventListener('pointerdown', () => { initAudio(); pressed.Enter = true; });
addEventListener('touchend', initAudio);

// ---------------------------------------------------------------- MÓVIL Y PANTALLA COMPLETA
let touchMode = false;
function setTouchMode() {
  if (touchMode) return;
  touchMode = true;
  document.body.classList.add('touch');
}
if (matchMedia('(pointer: coarse)').matches) setTouchMode();
addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') setTouchMode(); }, true);
addEventListener('contextmenu', (e) => e.preventDefault());

const touchUI = document.getElementById('touch');
const keyButtons = [...document.querySelectorAll('#touch [data-key]')];
const ptrKey = new Map();

function refreshButtons() {
  for (const b of keyButtons) b.classList.toggle('on', !!keys[b.dataset.key]);
}
function releaseCode(code) {
  keys[code] = [...ptrKey.values()].includes(code);
}
function ptrUpdate(e) {
  const prev = ptrKey.get(e.pointerId) || null;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const btn = el && el.closest('#touch [data-key]');
  const code = btn ? btn.dataset.key : null;
  if (code === prev) return;
  if (code) {
    ptrKey.set(e.pointerId, code);
    if (!keys[code]) pressed[code] = true;
    keys[code] = true;
  } else ptrKey.delete(e.pointerId);
  if (prev) releaseCode(prev);
  refreshButtons();
}
function ptrEnd(e) {
  const prev = ptrKey.get(e.pointerId);
  ptrKey.delete(e.pointerId);
  if (prev) releaseCode(prev);
  refreshButtons();
}
touchUI.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  initAudio();
  if (state !== 'play') pressed.Enter = true;
  ptrUpdate(e);
});
touchUI.addEventListener('pointermove', (e) => { if (ptrKey.has(e.pointerId)) ptrUpdate(e); });
touchUI.addEventListener('pointerup', ptrEnd);
touchUI.addEventListener('pointercancel', ptrEnd);

const tapButton = (id, fn) => document.getElementById(id).addEventListener('pointerdown', (e) => {
  e.preventDefault(); e.stopPropagation(); initAudio(); fn();
});
tapButton('btn-music', () => { pressed.KeyM = true; });
tapButton('btn-pause', () => { pressed.KeyP = true; });
tapButton('btn-fs', () => toggleFullscreen());

function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) { showBanner('AÑADELO A LA PANTALLA DE INICIO'); return; }
  if (isFullscreen()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const lock = () => {
    try {
      const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape');
      if (p && p.catch) p.catch(() => {});
    } catch (err) { /* el navegador no permite bloquear la orientación */ }
  };
  const r = req.call(el, { navigationUI: 'hide' });
  if (r && r.then) r.then(lock).catch(() => {}); else lock();
}

const ATK = {
  punch: { dur: 16, a0: 4, a1: 8, reach: 17, h: 'mid', dmg: 1, pose: 'punch' },
  elbow: { dur: 16, a0: 4, a1: 8, reach: 12, h: 'high', dmg: 2, pose: 'elbow' },
  knee: { dur: 18, a0: 5, a1: 9, reach: 12, h: 'mid', dmg: 2, pose: 'knee' },
  kickH: { dur: 24, a0: 8, a1: 13, reach: 21, h: 'high', dmg: 2, pose: 'kickH' },
  kickL: { dur: 22, a0: 7, a1: 12, reach: 22, h: 'low', dmg: 1, trip: true, pose: 'kickL' },
  jkick: { dur: 30, a0: 3, a1: 20, reach: 19, h: 'high', dmg: 2, pose: 'jkick' },
};
const ATK_KEYS = { KeyZ: 'punch', KeyX: 'elbow', KeyC: 'knee', KeyA: 'kickH', KeyS: 'kickL' };

const HINTS = [
  '¡LOS ESCUDOS PARAN PUÑETAZOS Y RODILLAZOS!',
  '! ROJO: AGACHATE      ! AMARILLO: SALTA',
  'PATADA BAJA DEVUELVE EL BOTE DE GAS',
  'ESQUIVA LOS DISPAROS: ¡DAN A LOS DEL OTRO LADO!',
];

let state = 'title', paused = false, frame = 0, playT = 0, overT = 0;
let mari, enemies, projs, parts, popups, pickups, vecina;
let score = 0, level = 1, kills = 0, combo = 0, comboT = 0, shake = 0, hitstop = 0;
let spawnT = 0, nextPickupAt = 3000, goT = 0, banner = null;
let hi = 0;
try { hi = +localStorage.getItem('maricarmen_hi') || 0; } catch (e) { hi = 0; }

function reset() {
  mari = { x: 160, y: 0, vy: 0, vx: 0, dir: 1, state: 'idle', t: 0, atk: null, hp: MAX_HP, inv: 0,
           anim: 0, buf: null, bufT: 0, hitSet: new Set() };
  enemies = []; projs = []; parts = []; popups = []; pickups = [];
  vecina = { t: 0 };
  score = 0; level = 1; kills = 0; combo = 0; comboT = 0; shake = 0; hitstop = 0;
  spawnT = 90; nextPickupAt = 3000; goT = 0; playT = 0;
  AU.bpm = 140;
}
reset();

function track(path, title) {
  if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true });
}

function startGame() {
  track('partida-iniciada', 'Partida iniciada');
  reset();
  state = 'play'; paused = false;
  initAudio(); startMusic(); sfx('start');
  showBanner('¡DEFIENDE EL PORTAL!');
}

function endGame() {
  state = 'over'; overT = 0;
  track('partida-terminada', 'Partida terminada');
  if (score > hi) { hi = score; try { localStorage.setItem('maricarmen_hi', String(hi)); } catch (e) { /* sin almacenamiento */ } }
  AU.playing = false;
  sfx('over');
}

function showBanner(t) { banner = { text: t, t: 110 }; }
function popup(x, y, s, c = '#fff') { popups.push({ x, y, s, c, t: 55 }); }
function mult() { return Math.min(4, 1 + Math.floor(combo / 4)); }

function addScore(n) {
  score += n;
  if (score >= nextPickupAt) { nextPickupAt += 3000; spawnPickup(); }
}

function spawnPickup() {
  const tx = rand(136, 184);
  pickups.push({ x: 160, h: 70, vx: (tx - 160) / 31, vy: 0, landed: false, life: 480 });
  vecina.t = 110;
  popup(160, 66, '¡TOMA, HIJA!', '#ffb3d9');
}

function sparks(x, y, c = '#fff6a0') {
  parts.push({ x, y, vx: 0, vy: 0, g: 0, life: 4, c: '#ffffff', s: 3 });
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2, sp = rand(0.8, 2.2);
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.05, life: rand(8, 16) | 0, c, s: 1 });
  }
}
function dust(x, n = 5) {
  for (let i = 0; i < n; i++)
    parts.push({ x: x + rand(-5, 5), y: GROUND - 1, vx: rand(-0.6, 0.6), vy: rand(-0.6, -0.1), g: 0, life: rand(10, 20) | 0, c: '#d8d2c6', s: 2 });
}
function smoke(x, y, n = 1) {
  for (let i = 0; i < n; i++)
    parts.push({ x: x + rand(-2, 2), y: y + rand(-2, 1), vx: rand(-0.3, 0.3), vy: rand(-0.5, -0.15), g: 0, life: rand(20, 40) | 0, c: Math.random() < 0.5 ? '#e6eadc' : '#c9cfbd', s: 2 });
}

// ---------------------------------------------------------------- MARICARMEN
const isLow = (m) => m.state === 'crouch' || (m.state === 'attack' && m.atk === 'kickL');
const solid = (e) => e.alive && e.state !== 'tripped';

function startAttack(m, key) {
  m.state = 'attack'; m.atk = key; m.t = 0; m.hitSet = new Set();
  sfx('swing');
}

function mariPose(m) {
  switch (m.state) {
    case 'ko': return 'ko';
    case 'hurt': return m.y > 0 ? 'jump' : 'hurt';
    case 'jump': return 'jump';
    case 'jattack': return m.t >= 2 ? 'jkick' : 'jump';
    case 'crouch': return 'crouch';
    case 'walk': return ['walk1', 'stand', 'walk2', 'stand'][(m.anim >> 3) % 4];
    case 'attack': {
      const A = ATK[m.atk], rest = m.atk === 'kickL' ? 'crouch' : 'stand';
      return (m.t < A.a0 - 2 || m.t > A.a1 + 5) ? rest : A.pose;
    }
    default: return 'stand';
  }
}

function updMari() {
  const m = mari;
  if (m.inv > 0) m.inv--;
  const L = keys.ArrowLeft, Rt = keys.ArrowRight, D = keys.ArrowDown;
  const U = pressed.ArrowUp || pressed.Space;
  let ak = null;
  for (const k in ATK_KEYS) if (pressed[k]) ak = ATK_KEYS[k];
  if (ak) { m.buf = ak; m.bufT = 8; } else if (m.bufT > 0) m.bufT--;

  if (m.y > 0 || m.vy > 0) {
    m.vy -= GRAV; m.y += m.vy;
    if (m.y <= 0) {
      m.y = 0; m.vy = 0;
      if (m.state === 'jump' || m.state === 'jattack') { m.state = 'idle'; m.atk = null; dust(m.x, 3); sfx('land'); }
    }
  }

  switch (m.state) {
    case 'ko': m.t++; break;
    case 'hurt':
      m.t--; m.x += m.vx; m.vx *= 0.85;
      if (m.t <= 0) m.state = m.y > 0 ? 'jump' : 'idle';
      break;
    case 'attack': {
      const A = ATK[m.atk];
      m.t++;
      if (m.t >= A.a0 && m.t <= A.a1) doHit(A);
      if (m.t >= A.dur) { m.state = 'idle'; m.atk = null; }
      break;
    }
    case 'jattack': {
      const A = ATK.jkick;
      m.t++;
      if (L) m.x -= 0.7;
      if (Rt) m.x += 0.7;
      if (m.t >= A.a0 && m.t <= A.a1) doHit(A);
      if (m.t >= A.dur) { m.state = 'jump'; m.atk = null; }
      break;
    }
    case 'jump':
      if (L) { m.x -= 0.9; m.dir = -1; }
      if (Rt) { m.x += 0.9; m.dir = 1; }
      if (m.bufT > 0) { m.bufT = 0; m.state = 'jattack'; m.atk = 'jkick'; m.t = 0; m.hitSet = new Set(); sfx('swing'); }
      break;
    default:
      if (m.bufT > 0) { m.bufT = 0; startAttack(m, m.buf); break; }
      if (U) { m.state = 'jump'; m.vy = JUMPV; m.y = 0.01; sfx('jump'); break; }
      if (D) { m.state = 'crouch'; if (L) m.dir = -1; if (Rt) m.dir = 1; break; }
      if (L !== Rt) { m.dir = L ? -1 : 1; m.x += m.dir * 1.1; m.state = 'walk'; m.anim++; }
      else m.state = 'idle';
  }

  for (const e of enemies) {
    if (!solid(e)) continue;
    if (e.x <= m.x && m.x - e.x < 10) m.x = e.x + 10;
    else if (e.x > m.x && e.x - m.x < 10) m.x = e.x - 10;
  }
  m.x = clamp(m.x, 126, 194);
}

function doHit(A) {
  const m = mari;
  for (const e of enemies) {
    if (!solid(e) || m.hitSet.has(e)) continue;
    const d = (e.x - m.x) * m.dir;
    if (d < -2 || d > A.reach + 4) continue;
    m.hitSet.add(e);
    if (A.h === 'mid' && copShieldUp(e)) { blockHit(e); continue; }
    hitEnemy(e, A, m.dir);
  }
  for (const p of projs) {
    if (p.friendly || m.hitSet.has(p)) continue;
    const d = (p.x - m.x) * m.dir;
    if (d < -2 || d > A.reach + 6) continue;
    if ((p.kind === 'gas' && A.h === 'low') || (p.kind === 'ball' && A.h === 'high')) {
      m.hitSet.add(p);
      p.vx = m.dir * Math.abs(p.vx) * 1.4;
      p.friendly = true;
      sparks(p.x, GROUND - 1 - p.h, '#cfe8ff');
      popup(p.x, GROUND - 34, '¡DEVUELTA!', '#7fe3ff');
      addScore(20 * mult());
      sfx('deflect');
    }
  }
}

function blockHit(e) {
  const m = mari;
  sparks(e.x - m.dir * 6, GROUND - 18, '#cfe8ff');
  sfx('block');
  if (e.blockT <= 0) { popup(e.x, GROUND - 38, 'BLOQUEO', '#9fd3ff'); e.blockT = 40; }
  e.x += m.dir * 1.5; m.x -= m.dir * 1.5;
  hitstop = 2;
}

function hitEnemy(e, A, dir) {
  e.hp -= A.dmg;
  combo++; comboT = 180;
  addScore((e.type === 'nazi' ? 50 : 10) * mult());
  const hy = A.h === 'high' ? 26 : A.h === 'low' ? 5 : 16;
  sparks(e.x - dir * 3, GROUND - hy);
  shake = Math.max(shake, 3); hitstop = 3;
  if (e.hp <= 0) { killEnemy(e, dir); return; }
  sfx('hit');
  if (A.trip) { e.state = 'tripped'; e.t = 55; e.vx = dir * 1.2; e.dir = -dir; dust(e.x, 4); }
  else { e.state = 'hurt'; e.t = 16; e.vx = dir * 2.4; }
}

function killEnemy(e, dir) {
  e.alive = false; e.state = 'dead';
  e.vx = dir * 2.6; e.vy = 3.4; e.y = 0.5; e.dir = -dir;
  kills++;
  const pts = (e.type === 'nazi' ? 500 : 100) * mult();
  addScore(pts);
  popup(e.x, GROUND - 40, '+' + pts, e.type === 'nazi' ? '#ff6060' : '#ffffff');
  if (e.type === 'nazi') { popup(e.x, GROUND - 48, '¡NAZI FUERA!', '#ffd23f'); sfx('nazi'); }
  sfx('kill');
  shake = 5; hitstop = 5;
  const nl = 1 + Math.floor(kills / 8);
  if (nl > level) {
    level = nl;
    AU.bpm = Math.min(176, 140 + (level - 1) * 4);
    showBanner('NIVEL ' + level);
    sfx('level');
  }
}

function hurtMari(dir, dmg) {
  const m = mari;
  if (m.inv > 0 || m.state === 'ko') return;
  m.hp -= dmg;
  m.atk = null; m.vx = dir * 2.2; m.inv = 80;
  combo = 0;
  shake = 6; hitstop = 4;
  sparks(m.x, GROUND - 18, '#ff8080');
  if (m.hp <= 0) {
    m.hp = 0; m.state = 'ko'; m.t = 0; m.y = 0; m.vy = 0; m.dir = -dir;
    goT = 150; AU.playing = false;
    sfx('hurt');
  } else {
    m.state = 'hurt'; m.t = 18;
    sfx('hurt');
  }
}

// ---------------------------------------------------------------- ENEMIGOS
function spawnEnemy() {
  const lc = enemies.filter((e) => e.alive && e.side < 0).length;
  const rc = enemies.filter((e) => e.alive && e.side > 0).length;
  let side = Math.random() < 0.5 ? -1 : 1;
  if (lc - rc >= 2) side = 1; else if (rc - lc >= 2) side = -1;
  const nazi = Math.random() < Math.min(0.4, 0.12 + level * 0.03);
  enemies.push({
    type: nazi ? 'nazi' : 'cop', x: side < 0 ? -14 : W + 14, y: 0, vx: 0, vy: 0, dir: -side, side,
    state: 'walk', t: 0, hp: nazi ? 2 : 3,
    speed: (nazi ? 0.75 : 0.45) + level * 0.04 + Math.random() * 0.1,
    range: nazi ? 15 : 17, alive: true, anim: (Math.random() * 30) | 0,
    shootCD: (120 + Math.random() * 120) | 0, atkH: 'H', hitChecked: false, blockT: 0, kindShot: 'ball',
  });
}

function updEnemy(e) {
  const m = mari, dx = m.x - e.x, dist = Math.abs(dx);
  if (e.blockT > 0) e.blockT--;
  if (e.shootCD > 0) e.shootCD--;
  if (e.state === 'walk' || e.state === 'idle') e.dir = dx >= 0 ? 1 : -1;

  switch (e.state) {
    case 'walk': {
      if (dist <= e.range) { e.state = 'idle'; e.t = Math.max(10, rand(25, 60) - level * 3) | 0; break; }
      let blocked = false;
      for (const o of enemies) {
        if (o === e || !o.alive || o.side !== e.side) continue;
        const od = (o.x - e.x) * e.dir;
        if (od > 0 && od < 13) { blocked = true; break; }
      }
      if (!blocked) { e.x += e.dir * e.speed; e.anim++; }
      if (e.type === 'cop' && e.shootCD <= 0 && dist > 50 && dist < 150 && e.x > 6 && e.x < W - 6 &&
          m.state !== 'ko' && Math.random() < 0.004 + level * 0.0015) {
        e.state = 'aimShoot'; e.t = 36; e.kindShot = Math.random() < 0.5 ? 'ball' : 'gas';
      }
      break;
    }
    case 'idle':
      if (m.state === 'ko') break;
      if (dist > e.range + 4) { e.state = 'walk'; break; }
      if (--e.t <= 0) {
        e.atkH = e.type === 'cop' ? 'H' : (Math.random() < 0.5 ? 'H' : 'L');
        e.state = 'wind';
        e.t = e.type === 'cop' ? Math.max(14, 32 - level * 2) : Math.max(12, 26 - level * 2);
      }
      break;
    case 'wind':
      if (--e.t <= 0) { e.state = 'attack'; e.t = 12; e.hitChecked = false; sfx('swing'); }
      break;
    case 'attack':
      e.t--;
      if (!e.hitChecked && e.t <= 9) {
        e.hitChecked = true;
        if (dist <= e.range + 6 && dx * e.dir > -2 && m.state !== 'ko') {
          const avoided = e.atkH === 'H' ? isLow(m) : m.y > 4;
          if (avoided) {
            if (m.inv <= 0) { popup(m.x, GROUND - 34, 'ESQUIVA', '#9dff9d'); addScore(20 * mult()); sfx('dodge'); }
          } else hurtMari(e.dir, 1);
        }
      }
      if (e.t <= 0) { e.state = 'idle'; e.t = Math.max(25, rand(50, 90) - level * 4) | 0; }
      break;
    case 'aimShoot':
      if (--e.t <= 0) {
        const ball = e.kindShot === 'ball';
        projs.push({ kind: e.kindShot, x: e.x + e.dir * 10, h: ball ? 21 : 2, vx: e.dir * (ball ? 2.4 : 1.5), friendly: false, t: 0 });
        smoke(e.x + e.dir * 12, GROUND - 1 - (ball ? 21 : 6), 4);
        sfx('shoot');
        e.state = 'walk'; e.shootCD = 240;
      }
      break;
    case 'hurt':
      e.x += e.vx; e.vx *= 0.8;
      if (--e.t <= 0) { e.state = 'idle'; e.t = 20; }
      break;
    case 'tripped':
      e.x += e.vx; e.vx *= 0.85;
      if (--e.t <= 0) { e.state = 'idle'; e.t = 15; }
      break;
    case 'dead':
      e.x += e.vx; e.vy -= GRAV; e.y += e.vy;
      if (e.y <= 0) { e.y = 0; e.state = 'ko'; e.t = 80; dust(e.x, 6); sfx('land'); shake = Math.max(shake, 2); }
      break;
    case 'ko':
      e.x += e.vx * 0.3; e.vx *= 0.9;
      if (--e.t <= 0) e.remove = true;
      break;
  }
}

function updProjs() {
  const m = mari;
  for (const p of projs) {
    p.x += p.vx; p.t++;
    if (p.kind === 'gas' && p.t % 3 === 0) smoke(p.x, GROUND - 4);
    if (!p.friendly) {
      if (Math.abs(p.x - m.x) < 5 && m.state !== 'ko') {
        if (p.kind === 'ball') {
          if (!isLow(m) && m.y < 14 && m.inv <= 0) { hurtMari(Math.sign(p.vx), 1); p.dead = true; }
        } else if (m.y < 5 && m.inv <= 0) { hurtMari(Math.sign(p.vx), 1); smoke(p.x, GROUND - 4, 10); p.dead = true; }
      }
      if (!p.dead && (p.x - m.x) * Math.sign(p.vx) > 8) p.friendly = true;
    } else {
      for (const e of enemies) {
        if (!solid(e) || Math.abs(e.x - p.x) >= 6) continue;
        if ((e.x - p.x) * Math.sign(p.vx) < -4) continue;
        hitEnemy(e, p.kind === 'ball' ? { dmg: 1, h: 'high' } : { dmg: 1, h: 'low', trip: true }, Math.sign(p.vx));
        if (p.kind === 'gas') smoke(p.x, GROUND - 4, 10);
        popup(e.x, GROUND - 56, '¡FUEGO AMIGO!', '#ffa040');
        p.dead = true;
        break;
      }
    }
    if (p.x < -20 || p.x > W + 20) p.dead = true;
  }
  projs = projs.filter((p) => !p.dead);
}

function updPickups() {
  const m = mari;
  for (const p of pickups) {
    if (!p.landed) {
      p.vy -= 0.15; p.h += p.vy; p.x += p.vx;
      if (p.h <= 0) { p.h = 0; p.landed = true; dust(p.x, 3); }
    }
    p.life--;
    if (Math.abs(p.x - m.x) < 8 && p.h < 28 && m.state !== 'ko') {
      p.dead = true;
      m.hp = Math.min(MAX_HP, m.hp + 2);
      popup(m.x, GROUND - 36, '+VIDA', '#ff7b9a');
      sfx('pickup');
    }
    if (p.life <= 0) p.dead = true;
  }
  pickups = pickups.filter((p) => !p.dead);
}

// ---------------------------------------------------------------- BUCLE
function step() {
  playT++;
  updMari();
  for (const e of enemies) updEnemy(e);
  enemies = enemies.filter((e) => !e.remove);
  updProjs();
  updPickups();

  if (mari.state === 'ko') {
    if (--goT <= 0) endGame();
  } else if (--spawnT <= 0) {
    if (enemies.filter((e) => e.alive).length < Math.min(2 + level, 8)) spawnEnemy();
    spawnT = (Math.max(50, 170 - level * 12) * rand(0.7, 1.2)) | 0;
  }
  if (comboT > 0 && --comboT === 0) combo = 0;
}

function update() {
  frame++;
  if (pressed.KeyM) { AU.musicOn = !AU.musicOn; showBanner(AU.musicOn ? 'MUSICA ON' : 'MUSICA OFF'); }
  if (state === 'title') {
    if (pressed.Enter || pressed.Space) startGame();
  } else if (state === 'play') {
    if (pressed.KeyP || pressed.Escape) paused = !paused;
    if (!paused) {
      if (hitstop > 0) hitstop--;
      else step();
    }
  } else if (state === 'over') {
    overT++;
    if (overT > 60 && (pressed.Enter || pressed.Space)) startGame();
  }
  if (!paused) {
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
    parts = parts.filter((p) => p.life > 0);
    for (const p of popups) { p.y -= 0.4; p.t--; }
    popups = popups.filter((p) => p.t > 0);
    if (banner && --banner.t <= 0) banner = null;
    if (vecina.t > 0) vecina.t--;
    shake *= 0.85; if (shake < 0.5) shake = 0;
    for (const c of clouds) { c.x += c.s; if (c.x > W + 10) c.x = -20; }
  }
  for (const k in pressed) delete pressed[k];
}

// ---------------------------------------------------------------- RENDER
function drawWorld() {
  for (const e of enemies) if (e.state === 'ko' || e.state === 'tripped') drawEnemy(e);
  for (const p of pickups) {
    if (p.life < 120 && (frame >> 2) % 2) continue;
    if (p.landed) R(ctx, Math.round(p.x) - 4, GROUND - 1, 8, 1, 'rgba(0,0,0,0.25)');
    drawTortilla(p.x, GROUND - 1 - p.h);
  }
  for (const e of enemies) if (e.state !== 'ko' && e.state !== 'tripped') drawEnemy(e);
  drawMari(mari, mariPose(mari));
  for (const e of enemies) drawTelegraph(e);
  for (const p of projs) {
    const x = Math.round(p.x), y = GROUND - 1 - Math.round(p.h);
    if (p.kind === 'ball') {
      R(ctx, x - 1, y - 1, 3, 3, '#2a2a2a'); R(ctx, x - 1, y - 1, 1, 1, '#777');
    } else {
      R(ctx, x - 2, y - 3, 5, 4, '#6b7350'); R(ctx, x - 2, y - 3, 5, 1, '#9aa47a'); R(ctx, x + (p.vx > 0 ? 3 : -3), y - 2, 1, 2, '#333');
    }
  }
}

function drawParticlesAndPopups() {
  for (const p of parts) R(ctx, Math.round(p.x - p.s / 2), Math.round(p.y - p.s / 2), p.s, p.s, p.c);
  for (const p of popups) text(p.s, p.x, p.y, p.c, 1, 'center', '#000');
}

function drawHUD() {
  R(ctx, 0, 0, W, 16, 'rgba(0,0,0,0.55)');
  text('MARICARMEN', 4, 2, '#ffd23f');
  for (let i = 0; i < MAX_HP; i++) heart(4 + i * 6, 9, i < mari.hp);
  text('NIVEL ' + level, 160, 2, '#ffffff', 1, 'center');
  if (combo >= 4) text('COMBO X' + mult(), 160, 9, (frame >> 2) % 2 ? '#ffd23f' : '#ff8a3d', 1, 'center');
  text(String(score).padStart(6, '0'), 316, 2, '#ffffff', 1, 'right');
  text('RECORD ' + String(Math.max(hi, score)).padStart(6, '0'), 316, 9, '#9a9aa6', 1, 'right');
  if (playT < 1200 && mari.state !== 'ko') {
    const h = HINTS[Math.floor(playT / 300) % HINTS.length];
    text(h, 160, 174, '#ffffff', 1, 'center', '#000');
  }
}

function drawTitle() {
  R(ctx, 26, 18, 268, 100, 'rgba(10,12,30,0.8)');
  R(ctx, 26, 18, 268, 1, '#ffd23f'); R(ctx, 26, 117, 268, 1, '#ffd23f');
  text('MARICARMEN', 160, 23, '#ffd23f', 3, 'center', '#a32020');
  text('LA DEFENSA DEL PORTAL', 160, 43, '#ffffff', 1, 'center');
  if (touchMode) {
    text('CRUCETA: MOVERSE, ARRIBA SALTA, ABAJO AGACHA', 160, 54, '#9fd3ff', 1, 'center');
    text('BOTONES: PUÑO, CODO, RODILLA,', 160, 62, '#9fd3ff', 1, 'center');
    text('PATADA ALTA Y PATADA BAJA', 160, 70, '#9fd3ff', 1, 'center');
  } else {
    text('< > MOVERSE    ARRIBA SALTAR    ABAJO AGACHARSE', 160, 54, '#9fd3ff', 1, 'center');
    text('Z PUÑETAZO   X CODAZO   C RODILLAZO', 160, 62, '#9fd3ff', 1, 'center');
    text('A PATADA ALTA   S PATADA BAJA', 160, 70, '#9fd3ff', 1, 'center');
  }
  text('! ROJO: AGACHATE      ! AMARILLO: SALTA', 160, 80, '#ffb070', 1, 'center');
  text('ANTIDISTURBIO 100 PTS     NAZI 500 PTS', 160, 90, '#ff8080', 1, 'center');
  text(touchMode ? 'ARRIBA: MUSICA, PAUSA Y PANTALLA COMPLETA' : 'M MUSICA   P PAUSA   F PANTALLA COMPLETA', 160, 99, '#9a9aa6', 1, 'center');
  if ((frame >> 5) % 2 === 0) text(touchMode ? 'TOCA PARA EMPEZAR' : 'PULSA ENTER', 160, 108, '#ffffff', 1, 'center', '#000');
  text('RECORD ' + String(hi).padStart(6, '0'), 160, 3, '#ffffff', 1, 'center', '#000');
}

const titleCop = { type: 'cop', x: 104, y: 0, dir: 1, state: 'idle', t: 99 };
const titleNazi = { type: 'nazi', x: 216, y: 0, dir: -1, state: 'idle', t: 99 };

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(skyC, 0, 0);
  for (const c of clouds) drawCloud(c.x, c.y);
  let sx = 0, sy = 0;
  if (shake > 0) { sx = Math.round(rand(-1, 1) * shake); sy = Math.round(rand(-1, 1) * shake); }
  ctx.save();
  ctx.translate(sx, sy);
  ctx.drawImage(cityC, 0, 0);
  if (vecina.t > 0) drawVecina();
  if (state === 'title') {
    drawEnemy(titleCop); drawEnemy(titleNazi);
    drawMari({ x: 160, y: 0, dir: (frame >> 6) % 2 ? 1 : -1, inv: 0, state: 'idle' }, 'stand');
  } else {
    drawWorld();
  }
  drawParticlesAndPopups();
  ctx.restore();

  if (state === 'title') drawTitle();
  else drawHUD();

  if (banner) text(banner.text, 160, 52, (frame >> 3) % 2 ? '#ffd23f' : '#ffffff', 2, 'center', '#000');
  if (state === 'play' && paused) {
    R(ctx, 0, 0, W, H, 'rgba(0,0,0,0.5)');
    text('PAUSA', 160, 80, '#ffffff', 3, 'center', '#000');
  }
  if (state === 'over') {
    R(ctx, 40, 50, 240, 70, 'rgba(10,12,30,0.85)');
    text('FIN DE LA PARTIDA', 160, 58, '#ff3b5c', 2, 'center', '#000');
    text('PUNTOS ' + score, 160, 78, '#ffffff', 1, 'center');
    text('RECORD ' + hi, 160, 87, '#ffd23f', 1, 'center');
    text('ENEMIGOS ' + kills + '   NIVEL ' + level, 160, 96, '#9fd3ff', 1, 'center');
    if (overT > 60 && (frame >> 5) % 2 === 0) text(touchMode ? 'TOCA PARA JUGAR OTRA VEZ' : 'PULSA ENTER', 160, 108, '#ffffff', 1, 'center');
  }
}

buildBG();
let acc = 0, last = performance.now();
const DT = 1000 / 60;
function loop(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= DT) { update(); acc -= DT; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
