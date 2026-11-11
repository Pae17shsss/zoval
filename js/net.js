'use strict';
/* ===== SENYAP — jaringan P2P (PeerJS / WebRTC). Host memegang simulasi. ===== */
const NET = {
  peer: null, conns: [], conn: null, code: '', nextId: 2,
  genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; },
  host(cb) {
    if (!window.Peer) return cb('Pustaka jaringan gagal dimuat — periksa koneksi internet.');
    this.code = this.genCode(); let done = false;
    const peer = this.peer = new Peer('senyap-' + this.code, { debug: 0 });
    peer.on('open', () => { if (!done) { done = true; cb(null, this.code); } });
    peer.on('error', e => { if (!done) { done = true; cb('Gagal membuat room (' + e.type + ').'); } });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
    peer.on('connection', c => {
      c.on('open', () => { this.conns.push(c); });
      c.on('data', d => app.hostData(c, d));
      c.on('close', () => { this.conns = this.conns.filter(x => x !== c); app.hostLeave(c); });
      c.on('error', () => { });
    });
  },
  join(code, cb) {
    if (!window.Peer) return cb('Pustaka jaringan gagal dimuat — periksa koneksi internet.');
    let done = false; const fin = (e) => { if (!done) { done = true; clearTimeout(to); cb(e); } };
    const to = setTimeout(() => fin('Room tidak ditemukan / waktu habis.'), 12000);
    const peer = this.peer = new Peer({ debug: 0 });
    peer.on('open', () => {
      const c = this.conn = peer.connect('senyap-' + code, { reliable: true, serialization: 'json' });
      c.on('open', () => fin(null));
      c.on('data', d => app.clientData(d));
      c.on('close', () => app.clientLost());
      c.on('error', () => app.clientLost());
    });
    peer.on('error', e => { if (!done) fin(e.type === 'peer-unavailable' ? 'Room "' + code + '" tidak ditemukan.' : 'Gagal terhubung (' + e.type + ').'); });
  },
  send(o) { if (this.conn && this.conn.open) this.conn.send(o); },
  close() { try { if (this.peer) this.peer.destroy(); } catch (e) { } this.peer = null; this.conns = []; this.conn = null; }
};
