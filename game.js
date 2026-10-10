'use strict';
(() => {
const W = 320, H = 180, GROUND = 164;
const GRAV = 0.3, JUMPV = 4.6;
const ZONE_L = 104, ZONE_R = 216;

const LEVEL_3D = 20;

const cv = document.getElementById('game');
const glCanvas = document.getElementById('gl');
const screenEl = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fit() {
  let s = Math.min(innerWidth / W, innerHeight / H);
  if (s >= 3) s = Math.floor(s);
  screenEl.style.width = Math.floor(W * s) + 'px';
  screenEl.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 200));
document.addEventListener('fullscreenchange', fit);
document.addEventListener('webkitfullscreenchange', fit);
fit();

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
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
  ')':[4,2,2,2,4],'=':[0,7,0,7,0],'<':[1,2,4,2,1],'>':[4,2,1,2,4],'%':[5,1,2,4,5],' ':[0,0,0,0,0],
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
function wrap(str, n) {
  const lines = [];
  let cur = '';
  for (const w of norm(str).split(' ')) {
    if (cur && cur.length + 1 + w.length > n) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- PINCEL PIXEL
// Dibuja relativo a (ox, oy) mirando a la derecha; dir=-1 lo refleja y k escala a píxeles gordos.
let TINT = null;
function pen(ox, oy, dir, k = 1) {
  ox = Math.round(ox); oy = Math.round(oy);
  const px = (x, y, w, h, c) => {
    ctx.fillStyle = TINT || c;
    ctx.fillRect(dir > 0 ? ox + x * k : ox - (x + w) * k + k, oy + y * k, w * k, h * k);
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
  spin: { hip:[0,-10], sh:[1,-17], hd:[2,-21], bk:[-2,-5], bf:[-3,0], fk:[2,-5], ff:[3,0],
          be:[-5,-16], bh:[-10,-16], fe:[6,-16], fh:[11,-16], bag:true },
  throw: { hip:[0,-5], sh:[2,-11], hd:[4,-14], bk:[-3,-3], bf:[-3,0], fk:[3,-4], ff:[3,0],
           be:[0,-9], bh:[-2,-11], fe:[6,-11], fh:[10,-12] },
  dash: { hip:[1,-10], sh:[4,-16], hd:[6,-19], bk:[-3,-5], bf:[-6,-1], fk:[3,-6], ff:[5,0],
          be:[1,-13], bh:[-2,-11], fe:[5,-13], fh:[7,-11] },
  stomp: { hip:[0,-11], sh:[1,-18], hd:[2,-22], bk:[-1,-6], bf:[-1,0], fk:[1,-6], ff:[1,0],
           be:[-2,-21], bh:[-3,-25], fe:[3,-21], fh:[4,-25] },
  shout: { hip:[0,-10], sh:[0,-17], hd:[0,-21], bk:[-3,-5], bf:[-5,0], fk:[3,-5], ff:[5,0],
           be:[-4,-21], bh:[-7,-25], fe:[4,-21], fh:[7,-25], shout:true },
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
  evade: { hip:[-1,-13], sh:[-3,-23], hd:[-3,-28], bk:[-4,-7], bf:[-6,0], fk:[0,-7], ff:[1,0],
           be:[-2,-19], bh:[1,-22], bt:[1,-6], fe:[1,-20], fh:[4,-23] },
  charge: { hip:[1,-12], sh:[5,-21], hd:[7,-25], bk:[-3,-7], bf:[-6,-1], fk:[4,-8], ff:[7,-1],
            be:[3,-18], bh:[6,-16], bt:[2,5], fe:[7,-19], fh:[10,-18] },
  summon: { ...ES, fe:[4,-23], fh:[3,-27] },
};

// ---------------------------------------------------------------- TIPOS, MEJORAS
const TYPES = {
  cop: { name: 'ANTIDISTURBIO', draw: 'cop', hp: 3, speed: 0.45, range: 17, wind: 32, pts: 100, hitPts: 10,
         drop: 0.04, shield: true, shoot: true, attacks: ['H'] },
  nazi: { name: 'NAZI', draw: 'nazi', hp: 2, speed: 0.75, range: 15, wind: 26, pts: 500, hitPts: 50,
          drop: 0.35, nazi: true, attacks: ['H', 'L'] },
  skin: { name: 'CABEZA RAPADA', draw: 'skin', hp: 3, speed: 0.6, range: 15, wind: 28, pts: 300, hitPts: 30,
          drop: 0.2, nazi: true, bottle: true, attacks: ['H', 'H', 'L'] },
  geo: { name: 'GEO', draw: 'geo', hp: 4, speed: 0.55, range: 16, wind: 24, pts: 250, hitPts: 25,
         drop: 0.1, taser: true, evade: 0.3, attacks: ['H', 'L', 'HL'] },
  officer: { name: 'OFICIAL NAZI', draw: 'officer', hp: 5, speed: 0.85, range: 16, wind: 22, pts: 1000, hitPts: 80,
             drop: 0.6, nazi: true, evade: 0.25, attacks: ['HL', 'LH', 'HH', 'L'] },
  comisario: { name: 'EL COMISARIO', draw: 'cop', boss: true, hp: 30, speed: 0.4, range: 18, wind: 30, pts: 5000,
               hitPts: 40, shield: true, shieldHigh: true, charge: true, summon: 'cop', attacks: ['H', 'HH'] },
  general: { name: 'EL GENERAL', draw: 'officer', boss: true, hp: 34, speed: 0.55, range: 18, wind: 26, pts: 8000,
             hitPts: 60, nazi: true, grenade: true, summon: 'skin', evade: 0.12, attacks: ['HL', 'LH', 'HLH'] },
};
const UNLOCKS = { 3: '¡LLEGAN LOS CABEZAS RAPADAS!', 5: '¡CUIDADO CON LOS GEO!', 7: '¡OFICIALES NAZIS A LA VISTA!' };

const AFFIX = {
  BLINDADO: { c: '#d0d8e0', hp: 2.5, speed: 0.8 },
  VELOZ: { c: '#4fe3ff', speed: 1.7, wind: 0.8 },
  FURIOSO: { c: '#ff4040', wind: 0.55, dmg: 1 },
  REGENERA: { c: '#7dff7d', hp: 1.5 },
};

const RARITY = [
  { name: 'COMUN', c: '#9fd3ff' },
  { name: 'RARA', c: '#7dff7d' },
  { name: 'EPICA', c: '#ffb030' },
];
const CARDS = [
  { id: 'hp', name: 'COCIDO MADRILEÑO', desc: '+2 CORAZONES MAXIMOS Y TE CURA 2', r: 0, max: 4,
    apply: (s) => { s.maxHp += 2; mari.hp = Math.min(s.maxHp, mari.hp + 2); } },
  { id: 'fuerza', name: 'ANIS DEL MONO', desc: 'TODOS TUS GOLPES HACEN +25% DE DAÑO', r: 0, max: 5, apply: (s) => { s.dmg += 0.25; } },
  { id: 'veloz', name: 'ZAPATILLAS NUEVAS', desc: 'ANDAS UN 15% MAS RAPIDO', r: 0, max: 3, apply: (s) => { s.speed += 0.15; } },
  { id: 'rapida', name: 'CAFE CON LECHE', desc: 'GOLPEAS UN 12% MAS RAPIDO', r: 0, max: 3, apply: (s) => { s.atkSpd += 0.12; } },
  { id: 'alcance', name: 'ESTIRAMIENTOS', desc: 'TODOS TUS GOLPES LLEGAN 3 PIXELES MAS LEJOS', r: 0, max: 3, apply: (s) => { s.reach += 3; } },
  { id: 'critico', name: 'MALA UVA', desc: '15% DE PROBABILIDAD DE GOLPE CRITICO X2', r: 0, max: 3, apply: (s) => { s.crit += 0.15; } },
  { id: 'tortilla', name: 'VECINA GENEROSA', desc: 'LA VECINA TIRA TORTILLAS MAS A MENUDO Y CURAN MAS', r: 0, max: 2,
    apply: (s) => { s.tortillaEvery -= 800; s.tortillaHeal += 1; } },
  { id: 'memoria', name: 'MEMORIA DE ELEFANTE', desc: 'EL COMBO DURA MAS Y SU MULTIPLICADOR SUBE +1', r: 0, max: 2,
    apply: (s) => { s.comboTime += 90; s.multCap += 1; } },
  { id: 'espinas', name: 'REBECA DE ESPARTO', desc: 'QUIEN TE PEGA SE LLEVA 1 DE DAÑO', r: 1, max: 2, apply: (s) => { s.thorns += 1; } },
  { id: 'rulos', name: 'ESCUDO DE RULOS', desc: 'LOS RULOS PARAN UN GOLPE CADA 20 SEGUNDOS', r: 1, max: 1,
    apply: (s) => { s.curlers = true; s.curlT = 0; } },
  { id: 'sopa', name: 'SOPITA DE AJO', desc: '10% DE CURARTE 1 AL TUMBAR A ALGUIEN', r: 1, max: 2, apply: (s) => { s.vamp += 0.1; } },
  { id: 'malaleche', name: 'MALA LECHE', desc: 'LA BARRA DEL GRITO SE LLENA EL DOBLE DE RAPIDO', r: 1, max: 1, apply: (s) => { s.superRate += 1; } },
  { id: 'doble', name: 'RODILLAS DE TITANIO', desc: 'DOBLE SALTO: SALTA OTRA VEZ EN EL AIRE', r: 1, max: 1 },
  { id: 'pisoton', name: 'PISOTON DE ABUELA', desc: 'ABAJO EN EL AIRE: CAES Y TUMBAS A LOS DE CERCA', r: 1, max: 1 },
  { id: 'zapatilla', name: 'LA ZAPATILLA', desc: 'AGACHADA + PUÑO: LANZAS LA ZAPATILLA', r: 1, max: 1 },
  { id: 'embestida', name: 'EMBESTIDA', desc: 'EL PASO LIGERO TUMBA A QUIEN ATRAVIESAS', r: 1, max: 1 },
  { id: 'contra', name: 'MIRADA ASESINA', desc: 'PEGAR A QUIEN PREPARA UN GOLPE HACE TRIPLE DAÑO', r: 1, max: 1 },
  { id: 'baston', name: 'BASTON DE NOGAL', desc: 'EL PUÑETAZO LLEGA MAS LEJOS Y HACE +1 DE DAÑO', r: 1, max: 1 },
  { id: 'bolsazo', name: 'BOLSAZO GIRATORIO', desc: '3 PUÑETAZOS SEGUIDOS: GIRAS CON EL BOLSO A LOS DOS LADOS', r: 2, max: 1 },
  { id: 'mercado', name: 'COMBO DEL MERCADO', desc: 'PUÑO, CODO Y PATADA ALTA SEGUIDOS: REMATE DEMOLEDOR', r: 2, max: 1 },
  { id: 'rompe', name: 'PUÑO DE HIERRO', desc: 'LOS ESCUDOS YA NO PARAN TUS GOLPES', r: 2, max: 1 },
  { id: 'zapatilla2', name: 'ZAPATILLA TELEDIRIGIDA', desc: 'LA ZAPATILLA ATRAVIESA A TODOS LOS QUE PILLA', r: 2, max: 1, req: 'zapatilla' },
  { id: 'grito2', name: 'GRITO DE PORTERA', desc: 'EL GRITO HACE EL DOBLE DE DAÑO Y TE CURA 2', r: 2, max: 1 },
  { id: 'pisoton2', name: 'PISOTON SISMICO', desc: 'EL PISOTON TUMBA A TODA LA CALLE', r: 2, max: 1, req: 'pisoton' },
];
const CARD_ODDS = { level: [70, 25, 5], medal: [30, 50, 20], boss: [0, 35, 65] };

// ---------------------------------------------------------------- DIBUJO PERSONAJES
function shadow(x, h, w = 12) {
  const s = Math.max(4, Math.round(w - h / 4));
  R(ctx, Math.round(x - s / 2), GROUND - 1, s, 2, 'rgba(0,0,0,0.28)');
}

function mariBody(P, p, poseName, m) {
  const st = m.st;
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
  if (poseName !== 'ko' && !p.bag) {
    P.line(p.sh, [p.hip[0] - 4, p.hip[1] - 2], 1, '#3a1a12');
    P.px(p.hip[0] - 7, p.hip[1] - 2, 5, 4, '#8a2f2f');
    P.px(p.hip[0] - 7, p.hip[1] - 2, 5, 1, '#b04848');
    P.px(p.hip[0] - 5, p.hip[1], 1, 1, '#e2b443');
  }
  P.line(p.sh, p.fe, 2, CG); P.line(p.fe, p.fh, 2, CG);
  if (p.elb) P.px(p.fe[0] - 1, p.fe[1] - 1, 3, 3, CGD);
  if (p.fist) P.px(p.fh[0] - 1, p.fh[1] - 1, 3, 3, SK);
  else P.px(p.fh[0] - 1, p.fh[1] - 1, 2, 2, SK);
  if (p.bag) {
    P.px(p.fh[0], p.fh[1] - 2, 5, 5, '#8a2f2f');
    P.px(p.fh[0], p.fh[1] - 2, 5, 1, '#b04848');
    P.px(p.fh[0] + 2, p.fh[1], 1, 1, '#e2b443');
  }
  if (st && st.stacks.baston && ['stand', 'walk1', 'walk2', 'punch', 'crouch'].includes(poseName)) {
    const end = poseName === 'punch' ? [p.fh[0] + 7, p.fh[1]] : [p.fh[0] + 1, 0];
    P.line(p.fh, end, 1, '#7a4a22');
  }

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 1, hy + 2, 3, 1, '#f4f0e8');
  P.px(hx - 3, hy - 3, 6, 6, SK);
  P.px(hx + 3, hy, 1, 1, SK);
  P.px(hx - 2, hy - 1, 1, 2, SKD);
  P.px(hx - 4, hy - 4, 7, 2, HR);
  P.px(hx - 3, hy - 5, 2, 1, HR); P.px(hx, hy - 5, 2, 1, HR);
  P.px(hx - 4, hy - 2, 2, 4, HR);
  P.px(hx - 4, hy + 1, 1, 1, HRD); P.px(hx - 4, hy - 4, 1, 1, HRD); P.px(hx + 2, hy - 3, 1, 1, HRD);
  if (st && st.curlers && st.curlT <= 0) {
    P.px(hx - 3, hy - 6, 2, 1, '#ff8ac8'); P.px(hx, hy - 6, 2, 1, '#ff8ac8'); P.px(hx - 5, hy - 3, 1, 2, '#ff8ac8');
  }
  P.px(hx, hy - 2, 3, 1, '#4a4a4a');
  P.px(hx - 1, hy - 2, 1, 1, '#4a4a4a');
  if (m.state === 'hurt' || m.state === 'stun' || poseName === 'ko') P.px(hx, hy - 1, 2, 1, '#222');
  else P.px(hx + 1, hy - 1, 1, 1, '#222');
  P.px(hx, hy, 1, 1, '#f0a090');
  if (p.shout) P.px(hx + 1, hy, 2, 2, '#5a1a1a');
  else P.px(hx + 1, hy + 1, 2, 1, '#a85a50');
}

function drawMari(m, poseName) {
  const p = MP[poseName] || MP.stand;
  shadow(m.x, m.y, poseName === 'ko' ? 22 : 12);
  const blink = m.inv > 0 && !['ko', 'dash', 'super', 'stomp'].includes(m.state) && (frame >> 2) % 2;
  if (blink) return;
  let dir = m.dir;
  if (m.state === 'attack' && m.atk === 'spin') dir = ((m.t | 0) >> 2) % 2 ? m.dir : -m.dir;
  const oy = GROUND - 1 - Math.round(m.y);
  if (m.state === 'dash') {
    TINT = 'rgba(155,89,182,0.35)';
    mariBody(pen(m.x - m.dir * 7, oy, dir), p, poseName, m);
    TINT = 'rgba(155,89,182,0.2)';
    mariBody(pen(m.x - m.dir * 14, oy, dir), p, poseName, m);
    TINT = null;
  }
  if (m.state === 'super') {
    TINT = (frame >> 1) % 2 ? '#ff4040' : '#ffd23f';
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) mariBody(pen(m.x + dx, oy + dy, dir), p, poseName, m);
    TINT = null;
  }
  const jit = m.state === 'stun' ? ((frame >> 1) % 2 ? 1 : -1) : 0;
  mariBody(pen(m.x + jit, oy, dir), p, poseName, m);
  if (m.state === 'stun' && frame % 3 === 0) {
    R(ctx, Math.round(m.x + rand(-6, 6)), Math.round(oy - rand(4, 24)), 1, 2, '#fff36a');
  }
}

function shieldUp(e) {
  return !!e.T.shield && (e.state === 'walk' || e.state === 'idle' || e.state === 'hurt');
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
  if (e.T.boss) { P.px(p.sh[0] - 2, p.sh[1] - 3, 5, 1, '#e2b443'); P.px(p.sh[0] + 1, p.sh[1] + 4, 2, 1, '#e2b443'); }

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 4, hy - 5, 8, 6, HEL);
  P.px(hx - 3, hy - 6, 6, 1, HEL);
  P.px(hx - 2, hy - 5, 3, 1, '#2f4170');
  if (e.T.boss) P.px(hx - 4, hy - 3, 8, 1, '#c41e1e');
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
  if (poseName === 'summon') P.px(p.fh[0], p.fh[1] - 1, 2, 1, '#e2b443');
  if (!lying) {
    if (shieldUp(e)) {
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

function drawSkin(e, p, P, poseName) {
  const JK = '#3f4a2c', JKD = '#2f3820', JE = '#3b4f86', JED = '#2d3c66', BOOT = '#5a1414';
  const SKIN = '#f0c09a', SKD = '#d0a07a';

  P.line(p.hip, p.bk, 3, JED); P.line(p.bk, p.bf, 3, JED);
  P.px(p.bf[0] - 1, p.bf[1] - 2, 5, 3, BOOT);
  P.line(p.sh, p.be, 3, JKD); P.line(p.be, p.bh, 2, JKD);
  const fist = poseName === 'attH' ? 3 : 2;
  P.px(p.bh[0] - 1, p.bh[1] - 1, fist, fist, SKD);
  if (e.state === 'aimThrow' && e.t > 8) {
    P.line(p.bh, [p.bh[0] - 1, p.bh[1] - 5], 2, '#2e8b3e');
    P.px(p.bh[0] - 1, p.bh[1] - 6, 1, 1, '#9fe0a8');
  }
  P.line(p.hip, p.fk, 3, JE); P.line(p.fk, p.ff, 3, JE);
  P.px(p.ff[0] - 1, p.ff[1] - 2, 5, 3, BOOT);
  P.px(p.ff[0] - 1, p.ff[1] - 3, 4, 1, '#c9d3e8');
  P.line(p.hip, p.sh, 6, JK);
  P.line([p.hip[0] + 1, p.hip[1] - 1], [p.sh[0] + 1, p.sh[1] + 2], 1, '#c41e1e');
  P.px(p.sh[0] - 1, p.sh[1] - 1, 3, 1, '#e8742a');

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 3, hy - 3, 6, 6, SKIN);
  P.px(hx - 2, hy - 4, 5, 1, SKIN);
  P.px(hx - 1, hy - 4, 2, 1, '#fff0d8');
  P.px(hx + 3, hy, 1, 1, SKIN);
  P.px(hx - 2, hy - 1, 1, 2, SKD);
  P.px(hx + 1, hy - 1, 1, 1, '#111');
  P.px(hx, hy - 2, 3, 1, '#7a4a2a');
  P.px(hx + 1, hy + 1, 2, 1, '#8a3030');

  P.line(p.sh, p.fe, 3, JK); P.line(p.fe, p.fh, 2, JK);
  P.px(p.fh[0] - 1, p.fh[1] - 1, 2, 2, SKIN);
}

function drawGeo(e, p, P, poseName) {
  const BK = '#1d1f24', BKD = '#121317', VEST = '#3a3f46', BOOT = '#050505', HEL = '#0c0d10', SKIN = '#d9a882';

  P.line(p.hip, p.bk, 3, BKD); P.line(p.bk, p.bf, 3, BKD);
  P.px(p.bf[0] - 1, p.bf[1] - 1, 5, 2, BOOT);
  P.line(p.sh, p.be, 3, BKD); P.line(p.be, p.bh, 2, BKD);
  P.px(p.bh[0] - 1, p.bh[1] - 1, 2, 2, '#000');
  P.line(p.hip, p.fk, 3, BK); P.line(p.fk, p.ff, 3, BK);
  P.px(p.fk[0] - 1, p.fk[1] - 1, 3, 3, VEST);
  P.px(p.ff[0] - 1, p.ff[1] - 1, 5, 2, BOOT);
  P.line(p.hip, p.sh, 6, BK);
  P.line([p.hip[0], p.hip[1] - 2], [p.sh[0], p.sh[1] + 1], 4, VEST);
  P.px(p.sh[0], p.sh[1] + 3, 2, 2, '#2a2e34'); P.px(p.hip[0], p.hip[1] - 4, 2, 2, '#2a2e34');

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 3, hy - 3, 6, 6, BK);
  P.px(hx, hy - 1, 3, 1, SKIN);
  P.px(hx + 2, hy - 1, 1, 1, '#000');
  P.px(hx - 4, hy - 5, 8, 3, HEL);
  P.px(hx - 3, hy - 6, 6, 1, HEL);
  P.px(hx, hy - 4, 4, 1, '#5a6a7a');

  P.line(p.sh, p.fe, 3, BK); P.line(p.fe, p.fh, 2, BK);
  P.px(p.fh[0] - 1, p.fh[1] - 1, 2, 2, '#000');
  if (poseName === 'shoot') {
    P.px(p.fh[0] - 1, p.fh[1] - 1, 6, 2, '#e8d020');
    P.px(p.fh[0] + 5, p.fh[1] - 1, 1, 1, '#222');
  }
}

function drawOfficer(e, p, P, poseName) {
  const C = '#1d1d21', CD = '#121215', BOOT = '#050505', SKIN = '#eec3a2', SKD = '#cc9f80';
  const boss = e.T.boss;

  P.line(p.hip, p.bk, 3, CD); P.line(p.bk, p.bf, 3, BOOT);
  P.px(p.bf[0] - 1, p.bf[1] - 1, 5, 2, BOOT);
  P.line(p.sh, p.be, 3, CD); P.line(p.be, p.bh, 2, CD);
  P.px(p.bh[0] - 1, p.bh[1] - 1, poseName === 'attH' ? 3 : 2, poseName === 'attH' ? 3 : 2, '#111');
  if (boss && poseName === 'attH') {
    P.line(p.bh, [p.bh[0] + 11, p.bh[1] + 1], 1, '#dcdce4');
    P.px(p.bh[0], p.bh[1] - 1, 1, 3, '#e2b443');
  }
  P.line(p.hip, p.fk, 3, C); P.line(p.fk, p.ff, 3, BOOT);
  P.px(p.ff[0] - 1, p.ff[1] - 1, 5, 2, BOOT);
  P.px(p.fk[0], p.fk[1] + 1, 1, 3, '#3a3a40');
  P.line(p.hip, p.sh, 6, C);
  P.px(p.hip[0] - 4, p.hip[1] - 1, 9, 7, C);
  P.px(p.hip[0] - 4, p.hip[1] + 5, 9, 1, CD);
  P.px(p.hip[0] - 3, p.hip[1] - 2, 6, 1, '#3a2a1a');
  P.px(p.sh[0] + 2, p.sh[1] + 2, 1, 1, '#bbbbbb'); P.px(p.sh[0] + 2, p.sh[1] + 5, 1, 1, '#bbbbbb');
  P.px(p.sh[0] + 1, p.sh[1] - 1, 2, 1, '#c0c0c0');
  if (boss) {
    P.px(p.sh[0] - 2, p.sh[1] - 2, 5, 1, '#e2b443');
    P.px(p.sh[0] - 1, p.sh[1] + 3, 2, 1, '#c41e1e'); P.px(p.sh[0] - 1, p.sh[1] + 4, 2, 1, '#e2b443');
  }

  const hx = p.hd[0], hy = p.hd[1];
  P.px(hx - 3, hy - 3, 6, 6, SKIN);
  P.px(hx + 3, hy, 1, 1, SKIN);
  P.px(hx - 2, hy - 1, 1, 2, SKD);
  P.px(hx + 1, hy - 1, 1, 1, '#111');
  P.px(hx + 2, hy - 2, 1, 3, '#e8e8e8');
  P.px(hx + 1, hy + 1, 2, 1, '#7a2b2b');
  P.px(hx - 4, hy - 5, 8, 2, C);
  P.px(hx - 3, hy - 6, 7, 1, C);
  P.px(hx + 1, hy - 7, 3, 1, C);
  P.px(hx - 4, hy - 3, 8, 1, '#3a3a3a');
  P.px(hx + 1, hy - 2, 4, 1, '#000');
  P.px(hx + 2, hy - 5, 1, 1, '#d8d8d8');

  P.line(p.sh, p.fe, 3, C); P.line(p.fe, p.fh, 2, C);
  P.px(p.fh[0] - 1, p.fh[1] - 1, 2, 2, '#111');
  const mx = Math.round((p.sh[0] + p.fe[0]) / 2), my = Math.round((p.sh[1] + p.fe[1]) / 2);
  P.px(mx - 1, my - 1, 3, 2, '#c41e1e');
  P.px(mx, my - 1, 1, 1, '#f2f2f2');
}

const DRAWERS = { cop: drawCop, nazi: drawNazi, skin: drawSkin, geo: drawGeo, officer: drawOfficer };

function enemyPose(e) {
  switch (e.state) {
    case 'walk': return ['walk1', 'stand', 'walk2', 'stand'][(e.anim >> 3) % 4];
    case 'wind': return e.atkH === 'H' ? 'windH' : 'windL';
    case 'attack': return e.atkH === 'H' ? 'attH' : 'attL';
    case 'aimShoot': return 'shoot';
    case 'aimThrow': return e.t > 8 ? 'windH' : 'attH';
    case 'chargeWind': case 'charge': return 'charge';
    case 'summon': return 'summon';
    case 'evade': return 'evade';
    case 'hurt': case 'tired': return 'hurt';
    case 'tripped': return e.t < 10 ? 'hurt' : 'down';
    case 'dead': return 'fly';
    case 'ko': return 'down';
    default: return 'stand';
  }
}

function drawEnemy(e) {
  const poseName = enemyPose(e);
  const k = e.scale || 1;
  const lying = poseName === 'down';
  shadow(e.x, e.y, (lying ? 24 : 14) * k);
  if (e.state === 'ko' && e.t < 30 && (frame >> 1) % 2) return;
  const p = EP[poseName];
  const oy = GROUND - 1 - Math.round(e.y);
  const draw = DRAWERS[e.T.draw];
  if (e.elite && e.alive && !lying) {
    TINT = AFFIX[e.elite].c;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(e, p, pen(e.x + dx, oy + dy, e.dir, k), poseName);
    TINT = null;
  }
  if (e.flash > 0) TINT = '#ffffff';
  draw(e, p, pen(e.x, oy, e.dir, k), poseName);
  TINT = null;

  if (e.state === 'tripped' && e.t >= 10) {
    for (let i = 0; i < 3; i++) {
      const a = frame * 0.15 + i * 2.1;
      const sx = Math.round(e.x - e.dir * 13 * k + Math.cos(a) * 6);
      const sy = Math.round(GROUND - 12 + Math.sin(a) * 2);
      R(ctx, sx, sy, 1, 1, '#ffe14d');
      R(ctx, sx - 1, sy, 3, 1, 'rgba(255,225,77,0.5)');
    }
  }
}

function headY(e) { return GROUND - (e.scale > 1 ? 80 : 46); }

function drawTelegraph(e) {
  if (e.elite && e.alive && e.state !== 'tripped') {
    const p = toScreen(e.x, headY(e) + 8);
    text(e.elite, p.x, p.y, AFFIX[e.elite].c, 1, 'center', '#000');
  }
  if ((frame >> 2) % 2 === 0) return;
  let c = null;
  if (e.state === 'wind') c = e.atkH === 'H' ? '#ff3b3b' : '#ffe14d';
  else if (e.state === 'aimShoot') c = e.kindShot === 'ball' ? '#ff3b3b' : '#ffe14d';
  else if (e.state === 'chargeWind') c = '#ffe14d';
  else if (e.state === 'aimThrow') c = '#4fa8ff';
  if (!c) return;
  const p = toScreen(e.x, headY(e));
  text('!', p.x - 2, p.y, c, 2, 'left', '#000');
}

// ---------------------------------------------------------------- MODO 3D
let r3d = null, r3dLoading = false, r3dFailed = false, r3dShown = false;

function loadScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = ko;
    document.head.appendChild(s);
  });
}

