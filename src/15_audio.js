/* ===================================================================
   SECTION 15: AUDIO - procedural WebAudio SFX + chiptune music
   =================================================================== */
const Aud = {
  ctx: null, master: null, mg: null, sg: null, echo: null, echoWet: null, noiseBuf: null, last: {},
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.connect(c.destination);
      this.mg = c.createGain(); this.mg.connect(this.master);
      this.sg = c.createGain(); this.sg.connect(this.master);
      // shared echo send for music
      this.echo = c.createDelay(1); this.echo.delayTime.value = 0.28;
      const fb = c.createGain(); fb.gain.value = 0.38;
      this.echoWet = c.createGain(); this.echoWet.gain.value = 0;
      this.echo.connect(fb); fb.connect(this.echo); this.echo.connect(this.echoWet); this.echoWet.connect(this.mg);
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVol();
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); },
  applyVol() {
    if (!this.ctx) return;
    const s = Save.data.settings, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.02);
    this.mg.gain.setTargetAtTime(s.music * 0.7, t, 0.02);
    this.sg.gain.setTargetAtTime(s.sfx, t, 0.02);
  },
  tone(o) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.at || 0), d = o.d || 0.1;
    const os = c.createOscillator(), g = c.createGain();
    os.type = o.t || 'square';
    os.frequency.setValueAtTime(o.f, t);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + d);
    const v = o.v === undefined ? 0.15 : o.v;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(g); g.connect(o.dest || this.sg);
    os.start(t); os.stop(t + d + 0.02);
  },
  noise(o) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.at || 0), d = o.d || 0.2;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1500, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + d);
    const g = c.createGain(), v = o.v === undefined ? 0.25 : o.v;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(o.dest || this.sg);
    s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
  },
  gaps: { shoot: 0.05, shoot2: 0.06, hit: 0.045, kill: 0.04, coin: 0.04, boom: 0.08, side: 0.07 },
  sfx(n, v) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, gap = this.gaps[n] || 0.025;
    if (now - (this.last[n] || 0) < gap) return;
    this.last[n] = now;
    const f = this.defs[n]; if (f) f.call(this, v === undefined ? 1 : v);
  },
  defs: {
    shoot()  { this.tone({ t: 'square', f: 900 + Math.random() * 80, f2: 380, d: 0.06, v: 0.05 }); },
    shoot2() { this.tone({ t: 'sawtooth', f: 520, f2: 200, d: 0.09, v: 0.06 }); },
    side()   { this.tone({ t: 'triangle', f: 600, f2: 300, d: 0.05, v: 0.05 }); },
    missile() { this.noise({ d: 0.18, f: 3000, f2: 500, v: 0.12, type: 'bandpass' }); },
    hit()    { this.tone({ t: 'square', f: 260 + Math.random() * 60, f2: 120, d: 0.04, v: 0.05 }); },
    kill()   { this.noise({ d: 0.22, f: 2400, f2: 200, v: 0.22 }); this.tone({ t: 'triangle', f: 240, f2: 60, d: 0.2, v: 0.15 }); },
    boom()   { this.noise({ d: 0.7, f: 1800, f2: 60, v: 0.45 }); this.tone({ t: 'sawtooth', f: 120, f2: 28, d: 0.6, v: 0.3 }); },
    coin()   { this.tone({ t: 'square', f: 1200, f2: 1700, d: 0.07, v: 0.07 }); },
    power()  { [523, 659, 784, 1046].forEach((f, i) => this.tone({ t: 'square', f, d: 0.09, at: i * 0.06, v: 0.1 })); },
    pickup() { this.tone({ t: 'triangle', f: 600, f2: 1100, d: 0.14, v: 0.15 }); },
    hurt()   { this.noise({ d: 0.3, f: 900, f2: 90, v: 0.4 }); this.tone({ t: 'sawtooth', f: 180, f2: 50, d: 0.3, v: 0.25 }); },
    shield() { this.tone({ t: 'sine', f: 900, f2: 300, d: 0.25, v: 0.2 }); },
    shieldbreak() { this.noise({ d: 0.35, f: 5000, f2: 400, v: 0.3, type: 'highpass' }); this.tone({ t: 'square', f: 700, f2: 90, d: 0.35, v: 0.15 }); },
    charge() { this.tone({ t: 'sawtooth', f: 120, f2: 900, d: 0.9, v: 0.1 }); },
    laser()  { this.tone({ t: 'sawtooth', f: 500, f2: 120, d: 0.5, v: 0.12 }); this.noise({ d: 0.5, f: 4000, f2: 800, v: 0.1, type: 'bandpass' }); },
    warn()   { [0, 0.25, 0.5].forEach(a => this.tone({ t: 'square', f: 440, f2: 330, d: 0.18, at: a, v: 0.12 })); },
    ui()     { this.tone({ t: 'square', f: 700, f2: 900, d: 0.05, v: 0.07 }); },
    select() { this.tone({ t: 'square', f: 520, d: 0.06, v: 0.08 }); this.tone({ t: 'square', f: 780, d: 0.1, at: 0.06, v: 0.08 }); },
    back()   { this.tone({ t: 'square', f: 500, f2: 300, d: 0.08, v: 0.07 }); },
    special() { this.tone({ t: 'sawtooth', f: 200, f2: 1200, d: 0.35, v: 0.2 }); this.noise({ d: 0.4, f: 800, f2: 3000, v: 0.15, type: 'bandpass' }); },
    nova()   { this.noise({ d: 1.0, f: 4000, f2: 80, v: 0.5 }); this.tone({ t: 'sawtooth', f: 800, f2: 40, d: 0.9, v: 0.3 }); },
    phase()  { this.tone({ t: 'square', f: 150, f2: 600, d: 0.5, v: 0.2 }); this.noise({ d: 0.5, f: 300, f2: 2500, v: 0.2 }); },
    win()    { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ t: 'square', f, d: 0.2, at: i * 0.12, v: 0.12 })); },
    lose()   { [392, 330, 262, 196].forEach((f, i) => this.tone({ t: 'sawtooth', f, d: 0.35, at: i * 0.22, v: 0.15 })); },
    lock()   { this.tone({ t: 'square', f: 200, f2: 150, d: 0.12, v: 0.08 }); }
  }
};

