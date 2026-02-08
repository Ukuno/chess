'use client';

import { useCallback, useEffect, useState } from 'react';

const MUTE_KEY = 'chess-sound-mute';

export function useSound() {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MUTE_KEY);
      setMuted(stored === 'true');
    } catch {
      setMuted(false);
    }
  }, []);

  const setMute = useCallback((value: boolean) => {
    setMuted(value);
    try {
      localStorage.setItem(MUTE_KEY, String(value));
    } catch {}
  }, []);

  const play = useCallback(
    (type: 'move' | 'capture' | 'check' | 'gameover') => {
      if (muted) return;
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        const configs = {
          move: { freq: 400, duration: 0.05, type: 'sine' as OscillatorType },
          capture: { freq: 200, duration: 0.1, type: 'square' as OscillatorType },
          check: { freq: 600, duration: 0.15, type: 'sine' as OscillatorType },
          gameover: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        };
        const { freq, duration, type } = configs[type];
        oscillator.frequency.value = freq;
        oscillator.type = type;
        gain.gain.setValueAtTime(0.15, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch {}
    },
    [muted]
  );

  return { play, muted, setMute };
}
