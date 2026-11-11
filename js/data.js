'use strict';
/* ===== SENYAP — data: ubin, objek, item, resep, zombie ===== */
const CFG = { W: 160, H: 160, DAY: 480, NIGHT_AT: 0.58, HORDE_EVERY: 3, REACH: 3.2, HOT: 6 };

const T = { GRASS: 0, DIRT: 1, ROAD: 2, WOOD: 3, TILE: 4, WATER: 5, CONC: 6, SAND: 7 };
const TCOL = [[58, 84, 52], [98, 82, 60], [52, 54, 60], [122, 92, 62], [150, 152, 148], [38, 78, 110], [104, 104, 100], [170, 152, 108]];

const O = {
  NONE: 0, WALL: 1, WINDOW: 2, WINDOW_B: 3, DOOR: 4, DOOR_O: 5, TREE: 6, ROCK: 7, CAR: 8, BUSH: 9,
  C_LEMARI: 10, C_KULKAS: 11, C_RAK: 12, C_LOKER: 13, C_OBAT: 14, C_PETI: 15,
  P_WALL: 20, P_MWALL: 21, P_DOOR: 22, P_DOOR_O: 23, SPIKE: 24, FIRE: 25, BENCH: 26, CRATE: 27,
  RAIN: 28, PLANT: 29, BED: 30, TORCH: 31, RADIO: 32, ALARM: 33, AIRDROP: 34
};
const ODEF = [];
function od(id, n, d) { ODEF[id] = Object.assign({ id, n, solid: 0, sight: 0, h: 0, hp: 0, brk: 0, wall: 0, pl: 0, col: [120, 120, 120], g: '' }, d); }
od(O.NONE, '', {});
od(O.WALL, 'Tembok', { solid: 1, sight: 1, h: 1, wall: 1, col: [196, 186, 164] });
od(O.WINDOW, 'Jendela', { solid: 1, h: 1, wall: 1, hp: 40, brk: 1, col: [150, 190, 205] });
od(O.WINDOW_B, 'Jendela Pecah', { h: 0.28, col: [150, 140, 122] });
od(O.DOOR, 'Pintu', { solid: 1, sight: 1, h: 1, wall: 1, hp: 120, brk: 1, col: [124, 84, 50] });
od(O.DOOR_O, 'Pintu Terbuka', { h: 1, col: [124, 84, 50] });
od(O.TREE, 'Pohon', { solid: 1, h: 1.7, hp: 50, col: [36, 74, 40] });
od(O.ROCK, 'Batu', { solid: 1, h: 0.4, hp: 60, col: [128, 128, 132] });
od(O.CAR, 'Bangkai Mobil', { solid: 1, h: 0.55, hp: 80, col: [120, 60, 52] });
od(O.BUSH, 'Semak', { h: 0.4, hp: 10, col: [52, 96, 50] });
od(O.C_LEMARI, 'Lemari', { solid: 1, h: 0.85, col: [112, 78, 48], g: '🚪', c: 1 });
od(O.C_KULKAS, 'Kulkas', { solid: 1, h: 0.85, col: [205, 212, 216], g: '🧊', c: 1 });
od(O.C_RAK, 'Rak Toko', { solid: 1, h: 0.7, col: [160, 120, 60], g: '🛒', c: 1 });
od(O.C_LOKER, 'Loker Senjata', { solid: 1, h: 0.85, col: [70, 86, 110], g: '🔒', c: 1 });
od(O.C_OBAT, 'Lemari Obat', { solid: 1, h: 0.7, col: [222, 226, 226], g: '➕', c: 1 });
od(O.C_PETI, 'Peti Perkakas', { solid: 1, h: 0.45, col: [176, 60, 44], g: '🔧', c: 1 });
od(O.P_WALL, 'Dinding Kayu', { solid: 1, sight: 1, h: 1, wall: 1, hp: 220, brk: 1, pl: 1, col: [142, 104, 62] });
od(O.P_MWALL, 'Dinding Besi', { solid: 1, sight: 1, h: 1, wall: 1, hp: 650, brk: 1, pl: 1, col: [112, 122, 132] });
od(O.P_DOOR, 'Pintu Kayu', { solid: 1, sight: 1, h: 1, wall: 1, hp: 180, brk: 1, pl: 1, col: [156, 112, 60] });
od(O.P_DOOR_O, 'Pintu Kayu (buka)', { h: 1, pl: 1, hp: 180, col: [156, 112, 60] });
od(O.SPIKE, 'Ranjau Bambu', { h: 0.12, hp: 70, pl: 1, col: [170, 150, 96] });
od(O.FIRE, 'Api Unggun', { h: 0.12, hp: 60, pl: 1, col: [255, 140, 40], light: 6 });
od(O.BENCH, 'Meja Kerja', { solid: 1, h: 0.5, hp: 120, brk: 1, pl: 1, col: [150, 110, 64], g: '🛠️' });
od(O.CRATE, 'Peti Simpan', { solid: 1, h: 0.5, hp: 120, brk: 1, pl: 1, col: [170, 128, 70], g: '📦' });
od(O.RAIN, 'Penampung Hujan', { solid: 1, h: 0.5, hp: 80, pl: 1, col: [70, 116, 150], g: '💧' });
od(O.PLANT, 'Bedeng Singkong', { h: 0.12, hp: 40, pl: 1, col: [84, 62, 40] });
od(O.BED, 'Kasur', { h: 0.15, hp: 60, pl: 1, col: [80, 100, 150] });
od(O.TORCH, 'Obor', { h: 0.8, hp: 30, pl: 1, col: [255, 170, 60], light: 4.6 });
od(O.RADIO, 'Pemancar Radio', { solid: 1, h: 1.3, hp: 400, brk: 1, pl: 1, col: [86, 96, 88], g: '📡' });
od(O.ALARM, 'Kentongan', { solid: 1, h: 0.8, hp: 90, brk: 1, pl: 1, col: [134, 96, 52], g: '🔔' });
od(O.AIRDROP, 'Kiriman Udara', { solid: 1, h: 0.65, col: [114, 126, 76], c: 1 });

