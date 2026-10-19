/* ===================================================================
   SECTION 10: DATA DEFINITIONS (plain objects - add content here)
   Weapons, sidekicks, equipment, ships, perks, upgrades, synergies,
   difficulties, events. Sectors / enemies / bosses live in 11_content.js
   =================================================================== */

/* ---------- difficulty ---------- */
const DIFFS = [
  { id: 0, name: 'Easy',      hp: 0.8,  bs: 0.9,  fr: 0.85, dt: 0.75, scrap: 0.7, desc: 'Slower, softer enemies.' },
  { id: 1, name: 'Normal',    hp: 1,    bs: 1,    fr: 1,    dt: 1,    scrap: 1,   desc: 'Intended balance.' },
  { id: 2, name: 'Hard',      hp: 1.25, bs: 1.1,  fr: 1.2,  dt: 1.25, scrap: 1.4, desc: 'Tougher, faster fire.' },
  { id: 3, name: 'Nightmare', hp: 1.6,  bs: 1.2,  fr: 1.4,  dt: 1.6,  scrap: 2,   desc: 'Bullet hell. Big scrap.' }
];

/* ---------- WEAPONS: fire(g, player, level) - one front weapon per ship ---------- */
// pshot(g, x, y, angleDeg(0=up, +cw), speed, dmg, opts)  -> see 20_game.js
const FRONT = {
  pulse: {
    name: 'Pulse Cannon', col: '#6df0ff', price: 0, unlock: 0,
    desc: 'Rapid bolts. +streams as it levels, angled side shots at 6, 9 and 14. Up to level 20.',
    rate: l => Math.max(0.06, 0.135 - 0.004 * Math.min(l, 10) - 0.0015 * Math.max(0, l - 10)),
    fire(g, p, l) {
      const n = (l <= 10 ? [1, 2, 2, 3, 3, 4, 4, 5, 5, 5][l - 1] : 5 + Math.floor((l - 10) / 3)) + g.run.mods.streams;
      for (let i = 0; i < n; i++) pshot(g, p.x + (i - (n - 1) / 2) * 7, p.y - 14, 0, 720, 2.3 + 0.15 * l, { col: '#6df0ff' });
      if (l >= 6) { pshot(g, p.x - 10, p.y - 8, -10, 690, 1.7 + 0.1 * l, { col: '#6df0ff' }); pshot(g, p.x + 10, p.y - 8, 10, 690, 1.7 + 0.1 * l, { col: '#6df0ff' }); }
      if (l >= 9) { pshot(g, p.x - 12, p.y - 6, -22, 660, 1.7 + 0.1 * l, { col: '#6df0ff' }); pshot(g, p.x + 12, p.y - 6, 22, 660, 1.7 + 0.1 * l, { col: '#6df0ff' }); }
      if (l >= 14) { pshot(g, p.x - 14, p.y - 4, -36, 640, 1.7 + 0.1 * l, { col: '#6df0ff' }); pshot(g, p.x + 14, p.y - 4, 36, 640, 1.7 + 0.1 * l, { col: '#6df0ff' }); }
    }
  },
  spread: {
    name: 'Vulcan Fan', col: '#ffe066', price: 0, unlock: 0,
    desc: 'Wide fan of shots. Fan widens and thickens each level; center piercers at 7 and 14. Up to level 20.',
    rate: l => Math.max(0.1, 0.21 - 0.005 * Math.min(l, 10) - 0.002 * Math.max(0, l - 10)),
    fire(g, p, l) {
      const n = 3 + Math.floor((l - 1) * 0.75) + g.run.mods.streams, sp = Math.min(130, 20 + 3.5 * l);
      for (let i = 0; i < n; i++) pshot(g, p.x, p.y - 10, -sp / 2 + sp * i / (n - 1), 560, 1.35 + 0.1 * l, { col: '#ffe066', r: 3 });
      if (l >= 7) { pshot(g, p.x - 4, p.y - 12, -2, 760, 2.4 + 0.1 * l, { col: '#fff3b0', pierce: 1 }); pshot(g, p.x + 4, p.y - 12, 2, 760, 2.4 + 0.1 * l, { col: '#fff3b0', pierce: 1 }); }
      if (l >= 14) { pshot(g, p.x - 8, p.y - 12, -7, 760, 2.4 + 0.1 * l, { col: '#fff3b0', pierce: 2 }); pshot(g, p.x + 8, p.y - 12, 7, 760, 2.4 + 0.1 * l, { col: '#fff3b0', pierce: 2 }); }
    }
  },
  lance: {
    name: 'Lance Beam', col: '#9dff5a', price: 0, unlock: 0,
    desc: 'Fast piercing needles (not a continuous beam). Pierce +1 every 3 levels, more needles at 4, 7, 10, 14 and 18. Up to level 20.',
    rate: l => Math.max(0.045, 0.085 - 0.002 * Math.min(l, 10) - 0.0008 * Math.max(0, l - 10)),
    fire(g, p, l) {
      const n = (l <= 10 ? [1, 1, 1, 2, 2, 2, 3, 3, 3, 4][l - 1] : 4 + Math.floor((l - 10) / 4)) + g.run.mods.streams;
      for (let i = 0; i < n; i++) pshot(g, p.x + (i - (n - 1) / 2) * 9, p.y - 16, 0, 980, 1.7 + 0.22 * l, { col: '#9dff5a', kind: 'lance', pierce: 1 + Math.floor(l / 3), r: 3 });
      if (l >= 8) { pshot(g, p.x - 12, p.y - 8, -5, 930, 1.2 + 0.1 * l, { col: '#9dff5a', kind: 'lance', pierce: 1 }); pshot(g, p.x + 12, p.y - 8, 5, 930, 1.2 + 0.1 * l, { col: '#9dff5a', kind: 'lance', pierce: 1 }); }
      if (l >= 15) { pshot(g, p.x - 15, p.y - 6, -11, 900, 1.2 + 0.1 * l, { col: '#9dff5a', kind: 'lance', pierce: 2 }); pshot(g, p.x + 15, p.y - 6, 11, 900, 1.2 + 0.1 * l, { col: '#9dff5a', kind: 'lance', pierce: 2 }); }
    }
  },
  missile: {
    name: 'Hornet Missiles', col: '#ffb347', price: 220, unlock: 120,
    desc: 'Homing missiles with a small blast. +1 missile every ~2.5 levels, bigger salvos past level 10. Up to level 20.',
    rate: l => Math.max(0.12, 0.42 - 0.02 * Math.min(l, 10) - 0.005 * Math.max(0, l - 10)),
    fire(g, p, l) {
      const n = 1 + Math.floor(Math.min(l, 10) / 2.5) + Math.floor(Math.max(0, l - 10) / 4) + g.run.mods.streams;
      for (let i = 0; i < n; i++) { const k = i - (n - 1) / 2; pshot(g, p.x + k * 9, p.y - 8, k * 15, 300, 4 + 0.7 * l, { col: '#ffb347', kind: 'missile', homing: 6, r: 4, aoe: 26 + 2 * l, life: 3, accel: 1.012 }); }
    }
  },
  prism: {
    name: 'Prism Shards', col: '#c78bff', price: 240, unlock: 150,
    desc: 'Shards ricochet off the screen edges (+1 bounce every 2.5 levels). Up to level 20.',
    rate: l => Math.max(0.09, 0.18 - 0.004 * Math.min(l, 10) - 0.002 * Math.max(0, l - 10)),
    fire(g, p, l) {
      const n = Math.min(9, 2 + Math.floor(l / 3)) + g.run.mods.streams, sp = Math.min(120, 16 + 3 * n);
      for (let i = 0; i < n; i++) pshot(g, p.x, p.y - 10, -sp / 2 + sp * i / (n - 1), 540, 1.7 + 0.16 * l, { col: '#c78bff', kind: 'shard', bounce: 1 + Math.floor(l / 2.5), r: 3.5, life: 3 });
    }
  },
  wave: {
    name: 'Sine Emitter', col: '#ff7ad9', price: 260, unlock: 200,
    desc: 'Weaving wave-bullets sweep wide lanes. Pairs scale with level; pierce at 7 and 15. Up to level 20.',
    rate: l => Math.max(0.07, 0.115 - 0.002 * Math.min(l, 10) - 0.001 * Math.max(0, l - 10)),
    fire(g, p, l) {
      const n = Math.min(6, 1 + Math.floor(l / 3)) + g.run.mods.streams;
      for (let i = 0; i < n; i++) for (let s = 0; s < 2; s++)
        pshot(g, p.x, p.y - 12, 0, 520, 1.5 + 0.13 * l, { col: '#ff7ad9', kind: 'wave', wave: { amp: Math.min(75, 18 + 3.5 * l) + i * 6, freq: 9, ph: s * Math.PI }, pierce: l >= 15 ? 2 : l >= 7 ? 1 : 0, r: 3.5 });
    }
  },
  flak: {
    name: 'Flak Cannon', col: '#ff8a4d', price: 280, unlock: 250,
    desc: 'Slow shells burst into shrapnel rings. More shrapnel per level, extra shells at 6, 14 and 18. Up to level 20.',
    rate: l => Math.max(0.18, 0.5 - 0.02 * Math.min(l, 10) - 0.008 * Math.max(0, l - 10)),
    fire(g, p, l) {
      const n = 1 + (l >= 6 ? 1 : 0) + (l >= 14 ? 1 : 0) + (l >= 18 ? 1 : 0) + g.run.mods.streams;
      for (let i = 0; i < n; i++) pshot(g, p.x + (i - (n - 1) / 2) * 16, p.y - 12, (i - (n - 1) / 2) * 5, 430, 3 + 0.4 * l, { col: '#ff8a4d', kind: 'flak', r: 5, life: 0.42, shrap: 6 + l, shrapDmg: 1.5 + 0.12 * l });
    }
  }
};