/* ---------- Music: procedural chiptune sequencer ---------- */
const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);
const TRACKS = {
  menu:    { bpm: 88,  root: 45, prog: [0, -4, -2, -7], chord: [0, 3, 7, 12], scale: [0, 2, 3, 5, 7, 8, 10], bass: 'half', drums: 'soft', arp: 'triangle', lead: 'sine', leadP: 0.5, echo: 0.3 },
  belt:    { bpm: 142, root: 40, prog: [0, 0, -4, -2], chord: [0, 3, 7, 12], scale: [0, 2, 3, 5, 7, 8, 10], bass: 'eighth', drums: 'drive', arp: 'square', lead: 'square', leadP: 0.55, echo: 0.1 },
  station: { bpm: 104, root: 43, prog: [0, -2, -5, -1], chord: [0, 3, 6, 10], scale: [0, 2, 3, 5, 6, 8, 9, 11], bass: 'syncop', drums: 'sparse', arp: 'square', lead: 'triangle', leadP: 0.4, echo: 0.45 },
  hive:    { bpm: 128, root: 38, prog: [0, 1, 0, -2], chord: [0, 3, 7, 10], scale: [0, 1, 3, 5, 7, 8, 10], bass: 'gallop', drums: 'tribal', arp: 'sawtooth', lead: 'sawtooth', leadP: 0.5, echo: 0.3 },
  boss:    { bpm: 158, root: 36, prog: [0, 0, -2, 1], chord: [0, 3, 7, 12], scale: [0, 2, 3, 5, 7, 8, 11], bass: 'eighth', drums: 'boss', arp: 'sawtooth', lead: 'square', leadP: 0.7, echo: 0.2 },
  secret:  { bpm: 120, root: 48, prog: [0, 5, 3, 7], chord: [0, 4, 7, 12], scale: [0, 2, 4, 5, 7, 9, 11], bass: 'half', drums: 'soft', arp: 'square', lead: 'square', leadP: 0.7, echo: 0.2 }
};
const BASS_PAT = {
  half:   [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,1,0],
  eighth: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
  syncop: [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
  gallop: [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,0]
};
const DRUM_PAT = {
  soft:   { k: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], s: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], h: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0] },
  drive:  { k: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], s: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], h: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1] },
  sparse: { k: [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0], s: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], h: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1] },
  tribal: { k: [1,0,0,1, 0,0,1,0, 1,0,0,0, 0,1,0,0], s: [0,0,0,0, 1,0,0,0, 0,0,0,1, 1,0,0,0], h: [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1] },
  boss:   { k: [1,0,0,1, 1,0,1,0, 1,0,0,1, 1,0,1,0], s: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1], h: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1] }
};
const Music = {
  id: null, timer: null, step: 0, next: 0, t: null, pat: null,
  start(id, rootShift) {
    if (!Aud.ctx) return;
    if (this.id === id && this.timer && !rootShift) return;
    this.stop();
    const t = TRACKS[id] || TRACKS.menu;
    this.t = Object.assign({}, t, { root: t.root + (rootShift || 0) });
    this.id = id; this.step = 0;
    this.next = Aud.ctx.currentTime + 0.08;
    // procedural melody per 4-bar loop, deterministic per track id
    const rng = RNG('mus-' + id + (rootShift || 0));
    this.pat = { lead: [], arp: [] };
    for (let b = 0; b < 4; b++) {
      const lead = [], arp = [];
      let deg = rng.int(0, 4);
      for (let s = 0; s < 16; s++) {
        arp.push([0, 1, 2, 3, 2, 1, 3, 2, 0, 1, 2, 3, 1, 2, 3, 2][(s + b) % 16]);
        if (s % 2 === 0 && rng() < this.t.leadP * (b === 3 ? 1.2 : 0.8)) { deg = clamp(deg + rng.int(-2, 2), 0, 7); lead.push(deg); } else lead.push(-1);
      }
      this.pat.lead.push(lead); this.pat.arp.push(arp);
    }
    Aud.echoWet.gain.setTargetAtTime(this.t.echo, Aud.ctx.currentTime, 0.1);
    this.timer = setInterval(() => this.tick(), 30);
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.id = null; },
  tick() {
    const c = Aud.ctx; if (!c) return;
    if (this.next < c.currentTime - 0.4) this.next = c.currentTime + 0.05;
    const sd = 60 / this.t.bpm / 4;
    while (this.next < c.currentTime + 0.14) { this.play(this.step, this.next, sd); this.next += sd; this.step++; }
  },
  play(step, at, sd) {
    const t = this.t, s = step % 16, bar = Math.floor(step / 16) % 4, off = at - Aud.ctx.currentTime;
    const root = t.root + t.prog[bar];
    const dest = Aud.mg;
    const bp = BASS_PAT[t.bass];
    if (bp[s]) Aud.tone({ t: 'triangle', f: MIDI(root + (s % 8 === 6 ? 12 : 0)), d: sd * 1.6, v: 0.32, at: off, dest });
    // arpeggio
    const a = this.pat.arp[bar][s];
    if (s % 2 === 0 || t.drums === 'boss' || t.drums === 'drive') Aud.tone({ t: t.arp, f: MIDI(root + 24 + t.chord[a]), d: sd * 0.9, v: 0.045, at: off, dest });
    // lead
    const l = this.pat.lead[bar][s];
    if (l >= 0) {
      const sc = t.scale, n = root + 36 + sc[l % sc.length] + (l >= sc.length ? 12 : 0);
      Aud.tone({ t: t.lead, f: MIDI(n), d: sd * 3.2, v: 0.07, at: off, dest });
    }
    // drums
    const dp = DRUM_PAT[t.drums];
    if (dp.k[s]) { Aud.tone({ t: 'sine', f: 160, f2: 40, d: 0.14, v: 0.5, at: off, dest }); }
    if (dp.s[s]) Aud.noise({ d: 0.12, f: 2800, f2: 900, v: 0.22, type: 'bandpass', at: off, dest });
    if (dp.h[s]) Aud.noise({ d: 0.04, f: 9000, v: 0.07, type: 'highpass', at: off, dest });
  }
};