/* ---------- ITEM ---------- */
const ITEMS = {
  // bahan
  kayu: { n: 'Kayu', ic: '🪵', st: 40, k: 'mat', d: 'Bahan bangunan paling dasar. Tebang pohon.' },
  batu: { n: 'Batu', ic: '🪨', st: 40, k: 'mat', d: 'Pecahkan bongkahan batu.' },
  besi: { n: 'Besi Bekas', ic: '⚙️', st: 40, k: 'mat', d: 'Bongkar bangkai mobil atau geledah bengkel.' },
  kain: { n: 'Kain', ic: '🧵', st: 30, k: 'mat', d: 'Untuk perban, obor, kasur.' },
  paku: { n: 'Paku', ic: '🔩', st: 40, k: 'mat', d: 'Pengikat bangunan lanjutan.' },
  tali: { n: 'Tali', ic: '🧶', st: 20, k: 'mat', d: 'Serat dari semak atau dari toko.' },
  bensin: { n: 'Bensin', ic: '⛽', st: 10, k: 'mat', d: 'Bahan molotov.' },
  mesiu: { n: 'Mesiu', ic: '🧂', st: 20, k: 'mat', d: 'Untuk meracik peluru dan petasan.' },
  botol: { n: 'Botol Kosong', ic: '🍶', st: 10, k: 'mat', d: 'Isi di kolam, lalu rebus airnya.' },
  komponen: { n: 'Komponen Elektronik', ic: '🔌', st: 20, k: 'mat', d: 'Suku cadang pemancar radio.' },
  modul: { n: 'Modul Radio', ic: '📻', st: 4, k: 'quest', d: 'Kumpulkan 4 untuk merakit Pemancar Radio. Ada di Pos Polisi, Klinik, Bengkel, dan Gudang.' },
  // makan & minum
  biskuit: { n: 'Biskuit', ic: '🍪', st: 10, k: 'food', hu: 14, d: 'Camilan kering.' },
  mie: { n: 'Mie Instan', ic: '🍜', st: 10, k: 'food', hu: 16, th: -6, d: 'Dimakan mentah bikin haus. Rebus di api unggun.' },
  mie_rebus: { n: 'Mie Rebus', ic: '🍲', st: 5, k: 'food', hu: 46, th: 14, hp: 6, d: 'Hangat. Mengenyangkan.' },
  sarden: { n: 'Sarden Kaleng', ic: '🥫', st: 10, k: 'food', hu: 34, d: 'Protein awet.' },
  singkong: { n: 'Singkong', ic: '🍠', st: 20, k: 'food', hu: 9, d: 'Mentah kurang enak. Bakar dulu.' },
  singkong_bakar: { n: 'Singkong Bakar', ic: '🍢', st: 20, k: 'food', hu: 30, d: 'Hasil kebun sendiri.' },
  air: { n: 'Air Bersih', ic: '💧', st: 6, k: 'food', th: 42, ret: 'botol', d: 'Aman diminum.' },
  air_kotor: { n: 'Air Kotor', ic: '🌊', st: 6, k: 'food', th: 24, hp: -9, bad: 1, ret: 'botol', d: 'Bisa diminum… tapi bikin sakit. Rebus dulu.' },
  kopi: { n: 'Kopi Sachet', ic: '☕', st: 10, k: 'food', th: 8, buff: 60, d: 'Stamina pulih 2× lebih cepat selama 60 detik.' },
  // obat
  perban: { n: 'Perban', ic: '🩹', st: 10, k: 'med', hp: 14, bl: 1, d: 'Menghentikan pendarahan.' },
  p3k: { n: 'Kotak P3K', ic: '⛑️', st: 4, k: 'med', hp: 60, bl: 1, d: 'Pemulihan besar.' },
  antibiotik: { n: 'Antibiotik', ic: '💊', st: 6, k: 'med', inf: -45, d: 'Menekan infeksi gigitan.' },
  jamu: { n: 'Jamu', ic: '🍵', st: 6, k: 'med', inf: -12, hp: 8, buff: 30, d: 'Ramuan pahit. Sedikit menahan infeksi.' },
  // senjata jarak dekat
  pentungan: { n: 'Balok Kayu', ic: '🏏', st: 1, k: 'melee', dmg: 22, rng: 1.25, arc: 1.5, cd: 0.55, sta: 9, noise: 4, dur: 60, kb: 0.5, tree: 1, d: 'Lebih baik daripada tangan kosong.' },
  bambu: { n: 'Bambu Runcing', ic: '🎋', st: 1, k: 'melee', dmg: 30, rng: 2.1, arc: 0.5, cd: 0.7, sta: 10, noise: 3, dur: 45, kb: 0.7, tree: 0.5, d: 'Jangkauan jauh, tusukan sempit. Senyap.' },
  kapak: { n: 'Kapak', ic: '🪓', st: 1, k: 'melee', dmg: 38, rng: 1.3, arc: 1.3, cd: 0.8, sta: 13, noise: 5, dur: 120, kb: 0.6, tree: 3.2, obj: 2, d: 'Menebang 3× lebih cepat.' },
  golok: { n: 'Golok', ic: '🔪', st: 1, k: 'melee', dmg: 44, rng: 1.35, arc: 1.7, cd: 0.45, sta: 8, noise: 3, dur: 110, kb: 0.4, tree: 1.4, d: 'Cepat, lebar, mematikan.' },
  linggis: { n: 'Linggis', ic: '🔧', st: 1, k: 'melee', dmg: 34, rng: 1.3, arc: 1.2, cd: 0.6, sta: 10, noise: 5, dur: 220, kb: 0.9, tree: 1, obj: 3.5, d: 'Hampir tak bisa rusak. Membongkar 3,5× lebih cepat.' },
  // senjata api
  pistol: { n: 'Pistol', ic: '🔫', tag: '9mm', st: 1, k: 'gun', dmg: 38, cd: 0.28, mag: 10, ammo: 'peluru9', rl: 1.3, noise: 26, spr: 0.05, pel: 1, rng: 18, dur: 200, d: 'Andal. Tapi satu kota mendengarnya.' },
  shotgun: { n: 'Senapan Tabur', ic: '🔫', tag: 'SG', st: 1, k: 'gun', dmg: 19, cd: 0.9, mag: 4, ammo: 'peluru12', rl: 2.2, noise: 36, spr: 0.3, pel: 8, rng: 9, dur: 140, d: 'Penghancur jarak dekat. Sangat bising.' },
  senapan: { n: 'Senapan Buru', ic: '🔫', tag: 'RFL', st: 1, k: 'gun', dmg: 120, cd: 1.1, mag: 5, ammo: 'peluru_s', rl: 2.4, noise: 32, spr: 0.012, pel: 1, rng: 28, dur: 160, d: 'Satu peluru, satu mayat.' },
  busur: { n: 'Busur', ic: '🏹', st: 1, k: 'gun', dmg: 58, cd: 0.95, mag: 1, ammo: 'panah', rl: 0.5, noise: 2.5, spr: 0.03, pel: 1, rng: 15, dur: 90, quiet: 1, d: 'Nyaris tanpa suara. Senjata penyintas sejati.' },
  peluru9: { n: 'Peluru 9mm', ic: '🔸', tag: '9', st: 60, k: 'ammo', d: 'Amunisi pistol.' },
  peluru12: { n: 'Peluru Tabur', ic: '🔶', tag: '12', st: 30, k: 'ammo', d: 'Amunisi senapan tabur.' },
  peluru_s: { n: 'Peluru Senapan', ic: '🔺', tag: '7.6', st: 30, k: 'ammo', d: 'Amunisi senapan buru.' },
  panah: { n: 'Anak Panah', ic: '➶', st: 30, k: 'ammo', d: 'Amunisi busur. Bisa diracik.' },
  // lempar
  molotov: { n: 'Molotov', ic: '🍾', st: 5, k: 'throw', d: 'Lautan api selama 7 detik.' },
  petasan: { n: 'Petasan', ic: '🧨', st: 10, k: 'throw', d: 'Pengalih: memancing semua zombie ke titik lempar.' },
  // alat
  senter: { n: 'Senter', ic: '🔦', st: 1, k: 'tool', d: 'Tekan F. Terang… dan terlihat dari jauh.' },
  tas: { n: 'Ransel', ic: '🎒', st: 1, k: 'use', d: 'Gunakan untuk menambah 8 slot tas (permanen).' },
  // bangunan
  p_wall: { n: 'Dinding Kayu', ic: '🚧', st: 20, k: 'place', o: O.P_WALL, d: 'Penghalang dasar.' },
  p_mwall: { n: 'Dinding Besi', ic: '🧱', st: 20, k: 'place', o: O.P_MWALL, d: '3× lebih kuat.' },
  p_door: { n: 'Pintu Kayu', ic: '🚪', st: 10, k: 'place', o: O.P_DOOR, d: 'Zombie tak bisa membukanya — hanya mendobrak.' },
  spike: { n: 'Ranjau Bambu', ic: '🔺', tag: '▲', st: 20, k: 'place', o: O.SPIKE, d: 'Melukai & memperlambat zombie yang lewat.' },
  fire: { n: 'Api Unggun', ic: '🔥', st: 5, k: 'place', o: O.FIRE, d: 'Cahaya + dapur: rebus air, masak.' },
  bench: { n: 'Meja Kerja', ic: '🛠️', st: 5, k: 'place', o: O.BENCH, d: 'Membuka resep lanjutan.' },
  crate: { n: 'Peti Simpan', ic: '📦', st: 5, k: 'place', o: O.CRATE, d: '16 slot penyimpanan.' },
  rain: { n: 'Penampung Hujan', ic: '🪣', st: 5, k: 'place', o: O.RAIN, d: 'Mengumpulkan air bersih perlahan. Lebih cepat saat hujan.' },
  plant: { n: 'Bedeng Singkong', ic: '🌱', st: 10, k: 'place', o: O.PLANT, d: 'Tumbuh sendiri. Panen berulang.' },
  bed: { n: 'Kasur', ic: '🛏️', st: 2, k: 'place', o: O.BED, d: 'Titik bangkit. Tidur untuk melewati malam biasa.' },
  torch: { n: 'Obor', ic: '🕯️', st: 20, k: 'place', o: O.TORCH, d: 'Penerangan permanen.' },
  alarm: { n: 'Kentongan', ic: '🔔', st: 5, k: 'place', o: O.ALARM, d: 'Pukul untuk memancing zombie ke lokasinya.' },
  radio: { n: 'Pemancar Radio', ic: '📡', st: 1, k: 'place', o: O.RADIO, d: 'Panggil evakuasi. Bersiaplah untuk gelombang terakhir.' }
};
const FIST = { n: 'Tangan Kosong', k: 'melee', dmg: 9, rng: 1.05, arc: 1.2, cd: 0.45, sta: 6, noise: 2, kb: 0.3, tree: 0.6 };

