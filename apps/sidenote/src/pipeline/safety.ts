// Safety (code, never a model): red flags open the urgent-help screen; questions asking for advice or a cause
// get a fixed template. Runs on all typed text and the patient's chat messages, in English and Arabic.
// A red flag in an old chat message still shows the screen (once per fact): the app can't know it has passed.

export type Region = 'US' | 'UK' | 'EG';
export const URGENT_PHONE: Record<Region, string> = { US: '911', UK: '999 or 111', EG: '123' };

export const URGENT = {
  en: 'Some of what you described can be serious. Get urgent medical help now.',
  ar: 'بعض ما وصفته قد يكون خطيرًا. اطلب مساعدة طبية عاجلة الآن.',
};
export const NEVER_ADVISE = {
  en: "SideNote can't give medical advice or say what caused a reaction. Talk to your doctor or pharmacist before you stop, start or change any medicine.",
  ar: 'لا يستطيع SideNote تقديم نصيحة طبية أو تحديد سبب العرض. تحدّث مع طبيبك أو الصيدلي قبل أن توقف أي دواء أو تبدأه أو تغيّره.',
};

// Arabic spelling varies (أ/إ/آ, ى/ي, ة/ه, diacritics); match on a normalised form. English: straight apostrophes.
const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[ً-ْ]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const AR_PLACES = '(?:الوجه|وشي|وشه|وشها|الشفايف|الشفاه|شفايفي|اللسان|لساني|الحلق|الزور|زوري)';
const RED_FLAGS: [string, RegExp][] = [
  ['face, lips, tongue or throat swelling', /\b(?:face|lips?|tongue|throat)\b[^.?!]{0,30}\b(?:swell\w*|swollen|puff\w*|huge)\b|\b(?:swell\w*|swollen|puff\w*)\b[^.?!]{0,30}\b(?:face|lips?|tongue|throat)\b/],
  ['trouble breathing', /\b(?:can'?t|cannot|can not|trouble|difficulty|hard to|struggling to)\s+breath\w*|\bshort(?:ness)? of breath|\bwheez\w*|\bthroat (?:is )?closing/],
  ['chest pain', /\bchest (?:pain|hurts?|tight\w*)|\bpain in (?:my|his|her|the) chest/],
  ['fainting or a seizure', /\b(?:fainted|passed out|unconscious|collapsed|seizures?)\b/],
  ['thoughts of self-harm', /\b(?:kill(?:ing)? myself|suicid\w*|end my life|self[- ]harm)/],
  ['تورم الوجه أو الشفايف أو اللسان', new RegExp(`(?:تورم|ورم|وارم\\S*)[^.؟!]{0,30}${AR_PLACES}|${AR_PLACES}[^.؟!]{0,30}(?:تورم|ورم|وارم\\S*)`)],
  ['ضيق في التنفس', /ضيق (?:في )?(?:ال)?تنفس|صعوبه (?:في )?(?:ال)?تنفس|مش (?:قادر|قادره|عارف|عارفه) ا?تنفس/],
  ['ألم في الصدر', /(?:وجع|الم) (?:في )?(?:صدري|الصدر|صدره|صدرها)/],
  ['إغماء أو تشنج', /اغمي علي|اغماء|تشنج/],
  ['أفكار إيذاء النفس', /انتحار|اموت نفسي|اقتل نفسي/],
];

/** The red flags a text mentions (empty when none). Errs towards flagging: a false alarm costs one tap. */
export function redFlags(text: string): string[] {
  const t = norm(text);
  return RED_FLAGS.filter(([, re]) => re.test(t)).map(([name]) => name);
}

export function urgentHelp(texts: { text: string; at?: string }[], region: Region) {
  const matches = [...new Set(texts.flatMap(t => redFlags(t.text)))];
  return { show: matches.length > 0, matches, phone: URGENT_PHONE[region], copy: URGENT };
}

const BAIT = [
  /\b(?:should|shall) (?:i|we|he|she|mum|mom|dad)\b[^.?!]{0,40}\b(?:stop|start|take|restart|keep|quit|change)\b/,
  /\bis it (?:safe|ok|okay|fine)\b/,
  /(?:^|[.?!]\s*)(?:did|does|could|can|is|was)\b[^.?!]{0,40}\bcaus\w*|\bcaus\w*[^.?!]*\?/, // a question about a cause, not "I read it can cause"
  /\bcan (?:i|we|he|she) (?:stop|restart|take|start|quit)\b/,
  /(?:اوقف|اقف|ابطل|اكمل|ارجع|اخد)\S*[^.؟!]{0,20}(?:ولا لا|ولا ايه)/,
  /هل [^.؟!]{0,30}سبب/,
  /ينفع (?:اوقف|ارجع|اخد|اكمل|ابطل)/,
  /امان (?:اني|اخد)/,
];
/** A question that asks for advice or a cause. The app answers it with NEVER_ADVISE, never with model text. */
export const isAdviceBait = (text: string) => BAIT.some(re => re.test(norm(text)));
