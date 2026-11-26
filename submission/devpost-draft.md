# SideNote: Devpost draft (started Nov 15, 2026; numbers filled Nov 20 from the shipped build)

All names and messages below are synthetic. Every number comes from a test in the repo (evals/, apps/sidenote/test, the leakage script). Try it: https://sidenote-hybrid.web.app

Demo video (YouTube, unlisted, 2:03): https://youtu.be/xKsX8D_JLx8

## Tagline (≤200 chars)
Stop trying to remember when the side effect started. SideNote reads the family chat you already have, on your device, and turns it into a dated report for the FDA. Your family's words never leave.

## Opening paragraph (a person and a number)
Margaret, 71, takes six medicines. Her legs have ached for weeks, and she thinks it might be the new cholesterol pill. The FDA's form asks the questions that matter most: when did it start, did it stop when you paused the pill, did it come back when you restarted? She can't remember. Her daughter Sarah can, because it's all in their WhatsApp chat. Most suspected side effects are never reported: across 37 studies, the median under-reporting rate was 94% (Hazell & Shakir, *Drug Safety*, 2006). SideNote turns the evidence patients already have into the dates regulators need, and keeps everyone else's words on the device.

## What it does (the user's own evidence drives it)
Patients stop filling in a form from memory and start showing their own receipts. You import a WhatsApp chat; the timeline builds itself from your messages while you watch; you confirm three answers (when it started, did it stop when you stopped the pill, did it come back when you restarted); SideNote drafts the FDA MedWatch 3500B, the UK Yellow Card or the Egyptian Drug Authority report, in English or Arabic.

## How we built it: Firebase AI Logic hybrid inference at the core
- **On device only (Gemini Nano in Chrome, `ONLY_ON_DEVICE` behind a guard):** the Reader reads the chat. If there is no on-device model, chats stay closed and nothing is sent; the person answers 5 short questions instead. (The SDK sends `ONLY_ON_DEVICE` requests to the cloud when `LanguageModel` is missing; our guard stops that, and we reported it upstream.)
- **Hybrid, on-device first (`PREFER_ON_DEVICE`):** the coder maps a short phrase in your own words to a reaction term from public FDA labels; Nano does it on the device, and on devices without a model the SDK falls back to Gemini in the cloud (verified live).
- **Hybrid, cloud first (`PREFER_IN_CLOUD`):** the suspect ranker compares two or more medicines from confirmed, coded facts (JSON, no free text); offline, the SDK moves it to Nano automatically (verified with the network cut). Code keeps only the reasons the data supports.
- Nothing that can reach the cloud is sent until you approve the exact bytes on "What leaves this device".
- **Every call is visible:** the ledger shows each step, where it ran (`inferenceSource`) and the exact bytes that left.
- **Three platforms, one codebase (React + Capacitor):** the web app (Chrome, the only one with Gemini Nano today), an Android app and an iOS app. On the phones the on-device reader stays closed (no Nano in the WebView), so they show the fail-closed path, the 5 questions, and the hybrid coder and ranker running in the cloud through Firebase AI Logic (the full flow verified on an Android emulator, with the AI call returning 200 through native App Check; the iOS app verified to the fail-closed start on the simulator).
- App Check enforced on the AI endpoint: reCAPTCHA Enterprise on the web; native App Check in the apps through `@capacitor-firebase/app-check` (debug providers on the emulator and simulator; store builds would switch to Play Integrity and App Attest, not set up yet). Firebase Hosting for the judge URL.

## Named agents and their handoffs
Importer → Prefilter → Reader (on device) → Evidence Challenger → Timeline → Safety (red flags) → Lookup coder → Model coder (Nano first, approved) → Payload builder → Suspect ranker (cloud first, approved) → Report → You.
Each hands its output to the next; the Challenger rejects any fact whose quote it can't find in the chat; you approve before anything leaves. The three model agents (Reader, Coder, Suspect ranker) appear in the ledger with where each call ran; the code agents do their work on screen (facts appear with their quote while the Reader runs; the timeline shows what the Challenger kept). See the architecture diagram (gallery 7).

## How we know (measured)
- Chat test on 10 held-out planted chats (written by another model family): 43 of 49 dates right, 4.4% unsupported, +3.3 needed dates per chat over 5 questions alone [2.2, 4.5]; median 33 s per chat; 0 requests to the AI endpoint while reading.
- Leakage test: 0 of 135 cloud payloads and report exports from 30 chats share a phrase with anyone else's messages; leaks we planted on purpose were caught (it also caught a real one in the report draft, fixed).
- Coder on 111 unseen everyday phrases that map to a reaction term (from a 179-phrase CADEC test set, kept local; evals/coder/RESULT.md): word lookup 27%, Nano 58%, cloud 72%; both models pass the +0.15 bar.

## Gallery (captions; one frame each, readable without narration)
0. **The start page (wide screen):** two of Dad's chat messages, the key words highlighted, beside the timeline they become ("On this device", "Began 11 days after starting"). Caption: "Your family chat already holds the dates. SideNote finds them on your device." (Use as the cover image.)
1. **The timeline:** atorvastatin bar with a gap (paused) and the aches disappearing in the gap, then returning. Caption: "The aches stopped when the pill was paused and came back when it restarted. Found in the family chat, read on this laptop."
2. **What leaves this device:** "Coded facts, to suggest which medicine is more likely: 3 facts about 2 medicines. Includes facts from Ellie's messages, coded (their words are not sent). Not sent: 400 chat messages." Caption: "You see every byte before it leaves."
3. **iPhone app without an on-device model:** "On-device AI isn't available here, so chats stay closed." Caption: "No private model here, so nothing is uploaded."
4. **Network off:** the ranker's badge reads "On this device". Caption: "Offline, the cloud agent moves to the device."
5. **The report draft:** MedWatch 3500B filled from confirmed facts, missing fields listed, Copy / Print / Open the official form. Caption: "Dates and answers filled; you add what only you know."
6. **Android app:** the same flow on a Pixel, suggestion labelled "Google cloud, approved by you". Caption: "Web, Android and iOS from one codebase."
7. **Architecture diagram:** `submission/architecture.png` (source `submission/architecture.html`). Caption: "One routing table: the reader never leaves the device; only coded facts you approve reach the cloud."

## Demo shot additions from the SPARK pass
- At 1:40 (hybrid proof), hold 3 seconds on the ledger with the agent names visible as the handoff runs (A).
- Open the video on the timeline frame (gallery 1) for one second before the hook, so the first frame explains the product (R).

## Built to reuse
The private-evidence core ships as its own package (`packages/private-evidence`: the WhatsApp importer, quote locator, date resolver and the on-device guard), with no medical terms inside; the routing table, payload builder and leakage checker sit beside it in `apps/sidenote/src/ai` and are domain-free too, so any "private records in, coded facts out" app can reuse them. Planned next entries: an observability layer (per-agent latency and leak checks as dashboards) and other evidence sources (pharmacy receipts, calendar).
