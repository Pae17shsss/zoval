'use strict';
/* ===== SENYAP — loop utama, input, sinkronisasi ===== */
const IN = { k: {}, mx: innerWidth / 2, my: innerHeight / 2, md: 0, lx: 0, ly: 0, rx: 0, ry: 0, ra: 0, atk: 0, sp: 0, sn: 0, fl: 0, sel: 0, latch: 0, fa: 0, touch: matchMedia('(pointer:coarse)').matches };
const SAVE_KEY = 'senyap_save_v1';
const app = {
  g: null, me: null, mode: '', R: null, paused: false, evq: [], evOut: [], netT: 0, inT: 0, prompt: null, prT: 0, overShown: false, last: 0, vol: +(localStorage.getItem('senyap_vol') || 0.8),

  /* ---------- mulai ---------- */
  name() { const n = ($('inName').value || '').trim().slice(0, 12) || 'Penyintas'; localStorage.setItem('senyap_name', n); return n; },
  msg(t) { $('menuMsg').textContent = t || ''; },
  di: clamp(+(localStorage.getItem('senyap_diff') || 1), 0, 2),
  setDiff(i) { this.di = i; localStorage.setItem('senyap_diff', i); for (const b of $('diffPick').children) b.classList.toggle('on', +b.dataset.d === i); },
  setPov(p) { this.R.pov = p; localStorage.setItem('senyap_pov', p); for (const b of $('povPick').children) b.classList.toggle('on', b.dataset.p === p); if (p !== 'fps' && document.pointerLockElement) document.exitPointerLock(); },
  cyclePov() { const o = ['top', 'iso', 'fps']; this.setPov(o[(o.indexOf(this.R.pov) + 1) % 3]); UI.toast('Sudut pandang: ' + POV_NAME[this.R.pov]); },
  loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } },
  save() { if (this.mode === 'client' || !this.g || this.g.over) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.g.save())); } catch (e) { } },
  enter() { SFX.init(); SFX.setVol(this.vol); $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); document.body.classList.toggle('touch', IN.touch); $('touch').classList.toggle('hidden', !IN.touch); this.overShown = false; },
  startSolo(sv) {
    const g = this.g = new Game(sv ? sv.seed : (Math.random() * 2 ** 31) | 0); g.setDiff(this.di); this.me = g.addPlayer(1, this.name(), PCOLS[0]); if (sv) g.load(sv);
    this.mode = 'solo'; this.enter();
    if (!sv) UI.banner('HARI 1', 'Kota sudah mati. Kamu belum.', 'amb');
  },
  startHost() {
    this.msg('Membuat room…'); SFX.init();
    NET.host((err) => {
      if (err) return this.msg(err);
      const sv = null, g = this.g = new Game((Math.random() * 2 ** 31) | 0); g.multi = true; g.setDiff(this.di); this.me = g.addPlayer(1, this.name(), PCOLS[0]);
      this.mode = 'host'; this.enter(); UI.showRoom(); this.paused = false;
    });
  },
  join(code) {
    if (code.length < 4) return this.msg('Masukkan kode room.');
    this.msg('Menghubungkan ke ' + code + '…'); SFX.init(); const name = this.name();
    NET.join(code, (err) => { if (err) { NET.close(); return this.msg(err); } this.msg('Terhubung. Memuat dunia…'); NET.send({ t: 'hi', name }); });
  },
  quit() { this.save(); NET.close(); location.href = location.href.split('?')[0]; },
  cmd(c) { if (!this.g) return; if (this.mode === 'client') NET.send({ t: 'cmd', c }); else this.g.cmd(this.me, c); },
  crate() { const me = this.me; if (this.mode === 'client') return me.cr || null; return me.crate >= 0 ? this.g.crates.get(me.crate) || null : null; },
  doInteract() {
    const me = this.me; if (!me || me.dead || UI.panelOpen) return; const t = findInteract(this.g, me); if (!t) return;
    if (t.o === O.FIRE) return UI.openPanel('Bertahan'); if (t.o === O.BENCH) return UI.openPanel(UI.tab === 'Bertahan' ? 'Bangun' : UI.tab);
    this.cmd({ c: 'int', tx: t.tx, ty: t.ty });
    if (t.o === O.CRATE) setTimeout(() => UI.openPanel(), 180);
  },

  /* ---------- host ---------- */
  hostData(c, d) {
    const g = this.g; if (!g || !d) return;
    if (d.t === 'hi') {
      if (c.pid) return; const id = NET.nextId++, p = g.addPlayer(id, String(d.name || 'Tamu').slice(0, 12), PCOLS[(id - 1) % PCOLS.length], true);
      c.pid = id; c.dv = -1; c.send({ t: 'init', seed: g.seed, id, x: p.x, y: p.y, world: g.world.serialize(), time: g.time }); UI.toast('🟢 ' + p.name + ' bergabung'); return;
    }
    const p = g.pById(c.pid); if (!p) return;
    if (d.t === 'in') {
      const n = v => typeof v === 'number' && isFinite(v) ? v : 0, i = p.in;
      if (!p.dead) { p.nx = clamp(n(d.x), 0, CFG.W); p.ny = clamp(n(d.y), 0, CFG.H); p.a = n(d.a); }
      i.at = d.at ? 1 : 0; i.sn = d.sn ? 1 : 0; i.sp = d.sp ? 1 : 0; i.fl = d.fl ? 1 : 0; i.tx = n(d.tx); i.ty = n(d.ty); i.ad = n(d.ad); i.sel = n(d.sel); i.mv = p.dead ? 0 : clamp(n(d.mv) | 0, 0, 3);
    } else if (d.t === 'cmd' && d.c) g.cmd(p, d.c);
  },
  hostLeave(c) { const g = this.g; if (!g || !c.pid) return; const p = g.pById(c.pid); if (p) UI.toast('🔴 ' + p.name + ' keluar'); g.removePlayer(c.pid); },
  broadcast() {
    const g = this.g, shared = g.snapshot(), tiles = g.world.flushDirty(), ev = this.evOut; this.evOut = [];
    for (const c of NET.conns) { if (!c.pid || !c.open) continue; const p = g.pById(c.pid); if (!p) continue; const m = { t: 's', g: shared, e: ev, d: tiles, me: g.priv(p) }; if (c.dv !== g.dropsVer) { c.dv = g.dropsVer; m.D = g.dropList(); } try { c.send(m); } catch (e) { } }
  },

  /* ---------- klien ---------- */
  clientData(d) {
    if (!d) return;
    if (d.t === 'init') {
      const g = this.g = new Game(d.seed); g.client = true; g.multi = true; g.world.apply(d.world); g.time = d.time;
      const me = this.me = newPlayer(d.id, this.name(), PCOLS[(d.id - 1) % PCOLS.length]); me.x = d.x; me.y = d.y; g.players.push(me);
      this.mode = 'client'; this.enter(); UI.banner('TERHUBUNG', 'Tetap bersama. Tetap senyap.', 'grn'); return;
    }
    if (d.t !== 's' || !this.g) return;
    const g = this.g, me = this.me, s = d.g;
    g.time = s.tm; g.rain = s.rn; g.evac = { st: s.ev[0], t: s.ev[1], x: s.ev[2], y: s.ev[3] }; g.over = s.ov;
    const pm = new Map(g.players.map(p => [p.id, p])), np = [];
    for (const r of s.P) { let p = pm.get(r[0]); if (!p) { p = newPlayer(r[0], r[7], r[8]); p.x = r[1]; p.y = r[2]; p.a = r[3]; } if (p !== me) { p.nx = r[1]; p.ny = r[2]; p.na = r[3]; p.hp = r[4]; p.dead = r[5] & 1; p.sn = r[5] & 2; p.fl = r[5] & 4; p.sleep = r[5] & 8; p.held = r[6]; } p.name = r[7]; p.col = r[8]; p.kills = r[9]; np.push(p); }
    if (!np.includes(me)) np.push(me); g.players = np;
    const zm = new Map(g.zombies.map(z => [z.id, z])), nz = [];
    for (const r of s.Z) { let z = zm.get(r[0]); if (!z) z = { id: r[0], k: r[1], x: r[2], y: r[3], a: r[4], r: ZT[r[1]].r, mhp: 10, hitT: 0 }; z.nx = r[2]; z.ny = r[3]; z.na = r[4]; z.st = r[5]; z.hp = r[6]; z.wind = r[7]; z.hitT = r[8] ? 2 : 0; nz.push(z); }
    g.zombies = nz; g.projs = s.Q.map(q => ({ id: q[0], x: q[1], y: q[2], z: q[3], k: q[4] })); g.fires = s.F.map(f => ({ x: f[0], y: f[1], r: f[2], t: f[3], k: f[4] ? 'acid' : 0 })); g.air = s.ad ? { x: s.ad[0], y: s.ad[1] } : null;
    if (d.d) g.world.apply(d.d); if (d.D) g.drops = d.D.map(q => ({ id: q[0], x: q[1], y: q[2], it: q[3], n: q[4] }));
    const m = d.me; if (m) { if (m.tpc !== me.tpc) { me.tpc = m.tpc; me.x = m.x; me.y = m.y; } for (const k of ['hp', 'st', 'hu', 'th', 'inf', 'bl', 'inv', 'dead', 'rt', 'act', 'crate', 'cr', 'noise', 'rl', 'rlT', 'bag', 'exh', 'sleep', 'buff', 'hurtT', 'stun', 'cd', 'bed']) me[k] = m[k]; for (const t of m.msgs) me.msgs.push(t); }
    if (d.e) for (const e of d.e) this.evq.push(e);
  },
  clientLost() { if (this.mode !== 'client' && this.g) return; if (this.g && this.g.over) return; alert('Koneksi ke host terputus.'); location.href = location.href.split('?')[0]; },
  clientUpdate(dt) {
    const g = this.g, me = this.me; g.time += dt;
    if (!me.dead) movePlayer(g, me, dt); else me.in.mv = 0;
    const k = Math.min(1, dt * 12);
    for (const p of g.players) { if (p.swing > 0) p.swing -= dt; if (p === me) continue; p.x += (p.nx - p.x) * k; p.y += (p.ny - p.y) * k; p.a += angDiff(p.na, p.a) * k; }
    for (const z of g.zombies) { z.x += (z.nx - z.x) * k; z.y += (z.ny - z.y) * k; z.a += angDiff(z.na, z.a) * k; }
    me.sel = me.in.sel; me.sn = me.in.sn; me.fl = me.in.fl && g.count(me, 'senter') > 0 ? 1 : 0; const hs = me.inv[me.sel]; me.held = hs ? hs.id : '';
    this.inT += dt; if (this.inT >= 0.066) { this.inT = 0; const i = me.in; NET.send({ t: 'in', x: r2(me.x), y: r2(me.y), a: r2(me.a), at: i.at, sn: i.sn, sp: i.sp, fl: i.fl, tx: i.tx, ty: i.ty, ad: r1(i.ad), sel: i.sel, mv: i.mv }); }
  },

  /* ---------- input -> niat ---------- */
  readInput(dt) {
    const me = this.me, R = this.R, inp = me.in, k = IN.k;
    if (IN.latch > 0) IN.latch -= dt;
    inp.sel = IN.sel; inp.fl = IN.fl; inp.sn = IN.sn || k.ControlLeft ? 1 : 0; inp.sp = IN.sp || k.ShiftLeft || k.ShiftRight ? 1 : 0;
    if (UI.panelOpen || UI.dlgOpen || me.dead) { inp.mx = inp.my = 0; inp.at = 0; return; }
    const fps = R.pov === 'fps'; let sx = IN.lx, sy = IN.ly;
    if (k.KeyW || (!fps && k.ArrowUp) || (fps && k.ArrowUp)) sy -= 1; if (k.KeyS || k.ArrowDown) sy += 1; if (k.KeyA || (!fps && k.ArrowLeft)) sx -= 1; if (k.KeyD || (!fps && k.ArrowRight)) sx += 1;
    let at = IN.md || IN.atk || IN.latch > 0 ? 1 : 0; const rl = Math.hypot(IN.rx, IN.ry);
    if (fps) { me.a += IN.fa; if (IN.ra) me.a += IN.rx * 2.9 * dt; if (k.ArrowLeft) me.a -= 2.4 * dt; if (k.ArrowRight) me.a += 2.4 * dt; inp.ad = 6; }
    else if (IN.ra && rl > 0.25) { const d = R.dirToWorld(IN.rx, IN.ry, 0); me.a = Math.atan2(d[1], d[0]); if (rl > 0.78) at = 1; inp.ad = 2 + rl * 6; }
    else if (!IN.touch) { const w = R.screenToWorld(IN.mx * R.dpr, IN.my * R.dpr + (R.pov === 'iso' ? R.hz * .45 : 0)); me.a = Math.atan2(w[1] - me.y, w[0] - me.x); inp.ad = Math.hypot(w[0] - me.x, w[1] - me.y); }
    else {
      let aimed = false;
      if (at) { let bd = 9, bz = null; for (const z of this.g.zombies) { if (z.gone) continue; const d = Math.hypot(z.x - me.x, z.y - me.y); if (d < bd && this.g.world.los(me.x, me.y, z.x, z.y)) { bd = d; bz = z; } } if (bz) { me.a = Math.atan2(bz.y - me.y, bz.x - me.x); inp.ad = bd; aimed = true; } }
      if (!aimed && Math.hypot(sx, sy) > 0.3) { const d = R.dirToWorld(sx, sy, me.a); me.a = Math.atan2(d[1], d[0]); inp.ad = 5; }
    }
    IN.fa = 0;
    const wv = R.dirToWorld(sx, sy, me.a); inp.mx = wv[0]; inp.my = wv[1]; inp.at = at;
    // ubin sasaran (bangun)
    let tx, ty;
    if (!IN.touch && !fps) { const w = R.screenToWorld(IN.mx * R.dpr, IN.my * R.dpr); let dx = w[0] - me.x, dy = w[1] - me.y; const d = Math.hypot(dx, dy); if (d > CFG.REACH) { dx *= CFG.REACH / d; dy *= CFG.REACH / d; } tx = Math.floor(me.x + dx); ty = Math.floor(me.y + dy); }
    else { tx = Math.floor(me.x + Math.cos(me.a) * 1.5); ty = Math.floor(me.y + Math.sin(me.a) * 1.5); }
    inp.tx = tx; inp.ty = ty;
    const hs = me.inv[IN.sel], W = this.g.world;
    R.ghost = hs && ITEMS[hs.id].k === 'place' ? { tx, ty, ok: W.inb(tx, ty) && W.getO(tx, ty) === O.NONE && W.getT(tx, ty) !== T.WATER } : null;
    this.prT -= dt; if (this.prT <= 0) { this.prT = 0.12; this.prompt = findInteract(this.g, me); R.hl = this.prompt; }
  },

  /* ---------- event -> suara & efek ---------- */
  sfxAt(n, x, y, v, e) {
    const me = this.me, dx = x - me.x, dy = y - me.y, d = Math.hypot(dx, dy), vol = (v || 1) / (1 + (d / 7) * (d / 7));
    const pan = d < 1 ? 0 : this.R.pov === 'fps' ? Math.sin(angDiff(Math.atan2(dy, dx), me.a)) : this.R.pov === 'iso' ? clamp((dx - dy) / 12, -1, 1) : clamp(dx / 10, -1, 1);
    SFX.play(n, vol, pan, e);
  },
  onEvent(e) {
    const g = this.g, me = this.me, R = this.R, mine = e.pid === me.id; R.fx(e);
    switch (e.k) {
      case 'swing': { const p = g.pById(e.pid); if (p) p.swing = 0.25; this.sfxAt('swing', e.x, e.y, 1); break; }
      case 'shot': if (!e.n) { this.sfxAt(e.g, e.x, e.y, 1.8); if (mine) R.shake = Math.max(R.shake, e.g === 'shotgun' ? .35 : e.g === 'busur' ? 0 : .15); } break;
      case 'scream': case 'boom': this.sfxAt(e.k, e.x, e.y, 2.6, e); break;
      case 'alarm': case 'pop': case 'glass': case 'fire': case 'hiss': case 'drop': this.sfxAt(e.k, e.x, e.y, 1.8, e); break;
      case 'spit': case 'acid': this.sfxAt(e.k, e.x, e.y, 1.3, e); break;
      case 'pack': SFX.play('pack'); UI.toast('Kamu mendengar erangan banyak mayat dari kejauhan…'); break;
      case 'airdrop': UI.banner('KIRIMAN UDARA', 'Titik jingga di peta. Seluruh kota mendengarnya.', 'amb'); SFX.play('dawn'); break;
      case 'hitz': case 'zdie': case 'thud': case 'zbash': case 'chop': case 'door': case 'build': case 'break': case 'groan': case 'bite': this.sfxAt(e.k, e.x, e.y, 1, e); break;
      case 'step': if (mine) SFX.play('step', 1, 0, e); else this.sfxAt('step', e.x, e.y, .8, e); break;
      case 'hurt': if (mine) { SFX.play('hurt'); R.shake = Math.max(R.shake, .3); if (IN.touch && navigator.vibrate) { try { navigator.vibrate(60); } catch (er) { } } } break;
      case 'pick': if (mine) { SFX.play('pick'); if (e.it) UI.toast('＋ ' + ITEMS[e.it].ic + ' ' + ITEMS[e.it].n + (e.n > 1 ? ' ×' + e.n : '')); } break;
      case 'craft': case 'eat': case 'drink': case 'heal': case 'loot': case 'search': case 'click': case 'reload': if (mine) SFX.play(e.k); break;
      case 'dusk': if (e.horde) { UI.banner('MALAM MERAH', 'Mereka datang. Semuanya.', 'red'); SFX.play('horde'); } else { UI.banner('MALAM TIBA', 'Mereka lebih cepat dalam gelap.', ''); SFX.play('dusk'); } break;
      case 'dawn': UI.banner('HARI ' + e.day, 'Kamu masih hidup.', 'amb'); SFX.play('dawn'); this.save(); break;
      case 'evac': if (e.st === 1) { UI.banner('SINYAL TERKIRIM', 'Bertahan 150 detik. Seluruh kota mendengarnya.', 'red'); SFX.play('horde'); } else if (e.st === 2) { UI.banner('HELIKOPTER TIBA', 'Lari ke titik hijau!', 'grn'); SFX.play('dawn'); } else if (e.st === 3) SFX.play('win'); else UI.banner('PEMANCAR HANCUR', 'Evakuasi dibatalkan.', 'red'); break;
      case 'pdie': if (mine) SFX.play('pdie'); else UI.toast('☠ ' + e.name + ' tewas'); break;
    }
  },

  /* ---------- loop ---------- */
  tick(dt) {
    const g = this.g; if (!g) return;
    if (this.mode === 'solo' && this.paused) return;
    this.readInput(dt);
    if (this.mode !== 'client') {
      g.update(dt); const ev = g.events; g.events = []; for (const e of ev) this.onEvent(e);
      if (this.mode === 'host') { for (const e of ev) this.evOut.push(e); this.netT += dt; if (this.netT >= 0.1) { this.netT = 0; this.broadcast(); } } else g.world.dirty.length = 0;
    } else { this.clientUpdate(dt); const q = this.evq; this.evq = []; for (const e of q) this.onEvent(e); }
    if (g.over && !this.overShown) { this.overShown = true; if (g.over === 1 && this.mode !== 'client') localStorage.removeItem(SAVE_KEY); if (this.mode === 'host') this.broadcast(); UI.closePanel(); setTimeout(() => UI.showOver(), 900); }
  },
  frame(ts) {
    requestAnimationFrame(t => this.frame(t));
    const dt = Math.min(0.05, (ts - this.last) / 1000 || 0.016); this.last = ts; this.lastTick = performance.now();
    if (!this.g) { this.menuBg(dt); return; }
    this.tick(dt);
    const g = this.g, me = this.me; this.R.draw(g, me, dt); UI.update(dt);
    let tn = 0; for (const z of g.zombies) if (z.st === 3 && Math.abs(z.x - me.x) < 12 && Math.abs(z.y - me.y) < 12) tn++;
    SFX.ambient(dt, { rain: g.rain, dark: g.dark, tension: Math.min(1, tn / 6), horde: g.horde || g.evac.st === 1, low: me.hp < 30 && !me.dead, heli: g.evac.st === 2 });
  },
  menuBg(dt) { // dunia berputar pelan di belakang menu
    if (!this.bg) { this.bg = new Game(20240); this.bgp = newPlayer(0, '', '#000'); this.bgp.dead = 1; this.bg.time = CFG.DAY * 0.56; }
    const p = this.bgp, s = this.bg.world.spawn; this.bgT = (this.bgT || 0) + dt * 0.05; p.x = 80 + Math.cos(this.bgT) * 30; p.y = 80 + Math.sin(this.bgT * 1.3) * 30; p.a = this.bgT * 2;
    const R = this.R, pv = R.pov; R.draw(this.bg, p, dt); R.pov = pv;
  }
};

