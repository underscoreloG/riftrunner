/* ===================================================================
   SECTION 24: MOVEMENT PATTERNS - reusable flight paths for the basic
   enemies (diver / weaver / drone). A wave picks one pattern ("mv") from
   its sector's set, so the same ship flies very differently from wave to
   wave. Patterns drive e.x / e.y directly (velocity stays 0).
   =================================================================== */
const MOVABLE = { diver: 1, weaver: 1, drone: 1 };
const MV_SETS = {
  belt:    ['zigzag', 'pendulum', 'stutter', 'hoverdash', 'cross'],
  station: ['cross', 'circle', 'bounce', 'hoverdash', 'zigzag', 'stutter'],
  hive:    ['spiral', 'loop', 'circle', 'zigzag', 'pendulum'],
  secret:  ['zigzag']
};
/* ~75% of waves use a pattern; the rest keep the classic straight / sine flight */
function pickMv(rng, sec) {
  const set = MV_SETS[sec.id] || MV_SETS.belt;
  return rng() < 0.75 ? rng.pick(set) : null;
}

const Move = {
  step(e, dt) {
    let m = e.mv0;
    if (!m) { m = e.mv0 = { bx: e.x, by: e.y, cy: e.y, ph: (e.o.ph || 0) + (e.id % 7) * 0.9, dir: e.o.dir || (e.x < W / 2 ? 1 : -1) }; }
    Move[e.o.mv](e, m, dt);
  },
  zigzag(e, m, dt) { // sharp triangle-wave zig-zag
    m.cy += 105 * dt; const ph = (e.t * 0.6 + m.ph * 0.1) % 1, tri = ph < 0.5 ? ph * 4 - 1 : 3 - ph * 4;
    e.x = clamp(m.bx + tri * 95, 16, W - 16); e.y = m.cy;
  },
  pendulum(e, m, dt) { // slow, very wide swing
    m.cy += 64 * dt; e.x = clamp(m.bx + Math.sin(e.t * 1.0 + m.ph) * 150, 16, W - 16); e.y = m.cy;
  },
  spiral(e, m, dt) { // corkscrew that tightens as it descends
    m.cy += 64 * dt; const R = Math.max(14, 115 - e.t * 20), a = e.t * 2.6 + m.ph;
    e.x = clamp(m.bx + Math.cos(a) * R, 16, W - 16); e.y = m.cy + Math.sin(a) * R * 0.55;
  },
  loop(e, m, dt) { // dives, performs a full loop-the-loop, dives on
    if (m.a === undefined) m.a = Math.PI / 2;
    if (e.t > 0.9 && e.t < 2.2) m.a += m.dir * (TAU / 1.3) * dt; else if (e.t >= 2.2) m.a = Math.PI / 2;
    e.x += Math.cos(m.a) * 170 * dt; e.y += Math.sin(m.a) * 170 * dt;
  },
  hoverdash(e, m, dt) { // descends, hovers and bobs, then lunges at where you were
    if (!m.s) { m.s = 1; m.ty = 80 + (e.id % 5) * 28; }
    if (m.s === 1) { e.y += 140 * dt; if (e.y >= m.ty) { m.s = 2; m.t0 = e.t; } }
    else if (m.s === 2) { e.x += Math.sin(e.t * 8) * 0.7; if (e.t - m.t0 > 0.9) { const p = g.p, d = Math.hypot(p.x - e.x, p.y - e.y) || 1; m.dx = (p.x - e.x) / d; m.dy = (p.y - e.y) / d; m.s = 3; } }
    else { e.x += m.dx * 360 * dt; e.y += m.dy * 360 * dt; }
  },
  circle(e, m, dt) { // glides into an orbit, circles for a while, then peels off downward
    if (m.c0 === undefined) { m.c0 = 160; m.cx = clamp(m.bx, ZL() + 140, ZL() + ZW() - 140); }
    if (e.t > 6) m.c0 += 110 * dt;
    const k = Math.min(1, e.t / 1.2), a = e.t * 1.3 * m.dir + m.ph, tx = m.cx + Math.cos(a) * 115, ty = m.c0 + Math.sin(a) * 80;
    e.x = lerp(m.bx, tx, k); e.y = lerp(m.by, ty, k);
  },
  stutter(e, m, dt) { // stop-and-go advance (moves 0.65s, freezes 0.55s)
    if ((e.t % 1.2) < 0.65) m.cy += 190 * dt;
    e.x = clamp(m.bx + Math.sin(e.t * 1.4 + m.ph) * 40, 16, W - 16); e.y = m.cy;
  },
  cross(e, m, dt) { // diagonal slash across the whole arena
    e.x += m.dir * 150 * dt; e.y += 105 * dt;
  },
  bounce(e, m, dt) { // ricochets off the sides of the arena as it falls
    if (m.vx === undefined) m.vx = m.dir * 170;
    e.x += m.vx * dt; e.y += 95 * dt;
    const L = ZL() + 16, R = ZL() + ZW() - 16;
    if (e.x < L && m.vx < 0) m.vx = -m.vx; else if (e.x > R && m.vx > 0) m.vx = -m.vx;
  }
};

/* diver / weaver / drone with optional movement pattern (o.mv); shooting is unchanged */
AI.diver = function (e, dt) {
  const o = e.o;
  if (!e.init) { e.init = 1; e.fy = frand(60, 190); e.ft = frand(0.8, 1.9); if (o.mv) { e.vx = e.vy = 0; } else { e.vy = 165 + frand(0, 30); e.vx = o.vx || 0; } }
  if (o.mv) Move.step(e, dt);
  const trig = o.mv ? e.t > e.ft : e.y > e.fy;
  if (!e.fired && trig && e.y > 0) { e.fired = 1; Pat.aimed(e.x, e.y + 10, 205, null); if (g.gi >= 5) e.t2 = 0.45; }
  if (e.t2 !== undefined) { e.t2 -= dt; if (e.t2 <= 0) { Pat.aimed(e.x, e.y + 10, 215, null); e.t2 = undefined; } }
};
AI.weaver = function (e, dt) {
  const o = e.o;
  if (!e.init) { e.init = 1; e.x0 = e.x; }
  if (o.mv) { e.vx = e.vy = 0; Move.step(e, dt); }
  else { e.vy = 0; e.y += 88 * dt; e.x = clamp(e.x0 + Math.sin(e.t * 2.1 + (o.ph || 0)) * (o.amp || 70), 16, W - 16); }
  if (e.y > 20 && Enemies.cool(e, dt, 1.6)) Pat.fan(e.x, e.y + 10, 2, 0.16, 190, Math.PI / 2, null);
};
AI.drone = function (e, dt) {
  if (!e.init) { e.init = 1; e.bx2 = e.o.vx || 0; e.ph = Math.random() * 6; if (e.o.mv) { e.vx = e.vy = 0; } else e.vy = 140; }
  if (e.o.mv) Move.step(e, dt); else e.vx = e.bx2 * 1.5 + Math.cos(e.t * 4 + e.ph) * 85;
};