/* ---------- ENERGY BALANCE ----------
   Energy cost per shot is derived so that holding fire drains a fixed amount per second:
   level 1 ~4/s, level 5 ~11/s, level 10 ~20/s, level 20 ~38/s (x weapon factor). Generators refill 8 / 11 / 15 / 21 per second,
   so the starting generator sustains about level 2-3 and heavy weapons need a better one.
   Shield recharging also draws energy (SHIELD_ENERGY per shield point), so the bar is always in play.
   Each weapon level also adds +5 max energy and +0.75/s regen (Run.derive), so at level 5 the starting
   generator roughly breaks even; at level 10 it sustains roughly 70% of the weapon fire rate. */
const SHIELD_ENERGY = 1.5;
const DRAIN_K = { pulse: 1, spread: 0.95, lance: 1.08, missile: 1, prism: 1, wave: 1.05, flak: 0.9 };
const energyDrain = (l, id) => (DRAIN_K[id] || 1) * (4 + 1.8 * (l - 1));
for (const id in FRONT) { const w = FRONT[id]; w.cost = l => energyDrain(l, id) * w.rate(l); }

/* ---------- SIDEKICKS (behaviour in 20_game.js) ---------- */
const SIDEKICKS = {
  drone:  { name: 'Wing Drone',   col: '#6df0ff', price: 150, desc: 'Orbits you and fires small bolts. Lvl 2: faster. Lvl 3: twin bolts.' },
  turret: { name: 'Mini-Turret',  col: '#ffe066', price: 150, desc: 'Fixed flank turret that auto-aims at the nearest enemy.' },
  pod:    { name: 'Missile Pod',  col: '#ffb347', price: 170, desc: 'Launches homing missiles on a timer. Lvl 3: double salvo.' },
  orb:    { name: 'Shield Orb',   col: '#9dff5a', price: 180, desc: 'Orbits and absorbs enemy bullets (3 charges, recharges). Rams enemies.' }
};

