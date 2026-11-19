const tunes = {
  bloom: [[523, 0, .19], [659, .078, .20], [784, .16, .22], [1047, .265, .32]],
  friend: [[659, 0, .23], [880, .09, .22], [988, .18, .27], [1319, .28, .33]],
  hop: [[340, 0, .15, 505]],
  boost: [[450, 0, .16, 805], [988, .075, .16]],
  clear: [[260, 0, .11], [327, .095, .15], [523, .15, .22], [698, .24, .30]],
  launch: [[500, 0, .20, 1020], [1175, .125, .20]],
  miss: [[422, 0, .16], [316, .095, .20]],
  win: [[523, 0, .19], [659, .11, .18], [784, .22, .22], [1047, .33, .3], [784, .5, .23], [1175, .63, .29], [1319, .77, .45]],
};

export function createSound() {
  let context;
  let enabled = true;
  try { enabled = localStorage.getItem('lucky-panda-muted') !== '1'; } catch { /* Storage can be blocked for local files. */ }
  return {
    get enabled() { return enabled; },
    unlock() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio || !enabled) return;
      context ||= new Audio();
      if (context.state === 'suspended') context.resume().catch(() => {});
    },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem('lucky-panda-muted', enabled ? '0' : '1'); } catch { /* Keep the preference for this session. */ }
      if (!enabled && context?.state === 'running') context.suspend().catch(() => {});
      if (enabled) this.unlock();
      return enabled;
    },
    play(name) {
      if (!enabled || context?.state !== 'running') return;
      const start = context.currentTime + .009;
      for (const [frequency, delay, length, endFrequency] of tunes[name]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const t = start + delay;
        oscillator.type = endFrequency ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, t);
        if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, t + length * .75);
        gain.gain.setValueAtTime(.001, t);
        gain.gain.exponentialRampToValueAtTime(name === 'hop' ? .032 : .055, t + .019);
        gain.gain.exponentialRampToValueAtTime(.001, t + length);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(t);
        oscillator.stop(t + length + .01);
      }
    },
  };
}
