/* ===================================================================
   SECTION 25: SECTOR 4 - SOLAR FOUNDRY. A molten forge-world: lava rivers,
   gantries, rising embers. Boss: FORGE TYRANT (4 phases, two new attacks).
   (Excluded from the --slice build.)
   =================================================================== */
SECTORS.push({
  id: 'foundry', name: 'Solar Foundry', tag: 'SECTOR 4', blurb: 'The rift feeds a furnace the size of a moon. Everything here is molten, armed, and awake.',
  pal: { bg0: '#0d0405', bg1: '#2a0a08', hull: '#b8a89a', dark: '#4a3a38', accent: '#ffb02a', glow: '#ff6a2a', star: '#ffd9b0' },
  bul: '#59d8ff', music: 'foundry', boss: 'tyrant', mini: 'slagwright',
  roster: [
    { bp: 'vee', type: 'fighter', from: 0, w: 2.5 },
    { bp: 'trio', type: 'fighter', from: 0, w: 1.5 },
    { bp: 'strafe', type: 'strafer', from: 0, w: 2 },
    { bp: 'few', type: 'sawblade', from: 0, w: 2.5 },
    { bp: 'bombrun', type: 'bomber', from: 0, w: 2 },
    { bp: 'turrets', type: 'turret', from: 0, w: 1.5 },
    { bp: 'few', type: 'tracker', from: 0, w: 1.5 },
    { bp: 'single', type: 'gunship', from: 1, w: 1.5 },
    { bp: 'single', type: 'frigate', from: 1, w: 1.5 },
    { bp: 'single', type: 'bulwark', from: 1, w: 1.5 },
    { bp: 'few', type: 'warper', from: 1, w: 1.5 },
    { bp: 'single', type: 'spiraler', from: 1, w: 1.2 },
    { bp: 'swoop', type: 'swooper', from: 1, w: 1.5 },
    { bp: 'rush', type: 'kamikaze', from: 1, w: 1.5 },
    { bp: 'mines', type: 'mine', from: 1, w: 1.5 },
    { bp: 'support', type: 'medic', from: 2, w: 1.2 },
    { bp: 'single', type: 'carrier', from: 2, w: 1.2 },
    { bp: 'snipers', type: 'sniper', from: 2, w: 1.2 }
  ]
});
MV_SETS.foundry = ['hoverdash', 'bounce', 'cross', 'circle', 'loop', 'stutter', 'zigzag'];
TRACKS.foundry = { bpm: 132, root: 41, prog: [0, -1, -5, -3], chord: [0, 3, 7, 10], scale: [0, 2, 3, 5, 7, 8, 11], bass: 'gallop', drums: 'tribal', arp: 'sawtooth', lead: 'square', leadP: 0.55, echo: 0.25 };

BOSSES.tyrant = {
  name: 'FORGE TYRANT', title: 'Warden of the Furnace', hp: 3200, r: 60, spr: 'tyrant', y: 130, score: 24000, cred: 560, scrap: 180, adds: 'sawblade',
  phases: [
    { at: 1,    atk: ['meteor', 'fan', 'stream', 'missiles'], rest: 1.1, spd: 1 },
    { at: 0.7,  atk: ['pincer', 'spiral', 'meteor', 'sweep'], rest: 0.9, spd: 1.25, text: 'FURNACE IGNITION' },
    { at: 0.4,  atk: ['pincer', 'meteor', 'grid', 'spiral', 'summon', 'ring'], rest: 0.65, spd: 1.45, text: 'CORE BREACH' },
    { at: 0.15, atk: ['pincer', 'meteor', 'spiral', 'sweep', 'grid', 'rain'], rest: 0.5, spd: 1.6, text: 'SUPERNOVA' }
  ]
};
MINIBOSSES.slagwright = { name: 'SLAGWRIGHT', title: 'Elite Forgemaster', hp: 640, r: 36, spr: 'slagwright', y: 120, score: 4200, cred: 170, scrap: 22, mini: true, adds: 'sawblade', phases: [{ at: 1, atk: ['meteor', 'fan', 'sweep'], rest: 1.2, spd: 1 }] };

