// Cue words for the prefilter (English). Arabic chats never reach the Reader (they go to the 5 questions).
const GENERIC = String.raw`pills?|tablets?|meds?|medicines?|medication|dose|prescri\w*|doctor|gp|pharmac\w*|side effects?|restart\w*|aches?|aching|achy|pain\w*|sore|hurt\w*|swell\w*|swollen|puffy|cough\w*|stomach|tummy|sick|nause\w*|diarrh\w*|sleep\w*|insomnia|awake|tired|dizz\w*|rash|itch\w*|mouth|thirsty|headaches?|feel(?:ing)? better|much better|worse|cleared up|back to normal|legs?|ankles?|feet|knees?|joints?|muscles?|chest|throat|skin`;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function cueMatcher(medicines: string[]) {
  const meds = medicines.filter(Boolean).map(esc);
  const re = new RegExp(String.raw`\b(?:${[GENERIC, ...meds].join('|')})\b`, 'i');
  return (m: { text: string }) => re.test(m.text);
}

/** A symptom event must come from a message that names a symptom or a change in one. */
export const SYMPTOM_WORDS = /\b(aches?|aching|achy|pain\w*|sore|hurt\w*|swell\w*|swollen|puffy|cough\w*|stomach|tummy|sick|nause\w*|diarrh\w*|sleep\w*|insomnia|awake|tired|dizz\w*|rash|itch\w*|mouth|thirsty|headaches?|better|worse|cleared|gone|back to normal|fine now)\b/i;

/** Text that reports no event: a question, or a general claim about what a medicine can do. */
export const NOT_AN_EVENT = /\b(can|could|may|might) (cause|give)\b|\bread (online|somewhere|that)\b|\bside effects? (include|of)\b/i;

/** A general claim, judged on the quoted sentence; a sentence that names no symptom ("Apparently it's a known
 * side effect.") is judged on its whole message, since the claim may sit in the sentence before it. */
export function isGeneralClaim(sentence: string, message: string, kind: string): boolean {
  // Only for symptom events: a medicine sentence never names a symptom, and its stop date is the dechallenge.
  const wholeMessage = kind.startsWith('symptom') && !SYMPTOM_WORDS.test(sentence);
  return NOT_AN_EVENT.test(wholeMessage ? message : sentence);
}

const RECOVERY = /\b(?:(?:sleeping|slept) (?:properly|well|fine|better)|back to normal|cleared up|went away|gone away|has gone|disappeared|all gone|fine now|feel(?:ing)? (?:better|fine|normal))\b/i;
const RETURN = /\b(?:back\b(?! to normal)|again\b|return\w*)/i;
/** Good news about a symptom ("sleeping properly since Thursday"), which the Reader sometimes labels as a start. */
export function reportsRecovery(sentence: string): boolean {
  return RECOVERY.test(sentence) && !RETURN.test(sentence);
}

/** The sentence of `text` that contains `quote` (case-insensitive), or the whole text if not found. */
export function sentenceAround(text: string, quote: string): string {
  const i = text.toLowerCase().indexOf(quote.toLowerCase().trim().replace(/[.!?]+$/, ''));
  if (i < 0) return text;
  const start = Math.max(text.lastIndexOf('.', i - 1), text.lastIndexOf('!', i - 1), text.lastIndexOf('?', i - 1)) + 1;
  const rest = text.slice(i).search(/[.!?]/);
  return text.slice(start, rest < 0 ? text.length : i + rest + 1).trim();
}
