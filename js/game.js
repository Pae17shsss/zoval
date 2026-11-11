'use strict';
/* ===== SENYAP — simulasi (berjalan di host / solo) ===== */
const PR = 0.3;
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 6.283185307; while (d < -Math.PI) d += 6.283185307; return d; }
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

function interactLabel(g, tx, ty, p) {
  const w = g.world; if (!w.inb(tx, ty)) return null; const i = ty * w.W + tx, o = w.o[i], st = w.st[i];
  switch (o) {
    case O.DOOR: case O.P_DOOR: return 'Buka Pintu';
    case O.DOOR_O: case O.P_DOOR_O: return 'Tutup Pintu';
    case O.RAIN: return st > 0 ? 'Ambil Air (' + st + ')' : null;
    case O.PLANT: return st >= 3 ? 'Panen Singkong' : null;
    case O.BED: return 'Tidur / Titik Bangkit';
    case O.CRATE: return 'Buka Peti';
    case O.RADIO: return g.evac.st === 0 ? 'Panggil Evakuasi' : null;
    case O.ALARM: return 'Pukul Kentongan';
    case O.FIRE: return 'Masak';
    case O.BENCH: return 'Racik';
  }
  if (ODEF[o].c && st > 0) return 'Geledah ' + ODEF[o].n;
  if (w.t[i] === T.WATER && g.count(p, 'botol') > 0) return 'Isi Botol';
  return null;
}
function findInteract(g, p) {
  const fx = p.x + Math.cos(p.a) * 0.8, fy = p.y + Math.sin(p.a) * 0.8; let best = null, bd = 1e9;
  const px = Math.floor(p.x), py = Math.floor(p.y);
  for (let ty = py - 2; ty <= py + 2; ty++) for (let tx = px - 2; tx <= px + 2; tx++) {
    if (Math.hypot(tx + .5 - p.x, ty + .5 - p.y) > 2.1) continue;
    const l = interactLabel(g, tx, ty, p); if (!l) continue;
    const d = Math.hypot(tx + .5 - fx, ty + .5 - fy); if (d < bd) { bd = d; best = { tx, ty, label: l, o: g.world.getO(tx, ty) }; }
  }
  return best;
}
function movePlayer(g, p, dt) {
  const inp = p.in, w = g.world; let mx = inp.mx, my = inp.my; const l = Math.hypot(mx, my);
  if (l < 0.12 || p.dead || p.stun > 0) { inp.mv = 0; return; }
  if (l > 1) { mx /= l; my /= l; }
  const sneak = inp.sn, sprint = inp.sp && !sneak && p.st > 2 && !p.exh;
  let sp = sneak ? 1.5 : sprint ? 4.7 : 3.0;
  // dikerubungi = terjepit: makin banyak yang menempel, makin lambat
  let near = 0; for (const z of g.zombies) { if (z.st === 0 || z.gone) continue; if (Math.abs(z.x - p.x) < 1.15 && Math.abs(z.y - p.y) < 1.15) near++; }
  sp *= near >= 3 ? 0.55 : near === 2 ? 0.72 : near === 1 ? 0.9 : 1; if (p.hurtT > 0) sp *= 0.7;
  const o = w.getO(Math.floor(p.x), Math.floor(p.y)); if (o === O.WINDOW_B || o === O.SPIKE) sp *= 0.5;
  if (p.hu <= 0 || p.th <= 0) sp *= 0.8; if (p.hp < 25) sp *= 0.88;
  w.move(p, mx * sp * dt, my * sp * dt, PR);
  inp.mv = sneak ? 1 : sprint ? 3 : 2;
}
function newPlayer(id, name, col, remote) {
  const p = {
    id, name, col, remote: !!remote, x: 0, y: 0, nx: 0, ny: 0, a: 0, hp: 100, st: 100, hu: 88, th: 88, inf: 0, bl: 0, inv: [], sel: 0,
    cd: 0, rl: 0, rlT: 1, rlSlot: -1, in: { mx: 0, my: 0, at: 0, sn: 0, sp: 0, fl: 0, tx: 0, ty: 0, ad: 6, mv: 0, sel: 0 },
    dead: 0, rt: 0, bed: null, noise: 0, act: null, swing: 0, kills: 0, msgs: [], tpc: 0, sleep: 0, bag: 0, stepT: 0, atPrev: 0,
    buff: 0, hurtT: 0, exh: 0, stun: 0, crate: -1, fl: 0, sn: 0, held: '', ff: null, ffT: 0
  };
  for (let i = 0; i < 32; i++) p.inv.push(null);
  return p;
}