/* ---------- EQUIPMENT tiers ---------- */
const SHIELDS = [
  { id: 'sh1', name: 'Basic Barrier',  max: 40,  regen: 4,  delay: 2.4, price: 0 },
  { id: 'sh2', name: 'Deflector',      max: 70,  regen: 7,  delay: 2.0, price: 160 },
  { id: 'sh3', name: 'Aegis Matrix',   max: 110, regen: 10, delay: 1.8, price: 300 },
  { id: 'sh4', name: 'Phase Bulwark',  max: 160, regen: 14, delay: 1.5, price: 480 }
];
const ARMORS = [
  { id: 'ar1', name: 'Hull Plating',    hull: 0,  dr: 0,    price: 0 },
  { id: 'ar2', name: 'Reinforced Hull', hull: 25, dr: 0.05, price: 150 },
  { id: 'ar3', name: 'Titanium Weave',  hull: 50, dr: 0.10, price: 280 },
  { id: 'ar4', name: 'Adamant Shell',   hull: 85, dr: 0.15, price: 450 }
];
const GENS = [
  { id: 'g1', name: 'Standard Cell',  max: 100, regen: 8,  price: 0 },
  { id: 'g2', name: 'Fusion Tap',     max: 120, regen: 11, price: 170 },
  { id: 'g3', name: 'Antimatter Loop', max: 150, regen: 15, price: 320 },
  { id: 'g4', name: 'Zero-Point Core', max: 190, regen: 21, price: 500 }
];
const SLOT_TABLES = { shield: SHIELDS, armor: ARMORS, gen: GENS };

/* ---------- SHIPS ---------- */
const SHIPS = {
  vanguard: {
    name: 'Vanguard', col: '#6df0ff', price: 0,
    desc: 'Balanced all-rounder.',
    hull: 100, speed: 230, dmg: 1, rate: 1, shieldBonus: 0, energyBonus: 0,
    special: { id: 'barrier', name: 'Pulse Barrier', cost: 40, cd: 12, desc: '2.5s bubble that erases bullets and grants invulnerability.' },
    start: { shield: 'sh1', armor: 'ar1', gen: 'g1' }
  },
  striker: {
    name: 'Striker', col: '#ffb347', price: 150,
    desc: 'Fast and fragile. High fire rate, low hull.',
    hull: 70, speed: 275, dmg: 0.95, rate: 1.18, shieldBonus: 10, energyBonus: 10,
    special: { id: 'dash', name: 'Phase Dash', cost: 25, cd: 4, desc: 'Blink forward in your move direction with 0.5s invulnerability.' },
    start: { shield: 'sh1', armor: 'ar1', gen: 'g1' }
  },
  bulwark: {
    name: 'Bulwark', col: '#9dff5a', price: 300,
    desc: 'Heavy hull and big shield. Slow, hits hard.',
    hull: 150, speed: 185, dmg: 1.15, rate: 0.9, shieldBonus: 40, energyBonus: 20,
    special: { id: 'nova', name: 'Nova Bomb', cost: 60, cd: 18, desc: 'Screen-wide blast: clears bullets, heavy damage to everything.' },
    start: { shield: 'sh1', armor: 'ar1', gen: 'g1' }
  }
};

/* ---------- META PERKS (scrap) ---------- */
const PERKS = {
  salvage:  { name: 'Salvage Contract',  max: 3, cost: l => 60 + 50 * l,  desc: l => `+${10 * l}% credits (next: +${10 * (l + 1)}%)`, m: { credit: 0.1 } },
  plating:  { name: 'Reinforced Plating', max: 3, cost: l => 70 + 60 * l,  desc: l => `+${8 * l} hull`, m: { hullMax: 8 } },
  capbank:  { name: 'Capacitor Bank',    max: 3, cost: l => 70 + 60 * l,  desc: l => `+${12 * l} max energy`, m: { energyMax: 12 } },
  reroll:   { name: 'Second Opinion',    max: 3, cost: l => 90 + 80 * l,  desc: l => `${l} upgrade reroll${l > 1 ? 's' : ''} per run`, m: { reroll: 1 } },
  scrapper: { name: 'Scrap Hunter',      max: 3, cost: l => 80 + 70 * l,  desc: l => `+${15 * l}% scrap earned`, m: {} },
  lucky:    { name: 'Lucky Star',        max: 3, cost: l => 100 + 80 * l, desc: l => `+${l * 4}% rare/legendary odds`, m: { luck: 0.04 } },
  beacon:   { name: 'Emergency Beacon',  max: 1, cost: l => 160,          desc: l => 'Start each run with one Repair Kit', m: {} },
  magnet:   { name: 'Tractor Array',     max: 2, cost: l => 70 + 60 * l,  desc: l => `+${25 * l}% pickup range`, m: { magnet: 0.25 } },
  firepower:  { name: 'Firepower Training', max: 5, cost: l => 80 + 60 * l,  desc: l => `+${5 * l}% weapon damage`, m: { dmg: 0.05 } },
  tempo:      { name: 'Rapid Cycling',      max: 5, cost: l => 80 + 60 * l,  desc: l => `+${4 * l}% fire rate`, m: { rate: 0.04 } },
  critperk:   { name: 'Marksman Optics',    max: 3, cost: l => 110 + 80 * l, desc: l => `+${3 * l}% critical hit chance`, m: { crit: 0.03 } },
  fieldrep:   { name: 'Field Repair Crew',  max: 3, cost: l => 90 + 70 * l,  desc: l => `Regenerate ${(0.1 * l).toFixed(1)} hull per second`, m: { hullRegen: 0.1 } },
  shieldtech: { name: 'Shield Tuning',      max: 3, cost: l => 80 + 60 * l,  desc: l => `+${12 * l}% shield regeneration`, m: { shieldRegen: 0.12 } },
  barrier:    { name: 'Barrier Plating',    max: 3, cost: l => 80 + 60 * l,  desc: l => `+${10 * l} max shield`, m: { shieldMax: 10 } },
  reactor:    { name: 'Reactor Tuning',     max: 3, cost: l => 90 + 70 * l,  desc: l => `+${10 * l}% energy regeneration`, m: { energyRegen: 0.1 } },
  thrust:     { name: 'Thruster Tuning',    max: 3, cost: l => 70 + 50 * l,  desc: l => `+${3 * l}% move speed`, m: { speed: 0.03 } },
  headstart:  { name: 'Head Start',         max: 2, cost: l => 150 + 120 * l, desc: l => `Start each run with your weapon at level ${1 + l}`, m: {} }
};

/* ---------- RUN UPGRADES ----------
   m: stat deltas. MUL keys multiply by (1+v), others add. See Run.computeMods */