/* ---------- RESEP ---------- (st: 0 tanpa stasiun, 'bench', 'fire') */
const RECIPES = [
  { out: 'pentungan', n: 1, need: { kayu: 2 }, st: 0, cat: 'Senjata' },
  { out: 'bambu', n: 1, need: { kayu: 3, tali: 1 }, st: 0, cat: 'Senjata' },
  { out: 'kapak', n: 1, need: { kayu: 2, batu: 3, tali: 1 }, st: 0, cat: 'Senjata' },
  { out: 'panah', n: 4, need: { kayu: 1, batu: 1 }, st: 0, cat: 'Senjata' },
  { out: 'busur', n: 1, need: { kayu: 4, tali: 2 }, st: 'bench', cat: 'Senjata' },
  { out: 'golok', n: 1, need: { besi: 5, kayu: 1, kain: 1 }, st: 'bench', cat: 'Senjata' },
  { out: 'peluru9', n: 6, need: { besi: 1, mesiu: 1 }, st: 'bench', cat: 'Senjata' },
  { out: 'peluru12', n: 4, need: { besi: 2, mesiu: 2 }, st: 'bench', cat: 'Senjata' },
  { out: 'peluru_s', n: 3, need: { besi: 2, mesiu: 2 }, st: 'bench', cat: 'Senjata' },
  { out: 'molotov', n: 1, need: { botol: 1, bensin: 1, kain: 1 }, st: 0, cat: 'Senjata' },
  { out: 'petasan', n: 2, need: { mesiu: 1, kain: 1 }, st: 0, cat: 'Senjata' },
  { out: 'fire', n: 1, need: { kayu: 5, batu: 3 }, st: 0, cat: 'Bangun' },
  { out: 'bench', n: 1, need: { kayu: 8, batu: 4 }, st: 0, cat: 'Bangun' },
  { out: 'p_wall', n: 1, need: { kayu: 4 }, st: 0, cat: 'Bangun' },
  { out: 'spike', n: 1, need: { kayu: 4 }, st: 0, cat: 'Bangun' },
  { out: 'torch', n: 1, need: { kayu: 2, kain: 1 }, st: 0, cat: 'Bangun' },
  { out: 'p_door', n: 1, need: { kayu: 5, paku: 2 }, st: 'bench', cat: 'Bangun' },
  { out: 'p_mwall', n: 1, need: { besi: 4, paku: 2 }, st: 'bench', cat: 'Bangun' },
  { out: 'crate', n: 1, need: { kayu: 6, paku: 2 }, st: 'bench', cat: 'Bangun' },
  { out: 'bed', n: 1, need: { kayu: 6, kain: 4 }, st: 'bench', cat: 'Bangun' },
  { out: 'rain', n: 1, need: { kayu: 4, kain: 2, botol: 1 }, st: 'bench', cat: 'Bangun' },
  { out: 'plant', n: 1, need: { kayu: 4, batu: 2 }, st: 'bench', cat: 'Bangun' },
  { out: 'alarm', n: 1, need: { kayu: 4, tali: 1 }, st: 'bench', cat: 'Bangun' },
  { out: 'radio', n: 1, need: { modul: 4, besi: 10, komponen: 6 }, st: 'bench', cat: 'Bangun' },
  { out: 'perban', n: 1, need: { kain: 2 }, st: 0, cat: 'Bertahan' },
  { out: 'tali', n: 1, need: { kain: 2 }, st: 0, cat: 'Bertahan' },
  { out: 'tas', n: 1, need: { kain: 6, tali: 2 }, st: 'bench', cat: 'Bertahan' },
  { out: 'p3k', n: 1, need: { perban: 3, jamu: 1 }, st: 'bench', cat: 'Bertahan' },
  { out: 'air', n: 1, need: { air_kotor: 1 }, st: 'fire', cat: 'Bertahan' },
  { out: 'mie_rebus', n: 1, need: { mie: 1, air: 1 }, st: 'fire', cat: 'Bertahan' },
  { out: 'singkong_bakar', n: 1, need: { singkong: 1 }, st: 'fire', cat: 'Bertahan' },
  { out: 'jamu', n: 1, need: { singkong: 2, air: 1 }, st: 'fire', cat: 'Bertahan' }
];
/* biaya bongkar balik (separuh) */
const REFUND = {};
for (const r of RECIPES) { const it = ITEMS[r.out]; if (it.k === 'place') REFUND[it.o] = r.need; }
REFUND[O.P_DOOR_O] = REFUND[O.P_DOOR];

