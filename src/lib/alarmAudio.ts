/**
 * Lightweight Web Audio synthesizer for scheduled task alarms.
 * Plays a clean, crisp two-tone alert chime (E5 -> G#5) without external media assets.
 */
export function playTaskAlarmSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // Unlock audio context if in suspended state
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    // Soft two-tone alert chime (E5 -> G#5)
    playTone(659.25, 0, 0.4);
    playTone(830.61, 0.2, 0.6);
  } catch (err) {
    console.warn('AudioContext playback error:', err);
  }
}
