let ctx = null;
let enabled = localStorage.getItem("soundEnabled") !== "false";
let ambientNodes = [];

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, type, start, dur, gainVal, dest) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(dest || c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(gainVal, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

export function setSound(on) {
  enabled = on;
  localStorage.setItem("soundEnabled", on ? "true" : "false");
}

export function isSoundEnabled() { return enabled; }

export function playLevelUp() {
  if (!enabled) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, "triangle", i * 0.12, 0.35, 0.18));
  tone(1047, "sine", 0.5, 0.6, 0.12);
}

export function playQuestComplete() {
  if (!enabled) return;
  tone(880, "sine", 0, 0.15, 0.15);
  tone(1047, "sine", 0.1, 0.2, 0.12);
  tone(1319, "sine", 0.2, 0.3, 0.1);
}

export function playGoldEarned() {
  if (!enabled) return;
  tone(1047, "sine", 0, 0.12, 0.1);
  tone(1175, "sine", 0.08, 0.12, 0.08);
}

export function playStreakComplete() {
  if (!enabled) return;
  [523, 659, 784, 880, 1047, 1175].forEach((f, i) => tone(f, "triangle", i * 0.08, 0.25, 0.15));
}

/* Ambient music — campfire atmosphere: warm pads + crackle, calm and immersive */
export function startAmbient() {
  const c = getCtx();
  const master = c.createGain();
  master.gain.setValueAtTime(0.0, c.currentTime);
  master.gain.linearRampToValueAtTime(0.22, c.currentTime + 4);
  master.connect(c.destination);

  // Long warm reverb
  const reverb = c.createConvolver();
  const reverbLen = c.sampleRate * 4;
  const reverbBuf = c.createBuffer(2, reverbLen, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = reverbBuf.getChannelData(ch);
    for (let i = 0; i < reverbLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
  }
  reverb.buffer = reverbBuf;

  const reverbGain = c.createGain();
  reverbGain.gain.value = 0.55;
  reverb.connect(reverbGain);
  reverbGain.connect(master);

  const dryGain = c.createGain();
  dryGain.gain.value = 0.5;
  dryGain.connect(master);

  // Low-pass filter for warmth
  const warmth = c.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = 1200;
  warmth.Q.value = 0.7;
  warmth.connect(dryGain);
  warmth.connect(reverb);

  // Campfire crackle using band-limited noise bursts
  function crackle() {
    if (!enabled) return;
    const bufLen = c.sampleRate * 0.08;
    const noiseBuf = c.createBuffer(1, bufLen, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 4);
    const noise = c.createBufferSource();
    noise.buffer = noiseBuf;
    const ng = c.createGain();
    const crackleVol = 0.04 + Math.random() * 0.06;
    ng.gain.setValueAtTime(crackleVol, c.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
    const crackleFilt = c.createBiquadFilter();
    crackleFilt.type = "bandpass";
    crackleFilt.frequency.value = 800 + Math.random() * 1200;
    crackleFilt.Q.value = 0.5;
    noise.connect(crackleFilt);
    crackleFilt.connect(ng);
    ng.connect(master);
    noise.start(c.currentTime);
    noise.stop(c.currentTime + 0.1);
  }

  // Warm chord pads — C major pentatonic (C D E G A), slow and dreamy
  const scale = [65.4, 73.4, 82.4, 98, 110, 130.8, 146.8, 164.8, 196, 220, 261.6];
  const chords = [
    [0, 2, 4, 7],   // C pad
    [1, 3, 5, 8],   // D/G pad
    [0, 2, 4, 7],   // C pad
    [2, 4, 6, 9],   // E/A pad
  ];

  let stopped = false;
  let chordIdx = 0;

  function playPad() {
    if (stopped) return;
    const chord = chords[chordIdx % chords.length];
    chordIdx++;

    chord.forEach((noteIdx, i) => {
      const freq = scale[noteIdx];
      const delay = i * 0.6;
      const osc = c.createOscillator();
      const g = c.createGain();
      // Alternate sine/triangle for texture
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      // Slight detuning for warmth
      osc.detune.setValueAtTime((i % 2 === 0 ? 4 : -4), c.currentTime + delay);
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.22, c.currentTime + delay + 1.2);
      g.gain.setValueAtTime(0.22, c.currentTime + delay + 3.5);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 6);
      osc.connect(g);
      g.connect(warmth);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + 7);
      ambientNodes.push(osc);
    });

    // Soft deep bass drone
    const bass = c.createOscillator();
    const bassG = c.createGain();
    bass.type = "sine";
    bass.frequency.setValueAtTime(scale[chord[0]] / 2, c.currentTime);
    bassG.gain.setValueAtTime(0, c.currentTime);
    bassG.gain.linearRampToValueAtTime(0.18, c.currentTime + 1.5);
    bassG.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 6.5);
    bass.connect(bassG);
    bassG.connect(master);
    bass.start(c.currentTime);
    bass.stop(c.currentTime + 7);
    ambientNodes.push(bass);
  }

  playPad();
  // Chord changes every 6 seconds — slow, meditative
  const padInterval = setInterval(() => { if (!stopped) playPad(); }, 6000);

  // Crackle fires at random intervals simulating fire
  let crackleTimer;
  function scheduleCrackle() {
    if (stopped) return;
    const delay = 200 + Math.random() * 600;
    crackleTimer = setTimeout(() => {
      if (!stopped) { crackle(); scheduleCrackle(); }
    }, delay);
  }
  scheduleCrackle();

  return () => {
    stopped = true;
    clearInterval(padInterval);
    clearTimeout(crackleTimer);
    master.gain.linearRampToValueAtTime(0.001, c.currentTime + 2);
    setTimeout(() => {
      ambientNodes.forEach(n => { try { n.stop(); } catch {} });
      ambientNodes = [];
    }, 2100);
  };
}
