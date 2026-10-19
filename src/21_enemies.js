/* ===================================================================
   SECTION 21: ENEMIES - bullet patterns, AI behaviours, wave blueprints,
   stage scripting, boss state machine and boss attacks
   =================================================================== */

/* ---------- bullet pattern helpers (enemy side) ---------- */
function ebul(x, y, vx, vy, o) {
  o = o || {};
  if (g.eb.length > 420) g.eb.splice(0, 30);
  g.eb.push({ x, y, vx, vy, r: o.r || 4.6, col: o.col || g.sec.bul, dmg: o.dmg || g.bdmg, kind: o.kind || 'orb', fuse: o.fuse || 0, fn: o.fn || 0, fs: o.fs || 0, hom: o.hom || 0, life: o.life || 14, curve: o.curve || 0, acc: o.acc || 0, src: o.src || 'Enemy fire', age: 0 });
}
function shootAng(x, y, ang, spd, o) { spd *= g.bs; ebul(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, o); }
function aimAng(x, y) { return Math.atan2(g.p.y - y, g.p.x - x); }
const Pat = {
  aimed(x, y, spd, o, off) { shootAng(x, y, aimAng(x, y) + (off || 0), spd, o); },
  fan(x, y, n, spread, spd, base, o) { for (let i = 0; i < n; i++) shootAng(x, y, n === 1 ? base : base - spread / 2 + spread * i / (n - 1), spd, o); },
  ring(x, y, n, spd, rot, o) { for (let i = 0; i < n; i++) shootAng(x, y, rot + i / n * TAU, spd, o); },
  homing(x, y, ang, spd, o) { shootAng(x, y, ang, spd, Object.assign({ kind: 'missile', hom: 1.9, r: 5, life: 5, dmg: g.bdmg * 1.15 }, o || {})); }
};

