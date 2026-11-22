import React from 'react';
// The SideNote demo, 1920x1080 at 30 fps. Scene times follow script.json (the narration's own start times);
// captions come from the same file, shown for each line's measured speech length (voice/voice.json).
import { AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { loadFont as loadSans } from '@remotion/google-fonts/PublicSans';
import { loadFont as loadMono } from '@remotion/google-fonts/AtkinsonHyperlegibleMono';
import script from '../script.json';
import voice from '../voice/voice.json';
import clips from '../footage/clips.json';
import { T, ease } from './theme';

const { fontFamily: SANS } = loadSans('normal', { weights: ['500', '600', '700', '800', '900'], subsets: ['latin'] });
const { fontFamily: MONO } = loadMono('normal', { weights: ['500', '700'], subsets: ['latin'] });
const L = (id: string) => script.segments.find(x => x.id === id)!.start;
const LAST = script.segments[script.segments.length - 1];
export const FPS = 30, TOTAL = Math.ceil(LAST.end + 5.5);
const at = (first: string) => Math.max(0, L(first) - 0.5); // a scene opens half a second before its first line
const f = (s: number) => Math.round(s * FPS);

// ---------- kit ----------
const LowerThird = ({ text, at = 0.6, out = 99, tone = T.primary }: { text: string; at?: number; out?: number; tone?: string }) => {
  const t = useCurrentFrame() / FPS;
  const k = ease((t - at) / 0.3) * (1 - ease((t - out) / 0.3));
  return (
    <div style={{ position: 'absolute', left: 64, bottom: 168, opacity: k, transform: `translateY(${(1 - k) * 16}px)`, display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,.96)', borderRadius: 14, boxShadow: '0 8px 30px rgba(16,24,40,.18)', overflow: 'hidden' }}>
      <div style={{ width: 8, alignSelf: 'stretch', background: tone }} />
      <div style={{ padding: '14px 24px', font: `700 32px ${SANS}`, color: T.ink }}>{text}</div>
    </div>
  );
};

/** A recorded clip with a slow push-in; holds its last frame if the scene runs longer than the clip. */
const Clip = ({ name, len, zoom = [1, 1.06], origin = '50% 45%', from = 0 }: { name: string; len: number; zoom?: [number, number]; origin?: string; from?: number }) => {
  const frame = useCurrentFrame();
  const clipLen = (clips as Record<string, number>)[name] - from;
  const s = interpolate(frame, [0, f(len)], zoom, { extrapolateRight: 'clamp' });
  const video = <OffthreadVideo src={staticFile(`footage/${name}.mp4`)} startFrom={f(from)} muted />;
  return (
    <AbsoluteFill style={{ background: T.paper, transform: `scale(${s})`, transformOrigin: origin }}>
      {frame < f(clipLen) - 2 ? video : <Freeze frame={f(clipLen) - 3}>{video}</Freeze>}
    </AbsoluteFill>
  );
};

const Captions = () => {
  const t = useCurrentFrame() / FPS;
  const i = script.segments.findIndex((s, n) => t >= s.start && t <= s.start + voice[n].speech + 0.35);
  if (i < 0) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
      <div style={{ maxWidth: 1500, background: 'rgba(16,24,40,.82)', color: '#fff', font: `600 38px/1.3 ${SANS}`, padding: '14px 28px', borderRadius: 12, textAlign: 'center' }}>
        {script.segments[i].text}
      </div>
    </div>
  );
};

const Counter = ({ to, at, decimals = 0, prefix = '', suffix = '' }: { to: number; at: number; decimals?: number; prefix?: string; suffix?: string }) => {
  const t = useCurrentFrame() / FPS;
  const v = to * ease((t - at) / 0.8);
  return <>{prefix}{v.toFixed(decimals)}{suffix}</>;
};
const fadeIn = (t: number, at: number, d = 0.35) => ({ opacity: ease((t - at) / d), transform: `translateY(${(1 - ease((t - at) / d)) * 24}px)` });

// ---------- scenes ----------
const ColdOpen = () => {
  const t = useCurrentFrame() / FPS;
  const caret = Math.floor(t * 2) % 2 ? 0 : 1;
  return (
    <AbsoluteFill style={{ background: T.primary, color: '#fff', padding: '150px 160px', fontFamily: SANS }}>
      <div style={{ font: `800 220px/1 ${MONO}`, color: T.hi, ...fadeIn(t, 0.2) }}><Counter to={94} at={0.3} suffix="%" /></div>
      <div style={{ font: `700 60px/1.2 ${SANS}`, marginTop: 24, maxWidth: 1300, ...fadeIn(t, 0.7) }}>of suspected side effects are never reported.</div>
      <div style={{ font: `500 26px ${MONO}`, color: "rgba(255,255,255,.6)", marginTop: 18, ...fadeIn(t, 1.1) }}>Hazell &amp; Shakir, Drug Safety, 2006 · median across 37 studies</div>
      <div style={{ marginTop: 70, display: 'flex', alignItems: 'center', gap: 24, ...fadeIn(t, 4.2) }}>
        <span style={{ font: `600 40px ${SANS}`, opacity: 0.85 }}>Date the reaction started:</span>
        <span style={{ width: 380, height: 72, border: '3px solid rgba(255,255,255,.6)', borderRadius: 12, display: 'flex', alignItems: 'center', paddingLeft: 20 }}>
          <span style={{ width: 4, height: 40, background: '#fff', opacity: caret }} />
        </span>
      </div>
    </AbsoluteFill>
  );
};

const Proof = () => {
  const t = useCurrentFrame() / FPS; // scene starts at 40.7 s; L07 lands at 52.5 s
  const Box = ({ children, label, at, src }: { children: React.ReactNode; label: string; at: number; src: string }) => (
    <div style={{ background: '#fff', borderRadius: 24, padding: '44px 48px', boxShadow: '0 10px 40px rgba(16,24,40,.08)', flex: 1, ...fadeIn(t, at) }}>
      <div style={{ font: `700 132px/1 ${MONO}`, color: T.ink }}>{children}</div>
      <div style={{ font: `600 36px/1.25 ${SANS}`, color: T.ink, marginTop: 18 }}>{label}</div>
      <div style={{ font: `500 22px ${MONO}`, color: T.muted, marginTop: 14 }}>{src}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: T.paper, padding: '110px 96px', fontFamily: SANS }}>
      <div style={{ font: `800 64px ${SANS}`, color: T.ink, marginBottom: 48, ...fadeIn(t, 0.1) }}>Measured on 10 chats it never saw while tuning</div>
      <div style={{ display: 'flex', gap: 32 }}>
        <Box at={0.6} label="dates right" src="evals/chattest · held-out run"><Counter to={43} at={0.7} /><span style={{ color: T.muted }}>/49</span></Box>
        <Box at={1.4} label="requests to the cloud while reading" src="0 calls to the AI endpoint"><Counter to={0} at={1.5} /></Box>
        <Box at={L('L07') - at('L06')} label="needed dates per case, vs 5 questions alone" src="95% CI [2.2, 4.5]"><Counter to={3.3} at={L('L07') - at('L06') + 0.1} decimals={1} prefix="+" /></Box>
      </div>
    </AbsoluteFill>
  );
};