/* ---------- two new boss attacks ---------- */
BOSS_ATK.meteor = { // telegraphed geysers: rings of fire burst out of marked spots
  tele: 1.3, dur: 2.4,
  pre(e) {
    const n = 3 + (e.ph >> 1) + (e.ph > 2 ? 1 : 0), p = g.p, spots = [{ x: p.x, y: clamp(p.y - 40, 260, H - 90) }];
    for (let i = 1; i < n; i++) spots.push({ x: ZL() + g.rng.range(60, ZW() - 60), y: g.rng.range(240, H - 90) });
    e.a.spots = spots;
  },
  warn(e, ctx, k) { for (const s of e.a.spots) ctx.ring(s.x, s.y, 46, k); },
  start(e) {
    e.a.spots.forEach((s, i) => { [0.25, 0.65, 1.05].forEach((f, j) => ebul(s.x, s.y, 0, 0, { r: 5.5, fuse: f + i * 0.12, fn: 8 + j, fs: 130 - j * 20, src: e.d.name + ' geyser', life: 5 })); });
    Aud.sfx('missile');
  },
  tick() { }
};
BOSS_ATK.pincer = { // two crushing walls close in from the sides; slip through the middle gap
  tele: 1.2, dur: 4.2,
  warn(e, ctx, k) { ctx.beam(ZL() + 40, 0, Math.PI / 2, 70); ctx.beam(ZL() + ZW() - 40, 0, Math.PI / 2, 70); },
  start(e) {
    e.a.lz = [];
    for (let i = 0; i < 2; i++) { const l = { x: ZL() + 40, y: 0, ang: Math.PI / 2, tele: 0, dur: 4.2, w: 70, dmg: 22 + g.si * 2, src: e.d.name + ' crusher', t: 0, tick: 0 }; g.lz.push(l); e.a.lz.push(l); }
  },
  tick(e, t) {
    const u = Math.sin(t / 4.2 * Math.PI), sway = Math.sin(t * 1.3) * 38 * u, reach = ZW() / 2 - 95;
    e.a.lz[0].x = ZL() + 40 + u * reach + sway; e.a.lz[1].x = ZL() + ZW() - 40 - u * reach + sway;
  },
  end(e) { g.lz = g.lz.filter(l => e.a.lz.indexOf(l) < 0); }
};

/* ---------- boss / elite sprites ---------- */
SPRITES.tyrant = function (x, r, hull, dk, ac) {
  const p = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, rr = i % 2 ? r * 0.9 : r * 1.03; p.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]); }
  poly(x, p, hull, '#000a', 3);
  for (const s of [-1, 1]) {
    poly(x, [[s * r * 0.5, -r * 0.62], [s * r * 0.82, -r * 0.62], [s * r * 0.76, -r * 1.2], [s * r * 0.58, -r * 1.2]], dk, '#000a', 2);
    x.fillStyle = ac; x.beginPath(); x.ellipse(s * r * 0.67, -r * 1.2, r * 0.1, r * 0.05, 0, 0, TAU); x.fill();
    poly(x, [[s * r * 0.9, -r * 0.1], [s * r * 1.12, r * 0.3], [s * r * 0.8, r * 0.55], [s * r * 0.62, r * 0.2]], shade(dk, 0.1), '#000a', 2);
  }
  x.strokeStyle = shade(hull, -0.55); x.lineWidth = 2; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * r * 0.28, -r * 0.45); x.lineTo(i * r * 0.28, r * 0.05); x.stroke(); }
  orb(x, 0, r * 0.12, r * 0.46, '#2a1410'); x.fillStyle = '#0a0403'; x.beginPath(); x.ellipse(0, r * 0.14, r * 0.34, r * 0.2, 0, 0, TAU); x.fill();
  x.fillStyle = ac; x.beginPath(); x.ellipse(0, r * 0.14, r * 0.26, r * 0.12, 0, 0, TAU); x.fill();
  x.fillStyle = '#fff3c0'; x.beginPath(); x.ellipse(0, r * 0.14, r * 0.12, r * 0.05, 0, 0, TAU); x.fill();
};
SPRITES.slagwright = function (x, r, hull, dk, ac) {
  poly(x, [[0, r * 0.95], [-r * 0.7, r * 0.55], [-r * 1.15, -r * 0.2], [-r * 0.8, -r * 0.95], [r * 0.8, -r * 0.95], [r * 1.15, -r * 0.2], [r * 0.7, r * 0.55]], hull, '#000a', 2.5);
  for (const s of [-1, 1]) { poly(x, [[s * r * 0.9, -r * 0.1], [s * r * 1.25, r * 0.4], [s * r * 0.95, r * 0.6]], dk, '#000a', 2); x.fillStyle = ac; x.fillRect(s * r * 1.05 - 2, r * 0.45, 4, 5); }
  orb(x, 0, 0, r * 0.4, '#2a1410'); x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.22, 0, TAU); x.fill(); x.fillStyle = '#fff3c0'; x.beginPath(); x.arc(0, 0, r * 0.09, 0, TAU); x.fill();
};