function ensure3D() {
  if (r3d || r3dLoading || r3dFailed) return;
  r3dLoading = true;
  loadScript('https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js')
    .then(() => loadScript('game3d.js?v=6'))
    .then(() => { r3d = window.Render3D.create(glCanvas, { cityC, skyC, W, H }); })
    .catch(() => { r3dFailed = true; })
    .finally(() => { r3dLoading = false; });
}

function want3D() {
  return (state === 'play' || state === 'choose' || state === 'over') && level >= LEVEL_3D && !r3dFailed;
}

function toScreen(x, y) {
  return use3D() ? r3d.project(x, GROUND - 1 - y) : { x, y };
}
function use3D() { return !!r3d && want3D(); }

function world3D() {
  const characters = [];
  const mp = mariPose(mari);
  const pose = MP[mp] || MP.stand;
  characters.push({
    obj: mari, type: 'mari', pose, k: 1,
    dir: mari.state === 'attack' && mari.atk === 'spin' ? (((mari.t | 0) >> 2) % 2 ? mari.dir : -mari.dir) : mari.dir,
    visible: !(mari.inv > 0 && !['ko', 'dash', 'super', 'stomp'].includes(mari.state) && (frame >> 2) % 2),
    flags: { fist: !!pose.fist, lying: mp === 'ko', bag: !!pose.bag,
             cane: !!mari.st.stacks.baston && ['stand', 'walk1', 'walk2', 'punch', 'crouch'].includes(mp), canePunch: mp === 'punch' },
  });
  for (const e of enemies) {
    const ep = enemyPose(e);
    characters.push({
      obj: e, type: e.T.draw, pose: EP[ep], k: e.scale || 1, dir: e.dir,
      visible: !(e.state === 'ko' && e.t < 30 && (frame >> 1) % 2),
      flags: { fist: ep === 'attH', shoot: ep === 'shoot', shieldUp: shieldUp(e), lying: ep === 'down' || ep === 'fly',
               bottle: e.state === 'aimThrow' && e.t > 8, gold: !!e.T.boss, saber: !!e.T.boss && ep === 'attH' },
    });
  }
  return {
    characters, projs,
    pickups: pickups.map((p) => Object.assign(p, { visible: !(p.life < 120 && (frame >> 2) % 2) })),
    focusX: mari.x, shake,
  };
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

function drawMedal(x, y) {
  x = Math.round(x); y = Math.round(y);
  const w = [5, 3, 1, 3][(frame >> 3) % 4];
  R(ctx, x - 2, y - 11, 2, 4, '#c41e1e'); R(ctx, x, y - 11, 2, 4, '#f2f2f2');
  R(ctx, x - Math.floor(w / 2), y - 7, w, 6, '#e2b443');
  R(ctx, x - Math.floor(w / 2), y - 7, w, 1, '#fff2a8');
  if (w > 1) R(ctx, x - Math.floor(w / 2), y - 2, w, 1, '#9a7420');
  if ((frame >> 2) % 4 === 0) R(ctx, x + 3, y - 9, 1, 1, '#ffffff');
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
    case 'dash': noise(t, 0.12, 0.15, 'bandpass', 3000, d); tone(400, t, 0.1, AU.pulse12, 0.06, d, 900); break;
    case 'special': arp(['A5', 'C6', 'E6'], 0.04, 0.06, AU.pulse12, 0.09); noise(t, 0.1, 0.15, 'highpass', 2000, d); break;
    case 'super': tone(180, t, 0.6, 'sawtooth', 0.18, d, 60); noise(t, 0.5, 0.35, 'lowpass', 900, d);
      arp(['A3', 'E4', 'A4', 'E5'], 0.05, 0.12, 'square', 0.08); break;
    case 'ready': arp(['E5', 'A5', 'E6'], 0.05, 0.07, AU.pulse12, 0.08); break;
    case 'stomp': tone(120, t, 0.3, 'square', 0.2, d, 30); noise(t, 0.3, 0.4, 'lowpass', 600, d); break;
    case 'medal': arp(['G5', 'C6', 'E6', 'G6', 'C7'], 0.05, 0.08, AU.pulse, 0.09); break;
    case 'card': arp(['C5', 'G5', 'C6'], 0.06, 0.09, AU.pulse12, 0.09); break;
    case 'boss': arp(['A2', 'A2', 'F2', 'G2', 'A2'], 0.14, 0.16, 'square', 0.16); break;
    case 'glass': noise(t, 0.15, 0.3, 'highpass', 4000, d); tone(2200, t, 0.08, 'triangle', 0.06, d, 3000); break;
    case 'boom': noise(t, 0.5, 0.5, 'lowpass', 500, d); tone(90, t, 0.4, 'square', 0.15, d, 30); break;
    case 'charge': tone(200, t, 0.5, 'sawtooth', 0.1, d, 600); break;
    case 'taser': noise(t, 0.2, 0.2, 'highpass', 5000, d); tone(1800, t, 0.15, 'square', 0.05, d, 900); break;
    case 'over': arp(['E5', 'D#5', 'D5', 'C#5', 'C5', 'B4', 'A#4', 'A4'], 0.16, 0.18, AU.pulse, 0.11);
      tone(nf('A3'), t + 1.3, 0.8, 'triangle', 0.3, d); break;
  }
}

