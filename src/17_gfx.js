/* ===================================================================
   SECTION 17: GFX - procedural sprites, glow cache, parallax backdrops
   Everything is drawn in code; sprites are pre-rendered (supersampled)
   to canvases so they stay crisp on big / hi-dpi screens.
   =================================================================== */
const SS = 3; // sprite supersampling factor
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
/* sprite canvas with logical size w x h (backing store SS times larger), origin at centre */
function mkSprite(w, h, fn, ss) {
  const s = ss || SS, c = mkCanvas(w * s, h * s), x = c.getContext('2d');
  x.scale(s, s); x.translate(w / 2, h / 2); fn(x);
  c._lw = w; c._lh = h; return c;
}
/* draw a sprite canvas centred at (px,py) using its logical size */
function dimg(x, c, px, py) { const w = c._lw || c.width, h = c._lh || c.height; x.drawImage(c, px - w / 2, py - h / 2, w, h); }
function hex6(c) { return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c; }
function poly(x, pts, fill, stroke, lw) {
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
  x.closePath();
  if (fill) {
    if (fill[0] === '#' && fill.length === 7) { // metallic gradient across the bounding box
      let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
      for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; }
      const g = x.createLinearGradient(a, b, c, d);
      g.addColorStop(0, shade(fill, 0.32)); g.addColorStop(0.5, fill); g.addColorStop(1, shade(fill, -0.38));
      x.fillStyle = g;
    } else x.fillStyle = fill;
    x.fill();
  }
  if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 1.5; x.stroke(); }
  else { x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 0.8; x.stroke(); }
}
/* glossy sphere / dome */
function orb(x, cx, cy, r, col) {
  const g = x.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, shade(col, 0.55)); g.addColorStop(0.45, col); g.addColorStop(1, shade(col, -0.55));
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
}
function shade(hex, f) { // f<0 darker, f>0 lighter
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function whiteOf(c) { const o = mkCanvas(c.width, c.height), x = o.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); o._lw = c._lw; o._lh = c._lh; return o; }

const Gfx = {
  _glow: {}, _bul: {}, _en: {}, _ship: {}, _bg: {}, _vig: {},
  resetBg() { this._bg = {}; this._vig = {}; },
  /* radial additive glow sprite (radius quantised to keep the cache small) */
  glow(col, r) {
    col = hex6(col); r = Math.max(2, r <= 24 ? Math.round(r) : Math.round(r / 8) * 8);
    const k = col + r; if (this._glow[k]) return this._glow[k];
    const c = mkSprite(r * 2, r * 2, x => {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, col); g.addColorStop(0.3, col + 'aa'); g.addColorStop(0.65, col + '33'); g.addColorStop(1, col + '00');
      x.fillStyle = g; x.fillRect(-r, -r, r * 2, r * 2);
    }, 1);
    return this._glow[k] = c;
  },
  /* enemy-bullet sprite: soft halo + dark outline + colour body + white core => readable on any backdrop */
  bullet(kind, col, r) {
    col = hex6(col);
    const k = kind + col + r; if (this._bul[k]) return this._bul[k];
    const s = Math.ceil(r * 2 + 18);
    const c = mkSprite(s, s, x => {
      const hg = x.createRadialGradient(0, 0, r * 0.6, 0, 0, r + 8);
      hg.addColorStop(0, col + 'aa'); hg.addColorStop(1, col + '00'); x.fillStyle = hg; x.beginPath(); x.arc(0, 0, r + 8, 0, TAU); x.fill();
      x.fillStyle = 'rgba(10,4,18,.9)'; x.beginPath(); x.arc(0, 0, r + 2.2, 0, TAU); x.fill();
      const bg = x.createRadialGradient(0, 0, 0, 0, 0, r + 0.8);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.5, col); bg.addColorStop(1, shade(col, -0.25));
      x.fillStyle = bg; x.beginPath(); x.arc(0, 0, r + 0.8, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, Math.max(1.1, r * 0.42), 0, TAU); x.fill();
    });
    return this._bul[k] = c;
  },
  /* ---- enemies: static sprites facing DOWN ---- */
  enemy(spr, si, r) {
    const k = spr + si; if (this._en[k]) return this._en[k];
    const pal = secOf(si) ? secOf(si).pal : SECTORS[0].pal;
    const S = Math.ceil(r * 2 + 26), hull = pal.hull, dk = pal.dark, ac = pal.accent;
    const draw = SPRITES[spr] || SPRITES.dart;
    const c = mkSprite(S, S, x => {
      const hg = x.createRadialGradient(0, 0, r * 0.3, 0, 0, S / 2); const a = hex6(ac);
      hg.addColorStop(0, a + '30'); hg.addColorStop(1, a + '00'); x.fillStyle = hg; x.fillRect(-S / 2, -S / 2, S, S);
      draw(x, r, hull, dk, ac);
    });
    return this._en[k] = { c, w: whiteOf(c) };
  },
  ship(id) {
    if (this._ship[id]) return this._ship[id];
    const c = mkSprite(72, 72, x => SHIP_DRAW[id](x));
    return this._ship[id] = { c, w: whiteOf(c) };
  },
  bgBase(si) { // vertical gradient
    const k = 'g' + si + '_' + W; if (this._bg[k]) return this._bg[k];
    const pal = secOf(si).pal, c = mkCanvas(W, H), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal.bg0); g.addColorStop(1, pal.bg1);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    return this._bg[k] = c;
  },
  vignette() {
    const k = W + 'x' + H; if (this._vig[k]) return this._vig[k];
    const c = mkCanvas(W, H), x = c.getContext('2d');
    const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,6,.62)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    return this._vig[k] = c;
  }
};

