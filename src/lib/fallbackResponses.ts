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

  // ── Thank you → acknowledge naturally (broad match) ──────────────────────
  if (/\b(thank you|thanks|thank u|na you|e don do|appreciate|well done|God bless|no fit thank)\b/i.test(lower)) {
    const thanks = [
      { en: 'Anytime! What else can I help with?', pcm: 'No wahala! I dey always here for you.' },
      { en: "You're welcome! Ask me anything.", pcm: 'Carry go! Wetin else I fit help you with?' },
      { en: 'Happy to help! What else?', pcm: 'Na my work! Ask me anything anytime.' },
    ];
    const pick = thanks[Math.floor(Date.now() / 1000) % thanks.length];
    if (code === 'pcm') return pick.pcm;
    const t = { yo: 'E ṣeun! Kíni mo lè ṣe fún ọ mọ́?', ig: 'Daalụ! Gịnị ọzọ m ga-enyere gị aka?', ha: 'Babu laifi! Me zan iya yi maka ka?', edo: 'Ọse! Wetin ọzọ I fit do gi?', esan: 'Ese! Wetin ọzọ I fit do gi?' } as const;
    return t[code as keyof typeof t] || pick.en;
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
  if (/\b(news|latest|today.*nigeria|nigeria.*today|search|wetin.*happen|happen.*today|dey happen)\b/i.test(lower)) {
    const search = {
      en: "I can't fetch live news right now. Check BBC News, Channels TV, or Punch newspaper for the latest.",
      pcm: 'My internet no dey work right now so I no fit fetch live news. Check BBC Pidgin, Channels TV or Twitter/X for latest update.',
      yo: 'Ìsopọ̀ mi ko sí lójúko. Ẹ wo BBC Yoruba tàbí Channels TV.',
      ig: 'Njikọ internet adịghị ugbu a. Lee BBC Igbo ma ọ bụ Channels TV.',
      ha: 'Haɗin intanet bai da yanzu. Duba BBC Hausa ko Channels TV.',
      edo: 'Internet no dey work now. Check Channels TV for latest.',
      esan: 'Internet no dey work now. Check Channels TV for latest.',
    } as const;
    return search[code as keyof typeof search] || search.en;
  }

  // ── Date/time ─────────────────────────────────────────────────────────────
  if (/\b(today|date|time|day|wetin.*date|what.*date|wetin.*today|wetin.*time|what.*time)\b/i.test(lower)) {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (code === 'pcm') return `Today na **${dateStr}**. Time na **${timeStr}** for your device.`;
      return `Today is **${dateStr}**. Current time: **${timeStr}** (your device time).`;
    } catch {
      return code === 'pcm' ? 'Check the date for your phone.' : 'Check your device for the current date and time.';
    }
  }

  // ── Medical / symptoms — SPECIALIST knowledge in fallback ─────────────────
  if (/\b(headache|head.*pain|pain.*head|head dey pain|head dey do|migraine|my head)\b/i.test(lower)) {
    const r = {
      en: '**For headache:** Take **Panadol Extra** (2 tablets) or **Ibuprofen/Felvin 400mg** (1 tablet with food). Rest in a quiet dark room, drink water. If pain is severe or lasts over 3 days, see a doctor.',
      pcm: 'Take **Panadol Extra** — 2 tablets with water. If e strong pass, try **Felvin** (Ibuprofen 400mg) 1 tablet after food. Rest well, drink water. If e no stop after 3 days, go doctor.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }

  if (/\b(fever|temperature|hot body|body hot|malaria|dey shake|shaking|i dey shake)\b/i.test(lower)) {
    const r = {
      en: '**For fever:** Take **Panadol** 2 tablets every 6 hours. If you suspect malaria, take **Coartem** or **Lonart** (follow weight dosage on pack). Drink plenty water. Go hospital if fever exceeds 3 days.',
      pcm: 'Take **Panadol** — 2 tablets every 6 hours. If na malaria, take **Coartem** or **Lonart** follow the pack instruction. Drink plenty water. If fever no stop after 3 days, go hospital quick.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }

  if (/\b(cough|cold|catarrh|running nose|sore throat|chest|breathe)\b/i.test(lower)) {
    const r = {
      en: '**For cough/cold:** Dry cough → **Coflin syrup** 10ml 3x daily. Wet cough with mucus → **Benylin Expectorant** 10ml 3x daily. Sore throat → **Strepsils** lozenges + warm salt water gargle.',
      pcm: 'Dry cough: take **Coflin syrup** 10ml 3 times daily. Wet cough with mucus: **Benylin Expectorant** 10ml 3 times daily. Warm water with salt fit help sore throat. Drink plenty water.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }

  if (/\b(stomach|belle|belly|ulcer|indigestion|vomit|stool|diarrhea|purging|dey purge|running stomach)\b/i.test(lower)) {
    const r = {
      en: '**For stomach pain/ulcer:** Take **Omeprazole 20mg** once daily before food. For diarrhoea → **Loperamide (Imodium)** 2 capsules then 1 after each loose stool. Drink ORS (oral rehydration salts) to replace fluids.',
      pcm: 'Stomach pain or ulcer: take **Omeprazole** 20mg before food in the morning. If na running stomach, take **Loperamide** 2 capsules first, then 1 after every loose stool. Drink ORS (Oral Rehydration Salt) mix — buy am for pharmacy.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }

  if (/\b(body pain|body ache|joint pain|back pain|waist pain|muscle pain)\b/i.test(lower)) {
    const r = {
      en: '**For body/joint pain:** Take **Ibuprofen (Felvin/Advil) 400mg** 1 tablet 3x daily with food, or **Diclofenac (Voltaren) 50mg** twice daily with food. Warm compress on painful area helps too.',
      pcm: 'Take **Felvin** (Ibuprofen 400mg) — 1 tablet 3 times daily after food. Or **Diclofenac** (Voltaren) 50mg 2 times daily after food. Put warm cloth on the pain area. No take am for empty stomach.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }

  if (/\b(blood pressure|bp|hypertension|heart|chest pain|dizzy|dizziness)\b/i.test(lower)) {
    const r = {
      en: '⚠️ **Chest pain or dizziness** needs medical attention. For known high BP: continue your prescribed medicine (Amlodipine/Lisinopril). Reduce salt, rest. Go to hospital if chest pain is severe.',
      pcm: '⚠️ If your chest dey pain you, go hospital fast — no waste time. If na high BP wey you don know, take your prescribed medicine (Amlodipine or Lisinopril). Reduce salt for food, rest well.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }

  if (/\b(diabetes|sugar|blood sugar|insulin|metformin)\b/i.test(lower)) {
    const r = {
      en: '**Diabetes management:** Take **Metformin 500mg** twice daily with meals (Type 2, first line). Avoid sugar, white rice, bread. Exercise daily. Monitor blood sugar regularly. Never stop medication without doctor approval.',
      pcm: '**Diabetes:** Take **Metformin** 500mg 2 times daily with food. Avoid too much sugar, white rice, bread. Do small exercise every day. Check your blood sugar regular. No stop your medicine without doctor say so.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }

  if (/\b(infection|bacteria|antibiotic|amoxicillin|typhoid|uti|wound)\b/i.test(lower)) {
    const r = {
      en: '**For bacterial infection:** Mild → **Amoxicillin 500mg** 3x daily for 5-7 days. Stronger → **Augmentin 625mg** twice daily. Typhoid → **Ciprofloxacin 500mg** twice daily for 7-10 days. Complete the full course.',
      pcm: 'For infection: mild one — take **Amoxicillin** 500mg 3 times daily for 5-7 days. Strong infection — **Augmentin** 625mg 2 times daily. Typhoid — **Ciprofloxacin** 500mg 2 times daily for 7-10 days. Make sure you finish the full course even if you feel better.',
    } as const;
    return r[code as keyof typeof r] || r.pcm;
  }
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

  // ── Food / hunger ─────────────────────────────────────────────────────────
  if (/\b(wan chop|dey hungry|hungry|food|wetin.*chop|chop wetin|wetin.*cook|make.*food|cook|recipe|rice|soup|stew|egusi|jollof|indomie|eba|garri|bread|snack|eat)\b/i.test(lower)) {
    const food = {
      en: "What would you like to eat or cook? I can suggest recipes, ingredients, and cooking steps!",
      pcm: "Wetin you wan chop? I fit suggest recipe for you. You get rice, tomatoes, na stew we go make. Or you wan order?",
      yo: "Kíni o fẹ́ jẹ? Mo lè dábàá oúnjẹ fún ọ.",
      ig: "Gịnị ị chọọ iri? M ga-atụ ndụmọdụ maka ihe oriri.",
      ha: "Mene kake so ci? Zan iya ba ka shawarar abinci.",
      edo: "Wetin you wan chop? Make I help you.",
      esan: "Wetin you wan chop? Make I help you.",
    } as const;
    return food[code as keyof typeof food] || food.en;
  }

  // ── Gratitude (broad) ─────────────────────────────────────────────────────
  if (/\b(i no fit thank you|i cannot thank you|thank you so much|thanks a lot|na you|e don do|na your work|appreciate|God bless|bless you|God go bless|you too much|you sabi well)\b/i.test(lower)) {
    if (code === 'pcm') return 'No wahala at all! I happy say I fit help you. Ask me anything anytime.';
    if (code === 'en') return "You're very welcome! I'm always here. What else can I do for you?";
    if (code === 'yo') return 'E ṣeun! Àárẹ̀ mi ni ìsẹ́ rẹ.';
    if (code === 'ig') return 'Ọ bụ ihe m na-atọ ụtọ ime! Gịnị ọzọ?';
    if (code === 'ha') return 'Babu laifi! Zan iya taimakaka a kowane lokaci.';
    return 'No wahala at all! Always here for you.';
  }

  // ── Emotional / life / wahala ─────────────────────────────────────────────
  if (/\b(stress|i dey stress|wahala|e don do|I don tire|tired|bored|sad|worry|trouble|problem|scatter|e don scatter|i dey feel|no dey fine|down|depressed|frustrated)\b/i.test(lower)) {
    const emo = {
      en: "That sounds tough. What's going on? I'm here to listen and help.",
      pcm: "E go better! Gist me wetin dey happen — maybe I fit help you sort am out.",
      yo: "Pẹlẹ! Kíni ọrọ? Mo wà láti gbọ́ ọ.",
      ig: "Ndo! Gịnị mere? Ọ dịghị nsogbu — m nọ ebe a.",
      ha: "Yi hakuri! Mene ya faru? Ina nan don taimakaka.",
      edo: "E go better! Tell me wetin dey happen.",
      esan: "E go better! Tell me wetin dey happen.",
    } as const;
    return emo[code as keyof typeof emo] || emo.en;
  }

  // ── Jokes / entertainment ─────────────────────────────────────────────────
  if (/\b(joke|funny|laugh|gist|make me laugh|entertain|comedy|lol)\b/i.test(lower)) {
    if (code === 'pcm') return 'Why Naija man no dey lose? Because even NEPA go carry go our light but e no fit carry go our sense! 😂 Wetin else you wan gist about?';
    return "Why don't scientists trust atoms? Because they make up everything! 😄 Ask me for more.";
  }

  // ── Who made / about the AI ───────────────────────────────────────────────
  if (/\b(who (created|made|built|develop) you|who be your creator|who be your developer|wetin be your name|na who make you|wetin you be|your name|your creator|your developer)\b/i.test(lower)) {
    if (code === 'pcm') return 'My name na BLACK AI. Obosa Thompson Emuze na im create me — e be Nigerian developer wey build me to serve Africa.';
    return 'I am BLACK AI, created by Obosa Thompson Emuze — a Nigerian developer who built me to serve Africa.';
  }

  // ── Advice / life decisions ───────────────────────────────────────────────
  if (/\b(how I go|wetin I go do|advice|advise|suggestion|what should I do|help me decide|i need help|i dey confused|confused)\b/i.test(lower)) {
    if (code === 'pcm') return 'Tell me more about the situation — I go give you my honest take on am.';
    return "Tell me more about your situation — I'll give you an honest perspective.";
  }

  // ── Maths / calculations ──────────────────────────────────────────────────
  if (/\b(calculate|wetin be|what is|\d+\s*[\+\-\*\/x÷]\s*\d+|maths|math)\b/i.test(lower)) {
    // Try to evaluate simple arithmetic
    const mathMatch = lower.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/x÷])\s*(\d+(?:\.\d+)?)/i);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      let result: number | null = null;
      if (op === '+') result = a + b;
      else if (op === '-') result = a - b;
      else if (op === '*' || op === 'x') result = a * b;
      else if (op === '/' || op === '÷') result = b !== 0 ? a / b : null;
      if (result !== null) {
        if (code === 'pcm') return `The answer na **${result}**. You get another calculation?`;
        return `The answer is **${result}**.`;
      }
    }
    if (code === 'pcm') return 'Write the calculation — e.g. "wetin be 25 + 17?" and I go answer.';
    return 'Write the calculation — e.g. "What is 25 + 17?" and I will answer.';
  }

  // ── Money / hustle ────────────────────────────────────────────────────────
  if (/\b(money|cash|broke|no money|i no get money|hustle|work|salary|income|business|invest)\b/i.test(lower)) {
    if (code === 'pcm') return 'Money matter be serious! Wetin exactly you wan know — how to make money online, investment ideas, or something else?';
    return "Money is serious business! Are you asking about earning, saving, investing, or something specific? Let me know.";
  }

  // ── Relationship / love ───────────────────────────────────────────────────
  if (/\b(love|relationship|girlfriend|boyfriend|girl|boy|crush|heartbreak|marriage|wedding|ex|breakup|cheat)\b/i.test(lower)) {
    if (code === 'pcm') return 'Relationship matter! Tell me wetin dey happen — I go listen and give you real talk.';
    return "Relationship things! Tell me what's going on — I'm listening.";
  }

  // ── Generic last resort — API is down, fallback has no specific match ─────
  if (code === 'pcm') {
    return 'My connection dey slow right now. Try again small — I go answer you properly.';
  }

  if (code === 'en') {
    return "Please try again — I'm having trouble connecting right now.";
  }

  // Other languages — honest fallback
  const generic = {
    yo: 'Àsopọ̀ mi lọ̀ọ́lọ̀ọ́. Jọ̀ gbìyànjú lẹ́ẹ̀kan sí i.',
    ig: 'Njikọ m dị nta nta. Biko nwaa ọzọ.',
    ha: 'Haɗin na yana jinkiri. Ka sake gwadawa.',
    edo: 'My connection slow. Try again small.',
    esan: 'My connection slow. Try again small.',
  } as const;

  return generic[code as keyof typeof generic] || "Please try again — I'm having trouble connecting right now.";
}
