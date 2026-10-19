/* ===================================================================
   SECTION 23: ENEMY VARIETY - 10 extra enemy types (data + sprite painter +
   behaviour + wave blueprint) and their roster entries per sector.
   Loaded after the core so it can extend ENEMIES / SPRITES / AI / WAVES.
   =================================================================== */
Object.assign(ENEMIES, {
  splitter: { name: 'Splitter',     hp: 14, r: 15, score: 110, cred: [4, 8],   fire: 2.7, spr: 'splitter',
              onDeath(e) { for (let i = -1; i <= 1; i++) Enemies.spawn('drone', e.x + i * 12, e.y, { vx: i * 90 }); } },
  strafer:  { name: 'Strafer',      hp: 8,  r: 12, score: 90,  cred: [3, 6],   spr: 'strafer' },
  bulwark:  { name: 'Bulwark',      hp: 40, r: 22, score: 280, cred: [14, 22], spr: 'bulwark', big: true,
              post(x, e) { if (e.inv) { x.strokeStyle = 'rgba(120,220,255,.85)'; x.fillStyle = 'rgba(120,220,255,.12)'; x.lineWidth = 2.5; x.beginPath(); x.arc(e.x, e.y, e.r + 8, 0, TAU); x.fill(); x.stroke(); } } },
  bomber:   { name: 'Bomber',       hp: 16, r: 16, score: 130, cred: [5, 9],   spr: 'bomber' },
  warper:   { name: 'Warper',       hp: 12, r: 13, score: 150, cred: [6, 10],  spr: 'warper',
              pre(x, e) { if (e.st === 1) x.globalAlpha = 0.28; },
              post(x, e) { if (e.st === 1 && e.tx !== undefined) { const k = clamp(e.stT / 0.7, 0, 1); x.strokeStyle = `rgba(190,120,255,${0.4 + 0.5 * k})`; x.lineWidth = 2; x.beginPath(); x.arc(e.tx, e.ty, 26 - k * 12, 0, TAU); x.stroke(); x.beginPath(); x.arc(e.tx, e.ty, 4, 0, TAU); x.stroke(); } } },
  tracker:  { name: 'Tracker',      hp: 12, r: 13, score: 120, cred: [5, 9],   spr: 'tracker',
              post(x, e) { if (e.st === 2) { x.strokeStyle = `rgba(255,70,70,${0.3 + 0.5 * Math.sin(e.t * 30) ** 2})`; x.lineWidth = 2; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(e.x, e.y + 14); x.lineTo(e.x, H); x.stroke(); x.setLineDash([]); } } },
  swooper:  { name: 'Swooper',      hp: 7,  r: 12, score: 80,  cred: [3, 5],   spr: 'swooper',
              pre(x, e) { x.rotate((e.a === undefined ? Math.PI / 2 : e.a) - Math.PI / 2); } },
  medic:    { name: 'Medic',        hp: 16, r: 14, score: 160, cred: [8, 12],  spr: 'medic',
              post(x, e) { if (e.beam > 0 && e.tgt && !e.tgt.dead) { x.strokeStyle = 'rgba(110,255,150,.8)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(e.x, e.y); x.lineTo(e.tgt.x, e.tgt.y); x.stroke(); x.globalCompositeOperation = 'lighter'; dimg(x, Gfx.glow('#5eff7a', 16), e.tgt.x, e.tgt.y); x.globalCompositeOperation = 'source-over'; } } },
  broodpod: { name: 'Brood Pod',    hp: 18, r: 15, score: 120, cred: [5, 9],   spr: 'pod',
              pre(x, e) { const s = 1 + 0.07 * Math.sin(e.t * (4 + e.t * 3)); x.scale(s, s); },
              onDeath(e) { for (let i = 0; i < 2; i++) Enemies.spawn('drone', e.x + (i ? 10 : -10), e.y, { vx: (i ? 80 : -80) }); } },
  sawblade: { name: 'Sawblade',     hp: 14, r: 14, score: 110, cred: [4, 8],   spr: 'saw', contact: 20,
              pre(x, e) { x.rotate(e.rot || 0); } }
});
Object.assign(THRUST, { strafer: 1, bomber: 1, warper: 1, tracker: 1, swooper: 1, medic: 1 });

/* ---------- sprite painters (nose down) ---------- */
Object.assign(SPRITES, {
  splitter(x, r, hull, dk, ac) {
    x.fillStyle = dk; x.beginPath(); x.arc(-r * 0.45, 0, r * 0.74, 0, TAU); x.arc(r * 0.45, 0, r * 0.74, 0, TAU); x.fill();
    orb(x, -r * 0.4, -r * 0.05, r * 0.64, hull); orb(x, r * 0.4, r * 0.05, r * 0.64, hull);
    x.strokeStyle = '#000b'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -r * 0.85); x.lineTo(-r * 0.14, -r * 0.2); x.lineTo(r * 0.14, r * 0.2); x.lineTo(0, r * 0.88); x.stroke();
    x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.2, 0, TAU); x.fill();
  },
  strafer(x, r, hull, dk, ac) {
    poly(x, [[0, r], [-r * 1.35, -r * 0.1], [-r * 0.95, -r * 0.75], [0, -r * 0.3], [r * 0.95, -r * 0.75], [r * 1.35, -r * 0.1]], hull, '#0008', 1.5);
    poly(x, [[0, r], [r * 1.35, -r * 0.1], [r * 0.95, -r * 0.75], [0, -r * 0.3]], dk);
    x.fillStyle = ac; x.fillRect(-r * 0.9, -r * 0.2, r * 1.8, 2.5); x.beginPath(); x.arc(0, r * 0.1, r * 0.2, 0, TAU); x.fill();
  },
  bulwark(x, r, hull, dk, ac) {
    poly(x, [[0, r * 0.9], [-r * 0.9, r * 0.4], [-r * 1.05, -r * 0.5], [-r * 0.5, -r * 1.0], [r * 0.5, -r * 1.0], [r * 1.05, -r * 0.5], [r * 0.9, r * 0.4]], hull, '#0009', 2.2);
    poly(x, [[-r * 1.0, r * 0.45], [0, r * 1.08], [r * 1.0, r * 0.45], [r * 0.7, r * 0.15], [-r * 0.7, r * 0.15]], dk, '#0009', 1.5);
    orb(x, 0, -r * 0.2, r * 0.38, '#233046'); x.fillStyle = ac; x.beginPath(); x.arc(0, -r * 0.2, r * 0.2, 0, TAU); x.fill();
    for (const s of [-1, 1]) { x.fillStyle = ac; x.fillRect(s * r * 0.62 - 2, r * 0.3, 4, 5); }
  },
  bomber(x, r, hull, dk, ac) {
    for (const s of [-1, 1]) poly(x, [[s * r * 0.5, r * 0.5], [s * r * 1.2, r * 0.1], [s * r * 1.15, -r * 0.8], [s * r * 0.55, -r * 0.5]], dk, '#0009', 1.5);
    x.save(); x.scale(1, 1.1); orb(x, 0, -r * 0.05, r * 0.82, hull); x.restore();
    x.fillStyle = '#0c0c14'; x.fillRect(-r * 0.36, r * 0.05, r * 0.72, r * 0.5); x.fillStyle = ac; x.fillRect(-r * 0.2, r * 0.38, r * 0.4, 3);
    x.fillStyle = ac; x.beginPath(); x.arc(0, -r * 0.4, r * 0.15, 0, TAU); x.fill();
  },
  warper(x, r, hull, dk, ac) {
    poly(x, [[0, r * 1.15], [-r * 0.85, 0], [0, -r * 1.15], [r * 0.85, 0]], hull, '#0009', 2);
    poly(x, [[0, r * 0.62], [-r * 0.42, 0], [0, -r * 0.62], [r * 0.42, 0]], '#07060e');
    x.strokeStyle = ac; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, r * 0.3, 0, TAU); x.stroke(); x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.1, 0, TAU); x.fill();
  },
  tracker(x, r, hull, dk, ac) {
    poly(x, [[0, r * 1.25], [-r * 0.35, -r * 0.4], [-r * 0.95, -r * 1.0], [0, -r * 0.7], [r * 0.95, -r * 1.0], [r * 0.35, -r * 0.4]], hull, '#0009', 1.8);
    poly(x, [[0, r * 1.25], [r * 0.35, -r * 0.4], [r * 0.95, -r * 1.0], [0, -r * 0.7]], dk);
    orb(x, 0, 0, r * 0.3, '#2a0f14'); x.fillStyle = '#ff4a4a'; x.beginPath(); x.arc(0, 0, r * 0.15, 0, TAU); x.fill();
  },
  swooper(x, r, hull, dk, ac) {
    poly(x, [[0, r * 0.95], [-r * 1.25, -r * 0.15], [-r * 0.85, -r * 0.75], [0, -r * 0.05], [r * 0.85, -r * 0.75], [r * 1.25, -r * 0.15]], hull, '#0009', 1.5);
    poly(x, [[0, r * 0.95], [r * 1.25, -r * 0.15], [r * 0.85, -r * 0.75], [0, -r * 0.05]], dk);
    x.fillStyle = ac; x.beginPath(); x.arc(0, r * 0.1, r * 0.18, 0, TAU); x.fill();
  },
  medic(x, r, hull, dk, ac) {
    x.fillStyle = dk; x.beginPath(); x.arc(0, 0, r * 1.05, 0, TAU); x.fill();
    orb(x, 0, 0, r * 0.9, hull);
    x.fillStyle = '#eafff1'; x.fillRect(-r * 0.2, -r * 0.62, r * 0.4, r * 1.24); x.fillRect(-r * 0.62, -r * 0.2, r * 1.24, r * 0.4);
    x.strokeStyle = '#5eff7a'; x.lineWidth = 1.8; x.beginPath(); x.arc(0, 0, r * 1.0, 0, TAU); x.stroke();
  },
  pod(x, r, hull, dk, ac) {
    x.fillStyle = dk; x.beginPath(); x.ellipse(0, 0, r * 0.95, r * 1.12, 0, 0, TAU); x.fill();
    x.save(); x.scale(0.9, 1.05); orb(x, 0, 0, r * 0.9, hull); x.restore();
    x.strokeStyle = '#0008'; x.lineWidth = 1.4; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(i * r * 0.4, -r * 0.9); x.quadraticCurveTo(i * r * 0.9, 0, i * r * 0.4, r * 0.9); x.stroke(); }
    x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.28, 0, TAU); x.fill();
  },
  saw(x, r, hull, dk, ac) {
    const n = 12; x.fillStyle = dk; x.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, rr = i % 2 ? r * 0.82 : r * 1.12; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.closePath(); x.fill(); x.strokeStyle = '#000a'; x.lineWidth = 1.5; x.stroke();
    orb(x, 0, 0, r * 0.78, hull); x.fillStyle = '#0a0a12'; x.beginPath(); x.arc(0, 0, r * 0.28, 0, TAU); x.fill();
    x.fillStyle = ac; x.beginPath(); x.arc(0, 0, r * 0.13, 0, TAU); x.fill();
  }
});

