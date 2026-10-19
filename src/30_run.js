/* ===================================================================
   SECTION 30: RUN LOGIC - run state, mods, upgrades, map, shop, meta
   =================================================================== */
const NODE_INFO = {
  combat:  { name: 'Combat',   icon: '⚔', col: '#6df0ff', desc: 'Standard fight. Upgrade pick on clear.' },
  elite:   { name: 'Elite',    icon: '☠', col: '#ff5a5a', desc: 'Mini-boss. Two upgrade picks, at least one rare.' },
  shop:    { name: 'Shop',     icon: '◆', col: '#ffd23d', desc: 'Spend credits on weapons, power, repairs.' },
  repair:  { name: 'Repair',   icon: '+',      col: '#5eff7a', desc: 'Dock for repairs or a field refit.' },
  mystery: { name: 'Mystery',  icon: '?',      col: '#c78bff', desc: 'Unknown event. Risk and reward.' },
  secret:  { name: 'Secret',   icon: '★', col: '#ffe066', desc: 'Hidden cache run: short, packed with credits and a bonus upgrade pick.' },
  boss:    { name: 'Boss',     icon: '☢', col: '#ff3030', desc: 'Sector guardian. Two upgrade picks, rare or better.' }
};
const RAR_ORDER = { common: 0, rare: 1, legendary: 2 };