// ---------------------------------------------------------------- ENTRADA
const keys = {}, pressed = {};
let tapPos = null;
const PREVENT = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
addEventListener('keydown', (e) => {
  if (PREVENT.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  initAudio();
  if (e.code === 'KeyF' && !e.repeat) toggleFullscreen();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
cv.addEventListener('pointerdown', (e) => {
  initAudio();
  const r = cv.getBoundingClientRect();
  tapPos = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  pressed.Tap = true;
});
addEventListener('touchend', initAudio);

// ---------------------------------------------------------------- MÓVIL Y PANTALLA COMPLETA
let touchMode = false;
function setTouchMode() {
  if (touchMode) return;
  touchMode = true;
  document.body.classList.add('touch');
}
if (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || 'ontouchstart' in window) setTouchMode();
addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') setTouchMode(); }, true);
addEventListener('contextmenu', (e) => e.preventDefault());

const touchUI = document.getElementById('touch');
const keyButtons = [...document.querySelectorAll('#touch [data-key]')];
const superBtn = document.querySelector('#touch [data-key="KeyD"]');
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
  if (state === 'title' || state === 'over') pressed.Enter = true;
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
document.getElementById('btn-fs').addEventListener('click', (e) => {
  e.stopPropagation(); initAudio(); toggleFullscreen();
});

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

// ---------------------------------------------------------------- ATAQUES
const ATK = {
  punch: { dur: 16, a0: 4, a1: 8, reach: 17, h: 'mid', dmg: 1, pose: 'punch' },
  elbow: { dur: 16, a0: 4, a1: 8, reach: 12, h: 'high', dmg: 2, pose: 'elbow' },
  knee: { dur: 18, a0: 5, a1: 9, reach: 12, h: 'mid', dmg: 2, pose: 'knee' },
  kickH: { dur: 24, a0: 8, a1: 13, reach: 21, h: 'high', dmg: 2, pose: 'kickH' },
  kickL: { dur: 22, a0: 7, a1: 12, reach: 22, h: 'low', dmg: 1, trip: true, pose: 'kickL' },
  jkick: { dur: 30, a0: 3, a1: 20, reach: 19, h: 'high', dmg: 2, pose: 'jkick' },
  spin: { dur: 26, a0: 5, a1: 18, reach: 20, h: 'high', dmg: 2, both: true, knock: 3.5, pose: 'spin' },
  mercado: { dur: 28, a0: 8, a1: 13, reach: 24, h: 'high', dmg: 4, launch: true, bonus: 300, pose: 'kickH' },
  throw: { dur: 16, a0: 6, a1: 6, reach: 0, h: 'mid', dmg: 0, projectile: true, pose: 'throw' },
};
const ATK_KEYS = { KeyZ: 'punch', KeyX: 'elbow', KeyC: 'knee', KeyA: 'kickH', KeyS: 'kickL' };

const HINTS_KB = [
  '¡LOS ESCUDOS PARAN PUÑETAZOS Y RODILLAZOS!',
  '! ROJO: AGACHATE   ! AMARILLO: SALTA   ! AZUL: APARTATE',
  'DOBLE TOQUE < O >: PASO LIGERO SIN RECIBIR DAÑO',
  'D: GRITO CUANDO LA BARRA ROJA ESTE LLENA',
  'NAZIS Y ELITES SUELTAN MEDALLAS CON MEJORAS',
];
const HINTS_TOUCH = [
  '¡LOS ESCUDOS PARAN PUÑETAZOS Y RODILLAZOS!',
  '! ROJO: AGACHATE   ! AMARILLO: SALTA   ! AZUL: APARTATE',
  'DOBLE TOQUE EN LA CRUCETA: PASO LIGERO',
  'BOTON GRITO CUANDO LA BARRA ROJA ESTE LLENA',
  'NAZIS Y ELITES SUELTAN MEDALLAS CON MEJORAS',
];

// ---------------------------------------------------------------- ESTADO
let state = 'title', paused = false, frame = 0, playT = 0, overT = 0;
let mari, enemies, projs, parts, popups, pickups, vecina, banners, choiceQueue, choice;
let score = 0, level = 1, kills = 0, levelKills = 0, combo = 0, comboT = 0, shake = 0, hitstop = 0, flash = 0;
let spawnT = 0, nextPickupAt = 3000, goT = 0, boss = null;
let hi = 0;
try { hi = +localStorage.getItem('maricarmen_hi') || 0; } catch (e) { hi = 0; }

function newStats() {
  return { maxHp: 8, dmg: 1, speed: 1, atkSpd: 1, reach: 0, crit: 0, thorns: 0, curlers: false, curlT: 0,
           vamp: 0, superRate: 1, comboTime: 180, multCap: 4, tortillaEvery: 3000, tortillaHeal: 2, stacks: {} };
}

function reset() {
  mari = { x: 160, y: 0, vy: 0, vx: 0, dir: 1, state: 'idle', t: 0, atk: null, hp: 8, inv: 0,
           anim: 0, buf: null, bufT: 0, hitSet: new Set(), chain: [], rage: 0, dashCD: 0, throwCD: 0,
           tapDir: 0, tapT: -99, usedDouble: false, thrown: false, st: newStats() };
  enemies = []; projs = []; parts = []; popups = []; pickups = []; banners = []; choiceQueue = []; choice = null;
  vecina = { t: 0 };
  score = 0; level = 1; kills = 0; levelKills = 0; combo = 0; comboT = 0; shake = 0; hitstop = 0; flash = 0;
  spawnT = 90; nextPickupAt = 3000; goT = 0; playT = 0; boss = null;
  r3dShown = false;
  AU.bpm = 140;
}
reset();

const has = (id) => !!mari.st.stacks[id];

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

function showBanner(t) { if (banners.length < 4) banners.push({ text: t, t: 110 }); }
function popup(x, y, s, c = '#fff') { popups.push({ x, y, s, c, t: 55 }); }
function mult() { return Math.min(mari.st.multCap, 1 + Math.floor(combo / 4)); }
function setBpm() { AU.bpm = Math.min(184, 140 + (level - 1) * 3 + (boss ? 12 : 0)); }

function addScore(n) {
  score += n;
  if (score >= nextPickupAt) { nextPickupAt += mari.st.tortillaEvery; spawnTortilla(); }
}

function addRage(n) {
  const m = mari;
  if (m.rage >= 100) return;
  m.rage = Math.min(100, m.rage + n * m.st.superRate);
  if (m.rage >= 100) { popup(m.x, GROUND - 40, '¡GRITO LISTO!', '#ffd23f'); sfx('ready'); }
}

function spawnTortilla() {
  const tx = rand(ZONE_L + 20, ZONE_R - 20);
  pickups.push({ kind: 'tortilla', x: 160, h: 70, vx: (tx - 160) / 31, vy: 0, g: 0.15, landed: false, life: 480 });
  vecina.t = 110;
  popup(160, 66, '¡TOMA, HIJA!', '#ffb3d9');
}

function dropMedal(x, h = 18) {
  const tx = clamp(x, ZONE_L + 6, ZONE_R - 6);
  pickups.push({ kind: 'medal', x, h, vx: (tx - x) / 40, vy: 2.6, g: 0.15, landed: false, life: 720 });
}

function sparks(x, y, c = '#fff6a0', n = 8) {
  parts.push({ x, y, vx: 0, vy: 0, g: 0, life: 4, c: '#ffffff', s: 3 });
  for (let i = 0; i < n; i++) {
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
function burst(x, y, colors, n, sp = 2.5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = rand(0.5, sp);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.08, life: rand(14, 30) | 0, c: pick(colors), s: Math.random() < 0.3 ? 2 : 1 });
  }
}

// ---------------------------------------------------------------- CARTAS DE MEJORA
function queueChoice(src) { choiceQueue.push(src); }

function rollCards(src) {
  const odds = CARD_ODDS[src];
  const st = mari.st.stacks;
  const pool = CARDS.filter((c) => (st[c.id] || 0) < c.max && (!c.req || st[c.req]));
  const out = [];
  while (out.length < 3 && pool.length) {
    let roll = Math.random() * (odds[0] + odds[1] + odds[2]), r = 0;
    while (r < 2 && roll >= odds[r]) { roll -= odds[r]; r++; }
    let cands = pool.filter((c) => c.r === r);
    if (!cands.length) cands = pool;
    const c = pick(cands);
    out.push(c);
    pool.splice(pool.indexOf(c), 1);
  }
  return out;
}

function openChoice(src) {
  const cards = rollCards(src);
  if (!cards.length) { addScore(1000); popup(mari.x, GROUND - 40, '+1000', '#ffd23f'); return; }
  choice = { src, cards, sel: Math.min(1, cards.length - 1), t: 0, rects: [] };
  state = 'choose';
  sfx('card');
}

function applyCard(c) {
  const st = mari.st;
  st.stacks[c.id] = (st.stacks[c.id] || 0) + 1;
  if (c.apply) c.apply(st);
  popup(mari.x, GROUND - 40, c.name, RARITY[c.r].c);
  sfx('medal');
}

function updChoice() {
  const ch = choice;
  ch.t++;
  if (pressed.ArrowLeft) ch.sel = (ch.sel + ch.cards.length - 1) % ch.cards.length;
  if (pressed.ArrowRight) ch.sel = (ch.sel + 1) % ch.cards.length;
  if (ch.t < 25) return;
  let ok = pressed.Enter || pressed.Space || pressed.KeyZ || pressed.KeyX || pressed.KeyC || pressed.KeyA || pressed.KeyS;
  if (pressed.Tap && tapPos) {
    ch.rects.forEach((r, i) => {
      if (tapPos.x >= r.x && tapPos.x <= r.x + r.w && tapPos.y >= r.y && tapPos.y <= r.y + r.h) { ch.sel = i; ok = true; }
    });
  }
  if (!ok) return;
  applyCard(ch.cards[ch.sel]);
  choice = null;
  state = 'play';
}

// ---------------------------------------------------------------- MARICARMEN
const isLow = (m) => m.state === 'crouch' || (m.state === 'attack' && (m.atk === 'kickL' || m.atk === 'throw'));
const hittable = (e) => e.alive && e.state !== 'tripped' && e.state !== 'evade';
const blocksMari = (e) => hittable(e) && e.state !== 'charge';

function atkOf(key) {
  const A = ATK[key], s = mari.st;
  let reach = A.reach + s.reach, dmg = A.dmg;
  if (key === 'punch' && has('baston')) { reach += 8; dmg += 1; }
  return Object.assign({}, A, { reach, dmg, key });
}

function startAttack(m, key) {
  if (key === 'punch' && m.state === 'crouch' && has('zapatilla') && m.throwCD <= 0) key = 'throw';
  const c = m.chain, last = c[c.length - 1], prev = c[c.length - 2];
  if (last && prev && frame - last.t < 40 && frame - prev.t < 80) {
    if (key === 'punch' && has('bolsazo') && last.k === 'punch' && prev.k === 'punch') key = 'spin';
    else if (key === 'kickH' && has('mercado') && last.k === 'elbow' && prev.k === 'punch') key = 'mercado';
  }
  if (key === 'spin' || key === 'mercado') m.chain = [];
  else { c.push({ k: key, t: frame }); if (c.length > 3) c.shift(); }
  m.state = 'attack'; m.atk = key; m.t = 0; m.hitSet = new Set(); m.thrown = false;
  if (key === 'throw') m.throwCD = 30;
  if (key === 'spin') { popup(m.x, GROUND - 38, '¡BOLSAZO!', '#ff9ad5'); sfx('special'); }
  else if (key === 'mercado') { popup(m.x, GROUND - 38, '¡COMBO DEL MERCADO!', '#ffb030'); sfx('special'); }
  else sfx('swing');
  triggerEvades(m, atkOf(key));
}

function triggerEvades(m, A) {
  for (const e of enemies) {
    if (!e.T.evade || !e.alive || !(e.state === 'walk' || e.state === 'idle')) continue;
    const rel = (e.x - m.x) * m.dir;
    if (!A.both && (rel < 0 || rel > A.reach + 10)) continue;
    if (A.both && Math.abs(e.x - m.x) > A.reach + 10) continue;
    if (Math.random() < e.T.evade) {
      e.state = 'evade'; e.t = 12; e.vx = Math.sign(e.x - m.x) * 2.8;
      popup(e.x, headY(e) + 2, 'ESQUIVA', '#c0c0c0');
    }
  }
}

function startDash(dir) {
  const m = mari;
  m.state = 'dash'; m.t = 10; m.dir = dir; m.atk = null;
  m.inv = Math.max(m.inv, 14); m.hitSet = new Set();
  dust(m.x, 4); sfx('dash');
}

function startSuper() {
  const m = mari;
  m.state = 'super'; m.t = 0; m.rage = 0; m.atk = null;
  showBanner('¡SINVERGÜENZAS!');
  sfx('super');
}

function doSuper() {
  const m = mari, big = has('grito2');
  flash = 8; shake = 10; hitstop = 6;
  for (const e of enemies) {
    if (!hittable(e) || e.x < -10 || e.x > W + 10) continue;
    hitEnemy(e, { dmg: big ? 6 : 3, h: 'high', trip: !e.T.boss, key: 'super' }, Math.sign(e.x - m.x) || 1, false);
  }
  for (const p of projs) if (!p.friendly && !p.mine) { p.dead = true; sparks(p.x, GROUND - 1 - p.h, '#ffd23f', 4); }
  if (big) { m.hp = Math.min(m.st.maxHp, m.hp + 2); popup(m.x, GROUND - 46, '+VIDA', '#ff7b9a'); }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    parts.push({ x: m.x, y: GROUND - 16, vx: Math.cos(a) * 4, vy: Math.sin(a) * 2, g: 0, life: 16, c: '#ffd23f', s: 2 });
  }
}

function stompLand() {
  const m = mari, radius = has('pisoton2') ? 400 : 46;
  m.state = 'idle'; m.inv = Math.max(m.inv, 10);
  shake = 7; hitstop = 3; sfx('stomp');
  for (let i = 0; i < 16; i++) {
    const d = i % 2 ? 1 : -1;
    parts.push({ x: m.x, y: GROUND - 2, vx: d * rand(1, 4), vy: rand(-1.5, -0.3), g: 0.08, life: rand(14, 26) | 0, c: '#d8d2c6', s: 2 });
  }
  for (const e of enemies) {
    if (!hittable(e) || e.y > 4 || Math.abs(e.x - m.x) > radius) continue;
    hitEnemy(e, { dmg: 1.5, h: 'low', trip: !e.T.boss, key: 'stomp' }, Math.sign(e.x - m.x) || 1, false);
  }
}

function mariPose(m) {
  switch (m.state) {
    case 'ko': return 'ko';
    case 'hurt': case 'stun': return m.y > 0 ? 'jump' : 'hurt';
    case 'jump': return 'jump';
    case 'jattack': return m.t >= 2 ? 'jkick' : 'jump';
    case 'stomp': return 'stomp';
    case 'dash': return 'dash';
    case 'super': return 'shout';
    case 'crouch': return 'crouch';
    case 'walk': return ['walk1', 'stand', 'walk2', 'stand'][(m.anim >> 3) % 4];
    case 'attack': {
      const A = ATK[m.atk], rest = m.atk === 'kickL' || m.atk === 'throw' ? 'crouch' : 'stand';
      return (m.t < A.a0 - 2 || m.t > A.a1 + 5) ? rest : A.pose;
    }
    default: return 'stand';
  }
}

function updMari() {
  const m = mari, s = m.st;
  if (m.inv > 0) m.inv--;
  if (m.dashCD > 0) m.dashCD--;
  if (m.throwCD > 0) m.throwCD--;
  if (s.curlers && s.curlT > 0) s.curlT--;
  const L = keys.ArrowLeft, Rt = keys.ArrowRight, D = keys.ArrowDown;
  const U = pressed.ArrowUp || pressed.Space;
  let ak = null;
  for (const k in ATK_KEYS) if (pressed[k]) ak = ATK_KEYS[k];
  if (ak) { m.buf = ak; m.bufT = 8; } else if (m.bufT > 0) m.bufT--;
  let dashReq = 0;
  for (const [code, d] of [['ArrowLeft', -1], ['ArrowRight', 1]]) {
    if (!pressed[code]) continue;
    if (m.tapDir === d && frame - m.tapT < 14) dashReq = d;
    m.tapDir = d; m.tapT = frame;
  }
  if (pressed.ShiftLeft || pressed.ShiftRight) dashReq = L ? -1 : Rt ? 1 : m.dir;

  if (m.y > 0 || m.vy > 0) {
    m.vy -= GRAV; m.y += m.vy;
    if (m.y <= 0) {
      m.y = 0; m.vy = 0; m.usedDouble = false;
      if (m.state === 'stomp') stompLand();
      else if (m.state === 'jump' || m.state === 'jattack') { m.state = 'idle'; m.atk = null; dust(m.x, 3); sfx('land'); }
    }
  }

  const free = m.state === 'idle' || m.state === 'walk' || m.state === 'crouch';
  if (pressed.KeyD && m.rage >= 100 && (free || m.state === 'jump' || m.state === 'attack' || m.state === 'jattack')) startSuper();
  else if (dashReq && m.dashCD <= 0 && free) startDash(dashReq);

  switch (m.state) {
    case 'ko': m.t++; break;
    case 'hurt':
      m.t--; m.x += m.vx; m.vx *= 0.85;
      if (m.t <= 0) m.state = m.y > 0 ? 'jump' : 'idle';
      break;
    case 'stun':
      m.t--; m.x += m.vx; m.vx *= 0.8;
      if (m.t <= 0) m.state = m.y > 0 ? 'jump' : 'idle';
      break;
    case 'super':
      m.t++;
      m.inv = Math.max(m.inv, 2);
      if (m.t === 14) doSuper();
      if (m.t >= 40) m.state = m.y > 0 ? 'jump' : 'idle';
      break;
    case 'dash':
      m.t--;
      m.x += m.dir * 3.2 * s.speed;
      if (frame % 2 === 0) parts.push({ x: m.x - m.dir * 4, y: GROUND - rand(2, 20), vx: -m.dir * 0.5, vy: 0, g: 0, life: 10, c: '#b885d0', s: 1 });
      if (has('embestida')) {
        for (const e of enemies) {
          if (!hittable(e) || m.hitSet.has(e) || Math.abs(e.x - m.x) > 9) continue;
          m.hitSet.add(e);
          hitEnemy(e, { dmg: 1, h: 'low', trip: !e.T.boss, key: 'dash' }, m.dir, true);
        }
      }
      if (m.t <= 0) { m.state = 'idle'; m.dashCD = 32; }
      break;
    case 'attack': {
      const A = atkOf(m.atk);
      m.t += s.atkSpd;
      if (A.projectile) {
        if (!m.thrown && m.t >= A.a0) { m.thrown = true; throwSlipper(); }
      } else if (m.t >= A.a0 && m.t <= A.a1 + s.atkSpd) doHit(A);
      if (m.t >= A.dur) { m.state = 'idle'; m.atk = null; }
      break;
    }
    case 'jattack': {
      const A = atkOf('jkick');
      m.t += s.atkSpd;
      if (L) m.x -= 0.7 * s.speed;
      if (Rt) m.x += 0.7 * s.speed;
      if (m.t >= A.a0 && m.t <= A.a1) doHit(A);
      if (pressed.ArrowDown && has('pisoton')) { m.state = 'stomp'; m.vy = -5; m.atk = null; sfx('swing'); break; }
      if (m.t >= A.dur) { m.state = 'jump'; m.atk = null; }
      break;
    }
    case 'stomp': break;
    case 'jump':
      if (L) { m.x -= 0.9 * s.speed; m.dir = -1; }
      if (Rt) { m.x += 0.9 * s.speed; m.dir = 1; }
      if (U && has('doble') && !m.usedDouble) {
        m.usedDouble = true; m.vy = JUMPV * 0.95; sfx('jump');
        for (let i = 0; i < 6; i++) parts.push({ x: m.x + rand(-4, 4), y: GROUND - m.y, vx: rand(-0.5, 0.5), vy: rand(0.2, 0.8), g: 0, life: 12, c: '#ffffff', s: 1 });
        break;
      }
      if (pressed.ArrowDown && has('pisoton')) { m.state = 'stomp'; m.vy = -5; sfx('swing'); break; }
      if (m.bufT > 0) { m.bufT = 0; m.state = 'jattack'; m.atk = 'jkick'; m.t = 0; m.hitSet = new Set(); sfx('swing'); }
      break;
    default:
      if (m.bufT > 0) { m.bufT = 0; startAttack(m, m.buf); break; }
      if (U) { m.state = 'jump'; m.vy = JUMPV; m.y = 0.01; sfx('jump'); break; }
      if (D) { m.state = 'crouch'; if (L) m.dir = -1; if (Rt) m.dir = 1; break; }
      if (L !== Rt) { m.dir = L ? -1 : 1; m.x += m.dir * 1.1 * s.speed; m.state = 'walk'; m.anim++; }
      else m.state = 'idle';
  }

  if (m.state !== 'dash') {
    for (const e of enemies) {
      if (!blocksMari(e)) continue;
      const gap = 10 + (e.scale > 1 ? 7 : 0);
      if (e.x <= m.x && m.x - e.x < gap) m.x = e.x + gap;
      else if (e.x > m.x && e.x - m.x < gap) m.x = e.x - gap;
    }
  }
  m.x = clamp(m.x, ZONE_L, ZONE_R);
}

function throwSlipper() {
  const m = mari;
  projs.push({ kind: 'slipper', x: m.x + m.dir * 6, h: 11, vx: m.dir * 3.6, friendly: true, mine: true,
               pierce: has('zapatilla2'), hits: new Set(), t: 0 });
}

function blocked(e, A, dir) {
  if (has('rompe') || !shieldUp(e) || e.dir !== -dir) return false;
  return A.h === 'mid' || (A.h === 'high' && !!e.T.shieldHigh);
}

function doHit(A) {
  const m = mari;
  for (const e of enemies) {
    if (!hittable(e) || m.hitSet.has(e)) continue;
    const extra = e.scale > 1 ? 8 : 0;
    const rel = (e.x - m.x) * m.dir;
    const inRange = A.both ? Math.abs(e.x - m.x) <= A.reach + 4 + extra : rel >= -2 && rel <= A.reach + 4 + extra;
    if (!inRange) continue;
    m.hitSet.add(e);
    const dir = A.both ? (Math.sign(e.x - m.x) || m.dir) : m.dir;
    if (blocked(e, A, dir)) { blockHit(e, dir); continue; }
    hitEnemy(e, A, dir, true);
  }
  for (const p of projs) {
    if (p.friendly || p.arc || m.hitSet.has(p)) continue;
    const rel = (p.x - m.x) * m.dir;
    const inRange = A.both ? Math.abs(p.x - m.x) <= A.reach + 6 : rel >= -2 && rel <= A.reach + 6;
    if (!inRange) continue;
    if (A.both || (p.kind === 'gas' && A.h === 'low') || (p.kind !== 'gas' && A.h === 'high')) {
      m.hitSet.add(p);
      p.vx = (A.both ? Math.sign(p.x - m.x) || m.dir : m.dir) * Math.abs(p.vx) * 1.4;
      p.friendly = true;
      sparks(p.x, GROUND - 1 - p.h, '#cfe8ff');
      popup(p.x, GROUND - 34, '¡DEVUELTA!', '#7fe3ff');
      addScore(20 * mult());
      sfx('deflect');
    }
  }
}

function blockHit(e, dir) {
  const m = mari;
  sparks(e.x - dir * 6, GROUND - 18, '#cfe8ff');
  sfx('block');
  if (e.blockT <= 0) { popup(e.x, headY(e) + 8, 'BLOQUEO', '#9fd3ff'); e.blockT = 40; }
  if (!e.T.boss) e.x += dir * 1.5;
  m.x -= dir * 1.5;
  hitstop = 2;
}

function hitEnemy(e, A, dir, melee) {
  const s = mari.st;
  let dmg = A.dmg * s.dmg;
  let tag = null;
  if (melee && Math.random() < s.crit) { dmg *= 2; tag = ['¡CRITICO!', '#ff5050']; }
  if (melee && has('contra') && (e.state === 'wind' || e.state === 'chargeWind' || e.state === 'aimShoot' || e.state === 'aimThrow')) {
    dmg *= 3; tag = ['¡CONTRA!', '#ff9a3d'];
  }
  e.hp -= dmg; e.flash = 4;
  combo++; comboT = s.comboTime;
  addRage(5);
  addScore(Math.round(e.T.hitPts * mult()));
  if (tag) popup(e.x, headY(e) - 2, tag[0], tag[1]);
  const hy = A.h === 'high' ? 26 : A.h === 'low' ? 5 : 16;
  sparks(e.x - dir * 3, GROUND - hy * (e.scale || 1));
  shake = Math.max(shake, dmg >= 3 ? 5 : 3); hitstop = Math.max(hitstop, dmg >= 3 ? 5 : 3);
  if (combo > 0 && combo % 25 === 0) {
    popup(mari.x, GROUND - 50, '¡RACHA DE ' + combo + '!', '#ffd23f');
    dropMedal(mari.x, 40);
  }
  if (e.hp <= 0) { killEnemy(e, dir, A); return; }
  sfx('hit');
  if (e.T.boss) {
    if (e.state === 'walk' || e.state === 'idle') { e.state = 'hurt'; e.t = 8; e.vx = dir * 0.6; }
    return;
  }
  if (A.trip) { e.state = 'tripped'; e.t = 55; e.vx = dir * 1.2; e.dir = -dir; dust(e.x, 4); }
  else if (A.launch) { e.state = 'hurt'; e.t = 24; e.vx = dir * 4; }
  else { e.state = 'hurt'; e.t = 16; e.vx = dir * (A.knock || 2.4); }
}

function killEnemy(e, dir, A) {
  const m = mari, T = e.T;
  e.alive = false; e.state = 'dead';
  const launch = A && A.launch;
  e.vx = dir * (launch ? 4.5 : T.boss ? 1.5 : 2.6); e.vy = launch ? 5 : 3.4; e.y = 0.5; e.dir = -dir;
  kills++;
  const pts = T.pts * mult() * (e.elite ? 2 : 1);
  addScore(pts);
  popup(e.x, headY(e) + 6, '+' + pts, T.nazi ? '#ff6060' : '#ffffff');
  if (A && A.bonus) { addScore(A.bonus * mult()); popup(e.x, headY(e) - 10, '+' + A.bonus * mult() + ' REMATE', '#ffb030'); }
  if (T.nazi) { popup(e.x, headY(e) - 2, '¡NAZI FUERA!', '#ffd23f'); sfx('nazi'); }
  sfx('kill');
  shake = 5; hitstop = 5;
  if (Math.random() < m.st.vamp && m.hp < m.st.maxHp) { m.hp++; popup(m.x, GROUND - 36, '+1 VIDA', '#ff7b9a'); }
  if (T.boss) {
    shake = 14; hitstop = 24; flash = 10;
    burst(e.x, GROUND - 40, ['#ffd23f', '#ff6040', '#ffffff'], 60, 4);
    showBanner('¡JEFE DERROTADO!');
    queueChoice('boss');
    dropMedal(e.x, 50);
  } else if (e.elite || Math.random() < T.drop) dropMedal(e.x);
  if (boss) {
    if (e === boss) { boss = null; levelUp(); }
    return;
  }
  levelKills++;
  if (levelKills >= killsNeeded()) levelUp();
}

function killsNeeded() { return 8 + Math.floor(level / 4); }

function levelUp() {
  level++; levelKills = 0;
  showBanner('NIVEL ' + level);
  sfx('level');
  queueChoice('level');
  if (UNLOCKS[level]) showBanner(UNLOCKS[level]);
  if (level % 5 === 0) spawnBoss();
  setBpm();
}

function hurtMari(dir, dmg, src) {
  const m = mari, s = m.st;
  if (m.inv > 0 || m.state === 'ko' || m.state === 'super') return false;
  if (s.curlers && s.curlT <= 0) {
    s.curlT = 1200; m.inv = 50;
    popup(m.x, GROUND - 36, '¡RULOS!', '#ff8ac8');
    sparks(m.x, GROUND - 24, '#ff8ac8');
    sfx('block');
    return false;
  }
  m.hp -= dmg;
  m.atk = null; m.vx = dir * 2.2; m.inv = 80;
  combo = 0;
  shake = 6; hitstop = 4;
  sparks(m.x, GROUND - 18, '#ff8080');
  addRage(6);
  if (src && s.thorns && src.alive) hitEnemy(src, { dmg: s.thorns, h: 'mid', key: 'thorns' }, -dir, false);
  if (m.hp <= 0) {
    m.hp = 0; m.state = 'ko'; m.t = 0; m.y = 0; m.vy = 0; m.dir = -dir;
    goT = 150; AU.playing = false;
  } else {
    m.state = 'hurt'; m.t = 18;
  }
  sfx('hurt');
  return true;
}

function dodgeReward() {
  const m = mari;
  popup(m.x, GROUND - 34, 'ESQUIVA', '#9dff9d');
  addScore(20 * mult());
  addRage(4);
  sfx('dodge');
}

// ---------------------------------------------------------------- ENEMIGOS
function makeEnemy(type, side, elite) {
  const T = TYPES[type];
  const e = {
    type, T, x: side < 0 ? -20 : W + 20, y: 0, vx: 0, vy: 0, dir: -side, side, state: 'walk', t: 0,
    hp: T.hp * (1 + 0.12 * (level - 1)), speed: T.speed + level * 0.03 + Math.random() * 0.1, range: T.range,
    alive: true, anim: (Math.random() * 30) | 0, shootCD: (100 + Math.random() * 120) | 0,
    atkH: 'H', seq: 'H', si: 0, hitChecked: false, blockT: 0, kindShot: 'ball', grenade: false,
    scale: T.boss ? 2 : 1, elite: elite || null, flash: 0, regenT: 0,
    windMul: Math.max(0.45, 1 - level * 0.03), dmg: T.boss ? 2 : level >= 10 ? 2 : 1,
  };
  if (T.boss) e.x = side < 0 ? -30 : W + 30;
  if (elite) {
    const A = AFFIX[elite];
    e.hp *= A.hp || 1; e.speed *= A.speed || 1; e.windMul *= A.wind || 1; e.dmg += A.dmg || 0;
  }
  e.maxHp = e.hp;
  enemies.push(e);
  return e;
}

function pickType() {
  const w = [['cop', 10], ['nazi', 2 + level * 0.4]];
  if (level >= 3) w.push(['skin', 3 + level * 0.3]);
  if (level >= 5) w.push(['geo', 2 + level * 0.3]);
  if (level >= 7) w.push(['officer', 1 + level * 0.2]);
  let r = Math.random() * w.reduce((a, b) => a + b[1], 0);
  for (const [t, v] of w) { if ((r -= v) <= 0) return t; }
  return 'cop';
}

function spawnEnemy() {
  const lc = enemies.filter((e) => e.alive && e.side < 0).length;
  const rc = enemies.filter((e) => e.alive && e.side > 0).length;
  let side = Math.random() < 0.5 ? -1 : 1;
  if (lc - rc >= 2) side = 1; else if (rc - lc >= 2) side = -1;
  const elite = level >= 2 && Math.random() < Math.min(0.35, 0.03 * level) ? pick(Object.keys(AFFIX)) : null;
  makeEnemy(pickType(), side, elite);
}

function spawnBoss() {
  const type = (level / 5) % 2 === 1 ? 'comisario' : 'general';
  const e = makeEnemy(type, Math.random() < 0.5 ? -1 : 1, null);
  e.hp = e.maxHp = TYPES[type].hp * (1 + 0.35 * (level / 5 - 1));
  boss = e;
  showBanner('¡JEFE: ' + TYPES[type].name + '!');
  sfx('boss');
  setBpm();
}

function chooseAttack(e) {
  const T = e.T, r = Math.random();
  if (T.charge && r < 0.25) { e.state = 'chargeWind'; e.t = 40; e.dir = Math.sign(mari.x - e.x) || 1; return; }
  if (T.summon && r < 0.45 && enemies.filter((o) => o.alive && !o.T.boss).length < 3) { e.state = 'summon'; e.t = 50; return; }
  if (T.grenade && r < 0.6) { e.state = 'aimThrow'; e.t = 30; e.grenade = true; return; }
  e.seq = pick(T.attacks); e.si = 0; e.atkH = e.seq[0];
  e.state = 'wind'; e.t = Math.max(8, T.wind * e.windMul) | 0;
}

function tryRanged(e) {
  const T = e.T;
  if (Math.random() > (0.004 + level * 0.0012) * (e.elite === 'FURIOSO' ? 2 : 1)) return;
  if (T.shoot) { e.state = 'aimShoot'; e.t = Math.max(18, 36 * e.windMul) | 0; e.kindShot = Math.random() < 0.5 ? 'ball' : 'gas'; }
  else if (T.taser) { e.state = 'aimShoot'; e.t = Math.max(16, 30 * e.windMul) | 0; e.kindShot = 'taser'; }
  else if (T.bottle) { e.state = 'aimThrow'; e.t = Math.max(18, 30 * e.windMul) | 0; e.grenade = false; }
}

function fireShot(e) {
  const k = e.kindShot;
  const spec = { ball: [21, 2.4], gas: [2, 1.5], taser: [14, 3.4] }[k];
  projs.push({ kind: k, x: e.x + e.dir * 10, h: spec[0], vx: e.dir * spec[1], friendly: false, t: 0, hits: new Set() });
  smoke(e.x + e.dir * 12, GROUND - 1 - (k === 'gas' ? 6 : spec[0]), 4);
  sfx(k === 'taser' ? 'taser' : 'shoot');
}

function throwArc(e) {
  const tf = 44, g = 0.22, h0 = 26 * (e.scale || 1);
  const tx = mari.x + rand(-6, 6);
  projs.push({ kind: e.grenade ? 'grenade' : 'bottle', arc: true, x: e.x, h: h0, vx: (tx - e.x) / tf,
               vy: (0.5 * g * tf * tf - h0) / tf, g, t: 0, friendly: false, hits: new Set() });
  sfx('swing');
}

function updEnemy(e) {
  const m = mari, T = e.T, dx = m.x - e.x, dist = Math.abs(dx);
  if (e.blockT > 0) e.blockT--;
  if (e.shootCD > 0) e.shootCD--;
  if (e.flash > 0) e.flash--;
  if (e.elite === 'REGENERA' && e.alive && e.hp < e.maxHp && ++e.regenT >= 120) {
    e.regenT = 0; e.hp = Math.min(e.maxHp, e.hp + 1);
    sparks(e.x, GROUND - 30, '#7dff7d', 4);
  }
  if (e.state === 'walk' || e.state === 'idle') e.dir = dx >= 0 ? 1 : -1;
  const reach = e.range + (e.scale > 1 ? 8 : 0);
  const furious = e.elite === 'FURIOSO' ? 0.5 : 1;

  switch (e.state) {
    case 'walk': {
      if (dist <= reach) { e.state = 'idle'; e.t = (Math.max(8, rand(25, 60) - level * 3) * furious) | 0; break; }
      let blockedBy = false;
      if (!T.boss) {
        for (const o of enemies) {
          if (o === e || !o.alive || o.side !== e.side) continue;
          const od = (o.x - e.x) * e.dir;
          if (od > 0 && od < 13 + (o.scale > 1 ? 8 : 0)) { blockedBy = true; break; }
        }
      }
      if (!blockedBy) { e.x += e.dir * e.speed; e.anim++; }
      if (m.state !== 'ko' && e.x > 6 && e.x < W - 6 && e.shootCD <= 0 && dist > 45 && dist < 150) tryRanged(e);
      break;
    }
    case 'idle':
      if (m.state === 'ko') break;
      if (dist > reach + 4) { e.state = 'walk'; break; }
      if (--e.t <= 0) chooseAttack(e);
      break;
    case 'wind':
      if (--e.t <= 0) { e.state = 'attack'; e.t = 12; e.hitChecked = false; sfx('swing'); }
      break;
    case 'attack':
      e.t--;
      if (!e.hitChecked && e.t <= 9) {
        e.hitChecked = true;
        if (dist <= reach + 6 && dx * e.dir > -2 && m.state !== 'ko') {
          const avoided = e.atkH === 'H' ? isLow(m) : m.y > 4;
          if (avoided) { if (m.inv <= 0) dodgeReward(); } else hurtMari(e.dir, e.dmg, e);
        }
      }
      if (e.t <= 0) {
        if (e.si + 1 < e.seq.length) {
          e.si++; e.atkH = e.seq[e.si]; e.state = 'wind'; e.t = Math.max(6, 12 * e.windMul) | 0;
        } else {
          e.state = 'idle'; e.t = (Math.max(20, rand(50, 90) - level * 4) * furious) | 0;
        }
      }
      break;
    case 'aimShoot':
      if (--e.t <= 0) { fireShot(e); e.state = 'walk'; e.shootCD = (Math.max(90, 240 - level * 8) * furious) | 0; }
      break;
    case 'aimThrow':
      if (--e.t <= 0) { throwArc(e); e.state = T.boss ? 'idle' : 'walk'; e.t = 40; e.shootCD = (Math.max(100, 260 - level * 8) * furious) | 0; }
      break;
    case 'chargeWind':
      if (--e.t <= 0) {
        e.state = 'charge'; e.hitChecked = false;
        e.chargeTo = e.dir > 0 ? Math.min(W - 24, m.x + 90) : Math.max(24, m.x - 90);
        sfx('charge');
      }
      break;
    case 'charge':
      e.x += e.dir * 4.2;
      if (frame % 3 === 0) dust(e.x - e.dir * 10, 1);
      if (!e.hitChecked && Math.abs(e.x - m.x) < 10) {
        e.hitChecked = true;
        if (m.y > 6) dodgeReward(); else if (m.state !== 'ko') hurtMari(e.dir, 2, e);
      }
      if ((e.dir > 0 && e.x >= e.chargeTo) || (e.dir < 0 && e.x <= e.chargeTo)) {
        e.state = 'tired'; e.t = 70; shake = Math.max(shake, 4);
        popup(e.x, headY(e) + 4, 'AGOTADO', '#ffe14d');
      }
      break;
    case 'tired':
      if (--e.t <= 0) { e.state = 'idle'; e.t = 20; }
      break;
    case 'summon':
      e.t--;
      if (e.t === 20) {
        makeEnemy(T.summon, -1, null); makeEnemy(T.summon, 1, null);
        popup(e.x, headY(e) + 4, '¡REFUERZOS!', '#ff8080');
      }
      if (e.t <= 0) { e.state = 'idle'; e.t = 40; }
      break;
    case 'evade':
      e.x += e.vx; e.vx *= 0.82;
      if (--e.t <= 0) { e.state = 'idle'; e.t = 10; }
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
  if (e.alive) e.x = clamp(e.x, -40, W + 40);
}

function explode(p) {
  const m = mari, big = p.kind === 'grenade', radius = big ? 26 : 14;
  if (big) {
    burst(p.x, GROUND - 4, ['#ffd23f', '#ff7a2a', '#ff3b3b', '#444444'], 34, 3);
    smoke(p.x, GROUND - 6, 10);
    shake = Math.max(shake, 6); sfx('boom');
  } else {
    burst(p.x, GROUND - 3, ['#2e8b3e', '#9fe0a8', '#e8f8ea'], 16, 2);
    sfx('glass');
  }
  if (Math.abs(p.x - m.x) < radius && m.y < 8) hurtMari(Math.sign(m.x - p.x) || 1, big ? 2 : 1, null);
  if (big) {
    for (const e of enemies) {
      if (hittable(e) && !e.T.boss && Math.abs(e.x - p.x) < radius) hitEnemy(e, { dmg: 2, h: 'low', trip: true, key: 'boom' }, Math.sign(e.x - p.x) || 1, false);
    }
  }
}

function updProjs() {
  const m = mari;
  for (const p of projs) {
    p.t++;
    p.x += p.vx;
    if (p.arc) {
      p.vy -= p.g; p.h += p.vy;
      if (p.h <= 0) { p.h = 0; explode(p); p.dead = true; }
      continue;
    }
    if (p.kind === 'gas' && p.t % 3 === 0) smoke(p.x, GROUND - 4);
    if (p.kind === 'taser' && p.t % 2 === 0) parts.push({ x: p.x, y: GROUND - 1 - p.h + rand(-2, 2), vx: 0, vy: 0, g: 0, life: 6, c: '#fff36a', s: 1 });
    if (!p.friendly) {
      if (Math.abs(p.x - m.x) < 5 && m.state !== 'ko' && m.inv <= 0) {
        let hit = false;
        if (p.kind === 'ball') hit = !isLow(m) && m.y < 14;
        else if (p.kind === 'gas') hit = m.y < 5;
        else if (p.kind === 'taser') hit = m.y < 10;
        if (hit) {
          if (hurtMari(Math.sign(p.vx), 1, null) && p.kind === 'taser' && m.state !== 'ko') { m.state = 'stun'; m.t = 45; }
          if (p.kind === 'gas') smoke(p.x, GROUND - 4, 10);
          p.dead = true;
        }
      }
      if (!p.dead && (p.x - m.x) * Math.sign(p.vx) > 8) p.friendly = true;
    } else {
      for (const e of enemies) {
        const extra = e.scale > 1 ? 8 : 0;
        if (!hittable(e) || p.hits.has(e) || Math.abs(e.x - p.x) >= 6 + extra) continue;
        if ((e.x - p.x) * Math.sign(p.vx) < -4 - extra) continue;
        p.hits.add(e);
        const dir = Math.sign(p.vx);
        if (p.kind === 'slipper') {
          if (!p.pierce && blocked(e, { h: 'mid' }, dir)) { blockHit(e, dir); p.dead = true; break; }
          hitEnemy(e, { dmg: 2, h: 'mid', key: 'slipper' }, dir, false);
        } else {
          hitEnemy(e, p.kind === 'gas' ? { dmg: 1, h: 'low', trip: !e.T.boss } : { dmg: 1, h: 'high' }, dir, false);
          if (p.kind === 'gas') smoke(p.x, GROUND - 4, 10);
          popup(e.x, headY(e) - 10, '¡FUEGO AMIGO!', '#ffa040');
        }
        if (!p.pierce) { p.dead = true; break; }
      }
    }
    if (p.x < -30 || p.x > W + 30) p.dead = true;
  }
  projs = projs.filter((p) => !p.dead);
}

function updPickups() {
  const m = mari;
  for (const p of pickups) {
    if (!p.landed) {
      p.vy -= p.g; p.h += p.vy; p.x += p.vx;
      if (p.h <= 0) { p.h = 0; p.landed = true; dust(p.x, 3); }
    } else if (p.kind === 'medal' && Math.abs(p.x - m.x) < 60) p.x += Math.sign(m.x - p.x) * 0.6;
    p.life--;
    if (Math.abs(p.x - m.x) < 8 && p.h < 28 && m.state !== 'ko') {
      p.dead = true;
      if (p.kind === 'medal') {
        popup(m.x, GROUND - 36, '¡MEDALLA!', '#ffd23f');
        queueChoice('medal');
        sfx('medal');
      } else {
        m.hp = Math.min(m.st.maxHp, m.hp + m.st.tortillaHeal);
        popup(m.x, GROUND - 36, '+VIDA', '#ff7b9a');
        sfx('pickup');
      }
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
    const alive = enemies.filter((e) => e.alive && !e.T.boss).length;
    const cap = boss ? 2 : Math.min(2 + level, 8);
    if (alive < cap) spawnEnemy();
    spawnT = (Math.max(45, 170 - level * 10) * rand(0.7, 1.2) * (boss ? 2 : 1)) | 0;
  }
  if (comboT > 0 && --comboT === 0) combo = 0;
  if (choiceQueue.length && mari.state !== 'ko' && hitstop === 0) openChoice(choiceQueue.shift());
}

function update() {
  frame++;
  if (pressed.KeyM) { AU.musicOn = !AU.musicOn; showBanner(AU.musicOn ? 'MUSICA ON' : 'MUSICA OFF'); }
  if (state === 'title') {
    if (pressed.Enter || pressed.Space || pressed.Tap) startGame();
  } else if (state === 'play') {
    if (pressed.KeyP || pressed.Escape) paused = !paused;
    if (!paused) {
      if (hitstop > 0) hitstop--;
      else step();
    }
  } else if (state === 'choose') {
    updChoice();
  } else if (state === 'over') {
    overT++;
    if (overT > 60 && (pressed.Enter || pressed.Space || pressed.Tap)) startGame();
  }
  if (!paused && state !== 'choose') {
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
    parts = parts.filter((p) => p.life > 0);
    for (const p of popups) { p.y -= 0.4; p.t--; }
    popups = popups.filter((p) => p.t > 0);
    if (banners.length && --banners[0].t <= 0) banners.shift();
    if (vecina.t > 0) vecina.t--;
    if (flash > 0) flash--;
    shake *= 0.85; if (shake < 0.5) shake = 0;
    for (const c of clouds) { c.x += c.s; if (c.x > W + 10) c.x = -20; }
  }
  if (superBtn) {
    const ready = state === 'play' && mari.rage >= 100;
    if (superBtn.classList.contains('ready') !== ready) superBtn.classList.toggle('ready', ready);
  }
  tapPos = null;
  for (const k in pressed) delete pressed[k];
}

// ---------------------------------------------------------------- RENDER
function drawProjectile(p) {
  const x = Math.round(p.x), y = GROUND - 1 - Math.round(p.h);
  switch (p.kind) {
    case 'ball': R(ctx, x - 1, y - 1, 3, 3, '#2a2a2a'); R(ctx, x - 1, y - 1, 1, 1, '#777'); break;
    case 'gas':
      R(ctx, x - 2, y - 3, 5, 4, '#6b7350'); R(ctx, x - 2, y - 3, 5, 1, '#9aa47a');
      R(ctx, x + (p.vx > 0 ? 3 : -3), y - 2, 1, 2, '#333'); break;
    case 'taser': R(ctx, x - 2, y, 4, 1, '#fff36a'); R(ctx, x - 1, y - 1, 2, 3, 'rgba(255,243,106,0.5)'); break;
    case 'bottle': {
      R(ctx, x, GROUND - 1, 3, 1, 'rgba(0,0,0,0.3)');
      const up = (p.t >> 2) % 2;
      R(ctx, x - (up ? 0 : 2), y - (up ? 3 : 1), up ? 2 : 5, up ? 5 : 2, '#2e8b3e');
      R(ctx, x, y - 1, 1, 1, '#9fe0a8'); break;
    }
    case 'grenade':
      R(ctx, x - 2, GROUND - 1, 5, 1, 'rgba(0,0,0,0.35)');
      R(ctx, x - 2, y - 2, 4, 4, '#3a3f2a'); R(ctx, x - 1, y - 4, 2, 2, '#6a6a5a');
      if ((p.t >> 1) % 2) R(ctx, x, y - 5, 1, 1, '#ff7a2a'); break;
    case 'slipper': {
      const f = (p.t >> 2) % 4;
      const w = f % 2 ? 2 : 6, h = f % 2 ? 6 : 2;
      R(ctx, x - (w >> 1), y - (h >> 1), w, h, '#7a3a8a');
      R(ctx, x - (w >> 1), y - (h >> 1), w, 1, '#c78ad8'); break;
    }
  }
}

function drawWorld() {
  for (const e of enemies) if (e.state === 'ko' || e.state === 'tripped') drawEnemy(e);
  for (const p of pickups) {
    if (p.life < 120 && (frame >> 2) % 2) continue;
    if (p.landed) R(ctx, Math.round(p.x) - 4, GROUND - 1, 8, 1, 'rgba(0,0,0,0.25)');
    if (p.kind === 'medal') drawMedal(p.x, GROUND - 1 - p.h);
    else drawTortilla(p.x, GROUND - 1 - p.h);
  }
  for (const e of enemies) if (e.state !== 'ko' && e.state !== 'tripped') drawEnemy(e);
  drawMari(mari, mariPose(mari));
  for (const e of enemies) drawTelegraph(e);
  for (const p of projs) drawProjectile(p);
}

function drawParticlesAndPopups() {
  for (const p of parts) {
    const s = toScreen(p.x, p.y);
    R(ctx, Math.round(s.x - p.s / 2), Math.round(s.y - p.s / 2), p.s, p.s, p.c);
  }
  for (const p of popups) {
    const s = toScreen(p.x, p.y);
    text(p.s, s.x, s.y, p.c, 1, 'center', '#000');
  }
}

function drawHUD() {
  const s = mari.st;
  R(ctx, 0, 0, W, 19, 'rgba(0,0,0,0.55)');
  text('MARICARMEN', 4, 2, '#ffd23f');
  for (let i = 0; i < s.maxHp; i++) heart(4 + i * 6, 8, i < mari.hp);
  const full = mari.rage >= 100;
  R(ctx, 4, 15, 50, 2, '#3a1010');
  R(ctx, 4, 15, Math.round(50 * mari.rage / 100), 2, full && (frame >> 3) % 2 ? '#ffd23f' : '#e03030');
  if (full) text(touchMode ? 'GRITO!' : 'D: GRITO', 58, 13, (frame >> 3) % 2 ? '#ffd23f' : '#ff8a3d');
  if (s.curlers) R(ctx, 96, 15, 4, 2, s.curlT <= 0 ? '#ff8ac8' : '#5a3048');

  text('NIVEL ' + level, 160, 2, '#ffffff', 1, 'center');
  if (!boss) {
    R(ctx, 140, 9, 40, 1, '#333a55');
    R(ctx, 140, 9, Math.round(40 * levelKills / killsNeeded()), 1, '#9fd3ff');
  }
  if (combo >= 4) text('COMBO X' + mult(), 160, 12, (frame >> 2) % 2 ? '#ffd23f' : '#ff8a3d', 1, 'center');
  text(String(score).padStart(7, '0'), 316, 2, '#ffffff', 1, 'right');
  text('RECORD ' + String(Math.max(hi, score)).padStart(7, '0'), 316, 9, '#9a9aa6', 1, 'right');

  if (boss) {
    R(ctx, 59, 21, 202, 6, 'rgba(0,0,0,0.7)');
    R(ctx, 60, 22, Math.max(0, Math.round(200 * boss.hp / boss.maxHp)), 4, '#e03030');
    R(ctx, 60, 22, Math.max(0, Math.round(200 * boss.hp / boss.maxHp)), 1, '#ff8080');
    text(boss.T.name, 160, 29, '#ffd23f', 1, 'center', '#000');
  }
  if (playT < 1500 && mari.state !== 'ko') {
    const hints = touchMode ? HINTS_TOUCH : HINTS_KB;
    text(hints[Math.floor(playT / 300) % hints.length], 160, 174, '#ffffff', 1, 'center', '#000');
  }
}

function drawChoice() {
  const ch = choice;
  R(ctx, 0, 0, W, H, 'rgba(5,6,18,0.82)');
  const title = { level: '¡NIVEL ' + level + '! ELIGE UNA MEJORA', medal: '¡MEDALLA! ELIGE UNA MEJORA',
                  boss: '¡JEFE DERROTADO! ELIGE UNA MEJORA' }[ch.src];
  text(title, 160, 14, '#ffd23f', 1, 'center', '#000');
  const n = ch.cards.length, cw = 96, ch_ = 108, gap = 8;
  const x0 = Math.round(160 - (n * cw + (n - 1) * gap) / 2);
  ch.rects = [];
  ch.cards.forEach((c, i) => {
    const sel = i === ch.sel;
    const x = x0 + i * (cw + gap), y = sel ? 28 : 32;
    ch.rects.push({ x, y, w: cw, h: ch_ });
    const rc = RARITY[c.r].c;
    R(ctx, x, y, cw, ch_, sel && (frame >> 3) % 2 ? '#ffffff' : rc);
    R(ctx, x + 2, y + 2, cw - 4, ch_ - 4, sel ? '#262a55' : '#1a1d3a');
    text(RARITY[c.r].name, x + cw / 2, y + 6, rc, 1, 'center');
    R(ctx, x + 8, y + 13, cw - 16, 1, rc);
    let ty = y + 18;
    for (const ln of wrap(c.name, 22)) { text(ln, x + cw / 2, ty, '#ffd23f', 1, 'center'); ty += 8; }
    ty += 4;
    for (const ln of wrap(c.desc, 22)) { text(ln, x + cw / 2, ty, '#ffffff', 1, 'center'); ty += 7; }
    const lvl = mari.st.stacks[c.id] || 0;
    text(c.max > 1 ? 'NIVEL ' + (lvl + 1) + '/' + c.max : 'HABILIDAD', x + cw / 2, y + ch_ - 10, '#9a9aa6', 1, 'center');
  });
  if (ch.t >= 25 && (frame >> 4) % 2 === 0) {
    text(touchMode ? 'TOCA UNA CARTA PARA ELEGIRLA' : '< > ELEGIR      ENTER O Z: CONFIRMAR', 160, 150, '#ffffff', 1, 'center');
  }
}

function ownedList() {
  return CARDS.filter((c) => mari.st.stacks[c.id]).map((c) => c.name + (mari.st.stacks[c.id] > 1 ? ' X' + mari.st.stacks[c.id] : ''));
}

function drawOwned(y, max) {
  const list = ownedList().slice(0, max);
  if (!list.length) { text('SIN MEJORAS TODAVIA', 160, y, '#9a9aa6', 1, 'center'); return; }
  list.forEach((s, i) => text(s, i % 2 ? 236 : 84, y + Math.floor(i / 2) * 7, '#9fd3ff', 1, 'center'));
}

function drawTitle() {
  R(ctx, 26, 18, 268, 100, 'rgba(10,12,30,0.8)');
  R(ctx, 26, 18, 268, 1, '#ffd23f'); R(ctx, 26, 117, 268, 1, '#ffd23f');
  text('MARICARMEN', 160, 22, '#ffd23f', 3, 'center', '#a32020');
  text('LA DEFENSA DEL PORTAL', 160, 41, '#ffffff', 1, 'center');
  if (touchMode) {
    text('CRUCETA: MOVERSE, ARRIBA SALTA, ABAJO AGACHA', 160, 51, '#9fd3ff', 1, 'center');
    text('BOTONES: PUÑO, CODO, RODILLA,', 160, 59, '#9fd3ff', 1, 'center');
    text('PATADA ALTA, PATADA BAJA Y GRITO', 160, 67, '#9fd3ff', 1, 'center');
    text('DOBLE TOQUE EN LA CRUCETA: PASO LIGERO', 160, 75, '#9fd3ff', 1, 'center');
  } else {
    text('< > MOVERSE    ARRIBA SALTAR    ABAJO AGACHARSE', 160, 51, '#9fd3ff', 1, 'center');
    text('Z PUÑETAZO   X CODAZO   C RODILLAZO', 160, 59, '#9fd3ff', 1, 'center');
    text('A PATADA ALTA   S PATADA BAJA   D GRITO', 160, 67, '#9fd3ff', 1, 'center');
    text('DOBLE TOQUE < O >: PASO LIGERO', 160, 75, '#9fd3ff', 1, 'center');
  }
  text('! ROJO: AGACHATE  ! AMARILLO: SALTA  ! AZUL: APARTATE', 160, 84, '#ffb070', 1, 'center');
  text('MEDALLAS Y NIVELES DAN MEJORAS. JEFES CADA 5 NIVELES', 160, 92, '#ff8080', 1, 'center');
  text(touchMode ? 'ARRIBA: MUSICA, PAUSA Y PANTALLA COMPLETA' : 'M MUSICA   P PAUSA   F PANTALLA COMPLETA', 160, 100, '#9a9aa6', 1, 'center');
  if ((frame >> 5) % 2 === 0) text(touchMode ? 'TOCA PARA EMPEZAR' : 'PULSA ENTER', 160, 109, '#ffffff', 1, 'center', '#000');
  text('RECORD ' + String(hi).padStart(7, '0'), 160, 3, '#ffffff', 1, 'center', '#000');
}

const titleMari = { x: 160, y: 0, dir: 1, inv: 0, state: 'idle', st: null };
const titleCop = { type: 'cop', T: TYPES.cop, x: 104, y: 0, dir: 1, state: 'idle', t: 99, alive: true };
const titleNazi = { type: 'nazi', T: TYPES.nazi, x: 216, y: 0, dir: -1, state: 'idle', t: 99, alive: true };

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (want3D()) ensure3D();
  const in3D = use3D();
  glCanvas.style.visibility = in3D ? 'visible' : 'hidden';
  if (in3D) {
    if (!r3dShown) { r3dShown = true; r3d.intro(); showBanner('¡MODO 3D!'); }
    ctx.clearRect(0, 0, W, H);
    r3d.render(world3D());
    for (const e of enemies) drawTelegraph(e);
    drawParticlesAndPopups();
    drawOverlays();
    return;
  }
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
    titleMari.dir = (frame >> 6) % 2 ? 1 : -1;
    drawMari(titleMari, 'stand');
  } else {
    drawWorld();
  }
  drawParticlesAndPopups();
  ctx.restore();
  drawOverlays();
}

function drawOverlays() {
  if (state === 'title') drawTitle();
  else drawHUD();

  if (flash > 0) R(ctx, 0, 0, W, H, 'rgba(255,255,230,' + (flash / 12).toFixed(2) + ')');
  if (banners.length && state !== 'choose') {
    text(banners[0].text, 160, 52, (frame >> 3) % 2 ? '#ffd23f' : '#ffffff', 2, 'center', '#000');
  }
  if (state === 'choose') drawChoice();
  if (state === 'play' && paused) {
    R(ctx, 0, 0, W, H, 'rgba(0,0,0,0.6)');
    text('PAUSA', 160, 40, '#ffffff', 3, 'center', '#000');
    text('MEJORAS', 160, 66, '#ffd23f', 1, 'center');
    drawOwned(76, 20);
  }
  if (state === 'over') {
    R(ctx, 30, 36, 260, 118, 'rgba(10,12,30,0.88)');
    text('FIN DE LA PARTIDA', 160, 42, '#ff3b5c', 2, 'center', '#000');
    text('PUNTOS ' + score + '    RECORD ' + hi, 160, 60, '#ffffff', 1, 'center');
    text('NIVEL ' + level + '    ENEMIGOS ' + kills, 160, 68, '#9fd3ff', 1, 'center');
    text('MEJORAS DE ESTA PARTIDA', 160, 80, '#ffd23f', 1, 'center');
    drawOwned(89, 12);
    if (overT > 60 && (frame >> 5) % 2 === 0) text(touchMode ? 'TOCA PARA JUGAR OTRA VEZ' : 'PULSA ENTER', 160, 140, '#ffffff', 1, 'center');
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
