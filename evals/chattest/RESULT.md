# T1 chat test: generated set (Nov 16, 2026)

Planted data: 20 synthetic chats (~400 messages each), written by Gemini from code-owned specs and checked by code before the run. Reader v1 (tuned only on evals/dev), frozen files hash `96598c7d927e941d`, spec seed 20261116. Read entirely on the device (Gemini Nano through Firebase AI Logic, `ONLY_ON_DEVICE` behind `onDeviceOnly`); 0 requests to the AI endpoint. Run file: `results/run-2026-11-16T21-05-49-943Z.json`.

| Measure | Result | Bar | Verdict |
|---|---|---|---|
| Correct timeline facts | 97 / 106 (92%) | n/a | |
| Gap vs 5-question patient (per case) | **+4.2** [3.45, 4.95] | ≥ 2 | PASS |
| Gap vs kinder baseline (±7 days, ≤30 days old) | +2.15 [1.4, 2.9] | n/a (reported) | interval above 0 |
| Unsupported claims before confirmation | 8 / 105 = **7.6%** | ≤ 5% | **FAIL (narrowly)** |
| Reading time per chat | median 105 s, max 591 s | ≤ 40 s (D11) | **FAIL** |

- Machine state during the run: battery, discharging; load average 20-34 (another project's esbuild processes). Reading time must be re-measured on mains power with the machine idle before acting on it; still, ~20 windows x ~5 s cannot fit 40 s.
- What the 8 unsupported facts are: 4 dates 2-3 days off a real event (G14, G23, G24, G29), 2 medicine kinds confused ("started again" read as a new start; an extra restart), 2 extra facts on two-medicine chats (G23, G29).
- Misses (9): mostly "gone" and "back" messages (G11, G24, G26, G29) and 3 onsets whose date landed outside ±1 day.
- Hand-written set (10 template chats): pending; it is the held-out check, since any fix below is made after seeing this run.

## After fixes (Nov 16-17): same 20 chats, NOT held out

Fixes were made after reading run 1's errors, so these runs measure the fixes, not generalisation. The held-out check is the 10 hand-written chats.

Fixes: (1) code rejects facts whose sentence is a question or a general claim ("can cause", "read online"); (2) a medicine state machine (first start = start, taking it after a stop = restart, repeats ignored); (3) fuzzy or message-only dates are flagged "needs confirming" (UI shows the range); (4) generic cue words removed (0/597 filler messages now trip the prefilter; windows 21 -> 7 per chat; all 106 event messages still covered). Reader v2 prompt (tuned on evals/dev only).

| Run | Reader calls | Correct | Unsupported | Gap vs 5q | Gap vs kinder | Reading (median / max) |
|---|---|---|---|---|---|---|
| 1, v1 (above) | ~21 per chat | 97/106 | 7.6% | +4.2 [3.45, 4.95] | +2.15 [1.4, 2.9] | 105 s / 591 s |
| 2, v2, whole chat in one call | 1 per chat | 75/106 | 8.5% | +3.1 [2.0, 4.1] | +1.05 [0, 2.05] | 23 s / 39 s |
| **3, v2, one call per window (final)** | ~7 per chat | **100/106** | **1.0%** (1/101) | **+4.35 [3.45, 5.2]** | **+2.3 [1.5, 3.15]** | **39 s / 78 s** |

- Run 2 shows the trade-off: one long prompt is fast but Nano drops a quarter of the events. Windows stay separate.
- Run 3 passes every bar on the generated set (gap ≥ 2, unsupported ≤ 5%, median reading ≤ 40 s), with 0 requests to the AI endpoint. Files hash `1587ff1bc6937dd8`, run file `results/run-2026-11-16T22-03-52-596Z.json`.
- Remaining misses (6): "gone" messages (G11, G14, G20, G24) and one onset (G14); the one wrong fact is a return labelled as a new onset after a missed "gone" (G24).
- Reading time was measured on battery (low-battery warning) with load ~19 from other processes; re-time on mains, idle, before quoting it in the video.

## Held-out check (Nov 17): 10 hand cases, reader v2 unchanged

Lines: the template lines (kept in `hand/v1-template/`) rewritten casually by ChatGPT (temporary chat) under the same code rules, then checked by `generate.mts`. Written by a model from another family, not by a person, and never seen while tuning. Same reader as run 3, one call per window, 0 requests to the AI endpoint. Run file `results/run-2026-11-17T21-35-28-494Z.json`. Machine: mains power, load ~13.

| Measure | Result | Bar | Verdict |
|---|---|---|---|
| Correct timeline facts | 43 / 49 (88%) | n/a | |
| Gap vs 5-question patient (per case) | **+3.3** [2.2, 4.5] | ≥ 2 | PASS |
| Gap vs kinder baseline | +1.5 [0.2, 2.7] | n/a (reported) | interval above 0 |
| Unsupported claims before confirmation | 2 / 45 = **4.4%** | ≤ 5% | PASS (narrowly) |
| Reading time per chat | median 33 s, max 49 s | ≤ 40 s (median) | PASS |

- 8 of 10 chats are perfect. All 6 misses and both wrong facts are in two chats, both on symptom wording:
  - H06 (sleep): "struggling to sleep" missed; "I've been sleeping properly since Thursday" (the problem ending) read as a new symptom "sleeping properly"; "trouble sleeping has been back" missed.
  - H07 (dry mouth): "My mouth has been really dry" missed (the code's symptom check wants the words "dry mouth" together); "The dry mouth went away" missed; so "dry mouth is back" became the onset, on the wrong date.
- Lesson: positive phrasing of an ending ("sleeping properly", "sleeping well") and split symptom words ("mouth ... dry") need handling. Any fix is now tuned on this set, so a re-run after it is NOT held out.

## Run 4 (Nov 18): after the H06/H07 fixes, all 30 chats (hand 10 NOT held out any more)

Fixes: "mouth" as a cue and symptom word; a quoted sentence that names no symptom is judged as a general claim on its whole message; a good-news sentence labelled as a start becomes "gone". Run file `results/run-2026-11-17T22-00-24-197Z.json`, hash `11a56485361e7edb`, 0 AI requests. Machine: 18% battery charging, load 18-35.

| Set | Correct | Unsupported | Gap vs 5q | Gap vs kinder |
|---|---|---|---|---|
| Hand 10 (after fix) | 49/49 | 0% | +3.9 [2.8, 5.0] | +2.1 [0.9, 3.4] |
| Generated 20 | 93/106 (run 3: 100) | 2.1% | +4.0 [3.15, 4.85] | +1.95 [1.1, 2.85] |

- Reading: median 36 s; two windows hung (~450 s, G12, G16) under load 35, which also cost G12 four facts.
- The drop on the generated set is not from the new filters: every rejected quote in the run is a real question or general claim. It is reader variance between runs plus the two hung windows. Two timeline gaps show up in it, both worth fixing in the pipeline task:
  - a first mention read as "ongoing" ("trouble sleeping for four days", G14) is not taken as the onset, so the later "gone" is dropped;
  - two names for one reaction ("legs sore" then "muscle ache", G24) form two symptoms, so "gone" attaches to the one with no onset.
- Nano gives different answers run to run (H06 went 3/6 then 6/6 with no change), so a single run's count moves by several facts; report ranges, not one run.
- **Timeline fixes (Nov 18), replayed on run 4's saved reader output (no new Nano run):** a first "ongoing" mention is the onset unless it is good news; aching-muscle words (sore, muscle, legs, cramp) are one symptom; "awake" joins sleep. Correct 142 -> **145/155**, unsupported unchanged at 2. Gains: G14 +2, G24 +1. Replay uses reader dates without ranges, so it checks the timeline logic, not dates.
