import { isLikelyPidgin, normalizePidginGrammar } from './pidginNormalizer';

export function detectFallbackLanguageCode(input: string): string {
  const text = (input || '').trim();
  if (!text) return 'pcm';

  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const raw = text.toLowerCase();

  if (/((\bhow you dey\b|\bhow far\b|\bwetin\b|\babeg\b|\bno wahala\b|\boya\b|\bnaija\b|\bdey\b))/i.test(normalized)) return 'pcm';
  if (/((\bbawo\b|\bẹ kaaro\b|\be se\b|\bbẹẹni\b|\bkinni\b|\byoruba\b))/i.test(normalized)) return 'yo';
  if (/((\bkedu\b|\bdaalu\b|\bị dị mma\b|\bo dị mma\b|\bbiko\b|\bgini\b|\bigbo\b|\bnno\b))/i.test(normalized)) return 'ig';
  if (/((\bsannu\b|\byaya\b|\blafiya\b|\bna gode\b|\bdon allah\b|\bhausa\b))/i.test(normalized)) return 'ha';
  if (/(vbèè\s+óye\s+hé|vbèè\s+oye\s+he|vbèè\s+oye\s+hẹ|vbe\s+oye\s+he|vbee\s+oye\s+he|vbe\s+oye\s+hẹ|vbee\s+oye\s+hẹ|\bkoyo\b|\bkọyọ\b|\bdọmọ\b|\bdomo\b|\bvbo\s+yeh[eẹ]\b|\bvb[oẹeèè]\s*yeh[eẹ]\b|\b(?:mio|ọbowiẹ|ọbavan|ọbota|obiluu|obo\s*kia|khian|vbe|rre|gho|rie|lahọ|ọvbi|ẹvbi|erha|iye|ẹrhiẹ|iyan|ọka|ẹvbo|ẹsẹ)\b|\bma\s+vbe\s+khian(?:\s+mue)?\b|\b(?:gho|rre)\s+hia\b|\bobi\w*\b|\bbebi\b|\bedo\b|\bbini\b|\bẹdo\b)/i.test(raw)) return 'edo';
  if (/(vbẹe\s+oye\s+hẹ|vbee\s+oye\s+hẹ|oyese|uru\s+ese|ob[oa]?wie|obavan|obota|laho|esan)/i.test(raw)) return 'esan';
  if (/((\bhello\b|\bhi\b|\bhey\b|\bwhat\b|\bhow\b|\bplease\b|\bthank\b))/i.test(normalized)) return 'en';
  return 'pcm';
}

