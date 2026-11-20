---
# gstack: design-md-format=spec
name: SideNote
description: Evidence you can read at arm's length. Large, plain official-form type, ink-black actions, and the patient's own words lit like a highlighter on paper.
colors:
  paper: "#F5F6F8"
  surface: "#FFFFFF"
  surface-quiet: "#F0F2F5"
  line: "#E3E7EC"
  text: "#101828"
  text-muted: "#475467"
  primary: "#111827"
  on-primary: "#FFFFFF"
  primary-hover: "#1F2937"
  highlight: "#FFE45C"
  on-highlight: "#15181C"
  kept: "#E6E8EC"
  on-kept: "#3B424B"
  device: "#156A38"
  device-tint: "#E3F3E8"
  cloud: "#1E5BC6"
  cloud-tint: "#E4ECFB"
  code: "#555E69"
  code-tint: "#ECEEF1"
  warning: "#8A5300"
  warning-tint: "#FFF1D6"
  conflict: "#962A68"
  conflict-tint: "#F8E7F1"
  error: "#B3261E"
  on-error: "#FFFFFF"
  focus: "#1E5BC6"
  dark-paper: "#0E1116"
  dark-surface: "#161A21"
  dark-surface-quiet: "#1D222B"
  dark-line: "#2B323D"
  dark-text: "#EEF1F5"
  dark-text-muted: "#A8B1BD"
  dark-primary: "#EEF1F5"
  dark-on-primary: "#121417"
  dark-primary-hover: "#C9CED5"
  dark-highlight: "#4A4210"
  dark-on-highlight: "#FFF6C2"
  dark-kept: "#2A3038"
  dark-on-kept: "#C3CAD3"
  dark-device: "#6FD49A"
  dark-device-tint: "#16301F"
  dark-cloud: "#8DB4FF"
  dark-cloud-tint: "#17264A"
  dark-code: "#B5BDC7"
  dark-code-tint: "#262B31"
  dark-warning: "#FFC46B"
  dark-warning-tint: "#3A2A0E"
  dark-conflict: "#F2A3CF"
  dark-conflict-tint: "#3A1630"
  dark-error: "#D9362B"
  dark-focus: "#8DB4FF"
typography:
  display:
    fontFamily: Public Sans
    fontWeight: 800
    fontSize: clamp(2.2rem, 1.4rem + 3vw, 3.4rem)
    lineHeight: 1.05
    letterSpacing: -0.01em
  heading:
    fontFamily: Public Sans
    fontWeight: 800
    fontSize: clamp(1.6rem, 1.2rem + 1.4vw, 2.2rem)
    lineHeight: 1.15
  answer:
    fontFamily: Public Sans
    fontWeight: 700
    fontSize: 1.35rem
    lineHeight: 1.25
  body:
    fontFamily: Public Sans
    fontWeight: 400
    fontSize: 1.125rem
    lineHeight: 1.5
  label:
    fontFamily: Public Sans
    fontWeight: 700
    fontSize: 0.875rem
    letterSpacing: 0em
  mono:
    fontFamily: Atkinson Hyperlegible Mono
    fontWeight: 400
    fontFeature: tnum
  arabic:
    fontFamily: Cairo
    fontWeight: 400
    fontSize: 1.125rem
    lineHeight: 1.6
  arabic-display:
    fontFamily: Cairo
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: 0em
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  phone: 28px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    minHeight: 48px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.text}"
    borderColor: "{colors.text}"
    rounded: "{rounded.md}"
    minHeight: 48px
  button-cloud:
    backgroundColor: "{colors.cloud}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    minHeight: 48px
  badge-device:
    backgroundColor: "{colors.device-tint}"
    textColor: "{colors.device}"
    rounded: "{rounded.sm}"
  badge-cloud:
    backgroundColor: "{colors.cloud-tint}"
    textColor: "{colors.cloud}"
    rounded: "{rounded.sm}"
  badge-code:
    backgroundColor: "{colors.code-tint}"
    textColor: "{colors.code}"
    rounded: "{rounded.sm}"
  quote-own:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.on-highlight}"
    rounded: 3px
  quote-kept:
    backgroundColor: "{colors.kept}"
    textColor: "{colors.on-kept}"
    rounded: 3px
  answer-card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line}"
    rounded: "{rounded.md}"
  suspect-panel:
    backgroundColor: "{colors.surface-quiet}"
    rounded: "{rounded.md}"
  input:
    borderColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    minHeight: 48px
  language-switch:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.text}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    minHeight: 44px
  language-switch-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