/* ---------- behaviours ---------- */
AI.splitter = function (e, dt) {
  e.vy = 68; e.vx = Math.sin(e.t * 1.5 + (e.o.ph || 0)) * 50;
  if (e.y > 30 && Enemies.cool(e, dt, 2.7)) Pat.fan(e.x, e.y + 8, 3, 0.5, 165, Math.PI / 2, null);
};
AI.strafer = function (e, dt) { // horizontal strafing run, firing straight down
  if (!e.init) { e.init = 1; e.vx = (e.o.dir || 1) * (200 + g.gi * 3); e.vy = 0; }
  if (Enemies.cool(e, dt, 0.4)) shootAng(e.x, e.y + 8, Math.PI / 2, 215, null);
};
AI.bulwark = function (e, dt) { // shield cycles: invulnerable 2s, then exposed and firing
  if (e.t > 20) { e.inv = false; Enemies.leave(e, dt); return; }
  if (e.y < 110 && e.st === 0) { e.vy = 60; return; }
  e.st = 1; e.vy = 0; e.vx = Math.sin(e.t * 0.5) * 35;
  e.cyc = (e.cyc || 0) + dt; e.inv = (e.cyc % 4.4) < 2.0;
  if (!e.inv && Enemies.cool(e, dt, 1.1)) Pat.fan(e.x, e.y + 14, 5, 0.8, 175, aimAng(e.x, e.y), null);
};
AI.bomber = function (e, dt) { // flies across the top dropping fused mines that burst into rings
  if (!e.init) { e.init = 1; e.vx = (e.o.dir || 1) * 125; e.vy = 0; e.md = 0.3; }
  e.md -= dt;
  if (e.md <= 0) { e.md = 1.0 / g.fr; ebul(e.x, e.y + 12, 0, 55 * g.bs, { r: 7, fuse: 1.5, src: 'Bomber mine' }); }
};
AI.warper = function (e, dt) { // blinks to a new spot near you, fires a fan, repeats 3 times
  e.stT += dt;
  if (e.st === 0) { e.vy = 120; if (e.y >= (e.o.ty || 110)) { e.st = 2; e.stT = 0; e.vy = 0; e.jumps = 0; } return; }
  e.vx = 0; e.vy = 0;
  if (e.st === 2) { // idle then fire and prepare a jump
    if (e.stT > 1.1) {
      Pat.fan(e.x, e.y, 4, 0.6, 180, aimAng(e.x, e.y), null);
      if (++e.jumps > 3) { e.st = 4; return; }
      e.tx = clamp(g.p.x + frand(-240, 240), ZL() + 40, ZL() + ZW() - 40); e.ty = frand(70, 280); e.st = 1; e.stT = 0; e.inv = true;
    }
  } else if (e.st === 1) { if (e.stT > 0.7) { e.x = e.tx; e.y = e.ty; e.st = 3; e.stT = 0; } }
  else if (e.st === 3) { e.inv = false; if (e.stT > 0.25) { e.st = 2; e.stT = 0; } }
  else Enemies.leave(e, dt);
};
AI.tracker = function (e, dt) { // shadows your x, telegraphs a vertical line, then fires a needle burst
  const p = g.p;
  if (e.t > 13) { Enemies.leave(e, dt); return; }
  if (e.st === 0) { e.vy = 110; if (e.y >= 95) { e.st = 1; e.cd = 1.2; e.vy = 0; } return; }
  e.vy = 0; e.vx = clamp((p.x - e.x) * 2, -150, 150);
  if (e.st === 1) { e.cd -= dt; if (e.cd <= 0) { e.st = 2; e.ct = 0.7; Aud.sfx('charge'); } }
  else if (e.st === 2) { e.ct -= dt; e.vx = clamp((p.x - e.x) * 0.6, -50, 50); if (e.ct <= 0) { e.st = 3; e.nb = 3; e.bt = 0; } }
  else { e.vx *= 0.15; e.bt -= dt; if (e.bt <= 0 && e.nb > 0) { e.bt = 0.09; e.nb--; shootAng(e.x, e.y + 10, Math.PI / 2, 300, { r: 3.6, kind: 'needle', dmg: g.bdmg * 1.1 }); } if (e.nb <= 0) { e.st = 1; e.cd = 2.4 / g.fr; } }
};
AI.swooper = function (e, dt) { // U-turn arc through the screen, one aimed shot at the turn
  const d = e.o.dir || 1;
  if (!e.init) { e.init = 1; e.a = Math.PI / 2 - 0.45 * d; e.sp = 175; }
  e.a -= d * 0.85 * dt; e.vx = Math.cos(e.a) * e.sp; e.vy = Math.sin(e.a) * e.sp;
  if (!e.fired && Math.abs(Math.cos(e.a)) > 0.97 && e.y > 60) { e.fired = 1; Pat.aimed(e.x, e.y, 215, null); }
};
AI.medic = function (e, dt) { // heals the most hurt ally nearby: kill it first
  if (e.t > 26) { Enemies.leave(e, dt); return; }
  if (e.y < 72 && e.st === 0) { e.vy = 70; return; }
  e.st = 1; e.vy = 0; e.vx = Math.sin(e.t * 0.7) * 45;
  e.hc = (e.hc || 0) - dt; if (e.beam > 0) e.beam -= dt;
  if (e.hc <= 0) {
    e.hc = 0.55; let best = null, bd = 420 * 420;
    for (const o of g.en) { if (o === e || o.dead || o.boss || o.hp >= o.maxHp * 0.999) continue; const dd = dist2(o.x, o.y, e.x, e.y); if (dd < bd) { bd = dd; best = o; } }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + best.maxHp * 0.07); e.tgt = best; e.beam = 0.3; }
  }
};
AI.broodpod = function (e, dt) { // scrolls like a turret; hatches kamikazes after ~3.4s on screen
  e.vy = g.scrollV;
  if (e.y > 50 && !e.h) e.h = e.t;
  if (e.h && e.t - e.h > 3.4) { for (let i = 0; i < 3; i++) Enemies.spawn('kamikaze', e.x + (i - 1) * 14, e.y, {}); burst(e.x, e.y, 14, '#9dff5a', 120, 0.5, 3); Aud.sfx('kill'); e.dead = true; e.gone = true; }
};
AI.sawblade = function (e, dt) { // zig-zags down the zone, then drops off the bottom
  if (!e.init) { e.init = 1; e.vx = (e.o.dir || 1) * 160; e.vy = 105; e.bn = 0; }
  e.rot = (e.rot || 0) + dt * 11;
  const L = ZL() + 22, R_ = ZL() + ZW() - 22;
  if (e.x < L && e.vx < 0) { e.vx = -e.vx; e.bn++; } else if (e.x > R_ && e.vx > 0) { e.vx = -e.vx; e.bn++; }
  if (e.bn >= 3) e.vy = 210;
};