export function getLocalFallbackResponse(input: string, languageCode?: string): string {
  const normalized = (input || '').trim();
  const code = languageCode || detectFallbackLanguageCode(normalized);

  // Service unavailable message — used only when no input given
  const unavailable = {
    en: 'The AI service is temporarily unavailable. Please try again in a moment.',
    pcm: 'AI service no dey available for now. Try again small small.',
    yo: 'Iṣẹ́ AI ko sí lójúko ni bayi. Jọ̀ ṣe ìgbà díẹ̀.',
    ig: 'Ndị AI anaghị ahu ugbu a. Biko nwaa ntakịrị.',
    ha: 'Aikin AI ba a samu a yanzu. Ka sake gwadawa.',
    edo: 'Ẹghẹ AI ọ rre khin nẹ. Tẹ vbe kpa rre ẹghẹ rre.',
    esan: 'Ẹghẹ AI ọ rre khin nẹ. Tẹ vbe kpa rre ẹghẹ rre.',
  } as const;

  if (!normalized) {
    return unavailable[code as keyof typeof unavailable] || unavailable.pcm;
  }

  const lower = normalized.toLowerCase();

  // ── Greetings → reply naturally, never explain or define ──────────────────
  if (/\b(hello|hi|hey|good morning|good afternoon|good evening|good night|how are you|how you dey|how far|wetin dey|sup|what.s up|morning|evening)\b/i.test(lower)) {
    const greetings = {
      en: "I'm doing great! What's on your mind?",
      pcm: 'I dey fine o! You nko?',
      yo: 'Àlàáfíà! Báwo ni ìwọ?',
      ig: 'Ọ dị mma! Gịnị dị n\'obi gị?',
      ha: 'Lafiya lau! Kai fa?',
      edo: 'Ọy\' ẹsé! Vbèè óye hé rẹn?',
      esan: 'Ọyese! Vbẹe oye hẹ rẹn?',
    } as const;
    return greetings[code as keyof typeof greetings] || greetings.en;
  }

  // ── Thank you → acknowledge naturally ────────────────────────────────────
  if (/\b(thank you|thanks|thank u|na you|e don do)\b/i.test(lower)) {
    const thanks = {
      en: 'Anytime! What else can I help with?',
      pcm: 'E don do! I happy say I fit help you.',
      yo: 'E ṣeun! Kíni mo lè ṣe fún ọ mọ́?',
      ig: 'Daalụ! Gịnị ọzọ m ga-enyere gị aka?',
      ha: 'Babu laifi! Me zan iya yi maka ka?',
      edo: 'Ọse! Wetin ọzọ I fit do gi?',
      esan: 'Ese! Wetin ọzọ I fit do gi?',
    } as const;
    return thanks[code as keyof typeof thanks] || thanks.en;
  }

  // ── Simple maths ──────────────────────────────────────────────────────────
  if (/\b(what is 2 \+ 2|2 \+ 2|calculate|sum)/i.test(lower)) {
    return '2 + 2 = 4.';
  }

  // ── Weather ───────────────────────────────────────────────────────────────
  if (/\b(weather|forecast|temperature|rain|sunny|cloudy|storm|hot|cold)\b/i.test(lower)) {
    const weather = {
      en: 'Which location do you want the weather for?',
      pcm: 'Which place you wan check weather? I go find am for you.',
      yo: 'Ìpínlẹ̀ wo ni o fẹ́ ìjọba ojo rẹ?',
      ig: 'Ebe ole ị chọọ ka m lelee ọnọdụ igwe?',
      ha: 'Wane wuri kake son na duba yanayin?',
      edo: 'Location ole you wan check weather?',
      esan: 'Location ole you wan check weather?',
    } as const;
    return weather[code as keyof typeof weather] || weather.en;
  }

  // ── News/search ───────────────────────────────────────────────────────────
  if (/\b(news|latest|today.*nigeria|nigeria.*today|search)\b/i.test(lower)) {
    const search = {
      en: 'Let me answer from what I know — go ahead.',
      pcm: 'Make I answer you from wetin I know. Wetin you wan find out?',
      yo: 'Jẹ́ kí n dáhùn láti ohun tí mo mọ — béèrè.',
      ig: 'Ka m zaghachi site n\'ihe m maara — juo.',
      ha: 'Bari in amsa daga abin da na sani — tambaya.',
      edo: 'Make I answer you from wetin I know.',
      esan: 'Make I answer you from wetin I know.',
    } as const;
    return search[code as keyof typeof search] || search.en;
  }

  // ── Educational science topics ────────────────────────────────────────────
  if (/\b(photosynthesis|water cycle|heart|pulley|computer|cell|atom|ecosystem|battery|machine|kidney|brain)\b/i.test(lower)) {
    if (code === 'pcm') {
      if (/photosynthesis/i.test(lower)) return normalizePidginGrammar('Photosynthesis na the process wey plants use sunlight, water, and CO2 to make food and release oxygen.');
      if (/water cycle/i.test(lower)) return 'Water cycle get four steps: evaporation, condensation, precipitation, collection. Sun heat water to vapor, vapor form cloud, rain fall, water gather again.';
      if (/heart/i.test(lower)) return 'Heart na muscle wey pump blood around the body. E send oxygen-rich blood go body and dirty blood go lungs to refresh.';
      return 'I dey here. Ask me wetin you wan know.';
    }
    if (/photosynthesis/i.test(lower)) return 'Photosynthesis is how plants use sunlight, water, and CO2 to make glucose and release oxygen.';
    if (/water cycle/i.test(lower)) return 'The water cycle: evaporation → condensation → precipitation → collection. Sun heats water, clouds form, rain falls, water gathers again.';
    if (/heart/i.test(lower)) return 'The heart is a muscular pump that circulates blood — sending oxygen-rich blood to the body and returning oxygen-poor blood to the lungs.';
    return "Ask me anything — I'm here.";
  }

  // ── Generic last resort ───────────────────────────────────────────────────
  const generic = {
    en: "I'm here! What do you need?",
    pcm: 'I dey here. Wetin you wan ask?',
    yo: 'Mo wà níbí. Kíni o fẹ́?',
    ig: 'Anọ m ebe a. Gịnị chọọ gị?',
    ha: 'Ina nan. Me kake so?',
    edo: 'I rre hia. Wetin you wan?',
    esan: 'I rre hia. Wetin you wan?',
  } as const;

  const finalText = generic[code as keyof typeof generic] || generic.en;
  if (code === 'pcm' && isLikelyPidgin(finalText)) {
    return normalizePidginGrammar(finalText);
  }
  return finalText;
}
