/* ===================================================================
   SECTION 20: GAME CORE - stage state, player, weapons, bullets,
   collisions, pickups, sidekicks, specials, juice
   =================================================================== */
let g = null; // current stage state (null while in menus)

const Game = {
  /* start a combat/boss/secret stage for `run` at `node`; cb = {clear(), dead(), swap(offer)} */
  start(run, node, cb) {
    const si = node.si, sec = secOf(si), diff = DIFFS[run.diff];
    const st = Run.derive(run);
    const gi = run.stageNo; // global stage index (0-based)
    const rng = RNG(run.seed + '|stage|' + gi + '|' + node.type);
    g = {
      run, node, si, sec, cb, rng, diff, st, sti: node.sti, gi,
      t: 0, frame: 0, state: 'intro', stT: 0, nid: 0,
      pb: [], eb: [], en: [], pk: [], fx: [], tx: [], lz: [], pt: [], sk: [],
      script: [], si_: 0, scrollV: 55,
      shake: 0, hs: 0, flash: 0, hurtFlash: 0,
      cmb: 1, cmbT: 0, boss: null, bossDying: 0, banner: null, bannerT: 0,
      kills: 0, credits0: run.credits, score0: run.score, hull0: run.hull,
      hpMul: (1 + 0.22 * gi) * diff.hp * run.mods.enemyHp,
      bs: Math.min(1.3, (1 + 0.012 * gi) * diff.bs) * run.mods.enemyBs,
      fr: diff.fr * (1 + 0.008 * gi),
      bdmg: 8 + (si >= 99 ? 2 : si) * 2 + gi * 0.35,
      dmgMul: 1, rateMul: 1, shotN: 0, novaT: run.mods.nova || 0, bleedT: 12, stormCd: 0, hitCount: 0, cloudT: 0,
      showDmg: true
    };
    const p = g.p = {
      x: W / 2, y: H - 110, hull: run.hull, maxHull: st.maxHull, shield: st.maxShield, maxShield: st.maxShield,
      energy: st.maxEnergy, maxEnergy: st.maxEnergy, shT: 0, inv: 1.5, fireT: 0, focus: false,
      spCd: 0, barrier: 0, dashT: 0, dashX: 0, dashY: -1, odT: 0, tr: [], vx: 0, bank: 0, dead: false, rev: false
    };
    p.hull = Math.min(p.hull, p.maxHull);
    g.wm = Run.weaponMods(run);
    p.ward = run.mods.ward; p.lg = false; g.skT = run.mods.seeker; g.strT = run.mods.strike; g.mlT = run.mods.mineLayer;
    Game.rebuildSidekicks();
    Bg.init(si);
    Music.start(sec.music || 'belt');
    if (node.type === 'boss') { /* boss music starts when boss appears */ }
    g.script = Stage.build(g);
    g.banner = node.type === 'boss' ? sec.tag + ' - BOSS' : node.type === 'elite' ? 'ELITE ENCOUNTER' : node.type === 'secret' ? 'SECRET CACHE' : sec.tag + ' - STAGE ' + (node.sti + 1);
    g.bannerT = 2.2;
    return g;
  },

  /* re-derive supply stats after a weapon level change; a bigger tank arrives half full */
  refreshStats() {
    if (!g) return;
    g.st = Run.derive(g.run); g.wm = Run.weaponMods(g.run); const p = g.p, d = g.st.maxEnergy - p.maxEnergy;
    p.maxEnergy = g.st.maxEnergy; if (d > 0) p.energy = Math.min(p.maxEnergy, p.energy + d);
  },

  rebuildSidekicks() {
    g.sk = [];
    const run = g.run;
    [['left', -1], ['right', 1]].forEach(([k, s]) => {
      const d = run[k]; if (!d) return;
      g.sk.push({ id: d.id, slot: s, lvl: Math.min(3, d.lvl + run.mods.sidekick), x: g.p.x + s * 30, y: g.p.y + 10, t: Math.random() * 3, cd: 0.3, ch: 3, chT: 0, burst: 0, ang: s > 0 ? 0 : Math.PI, hitCd: 0 });
    });
  },

  /* fixed step */
  update(dt) {
    if (!g) return;
    if (g.hs > 0) { g.hs -= dt; return; } // hit-stop freeze
    g.frame++; g.t += dt; g.stT += dt;
    const run = g.run, p = g.p, m = run.mods;
    // derived multipliers
    let dm = run.ship.dmg * m.dmg;
    if (m.overcharge && p.energy >= p.maxEnergy * 0.9) dm *= 1 + m.overcharge;
    if (m.lastStand && p.hull < p.maxHull * 0.35) dm *= 1 + m.lastStand * (run.syn.has('martyr') ? 2 : 1);
    if (p.odT > 0) dm *= 1.3;
    if (p.focus && m.focusDmg) dm *= 1 + m.focusDmg;
    g.dmgMul = dm;
    if (p.adrT > 0) p.adrT -= dt;
    g.rateMul = run.ship.rate * m.rate * g.wm.rate * (p.odT > 0 ? 1.5 : 1) * (p.adrT > 0 ? 1 + m.adrenaline : 1) * (m.comboRate && g.cmb >= 4 ? 1 + m.comboRate : 1);

    Bg.update(dt, g.state === 'dead' ? 0.3 : 1);
    if (g.state === 'intro') { g.bannerT -= dt; if (g.stT > 1.6) { g.state = 'play'; g.stT = 0; } }
    if (g.state !== 'dead') this.updatePlayer(dt);
    if (g.state === 'play' || g.state === 'clear') { Stage.spawnDue(); }
    this.updateSidekicks(dt);
    Enemies.update(dt);
    this.updateBullets(dt);
    this.collide(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    // combo decay
    if (g.cmbT > 0) g.cmbT -= dt; else if (g.cmb > 1) g.cmb = Math.max(1, g.cmb - dt * 1.4);
    g.shake *= 0.9; if (g.shake < 0.2) g.shake = 0;
    g.hurtFlash = Math.max(0, g.hurtFlash - dt * 2.5);
    if (g.bannerT > 0 && g.state !== 'intro') g.bannerT -= dt;
    Stage.checkEnd(dt);
  },

  /* ---------------- player ---------------- */
  updatePlayer(dt) {
    const p = g.p, st = g.st, m = g.run.mods, inp = Input;
    p.focus = inp.focus;
    let sp = st.speed * (p.focus ? 0.45 : 1);
    let mx = inp.mx, my = inp.my;
    if (p.dashT > 0) { p.dashT -= dt; p.x += p.dashX * 900 * dt; p.y += p.dashY * 900 * dt; fxTrail(p.x, p.y, '#ffb347'); }
    else { p.x += mx * sp * dt; p.y += my * sp * dt; }
    p.x = clamp(p.x, 14, W - 14); p.y = clamp(p.y, 70, H - 30);
    p.vx = lerp(p.vx, mx, 0.2); p.bank = lerp(p.bank, mx, 0.18);
    if (p.inv > 0) p.inv -= dt;
    if (p.barrier > 0) { p.barrier -= dt; this.eraseBullets(p.x, p.y, 52); }
    if (p.odT > 0) p.odT -= dt;
    p.spCd = Math.max(0, p.spCd - dt);
    // energy / shield / hull regen
    p.energy = Math.min(p.maxEnergy, p.energy + st.enRegen * dt);
    p.recharging = false;
    if (p.shT > 0) p.shT -= dt;
    else if (!m.shieldOff && p.shield < p.maxShield) { // recharging the shield burns energy; no energy = no recharge
      const want = Math.min(p.maxShield - p.shield, st.shRegen * dt), cost = SHIELD_ENERGY * m.energyCost;
      const avail = Math.min(p.energy, 0.55 * st.enRegen * dt + Math.max(0, p.energy - p.maxEnergy * 0.5));
      const can = cost > 0 ? Math.min(want, avail / cost) : want;
      if (can > 0) { p.shield += can; p.energy -= can * cost; p.recharging = true; }
    }
    if (m.hullRegen && p.hull < p.maxHull) p.hull = Math.min(p.maxHull, p.hull + m.hullRegen * dt);
    if (m.bleed) { g.bleedT -= dt; if (g.bleedT <= 0) { g.bleedT = 12; p.hull -= 1; ftext(p.x, p.y - 20, '-1', '#c88bff', 12); if (p.hull <= 0) { p.hull = 0; this.die('Blood Pact'); } } }
    if (m.nova) { g.novaT -= dt; if (g.novaT <= 0) { g.novaT = m.nova; this.novaBlast(45, 'Nova Heart'); } }
    // fire
    p.fireT -= dt;
    if (inp.fire && g.state !== 'intro') this.fireFront();
    // special, consumables
    if (Input.take('special')) this.useSpecial();
    if (Input.take('repair') && g.run.cons.repair > 0 && p.hull < p.maxHull) { g.run.cons.repair--; this.healPlayer(40); sfxp('pickup'); }
    if (Input.take('cell') && g.run.cons.cell > 0) { g.run.cons.cell--; p.energy = p.maxEnergy; p.shield = p.maxShield; ftext(p.x, p.y - 24, 'RECHARGED', '#7ff', 13); sfxp('pickup'); }
    // automatic weapons from upgrades
    if (m.seeker) { g.skT -= dt; if (g.skT <= 0) { g.skT = m.seeker; for (let i = 0; i < 6; i++) pshot(g, p.x, p.y - 8, -75 + i * 30, 300, 3.2, { col: '#ffb347', kind: 'missile', homing: 7, aoe: 24, life: 3, sk: 1, accel: 1.012, r: 4 }); sfxp('missile'); } }
    if (m.strike) { g.strT -= dt; if (g.strT <= 0) { g.strT = m.strike; let t = null, bh = -1; for (const e of g.en) if (!e.dead && e.y > 10 && e.y < H - 20 && !e.inv && e.hp > bh) { bh = e.hp; t = e; } if (t) { hitEnemy(t, 16 * g.dmgMul + (t.boss ? 0 : t.maxHp * 0.22), null, true); g.fx.push({ k: 'ring', x: t.x, y: t.y, r: 6, rmax: 60, t: 0, dur: 0.35, col: '#fff', w: 4 }); g.fx.push({ k: 'glow', x: t.x, y: t.y, r: 40, t: 0, dur: 0.25 }); burst(t.x, t.y, 12, '#fff', 200, 0.4, 3); Aud.sfx('laser'); } } }
    if (m.mineLayer) { g.mlT -= dt; if (g.mlT <= 0) { g.mlT = m.mineLayer; pshot(g, p.x, p.y + 16, 180, 55, 8, { col: '#ff6a6a', kind: 'mine', r: 6, aoe: 56, life: 7, sk: 1 }); } }
    if (Input.take('bomb') && g.run.cons.bomb > 0 && g.state !== 'intro') { g.run.cons.bomb--; this.novaBlast(38, 'Smart Bomb'); }
    // engine trail
    if (g.frame % 2 === 0) g.pt.push({ k: 'dot', x: p.x + frand(-3, 3), y: p.y + 22, vx: frand(-10, 10), vy: frand(120, 200), life: 0.28, max: 0.28, col: g.run.ship.col, size: frand(1.2, 2.2) });
  },

  fireFront() {
    const p = g.p, run = g.run, W_ = FRONT[run.front.id], m = run.mods;
    if (p.fireT > 0) return;
    const lvl = run.front.lvl; let cost = W_.cost(lvl) * m.energyCost;
    if (run.syn.has('perpet') && p.energy > p.maxEnergy * 0.75) cost = 0;
    if (p.energy < cost) { p.starved = true; p.fireT = 0.03; return; } // generator-limited: no cliff, the shot just waits for energy
    p.starved = false; p.energy -= cost;
    W_.fire(g, p, lvl);
    g.shotN++;
    if (run.syn.has('blitz') && g.shotN % 12 === 0) { W_.fire(g, p, lvl); }
    p.fireT += W_.rate(lvl) / g.rateMul; if (p.fireT < 0) p.fireT = 0;
    g.fx.push({ k: 'muz', x: p.x, y: p.y - 18, t: 0, dur: 0.07, col: W_.col });
    sfxp(run.front.id === 'missile' || run.front.id === 'flak' ? 'missile' : (lvl >= 6 ? 'shoot2' : 'shoot'));
  },
  useSpecial() {
    const p = g.p, sp = g.run.ship.special;
    if (p.spCd > 0 || p.energy < sp.cost || g.state === 'intro') { if (p.spCd > 0 || p.energy < sp.cost) Aud.sfx('lock'); return; }
    p.energy -= sp.cost; p.spCd = sp.cd;
    Aud.sfx('special');
    if (sp.id === 'barrier') { p.barrier = 2.5; p.inv = Math.max(p.inv, 2.5); g.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, rmax: 56, t: 0, dur: 0.4, col: '#6df0ff', follow: 1 }); }
    else if (sp.id === 'dash') {
      let dx = Input.mx, dy = Input.my; if (!dx && !dy) dy = -1; const l = Math.hypot(dx, dy); p.dashX = dx / l; p.dashY = dy / l; p.dashT = 0.13; p.inv = Math.max(p.inv, 0.55);
    } else if (sp.id === 'nova') this.novaBlast(60 * 1, 'Nova Bomb');
    // sidekick burst
    for (const k of g.sk) k.burst = 1.6;
    for (const k of g.sk) if (k.id === 'drone') for (let i = 0; i < 8; i++) pshot(g, k.x, k.y, i * 45, 520, 2 + k.lvl, { col: '#6df0ff', sk: 1 });
    for (const k of g.sk) if (k.id === 'pod') for (let i = 0; i < 4; i++) pshot(g, k.x, k.y, (i - 1.5) * 28, 280, 4 + k.lvl * 1.4, { col: '#ffb347', kind: 'missile', homing: 7, aoe: 28, life: 3, sk: 1, accel: 1.012, r: 4 });
    for (const k of g.sk) if (k.id === 'orb') { this.eraseBullets(k.x, k.y, 90); g.fx.push({ k: 'ring', x: k.x, y: k.y, r: 8, rmax: 90, t: 0, dur: 0.4, col: '#9dff5a' }); this.aoe(k.x, k.y, 90, 6 + k.lvl * 3, null); k.ch = 3; }
  },

  novaBlast(dmg, name) {
    const p = g.p; Aud.sfx('nova');
    this.eraseBullets(p.x, p.y, 2000);
    g.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, rmax: 700, t: 0, dur: 0.7, col: '#fff', w: 6 });
    g.fx.push({ k: 'flash', t: 0, dur: 0.3 });
    g.shake = Math.max(g.shake, 12);
    for (const e of g.en) { if (e.dead) continue; hitEnemy(e, e.boss ? dmg * 1.6 : dmg * 3, null, true); }
    g.hs = Math.max(g.hs, 0.08);
  },

  eraseBullets(x, y, r) {
    const r2 = r * r;
    for (let i = g.eb.length - 1; i >= 0; i--) { const b = g.eb[i]; if (dist2(b.x, b.y, x, y) < r2) { burst(b.x, b.y, 3, b.col, 60, 0.3, 2); g.eb.splice(i, 1); } }
  },

  healPlayer(n) { const p = g.p; const h = Math.min(n, p.maxHull - p.hull); p.hull += h; ftext(p.x, p.y - 22, '+' + Math.round(h) + ' HULL', '#6f6', 13); },

  /* damage to the player from a bullet/laser/contact */
  hurt(dmg, src) {
    const p = g.p; if (p.dead || g.state === 'dead') return false;
    if (p.inv > 0 || p.barrier > 0) return false;
    if (p.ward > 0) { p.ward--; p.inv = 1.0; ftext(p.x, p.y - 26, 'WARD', '#9ff', 13); burst(p.x, p.y, 14, '#9ff', 160, 0.4, 3); g.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, rmax: 50, t: 0, dur: 0.3, col: '#9ff' }); Aud.sfx('shield'); return true; }
    dmg *= g.diff.dt * (1 - g.st.dr) * g.run.mods.dmgTaken;
    let left = dmg;
    if (p.shield > 0) {
      const a = Math.min(p.shield, left); p.shield -= a; left -= a;
      if (p.shield <= 0) {
        Aud.sfx('shieldbreak'); ftext(p.x, p.y - 26, 'SHIELD DOWN', '#6cf', 13);
        if (g.run.mods.shieldBurst && g.t - (p.sbT === undefined ? -99 : p.sbT) > 6) { p.sbT = g.t; this.eraseBullets(p.x, p.y, 120); g.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, rmax: 120, t: 0, dur: 0.4, col: '#6cf', w: 4 }); if (g.run.syn.has('reactor2')) p.shield = Math.min(p.maxShield, 30); }
      }
      else Aud.sfx('shield');
    }
    p.shT = g.st.shDelay;
    p.inv = 0.75 + g.run.mods.iframes + (g.run.syn.has('martyr') ? 0.4 : 0);
    if (g.run.mods.adrenaline) p.adrT = 4;
    g.run.stats.hits++;
    g.cmb = Math.max(1, g.cmb * 0.5); g.cmbT = 0;
    g.shake = Math.max(g.shake, 8); g.hurtFlash = 1; g.hs = Math.max(g.hs, 0.05);
    burst(p.x, p.y, 14, '#fff', 180, 0.4, 3);
    if (left > 0) {
      p.hull -= left; Aud.sfx('hurt');
      if (p.hull <= 0) { p.hull = 0; this.die(src || 'Unknown'); }
      else if (g.run.mods.lastGasp && !p.lg && p.hull < p.maxHull * 0.25) { p.lg = true; this.eraseBullets(p.x, p.y, 2000); p.shield = Math.max(p.shield, p.maxShield * 0.4); p.inv = 2.5; ftext(p.x, p.y - 30, 'LAST GASP', '#ff9', 14); g.fx.push({ k: 'ring', x: p.x, y: p.y, r: 10, rmax: 200, t: 0, dur: 0.5, col: '#ffe066', w: 4 }); Aud.sfx('nova'); }
    }
    return true;
  },
  die(src) {
    const p = g.p, run = g.run;
    if (run.mods.revive && !run.revived) {
      run.revived = true; p.hull = p.maxHull * 0.5; p.inv = 3; this.novaBlast(80, 'Phoenix');
      g.banner = 'PHOENIX PROTOCOL'; g.bannerT = 2; return;
    }
    p.dead = true; g.state = 'dead'; g.stT = 0; run.killedBy = src;
    explosion(p.x, p.y, 36, '#6df0ff'); g.hs = 0.2; g.shake = 18; Aud.sfx('boom'); Music.stop();
    g.fx.push({ k: 'flash', t: 0, dur: 0.4 });
  },

  /* ---------------- sidekicks ---------------- */
  updateSidekicks(dt) {
    if (!g.sk.length) return;
    const p = g.p, m = g.run.mods, hive = g.run.syn.has('hive');
    const rate = (1 + m.sidekickRate) * (hive ? 1.4 : 1);
    for (const k of g.sk) {
      k.t += dt; k.hitCd -= dt; k.cd -= dt;
      if (k.burst > 0) k.burst -= dt;
      const L = k.lvl;
      let tx, ty;
      if (k.id === 'drone') { tx = p.x + k.slot * (34 + Math.sin(k.t * 2) * 6); ty = p.y + 6 + Math.cos(k.t * 2.6 + k.slot) * 10; }
      else if (k.id === 'turret') { tx = p.x + k.slot * 30; ty = p.y + 4; }
      else if (k.id === 'pod') { tx = p.x + k.slot * 24; ty = p.y + 16; }
      else { const a = k.t * 3.2 + (k.slot > 0 ? Math.PI : 0); tx = p.x + Math.cos(a) * 36; ty = p.y + Math.sin(a) * 30; if (k.ch < 3) { k.chT += dt; if (k.chT > 4) { k.ch++; k.chT = 0; } } }
      k.x = lerp(k.x, tx, k.id === 'orb' ? 0.5 : 0.25); k.y = lerp(k.y, ty, k.id === 'orb' ? 0.5 : 0.25);
      if (k.id === 'drone' && k.cd <= 0) {
        k.cd = (0.46 - 0.07 * L) / rate / (k.burst > 0 ? 2 : 1);
        const o = { col: '#6df0ff', sk: 1, homing: hive ? 4 : 0, r: 2.6 };
        if (L >= 3) { pshot(g, k.x - 3, k.y - 6, 0, 640, 1.3 + 0.4 * L, o); pshot(g, k.x + 3, k.y - 6, 0, 640, 1.3 + 0.4 * L, o); }
        else pshot(g, k.x, k.y - 6, 0, 640, 1.3 + 0.4 * L, o);
        if (g.frame % 4 === 0) Aud.sfx('side');
      } else if (k.id === 'turret' && k.cd <= 0) {
        k.cd = (0.4 - 0.06 * L) / rate / (k.burst > 0 ? 2.5 : 1);
        const e = Enemies.nearest(k.x, k.y, 520);
        let ang = 0; if (e) ang = clamp(Math.atan2(e.x - k.x, -(e.y - k.y)) * 180 / Math.PI, -75, 75);
        k.ang = ang * Math.PI / 180;
        pshot(g, k.x, k.y - 6, ang, 680, 1.8 + 0.5 * L, { col: '#ffe066', sk: 1, homing: hive ? 4 : 0, r: 2.8 });
        if (g.frame % 4 === 0) Aud.sfx('side');
      } else if (k.id === 'pod' && k.cd <= 0) {
        k.cd = (2.3 - 0.35 * L) / rate;
        const n = L >= 3 ? 2 : 1;
        for (let i = 0; i < n; i++) pshot(g, k.x, k.y - 4, k.slot * (22 + i * 24), 260, 4 + 1.5 * L, { col: '#ffb347', kind: 'missile', homing: 7, aoe: 26 + L * 3, life: 3, sk: 1, accel: 1.012, r: 4 });
        Aud.sfx('missile');
      } else if (k.id === 'orb') {
        // absorb bullets
        for (let i = g.eb.length - 1; i >= 0 && k.ch > 0; i--) {
          const b = g.eb[i];
          if (dist2(b.x, b.y, k.x, k.y) < (13 + b.r) * (13 + b.r)) { g.eb.splice(i, 1); k.ch--; burst(b.x, b.y, 6, '#9dff5a', 90, 0.3, 2); Aud.sfx('shield'); if (k.ch === 0) { k.chT = 0; ftext(k.x, k.y - 12, 'ORB DOWN', '#9f6', 11); } }
        }
        // ram enemies
        if (k.hitCd <= 0) for (const e of g.en) {
          if (e.dead || e.inv) continue;
          if (dist2(e.x, e.y, k.x, k.y) < (e.r + 12) * (e.r + 12)) { hitEnemy(e, (3 + 2 * L) * g.dmgMul, null); k.hitCd = 0.25; break; }
        }
      }
    }
  },

  /* ---------------- bullets ---------------- */
  updateBullets(dt) {
    const p = g.p;
    // player bullets
    for (let i = g.pb.length - 1; i >= 0; i--) {
      const b = g.pb[i];
      b.age += dt;
      if (b.kind === 'mine') {
        b.y += g.scrollV * dt * 0.9; b.vx *= 0.98;
        b.x += b.vx * dt;
        if (b.age > b.life) { g.pb.splice(i, 1); continue; }
        if (b.y > H + 20) { g.pb.splice(i, 1); continue; }
        let near = null; for (const e of g.en) if (!e.dead && dist2(e.x, e.y, b.x, b.y) < (e.r + 26) * (e.r + 26)) { near = e; break; }
        if (near) { this.detonate(b); g.pb.splice(i, 1); }
        continue;
      }
      if (b.hom > 0) {
        let t = b.tgt; if (!t || t.dead || (g.frame + i) % 20 === 0) { t = b.tgt = Enemies.nearest(b.x, b.y, 380, b); }
        if (t) {
          const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(t.y - b.y, t.x - b.x);
          let d = want - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          const turn = clamp(d, -b.hom * dt, b.hom * dt), a = cur + turn, sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
        }
      }
      if (b.accel) { b.vx *= b.accel; b.vy *= b.accel; }
      if (b.kind === 'missile' && g.frame % 2 === 0) { g.pt.push({ k: 'dot', x: b.x - b.vx * 0.012, y: b.y - b.vy * 0.012, vx: 0, vy: 0, life: 0.32, max: 0.32, col: '#ff9a3a', size: 1.8 }); if (g.frame % 6 === 0) g.pt.push({ k: 'smoke', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.6, max: 0.6, col: '#222', size: 2.4 }); }
      if (b.wv) { b.wv.bx += b.vx * dt; b.y += b.vy * dt; b.x = b.wv.bx + Math.sin(b.age * b.wv.freq + b.wv.ph) * b.wv.amp; }
      else { b.x += b.vx * dt; b.y += b.vy * dt; }
      if (b.bounce > 0) {
        let bn = false;
        if (b.x < 4) { b.x = 4; b.vx = Math.abs(b.vx); bn = true; } else if (b.x > W - 4) { b.x = W - 4; b.vx = -Math.abs(b.vx); bn = true; }
        if (b.y < 4 && b.vy < 0) { b.y = 4; b.vy = Math.abs(b.vy); bn = true; }
        if (bn) { b.bounce--; if (g.run.syn.has('chain')) { b.dmg *= 1.3; b.pierce++; } burst(b.x, b.y, 3, b.col, 60, 0.2, 2); }
      }
      if (b.age > b.life || b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40) {
        if (b.kind === 'flak' && b.age > b.life) this.detonate(b);
        g.pb.splice(i, 1);
      }
    }
    // enemy bullets
    const slow = (p.focus && g.run.mods.focusSlow ? 1 - g.run.mods.focusSlow : 1) * (1 - g.run.mods.bulletSlow), sdt = dt * slow;
    for (let i = g.eb.length - 1; i >= 0; i--) {
      const b = g.eb[i];
      b.age += sdt;
      if (b.hom) {
        const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(p.y - b.y, p.x - b.x);
        let d = want - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const sp = Math.hypot(b.vx, b.vy), a = cur + clamp(d, -b.hom * sdt, b.hom * sdt);
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
      }
      if (b.curve) { const a = b.curve * sdt, c = Math.cos(a), s = Math.sin(a), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
      if (b.acc) { const f = 1 + b.acc * sdt; b.vx *= f; b.vy *= f; }
      b.x += b.vx * sdt; b.y += b.vy * sdt;
      if (b.kind === 'missile' && g.frame % 3 === 0) g.pt.push({ k: 'dot', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, max: 0.3, col: b.col, size: 1.6 });
      if (b.fuse && b.age >= b.fuse) { Pat.ring(b.x, b.y, b.fn || 8, b.fs || 105, Math.random() * TAU, { src: b.src, r: 4.2 }); burst(b.x, b.y, 8, b.col, 90, 0.3, 2.4); Aud.sfx('shoot2'); g.eb.splice(i, 1); continue; }
      if (b.age > b.life || b.x < -30 || b.x > W + 30 || b.y < -50 || b.y > H + 30) g.eb.splice(i, 1);
    }
    // lasers
    for (let i = g.lz.length - 1; i >= 0; i--) {
      const l = g.lz[i]; l.t += dt;
      if (l.own) { if (l.own.dead) { g.lz.splice(i, 1); continue; } l.x = l.own.x + (l.ox || 0); l.y = l.own.y + (l.oy || 0); }
      if (l.t >= l.tele && !l.fired) { l.fired = true; Aud.sfx('laser'); g.shake = Math.max(g.shake, 3); }
      if (l.t > l.tele + l.dur) { g.lz.splice(i, 1); continue; }
      if (l.fired) {
        l.tick -= dt;
        // distance from player to ray
        const dx = Math.cos(l.ang), dy = Math.sin(l.ang), rx = p.x - l.x, ry = p.y - l.y, along = rx * dx + ry * dy;
        const perp = Math.abs(rx * dy - ry * dx);
        if (along > 0 && perp < l.w / 2 + 3 && l.tick <= 0) { if (this.hurt(l.dmg, l.src)) l.tick = 0.2; }
      }
    }
  },

  detonate(b) {
    // explosion for missile / flak / mine
    if (b.kind === 'flak') {
      const n = b.shrap || 8;
      for (let i = 0; i < n; i++) pshot(g, b.x, b.y, i / n * 360, 380, b.shrapDmg || 1.5, { col: '#ffb070', r: 2.6, life: 0.55, dm: 1 / g.dmgMul });
      g.fx.push({ k: 'ring', x: b.x, y: b.y, r: 4, rmax: 34, t: 0, dur: 0.25, col: '#ff8a4d' });
      Aud.sfx('kill');
    }
    if (b.aoe) this.aoe(b.x, b.y, b.aoe, b.dmg * 0.8, b);
  },
  aoe(x, y, r, dmg, b) {
    g.fx.push({ k: 'ring', x, y, r: 4, rmax: r, t: 0, dur: 0.22, col: '#ffcf70' });
    burst(x, y, 10, '#ffb347', 150, 0.35, 3);
    for (const e of g.en) { if (e.dead) continue; if (dist2(e.x, e.y, x, y) < (r + e.r) * (r + e.r)) hitEnemy(e, dmg, null, true); }
  },

  /* ---------------- collisions ---------------- */
  collide(dt) {
    const p = g.p;
    // player bullets vs enemies
    for (let i = g.pb.length - 1; i >= 0; i--) {
      const b = g.pb[i]; if (b.kind === 'mine') continue;
      let dead = false;
      for (let j = 0; j < g.en.length; j++) {
        const e = g.en[j];
        if (e.dead || e.y < -e.r + 4) continue;
        const rr = e.r + b.r;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          if (b.hits.indexOf(e.id) >= 0) continue;
          b.hits.push(e.id);
          hitEnemy(e, b.dmg, b);
          if (b.aoe || b.kind === 'flak') { this.detonate(b); dead = true; break; }
          if (b.pierce > 0) { b.pierce--; if (b.hits.length > 6) b.hits.shift(); } else { dead = true; break; }
        }
      }
      if (dead) g.pb.splice(i, 1);
    }
    if (g.state === 'dead') return;
    // enemy bullets vs player
    const hb = 1 - g.run.mods.hitbox, hr = 2.6 * hb; // small, fair hitbox (Phase Core shrinks it further)
    for (let i = g.eb.length - 1; i >= 0; i--) {
      const b = g.eb[i]; if (!b) continue; // Reactive Shield can erase bullets mid-loop
      const rr = b.r * 0.6 * hb + hr;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        const hit = this.hurt(b.dmg, b.src);
        if (hit || p.barrier > 0) { const k = g.eb.indexOf(b); if (k >= 0) g.eb.splice(k, 1); }
      }
    }
    // enemies vs player (contact)
    for (const e of g.en) {
      if (e.dead || e.y < 0) continue;
      const rr = e.r * 0.8 + 6 * hb;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        const cd = e.d.contact || (e.boss ? 25 : 14);
        if (this.hurt(cd, e.d.name + ' (collision)')) {
          if (!e.boss && !e.d.big) { e.hp = 0; killEnemy(e, true); } else hitEnemy(e, 10, null);
        }
      }
    }
  },

  /* ---------------- pickups ---------------- */
  updatePickups(dt) {
    const p = g.p, m = g.run.mods, magR = 70 * m.magnet, all = g.run.syn.has('midas') || g.state === 'clear';
    for (let i = g.pk.length - 1; i >= 0; i--) {
      const k = g.pk[i]; k.t += dt;
      const d2 = dist2(k.x, k.y, p.x, p.y);
      const attract = (all && (k.type === 'cred' || g.state === 'clear')) || d2 < magR * magR;
      if (attract && g.state !== 'dead') { const d = Math.sqrt(d2) || 1, sp = all ? 360 : 280; k.x += (p.x - k.x) / d * sp * dt; k.y += (p.y - k.y) / d * sp * dt; }
      else { k.y += (k.type === 'cred' ? 55 : 42) * dt; k.x += Math.sin(k.t * 3 + k.ph) * 14 * dt; }
      if (k.y > H + 20) { g.pk.splice(i, 1); continue; }
      if (g.state !== 'dead' && d2 < 20 * 20) { this.collect(k); g.pk.splice(i, 1); }
    }
  },
  collect(k) {
    const p = g.p, run = g.run;
    if (k.type === 'cred') { const v = Math.max(1, Math.round(k.v * run.mods.credit * (run.syn.has('midas') ? 1.3 : 1))); run.credits += v; run.stats.credits += v; ftext(k.x, k.y - 6, '+' + v, '#ffd23d', 11); Aud.sfx('coin'); }
    else if (k.type === 'pow' && run.front.lvl >= WEAPON_MAX) { const v = Math.max(1, Math.round(15 * (1 + Math.min(g.si, 3) * 0.35 + g.gi * 0.04) * run.mods.credit)); run.credits += v; run.stats.credits += v; ftext(k.x, k.y - 6, '+' + v, '#ffd23d', 12); Aud.sfx('coin'); }
    else if (k.type === 'pow') { Run.addXp(run, 1); ftext(k.x, k.y - 6, 'POWER', '#ff9', 12); Aud.sfx('power'); g.fx.push({ k: 'ring', x: p.x, y: p.y, r: 6, rmax: 40, t: 0, dur: 0.3, col: '#ffe066', follow: 1 }); }
    else if (k.type === 'rep') { this.healPlayer(28); Aud.sfx('pickup'); }
    else if (k.type === 'nrg') { p.energy = Math.min(p.maxEnergy, p.energy + 60); p.shield = Math.min(p.maxShield, p.shield + 15); ftext(k.x, k.y - 6, '+ENERGY', '#6df0ff', 12); Aud.sfx('pickup'); }
    else if (k.type === 'wpn') { Aud.sfx('power'); if (g.cb.swap) g.cb.swap(k.offer); }
    else if (k.type === 'cons') { run.cons[k.id]++; ftext(k.x, k.y - 6, CONSUMABLES[k.id].name.toUpperCase(), '#fff', 12); Aud.sfx('pickup'); }
  },

  /* ---------------- fx ---------------- */
  updateFx(dt) {
    for (let i = g.pt.length - 1; i >= 0; i--) {
      const q = g.pt[i]; q.life -= dt; if (q.life <= 0) { g.pt.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; if (q.drag) { q.vx *= q.drag; q.vy *= q.drag; } if (q.vr) q.rot += q.vr * dt;
    }
    if (g.pt.length > 1000) g.pt.splice(0, g.pt.length - 1000);
    for (let i = g.tx.length - 1; i >= 0; i--) { const q = g.tx[i]; q.t += dt; q.y -= 28 * dt; if (q.t > q.dur) g.tx.splice(i, 1); }
    for (let i = g.fx.length - 1; i >= 0; i--) { const f = g.fx[i]; f.t += dt; if (f.follow) { f.x = g.p.x; f.y = g.p.y; } if (f.t > f.dur) g.fx.splice(i, 1); }
  }
};

