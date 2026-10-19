/* ===================================================================
   SECTION 50: MAIN LOOP - fixed timestep, resize, boot, test hooks
   (URL params: ?bot = autopilot, ?god = invulnerable, ?speed=N = N sim steps per frame)
   =================================================================== */
const Main = {
  cv: null, cx: null, last: 0, acc: 0, params: new URLSearchParams(location.search),
  init() {
    this.cv = $('#c'); this.cx = this.cv.getContext('2d');
    this.layout(true); addEventListener('resize', () => { this.layout(); if (g) this.pend = true; });
    document.addEventListener('fullscreenchange', () => { setTimeout(() => this.layout(), 80); });
    $('#fsbtn').addEventListener('click', () => this.toggleFull());
    Input.init(); UI.init();
    Aud.applyVol();
    Bg.init(0);
    if (this.params.has('bot')) Input.bot = Main.botBrain;
    this.speed = parseInt(this.params.get('speed') || '1', 10) || 1;
    this.god = this.params.has('god');
    UI.title();
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
  },
  /* fit the canvas to the whole window: the arena width follows the window aspect ratio (height fixed at 720) */
  layout(first) {
    const vw = innerWidth, vh = innerHeight;
    if (!(vw > 50 && vh > 50)) return; // window not measurable yet (hidden / zero-size): keep the previous layout
    this.lw = vw; this.lh = vh;
    if (!g) {
      const nw = clamp(Math.round(H * vw / vh / 2) * 2, 540, 1280);
      if (nw !== W) { W = nw; Gfx.resetBg(); if (!first) Bg.init(Bg.si); }
    }
    const s = Math.min(vw / W, vh / H), dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = this.cv, cw = Math.round(W * s), ch = Math.round(H * s);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    const left = Math.round((vw - cw) / 2), top = Math.round((vh - ch) / 2);
    cv.style.left = left + 'px'; cv.style.top = top + 'px';
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    this.kx = cv.width / W; this.ky = cv.height / H; this.scale = s;
    Render.setupBloom(cv);
    this.fitUI();
    // small corner buttons sit at the top-centre of the arena
    const bt = (top + 6 * s) + 'px', cx = left + cw / 2;
    const mb = $('#mutebtn'), fb = $('#fsbtn');
    mb.style.top = fb.style.top = bt; mb.style.left = (cx - 29) + 'px'; fb.style.left = (cx + 3) + 'px';
  },
  /* scale the menu box to the window (the wide map screen uses a 980px box, the rest 640px) */
  fitUI() {
    const vw = innerWidth, vh = innerHeight, ui = $('#ui'), uw = ui.classList.contains('w2') ? 980 : 640, us = Math.min(vw / uw, vh / 720, 1.9);
    ui.style.transform = `translate(-50%,-50%) scale(${us})`; $('#tip').style.fontSize = (12 * Math.max(1, us * 0.85)) + 'px';
  },
  toggleFull() {
    const d = document, el = d.documentElement;
    try {
      if (!(d.fullscreenElement || d.webkitFullscreenElement)) { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) { const p = f.call(el); if (p && p.catch) p.catch(() => {}); } }
      else { const f = d.exitFullscreen || d.webkitExitFullscreen; if (f) f.call(d); }
    } catch (e) { /* fullscreen blocked: ignore */ }
  },
  enterFull() { if (Save.data.settings.autoFull !== false && !(document.fullscreenElement || document.webkitFullscreenElement)) this.toggleFull(); },
  frame(now) {
    requestAnimationFrame(t => this.frame(t));
    let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.1) dt = 0.1; // tab was hidden: don't spiral
    Input.poll();
    if (innerWidth !== this.lw || innerHeight !== this.lh) { if (g) this.pend = true; this.layout(); }
    if (!g && this.pend) { this.pend = false; this.layout(); }
    // pause toggle
    if (Input.take('pause') && Flow.mode === 'play' && g && g.state !== 'dead' && g.state !== 'intro') UI.pause();
    else if (Input.edge.pause) Input.edge.pause = false;
    const FIXED = 1 / 60;
    if (Flow.mode === 'play' && g) {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= FIXED && steps < 5) {
        for (let k = 0; k < this.speed; k++) { if (this.god && g && g.p) { g.p.hull = g.p.maxHull; } Game.update(FIXED); if (!g || Flow.mode !== 'play') break; }
        this.acc -= FIXED; steps++;
        if (!g || Flow.mode !== 'play') break;
      }
      if (this.acc > FIXED * 3) this.acc = 0;
      if (g && g.hs > 0 && this.speed === 1) { /* hit-stop handled inside update */ }
    } else {
      this.acc = 0;
      if (!g) Bg.update(dt, 0.6);
      else if (Flow.mode === 'pause') { /* frozen */ }
    }
    this.cx.setTransform(this.kx || 1, 0, 0, this.ky || 1, 0, 0);
    this.cx.clearRect(0, 0, W, H);
    Render.draw(this.cx);
  },
  /* simple autopilot used for automated testing */
  botBrain() {
    if (!g || !g.p) return { mx: 0, my: 0, focus: false };
    const p = g.p; let fx = 0, fy = 0;
    // repel from nearby bullets
    for (const b of g.eb) {
      const dx = p.x - b.x, dy = p.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 < 90 * 90 && b.vy > -50) { const d = Math.sqrt(d2) + 1; fx += dx / d * (90 - d) / 30; fy += dy / d * (90 - d) / 30 * 0.6; }
    }
    // go for pickups, else sit under the nearest enemy
    let tx = W / 2, ty = H - 150, best = 1e9;
    for (const k of g.pk) { const d = dist2(k.x, k.y, p.x, p.y); if (d < best && k.y > 100) { best = d; tx = k.x; ty = Math.min(H - 60, k.y); } }
    if (best > 300 * 300 || !g.pk.length) { best = 1e9; for (const e of g.en) { if (e.dead || e.y < 0) continue; const d = Math.abs(e.x - p.x) + e.y * 0.2; if (d < best) { best = d; tx = e.x; ty = Math.max(H - 260, Math.min(H - 110, e.y + 220)); } } }
    // keep off walls
    if (p.x < 40) fx += 1; if (p.x > W - 40) fx -= 1;
    let mx = clamp((tx - p.x) / 40, -1, 1) * 0.85 + fx, my = clamp((ty - p.y) / 40, -1, 1) * 0.4 + fy;
    if (g.state === 'clear') { mx = clamp((W / 2 - p.x) / 40, -1, 1); my = clamp((H - 150 - p.y) / 40, -1, 1); }
    return { mx, my, focus: false };
  }
};
// test hook: expose internals only to the console / automation
window.__rr = { get g() { return g; }, Flow, Run, Game, Save, UI, Main, Input, Enemies, SECTORS, DIFFS };
window.addEventListener('error', e => { (window.__errors = window.__errors || []).push(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
window.addEventListener('DOMContentLoaded', () => Main.init());