const Run = {
  create(o) {
    const ship = SHIPS[o.ship], seed = o.seed;
    const run = {
      seed, rng: RNG(seed + '|run'), diff: o.diff, shipId: o.ship, ship, daily: !!o.daily,
      front: { id: o.front, lvl: 1 + (Save.data.perks.headstart || 0) }, left: null, right: null,
      eq: { shield: 0, armor: 0, gen: 0 }, credits: 0, score: 0, hull: 1, upgrades: [], mods: null, syn: new Set(),
      cons: { repair: Save.data.perks.beacon ? 1 : 0, cell: 0, bomb: 0 }, xp: 0, rerolls: 0, rollN: 0,
      stageNo: 0, sector: 0, step: 0, maps: {}, revived: false, killedBy: null, bossScrap: 0, t0: performance.now(), over: false,
      stats: { kills: 0, dmg: 0, hits: 0, credits: 0, stages: 0, bosses: 0, minis: 0 }
    };
    Run.computeMods(run);
    run.rerolls = run.mods.reroll;
    run.hull = Run.derive(run).maxHull;
    return run;
  },

  /* aggregate all modifiers: perks + upgrades -> run.mods; returns newly active synergies */
  computeMods(run) {
    const m = {
      dmg: 1, rate: 1, speed: 1, shieldRegen: 1, energyRegen: 1, energyCost: 1, magnet: 1, credit: 1, comboDecay: 1, enemyHp: 1, hullMul: 1,
      pierce: 0, bounce: 0, homing: 0, streams: 0, hullMax: 0, shieldMax: 0, hullRegen: 0, shieldOnKill: 0, energyOnKill: 0, overcharge: 0, lastStand: 0,
      iframes: 0, sidekick: 0, sidekickRate: 0, revive: 0, nova: 0, focusSlow: 0, shieldOff: 0, energyMax: 0, luck: 0, reroll: 0, bleed: 0, dropBonus: 0,
      focusDmg: 0, comboRate: 0, energyDrop: 0, bigCredit: 0, interest: 0, discount: 0, ward: 0, lastGasp: 0, extraCard: 0, seeker: 0, strike: 0, mineLayer: 0,
      crit: 0, bigDmg: 0, smallDmg: 0, dr: 0, hullOnKill: 0, adrenaline: 0, hitbox: 0, killBlast: 0, shieldBurst: 0, bulletSlow: 0, score: 1, dmgTaken: 1, enemyBs: 1
    };
    const add = (d, k) => { for (const key in d) { if (MUL_KEYS.has(key)) m[key] *= (1 + d[key] * k); else m[key] += d[key] * k; } };
    for (const id in Save.data.perks) { const pk = PERKS[id]; if (pk) add(pk.m, Save.data.perks[id]); }
    for (const id of run.upgrades) add(UPG[id].m, 1);
    m.focusSlow = Math.min(0.6, m.focusSlow);
    const prev = run.syn, owned = new Set(run.upgrades);
    run.syn = new Set(SYNERGIES.filter(s => s.need.every(n => owned.has(n))).map(s => s.id));
    run.mods = m;
    return SYNERGIES.filter(s => run.syn.has(s.id) && !prev.has(s.id));
  },

  /* modifiers from weapon-specific upgrades, active only for the equipped front weapon */
  weaponMods(run) {
    const w = { dmg: 1, pierce: 0, bounce: 0, rate: 1, aoe: 1, shrap: 0 };
    for (const id of run.upgrades) {
      const u = UPG[id]; if (!u.weapon || u.weapon !== run.front.id || !u.wm) continue;
      for (const k in u.wm) { if (k === 'dmg' || k === 'rate' || k === 'aoe') w[k] *= 1 + u.wm[k]; else w[k] += u.wm[k]; }
    }
    return w;
  },
  weaponChoices(run, n) { // random unlocked front weapons other than the current one (seeded)
    const ids = Object.keys(FRONT).filter(id => id !== run.front.id && (Save.data.weapons[id] || WEAPON_FREE(id)));
    return run.rng.shuffle(ids).slice(0, n);
  },
  equipFront(run, id, bonus) { run.front = { id, lvl: clamp(run.front.lvl + (bonus || 0), 1, WEAPON_MAX) }; },

  derive(run) {
    const sh = SHIELDS[run.eq.shield], ar = ARMORS[run.eq.armor], ge = GENS[run.eq.gen], m = run.mods, s = run.ship;
    return {
      maxHull: Math.max(20, Math.round((s.hull + ar.hull + m.hullMax) * m.hullMul)),
      maxShield: sh.max + s.shieldBonus + m.shieldMax,
      shRegen: sh.regen * m.shieldRegen, shDelay: sh.delay * (run.syn.has('bastion') ? 0.5 : 1),
      // each weapon level feeds its own supply (+5 energy, +0.75/s regen) so levelling never leaves you starved
      maxEnergy: ge.max + s.energyBonus + m.energyMax + 5 * (run.front.lvl - 1), enRegen: (ge.regen + 0.75 * (run.front.lvl - 1)) * m.energyRegen,
      speed: s.speed * m.speed * (1 + (W - 480) / 2400), dr: Math.min(0.6, ar.dr + m.dr)
    };
  },

  heal(run, n) { const mx = Run.derive(run).maxHull; run.hull = Math.min(mx, run.hull + n); if (g && g.p) g.p.hull = Math.min(g.p.maxHull, g.p.hull + n); },
  damage(run, n) { run.hull = Math.max(1, run.hull - n); },
  addCredits(run, n) { run.credits += Math.round(n * run.mods.credit); },
  xpNeed(run) { const l = run.front.lvl; return l <= 9 ? 1 + Math.ceil(l / 3) : 3 + Math.ceil((l - 9) / 4); }, // 27 power-ups to level 10, then 4,4,4,4,5,5,5,5,6 = 48 more for level 20
  addXp(run, n) {
    if (run.front.lvl >= WEAPON_MAX) { run.xp = 0; Run.addCredits(run, 12 * n); if (g) ftext(g.p.x, g.p.y - 30, 'MAX POWER +12 cr', '#ff9', 12); return; }
    run.xp += n;
    while (run.xp >= Run.xpNeed(run)) {
      run.xp -= Run.xpNeed(run);
      if (run.front.lvl >= WEAPON_MAX) { run.xp = 0; if (g) ftext(g.p.x, g.p.y - 30, 'MAX POWER', '#ff9', 13); break; }
      Run.levelWeapon(run, 'front', 1);
      if (g) { ftext(g.p.x, g.p.y - 34, FRONT[run.front.id].name.toUpperCase() + ' LV ' + run.front.lvl, '#ffe066', 13); g.fx.push({ k: 'ring', x: g.p.x, y: g.p.y, r: 8, rmax: 70, t: 0, dur: 0.5, col: '#ffe066', follow: 1 }); }
    }
  },
  levelWeapon(run, slot, n) { run[slot].lvl = clamp(run[slot].lvl + n, 1, WEAPON_MAX); if (typeof g !== 'undefined' && g && g.run === run) Game.refreshStats(); },
  randomSidekick(run) { return run.rng.pick(Object.keys(SIDEKICKS)); },
  equipSidekick(run, id) {
    const slot = !run.left ? 'left' : !run.right ? 'right' : (run.rng() < 0.5 ? 'left' : 'right');
    run[slot] = { id, lvl: 1 };
    if (g) Game.rebuildSidekicks();
  },

  /* ---------- upgrades ---------- */
  stackCount(run, id) { let n = 0; for (const u of run.upgrades) if (u === id) n++; return n; },
  maxStack(u) { return u.max || (u.cursed ? 1 : u.rar === 'common' ? 4 : u.rar === 'rare' ? 2 : 1); },
  sidekickMaxed(run, id) { return ['left', 'right'].some(k => run[k] && run[k].id === id && run[k].lvl >= 3); },
  giveSidekick(run, id) { // same type levels up; otherwise fills a free slot or replaces the weaker sidekick
    for (const k of ['left', 'right']) if (run[k] && run[k].id === id) { run[k].lvl = Math.min(3, run[k].lvl + 1); return; }
    if (!run.left) { run.left = { id, lvl: 1 }; return; }
    if (!run.right) { run.right = { id, lvl: 1 }; return; }
    run[run.left.lvl <= run.right.lvl ? 'left' : 'right'] = { id, lvl: 1 };
  },
  /* roll n distinct upgrade cards. opts: minRar ('rare' = all >= rare), guarantee ('rare' = at least one >= rare) */
  roll(run, n, opts) {
    opts = opts || {};
    const rng = RNG(run.seed + '|upg|' + run.stageNo + '|' + (run.rollN++));
    const luck = run.mods.luck, owned = new Set(run.upgrades);
    const partner = new Set();
    for (const s of SYNERGIES) { const have = s.need.filter(x => owned.has(x)); if (have.length && have.length < s.need.length) s.need.forEach(x => { if (!owned.has(x)) partner.add(x); }); }
    const minR = RAR_ORDER[opts.minRar || 'common'];
    let pool = UPGRADES.filter(u => Run.stackCount(run, u.id) < Run.maxStack(u) && RAR_ORDER[u.rar] >= minR && (!u.weapon || u.weapon === run.front.id) && (!u.avail || u.avail(run)));
    const W_ = u => {
      let w = RARITY[u.rar].w * (u.rar === 'common' ? 1 : (1 + luck * 6) * (opts.boost || 1));
      if (u.cursed) w *= 0.6;
      if (partner.has(u.id)) w *= 2.4;
      if (u.id === 'phoenix' && run.mods.revive) w = 0;
      return w;
    };
    const out = [], cats = new Set();
    for (let i = 0; i < n && pool.length; i++) { // cards on one screen come from different categories whenever possible
      const u = rng.weighted(pool, x => W_(x) * (cats.has(x.cat) ? 0.1 : 1)); out.push(u); cats.add(u.cat); pool = pool.filter(x => x !== u);
    }
    if (opts.guarantee && !out.some(u => RAR_ORDER[u.rar] >= RAR_ORDER[opts.guarantee])) {
      const better = UPGRADES.filter(u => RAR_ORDER[u.rar] >= RAR_ORDER[opts.guarantee] && Run.stackCount(run, u.id) < Run.maxStack(u) && !out.includes(u) && (!u.weapon || u.weapon === run.front.id) && (!u.avail || u.avail(run)));
      if (better.length) out[out.length - 1] = rng.weighted(better, W_);
    }
    return out;
  },
  /* apply an upgrade; returns newly activated synergies */
  take(run, id) {
    const u = UPG[id]; run.upgrades.push(id);
    const syn = Run.computeMods(run);
    if (u.on) u.on(run);
    run.hull = Math.min(run.hull, Run.derive(run).maxHull);
    return syn;
  },
  grantUpgrade(run, kind) { // for events: 'cursed' | 'common'
    const rng = RNG(run.seed + '|evt|' + run.stageNo + '|' + (run.rollN++));
    let pool = UPGRADES.filter(u => Run.stackCount(run, u.id) < Run.maxStack(u) && !u.weapon && !u.avail && (kind === 'cursed' ? u.cursed : (u.rar === 'common' && !u.cursed)));
    if (!pool.length) pool = UPGRADES.filter(u => !u.cursed && u.rar === 'common');
    const u = rng.pick(pool); Run.take(run, u.id); return u;
  },

  /* weapon offer from a rare drop; boss=true => higher chance of unlocked-new weapon */
  rareDrop(run, rng, boss) {
    const unlocked = id => Save.data.weapons[id] || WEAPON_FREE(id);
    const slot = 'front', tbl = FRONT;
    let ids = Object.keys(tbl).filter(id => id !== run[slot].id && unlocked(id));
    if (!ids.length) ids = Object.keys(FRONT);
    const id = rng.pick(ids), cur = run[slot].lvl;
    return { slot, id, lvl: Math.max(1, cur - (boss ? 0 : 1)) };
  },

  /* ---------- map ---------- */
  sectorMap(run, si) {
    if (run.maps[si]) return run.maps[si];
    const rng = RNG(run.seed + '|map|' + si), n = rng.int(4, 5) + 1, steps = []; // 4-5 choice stages + the boss
    let secret = false;
    const table = [['combat', 40], ['elite', 15], ['shop', 13], ['repair', 10], ['mystery', 14], ['secret', 8]];
    for (let i = 0; i < n - 1; i++) {
      const cnt = i === 0 ? rng.int(2, 3) : rng.int(2, 3), types = [];
      for (let k = 0; k < cnt; k++) {
        let t, tries = 0;
        do {
          t = rng.weighted(table, x => x[1])[0]; tries++;
          if (i === 0 && (t === 'elite' || t === 'shop' || t === 'repair' || t === 'secret')) t = 'combat';
        } while ((types.includes(t) && t !== 'combat' || (t === 'secret' && secret)) && tries < 8);
        if (t === 'secret') secret = true;
        types.push(t);
      }
      if (!types.some(t => t === 'combat' || t === 'elite' || t === 'secret')) types[0] = 'combat';
      if (i === n - 2 && !types.some(t => t === 'shop' || t === 'repair')) { // pre-boss prep option
        const fight = t => t === 'combat' || t === 'elite' || t === 'secret';
        let j = types.findIndex(t => !fight(t));
        if (j < 0 && types.filter(fight).length > 1) j = types.length - 1;
        if (j >= 0) types[j] = rng() < 0.6 ? 'shop' : 'repair';
      }
      steps.push(types.map((t, k) => ({ type: t, si: t === 'secret' ? 99 : si, sti: i, id: si + '-' + i + '-' + k, realSi: si })));
    }
    steps.push([{ type: 'boss', si, sti: n - 1, id: si + '-boss', realSi: si }]);
    return run.maps[si] = { steps, picked: [] };
  },

  /* ---------- shop ---------- */
  shopOffers(run) {
    const rng = RNG(run.seed + '|shop|' + run.stageNo + '|' + run.step + '|' + run.sector);
    const mul = 1 + run.sector * 0.12, offers = [];
    const P = n => Math.round(n * mul * (1 - Math.min(0.5, run.mods.discount)) / 5) * 5;
    const unlocked = id => Save.data.weapons[id] || WEAPON_FREE(id);
    const cand = (tbl, slot) => rng.shuffle(Object.keys(tbl).filter(id => id !== run[slot].id && unlocked(id)));
    const lostN = run.upgrades.filter(u => UPG[u].weapon === run.front.id).length;
    cand(FRONT, 'front').slice(0, 3).forEach(id => { const lv = run.front.lvl; offers.push({ kind: 'weapon', slot: 'front', id, lvl: lv, name: FRONT[id].name + ' (swap, L' + lv + ')', desc: FRONT[id].desc + ' Keeps your power level.' + (lostN ? ` Your ${lostN} ${FRONT[run.front.id].name} upgrade${lostN > 1 ? 's stop' : ' stops'} applying.` : ''), price: P(FRONT[id].price * 0.7 + 60) }); });
    if (run.front.lvl < WEAPON_MAX) offers.push({ kind: 'power', slot: 'front', name: 'Power Core: weapon +1', desc: FRONT[run.front.id].name + ' L' + run.front.lvl + ' -> L' + (run.front.lvl + 1), price: P(70 + 24 * run.front.lvl) });
    offers.push({ kind: 'repair', name: 'Hull Repair (+50%)', desc: 'Restore half your max hull.', price: P(60) });
    // equipment upgrade (one random slot with a higher tier available)
    const want = []; if (run.eq.gen < 3) want.push('gen');
    const others = rng.shuffle(['shield', 'armor']).filter(s => run.eq[s] < 3); if (others.length) want.push(others[0]);
    for (const s of want) { const t = SLOT_TABLES[s][run.eq[s] + 1]; offers.push({ kind: 'equip', slot: s, tier: run.eq[s] + 1, name: t.name + ' (' + s + ')', desc: s === 'shield' ? `Max shield ${t.max}, regen ${t.regen}/s (recharging uses energy)` : s === 'armor' ? `+${t.hull} hull, ${Math.round(t.dr * 100)}% damage reduction` : `Energy ${t.max}, regen ${t.regen}/s`, price: P(t.price) }); }
    const sk = rng.pick(Object.keys(SIDEKICKS)); offers.push({ kind: 'sidekick', id: sk, name: SIDEKICKS[sk].name, desc: SIDEKICKS[sk].desc, price: P(SIDEKICKS[sk].price) });
    if (run.left && run.left.lvl < 3) offers.push({ kind: 'skl', name: 'Sidekick Refit', desc: 'Left sidekick +1 level (max 3).', price: P(120) });
    offers.push({ kind: 'cons', id: 'repair', name: CONSUMABLES.repair.name, desc: CONSUMABLES.repair.desc, price: P(CONSUMABLES.repair.price) });
    offers.push({ kind: 'cons', id: 'bomb', name: CONSUMABLES.bomb.name, desc: CONSUMABLES.bomb.desc, price: P(CONSUMABLES.bomb.price) });
    offers.push({ kind: 'cons', id: 'cell', name: CONSUMABLES.cell.name, desc: CONSUMABLES.cell.desc, price: P(CONSUMABLES.cell.price) });
    const bm = Run.roll(run, 1, { guarantee: 'rare' })[0]; run.rollN--; if (bm) offers.push({ kind: 'module', id: bm.id, name: 'Module: ' + bm.name, desc: bm.desc, price: P(bm.rar === 'legendary' ? 330 : bm.rar === 'rare' ? 190 : 100), rar: bm.rar });
    offers.forEach((o, i) => o.i = i);
    return offers;
  },
  buy(run, o) {
    if (o.kind === 'weapon') run[o.slot] = { id: o.id, lvl: o.lvl };
    else if (o.kind === 'power') Run.levelWeapon(run, o.slot, 1);
    else if (o.kind === 'repair') Run.heal(run, Run.derive(run).maxHull * 0.5);
    else if (o.kind === 'equip') run.eq[o.slot] = o.tier;
    else if (o.kind === 'sidekick') Run.equipSidekick(run, o.id);
    else if (o.kind === 'skl') run.left.lvl++;
    else if (o.kind === 'cons') run.cons[o.id]++;
    else if (o.kind === 'module') Run.take(run, o.id);
  },
  stats_() {}
};
function WEAPON_FREE(id) { return !!(FRONT[id] && FRONT[id].unlock === 0); }