const MUL_KEYS = new Set(['dmg', 'rate', 'speed', 'shieldRegen', 'energyRegen', 'energyCost', 'magnet', 'credit', 'comboDecay', 'enemyHp', 'hullMul', 'score', 'dmgTaken', 'enemyBs']);
const RARITY = {
  common:    { name: 'Common',    col: '#b8c4d6', w: 100 },
  rare:      { name: 'Rare',      col: '#58b4ff', w: 28 },
  legendary: { name: 'Legendary', col: '#ffc23d', w: 7 }
};
const UPGRADES = [
  // common
  { id: 'hull',      name: 'Reinforced Bulkheads', rar: 'common', icon: 'H', desc: '+18 max hull and repair 18.', m: { hullMax: 18 }, on(r) { Run.heal(r, 18); } },
  { id: 'shieldcap', name: 'Shield Capacitor',     rar: 'common', icon: 'S', desc: '+25 max shield.', m: { shieldMax: 25 } },
  { id: 'shieldrg',  name: 'Fast Recharger',       rar: 'common', icon: 'R', desc: '+30% shield regeneration.', m: { shieldRegen: 0.3 } },
  { id: 'gen',       name: 'Overclocked Generator', rar: 'common', icon: 'G', desc: '+20% energy regen, +15 max energy.', m: { energyRegen: 0.2, energyMax: 15 } },
  { id: 'hotrounds', name: 'Hot Rounds',           rar: 'common', icon: 'D', desc: '+12% weapon damage.', m: { dmg: 0.12 } },
  { id: 'rapid',     name: 'Rapid Trigger',        rar: 'common', icon: 'F', desc: '+10% fire rate.', m: { rate: 0.10 } },
  { id: 'magnet',    name: 'Magnet Coil',          rar: 'common', icon: 'M', desc: '+60% pickup range.', m: { magnet: 0.6 } },
  { id: 'salvager',  name: 'Salvager',             rar: 'common', icon: '$', desc: '+20% credits from all sources.', m: { credit: 0.2 } },
  { id: 'thrusters', name: 'Tuned Thrusters',      rar: 'common', icon: 'T', desc: '+8% move speed.', m: { speed: 0.08 } },
  { id: 'nano',      name: 'Nano Repair',          rar: 'common', icon: '+', desc: 'Slowly regenerate 0.25 hull/s.', m: { hullRegen: 0.25 } },
  { id: 'cells',     name: 'Fuel Cells',           rar: 'common', icon: 'E', desc: '+2 energy per kill.', m: { energyOnKill: 2 } },
  // rare
  { id: 'pierce',    name: 'Piercing Rounds',      rar: 'rare', icon: 'P', desc: 'Primary bullets pierce +1 enemy.', m: { pierce: 1 } },
  { id: 'ricochet',  name: 'Ricochet Rounds',      rar: 'rare', icon: 'B', desc: 'Primary bullets bounce +1 time off screen edges.', m: { bounce: 1 } },
  { id: 'siphon',    name: 'Shield Siphon',        rar: 'rare', icon: 'V', desc: 'Each kill restores 1.5 shield.', m: { shieldOnKill: 1.5 } },
  { id: 'overcharge', name: 'Overcharge',          rar: 'rare', icon: 'O', desc: '+25% damage while energy is above 90%.', m: { overcharge: 0.25 } },
  { id: 'homing',    name: 'Seeker Chip',          rar: 'rare', icon: 'K', desc: 'Primary bullets gain light homing.', m: { homing: 2.5 } },
  { id: 'twin',      name: 'Twin Core',            rar: 'rare', icon: '2', desc: '+1 stream on your front weapon.', m: { streams: 1 } },
  { id: 'combo',     name: 'Combo Keeper',         rar: 'rare', icon: 'C', desc: 'Combo timer lasts twice as long.', m: { comboDecay: 1 } },
  { id: 'laststand', name: 'Last Stand',           rar: 'rare', icon: '!', desc: '+40% damage while hull is under 35%.', m: { lastStand: 0.4 } },
  { id: 'leech',     name: 'Energy Leech',         rar: 'rare', icon: 'L', desc: 'Each kill restores 4 energy.', m: { energyOnKill: 4 } },
  { id: 'sidetune',  name: 'Sidekick Tuning',      rar: 'rare', icon: 'W', desc: 'Sidekicks +1 power level (max 3) and +25% rate.', m: { sidekick: 1, sidekickRate: 0.25 } },
  { id: 'phase',     name: 'Phase Plating',        rar: 'rare', icon: 'I', desc: '+0.6s invulnerability after taking a hit.', m: { iframes: 0.6 } },
  { id: 'chrono',    name: 'Chrono Focus',         rar: 'rare', icon: 'Z', desc: 'Holding Focus slows enemy bullets by 35%.', m: { focusSlow: 0.35 } },
  // legendary
  { id: 'prism',     name: 'Prism Core',           rar: 'legendary', icon: '*', desc: '+2 streams on your front weapon and +20% damage.', m: { streams: 2, dmg: 0.2 } },
  { id: 'nova',      name: 'Nova Heart',           rar: 'legendary', icon: 'N', desc: 'Every 9s a nova erupts: erases bullets, damages all.', m: { nova: 9 } },
  { id: 'phoenix',   name: 'Phoenix Protocol',     rar: 'legendary', icon: 'X', desc: 'Once per run: on death, revive with 50% hull and a blast.', m: { revive: 1 } },
  { id: 'overdrive', name: 'Overdrive Reactor',    rar: 'legendary', icon: 'Y', desc: '+60% energy regen and weapons cost 30% less.', m: { energyRegen: 0.6, energyCost: -0.3 } },
  { id: 'warlord',   name: 'Warlord Matrix',       rar: 'legendary', icon: 'A', desc: '+25% damage, +15% fire rate, +25 max shield.', m: { dmg: 0.25, rate: 0.15, shieldMax: 25 } },
  // cursed: strong bonus with a real drawback
  { id: 'glass',     name: 'Glass Cannon',         rar: 'rare', cursed: true, icon: 'g', desc: '+60% damage. CURSE: -35% max hull.', m: { dmg: 0.6, hullMul: -0.35 } },
  { id: 'hotreactor', name: 'Hot Reactor',         rar: 'rare', cursed: true, icon: 'h', desc: '+60% energy regen, -30% energy cost. CURSE: shield no longer regenerates.', m: { energyRegen: 0.6, energyCost: -0.3, shieldOff: 1 } },
  { id: 'greed',     name: 'Greed Contract',       rar: 'common', cursed: true, icon: 'e', desc: '+60% credits. CURSE: enemies have +25% hull.', m: { credit: 0.6, enemyHp: 0.25 } },
  { id: 'berserk',   name: 'Berserk Servos',       rar: 'rare', cursed: true, icon: 'b', desc: '+40% fire rate. CURSE: -25% move speed.', m: { rate: 0.4, speed: -0.25 } },
  { id: 'bloodpact', name: 'Blood Pact',           rar: 'legendary', cursed: true, icon: 'p', desc: '+45% damage and +20% fire rate. CURSE: lose 1 hull per 12s.', m: { dmg: 0.45, rate: 0.2, bleed: 1 } }
,
  // ---- more general upgrades ----
  { id: 'eff',        name: 'Efficient Optics',   rar: 'common', icon: 'o', desc: '-15% energy cost for weapons and shield recharge.', m: { energyCost: -0.15 } },
  { id: 'battery',    name: 'Reserve Battery',    rar: 'common', icon: 'b', desc: '+40 max energy.', m: { energyMax: 40 } },
  { id: 'plating',    name: 'Ablative Plating',   rar: 'common', icon: 'a', desc: 'Take 6% less damage.', m: { dr: 0.06 } },
  { id: 'pestc',      name: 'Pest Control',       rar: 'common', icon: 'x', desc: '+35% damage against small enemies.', m: { smallDmg: 0.35 } },
  { id: 'powbeacon',  name: 'Power Beacon',       rar: 'common', icon: 'q', desc: '+45% power-up drop chance.', m: { dropBonus: 0.45 } },
  { id: 'tune',       name: 'Weapon Tuning',      rar: 'common', icon: 'u', desc: 'Your weapon gains +1 power level now.', m: {}, on(r) { Run.levelWeapon(r, 'front', 1); } },
  { id: 'crit',       name: 'Critical Rounds',    rar: 'rare', icon: 'c', desc: '+12% chance for double-damage shots.', m: { crit: 0.12 } },
  { id: 'giant',      name: 'Giant Killer',       rar: 'rare', icon: 'j', desc: '+40% damage against elites, bosses and big ships.', m: { bigDmg: 0.4 } },
  { id: 'reactive',   name: 'Reactive Shield',    rar: 'rare', icon: 'k', desc: 'When your shield breaks it erases nearby bullets (6s cooldown).', m: { shieldBurst: 1 } },
  { id: 'hullsiphon', name: 'Hull Siphon',        rar: 'rare', icon: 'z', desc: 'Each kill repairs 0.25 hull.', m: { hullOnKill: 0.25 } },
  { id: 'adrenaline', name: 'Adrenaline',         rar: 'rare', icon: 'd', desc: '+30% fire rate for 4s after you take a hit.', m: { adrenaline: 0.3 } },
  { id: 'phasecore',  name: 'Phase Core',         rar: 'rare', icon: 'm', desc: 'Your hitbox is 20% smaller.', m: { hitbox: 0.2 } },
  { id: 'amp',        name: 'Score Amplifier',    rar: 'rare', icon: 's', desc: '+35% score from kills.', m: { score: 0.35 } },
  { id: 'killblast',  name: 'Shockwave Rounds',   rar: 'rare', icon: 'w', desc: 'Destroyed enemies explode, damaging their neighbours.', m: { killBlast: 1 } },
  { id: 'surge',      name: 'Power Surge',        rar: 'rare', icon: 'r', desc: 'Your weapon gains +2 power levels now.', m: {}, on(r) { Run.levelWeapon(r, 'front', 2); } },
  { id: 'swarmlord',  name: 'Swarm Command',      rar: 'legendary', icon: 'l', desc: 'Sidekicks +2 levels (max 3) and +50% fire rate.', m: { sidekick: 2, sidekickRate: 0.5 } },
  { id: 'brake',      name: 'Temporal Brake',     rar: 'legendary', icon: 't', desc: 'All enemy bullets fly 18% slower.', m: { bulletSlow: 0.18 } },
  { id: 'aegis',      name: 'Aegis Protocol',     rar: 'legendary', icon: 'y', desc: '+60 max shield and +60% shield regeneration.', m: { shieldMax: 60, shieldRegen: 0.6 } },
  // ---- weapon-specific upgrades: only offered (and only active) while that weapon is equipped ----
  { id: 'w_pulse',   weapon: 'pulse',   name: 'Pulse Capacitors',   rar: 'rare', icon: 'P', desc: 'Pulse Cannon only: +25% fire rate and +15% damage.', m: {}, wm: { rate: 0.25, dmg: 0.15 } },
  { id: 'w_spread',  weapon: 'spread',  name: 'Vulcan Choke',       rar: 'rare', icon: 'V', desc: 'Vulcan Fan only: +30% damage and +15% fire rate.', m: {}, wm: { dmg: 0.3, rate: 0.15 } },
  { id: 'w_lance',   weapon: 'lance',   name: 'Lance Focus',        rar: 'rare', icon: 'L', desc: 'Lance Beam only: +40% damage and pierce +1.', m: {}, wm: { dmg: 0.4, pierce: 1 } },
  { id: 'w_missile', weapon: 'missile', name: 'Hornet Warheads',    rar: 'rare', icon: 'H', desc: 'Hornet Missiles only: +30% damage and +40% blast radius.', m: {}, wm: { dmg: 0.3, aoe: 0.4 } },
  { id: 'w_prism',   weapon: 'prism',   name: 'Prism Lattice',      rar: 'rare', icon: 'R', desc: 'Prism Shards only: +1 bounce and +25% damage.', m: {}, wm: { bounce: 1, dmg: 0.25 } },
  { id: 'w_wave',    weapon: 'wave',    name: 'Wave Resonance',     rar: 'rare', icon: 'W', desc: 'Sine Emitter only: +35% damage and pierce +1.', m: {}, wm: { dmg: 0.35, pierce: 1 } },
  { id: 'w_flak',    weapon: 'flak',    name: 'Flak Fragmentation', rar: 'rare', icon: 'F', desc: 'Flak Cannon only: +5 shrapnel per shell and +20% damage.', m: {}, wm: { shrap: 5, dmg: 0.2 } },
  // ---- more cursed ----
  { id: 'overclock', name: 'Overclock Fusion', rar: 'rare', cursed: true, icon: 'v', desc: '+35% fire rate. CURSE: weapons and shield recharge cost 40% more energy.', m: { rate: 0.35, energyCost: 0.4 } },
  { id: 'hunter',    name: "Hunter's Mark",    rar: 'rare', cursed: true, icon: 'n', desc: '+30% damage. CURSE: enemy bullets fly 15% faster.', m: { dmg: 0.3, enemyBs: 0.15 } },
  { id: 'volatile',  name: 'Volatile Core',    rar: 'rare', cursed: true, icon: 'i', desc: '+50% damage. CURSE: you take 25% more damage.', m: { dmg: 0.5, dmgTaken: 0.25 } }
,
  // ---- offense: automatic weapons and conditional damage ----
  { id: 'seeker',    name: 'Seeker Swarm',     rar: 'rare', cat: 'offense', icon: '1', max: 1, desc: 'Every 6s a volley of 6 homing missiles launches by itself.', m: { seeker: 6 } },
  { id: 'strike',    name: 'Orbital Strike',   rar: 'rare', cat: 'offense', icon: '2', max: 1, desc: 'Every 8s a strike hammers your toughest on-screen target.', m: { strike: 8 } },
  { id: 'minecore',  name: 'Mine Layer Core',  rar: 'common', cat: 'offense', icon: '3', max: 1, desc: 'Drops a proximity mine behind you every 3.5s.', m: { mineLayer: 3.5 } },
  { id: 'combofuel', name: 'Combo Fuel',       rar: 'rare', cat: 'offense', icon: '4', desc: '+25% fire rate while your combo is x4 or higher.', m: { comboRate: 0.25 } },
  { id: 'sniper',    name: 'Sniper Mode',      rar: 'common', cat: 'offense', icon: '5', desc: '+35% damage while holding Focus (Shift).', m: { focusDmg: 0.35 } },
  // ---- defense ----
  { id: 'lastgasp',  name: 'Last Gasp',        rar: 'rare', cat: 'defense', icon: '6', max: 1, desc: 'Once per stage, dropping under 25% hull erases every bullet, refills 40% shield and grants 2.5s of invulnerability.', m: { lastGasp: 1 } },
  { id: 'ward',      name: 'Ward Charge',      rar: 'rare', cat: 'defense', icon: '7', max: 2, desc: 'The first hit you take each stage is completely absorbed.', m: { ward: 1 } },
  { id: 'fieldrepair', name: 'Field Repairs',  rar: 'common', cat: 'defense', icon: '+', max: 3, desc: 'Instantly repair 40% of your max hull.', m: {}, on(r) { Heal(r, 0.4); } },
  // ---- utility ----
  { id: 'scavdrone', name: 'Scavenger Drones', rar: 'common', cat: 'utility', icon: '8', desc: 'Kills have a 10% chance to drop an energy cell.', m: { energyDrop: 0.1 } },
  { id: 'bombcache', name: 'Bomb Cache',       rar: 'common', cat: 'utility', icon: '9', max: 3, desc: 'Gain 2 Smart Bombs (press B): erase bullets and blast every enemy.', m: {}, on(r) { r.cons.bomb += 2; } },
  { id: 'foresight', name: 'Foresight',        rar: 'rare', cat: 'utility', icon: '0', max: 1, desc: 'Upgrade screens offer 4 cards instead of 3.', m: { extraCard: 1 } },
  { id: 'luckystreak', name: 'Lucky Streak',   rar: 'common', cat: 'utility', icon: '#', max: 2, desc: 'Gain 2 upgrade rerolls.', m: {}, on(r) { r.rerolls += 2; } },
  // ---- economy ----
  { id: 'interest',  name: 'Compound Interest', rar: 'common', cat: 'economy', icon: '%', max: 2, desc: 'After each stage gain 6% of your credits (max 60).', m: { interest: 1 } },
  { id: 'haggler',   name: 'Haggler',          rar: 'common', cat: 'economy', icon: 'h', max: 2, desc: 'Shop prices are 15% lower.', m: { discount: 0.15 } },
  { id: 'bounty',    name: 'Bounty Hunter',    rar: 'common', cat: 'economy', icon: '$', desc: '+60% credits from big ships, elites and bosses.', m: { bigCredit: 0.6 } },
  { id: 'cache',     name: 'Credit Cache',     rar: 'common', cat: 'economy', icon: '&', max: 3, desc: 'Instantly gain 150 credits.', m: {}, on(r) { Run.addCredits(r, 150); } },
  { id: 'salvagerights', name: 'Salvage Rights', rar: 'rare', cat: 'economy', icon: '@', max: 2, desc: 'Earn +30 bonus scrap when this run ends.', m: {}, on(r) { r.bossScrap = (r.bossScrap || 0) + 30; } },
  // ---- sidekicks as upgrade cards (a second copy levels it up) ----
  { id: 'sk_drone',  name: 'Wing Drone',       rar: 'rare', cat: 'sidekick', icon: 'D', max: 3, desc: 'Install a Wing Drone (or +1 level if you already own one).', m: {}, on(r) { Run.giveSidekick(r, 'drone'); }, avail: r => !Run.sidekickMaxed(r, 'drone') },
  { id: 'sk_turret', name: 'Mini-Turret',      rar: 'rare', cat: 'sidekick', icon: 'T', max: 3, desc: 'Install a Mini-Turret (or +1 level if you already own one).', m: {}, on(r) { Run.giveSidekick(r, 'turret'); }, avail: r => !Run.sidekickMaxed(r, 'turret') },
  { id: 'sk_pod',    name: 'Missile Pod',      rar: 'rare', cat: 'sidekick', icon: 'M', max: 3, desc: 'Install a Missile Pod (or +1 level if you already own one).', m: {}, on(r) { Run.giveSidekick(r, 'pod'); }, avail: r => !Run.sidekickMaxed(r, 'pod') },
  { id: 'sk_orb',    name: 'Shield Orb',       rar: 'rare', cat: 'sidekick', icon: 'O', max: 3, desc: 'Install a Shield Orb (or +1 level if you already own one).', m: {}, on(r) { Run.giveSidekick(r, 'orb'); }, avail: r => !Run.sidekickMaxed(r, 'orb') },
  // ---- equipment tiers as upgrade cards ----
  { id: 'eq_gen',    name: 'Generator Upgrade', rar: 'rare', cat: 'energy', icon: 'g', max: 3, desc: 'Install the next generator tier: more energy, faster regeneration.', m: {}, on(r) { r.eq.gen = Math.min(3, r.eq.gen + 1); }, avail: r => r.eq.gen < 3 },
  { id: 'eq_shield', name: 'Shield Upgrade',    rar: 'rare', cat: 'defense', icon: 'e', max: 3, desc: 'Install the next shield tier: bigger, faster-recharging shield.', m: {}, on(r) { r.eq.shield = Math.min(3, r.eq.shield + 1); }, avail: r => r.eq.shield < 3 },
  { id: 'eq_armor',  name: 'Armor Upgrade',     rar: 'rare', cat: 'defense', icon: 'A', max: 3, desc: 'Install the next armor tier: more hull and damage reduction, plus a 25 hull repair.', m: {}, on(r) { r.eq.armor = Math.min(3, r.eq.armor + 1); Run.heal(r, 25); }, avail: r => r.eq.armor < 3 }
];
const UPG = {}; UPGRADES.forEach(u => UPG[u.id] = u);

