// All sound is synthesised live with WebAudio — no audio files, no network.
// The engine is a low sawtooth plus filtered wind noise; rings chime, the
// runway touchdown thuds, a crash is a burst of noise.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineSub = null;
  let engineGain = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (context) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    engineOsc = context.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 62;
    engineSub = context.createOscillator();
    engineSub.type = 'square';
    engineSub.frequency.value = 31;
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    const engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineOsc.connect(engineFilter);
    engineSub.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(context.destination);
    engineOsc.start();
    engineSub.start();

    // Looping wind: white noise through a bandpass, gain follows airspeed.
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    windSource = context.createBufferSource();
    windSource.buffer = buffer;
    windSource.loop = true;
    windFilter = context.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    windGain = context.createGain();
    windGain.gain.value = 0;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(context.destination);
    windSource.start();
    return true;
  }

  function tone(frequency, seconds, type, volume, when) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = context.createGain();
    const start = context.currentTime + (when || 0);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  return {
    start() {
      if (started) return;
      if (!ensure()) return;
      started = true;
      if (context.state === 'suspended') context.resume();
    },
    // Called every frame while flying: engine pitch and wind follow the plane.
    update(throttle, speedRatio, airborne) {
      if (!context || !started || muted) return;
      const now = context.currentTime;
      const rpm = 58 + throttle * 66 + speedRatio * 22;
      engineOsc.frequency.setTargetAtTime(rpm, now, 0.08);
      engineSub.frequency.setTargetAtTime(rpm / 2, now, 0.08);
      engineGain.gain.setTargetAtTime(airborne ? 0.05 + throttle * 0.05 : 0.03, now, 0.1);
      windGain.gain.setTargetAtTime(airborne ? speedRatio * 0.09 : 0, now, 0.15);
      windFilter.frequency.setTargetAtTime(500 + speedRatio * 900, now, 0.15);
    },
    ring() {
      tone(880, 0.35, 'sine', 0.16);
      tone(1318, 0.5, 'sine', 0.14, 0.07);
    },
    click() {
      tone(660, 0.08, 'square', 0.05);
    },
    warning() {
      tone(440, 0.16, 'square', 0.07);
      tone(440, 0.16, 'square', 0.07, 0.22);
    },
    touchdown() {
      tone(180, 0.25, 'sine', 0.2);
      tone(90, 0.4, 'sine', 0.22, 0.05);
    },
    crash() {
      if (!context || muted) return;
      const noise = context.createBufferSource();
      const length = context.sampleRate;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      noise.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = 0.5;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      noise.start();
      tone(55, 0.7, 'sine', 0.3);
    },
    toggleMute() {
      muted = !muted;
      if (context && engineGain) engineGain.gain.value = muted ? 0 : 0.05;
      if (context && windGain) windGain.gain.value = 0;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
