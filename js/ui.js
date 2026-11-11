'use strict';
/* ===== SENYAP — antarmuka: HUD, tas, racik, menu, kontrol sentuh ===== */
const $ = id => document.getElementById(id);
const POV_NAME = { top: 'ATAS', iso: 'ISO', fps: 'MATA' };
const UI = {
  panelOpen: false, pick: -1, tab: 'Senjata', sig: '', hsig: '', hudT: 0, dlgOpen: false,
  init() {
    $('inName').value = localStorage.getItem('senyap_name') || '';
    const rm = new URLSearchParams(location.search).get('room'); if (rm) $('inCode').value = rm.toUpperCase().slice(0, 5);
    $('povPick').onclick = e => { const p = e.target.dataset.p; if (!p) return; app.setPov(p); };
    $('diffPick').onclick = e => { const d = e.target.dataset.d; if (d !== undefined) app.setDiff(+d); };
    $('bSolo').onclick = () => app.startSolo(null);
    $('bCont').onclick = () => app.startSolo(app.loadSave());
    $('bHost').onclick = () => app.startHost();
    $('bJoin').onclick = () => app.join($('inCode').value.trim().toUpperCase());
    $('bHelp').onclick = () => this.showHelp();
    const sv = app.loadSave(); if (sv) { $('bCont').classList.remove('hidden'); $('contTxt').textContent = 'Hari ' + (Math.floor(sv.time / CFG.DAY) + 1) + ' · dunia tersimpan'; }
    $('sysbtns').onclick = e => { const b = e.target.closest('button'); if (!b) return; SFX.play('ui'); const a = b.dataset.a; if (a === 'pause') this.showPause(); else if (a === 'panel') this.togglePanel(); else app.cyclePov(); };
    $('hot').onclick = e => { const s = e.target.closest('.slot'); if (s) { IN.sel = +s.dataset.i; SFX.play('ui'); } };
    $('pClose').onclick = () => this.closePanel();
    $('panel').addEventListener('click', e => {
      if (e.target.id === 'panel') return this.closePanel();
      const tb = e.target.closest('#tabs button'); if (tb) { this.tab = tb.dataset.t; this.sig = ''; return; }
      const rc = e.target.closest('.rc'); if (rc) { app.cmd({ c: 'craft', r: +rc.dataset.r }); return; }
      const ib = e.target.closest('.ibtn'); if (ib) { const a = ib.dataset.a, i = this.pick; if (a === 'use') app.cmd({ c: 'use', i }); else if (a === 'drop') { app.cmd({ c: 'drop', i }); this.pick = -1; } else if (a === 'store') { app.cmd({ c: 'xfer', f: 0, i }); this.pick = -1; } this.sig = ''; return; }
      const sl = e.target.closest('.slot'); if (!sl) return; SFX.play('ui');
      if (sl.dataset.c !== undefined) { app.cmd({ c: 'xfer', f: 1, i: +sl.dataset.c }); return; }
      const i = +sl.dataset.i;
      if (this.pick < 0) { if (app.me.inv[i]) this.pick = i; } else if (this.pick === i) this.pick = -1; else { app.cmd({ c: 'swap', i: this.pick, j: i }); this.pick = -1; }
      this.sig = '';
    });
    this.initTouch();
  },
  initTouch() {
    const stick = (zone, el, dyn, cb) => {
      let id = null, ox = 0, oy = 0; const knob = el.querySelector('i');
      const mv = e => { let dx = (e.clientX - ox) / 46, dy = (e.clientY - oy) / 46; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } knob.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)'; cb(dx, dy, 1); };
      zone.addEventListener('pointerdown', e => { if (id !== null) return; id = e.pointerId; zone.setPointerCapture(id); IN.touch = true; if (dyn) { ox = e.clientX; oy = e.clientY; el.style.left = ox - 59 + 'px'; el.style.top = oy - 59 - zone.getBoundingClientRect().top + 'px'; el.classList.remove('hidden'); } else { const r = el.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; } mv(e); e.preventDefault(); });
      zone.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
      const up = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; if (dyn) el.classList.add('hidden'); cb(0, 0, 0); };
      zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
    };
    stick($('lz'), $('lstick'), true, (x, y) => { IN.lx = x; IN.ly = y; });
    stick($('rstick'), $('rstick'), false, (x, y, a) => { IN.rx = x; IN.ry = y; IN.ra = a; });
    const hold = (el, fn) => { el.addEventListener('pointerdown', e => { fn(1); e.preventDefault(); }); el.addEventListener('pointerup', () => fn(0)); el.addEventListener('pointercancel', () => fn(0)); el.addEventListener('pointerleave', () => fn(0)); };
    hold($('tAtk'), v => { IN.atk = v; if (v) IN.latch = .15; });
    $('tInt').onclick = () => app.doInteract();
    $('tRl').onclick = () => app.cmd({ c: 'rl' });
    const tog = (el, k) => el.onclick = () => { IN[k] = IN[k] ? 0 : 1; if (k === 'sp' && IN.sp) IN.sn = 0; if (k === 'sn' && IN.sn) IN.sp = 0; this.syncTog(); };
    tog($('tSp'), 'sp'); tog($('tSn'), 'sn'); tog($('tFl'), 'fl');
  },
  syncTog() { $('tSp').classList.toggle('on', !!IN.sp); $('tSn').classList.toggle('on', !!IN.sn); $('tFl').classList.toggle('on', !!IN.fl); },
  toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; const b = $('toasts'); b.appendChild(d); while (b.children.length > 4) b.firstChild.remove(); setTimeout(() => d.remove(), 4200); },
  banner(h, p, cls) { $('banner').innerHTML = '<div class="' + (cls || '') + '"><h2>' + h + '</h2><p>' + (p || '') + '</p></div>'; },
  slotHTML(s, attr, cls, key) {
    let h = '<div class="slot ' + (cls || '') + '" ' + attr + '>';
    if (key) h += '<kbd>' + key + '</kbd>';
    if (s) { const d = ITEMS[s.id]; h += '<span class="ic">' + d.ic + '</span>'; if (d.tag) h += '<em>' + d.tag + '</em>'; if (d.k === 'gun') h += '<b>' + s.m + '/' + app.g.count(app.me, d.ammo) + '</b>'; else if (s.n > 1) h += '<b>' + s.n + '</b>'; if (d.dur && d.k !== 'gun') h += '<i class="dur"><u style="width:' + Math.round(s.d / d.dur * 100) + '%"></u></i>'; }
    return h + '</div>';
  },
  /* ---------- HUD ---------- */
  update(dt) {
    const me = app.me, g = app.g; if (!me) return;
    while (me.msgs.length) this.toast(me.msgs.shift());
    this.hudT -= dt; if (this.hudT > 0) return; this.hudT = 0.1;
    const bar = (id, v, low) => { const e = $(id); e.querySelector('i').style.width = clamp(v, 0, 100) + '%'; e.classList.toggle('low', v < low); };
    bar('sHp', me.hp, 30); $('sHp').querySelector('b').textContent = Math.max(0, Math.ceil(me.hp)); bar('sSt', me.st, 15); bar('sHu', me.hu, 20); bar('sTh', me.th, 20);
    $('sInf').classList.toggle('hidden', !(me.inf > 0)); if (me.inf > 0) bar('sInf', me.inf, 0);
    let ch = ''; if (me.bl > 0) ch += '<span>🩸 Berdarah</span>'; if (me.inf > 0) ch += '<span class="g">☣ Infeksi ' + Math.floor(me.inf) + '%</span>'; if (me.hu < 20) ch += '<span>Lapar</span>'; if (me.th < 20) ch += '<span>Haus</span>'; if (me.exh) ch += '<span>Kehabisan napas</span>'; if (me.in.sn) ch += '<span class="b">🤫 Mengendap</span>'; if (me.buff > 0) ch += '<span class="b">☕ Segar</span>';
    if ($('chips').innerHTML !== ch) $('chips').innerHTML = ch;
    const night = g.isNight, red = g.horde || g.evac.st === 1, ck = $('clock');
    $('dayN').textContent = 'HARI ' + g.day; $('clk').textContent = g.clock; $('phaseIc').textContent = red ? '🩸' : night ? '🌙' : g.rain > .5 ? '🌧️' : '☀️'; ck.classList.toggle('night', night); ck.classList.toggle('red', red);
    // tujuan
    let ob = ''; const mod = g.count(me, 'modul');
    if (g.evac.st === 1) ob = '📡 BERTAHAN — helikopter tiba dalam ' + Math.max(0, g.evac.t | 0) + ' dtk';
    else if (g.evac.st === 2) ob = '🚁 LARI KE HELIKOPTER (titik hijau di peta)';
    else if (g.count(me, 'radio')) ob = '📡 Pasang Pemancar Radio, lalu nyalakan saat siap';
    else if (mod >= 4) ob = '📻 4/4 modul — rakit Pemancar Radio di Meja Kerja (10 besi, 6 komponen)';
    else if (g.day === 1 && !night && g.phase < 0.3 && mod === 0) ob = 'Geledah rumah · tebang pohon · bangun tempat berlindung sebelum gelap';
    else if (night && !red) ob = 'Malam: mereka lebih cepat & lebih banyak. Tetap senyap.';
    else if (red) ob = '🩸 MALAM MERAH — mereka tahu di mana kamu';
    else ob = '📻 Modul Radio ' + mod + '/4 — Pos Polisi, Klinik, Bengkel, Gudang';
    if ($('obj').textContent !== ob) $('obj').textContent = ob;
    // meter suara
    const nz = me.noise, th = [0.5, 2, 4, 6, 9, 14, 22, 30], nb = $('nbars').children; for (let i = 0; i < 8; i++) nb[i].className = nz >= th[i] ? 'on' + (i >= 6 ? ' d' : i >= 4 ? ' w' : '') : '';
    // hotbar
    const hs = JSON.stringify(me.inv.slice(0, 6)) + IN.sel + (me.held && ITEMS[me.held].k === 'gun' ? g.count(me, ITEMS[me.held].ammo) : '');
    if (hs !== this.hsig) { this.hsig = hs; let h = ''; for (let i = 0; i < 6; i++) h += this.slotHTML(me.inv[i], 'data-i="' + i + '"', i === IN.sel ? 'sel' : '', i + 1); $('hot').innerHTML = h; }
    // prompt & aksi
    const pr = app.prompt, pe = $('prompt'); pe.classList.toggle('hidden', !pr || me.dead || this.panelOpen); if (pr) { const t = '<kbd>E</kbd>' + pr.label; if (pe.innerHTML !== t) pe.innerHTML = t; } $('tInt').classList.toggle('glow', !!pr);
    const act = me.act, ab = $('actbar'); let f = 0, lbl = '';
    if (act) { f = Array.isArray(act) ? act[0] / act[1] : act.t / act.T; lbl = 'Menggeledah…'; } else if (me.rl > 0) { f = 1 - me.rl / me.rlT; lbl = 'Mengisi peluru…'; }
    ab.classList.toggle('hidden', !lbl); if (lbl) { ab.querySelector('i').style.width = f * 100 + '%'; ab.querySelector('span').textContent = lbl; }
    $('dead').classList.toggle('hidden', !me.dead || !!g.over); if (me.dead) $('deadTxt').textContent = me.bed ? 'Bangkit di kasurmu…' : g.players.length > 1 ? 'Menunggu fajar untuk bangkit di kemah…' : '';
    $('povLbl').textContent = POV_NAME[app.R.pov];
    if (this.panelOpen) this.renderPanel();
    if (this.panelOpen && me.dead) this.closePanel();
  },
  /* ---------- panel ---------- */
  togglePanel() { this.panelOpen ? this.closePanel() : this.openPanel(); },
  openPanel(tab) { if (!app.me || app.me.dead) return; if (tab) this.tab = tab; this.panelOpen = true; this.pick = -1; this.sig = ''; $('panel').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); this.renderPanel(); },
  closePanel() { this.panelOpen = false; $('panel').classList.add('hidden'); if (app.me && app.me.crate >= 0) { app.cmd({ c: 'cclose' }); app.me.crate = -1; } },
  renderPanel() {
    const me = app.me, g = app.g, size = g.invSize(me), cr = app.crate(), bench = g.nearStation(me, O.BENCH), fire = g.nearStation(me, O.FIRE);
    const sig = JSON.stringify(me.inv) + this.pick + this.tab + JSON.stringify(cr || 0) + bench + fire; if (sig === this.sig) return; this.sig = sig;
    let h = ''; for (let i = 0; i < size; i++) h += this.slotHTML(me.inv[i], 'data-i="' + i + '"', (i < 6 ? 'hotrow ' : '') + (i === this.pick ? 'pick' : ''), i < 6 ? i + 1 : '');
    $('invGrid').innerHTML = h; $('invCap').textContent = me.inv.slice(0, size).filter(Boolean).length + '/' + size + ' · baris atas = sabuk cepat';
    const s = this.pick >= 0 ? me.inv[this.pick] : null; let inf = '<p>Ketuk barang, lalu ketuk slot lain untuk memindahkan. Barang di sabuk cepat dipakai dengan tombol serang.</p>';
    if (s) { const d = ITEMS[s.id]; inf = '<b>' + d.ic + ' ' + d.n + '</b><p>' + d.d + (d.dmg ? ' · Daya ' + d.dmg + (d.pel > 1 ? '×' + d.pel : '') : '') + (d.noise ? ' · Suara ' + d.noise : '') + '</p>' + (d.k === 'food' || d.k === 'med' || d.k === 'use' ? '<button class="ibtn p" data-a="use">Gunakan</button>' : '') + (cr ? '<button class="ibtn" data-a="store">Simpan ke peti</button>' : '') + '<button class="ibtn" data-a="drop">Buang</button>'; }
    $('itemInfo').innerHTML = inf;
    $('crateBox').classList.toggle('hidden', !cr); if (cr) { let c = ''; for (let i = 0; i < cr.length; i++) c += this.slotHTML(cr[i], 'data-c="' + i + '"'); $('crateGrid').innerHTML = c; }
    $('stnLbl').textContent = (bench ? '🛠️ Meja Kerja ' : '') + (fire ? '🔥 Api Unggun' : '') || 'tanpa stasiun di dekatmu';
    const cats = ['Senjata', 'Bangun', 'Bertahan']; $('tabs').innerHTML = cats.map(c => '<button data-t="' + c + '" class="' + (c === this.tab ? 'on' : '') + '">' + c + '</button>').join('');
    let r = '';
    RECIPES.forEach((rc, i) => {
      if (rc.cat !== this.tab) return; const d = ITEMS[rc.out]; let ok = true, need = '';
      for (const k in rc.need) { const have = g.count(me, k), en = have >= rc.need[k]; if (!en) ok = false; need += '<span class="' + (en ? 'ok' : 'no') + '">' + ITEMS[k].ic + ' ' + have + '/' + rc.need[k] + '</span> &nbsp;'; }
      const stOk = !rc.st || (rc.st === 'bench' ? bench : fire);
      r += '<button class="rc ' + (ok && stOk ? 'can' : 'cant') + '" data-r="' + i + '"><span class="ic">' + d.ic + '</span><div><b>' + d.n + (rc.n > 1 ? ' ×' + rc.n : '') + '</b><small>' + need + '</small></div>' + (rc.st ? '<span class="stn" style="' + (stOk ? 'color:var(--ok);border-color:var(--ok)' : '') + '">' + (rc.st === 'bench' ? '🛠️ Meja' : '🔥 Api') + '</span>' : '') + '</button>';
    });
    const sc = $('recipes').scrollTop; $('recipes').innerHTML = r; $('recipes').scrollTop = sc;
  },
  /* ---------- dialog ---------- */
  dialog(html) { this.dlgOpen = true; $('dcard').innerHTML = html; $('dlg').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); },
  closeDlg() { this.dlgOpen = false; $('dlg').classList.add('hidden'); app.paused = false; },
  roomHTML() { if (app.mode !== 'host') return ''; const web = location.protocol.startsWith('http'); return '<p>Kode room — bagikan ke teman:</p><div class="code">' + NET.code + '</div>' + (web ? '<div class="lnk">' + location.href.split('?')[0] + '?room=' + NET.code + '</div>' : '<p>Teman membuka game ini, mengetik kode di atas, lalu menekan GABUNG. (Agar bisa dibuka lewat tautan/HP, unggah folder game ke hosting statis.)</p>') + '<p>' + app.g.players.length + ' pemain di dunia ini. Teman bisa masuk kapan saja.</p>'; },
  showPause() {
    if (!app.g) return; app.paused = true; const solo = app.mode === 'solo';
    this.dialog('<h2 class="amb">' + (solo ? 'JEDA' : 'MENU') + '</h2>' + this.roomHTML() + '<label class="rng">Volume <input type="range" id="vol" min="0" max="100" value="' + Math.round(app.vol * 100) + '"></label><div class="rowb"><button class="big primary" id="dRes">LANJUT</button><button class="big" id="dHelp">CARA MAIN</button></div><button class="big" id="dQuit">' + (app.mode === 'client' ? 'KELUAR' : 'SIMPAN & KELUAR') + '</button>');
    $('dRes').onclick = () => this.closeDlg(); $('dHelp').onclick = () => this.showHelp(true); $('dQuit').onclick = () => app.quit();
    $('vol').oninput = e => { app.vol = e.target.value / 100; SFX.setVol(app.vol); localStorage.setItem('senyap_vol', app.vol); };
  },
  showRoom() { this.dialog('<h2 class="amb">ROOM DIBUAT</h2>' + this.roomHTML() + '<button class="big primary" id="dRes">MULAI BERTAHAN</button>'); $('dRes').onclick = () => this.closeDlg(); },
  showHelp(back) {
    this.dialog('<h2>CARA BERTAHAN</h2><p><b style="color:var(--bone)">Suara adalah segalanya.</b> Berlari, menembak, mendobrak — semuanya terdengar. Lihat meter SUARA. Mengendap, pakai busur & bambu runcing, dan pancing mereka dengan petasan atau kentongan.</p><table>' +
      '<tr><td>Gerak</td><td>WASD · stik kiri</td></tr><tr><td>Bidik / Serang</td><td>Mouse + klik kiri · stik kanan / ⚔</td></tr><tr><td>Interaksi</td><td>E · ✋ — geledah, pintu, masak, tidur</td></tr><tr><td>Lari / Endap</td><td>Shift · C</td></tr><tr><td>Tas & Racik</td><td>Tab · 🎒</td></tr><tr><td>Sabuk cepat</td><td>1–6 · roda mouse</td></tr><tr><td>Isi peluru / Senter</td><td>R · F</td></tr><tr><td>Sudut pandang</td><td>V — Atas · Isometrik · Mata (orang pertama)</td></tr><tr><td>Peta besar</td><td>M · ketuk peta</td></tr></table>' +
      '<p><b style="color:var(--bone)">Siang:</b> geledah kota, tebang pohon (kayu), hancurkan batu & bangkai mobil. <b style="color:var(--bone)">Malam:</b> mereka lebih cepat. Tiap malam ke-3 adalah <b style="color:var(--blood)">Malam Merah</b> — gerombolan datang mendobrak.</p><p><b style="color:var(--bone)">Ancaman:</b> mayat di lantai bisa saja <b style="color:var(--blood)">pura-pura mati</b> — mengendap untuk melewatinya, atau habisi selagi diam (luka 2,5×). Peludah menyembur asam dari jauh, Penerkam melompat dan menjatuhkanmu, Peraung memanggil yang lain, Kembung meledak. Dikerubungi membuatmu lambat. Kiriman Udara (titik jingga) berisi jarahan terbaik, tapi memancing seluruh kota.</p><p><b style="color:var(--bone)">Bangun bebas:</b> pilih bangunan di sabuk cepat lalu serang untuk meletakkan. Pukul bangunanmu untuk membongkar (separuh bahan kembali). Zombie mencari celah — manfaatkan dengan ranjau bambu.</p><p><b style="color:var(--bone)">Tujuan:</b> temukan 4 Modul Radio (Pos Polisi 🟦, Klinik ⬜, Bengkel 🟥, Gudang ◼️ di peta), rakit Pemancar Radio, panggil evakuasi, dan bertahan sampai helikopter tiba.</p>' +
      '<button class="big primary" id="dRes">MENGERTI</button>');
    $('dRes').onclick = () => back ? this.showPause() : this.closeDlg();
  },
  showOver() {
    const g = app.g, me = app.me, win = g.over === 2, kills = g.players.reduce((s, p) => s + p.kills, 0);
    this.dialog('<h2 class="' + (win ? 'grn' : 'red') + '">' + (win ? 'SELAMAT.' : 'SENYAP SELAMANYA') + '</h2><p>' + (win ? 'Helikopter mengangkatmu dari kota mati. Kamu bertahan.' : 'Tak ada yang tersisa untuk mendengar.') + '</p><div class="stat"><div><b>' + g.day + '</b><small>hari bertahan</small></div><div><b>' + kills + '</b><small>zombie tumbang</small></div><div><b>' + me.kills + '</b><small>olehmu</small></div></div><button class="big primary" id="dRes">KE MENU</button>');
    $('dRes').onclick = () => location.reload();
  }
};