const Enemies = {
  /* ---------- spawn ---------- */
  spawn(type, x, y, o) {
    const d = ENEMIES[type]; o = o || {};
    const hp = d.hp * g.hpMul;
    const e = { id: ++g.nid, type, d, x, y, vx: 0, vy: 0, r: d.r, hp, maxHp: hp, t: 0, cd: (d.fire || 2) * frand(0.3, 1), flash: 0, o, dead: false, st: 0, stT: 0, ttl: o.ttl || 99 };
    g.en.push(e); return e;
  },
  spawnBoss(id, mini) {
    const d = mini ? MINIBOSSES[id] : BOSSES[id];
    const hp = d.hp * g.hpMul * (mini ? 0.8 : 0.9);
    const e = { id: ++g.nid, type: id, d, boss: true, mini: !!mini, x: W / 2, y: -d.r - 20, vx: 0, vy: 0, r: d.r, hp, maxHp: hp, t: 0, cd: 0, flash: 0, o: {}, dead: false, st: 'enter', stT: 0, ph: 0, queue: [], mph: Math.random() * 6, inv: true, a: {}, ttl: 999, lastAtk: null };
    g.en.push(e); g.boss = e;
    if (!mini) { Music.start('boss', ({ belt: 0, station: 2, hive: -2, foundry: 3 })[g.sec.id] || 0); g.banner = 'WARNING'; g.bannerT = 2.2; Aud.sfx('warn'); }
    else { g.banner = d.name; g.bannerT = 1.6; Aud.sfx('warn'); }
    return e;
  },
  nearest(x, y, range, excl) {
    let best = null, bd = range * range;
    for (const e of g.en) { if (e.dead || e.y < -10 || e.inv) continue; const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    return best;
  },

  /* ---------- update ---------- */
  update(dt) {
    if (g.stormCd > 0) g.stormCd -= dt;
    const list = g.en;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (e.dead) continue;
      e.t += dt; e.flash -= dt;
      if (e.dn) { e.dnT -= dt; if (e.dnT <= 0 && g.showDmg) { ftext(e.x + frand(-8, 8), e.y - e.r, Math.round(e.dn * 10) / 10 >= 10 ? Math.round(e.dn) : e.dn.toFixed(1), e.boss ? '#ffd0a0' : '#fff', e.boss ? 13 : 10); e.dn = 0; } }
      if (g.state === 'dead') { e.x += e.vx * dt; e.y += e.vy * dt; continue; }
      (e.boss ? this.bossAI : AI[e.type]).call(this, e, dt);
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (!e.boss && e.t > 1 && (e.y > H + 70 || e.y < -150 || e.x < -110 || e.x > W + 110)) { e.dead = true; e.gone = true; }
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
  },

  /* shared helpers used by AI */
  cool(e, dt, base) { e.cd -= dt; if (e.cd <= 0) { const load = 1 + Math.max(0, (g.eb.length - 32) / 38); e.cd = base / g.fr * load * frand(0.85, 1.15); return true; } return false; },
  leave(e, dt) { e.vy = -120; e.vx *= 0.97; },

  /* ---------- boss ---------- */
  bossAI(e, dt) {
    const bd = e.d, ph = bd.phases[e.ph], p = g.p;
    e.stT += dt;
    if (e.st === 'enter') {
      e.y += 80 * dt; e.vx = 0; e.vy = 0;
      if (e.y >= bd.y) { e.y = bd.y; e.inv = false; e.st = 'rest'; e.stT = 0; }
      return;
    }
    // movement
    const spd = ph.spd * (e.st === 'trans' ? 0.2 : 1);
    const tx = W / 2 + Math.sin(e.t * 0.55 * ph.spd + e.mph) * Math.min(W * 0.3, 190);
    e.x += (tx - e.x) * Math.min(1, dt * 2.2);
    e.y += (bd.y + Math.sin(e.t * 0.9) * 10 - e.y) * Math.min(1, dt * 3);
    e.vx = 0; e.vy = 0;
    if (e.st === 'trans') { if (e.stT > 2.0) { e.inv = false; e.st = 'rest'; e.stT = 0; } else if (g.frame % 6 === 0) explosion(e.x + frand(-e.r, e.r) * 0.7, e.y + frand(-e.r, e.r) * 0.6, 14, g.sec.glow); return; }
    if (e.st === 'rest') {
      if (e.stT >= ph.rest * (g.fr > 1.1 ? 0.85 : 1)) {
        if (!e.queue.length) e.queue = g.rng.shuffle(ph.atk);
        if (e.queue.length > 1 && e.queue[e.queue.length - 1] === e.lastAtk) e.queue.unshift(e.queue.pop());
        e.atk = e.queue.pop(); e.lastAtk = e.atk;
        e.st = 'tele'; e.stT = 0; e.a = {};
        const A = BOSS_ATK[e.atk]; if (A.pre) A.pre(e);
        if (A.tele > 0.5) Aud.sfx('charge');
      }
    } else if (e.st === 'tele') {
      if (e.stT >= BOSS_ATK[e.atk].tele) { e.st = 'atk'; e.stT = 0; const A = BOSS_ATK[e.atk]; if (A.start) A.start(e); }
    } else if (e.st === 'atk') {
      const A = BOSS_ATK[e.atk]; A.tick(e, e.stT, dt);
      if (e.stT >= A.dur) { if (A.end) A.end(e); e.st = 'rest'; e.stT = 0; }
    }
  },
  bossCheck(e) {
    const bd = e.d, nx = bd.phases[e.ph + 1];
    if (!nx || e.st === 'trans' || e.st === 'enter') return;
    if (e.hp <= e.maxHp * nx.at) {
      e.ph++; e.hp = e.maxHp * nx.at; e.st = 'trans'; e.stT = 0; e.inv = true;
      for (const b of g.eb) { burst(b.x, b.y, 2, b.col, 70, 0.4, 2); }
      g.eb.length = 0; g.lz = g.lz.filter(l => l.own !== e);
      g.banner = nx.text || 'PHASE ' + (e.ph + 1); g.bannerT = 2;
      g.hs = Math.max(g.hs, 0.2); g.shake = Math.max(g.shake, 14); Aud.sfx('phase');
      g.fx.push({ k: 'ring', x: e.x, y: e.y, r: 10, rmax: 220, t: 0, dur: 0.6, col: '#fff', w: 4 });
      g.fx.push({ k: 'flash', t: 0, dur: 0.25 });
    }
  },
  bossDeath(e) {
    const bd = e.d, run = g.run;
    g.bossDying = 2.6; g.bossPos = { x: e.x, y: e.y, r: e.r };
    for (const b of g.eb) burst(b.x, b.y, 3, '#ffd23d', 120, 0.5, 2);
    g.eb.length = 0; g.lz.length = 0;
    for (const o of g.en) if (!o.dead && o !== e) { o.hp = 0; killEnemy(o); }
    run.score += bd.score; ftext(e.x, e.y, '+' + bd.score, '#fff', 20);
    for (let i = 0; i < 14; i++) dropPickup(e.x + frand(-50, 50), e.y + frand(-40, 40), 'cred', { v: bd.cred / 14 * (1 + g.si * 0.3) * (1 + run.mods.bigCredit) });
    if (!bd.mini) { dropPickup(e.x - 30, e.y, 'pow'); dropPickup(e.x + 30, e.y, 'pow'); dropPickup(e.x, e.y + 30, 'rep'); }
    else { dropPickup(e.x - 24, e.y, 'pow'); dropPickup(e.x + 24, e.y, 'pow'); }
    run.bossScrap = (run.bossScrap || 0) + bd.scrap;
    if (bd.mini) run.stats.minis++; else run.stats.bosses++;
    g.banner = bd.name + ' DESTROYED'; g.bannerT = 2.6; g.boss = null;
    Aud.sfx('boom'); g.shake = 20; g.hs = 0.3;
    g.fx.push({ k: 'flash', t: 0, dur: 0.5 });
  }
};

/* ---------- regular-enemy AI (keyed by type id) ---------- */
const AI = {
  diver(e, dt) {
    const o = e.o;
    if (!e.init) { e.init = 1; e.vy = 165 + frand(0, 30); e.vx = o.vx || 0; e.fy = frand(60, 190); }
    if (!e.fired && e.y > e.fy) { e.fired = 1; Pat.aimed(e.x, e.y + 10, 205, null); if (g.gi >= 5) { e.t2 = 0.45; } }
    if (e.t2 !== undefined) { e.t2 -= dt; if (e.t2 <= 0) { Pat.aimed(e.x, e.y + 10, 215, null); e.t2 = undefined; } }
  },
  weaver(e, dt) {
    const o = e.o;
    if (!e.init) { e.init = 1; e.x0 = e.x; }
    e.vy = 0; e.y += 88 * dt; e.x = clamp(e.x0 + Math.sin(e.t * 2.1 + (o.ph || 0)) * (o.amp || 70), 16, W - 16);
    if (e.y > 20 && Enemies.cool(e, dt, 1.6)) { Pat.fan(e.x, e.y + 10, 2, 0.16, 190, Math.PI / 2, null); }
  },
  fighter(e, dt) {
    const o = e.o;
    if (e.st === 0) { e.vy = 150; if (e.y >= (o.ty || 110)) { e.st = 1; e.stT = 0; e.vy = 0; Pat.fan(e.x, e.y, 3, 0.5, 200, aimAng(e.x, e.y), null); } }
    else if (e.st === 1) { e.vy = 0; e.stT += dt; if (e.stT > 0.8 && !e.s2) { e.s2 = 1; Pat.fan(e.x, e.y, 2, 0.4, 200, aimAng(e.x, e.y), null); } if (e.stT > 1.5) { e.st = 2; } }
    else { e.vx = (o.dir || 1) * 190; e.vy = 40; }
  },
  turret(e, dt) {
    e.vy = g.scrollV; e.aim = aimAng(e.x, e.y);
    e.cd -= dt;
    if (e.y > 20 && e.y < H - 120) {
      if (e.burst > 0) { e.bt -= dt; if (e.bt <= 0) { e.bt = 0.13; e.burst--; shootAng(e.x, e.y, e.aim, 230, null); } }
      else if (e.cd <= 0) { e.cd = 2.4 / g.fr * (1 + Math.max(0, (g.eb.length - 32) / 38)) * frand(0.85, 1.15); e.burst = 2; e.bt = 0; }
    }
  },
  kamikaze(e, dt) {
    if (!e.init) { e.init = 1; e.sp = 90; }
    if (e.st === 0) { e.vy = 95; e.vx = Math.sin(e.t * 9) * 40; if (e.t > 0.85) { e.st = 1; e.ang = aimAng(e.x, e.y); } }
    else { e.sp = Math.min(380, e.sp + 520 * dt); e.ang += Math.atan2(Math.sin(aimAng(e.x, e.y) - e.ang), Math.cos(aimAng(e.x, e.y) - e.ang)) * dt * 1.2; e.vx = Math.cos(e.ang) * e.sp; e.vy = Math.sin(e.ang) * e.sp; }
  },
  sniper(e, dt) {
    const o = e.o, p = g.p;
    if (e.ttl < 90 && e.t > e.ttl) { Enemies.leave(e, dt); return; }
    if (e.t > 11) { Enemies.leave(e, dt); return; }
    if (e.st === 0) { e.vy = 110; if (e.y >= 78) { e.st = 1; e.stT = 0; e.cd = 1.3; e.vy = 0; } return; }
    e.vx = clamp((p.x - e.x) * 0.5, -60, 60); e.vy = 0;
    if (e.st === 1) { e.cd -= dt; if (e.cd <= 0) { e.st = 2; e.ct = 1.15; Aud.sfx('charge'); } }
    else if (e.st === 2) {
      e.ct -= dt; e.vx *= 0.3;
      if (e.ct > 0.4) e.aimA = aimAng(e.x, e.y);
      if (e.ct <= 0) { shootAng(e.x, e.y, e.aimA, 470, { kind: 'needle', r: 3.6, dmg: g.bdmg * 1.3 }); e.st = 1; e.cd = 2.6 / g.fr; }
    }
  },
  carrier(e, dt) {
    if (!e.init) { e.init = 1; e.x0 = e.x; e.sd = 0; }
    if (e.t > 15) { Enemies.leave(e, dt); return; }
    if (e.y < 92) { e.vy = 55; return; } e.vy = 0;
    e.x = clamp(e.x0 + Math.sin((e.t - 1.5) * 0.8) * 90, 40, W - 40);
    e.sd -= dt; if (e.sd <= 0) { e.sd = 2.1 / g.fr; for (let i = -1; i <= 1; i += 2) { const d = Enemies.spawn('drone', e.x + i * 18, e.y + 16, { vx: i * 40 }); } }
    if (Enemies.cool(e, dt, 3.3)) Pat.fan(e.x, e.y + 14, 4, 0.9, 175, aimAng(e.x, e.y), null);
  },
  drone(e, dt) {
    if (!e.init) { e.init = 1; e.vy = 140; e.bx = e.o.vx || 0; e.ph = Math.random() * 6; }
    e.vx = e.bx * 1.5 + Math.cos(e.t * 4 + e.ph) * 85;
  },
  mine(e, dt) {
    e.vy = 52; e.rot = (e.rot || 0) + dt * 0.5;
    if (e.y > 20 && Enemies.cool(e, dt, 3.2)) { Pat.ring(e.x, e.y, 8 + Math.min(4, g.gi >> 2), 110, e.rot * 2, null); }
  },
  spiraler(e, dt) {
    if (e.t > 17) { Enemies.leave(e, dt); return; }
    if (e.y < 140 && e.st === 0) { e.vy = 70; return; } e.vy = 0; e.st = 1;
    e.cyc = (e.cyc || 0) + dt; const L = 2.4, R = 2.2;
    if (e.cyc % (L + R) < L) {
      e.sp = (e.sp || 0) - dt;
      if (e.sp <= 0) { e.sp = 0.115 / g.fr; e.sa = (e.sa || 0) + 0.31; for (let a = 0; a < 2; a++) shootAng(e.x, e.y, e.sa + a * Math.PI, 150, null); }
    }
  },
  gunship(e, dt) {
    const o = e.o;
    if (e.t > 18) { Enemies.leave(e, dt); return; }
    if (e.st === 0) { e.vy = 80; if (e.y >= 105) { e.st = 1; e.stT = 0; e.vy = 0; } return; }
    e.stT += dt; const tx = o.x || W / 2;
    e.vx = clamp((tx - e.x) * 0.6, -70, 70); e.vy = 0;
    if (e.st === 1 && e.stT > 1.2) { e.st = 2; e.stT = 0; e.vx = 0; g.lz.push({ own: e, ox: 0, oy: 16, x: e.x, y: e.y, ang: Math.PI / 2, tele: 1.0, dur: 0.9, w: 26, dmg: 16 + g.si * 2, src: 'Gunship laser', t: 0, tick: 0 }); Aud.sfx('charge'); }
    else if (e.st === 2) { e.vx = 0; if (e.stT > 1.9 + 0.2) { e.st = 3; e.stT = 0; } }
    else if (e.st === 3 && e.stT > 1.8 / g.fr) { e.st = 1; e.stT = 0; o.x = clamp(g.p.x + frand(-80, 80), 60, W - 60); }
  },
  frigate(e, dt) {
    if (e.t > 18) { Enemies.leave(e, dt); return; }
    if (e.y < 115 && e.st === 0) { e.vy = 70; return; } e.vy = 0; e.st = 1;
    e.vx = Math.sin(e.t * 0.6) * 38;
    if (Enemies.cool(e, dt, 2.7)) { for (const s of [-1, 1]) Pat.homing(e.x + s * 16, e.y + 10, Math.PI / 2 + s * 0.7, 150, null); Aud.sfx('missile'); }
  },
  cargo(e, dt) {
    if (!e.init) { e.init = 1; e.vy = 105; e.vx = (e.o.dir || 1) * 130; }
    if (e.x < ZL() + 30) e.vx = Math.abs(e.vx); else if (e.x > ZL() + ZW() - 30) e.vx = -Math.abs(e.vx);
  }
};

/* ---------- boss attacks: tele = warning seconds, dur = active seconds ---------- */
function tickEvery(a, key, iv, dt, fn) { a[key] = (a[key] === undefined ? 0 : a[key]) - dt; while (a[key] <= 0) { a[key] += iv; fn(); } }
const BOSS_ATK = {
  fan: {
    tele: 0.8, dur: 2.5,
    tick(e, t, dt) { tickEvery(e.a, 'f', 0.62 / g.fr, dt, () => { Pat.fan(e.x, e.y + e.r * 0.5, 7 + e.ph, 1.25, 180 + e.ph * 15, aimAng(e.x, e.y), { src: e.d.name }); Aud.sfx('shoot2'); }); }
  },
  ring: {
    tele: 0.8, dur: 3.2,
    tick(e, t, dt) { tickEvery(e.a, 'r', 0.78 / g.fr, dt, () => { e.a.rot = (e.a.rot || 0) + 0.19; Pat.ring(e.x, e.y, 16 + e.ph * 3, 120 + e.ph * 8, e.a.rot, { src: e.d.name, r: 5 }); Aud.sfx('shoot2'); }); }
  },
  stream: {
    tele: 0.6, dur: 2.4,
    tick(e, t, dt) { tickEvery(e.a, 's', 0.1 / g.fr, dt, () => { Pat.aimed(e.x, e.y + e.r * 0.6, 245 + e.ph * 20, { src: e.d.name, r: 3.8 }, frand(-0.1, 0.1)); }); }
  },
  spiral: {
    tele: 0.9, dur: 4.2,
    tick(e, t, dt) { const arms = 2 + (e.ph > 1 ? 1 : 0); tickEvery(e.a, 'p', 0.105 / g.fr, dt, () => { e.a.ang = (e.a.ang || 0) + 0.29; for (let k = 0; k < arms; k++) shootAng(e.x, e.y, e.a.ang + k * TAU / arms, 150, { src: e.d.name, r: 4.2 }); }); }
  },
  sweep: {
    tele: 1.2, dur: 3.0,
    warn(e, ctx, k) { const arms = e.ph > 0 ? 2 : 1; for (let i = 0; i < arms; i++) { const ang = Math.PI / 2 + (i ? 0.85 : -0.85); ctx.beam(e.x, e.y + e.r * 0.4, ang, 4); } },
    start(e) {
      e.a.lz = [];
      const arms = e.ph > 0 ? 2 : 1;
      for (let i = 0; i < arms; i++) { const l = { own: e, ox: 0, oy: e.r * 0.4, x: e.x, y: e.y, ang: Math.PI / 2, tele: 0, dur: 3.0, w: 20, dmg: 16 + g.si * 2, src: e.d.name + ' beam', t: 0, tick: 0, dir: i ? -1 : 1 }; g.lz.push(l); e.a.lz.push(l); }
    },
    tick(e, t, dt) { for (const l of e.a.lz) { const u = t / 3.0; l.ang = Math.PI / 2 + (l.dir > 0 ? lerp(-0.85, 0.85, u) : lerp(0.85, -0.85, u)); } },
    end(e) { g.lz = g.lz.filter(l => e.a.lz.indexOf(l) < 0); }
  },
  grid: {
    tele: 1.3, dur: 1.5,
    pre(e) { const n = Math.ceil(W / 64), slots = []; for (let i = 0; i < n; i++) slots.push(i); const pick = g.rng.shuffle(slots).slice(0, Math.round(n * 0.5) + (e.ph > 1 ? 1 : 0)); e.a.cols = pick.map(i => 30 + i * ((W - 60) / (n - 1))); },
    warn(e, ctx, k) { for (const x of e.a.cols) ctx.beam(x, 0, Math.PI / 2, 26 * k); },
    start(e) { for (const x of e.a.cols) g.lz.push({ x, y: 0, ang: Math.PI / 2, tele: 0, dur: 1.4, w: 30, dmg: 18 + g.si * 2, src: e.d.name + ' laser grid', t: 0, tick: 0 }); Aud.sfx('laser'); },
    tick(e, t, dt) { }
  },
  missiles: {
    tele: 0.6, dur: 2.2,
    tick(e, t, dt) {
      const a = e.a; if (!a.n) a.n = 0;
      if (t > a.n * 0.7 && a.n < 3) { a.n++; for (const s of [-1, 1]) Pat.homing(e.x + s * e.r * 0.6, e.y + e.r * 0.3, Math.PI / 2 + s * 0.7, 150 + e.ph * 15, { src: e.d.name + ' missile' }); Aud.sfx('missile'); }
    }
  },
  summon: {
    tele: 0.8, dur: 1.4,
    start(e) {
      const live = g.en.filter(x => !x.dead && !x.boss).length; if (live > 6) return;
      const t = e.d.adds || 'drone', n = 3 + e.ph;
      for (let i = 0; i < n; i++) Enemies.spawn(t, e.x + (i - (n - 1) / 2) * 44, e.y + e.r * 0.6, { vx: (i - (n - 1) / 2) * 30, dir: i % 2 ? 1 : -1 });
      Aud.sfx('missile');
    },
    tick() { }
  },
  rain: {
    tele: 0.9, dur: 4.2,
    tick(e, t, dt) {
      tickEvery(e.a, 'rn', 0.58 / g.fr, dt, () => { // rain stays inside the action zone and always leaves a wide gap
        const gap = g.rng.range(ZL() + 80, ZL() + ZW() - 80);
        for (let x = ZL() + 14; x < ZL() + ZW(); x += 40) if (Math.abs(x - gap) > 62) shootAng(x, -8, Math.PI / 2, 130, { src: e.d.name + ' spores', r: 4.6, col: g.sec.bul });
      });
    }
  }
};

/* ---------- wave blueprints: push(dt, type, x, y, opts) ---------- */
/* Waves spawn inside a central "action zone" (max 900 wide) so a wide window still gets dense, reachable fights */
const ZW = () => Math.min(W, 900), ZL = () => (W - ZW()) / 2;
const zr = (rng, lo, hi) => rng.range(ZL() + lo, ZL() + ZW() - hi);
const DENS = 1.15, N = n => Math.max(1, Math.round(n * DENS)); // global enemy-count multiplier per wave
const WD = () => Math.min(2.8, (0.6 + ZW() / 1200) * DENS); // density for wide arenas
const WAVES = {
  column(c, type) { const n = Math.min(11, N(3 + c.k)), x = zr(c.rng, 60, 60); for (let i = 0; i < n; i++) c.push(i * 0.38, type, x, -20, { vx: (W / 2 - x) * 0.04 }); return n * 0.38 + 1; },
  sweep(c, type) { const n = Math.round(Math.min(9, 4 + c.k) * WD()), dir = c.rng.sign(); for (let i = 0; i < n; i++) { const x = ZL() + 40 + (dir > 0 ? i : n - 1 - i) * (ZW() - 80) / (n - 1); c.push(i * 0.28, type, x, -20, {}); } return n * 0.28 + 1; },
  pair(c, type) { const L = ZL(), Z = ZW(); c.push(0, type, L + Z * 0.3, -20, { ph: 0 }); c.push(0, type, L + Z * 0.7, -20, { ph: Math.PI }); if (c.k >= 1) c.push(1.2, type, L + Z * 0.5, -20, { ph: 1.5, amp: 90 }); if (c.k >= 3) { c.push(2.2, type, L + Z * 0.2, -20, { ph: 0 }); c.push(2.2, type, L + Z * 0.8, -20, { ph: Math.PI }); } c.push(3.4, type, L + Z * 0.35, -20, { ph: 2.2 }); c.push(3.4, type, L + Z * 0.65, -20, { ph: 4 }); return 5; },
  row(c, type) { const n = Math.round((3 + Math.min(c.k, 3)) * WD()); for (let i = 0; i < n; i++) c.push(i * 0.12, type, ZL() + 50 + i * (ZW() - 100) / (n - 1), -20, { ph: 0, amp: 38 }); return 4; },
  rush(c, type) { const n = Math.round(Math.min(9, 3 + c.k) * WD()); for (let i = 0; i < n; i++) c.push(i * 0.55, type, zr(c.rng, 40, 40), -20, {}); return n * 0.55 + 1.5; },
  turrets(c, type) { const n = Math.round((2 + (c.k >> 1)) * WD()); for (let i = 0; i < n; i++) c.push(i * 0.9, type, ZL() + 50 + ((i * 137 + c.rng.int(0, 200)) % (ZW() - 100)), -20, {}); return n * 0.9 + 3; },
  mines(c, type) { const n = Math.round((2 + (c.k >> 1)) * WD()); for (let i = 0; i < n; i++) c.push(i * 1.1, type, zr(c.rng, 50, 50), -20, {}); return n * 1.1 + 2; },
  snipers(c, type) { c.push(0, type, ZL() + 100, -20, {}); c.push(0.6, type, ZL() + ZW() - 100, -20, {}); if (c.k >= 4 || ZW() >= 800) c.push(1.2, type, W / 2, -20, {}); return 4.5; },
  single(c, type) { c.push(0, type, zr(c.rng, 130, 130), -30, { x: zr(c.rng, 100, 100) }); if ((c.k >= 4 || (ZW() >= 800 && c.k >= 2)) && type !== 'carrier') c.push(1.5, type, zr(c.rng, 100, 100), -30, { x: zr(c.rng, 100, 100) }); return 5.5; },
  vee(c, type) { const cx = zr(c.rng, 120, 120), dir = c.rng.sign(); [[0, 0], [-34, -28], [34, -28], [-68, -56], [68, -56], [-102, -84], [102, -84]].slice(0, 3 + Math.min(4, c.k)).forEach(([ox, oy], i) => c.push(Math.abs(ox) / 120, type, cx + ox, -20 + oy, { ty: 120 + Math.abs(ox) * 0.2, dir })); return 5; },
  trio(c, type) { const dir = c.rng.sign(); for (let i = 0; i < N(3 + Math.min(c.k, 3)); i++) c.push(i * 0.45, type, dir > 0 ? ZL() + 40 : ZL() + ZW() - 40, -20, { ty: 100 + i * 24, dir: -dir }); return 5; },
  swarm(c, type) { const n = Math.round((8 + c.k * 2) * WD()); for (let i = 0; i < n; i++) c.push(i * 0.2, type, zr(c.rng, 30, 30), -20, { vx: c.rng.range(-50, 50) }); return n * 0.2 + 1.5; },
  cargo(c, type) { const dir = c.rng.sign(); for (let i = 0, n = Math.round(5 * WD()); i < n; i++) c.push(i * 0.5, type, zr(c.rng, 60, 60), -20, { dir: dir * (i % 2 ? 1 : -1) }); return 4; }
};

/* ---------- stage scripting ---------- */
const LIGHT_BP = { column: 1, sweep: 1, swarm: 1, rush: 1, pair: 1, few: 1, row: 1, strafe: 1, swoop: 1 };
const Stage = {
  build(g_) {
    const sec = g_.sec, rng = g_.rng, node = g_.node, sti = g_.sti, ev = [];
    const inten = (g_.si >= 99 ? 1 : g_.si) * 1.0 + sti * 0.3 + g_.diff.id * 0.35;
    const c = { rng, k: 0, t: 0, inten, push(dt, type, x, y, o) { o = o || {}; if (c.mv && MOVABLE[type] && !o.mv) o.mv = c.mv; ev.push({ t: c.t + dt, type, x, y, o }); } };
    c.t = 2.6;
    if (node.type === 'secret') {
      while (c.t < 24) { c.k = 1; const len = WAVES.cargo(c, 'cargo'); c.t += len + 0.5; }
    } else {
      const target = node.type === 'boss' ? 11 : node.type === 'elite' ? 14 : Math.min(58, 40 + sti * 2.5);
      let pool = sec.roster.filter(w => w.from <= sti);
      if (!pool.length) pool = sec.roster;
      const minN = node.type === 'combat' ? 45 + sti * 3 : 0; // keep fights busy: min enemy count per combat stage
      /* Three independent lanes run in parallel so several DIFFERENT enemy types share the screen:
         fodder (fast, weak), mid (turrets, splitters, saws...) and heavy (gunships, carriers, snipers...). */
      const cls = x => { const d = ENEMIES[x.type]; return (d.big || x.bp === 'single' || x.bp === 'support' || x.bp === 'snipers') ? 'heavy' : (d.hp <= 9 ? 'light' : 'mid'); };
      const lanes = [
        { cls: 'light', t: 2.6, gap: [0.2, 0.9], last: null },
        { cls: 'mid', t: 3.2 + (sti ? 0 : 0.6), gap: [0.4, 1.3], last: null },
        { cls: 'heavy', t: 5 + (sti ? 0 : 2), gap: [1.2, 3.2], last: null }
      ];
      for (const l of lanes) { l.pool = pool.filter(x => cls(x) === l.cls); if (!l.pool.length) { l.pool = pool; if (l.cls === 'heavy') l.gap = [0.9, 2.2]; } } // early stages have no heavies: the third lane borrows from the whole pool
      const ok = l => l.pool.length && (l.t < target || (ev.length < minN && l.cls !== 'heavy' && l.t < target + 12));
      for (let guard = 0; guard < 400; guard++) {
        const act = lanes.filter(ok); if (!act.length) break;
        const l = act.reduce((m, x) => x.t < m.t ? x : m);
        const others = lanes.filter(o => o !== l && o.last).map(o => o.last.type);
        const w = rng.weighted(l.pool, x => x.w * (x.type === (l.last && l.last.type) ? 0.15 : 1) * (others.includes(x.type) ? 0.3 : 1));
        l.last = w; c.t = l.t; c.k = Math.floor(inten * 0.9) + rng.int(0, 1); c.mv = pickMv(rng, sec);
        const len = WAVES[w.bp](c, w.type);
        l.t += len + rng.range(l.gap[0], l.gap[1]) / (1 + inten * 0.06);
      }
      c.t = Math.max.apply(null, lanes.map(l => l.t));
      if (node.type === 'boss') ev.push({ t: c.t + 3, boss: sec.boss });
      else if (node.type === 'elite') ev.push({ t: c.t + 2, boss: sec.mini, mini: true });
    }
    ev.sort((a, b) => a.t - b.t);
    return ev;
  },
  spawnDue() {
    while (g.si_ < g.script.length && g.script[g.si_].t <= g.t) {
      const e = g.script[g.si_++];
      if (e.boss) Enemies.spawnBoss(e.boss, e.mini);
      else if (e.drop) dropPickup(W / 2, 80, 'wpn', { offer: Run.rareDrop(g.run, g.rng, true) });
      else Enemies.spawn(e.type, e.x, e.y, e.o);
    }
  },
  checkEnd(dt) {
    if (g.state === 'dead') { if (g.stT > 1.9 && !g.done) { g.done = 1; g.cb.dead(); } return; }
    if (g.state === 'play') {
      if (g.bossDying > 0) {
        g.bossDying -= dt;
        if (g.frame % 5 === 0) explosion(g.bossPos.x + frand(-g.bossPos.r, g.bossPos.r), g.bossPos.y + frand(-g.bossPos.r, g.bossPos.r) * 0.7, 18 + Math.random() * 16, g.sec.glow);
        if (g.frame % 12 === 0) { Aud.sfx('boom'); g.shake = Math.max(g.shake, 8); }
        if (g.bossDying <= 0) { g.state = 'clear'; g.stT = 0; Aud.sfx('win'); g.banner = 'SECTOR CLEARED'; g.bannerT = 3; }
        return;
      }
      if (g.si_ >= g.script.length && !g.en.length) { g.state = 'clear'; g.stT = 0; Aud.sfx('win'); g.banner = g.node.type === 'secret' ? 'CACHE LOOTED' : 'STAGE CLEARED'; g.bannerT = 2.6; }
    } else if (g.state === 'clear') {
      if (g.stT > 3.2 && !g.done) { g.done = 1; g.cb.clear(); }
    }
  }
};