/* ---------- wave blueprints ---------- */
Object.assign(WAVES, {
  few(c, type) { const n = Math.min(7, N(2 + (c.k >> 1))); for (let i = 0; i < n; i++) c.push(i * 0.9, type, zr(c.rng, 60, 60), -24, { dir: c.rng.sign(), ph: c.rng.range(0, 6), ty: c.rng.range(90, 130) }); return n * 0.9 + 2.5; },
  strafe(c, type) { const n = N(2 + (c.k >> 2) + (ZW() > 700 ? 1 : 0)), d0 = c.rng.sign(); for (let i = 0; i < n; i++) { const dir = d0 * (i % 2 ? -1 : 1); c.push(i * 1.1, type, dir > 0 ? -30 : W + 30, 90 + i * 55 + c.rng.range(0, 30), { dir }); } return n * 1.1 + 3.5; },
  swoop(c, type) { const n = N(4 + (c.k >> 1)); for (let i = 0; i < n; i++) { const dir = i % 2 ? -1 : 1; c.push(i * 0.55, type, dir > 0 ? ZL() + 60 : ZL() + ZW() - 60, -24, { dir }); } return n * 0.55 + 3; },
  bombrun(c, type) { const d0 = c.rng.sign(); c.push(0, type, d0 > 0 ? -30 : W + 30, c.rng.range(60, 90), { dir: d0 }); if (c.k >= 2) c.push(2.2, type, d0 > 0 ? W + 30 : -30, c.rng.range(100, 140), { dir: -d0 }); return 7; },
  support(c, type) { const cx = zr(c.rng, 180, 180), dir = c.rng.sign(); c.push(0, type, cx, -30, {}); const n = 3 + Math.min(3, c.k >> 1); for (let i = 0; i < n; i++) c.push(0.4 + i * 0.25, 'fighter', cx + (i - (n - 1) / 2) * 62, -20, { ty: 150 + Math.abs(i - (n - 1) / 2) * 10, dir }); return 8; }
});

