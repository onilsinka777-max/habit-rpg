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

/* Ambient music — dungeon atmosphere: deep Dm drones, minor pads, cave water drips */
export function startAmbient() {
  const c = getCtx();
  const master = c.createGain();
  master.gain.setValueAtTime(0.0, c.currentTime);
  master.gain.linearRampToValueAtTime(0.18, c.currentTime + 6);
  master.connect(c.destination);

  // Cave reverb — long 6-second tail, dark and spacious
  const reverb = c.createConvolver();
  const reverbLen = c.sampleRate * 6;
  const reverbBuf = c.createBuffer(2, reverbLen, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = reverbBuf.getChannelData(ch);
    for (let i = 0; i < reverbLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 1.6);
    }
  }
  reverb.buffer = reverbBuf;
  const reverbGain = c.createGain();
  reverbGain.gain.value = 0.72;
  reverb.connect(reverbGain);
  reverbGain.connect(master);

  const dryGain = c.createGain();
  dryGain.gain.value = 0.28;
  dryGain.connect(master);

  // Dark low-pass — cuts highs for underground gloom
  const darkFilter = c.createBiquadFilter();
  darkFilter.type = "lowpass";
  darkFilter.frequency.value = 700;
  darkFilter.Q.value = 0.5;
  darkFilter.connect(dryGain);
  darkFilter.connect(reverb);

  // D natural minor scale (Hz): D2 F2 G2 A2 Bb2 C3 D3 Eb3 F3 G3 A3 Bb3 C4 D4
  const S = [36.7, 73.4, 87.3, 98.0, 110.0, 116.5, 130.8, 146.8, 155.6, 174.6, 196.0, 220.0, 233.1, 261.6, 293.7];
  //         D1    D2    F2    G2    A2     Bb2    C3     D3     Eb3    F3     G3     A3     Bb3    C4     D4

  // Minor chord progressions (indices into S)
  // Dm: D2 F2 A2 D3   Gm: G2 Bb2 D3 G3   Am: A2 C3 F3 A3   Cm: C3 Eb3 G3 C4
  const chords = [
    [1, 2, 4, 7],    // Dm
    [3, 5, 7, 10],   // Gm
    [4, 6, 9, 11],   // Am
    [1, 2, 4, 7],    // Dm
    [6, 8, 10, 13],  // Cm
    [3, 5, 7, 10],   // Gm
  ];

  let stopped = false;
  let chordIdx = 0;

  function playPad() {
    if (stopped) return;
    const chord = chords[chordIdx % chords.length];
    chordIdx++;

    chord.forEach((noteIdx, i) => {
      const freq = S[noteIdx];
      const delay = i * 0.9; // slow stagger — haunting
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      osc.detune.setValueAtTime(i % 2 === 0 ? -8 : 8, c.currentTime + delay);
      g.gain.setValueAtTime(0, c.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.17, c.currentTime + delay + 2.5);
      g.gain.setValueAtTime(0.17, c.currentTime + delay + 5.5);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 10);
      osc.connect(g);
      g.connect(darkFilter);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + 11);
      ambientNodes.push(osc);
    });

    // Deep sub-bass drone — D1 (36.7 Hz), rumbling underground
    const sub = c.createOscillator();
    const subG = c.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(S[0], c.currentTime); // D1
    subG.gain.setValueAtTime(0, c.currentTime);
    subG.gain.linearRampToValueAtTime(0.28, c.currentTime + 3);
    subG.gain.setValueAtTime(0.28, c.currentTime + 7);
    subG.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 11);
    sub.connect(subG);
    subG.connect(master); // sub bypasses filter, hits direct
    sub.start(c.currentTime);
    sub.stop(c.currentTime + 12);
    ambientNodes.push(sub);
  }

  playPad();
  const padInterval = setInterval(() => { if (!stopped) playPad(); }, 9500);

  // Cave water drips — random pitch, frequency-drop, heavy reverb tail
  function drip() {
    if (stopped) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    const pitch = 500 + Math.random() * 900;
    osc.frequency.setValueAtTime(pitch, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.25, c.currentTime + 0.18);
    const vol = 0.06 + Math.random() * 0.07;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    osc.connect(g);
    g.connect(reverb); // drips go straight into cave reverb — long echo
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.22);
  }

  let dripTimer;
  function scheduleDrip() {
    if (stopped) return;
    dripTimer = setTimeout(() => {
      if (!stopped) { drip(); scheduleDrip(); }
    }, 1800 + Math.random() * 6500); // 1.8–8.3 s between drips
  }
  scheduleDrip();

  return () => {
    stopped = true;
    clearInterval(padInterval);
    clearTimeout(dripTimer);
    master.gain.linearRampToValueAtTime(0.001, c.currentTime + 3);
    setTimeout(() => {
      ambientNodes.forEach(n => { try { n.stop(); } catch {} });
      ambientNodes = [];
    }, 3200);
  };
}