/* upgrade categories: the picker avoids showing two cards of the same category */
const CATS = {
  offense:  { name: 'OFFENSE',  col: '#ff8a6a' },
  defense:  { name: 'DEFENSE',  col: '#6fc4ff' },
  energy:   { name: 'ENERGY',   col: '#ffe45a' },
  utility:  { name: 'UTILITY',  col: '#9dff8a' },
  economy:  { name: 'ECONOMY',  col: '#ffd23d' },
  sidekick: { name: 'SIDEKICK', col: '#6df0ff' }
};
const UPG_CAT = {
  offense: 'hotrounds rapid pierce ricochet homing twin overcharge laststand prism nova warlord glass berserk bloodpact overclock hunter volatile crit giant pestc adrenaline killblast surge tune',
  defense: 'hull shieldcap shieldrg nano siphon phase phoenix chrono plating reactive hullsiphon phasecore brake aegis',
  energy: 'gen cells leech overdrive hotreactor eff battery',
  utility: 'magnet thrusters combo powbeacon amp',
  economy: 'salvager greed',
  sidekick: 'sidetune swarmlord'
};
for (const c in UPG_CAT) UPG_CAT[c].split(' ').forEach(id => { if (UPG[id] && !UPG[id].cat) UPG[id].cat = c; });
UPGRADES.forEach(u => { if (!u.cat) u.cat = u.weapon ? 'offense' : 'utility'; });

