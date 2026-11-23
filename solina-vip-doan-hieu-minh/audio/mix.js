(() => {
  const piano = document.getElementById('background-piano');
  let context, pianoGain, masterGain, clipGain, routedClip;
  let muted = false;
  let cupActive = false;

  function initialize() {
    if (context) {
      if (context.state !== 'running') context.resume().catch(() => {});
      return;
    }

    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    try {
      context = new AudioEngine();
      pianoGain = context.createGain();
      masterGain = context.createGain();
      pianoGain.gain.value = cupActive ? 0 : 1;
      masterGain.gain.value = muted ? 0 : 1;
      pianoGain.connect(masterGain);
      masterGain.connect(context.destination);
      context.createMediaElementSource(piano).connect(pianoGain);
      context.resume().catch(() => {});
    } catch {
      context?.close().catch(() => {});
      context = pianoGain = masterGain = undefined;
    }
  }

  function level(parameter, value, duration) {
    const now = context.currentTime;
    if (parameter.cancelAndHoldAtTime) {
      parameter.cancelAndHoldAtTime(now);
    } else {
      const current = parameter.value;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(current, now);
    }
    parameter.linearRampToValueAtTime(value, now + duration);
    return now + duration;
  }

  function start() {
    initialize();
    if (!cupActive || clipGain) piano.play().catch(() => {});
  }

  function setMuted(value) {
    muted = value;
    if (masterGain) level(masterGain.gain, muted ? 0 : 1, .08);
    else piano.muted = muted;
    if (!muted) start();
  }

  function beginCup(clip) {
    start();
    cupActive = true;
    if (context && routedClip !== clip) {
      try {
        const source = context.createMediaElementSource(clip);
        clipGain = context.createGain();
        clipGain.gain.value = 0;
        source.connect(clipGain);
        clipGain.connect(masterGain);
        routedClip = clip;
      } catch {
        clipGain = undefined;
      }
    }
    if (!clipGain) {
      piano.pause();
      return;
    }

    const pianoSilent = level(pianoGain.gain, 0, .28);
    clipGain.gain.cancelScheduledValues(context.currentTime);
    clipGain.gain.setValueAtTime(0, context.currentTime);
    clipGain.gain.setValueAtTime(0, pianoSilent + .025);
    clipGain.gain.linearRampToValueAtTime(1, pianoSilent + .18);
  }

  function endCup() {
    cupActive = false;
    if (clipGain) {
      const now = context.currentTime;
      clipGain.gain.cancelScheduledValues(now);
      clipGain.gain.setValueAtTime(0, now);
      level(pianoGain.gain, 1, .85);
    }
    start();
  }

  window.solinaAudio = {start, setMuted, beginCup, endCup};
})();
