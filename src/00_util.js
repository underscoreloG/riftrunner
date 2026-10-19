'use strict';
/* ===================================================================
   RIFTRUNNER - roguelite vertical shoot-'em-up
   SECTION 00: utilities (math, seeded RNG, save)
   =================================================================== */
const WEAPON_MAX = 20; // weapon power levels
let W = 480; const H = 720; // W adapts to the window aspect ratio (set in Main.layout)
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const $ = (s, r) => (r || document).querySelector(s);

function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
// mulberry32 seeded RNG with helpers
function RNG(seed) {
  let a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0;
  const f = function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.int = (lo, hi) => Math.floor(lo + f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  f.sign = () => f() < 0.5 ? -1 : 1;
  f.shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  f.weighted = (items, wf) => {
    let tot = 0; for (const it of items) tot += wf(it);
    let r = f() * tot;
    for (const it of items) { r -= wf(it); if (r <= 0) return it; }
    return items[items.length - 1];
  };
  return f;
}
const fxr = Math.random; // cosmetic randomness (not seeded)
const frand = (a, b) => a + Math.random() * (b - a);

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function randomSeedWord() {
  const A = ['NOVA', 'RIFT', 'VOID', 'ASH', 'IRON', 'HALO', 'ZERO', 'APEX', 'DUSK', 'FLUX', 'ONYX', 'ECHO'];
  return A[Math.floor(Math.random() * A.length)] + '-' + Math.floor(Math.random() * 9000 + 1000);
}
function fmt(n) { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n); }
function fmtTime(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

/* ---------- Save (localStorage, always wrapped) ---------- */
const Save = {
  key: 'riftrunner_save_v1',
  data: null,
  defaults() {
    return {
      scrap: 0,
      ships: { vanguard: true },
      weapons: { pulse: true, spread: true, lance: true },
      perks: {},
      stats: { runs: 0, wins: 0, best: 0, kills: 0, bestSector: 0, scrapTotal: 0 },
      daily: {},
      settings: { master: 0.8, music: 0.55, sfx: 0.8, muted: false, difficulty: 1, ship: 'vanguard', front: 'pulse', autofire: true }
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.key)); } catch (e) { d = null; }
    const base = this.defaults();
    if (d && typeof d === 'object') {
      for (const k in base) {
        if (d[k] === undefined) d[k] = base[k];
        else if (typeof base[k] === 'object') d[k] = Object.assign({}, base[k], d[k]);
      }
      this.data = d;
    } else this.data = base;
    return this.data;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* storage blocked: run continues unsaved */ } },
  reset() { try { localStorage.removeItem(this.key); } catch (e) {} this.data = this.defaults(); }
};
Save.load();