class Game {
  constructor(seed) {
    this.seed = seed; this.world = new World(seed);
    this.players = []; this.zombies = []; this.drops = []; this.projs = []; this.fires = []; this.lures = []; this.events = [];
    this.time = CFG.DAY * 0.04; this.rain = 0; this.raining = 0; this.rainT = rnd(150, 300); this.nid = 1;
    this.crates = new Map(); this.tickers = new Set(); this.evac = { st: 0, t: 0, x: 0, y: 0 };
    this.over = 0; this.dirT = 0; this.tickT = 0; this.wasNight = false; this.client = false; this.dropsVer = 0; this.multi = false;
    this.di = 1; this.diff = DIFFS[1]; this.packT = rnd(200, 300); this.sniffT = 20; this.air = null; this.airT = CFG.DAY * 0.45;
  }
  setDiff(i) { this.di = clamp(i | 0, 0, DIFFS.length - 1); this.diff = DIFFS[this.di]; }
  get day() { return Math.floor(this.time / CFG.DAY) + 1; }
  get phase() { return (this.time % CFG.DAY) / CFG.DAY; }
  get isNight() { return this.phase >= CFG.NIGHT_AT; }
  get horde() { return this.isNight && this.day % CFG.HORDE_EVERY === 0; }
  get dark() { const p = this.phase, s = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }; return s(0.52, 0.62, p) * (1 - s(0.955, 1, p)); }
  get clock() { const h = (6 + this.phase * 24) % 24, hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  ev(k, x, y, ex) { const e = { k, x: r1(x || 0), y: r1(y || 0) }; if (ex) Object.assign(e, ex); this.events.push(e); }
  pById(id) { for (const p of this.players) if (p.id === id) return p; return null; }

  /* ---------- pemain & tas ---------- */
  addPlayer(id, name, col, remote) {
    const p = newPlayer(id, name, col, remote), s = this.world.spawn;
    const k = this.players.length; p.x = p.nx = s.x + Math.cos(k * 1.3) * (k ? 1.2 : 0); p.y = p.ny = s.y + Math.sin(k * 1.3) * (k ? 1.2 : 0);
    this.players.push(p);
    this.addItem(p, 'pentungan'); this.addItem(p, 'perban', 2); this.addItem(p, 'air', 1); this.addItem(p, 'biskuit', 2); this.addItem(p, 'senter');
    return p;
  }
  removePlayer(id) { const p = this.pById(id); if (!p) return; if (!p.dead) this.dropAll(p); this.players = this.players.filter(q => q !== p); }
  invSize(p) { return p.bag ? 32 : 24; }
  count(p, id) { let n = 0; for (const s of p.inv) if (s && s.id === id) n += s.n; return n; }
  remove(p, id, n) { for (let i = p.inv.length - 1; i >= 0 && n > 0; i--) { const s = p.inv[i]; if (s && s.id === id) { const t = Math.min(n, s.n); s.n -= t; n -= t; if (s.n <= 0) p.inv[i] = null; } } }
  mkSlot(id, n, ex) { const d = ITEMS[id], s = { id, n }; if (d.dur) s.d = ex && ex.d !== undefined ? ex.d : d.dur; if (d.k === 'gun') s.m = ex && ex.m !== undefined ? ex.m : 0; return s; }
  addItem(p, id, n = 1, ex) {
    const d = ITEMS[id], size = this.invSize(p);
    if (d.st > 1) for (let i = 0; i < size && n > 0; i++) { const s = p.inv[i]; if (s && s.id === id && s.n < d.st) { const t = Math.min(n, d.st - s.n); s.n += t; n -= t; } }
    for (let i = 0; i < size && n > 0; i++) if (!p.inv[i]) { const t = Math.min(n, d.st); p.inv[i] = this.mkSlot(id, t, ex); n -= t; }
    return n;
  }
  giveOrDrop(p, id, n = 1, ex) { const l = this.addItem(p, id, n, ex); if (l > 0) this.drop(p.x, p.y, id, l, ex, 1.5); return l; }
  drop(x, y, it, n, ex, pk) { this.drops.push({ id: this.nid++, x: x + rnd(-.3, .3), y: y + rnd(-.3, .3), it, n, d: ex && ex.d, m: ex && ex.m, t: 900, pk: pk || 0 }); this.dropsVer++; }
  dropAll(p) { for (let i = 0; i < p.inv.length; i++) { const s = p.inv[i]; if (s) { this.drop(p.x + rnd(-.5, .5), p.y + rnd(-.5, .5), s.id, s.n, s, 1); p.inv[i] = null; } } }
  msg(p, t) { if (p.msgs.length < 8) p.msgs.push(t); }
  nearStation(p, o) { const w = this.world, px = Math.floor(p.x), py = Math.floor(p.y); for (let y = py - 3; y <= py + 3; y++) for (let x = px - 3; x <= px + 3; x++) if (w.getO(x, y) === o) return true; return false; }

  /* ---------- perintah diskret ---------- */
  cmd(p, c) {
    if (!p || p.dead || this.over) return;
    const size = this.invSize(p);
    switch (c.c) {
      case 'int': this.interact(p, c.tx | 0, c.ty | 0); break;
      case 'rl': this.reload(p); break;
      case 'craft': this.craft(p, c.r | 0); break;
      case 'swap': { const i = c.i | 0, j = c.j | 0; if (i >= 0 && j >= 0 && i < size && j < size && i !== j) { const a = p.inv[i], b = p.inv[j]; if (a && b && a.id === b.id && ITEMS[a.id].st > 1) { const t = Math.min(a.n, ITEMS[a.id].st - b.n); b.n += t; a.n -= t; if (a.n <= 0) p.inv[i] = null; } else { p.inv[i] = b; p.inv[j] = a; } } break; }
      case 'drop': { const s = p.inv[c.i | 0]; if (s) { this.drop(p.x + Math.cos(p.a) * .8, p.y + Math.sin(p.a) * .8, s.id, s.n, s, 2); p.inv[c.i | 0] = null; } break; }
      case 'use': this.useItem(p, c.i | 0); break;
      case 'xfer': this.xfer(p, c.f | 0, c.i | 0); break;
      case 'cclose': p.crate = -1; break;
    }
  }
  useItem(p, i) {
    const s = p.inv[i]; if (!s) return false; const d = ITEMS[s.id];
    if (d.k === 'use') { if (s.id === 'tas') { if (p.bag) { this.msg(p, 'Kamu sudah memakai ransel.'); return false; } p.bag = 1; this.msg(p, 'Ransel terpasang: +8 slot.'); } }
    else if (d.k === 'food' || d.k === 'med') {
      if (d.hu) p.hu = clamp(p.hu + d.hu, 0, 100); if (d.th) p.th = clamp(p.th + d.th, 0, 100);
      if (d.hp) p.hp = clamp(p.hp + d.hp, 1, 100); if (d.bl) p.bl = 0;
      if (d.inf && p.inf > 0) { p.inf = Math.max(0, p.inf + d.inf); if (p.inf <= 0) this.msg(p, 'Infeksi sembuh.'); }
      if (d.buff) p.buff = Math.max(p.buff, d.buff);
      if (d.bad) this.msg(p, 'Perutmu melilit… rebus air dulu lain kali.');
      this.ev(d.th && !d.hu ? 'drink' : d.k === 'med' ? 'heal' : 'eat', p.x, p.y, { pid: p.id });
    } else return false;
    s.n--; if (s.n <= 0) p.inv[i] = null;
    if (d.ret) this.giveOrDrop(p, d.ret, 1);
    return true;
  }
  craft(p, ri) {
    const r = RECIPES[ri]; if (!r) return;
    if (r.st === 'bench' && !this.nearStation(p, O.BENCH)) return this.msg(p, 'Butuh Meja Kerja di dekatmu.');
    if (r.st === 'fire' && !this.nearStation(p, O.FIRE)) return this.msg(p, 'Butuh Api Unggun di dekatmu.');
    for (const k in r.need) if (this.count(p, k) < r.need[k]) return this.msg(p, 'Bahan kurang: ' + ITEMS[k].n);
    for (const k in r.need) this.remove(p, k, r.need[k]);
    if (r.need.air && r.out !== 'air') this.giveOrDrop(p, 'botol', r.need.air);
    this.giveOrDrop(p, r.out, r.n);
    this.ev('craft', p.x, p.y, { pid: p.id });
  }
  xfer(p, from, i) {
    const cr = this.crates.get(p.crate); if (!cr) return;
    if (from === 0) { const s = p.inv[i]; if (!s) return; const j = cr.indexOf(null); const d = ITEMS[s.id]; const ex = d.st > 1 ? cr.find(c => c && c.id === s.id && c.n + s.n <= d.st) : null; if (ex) { ex.n += s.n; p.inv[i] = null; } else if (j >= 0) { cr[j] = s; p.inv[i] = null; } else this.msg(p, 'Peti penuh.'); }
    else { const s = cr[i]; if (!s) return; const l = this.addItem(p, s.id, s.n, s); if (l <= 0) cr[i] = null; else { s.n = l; this.msg(p, 'Tas penuh.'); } }
  }
  reload(p) {
    const s = p.inv[p.sel]; if (!s || p.rl > 0) return; const d = ITEMS[s.id]; if (d.k !== 'gun') return;
    if (s.m >= d.mag) return; if (this.count(p, d.ammo) <= 0) return this.msg(p, 'Tidak ada ' + ITEMS[d.ammo].n + '.');
    p.rl = p.rlT = d.rl; p.rlSlot = p.sel; this.ev('reload', p.x, p.y, { pid: p.id });
  }
  interact(p, tx, ty) {
    const w = this.world; if (!w.inb(tx, ty) || Math.hypot(tx + .5 - p.x, ty + .5 - p.y) > 2.4) return;
    if (!interactLabel(this, tx, ty, p)) return;
    const i = w.idx(tx, ty), o = w.o[i], cx = tx + .5, cy = ty + .5;
    const occupied = () => this.players.some(q => !q.dead && Math.abs(q.x - cx) < .5 + PR && Math.abs(q.y - cy) < .5 + PR) || this.zombies.some(z => Math.abs(z.x - cx) < .5 + z.r && Math.abs(z.y - cy) < .5 + z.r);
    switch (o) {
      case O.DOOR: w.setObj(tx, ty, O.DOOR_O, w.hp[i]); this.ev('door', cx, cy); this.noise(cx, cy, 4); return;
      case O.P_DOOR: w.setObj(tx, ty, O.P_DOOR_O, w.hp[i]); this.ev('door', cx, cy); this.noise(cx, cy, 4); return;
      case O.DOOR_O: if (occupied()) return; w.setObj(tx, ty, O.DOOR, w.hp[i]); this.ev('door', cx, cy); this.noise(cx, cy, 4); return;
      case O.P_DOOR_O: if (occupied()) return; w.setObj(tx, ty, O.P_DOOR, w.hp[i]); this.ev('door', cx, cy); this.noise(cx, cy, 4); return;
      case O.RAIN: this.giveOrDrop(p, 'air', w.st[i]); w.st[i] = 0; w.touch(i); this.ev('pick', cx, cy, { pid: p.id }); return;
      case O.PLANT: this.giveOrDrop(p, 'singkong', rint(2, 3)); w.st[i] = 0; w.meta.set(i, 0); w.touch(i); this.ev('pick', cx, cy, { pid: p.id }); return;
      case O.BED:
        p.bed = { x: tx, y: ty };
        if (!this.isNight) return this.msg(p, 'Titik bangkit diatur. Tidur hanya bisa di malam hari.');
        if (this.horde || this.evac.st === 1) return this.msg(p, 'Tak mungkin tidur — mereka datang.');
        if (this.zombies.some(z => Math.hypot(z.x - p.x, z.y - p.y) < 10)) return this.msg(p, 'Terlalu berbahaya: ada zombie di dekat sini.');
        p.sleep = 1; this.msg(p, this.multi ? 'Tidur… (malam terlewati bila semua tidur)' : 'Tidur…'); return;
      case O.CRATE: p.crate = i; return;
      case O.RADIO: this.evac = { st: 1, t: 150, x: cx, y: cy }; this.ev('evac', cx, cy, { st: 1 }); return;
      case O.ALARM: this.lures.push({ x: cx, y: cy, t: 6, r: 30, k: 'alarm', n: 0 }); return;
      case O.FIRE: case O.BENCH: return;
    }
    if (ODEF[o].c) { p.act = { k: 'search', tx, ty, t: 0, T: 1.5 }; this.ev('search', cx, cy, { pid: p.id }); this.noise(cx, cy, 2.5); return; }
    if (w.t[i] === T.WATER) { const n = Math.min(this.count(p, 'botol'), 3); this.remove(p, 'botol', n); this.giveOrDrop(p, 'air_kotor', n); this.ev('drink', p.x, p.y, { pid: p.id }); }
  }
  finishSearch(p, a) {
    const w = this.world, i = w.idx(a.tx, a.ty), o = w.o[i], st = w.st[i]; if (!ODEF[o].c || st < 1) return;
    const tb = LOOT[o], tot = tb.reduce((s, e) => s + e[1], 0), got = {};
    const rolls = o === O.AIRDROP ? 6 : Math.max(1, Math.round(rint(1, 3) * this.diff.l + 0.2));
    for (let n = 0; n < rolls; n++) { let r = Math.random() * tot; for (const e of tb) { r -= e[1]; if (r <= 0) { got[e[0]] = (got[e[0]] || 0) + rint(e[2], e[3]); break; } } }
    if (st === 2) got.modul = 1;
    const txt = [];
    for (const k in got) { const d = ITEMS[k]; const n = d.st === 1 ? 1 : got[k]; this.giveOrDrop(p, k, n, d.k === 'gun' ? { m: rint(0, d.mag) } : d.dur ? { d: Math.round(d.dur * rnd(.4, 1)) } : null); txt.push(d.ic + ' ' + d.n + (n > 1 ? ' ×' + n : '')); }
    this.msg(p, '＋ ' + txt.join(' · '));
    w.st[i] = 0; w.touch(i); this.ev('loot', p.x, p.y, { pid: p.id });
    if (o === O.AIRDROP) { w.setObj(a.tx, a.ty, O.NONE); this.air = null; }
  }

  /* ---------- suara: inti permainan ---------- */
  noise(x, y, r, strong) {
    r *= this.rain > 0.5 ? 0.85 : 1.15;
    for (const z of this.zombies) {
      if (z.h) continue; const d = Math.hypot(z.x - x, z.y - y); if (d > r) continue;
      if (z.st === 0) { if (d < r * 0.5) { z.st = 2; z.tx = x; z.ty = y; z.stag = 0.9; z.idle = 0; this.ev('groan', z.x, z.y, { zk: z.k }); } continue; }
      if (z.st === 3 && !(strong && z.lost > 0)) continue;
      z.st = 2; z.tx = x + rnd(-1.4, 1.4); z.ty = y + rnd(-1.4, 1.4); z.idle = 0;
    }
  }
  pnoise(p, r) { if (this.world.getO(Math.floor(p.x), Math.floor(p.y)) === O.BUSH) r *= 0.6; p.noise = Math.max(p.noise, r); this.noise(p.x, p.y, r); }

  /* ---------- serangan pemain ---------- */
  attack(p, dt) {
    const inp = p.in, s = p.inv[p.sel], d = s ? ITEMS[s.id] : FIST, w = this.world, edge = inp.at && !p.atPrev;
    if (!inp.at || p.cd > 0 || p.act) return;
    if (p.sleep) { p.sleep = 0; return; }
    const k = s ? d.k : 'melee';
    if (k === 'food' || k === 'med' || k === 'use') { if (edge) { this.useItem(p, p.sel); p.cd = 0.5; } return; }
    if (k === 'place') { this.place(p, s, d, inp.tx | 0, inp.ty | 0, edge); return; }
    if (k === 'throw') {
      if (!edge) return;
      const dist = Math.max(1, Math.min(clamp(inp.ad, 2, 9), w.rayDist(p.x, p.y, p.a, 9) - 0.4));
      const ex = p.x + Math.cos(p.a) * dist, ey = p.y + Math.sin(p.a) * dist;
      this.projs.push({ id: this.nid++, k: s.id, sx: p.x, sy: p.y, ex, ey, x: p.x, y: p.y, z: 0.6, t: 0, T: 0.3 + dist * 0.07 });
      s.n--; if (s.n <= 0) p.inv[p.sel] = null; p.cd = 0.6; p.swing = 0.25; this.ev('swing', p.x, p.y, { pid: p.id }); return;
    }
    if (k === 'gun') {
      if (p.rl > 0) return;
      if (s.m <= 0) { if (edge) { if (this.count(p, d.ammo) > 0) this.reload(p); else { this.ev('click', p.x, p.y, { pid: p.id }); p.cd = 0.3; } } return; }
      s.m--; p.cd = d.cd; s.d--;
      const ox = p.x + Math.cos(p.a) * 0.4, oy = p.y + Math.sin(p.a) * 0.4;
      for (let n = 0; n < d.pel; n++) {
        const a = p.a + (Math.random() - .5) * d.spr * (inp.mv === 3 ? 2 : inp.sn ? 0.6 : 1), dx = Math.cos(a), dy = Math.sin(a);
        let best = null, bt = w.rayDist(p.x, p.y, a, d.rng);
        for (const z of this.zombies) { const vx = z.x - p.x, vy = z.y - p.y, t = vx * dx + vy * dy; if (t < 0 || t > bt) continue; if (Math.abs(vx * dy - vy * dx) < z.r + 0.12) { best = z; bt = t; } }
        this.ev('shot', ox, oy, { x2: r1(p.x + dx * bt), y2: r1(p.y + dy * bt), g: s.id, pid: p.id, n });
        if (best) this.damageZ(best, d.dmg * (Math.random() < 0.15 ? 2 : 1), p, a, 0.25);
      }
      this.pnoise(p, d.noise);
      if (s.d <= 0) { p.inv[p.sel] = null; this.msg(p, d.n + ' rusak!'); }
      return;
    }
    // jarak dekat
    const tired = p.st < d.sta; p.st = Math.max(0, p.st - d.sta); p.cd = d.cd * (tired ? 1.6 : 1); p.swing = 0.25;
    this.ev('swing', p.x, p.y, { pid: p.id });
    let hit = false; const dmg = d.dmg * (tired ? 0.55 : 1);
    for (const z of this.zombies) {
      const dx = z.x - p.x, dy = z.y - p.y, dist = Math.hypot(dx, dy); if (dist > d.rng + z.r) continue;
      if (dist > 0.5 && Math.abs(angDiff(Math.atan2(dy, dx), p.a)) > d.arc / 2 + 0.2) continue;
      const back = Math.abs(angDiff(z.a, p.a)) < 1 && z.st !== 3;
      this.damageZ(z, dmg * (back ? 2.5 : 1), p, p.a, d.kb); hit = true;
    }
    if (!hit) {
      const def = { dmg, tree: d.tree, obj: d.obj };
      for (const r of [0.75, 1.35]) { if (r > d.rng + 0.3) break; const tx = Math.floor(p.x + Math.cos(p.a) * r), ty = Math.floor(p.y + Math.sin(p.a) * r); if (tx === Math.floor(p.x) && ty === Math.floor(p.y) && !ODEF[w.getO(tx, ty)].pl) continue; if (this.hitObj(p, tx, ty, def)) { hit = true; break; } }
    }
    this.pnoise(p, hit ? d.noise + 2 : d.noise * 0.6);
    if (hit && s && d.dur) { s.d--; if (s.d <= 0) { p.inv[p.sel] = null; this.msg(p, d.n + ' rusak!'); this.ev('break', p.x, p.y); } }
  }
  hitObj(p, tx, ty, def) {
    const w = this.world; if (!w.inb(tx, ty)) return false; const i = w.idx(tx, ty), o = w.o[i], d = ODEF[o], cx = tx + .5, cy = ty + .5;
    if (!o || o === O.WINDOW_B || o === O.DOOR_O) return false;
    if (o === O.WALL || d.c) { this.ev('thud', cx, cy); return true; }
    let dm = def.dmg; if (o === O.TREE) dm *= def.tree || 1; else if (o !== O.BUSH && o !== O.WINDOW) dm *= def.obj || 1;
    this.ev(o === O.TREE || o === O.BUSH ? 'chop' : 'thud', cx, cy);
    const hp = w.hp[i] - dm;
    if (hp > 0) { w.hp[i] = hp; w.touch(i); if (o === O.TREE && Math.random() < 0.3) this.giveOrDrop(p, 'kayu', 1); return true; }
    if (o === O.TREE) this.giveOrDrop(p, 'kayu', rint(3, 4));
    else if (o === O.ROCK) this.giveOrDrop(p, 'batu', rint(3, 4));
    else if (o === O.BUSH) { this.giveOrDrop(p, 'kayu', 1); if (Math.random() < 0.45) this.giveOrDrop(p, 'tali', 1); }
    else if (o === O.CAR) { this.giveOrDrop(p, 'besi', rint(3, 5)); this.giveOrDrop(p, 'paku', rint(1, 3)); if (Math.random() < 0.6) this.giveOrDrop(p, 'komponen', rint(1, 2)); if (Math.random() < 0.35) this.giveOrDrop(p, 'bensin', 1); }
    this.destroyObj(tx, ty, p); this.noise(cx, cy, 8);
    return true;
  }
  destroyObj(tx, ty, p) {
    const w = this.world, i = w.idx(tx, ty), o = w.o[i], cx = tx + .5, cy = ty + .5;
    if (o === O.WINDOW) { w.setObj(tx, ty, O.WINDOW_B); this.ev('glass', cx, cy); this.noise(cx, cy, 12); return; }
    if (o === O.CRATE) { const cr = this.crates.get(i); if (cr) for (const s of cr) if (s) this.drop(cx, cy, s.id, s.n, s); this.crates.delete(i); }
    if (o === O.RADIO && this.evac.st === 1) { this.evac.st = 0; this.ev('evac', cx, cy, { st: 0 }); }
    this.tickers.delete(i); w.meta.delete(i);
    if (p && REFUND[o]) for (const k in REFUND[o]) { const n = Math.floor(REFUND[o][k] / 2); if (n > 0) this.giveOrDrop(p, k, n); }
    w.setObj(tx, ty, O.NONE); this.ev('break', cx, cy);
  }
  place(p, s, d, tx, ty, edge) {
    const w = this.world, o = d.o, cx = tx + .5, cy = ty + .5;
    if (!w.inb(tx, ty) || Math.hypot(cx - p.x, cy - p.y) > CFG.REACH + 0.5) return;
    const i = w.idx(tx, ty); if (w.o[i] !== O.NONE || w.t[i] === T.WATER) return;
    if (ODEF[o].solid && (this.players.some(q => !q.dead && Math.abs(q.x - cx) < .5 + PR && Math.abs(q.y - cy) < .5 + PR) || this.zombies.some(z => Math.abs(z.x - cx) < .5 + z.r && Math.abs(z.y - cy) < .5 + z.r))) return;
    if (o === O.RADIO) { for (const c of w.changed) if (w.o[c] === O.RADIO) return this.msg(p, 'Pemancar sudah berdiri.'); }
    w.setObj(tx, ty, o);
    if (o === O.RAIN || o === O.PLANT) { this.tickers.add(i); w.meta.set(i, 0); }
    if (o === O.CRATE) this.crates.set(i, new Array(16).fill(null));
    s.n--; if (s.n <= 0) p.inv[p.sel] = null; p.cd = 0.22;
    this.ev('build', cx, cy); this.pnoise(p, 5);
  }

  /* ---------- zombie ---------- */
  spawnZ(k, x, y, h) {
    const t = ZT[k], hp = t.hp * (1 + (this.day - 1) * 0.06);
    const z = { id: this.nid++, k, x, y, a: rnd(0, 6.28), hp, mhp: hp, r: t.r, st: 1, tx: x, ty: y, tid: 0, lx: x, ly: y, lost: 0, cd: rnd(0, 1), wind: 0, stag: 0, sense: rnd(0, .4), idle: rnd(0, 4), wand: 0, scr: 0, ocd: 0, spk: 0, h: h ? 1 : 0, stuck: 0, lcd: rnd(0, 0.8), leap: 0, leapQ: 0, lvx: 0, lvy: 0, scd: rnd(1, 2) };
    this.zombies.push(z); return z;
  }
  rollType(horde) {
    const d = this.day, n = this.isNight; const wts = [60, 7 + d * 3.5 * (n ? 2 : 1), d >= 2 ? 6 : 0, d >= 2 ? 7 : 0, d >= 3 ? (horde ? 3 + d * .6 : 1.5) : 0, d >= 2 ? 5 + d : 0, d >= 2 ? (4 + d) * (n ? 1.6 : 1) : 0];
    let r = Math.random() * wts.reduce((a, b) => a + b, 0); for (let i = 0; i < wts.length; i++) { r -= wts[i]; if (r <= 0) return i; } return 0;
  }
  director() {
    const al = this.players.filter(p => !p.dead); if (!al.length) return;
    const w = this.world, day = this.day, horde = this.horde || this.evac.st === 1, pm = 0.6 + 0.4 * al.length;
    for (let i = this.zombies.length - 1; i >= 0; i--) { const z = this.zombies[i]; if (z.h) continue; let near = false; for (const p of al) if (Math.abs(p.x - z.x) < 44 && Math.abs(p.y - z.y) < 44) { near = true; break; } if (!near) this.zombies.splice(i, 1); }
    const dz = this.diff.z, target = Math.min(110, (11 + day * 4) * (this.isNight ? 1.8 : 1) * pm * dz), cap = horde ? Math.min(140, (32 + day * 9) * pm * dz) : target;
    let tries = horde ? 5 : 3;
    while (tries-- > 0 && this.zombies.length < cap) {
      const p = al[Math.floor(Math.random() * al.length)], a = rnd(0, 6.283), d = horde ? rnd(15, 21) : rnd(17, 27);
      const x = Math.floor(p.x + Math.cos(a) * d), y = Math.floor(p.y + Math.sin(a) * d);
      if (!w.inb(x, y) || w.solid(x, y)) continue; const i = w.idx(x, y);
      if (!horde && !w.town[i] && Math.random() > 0.4) continue;
      if (horde && w.bld[i]) continue;
      if (al.some(q => Math.hypot(q.x - x, q.y - y) < 14)) continue;
      const z = this.spawnZ(this.rollType(horde), x + .5, y + .5, horde);
      if (horde) { z.st = 3; z.tid = p.id; }
      else if (w.bld[i] && z.k !== 4 && Math.random() < 0.5) z.st = 0; // pura-pura mati di dalam bangunan
    }
    // malam: yang berkeliaran mengendus ke arah pemain
    if (this.isNight && !horde) { this.sniffT--; if (this.sniffT <= 0) { this.sniffT = rnd(12, 22); const p = al[Math.floor(Math.random() * al.length)]; for (const z of this.zombies) if (z.st === 1 && Math.random() < 0.35 && Math.hypot(z.x - p.x, z.y - p.y) < 40) { z.st = 2; z.tx = p.x + rnd(-7, 7); z.ty = p.y + rnd(-7, 7); } } }
    // siang: gerombolan pengembara melintas
    if (!this.isNight && day >= 2 && !horde) { this.packT--; if (this.packT <= 0) { this.packT = rnd(170, 280) / dz; const p = al[Math.floor(Math.random() * al.length)], a = rnd(0, 6.283), n = Math.round((5 + day * 1.5) * dz); let made = 0; for (let k = 0; k < n * 3 && made < n; k++) { const x = Math.floor(p.x + Math.cos(a) * 25 + rnd(-4, 4)), y = Math.floor(p.y + Math.sin(a) * 25 + rnd(-4, 4)); if (!w.inb(x, y) || w.solid(x, y)) continue; const z = this.spawnZ(this.rollType(false), x + .5, y + .5, 0); z.st = 2; z.tx = p.x + rnd(-3, 3); z.ty = p.y + rnd(-3, 3); made++; } if (made) this.ev('pack', p.x, p.y); } }
    // kiriman udara: jarahan besar, tapi seluruh kota mendengarnya
    this.airT--;
    if (this.air) { this.air.t--; const ax = Math.floor(this.air.x), ay = Math.floor(this.air.y); if (this.air.t <= 0 || w.getO(ax, ay) !== O.AIRDROP) { if (w.getO(ax, ay) === O.AIRDROP) w.setObj(ax, ay, O.NONE); this.air = null; } }
    else if (this.airT <= 0 && !this.isNight) { for (let k = 0; k < 80; k++) { const x = rint(32, 128), y = rint(32, 128), i = w.idx(x, y); if (w.t[i] !== T.ROAD || w.o[i] || al.some(q => Math.hypot(q.x - x, q.y - y) < 14)) continue; w.setObj(x, y, O.AIRDROP, 0, 1); this.air = { x: x + .5, y: y + .5, t: 300 }; this.lures.push({ x: x + .5, y: y + .5, t: 22, r: 36, k: 'drop', n: 0 }); this.ev('airdrop', x + .5, y + .5); this.airT = CFG.DAY * rnd(1.1, 1.6); break; } }
  }
  flow(p) {
    const R = 24, S = R * 2 + 1, w = this.world; let f = p.ff; if (!f) f = p.ff = { d: new Float32Array(S * S), ox: 0, oy: 0, S, hk: [], hv: [] };
    const ox = f.ox = Math.floor(p.x) - R, oy = f.oy = Math.floor(p.y) - R, D = f.d, hk = f.hk, hv = f.hv; D.fill(1e9); hk.length = 0; hv.length = 0;
    const push = (k, v) => { let i = hk.length; hk.push(k); hv.push(v); while (i > 0) { const pa = (i - 1) >> 1; if (hk[pa] <= k) break; hk[i] = hk[pa]; hv[i] = hv[pa]; i = pa; } hk[i] = k; hv[i] = v; };
    const pop = () => { const v = hv[0], lk = hk.pop(), lv = hv.pop(), n = hk.length; if (n) { let i = 0; for (; ;) { let c = i * 2 + 1; if (c >= n) break; if (c + 1 < n && hk[c + 1] < hk[c]) c++; if (hk[c] >= lk) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = lk; hv[i] = lv; } return v; };
    const s0 = R * S + R; D[s0] = 0; push(0, s0);
    const NX = [1, -1, 0, 0], NY = [0, 0, 1, -1];
    while (hk.length) {
      const k = hk[0], c = pop(); if (k > D[c]) continue; const cx = c % S, cy = (c / S) | 0;
      for (let n = 0; n < 4; n++) {
        const x = cx + NX[n], y = cy + NY[n]; if (x < 0 || y < 0 || x >= S || y >= S) continue;
        const wx = ox + x, wy = oy + y; if (!w.inb(wx, wy)) continue; const wi = wy * w.W + wx; if (w.t[wi] === T.WATER) continue;
        const od = ODEF[w.o[wi]]; let cost = 1; if (od.solid) { if (!od.brk) continue; cost = 5 + w.hp[wi] / 25; }
        const nd = k + cost, ni = y * S + x; if (nd < D[ni]) { D[ni] = nd; push(nd, ni); }
      }
    }
  }
  flowDir(z, f) {
    if (!f) return null; const S = f.S, cx = Math.floor(z.x) - f.ox, cy = Math.floor(z.y) - f.oy; if (cx < 1 || cy < 1 || cx >= S - 1 || cy >= S - 1) return null;
    const D = f.d, cur = D[cy * S + cx]; if (cur >= 1e9 || cur === 0) return null; const w = this.world;
    let bx = 0, by = 0, bd = cur;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const d = D[(cy + dy) * S + cx + dx]; if (d >= bd) continue;
      if (dx && dy && (w.solid(f.ox + cx + dx, f.oy + cy) || w.solid(f.ox + cx, f.oy + cy + dy))) continue;
      bd = d; bx = dx; by = dy;
    }
    if (!bx && !by) return null;
    return [f.ox + cx + bx + .5 - z.x, f.oy + cy + by + .5 - z.y];
  }
  damageZ(z, dmg, p, a, kb) {
    if (z.hp <= 0) return; z.hp -= dmg; z.stag = Math.max(z.stag, ZT[z.k].hp > 300 ? 0.05 : 0.22); z.hitT = 2;
    if (kb && ZT[z.k].hp < 300) this.world.move(z, Math.cos(a) * kb, Math.sin(a) * kb, z.r);
    this.ev('hitz', z.x, z.y);
    if (p && z.st !== 3) { z.st = 3; z.tid = p.id; z.lx = p.x; z.ly = p.y; z.lost = 0; }
    if (z.hp <= 0) this.killZ(z, p);
  }
  killZ(z, p) {
    z.hp = 0; z.gone = 1; if (p) p.kills++;
    this.ev('zdie', z.x, z.y, { zk: z.k });
    if (z.k === 3) this.explode(z.x, z.y, z);
    const r = Math.random();
    if (r < 0.1) this.drop(z.x, z.y, 'kain', 1); else if (r < 0.14) this.drop(z.x, z.y, 'peluru9', rint(1, 4)); else if (r < 0.17) this.drop(z.x, z.y, 'perban', 1); else if (r < 0.19) this.drop(z.x, z.y, 'biskuit', 1);
    if (z.k === 4) { this.drop(z.x, z.y, 'p3k', 1); this.drop(z.x, z.y, 'peluru12', rint(3, 6)); }
  }
  explode(x, y, src) {
    this.ev('boom', x, y); this.noise(x, y, 18, true);
    for (const p of this.players) if (!p.dead && Math.hypot(p.x - x, p.y - y) < 2.6) { this.hurt(p, 22, null); p.inf = Math.max(p.inf, 4) + 8; }
    for (const z of this.zombies) if (z !== src && !z.gone && Math.hypot(z.x - x, z.y - y) < 2.4) this.damageZ(z, 60, null, Math.atan2(z.y - y, z.x - x), 0.8);
  }
  hurt(p, dmg, z) {
    if (p.dead) return; p.hp -= dmg; p.hurtT = 0.45; p.act = null; p.sleep = 0; p.st = Math.max(0, p.st - 7);
    this.ev('hurt', p.x, p.y, { pid: p.id });
    if (z) { const t = ZT[z.k]; if (Math.random() < t.bite) { if (p.inf <= 0) this.msg(p, '☣ Kamu TERGIGIT. Cari antibiotik.'); p.inf = Math.max(p.inf, 3) + 10; } if (Math.random() < 0.25) { if (p.bl <= 0) this.msg(p, '🩸 Pendarahan! Gunakan perban.'); p.bl = 40; } }
    if (p.hp <= 0) this.killP(p, false);
  }
  killP(p, turned) {
    p.hp = 0; p.dead = 1; p.rt = 5; p.act = null; p.sleep = 0; p.crate = -1; this.dropAll(p); p.bag = 0;
    this.ev('pdie', p.x, p.y, { pid: p.id, name: p.name });
    if (turned) this.spawnZ(0, p.x, p.y, 0);
  }
  bedOk(p) { return p.bed && this.world.getO(p.bed.x, p.bed.y) === O.BED; }
  tryRespawn(p) {
    let x, y;
    if (this.bedOk(p)) { x = p.bed.x + .5; y = p.bed.y + .5; }
    else if (this.players.some(q => !q.dead)) { if (this.isNight) { p.rt = 1; return; } x = this.world.spawn.x; y = this.world.spawn.y; }
    else if (this.players.some(q => q.dead && this.bedOk(q))) { p.rt = 1; return; }
    else { this.over = 1; return; }
    Object.assign(p, { x, y, nx: x, ny: y, hp: 60, st: 100, hu: 55, th: 55, inf: 0, bl: 0, dead: 0, cd: 0, rl: 0, exh: 0 }); p.tpc++;
    this.addItem(p, 'pentungan'); this.msg(p, 'Kamu bangkit. Barangmu tertinggal di tempat kematian.');
  }
  updZ(z, dt) {
    const t = ZT[z.k], w = this.world;
    if (z.hitT > 0) z.hitT -= dt;
    const dm = this.diff.d * (1 + (this.day - 1) * 0.04);
    if (z.stag > 0) { z.stag -= dt; if (z.stag <= 0 && z.leapQ) { z.leapQ = 0; z.leap = 0.5; z.lvx = Math.cos(z.a) * 13; z.lvy = Math.sin(z.a) * 13; } return; }
    if (z.leap > 0) { // terkaman Penerkam
      z.leap -= dt; const mv = w.move(z, z.lvx * dt, z.lvy * dt, z.r);
      for (const p of this.players) if (!p.dead && Math.hypot(p.x - z.x, p.y - z.y) < z.r + PR + 0.2) { this.hurt(p, 16 * dm, z); p.stun = 0.9; this.msg(p, 'Kamu DITERKAM!'); this.ev('bite', p.x, p.y); z.leap = 0; z.cd = 1.2; break; }
      if (mv < 13 * dt * 0.3) z.leap = 0; return;
    }
    if (z.st === 0) { // pura-pura mati sampai kamu cukup dekat
      z.sense -= dt; if (z.sense > 0) return; z.sense = 0.2;
      for (const p of this.players) if (!p.dead && Math.hypot(p.x - z.x, p.y - z.y) < (p.in.sn ? 1.3 : 2.8)) { z.st = 3; z.tid = p.id; z.lx = p.x; z.ly = p.y; z.lost = 0; z.stag = 0.8; z.a = Math.atan2(p.y - z.y, p.x - z.x); this.ev('groan', z.x, z.y, { zk: z.k }); break; }
      return;
    }
    z.cd -= dt; z.scr -= dt; z.ocd -= dt; z.lcd -= dt; z.scd -= dt;
    z.sense -= dt;
    let tp = z.st === 3 ? this.pById(z.tid) : null; if (tp && tp.dead) tp = null;
    if (z.sense <= 0) {
      z.sense = 0.25 + Math.random() * 0.15; let best = null, bd = 1e9; const dark = this.dark;
      for (const p of this.players) {
        if (p.dead) continue; const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy); if (d >= bd) continue;
        if (!z.h) {
          let rng = t.sight * (1 - 0.45 * dark); if (p.fl && dark > 0.3) rng = Math.max(rng, 11); if (p.in.sn) rng *= 0.5; if (w.getO(Math.floor(p.x), Math.floor(p.y)) === O.BUSH) rng *= p.in.sn ? 0.3 : 0.6;
          if (this.rain > 0.5) rng *= 0.85; if (z.st !== 3 && Math.abs(angDiff(Math.atan2(dy, dx), z.a)) > 1.8) rng *= 0.4;
          if (d > Math.max(rng, 1.2) || !w.los(z.x, z.y, p.x, p.y)) continue;
        }
        best = p; bd = d;
      }
      if (best) {
        if (z.st !== 3) { this.ev('groan', z.x, z.y, { zk: z.k }); for (const o of this.zombies) if (o !== z && (o.st === 1 || o.st === 2) && Math.abs(o.x - z.x) < 7 && Math.abs(o.y - z.y) < 7) { o.st = 2; o.tx = best.x; o.ty = best.y; o.idle = 0; } if (z.k === 2 && z.scr <= 0) { z.scr = 9; z.stag = 0.7; this.ev('scream', z.x, z.y); this.noise(z.x, z.y, 26, true); for (const o of this.zombies) if (o !== z && o.st !== 3 && Math.hypot(o.x - z.x, o.y - z.y) < 26) { o.st = 2; o.tx = best.x; o.ty = best.y; } } }
        z.st = 3; z.tid = best.id; z.lx = best.x; z.ly = best.y; z.lost = 0; tp = best;
      } else if (z.st === 3) { z.lost += 0.33; if (z.lost > 5 || !tp) { z.st = 2; z.tx = z.lx; z.ty = z.ly; tp = null; } }
    }
    let dx = 0, dy = 0, spd = t.spd * (1 + this.dark * t.nb) * (this.horde ? 1.12 : 1), active = false;
    if (z.st === 3 && tp) {
      active = true; const d = Math.hypot(tp.x - z.x, tp.y - z.y), reach = z.r + PR + 0.3;
      if (z.wind > 0) { z.wind -= dt; if (z.wind <= 0) { if (d < reach + 0.45) { if (z.k === 3) { this.killZ(z, null); return; } this.hurt(tp, t.dmg * dm, z); this.ev('bite', tp.x, tp.y); } z.cd = t.cd; } return; }
      if (d < reach) { z.a = Math.atan2(tp.y - z.y, tp.x - z.x); if (z.cd <= 0) { z.wind = 0.28; } return; }
      const gx = z.lost > 0 ? z.lx : tp.x, gy = z.lost > 0 ? z.ly : tp.y, seen = z.lost === 0 && d < 10 && w.los(z.x, z.y, tp.x, tp.y);
      if (z.k === 6 && z.lcd <= 0 && d > 2.6 && d < 6.5 && seen) { z.lcd = 5; z.stag = 0.5; z.leapQ = 1; z.a = Math.atan2(tp.y - z.y, tp.x - z.x); this.ev('hiss', z.x, z.y); return; }
      if (z.k === 5 && seen && d < 9) {
        if (z.scd <= 0) { z.scd = 3.2; z.stag = 0.35; z.a = Math.atan2(tp.y - z.y, tp.x - z.x); this.projs.push({ id: this.nid++, k: 'spit', sx: z.x, sy: z.y, ex: tp.x + rnd(-.5, .5), ey: tp.y + rnd(-.5, .5), x: z.x, y: z.y, z: .8, t: 0, T: 0.35 + d * 0.09 }); this.ev('spit', z.x, z.y); return; }
        if (d > 4.5 && d < 7.5) { z.a = Math.atan2(tp.y - z.y, tp.x - z.x); return; }
      }
      const fd = (d > 1.6) ? this.flowDir(z, tp.ff) : null;
      if (z.k === 5 && seen && d <= 4.5) { dx = z.x - tp.x; dy = z.y - tp.y; }
      else if (fd) { dx = fd[0]; dy = fd[1]; } else { dx = gx - z.x; dy = gy - z.y; }
    } else if (z.st === 2) {
      active = true; dx = z.tx - z.x; dy = z.ty - z.y; spd *= 0.85;
      if (Math.hypot(dx, dy) < 0.8) { z.st = 1; z.idle = rnd(2, 5); z.wand = 0; return; }
    } else {
      z.idle -= dt; if (z.idle <= 0) { z.tx = z.x + rnd(-5, 5); z.ty = z.y + rnd(-5, 5); z.idle = rnd(3, 9); z.wand = 1; }
      if (!z.wand) return; dx = z.tx - z.x; dy = z.ty - z.y; spd *= 0.35; if (Math.hypot(dx, dy) < 0.6) { z.wand = 0; return; }
    }
    const l = Math.hypot(dx, dy); if (l < 0.01) return; dx /= l; dy /= l;
    const here = w.getO(Math.floor(z.x), Math.floor(z.y));
    if (here === O.SPIKE) { spd *= 0.45; z.spk -= dt; if (z.spk <= 0) { z.spk = 0.5; const i = w.idx(Math.floor(z.x), Math.floor(z.y)); if (w.hp[i] <= 5) this.destroyObj(Math.floor(z.x), Math.floor(z.y)); else { w.hp[i] -= 5; w.touch(i); } this.damageZ(z, 15, null, 0, 0); if (z.gone) return; } }
    else if (here === O.WINDOW_B) spd *= 0.4;
    const ta = Math.atan2(dy, dx); z.a += angDiff(ta, z.a) * Math.min(1, dt * 8);
    const want = spd * dt, moved = w.move(z, dx * want, dy * want, z.r);
    if (moved < want * 0.35) {
      z.stuck += dt;
      if (active) {
        // dobrak penghalang di depan
        let hitT = null;
        for (const c of [[dx, dy], [Math.sign(dx), 0], [0, Math.sign(dy)]]) { if (!c[0] && !c[1]) continue; const tx = Math.floor(z.x + c[0] * (z.r + 0.45)), ty = Math.floor(z.y + c[1] * (z.r + 0.45)); if (ODEF[w.getO(tx, ty)].brk) { hitT = [tx, ty]; break; } }
        if (hitT) { if (z.ocd <= 0) { z.ocd = 0.9; const i = w.idx(hitT[0], hitT[1]); this.ev('zbash', hitT[0] + .5, hitT[1] + .5); this.noise(hitT[0] + .5, hitT[1] + .5, 7); if (w.hp[i] <= t.odmg) this.destroyObj(hitT[0], hitT[1]); else { w.hp[i] -= t.odmg; w.touch(i); } } }
        else if (z.stuck > 0.4) { const s = (z.id & 1) ? 1 : -1; w.move(z, -dy * s * want, dx * s * want, z.r); }
      } else if (z.stuck > 0.5) { z.wand = 0; z.idle = 0.5; }
    } else z.stuck = 0;
  }

  /* ---------- tick utama ---------- */
  update(dt) {
    if (this.over) return;
    const w = this.world, al = this.players.filter(p => !p.dead);
    // waktu
    let tm = 1; if (al.length && al.every(p => p.sleep) && this.isNight) tm = 10;
    this.time += dt * tm;
    const night = this.isNight;
    if (night !== this.wasNight) { this.wasNight = night; if (night) this.ev('dusk', 0, 0, { horde: this.horde ? 1 : 0, day: this.day }); else { this.ev('dawn', 0, 0, { day: this.day }); for (const p of this.players) p.sleep = 0; for (const z of this.zombies) z.h = 0; } }
    this.rainT -= dt; if (this.rainT <= 0) { this.raining = this.raining ? 0 : 1; this.rainT = this.raining ? rnd(60, 150) : rnd(200, 420); }
    this.rain = clamp(this.rain + (this.raining ? dt : -dt) * 0.2, 0, 1);
    // pemain
    for (const p of this.players) this.updP(p, dt, tm);
    // zombie
    for (const z of this.zombies) if (!z.gone) this.updZ(z, dt);
    const Z = this.zombies;
    for (let i = 0; i < Z.length; i++) { const a = Z[i]; if (a.gone) continue; for (let j = i + 1; j < Z.length; j++) { const b = Z[j]; const dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r; if (Math.abs(dx) > m || Math.abs(dy) > m) continue; const d = Math.hypot(dx, dy) || 0.01; if (d < m) { const k = (m - d) / d * 0.5; w.move(a, -dx * k, -dy * k, a.r); w.move(b, dx * k, dy * k, b.r); } } for (const p of al) { const dx = a.x - p.x, dy = a.y - p.y, m = a.r + PR, d = Math.hypot(dx, dy) || 0.01; if (d < m) w.move(a, dx / d * (m - d), dy / d * (m - d), a.r); } }
    if (Z.some(z => z.gone)) this.zombies = Z.filter(z => !z.gone);
    // proyektil
    for (const q of this.projs) { q.t += dt; const k = Math.min(1, q.t / q.T); q.x = q.sx + (q.ex - q.sx) * k; q.y = q.sy + (q.ey - q.sy) * k; q.z = 0.6 + Math.sin(k * Math.PI) * 1.3 - k * 0.6; if (k >= 1) { q.done = 1; if (q.k === 'spit') { this.fires.push({ x: q.x, y: q.y, r: 1.3, t: 5, k: 'acid' }); this.ev('acid', q.x, q.y); for (const p of al) if (Math.hypot(p.x - q.x, p.y - q.y) < 0.9) this.hurt(p, 9 * this.diff.d, null); } else if (q.k === 'molotov') { this.fires.push({ x: q.x, y: q.y, r: 1.9, t: 7 }); this.ev('fire', q.x, q.y); this.noise(q.x, q.y, 10); } else this.lures.push({ x: q.x, y: q.y, t: 4.5, r: 26, k: 'pop', n: 0 }); } }
    if (this.projs.some(q => q.done)) this.projs = this.projs.filter(q => !q.done);
    for (const f of this.fires) { f.t -= dt; if (f.k) { for (const p of al) if (Math.hypot(p.x - f.x, p.y - f.y) < f.r) { p.hp -= 9 * this.diff.d * dt; p.hurtT = 0.2; p.inf += p.inf > 0 ? dt * 0.6 : 0; if (p.hp <= 0) this.killP(p, false); } continue; } for (const z of this.zombies) if (!z.gone && Math.hypot(z.x - f.x, z.y - f.y) < f.r) { z.hp -= 24 * dt; z.hitT = 1; if (z.hp <= 0) this.killZ(z, null); } for (const p of al) if (Math.hypot(p.x - f.x, p.y - f.y) < f.r - 0.3) { p.hp -= 14 * dt; p.hurtT = 0.2; if (p.hp <= 0) this.killP(p, false); } }
    if (this.fires.some(f => f.t <= 0)) this.fires = this.fires.filter(f => f.t > 0);
    for (const l of this.lures) { l.t -= dt; l.n -= dt; if (l.n <= 0) { l.n = 0.45; this.noise(l.x, l.y, l.r, true); this.ev(l.k, l.x, l.y); } }
    if (this.lures.some(l => l.t <= 0)) this.lures = this.lures.filter(l => l.t > 0);
    // barang jatuh
    let dch = false;
    for (const d of this.drops) { d.t -= dt; if (d.pk > 0) d.pk -= dt; if (d.t <= 0) { d.gone = 1; dch = true; continue; } if (d.pk > 0) continue; for (const p of al) if (Math.abs(p.x - d.x) < 0.8 && Math.abs(p.y - d.y) < 0.8) { const l = this.addItem(p, d.it, d.n, d); if (l < d.n) { this.ev('pick', p.x, p.y, { pid: p.id, it: d.it, n: d.n - l }); dch = true; if (l <= 0) { d.gone = 1; break; } d.n = l; } } }
    if (dch) { this.drops = this.drops.filter(d => !d.gone); this.dropsVer++; }
    // per detik
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 1; this.director();
      for (const i of this.tickers) { const o = w.o[i]; let m = (w.meta.get(i) || 0) + (o === O.RAIN ? (this.rain > 0.5 ? 4 : 1) : 1) * tm; if (o === O.RAIN) { if (m >= 70 && w.st[i] < 4) { m = 0; w.st[i]++; w.touch(i); } } else if (o === O.PLANT) { const s = Math.min(3, Math.floor(m / 55)); if (s !== w.st[i]) { w.st[i] = s; w.touch(i); } } else { this.tickers.delete(i); continue; } w.meta.set(i, m); }
      if (this.evac.st === 1) { this.evac.t -= 1; if (this.evac.t <= 0) { let hx = this.evac.x, hy = this.evac.y; for (let n = 0; n < 60; n++) { const x = Math.floor(this.evac.x + rnd(-5, 5)), y = Math.floor(this.evac.y + rnd(-5, 5)); if (!w.solid(x, y) && !w.bld[w.idx(x, y)]) { hx = x + .5; hy = y + .5; break; } } this.evac = { st: 2, t: 0, x: hx, y: hy }; this.ev('evac', hx, hy, { st: 2 }); } }
      else if (this.evac.st === 2) { if (al.some(p => Math.hypot(p.x - this.evac.x, p.y - this.evac.y) < 2.4)) { this.evac.st = 3; this.over = 2; this.ev('evac', 0, 0, { st: 3 }); } }
    }
  }
  updP(p, dt, tm) {
    if (p.dead) { p.rt -= dt; if (p.rt <= 0) this.tryRespawn(p); return; }
    const inp = p.in, w = this.world;
    if (p.remote) { p.x += (p.nx - p.x) * Math.min(1, dt * 14); p.y += (p.ny - p.y) * Math.min(1, dt * 14); } else if (!p.act && !p.sleep || Math.hypot(inp.mx, inp.my) > 0.3) movePlayer(this, p, dt); else inp.mv = 0;
    const mv = inp.mv; if (mv && (p.act || p.sleep)) { p.act = null; p.sleep = 0; }
    p.sel = clamp(inp.sel | 0, 0, CFG.HOT - 1); p.sn = inp.sn ? 1 : 0; p.fl = inp.fl && this.count(p, 'senter') > 0 ? 1 : 0; const hs = p.inv[p.sel]; p.held = hs ? hs.id : '';
    if (p.crate >= 0 && (w.o[p.crate] !== O.CRATE || Math.hypot((p.crate % w.W) + .5 - p.x, Math.floor(p.crate / w.W) + .5 - p.y) > 3.2)) p.crate = -1;
    // stamina & kebutuhan
    if (mv === 3) { p.st -= 13 * dt; if (p.st <= 0) { p.st = 0; p.exh = 1; } } else p.st += (mv ? 8 : 15) * dt * (p.hu > 15 && p.th > 15 ? 1 : 0.5) * (p.buff > 0 ? 2 : 1) * (p.inf > 50 ? 0.6 : 1) * (p.sleep ? 2 : 1);
    if (p.st > 25) p.exh = 0; p.st = Math.min(100, p.st); if (p.buff > 0) p.buff -= dt;
    const need = dt * (mv === 3 ? 1.6 : 1) * (tm > 1 ? 3 : 1);
    p.hu = Math.max(0, p.hu - need * 0.14); p.th = Math.max(0, p.th - need * 0.19);
    if (p.hu <= 0) p.hp -= dt * 0.9; if (p.th <= 0) p.hp -= dt * 1.2;
    if (p.stun > 0) p.stun -= dt;
    if (p.bl > 0) { p.bl -= dt; p.hp -= dt * 1.0; } else if (p.hu > 45 && p.th > 45 && p.hp < 100) p.hp = Math.min(100, p.hp + dt * (p.sleep ? 1.6 : 0.45));
    if (p.inf > 0) { p.inf += dt * 0.14; if (p.inf >= 100) { this.killP(p, true); return; } }
    if (p.hp <= 0) { this.killP(p, false); return; }
    if (p.hurtT > 0) p.hurtT -= dt; if (p.swing > 0) p.swing -= dt;
    // langkah kaki -> suara
    p.noise = Math.max(0, p.noise - dt * 14);
    if (mv) { p.stepT -= dt * (mv === 3 ? 1.5 : mv === 1 ? 0.6 : 1); if (p.stepT <= 0) { p.stepT = 0.36; const r = mv === 3 ? 9.5 : mv === 2 ? 4.5 : 1; if (r > 1.2) this.pnoise(p, r); else p.noise = Math.max(p.noise, r); this.ev('step', p.x, p.y, { pid: p.id, mv }); } }
    if (p.fl) p.noise = Math.max(p.noise, 1);
    // aksi
    if (p.act) { p.act.t += dt; if (p.act.t >= p.act.T) { const a = p.act; p.act = null; this.finishSearch(p, a); } }
    if (p.cd > 0) p.cd -= dt;
    if (p.rl > 0) { if (p.rlSlot !== p.sel) p.rl = 0; else { p.rl -= dt; if (p.rl <= 0) { const s = p.inv[p.sel]; if (s && ITEMS[s.id].k === 'gun') { const d = ITEMS[s.id], t = Math.min(d.mag - s.m, this.count(p, d.ammo)); this.remove(p, d.ammo, t); s.m += t; } } } }
    if (p.stun <= 0) this.attack(p, dt); p.atPrev = inp.at;
    if (p.sleep && this.zombies.some(z => Math.hypot(z.x - p.x, z.y - p.y) < 6)) { p.sleep = 0; this.msg(p, 'Kamu terbangun — ada suara di dekatmu!'); }
    // medan alur untuk pengejar
    p.ffT -= dt; if (p.ffT <= 0) { p.ffT = 0.4; this.flow(p); }
  }

  /* ---------- jaringan & simpan ---------- */
  snapshot() {
    return {
      tm: r1(this.time), rn: r2(this.rain), ev: [this.evac.st, this.evac.t | 0, this.evac.x, this.evac.y], ov: this.over, ad: this.air ? [this.air.x, this.air.y] : 0,
      P: this.players.map(p => [p.id, r2(p.x), r2(p.y), r2(p.a), Math.ceil(p.hp), (p.dead ? 1 : 0) | (p.sn ? 2 : 0) | (p.fl ? 4 : 0) | (p.sleep ? 8 : 0), p.held, p.name, p.col, p.kills]),
      Z: this.zombies.map(z => [z.id, z.k, r1(z.x), r1(z.y), r1(z.a), z.st, Math.ceil(z.hp / z.mhp * 10), z.wind > 0 ? 1 : 0, z.hitT > 0 ? 1 : 0]),
      Q: this.projs.map(q => [q.id, r1(q.x), r1(q.y), r1(q.z), q.k]),
      F: this.fires.map(f => [r1(f.x), r1(f.y), f.r, r1(f.t), f.k ? 1 : 0])
    };
  }
  dropList() { return this.drops.map(d => [d.id, r1(d.x), r1(d.y), d.it, d.n]); }
  priv(p) {
    const o = { x: r2(p.x), y: r2(p.y), tpc: p.tpc, hp: r1(p.hp), st: r1(p.st), hu: r1(p.hu), th: r1(p.th), inf: r1(p.inf), bl: p.bl > 0 ? 1 : 0, inv: p.inv, dead: p.dead, rt: r1(p.rt), act: p.act ? [r2(p.act.t), p.act.T] : 0, crate: p.crate, cr: p.crate >= 0 ? this.crates.get(p.crate) : 0, msgs: p.msgs, noise: r1(p.noise), rl: r2(p.rl), rlT: p.rlT, bag: p.bag, exh: p.exh, sleep: p.sleep, buff: p.buff > 0 ? 1 : 0, hurtT: p.hurtT > 0 ? 1 : 0, stun: p.stun > 0 ? r2(p.stun) : 0, cd: r2(p.cd), bed: this.bedOk(p) ? 1 : 0 };
    p.msgs = []; return o;
  }
  save() {
    const p = this.players[0];
    return { v: 1, seed: this.seed, di: this.di, time: this.time, raining: this.raining, world: this.world.serialize(), meta: [...this.world.meta], crates: [...this.crates], evac: this.evac, drops: this.drops.map(d => [d.x, d.y, d.it, d.n, d.d, d.m]), p: { x: p.x, y: p.y, hp: p.hp, st: p.st, hu: p.hu, th: p.th, inf: p.inf, bl: p.bl, inv: p.inv, bag: p.bag, bed: p.bed, kills: p.kills, dead: p.dead } };
  }
  load(s) {
    const w = this.world; this.time = s.time; this.raining = s.raining; this.setDiff(s.di === undefined ? 1 : s.di);
    for (const c of s.world) if (c[1] === O.AIRDROP) { c[1] = 0; c[3] = 0; } w.apply(s.world); w.meta = new Map(s.meta); this.crates = new Map(s.crates); this.evac = s.evac.st === 1 ? { st: 0, t: 0, x: 0, y: 0 } : s.evac;
    for (const i of w.changed) if (w.o[i] === O.RAIN || w.o[i] === O.PLANT) this.tickers.add(i);
    for (const d of s.drops) this.drop(d[0], d[1], d[2], d[3], { d: d[4], m: d[5] });
    this.wasNight = this.isNight;
    const p = this.players[0]; if (p && s.p && !s.p.dead) { Object.assign(p, s.p); p.nx = p.x; p.ny = p.y; while (p.inv.length < 32) p.inv.push(null); }
  }
}
