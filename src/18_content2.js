/* ===================================================================
   SECTION 18: CONTENT EXPANSION - sectors 2 and 3, their bosses,
   mini-bosses and boss sprites. (Excluded from the --slice build.)
   =================================================================== */
SECTORS.push(
  {
    id: 'station', name: 'Derelict Station', tag: 'SECTOR 2', blurb: 'A dead orbital fortress. Its defence grid never stopped listening.',
    pal: { bg0: '#060912', bg1: '#0e1830', hull: '#8fa6c9', dark: '#33425e', accent: '#3de0ff', glow: '#4fc3ff', star: '#cfe8ff' },
    bul: '#ff3d7f', music: 'station', boss: 'warden', mini: 'sentinel',
    roster: [
      { bp: 'vee', type: 'fighter', from: 0, w: 3 },
      { bp: 'trio', type: 'fighter', from: 0, w: 2 },
      { bp: 'turrets', type: 'turret', from: 0, w: 2 },
      { bp: 'snipers', type: 'sniper', from: 0, w: 2 },
      { bp: 'single', type: 'gunship', from: 1, w: 1.5 },
      { bp: 'single', type: 'frigate', from: 1, w: 1.5 },
      { bp: 'single', type: 'spiraler', from: 1, w: 1.2 },
      { bp: 'pair', type: 'weaver', from: 1, w: 1 },
      { bp: 'rush', type: 'kamikaze', from: 2, w: 1 },
      { bp: 'single', type: 'carrier', from: 3, w: 0.8 }
    ]
  },
  {
    id: 'hive', name: 'Alien Hive', tag: 'SECTOR 3', blurb: 'The rift\'s heart. Living walls, spore storms, and something vast that sings.',
    pal: { bg0: '#08050f', bg1: '#1a0c24', hull: '#a56cc9', dark: '#3d2257', accent: '#9dff5a', glow: '#b3ff6a', star: '#e6ffd0' },
    bul: '#ffd23d', music: 'hive', boss: 'queen', mini: 'matron',
    roster: [
      { bp: 'swarm', type: 'drone', from: 0, w: 2.5 },
      { bp: 'column', type: 'diver', from: 0, w: 2 },
      { bp: 'pair', type: 'weaver', from: 0, w: 2.5 },
      { bp: 'rush', type: 'kamikaze', from: 0, w: 2.5 },
      { bp: 'mines', type: 'mine', from: 0, w: 2 },
      { bp: 'row', type: 'weaver', from: 1, w: 1.5 },
      { bp: 'single', type: 'spiraler', from: 1, w: 1.5 },
      { bp: 'single', type: 'frigate', from: 1, w: 1.5 },
      { bp: 'single', type: 'gunship', from: 1, w: 1.5 },
      { bp: 'single', type: 'carrier', from: 2, w: 1.5 },
      { bp: 'vee', type: 'fighter', from: 2, w: 1 }
    ]
  }
);

BOSSES.warden = {
  name: 'WARDEN CORE', title: 'Station Defence Hub', hp: 1500, r: 54, spr: 'warden', y: 125, score: 9000, cred: 260, scrap: 70, adds: 'fighter',
  phases: [
    { at: 1,    atk: ['grid', 'missiles', 'fan'], rest: 1.2, spd: 1 },
    { at: 0.6,  atk: ['spiral', 'ring', 'sweep', 'grid'], rest: 0.95, spd: 1.2, text: 'REACTOR OVERLOAD' },
    { at: 0.25, atk: ['grid', 'sweep', 'missiles', 'spiral', 'fan'], rest: 0.7, spd: 1.4, text: 'MELTDOWN' }
  ]
};
BOSSES.queen = {
  name: 'HIVE QUEEN', title: 'Mother of the Rift', hp: 2300, r: 58, spr: 'queen', y: 125, score: 15000, cred: 400, scrap: 120, adds: 'drone',
  phases: [
    { at: 1,    atk: ['rain', 'summon', 'ring', 'stream'], rest: 1.1, spd: 1 },
    { at: 0.66, atk: ['spiral', 'missiles', 'sweep', 'rain'], rest: 0.9, spd: 1.25, text: 'THE HIVE AWAKENS' },
    { at: 0.33, atk: ['spiral', 'rain', 'sweep', 'summon', 'ring', 'missiles'], rest: 0.6, spd: 1.5, text: 'FRENZY' }
  ]
};
MINIBOSSES.sentinel = { name: 'SENTINEL', title: 'Elite Guardian', hp: 420, r: 32, spr: 'sentinel', y: 120, score: 2600, cred: 100, scrap: 14, mini: true, adds: 'drone', phases: [{ at: 1, atk: ['missiles', 'sweep', 'fan'], rest: 1.3, spd: 1 }] };
MINIBOSSES.matron = { name: 'BROOD MATRON', title: 'Elite Spawner', hp: 520, r: 34, spr: 'matron', y: 120, score: 3400, cred: 130, scrap: 18, mini: true, adds: 'drone', phases: [{ at: 1, atk: ['summon', 'spiral', 'rain'], rest: 1.2, spd: 1 }] };