/* ---------------- shared helpers (global for data files) ---------------- */
function sfxp(n) { Aud.sfx(n); }
function ftext(x, y, s, col, size) { if (g) g.tx.push({ x, y, s, col: col || '#fff', size: size || 12, t: 0, dur: 0.9 }); }
function burst(x, y, n, col, spd, life, size) {
  if (!g) return;
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.3 + Math.random() * 0.7), l = life * (0.5 + Math.random() * 0.5); g.pt.push({ k: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, col, size: size * (0.45 + Math.random() * 0.6), drag: 0.94 }); }
}
function fxTrail(x, y, col) { if (g) g.pt.push({ k: 'dot', x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, col, size: 5 }); }
function explosion(x, y, r, col) {
  if (!g) return;
  const P = g.pt, R = Math.random, pal = g.sec.pal;
  const nS = Math.min(28, Math.round(r * 0.9) + 4);
  for (let i = 0; i < nS; i++) { const a = R() * TAU, s = 110 + R() * (180 + r * 7), l = 0.3 + R() * 0.45; P.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, col: R() < 0.5 ? '#ffe9a0' : '#ff9a40', size: 1.2 + R() * 1.3, drag: 0.95 }); }
  const nF = Math.min(12, Math.round(r * 0.35) + 3);
  for (let i = 0; i < nF; i++) { const a = R() * TAU, s = R() * (30 + r * 2.5), l = 0.4 + R() * 0.4; P.push({ k: 'dot', x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, col: R() < 0.5 ? '#ff8a30' : '#ffd070', size: r * 0.2 + 2 + R() * 3, drag: 0.92 }); }
  const nM = Math.min(8, Math.round(r * 0.18) + 2);
  for (let i = 0; i < nM; i++) { const a = R() * TAU, s = R() * (20 + r), l = 0.8 + R() * 0.7; P.push({ k: 'smoke', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 12, life: l, max: l, col: '#222', size: r * 0.16 + 3, drag: 0.96 }); }
  if (r >= 12) { const nD = Math.min(12, Math.round(r * 0.3)); for (let i = 0; i < nD; i++) { const a = R() * TAU, s = 50 + R() * 170, l = 0.9 + R() * 0.6; P.push({ k: 'debris', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, col: R() < 0.5 ? pal.hull : pal.dark, size: 2 + R() * 3.2, rot: R() * TAU, vr: (R() - 0.5) * 20, drag: 0.97 }); } }
  g.fx.push({ k: 'ring', x, y, r: 2, rmax: r * 1.7, t: 0, dur: 0.38, col: '#ffd9a0', w: 3 });
  g.fx.push({ k: 'glow', x, y, r: r * 2.2, t: 0, dur: 0.32 });
}