/* ---------- pengikat input ---------- */
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  IN.k[e.code] = 1; if (!app.g) return;
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 6) IN.sel = n - 1; }
  else if (e.code === 'Escape') { if (UI.dlgOpen) UI.closeDlg(); else if (UI.panelOpen) UI.closePanel(); else UI.showPause(); }
  else if (e.code === 'Tab' || e.code === 'KeyI') UI.togglePanel();
  else if (UI.dlgOpen || UI.panelOpen) return;
  else if (e.code === 'KeyE') app.doInteract();
  else if (e.code === 'KeyR') app.cmd({ c: 'rl' });
  else if (e.code === 'KeyV') app.cyclePov();
  else if (e.code === 'KeyF') { IN.fl = IN.fl ? 0 : 1; if (IN.fl && !app.g.count(app.me, 'senter')) UI.toast('Kamu tidak punya senter.'); UI.syncTog(); }
  else if (e.code === 'KeyC') { IN.sn = IN.sn ? 0 : 1; UI.syncTog(); }
  else if (e.code === 'KeyM') app.R.big = !app.R.big;
});
window.addEventListener('keyup', e => { IN.k[e.code] = 0; });
window.addEventListener('blur', () => { IN.k = {}; IN.md = 0; });
window.addEventListener('wheel', e => { if (!app.g || UI.panelOpen || UI.dlgOpen) return; IN.sel = (IN.sel + (e.deltaY > 0 ? 1 : 5)) % 6; }, { passive: true });
window.addEventListener('resize', () => app.R && app.R.resize());
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('beforeunload', () => app.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) app.save(); });
window.addEventListener('mousemove', e => { IN.mx = e.clientX; IN.my = e.clientY; if (app.R && app.R.pov === 'fps' && !IN.touch) IN.fa += (e.movementX || 0) * (document.pointerLockElement ? 0.0026 : 0.0045); });
window.addEventListener('mouseup', () => { IN.md = 0; });
window.addEventListener('load', () => {
  const cv = $('cv'); app.R = new Renderer(cv); UI.init();
  app.setPov(localStorage.getItem('senyap_pov') || 'top'); app.setDiff(app.di);
  cv.addEventListener('pointerdown', e => {
    if (!app.g) return; SFX.init();
    const R = app.R, m = R.mmRect, x = e.clientX * R.dpr, y = e.clientY * R.dpr;
    if (m && x > m[0] && x < m[0] + m[2] && y > m[1] && y < m[1] + m[2]) { R.big = !R.big; return; }
    if (e.pointerType === 'mouse') { if (IN.touch) { IN.touch = false; document.body.classList.remove('touch'); $('touch').classList.add('hidden'); } if (e.button === 0) { IN.md = 1; IN.latch = .15; if (R.pov === 'fps' && cv.requestPointerLock) { try { const pr = cv.requestPointerLock(); if (pr && pr.catch) pr.catch(() => { }); } catch (er) { } } } }
    else if (!IN.touch) { IN.touch = true; document.body.classList.add('touch'); $('touch').classList.remove('hidden'); }
  });
  // host tetap berjalan walau tab tersembunyi
  setInterval(() => { if (app.g && app.mode !== 'solo' && performance.now() - (app.lastTick || 0) > 200) { for (let i = 0; i < 5; i++) app.tick(0.05); app.lastTick = performance.now(); } }, 250);
  requestAnimationFrame(t => app.frame(t));
});