---

# SideNote

## Overview

**Creative North Star:** Evidence you can read at arm's length: the plain, trustworthy type of an official health form, set large, ink-black actions, and the patient's own words marked with a highlighter, because the users are older patients and their caregivers proving something with messages they already wrote.

**Product context:** SideNote turns a family chat into a dated suspected-side-effect report for the FDA (MedWatch 3500B), the UK Yellow Card or Egypt's EDA. Users: patients around 70 and the family member helping them. Judges: hackathon reviewers on laptops. Project type: a responsive web app and Capacitor mobile app (Ionic React). Peers: regulator forms and clinical apps, which converge on clinic blue; SideNote does not.

**Mode per surface:**
- Start, Who's who, Medicines, the three-step wizard: Operate.
- Evidence timeline, report draft, How we know: Read.
- What leaves this device, fail-closed, urgent help: Operate, with trust as the main job.
- Devpost video and presentation mode: Persuade (same system at 125% zoom).

**Reference sites:** none (design knowledge only, Nov 16, 2026).

**The memorable thing:** "The proof was already in the family chat, and nobody else's words left the phone." Every rule below serves it.

**Key characteristics:**
- Large, calm type; nothing reads small.
- The patient's own words are visibly highlighted; other people's words appear only as "kept on this device".
- Colour means where work happened: green on this device, blue Google cloud, grey worked out by the app.
- Actions are ink black; blue appears only when something will leave the device.

## Colors