/* ---------- SYNERGIES: need = upgrade ids owned (all) ---------- */
const SYNERGIES = [
  { id: 'exec',     name: 'Executioner',      need: ['giant', 'crit'],           desc: 'Critical hits deal triple damage instead of double.' },
  { id: 'reactor2', name: 'Bulwark Reactor',  need: ['reactive', 'shieldcap'],   desc: 'Reactive Shield also restores 30 shield when it triggers.' },
  { id: 'vamp',     name: 'Vampiric Rounds',  need: ['hullsiphon', 'leech'],     desc: 'Hull Siphon heals double.' },
  { id: 'chain',   name: 'Chain Reaction',    need: ['pierce', 'ricochet'],     desc: 'Bounced bullets gain +30% damage each bounce and +1 pierce.' },
  { id: 'storm',   name: 'Static Storm',      need: ['siphon', 'overcharge'],   desc: 'Kills at high energy release a shock ring that damages nearby enemies.' },
  { id: 'hive',    name: 'Hive Mind',         need: ['homing', 'sidetune'],     desc: 'Sidekick shots home in and sidekicks fire 40% faster.' },
  { id: 'midas',   name: 'Midas Field',       need: ['magnet', 'salvager'],     desc: 'Credits worth +30% and pickups are drawn from the whole screen.' },
  { id: 'perpet',  name: 'Perpetual Motion',  need: ['leech', 'overdrive'],     desc: 'Weapons cost no energy while above 75% energy.' },
  { id: 'martyr',  name: "Martyr's Resolve",  need: ['laststand', 'glass'],     desc: 'Last Stand bonus is doubled and you gain 0.4s extra invulnerability.' },
  { id: 'blitz',   name: 'Blitz Lattice',     need: ['twin', 'rapid'],          desc: 'Front weapon fires an extra salvo every 12th shot.' },
  { id: 'bastion', name: 'Bastion Protocol',  need: ['shieldcap', 'shieldrg'],  desc: 'Shield recharge delay halved.' }
];