/* boss / elite sprites (nose down, centred) */
SPRITES.warden = function (x, r, hull, dk, ac) {
  const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? r * 0.88 : r * 1.0; p.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  poly(x, p, hull, '#000a', 3);
  x.fillStyle = dk; for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * TAU / 4 + 0.4); x.fillRect(r * 0.55, -9, r * 0.5, 18); x.restore(); }
  x.strokeStyle = shade(hull, -0.5); x.lineWidth = 3; x.beginPath(); x.arc(0, 0, r * 0.62, 0, TAU); x.stroke();
  x.fillStyle = '#10182a'; x.beginPath(); x.arc(0, 0, r * 0.45, 0, TAU); x.fill();
  x.fillStyle = shade(dk, 0.2); for (let i = 0; i < 8; i++) { x.save(); x.rotate(i * TAU / 8); x.fillRect(r * 0.2, -3, r * 0.2, 6); x.restore(); }
  x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.2, 0, TAU); x.fill();
};
SPRITES.queen = function (x, r, hull, dk, ac) {
  // bulbous abdomen + head with mandibles + wing plates
  x.fillStyle = dk; x.beginPath(); x.ellipse(0, -r * 0.25, r * 0.95, r * 0.8, 0, 0, TAU); x.fill();
  x.fillStyle = hull; x.beginPath(); x.ellipse(0, -r * 0.3, r * 0.82, r * 0.68, 0, 0, TAU); x.fill(); x.strokeStyle = '#000a'; x.lineWidth = 3; x.stroke();
  for (let i = -3; i <= 3; i++) { x.strokeStyle = shade(dk, -0.2); x.lineWidth = 2; x.beginPath(); x.arc(0, -r * 0.5, r * (0.25 + (i + 3) * 0.08), 0.3, Math.PI - 0.3); x.stroke(); }
  poly(x, [[-r * 0.35, r * 0.15], [-r * 0.55, r * 0.8], [-r * 0.1, r * 0.45]], dk, '#000a', 2); poly(x, [[r * 0.35, r * 0.15], [r * 0.55, r * 0.8], [r * 0.1, r * 0.45]], dk, '#000a', 2);
  x.fillStyle = hull; x.beginPath(); x.ellipse(0, r * 0.25, r * 0.38, r * 0.34, 0, 0, TAU); x.fill(); x.stroke();
  x.fillStyle = ac; x.beginPath(); x.arc(-r * 0.14, r * 0.2, r * 0.07, 0, TAU); x.arc(r * 0.14, r * 0.2, r * 0.07, 0, TAU); x.fill();
  for (const s of [-1, 1]) poly(x, [[s * r * 0.85, -r * 0.5], [s * r * 1.25, -r * 0.1], [s * r * 0.9, r * 0.1]], shade(hull, -0.2), '#000a', 2);
};
SPRITES.sentinel = function (x, r, hull, dk, ac) {
  poly(x, [[0, r], [-r * 0.5, r * 0.2], [-r * 1.1, -r * 0.5], [-r * 0.6, -r], [r * 0.6, -r], [r * 1.1, -r * 0.5], [r * 0.5, r * 0.2]], hull, '#000a', 2.5);
  poly(x, [[0, r], [r * 0.5, r * 0.2], [r * 1.1, -r * 0.5], [r * 0.6, -r], [0, -r]], dk);
  x.fillStyle = '#0b0b12'; x.beginPath(); x.arc(0, 0, r * 0.38, 0, TAU); x.fill(); x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.2, 0, TAU); x.fill();
};
SPRITES.matron = function (x, r, hull, dk, ac) {
  x.fillStyle = dk; x.beginPath(); x.ellipse(0, -r * 0.2, r * 1.0, r * 0.8, 0, 0, TAU); x.fill();
  x.fillStyle = hull; x.beginPath(); x.ellipse(0, -r * 0.2, r * 0.85, r * 0.65, 0, 0, TAU); x.fill(); x.strokeStyle = '#000a'; x.lineWidth = 2.5; x.stroke();
  for (let i = 0; i < 5; i++) { x.fillStyle = ac; x.beginPath(); x.arc((i - 2) * r * 0.32, -r * 0.35 + Math.abs(i - 2) * r * 0.1, r * 0.1, 0, TAU); x.fill(); }
  poly(x, [[-r * 0.3, r * 0.3], [0, r], [r * 0.3, r * 0.3]], shade(hull, -0.2), '#000a', 2);
};
