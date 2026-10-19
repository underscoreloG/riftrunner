/* ===================================================================
   SECTION 40: UI - DOM menu screens layered over the canvas.
   Keyboard / gamepad / touch navigable.
   =================================================================== */
function h(tag, a) {
  const e = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k];
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) e.setAttribute(k, v === true ? '' : v);
  }
  for (let i = 2; i < arguments.length; i++) {
    const kids = [].concat(arguments[i]);
    for (const c of kids) { if (c === null || c === undefined || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  }
  return e;
}
const rcol = u => u.cursed ? '#c78bff' : RARITY[u.rar].col;

const UI = {
  el: null, active: false, backFn: null, toastEl: null, muteBtn: null,
  init() {
    this.el = $('#ui'); this.toastEl = $('#toast');
    Input.menuKey = e => this.onKey(e);
    Input.menuPad = b => this.onPad(b);
    this.el.addEventListener('click', e => {
      Aud.init(); Aud.resume();
      if (!Music.id && this.active && !g) Music.start('menu');
      if (e.target.closest('button')) Aud.sfx('ui');
    });
    $('#mutebtn').addEventListener('click', () => { Input.edge.mute = true; });
    this.refreshMute(); this.initTips();
  },
  refreshMute() { $('#mutebtn').textContent = Save.data.settings.muted ? '🔇' : '🔊'; },
  set() {
    const nodes = [].slice.call(arguments).flat().filter(Boolean);
    this.el.replaceChildren.apply(this.el, nodes);
    this.el.style.display = 'flex'; this.active = true; this.backFn = null; $('#mutebtn').style.display = $('#fsbtn').style.display = 'none'; $('#touch').style.visibility = 'hidden'; $('#uibg').style.display = 'block';
    this.el.classList.remove('w2'); Main.fitUI(); if (this.hideTip) this.hideTip();
    const sc = this.el.querySelector('.scroll'); if (sc) sc.scrollTop = 0;
    this.focusFirst();
  },
  hide() { this.el.replaceChildren(); this.el.style.display = 'none'; this.active = false; this.backFn = null; $('#mutebtn').style.display = $('#fsbtn').style.display = ''; $('#touch').style.visibility = ''; $('#uibg').style.display = 'none'; this.el.classList.remove('w2'); if (this.hideTip) this.hideTip(); },
  back(fn) { this.backFn = fn; },
  toast(msg, col) {
    const t = h('div', { class: 'toastmsg', style: 'color:' + (col || '#fff') }, msg);
    this.toastEl.append(t); setTimeout(() => t.remove(), 3600);
  },
  focusables() { return [].slice.call(this.el.querySelectorAll('button:not([disabled]), input:not([type=hidden])')).filter(b => b.offsetParent !== null); },
  focusFirst() {
    setTimeout(() => {
      const f = this.focusables(); const pref = this.el.querySelector('[data-focus]');
      (pref && !pref.disabled ? pref : f[0]) && (pref && !pref.disabled ? pref : f[0]).focus({ preventScroll: true });
    }, 0);
  },
  move(dir) {
    const f = this.focusables(), cur = document.activeElement;
    if (!f.length) return;
    if (!cur || !this.el.contains(cur)) { f[0].focus(); return; }
    const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = 1e9;
    for (const b of f) {
      if (b === cur) continue;
      const r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      let pri, per;
      if (dir === 'u') { if (dy > -4) continue; pri = -dy; per = Math.abs(dx); }
      else if (dir === 'd') { if (dy < 4) continue; pri = dy; per = Math.abs(dx); }
      else if (dir === 'l') { if (dx > -4) continue; pri = -dx; per = Math.abs(dy); }
      else { if (dx < 4) continue; pri = dx; per = Math.abs(dy); }
      const s = pri + per * 2.2; if (s < bs) { bs = s; best = b; }
    }
    if (best) { best.focus({ preventScroll: false }); best.scrollIntoView({ block: 'nearest' }); Aud.sfx('select'); }
  },
  onKey(e) {
    if (!this.active) return;
    const t = e.target, isText = t && t.tagName === 'INPUT' && t.type === 'text', isRange = t && t.tagName === 'INPUT' && t.type === 'range';
    if (isText) { if (e.code === 'Escape') { t.blur(); } return; }
    const map = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', KeyW: 'u', KeyS: 'd', KeyA: 'l', KeyD: 'r' };
    const d = map[e.code];
    if (d) { if (isRange && (d === 'l' || d === 'r')) return; e.preventDefault(); this.move(d); }
    else if (e.code === 'Escape' && this.backFn) { e.preventDefault(); Input.edge.pause = false; Aud.sfx('back'); this.backFn(); }
    else if (e.code === 'KeyP' && Flow.mode === 'pause' && this.backFn) { Input.edge.pause = false; this.backFn(); }
  },
  onPad(b) {
    if (!this.active) return;
    if (typeof b === 'object') { this.move(b.dir); return; }
    if (b === 0) { const a = document.activeElement; if (a && this.el.contains(a) && a.click) a.click(); }
    else if ((b === 1 || b === 9) && this.backFn) { Aud.sfx('back'); this.backFn(); }
  },

  /* ---------- building blocks ---------- */
  panel(cls, kids) { return h('div', { class: 'panel ' + (cls || '') }, kids); },
  btn(label, fn, cls, extra) { return h('button', Object.assign({ class: 'btn ' + (cls || ''), onclick: fn }, extra || {}), label); },
  bar(label, f, col, txt) { return h('div', { class: 'ubar' }, h('div', { class: 'fill', style: `width:${clamp(f, 0, 1) * 100}%;background:${col}` }), h('span', null, label + (txt ? ' ' + txt : ''))); },
  slider(label, key) {
    const s = Save.data.settings;
    return h('label', { class: 'sl' }, h('span', null, label), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s[key], oninput: e => { s[key] = parseFloat(e.target.value); Save.save(); Aud.applyVol(); } }));
  },

  /* ---------- TITLE ---------- */
  title() {
    Flow.mode = 'menu'; g = null; Flow.run = null; Bg.init(0);
    const S = Save.data;
    this.set(h('div', { class: 'center' },
      h('div', { class: 'logo' }, h('span', { class: 'l1' }, 'RIFT'), h('span', { class: 'l2' }, 'RUNNER')),
      h('div', { class: 'tag' }, 'ROGUELITE SHOOT-\'EM-UP'),
      h('div', { class: 'menu' },
        this.btn('Start Run', () => this.launch(false), 'big', { 'data-focus': 1 }),
        this.btn('Daily Run  ' + todayStr(), () => this.launch(true), ''),
        this.btn('Hangar  (' + fmt(S.scrap) + ' scrap)', () => this.hangar('ships'), ''),
        this.btn('Options', () => this.options(() => this.title()), ''),
        this.btn('How to play', () => this.help(), '')),
      h('div', { class: 'stats' }, `Runs ${S.stats.runs}  |  Wins ${S.stats.wins}  |  Best ${fmt(S.stats.best)}  |  Kills ${fmt(S.stats.kills)}`),
      h('div', { class: 'hint' }, 'WASD / arrows move  |  Shift focus  |  Space fire  |  E special  |  P pause')));
  },
  help() {
    this.set(h('div', { class: 'center' },
      this.title_('HOW TO PLAY'),
      this.panel('txt', [
        h('p', null, 'Survive 3 sectors. Each sector is 4-5 stages ending in a boss. Death ends the run; you keep scrap to unlock ships, weapons and perks.'),
        h('p', null, h('b', null, 'Move'), ' WASD / arrows / left stick / drag left side. ', h('b', null, 'Focus'), ' Shift (slow, shows hitbox). ', h('b', null, 'Fire'), ' auto (toggle F) or Space. ', h('b', null, 'Special + sidekick burst'), ' E. ', h('b', null, 'Repair kit / Energy cell / Smart bomb'), ' R / C / B. ', h('b', null, 'Pause'), ' P or Esc. ', h('b', null, 'Mute'), ' M.'),
        h('p', null, 'Weapons and shield recharging both use energy. Each weapon level adds a bit of energy supply, and kills refund some. If you run low, your weapon keeps its full power but fires only as fast as the generator allows, and the shield pauses. A better generator (always in the shop) fixes it.'),
        h('p', null, 'After each stage pick 1 of 3 upgrades. Own matching pairs to trigger SYNERGIES. Cursed upgrades are strong but cost you.'),
        h('p', null, 'Seeds make maps, shops and upgrade offers repeatable. The Daily Run uses today\'s date as the seed.')]),
      this.btn('Back', () => this.title(), 'big')));
    this.back(() => this.title());
  },
  title_(t) { return h('div', { class: 'h1 small' }, t); },

  /* ---------- OPTIONS ---------- */
  options(back) {
    const S = Save.data.settings;
    const mute = this.btn(S.muted ? 'Sound: OFF' : 'Sound: ON', () => { S.muted = !S.muted; Save.save(); Aud.applyVol(); this.refreshMute(); this.options(back); });
    const auto = this.btn(S.autofire ? 'Auto-fire: ON' : 'Auto-fire: OFF', () => { S.autofire = !S.autofire; Save.save(); this.options(back); });
    const bloom = this.btn(S.bloom === false ? 'Bloom glow: OFF' : 'Bloom glow: ON', () => { S.bloom = S.bloom === false; Save.save(); this.options(back); });
    const full = this.btn('Fullscreen now (G)', () => Main.toggleFull());
    const afull = this.btn(S.autoFull === false ? 'Fullscreen on launch: OFF' : 'Fullscreen on launch: ON', () => { S.autoFull = S.autoFull === false; Save.save(); this.options(back); });
    let rs = 0;
    const reset = this.btn('Reset all save data', () => { if (++rs < 2) { reset.textContent = 'Click again to ERASE everything'; reset.classList.add('danger'); } else { Save.reset(); this.toast('Save erased', '#f88'); this.options(back); } }, 'sm');
    this.set(h('div', { class: 'center' }, this.title_('OPTIONS'),
      this.panel('form', [this.slider('Master volume', 'master'), this.slider('Music volume', 'music'), this.slider('SFX volume', 'sfx'), mute, auto, bloom, full, afull, reset]),
      this.btn('Back', back, 'big')));
    this.back(back);
  },

  /* ---------- LAUNCH (ship / weapons / difficulty / seed) ---------- */
  launch(daily) {
    const S = Save.data, st = S.settings;
    const sel = { ship: S.ships[st.ship] ? st.ship : 'vanguard', front: S.weapons[st.front] ? st.front : 'pulse', diff: daily ? 1 : st.difficulty };
    const frontIds = Object.keys(FRONT).filter(id => S.weapons[id]);
    const seedIn = h('input', { type: 'text', class: 'seed', maxlength: 24, placeholder: 'random', value: daily ? 'DAILY-' + todayStr() : '', disabled: daily });
    const draw = () => {
      const ships = Object.keys(SHIPS).map(id => {
        const sh = SHIPS[id], owned = S.ships[id];
        return h('button', { class: 'card ship' + (sel.ship === id ? ' sel' : '') + (owned ? '' : ' locked'), disabled: !owned, onclick: () => { sel.ship = id; draw(); }, style: '--c:' + sh.col },
          h('div', { class: 'cn' }, sh.name), h('div', { class: 'cd' }, owned ? sh.desc : 'Locked: ' + sh.price + ' scrap (Hangar)'),
          owned ? h('div', { class: 'cs' }, `Hull ${sh.hull}  Spd ${sh.speed}`, h('br'), `Special: ${sh.special.name}`) : null);
      });
      const chip = (label, on, fn, dis, col) => h('button', { class: 'chip' + (on ? ' sel' : ''), onclick: fn, disabled: dis, style: col ? '--c:' + col : '' }, label);
      this.set(h('div', { class: 'center wide' }, this.title_(daily ? 'DAILY RUN' : 'LOADOUT'),
        h('div', { class: 'row3' }, ships),
        h('div', { class: 'lbl' }, 'Special: ' + SHIPS[sel.ship].special.name + ' - ' + SHIPS[sel.ship].special.desc),
        h('div', { class: 'lbl' }, 'Front weapon'), h('div', { class: 'chips' }, frontIds.map(id => chip(FRONT[id].name, sel.front === id, () => { sel.front = id; draw(); }, false, FRONT[id].col))),
        h('div', { class: 'lbl' }, FRONT[sel.front].desc),
        h('div', { class: 'lbl' }, 'Difficulty' + (daily ? ' (fixed for daily)' : '')), h('div', { class: 'chips' }, DIFFS.map(d => chip(d.name, sel.diff === d.id, () => { sel.diff = d.id; draw(); }, daily))),
        h('div', { class: 'lbl' }, DIFFS[sel.diff].desc + '  Scrap x' + DIFFS[sel.diff].scrap),
        h('div', { class: 'lbl' }, 'Seed ', seedIn),
        h('div', { class: 'btnrow' }, this.btn('Launch', () => { const seed = (seedIn.value || '').trim() || randomSeedWord(); Main.enterFull(); Flow.newRun({ seed, diff: sel.diff, ship: sel.ship, front: sel.front, daily }); }, 'big', { 'data-focus': 1 }), this.btn('Back', () => this.title(), ''))));
      this.back(() => this.title());
    };
    draw();
  },

  /* ---------- HANGAR (meta unlocks) ---------- */
  hangar(tab) {
    const S = Save.data;
    const tabs = h('div', { class: 'chips' }, ['ships', 'weapons', 'perks'].map(t => h('button', { class: 'chip' + (tab === t ? ' sel' : ''), onclick: () => this.hangar(t) }, t[0].toUpperCase() + t.slice(1))));
    const rows = [];
    const buy = (price, apply) => { if (S.scrap < price) { Aud.sfx('lock'); return; } S.scrap -= price; apply(); Save.save(); Aud.sfx('power'); this.hangar(tab); };
    if (tab === 'ships') for (const id in SHIPS) { const sh = SHIPS[id], own = S.ships[id]; rows.push(this.row(sh.name, `${sh.desc} Hull ${sh.hull}, speed ${sh.speed}. Special: ${sh.special.name}.`, own ? 'OWNED' : sh.price + ' scrap', !own && S.scrap >= sh.price, () => buy(sh.price, () => S.ships[id] = true), own, sh.col)); }
    else if (tab === 'weapons') {
      for (const id in FRONT) { const w = FRONT[id], own = S.weapons[id]; rows.push(this.row(w.name, w.desc, own ? 'UNLOCKED' : w.unlock + ' scrap', !own && S.scrap >= w.unlock, () => buy(w.unlock, () => S.weapons[id] = true), own, w.col)); }
    } else for (const id in PERKS) {
      const pk = PERKS[id], lv = S.perks[id] || 0, max = lv >= pk.max, price = pk.cost(lv);
      rows.push(this.row(`${pk.name}  [${lv}/${pk.max}]`, lv ? pk.desc(lv) : pk.desc(1), max ? 'MAXED' : price + ' scrap', !max && S.scrap >= price, () => buy(price, () => S.perks[id] = lv + 1), max, '#6df0ff'));
    }
    this.set(h('div', { class: 'center wide' }, this.title_('HANGAR'), h('div', { class: 'scrapline' }, 'Scrap: ' + fmt(S.scrap)), tabs, h('div', { class: 'scroll list' }, rows), this.btn('Back', () => this.title(), 'big')));
    this.back(() => this.title());
  },
  row(name, desc, right, can, fn, done, col) {
    return h('div', { class: 'rowitem' + (done ? ' done' : ''), style: col ? '--c:' + col : '' },
      h('div', { class: 'ri' }, h('div', { class: 'rn' }, name), h('div', { class: 'rd' }, desc)),
      h('button', { class: 'btn sm' + (can ? '' : ' off'), disabled: !can, onclick: fn }, right));
  },

  /* ---------- MAP ---------- */
  /* ---------- tooltips: any element with data-tip (HTML) gets a hover / focus / tap tooltip ---------- */
  esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); },
  tip(title, col, meta) {
    const lines = [].slice.call(arguments, 3).filter(Boolean);
    return '<b style="color:' + (col || '#fff') + '">' + this.esc(title) + '</b>' + (meta ? '<div class="tm">' + this.esc(meta) + '</div>' : '') + lines.map(l => '<div>' + this.esc(l) + '</div>').join('');
  },
  initTips() {
    const t = this.tipEl = $('#tip');
    const place = (x, y) => { const r = t.getBoundingClientRect(); let px = x + 16, py = y + 16; if (px + r.width > innerWidth - 8) px = x - r.width - 14; if (py + r.height > innerHeight - 8) py = innerHeight - r.height - 8; t.style.left = Math.max(4, px) + 'px'; t.style.top = Math.max(4, py) + 'px'; };
    const show = (el, x, y) => { t.innerHTML = el.getAttribute('data-tip'); t.style.display = 'block'; place(x, y); };
    const hide = () => { t.style.display = 'none'; };
    this.hideTip = hide;
    document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else hide(); });
    document.addEventListener('mousemove', e => { if (t.style.display === 'block') place(e.clientX, e.clientY); });
    document.addEventListener('mouseout', e => { const r = e.relatedTarget; if (!r || !r.closest || !r.closest('[data-tip]')) hide(); });
    this.el.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); show(el, r.right - 20, r.top); } });
    this.el.addEventListener('focusout', hide);
    document.addEventListener('click', e => { if (!Input.touchMode) return; const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else hide(); });
  },
  setWide(on) { this.el.classList.toggle('w2', !!on); Main.fitUI(); },

  /* ship status sidebar for the map screen: stats, loadout and every item with a hover description */
  shipPanel(run) {
    const d = Run.derive(run), F = FRONT[run.front.id], sh = SHIELDS[run.eq.shield], ar = ARMORS[run.eq.armor], ge = GENS[run.eq.gen], sp = run.ship.special;
    const sect = t => h('div', { class: 'ptitle' }, t);
    const row = (l, v, tip, col) => h('div', { class: 'prow', 'data-tip': tip || null }, h('span', { class: 'pl' }, l), h('span', { class: 'pv', style: col ? 'color:' + col : '' }, v));
    const need = Run.xpNeed(run), wm = run.upgrades.filter(id => UPG[id].weapon === run.front.id).map(id => UPG[id].name);
    const counts = {}; run.upgrades.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const ids = Object.keys(counts).sort((x, y) => (UPG[x].cat > UPG[y].cat ? 1 : UPG[x].cat < UPG[y].cat ? -1 : RAR_ORDER[UPG[y].rar] - RAR_ORDER[UPG[x].rar]));
    const pills = ids.map(id => {
      const u = UPG[id], n = counts[id], inactive = u.weapon && u.weapon !== run.front.id;
      const syn = SYNERGIES.filter(s => s.need.includes(id)).map(s => 'Synergy: ' + s.name + ' (with ' + s.need.filter(x => x !== id).map(x => UPG[x].name).join(', ') + ')' + (run.syn.has(s.id) ? ' - ACTIVE' : ''));
      const tip = this.tip(u.name + (n > 1 ? ' x' + n : ''), rcol(u), (u.cursed ? 'CURSED ' : '') + RARITY[u.rar].name + '  |  ' + CATS[u.cat].name, u.desc, n > 1 ? 'You own ' + n + ' copies (effects stack).' : '', inactive ? 'INACTIVE: needs ' + FRONT[u.weapon].name + ' equipped.' : '', ...syn);
      return h('span', { class: 'upill' + (inactive ? ' off' : ''), style: '--c:' + rcol(u) + ';border-left:3px solid ' + CATS[u.cat].col, 'data-tip': tip }, u.name + (n > 1 ? ' x' + n : ''));
    });
    const synPills = SYNERGIES.filter(s => run.syn.has(s.id)).map(s => h('span', { class: 'upill syn', 'data-tip': this.tip(s.name, '#ffe066', 'ACTIVE SYNERGY', s.desc, 'Made from: ' + s.need.map(x => UPG[x].name).join(' + ')) }, '\u2726 ' + s.name));
    const side = (k) => { const s = run[k]; return s ? row(k === 'left' ? 'Left' : 'Right', SIDEKICKS[s.id].name + ' L' + s.lvl, this.tip(SIDEKICKS[s.id].name, SIDEKICKS[s.id].col, 'SIDEKICK  |  level ' + s.lvl + ' of 3', SIDEKICKS[s.id].desc, 'Press E to trigger its burst.'), SIDEKICKS[s.id].col) : row(k === 'left' ? 'Left' : 'Right', '(empty)', this.tip('Empty sidekick slot', '#8fa3bf', null, 'Buy or find a sidekick to fill it.')); };
    return h('div', { class: 'mapside' },
      h('div', { class: 'ptitle first' }, run.ship.name.toUpperCase() + '  |  SHIP STATUS'),
      h('div', { 'data-tip': this.tip('Hull', '#ff8a7a', null, 'Your health. It carries over between stages; repair at docks, shops and with kits.', 'Max ' + d.maxHull + ', damage reduction ' + Math.round(d.dr * 100) + '%.') }, this.bar('HULL', run.hull / d.maxHull, '#e2574c', Math.ceil(run.hull) + '/' + d.maxHull)),
      row('Credits', '\u25C6 ' + fmt(run.credits), this.tip('Credits', '#ffd23d', null, 'Spend them in shops. Earned from kills, bosses and events.'), '#ffd23d'),
      row('Score', fmt(run.score), this.tip('Score', '#fff', null, 'Kills times your combo multiplier. Also feeds the scrap you earn after a run.')),
      row('Rerolls', String(run.rerolls), this.tip('Upgrade rerolls', '#fff', null, 'Spend one on an upgrade screen to draw new cards.')),
      row('Special (E)', sp.name, this.tip(sp.name, run.ship.col, 'SHIP SPECIAL  |  ' + sp.cost + ' energy, ' + sp.cd + 's cooldown', sp.desc), run.ship.col),
      sect('WEAPON'),
      row(F.name, 'L' + run.front.lvl + '/' + WEAPON_MAX, this.tip(F.name, F.col, 'FRONT WEAPON  |  power level ' + run.front.lvl + ' of ' + WEAPON_MAX, F.desc, 'Uses about ' + Math.round(energyDrain(run.front.lvl, run.front.id)) + ' energy per second while firing.', run.front.lvl < WEAPON_MAX ? 'Next level: ' + run.xp + '/' + need + ' power-ups.' : 'Max power reached.', wm.length ? 'Weapon upgrades active: ' + wm.join(', ') + '.' : ''), F.col),
      h('div', { class: 'xpbar', 'data-tip': this.tip('Weapon power', '#ffe066', null, 'Power-ups (P) fill this bar. A full bar raises your weapon one level.') }, h('i', { style: 'width:' + (run.front.lvl >= WEAPON_MAX ? 100 : 100 * run.xp / need) + '%' })),
      sect('EQUIPMENT'),
      row('Shield', sh.name, this.tip(sh.name, '#6fc4ff', 'SHIELD  |  tier ' + (run.eq.shield + 1) + ' of 4', 'Max shield ' + d.maxShield + ', regen ' + d.shRegen.toFixed(1) + '/s after ' + d.shDelay.toFixed(1) + 's without a hit.', 'Recharging uses energy.'), '#6fc4ff'),
      row('Armor', ar.name, this.tip(ar.name, '#c9c9d6', 'ARMOR  |  tier ' + (run.eq.armor + 1) + ' of 4', '+' + ar.hull + ' hull and ' + Math.round(ar.dr * 100) + '% damage reduction.'), '#c9c9d6'),
      row('Generator', ge.name, this.tip(ge.name, '#ffe45a', 'GENERATOR  |  tier ' + (run.eq.gen + 1) + ' of 4', 'Energy tank ' + Math.round(d.maxEnergy) + ', regen ' + d.enRegen.toFixed(1) + '/s (includes +5 / +0.75 per weapon level).', 'Weapons and shield recharge draw from it.'), '#ffe45a'),
      sect('SIDEKICKS'), side('left'), side('right'),
      sect('CONSUMABLES'),
      ...['repair', 'cell', 'bomb'].map(k => row(CONSUMABLES[k].name + ' (' + CONSUMABLES[k].key + ')', 'x' + run.cons[k], this.tip(CONSUMABLES[k].name, '#fff', 'CONSUMABLE  |  key ' + CONSUMABLES[k].key, CONSUMABLES[k].desc))),
      synPills.length ? sect('SYNERGIES') : null, synPills.length ? h('div', { class: 'pills full' }, synPills) : null,
      sect('UPGRADES (' + run.upgrades.length + ')'),
      pills.length ? h('div', { class: 'pills full' }, pills) : h('div', { class: 'ml' }, 'None yet. Clear a stage to pick one.'),
      h('div', { class: 'seedtag', style: 'margin-top:10px' }, 'Seed: ' + run.seed));
  },

  /* ---------- MAP ---------- */
  map(run) {
    const si = run.sector, sec = SECTORS[si], M = Run.sectorMap(run, si), cur = run.step;
    const wide = innerWidth / innerHeight >= 1.15; // landscape window: status sidebar on the left; portrait: stacked
    const rows = [];
    for (let i = M.steps.length - 1; i >= 0; i--) {
      const step = M.steps[i], past = i < cur, now = i === cur, next = i === cur + 1;
      const cards = step.map(n => {
        const info = NODE_INFO[n.type], hidden = !past && !now && !next && n.type !== 'boss';
        const picked = past && M.picked.includes(n.id);
        const cls = 'node' + (now ? ' now' : '') + (past ? (picked ? ' picked' : ' missed') : '') + (hidden ? ' hidden' : '');
        const lab = hidden ? '?' : info.icon, name = hidden ? '???' : info.name;
        return h('button', { class: cls, style: '--c:' + (hidden ? '#556' : info.col), disabled: !now, 'data-tip': hidden ? this.tip('Unknown', '#8fa3bf', null, 'You will see what this is once you are one step away.') : this.tip(info.name, info.col, now ? 'Click to enter' : past ? (picked ? 'Visited' : 'Not taken') : 'Upcoming', info.desc), onclick: () => Flow.openNode(n) },
          h('div', { class: 'ni' }, lab), h('div', { class: 'nn' }, name));
      });
      rows.push(h('div', { class: 'maprow' + (now ? ' cur' : '') }, h('div', { class: 'ms' }, i === M.steps.length - 1 ? 'BOSS' : 'STAGE ' + (i + 1)), h('div', { class: 'cards' }, cards)));
    }
    const banner = h('div', { class: 'secbanner', style: '--c:' + sec.pal.accent }, h('div', { class: 'st' }, sec.tag), h('div', { class: 'sn' }, sec.name), h('div', { class: 'sb' }, sec.blurb));
    const list = h('div', { class: 'scroll maplist' }, rows);
    const side = this.shipPanel(run);
    const btns = h('div', { class: 'btnrow' }, this.btn('Menu', () => this.pauseMap(), 'sm'), wide ? null : this.btn('Ship status', () => side.classList.toggle('collapsedside'), 'sm'));
    if (!wide) side.classList.add('collapsedside'); // portrait: the status panel is a toggle so the stage list keeps its space
    if (wide) this.set(h('div', { class: 'mapwrap' }, side, h('div', { class: 'mapmain' }, banner, list, btns)));
    else this.set(h('div', { class: 'center wide' }, banner, list, side, btns));
    this.setWide(wide);
    this.back(() => this.pauseMap());
  },
  pauseMap() {
    this.set(h('div', { class: 'center' }, this.title_('RUN MENU'),
      h('div', { class: 'menu' }, this.btn('Resume', () => Flow.toMap(), 'big', { 'data-focus': 1 }), this.btn('Options', () => this.options(() => this.pauseMap())), this.btn('Abandon run', () => { Flow.quit(); }, 'danger'))));
    this.back(() => Flow.toMap());
  },

  /* ---------- UPGRADE PICK ---------- */
  upgrade(run, cards, node, done, rollOpts, label) {
    const sec = secOf(node.si);
    const draw = (cs) => {
      const owned = new Set(run.upgrades);
      const el = cs.map(u => {
        const hints = SYNERGIES.filter(s => s.need.includes(u.id)).map(s => { const other = s.need.filter(n => n !== u.id); const have = other.every(o => owned.has(o)); return h('div', { class: 'syn' + (have ? ' on' : '') }, (have ? '✦ COMPLETES ' : 'Synergy: ') + s.name + (have ? '' : ' (with ' + other.map(o => UPG[o].name).join(', ') + ')')); });
        return h('button', { class: 'card up' + (u.cursed ? ' cursed' : ''), style: '--c:' + rcol(u), onclick: () => this.pick(run, u, done) },
          h('div', { class: 'ur' }, u.cursed ? 'CURSED  ' + RARITY[u.rar].name : RARITY[u.rar].name, h('span', { class: 'catchip', style: 'color:' + CATS[u.cat].col }, '\u2022 ' + CATS[u.cat].name)),
          h('div', { class: 'cn' }, u.name), h('div', { class: 'cd' }, u.desc), hints);
      });
      const rr = this.btn(run.rerolls > 0 ? `Reroll (${run.rerolls})` : 'No rerolls', () => { run.rerolls--; run.rollN++; draw(Run.roll(run, cs.length, rollOpts || {})); }, 'sm', { disabled: run.rerolls <= 0 });
      const sk = this.btn('Skip (+40 credits)', () => { Run.addCredits(run, 40); done(); }, 'sm');
      this.set(h('div', { class: 'center wide' }, this.title_('CHOOSE AN UPGRADE'), h('div', { class: 'lbl' }, (label ? label + '. ' : '') + (node.type === 'boss' ? 'Boss reward: rare or better' : node.type === 'elite' ? 'Elite reward: at least one rare' : node.type === 'secret' ? 'Secret cache reward' : 'Pick 1 of 3')), el, h('div', { class: 'btnrow' }, rr, sk), h('div', { class: 'lbl' }, `Credits ◆ ${fmt(run.credits)}`)));
    };
    draw(cards);
  },
  pick(run, u, done) {
    const newSyn = Run.take(run, u.id);
    Aud.sfx('select');
    if (u.cursed) this.toast('Cursed: ' + u.name, '#c78bff');
    newSyn.forEach(s => { this.toast('SYNERGY: ' + s.name + ' - ' + s.desc, '#ffe066'); Aud.sfx('power'); });
    done();
  },

  /* ---------- SHOP ---------- */
  shop(run, done) {
    const offers = Run.shopOffers(run), sold = new Set();
    const draw = () => {
      const rows = offers.map(o => {
        const bought = sold.has(o.i), can = !bought && run.credits >= o.price;
        return this.row(o.name + (o.rar ? '  [' + RARITY[o.rar].name + ']' : ''), o.desc, bought ? 'SOLD' : '◆ ' + o.price, can, () => { run.credits -= o.price; Run.buy(run, o); sold.add(o.i); Aud.sfx('power'); const sc = this.el.querySelector('.scroll').scrollTop; draw(); this.el.querySelector('.scroll').scrollTop = sc; }, bought, o.kind === 'module' ? RARITY[o.rar].col : '#ffd23d');
      });
      this.set(h('div', { class: 'center wide' }, this.title_('SUPPLY DEPOT'), h('div', { class: 'scrapline' }, `Credits ◆ ${fmt(run.credits)}   Hull ${Math.ceil(run.hull)}/${Run.derive(run).maxHull}`), h('div', { class: 'scroll list' }, rows), this.btn('Leave shop', done, 'big', { 'data-focus': 1 })));
      this.back(done);
    };
    draw();
  },

  /* ---------- REPAIR NODE ---------- */
  repair(run, done) {
    const mx = Run.derive(run).maxHull;
    this.set(h('div', { class: 'center' }, this.title_('REPAIR DOCK'), h('div', { class: 'lbl' }, `Hull ${Math.ceil(run.hull)}/${mx}. Choose one.`),
      h('div', { class: 'menu' },
        this.btn('Full repair', () => { Run.heal(run, mx); done(); }, 'big', { 'data-focus': 1 }),
        this.btn('Field refit: +1 front weapon level, repair 25%', () => { Run.levelWeapon(run, 'front', 1); Run.heal(run, mx * 0.25); done(); }),
        this.btn('Salvage the dock: +90 credits, repair 25%', () => { Run.addCredits(run, 90); Run.heal(run, mx * 0.25); done(); }))));
  },

  /* ---------- MYSTERY EVENT ---------- */
  event(run, done) {
    const rng = RNG(run.seed + '|event|' + run.stageNo + '|' + run.step + '|' + run.sector);
    const ev = rng.pick(EVENTS);
    run.rng = rng; // events use run.rng for chance rolls (seeded)
    const choices = typeof ev.choices === 'function' ? ev.choices(run) : ev.choices;
    this.set(h('div', { class: 'center' }, this.title_(ev.title), h('div', { class: 'txtblock' }, ev.text),
      h('div', { class: 'menu' }, choices.map((c, i) => h('button', { class: 'btn', 'data-focus': i === 0 ? 1 : null, onclick: () => {
        const res = c.go(run);
        this.set(h('div', { class: 'center' }, this.title_(ev.title), h('div', { class: 'txtblock' }, res), this.btn('Continue', done, 'big', { 'data-focus': 1 })));
      } }, h('div', null, c.label), h('div', { class: 'bd' }, c.desc))))));
  },

  sectorIntro(run, done) {
    const sec = SECTORS[run.sector];
    Aud.sfx('win');
    this.set(h('div', { class: 'center' }, h('div', { class: 'sub' }, 'SECTOR CLEARED'), this.title_(sec.tag + ': ' + sec.name.toUpperCase()), h('div', { class: 'txtblock' }, sec.blurb), this.btn('Warp in', done, 'big', { 'data-focus': 1 })));
  },

  /* ---------- WEAPON SWAP (in-stage modal) ---------- */
  swap(run, offer, done) {
    const tbl = FRONT, cur = run[offer.slot], nw = tbl[offer.id], old = tbl[cur.id];
    const card = (lab, w, id, lvl) => h('div', { class: 'cmpc', style: '--c:' + w.col }, h('div', { class: 'cl' }, lab), h('div', { class: 'cn' }, w.name), h('div', { class: 'cd' }, 'Level ' + lvl), h('div', { class: 'cdesc' }, w.desc), h('div', { class: 'cen' }, 'Energy use: ~' + Math.round(energyDrain(lvl, id)) + '/s while firing'));
    this.set(h('div', { class: 'center' }, this.title_('RARE WEAPON'), h('div', { class: 'lbl' }, `Swap your ${offer.slot} weapon?`),
      h('div', { class: 'cmp' },
        card('CURRENT', old, cur.id, cur.lvl),
        card('NEW', nw, offer.id, offer.lvl)),
      h('div', { class: 'btnrow' }, this.btn('Equip new', () => { run[offer.slot] = { id: offer.id, lvl: offer.lvl }; if (g) { g.p.fireT = 0; Game.refreshStats(); } done(); }, 'big', { 'data-focus': 1 }), this.btn('Keep current', done, ''))));
    this.back(done);
  },

  /* ---------- PAUSE (in stage) ---------- */
  pause() {
    Flow.mode = 'pause';
    const resume = () => { Flow.mode = 'play'; this.hide(); };
    this.set(h('div', { class: 'center' }, this.title_('PAUSED'),
      this.panel('form', [this.slider('Master volume', 'master'), this.slider('Music volume', 'music'), this.slider('SFX volume', 'sfx'),
        this.btn(Save.data.settings.muted ? 'Sound: OFF (M)' : 'Sound: ON (M)', () => { Input.edge.mute = true; setTimeout(() => this.pause(), 30); }, 'sm')]),
      h('div', { class: 'menu' }, this.btn('Resume', resume, 'big', { 'data-focus': 1 }), this.btn('Abandon run', () => { Flow.mode = 'menu'; Flow.quit(); }, 'danger'))));
    this.back(resume);
  },

  /* ---------- GAME OVER / VICTORY ---------- */
  gameOver(info) {
    const { run, victory, scrap, time, dailyBest, abandoned } = info, st = run.stats;
    const row = (a, b) => h('div', { class: 'srow' }, h('span', null, a), h('b', null, b));
    this.set(h('div', { class: 'center wide' },
      h('div', { class: 'h1 ' + (victory ? 'win' : 'lose') }, victory ? 'RIFT SEALED' : abandoned ? 'RUN ABANDONED' : 'SHIP DESTROYED'),
      !victory && !abandoned ? h('div', { class: 'sub' }, 'Killed by: ' + (run.killedBy || 'Unknown')) : null,
      h('div', { class: 'panel stat' },
        row('Score', fmt(run.score)), row('Sectors reached', Math.min(SECTORS.length, run.sector + 1) + ' / ' + SECTORS.length), row('Stages cleared', st.stages), row('Bosses / Elites', st.bosses + ' / ' + st.minis),
        row('Enemies destroyed', st.kills), row('Damage dealt', fmt(st.dmg)), row('Hits taken', st.hits), row('Credits earned', fmt(st.credits)), row('Time', fmtTime(time)), row('Upgrades', run.upgrades.length),
        row('Difficulty', DIFFS[run.diff].name), row('Seed', run.seed), dailyBest !== null ? row('Daily best today', fmt(dailyBest)) : null),
      h('div', { class: 'scrapgain' }, '+' + scrap + ' SCRAP'),
      h('div', { class: 'btnrow' }, this.btn('Retry same seed', () => Flow.newRun({ seed: run.seed, diff: run.diff, ship: run.shipId, front: Save.data.settings.front, daily: run.daily }), 'big', { 'data-focus': 1 }), this.btn('Hangar', () => this.hangar('ships')), this.btn('Title', () => this.title()))));
    this.back(() => this.title());
  }
};
