/* ===================================================================
   SECTION 11: ENEMIES / SECTORS / BOSSES (data). Behaviours that read
   these live in 20_game.js (AI table + BOSS_ATK table).
   =================================================================== */
const ENEMIES = {
  diver:    { name: 'Diver',           hp: 5,  r: 12, score: 60,  cred: [2, 4],   fire: 1.4, spr: 'dart' },
  weaver:   { name: 'Weaver',          hp: 8,  r: 13, score: 90,  cred: [3, 6],   fire: 1.5, spr: 'wing' },
  fighter:  { name: 'Squad Fighter',   hp: 7,  r: 12, score: 80,  cred: [3, 5],   fire: 2.0, spr: 'fighter' },
  turret:   { name: 'Gun Turret',      hp: 16, r: 14, score: 110, cred: [4, 8],   fire: 1.8, spr: 'turret' },
  kamikaze: { name: 'Kamikaze',        hp: 4,  r: 10, score: 70,  cred: [2, 4],   spr: 'kami', contact: 22 },
  sniper:   { name: 'Sniper',          hp: 10, r: 13, score: 140, cred: [6, 10],  fire: 3.0, spr: 'sniper' },
  carrier:  { name: 'Carrier',         hp: 46, r: 24, score: 320, cred: [18, 30], fire: 1.7, spr: 'carrier', big: true },
  drone:    { name: 'Drone',           hp: 2,  r: 8,  score: 25,  cred: [1, 2],   spr: 'drone' },
  mine:     { name: 'Ring Mine',       hp: 11, r: 13, score: 100, cred: [4, 8],   fire: 2.3, spr: 'mine' },
  spiraler: { name: 'Spiral Tower',    hp: 30, r: 19, score: 240, cred: [10, 18], spr: 'spiral' },
  gunship:  { name: 'Laser Gunship',   hp: 34, r: 20, score: 300, cred: [14, 24], spr: 'gunship', big: true },
  frigate:  { name: 'Missile Frigate', hp: 32, r: 20, score: 300, cred: [14, 24], spr: 'frigate', big: true },
  cargo:    { name: 'Cargo Drone',     hp: 6,  r: 11, score: 150, cred: [12, 20], spr: 'cargo' }
};

/* Wave roster entries: bp = blueprint name (WAVES in 20_game.js), type = enemy,
   from = first stage index (within sector) it can appear, w = weight */
const SECTORS = [
  {
    id: 'belt', name: 'Asteroid Belt', tag: 'SECTOR 1', blurb: 'Rock, rust and ambush. The frontier of the rift.',
    pal: { bg0: '#07080f', bg1: '#161018', hull: '#c9855a', dark: '#5a3a2a', accent: '#ffb347', glow: '#ff9a3d', star: '#ffe9cf' },
    bul: '#ff3d6a', music: 'belt', boss: 'grindstone', mini: 'rockjaw',
    roster: [
      { bp: 'column', type: 'diver', from: 0, w: 3 },
      { bp: 'sweep', type: 'diver', from: 0, w: 2 },
      { bp: 'pair', type: 'weaver', from: 0, w: 3 },
      { bp: 'row', type: 'weaver', from: 1, w: 2 },
      { bp: 'rush', type: 'kamikaze', from: 0, w: 2 },
      { bp: 'turrets', type: 'turret', from: 0, w: 2 },
      { bp: 'mines', type: 'mine', from: 0, w: 2 },
      { bp: 'snipers', type: 'sniper', from: 1, w: 1.5 },
      { bp: 'single', type: 'carrier', from: 1, w: 1 }
    ]
  }
];

/* ---------- BOSSES & MINI-BOSSES ----------
   phases: at = hp fraction at which phase STARTS, atk = BOSS_ATK names,
   rest = seconds between attacks, spd = move speed mult */
const BOSSES = {
  grindstone: {
    name: 'GRINDSTONE', title: 'Asteroid Fortress', hp: 900, r: 50, spr: 'grindstone', y: 130, score: 5000, cred: 160, scrap: 40,
    phases: [
      { at: 1,   atk: ['fan', 'ring', 'stream'], rest: 1.3, spd: 1 },
      { at: 0.5, atk: ['spiral', 'sweep', 'fan', 'summon'], rest: 0.9, spd: 1.3, text: 'CORE EXPOSED' }
    ]
  }
};
const MINIBOSSES = {
  rockjaw: {
    name: 'ROCKJAW', title: 'Elite Gunboat', hp: 300, r: 30, spr: 'rockjaw', y: 120, score: 1800, cred: 70, scrap: 10, mini: true,
    phases: [{ at: 1, atk: ['fan', 'ring', 'stream'], rest: 1.4, spd: 1 }]
  }
};

/* secret-level pseudo sector (index 99) + lookup helper */
const SECRET_SEC = {
  id: 'secret', name: 'Secret Cache', tag: 'SECRET', pal: { bg0: '#0d0a02', bg1: '#2a1c04', hull: '#d9a526', dark: '#6b4c10', accent: '#ffd23d', glow: '#ffd23d', star: '#fff3b0' },
  bul: '#ff7a3d', music: 'secret'
};
function secOf(i) { return i >= 99 ? SECRET_SEC : SECTORS[i]; }
