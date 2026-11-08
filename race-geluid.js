// Geluid voor het racespel. Alles wordt ter plekke gemaakt met Web Audio: geen geluidsbestanden nodig.
// Browsers (zeker iPhone/iPad) laten pas geluid toe na een tik of toets: roep Geluid.ontgrendel() aan bij Start.
const Geluid = (() => {
  let ac = null, hoofd = null, aan = localStorage.getItem('raceGeluid') !== 'uit';
  let motor, andere, gruis, piep, ruis;
  let laatsteKlap = 0, laatsteDuw = 0;

  function ruisBuffer() {   // 2 seconden witte ruis, voor grind, piepende banden en klappen
    const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function ruisBron(filterType, freq, q) {   // doorlopende ruis door een filter, met eigen volumeknop (start stil)
    const bron = ac.createBufferSource(); bron.buffer = ruis; bron.loop = true;
    const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0;
    bron.connect(f).connect(g).connect(hoofd); bron.start();
    return { g, f };
  }
  function maakMotor(volume) {   // zaagtand + blokgolf een octaaf lager, door een laagdoorlaatfilter = brommende motor
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square';
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4;
    const g = ac.createGain(); g.gain.value = 0;
    const g2 = ac.createGain(); g2.gain.value = 0.5;
    o1.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(hoofd);
    o1.start(); o2.start();
    return { o1, o2, f, g, volume };
  }

  function bouw() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    hoofd = ac.createGain(); hoofd.gain.value = aan ? 0.8 : 0;
    const comp = ac.createDynamicsCompressor();   // nooit te hard, ook niet als alles tegelijk klinkt
    hoofd.connect(comp).connect(ac.destination);
    ruis = ruisBuffer();
    motor = maakMotor(0.22);
    andere = maakMotor(0.12);   // de dichtste tegenstander
    gruis = ruisBron('bandpass', 700, 0.8);
    piep = ruisBron('bandpass', 2600, 6);
  }

  // Toerental met versnellingen: binnen elke versnelling stijgt de toon, bij het schakelen zakt hij terug
  function toon(v) {
    const s = Math.abs(v), grens = [0, 140, 280, 420, 560, 700];
    let n = 0; while (n < grens.length - 2 && s > grens[n + 1]) n++;
    const deel = Math.min(1, (s - grens[n]) / (grens[n + 1] - grens[n]));
    return 42 + n * 9 + deel * 75;
  }
  function zetMotor(m, v, kracht, t) {
    const f = toon(v);
    m.o1.frequency.setTargetAtTime(f, t, 0.04);
    m.o2.frequency.setTargetAtTime(f / 2, t, 0.04);
    m.f.frequency.setTargetAtTime(300 + f * 6 * (0.6 + 0.4 * kracht), t, 0.05);
    m.g.gain.setTargetAtTime(m.volume * kracht, t, 0.06);
  }

  function blip(freq, duur, type = 'square', volume = 0.25, start = 0) {   // korte toon (aftellen, ronde, finish)
    const t = ac.currentTime + start, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + 0.01);
    g.gain.setValueAtTime(volume, t + duur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    o.connect(g).connect(hoofd); o.start(t); o.stop(t + duur + 0.05);
  }
  function bons(sterk) {   // klap: dof geruis + een zakkende lage toon
    const t = ac.currentTime;
    const bron = ac.createBufferSource(); bron.buffer = ruis;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + sterk * 900;
    const g = ac.createGain(); g.gain.setValueAtTime(0.5 * sterk + 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    bron.connect(f).connect(g).connect(hoofd); bron.start(t, Math.random()); bron.stop(t + 0.3);
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    og.gain.setValueAtTime(0.6 * sterk + 0.1, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(og).connect(hoofd); o.start(t); o.stop(t + 0.3);
  }

  return {
    get aan() { return aan; },
    get toestand() {   // om te testen: draait het geluid en hoe luid staan motor, grind en banden?
      if (!ac) return 'geen';
      const r = x => +x.g.gain.value.toFixed(3);
      return { ac: ac.state, motor: r(motor), hz: Math.round(motor.o1.frequency.value), andere: r(andere), grind: r(gruis), banden: r(piep), hoofd: +hoofd.gain.value.toFixed(2) };
    },
    ontgrendel() {   // moet binnen een tik of toets gebeuren
      if (!ac) bouw();
      if (ac && ac.state !== 'running') ac.resume();
    },
    zetAan(ja) {
      aan = ja; localStorage.setItem('raceGeluid', ja ? 'aan' : 'uit');
      if (ja && !ac) this.ontgrendel();   // eerste keer: binnen deze tik aanmaken (een gepauzeerd spel blijft stil)
      if (hoofd) { hoofd.gain.cancelScheduledValues(0); hoofd.gain.value = ja ? 0.8 : 0; }   // meteen, ook tijdens de pauze
    },
    stop() { if (ac && ac.state === 'running') ac.suspend(); },   // pauze of app verlaten
    verder() { if (ac && aan) ac.resume(); },

    // Elke beeldje: motor van de speler en de dichtste tegenstander, grind naast de weg, piepende banden in de bocht
    rijden(speler, autos, opWeg, actief) {
      if (!ac || ac.state !== 'running') return;
      const t = ac.currentTime;
      if (!actief) {
        for (const m of [motor, andere]) m.g.gain.setTargetAtTime(0, t, 0.15);
        gruis.g.gain.setTargetAtTime(0, t, 0.1); piep.g.gain.setTargetAtTime(0, t, 0.05);
        return;
      }
      const v = Math.abs(speler.v);
      zetMotor(motor, speler.v, (speler.gasAan ? 1 : 0.55) * (0.6 + 0.4 * Math.min(1, v / 300)), t);
      let dichtste = null, afstand = Infinity;
      for (const a of autos) if (a !== speler) { const d = Math.hypot(a.x - speler.x, a.y - speler.y); if (d < afstand) { afstand = d; dichtste = a; } }
      if (dichtste) zetMotor(andere, dichtste.v, Math.max(0, 1 - afstand / 700), t);
      gruis.g.gain.setTargetAtTime(!opWeg && v > 40 ? 0.35 * Math.min(1, v / 250) : 0, t, 0.05);
      gruis.f.frequency.setTargetAtTime(400 + v, t, 0.1);
      const slip = Math.abs(speler.stuur || 0) * Math.max(0, (v - 380) / 190);
      piep.g.gain.setTargetAtTime(opWeg ? 0.12 * Math.min(1, slip) : 0, t, 0.05);
    },
    klap(sterk) {   // botsing tegen een huis (sterk 0..1)
      if (!ac || ac.state !== 'running' || ac.currentTime - laatsteKlap < 0.25) return;
      laatsteKlap = ac.currentTime; bons(Math.min(1, sterk));
    },
    duw() {   // tegen een andere auto
      if (!ac || ac.state !== 'running' || ac.currentTime - laatsteDuw < 0.3) return;
      laatsteDuw = ac.currentTime; bons(0.25);
    },
    aftel(n) { if (ac && ac.state === 'running') n > 0 ? blip(440, 0.25) : blip(880, 0.6); },
    ronde(laatste) {
      if (!ac || ac.state !== 'running') return;
      blip(660, 0.15, 'triangle', 0.3); blip(990, 0.25, 'triangle', 0.3, 0.12);
      if (laatste) blip(1320, 0.35, 'triangle', 0.3, 0.26);
    },
    finish(gewonnen) {
      if (!ac || ac.state !== 'running') return;
      const noten = gewonnen ? [523, 659, 784, 1047, 784, 1047] : [523, 587, 659, 523];
      noten.forEach((f, i) => blip(f, i === noten.length - 1 ? 0.6 : 0.16, 'square', 0.18, i * 0.15));
    },
  };
})();
