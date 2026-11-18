# Coder re-measure on the shipped vocabulary (Nov 18, 2026): both model arms PASS

Plan and bars: [PLAN.md](PLAN.md), fixed before any scored call. Vocabulary: 81 reaction terms from 8 single-ingredient FDA labels (openFDA) plus written everyday synonyms. Test set: 179 lay side-effect phrases the Nov 13 spike's lookup had never seen (CADEC, kept local); 111 map to a vocabulary term, 68 to NONE (crosswalk built from concept names only). Frozen files hash `4faa4af1b7c89a2d` on every scored row. All calls went through the shipped `coder` route (`PREFER_ON_DEVICE`); every row reported the expected source.

| Arm | Accuracy (111 mapped) | Gap vs lookup [95% CI] | Bar (≥ +0.15, CI > 0) | False coding (68 NONE) | Median time |
|---|---|---|---|---|---|
| Lookup (code, on device) | 30/111 = 0.27 | — | — | 0.19 | < 1 ms |
| **Nano** (Chrome, on device) | 64/111 = **0.58** | **+0.31** [+0.19, +0.41] | **PASS** | 0.66 | 3.9 s |
| **Cloud** (no-model Chrome, automatic fallback) | 80/111 = **0.72** | **+0.45** [+0.35, +0.55] | **PASS** | 0.25 | 1.2 s |

- **Decision (table in PLAN.md, both pass):** keep the model coder and `PREFER_ON_DEVICE`; confirmed by the owner on Nov 18 despite the cloud's higher accuracy, because coding stays on the device and every coded term is confirmed.
- **Also measured, not in the table:** the cloud beats Nano by **+0.14** [+0.05, +0.23] on the same phrases, and Nano almost never answers NONE (false coding 0.66 vs 0.25). Prompt changes on the dev set lowered Nano's false coding only from 0.96 to 0.89 there. Every coded term is shown for confirmation, and an on-device-coded term carries "needs confirming".
- **The lookup** is much weaker on these unseen phrases (0.27) than on the dev phrases (0.66 at the frozen threshold 0.6), as expected: the test set is the tail that the old phrase lookup had never seen.
- **Errors:** 1 Nano answer outside the vocabulary (counted wrong); 0 cloud timeouts in the scored run (1 on dev). Cloud calls: 179 scored plus 60 dev, inside the free tier.
- **Not comparable to the Nov 13 spike** (0.64 vs 0.45): different model (`gemini-3.5-flash-lite` vs `gemini-3.8-flash`), 81 terms vs 802 SNOMED concepts, one phrase per call with NONE allowed, and a lookup without CADEC training phrases.
