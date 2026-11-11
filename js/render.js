'use strict';
/* ===== SENYAP — renderer 2.5D v2: tekstur prosedural, bayangan, garis tinta ===== */
const EMO = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const INK = '#15110f';
const rgb = (c, k) => 'rgb(' + (c[0] * k | 0) + ',' + (c[1] * k | 0) + ',' + (c[2] * k | 0) + ')';
function mkc(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
/* garis tinta di sekeliling sprite: gaya ilustrasi yang konsisten */
function inked(src, px) {
  const p = px || 2, W = src.width + p * 2, H = src.height + p * 2;
  const sil = mkc(W, H, g => { g.drawImage(src, p, p); g.globalCompositeOperation = 'source-in'; g.fillStyle = INK; g.fillRect(0, 0, W, H); });
  return mkc(W, H, g => { for (let a = 0; a < 8; a++) g.drawImage(sil, Math.cos(a * .785) * p, Math.sin(a * .785) * p); g.drawImage(src, p, p); });
}
const SPR = { z: [], p: {}, o: {}, d: {}, flame: [], plant: [] };
const TEX = { g: [], top: {}, wall: {} };
const KCOL = [null, [226, 186, 100], [228, 232, 226], [126, 152, 188], [188, 108, 80], [150, 154, 160]];
const HCOL = [[216, 202, 172], [204, 178, 154], [178, 196, 184], [210, 190, 148], [190, 180, 198], [200, 156, 132]];
function wallCol(W, i, o) {
  if (o === O.P_WALL) return [156, 116, 70]; if (o === O.P_MWALL) return [128, 138, 148];
  if (o === O.P_DOOR || o === O.DOOR || o === O.DOOR_O || o === O.P_DOOR_O) return [134, 90, 52];
  const bi = W.bld[i]; if (!bi) return ODEF[o].col; const b = W.blds[bi - 1]; return b.kind ? KCOL[b.kind] : HCOL[bi % 6];
}
const ZLOOK = [
  { skin: '#8a9c72', shirt: '#56646f', pants: '#353a42', eye: '#f4e47c' },
  { skin: '#b3a888', shirt: '#8a4038', pants: '#2c2c33', eye: '#ff4030', wide: .84 },
  { skin: '#dcdfd6', shirt: '#443a4c', pants: '#27222c', eye: '#ffffff', hair: '#16121a', long: 1, mouth: 7 },
  { skin: '#93a352', shirt: '#66643a', pants: '#3a3a24', eye: '#e6ff60', wide: 1.55, pus: 1 },
  { skin: '#655d6a', shirt: '#2e2a36', pants: '#1c1a20', eye: '#ff2a1a', wide: 1.5, head: 12, tall: 1.12 },
  { skin: '#9fb08c', shirt: '#3d5a3a', pants: '#2c3328', eye: '#b6ff4a', sac: 1 },
  { skin: '#c8c2bc', shirt: '#4a3a34', pants: '#2a2422', eye: '#ffb030', wide: .9, crouch: 1 }
];
const ZSIZE = [[.8, .98], [.76, .98], [.8, .98], [1.15, 1], [1.3, 1.28], [.8, .95], [.95, .78]];

function figure(g, W, H, o, f) {
  const s = H / 128 * (o.tall || 1), cx = W / 2, wd = o.wide || 1, by = H - 2, z = o.z, cr = o.crouch ? 22 * s : 0;
  const top = by - 118 * s + cr, grad = (c1, x0, x1) => { const q = g.createLinearGradient(x0, 0, x1, 0); q.addColorStop(0, c1); q.addColorStop(1, 'rgba(0,0,0,.28)'); return q; };
  const part = (col, fn) => { g.fillStyle = col; fn(); g.fill(); g.fillStyle = grad('rgba(255,255,255,.08)', cx - 18 * wd * s, cx + 18 * wd * s); g.fill(); };
  // kaki
  for (const sd of [-1, 1]) { const lift = (f ? sd : -sd) * 3 * s; part(o.pants, () => rr(g, cx + sd * 7 * wd * s - 6 * wd * s, by - 46 * s + cr, 12 * wd * s, 40 * s - cr + lift, 4 * s)); g.fillStyle = '#1b1816'; rr(g, cx + sd * 7 * wd * s - 7 * wd * s, by - 8 * s + lift, 15 * wd * s, 8 * s, 3 * s); g.fill(); }
  // badan
  const lean = z ? 5 * s : 0;
  part(o.shirt, () => { g.beginPath(); g.moveTo(cx - 17 * wd * s + lean, top + 30 * s); g.quadraticCurveTo(cx + lean, top + 22 * s, cx + 17 * wd * s + lean, top + 30 * s); g.lineTo(cx + 14 * wd * s, by - 42 * s + cr); if (z) { for (let i = 0; i < 5; i++) g.lineTo(cx + (14 - i * 7) * wd * s, by - (42 - (i % 2 ? 0 : 7)) * s + cr); } g.lineTo(cx - 14 * wd * s, by - 42 * s + cr); g.closePath(); });
  if (z) { g.fillStyle = 'rgba(96,12,12,.6)'; g.beginPath(); g.ellipse(cx - 3 * s + lean, top + 48 * s, 7 * s * wd, 10 * s, .3, 0, 7); g.fill(); }
  if (o.pus) { for (let i = 0; i < 9; i++) { const px = cx + (hash2(i, 7) - .5) * 44 * s, py = top + (36 + hash2(i, 3) * 40) * s, pr = (2.5 + hash2(i, 9) * 4) * s; g.fillStyle = '#c8d04a'; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill(); g.fillStyle = '#eef29a'; g.beginPath(); g.arc(px - pr * .3, py - pr * .3, pr * .4, 0, 7); g.fill(); } }
  if (!z) { g.fillStyle = '#3a4250'; rr(g, cx - 19 * s, top + 32 * s, 8 * s, 30 * s, 3 * s); g.fill(); g.fillStyle = '#5a4630'; g.fillRect(cx - 14 * s, by - 46 * s, 28 * s, 4 * s); }
  // lengan
  for (const sd of [-1, 1]) {
    g.save(); g.translate(cx + sd * 16 * wd * s + lean, top + 32 * s);
    g.rotate(z ? (o.crouch ? sd * -.5 : sd * -(1.15 + (f ? .22 : 0) * sd)) : sd * (f ? .14 : -.1));
    const al = (z ? (o.crouch ? 44 : 32) : 34) * s, aw = (wd > 1.3 ? 11 : 7.5) * s;
    g.fillStyle = z ? o.skin : o.shirt; rr(g, -aw / 2, 0, aw, al, aw / 2); g.fill();
    g.fillStyle = z ? o.skin : '#d9a877'; g.beginPath(); g.arc(0, al, aw * .62, 0, 7); g.fill();
    if (z) { g.strokeStyle = '#2a1414'; g.lineWidth = 1.4 * s; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(k * aw * .3, al + aw * .4); g.lineTo(k * aw * .45, al + aw * 1.1); g.stroke(); } }
    g.restore();
  }
  // kepala
  const hr = (o.head || 13) * s, hx = cx + lean * 1.6, hy = top + 14 * s;
  g.fillStyle = z ? o.skin : '#d9a877'; g.beginPath(); g.ellipse(hx, hy, hr * .92, hr, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(hx + hr * .35, hy + hr * .1, hr * .55, hr * .9, 0, 0, 7); g.fill();
  if (o.hair) { g.fillStyle = o.hair; g.beginPath(); g.ellipse(hx, hy - hr * .25, hr * .98, hr * .85, 0, Math.PI, 0); g.fill(); if (o.long) { g.fillRect(hx - hr, hy - hr * .3, hr * .45, 34 * s); g.fillRect(hx + hr * .55, hy - hr * .3, hr * .45, 34 * s); } }
  if (z) {
    g.fillStyle = '#1c0a0a'; g.beginPath(); g.ellipse(hx - hr * .38, hy - hr * .08, hr * .26, hr * .22, 0, 0, 7); g.ellipse(hx + hr * .38, hy - hr * .08, hr * .26, hr * .22, 0, 0, 7); g.fill();
    g.fillStyle = o.eye; g.shadowColor = o.eye; g.shadowBlur = 7 * s; g.beginPath(); g.arc(hx - hr * .38, hy - hr * .08, hr * .13, 0, 7); g.arc(hx + hr * .38, hy - hr * .08, hr * .13, 0, 7); g.fill(); g.shadowBlur = 0;
    g.fillStyle = '#2a0808'; g.beginPath(); g.ellipse(hx, hy + hr * .52, (o.mouth || 4.5) * s, (o.mouth ? o.mouth * 1.25 : 2.6) * s, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,14,14,.75)'; g.fillRect(hx - 3 * s, hy + hr * .6, 5 * s, 7 * s);
    if (o.sac) { g.fillStyle = '#9be04a'; g.shadowColor = '#b6ff4a'; g.shadowBlur = 10 * s; g.beginPath(); g.ellipse(hx, hy + hr * 1.25, hr * .75, hr * .55, 0, 0, 7); g.fill(); g.shadowBlur = 0; }
  } else { g.fillStyle = '#1b1b1b'; g.fillRect(hx - hr * .5, hy - 1 * s, 3 * s, 3 * s); g.fillRect(hx + hr * .25, hy - 1 * s, 3 * s, 3 * s); }
}
function buildTextures() {
  const R = mulberry32(77), rf = (a, b) => a + R() * (b - a);
  const speck = (g, n, cols, s0, s1) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; const s = rf(s0, s1); g.fillRect(R() * 64, R() * 64, s, s); } };
  const mk3 = fn => [0, 1, 2].map(v => mkc(64, 64, g => fn(g, v)));
  TEX.g[T.GRASS] = mk3((g, v) => { g.fillStyle = '#3f5d39'; g.fillRect(0, 0, 64, 64); speck(g, 26, ['rgba(52,80,46,.5)', 'rgba(72,104,62,.45)'], 6, 14); g.lineWidth = 1.3; for (let i = 0; i < 120; i++) { g.strokeStyle = ['#4e7247', '#335030', '#5a8152', '#2e482c'][(R() * 4) | 0]; const x = R() * 64, y = 4 + R() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rf(-2, 2), y - rf(2, 5)); g.stroke(); } if (v === 2) for (let i = 0; i < 3; i++) { g.fillStyle = ['#e0d8a4', '#d0a6be'][i % 2]; g.beginPath(); g.arc(R() * 60, R() * 60, 1.4, 0, 7); g.fill(); } });
  TEX.g[T.DIRT] = mk3(g => { g.fillStyle = '#6b5a42'; g.fillRect(0, 0, 64, 64); speck(g, 30, ['rgba(88,72,52,.6)', 'rgba(122,104,78,.5)'], 5, 12); speck(g, 70, ['#7c6a50', '#57483a', '#8a785c'], 1, 2.5); for (let i = 0; i < 4; i++) { g.fillStyle = '#8c8478'; g.beginPath(); g.ellipse(R() * 60, R() * 60, rf(1.5, 3), rf(1, 2), R() * 3, 0, 7); g.fill(); } });
  TEX.g[T.ROAD] = mk3((g, v) => { g.fillStyle = '#393b41'; g.fillRect(0, 0, 64, 64); speck(g, 18, ['rgba(48,50,56,.6)', 'rgba(64,66,72,.5)'], 8, 18); speck(g, 240, ['#47494f', '#303237', '#52545a'], 1, 2); if (v) { g.strokeStyle = 'rgba(20,20,24,.7)'; g.lineWidth = 1.2; g.beginPath(); let x = R() * 64, y = 0; g.moveTo(x, y); while (y < 64) { x += rf(-9, 9); y += rf(6, 14); g.lineTo(x, y); } g.stroke(); } });
  TEX.g[T.WOOD] = mk3((g, v) => { for (let r = 0; r < 4; r++) { g.fillStyle = ['#84613f', '#7a593a', '#8c6844', '#765536'][(r + v) % 4]; g.fillRect(0, r * 16, 64, 16); g.strokeStyle = 'rgba(40,24,12,.35)'; g.lineWidth = .8; for (let i = 0; i < 3; i++) { const y = r * 16 + rf(3, 13); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(20, y + rf(-2, 2), 44, y + rf(-2, 2), 64, y); g.stroke(); } g.fillStyle = 'rgba(30,18,8,.55)'; g.fillRect(0, r * 16, 64, 1.4); const jx = ((r * 23 + v * 17) % 56) + 4; g.fillRect(jx, r * 16, 1.4, 16); g.fillStyle = '#3a2a1a'; g.fillRect(jx + 3, r * 16 + 4, 1.5, 1.5); g.fillRect(jx + 3, r * 16 + 11, 1.5, 1.5); } });
  TEX.g[T.TILE] = mk3((g, v) => { g.fillStyle = '#bdbfb9'; g.fillRect(0, 0, 64, 64); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { g.fillStyle = (a + b + v) % 2 ? '#c6c8c2' : '#b2b4ae'; g.fillRect(a * 32 + 1, b * 32 + 1, 30, 30); g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(a * 32 + 3, b * 32 + 20); g.lineTo(a * 32 + 20, b * 32 + 3); g.lineTo(a * 32 + 27, b * 32 + 3); g.lineTo(a * 32 + 3, b * 32 + 27); g.fill(); } speck(g, 14, ['rgba(90,80,60,.25)'], 1, 3); });
  TEX.g[T.WATER] = mk3(g => { g.fillStyle = '#2b6088'; g.fillRect(0, 0, 64, 64); speck(g, 14, ['rgba(36,84,118,.7)', 'rgba(52,108,146,.5)'], 8, 18); g.strokeStyle = 'rgba(150,200,225,.3)'; g.lineWidth = 1.2; for (let i = 0; i < 5; i++) { const x = R() * 50, y = R() * 60; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 3, x + 12, y); g.stroke(); } });
  TEX.g[T.CONC] = mk3((g, v) => { g.fillStyle = '#7b7b73'; g.fillRect(0, 0, 64, 64); speck(g, 16, ['rgba(104,104,96,.6)', 'rgba(136,136,128,.45)'], 8, 16); speck(g, 120, ['#86867e', '#6c6c65'], 1, 2); g.fillStyle = 'rgba(40,40,36,.45)'; g.fillRect(0, 0, 64, 1.5); g.fillRect(0, 0, 1.5, 64); if (v === 2) { g.strokeStyle = 'rgba(40,40,36,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(R() * 64, 0); g.lineTo(R() * 64, 30); g.lineTo(R() * 64, 64); g.stroke(); } });
  TEX.g[T.SAND] = mk3(g => { g.fillStyle = '#b9a577'; g.fillRect(0, 0, 64, 64); speck(g, 20, ['rgba(170,150,106,.6)', 'rgba(204,186,140,.5)'], 6, 14); speck(g, 90, ['#c8b486', '#a8946a'], 1, 2); });
  // tampak atas objek
  const top = (o, fn) => TEX.top[o] = mkc(64, 64, fn), box = (g, c1, c2) => { g.fillStyle = c1; rr(g, 2, 2, 60, 60, 5); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); if (c2) { g.fillStyle = c2; rr(g, 6, 6, 52, 52, 3); g.fill(); } };
  top(O.C_LEMARI, g => { box(g, '#6e4c2e', '#85603a'); g.fillStyle = INK; g.fillRect(31, 6, 2, 52); g.fillStyle = '#d8b060'; g.fillRect(25, 28, 3, 8); g.fillRect(36, 28, 3, 8); });
  top(O.C_KULKAS, g => { box(g, '#c9d0d4', '#e6eaec'); g.fillStyle = '#9aa4aa'; g.fillRect(8, 8, 48, 10); for (let i = 0; i < 6; i++) { g.fillStyle = '#6c767c'; g.fillRect(11 + i * 8, 10, 4, 6); } g.fillStyle = '#7c868c'; g.fillRect(48, 26, 4, 24); });
  top(O.C_RAK, g => { box(g, '#7a5a34', '#9a7444'); for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { g.fillStyle = ['#d8503c', '#e8b83c', '#4c9ad0', '#6cb85c', '#e8e0d0', '#c070b8'][(r * 5 + i * 3) % 6]; g.fillRect(9 + i * 8, 9 + r * 17, 6, 12); } });
  top(O.C_LOKER, g => { box(g, '#4a5c78', '#5c7090'); g.fillStyle = INK; g.fillRect(31, 6, 2, 52); for (let i = 0; i < 3; i++) { g.fillStyle = '#34425a'; g.fillRect(12, 12 + i * 5, 14, 2); g.fillRect(38, 12 + i * 5, 14, 2); } g.fillStyle = '#e0b040'; g.fillRect(27, 34, 10, 9); });
  top(O.C_OBAT, g => { box(g, '#d4dad8', '#f0f3f2'); g.fillStyle = '#d83a30'; g.fillRect(27, 14, 10, 36); g.fillRect(14, 27, 36, 10); });
  top(O.C_PETI, g => { box(g, '#8c2c20', '#c0402e'); g.fillStyle = '#2a2a2e'; rr(g, 20, 24, 24, 16, 5); g.fill(); g.fillStyle = '#c0402e'; rr(g, 25, 28, 14, 8, 3); g.fill(); g.fillStyle = '#e0b040'; g.fillRect(12, 29, 5, 6); g.fillRect(47, 29, 5, 6); });
  top(O.BENCH, g => { box(g, '#7a5a34', '#a07a48'); g.fillStyle = 'rgba(40,24,10,.4)'; for (let i = 1; i < 4; i++) g.fillRect(6, i * 15, 52, 1.5); g.fillStyle = '#8a9098'; g.fillRect(14, 16, 22, 6); g.fillStyle = '#5a3a20'; g.fillRect(22, 20, 5, 22); g.strokeStyle = '#c8ced4'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 44); g.lineTo(52, 30); g.stroke(); });
  top(O.CRATE, g => { box(g, '#7a5a30', '#b08848'); g.strokeStyle = '#6a4a26'; g.lineWidth = 5; g.beginPath(); g.moveTo(8, 8); g.lineTo(56, 56); g.moveTo(56, 8); g.lineTo(8, 56); g.stroke(); g.strokeRect(8, 8, 48, 48); });
  top(O.RAIN, g => { g.fillStyle = '#5a4630'; g.beginPath(); g.arc(32, 32, 29, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.fillStyle = '#3a7cab'; g.beginPath(); g.arc(32, 32, 23, 0, 7); g.fill(); g.strokeStyle = 'rgba(190,225,240,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(28, 28, 10, 3.4, 4.9); g.stroke(); });
  top(O.RADIO, g => { box(g, '#4c564e', '#687468'); g.fillStyle = '#1e2420'; g.fillRect(10, 10, 26, 16); g.fillStyle = '#6cf08a'; g.fillRect(13, 16, 20, 2); for (let i = 0; i < 3; i++) { g.fillStyle = '#d8d0b8'; g.beginPath(); g.arc(14 + i * 9, 40, 3.5, 0, 7); g.fill(); } g.fillStyle = '#c8ced4'; g.beginPath(); g.arc(48, 46, 6, 0, 7); g.fill(); g.fillStyle = '#d83a30'; g.beginPath(); g.arc(48, 46, 2.5, 0, 7); g.fill(); });
  top(O.ALARM, g => { g.fillStyle = '#5a3e22'; rr(g, 6, 22, 52, 20, 9); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.fillStyle = '#2a1a0c'; rr(g, 16, 29, 32, 6, 3); g.fill(); g.fillStyle = '#8a6a3c'; g.fillRect(4, 8, 6, 48); g.fillRect(54, 8, 6, 48); });
  top(O.AIRDROP, g => { box(g, '#56603a', '#727e4c'); g.fillStyle = '#f08a2a'; g.fillRect(6, 26, 52, 12); g.fillRect(26, 6, 12, 52); g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('✚', 32, 37); });
  top(O.CAR, g => { g.fillStyle = '#7c4038'; rr(g, 2, 10, 60, 44, 10); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.fillStyle = '#5c2c26'; rr(g, 18, 14, 28, 36, 5); g.fill(); g.fillStyle = '#1c2832'; g.fillRect(13, 16, 6, 32); g.fillRect(45, 16, 6, 32); speck(g, 30, ['rgba(60,30,20,.7)', 'rgba(150,90,50,.6)'], 2, 5); });
  top(O.ROCK, g => { g.fillStyle = '#74747a'; g.beginPath(); g.moveTo(6, 30); g.lineTo(16, 8); g.lineTo(42, 4); g.lineTo(58, 22); g.lineTo(54, 50); g.lineTo(30, 60); g.lineTo(10, 50); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); g.fillStyle = '#93939a'; g.beginPath(); g.moveTo(18, 12); g.lineTo(40, 8); g.lineTo(44, 26); g.lineTo(24, 30); g.fill(); g.fillStyle = '#5c5c62'; g.beginPath(); g.moveTo(30, 60); g.lineTo(54, 50); g.lineTo(44, 26); g.lineTo(28, 38); g.fill(); });
  // lapisan detail dinding untuk mode MATA (di atas warna dasar)
  const wl = (k, fn) => TEX.wall[k] = mkc(64, 64, fn);
  wl('brick', g => { g.fillStyle = 'rgba(0,0,0,.2)'; for (let r = 0; r < 8; r++) { g.fillRect(0, r * 8, 64, 1); for (let i = 0; i < 4; i++) g.fillRect(((r % 2) * 8 + i * 16) % 64, r * 8, 1, 8); } g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 56, 64, 8); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, 64, 3); speck(g, 14, ['rgba(40,30,20,.14)'], 4, 12); });
  wl('window', g => { g.drawImage(TEX.wall.brick, 0, 0); g.fillStyle = '#2a2420'; g.fillRect(8, 14, 48, 30); const q = g.createLinearGradient(0, 16, 0, 42); q.addColorStop(0, '#9cc4d8'); q.addColorStop(1, '#4e7890'); g.fillStyle = q; g.fillRect(11, 17, 42, 24); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(14, 41); g.lineTo(30, 17); g.lineTo(38, 17); g.lineTo(22, 41); g.fill(); g.fillStyle = '#2a2420'; g.fillRect(31, 17, 2, 24); g.fillRect(11, 28, 42, 2); });
  wl('door', g => { g.fillStyle = '#3a2616'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#7c5230'; g.fillRect(5, 4, 54, 60); g.fillStyle = '#6a4426'; g.fillRect(11, 10, 42, 20); g.fillRect(11, 36, 42, 24); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(11, 10, 42, 2); g.fillRect(11, 36, 42, 2); g.fillStyle = '#d8b060'; g.beginPath(); g.arc(50, 34, 3, 0, 7); g.fill(); });
  wl('plank', g => { g.fillStyle = 'rgba(30,16,6,.4)'; for (let i = 0; i < 4; i++) { g.fillRect(i * 16, 0, 1.5, 64); } g.fillStyle = 'rgba(30,16,6,.3)'; g.fillRect(0, 12, 64, 6); g.fillRect(0, 44, 64, 6); g.fillStyle = '#2a2018'; for (let i = 0; i < 4; i++) { g.fillRect(i * 16 + 7, 14, 2, 2); g.fillRect(i * 16 + 7, 46, 2, 2); } g.strokeStyle = 'rgba(30,16,6,.2)'; for (let i = 0; i < 10; i++) { const x = R() * 64; g.beginPath(); g.moveTo(x, R() * 64); g.lineTo(x + rf(-1, 1), R() * 64); g.stroke(); } });
  wl('metal', g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.1)'; g.fillRect(i * 8, 0, 8, 64); } g.fillStyle = '#3a4048'; for (let i = 0; i < 4; i++) { g.fillRect(i * 16 + 3, 4, 2.5, 2.5); g.fillRect(i * 16 + 3, 58, 2.5, 2.5); } speck(g, 16, ['rgba(130,70,30,.3)'], 3, 9); });
}
function frontBox(o, hr, fn) { SPR.o[o] = inked(mkc(64, Math.round(64 * hr), fn)); }
function buildSprites() {
  buildTextures();
  SPR.z = ZLOOK.map((o, k) => [0, 1].map(f => inked(mkc(k === 3 || k === 4 ? 116 : 84, 128, (g, W, H) => figure(g, W, H, Object.assign({ z: 1 }, o), f)), 2.5)));
  SPR.o[O.TREE] = inked(mkc(110, 150, g => { g.fillStyle = '#4c3626'; g.beginPath(); g.moveTo(46, 150); g.lineTo(50, 84); g.lineTo(60, 84); g.lineTo(64, 150); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(57, 84, 6, 66); for (const c of [[55, 56, 46, '#22442a'], [32, 70, 28, '#285030'], [78, 68, 30, '#264c2e'], [55, 38, 32, '#2f5c38'], [44, 30, 18, '#3a6e44'], [68, 50, 16, '#346440']]) { g.fillStyle = c[3]; g.beginPath(); g.arc(c[0], c[1], c[2], 0, 7); g.fill(); } }), 2.5);
  SPR.o[O.ROCK] = inked(mkc(64, 34, g => { g.fillStyle = '#74747a'; g.beginPath(); g.moveTo(4, 34); g.lineTo(12, 10); g.lineTo(34, 2); g.lineTo(56, 14); g.lineTo(62, 34); g.fill(); g.fillStyle = '#96969c'; g.beginPath(); g.moveTo(14, 12); g.lineTo(34, 4); g.lineTo(40, 16); g.lineTo(20, 20); g.fill(); g.fillStyle = '#5a5a60'; g.beginPath(); g.moveTo(40, 16); g.lineTo(56, 14); g.lineTo(62, 34); g.lineTo(36, 34); g.fill(); }));
  SPR.o[O.BUSH] = inked(mkc(70, 36, g => { for (const c of [[18, 24, 15, '#2a5430'], [36, 18, 18, '#33663a'], [54, 25, 14, '#285030'], [30, 12, 9, '#3e7646']]) { g.fillStyle = c[3]; g.beginPath(); g.arc(c[0], c[1], c[2], 0, 7); g.fill(); } g.fillStyle = '#c84a3a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(16 + i * 12, 20 + (i % 2) * 6, 2, 0, 7); g.fill(); } }));
  SPR.o[O.CAR] = inked(mkc(104, 46, g => { g.fillStyle = '#7c4038'; rr(g, 2, 18, 100, 22, 6); g.fill(); g.fillStyle = '#653028'; g.beginPath(); g.moveTo(24, 20); g.lineTo(34, 3); g.lineTo(72, 3); g.lineTo(84, 20); g.fill(); g.fillStyle = '#1c2832'; g.beginPath(); g.moveTo(31, 19); g.lineTo(38, 7); g.lineTo(51, 7); g.lineTo(51, 19); g.moveTo(55, 19); g.lineTo(55, 7); g.lineTo(69, 7); g.lineTo(78, 19); g.fill(); g.fillStyle = 'rgba(150,90,50,.6)'; g.fillRect(8, 30, 20, 5); g.fillRect(60, 24, 16, 4); g.fillStyle = '#141414'; g.beginPath(); g.arc(24, 40, 7, 0, 7); g.arc(80, 40, 7, 0, 7); g.fill(); g.fillStyle = '#4a4a4a'; g.beginPath(); g.arc(24, 40, 3, 0, 7); g.arc(80, 40, 3, 0, 7); g.fill(); }));
  for (let f = 0; f < 3; f++) SPR.flame[f] = mkc(48, 64, g => { for (const c of [['#c8361a', 20, 0], ['#f5822a', 15, 5], ['#ffc04a', 10, 10], ['#fff0a8', 5, 16]]) { g.fillStyle = c[0]; g.beginPath(); g.moveTo(24 - c[1], 62); g.bezierCurveTo(24 - c[1] * 1.4, 40, 24 - c[1] * .4 + (f - 1) * 5, 30, 24 + (f - 1) * 7, 4 + c[2] * 2 + f * 3); g.bezierCurveTo(24 + c[1] * .6, 30, 24 + c[1] * 1.4, 40, 24 + c[1], 62); g.fill(); } });
  SPR.o[O.FIRE] = inked(mkc(64, 14, g => { g.fillStyle = '#3a2a1c'; rr(g, 8, 3, 48, 7, 3); g.fill(); g.fillStyle = '#6a645c'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(8 + i * 10, 10, 4.5, 0, 7); g.fill(); } }));
  SPR.o[O.TORCH] = inked(mkc(18, 64, g => { g.fillStyle = '#5a4028'; g.fillRect(7, 16, 4, 48); g.fillStyle = '#3a2a1c'; g.fillRect(5, 12, 8, 8); g.fillStyle = '#ff9a30'; g.beginPath(); g.moveTo(3, 13); g.quadraticCurveTo(9, -8, 15, 13); g.fill(); g.fillStyle = '#fff0a0'; g.beginPath(); g.arc(9, 10, 3, 0, 7); g.fill(); }));
  SPR.o[O.SPIKE] = inked(mkc(64, 20, g => { for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#c8b478' : '#a8945c'; g.beginPath(); g.moveTo(1 + i * 9, 20); g.lineTo(5 + i * 9 + (i % 2 ? 2 : -2), 0); g.lineTo(10 + i * 9, 20); g.fill(); } }));
  SPR.o[O.BED] = inked(mkc(64, 16, g => { g.fillStyle = '#5a4630'; rr(g, 1, 8, 62, 8, 2); g.fill(); g.fillStyle = '#5a6ea0'; rr(g, 2, 3, 60, 9, 4); g.fill(); g.fillStyle = '#e0e0d8'; rr(g, 4, 2, 16, 8, 3); g.fill(); }));
  for (let s = 0; s < 4; s++) SPR.plant[s] = inked(mkc(64, 36, g => { g.fillStyle = '#4e3a26'; rr(g, 2, 26, 60, 10, 3); g.fill(); g.strokeStyle = s === 3 ? '#5cb84e' : '#3e7a36'; g.lineWidth = 3; g.lineCap = 'round'; for (let i = 0; i < 3 && s > 0; i++) { const x = 14 + i * 18; g.beginPath(); g.moveTo(x, 28); g.lineTo(x, 28 - s * 7); g.moveTo(x, 28 - s * 5); g.lineTo(x - 7, 23 - s * 6); g.moveTo(x, 28 - s * 5); g.lineTo(x + 7, 23 - s * 6); g.stroke(); } }));
  SPR.o[O.DOOR_O] = SPR.o[O.P_DOOR_O] = inked(mkc(10, 64, g => { g.fillStyle = '#7c5432'; g.fillRect(0, 0, 10, 64); g.fillStyle = '#5a3a20'; g.fillRect(0, 0, 3, 64); }));
  SPR.o[O.WINDOW_B] = mkc(64, 18, g => { g.fillStyle = '#968c7a'; g.fillRect(0, 5, 64, 13); g.fillStyle = '#c4dce6'; g.beginPath(); g.moveTo(6, 5); g.lineTo(12, 0); g.lineTo(16, 5); g.moveTo(44, 5); g.lineTo(50, 1); g.lineTo(56, 5); g.fill(); });
  const fb = (g, W, H, c1, c2) => { g.fillStyle = c1; rr(g, 1, 1, W - 2, H - 1, 4); g.fill(); g.fillStyle = c2; g.fillRect(4, 4, W - 8, H - 7); const q = g.createLinearGradient(0, 0, W, 0); q.addColorStop(0, 'rgba(255,255,255,.1)'); q.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = q; g.fillRect(1, 1, W - 2, H - 1); };
  frontBox(O.C_LEMARI, .85, (g, W, H) => { fb(g, W, H, '#5e4026', '#85603a'); g.fillStyle = INK; g.fillRect(31, 4, 2, H - 7); g.fillStyle = '#d8b060'; g.fillRect(26, H * .5, 3, 8); g.fillRect(35, H * .5, 3, 8); });
  frontBox(O.C_KULKAS, .9, (g, W, H) => { fb(g, W, H, '#b9c0c4', '#e6eaec'); g.fillStyle = '#9aa4aa'; g.fillRect(4, H * .36, W - 8, 2.5); g.fillStyle = '#7c868c'; g.fillRect(48, 9, 4, 10); g.fillRect(48, H * .45, 4, 16); });
  frontBox(O.C_RAK, .72, (g, W, H) => { fb(g, W, H, '#6a4c2a', '#3a2c1c'); for (let r = 0; r < 3; r++) { g.fillStyle = '#9a7444'; g.fillRect(4, 14 + r * 13, W - 8, 3); for (let i = 0; i < 6; i++) { g.fillStyle = ['#d8503c', '#e8b83c', '#4c9ad0', '#6cb85c', '#e8e0d0', '#c070b8'][(r * 5 + i * 3) % 6]; g.fillRect(7 + i * 9, 5 + r * 13, 6, 9); } } });
  frontBox(O.C_LOKER, .88, (g, W, H) => { fb(g, W, H, '#3e4e68', '#5c7090'); g.fillStyle = INK; g.fillRect(31, 4, 2, H - 7); for (let i = 0; i < 3; i++) { g.fillStyle = '#34425a'; g.fillRect(10, 10 + i * 5, 14, 2); g.fillRect(40, 10 + i * 5, 14, 2); } g.fillStyle = '#e0b040'; g.fillRect(28, H * .5, 8, 8); });
  frontBox(O.C_OBAT, .72, (g, W, H) => { fb(g, W, H, '#c4cac8', '#f0f3f2'); g.fillStyle = '#d83a30'; g.fillRect(28, 10, 8, 26); g.fillRect(19, 19, 26, 8); });
  frontBox(O.C_PETI, .46, (g, W, H) => { fb(g, W, H, '#7c241a', '#c0402e'); g.fillStyle = '#2a2a2e'; g.fillRect(4, 10, W - 8, 3); g.fillStyle = '#e0b040'; g.fillRect(28, 8, 8, 8); });
  frontBox(O.BENCH, .52, (g, W, H) => { g.fillStyle = '#a07a48'; g.fillRect(0, 0, W, 8); g.fillStyle = '#7a5a34'; g.fillRect(4, 8, 6, H); g.fillRect(W - 10, 8, 6, H); g.fillRect(4, 20, W - 8, 4); g.fillStyle = '#8a9098'; g.fillRect(14, -2, 14, 5); });
  frontBox(O.CRATE, .52, (g, W, H) => { fb(g, W, H, '#6a4a26', '#b08848'); g.strokeStyle = '#6a4a26'; g.lineWidth = 4; g.beginPath(); g.moveTo(4, 4); g.lineTo(W - 4, H - 3); g.moveTo(W - 4, 4); g.lineTo(4, H - 3); g.stroke(); });
  frontBox(O.RAIN, .56, (g, W, H) => { g.fillStyle = '#6a5236'; rr(g, 6, 2, W - 12, H - 2, 8); g.fill(); g.fillStyle = '#3a3026'; g.fillRect(6, 9, W - 12, 3); g.fillRect(6, H - 12, W - 12, 3); g.fillStyle = '#3a7cab'; g.beginPath(); g.ellipse(W / 2, 4, W / 2 - 9, 3.5, 0, 0, 7); g.fill(); });
  frontBox(O.RADIO, 1.3, (g, W, H) => { g.strokeStyle = '#aab0b6'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 46); g.moveTo(18, 14); g.lineTo(46, 14); g.moveTo(24, 24); g.lineTo(40, 24); g.stroke(); g.fillStyle = '#d83a30'; g.beginPath(); g.arc(32, 4, 3.5, 0, 7); g.fill(); g.fillStyle = '#4c564e'; rr(g, 6, 44, 52, H - 44, 4); g.fill(); g.fillStyle = '#1e2420'; g.fillRect(12, 50, 26, 14); g.fillStyle = '#6cf08a'; g.fillRect(15, 56, 20, 2); g.fillStyle = '#d8d0b8'; g.beginPath(); g.arc(48, 56, 4, 0, 7); g.fill(); });
  frontBox(O.ALARM, .85, (g, W, H) => { g.fillStyle = '#8a6a3c'; g.fillRect(6, 0, 5, H); g.fillRect(W - 11, 0, 5, H); g.fillRect(6, 0, W - 12, 5); g.fillStyle = '#5a3e22'; rr(g, 22, 10, 20, 34, 8); g.fill(); g.fillStyle = '#2a1a0c'; rr(g, 29, 16, 6, 22, 3); g.fill(); });
  frontBox(O.AIRDROP, .7, (g, W, H) => { fb(g, W, H, '#465030', '#727e4c'); g.fillStyle = '#f08a2a'; g.fillRect(4, H * .4, W - 8, 9); g.fillRect(27, 4, 10, H - 7); });
  SPR.heli = inked(mkc(160, 70, g => { g.fillStyle = '#2e3a34'; rr(g, 30, 22, 80, 34, 16); g.fill(); g.fillRect(100, 32, 54, 8); g.fillRect(148, 20, 6, 24); g.fillStyle = '#9ad0e0'; rr(g, 36, 28, 26, 18, 8); g.fill(); g.fillStyle = '#111'; g.fillRect(6, 14, 130, 4); g.fillRect(68, 16, 5, 8); g.fillRect(40, 60, 60, 3); }));
  SPR.spit = mkc(24, 24, g => { const q = g.createRadialGradient(12, 12, 1, 12, 12, 11); q.addColorStop(0, '#e8ffa0'); q.addColorStop(.5, '#9be04a'); q.addColorStop(1, 'rgba(120,200,40,0)'); g.fillStyle = q; g.fillRect(0, 0, 24, 24); });
}
function playerSprite(col) { if (!SPR.p[col]) SPR.p[col] = [0, 1].map(f => inked(mkc(84, 128, (g, W, H) => figure(g, W, H, { shirt: col, pants: '#2a3140', hair: '#231a14' }, f)), 2.5)); return SPR.p[col]; }
function dropSprite(id) { if (id === 'spit') return SPR.spit; if (!SPR.d[id]) SPR.d[id] = mkc(48, 48, g => { const gr = g.createRadialGradient(24, 26, 2, 24, 26, 22); gr.addColorStop(0, 'rgba(255,220,120,.6)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); g.font = '28px ' + EMO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ITEMS[id].ic, 24, 26); }); return SPR.d[id]; }

class Renderer {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.lc = document.createElement('canvas'); this.lx = this.lc.getContext('2d');
    this.parts = []; this.tracers = []; this.decals = []; this.corpses = []; this.flashes = []; this.shake = 0; this.t = 0; this.pov = 'top';
    this.ghost = null; this.hl = null; this.mm = null; this.mmN = -1; this.mmT = 0; this.zbuf = new Float32Array(2048); this.stamp = null; this.fid = 0; this.bob = 0;
    buildSprites(); this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); this.dpr = dpr;
    const w = this.w = this.cv.width = Math.round(innerWidth * dpr), h = this.h = this.cv.height = Math.round(innerHeight * dpr);
    this.lc.width = w >> 1; this.lc.height = h >> 1;
    this.S = Math.round(clamp(Math.max(w / 23, h / 13.5), 28 * dpr, 84 * dpr));
    this.vig = mkc(256, 256, g => { const gr = g.createRadialGradient(128, 128, 60, 128, 128, 180); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  }
  /* ---------- efek dari event ---------- */
  blood(x, y, n, col) {
    for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(.5, 3.2); this.parts.push({ x, y, z: .6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd(1, 3.5), l: rnd(.3, .7), c: col || '#8e1414', s: rnd(.05, .12) }); }
    if (this.decals.length > 160) this.decals.shift();
    const b = []; for (let i = 0; i < 5; i++) b.push([rnd(-.35, .35), rnd(-.35, .35), rnd(.06, .22)]);
    this.decals.push({ x: x + rnd(-.2, .2), y: y + rnd(-.2, .2), b, c: col ? 'rgba(120,150,30,.5)' : 'rgba(92,8,8,.6)' });
  }
  fx(e) {
    switch (e.k) {
      case 'hitz': this.blood(e.x, e.y, 6); break;
      case 'zdie': this.blood(e.x, e.y, 16); if (this.corpses.length > 36) this.corpses.shift(); this.corpses.push({ x: e.x, y: e.y, a: rnd(0, 6.28), k: e.zk || 0, t: 70 }); break;
      case 'bite': this.blood(e.x, e.y, 5, '#c22'); break;
      case 'shot': if (!e.n) this.flashes.push({ x: e.x, y: e.y, r: 5.5, l: .07, m: e.g !== 'busur' }); this.tracers.push({ x: e.x, y: e.y, x2: e.x2, y2: e.y2, l: .09, q: e.g === 'busur' }); break;
      case 'boom': this.blood(e.x, e.y, 34, '#9aa82e'); this.flashes.push({ x: e.x, y: e.y, r: 7, l: .2 }); this.shake = Math.max(this.shake, .5); break;
      case 'acid': this.blood(e.x, e.y, 10, '#9be04a'); break;
      case 'chop': case 'thud': case 'zbash': case 'break': case 'build': for (let i = 0; i < (e.k === 'break' ? 14 : 5); i++) this.parts.push({ x: e.x, y: e.y, z: .5, vx: rnd(-2, 2), vy: rnd(-2, 2), vz: rnd(1, 3), l: rnd(.3, .6), c: e.k === 'chop' ? (i % 2 ? '#8a6a3c' : '#3e7646') : '#9a9080', s: .08 }); break;
      case 'glass': for (let i = 0; i < 14; i++) this.parts.push({ x: e.x, y: e.y, z: .7, vx: rnd(-2.5, 2.5), vy: rnd(-2.5, 2.5), vz: rnd(1, 3), l: rnd(.4, .8), c: '#c8e6f0', s: .06 }); break;
      case 'step': if (e.mv === 3) this.parts.push({ x: e.x, y: e.y, z: .05, vx: rnd(-.4, .4), vy: rnd(-.4, .4), vz: .6, l: .45, c: 'rgba(190,180,160,.5)', s: .12 }); break;
      case 'pop': this.flashes.push({ x: e.x, y: e.y, r: 3.5, l: .08 }); for (let i = 0; i < 4; i++) this.parts.push({ x: e.x, y: e.y, z: .2, vx: rnd(-3, 3), vy: rnd(-3, 3), vz: rnd(2, 4), l: .3, c: '#ffd860', s: .06 }); break;
      case 'fire': this.flashes.push({ x: e.x, y: e.y, r: 6, l: .25 }); break;
    }
  }
  /* ---------- proyeksi ---------- */
  setup(me) {
    const w = this.w, h = this.h; let cx = me.x, cy = me.y;
    if (this.shake > 0) { cx += rnd(-1, 1) * this.shake * .25; cy += rnd(-1, 1) * this.shake * .25; }
    this.cx = cx; this.cy = cy;
    if (this.pov === 'iso') { const tw = this.S * 1.5, th = tw / 2; this.ma = tw / 2; this.mb = th / 2; this.mc = -tw / 2; this.md = th / 2; this.hz = th * 1.3; }
    else { this.ma = this.S; this.mb = 0; this.mc = 0; this.md = this.S; this.hz = 0; }
    this.me_ = w / 2 - (cx * this.ma + cy * this.mc); this.mf = h / 2 - (cx * this.mb + cy * this.md) + (this.pov === 'iso' ? h * 0.06 : 0);
  }
  P(x, y, z) {
    if (this.pov === 'iso') return [this.ma * x + this.mc * y + this.me_, this.mb * x + this.md * y + this.mf - (z || 0) * this.hz];
    const k = 1 + (z || 0) * 0.13, S = this.S; return [this.w / 2 + (x - this.cx) * S * k, this.h / 2 + (y - this.cy) * S * k];
  }
  screenToWorld(sx, sy) {
    if (this.pov === 'iso') { const X = (sx - this.me_) / this.ma, Y = (sy - this.mf) / this.mb; return [(X + Y) / 2, (Y - X) / 2]; }
    return [this.cx + (sx - this.w / 2) / this.S, this.cy + (sy - this.h / 2) / this.S];
  }
  dirToWorld(sx, sy, a) {
    if (this.pov === 'iso') return [(sx + sy) * 0.7071, (sy - sx) * 0.7071];
    if (this.pov === 'fps') return [Math.cos(a) * -sy - Math.sin(a) * sx, Math.sin(a) * -sy + Math.cos(a) * sx];
    return [sx, sy];
  }
  draw(g, me, dt) {
    this.t += dt; this.fid++; if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.5);
    for (const p of this.parts) { p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 9 * dt; if (p.z < 0) { p.z = 0; p.vx = p.vy = 0; } }
    this.parts = this.parts.filter(p => p.l > 0); for (const t of this.tracers) t.l -= dt; this.tracers = this.tracers.filter(t => t.l > 0);
    for (const f of this.flashes) f.l -= dt; this.flashes = this.flashes.filter(f => f.l > 0);
    for (const c of this.corpses) c.t -= dt; if (this.corpses.length && this.corpses[0].t <= 0) this.corpses.shift();
    if (me.in.mv) this.bob += dt * (me.in.mv === 3 ? 13 : 9);
    this.dark = g.dark; this.red = g.horde || g.evac.st === 1;
    if (this.pov === 'fps') this.drawFPS(g, me); else this.drawFlat(g, me);
    this.overlay(g, me); this.minimap(g, me);
  }

  /* ================= ATAS & ISO ================= */
  drawFlat(g, me) {
    const c = this.ctx, w = this.w, h = this.h, W = g.world, iso = this.pov === 'iso', S = this.S, t = this.t, day = 1 - this.dark;
    this.setup(me);
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0b0e10'; c.fillRect(0, 0, w, h);
    let x0, x1, y0, y1;
    if (iso) { const cs = [this.screenToWorld(0, 0), this.screenToWorld(w, 0), this.screenToWorld(0, h + this.hz * 2), this.screenToWorld(w, h + this.hz * 2)]; x0 = Math.min(...cs.map(q => q[0])); x1 = Math.max(...cs.map(q => q[0])); y0 = Math.min(...cs.map(q => q[1])); y1 = Math.max(...cs.map(q => q[1])); }
    else { x0 = this.cx - w / 2 / S - 1; x1 = this.cx + w / 2 / S + 1; y0 = this.cy - h / 2 / S - 1; y1 = this.cy + h / 2 / S + 1; }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W.W - 1, Math.ceil(x1)); y1 = Math.min(W.H - 1, Math.ceil(y1));
    const tall = [], lights = [], flat = [], m = 1.5;
    c.setTransform(this.ma, this.mb, this.mc, this.md, this.me_, this.mf); c.imageSmoothingEnabled = true;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (iso) { const sx = this.ma * (x + .5) + this.mc * (y + .5) + this.me_, sy = this.mb * (x + .5) + this.md * (y + .5) + this.mf; if (sx < -S * m || sx > w + S * m || sy < -S * m || sy > h + this.hz * 2 + S) continue; }
      const i = y * W.W + x, tt = W.t[i]; c.drawImage(TEX.g[tt][(hash2(x, y) * 3) | 0], x, y, 1.02, 1.02);
      const sh = vnoise(x / 5, y / 5, 3); if (sh < .42) { c.fillStyle = 'rgba(0,0,0,' + (.42 - sh) * .45 + ')'; c.fillRect(x, y, 1.02, 1.02); }
      if (tt === T.WATER) { c.fillStyle = 'rgba(255,255,255,' + (0.06 + 0.05 * Math.sin(t * 2 + x * 1.7 + y)) + ')'; c.fillRect(x + .15 + .1 * Math.sin(t + y), y + .3, .5, .07); c.fillRect(x + .4, y + .7 + .05 * Math.sin(t * 1.3 + x), .4, .06); }
      const o = W.o[i]; if (!o) continue; const d = ODEF[o];
      if (d.light) lights.push([x + .5, y + .5, d.light]);
      if (d.h <= 0.2 || o === O.BUSH) flat.push(i); else tall.push(i);
      if (o === O.FIRE || o === O.BUSH) tall.push(i);
    }
    // bayangan matahari: satu jalur, satu isian -> alfa seragam
    if (day > .15) {
      const ux = iso ? .5 : .3, uy = iso ? 0 : .3; c.fillStyle = 'rgba(8,10,16,' + .3 * day + ')'; c.beginPath();
      for (const i of tall) { const x = i % W.W, y = (i / W.W) | 0, o = W.o[i], hh = Math.min(1.2, ODEF[o].h), sx = ux * hh, sy = uy * hh; if (o === O.FIRE || o === O.BUSH) continue; if (o === O.TREE) { c.moveTo(x + .5 + sx * 1.3 + .8, y + .5 + sy * 1.3); c.arc(x + .5 + sx * 1.3, y + .5 + sy * 1.3, .8, 0, 6.3); continue; } c.moveTo(x, y); c.lineTo(x + 1, y); c.lineTo(x + 1 + sx, y + sy); c.lineTo(x + 1 + sx, y + 1 + sy); c.lineTo(x + sx, y + 1 + sy); c.lineTo(x, y + 1); c.closePath(); }
      c.fill();
    }
    for (const d of this.decals) { c.fillStyle = d.c; c.beginPath(); for (const b of d.b) { c.moveTo(d.x + b[0] + b[2], d.y + b[1]); c.arc(d.x + b[0], d.y + b[1], b[2], 0, 6.3); } c.fill(); }
    for (const i of flat) {
      const x = i % W.W, y = (i / W.W) | 0, o = W.o[i];
      if (o === O.SPIKE) { c.fillStyle = 'rgba(60,46,28,.8)'; rr(c, x + .06, y + .06, .88, .88, .08); c.fill(); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const px = x + .22 + a * .28, py = y + .22 + b * .28; c.fillStyle = '#7a6840'; c.beginPath(); c.arc(px, py, .1, 0, 7); c.fill(); c.fillStyle = '#e0cc90'; c.beginPath(); c.arc(px - .02, py - .02, .045, 0, 7); c.fill(); } }
      else if (o === O.FIRE) { c.fillStyle = '#2a1e14'; c.beginPath(); c.arc(x + .5, y + .5, .36, 0, 7); c.fill(); for (let a = 0; a < 7; a++) { c.fillStyle = a % 2 ? '#6e6860' : '#57524c'; c.beginPath(); c.arc(x + .5 + Math.cos(a * .9) * .37, y + .5 + Math.sin(a * .9) * .37, .1, 0, 7); c.fill(); } }
      else if (o === O.PLANT) { c.fillStyle = '#3a2a1a'; rr(c, x + .04, y + .04, .92, .92, .06); c.fill(); c.fillStyle = '#5a4630'; c.fillRect(x + .1, y + .1, .8, .8); const s = W.st[i]; for (let a = 0; a < 4 && s > 0; a++) { const px = x + .3 + (a & 1) * .4, py = y + .3 + (a >> 1) * .4, r = .07 + s * .05; c.fillStyle = s >= 3 ? '#4ea044' : '#35682f'; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(px + Math.cos(k * 1.26) * r, py + Math.sin(k * 1.26) * r, r, r * .45, k * 1.26, 0, 7); c.fill(); } } }
      else if (o === O.BED) { c.fillStyle = '#4a3a28'; rr(c, x + .08, y + .02, .84, .96, .06); c.fill(); c.fillStyle = '#5a6ea0'; rr(c, x + .12, y + .3, .76, .64, .05); c.fill(); c.fillStyle = '#e0e0d8'; rr(c, x + .2, y + .07, .6, .22, .06); c.fill(); }
      else if (o === O.BUSH) { c.fillStyle = 'rgba(10,20,12,.35)'; c.beginPath(); c.arc(x + .56, y + .58, .5, 0, 7); c.fill(); for (const b of [[.34, .5, .3, '#2a5430'], [.62, .4, .32, '#33663a'], [.58, .68, .26, '#285030'], [.42, .34, .18, '#3e7646']]) { c.fillStyle = b[3]; c.beginPath(); c.arc(x + b[0], y + b[1], b[2], 0, 7); c.fill(); } }
    }
    // mayat & zombie yang "tertidur" terlihat persis sama
    for (const q of this.corpses) { c.globalAlpha = Math.min(.9, q.t / 10); c.fillStyle = 'rgba(80,6,6,.5)'; c.beginPath(); c.ellipse(q.x, q.y, .5, .38, q.a, 0, 7); c.fill(); this.topFigure(q.x, q.y, q.a, ZT[q.k].r * 1.15, { z: 1, k: q.k, dead: 1, ph: 0 }); } c.globalAlpha = 1;
    for (const z of g.zombies) if (z.st === 0 && !z.gone && Math.abs(z.x - me.x) < 22 && Math.abs(z.y - me.y) < 22) { c.globalAlpha = .9; c.fillStyle = 'rgba(80,6,6,.5)'; c.beginPath(); c.ellipse(z.x, z.y, .5, .38, z.a, 0, 7); c.fill(); this.topFigure(z.x, z.y, z.a, z.r * 1.15, { z: 1, k: z.k, dead: 1, ph: 0 }); } c.globalAlpha = 1;
    for (const f of g.fires) { const ac = f.k, gr = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r); if (ac) { gr.addColorStop(0, 'rgba(200,255,90,.75)'); gr.addColorStop(.7, 'rgba(110,190,40,.5)'); gr.addColorStop(1, 'rgba(80,150,20,0)'); } else { gr.addColorStop(0, 'rgba(255,210,90,.85)'); gr.addColorStop(.6, 'rgba(240,90,20,.6)'); gr.addColorStop(1, 'rgba(200,40,0,0)'); } c.fillStyle = gr; c.beginPath(); c.arc(f.x, f.y, f.r * (0.95 + 0.07 * Math.sin(t * 20)), 0, 7); c.fill(); if (!ac) lights.push([f.x, f.y, f.r + 4]); else lights.push([f.x, f.y, 2]); }
    if (g.evac.st === 2) { c.strokeStyle = 'rgba(90,255,140,' + (0.5 + 0.4 * Math.sin(t * 5)) + ')'; c.lineWidth = .12; c.beginPath(); c.arc(g.evac.x, g.evac.y, 2.2, 0, 7); c.stroke(); lights.push([g.evac.x, g.evac.y, 7]); }
    if (g.air) { c.strokeStyle = 'rgba(255,150,50,' + (0.4 + 0.4 * Math.sin(t * 4)) + ')'; c.lineWidth = .08; c.beginPath(); c.arc(g.air.x, g.air.y, 1 + (t % 1) * .8, 0, 7); c.stroke(); lights.push([g.air.x, g.air.y, 5]); }
    if (this.hl) { c.strokeStyle = 'rgba(255,220,120,' + (.6 + .3 * Math.sin(t * 6)) + ')'; c.lineWidth = .07; rr(c, this.hl.tx + .03, this.hl.ty + .03, .94, .94, .12); c.stroke(); }
    if (this.ghost) { c.fillStyle = this.ghost.ok ? 'rgba(90,255,140,.3)' : 'rgba(255,70,60,.3)'; c.fillRect(this.ghost.tx, this.ghost.ty, 1, 1); c.strokeStyle = this.ghost.ok ? '#6f8' : '#f54'; c.lineWidth = .05; c.setLineDash([.14, .1]); c.strokeRect(this.ghost.tx, this.ghost.ty, 1, 1); c.setLineDash([]); }
    if (!me.dead) { c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = .04; c.setLineDash([.15, .15]); c.beginPath(); c.moveTo(me.x + Math.cos(me.a) * .5, me.y + Math.sin(me.a) * .5); c.lineTo(me.x + Math.cos(me.a) * 2.6, me.y + Math.sin(me.a) * 2.6); c.stroke(); c.setLineDash([]); }
    for (const d of g.drops) { const b = .5 + .5 * Math.sin(t * 4 + d.id); c.fillStyle = 'rgba(255,220,120,' + (.12 + .1 * b) + ')'; c.beginPath(); c.arc(d.x, d.y, .34, 0, 7); c.fill(); }
    c.setTransform(1, 0, 0, 1, 0, 0);
    const ents = [];
    for (const z of g.zombies) { if (z.gone || z.st === 0) continue; const d = Math.hypot(z.x - me.x, z.y - me.y); if (d > 30) continue; z.vis = d < 1.6 || W.los(me.x, me.y, z.x, z.y); if (z.vis) ents.push({ z, x: z.x, y: z.y }); }
    for (const p of g.players) if (!p.dead) ents.push({ p, x: p.x, y: p.y });
    for (const d of g.drops) ents.push({ d, x: d.x, y: d.y });
    for (const q of g.projs) ents.push({ q, x: q.x, y: q.y });
    if (iso) this.isoScene(g, me, tall, ents); else this.topScene(g, me, tall, ents);
    for (const p of this.parts) { const s = this.P(p.x, p.y, p.z), r = Math.max(1.5, p.s * S); c.fillStyle = p.c; c.beginPath(); c.arc(s[0], s[1], r / 2, 0, 7); c.fill(); }
    for (const tr of this.tracers) { const a = this.P(tr.x, tr.y, .55), b = this.P(tr.x2, tr.y2, .55); c.strokeStyle = tr.q ? 'rgba(220,210,180,.8)' : 'rgba(255,236,160,' + Math.min(1, tr.l * 14) + ')'; c.lineWidth = (tr.q ? 1.5 : 2.5) * this.dpr; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    for (const f of this.flashes) if (f.m) { const s = this.P(f.x, f.y, .55), r = S * .45; c.fillStyle = '#fff2b0'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * .628 + f.x, rr2 = i % 2 ? r * .35 : r; c.lineTo(s[0] + Math.cos(a) * rr2, s[1] + Math.sin(a) * rr2); } c.fill(); }
    if (g.evac.st === 2) { const s = this.P(g.evac.x, g.evac.y, 1.2 + Math.sin(t * 2) * .1), k = S / 46; c.drawImage(SPR.heli, s[0] - 80 * k, s[1] - 60 * k, 164 * k, 74 * k); }
    this.lighting(g, me, lights);
    if (this.dark > 0.4) {
      for (const e of ents) if (e.z && e.z.st === 3) { const s = this.P(e.z.x + Math.cos(e.z.a) * .15, e.z.y + Math.sin(e.z.a) * .15, .8); c.fillStyle = ZLOOK[e.z.k].eye; c.globalAlpha = .85; c.fillRect(s[0] - 3 * this.dpr, s[1], 2 * this.dpr, 2 * this.dpr); c.fillRect(s[0] + 1 * this.dpr, s[1], 2 * this.dpr, 2 * this.dpr); } c.globalAlpha = 1;
      // kunang-kunang & kabut tipis
      for (let i = 0; i < 12; i++) { const fx = Math.floor(me.x / 16) * 16 + hash2(i, 5) * 32 - 8 + Math.sin(t * .4 + i) * 1.5, fy = Math.floor(me.y / 16) * 16 + hash2(i, 9) * 32 - 8 + Math.cos(t * .3 + i * 2) * 1.5; if (W.town[W.idx(clamp(fx | 0, 0, W.W - 1), clamp(fy | 0, 0, W.H - 1))]) continue; const s = this.P(fx, fy, .6), a = (.5 + .5 * Math.sin(t * 3 + i * 1.7)) * this.dark; c.fillStyle = 'rgba(210,255,120,' + a * .9 + ')'; c.beginPath(); c.arc(s[0], s[1], 1.6 * this.dpr, 0, 7); c.fill(); c.fillStyle = 'rgba(210,255,120,' + a * .15 + ')'; c.beginPath(); c.arc(s[0], s[1], 7 * this.dpr, 0, 7); c.fill(); }
    }
    c.font = '600 ' + 11 * this.dpr + 'px Barlow,sans-serif'; c.textAlign = 'center';
    for (const p of g.players) if (p !== me && !p.dead) { const s = this.P(p.x, p.y, 1.25); c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(p.name, s[0] + 1, s[1] + 1); c.fillStyle = p.col; c.fillText(p.name, s[0], s[1]); }
  }
  /* sosok tampak atas; bekerja dalam satuan apa pun (piksel atau dunia) */
  topFigure(x, y, a, r, o) {
    const c = this.ctx, k = o.k || 0, L = o.z ? ZLOOK[k] : null, skin = o.flash ? '#fff' : o.z ? L.skin : '#d9a877', shirt = o.z ? L.shirt : o.shirt;
    c.save(); c.translate(x, y); c.rotate(a); c.lineWidth = Math.max(r * .1, .001); c.strokeStyle = INK; c.lineJoin = 'round';
    const wk = o.dead || !o.mv ? 0 : Math.sin(this.t * (o.fast ? 14 : 8) + o.ph), ry = k === 4 ? 1.18 : k === 3 ? 1.1 : k === 1 ? .88 : 1.02, rx = k === 3 ? .95 : k === 4 ? .78 : k === 6 ? .8 : .6;
    const fs = (col) => { c.fillStyle = col; c.fill(); c.stroke(); };
    if (!o.dead) for (const s of [-1, 1]) { c.beginPath(); c.ellipse(wk * s * r * .45, s * r * .42, r * .36, r * .2, 0, 0, 7); fs(o.z ? '#2a2622' : '#22252c'); }
    if (o.z) { const al = o.dead ? .7 : k === 6 ? 1.5 : 1.1, sp = o.dead ? .9 : 0; for (const s of [-1, 1]) { c.save(); c.translate(r * .15, s * r * ry * .72); c.rotate(s * sp + (o.dead ? 0 : wk * s * .12 - s * .08)); c.beginPath(); rr(c, 0, -r * .17, r * (al + (o.wind ? .45 : 0)), r * .34, r * .15); fs(skin); c.restore(); } }
    c.beginPath(); c.ellipse(0, 0, r * rx, r * ry, 0, 0, 7); fs(shirt);
    c.fillStyle = 'rgba(255,255,255,.13)'; c.beginPath(); c.ellipse(r * .08, -r * ry * .35, r * rx * .5, r * ry * .4, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(-r * .12, r * ry * .3, r * rx * .7, r * ry * .5, 0, 0, 7); c.fill();
    if (o.z) { c.fillStyle = 'rgba(110,12,12,.7)'; c.beginPath(); c.arc(r * .2, r * .3, r * .22, 0, 7); c.fill(); if (k === 3) for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(Math.cos(i * 1.1 + 1) * r * .6, Math.sin(i * 1.1 + 1) * r * .75, r * .17, 0, 7); fs('#c8d04a'); } }
    else {
      const it = o.held ? ITEMS[o.held] : null, kk = it ? it.k : '';
      c.beginPath(); rr(c, -r * .78, -r * .5, r * .42, r, r * .14); fs('#3a4250');
      c.save(); if (o.swing > 0) c.rotate(-1.2 + (1 - o.swing / .25) * 2.4);
      if (kk === 'gun') { const gl = o.held === 'pistol' ? .85 : 1.75; c.beginPath(); rr(c, r * .55, r * .36, r * gl, r * .2, r * .05); fs(o.held === 'busur' ? '#8a6a3c' : '#23272b'); if (gl > 1) { c.beginPath(); rr(c, r * .35, r * .32, r * .6, r * .28, r * .06); fs('#6a4a2a'); c.beginPath(); c.arc(r * 1.15, r * .1, r * .22, 0, 7); fs('#d9a877'); } }
      else if (kk === 'melee') { const ln = it.rng * .95, st = o.held === 'golok' || o.held === 'linggis'; c.beginPath(); rr(c, r * .6, r * .42, r * ln, r * (o.held === 'pentungan' ? .26 : .16), r * .06); fs(st ? '#b8c0c8' : '#8a6a3c'); if (o.held === 'kapak') { c.beginPath(); rr(c, r * (.5 + ln * .75), r * .22, r * .45, r * .5, r * .08); fs('#9aa2aa'); } if (o.held === 'golok') { c.beginPath(); rr(c, r * .55, r * .4, r * .4, r * .2, r * .05); fs('#5a3a20'); } }
      else if (it) { c.font = r * .9 + 'px ' + EMO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.ic, r * 1.1, r * .5); c.textBaseline = 'alphabetic'; }
      c.beginPath(); c.arc(r * .68, r * .52, r * .25, 0, 7); fs('#d9a877');
      c.restore();
    }
    const hr = k === 4 ? .42 : .5;
    if (o.z && k === 2) { c.beginPath(); c.ellipse(-r * .3, 0, r * .55, r * .62, 0, 0, 7); fs('#16121a'); }
    c.beginPath(); c.arc(r * .14, 0, r * hr, 0, 7); fs(skin);
    if (o.z) {
      if (!o.dead) { c.fillStyle = L.eye; c.fillRect(r * .38, -r * .26, r * .15, r * .15); c.fillRect(r * .38, r * .11, r * .15, r * .15); }
      if (k === 5) { c.beginPath(); c.arc(r * .62, 0, r * .26, 0, 7); fs('#9be04a'); }
      c.fillStyle = 'rgba(90,10,10,.7)'; c.beginPath(); c.arc(r * .0, -r * .18, r * .16, 0, 7); c.fill();
    } else { c.beginPath(); c.arc(r * .06, 0, r * hr, 1.15, 5.13); c.closePath(); c.fillStyle = '#231a14'; c.fill(); }
    c.restore();
  }
  drawEntTop(e, me) {
    const c = this.ctx, S = this.S;
    if (e.z) { const z = e.z, s = this.P(z.x, z.y, .12); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(s[0] + S * .07, s[1] + S * .09, z.r * S * 1.15, z.r * S, 0, 0, 7); c.fill(); this.topFigure(s[0], s[1], z.a, z.r * S * 1.15, { z: 1, k: z.k, flash: z.hitT > 1.85, ph: z.id, mv: 1, fast: z.st === 3, wind: z.wind > 0 }); this.hpBar(z, s[0], s[1] - z.r * S * 1.7); }
    else if (e.p) { const p = e.p, s = this.P(p.x, p.y, .12); c.globalAlpha = p.sn ? .8 : 1; c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(s[0] + S * .07, s[1] + S * .09, PR * S * 1.15, PR * S, 0, 0, 7); c.fill(); this.topFigure(s[0], s[1], p.a, PR * S * (p.sn ? 1.05 : 1.2), { shirt: p.col, held: p.held, swing: p.swing, ph: 0, mv: p === me ? me.in.mv : 1, fast: p === me && me.in.mv === 3 }); c.globalAlpha = 1; if (p.sleep) { c.font = S * .4 + 'px ' + EMO; c.fillText('💤', s[0], s[1] - S * .6); } }
    else if (e.d) { const s = this.P(e.d.x, e.d.y, .1 + .05 * Math.sin(this.t * 3 + e.d.id)), k = S * .62; c.drawImage(dropSprite(e.d.it), s[0] - k / 2, s[1] - k / 2, k, k); }
    else if (e.q) { const s = this.P(e.q.x, e.q.y, e.q.z), k = S * .5; c.drawImage(dropSprite(e.q.k), s[0] - k / 2, s[1] - k / 2, k, k); }
  }
  hpBar(z, x, y) { if (!(z.hp < z.mhp) || z.hp <= 0) return; const c = this.ctx, w = this.S * .7, hh = 4 * this.dpr; c.fillStyle = INK; c.fillRect(x - w / 2 - 1, y - 1, w + 2, hh + 2); c.fillStyle = '#d8402c'; c.fillRect(x - w / 2, y, w * clamp(z.hp / z.mhp, 0, 1), hh); }
  topScene(g, me, tall, ents) {
    const c = this.ctx, W = g.world, S = this.S, hw = this.w / 2, hh = this.h / 2, cx = this.cx, cy = this.cy, t = this.t;
    for (const e of ents) this.drawEntTop(e, me);
    const boxes = [];
    for (const i of tall) {
      const x = i % W.W, y = (i / W.W) | 0, o = W.o[i], d = ODEF[o];
      if (o === O.FIRE) { const s = this.P(x + .5, y + .5, .3), k = S * .75, f = SPR.flame[(t * 9 + x) % 3 | 0]; c.drawImage(f, s[0] - k / 2, s[1] - k * .8, k, k * 1.25); continue; }
      if (o === O.BUSH) continue;
      let bx0 = x, by0 = y, bx1 = x + 1, by1 = y + 1, h = d.h, col = d.wall || o === O.DOOR_O || o === O.P_DOOR_O ? wallCol(W, i, o) : d.col;
      if (o === O.DOOR_O || o === O.P_DOOR_O) { const vert = ODEF[W.getO(x, y - 1)].wall || ODEF[W.getO(x, y + 1)].wall; if (vert) by1 = y + .14; else bx1 = x + .14; }
      else if (o === O.TREE) { bx0 += .42; by0 += .42; bx1 -= .42; by1 -= .42; col = [74, 53, 36]; h = 1.1; }
      else if (o === O.TORCH) { bx0 += .43; by0 += .43; bx1 -= .43; by1 -= .43; col = [90, 64, 40]; }
      else if (o === O.ROCK) { bx0 += .1; by0 += .12; bx1 -= .1; by1 -= .12; }
      else if (o === O.CAR) { by0 += .12; by1 -= .12; }
      else if (!d.wall) { bx0 += .07; by0 += .07; bx1 -= .07; by1 -= .07; }
      boxes.push({ x, y, o, h, col, bx0, by0, bx1, by1, d, i });
    }
    boxes.sort((a, b) => a.h - b.h);
    const sx = v => hw + (v - cx) * S, sy = v => hh + (v - cy) * S, K = 0.13;
    for (const b of boxes) {
      const k = 1 + b.h * K, X0 = sx(b.bx0), X1 = sx(b.bx1), Y0 = sy(b.by0), Y1 = sy(b.by1), TX0 = hw + (X0 - hw) * k, TX1 = hw + (X1 - hw) * k, TY0 = hh + (Y0 - hh) * k, TY1 = hh + (Y1 - hh) * k;
      b.t = [TX0, TY0, TX1, TY1]; const wl = b.d.wall, win = b.o === O.WINDOW;
      const quad = (ax, ay, bx, by, cx2, cy2, dx, dy, sh) => { c.fillStyle = rgb(b.col, sh); c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(cx2, cy2); c.lineTo(dx, dy); c.fill(); if (win) { c.fillStyle = 'rgba(130,190,215,.85)'; c.beginPath(); const m = (p, q, u, v) => [p + (q - p) * u, v]; c.moveTo(ax + (bx - ax) * .2 + (dx - ax) * .25, ay + (by - ay) * .2 + (dy - ay) * .25); c.lineTo(ax + (bx - ax) * .8 + (cx2 - bx) * .25, ay + (by - ay) * .8 + (cy2 - by) * .25); c.lineTo(ax + (bx - ax) * .8 + (cx2 - bx) * .8, ay + (by - ay) * .8 + (cy2 - by) * .8); c.lineTo(ax + (bx - ax) * .2 + (dx - ax) * .8, ay + (by - ay) * .2 + (dy - ay) * .8); c.fill(); } };
      if (X0 > hw && !(wl && ODEF[W.getO(b.x - 1, b.y)].wall)) quad(X0, Y0, X0, Y1, TX0, TY1, TX0, TY0, .62);
      if (X1 < hw && !(wl && ODEF[W.getO(b.x + 1, b.y)].wall)) quad(X1, Y0, X1, Y1, TX1, TY1, TX1, TY0, .62);
      if (Y0 > hh && !(wl && ODEF[W.getO(b.x, b.y - 1)].wall)) quad(X0, Y0, X1, Y0, TX1, TY0, TX0, TY0, .78);
      if (Y1 < hh && !(wl && ODEF[W.getO(b.x, b.y + 1)].wall)) quad(X0, Y1, X1, Y1, TX1, TY1, TX0, TY1, .78);
    }
    c.lineWidth = Math.max(1.5, S * .035); c.strokeStyle = INK; c.lineCap = 'square';
    for (const b of boxes) {
      const q = b.t, o = b.o, qw = q[2] - q[0], qh = q[3] - q[1];
      if (o === O.TREE) {
        const mx = (q[0] + q[2]) / 2 + Math.sin(t * .8 + b.x) * S * .02, my = (q[1] + q[3]) / 2, v = .82 + hash2(b.x, b.y) * .3, r = S * .95 * v, near = Math.hypot(mx - hw, my - hh) < S * 2.3;
        c.globalAlpha = near ? .4 : .96; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047 + b.x; c.moveTo(mx + Math.cos(a) * r * .5 + r * .6, my + Math.sin(a) * r * .5); c.arc(mx + Math.cos(a) * r * .5, my + Math.sin(a) * r * .5, r * .6, 0, 6.3); } c.fillStyle = INK; c.fill();
        for (const p of [[0, 0, .98, '#22442a'], [-.2, .15, .7, '#285030'], [.18, -.1, .66, '#2f5c38'], [-.12, -.28, .42, '#3a6e44'], [.25, -.32, .22, '#4a8254']]) { c.fillStyle = p[3]; c.beginPath(); c.arc(mx + p[0] * r, my + p[1] * r, r * p[2], 0, 7); c.fill(); }
        c.globalAlpha = 1; continue;
      }
      const tx = TEX.top[o];
      if (tx) { c.drawImage(tx, q[0], q[1], qw, qh); if (b.d.c && W.st[b.i] === 0) { c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(q[0], q[1], qw, qh); } else if (b.d.c) { c.fillStyle = 'rgba(255,225,130,' + (.1 + .08 * Math.sin(t * 3 + b.x)) + ')'; c.fillRect(q[0], q[1], qw, qh); } }
      else {
        c.fillStyle = rgb(b.col, b.d.wall ? .98 : 1.05); c.fillRect(q[0], q[1], qw + .6, qh + .6);
        if (b.d.wall) {
          if (o === O.WINDOW) { c.fillStyle = '#8fc0d6'; const hz = ODEF[W.getO(b.x - 1, b.y)].wall || ODEF[W.getO(b.x + 1, b.y)].wall; if (hz) c.fillRect(q[0] + qw * .1, q[1] + qh * .36, qw * .8, qh * .28); else c.fillRect(q[0] + qw * .36, q[1] + qh * .1, qw * .28, qh * .8); }
          else if (o === O.P_WALL || o === O.P_DOOR) { c.fillStyle = 'rgba(50,30,12,.45)'; for (let i = 1; i < 4; i++) c.fillRect(q[0] + qw * i / 4, q[1], 1.5, qh); if (o === O.P_DOOR) { c.fillStyle = '#d8b060'; c.fillRect(q[0] + qw * .42, q[1] + qh * .42, qw * .16, qh * .16); } }
          else if (o === O.P_MWALL) { c.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 4; i++) c.fillRect(q[0] + qw * (i + .2) / 4, q[1], qw * .1, qh); }
          else if (o === O.DOOR) { c.fillStyle = '#d8b060'; c.fillRect(q[0] + qw * .42, q[1] + qh * .42, qw * .16, qh * .16); }
          // garis tinta hanya di tepi luar
          c.beginPath(); if (!ODEF[W.getO(b.x - 1, b.y)].wall) { c.moveTo(q[0], q[1]); c.lineTo(q[0], q[3]); } if (!ODEF[W.getO(b.x + 1, b.y)].wall) { c.moveTo(q[2], q[1]); c.lineTo(q[2], q[3]); } if (!ODEF[W.getO(b.x, b.y - 1)].wall) { c.moveTo(q[0], q[1]); c.lineTo(q[2], q[1]); } if (!ODEF[W.getO(b.x, b.y + 1)].wall) { c.moveTo(q[0], q[3]); c.lineTo(q[2], q[3]); } c.stroke();
        } else { c.strokeRect(q[0], q[1], qw, qh); if (o === O.TORCH) { c.fillStyle = '#ffd070'; c.beginPath(); c.arc((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, S * .16, 0, 7); c.fill(); c.fillStyle = '#fff6c0'; c.beginPath(); c.arc((q[0] + q[2]) / 2, (q[1] + q[3]) / 2, S * .07, 0, 7); c.fill(); } }
      }
      if (b.d.hp && W.hp[b.i] < b.d.hp && b.d.brk) { const f = W.hp[b.i] / b.d.hp; c.fillStyle = INK; c.fillRect(q[0] + 3, q[3] - 8, qw - 6, 6); c.fillStyle = f > .5 ? '#8c6' : '#e84'; c.fillRect(q[0] + 4, q[3] - 7, (qw - 8) * f, 4); }
    }
  }
  isoBox(x0, y0, x1, y1, h, col, tex) {
    const c = this.ctx, A = this.P(x0, y0, h), B = this.P(x1, y0, h), C = this.P(x1, y1, h), D = this.P(x0, y1, h), hz = h * this.hz;
    c.fillStyle = rgb(col, .74); c.beginPath(); c.moveTo(D[0], D[1]); c.lineTo(C[0], C[1]); c.lineTo(C[0], C[1] + hz); c.lineTo(D[0], D[1] + hz); c.fill();
    c.fillStyle = rgb(col, .54); c.beginPath(); c.moveTo(C[0], C[1]); c.lineTo(B[0], B[1]); c.lineTo(B[0], B[1] + hz); c.lineTo(C[0], C[1] + hz); c.fill();
    if (tex) { c.setTransform(this.ma, this.mb, this.mc, this.md, this.me_, this.mf - hz); c.drawImage(tex, x0, y0, x1 - x0, y1 - y0); c.setTransform(1, 0, 0, 1, 0, 0); }
    else { c.fillStyle = rgb(col, 1); c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(C[0], C[1]); c.lineTo(D[0], D[1]); c.fill(); }
    c.strokeStyle = 'rgba(21,17,15,.55)'; c.lineWidth = Math.max(1, this.S * .022); c.beginPath(); c.moveTo(D[0], D[1] + hz); c.lineTo(D[0], D[1]); c.lineTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(B[0], B[1] + hz); c.moveTo(D[0], D[1]); c.lineTo(C[0], C[1]); c.lineTo(B[0], B[1]); c.moveTo(C[0], C[1]); c.lineTo(C[0], C[1] + hz); c.stroke();
    return [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
  }
  /* persegi pada dua sisi kubus yang terlihat (jendela, panel pintu) */
  isoFace(x, y, u0, u1, v0, v1, col) {
    const c = this.ctx; c.fillStyle = col;
    let a = this.P(x + u0, y + 1, v1), b = this.P(x + u1, y + 1, v1), d = this.P(x + u1, y + 1, v0), e = this.P(x + u0, y + 1, v0); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.fill();
    a = this.P(x + 1, y + u0, v1); b = this.P(x + 1, y + u1, v1); d = this.P(x + 1, y + u1, v0); e = this.P(x + 1, y + u0, v0); c.globalAlpha = .75; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.fill(); c.globalAlpha = 1;
  }
  bill(img, x, y, wW, hW, z, flip, alpha) {
    const c = this.ctx, s = this.P(x, y, z || 0), ph = hW * this.hz, pw = wW * this.ma * 2 * .72;
    if (alpha) c.globalAlpha = alpha;
    if (flip) { c.save(); c.translate(s[0], 0); c.scale(-1, 1); c.drawImage(img, -pw / 2, s[1] - ph, pw, ph); c.restore(); } else c.drawImage(img, s[0] - pw / 2, s[1] - ph, pw, ph);
    c.globalAlpha = 1; return s;
  }
  isoScene(g, me, tall, ents) {
    const c = this.ctx, W = g.world, t = this.t, list = [], pd = me.x + me.y, pdx = me.x - me.y;
    for (const i of tall) { const x = i % W.W, y = (i / W.W) | 0; list.push({ dp: x + y + 1, i, x, y }); }
    for (const e of ents) { e.dp = e.x + e.y + (e.d ? -.2 : .05); list.push(e); }
    list.sort((a, b) => a.dp - b.dp);
    const shadow = (x, y, r) => { const s = this.P(x, y, 0); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(s[0], s[1], r * this.ma * 1.3, r * this.mb * 1.3, 0, 0, 7); c.fill(); };
    for (const e of list) {
      if (e.i === undefined) {
        if (e.z) { const z = e.z, sz = ZSIZE[z.k], fl = Math.cos(z.a) - Math.sin(z.a) < 0; shadow(z.x, z.y, z.r); const s = this.bill(SPR.z[z.k][(t * (z.st === 3 ? 6 : 2.5) + z.id) % 2 | 0], z.x, z.y, sz[0], sz[1], 0, fl); this.hpBar(z, s[0], s[1] - this.hz * (sz[1] + .25)); }
        else if (e.p) { const p = e.p, fl = Math.cos(p.a) - Math.sin(p.a) < 0; shadow(p.x, p.y, PR); const s = this.bill(playerSprite(p.col)[p === me && me.in.mv || p !== me ? (this.bob % 2 | 0) : 0], p.x, p.y, .8, p.sn ? .8 : .96, 0, fl, p.sn ? .8 : 1); if (p.held) { c.font = this.hz * .4 + 'px ' + EMO; c.textAlign = 'center'; c.save(); c.translate(s[0] + (fl ? -1 : 1) * this.hz * .34, s[1] - this.hz * .4); if (p.swing > 0) c.rotate((fl ? -1 : 1) * (1 - p.swing / .25) * 1.6); c.fillText(ITEMS[p.held].ic, 0, 0); c.restore(); } if (p.sleep) c.fillText('💤', s[0], s[1] - this.hz * 1.1); }
        else if (e.d) this.bill(dropSprite(e.d.it), e.d.x, e.d.y, .55, .42, .05 + Math.sin(t * 3 + e.d.id) * .04);
        else if (e.q) this.bill(dropSprite(e.q.k), e.q.x, e.q.y, .5, .38, e.q.z);
        continue;
      }
      const x = e.x, y = e.y, o = W.o[e.i], d = ODEF[o];
      if (o === O.FIRE) { this.bill(SPR.flame[(t * 9 + x) % 3 | 0], x + .5, y + .5, .6, .8, 0); continue; }
      if (o === O.TREE) { const near = x + y + 1 > pd && Math.abs((x - y) - pdx) < 2.5 && x + y - pd < 5, v = .85 + hash2(x, y) * .3; this.bill(SPR.o[o], x + .5, y + .5, 1.6 * v, 2.3 * v, 0, hash2(y, x) > .5, near ? .35 : 1); continue; }
      if (o === O.BUSH || o === O.ROCK || o === O.TORCH || o === O.CAR) { this.bill(SPR.o[o], x + .5, y + .5, o === O.TORCH ? .24 : o === O.CAR ? 1.5 : 1.1, o === O.CAR ? .7 : d.h * 1.15, 0); continue; }
      let h = d.h, col = d.wall || o === O.DOOR_O || o === O.P_DOOR_O ? wallCol(W, e.i, o) : d.col, x0 = x, y0 = y, x1 = x + 1, y1 = y + 1;
      const front = x + y + 1 > pd + .3 && Math.abs((x - y) - pdx) < 3.2 && x + y - pd < 6;
      if (d.wall && front) h = .2;
      if (o === O.DOOR_O || o === O.P_DOOR_O) { const vert = ODEF[W.getO(x, y - 1)].wall || ODEF[W.getO(x, y + 1)].wall; if (vert) y1 = y + .14; else x1 = x + .14; if (front) h = .2; }
      else if (!d.wall) { x0 += .1; y0 += .1; x1 -= .1; y1 -= .1; }
      const looted = d.c && W.st[e.i] === 0; if (looted) col = [col[0] * .5, col[1] * .5, col[2] * .5];
      const m = this.isoBox(x0, y0, x1, y1, h, col, TEX.top[o]);
      if (looted) { c.setTransform(this.ma, this.mb, this.mc, this.md, this.me_, this.mf - h * this.hz); c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x0, y0, x1 - x0, y1 - y0); c.setTransform(1, 0, 0, 1, 0, 0); }
      if (h > .5) {
        if (o === O.WINDOW) { this.isoFace(x, y, .16, .84, .3, .78, '#2a2420'); this.isoFace(x, y, .2, .8, .34, .74, '#8fc0d6'); }
        else if (o === O.DOOR || o === O.P_DOOR) { this.isoFace(x, y, .12, .88, 0, .9, 'rgba(60,36,16,.55)'); this.isoFace(x, y, .2, .8, .08, .82, rgb(col, .9)); this.isoFace(x, y, .68, .76, .4, .48, '#d8b060'); }
        else if (o === O.WALL) this.isoFace(x, y, 0, 1, 0, .12, 'rgba(0,0,0,.2)');
        else if (o === O.P_WALL) for (let i = 1; i < 4; i++) this.isoFace(x, y, i / 4 - .02, i / 4 + .02, 0, 1, 'rgba(50,30,12,.5)');
        else if (o === O.P_MWALL) for (let i = 0; i < 4; i++) this.isoFace(x, y, i / 4 + .04, i / 4 + .12, 0, 1, 'rgba(255,255,255,.14)');
      }
      if (d.hp && W.hp[e.i] < d.hp && d.brk) { const f = W.hp[e.i] / d.hp, bw = this.ma; c.fillStyle = INK; c.fillRect(m[0] - bw / 2 - 1, m[1] - 4, bw + 2, 6); c.fillStyle = f > .5 ? '#8c6' : '#e84'; c.fillRect(m[0] - bw / 2, m[1] - 3, bw * f, 4); }
    }
  }
  lighting(g, me, lights) {
    const dk = this.dark, c = this.ctx, ph = g.phase;
    // rona waktu: fajar jingga-merah muda, senja jingga
    const dusk = clamp(1 - Math.abs(ph - .53) / .09, 0, 1), dawn = clamp(1 - ph / .07, 0, 1);
    if (dusk > 0 || dawn > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'soft-light'; c.fillStyle = dusk > 0 ? 'rgba(255,120,40,' + dusk * .5 + ')' : 'rgba(255,170,150,' + dawn * .4 + ')'; c.fillRect(0, 0, this.w, this.h); c.globalCompositeOperation = 'source-over'; }
    if (dk > 0.02) {
      const l = this.lx, w = this.lc.width, h = this.lc.height;
      l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over'; l.clearRect(0, 0, w, h);
      l.fillStyle = this.red ? 'rgba(34,3,6,' + dk * .93 + ')' : 'rgba(4,7,15,' + dk * .965 + ')'; l.fillRect(0, 0, w, h);
      l.globalCompositeOperation = 'destination-out'; l.setTransform(this.ma / 2, this.mb / 2, this.mc / 2, this.md / 2, this.me_ / 2, this.mf / 2);
      const L = (x, y, r, a) => { const gr = l.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(.5, 'rgba(0,0,0,' + a * .6 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); l.fillStyle = gr; l.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const p of g.players) { if (p.dead) continue; L(p.x, p.y, p === me ? 2.3 : 1.8, .72); if (p.fl) { l.save(); l.beginPath(); l.moveTo(p.x, p.y); l.arc(p.x, p.y, 12, p.a - .42, p.a + .42); l.closePath(); l.clip(); L(p.x, p.y, 12, 1); l.restore(); } }
      const fk = 1 + Math.sin(this.t * 11) * .04 + Math.sin(this.t * 23) * .03;
      for (const q of lights) L(q[0], q[1], q[2] * fk, .95);
      for (const f of this.flashes) L(f.x, f.y, f.r, 1);
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.lc, 0, 0, this.w, this.h);
      c.setTransform(this.ma, this.mb, this.mc, this.md, this.me_, this.mf); c.globalCompositeOperation = 'lighter';
      for (const q of lights) { const gr = c.createRadialGradient(q[0], q[1], 0, q[0], q[1], q[2]); gr.addColorStop(0, 'rgba(255,130,40,' + .24 * dk + ')'); gr.addColorStop(1, 'rgba(255,130,40,0)'); c.fillStyle = gr; c.fillRect(q[0] - q[2], q[1] - q[2], q[2] * 2, q[2] * 2); }
      for (const p of g.players) if (p.fl && !p.dead) { const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10); gr.addColorStop(0, 'rgba(255,240,200,' + .12 * dk + ')'); gr.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(p.x, p.y); c.arc(p.x, p.y, 10, p.a - .4, p.a + .4); c.fill(); }
      c.globalCompositeOperation = 'source-over'; c.setTransform(1, 0, 0, 1, 0, 0);
      // kabut malam melayang
      for (let i = 0; i < 5; i++) { const fx = ((hash2(i, 1) * this.w * 1.6 + this.t * (8 + i * 3) * this.dpr) % (this.w * 1.6)) - this.w * .3, fy = hash2(i, 2) * this.h, r = this.h * (.3 + hash2(i, 3) * .25), gr = c.createRadialGradient(fx, fy, 0, fx, fy, r); gr.addColorStop(0, this.red ? 'rgba(160,40,40,' + .07 * dk + ')' : 'rgba(130,150,175,' + .07 * dk + ')'); gr.addColorStop(1, 'rgba(130,150,175,0)'); c.fillStyle = gr; c.fillRect(fx - r, fy - r, r * 2, r * 2); }
    }
  }

  /* ================= MATA (orang pertama, raycasting bertekstur) ================= */
  drawFPS(g, me) {
    const c = this.ctx, w = this.w, h = this.h, W = g.world, dk = this.dark, t = this.t;
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    const step = Math.max(2, Math.round(w / 440)), cols = Math.ceil(w / step), plane = 0.62;
    const px = me.x, py = me.y, a = me.a, dX = Math.cos(a), dY = Math.sin(a), pX = -dY * plane, pY = dX * plane;
    const U = w / (2 * plane), eye = me.in.sn ? 0.36 : 0.5, hor = h / 2 + (me.in.mv ? Math.sin(this.bob) * h * .006 : 0) + (this.shake * rnd(-8, 8));
    const fog = this.red ? [34 * dk + 150 * (1 - dk), 6 * dk + 168 * (1 - dk), 8 * dk + 178 * (1 - dk)] : [6 * dk + 150 * (1 - dk), 9 * dk + 168 * (1 - dk), 16 * dk + 178 * (1 - dk)];
    const rn = g.rain; fog[0] *= 1 - rn * .35; fog[1] *= 1 - rn * .32; fog[2] *= 1 - rn * .28;
    const fl = me.fl ? 1 : 0, amb = 1 - dk * .92, fden = 0.14 + dk * .75 + rn * .2;
    let gr = c.createLinearGradient(0, 0, 0, hor); const sk = this.red ? [60 * dk + 70 * (1 - dk), 8 * dk + 120 * (1 - dk), 14 * dk + 170 * (1 - dk)] : [8 * dk + 70 * (1 - dk), 12 * dk + 120 * (1 - dk), 28 * dk + 170 * (1 - dk)];
    gr.addColorStop(0, rgb(sk, 1 - rn * .3)); gr.addColorStop(1, rgb(fog, 1)); c.fillStyle = gr; c.fillRect(0, 0, w, hor + 1);
    if (dk > .5 && rn < .5) { c.fillStyle = 'rgba(255,255,255,' + (dk - .5) * 1.4 + ')'; for (let i = 0; i < 60; i++) { const sx = (((hash2(i, 11) * 6.283 - a) / 6.283 % 1 + 1) % 1) * w * 4 - w * 1.5; if (sx < 0 || sx > w) continue; c.fillRect(sx, hash2(i, 13) * hor * .8, this.dpr * (1 + (i % 3 === 0)), this.dpr * (1 + (i % 3 === 0))); } const mx = ((1.2 - a) / 6.283 % 1 + 1) % 1 * w * 3 - w; c.fillStyle = this.red ? 'rgba(220,40,30,.25)' : 'rgba(230,230,210,.2)'; c.beginPath(); c.arc(mx, hor * .3, h * .07, 0, 7); c.fill(); c.fillStyle = this.red ? '#dc2a1e' : '#e8e8d4'; c.beginPath(); c.arc(mx, hor * .3, h * .035, 0, 7); c.fill(); }
    const gt = W.getT(Math.floor(px), Math.floor(py)), gc = TCOL[gt === T.WATER ? T.GRASS : gt], ga = Math.max(.2, amb + fl * .35);
    gr = c.createLinearGradient(0, hor, 0, h); gr.addColorStop(0, rgb(fog, 1)); gr.addColorStop(.18, rgb([gc[0] * .45 + fog[0] * .55, gc[1] * .45 + fog[1] * .55, gc[2] * .45 + fog[2] * .55], Math.max(.25, amb))); gr.addColorStop(1, rgb(gc, ga)); c.fillStyle = gr; c.fillRect(0, hor, w, h - hor);
    // garis perspektif tanah: memberi rasa kedalaman & gerak
    c.strokeStyle = 'rgba(0,0,0,.1)'; c.lineWidth = this.dpr; c.beginPath(); for (let d = .6; d < 14; d += .9) { const ph = ((d - ((px * dX + py * dY) % .9) + .9) % 14) + .5, y = hor + eye * U / ph; if (y < h) { c.moveTo(0, y); c.lineTo(w, y); } } c.stroke();
    if (!this.stamp || this.stamp.length !== W.o.length) this.stamp = new Uint32Array(W.o.length);
    const stamp = this.stamp, fid = this.fid, seen = [], zb = this.zbuf;
    for (let col = 0; col < cols; col++) {
      const camX = 2 * (col + .5) / cols - 1, rx = dX + pX * camX, ry = dY + pY * camX;
      let mx = Math.floor(px), my = Math.floor(py); const ddx = Math.abs(1 / (rx || 1e-9)), ddy = Math.abs(1 / (ry || 1e-9)), sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1;
      let tx = (rx < 0 ? px - mx : mx + 1 - px) * ddx, ty = (ry < 0 ? py - my : my + 1 - py) * ddy, side = 0, hit = 0, dist = 30, hi = 0;
      for (let n = 0; n < 48; n++) {
        if (tx < ty) { dist = tx; tx += ddx; mx += sx; side = 0; } else { dist = ty; ty += ddy; my += sy; side = 1; }
        if (dist > 30 || mx < 0 || my < 0 || mx >= W.W || my >= W.H) break;
        const i = my * W.W + mx, o = W.o[i];
        if (o) { if (ODEF[o].wall) { hit = o; hi = i; break; } if (stamp[i] !== fid) { stamp[i] = fid; seen.push(i); } }
      }
      zb[col] = hit ? dist : 99;
      if (!hit) continue;
      const d = ODEF[hit], lh = U / dist, bot = hor + eye * lh, top = bot - d.h * lh, x = col * step;
      let u = side === 0 ? py + dist * ry : px + dist * rx; u -= Math.floor(u);
      const L = Math.min(1, amb + fl * Math.max(0, 1 - dist / 13) * Math.max(0, 1 - Math.abs(camX) * 1.25)) * (side ? .74 : 1) / (1 + dist * .04);
      const f = Math.min(1, dist / 24 * fden * 1.6), cl = wallCol(W, hi, hit);
      const tex = hit === O.WINDOW ? TEX.wall.window : hit === O.DOOR || hit === O.P_DOOR ? TEX.wall.door : hit === O.P_WALL ? TEX.wall.plank : hit === O.P_MWALL ? TEX.wall.metal : TEX.wall.brick;
      c.fillStyle = 'rgb(' + cl[0] + ',' + cl[1] + ',' + cl[2] + ')'; c.fillRect(x, top, step, bot - top + 1);
      c.drawImage(tex, Math.min(63, u * 64) | 0, 0, 1, 64, x, top, step, bot - top + 1);
      const al = 1 - L * (1 - f); if (al > .01) { c.fillStyle = 'rgba(' + (fog[0] * f / al | 0) + ',' + (fog[1] * f / al | 0) + ',' + (fog[2] * f / al | 0) + ',' + al + ')'; c.fillRect(x, top - 1, step, bot - top + 2); }
      if (d.hp && W.hp[hi] < d.hp * .5) { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x, top + (bot - top) * (.2 + hash2(col, mx) * .5), step, (bot - top) * .12); }
    }
    c.imageSmoothingEnabled = true;
    const bl = [], inv = 1 / (pX * dY - dX * pY);
    const add = (img, x, y, ww, hw2, z0) => { const rx = x - px, ry = y - py, tX = inv * (dY * rx - dX * ry), tY = inv * (-pY * rx + pX * ry); if (tY < .2 || tY > 30) return; bl.push({ img, tX, tY, ww, hh: hw2, z0: z0 || 0 }); };
    for (const i of seen) { const x = i % W.W, y = (i / W.W) | 0, o = W.o[i], d = ODEF[o]; if (o === O.FIRE) { add(SPR.o[o], x + .5, y + .5, .8, .16); add(SPR.flame[(t * 9 + x) % 3 | 0], x + .5, y + .5, .5, .75); } else if (o === O.TREE) { const v = .85 + hash2(x, y) * .3; add(SPR.o[o], x + .5, y + .5, 1.6 * v, 2.3 * v); } else if (o === O.PLANT) add(SPR.plant[W.st[i]], x + .5, y + .5, .9, .45); else if (o === O.DOOR_O || o === O.P_DOOR_O) add(SPR.o[o], x + .1, y + .1, .14, 1); else if (o === O.CAR) add(SPR.o[o], x + .5, y + .5, 1.4, .64); else if (SPR.o[o]) add(SPR.o[o], x + .5, y + .5, o === O.TORCH ? .22 : .92, Math.max(.16, d.h)); }
    for (const z of g.zombies) if (!z.gone) { const sz = ZSIZE[z.k]; if (z.st === 0) add(SPR.z[z.k][0], z.x, z.y, sz[1] * .9, .2); else add(SPR.z[z.k][(t * (z.st === 3 ? 6 : 2.5) + z.id) % 2 | 0], z.x, z.y, sz[0] * .86, sz[1] * .86); }
    for (const p of g.players) if (p !== me && !p.dead) add(playerSprite(p.col)[0], p.x, p.y, .7, .82);
    for (const d of g.drops) add(dropSprite(d.it), d.x, d.y, .4, .4);
    for (const q of g.projs) add(dropSprite(q.k), q.x, q.y, .35, .35, q.z);
    for (const f of g.fires) for (let k = 0; k < 4; k++) add(f.k ? SPR.spit : SPR.flame[(t * 9 + k) % 3 | 0], f.x + Math.cos(k * 1.6 + 1) * f.r * .55, f.y + Math.sin(k * 1.6 + 1) * f.r * .55, .8, f.k ? .25 : 1);
    if (g.evac.st === 2) add(SPR.heli, g.evac.x, g.evac.y, 3.4, 1.5, .4);
    for (const p of this.parts) { const rx = p.x - px, ry = p.y - py, tX = inv * (dY * rx - dX * ry), tY = inv * (-pY * rx + pX * ry); if (tY < .2) continue; const col = (w / 2 * (1 + tX / tY) / step) | 0; if (col < 0 || col >= cols || zb[col] < tY) continue; const s = Math.max(2, p.s * U / tY); c.fillStyle = p.c; c.fillRect(col * step, hor + (eye - p.z) * U / tY, s, s); }
    bl.sort((a2, b) => b.tY - a2.tY);
    for (const b of bl) {
      const sxc = w / 2 * (1 + b.tX / b.tY), pw = b.ww * U / b.tY, ph = b.hh * U / b.tY, bot = hor + (eye - b.z0) * U / b.tY, x0 = sxc - pw / 2;
      if (x0 > w || x0 + pw < 0) continue;
      const L = Math.min(1, amb + fl * Math.max(0, 1 - b.tY / 13) * Math.max(0, 1 - Math.abs(b.tX / b.tY) * 2)) * (1 - Math.min(.85, b.tY / 24 * fden * 1.6));
      c.globalAlpha = clamp(L * 1.15, .08, 1);
      const c0 = Math.max(0, Math.floor(x0 / step)), c1 = Math.min(cols - 1, Math.floor((x0 + pw) / step)); let rs = -1;
      for (let col = c0; col <= c1 + 1; col++) {
        const vis = col <= c1 && zb[col] > b.tY;
        if (vis && rs < 0) rs = col; else if (!vis && rs >= 0) { const a0 = Math.max(x0, rs * step), a1 = Math.min(x0 + pw, col * step); if (a1 > a0) c.drawImage(b.img, (a0 - x0) / pw * b.img.width, 0, (a1 - a0) / pw * b.img.width, b.img.height, a0, bot - ph, a1 - a0, ph); rs = -1; }
      }
    }
    c.globalAlpha = 1;
    if (!me.dead) { this.viewModel(me); const k = 7 * this.dpr; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 3.5 * this.dpr; for (let p = 0; p < 2; p++) { c.beginPath(); c.moveTo(w / 2 - k, h / 2); c.lineTo(w / 2 - k * .35, h / 2); c.moveTo(w / 2 + k * .35, h / 2); c.lineTo(w / 2 + k, h / 2); c.moveTo(w / 2, h / 2 - k); c.lineTo(w / 2, h / 2 - k * .35); c.moveTo(w / 2, h / 2 + k * .35); c.lineTo(w / 2, h / 2 + k); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5 * this.dpr; } }
  }
  /* senjata di tangan: digambar, bukan emoji */
  viewModel(me) {
    const c = this.ctx, w = this.w, h = this.h, u = h * .01, it = me.held ? ITEMS[me.held] : null, k = it ? it.k : '', id = me.held;
    const sw = me.swing > 0 ? (1 - me.swing / .25) : 0, recoil = this.flashes.some(f => Math.hypot(f.x - me.x, f.y - me.y) < 1) ? 1 : 0;
    const bx = w * .66 + Math.sin(this.bob) * w * .008, by = h * 1.0 + Math.abs(Math.cos(this.bob)) * h * .012;
    const fs = col => { c.fillStyle = col; c.fill(); c.stroke(); };
    c.save(); c.lineWidth = u * .5; c.strokeStyle = INK; c.lineJoin = 'round';
    if (k === 'gun' && id !== 'busur') {
      c.translate(bx, by + recoil * u * 2); c.rotate(-.08 - recoil * .06);
      const long = id !== 'pistol';
      if (recoil) { c.fillStyle = 'rgba(255,230,150,.9)'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * .628, r = (i % 2 ? 3 : 9) * u; c.lineTo(-u * (long ? 16 : 6) + Math.cos(a) * r, -u * (long ? 46 : 30) + Math.sin(a) * r); } c.fill(); }
      if (long) { c.beginPath(); c.moveTo(-u * 18, -u * 44); c.lineTo(-u * 14, -u * 46); c.lineTo(-u * 2, -u * 20); c.lineTo(-u * 7, -u * 17); c.closePath(); fs('#2a2e33'); c.beginPath(); c.moveTo(-u * 8, -u * 22); c.lineTo(u * 2, -u * 26); c.lineTo(u * 16, u * 4); c.lineTo(u * 2, u * 4); c.closePath(); fs('#6a4a2a'); }
      else { c.beginPath(); rr(c, -u * 9, -u * 32, u * 8, u * 20, u); fs('#2a2e33'); c.beginPath(); rr(c, -u * 7, -u * 16, u * 8, u * 16, u * 2); fs('#1c1f23'); }
      c.beginPath(); rr(c, -u * 6, -u * 14, u * 14, u * 30, u * 5); fs('#c99868');
    } else {
      c.translate(bx - sw * w * .2, by - Math.sin(sw * Math.PI) * h * .16); c.rotate(-.55 + sw * 1.5);
      if (id === 'busur') { c.strokeStyle = '#8a6a3c'; c.lineWidth = u * 1.6; c.beginPath(); c.arc(0, -u * 30, u * 22, -2.2, -.95); c.stroke(); c.strokeStyle = '#ddd'; c.lineWidth = u * .3; c.beginPath(); c.moveTo(Math.cos(-2.2) * u * 22, -u * 30 + Math.sin(-2.2) * u * 22); c.lineTo(Math.cos(-.95) * u * 22, -u * 30 + Math.sin(-.95) * u * 22); c.stroke(); c.strokeStyle = INK; c.lineWidth = u * .5; }
      else if (k === 'melee') {
        const len = id === 'bambu' ? 62 : id === 'linggis' ? 46 : 40, th = id === 'pentungan' ? 5 : 2.6;
        c.beginPath(); rr(c, -u * th / 2, -u * len, u * th, u * len, u); fs(id === 'linggis' ? '#8a929a' : id === 'bambu' ? '#b8a468' : '#7a5a34');
        if (id === 'golok') { c.beginPath(); c.moveTo(-u * 2, -u * 14); c.lineTo(-u * 4, -u * 50); c.lineTo(u * 4, -u * 46); c.lineTo(u * 3, -u * 14); c.closePath(); fs('#c8d0d6'); }
        else if (id === 'kapak') { c.beginPath(); c.moveTo(-u * 2, -u * 40); c.lineTo(-u * 14, -u * 44); c.lineTo(-u * 14, -u * 28); c.lineTo(-u * 2, -u * 31); c.closePath(); fs('#aab2ba'); }
        else if (id === 'bambu') { c.beginPath(); c.moveTo(-u * 1.3, -u * 62); c.lineTo(0, -u * 72); c.lineTo(u * 1.3, -u * 62); fs('#e0d0a0'); }
      } else if (it) { c.font = h * .16 + 'px ' + EMO; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.ic, 0, -u * 20); c.textBaseline = 'alphabetic'; }
      c.beginPath(); rr(c, -u * 6, -u * 10, u * 12, u * 30, u * 5); fs('#c99868');
      for (let i = 0; i < 4; i++) { c.beginPath(); rr(c, -u * 6.5, -u * (9 - i * 3.2), u * 9, u * 3, u * 1.4); fs('#d9a877'); }
    }
    c.restore();
    if (!it) { c.save(); c.lineWidth = u * .5; c.strokeStyle = INK; c.translate(w * .34 + Math.sin(this.bob + 1) * w * .008, h + Math.abs(Math.cos(this.bob + 1)) * h * .012); c.rotate(.45); c.beginPath(); rr(c, -u * 6, -u * 10, u * 12, u * 30, u * 5); c.fillStyle = '#c99868'; c.fill(); c.stroke(); c.restore(); }
  }

  /* ---------- lapisan layar ---------- */
  overlay(g, me) {
    const c = this.ctx, w = this.w, h = this.h; c.setTransform(1, 0, 0, 1, 0, 0);
    if (g.rain > 0.05) { c.strokeStyle = 'rgba(180,200,220,' + g.rain * .3 + ')'; c.lineWidth = this.dpr; c.beginPath(); for (let i = 0; i < 80 * g.rain; i++) { const x = Math.random() * w * 1.1, y = Math.random() * h; c.moveTo(x, y); c.lineTo(x - h * .02, y + h * .06); } c.stroke(); c.fillStyle = 'rgba(40,56,72,' + g.rain * .12 + ')'; c.fillRect(0, 0, w, h); }
    c.globalAlpha = .6 + (this.pov === 'fps' ? .1 : 0); c.drawImage(this.vig, 0, 0, w, h); c.globalAlpha = 1;
    if (me.inf > 0) { c.fillStyle = 'rgba(90,140,30,' + Math.min(.22, me.inf / 100 * .25) * (1 + .3 * Math.sin(this.t * 2)) + ')'; c.fillRect(0, 0, w, h); }
    const low = me.hp < 35 ? (35 - me.hp) / 35 : 0, hurt = me.hurtT > 0 ? .35 : 0;
    if (low || hurt) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = Math.min(.8, hurt + low * (.35 + .15 * Math.sin(this.t * 6))); c.drawImage(this.vig, 0, 0, w, h); c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(160,0,0,' + (hurt * .5 + low * .12) + ')'; c.globalAlpha = 1; c.fillRect(0, 0, w, h); }
    if (me.stun > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(.25, me.stun * .3) + ')'; c.fillRect(0, 0, w, h); }
    if (me.sleep) { c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(0, 0, w, h); }
  }
  minimap(g, me) {
    const W = g.world, c = this.ctx;
    this.mmT -= 1; if (!this.mm || (this.mmT <= 0 && this.mmN !== W.changed.size)) {
      this.mmT = 120; this.mmN = W.changed.size; if (!this.mm) this.mm = mkc(W.W, W.H, () => { });
      const x = this.mm.getContext('2d'), im = x.createImageData(W.W, W.H), d = im.data;
      for (let i = 0; i < W.o.length; i++) { let col = TCOL[W.t[i]], k = .8; const o = W.o[i]; if (W.bld[i]) { const b = BK[W.blds[W.bld[i] - 1].kind].c; col = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)]; k = .75; } if (o === O.WALL) { k = .35; } else if (o === O.TREE) { col = [30, 60, 34]; k = 1; } else if (ODEF[o].pl) { col = [255, 200, 90]; k = 1; } d[i * 4] = col[0] * k; d[i * 4 + 1] = col[1] * k; d[i * 4 + 2] = col[2] * k; d[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0);
    }
    const s = Math.round(Math.min(150 * this.dpr, this.w * .19, this.h * .24) * (this.big ? 2 : 1)), x0 = this.w - s - 12 * this.dpr, y0 = 12 * this.dpr, R = this.big ? 80 : 34;
    this.mmRect = [x0, y0, s];
    c.save(); c.beginPath(); rr(c, x0, y0, s, s, 10 * this.dpr); c.clip(); c.fillStyle = '#0c1012'; c.fillRect(x0, y0, s, s); c.imageSmoothingEnabled = false;
    const mx = this.big ? 80 : me.x, my = this.big ? 80 : me.y; c.globalAlpha = .92; c.drawImage(this.mm, mx - R, my - R, R * 2, R * 2, x0, y0, s, s); c.globalAlpha = 1; c.imageSmoothingEnabled = true;
    const k = s / (R * 2), dot = (x, y, col, r) => { c.fillStyle = INK; c.beginPath(); c.arc(x0 + (x - mx + R) * k, y0 + (y - my + R) * k, (r + 1.2) * this.dpr, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x0 + (x - mx + R) * k, y0 + (y - my + R) * k, r * this.dpr, 0, 7); c.fill(); };
    if (g.evac.st >= 1) dot(g.evac.x, g.evac.y, '#5f8', 5);
    if (g.air) dot(g.air.x, g.air.y, '#ff9a30', 3.5 + Math.sin(this.t * 5));
    for (const p of g.players) if (!p.dead) dot(p.x, p.y, p === me ? '#fff' : p.col, p === me ? 3.5 : 3);
    if (!me.dead) { c.strokeStyle = '#fff'; c.lineWidth = 1.5 * this.dpr; c.beginPath(); const ax = x0 + (me.x - mx + R) * k, ay = y0 + (me.y - my + R) * k; c.moveTo(ax, ay); c.lineTo(ax + Math.cos(me.a) * 9 * this.dpr, ay + Math.sin(me.a) * 9 * this.dpr); c.stroke(); }
    c.restore(); c.strokeStyle = 'rgba(232,226,208,.3)'; c.lineWidth = 1.5 * this.dpr; rr(c, x0, y0, s, s, 10 * this.dpr); c.stroke();
  }
}