/* ---------- enemy sprite painters (ctx centred, nose pointing +y/down) ---------- */
const SPRITES = {
  dart(x, r, hull, dk, ac) {
    poly(x, [[0, r], [-r * 0.9, -r * 0.8], [0, -r * 0.35], [r * 0.9, -r * 0.8]], hull, '#0008', 1.5);
    poly(x, [[0, r], [0, -r * 0.35], [r * 0.9, -r * 0.8]], dk);
    x.fillStyle = ac; x.beginPath(); x.arc(0, r * 0.1, r * 0.22, 0, TAU); x.fill();
  },
  wing(x, r, hull, dk, ac) {
    poly(x, [[0, r * 0.8], [-r * 1.25, -r * 0.2], [-r * 0.9, -r * 0.85], [-r * 0.25, -r * 0.3], [r * 0.25, -r * 0.3], [r * 0.9, -r * 0.85], [r * 1.25, -r * 0.2]], hull, '#0008', 1.5);
    poly(x, [[0, r * 0.8], [r * 1.25, -r * 0.2], [r * 0.9, -r * 0.85], [r * 0.25, -r * 0.3]], dk);
    x.fillStyle = ac; x.beginPath(); x.ellipse(0, 0, r * 0.2, r * 0.38, 0, 0, TAU); x.fill();
  },
  fighter(x, r, hull, dk, ac) {
    poly(x, [[0, r], [-r * 0.45, -r * 0.2], [-r * 0.95, -r * 0.9], [-r * 0.3, -r * 0.55], [r * 0.3, -r * 0.55], [r * 0.95, -r * 0.9], [r * 0.45, -r * 0.2]], hull, '#0008', 1.5);
    poly(x, [[0, r], [r * 0.45, -r * 0.2], [r * 0.95, -r * 0.9], [r * 0.3, -r * 0.55], [0, -r * 0.55]], dk);
    x.fillStyle = ac; x.fillRect(-r * 0.12, -r * 0.1, r * 0.24, r * 0.5);
  },
  turret(x, r, hull, dk, ac) {
    x.fillStyle = dk; x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.39; x.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); } x.closePath(); x.fill();
    x.strokeStyle = '#0009'; x.lineWidth = 2; x.stroke();
    x.fillStyle = hull; x.beginPath(); x.arc(0, 0, r * 0.75, 0, TAU); x.fill();
    x.fillStyle = shade(hull, -0.3); x.beginPath(); x.arc(0, 0, r * 0.45, 0, TAU); x.fill();
  },
  kami(x, r, hull, dk, ac) {
    const p = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = i % 2 ? r * 0.6 : r * 1.15; p.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    poly(x, p, '#c93a3a', '#300', 1.5);
    x.fillStyle = '#ffd0a0'; x.beginPath(); x.arc(0, 0, r * 0.35, 0, TAU); x.fill();
  },
  sniper(x, r, hull, dk, ac) {
    poly(x, [[0, r * 1.2], [-r * 0.35, -r * 0.2], [-r * 0.9, -r], [0, -r * 0.6], [r * 0.9, -r], [r * 0.35, -r * 0.2]], hull, '#0008', 1.5);
    x.fillStyle = dk; x.fillRect(-r * 0.12, 0, r * 0.24, r * 1.1);
    x.fillStyle = ac; x.beginPath(); x.arc(0, -r * 0.1, r * 0.3, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(0, -r * 0.1, r * 0.12, 0, TAU); x.fill();
  },
  carrier(x, r, hull, dk, ac) {
    poly(x, [[-r * 0.6, r * 0.9], [r * 0.6, r * 0.9], [r * 1.0, r * 0.1], [r * 0.9, -r * 0.8], [-r * 0.9, -r * 0.8], [-r * 1.0, r * 0.1]], hull, '#0008', 2);
    poly(x, [[r * 0.6, r * 0.9], [r * 1.0, r * 0.1], [r * 0.9, -r * 0.8], [r * 0.3, -r * 0.8], [r * 0.3, r * 0.6]], dk);
    x.fillStyle = '#0b0b12'; x.fillRect(-r * 0.5, r * 0.2, r * 0.35, r * 0.5); x.fillRect(r * 0.15, r * 0.2, r * 0.35, r * 0.5);
    x.fillStyle = ac; for (let i = -2; i <= 2; i++) x.fillRect(i * r * 0.32 - 2, -r * 0.6, 4, 4);
  },
  drone(x, r, hull, dk, ac) {
    poly(x, [[0, r], [-r * 0.9, -r * 0.6], [r * 0.9, -r * 0.6]], hull, '#0008', 1.2);
    x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.28, 0, TAU); x.fill();
  },
  mine(x, r, hull, dk, ac) {
    x.fillStyle = dk; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.save(); x.rotate(a); x.fillRect(r * 0.6, -2.5, r * 0.65, 5); x.restore(); }
    x.fillStyle = hull; x.beginPath(); x.arc(0, 0, r * 0.8, 0, TAU); x.fill(); x.strokeStyle = '#0009'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.35, 0, TAU); x.fill();
  },
  spiral(x, r, hull, dk, ac) {
    x.fillStyle = dk; x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); } x.closePath(); x.fill();
    x.fillStyle = hull; x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.5; x.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); } x.closePath(); x.fill(); x.strokeStyle = '#0009'; x.lineWidth = 2; x.stroke();
    for (let i = 0; i < 3; i++) { x.save(); x.rotate(i / 3 * TAU); x.fillStyle = shade(hull, -0.4); x.fillRect(-3, 0, 6, r * 1.0); x.restore(); }
    x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.3, 0, TAU); x.fill();
  },
  gunship(x, r, hull, dk, ac) {
    poly(x, [[0, r * 0.9], [-r * 0.5, r * 0.4], [-r * 1.2, -r * 0.3], [-r * 1.0, -r * 0.9], [r * -0.3, -r * 0.6], [r * 0.3, -r * 0.6], [r * 1.0, -r * 0.9], [r * 1.2, -r * 0.3], [r * 0.5, r * 0.4]], hull, '#0008', 2);
    poly(x, [[0, r * 0.9], [r * 0.5, r * 0.4], [r * 1.2, -r * 0.3], [r * 1.0, -r * 0.9], [r * 0.3, -r * 0.6], [0, -r * 0.6]], dk);
    x.fillStyle = '#0b0b12'; x.fillRect(-r * 0.2, r * 0.1, r * 0.4, r * 0.8);
    x.fillStyle = ac; x.beginPath(); x.arc(0, r * 0.15, r * 0.22, 0, TAU); x.fill();
  },
  frigate(x, r, hull, dk, ac) {
    poly(x, [[0, r * 1.1], [-r * 0.5, r * 0.5], [-r * 0.6, -r * 0.9], [r * 0.6, -r * 0.9], [r * 0.5, r * 0.5]], hull, '#0008', 2);
    poly(x, [[0, r * 1.1], [r * 0.5, r * 0.5], [r * 0.6, -r * 0.9], [r * 0.15, -r * 0.9], [r * 0.15, r * 0.4]], dk);
    for (const s of [-1, 1]) { x.fillStyle = dk; x.fillRect(s * r * 0.75 - r * 0.22, -r * 0.5, r * 0.44, r * 0.95); x.fillStyle = ac; x.fillRect(s * r * 0.75 - 3, r * 0.3, 6, 5); }
  },
  cargo(x, r, hull, dk, ac) {
    poly(x, [[-r, -r * 0.7], [r, -r * 0.7], [r, r * 0.7], [-r, r * 0.7]], '#d9a526', '#3a2a00', 1.5);
    x.fillStyle = '#fff3a8'; x.fillRect(-r * 0.6, -r * 0.4, r * 1.2, r * 0.3);
    x.fillStyle = '#7a5a00'; x.fillRect(-r * 0.15, -r * 0.7, r * 0.3, r * 1.4);
  },
  rockjaw(x, r, hull, dk, ac) {
    poly(x, [[0, r * 0.8], [-r * 0.6, r * 0.5], [-r * 1.2, -r * 0.2], [-r * 0.9, -r], [0, -r * 0.7], [r * 0.9, -r], [r * 1.2, -r * 0.2], [r * 0.6, r * 0.5]], hull, '#0009', 2.5);
    poly(x, [[0, r * 0.8], [r * 0.6, r * 0.5], [r * 1.2, -r * 0.2], [r * 0.9, -r], [0, -r * 0.7]], dk);
    x.fillStyle = '#0b0b12'; x.beginPath(); x.moveTo(-r * 0.5, r * 0.3); x.lineTo(r * 0.5, r * 0.3); x.lineTo(0, r * 0.75); x.fill();
    x.fillStyle = ac; x.beginPath(); x.arc(0, -r * 0.15, r * 0.25, 0, TAU); x.fill();
  },
  grindstone(x, r, hull, dk, ac) {
    // lumpy asteroid fortress, hand-laid polygon + plates
    const p = []; const rr = RNG('grind'); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; p.push([Math.cos(a) * r * (0.85 + rr() * 0.28), Math.sin(a) * r * (0.78 + rr() * 0.26)]); }
    poly(x, p, hull, '#000a', 3);
    for (let i = 0; i < 7; i++) { x.fillStyle = shade(dk, rr() * 0.3); x.beginPath(); x.arc((rr() - 0.5) * r * 1.3, (rr() - 0.5) * r * 1.1, 4 + rr() * 9, 0, TAU); x.fill(); }
    x.fillStyle = '#26202a'; x.fillRect(-r * 0.8, r * 0.1, r * 1.6, r * 0.18);
    x.fillStyle = '#26202a'; x.fillRect(-r * 0.12, -r * 0.7, r * 0.24, r * 1.4);
  }
};