/* ---------- roster additions (guarded so the slice build still works) ---------- */
SECTORS[0].roster.push(
  { bp: 'few', type: 'splitter', from: 0, w: 2 },
  { bp: 'strafe', type: 'strafer', from: 0, w: 2 },
  { bp: 'few', type: 'sawblade', from: 0, w: 1.5 },
  { bp: 'bombrun', type: 'bomber', from: 2, w: 1.5 },
  { bp: 'few', type: 'tracker', from: 2, w: 1 }
);
if (SECTORS[1]) SECTORS[1].roster.push(
  { bp: 'swoop', type: 'swooper', from: 0, w: 2 },
  { bp: 'strafe', type: 'strafer', from: 0, w: 1.5 },
  { bp: 'few', type: 'tracker', from: 0, w: 1.5 },
  { bp: 'single', type: 'bulwark', from: 1, w: 1.5 },
  { bp: 'few', type: 'warper', from: 1, w: 1.5 },
  { bp: 'bombrun', type: 'bomber', from: 1, w: 1 },
  { bp: 'support', type: 'medic', from: 2, w: 1.2 }
);
if (SECTORS[2]) SECTORS[2].roster.push(
  { bp: 'turrets', type: 'broodpod', from: 0, w: 2 },
  { bp: 'few', type: 'splitter', from: 0, w: 1.5 },
  { bp: 'swoop', type: 'swooper', from: 1, w: 1.5 },
  { bp: 'few', type: 'warper', from: 2, w: 1 },
  { bp: 'few', type: 'sawblade', from: 1, w: 1 },
  { bp: 'support', type: 'medic', from: 2, w: 1 },
  { bp: 'single', type: 'bulwark', from: 3, w: 1 }
);