/* ---------- LOOT ---------- [id, bobot, min, max] */
const LOOT = {
  [O.C_LEMARI]: [['kain', 30, 1, 3], ['tali', 12, 1, 2], ['paku', 12, 2, 5], ['perban', 10, 1, 1], ['senter', 6, 1, 1], ['pentungan', 6, 1, 1], ['tas', 3, 1, 1], ['botol', 10, 1, 1], ['kopi', 8, 1, 2], ['golok', 2, 1, 1], ['petasan', 6, 1, 3], ['jamu', 5, 1, 1]],
  [O.C_KULKAS]: [['mie', 26, 1, 2], ['sarden', 20, 1, 2], ['air', 24, 1, 2], ['biskuit', 20, 1, 2], ['botol', 10, 1, 2], ['kopi', 8, 1, 2]],
  [O.C_RAK]: [['mie', 20, 1, 3], ['sarden', 14, 1, 2], ['biskuit', 16, 1, 3], ['air', 16, 1, 2], ['botol', 8, 1, 2], ['tali', 10, 1, 2], ['petasan', 8, 1, 3], ['kopi', 10, 1, 3], ['bensin', 5, 1, 1], ['kain', 8, 1, 2], ['senter', 3, 1, 1]],
  [O.C_LOKER]: [['peluru9', 30, 5, 12], ['pistol', 9, 1, 1], ['peluru12', 16, 3, 6], ['shotgun', 4, 1, 1], ['peluru_s', 12, 2, 5], ['senapan', 3, 1, 1], ['mesiu', 14, 1, 3], ['golok', 6, 1, 1], ['senter', 6, 1, 1], ['perban', 8, 1, 2]],
  [O.C_OBAT]: [['perban', 34, 1, 3], ['antibiotik', 20, 1, 2], ['p3k', 8, 1, 1], ['jamu', 16, 1, 2], ['kain', 10, 1, 2], ['air', 8, 1, 1]],
  [O.AIRDROP]: [['peluru9', 20, 8, 14], ['peluru12', 14, 4, 8], ['peluru_s', 12, 3, 6], ['p3k', 14, 1, 1], ['antibiotik', 16, 1, 2], ['sarden', 14, 2, 3], ['air', 14, 2, 3], ['shotgun', 5, 1, 1], ['senapan', 4, 1, 1], ['pistol', 6, 1, 1], ['molotov', 10, 1, 2], ['komponen', 10, 2, 3], ['mesiu', 10, 2, 4], ['tas', 4, 1, 1]],
  [O.C_PETI]: [['besi', 26, 2, 5], ['paku', 26, 3, 8], ['komponen', 14, 1, 3], ['tali', 10, 1, 2], ['mesiu', 10, 1, 2], ['bensin', 10, 1, 2], ['kapak', 5, 1, 1], ['linggis', 4, 1, 1], ['golok', 3, 1, 1], ['senter', 4, 1, 1]]
};

