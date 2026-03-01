import { useCallback, useRef } from "react";

const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

const createOscillatorSound = (
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.08
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

export const useSoundEffects = () => {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const playClick = useCallback(() => {
    try {
      const ctx = getCtx();
      // Short mechanical click — two rapid tones
      createOscillatorSound(ctx, 1800, 0.04, "square", 0.05);
      setTimeout(() => createOscillatorSound(ctx, 1200, 0.03, "square", 0.03), 20);
    } catch {}
  }, [getCtx]);

  const playHover = useCallback(() => {
    try {
      const ctx = getCtx();
      // Subtle high tick
      createOscillatorSound(ctx, 2400, 0.025, "sine", 0.03);
    } catch {}
  }, [getCtx]);

  const playSuccess = useCallback(() => {
    try {
      const ctx = getCtx();
      // Gold "ding" — ascending two-note chime
      createOscillatorSound(ctx, 880, 0.15, "sine", 0.06);
      setTimeout(() => createOscillatorSound(ctx, 1320, 0.2, "sine", 0.06), 80);
    } catch {}
  }, [getCtx]);

  return { playClick, playHover, playSuccess };
};