/* player shot factory. ang: degrees, 0 = up, +clockwise */
function pshot(g_, x, y, ang, spd, dmg, o) {
  o = o || {};
  const m = g_.run.mods, a = ang * Math.PI / 180, kind = o.kind || 'bolt';
  const prim = !o.sk && (kind === 'bolt' || kind === 'lance' || kind === 'shard' || kind === 'wave');
  const b = {
    x, y, vx: Math.sin(a) * spd, vy: -Math.cos(a) * spd, r: o.r || 3,
    dmg: dmg * g_.dmgMul * (o.dm || 1),
    pierce: (o.pierce || 0) + (prim ? m.pierce : 0),
    bounce: (o.bounce || 0) + (prim ? m.bounce : 0),
    hom: (o.homing || 0) + (prim ? m.homing : 0),
    col: o.col || '#fff', kind, life: o.life || 1.6, age: 0, hits: [], aoe: o.aoe || 0, accel: o.accel || 0,
    shrap: o.shrap, shrapDmg: o.shrapDmg, tgt: null
  };
  if (!o.sk && g_.wm) { // weapon-specific upgrades + critical hits
    const wm = g_.wm; b.dmg *= wm.dmg;
    if (prim) { b.pierce += wm.pierce; b.bounce += wm.bounce; }
    if (b.aoe) b.aoe *= wm.aoe;
    if (b.shrap !== undefined) b.shrap += wm.shrap;
  }
  if (m.crit && Math.random() < m.crit) { b.dmg *= g_.run.syn.has('exec') ? 3 : 2; b.crit = true; }
  if (o.wave) b.wv = { amp: o.wave.amp, freq: o.wave.freq, ph: o.wave.ph, bx: x };
  if (g_.pb.length < 700) g_.pb.push(b);
  return b;
}

