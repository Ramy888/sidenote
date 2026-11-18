# Coder re-measure on the shipped vocabulary (bars fixed Nov 18, before any scored call)

**Question:** on SideNote's own vocabulary (81 reaction terms from public-domain FDA labels plus everyday synonyms), does a model coder beat the on-device lookup by enough to keep it, and which model should code by default?

**Test set:** the 179 lay side-effect phrases from the Nov 13 spike that its lookup had never seen (CADEC posts; the CADEC folder is no longer on disk, so the 473-phrase rebuild is not possible). CADEC stays local: phrases, the crosswalk and per-phrase results never enter the repo; only aggregate numbers do.

**Gold:** each phrase's SNOMED concepts mapped to a vocabulary id through a crosswalk built from the 126 concept names only (never from phrases), before any arm ran. **111 phrases map to a term; 68 map to NONE** (no term in the vocabulary means that reaction). A phrase with several concepts is correct if the answer matches any mapped one.

**Arms (all shipped code paths):**
1. **Lookup:** `lookupTerm` (whole-word match of label wordings and synonyms, else trigram similarity ≥ threshold), on device.
2. **Nano:** the `coder` route (`PREFER_ON_DEVICE`) in Chrome with Gemini Nano; prompt from `coderPayload` and `coderTerms()`; one phrase per call.
3. **Cloud:** the same route in Chrome with no on-device model, so the SDK falls back to `gemini-3.5-flash-lite`. Paced at ≤ 12 calls a minute (179 calls, inside the free tier's 500 a day).
- A phrase over 8 words is refused by the payload builder and counts as uncoded (NONE) for the model arms.
- Answers are parsed strictly: a vocabulary id or NONE; anything else is wrong. Every model row must report the expected `inferenceSource`.

**Freeze order:** vocabulary, synonyms, crosswalk (done) → lookup threshold and coder prompt, tuned only on the spike's 5,557 training phrases whose concepts the crosswalk covers → hash of the vocabulary, lookup, payload and prompt files → one scored run per arm.

**Measures:**
- **Primary:** accuracy on the 111 mapped phrases.
- **Secondary:** false coding on the 68 NONE phrases: the share where the arm assigns any term.
- Paired bootstrap 95% interval (10,000 resamples of phrases) for each model arm minus lookup.

**Bar (unchanged from the design doc):** a model arm is worth keeping when its accuracy minus the lookup's is **≥ +0.15 with the interval's lower end above 0**. Between +0.05 and +0.15, or an interval touching 0: inconclusive, treated as a fail for keeping the extra approval step. With n = 111 the interval half-width is about ±0.08, so the bar can be decided.

**Decision table (fixed now):**

| Nano | Cloud | Decision |
|---|---|---|
| pass | pass | Keep `PREFER_ON_DEVICE`: Nano codes on Chrome, cloud fallback elsewhere. |
| fail | pass | Recommend switching the coder back to cloud-first (`PREFER_IN_CLOUD`); the owner decides. Nano-coded terms would be worse than the cloud. |
| pass | fail | Keep `PREFER_ON_DEVICE`; flag that the cloud fallback adds little on devices without a model. |
| fail | fail | Drop the model coder and its approval step: lookup only; uncoded phrases stay as the patient's own words ("uncoded"). |

False coding is reported, not gated: every coded term is shown to the person to confirm, and an on-device-coded term carries "needs confirming".

**Budget:** time five Nano calls with the real term list first; if a call takes over 20 s, run Nano on the mapped 111 first, then the 68.
