'use strict';
/* ===== SENYAP — audio prosedural (WebAudio, tanpa berkas) ===== */
const SFX = (() => {
  let ac = null, master = null, nbuf = null, amb = null, vol = 0.8, cricketT = 0, heartT = 0, heliT = 0;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = vol;
    const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const loop = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = nbuf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return { g, fl }; };
    amb = { rain: loop('bandpass', 2400, 0.4), wind: loop('lowpass', 320, 0.8) };
    // drone ketegangan: dua gelombang rendah yang saling berdenyut
    const dg = ac.createGain(); dg.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.connect(dg); dg.connect(master);
    for (const f of [49, 49.6, 73.4]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
    amb.drone = { g: dg, fl: lp };
  }
  function out(v, pan, delay) {
    const g = ac.createGain(); g.gain.value = v;
    if (ac.createStereoPanner && pan) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(master); } else g.connect(master);
    return g;
  }
  function tone(o) {
    const t = ac.currentTime + (o.delay || 0), os = ac.createOscillator(), g = out(0, o.pan);
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.at || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    if (o.lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; os.connect(fl); fl.connect(g); } else os.connect(g);
    os.start(t); os.stop(t + o.dur + 0.05);
  }
  function noise(o) {
    const t = ac.currentTime + (o.delay || 0), s = ac.createBufferSource(), g = out(0, o.pan), fl = ac.createBiquadFilter();
    s.buffer = nbuf; s.loop = true; fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f || 2000, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur); fl.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.at || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(fl); fl.connect(g); s.start(t, Math.random()); s.stop(t + o.dur + 0.05);
  }
  const R = (a, b) => a + Math.random() * (b - a);
  const D = {
    pistol(v, p) { noise({ dur: .2, vol: v, f: 4200, f2: 400, pan: p }); tone({ f: 190, f2: 55, dur: .13, type: 'square', vol: v * .5, pan: p }); },
    shotgun(v, p) { noise({ dur: .42, vol: v * 1.2, f: 2600, f2: 180, pan: p }); tone({ f: 120, f2: 35, dur: .25, type: 'sawtooth', vol: v * .7, pan: p }); },
    senapan(v, p) { noise({ dur: .5, vol: v * 1.1, f: 5200, f2: 250, pan: p }); tone({ f: 240, f2: 45, dur: .2, type: 'square', vol: v * .55, pan: p }); noise({ dur: .9, vol: v * .25, f: 900, f2: 200, delay: .08, pan: p }); },
    busur(v, p) { tone({ f: 320, f2: 140, dur: .12, type: 'triangle', vol: v * .5, pan: p }); noise({ dur: .14, vol: v * .25, type: 'bandpass', f: 3000, f2: 900, pan: p }); },
    swing(v, p) { noise({ dur: .16, vol: v * .28, type: 'bandpass', f: 500, f2: 1900, q: 1.5, pan: p, at: .04 }); },
    hitz(v, p) { noise({ dur: .11, vol: v * .6, f: 900, f2: 160, pan: p }); tone({ f: 110, f2: 60, dur: .09, vol: v * .45, pan: p }); },
    zdie(v, p) { tone({ f: R(150, 190), f2: 48, dur: .55, type: 'sawtooth', vol: v * .3, lp: 700, pan: p }); noise({ dur: .3, vol: v * .35, f: 600, f2: 120, delay: .1, pan: p }); },
    thud(v, p) { tone({ f: 95, f2: 45, dur: .12, vol: v * .7, pan: p }); noise({ dur: .07, vol: v * .3, f: 700, pan: p }); },
    zbash(v, p) { tone({ f: 70, f2: 38, dur: .2, vol: v * .9, pan: p }); noise({ dur: .12, vol: v * .4, f: 500, pan: p }); },
    chop(v, p) { noise({ dur: .08, vol: v * .5, type: 'bandpass', f: 1500, q: 2, pan: p }); tone({ f: 210, f2: 90, dur: .08, type: 'triangle', vol: v * .5, pan: p }); },
    glass(v, p) { for (let i = 0; i < 5; i++) tone({ f: R(2200, 5200), dur: R(.08, .3), type: 'triangle', vol: v * .16, delay: i * .025, pan: p }); noise({ dur: .3, vol: v * .5, type: 'highpass', f: 3500, pan: p }); },
    door(v, p) { tone({ f: R(240, 300), f2: 420, dur: .18, type: 'sawtooth', vol: v * .12, lp: 900, pan: p }); tone({ f: 85, f2: 50, dur: .1, vol: v * .5, delay: .17, pan: p }); },
    build(v, p) { for (let i = 0; i < 2; i++) { tone({ f: 170, f2: 80, dur: .07, type: 'triangle', vol: v * .55, delay: i * .13, pan: p }); noise({ dur: .04, vol: v * .3, f: 2500, delay: i * .13, pan: p }); } },
    break(v, p) { noise({ dur: .35, vol: v * .6, type: 'bandpass', f: 900, f2: 250, q: .8, pan: p }); tone({ f: 130, f2: 40, dur: .25, type: 'square', vol: v * .25, pan: p }); },
    groan(v, p, e) { const k = e && e.zk || 0, b = [R(70, 95), R(120, 150), R(200, 240), R(50, 62), R(38, 46), R(100, 120), R(160, 190)][k]; tone({ f: b, f2: b * R(.6, .8), dur: R(.6, 1.1), type: 'sawtooth', vol: v * .34, lp: 520 + k * 60, at: .12, pan: p }); tone({ f: b * 1.51, f2: b, dur: .7, type: 'square', vol: v * .08, lp: 800, at: .2, pan: p }); },
    scream(v, p) { tone({ f: 620, f2: 1500, dur: .5, type: 'sawtooth', vol: v * .34, lp: 3200, at: .05, pan: p }); tone({ f: 1500, f2: 780, dur: .9, type: 'sawtooth', vol: v * .3, lp: 3600, delay: .45, pan: p }); noise({ dur: 1.3, vol: v * .2, type: 'bandpass', f: 2600, q: 3, pan: p }); },
    boom(v, p) { noise({ dur: .7, vol: v * 1.2, f: 1300, f2: 70, pan: p }); tone({ f: 85, f2: 26, dur: .6, vol: v, pan: p }); noise({ dur: .5, vol: v * .3, type: 'bandpass', f: 400, q: 4, delay: .1, pan: p }); },
    hurt(v) { tone({ f: 210, f2: 110, dur: .2, type: 'sawtooth', vol: v * .3, lp: 900 }); noise({ dur: .12, vol: v * .4, f: 500 }); },
    bite(v, p) { noise({ dur: .09, vol: v * .5, type: 'bandpass', f: 1300, q: 3, pan: p }); },
    step(v, p, e) { noise({ dur: .06, vol: v * (e && e.mv === 3 ? .16 : e && e.mv === 1 ? .03 : .09), f: R(350, 600), pan: p }); },
    click(v) { tone({ f: 1400, dur: .03, type: 'square', vol: v * .2 }); },
    reload(v) { tone({ f: 900, dur: .03, type: 'square', vol: v * .18 }); tone({ f: 500, dur: .05, type: 'square', vol: v * .22, delay: .22 }); noise({ dur: .05, vol: v * .2, f: 3000, delay: .4 }); },
    pick(v) { tone({ f: 620, f2: 940, dur: .09, type: 'triangle', vol: v * .22 }); },
    craft(v) { tone({ f: 440, dur: .07, type: 'triangle', vol: v * .25 }); tone({ f: 660, dur: .12, type: 'triangle', vol: v * .25, delay: .08 }); },
    loot(v) { tone({ f: 520, dur: .07, type: 'triangle', vol: v * .22 }); tone({ f: 780, dur: .07, type: 'triangle', vol: v * .22, delay: .07 }); tone({ f: 1040, dur: .14, type: 'triangle', vol: v * .22, delay: .14 }); },
    search(v) { for (let i = 0; i < 5; i++) noise({ dur: .12, vol: v * .13, type: 'bandpass', f: R(900, 2400), q: 1.2, delay: i * .27 }); },
    eat(v) { for (let i = 0; i < 3; i++) noise({ dur: .07, vol: v * .28, type: 'bandpass', f: R(700, 1100), q: 2, delay: i * .16 }); },
    drink(v) { for (let i = 0; i < 3; i++) tone({ f: 280 + i * 60, f2: 520 + i * 60, dur: .1, vol: v * .2, delay: i * .15 }); },
    heal(v) { tone({ f: 392, dur: .16, type: 'sine', vol: v * .22 }); tone({ f: 523, dur: .26, type: 'sine', vol: v * .22, delay: .12 }); },
    fire(v, p) { noise({ dur: 1.1, vol: v * .7, type: 'bandpass', f: 500, f2: 1600, q: .6, at: .1, pan: p }); D.glass(v * .6, p); },
    pop(v, p) { noise({ dur: .08, vol: v * .9, type: 'highpass', f: 1400, pan: p }); tone({ f: 420, f2: 120, dur: .05, type: 'square', vol: v * .4, pan: p }); },
    alarm(v, p) { tone({ f: 540, f2: 480, dur: .14, type: 'triangle', vol: v * .7, pan: p }); tone({ f: 1090, dur: .06, type: 'sine', vol: v * .25, pan: p }); },
    spit(v, p) { noise({ dur: .22, vol: v * .6, type: 'bandpass', f: 900, f2: 2600, q: 2.5, pan: p }); tone({ f: 260, f2: 120, dur: .16, type: 'sawtooth', vol: v * .2, lp: 700, pan: p }); },
    acid(v, p) { noise({ dur: .9, vol: v * .45, type: 'highpass', f: 3800, pan: p, at: .02 }); },
    hiss(v, p) { noise({ dur: .5, vol: v * .7, type: 'bandpass', f: 2400, f2: 5200, q: 1.5, at: .25, pan: p }); tone({ f: 180, f2: 420, dur: .45, type: 'sawtooth', vol: v * .22, lp: 1400, at: .2, pan: p }); },
    drop(v, p) { noise({ dur: .12, vol: v * .5, f: 380, pan: p }); tone({ f: 880, dur: .08, type: 'square', vol: v * .12, pan: p }); },
    pack(v) { for (let i = 0; i < 5; i++) tone({ f: R(60, 110), f2: R(40, 70), dur: R(.8, 1.4), type: 'sawtooth', vol: v * .12, lp: 420, at: .2, delay: i * .25, pan: R(-.8, .8) }); },
    pdie(v) { tone({ f: 220, f2: 40, dur: 1.4, type: 'sawtooth', vol: v * .4, lp: 600 }); },
    dusk(v) { for (let i = 0; i < 3; i++) { tone({ f: 196, dur: 2.2, vol: v * .3, delay: i * 1.5, at: .01 }); tone({ f: 293, dur: 1.8, vol: v * .12, delay: i * 1.5 }); } },
    horde(v) { for (let i = 0; i < 3; i++) { tone({ f: 300, f2: 620, dur: 1.2, type: 'sawtooth', vol: v * .22, lp: 1500, delay: i * 2.2, at: .3 }); tone({ f: 620, f2: 300, dur: 1, type: 'sawtooth', vol: v * .22, lp: 1500, delay: i * 2.2 + 1.2, at: .05 }); } },
    dawn(v) { [392, 494, 587, 784].forEach((f, i) => tone({ f, dur: 1.1, vol: v * .2, delay: i * .22, at: .03 })); },
    win(v) { [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: .9, type: 'triangle', vol: v * .25, delay: i * .18 })); },
    ui(v) { tone({ f: 760, dur: .035, type: 'triangle', vol: v * .12 }); }
  };
  return {
    init,
    setVol(v) { vol = v; if (master) master.gain.value = v; },
    play(name, v = 1, pan = 0, e) { if (!ac || ac.state !== 'running' || v < 0.015) return; const f = D[name]; if (f) f(Math.min(1.2, v), pan, e); },
    /* suasana berkelanjutan: dipanggil tiap frame */
    ambient(dt, s) {
      if (!ac || !amb) return; const t = ac.currentTime;
      amb.rain.g.gain.setTargetAtTime(s.rain * 0.3, t, 0.5);
      amb.wind.g.gain.setTargetAtTime(0.05 + s.dark * 0.07 + s.rain * 0.05, t, 1);
      amb.wind.fl.frequency.setTargetAtTime(260 + Math.sin(t * 0.3) * 120, t, 1);
      amb.drone.g.gain.setTargetAtTime(Math.min(0.22, s.tension * 0.2 + (s.horde ? 0.08 : 0)), t, 1.2);
      amb.drone.fl.frequency.setTargetAtTime(140 + s.tension * 260, t, 1);
      if (s.dark > 0.5 && s.rain < 0.3) { cricketT -= dt; if (cricketT <= 0) { cricketT = R(0.5, 2.6); const f = R(3900, 4600), pn = R(-.8, .8); for (let i = 0; i < 4; i++) tone({ f, dur: .04, vol: .018, delay: i * .07, pan: pn }); } }
      if (s.low) { heartT -= dt; if (heartT <= 0) { heartT = 0.85; tone({ f: 62, f2: 40, dur: .14, vol: .5 }); tone({ f: 58, f2: 38, dur: .16, vol: .38, delay: .2 }); } }
      if (s.heli) { heliT -= dt; if (heliT <= 0) { heliT = 0.085; noise({ dur: .07, vol: .22, f: 420 }); } }
    }
  };
})();