/* damage an enemy. b = bullet (may be null), silent => no hit sound */
function hitEnemy(e, dmg, b, silent) {
  if (e.dead) return;
  if (e.inv) { if (b) burst(b.x, b.y, 2, '#aaa', 50, 0.2, 1.5); return; }
  const mm = g.run.mods;
  if (e.boss || e.d.big) { if (mm.bigDmg) dmg *= 1 + mm.bigDmg; } else if (mm.smallDmg) dmg *= 1 + mm.smallDmg;
  e.hp -= dmg; e.flash = 0.07; g.run.stats.dmg += dmg;
  e.dn = (e.dn || 0) + dmg;
  if (e.dnT === undefined || e.dnT <= 0) { e.dnT = e.boss || e.d.big ? 0.35 : 0.5; }
  if (!silent) Aud.sfx('hit');
  if (b) burst(b.x, b.y, 2, b.col, 90, 0.2, 1.8);
  if (e.boss) Enemies.bossCheck(e);
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e, rammed) {
  if (e.dead) return;
  e.dead = true;
  const run = g.run, m = run.mods, d = e.d;
  g.kills++; run.stats.kills++;
  if (d.onDeath && !(g.bossDying > 0)) d.onDeath(e);
  // combo & score
  g.cmb = Math.min(8, g.cmb + (e.boss ? 0 : 0.1 + (d.big ? 0.3 : 0))); g.cmbT = 2.6 * m.comboDecay;
  const pts = Math.round((d.score || 50) * g.cmb * m.score);
  run.score += pts;
  if (d.big || e.boss) ftext(e.x, e.y - 10, '+' + pts, '#fff', 14);
  // fx
  const big = e.boss || d.big;
  explosion(e.x, e.y, e.r * (e.boss ? 1.2 : 1.1), g.sec.glow);
  Aud.sfx(big ? 'boom' : 'kill');
  if (big) { g.hs = Math.max(g.hs, e.boss ? 0.18 : 0.06); g.shake = Math.max(g.shake, e.boss ? 16 : 7); }
  else g.shake = Math.max(g.shake, 1.2);
  // kill triggers
  const p = g.p;
  if (m.shieldOnKill) p.shield = Math.min(p.maxShield, p.shield + m.shieldOnKill);
  p.energy = Math.min(p.maxEnergy, p.energy + (d.big ? 4 : 1) + m.energyOnKill);
  if (m.hullOnKill) p.hull = Math.min(p.maxHull, p.hull + m.hullOnKill * (run.syn.has('vamp') ? 2 : 1));
  if (m.killBlast && !(g.blastD > 1)) { g.blastD = (g.blastD || 0) + 1; Game.aoe(e.x, e.y, 42, 3 * g.dmgMul + 1.5, null); g.blastD--; }
  if (run.syn.has('storm') && p.energy > p.maxEnergy * 0.85 && g.stormCd <= 0) {
    g.stormCd = 0.4; g.fx.push({ k: 'ring', x: e.x, y: e.y, r: 4, rmax: 90, t: 0, dur: 0.3, col: '#9bf', w: 3 });
    for (const o of g.en) if (!o.dead && o !== e && dist2(o.x, o.y, e.x, e.y) < 90 * 90) hitEnemy(o, 4 * g.dmgMul + 2, null, true);
  }
  if (e.boss) { Enemies.bossDeath(e); return; } // boss rewards handled there
  // drops
  const rng = g.rng, cr = d.cred, nCoins = e.d.big ? rng.int(4, 6) : rng.int(1, 2);
  const val = (rng.int(cr[0], cr[1]) * (1 + g.si * 0.35 + g.gi * 0.04)) * 0.68 * ((d.big && m.bigCredit) ? 1 + m.bigCredit : 1);
  for (let i = 0; i < nCoins; i++) dropPickup(e.x + frand(-8, 8), e.y + frand(-8, 8), 'cred', { v: val / nCoins });
  const dropB = 1 + (m.dropBonus || 0);
  // power-ups: random chance plus a pity timer so a power-up always arrives every 8-12 kills
  g.powPity = (g.powPity || 0) + 1;
  if (rng() < (d.big ? 0.5 : 0.06) * dropB || g.powPity >= (g.powNeed || 10)) { dropPickup(e.x, e.y, 'pow'); g.powPity = 0; g.powNeed = rng.int(8, 12); }
  if (rng() < 0.03 + m.energyDrop) dropPickup(e.x, e.y, 'nrg');
  if (rng() < (d.big ? 0.1 : 0.012)) dropPickup(e.x, e.y, 'rep');
  if (rng() < 0.004) dropPickup(e.x, e.y, 'cons', { id: rng() < 0.5 ? 'repair' : 'cell' });
}

function dropPickup(x, y, type, o) {
  if (type === 'pow' && g.run.front.lvl >= WEAPON_MAX) { type = 'cred'; o = Object.assign({}, o, { v: 15 * (1 + Math.min(g.si, 3) * 0.35 + g.gi * 0.04) }); } // weapon maxed: power-ups turn into money
  const k = Object.assign({ x, y, type, t: 0, ph: Math.random() * 6, v: 0 }, o || {});
  if (g.pk.length < 160) g.pk.push(k);
  return k;
}
