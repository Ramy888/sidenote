// Mirrors the app's tokens (apps/sidenote/src/index.css) so the video and the product look like one thing.
export const T = {
  paper: '#F5F6F8', ink: '#101828', muted: '#475467', primary: '#111827', line: '#E3E7EC',
  hi: '#FFE45C', device: '#1E6B3A', deviceTint: '#E7F5EC', cloud: '#1A56C4', cloudTint: '#E8F0FE',
};
export const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