/* ---------- player ship painters (nose up) ---------- */
const SHIP_DRAW = {
  vanguard(x) {
    poly(x, [[0, -26], [-7, -6], [-26, 14], [-22, 22], [-8, 14], [-5, 24], [5, 24], [8, 14], [22, 22], [26, 14], [7, -6]], '#c9e4ff', '#0a1730', 2);
    poly(x, [[0, -26], [7, -6], [26, 14], [22, 22], [8, 14], [5, 24], [0, 24]], '#6fa3d6');
    poly(x, [[0, -18], [-4, -4], [0, 4], [4, -4]], '#16314f'); x.fillStyle = '#6df0ff'; x.beginPath(); x.ellipse(0, -6, 2.5, 5, 0, 0, TAU); x.fill();
  },
  striker(x) {
    poly(x, [[0, -28], [-5, -8], [-28, 6], [-24, 14], [-8, 8], [-9, 22], [-3, 24], [0, 16], [3, 24], [9, 22], [8, 8], [24, 14], [28, 6], [5, -8]], '#ffd9a0', '#301800', 2);
    poly(x, [[0, -28], [5, -8], [28, 6], [24, 14], [8, 8], [9, 22], [3, 24], [0, 16]], '#d98a30');
    x.fillStyle = '#ff4d3d'; x.beginPath(); x.ellipse(0, -8, 2.2, 6, 0, 0, TAU); x.fill();
  },
  bulwark(x) {
    poly(x, [[0, -24], [-10, -10], [-28, -2], [-30, 14], [-18, 22], [-8, 18], [-6, 26], [6, 26], [8, 18], [18, 22], [30, 14], [28, -2], [10, -10]], '#cfe9b0', '#0f2208', 2.2);
    poly(x, [[0, -24], [10, -10], [28, -2], [30, 14], [18, 22], [8, 18], [6, 26], [0, 26]], '#6ea040');
    x.fillStyle = '#0f2208'; x.fillRect(-14, 0, 6, 12); x.fillRect(8, 0, 6, 12);
    x.fillStyle = '#9dff5a'; x.beginPath(); x.ellipse(0, -8, 3.5, 6, 0, 0, TAU); x.fill();
  }
};

