// Screen 16 (O4b) state: is the on-device model ready, downloadable, or missing?
import { useEffect, useState } from 'react';

export type ModelState = 'checking' | 'available' | 'downloadable' | 'downloading' | 'unavailable';
const LM = () => (globalThis as any).LanguageModel;

export function useModelState() {
  const [state, setState] = useState<ModelState>(() => (LM()?.availability ? 'checking' : 'unavailable'));
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!LM()?.availability) return;
    LM().availability().then((a: string) => setState(a === 'available' ? 'available' : a === 'downloadable' || a === 'downloading' ? 'downloadable' : 'unavailable'))
      .catch(() => setState('unavailable'));
  }, []);
  // Chrome only starts the download from a user gesture, so this runs from the button.
  const download = async () => {
    setState('downloading');
    try {
      const s = await LM().create({ monitor: (m: EventTarget) => m.addEventListener('downloadprogress', (e: any) => setPct(Math.round(e.loaded * 100))) });
      s.destroy?.();
      setState('available');
    } catch { setState('unavailable'); }
  };
  return { state, pct, download };
}

