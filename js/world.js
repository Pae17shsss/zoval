'use strict';
/* ===== SENYAP — dunia: generator kota, tabrakan, garis pandang ===== */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi + s, yi), b = hash2(xi + 1 + s, yi), c = hash2(xi + s, yi + 1), d = hash2(xi + 1 + s, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

class World {
  constructor(seed) {
    this.seed = seed; this.W = CFG.W; this.H = CFG.H;
    const N = this.W * this.H;
    this.t = new Uint8Array(N); this.o = new Uint8Array(N); this.hp = new Uint16Array(N); this.st = new Uint8Array(N);
    this.bld = new Uint8Array(N); // indeks bangunan+1 (dalam ruangan)
    this.town = new Uint8Array(N);
    this.blds = []; this.changed = new Set(); this.dirty = []; this.meta = new Map();
    this.spawn = { x: 20, y: 80 };
    this.rng = mulberry32(seed);
    this.gen();
    this.changed.clear(); this.dirty.length = 0;
  }
  idx(x, y) { return y * this.W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  getO(x, y) { return this.inb(x, y) ? this.o[y * this.W + x] : O.WALL; }
  getT(x, y) { return this.inb(x, y) ? this.t[y * this.W + x] : T.WATER; }
  setObj(x, y, o, hp, st) {
    if (!this.inb(x, y)) return;
    const i = y * this.W + x;
    this.o[i] = o; this.hp[i] = hp === undefined ? ODEF[o].hp : hp; this.st[i] = st || 0;
    this.changed.add(i); this.dirty.push(i);
  }
  touch(i) { this.changed.add(i); this.dirty.push(i); }
  solid(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return true;
    const i = y * this.W + x;
    return this.t[i] === T.WATER || ODEF[this.o[i]].solid === 1;
  }
  blocked(x, y, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) return true;
    return false;
  }
  /* gerak lingkaran per-sumbu; kembalikan jarak yang benar-benar ditempuh */
  move(e, dx, dy, r) {
    const ox = e.x, oy = e.y;
    if (dx && !this.blocked(e.x + dx, e.y, r)) e.x += dx;
    if (dy && !this.blocked(e.x, e.y + dy, r)) e.y += dy;
    return Math.hypot(e.x - ox, e.y - oy);
  }
  /* DDA: true bila tidak ada penghalang pandang antara dua titik */
  los(x0, y0, x1, y1) {
    let mx = Math.floor(x0), my = Math.floor(y0); const ex = Math.floor(x1), ey = Math.floor(y1);
    const dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const ddx = dx === 0 ? 1e9 : Math.abs(1 / dx), ddy = dy === 0 ? 1e9 : Math.abs(1 / dy);
    let tx = dx === 0 ? 1e9 : (dx > 0 ? (mx + 1 - x0) : (x0 - mx)) * ddx;
    let ty = dy === 0 ? 1e9 : (dy > 0 ? (my + 1 - y0) : (y0 - my)) * ddy;
    for (let n = 0; n < 90; n++) {
      if (mx === ex && my === ey) return true;
      if (tx < ty) { tx += ddx; mx += sx; } else { ty += ddy; my += sy; }
      if (!this.inb(mx, my)) return false;
      if (mx === ex && my === ey) return true;
      if (ODEF[this.o[my * this.W + mx]].sight) return false;
    }
    return true;
  }
  /* jarak sinar hingga ubin penghalang (untuk peluru) */
  rayDist(x0, y0, a, max) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let mx = Math.floor(x0), my = Math.floor(y0);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const ddx = dx === 0 ? 1e9 : Math.abs(1 / dx), ddy = dy === 0 ? 1e9 : Math.abs(1 / dy);
    let tx = dx === 0 ? 1e9 : (dx > 0 ? (mx + 1 - x0) : (x0 - mx)) * ddx;
    let ty = dy === 0 ? 1e9 : (dy > 0 ? (my + 1 - y0) : (y0 - my)) * ddy;
    let d = 0;
    while (d < max) {
      if (tx < ty) { d = tx; tx += ddx; mx += sx; } else { d = ty; ty += ddy; my += sy; }
      if (!this.inb(mx, my)) return Math.min(d, max);
      const o = this.o[my * this.W + mx];
      if (ODEF[o].sight || o === O.TREE || o === O.CAR) return Math.min(d, max);
    }
    return max;
  }

  /* ---------- GENERATOR ---------- */
  gen() {
    const R = this.rng, W = this.W, H = this.H, s = this.seed & 1023;
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const put = (x, y, o, st) => { const i = y * W + x; this.o[i] = o; this.hp[i] = ODEF[o].hp; this.st[i] = st || 0; };
    // jalan
    const xs = [], ys = [];
    for (let x = 30; x < 126; x += ri(15, 21)) xs.push(x);
    for (let y = 30; y < 126; y += ri(15, 21)) ys.push(y);
    const tx0 = xs[0], tx1 = xs[xs.length - 1] + 1, ty0 = ys[0], ty1 = ys[ys.length - 1] + 1;
    const mainY = ys[ys.length >> 1], mainX = xs[xs.length >> 1];
    // kolam
    const ponds = [];
    for (let n = 0; n < 4; n++) {
      let px, py, g = 0;
      do { px = ri(10, W - 10); py = ri(10, H - 10); g++; } while (g < 50 && (px > tx0 - 12 && px < tx1 + 12 && py > ty0 - 12 && py < ty1 + 12 || Math.abs(py - mainY) < 9 || Math.abs(px - mainX) < 9));
      ponds.push([px, py, ri(3, 6)]);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let t = T.GRASS;
      if (vnoise(x / 9, y / 9, s + 50) > 0.72) t = T.DIRT;
      for (const p of ponds) { const d = Math.hypot(x - p[0], y - p[1]) + (vnoise(x / 3, y / 3, s) - 0.5) * 3; if (d < p[2]) t = T.WATER; else if (d < p[2] + 1.6 && t !== T.WATER) t = T.SAND; }
      this.t[i] = t;
    }
    for (const x of xs) { const full = x === mainX; for (let y = full ? 0 : ty0; y < (full ? H : ty1 + 1); y++) { this.t[y * W + x] = T.ROAD; this.t[y * W + x + 1] = T.ROAD; } }
    for (const y of ys) { const full = y === mainY; for (let x = full ? 0 : tx0; x < (full ? W : tx1 + 1); x++) { this.t[y * W + x] = T.ROAD; this.t[(y + 1) * W + x] = T.ROAD; } }
    for (let y = ty0 - 2; y <= ty1 + 2; y++) for (let x = tx0 - 2; x <= tx1 + 2; x++) this.town[y * W + x] = 1;
    // blok & kavling
    const lots = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const bx0 = xs[i] + 2, bx1 = xs[i + 1] - 1, by0 = ys[j] + 2, by1 = ys[j + 1] - 1;
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) this.t[y * W + x] = (x === bx0 || x === bx1 || y === by0 || y === by1) ? T.CONC : (hash2(x, y + s) < 0.3 ? T.GRASS : T.DIRT);
      const ix0 = bx0 + 1, ix1 = bx1 - 1, iy0 = by0 + 1, iy1 = by1 - 1, bw = ix1 - ix0 + 1, bh = iy1 - iy0 + 1;
      const cx = bw >= 14 ? [[ix0, ix0 + (bw >> 1) - 1], [ix0 + (bw >> 1) + 1, ix1]] : [[ix0, ix1]];
      const cy = bh >= 14 ? [[iy0, iy0 + (bh >> 1) - 1], [iy0 + (bh >> 1) + 1, iy1]] : [[iy0, iy1]];
      for (const a of cx) for (const b of cy) lots.push({ x0: a[0], x1: a[1], y0: b[0], y1: b[1] });
    }
    for (let i = lots.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = lots[i]; lots[i] = lots[j]; lots[j] = t; }
    const kinds = [3, 2, 4, 5, 4, 1, 1, 1, 1, 1, 2];
    lots.forEach((l, n) => {
      const lw = l.x1 - l.x0 + 1, lh = l.y1 - l.y0 + 1;
      if (lw < 5 || lh < 5) return;
      const kind = n < kinds.length ? kinds[n] : 0;
      if (kind === 0 && R() < 0.13) { // lahan kosong / parkiran
        for (let k = 0; k < 4; k++) { const x = ri(l.x0, l.x1), y = ri(l.y0, l.y1); put(x, y, R() < 0.5 ? O.CAR : O.TREE); }
        return;
      }
      const w = Math.min(lw, kind ? ri(7, 10) : ri(5, 9)), h = Math.min(lh, kind ? ri(6, 9) : ri(5, 8));
      const x = l.x0 + Math.floor(R() * (lw - w + 1)), y = l.y0 + Math.floor(R() * (lh - h + 1));
      this.building(x, y, w, h, kind, n < 4, put, ri, R);
    });
    // alam
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (this.o[i] || this.bld[i]) continue; const t = this.t[i];
      if (t === T.ROAD) { if (this.town[i] && R() < 0.011) put(x, y, O.CAR); continue; }
      if (t === T.WATER || t === T.CONC || t === T.SAND) continue;
      if (this.town[i]) { const r = R(); if (r < 0.035) put(x, y, O.TREE); else if (r < 0.065) put(x, y, O.BUSH); else if (r < 0.072) put(x, y, O.ROCK); continue; }
      const f = vnoise(x / 13, y / 13, s + 9), r = R();
      if (r < (f > 0.5 ? 0.24 : 0.035)) put(x, y, O.TREE); else if (r < (f > 0.5 ? 0.3 : 0.07)) put(x, y, O.BUSH); else if (r < (f > 0.5 ? 0.32 : 0.085)) put(x, y, O.ROCK);
    }
    // pintu harus bebas halangan
    for (const b of this.blds) for (const d of b.doors) { const i = d[1] * W + d[0]; if (!ODEF[this.o[i]].c && this.o[i] !== O.WALL) this.o[i] = 0; if (this.t[i] !== T.ROAD) this.t[i] = T.CONC; }
    // titik awal: kemah di barat kota, di tepi jalan utama
    const sx = Math.max(8, tx0 - 9), sy = mainY + 4;
    for (let y = sy - 3; y <= sy + 3; y++) for (let x = sx - 3; x <= sx + 3; x++) { const i = y * W + x; this.o[i] = 0; if (this.t[i] === T.WATER || this.t[i] === T.SAND) this.t[i] = T.GRASS; if (Math.hypot(x - sx, y - sy) < 2.6 && this.t[i] !== T.ROAD) this.t[i] = T.DIRT; }
    put(sx + 1, sy - 1, O.FIRE);
    this.spawn = { x: sx + 0.5, y: sy + 0.5 };
  }
  building(bx, by, w, h, kind, special, put, ri, R) {
    const W = this.W, b = { x: bx, y: by, w, h, kind, doors: [] }; this.blds.push(b); const bi = this.blds.length;
    const floor = kind === 0 ? T.WOOD : (kind === 4 || kind === 5) ? T.CONC : T.TILE;
    for (let y = by; y < by + h; y++) for (let x = bx; x < bx + w; x++) {
      const i = y * W + x; this.t[i] = floor; this.bld[i] = bi; this.o[i] = 0;
      if (x === bx || y === by || x === bx + w - 1 || y === by + h - 1) put(x, y, O.WALL);
    }
    let px = -1, gap = -1;
    if (w >= 8 && R() < 0.8) { px = bx + 3 + Math.floor(R() * (w - 6)); gap = ri(by + 1, by + h - 2); for (let y = by + 1; y < by + h - 1; y++) if (y !== gap) put(px, y, O.WALL); }
    const per = [];
    for (let x = bx + 1; x < bx + w - 1; x++) { if (x !== px) { per.push([x, by, 0, 1]); per.push([x, by + h - 1, 0, -1]); } }
    for (let y = by + 1; y < by + h - 1; y++) { per.push([bx, y, 1, 0]); per.push([bx + w - 1, y, -1, 0]); }
    const nd = 1 + (R() < 0.55 ? 1 : 0), doorT = [];
    for (let n = 0; n < nd; n++) {
      const p = per.splice(Math.floor(R() * per.length), 1)[0];
      put(p[0], p[1], O.DOOR); doorT.push([p[0] + p[2], p[1] + p[3]]); b.doors.push([p[0] - p[2], p[1] - p[3]]);
    }
    for (const p of per) if (R() < 0.2) put(p[0], p[1], O.WINDOW);
    // kontainer di sepanjang dinding dalam
    const cand = [];
    for (let y = by + 1; y < by + h - 1; y++) for (let x = bx + 1; x < bx + w - 1; x++) {
      if (this.o[y * W + x]) continue;
      if (!(x === bx + 1 || x === bx + w - 2 || y === by + 1 || y === by + h - 2)) continue;
      if (px >= 0 && Math.abs(x - px) <= 1 && Math.abs(y - gap) <= 1) continue;
      if (doorT.some(d => Math.abs(d[0] - x) + Math.abs(d[1] - y) <= 1)) continue;
      cand.push([x, y]);
    }
    for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
    const set = [[O.C_LEMARI, O.C_KULKAS, O.C_LEMARI], [O.C_RAK, O.C_RAK, O.C_KULKAS, O.C_RAK, O.C_RAK], [O.C_OBAT, O.C_OBAT, O.C_LEMARI, O.C_OBAT], [O.C_LOKER, O.C_LOKER, O.C_LOKER, O.C_OBAT], [O.C_PETI, O.C_PETI, O.C_PETI, O.C_RAK], [O.C_PETI, O.C_RAK, O.C_PETI, O.C_RAK, O.C_PETI]][kind];
    let n = kind === 0 ? ri(1, 3) : set.length;
    if (kind === 0 && R() < 0.2) set.push(O.C_OBAT);
    n = Math.min(n, cand.length, set.length);
    for (let i = 0; i < n; i++) put(cand[i][0], cand[i][1], set[i], (special && i === 0) ? 2 : 1);
  }

  /* ---------- simpan / kirim ---------- */
  serialize() { const a = []; for (const i of this.changed) a.push([i, this.o[i], this.hp[i], this.st[i]]); return a; }
  apply(list) { for (const c of list) { this.o[c[0]] = c[1]; this.hp[c[0]] = c[2]; this.st[c[0]] = c[3]; this.changed.add(c[0]); } }
  flushDirty() { if (!this.dirty.length) return null; const seen = new Set(), a = []; for (const i of this.dirty) { if (seen.has(i)) continue; seen.add(i); a.push([i, this.o[i], this.hp[i], this.st[i]]); } this.dirty.length = 0; return a; }
}