/* ---------- ZOMBIE ---------- */
const ZT = [
  { n: 'Mayat', hp: 65, spd: 1.3, nb: 0.55, dmg: 12, cd: 1.1, r: 0.32, sight: 9, bite: 0.14, odmg: 9, col: '#7d9468', shirt: '#4d5a66' },
  { n: 'Pelari', hp: 44, spd: 3.5, nb: 0.25, dmg: 8, cd: 0.8, r: 0.28, sight: 11, bite: 0.12, odmg: 6, col: '#a39a7a', shirt: '#7a3b34' },
  { n: 'Peraung', hp: 52, spd: 1.7, nb: 0.3, dmg: 7, cd: 1.2, r: 0.3, sight: 12, bite: 0.1, odmg: 5, col: '#d2d6cc', shirt: '#3c3442' },
  { n: 'Kembung', hp: 115, spd: 0.95, nb: 0.4, dmg: 12, cd: 1.4, r: 0.44, sight: 8, bite: 0.2, odmg: 12, col: '#8a9a4c', shirt: '#5c5a30' },
  { n: 'Algojo', hp: 620, spd: 1.75, nb: 0.25, dmg: 30, cd: 1.5, r: 0.55, sight: 10, bite: 0.25, odmg: 55, col: '#5c5560', shirt: '#2a2630' },
  { n: 'Peludah', hp: 55, spd: 1.6, nb: 0.3, dmg: 8, cd: 1.2, r: 0.3, sight: 12, bite: 0.1, odmg: 5, col: '#9fb08c', shirt: '#3d5a3a' },
  { n: 'Penerkam', hp: 75, spd: 2.5, nb: 0.3, dmg: 12, cd: 0.9, r: 0.32, sight: 12, bite: 0.18, odmg: 8, col: '#c8c2bc', shirt: '#4a3a34' }
];
/* tingkat kesulitan: z = jumlah zombie, d = luka, l = jarahan */
const DIFFS = [{ n: 'PENYINTAS', z: 1, d: 1, l: 1 }, { n: 'KERAS', z: 1.3, d: 1.3, l: 0.8 }, { n: 'MIMPI BURUK', z: 1.7, d: 1.65, l: 0.6 }];
const BK = [
  { n: 'Rumah', c: '#8f7a5c' }, { n: 'Warung', c: '#d4a23a' }, { n: 'Klinik', c: '#d6dcdc' },
  { n: 'Pos Polisi', c: '#4a6ea0' }, { n: 'Bengkel', c: '#b0503c' }, { n: 'Gudang', c: '#7a7f86' }
];
const PCOLS = ['#e2b23a', '#3aa6e2', '#e2573a', '#58c26a', '#b06ae2', '#e27ab5', '#52d0c4', '#d8d8d8'];
