/* ===================================================================
   SECTION 22: RENDER - world, entities, lasers, particles, bloom, HUD
   Logical space is W x H (W adapts to the window); Main sets the
   canvas transform so everything stays crisp at any resolution.
   =================================================================== */
const THRUST = { diver: 1, weaver: 1, fighter: 1, kamikaze: 1, drone: 1, sniper: 1, carrier: 1, gunship: 1, frigate: 1, cargo: 1 };
const UIF = '"Segoe UI", Rubik, system-ui, Arial, sans-serif';

const Render = {
  bl: null,
  bloomOK: typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype,
  setupBloom(cv) {
    const w = Math.max(64, Math.round(cv.width / 4)), h = Math.max(64, Math.round(cv.height / 4));
    if (!this.bl) { const c = document.createElement('canvas'); this.bl = { c, x: c.getContext('2d') }; }
    this.bl.c.width = w; this.bl.c.height = h;
  },

  draw(x) {
    if (!g) { Bg.draw(x); this.vignette(x); return; }
    x.save();
    if (g.shake > 0) x.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
    Bg.draw(x);
    this.drawWarns(x);
    this.drawEnemies(x);
    this.drawPickups(x);
    this.drawSidekicks(x);
    this.drawPlayerBullets(x);
    if (!g.p.dead) this.drawPlayer(x);
    this.drawEnemyBullets(x);
    this.drawLasers(x);
    this.drawParticles(x);
    this.drawFx(x);
    this.drawTexts(x);
    x.restore();
    this.vignette(x);
    this.bloom(x);
    this.drawHud(x);
  },
  vignette(x) { x.drawImage(Gfx.vignette(), 0, 0, W, H); },
  bloom(x) {
    if (!this.bloomOK || !this.bl || Save.data.settings.bloom === false) return;
    const b = this.bl, cv = Main.cv;
    b.x.setTransform(1, 0, 0, 1, 0, 0); b.x.globalCompositeOperation = 'copy';
    b.x.filter = 'blur(2px) brightness(0.85) contrast(1.8)';
    b.x.drawImage(cv, 0, 0, b.c.width, b.c.height);
    b.x.filter = 'none';
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.7;
    x.drawImage(b.c, 0, 0, cv.width, cv.height);
    x.restore();
  },

  /* ---------- enemies / bosses ---------- */
  drawEnemies(x) {
    for (const e of g.en) {
      if (e.dead) continue;
      if (e.boss) { this.drawBoss(x, e); continue; }
      const d = e.d, sp = Gfx.enemy(d.spr, g.si, e.r);
      x.save(); x.translate(e.x, e.y);
      if (e.type === 'kamikaze' && e.st === 1) x.rotate(e.ang - Math.PI / 2);
      if (e.type === 'mine') x.rotate(e.rot || 0);
      if (e.type === 'spiraler') x.rotate((e.sa || 0) * 0.5);
      if (d.pre) d.pre(x, e);
      if (THRUST[e.type]) { // engine glow at the rear (enemies face down)
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55 + Math.random() * 0.3;
        const rr = e.r * 0.5 + 4; dimg(x, Gfx.glow(g.sec.pal.glow, rr + 4), 0, -e.r * 0.85);
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      }
      dimg(x, sp.c, 0, 0);
      if (e.type === 'turret') { x.rotate((e.aim || Math.PI / 2) - Math.PI / 2); const gr = x.createLinearGradient(-3, 0, 3, 0); gr.addColorStop(0, '#5a4a66'); gr.addColorStop(1, '#1c1424'); x.fillStyle = gr; x.fillRect(-3.2, 0, 6.4, e.r * 1.3); x.fillStyle = g.sec.pal.accent; x.fillRect(-2, e.r * 1.05, 4, 4); }
      if (e.flash > 0) { x.globalAlpha = 0.85; dimg(x, sp.w, 0, 0); }
      x.restore();
      if (d.post) d.post(x, e);
      if (e.type === 'kamikaze' && e.st === 0 && e.t > 0.3 && Math.floor(e.t * 14) % 2) { x.strokeStyle = '#ff4d4d'; x.lineWidth = 2; x.beginPath(); x.arc(e.x, e.y, e.r + 6, 0, TAU); x.stroke(); }
      if (e.type === 'sniper' && e.st === 2 && e.aimA !== undefined) { const a = Math.max(0.15, 1 - e.ct / 1.15); x.strokeStyle = `rgba(255,70,70,${0.25 + a * 0.55})`; x.lineWidth = 1 + a * 1.5; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(e.x, e.y); x.lineTo(e.x + Math.cos(e.aimA) * 2400, e.y + Math.sin(e.aimA) * 2400); x.stroke(); x.setLineDash([]); }
      if (e.type === 'spiraler' && (e.cyc || 0) % 4.8 > 4.5) { x.strokeStyle = '#ff4'; x.globalAlpha = 0.6; x.beginPath(); x.arc(e.x, e.y, e.r + 8, 0, TAU); x.stroke(); x.globalAlpha = 1; }
      if (d.big && e.hp < e.maxHp) this.bar(x, e.x - e.r, e.y - e.r - 9, e.r * 2, 4, e.hp / e.maxHp, '#ff5a5a');
    }
  },
  drawBoss(x, e) {
    const bd = e.d, sp = Gfx.enemy(bd.spr, g.si, e.r), t = e.t;
    x.save(); x.translate(e.x, e.y);
    const tele = e.st === 'tele', core = 0.5 + 0.5 * Math.sin(t * (e.ph > 0 ? 8 : 4));
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = tele ? 0.55 + 0.35 * Math.sin(t * 22) : 0.2 + core * 0.15; dimg(x, Gfx.glow(tele ? '#ff3030' : g.sec.pal.glow, e.r * 1.9), 0, 0);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    dimg(x, sp.c, 0, 0);
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = (tele ? 0.6 + 0.4 * Math.sin(t * 22) : 0.3 + core * 0.35 + e.ph * 0.12); dimg(x, Gfx.glow(tele ? '#ff3030' : g.sec.pal.accent, e.r * 0.8), 0, e.r * 0.1);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    const k = e.r * 0.62;
    for (const s of [-1, 1]) {
      x.save(); x.translate(s * k, e.r * 0.15); orb(x, 0, 0, e.r * 0.2, '#3a303f');
      x.rotate(Math.atan2(g.p.y - e.y, g.p.x - e.x - s * k) - Math.PI / 2);
      const gr = x.createLinearGradient(-3, 0, 3, 0); gr.addColorStop(0, '#6a5a76'); gr.addColorStop(1, '#241a2c'); x.fillStyle = gr; x.fillRect(-3.4, 0, 6.8, e.r * 0.5); x.fillStyle = g.sec.pal.accent; x.fillRect(-2, e.r * 0.44, 4, 4); x.restore();
    }
    if (e.flash > 0) { x.globalAlpha = 0.7; dimg(x, sp.w, 0, 0); x.globalAlpha = 1; }
    if (e.inv) { x.strokeStyle = 'rgba(160,220,255,' + (0.4 + 0.3 * Math.sin(t * 20)) + ')'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, e.r + 6, 0, TAU); x.stroke(); }
    if (tele) { x.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.5 * Math.sin(t * 24)) + ')'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, e.r + 10, 0, TAU); x.stroke(); }
    x.restore();
  },
  drawWarns(x) {
    const b = g.boss; if (!b || b.st !== 'tele') return;
    const A = BOSS_ATK[b.atk]; if (!A || !A.warn) return;
    const k = clamp(b.stT / A.tele, 0, 1), pulse = 0.35 + 0.35 * Math.sin(b.stT * 26);
    const ctx = {
      beam(bx, by, ang, w) {
        x.save(); x.translate(bx, by); x.rotate(ang);
        x.fillStyle = `rgba(255,50,50,${0.10 + 0.18 * k})`; x.fillRect(0, -w / 2 - 2, 2400, w + 4);
        x.fillStyle = `rgba(255,120,120,${pulse})`; x.fillRect(0, -1, 2400, 2);
        x.restore();
      },
      ring(rx, ry, rr, kk) {
        x.fillStyle = `rgba(255,50,50,${0.08 + 0.16 * kk})`; x.strokeStyle = `rgba(255,120,120,${pulse + 0.2})`; x.lineWidth = 2;
        x.beginPath(); x.arc(rx, ry, rr * (1.15 - 0.15 * kk), 0, TAU); x.fill(); x.stroke();
        x.beginPath(); x.arc(rx, ry, 4, 0, TAU); x.stroke();
      }
    };
    A.warn(b, ctx, k);
  },

  /* ---------- lasers ---------- */
  drawLasers(x) {
    for (const l of g.lz) {
      x.save(); x.translate(l.x, l.y); x.rotate(l.ang);
      if (l.t < l.tele) {
        const k = l.t / l.tele;
        x.fillStyle = `rgba(255,60,60,${0.12 + 0.15 * k})`; x.fillRect(0, -l.w / 2, 2400, l.w);
        x.fillStyle = `rgba(255,140,140,${0.4 + 0.4 * Math.sin(l.t * 30)})`; x.fillRect(0, -1, 2400, 2);
      } else {
        const f = 0.88 + Math.random() * 0.12, w = l.w * f * (l.t - l.tele > l.dur - 0.15 ? Math.max(0.2, (l.tele + l.dur - l.t) / 0.15) : 1);
        x.globalCompositeOperation = 'lighter';
        const gr = x.createLinearGradient(0, -w, 0, w); gr.addColorStop(0, 'rgba(255,30,70,0)'); gr.addColorStop(0.3, 'rgba(255,60,90,.65)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,60,90,.65)'); gr.addColorStop(1, 'rgba(255,30,70,0)');
        x.fillStyle = gr; x.fillRect(0, -w, 2400, w * 2);
        dimg(x, Gfx.glow('#ff4060', w * 1.6 + 8), 0, 0);
        x.globalCompositeOperation = 'source-over';
      }
      x.restore();
    }
  },

  /* ---------- bullets ---------- */
  drawEnemyBullets(x) {
    for (const b of g.eb) {
      if (b.kind === 'orb') { dimg(x, Gfx.bullet('orb', b.col, Math.round(b.r)), b.x, b.y); }
      else {
        x.save(); x.translate(b.x, b.y); x.rotate(Math.atan2(b.vy, b.vx));
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.6; dimg(x, Gfx.glow(b.col, 14), 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
        if (b.kind === 'needle') {
          x.fillStyle = 'rgba(10,4,18,.88)'; x.fillRect(-15, -b.r - 1.6, 30, b.r * 2 + 3.2);
          x.fillStyle = b.col; x.fillRect(-13, -b.r + 0.5, 26, b.r * 2 - 1); x.fillStyle = '#fff'; x.fillRect(-13, -1, 26, 2);
        } else { // missile
          x.fillStyle = 'rgba(10,4,18,.88)'; x.beginPath(); x.moveTo(9, 0); x.lineTo(-7, -6); x.lineTo(-7, 6); x.closePath(); x.fill();
          x.fillStyle = b.col; x.beginPath(); x.moveTo(7, 0); x.lineTo(-6, -4); x.lineTo(-6, 4); x.closePath(); x.fill();
          x.fillStyle = '#fff'; x.fillRect(-2, -1, 6, 2);
          x.globalCompositeOperation = 'lighter'; x.fillStyle = '#ffa040'; x.beginPath(); x.moveTo(-7, -2.5); x.lineTo(-15 - Math.random() * 5, 0); x.lineTo(-7, 2.5); x.fill(); x.globalCompositeOperation = 'source-over';
        }
        x.restore();
      }
    }
  },
  drawPlayerBullets(x) {
    for (const b of g.pb) {
      x.save(); x.translate(b.x, b.y);
      const k = b.kind;
      // soft halo
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = k === 'mine' ? 0.25 : 0.5; dimg(x, Gfx.glow(b.col, k === 'lance' ? 11 : k === 'flak' ? 14 : 9), 0, 0);
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.95;
      if (k === 'bolt' || k === 'lance') {
        x.rotate(Math.atan2(b.vx, -b.vy));
        const len = k === 'lance' ? 18 : 6.5, w = k === 'lance' ? 1.4 : 1.7;
        x.fillStyle = b.col; x.globalAlpha = 0.45; x.fillRect(-w - 1.3, -len, (w + 1.3) * 2, len * 2 + 2);
        x.globalAlpha = 1; x.fillRect(-w, -len + 1, w * 2, len * 2 - 1); x.fillStyle = '#fff'; x.fillRect(-0.6, -len + 2, 1.2, len * 2 - 3);
      } else if (k === 'shard') {
        x.rotate(b.age * 9); x.fillStyle = b.col; x.beginPath(); x.moveTo(0, -6.5); x.lineTo(4.2, 0); x.lineTo(0, 6.5); x.lineTo(-4.2, 0); x.fill(); x.fillStyle = '#fff'; x.fillRect(-1, -2.4, 2, 4.8);
      } else if (k === 'wave') { orb(x, 0, 0, b.r + 0.8, b.col); x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, b.r * 0.4, 0, TAU); x.fill(); }
      else if (k === 'missile') {
        x.rotate(Math.atan2(b.vy, b.vx)); const gr = x.createLinearGradient(0, -2.4, 0, 2.4); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#8a8478'); x.fillStyle = gr; x.fillRect(-5.5, -2.3, 11, 4.6); x.fillStyle = b.col; x.beginPath(); x.moveTo(5.5, -2.3); x.lineTo(8.5, 0); x.lineTo(5.5, 2.3); x.fill();
        x.globalCompositeOperation = 'lighter'; x.fillStyle = '#ff8a3a'; x.beginPath(); x.moveTo(-5.5, -2); x.lineTo(-14 - Math.random() * 5, 0); x.lineTo(-5.5, 2); x.fill(); x.globalCompositeOperation = 'source-over';
      } else if (k === 'flak') { orb(x, 0, 0, b.r + 1, '#aa6a3a'); x.fillStyle = b.col; x.beginPath(); x.arc(0, 0, b.r - 2, 0, TAU); x.fill(); }
      else if (k === 'mine') {
        x.rotate(b.age * 2); orb(x, 0, 0, 7, '#552222');
        x.fillStyle = '#ff6a6a'; for (let i = 0; i < 6; i++) { x.rotate(TAU / 6); x.fillRect(5, -1.5, 5.5, 3); }
        x.fillStyle = Math.floor(b.age * 4) % 2 ? '#fff' : '#f33'; x.beginPath(); x.arc(0, 0, 2.4, 0, TAU); x.fill();
      }
      x.restore();
    }
    x.globalAlpha = 1;
  },

  /* ---------- player / sidekicks ---------- */
  drawPlayer(x) {
    const p = g.p, sh = Gfx.ship(g.run.shipId), col = g.run.ship.col;
    const blink = p.inv > 0 && p.barrier <= 0 && Math.floor(p.inv * 18) % 2 === 0 && g.state !== 'intro';
    const hs = Math.max(0.5, 1 - g.run.mods.hitbox); // the ship shrinks together with its hitbox (Phase Core)
    x.save(); x.translate(p.x, p.y); x.scale(hs, hs);
    x.globalCompositeOperation = 'lighter';
    x.globalAlpha = 0.16; dimg(x, Gfx.glow(col, 62), 0, 0); // ship light
    const fl = 15 + Math.random() * 6 + (Input.my < 0 ? 7 : 0);
    x.globalAlpha = 0.75; dimg(x, Gfx.glow(col, 16 + fl * 0.5), 0, 22 + fl * 0.35);
    const fg = x.createLinearGradient(0, 18, 0, 20 + fl); fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.3, col); fg.addColorStop(1, hex6(col) + '00');
    x.globalAlpha = 1; x.fillStyle = fg; x.beginPath(); x.moveTo(-5.5, 17); x.lineTo(0, 20 + fl); x.lineTo(5.5, 17); x.closePath(); x.fill();
    x.fillStyle = fg; x.beginPath(); x.moveTo(-13, 15); x.lineTo(-12, 15 + fl * 0.55); x.lineTo(-11, 15); x.moveTo(13, 15); x.lineTo(12, 15 + fl * 0.55); x.lineTo(11, 15); x.fill();
    x.globalCompositeOperation = 'source-over';
    x.scale(1 - Math.abs(p.bank) * 0.14, 1);
    if (!blink) dimg(x, sh.c, 0, 0);
    x.restore();
    if (p.barrier > 0) { x.strokeStyle = `rgba(109,240,255,${0.5 + 0.4 * Math.sin(g.t * 30)})`; const bg = x.createRadialGradient(p.x, p.y, 10, p.x, p.y, 42); bg.addColorStop(0, 'rgba(109,240,255,.04)'); bg.addColorStop(1, 'rgba(109,240,255,.3)'); x.fillStyle = bg; x.lineWidth = 2.5; x.beginPath(); x.arc(p.x, p.y, 42, 0, TAU); x.fill(); x.stroke(); }
    if (p.shield > 0 && p.inv > 0.4) { x.strokeStyle = 'rgba(120,200,255,.65)'; x.lineWidth = 2; x.beginPath(); x.arc(p.x, p.y, 27 * hs, 0, TAU); x.stroke(); }
    if (p.focus) {
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, 11, 0, TAU); x.stroke();
      x.fillStyle = '#ff2a5a'; x.beginPath(); x.arc(p.x, p.y, 4.4, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(p.x, p.y, 2.6, 0, TAU); x.fill();
    }
  },
  drawSidekicks(x) {
    for (const k of g.sk) {
      const col = SIDEKICKS[k.id].col;
      x.save(); x.translate(k.x, k.y);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.35; dimg(x, Gfx.glow(col, 15), 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      if (k.id === 'drone') { poly(x, [[0, -8], [7, 6], [0, 3], [-7, 6]], '#2a5a8f', col, 1.5); x.fillStyle = '#fff'; x.fillRect(-1, -4, 2, 4); }
      else if (k.id === 'turret') { orb(x, 0, 0, 6.2, '#665a3a'); x.strokeStyle = col; x.lineWidth = 1.4; x.beginPath(); x.arc(0, 0, 6.2, 0, TAU); x.stroke(); x.rotate(k.ang || 0); x.fillStyle = col; x.fillRect(-1.6, -11, 3.2, 10); }
      else if (k.id === 'pod') { poly(x, [[-6, -7], [6, -7], [6, 7], [-6, 7]], '#6a4a28', col, 1.5); x.fillStyle = col; x.fillRect(-4, -9, 3, 4); x.fillRect(1, -9, 3, 4); }
      else { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5 + 0.1 * k.ch; dimg(x, Gfx.glow(col, 18), 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.stroke(); x.fillStyle = col; for (let i = 0; i < k.ch; i++) { const a = i / 3 * TAU + g.t * 4; x.beginPath(); x.arc(Math.cos(a) * 8, Math.sin(a) * 8, 2.3, 0, TAU); x.fill(); } }
      x.restore();
    }
  },
  drawPickups(x) {
    for (const k of g.pk) {
      x.save(); x.translate(k.x, k.y);
      const bob = Math.sin(k.t * 6 + k.ph) * 2;
      if (k.type === 'cred') {
        const s = Math.abs(Math.cos(k.t * 5 + k.ph));
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.45; dimg(x, Gfx.glow('#ffd23d', 11), 0, bob); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
        x.fillStyle = '#8a6200'; x.beginPath(); x.ellipse(0, bob, 5.2 * s + 1, 5.8, 0, 0, TAU); x.fill();
        const gr = x.createLinearGradient(-4, -5, 4, 5); gr.addColorStop(0, '#fff3a8'); gr.addColorStop(0.5, '#ffd23d'); gr.addColorStop(1, '#c78a00'); x.fillStyle = gr; x.beginPath(); x.ellipse(0, bob, 4.2 * s + 0.8, 4.7, 0, 0, TAU); x.fill();
      } else {
        const cols = { pow: '#ffe066', rep: '#5eff7a', nrg: '#6df0ff', wpn: '#ff7ad9', cons: '#ffffff' }, lab = { pow: 'P', rep: '+', nrg: 'E', wpn: 'W', cons: 'C' };
        const c = cols[k.type];
        x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.65; dimg(x, Gfx.glow(c, 20), 0, bob); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
        this.rr(x, -9, -9 + bob, 18, 18, 4); const gr = x.createLinearGradient(0, -9, 0, 9); gr.addColorStop(0, '#1e2a40'); gr.addColorStop(1, '#0a0f1a'); x.fillStyle = gr; x.fill(); x.strokeStyle = c; x.lineWidth = 2; x.stroke();
        x.fillStyle = c; x.font = `bold 12px ${UIF}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(lab[k.type], 0, bob + 1);
      }
      x.restore();
    }
  },

  /* ---------- particles / fx / text ---------- */
  drawParticles(x) {
    const P = g.pt;
    for (const q of P) { // opaque-ish layer first: smoke + debris
      const a = clamp(q.life / q.max, 0, 1);
      if (q.k === 'smoke') { x.globalAlpha = a * 0.38; x.fillStyle = '#1b1519'; x.beginPath(); x.arc(q.x, q.y, q.size * (1 + (1 - a) * 1.6), 0, TAU); x.fill(); }
      else if (q.k === 'debris') {
        x.save(); x.translate(q.x, q.y); x.rotate(q.rot); x.globalAlpha = Math.min(1, a * 2.2); x.fillStyle = q.col; x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 0.8;
        x.beginPath(); x.moveTo(q.size, 0); x.lineTo(-q.size * 0.6, q.size * 0.8); x.lineTo(-q.size * 0.4, -q.size * 0.7); x.closePath(); x.fill(); x.stroke(); x.restore();
      }
    }
    x.globalCompositeOperation = 'lighter';
    for (const q of P) {
      if (q.k === 'smoke' || q.k === 'debris') continue;
      const a = clamp(q.life / q.max, 0, 1); x.globalAlpha = a;
      if (q.k === 'spark') { x.strokeStyle = q.col; x.lineWidth = q.size; x.lineCap = 'round'; x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); x.stroke(); }
      else dimg(x, Gfx.glow(q.col, q.size * 1.7 + 2), q.x, q.y);
    }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  },
  drawFx(x) {
    for (const f of g.fx) {
      const u = f.t / f.dur;
      if (f.k === 'ring') {
        const r = lerp(f.r, f.rmax, 1 - (1 - u) * (1 - u)); x.globalCompositeOperation = 'lighter';
        x.globalAlpha = 1 - u; x.strokeStyle = f.col; x.lineWidth = (f.w || 2.5) * (1 - u * 0.6); x.beginPath(); x.arc(f.x, f.y, r, 0, TAU); x.stroke();
        x.globalAlpha = (1 - u) * 0.25; x.lineWidth = (f.w || 2.5) * 4 * (1 - u); x.beginPath(); x.arc(f.x, f.y, r, 0, TAU); x.stroke();
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      } else if (f.k === 'glow') { x.globalCompositeOperation = 'lighter'; x.globalAlpha = (1 - u) * 0.95; dimg(x, Gfx.glow('#ffb060', Math.max(8, f.r)), f.x, f.y); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
      else if (f.k === 'muz') { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 1 - u; dimg(x, Gfx.glow(f.col, 16), g.p.x, g.p.y - 24); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
      else if (f.k === 'flash') { x.fillStyle = `rgba(255,255,255,${(1 - u) * 0.55})`; x.fillRect(0, 0, W, H); }
    }
  },
  drawTexts(x) {
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const q of g.tx) { const a = 1 - Math.pow(q.t / q.dur, 2); x.globalAlpha = clamp(a, 0, 1); x.font = `bold ${q.size}px ${UIF}`; x.lineWidth = 3.2; x.strokeStyle = 'rgba(0,0,0,.85)'; x.lineJoin = 'round'; x.strokeText(q.s, q.x, q.y); x.fillStyle = q.col; x.fillText(q.s, q.x, q.y); }
    x.globalAlpha = 1;
  },

  /* ---------- HUD ---------- */
  rr(x, px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); },
  bar(x, bx, by, bw, bh, f, col, back) { x.fillStyle = back || 'rgba(0,0,0,.6)'; x.fillRect(bx, by, bw, bh); x.fillStyle = col; x.fillRect(bx, by, Math.max(0, bw * clamp(f, 0, 1)), bh); },
  text(x, s, tx, ty, size, col, align, bold) { x.font = `${bold === false ? '' : 'bold '}${size}px ${UIF}`; x.textAlign = align || 'left'; x.textBaseline = 'middle'; x.lineWidth = 3; x.lineJoin = 'round'; x.strokeStyle = 'rgba(0,0,0,.78)'; x.strokeText(s, tx, ty); x.fillStyle = col || '#fff'; x.fillText(s, tx, ty); },
  panel(x, px, py, w, h, col) {
    this.rr(x, px, py, w, h, 9); const gr = x.createLinearGradient(0, py, 0, py + h); gr.addColorStop(0, 'rgba(18,30,56,.78)'); gr.addColorStop(1, 'rgba(6,10,22,.84)'); x.fillStyle = gr; x.fill();
    x.strokeStyle = col || 'rgba(120,170,255,.35)'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = col || 'rgba(120,200,255,.8)'; x.fillRect(px + 12, py - 0.5, 34, 2);
  },
  icon(x, kind, cx, cy, col) {
    x.save(); x.translate(cx, cy); x.fillStyle = col; x.strokeStyle = col; x.lineWidth = 1.6;
    if (kind === 'hull') { x.fillRect(-1.6, -5, 3.2, 10); x.fillRect(-5, -1.6, 10, 3.2); }
    else if (kind === 'shield') { x.beginPath(); x.moveTo(0, -6); x.lineTo(5.5, -3.5); x.lineTo(4.5, 2.5); x.lineTo(0, 6); x.lineTo(-4.5, 2.5); x.lineTo(-5.5, -3.5); x.closePath(); x.stroke(); }
    else { x.beginPath(); x.moveTo(1.5, -6); x.lineTo(-4, 1); x.lineTo(-0.5, 1); x.lineTo(-1.5, 6); x.lineTo(4, -1.5); x.lineTo(0.5, -1.5); x.closePath(); x.fill(); }
    x.restore();
  },
  hudBar(x, px, py, w, h, f, c1, c2, label, val, kind, warn) {
    this.icon(x, kind, px - 14, py + h / 2, c1);
    this.rr(x, px, py, w, h, h / 2); x.fillStyle = 'rgba(0,0,0,.55)'; x.fill();
    const fw = Math.max(h, w * clamp(f, 0, 1));
    if (f > 0.005) {
      this.rr(x, px, py, fw, h, h / 2); const gr = x.createLinearGradient(0, py, 0, py + h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); x.fillStyle = gr; x.fill();
      x.fillStyle = 'rgba(255,255,255,.25)'; this.rr(x, px + 2, py + 1.2, Math.max(0, fw - 4), h * 0.35, h * 0.2); x.fill();
    }
    x.strokeStyle = warn && Math.floor(g.t * 6) % 2 ? '#ff5050' : 'rgba(255,255,255,.28)'; x.lineWidth = 1; this.rr(x, px, py, w, h, h / 2); x.stroke();
    this.text(x, val, px + w - 6, py + h / 2 + 0.5, 9, '#fff', 'right');
    this.text(x, label, px + 8, py + h / 2 + 0.5, 8.5, 'rgba(255,255,255,.8)', 'left');
  },
  drawHud(x) {
    const p = g.p, run = g.run;
    if (g.hurtFlash > 0) { const gr = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.5); gr.addColorStop(0, 'rgba(255,0,40,0)'); gr.addColorStop(1, `rgba(255,0,40,${g.hurtFlash * 0.5})`); x.fillStyle = gr; x.fillRect(0, 0, W, H); }
    // status panel (top-left)
    this.panel(x, 10, 10, 238, 70, 'rgba(109,240,255,.45)');
    this.hudBar(x, 38, 17, 198, 14, p.hull / p.maxHull, '#ff6a5a', '#c22c3a', 'HULL', Math.ceil(p.hull) + '/' + Math.round(p.maxHull), 'hull', p.hull / p.maxHull < 0.3);
    this.hudBar(x, 38, 35, 198, 14, p.shield / Math.max(1, p.maxShield), '#6fc4ff', '#2a76d8', 'SHIELD', String(Math.ceil(p.shield)), 'shield', false);
    if (p.recharging) { x.globalAlpha = 0.6 + 0.4 * Math.sin(g.t * 12); this.icon(x, 'energy', 38 + 198 - 40, 35 + 7, '#ffe45a'); x.globalAlpha = 1; }
    this.hudBar(x, 38, 53, 198, 14, p.energy / p.maxEnergy, '#ffe45a', '#e0a010', 'ENERGY', String(Math.ceil(p.energy)), 'energy', p.energy < p.maxEnergy * 0.12);
    if (p.energy < p.maxEnergy * 0.2 || p.starved) {
      const a = 0.65 + 0.35 * Math.sin(g.t * 9);
      x.globalAlpha = a; this.text(x, p.starved ? 'ENERGY LOW - fire rate limited by generator' : p.energy < 5 && p.shield < p.maxShield ? 'ENERGY EMPTY - shield recharge stalled' : 'ENERGY LOW - shield recharge and weapons share it', 12, 92, 10.5, '#ffb347', 'left'); x.globalAlpha = 1;
    }
    // score panel (top-right)
    this.panel(x, W - 218, 10, 208, 58, 'rgba(255,210,61,.45)');
    this.text(x, '◆ ' + fmt(run.credits), W - 24, 27, 17, '#ffd23d', 'right');
    this.text(x, fmt(run.score).padStart(8, '0'), W - 24, 50, 15, '#fff', 'right');
    if (g.cmb > 1.05) {
      const cs = 18 + Math.min(10, g.cmb * 1.2), col = g.cmb > 5 ? '#ff7a3d' : g.cmb > 3 ? '#ffb347' : '#ffe066';
      this.text(x, 'x' + g.cmb.toFixed(1), W - 14, 92, cs, col, 'right');
      this.bar(x, W - 104, 108, 94, 4, g.cmbT > 0 ? Math.min(1, g.cmbT / 2.6) : 0.1, col);
    }
    // boss bar
    const b = g.boss;
    if (b && !b.dead) {
      const bw2 = Math.min(560, Math.max(280, W - 560)), bx2 = (W - bw2) / 2, by2 = W < 900 ? 92 : 48;
      this.text(x, b.d.name + '  -  ' + b.d.title, W / 2, by2 - 8, 12, '#ffd0a0', 'center');
      this.rr(x, bx2 - 3, by2 - 1, bw2 + 6, 17, 8); x.fillStyle = 'rgba(0,0,0,.7)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1.2; x.stroke();
      const f = clamp(b.hp / b.maxHp, 0, 1), gr = x.createLinearGradient(0, by2, 0, by2 + 15); if (b.inv) { gr.addColorStop(0, '#9ac'); gr.addColorStop(1, '#567'); } else { gr.addColorStop(0, '#ff7a5a'); gr.addColorStop(1, '#b01c28'); }
      if (f > 0) { this.rr(x, bx2, by2 + 1, Math.max(8, bw2 * f), 13, 6); x.fillStyle = gr; x.fill(); x.fillStyle = 'rgba(255,255,255,.28)'; this.rr(x, bx2 + 2, by2 + 2, Math.max(4, bw2 * f - 4), 4, 2); x.fill(); }
      for (let i = 1; i < b.d.phases.length; i++) { const px = bx2 + bw2 * b.d.phases[i].at; x.fillStyle = '#fff'; x.fillRect(px - 1, by2 - 1, 2, 17); }
    }
    // weapon panel (bottom-left)
    const fw = FRONT[run.front.id];
    this.panel(x, 10, H - 80, 262, 70, 'rgba(255,255,255,.28)');
    const wrow = (label, name, col, lvl, yy) => {
      x.fillStyle = col; this.rr(x, 22, yy - 6, 12, 12, 3); x.fill();
      this.text(x, name, 42, yy, 11.5, col, 'left');
      for (let i = 0; i < WEAPON_MAX; i++) { x.fillStyle = i < lvl ? (i >= 10 ? '#fff1b8' : col) : 'rgba(255,255,255,.14)'; x.fillRect(150 + i * 5.5, yy - 5, 4.2, 10); } // gold pips = levels 11-20
      this.text(x, 'L' + lvl, 266, yy, 9.5, '#fff', 'right');
    };
    wrow('F', fw.name, fw.col, run.front.lvl, H - 62);
    const need = Run.xpNeed(run); this.bar(x, 22, H - 50, 242, 3, run.xp / need, '#ffe066');
    let sx = 24; for (const k of g.sk) { orb(x, sx + 5, H - 36, 5, SIDEKICKS[k.id].col); this.text(x, 'L' + k.lvl, sx + 13, H - 36, 9, '#ddd', 'left'); sx += 38; }
    this.text(x, 'R repair ' + run.cons.repair + '  |  C cell ' + run.cons.cell + '  |  B bomb ' + run.cons.bomb, 262, H - 21, 9, '#9fb0c8', 'right', false);
    this.text(x, 'E special', 24, H - 21, 8.5, '#7f90a8', 'left', false);
    // special ring (bottom-right)
    const sp = run.ship.special, ready = p.spCd <= 0 && p.energy >= sp.cost, cx = W - 52, cy = H - 56;
    x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = 8; x.beginPath(); x.arc(cx, cy, 24, 0, TAU); x.stroke();
    x.strokeStyle = ready ? '#6df0ff' : '#667'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + TAU * (p.spCd > 0 ? 1 - p.spCd / sp.cd : 1)); x.stroke(); x.lineCap = 'butt';
    if (ready) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.5 + 0.3 * Math.sin(g.t * 6); dimg(x, Gfx.glow('#6df0ff', 30), cx, cy); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
    this.text(x, 'E', cx, cy, 16, ready ? '#fff' : '#889', 'center');
    this.text(x, sp.name + ' (' + sp.cost + ')', cx, cy + 38, 9.5, '#aab', 'center', false);
    this.text(x, Save.data.settings.autofire ? 'AUTO-FIRE [F]' : 'FIRE: SPACE', W - 14, H - 8, 9, '#8899aa', 'right', false);
    // banner
    if (g.bannerT > 0 && g.banner) {
      const a = clamp(Math.min(g.bannerT * 2, 1), 0, 1), big = g.banner === 'WARNING', by = H * 0.3;
      x.globalAlpha = a;
      const bg = x.createLinearGradient(0, 0, W, 0); const c = big ? '160,0,0' : '10,20,40'; bg.addColorStop(0, `rgba(${c},0)`); bg.addColorStop(0.2, `rgba(${c},.6)`); bg.addColorStop(0.8, `rgba(${c},.6)`); bg.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = bg; x.fillRect(0, by - 34, W, 68);
      x.fillStyle = big ? 'rgba(255,90,90,.8)' : 'rgba(109,240,255,.6)'; x.fillRect(W * 0.2, by - 34, W * 0.6, 1.5); x.fillRect(W * 0.2, by + 33, W * 0.6, 1.5);
      x.save(); x.shadowColor = big ? '#ff3030' : '#6df0ff'; x.shadowBlur = 18; this.text(x, g.banner, W / 2, by, big ? 40 : 28, big ? '#ff5a5a' : '#fff', 'center'); x.restore();
      x.globalAlpha = 1;
    }
    // touch stick
    const t = Input.touch;
    if (t.on) { x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; x.beginPath(); x.arc(t.ox, t.oy, 46, 0, TAU); x.stroke(); x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.arc(t.x, t.y, 18, 0, TAU); x.fill(); }
  }
};