const Architecture = () => {
  const t = useCurrentFrame() / FPS; // 61.7 → 79.3; L09 (reader) at 70.5
  const S = 1920 / 1600; // the PNG is drawn on a 1600x900 page
  const reveal = (x0: number, x1: number, at: number) => ({ clipPath: `inset(0 ${100 - (x0 + (x1 - x0) * ease((t - at) / 0.9)) / 16}% 0 0)` });
  const ring = ease((t - (L('L09') - at('L08'))) / 0.4);
  return (
    <AbsoluteFill style={{ background: T.paper }}>
      <Img src={staticFile('architecture.png')} style={{ width: 1920, height: 1080, position: 'absolute', ...reveal(0, 1600, 0.2) }} />
      <div style={{ position: 'absolute', left: 492 * S - 10, top: 182 * S - 10, width: 220 * S + 20, height: 86 * S + 20, borderRadius: 18,
        border: `5px solid ${T.hi}`, boxShadow: `0 0 0 9999px rgba(16,24,40,${0.45 * ring})`, opacity: ring }} />
    </AbsoluteFill>
  );
};

const CodeCard = () => {
  const t = useCurrentFrame() / FPS;
  const lines = [
    'export const ROUTES = {',
    "  reader: { mode: 'only_on_device',   needsApproval: false },",
    "  coder:  { mode: 'prefer_on_device', needsApproval: true },",
    "  ranker: { mode: 'prefer_in_cloud',  needsApproval: true },",
    '};',
  ];
  return (
    <AbsoluteFill style={{ background: T.paper, alignItems: 'center', justifyContent: 'center', fontFamily: SANS }}>
      <div style={{ font: `600 30px ${SANS}`, color: T.muted, marginBottom: 24, ...fadeIn(t, 0.1) }}>apps/sidenote/src/ai/route.ts</div>
      <div style={{ background: T.primary, borderRadius: 24, padding: '44px 56px', width: 1640, boxShadow: '0 20px 60px rgba(16,24,40,.25)' }}>
        {lines.map((l, i) => (
          <div key={i} style={{ font: `500 34px/1.7 ${MONO}`, whiteSpace: 'pre', color: i === 2 ? T.hi : '#E6E9EE', opacity: ease((t - 0.3 - i * 0.15) / 0.3),
            background: i === 2 ? 'rgba(255,228,92,.12)' : 'none', borderRadius: 8 }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 28, marginTop: 40, ...fadeIn(t, 2.2) }}>
        {[['Lookup', '27%'], ['Nano, on device', '58%'], ['Cloud fallback', '72%']].map(([k, v]) => (
          <div key={k} style={{ background: '#fff', borderRadius: 16, padding: '18px 28px', font: `600 30px ${SANS}`, color: T.ink }}>
            {k} <span style={{ font: `700 36px ${MONO}`, marginLeft: 10 }}>{v}</span></div>
        ))}
      </div>
      <div style={{ font: `500 22px ${MONO}`, color: T.muted, marginTop: 16, ...fadeIn(t, 2.4) }}>coding accuracy on 179 unseen everyday phrases · evals/coder</div>
    </AbsoluteFill>
  );
};

const Platforms = () => {
  const t = useCurrentFrame() / FPS;
  const Phone = ({ src, label, at }: { src: string; label: string; at: number }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, ...fadeIn(t, at) }}>
      <Img src={staticFile(src)} style={{ height: 660, borderRadius: 40, border: '10px solid #111827', boxShadow: '0 20px 60px rgba(16,24,40,.25)' }} />
      <div style={{ font: `700 34px ${SANS}`, color: T.ink }}>{label}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: T.paper, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 140, paddingTop: 70 }}>
      <Phone src="android.png" label="Android · cloud suggestion, approved by you" at={0.2} />
      <Phone src="iphone.png" label="iPhone · no on-device model, chats stay closed" at={0.8} />
    </AbsoluteFill>
  );
};