/* ---------- backdrop: lava rivers + gantries + rising embers ---------- */
BG_EXTRA.foundry = {
  nebula: ['#6a1a0a', '#3a0a1a', '#8a3a0a'],
  planet: ['#ffe08a', '#ff7a2a', '#4a1206'],
  init(bg, r) {
    bg.tile = this.makeTile(r); bg.lights = [];
    for (let i = 0; i < 46 * (W / 480); i++) bg.spores.push({ x: r() * W, y: r() * H, s: 1 + r() * 2.2, sp: 20 + r() * 40, ph: r() * TAU });
  },
  makeTile(r) {
    const c = mkCanvas(W * 2, H * 2), x = c.getContext('2d'); x.scale(2, 2);
    for (let i = 0; i < 34 * (W / 480); i++) { // dark rock / slag slabs
      const px = r() * W, py = r() * H, pw = 30 + r() * 110, ph = 16 + r() * 60, gr = x.createLinearGradient(px, py, px + pw, py + ph);
      gr.addColorStop(0, '#2c1412'); gr.addColorStop(1, '#0a0404'); x.globalAlpha = 0.55; x.fillStyle = gr; x.fillRect(px, py, pw, ph);
    }
    x.globalAlpha = 0.8; x.strokeStyle = '#3a2a2a'; x.lineWidth = 7;
    const gx = [W * 0.05, W * 0.95]; if (W > 700) gx.push(W * 0.5);
    for (const vx of gx) { x.beginPath(); x.moveTo(vx, 0); x.lineTo(vx, H); x.stroke(); x.lineWidth = 3; for (let y = 0; y < H; y += 70) { x.beginPath(); x.moveTo(vx - 14, y); x.lineTo(vx + 14, y + 70); x.moveTo(vx + 14, y); x.lineTo(vx - 14, y + 70); x.stroke(); } x.lineWidth = 7; }
    x.globalAlpha = 1;
    const nR = Math.max(3, Math.round(4 * W / 480));
    for (let k = 0; k < nR; k++) { // lava rivers: same x at top and bottom so the tile scrolls seamlessly
      const bx = (k + 0.5) / nR * W + (r() - 0.5) * 60; x.beginPath(); x.moveTo(bx, 0);
      x.bezierCurveTo(bx + (r() - 0.5) * 170, H * 0.3, bx + (r() - 0.5) * 170, H * 0.7, bx, H);
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = 'rgba(255,70,10,.26)'; x.lineWidth = 46; x.stroke(); x.strokeStyle = 'rgba(255,130,30,.55)'; x.lineWidth = 19; x.stroke(); x.strokeStyle = 'rgba(255,232,150,.9)'; x.lineWidth = 5; x.stroke();
      x.globalCompositeOperation = 'source-over';
    }
    return c;
  },
  draw(x, bg, pal) {
    const o = (bg.off * 38) % H; x.drawImage(bg.tile, 0, o, W, H); x.drawImage(bg.tile, 0, o - H, W, H);
    x.globalCompositeOperation = 'lighter'; x.fillStyle = `rgba(255,90,20,${0.05 + 0.035 * Math.sin(bg.off * 1.7)})`; x.fillRect(0, 0, W, H);
    for (const s of bg.spores) { x.globalAlpha = 0.28 + 0.22 * Math.sin(s.ph * 2); dimg(x, Gfx.glow('#ffa040', s.s * 2.6), s.x + Math.sin(s.ph) * 12, H - s.y); }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  }
};