/* ===================== BACKDROPS (parallax) ===================== */
const BG_EXTRA = {}; // per-sector scenery hooks: { nebula, planet, init(bg, r), draw(x, bg, pal) }
const Bg = {
  si: 0, stars: [], rocks: [], spores: [], tile: null, lights: [], nebula: null, planet: null, px: 0, py: 0, streaks: [], off: 0, gridLines: [],
  init(si) {
    this.si = si; this.off = 0;
    const r = RNG('bg' + si), wf = W / 480;
    this.stars = [];
    for (let l = 0; l < 3; l++) for (let i = 0; i < Math.round((46 - l * 10) * wf); i++) this.stars.push({ x: r() * W, y: r() * H, l, s: 0.7 + l * 0.55, a: 0.25 + r() * 0.6 });
    this.rocks = []; this.spores = []; this.tile = null; this.lights = [];
    this.streaks = []; for (let i = 0; i < Math.round(16 * wf); i++) this.streaks.push({ x: r() * W, y: r() * H, len: 30 + r() * 80, sp: 380 + r() * 420, a: 0.04 + r() * 0.07 });
    const id = secOf(si).id;
    this.nebula = this.makeNebula(r, id);
    this.planet = this.makePlanet(r, id); this.px = W * (0.15 + r() * 0.7); this.py = -260 - r() * 160;
    if (id === 'belt') {
      for (let i = 0; i < Math.round(18 * wf); i++) {
        const n = 10 + (r() * 5 | 0), d = 0.25 + r() * 0.75, rad = 14 + r() * 52 * d, pts = [];
        for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = rad * (0.72 + r() * 0.4); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        const cr = []; for (let k = 0; k < 4; k++) cr.push([(r() - 0.5) * rad, (r() - 0.5) * rad, 2 + r() * rad * 0.2]);
        this.rocks.push({ x: r() * W, y: r() * H, d, pts, cr, rad, a: r() * TAU, sp: (r() - 0.5) * 0.4 });
      }
    } else if (id === 'station') {
      this.tile = this.makeStationTile(r);
    } else if (id === 'hive') {
      for (let i = 0; i < 50 * wf; i++) this.spores.push({ x: r() * W, y: r() * H, s: 1 + r() * 2.6, sp: 15 + r() * 40, ph: r() * TAU });
    } else if (id === 'secret') {
      for (let i = 0; i < 40 * wf; i++) this.spores.push({ x: r() * W, y: r() * H, s: 1 + r() * 3, sp: 40 + r() * 80, ph: r() * TAU });
    } else if (BG_EXTRA[id]) BG_EXTRA[id].init(this, r);
  },
  makeStationTile(r) {
    const c = mkCanvas(W * 2, H * 2), x = c.getContext('2d'); x.scale(2, 2);
    const pal = secOf(this.si).pal;
    x.fillStyle = shade(pal.dark, -0.15); x.globalAlpha = 0.55;
    const cols = [18, 70, W - 70, W - 18]; if (W > 700) cols.push(W * 0.28, W * 0.72);
    for (const gx of cols) x.fillRect(gx - 9, 0, 18, H);
    for (let y = 0; y < H; y += 120) { x.fillRect(0, y + 8, W, 10); x.fillRect(0, y + 60, W, 4); }
    x.globalAlpha = 0.75; x.strokeStyle = shade(pal.hull, -0.5); x.lineWidth = 2;
    for (const gx of cols) for (let y = 0; y < H; y += 60) { x.beginPath(); x.moveTo(gx - 9, y); x.lineTo(gx + 9, y + 60); x.moveTo(gx + 9, y); x.lineTo(gx - 9, y + 60); x.stroke(); }
    for (let i = 0; i < 26 * (W / 480); i++) {
      const px = 90 + r() * (W - 240), py = r() * H, pw = 24 + r() * 70, ph = 14 + r() * 40;
      x.globalAlpha = 0.25 + r() * 0.25; const gr = x.createLinearGradient(px, py, px + pw, py + ph); gr.addColorStop(0, shade(pal.dark, 0.3)); gr.addColorStop(1, shade(pal.dark, -0.2));
      x.fillStyle = gr; x.fillRect(px, py, pw, ph); x.strokeStyle = shade(pal.dark, 0.35); x.lineWidth = 1; x.strokeRect(px + 0.5, py + 0.5, pw, ph);
    }
    this.lights = []; for (let i = 0; i < 20 * (W / 480); i++) this.lights.push({ x: 20 + r() * (W - 40), y: r() * H, ph: r() * TAU, c: r() < 0.5 ? pal.accent : '#ff4d6a' });
    return c;
  },
  makeNebula(r, id) {
    const c = mkCanvas(W, H), x = c.getContext('2d');
    const cols = { belt: ['#4a2a1c', '#2a2256', '#5a3220'], station: ['#134a8a', '#0a6a78', '#2a3a9a'], hive: ['#6a2a9a', '#2a7a4a', '#9a2a6a'], secret: ['#9a7210', '#7a3a10', '#b8901a'] }[id] || BG_EXTRA[id].nebula;
    const n = Math.round(10 * W / 480);
    for (let i = 0; i < n; i++) {
      const bx = r() * W, by = r() * H, rad = 130 + r() * 190, col = cols[i % cols.length];
      for (const oy of [-H, 0, H]) { const g = x.createRadialGradient(bx, by + oy, 0, bx, by + oy, rad); g.addColorStop(0, col + '60'); g.addColorStop(0.5, col + '28'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    }
    return c;
  },
  makePlanet(r, id) {
    const R = 150, S = R * 2 + 60;
    return mkSprite(S, S, x => {
      const body = { belt: ['#e8a45a', '#9a4a22', '#4a2210'], station: ['#6fb4ff', '#2a5aa0', '#0c2040'], hive: ['#b46fe0', '#5a2a80', '#1a0c30'], secret: ['#ffd96a', '#a8761a', '#40280a'] }[id] || BG_EXTRA[id].planet;
      const ag = x.createRadialGradient(0, 0, R * 0.95, 0, 0, R * 1.2); ag.addColorStop(0, body[0] + '66'); ag.addColorStop(1, body[0] + '00'); x.fillStyle = ag; x.beginPath(); x.arc(0, 0, R * 1.2, 0, TAU); x.fill();
      x.save(); x.beginPath(); x.arc(0, 0, R, 0, TAU); x.clip();
      const g = x.createRadialGradient(-R * 0.4, -R * 0.4, R * 0.1, 0, 0, R * 1.15); g.addColorStop(0, body[0]); g.addColorStop(0.55, body[1]); g.addColorStop(1, body[2]); x.fillStyle = g; x.fillRect(-R, -R, R * 2, R * 2);
      for (let i = 0; i < 9; i++) { x.fillStyle = (i % 2 ? '#ffffff' : '#000000') + (i % 2 ? '14' : '1c'); x.fillRect(-R, -R + i * R * 0.24 + r() * 10, R * 2, 8 + r() * 14); }
      const sh = x.createRadialGradient(R * 0.5, R * 0.5, R * 0.2, R * 0.5, R * 0.5, R * 1.3); sh.addColorStop(0, 'rgba(0,0,10,0)'); sh.addColorStop(1, 'rgba(0,0,10,.85)'); x.fillStyle = sh; x.fillRect(-R, -R, R * 2, R * 2);
      x.restore();
      if (id === 'station') { x.save(); x.rotate(-0.4); x.scale(1, 0.28); x.strokeStyle = 'rgba(190,225,255,.5)'; x.lineWidth = 12; x.beginPath(); x.arc(0, 0, R * 1.45, 0, TAU); x.stroke(); x.lineWidth = 5; x.strokeStyle = 'rgba(190,225,255,.3)'; x.beginPath(); x.arc(0, 0, R * 1.62, 0, TAU); x.stroke(); x.restore(); }
    });
  },
  update(dt, spd) {
    spd = spd === undefined ? 1 : spd; this.off += dt * spd;
    for (const s of this.stars) { s.y += dt * spd * (14 + s.l * 38); if (s.y > H) { s.y -= H + 4; s.x = Math.random() * W; } }
    for (const k of this.rocks) { k.y += dt * spd * (16 + k.d * 80); k.a += k.sp * dt; if (k.y > H + k.rad + 20) { k.y = -k.rad - 20; k.x = Math.random() * W; } }
    for (const s of this.spores) { s.y += dt * spd * s.sp; s.ph += dt; if (s.y > H + 6) { s.y = -6; s.x = Math.random() * W; } }
    for (const s of this.streaks) { s.y += dt * spd * s.sp; if (s.y > H + s.len) { s.y = -s.len; s.x = Math.random() * W; } }
    this.py += dt * spd * 6;
  },
  draw(x) {
    const si = this.si, pal = secOf(si).pal, id = secOf(si).id;
    x.drawImage(Gfx.bgBase(si), 0, 0);
    if (this.planet && this.py < H + 300) { x.globalAlpha = 0.92; dimg(x, this.planet, this.px, this.py); x.globalAlpha = 1; }
    if (this.nebula) { const o = (this.off * 22) % H; x.drawImage(this.nebula, 0, o); x.drawImage(this.nebula, 0, o - H); }
    x.fillStyle = pal.star;
    for (const s of this.stars) { x.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(this.off * 2 + s.x)); x.fillRect(s.x, s.y, s.s, s.s * (1 + s.l * 0.8)); }
    x.globalAlpha = 1;
    if (id === 'belt') {
      for (const k of this.rocks) {
        x.save(); x.translate(k.x, k.y); x.rotate(k.a); x.globalAlpha = 0.28 + k.d * 0.42;
        x.beginPath(); x.moveTo(k.pts[0][0], k.pts[0][1]); for (let i = 1; i < k.pts.length; i++) x.lineTo(k.pts[i][0], k.pts[i][1]); x.closePath();
        const gr = x.createLinearGradient(-k.rad, -k.rad, k.rad, k.rad); gr.addColorStop(0, shade(pal.hull, -0.25 - (1 - k.d) * 0.3)); gr.addColorStop(0.5, shade(pal.dark, -0.1)); gr.addColorStop(1, shade(pal.dark, -0.65));
        x.fillStyle = gr; x.fill(); x.strokeStyle = shade(pal.hull, -0.5); x.lineWidth = 1.5; x.stroke();
        x.fillStyle = 'rgba(0,0,0,.35)'; for (const c of k.cr) { x.beginPath(); x.arc(c[0], c[1], c[2], 0, TAU); x.fill(); x.strokeStyle = 'rgba(255,220,180,.18)'; x.lineWidth = 1; x.beginPath(); x.arc(c[0] - 0.6, c[1] - 0.6, c[2], 0.8, 2.6); x.stroke(); }
        x.restore();
      }
    } else if (id === 'station' && this.tile) {
      const o = (this.off * 46) % H; x.drawImage(this.tile, 0, o, W, H); x.drawImage(this.tile, 0, o - H, W, H);
      x.globalCompositeOperation = 'lighter';
      for (const l of this.lights) { const yy = (l.y + o) % H; const a = 0.35 + 0.65 * Math.max(0, Math.sin(this.off * 3 + l.ph)); x.globalAlpha = a; dimg(x, Gfx.glow(l.c, 7), l.x, yy); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    } else if (id === 'hive' || id === 'secret') {
      x.globalCompositeOperation = 'lighter';
      for (const s of this.spores) { x.globalAlpha = 0.13 + 0.1 * Math.sin(s.ph * 2); dimg(x, Gfx.glow(id === 'secret' ? '#ffd23d' : pal.accent, s.s * 2.4), s.x + Math.sin(s.ph) * 10, s.y); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    }
    if (BG_EXTRA[id]) BG_EXTRA[id].draw(x, this, pal);
    // fast foreground streaks = sense of speed
    x.globalCompositeOperation = 'lighter'; x.fillStyle = pal.star;
    for (const s of this.streaks) { x.globalAlpha = s.a; x.fillRect(s.x, s.y, 1, s.len); }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }
};