const CloseLine = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: T.primary, alignItems: 'flex-start', justifyContent: 'center', padding: '0 160px' }}>
      <div style={{ font: `800 104px/1.08 ${SANS}`, color: '#fff', letterSpacing: '-0.02em', ...fadeIn(t, 0.2) }}>The chat stays home.</div>
      <div style={{ font: `800 104px/1.08 ${SANS}`, color: T.hi, letterSpacing: '-0.02em', ...fadeIn(t, 1.4) }}>The dates reach the regulator.</div>
    </AbsoluteFill>
  );
};

const EndCard = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: T.paper, alignItems: 'center', justifyContent: 'center', gap: 28, fontFamily: SANS }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, ...fadeIn(t, 0.1) }}>
        <Img src={staticFile('mark.png')} style={{ width: 120, height: 120, borderRadius: 28 }} />
        <span style={{ font: `800 110px ${SANS}`, color: T.ink, letterSpacing: '-0.02em' }}>SideNote</span>
      </div>
      <div style={{ font: `700 48px ${MONO}`, color: T.ink, ...fadeIn(t, 0.5) }}>sidenote-hybrid.web.app</div>
      <div style={{ font: `600 34px ${SANS}`, color: T.muted, ...fadeIn(t, 0.8) }}>Firebase AI Logic hybrid inference · Web · Android · iOS</div>
      <div style={{ font: `600 28px ${SANS}`, color: T.muted, ...fadeIn(t, 1.0) }}>#BuildHybridAI 2026 · synthetic data · not medical advice</div>
    </AbsoluteFill>
  );
};

