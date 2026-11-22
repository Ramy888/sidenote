# SideNote demo video: plan

Target 2:30 (hard cap 2:58; the rules allow 3:00). Judges often score from the video alone, on four equal criteria:
Technical (hybrid inference), Design, Impact, Idea. Every line has a shot or a number behind it; every number is in
`numbers.json` with its source. Narration: `script.json` (16 lines, 1,454 characters, all within their slots at 14 chars/s).

## Beats and shots

| Time | Beat | Shot | What is on screen | How it is captured |
|---|---|---|---|---|
| 0:00-0:08 | Cold open | S01 | Card: "94% of suspected side effects are never reported" (source line under it), then a blank FDA field "Date the reaction started: ____" blinking | Remotion card |
| 0:08-0:15 | Aha | S02 | The wide start page: Dad's two messages beside the timeline they become | Headless Chrome, 1920×1080 |
| 0:15-0:23 | Aha | S03 | Import → "Reading your chat on this device": facts appear one by one, each with its highlighted quote; lower third "Gemini Nano · on this device" | **Nano profile** (live read, no cloud) |
| 0:23-0:40 | Core flow | S04 | Timeline: zoom on the three answers, then on the chart (aches stop in the gap, come back); tap Confirm | Headless, demo case |
| 0:41-1:01 | Proof | C01 | Number cards counting up: 43 / 49 · 10 held-out chats · 0 cloud requests while reading · +3.3 dates per case | Remotion cards |
| 1:02-1:19 | How it works | D01 | The architecture drawn in order: device zone, the reader's `ONLY_ON_DEVICE + guard`, the gate, the cloud; the two blue wires light up last | Remotion, from `submission/architecture.html` |
| 1:19-1:40 | Hybrid, cloud first | S05 | "What leaves this device": zoom on "Not sent: 400 chat messages" and "1,352 bytes", open "Show the exact data", tap Send; suggestion with "Google cloud, approved by you"; card "0 leaks · 135 payloads" | Headless + real App Check (hosted site in a visible Chrome) |
| 1:40-1:48 | Hybrid, offline | S06 | Network cut (DevTools offline), the same ranker runs, badge "On this device"; the ledger opens showing where each call ran | **Nano profile**, offline |
| 1:49-1:57 | Hybrid, device first | S07 | The coder: "Coded on this device" badge; PiP of the route table line `coder: PREFER_ON_DEVICE` | Nano profile + code capture |
| 1:58-2:07 | Breadth | S08 | Split: Android emulator (suggestion via cloud) and iPhone simulator (fail-closed start) | `adb screenrecord`, `xcrun simctl io recordVideo` |
| 2:08-2:17 | Report | S09 | The 3500B draft, then the Arabic UI for a second | Headless |
| 2:18-2:30 | Close | E01 | "The chat stays home. The dates reach the regulator." End card: sidenote-hybrid.web.app, the repo, "Firebase AI Logic hybrid inference · Web, Android, iOS" | Remotion |

Cut first if long: S08's iPhone half, then S07's PiP, then L13. Never cut the cold open, the proof cards or the end card.

## Production

- **Pipeline:** CDP capture → Remotion 4 (`--browser-executable` = installed Chrome) → Cartesia narration in the builder's cloned voice → two-pass loudnorm to −14 LUFS / −1 dBTP.
- **Kit:** none exists yet; this is the first project to build `video/src/components` (title card, number card, lower third, captions, zoom, callout, PiP, end card). About a day, reused afterwards.
- **Look:** the app's own tokens (paper #F5F6F8, ink #101828, primary #111827, highlight #FFE45C, device green, cloud blue).
- **Music:** none (decided Nov 22): voice only.
- **Captions:** burned in, always on; `captions.srt` from `script.json` for YouTube.
- **Data:** synthetic demo case only; a fresh browser profile; no keys, account ids or real names on screen.
- **Media** (`footage/`, `voice/`, `out/`) stays git-ignored.

## Checkpoints (the builder says yes before each next step)

1. This plan, the script and the numbers
2. Contact sheet of the captured shots (free)
3. Voice test: 3 lines, paid (≈ 300 Cartesia credits); the tool prints the bill first
4. Full narration, paid (≈ 1,500 credits + retakes)
5. Draft cut (720p)
6. Final cut (2:02, −14 LUFS, no music), then a YouTube upload (unlisted)

## Open items

- The 94% figure is cited from the draft; confirm against the paper (Hazell & Shakir 2006) before the final cut.
- The draft's "Reader F1 0.80 on CADEC" has no results file in `evals/`; it is not used in the video.

## How to rebuild it

```bash
cd apps/sidenote && npx vite --port 5173          # the local build (App Check debug token lets cloud calls through)
node video/record.mts plain                         # S04 timeline, S05 approval → cloud, S09 report (S02 too; replaced below)
node video/record.mts nano                          # S03 live on-device reading, S06 offline ranker (Nano profile)
node video/record.mts start                         # S02 start page in the Nano profile ("On-device AI ready")
# narration (paid): Cartesia text-to-speech over video/script.json, in the builder's cloned voice
video/prep.sh                                       # stage public/ and footage/clips.json
cd video && npm run render                          # out/sidenote-raw.mp4, then the two-pass loudnorm finish
```
