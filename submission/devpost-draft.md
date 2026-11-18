# SideNote: Devpost draft (started Nov 15, 2026; SPARK framing pass)

All names and messages below are synthetic. Numbers marked [measure] are filled from the "How we know" test output before submission.

## Tagline (≤200 chars)
Stop trying to remember when the side effect started. SideNote reads the family chat you already have, on your device, and turns it into a dated report for the FDA. Your family's words never leave.

## Opening paragraph (a person and a number)
Margaret, 71, takes six medicines. Her legs have ached for weeks, and she thinks it might be the new cholesterol pill. The FDA's form asks the questions that matter most: when did it start, did it stop when you paused the pill, did it come back when you restarted? She can't remember. Her daughter Sarah can, because it's all in their WhatsApp chat. Most suspected side effects are never reported: across 37 studies, the median under-reporting rate was 94% (Hazell & Shakir, *Drug Safety*, 2006). SideNote turns the evidence patients already have into the dates regulators need, and keeps everyone else's words on the device.

## What it does (the user's own evidence drives it)
Patients stop filling in a form from memory and start showing their own receipts. You import a chat; the timeline builds itself from your messages while you watch; you confirm three answers; SideNote fills the official form with you, box by box.

## How we built it: Firebase AI Logic hybrid inference at the core
- **On device (Gemini Nano in Chrome; Apple's model on iOS when available):** the Reader reads the chat. It can only run on the device: if there is no on-device model, SideNote refuses to upload the chat ("Sarah's messages stay on this phone") instead of falling back to the cloud.
- **In the cloud (Gemini via Firebase AI Logic):** only approved, coded facts leave: the Cloud coder maps short phrases in your own words to medical terms, and the Suspect ranker weighs the timeline against the public drug label. Both use `PREFER_IN_CLOUD`, so with Wi-Fi off they move to the on-device model automatically.
- **Every call is visible:** the ledger shows each step, where it ran (`inferenceSource`) and the exact bytes that left.
- App Check on every platform; Firebase Hosting for the judge URL.

## Named agents and their handoffs (shown in the ledger)
Importer → Reader (on device) → Timeline → Evidence Challenger → Lookup coder → Cloud coder (cloud, approved) → Payload builder → Suspect ranker (cloud, approved) → Label & seriousness → You.
Each hands its output to the next; the Challenger rejects any fact whose quote it can't find in the chat; you approve before anything leaves.

## How we know (measured)
- Chat test: [measure] more correct dated facts per case than answering questions from memory; [measure] unsupported claims. Planted chats and a counts-only check of real chats, reported separately.
- Leakage test: [measure] words from other people left the device across 30 chats.
- Reader through Firebase on 120 research posts (CADEC): F1 [measure], false blame [measure] vs 35% for the best code baseline.

## Gallery (captions; one frame each, readable without narration)
1. **The timeline:** atorvastatin bar with a gap (paused) and the aches disappearing in the gap, then returning. Caption: "The aches stopped when the pill was paused and came back when it restarted. Found in the family chat, read on this laptop."
2. **What leaves this device:** "We'll send: 2 phrases in your words, 2 medicine names, 3 dates. Nothing Sarah wrote." Caption: "You see every byte before it leaves."
3. **Phone without an on-device model:** "Sarah's messages stay on this phone." Caption: "No private model here, so nothing is uploaded."
4. **Wi-Fi off:** badges flip to "On this device". Caption: "Offline, the cloud agents move to the device."
5. **Filling the official form:** box-by-box helper. Caption: "Box B3: copy. Box B5: copy. Done."
6. **Architecture diagram** (render from the ASCII in the design doc, Section 1).

## Demo shot additions from the SPARK pass
- At 1:40 (hybrid proof), hold 3 seconds on the ledger with the agent names visible as the handoff runs (A).
- Open the video on the timeline frame (gallery 1) for one second before the hook, so the first frame explains the product (R).

## Built to reuse
The private-evidence core ships as its own package (`packages/private-evidence`: one routing table, `ai.generate`, the allowlist payload builder, the ledger and its leakage tests), with no medical terms inside, so any "private records in, coded facts out" app can reuse it unchanged. Planned next entries: an observability layer (per-agent latency and leak checks as dashboards) and other evidence sources (pharmacy receipts, calendar).