/* ===================== FLOW: run lifecycle ===================== */
const Flow = {
  run: null, mode: 'menu', // 'menu' | 'play' | 'pause'
  newRun(o) {
    this.run = Run.create(o);
    Save.data.settings.difficulty = o.diff; Save.data.settings.ship = o.ship; Save.data.settings.front = o.front;
    Save.save();
    Music.start('menu');
    this.toMap();
  },
  toMap() {
    const run = this.run;
    if (run.sector >= SECTORS.length) return this.endRun(true);
    this.mode = 'menu'; g = null; Bg.init(run.sector); Music.start('menu');
    UI.map(run);
  },
  openNode(node) {
    const run = this.run; run.cur = node;
    if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss' || node.type === 'secret') this.startStage(node);
    else if (node.type === 'shop') UI.shop(run, () => this.advance(node));
    else if (node.type === 'repair') UI.repair(run, () => this.advance(node));
    else if (node.type === 'mystery') UI.event(run, () => this.advance(node));
  },
  startStage(node) {
    const run = this.run;
    UI.hide(); this.mode = 'play';
    Game.start(run, node, {
      clear: () => this.stageCleared(node),
      dead: () => this.endRun(false),
      swap: offer => this.swap(offer)
    });
  },
  swap(offer) {
    this.mode = 'menu';
    UI.swap(this.run, offer, () => { this.mode = 'play'; UI.hide(); });
  },
  stageCleared(node) {
    const run = this.run, p = g.p;
    run.hull = Math.max(1, p.hull); run.stageNo++; run.stats.stages++;
    this.mode = 'menu';
    const boss = node.type === 'boss', elite = node.type === 'elite';
    if (boss) { Heal(run, 0.3); }
    if (node.type === 'secret') run.credits += 0;
    Music.start('menu');
    const opts = boss ? { minRar: 'rare', boost: 1.8 } : elite ? { guarantee: 'rare', boost: 1.3 } : {};
    if (run.mods.interest) { const gain = Math.min(60 * run.mods.interest, Math.round(run.credits * 0.06 * run.mods.interest)); if (gain > 0) { run.credits += gain; UI.toast('Interest +' + gain + ' credits', '#ffd23d'); } }
    const picks = (boss || elite || node.type === 'secret') ? 2 : 1;
    const go = n => UI.upgrade(run, Run.roll(run, 3 + run.mods.extraCard, opts), node, () => (n > 1 ? go(n - 1) : this.advance(node)), opts, picks > 1 ? 'Reward pick ' + (picks - n + 1) + ' of ' + picks : null);
    go(picks);
  },
  advance(node) {
    const run = this.run;
    if (node.type === 'boss') {
      run.sector++; run.step = 0;
      if (run.sector >= SECTORS.length) return this.endRun(true);
      UI.sectorIntro(run, () => this.toMap());
      return;
    }
    run.maps[node.realSi].picked.push(node.id);
    run.step++;
    this.toMap();
  },
  quit() { if (!this.run || this.run.over) return; this.run.killedBy = 'Abandoned run'; this.endRun(false, true); },
  endRun(victory, abandoned) {
    const run = this.run; if (run.over) return; run.over = true; this.mode = 'menu';
    Music.stop(); g = null;
    const st = run.stats, perks = Save.data.perks;
    let scrap = Math.floor(run.score / 900) + st.stages * 7 + st.bosses * 25 + st.minis * 8 + (run.bossScrap || 0) + (victory ? 120 : 0);
    scrap *= DIFFS[run.diff].scrap * (1 + 0.15 * (perks.scrapper || 0)) * (run.daily ? 1.25 : 1);
    scrap = Math.round(scrap);
    const S = Save.data; S.scrap += scrap; S.stats.scrapTotal += scrap; S.stats.runs++; if (victory) S.stats.wins++;
    S.stats.kills += st.kills; if (run.score > S.stats.best) S.stats.best = run.score;
    S.stats.bestSector = Math.max(S.stats.bestSector, run.sector + (victory ? 0 : 0));
    let dailyBest = null;
    if (run.daily) { const d = todayStr(); S.daily[d] = Math.max(S.daily[d] || 0, run.score); dailyBest = S.daily[d]; }
    Save.save();
    const time = (performance.now() - run.t0) / 1000;
    if (victory) Aud.sfx('win'); else Aud.sfx('lose');
    UI.gameOver({ run, victory, scrap, time, dailyBest, abandoned: !!abandoned });
  }
};
function Heal(run, f) { Run.heal(run, Run.derive(run).maxHull * f); }