const FadeIn = ({ children }: { children: React.ReactNode }) => (
  <AbsoluteFill style={{ opacity: interpolate(useCurrentFrame(), [0, 8], [0, 1], { extrapolateRight: 'clamp' }) }}>{children}</AbsoluteFill>
);

// ---------- timeline ----------
type Scene = { from: number; to: number; el: React.ReactNode };
const scenes: Scene[] = [
  { from: 0, to: at('L02'), el: <ColdOpen /> },
  { from: at('L02'), to: at('L03'), el: <><Clip name="S02" len={at('L03') - at('L02')} zoom={[1, 1.05]} /><LowerThird text="Your family chat already holds the dates" at={0.8} /></> },
  { from: at('L03'), to: at('L04'), el: <><Clip name="S03" len={at('L04') - at('L03')} zoom={[1.08, 1.2]} origin="55% 40%" /><LowerThird text="Gemini Nano · on this device · Firebase AI Logic" tone={T.device} at={0.5} /></> },
  { from: at('L04'), to: at('L06'), el: <><Clip name="S04" len={at('L06') - at('L04')} zoom={[1, 1.06]} origin="60% 40%" /><LowerThird text="You confirm every fact" at={L('L05') - at('L04')} /></> },
  { from: at('L06'), to: at('L08'), el: <Proof /> },
  { from: at('L08'), to: at('L10'), el: <Architecture /> },
  { from: at('L10'), to: at('L12'), el: <><Clip name="S05" len={at('L12') - at('L10')} zoom={[1, 1.06]} origin="55% 45%" /><LowerThird text="PREFER_IN_CLOUD · nothing leaves until you approve" tone={T.cloud} at={0.6} out={L('L11') - at('L10') - 0.4} /><LowerThird text="0 leaks across 135 payloads" tone={T.device} at={L('L11') - at('L10')} /></> },
  { from: at('L12'), to: at('L13'), el: <><Clip name="S06" len={at('L13') - at('L12')} zoom={[1, 1.04]} from={2.5} /><LowerThird text="Network off · the same agent runs on Nano" tone={T.device} at={0.4} /></> },
  { from: at('L13'), to: at('L14'), el: <CodeCard /> },
  { from: at('L14'), to: at('L15'), el: <Platforms /> },
  { from: at('L15'), to: at('L16'), el: <><Clip name="S09" len={at('L16') - at('L15')} zoom={[1, 1.05]} /><LowerThird text="FDA 3500B · Yellow Card · EDA, in English or Arabic" at={0.6} /></> },
  { from: at('L16'), to: LAST.end, el: <CloseLine /> },
  { from: LAST.end, to: TOTAL, el: <EndCard /> },
];

export const Demo = () => (
  <AbsoluteFill style={{ background: T.paper }}>
    {scenes.map((s, i) => (
      <Sequence key={i} from={f(s.from)} durationInFrames={f(s.to) - f(s.from)}>
        <FadeIn>{s.el}</FadeIn>
      </Sequence>
    ))}
    <Captions />
    <Audio src={staticFile('voice/narration.wav')} />
  </AbsoluteFill>
);
