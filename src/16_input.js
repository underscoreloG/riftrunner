/* ===================================================================
   SECTION 16: INPUT - keyboard (positional WASD = ZQSD on AZERTY),
   gamepad, touch (virtual stick)
   =================================================================== */
const Input = {
  keys: {}, edge: {}, gpPrev: [], touch: { id: null, ox: 0, oy: 0, x: 0, y: 0, on: false, ax: 0, ay: 0 },
  touchMode: false, focusBtn: false, menuKey: null, menuPad: null, bot: null,
  mx: 0, my: 0, focus: false, fire: false, usingPad: false,
  init() {
    addEventListener('keydown', e => {
      if (e.repeat) { if (this.menuKey) this.menuKey(e); return; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      this.keys[e.code] = true;
      const map = { KeyE: 'special', KeyP: 'pause', Escape: 'pause', KeyM: 'mute', KeyR: 'repair', KeyC: 'cell', KeyB: 'bomb', KeyF: 'autofire', KeyG: 'full' };
      if (map[e.code]) this.edge[map[e.code]] = true;
      if (this.menuKey) this.menuKey(e);
      Aud.init(); Aud.resume();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.edge.pause = this.edge.pause || false; });
    const wrap = $('#wrap');
    const rect = () => $('#c').getBoundingClientRect();
    const toLogical = (t) => { const r = rect(); return { x: (t.clientX - r.left) / r.width * W, y: (t.clientY - r.top) / r.height * H }; };
    wrap.addEventListener('touchstart', e => {
      this.touchMode = true; $('#touch').style.display = 'block'; Aud.init(); Aud.resume();
      for (const t of e.changedTouches) {
        if (e.target.closest('.tbtn') || e.target.closest('#ui > *')) continue;
        const p = toLogical(t);
        if (this.touch.id === null && p.x < W * 0.65) { Object.assign(this.touch, { id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y, on: true }); }
      }
    }, { passive: true });
    wrap.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) if (t.identifier === this.touch.id) { const p = toLogical(t); this.touch.x = p.x; this.touch.y = p.y; }
      if (this.touch.on) e.preventDefault();
    }, { passive: false });
    const end = e => { for (const t of e.changedTouches) if (t.identifier === this.touch.id) { this.touch.id = null; this.touch.on = false; this.touch.ax = this.touch.ay = 0; } };
    wrap.addEventListener('touchend', end); wrap.addEventListener('touchcancel', end);
    const hold = (el, on, off) => { el.addEventListener('touchstart', e => { e.preventDefault(); on(); }, { passive: false }); el.addEventListener('touchend', e => { e.preventDefault(); off && off(); }); };
    hold($('#tb-focus'), () => { this.focusBtn = true; $('#tb-focus').classList.add('on'); }, () => { this.focusBtn = false; $('#tb-focus').classList.remove('on'); });
    hold($('#tb-special'), () => { this.edge.special = true; });
    hold($('#tb-pause'), () => { this.edge.pause = true; });
    hold($('#tb-repair'), () => { this.edge.repair = true; });
    hold($('#tb-cell'), () => { this.edge.cell = true; });
    hold($('#tb-bomb'), () => { this.edge.bomb = true; });
    if (matchMedia && matchMedia('(pointer:coarse)').matches) { this.touchMode = true; $('#touch').style.display = 'block'; }
  },
  take(name) { const v = this.edge[name]; this.edge[name] = false; return !!v; },
  pad() { try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) return g; } catch (e) {} return null; },
  /* called once per rendered frame */
  poll() {
    const k = this.keys;
    let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let my = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    let focus = !!(k.ShiftLeft || k.ShiftRight || this.focusBtn);
    let fire = !!k.Space || (Save.data.settings.autofire !== false);
    const g = this.pad();
    if (g) {
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0, b = i => g.buttons[i] && g.buttons[i].pressed;
      let gx = Math.abs(ax) > 0.2 ? ax : 0, gy = Math.abs(ay) > 0.2 ? ay : 0;
      if (b(14)) gx = -1; if (b(15)) gx = 1; if (b(12)) gy = -1; if (b(13)) gy = 1;
      if (gx || gy) { mx = gx; my = gy; this.usingPad = true; }
      if (b(4) || b(5) || b(6) || b(7)) focus = true;
      if (b(0)) fire = true;
      const prev = this.gpPrev;
      const press = i => b(i) && !prev[i];
      if (press(1) || press(2)) this.edge.special = true;
      if (press(9) && !(typeof UI !== 'undefined' && UI.active)) this.edge.pause = true;
      if (press(3)) this.edge.repair = true;
      if (press(8)) this.edge.cell = true;
      if (this.menuPad) { for (let i = 0; i < 16; i++) if (press(i)) this.menuPad(i); this.menuAxis(gx, gy); }
      this.gpPrev = g.buttons.map(x => x.pressed);
    }
    const t = this.touch;
    if (t.on) {
      let dx = (t.x - t.ox) / 46, dy = (t.y - t.oy) / 46; const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; t.ox = t.x - dx * 46; t.oy = t.y - dy * 46; }
      mx = Math.abs(dx) > 0.12 ? dx : 0; my = Math.abs(dy) > 0.12 ? dy : 0; t.ax = dx; t.ay = dy;
    }
    if (this.bot) { const o = this.bot(); mx = o.mx; my = o.my; fire = true; focus = !!o.focus; }
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    this.mx = mx; this.my = my; this.focus = focus; this.fire = fire;
    if (this.take('mute')) { Save.data.settings.muted = !Save.data.settings.muted; Save.save(); Aud.applyVol(); if (typeof UI !== 'undefined') UI.refreshMute(); }
    if (this.take('full')) Main.toggleFull();
    if (this.take('autofire')) { Save.data.settings.autofire = !Save.data.settings.autofire; Save.save(); }
  },
  menuAxis(gx, gy) {
    const now = performance.now();
    const dir = Math.abs(gx) > Math.abs(gy) ? (gx > 0.5 ? 'r' : gx < -0.5 ? 'l' : null) : (gy > 0.5 ? 'd' : gy < -0.5 ? 'u' : null);
    if (!dir) { this._ax = null; return; }
    if (this._ax === dir && now - this._axT < 220) return;
    this._ax = dir; this._axT = now; if (this.menuPad) this.menuPad({ dir });
  }
};