**Strategy:** Restrained. Neutrals plus ink do most of the work; colour is reserved for meaning (route, status, the patient's own words).

**Light or dark:** Light by default, from the use scene: an older person at home in daylight, often with reading glasses, on a phone; caregivers and judges on laptops. Dark follows the OS setting and keeps the same hierarchy.

- **Ink** (`primary`) is both text and the primary action. Primary buttons are ink, not brand blue.
- **Cloud blue** is reserved for "Google cloud, approved by you" badges and the one button that sends data ("Send these to Google"). If blue is on screen, something can leave the device.
- **Device green** marks on-device work and "found / confirmed" facts. **Code grey** marks steps the app worked out itself.
- **Highlighter** sits behind the patient's or reporter's own words only. Text on it is always ink.
- **Kept** (cool grey) is the placeholder for another sender's message: a lock icon plus "kept on this device", never the raw text outside the device.
- **Warning amber** = needs confirming. **Conflict berry** = two facts disagree. **Error red** = urgent help only. The suspected-medicine panel is `surface-quiet`, never red.
- Every pair above passes WCAG AA (4.5:1) in both themes; measured Nov 16 (lowest light pair: device on device-tint 5.79; lowest dark: white on dark-error 4.65).
- Dark mode: surfaces step up in lightness (paper → surface → surface-quiet) instead of inverting; tints become deep versions of the same hue; the primary button flips to light ink on dark.

## Typography

- **Public Sans** for all English text: display, headings, the three answers, body, labels and buttons. It is the US Web Design System's open typeface, built for US government services, so the app reads like the official health form it helps you fill (a MedWatch report goes to the FDA). Neutral, sturdy, and clear at large sizes for older readers. One family keeps the medical tone calm: hierarchy comes from size and weight (800 display, 700 headings and answers, 400 body), not from a second personality face.
- **Cairo** for the whole Arabic interface (`:lang(ar)`), every role: headings 700, body 400. The owner's choice: a clear, modern Arabic face with Latin included and weights (200-900) that match Public Sans.
- **Atkinson Hyperlegible Mono** only for raw data: the "Show the exact data" JSON, byte totals and ledger timings. Dates in drafts use Public Sans with tabular figures (`font-variant-numeric: tabular-nums`).
- Body 18px minimum (1.125rem), 20px on phones at large OS text sizes; line height 1.5 (Cairo body 1.6). Scale steps: 18 → 22 → 26 (answers) → 36 → 48-54. No tracked tiny uppercase labels.
- **Loading:** self-hosted from Fontsource (OFL-1.1, verified Nov 16, 2026): `@fontsource-variable/public-sans`, `@fontsource-variable/cairo` (Arabic subset), `@fontsource/atkinson-hyperlegible-mono`. Self-hosting is required: the app works offline (PWA), and the leakage test fails on any third-party request while a chat is being read. Google Fonts is used only by the design preview page. `font-display: swap`; preload Public Sans latin and Cairo arabic.

## Languages

- **English and Arabic are both first-class interface languages from day one.** Every screen, state, alert and the report helper ship in both; neither is a stretch goal.
- **The language is always changeable:** a two-option switch, `English | العربية`, each label in its own script, sits in the Start screen's locale line, in the app header on tablet and desktop, and in Settings. One tap switches text and direction immediately (no reload, no lost input) and the choice is remembered on the device.
- **Language is independent of region:** Arabic with the FDA or Yellow Card is allowed, and English with Egypt's EDA. The region picks the form; the language picks the interface.
- **Direction:** Arabic mirrors the whole layout (`dir="rtl"`, logical CSS properties only: `margin-inline-start`, `padding-inline`, `inset-inline`), except the timeline's time axis, which runs left to right in both languages. Icons with direction (back, next) flip; icons without (lock, cloud, check) do not.
- **Type and numbers:** Arabic uses Cairo in every role; Arabic headings use weight 700, line height 1.35 and no negative tracking (the Latin display's 1.05 crushes Arabic dots and descenders) and Eastern Arabic digits (٠-٩) in the interface. Values copied into an official form keep that form's own format.
- **Copy:** Arabic strings are written, not machine-translated word for word, in clear Modern Standard Arabic at the same reading level as the English (about age 12). Badges keep the same meaning in both: "On this device" = "على هذا الجهاز".
- **Chats:** the language of the interface does not change what the reader can read. Arabic chats still go to the 5 short questions until on-device reading of Arabic is verified (state copy in the design doc).

## Layout

- **Phone (360-430):** one column, 20px side padding; the primary action sits in a bottom bar above the safe area; the timeline chart fits the width (zoom button, no sideways page scroll).
- **Tablet (744-1024):** portrait stacks the timeline above facts; landscape uses the split pane.
- **Desktop (≥1024):** split pane 7:5, evidence left, report draft right, ledger as a right drawer. Text measure ≤ 70ch; page max width 1180px.
- Spacing base 4px; comfortable density (16-24px between related blocks, 48px between sections). Touch targets 48dp / 44pt minimum.
- Answers first, chart second, quotes on tap (D3). Lists of unequal weight are not forced into equal cards.

## Elevation & Depth

Product-grade, quiet depth: white cards on a cool neutral ground with two soft shadows (`shadow-sm` for cards and inputs, `shadow-md` for the hero preview, entry cards on hover and the ledger drawer) plus 1px `line` borders. No glows, no frosted glass, no card inside a card.

## Shapes

Radii: 6px for chips and badges, 10px for buttons, inputs and answer rows, 16px for screen frames and sheets, 28px only for phone frames in marketing images. Buttons are not pills. A nested element's radius = outer radius − the gap between them.

## Components

- **Buttons:** primary = ink fill; secondary = 2px ink outline; quiet = underlined text link; cloud = blue fill, used only for the step that sends data. All 48px tall. Focus-visible: 3px `focus` outline with 3px offset. Disabled: 40% opacity plus `aria-disabled`, never colour alone.
- **Badges** (route): icon + text, the same words as the ledger: "On this device", "Google cloud, approved by you", "Worked out by the app".
- **Status chips** (facts): icon + text: "Found in your chat" (device), "Needs confirming" (warning), "Two dates" / "Facts disagree" (conflict).
- **Answer row:** heading-size answer, one-line source under it, Confirm on the right (desktop) or in the bottom bar (phone). Confirmed rows take the device tint and show "Confirmed".
- **Quotes:** own words in the highlighter; another sender's message as a kept chip with a lock, plus the coded fact ("coded as muscle aches").
- **Outbound approval:** plain sentence, list tagged "your words" / "from Sarah's messages", a green "Not sent: …" strip with a lock, byte total in mono, "Show the exact data" disclosure, then "Send these to Google" (cloud) and "Keep it on my phone" (secondary).
- **Suspected-medicine panel:** neutral surface, three plain reasons, "A suggestion, not a diagnosis." Never red, never a score.
- **Alerts:** tinted background + icon + bold first clause. Urgent help is the only solid red surface.
- **Chart:** decorative (`aria-hidden`) with a one-sentence text summary; the answers and the fact list are the accessible path.

## Do's and Don'ts

- Do keep body text at 18px or larger everywhere, including the ledger and drafts.
- Do pair every colour with an icon and words.
- Do highlight only the patient's or reporter's own words; show other senders' text only on the device, labelled "kept on this device".
- Do use cloud blue only when something can leave the device.
- Do test every screen at 360, 402, 744 and 1512px, in English and Arabic, at 200% text size, and switch language mid-flow to check nothing is lost.
- Do use logical CSS properties everywhere so Arabic mirrors without separate styles.
- Don't use red for the suspected medicine or for anything except urgent help.
- Don't use clinic-blue primary buttons, gradients, glows, or icon tiles above headings.
- Don't put a kicker label above a heading, or use emoji as icons.
- Don't load fonts or any asset from a third-party host in the app.

## Motion

- **Approach:** minimal-functional.
- **Easing:** enter ease-out, exit ease-in, move ease-in-out.
- **Duration:** micro 80ms, short 180ms, medium 220-300ms.
- **The one authored moment:** while the chat is read, each fact arrives: the card rises 8px and fades in over 220ms (ease-out), staggered ~140ms, and its timeline mark inks in. With `prefers-reduced-motion: reduce`, facts appear without movement.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-16 | Initial design system created | /design-consultation from the approved design doc (D3-D15 floors), design knowledge only, all recommended options accepted |
| 2026-11-16 | Atkinson Hyperlegible Next body, Bricolage Grotesque display, Readex Pro Arabic, Atkinson Hyperlegible Mono data | Superseded the same day (see font change below) |
| 2026-11-16 | Ink primary buttons; blue reserved for "leaves the device" | Colour carries routing meaning, which is the product's trust story |
| 2026-11-16 | Highlighter for own words, kept chip for others' words | Makes "whose words" visible at a glance (the memorable thing) |
| 2026-11-16 | Conflict berry separate from urgent red | Red is reserved for urgent help |
| 2026-11-16 | Fonts changed: Public Sans (English, every role) and Cairo (Arabic, every role); Atkinson Hyperlegible Mono kept for raw data only | Asked for: an English face that suits medicine, and Cairo for Arabic; Public Sans is the US government's open typeface (official health-form tone), Cairo was chosen directly; supersedes Atkinson Hyperlegible Next, Bricolage Grotesque and Readex Pro |
| 2026-11-16 | English and Arabic both first-class, with a language switch on Start, in the header and in Settings; language independent of region | Owner decision: English and Arabic, with the option to change language |
| 2026-11-16 | Self-hosted fonts | Offline PWA and the zero-third-party-request leakage test |
| 2026-11-18 | Dark primary-hover `#C9CED5` | The dark primary button needed a hover step; one notch darker than dark-primary, approved |
| 2026-11-20 | Commercial redesign: cool neutral ground (`paper` #F5F6F8), near-black ink, soft card shadows, 20px hero radius, logo mark, step navigation (sidebar on desktop, progress bar on phones), product hero with a result preview and three entry cards, line-icon set | Owner asked for a professional commercial design ("surprise me"); route colours, highlighter and fonts unchanged |