/* ---------- CONSUMABLES ---------- */
const CONSUMABLES = {
  repair: { name: 'Repair Kit',   price: 70, desc: 'Press R in a stage: restore 40 hull.', key: 'R' },
  cell:   { name: 'Energy Cell',  price: 50, desc: 'Press C in a stage: refill energy and shield.', key: 'C' },
  bomb:   { name: 'Smart Bomb',   price: 90, desc: 'Press B in a stage: erase every bullet and blast all enemies.', key: 'B' }
};

/* ---------- MYSTERY EVENTS (apply uses Run API from 30_run.js) ---------- */
const EVENTS = [
  { id: 'cache', title: 'Derelict Cache', text: 'A drifting cargo pod pings your scanner. The seals are rigged with a decaying charge.',
    choices: [
      { label: 'Crack it open', desc: 'Gain ~160 credits, lose 20 hull.', go: r => { Run.addCredits(r, 160); Run.damage(r, 20); return 'You cut it open. The blast scorches your hull (-20) but the cargo is yours (+160 cr).'; } },
      { label: 'Salvage carefully', desc: 'Gain ~70 credits, safe.', go: r => { Run.addCredits(r, 70); return 'Slow and careful: +70 credits.'; } },
      { label: 'Leave it', desc: 'Nothing happens.', go: r => 'You leave the pod to drift.' }
    ] },
  { id: 'beacon', title: 'Strange Beacon', text: 'A beacon hums an ancient frequency. It offers power, and asks for something in return.',
    choices: [
      { label: 'Accept the pact', desc: 'Receive a CURSED upgrade.', go: r => { const u = Run.grantUpgrade(r, 'cursed'); return `The beacon fuses with your ship: ${u.name}.`; } },
      { label: 'Draw its energy', desc: 'Gain a random common upgrade.', go: r => { const u = Run.grantUpgrade(r, 'common'); return `Harmless static: ${u.name}.`; } },
      { label: 'Destroy it', desc: 'Gain 50 credits of scrap metal.', go: r => { Run.addCredits(r, 50); return 'Scrap metal, +50 credits.'; } }
    ] },
  { id: 'trader', title: 'Wandering Trader', text: 'A patched-together freighter hails you. "Hull for gold, friend? Or gold for hull?"',
    choices: [
      { label: 'Sell hull plating', desc: 'Lose 25 hull, gain 140 credits.', go: r => { Run.damage(r, 25); Run.addCredits(r, 140); return 'You trade plating for credits (-25 hull, +140 cr).'; } },
      { label: 'Buy repairs', desc: 'Pay 70 credits, restore 45 hull.', go: r => { if (r.credits < 70) return 'You cannot afford it. The trader shrugs and leaves.'; r.credits -= 70; Run.heal(r, 45); return 'Repairs done: -70 cr, +45 hull.'; } },
      { label: 'Ignore', desc: 'Nothing happens.', go: r => 'You fly on.' }
    ] },
  { id: 'drone', title: 'Abandoned Drone', text: 'A damaged escort drone tumbles through space, still blinking a friendly IFF code.',
    choices: [
      { label: 'Reactivate it', desc: 'Free random sidekick (replaces weakest slot) - 25% it is a trap (-20 hull).', go: r => { if (r.rng() < 0.25) { Run.damage(r, 20); return 'It was booby-trapped! -20 hull.'; } const id = Run.randomSidekick(r); Run.equipSidekick(r, id); return `A ${SIDEKICKS[id].name} joins you.`; } },
      { label: 'Strip for parts', desc: 'Gain 90 credits.', go: r => { Run.addCredits(r, 90); return '+90 credits.'; } }
    ] },
  { id: 'forge', title: 'Hidden Forge', text: 'A lonely mining rig has a working fabricator and no crew.',
    choices: [
      { label: 'Tune your front weapon', desc: '+1 front weapon power level.', go: r => { Run.levelWeapon(r, 'front', 1); return 'Front weapon +1 level.'; } },
      { label: 'Tune your generator', desc: 'Gain the Overclocked Generator upgrade.', go: r => { Run.take(r, 'gen'); return 'Generator overclocked: more energy, faster refill.'; } },
      { label: 'Overload the forge', desc: '+2 front levels, but lose 30 hull.', go: r => { Run.levelWeapon(r, 'front', 2); Run.damage(r, 30); return 'Sparks fly: front +2 levels, -30 hull.'; } }
    ] },
  { id: 'armory', title: 'Derelict Armory', text: 'A sealed weapons locker drifts past, its door hanging open. Two racks still hold working guns.',
    choices: r => Run.weaponChoices(r, 2).map(id => ({ label: 'Install ' + FRONT[id].name, desc: FRONT[id].desc + ' Your power level carries over.', go: r2 => { Run.equipFront(r2, id); return FRONT[id].name + ' installed (level ' + r2.front.lvl + ').'; } }))
      .concat([{ label: 'Strip it for credits', desc: 'Gain 70 credits.', go: r2 => { Run.addCredits(r2, 70); return '+70 credits.'; } }]) },
  { id: 'prototype', title: 'Prototype Rack', text: 'An experimental weapon sits on a half-powered rack. The power coupling looks unstable.',
    choices: r => { const id = Run.weaponChoices(r, 1)[0]; return [
      { label: 'Install the ' + FRONT[id].name + ' prototype', desc: 'Swap weapons and gain +2 power levels, but a power surge costs 20 hull.', go: r2 => { Run.equipFront(r2, id, 2); Run.damage(r2, 20); return FRONT[id].name + ' installed at level ' + r2.front.lvl + '. The surge scorches your hull (-20).'; } },
      { label: 'Leave it', desc: 'Nothing happens.', go: r2 => 'You leave the prototype to rust.' }]; } },
  { id: 'broker', title: 'Weapons Broker', text: '"Your gun is yesterday\'s news, pilot. I can swap it for something better, for a fee."',
    choices: r => Run.weaponChoices(r, 2).map(id => ({ label: 'Swap to ' + FRONT[id].name + ' (80 credits)', desc: FRONT[id].desc + ' +1 power level.', go: r2 => { if (r2.credits < 80) return 'You cannot afford the swap. The broker shrugs.'; r2.credits -= 80; Run.equipFront(r2, id, 1); return FRONT[id].name + ' installed at level ' + r2.front.lvl + ' (-80 cr).'; } }))
      .concat([{ label: 'No deal', desc: 'Nothing happens.', go: r2 => 'You wave the broker off.' }]) },
  { id: 'gamble', title: 'Rift Gambler', text: 'A masked pilot offers a coin toss on the edge of the rift. Winner takes it all.',
    choices: [
      { label: 'Bet 100 credits', desc: '50%: win 260. 50%: lose 100.', go: r => { if (r.credits < 100) return 'You cannot cover the bet.'; if (r.rng() < 0.5) { Run.addCredits(r, 260); return 'Heads! +260 credits.'; } r.credits -= 100; return 'Tails. -100 credits.'; } },
      { label: 'Decline', desc: 'Nothing happens.', go: r => 'You decline.' }
    ] }
];
