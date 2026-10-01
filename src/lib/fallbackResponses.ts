import { isLikelyPidgin, normalizePidginGrammar } from './pidginNormalizer';

// ── Country detection from timezone + cached location ─────────────────────
function detectUserCountry(): string {
  try {
    // 1. Try cached location first (most accurate)
    const cached = localStorage.getItem('9jai-location-context');
    if (cached) {
      const loc = JSON.parse(cached);
      if (loc?.country && typeof loc.country === 'string') {
        return loc.country.trim();
      }
    }
  } catch { /* ignore */ }

  try {
    // 2. Infer from timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const t = tz.toLowerCase();
    if (t.includes('lagos') || t.includes('africa/lagos')) return 'Nigeria';
    if (t.includes('calcutta') || t.includes('kolkata') || t.includes('mumbai') || t.includes('india')) return 'India';
    if (t.includes('london') || t.includes('europe/london')) return 'UK';
    if (t.includes('new_york') || t.includes('chicago') || t.includes('los_angeles') || t.includes('america/')) {
      if (!t.includes('sao_paulo') && !t.includes('bogota') && !t.includes('mexico')) return 'USA';
    }
    if (t.includes('accra') || t.includes('africa/accra')) return 'Ghana';
    if (t.includes('nairobi') || t.includes('africa/nairobi')) return 'Kenya';
    if (t.includes('johannesburg') || t.includes('africa/johannesburg')) return 'South Africa';
    if (t.includes('sydney') || t.includes('australia')) return 'Australia';
    if (t.includes('toronto') || t.includes('canada')) return 'Canada';
    if (t.includes('dubai') || t.includes('asia/dubai')) return 'UAE';
    if (t.includes('europe/')) return 'Europe';
  } catch { /* ignore */ }

  return 'Nigeria'; // default
}

// ── Location-aware medicine lookup ─────────────────────────────────────────
interface MedProfile {
  paracetamol: string;
  ibuprofen: string;
  antibiotic: string;
  antimalarial: string;
  cough: string;
  antacid: string;
  antidiarrheal: string;
}

function getMedProfile(country: string): MedProfile {
  const c = country.toLowerCase();
  if (/nigeria/.test(c)) return {
    paracetamol: 'Panadol / Emzor / M&B (500mg)',
    ibuprofen: 'Felvin / Advil (400mg)',
    antibiotic: 'Amoxil (Amoxicillin 500mg) / Augmentin 625mg',
    antimalarial: 'Coartem / Lonart DS (follow weight on pack)',
    cough: 'Coflin syrup (dry) / Benylin Expectorant (wet) — 10ml 3x daily',
    antacid: 'Omeprazole 20mg (before food) / Maalox',
    antidiarrheal: 'Loperamide (Imodium) / ORS sachets',
  };
  if (/india/.test(c)) return {
    paracetamol: 'Crocin / Dolo 650 / Calpol (650mg)',
    ibuprofen: 'Combiflam / Zerodol / Brufen (400mg)',
    antibiotic: 'Azithral (Azithromycin 500mg) / Ciprobid (Ciprofloxacin)',
    antimalarial: 'Lariago / Falcigo / Coartem (as prescribed)',
    cough: 'Benadryl syrup / Ascoril LS — 10ml 3x daily',
    antacid: 'Pan-D / Gelusil / Eno / Digene',
    antidiarrheal: 'Eldoper (Loperamide) / Electral ORS',
  };
  if (/^uk$|england|britain|scotland|wales/.test(c)) return {
    paracetamol: 'Paracetamol 500mg (own-brand, Tesco/Boots) / Calpol',
    ibuprofen: 'Nurofen / Brufen (200–400mg)',
    antibiotic: 'Amoxicillin 500mg / Co-amoxiclav (Augmentin) — prescription needed',
    antimalarial: 'Malarone / Riamet (prescription)',
    cough: 'Benylin / Lemsip / Covonia — follow pack',
    antacid: 'Gaviscon / Rennie / Omeprazole (Prilosec)',
    antidiarrheal: 'Imodium / Dioralyte ORS',
  };
  if (/usa|united states|america/.test(c)) return {
    paracetamol: 'Tylenol (Acetaminophen 500mg)',
    ibuprofen: 'Advil / Motrin / Aleve (200–400mg)',
    antibiotic: 'Amoxicillin 500mg / Azithromycin (Z-Pack) — prescription needed',
    antimalarial: 'Malarone / Coartem (prescription)',
    cough: 'Robitussin / DayQuil / Mucinex — follow pack',
    antacid: 'Tums / Pepto-Bismol / Nexium / Prilosec',
    antidiarrheal: 'Imodium (Loperamide) / Pedialyte ORS',
  };
  if (/ghana/.test(c)) return {
    paracetamol: 'Panadol / Hedex (500mg)',
    ibuprofen: 'Brufen / Ibuprofen (400mg)',
    antibiotic: 'Amoxicillin 500mg / Co-trimoxazole',
    antimalarial: 'Coartem / Artesunate+Amodiaquine (follow pack)',
    cough: 'Benylin / Actifed — 10ml 3x daily',
    antacid: 'Omeprazole / Gelusil',
    antidiarrheal: 'Loperamide / ORS sachets',
  };
  if (/kenya|east africa/.test(c)) return {
    paracetamol: 'Panadol / Hedex (500mg)',
    ibuprofen: 'Brufen / Ibuprofen (400mg)',
    antibiotic: 'Amoxicillin 500mg / Doxycycline',
    antimalarial: 'ALu (Coartem) / SP (Fansidar) — follow weight',
    cough: 'Benylin / Actifed — 10ml 3x daily',
    antacid: 'Omeprazole / Maalox',
    antidiarrheal: 'Loperamide / ORS sachets',
  };
  if (/south africa/.test(c)) return {
    paracetamol: 'Panado / Disprin (500mg)',
    ibuprofen: 'Voltaren Emulgel / Ibuprofen (400mg)',
    antibiotic: 'Amoxicillin / Co-amoxiclav (Augmentin)',
    antimalarial: 'Coartem / Riamet (prescription)',
    cough: 'Benylin / Actifed — follow pack',
    antacid: 'Gaviscon / Rennies / Omeprazole',
    antidiarrheal: 'Imodium / Rehydrat ORS',
  };
  if (/australia/.test(c)) return {
    paracetamol: 'Panadol / Panamax (500mg)',
    ibuprofen: 'Nurofen / Advil (200–400mg)',
    antibiotic: 'Amoxycillin / Augmentin — prescription needed',
    antimalarial: 'Malarone / Coartem (prescription)',
    cough: 'Benadryl / Robitussin / Codral — follow pack',
    antacid: 'Gaviscon / Mylanta / Nexium',
    antidiarrheal: 'Gastro-Stop (Loperamide) / Hydralyte ORS',
  };
  if (/canada/.test(c)) return {
    paracetamol: 'Tylenol / Tempra (500mg)',
    ibuprofen: 'Advil / Motrin (200–400mg)',
    antibiotic: 'Amoxicillin / Biaxin — prescription needed',
    antimalarial: 'Malarone (prescription)',
    cough: 'Robitussin / Buckley\'s — follow pack',
    antacid: 'Tums / Gaviscon / Nexium',
    antidiarrheal: 'Imodium / Pedialyte ORS',
  };
  if (/uae|emirates/.test(c)) return {
    paracetamol: 'Panadol / Adol (500mg)',
    ibuprofen: 'Brufen / Advil (400mg)',
    antibiotic: 'Amoxicillin / Augmentin (prescription needed)',
    antimalarial: 'Coartem / Malarone (prescription)',
    cough: 'Benylin / Piriton — follow pack',
    antacid: 'Omeprazole / Gaviscon',
    antidiarrheal: 'Loperamide / ORS sachets',
  };
  // Generic fallback
  return {
    paracetamol: 'Paracetamol 500mg (ask your local pharmacist for the brand name)',
    ibuprofen: 'Ibuprofen 400mg (ask your local pharmacist)',
    antibiotic: 'Amoxicillin 500mg — ask doctor for prescription',
    antimalarial: 'Artemisinin-based combination therapy (ACT) — ask your doctor',
    cough: 'Cough syrup containing Dextromethorphan (dry) or Guaifenesin (wet) — ask pharmacist',
    antacid: 'Omeprazole 20mg / ask pharmacist for local antacid brand',
    antidiarrheal: 'Loperamide + ORS (Oral Rehydration Salts) — ask pharmacist',
  };
}

// ── Language code detector ─────────────────────────────────────────────────
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

// ── Main fallback response function ───────────────────────────────────────
export function getLocalFallbackResponse(input: string, languageCode?: string): string {
  const normalized = (input || '').trim();
  const code = languageCode || detectFallbackLanguageCode(normalized);
  const country = detectUserCountry();
  const med = getMedProfile(country);
  const isPidgin = code === 'pcm';

  const unavailable = {
    en: 'The AI service is temporarily unavailable. Please try again in a moment.',
    pcm: 'AI service no dey available for now. Try again small small.',
    yo: 'Iṣẹ́ AI ko sí lójúko ni bayi. Jọ̀ ṣe ìgbà díẹ̀.',
    ig: 'Ndị AI anaghị ahu ugbu a. Biko nwaa ntakịrị.',
    ha: 'Aikin AI ba a samu a yanzu. Ka sake gwadawa.',
    edo: 'Ẹghẹ AI ọ rre khin nẹ. Tẹ vbe kpa rre ẹghẹ rre.',
    esan: 'Ẹghẹ AI ọ rre khin nẹ. Tẹ vbe kpa rre ẹghẹ rre.',
  } as const;

  if (!normalized) return unavailable[code as keyof typeof unavailable] || unavailable.pcm;

  const lower = normalized.toLowerCase();

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (/\b(hello|hi|hey|good morning|good afternoon|good evening|good night|how are you|how you dey|how far|wetin dey|sup|what.s up|morning|evening)\b/i.test(lower)) {
    const g = { en: "I'm doing great! What's on your mind?", pcm: 'I dey fine o! You nko?', yo: 'Àlàáfíà! Báwo ni ìwọ?', ig: "Ọ dị mma! Gịnị dị n'obi gị?", ha: 'Lafiya lau! Kai fa?', edo: "Ọy' ẹsé! Vbèè óye hé rẹn?", esan: 'Ọyese! Vbẹe oye hẹ rẹn?' } as const;
    return g[code as keyof typeof g] || g.en;
  }

  // ── Thank you ──────────────────────────────────────────────────────────────
  if (/\b(thank you|thanks|thank u|na you|e don do)\b/i.test(lower)) {
    const t = { en: 'Anytime! What else can I help with?', pcm: 'E don do! I happy say I fit help you.', yo: 'E ṣeun! Kíni mo lè ṣe fún ọ mọ́?', ig: 'Daalụ! Gịnị ọzọ m ga-enyere gị aka?', ha: 'Babu laifi! Me zan iya yi maka ka?', edo: 'Ọse! Wetin ọzọ I fit do gi?', esan: 'Ese! Wetin ọzọ I fit do gi?' } as const;
    return t[code as keyof typeof t] || t.en;
  }

  // ── Maths ──────────────────────────────────────────────────────────────────
  if (/\b(what is 2 \+ 2|2 \+ 2|calculate|sum)/i.test(lower)) return '2 + 2 = 4.';

  // ── Weather ────────────────────────────────────────────────────────────────
  if (/\b(weather|forecast|temperature|rain|sunny|cloudy|storm|hot|cold)\b/i.test(lower)) {
    const w = { en: 'Which location do you want the weather for?', pcm: 'Which place you wan check weather?', yo: 'Ìpínlẹ̀ wo ni o fẹ́ ìjọba ojo rẹ?', ig: 'Ebe ole ị chọọ ka m lelee ọnọdụ igwe?', ha: 'Wane wuri kake son na duba yanayin?', edo: 'Location ole you wan check weather?', esan: 'Location ole you wan check weather?' } as const;
    return w[code as keyof typeof w] || w.en;
  }

  // ── News/search ────────────────────────────────────────────────────────────
  if (/\b(news|latest|today.*search|search)\b/i.test(lower)) {
    return isPidgin ? 'Make I answer you from wetin I know. Wetin you wan find out?' : "Let me answer from what I know — go ahead.";
  }

  // ── HEADACHE ───────────────────────────────────────────────────────────────
  if (/\b(headache|head.*pain|pain.*head|head dey pain|head dey do|migraine|my head)\b/i.test(lower)) {
    if (isPidgin) return `For headache: take **${med.paracetamol}** — 2 tablets with water. If e strong pass, try **${med.ibuprofen}** — 1 tablet after food. Rest well for quiet dark place, drink water. If e no stop after 3 days, go doctor.`;
    return `**For headache:** Take **${med.paracetamol}** (2 tablets) or **${med.ibuprofen}** (1 tablet with food). Rest in a quiet dark room, drink water. If pain is severe or lasts over 3 days, see a doctor. *Available in ${country}.*`;
  }

  // ── FEVER / MALARIA ────────────────────────────────────────────────────────
  if (/\b(fever|temperature|hot body|body hot|malaria|dey shake|shaking|i dey shake)\b/i.test(lower)) {
    if (isPidgin) return `For fever: take **${med.paracetamol}** — 2 tablets every 6 hours. If na malaria, use **${med.antimalarial}** — follow the pack instruction. Drink plenty water. If fever no stop after 3 days, go hospital.`;
    return `**For fever:** Take **${med.paracetamol}** (2 tablets every 6 hours). If you suspect malaria, use **${med.antimalarial}**. Drink plenty of water. Go to hospital if fever lasts over 3 days. *Available in ${country}.*`;
  }

  // ── COUGH / COLD ───────────────────────────────────────────────────────────
  if (/\b(cough|cold|catarrh|running nose|sore throat|flu|breathe)\b/i.test(lower)) {
    if (isPidgin) return `For cough: **${med.cough}**. Drink warm water. Sore throat — gargle with warm salt water. If e no better after 1 week, see doctor.`;
    return `**For cough/cold:** ${med.cough}. Also try warm water with honey and lemon, and gargle warm salt water for sore throat. If no improvement after 1 week, see a doctor. *Available in ${country}.*`;
  }

  // ── STOMACH / ULCER / DIARRHOEA ───────────────────────────────────────────
  if (/\b(stomach|belle|belly|ulcer|indigestion|vomit|stool|diarrhea|purging|dey purge|running stomach|nausea)\b/i.test(lower)) {
    if (isPidgin) return `For stomach pain or ulcer: take **${med.antacid}** before food. If na running stomach: take **${med.antidiarrheal}** — and drink ORS (Oral Rehydration Salt) to replace fluid wey you don lose.`;
    return `**For stomach pain/ulcer:** Take **${med.antacid}** (once daily before food). For diarrhoea → **${med.antidiarrheal}**. Drink ORS (Oral Rehydration Salts) to replace lost fluids. *Available in ${country}.*`;
  }

  // ── BODY PAIN ──────────────────────────────────────────────────────────────
  if (/\b(body pain|body ache|joint pain|back pain|waist pain|muscle pain|bone pain)\b/i.test(lower)) {
    if (isPidgin) return `For body pain: take **${med.ibuprofen}** — 1 tablet 3 times daily after food. Or use **Diclofenac (Voltaren) 50mg** 2 times daily after food. Put warm cloth on the pain area. No take am for empty stomach.`;
    return `**For body/joint pain:** Take **${med.ibuprofen}** (1 tablet 3x daily with food), or **Diclofenac (Voltaren) 50mg** twice daily with food. Apply a warm compress to the painful area. *Available in ${country}.*`;
  }

  // ── HIGH BP / HEART ────────────────────────────────────────────────────────
  if (/\b(blood pressure|bp|hypertension|heart attack|chest pain|dizzy|dizziness)\b/i.test(lower)) {
    if (isPidgin) return `⚠️ If chest dey pain you, go hospital fast — no waste time. For high BP: continue your prescribed medicine (Amlodipine or Lisinopril). Reduce salt, rest well. Your doctor fit prescribe better medicine for ${country}.`;
    return `⚠️ **Chest pain needs immediate medical attention.** For known high BP: continue prescribed medicine (Amlodipine/Lisinopril/Ramipril — available in ${country}). Reduce salt intake, rest, and follow up with your doctor.`;
  }

  // ── DIABETES ───────────────────────────────────────────────────────────────
  if (/\b(diabetes|blood sugar|insulin|metformin|sugar level)\b/i.test(lower)) {
    if (isPidgin) return `For diabetes (Type 2): take **Metformin 500mg** 2 times daily with food. Avoid plenty sugar, white rice, white bread. Do small exercise every day. Check your blood sugar regular. No stop medicine without doctor say so. Available for ${country}.`;
    return `**Diabetes (Type 2):** Take **Metformin 500mg** twice daily with meals (first-line). Avoid sugar, refined carbs. Exercise daily. Monitor blood sugar regularly. Never stop medication without doctor approval. *Metformin is available in ${country}.*`;
  }

  // ── INFECTION / ANTIBIOTIC ─────────────────────────────────────────────────
  if (/\b(infection|bacteria|antibiotic|typhoid|uti|wound infected|sepsis)\b/i.test(lower)) {
    if (isPidgin) return `For infection: mild one — take **${med.antibiotic}** 3 times daily for 5-7 days. Strong infection — **Augmentin** 2 times daily. Typhoid — **Ciprofloxacin 500mg** 2 times daily for 7-10 days. Finish the full course. Available for ${country}.`;
    return `**For bacterial infection:** Mild → **${med.antibiotic}** 3x daily for 5-7 days. Severe → **Augmentin 625mg** twice daily. Typhoid → **Ciprofloxacin 500mg** twice daily for 7-10 days. Complete the full course. *Available in ${country}.*`;
  }

  // ── EDUCATIONAL SCIENCE ────────────────────────────────────────────────────
  if (/\b(photosynthesis|water cycle|heart|pulley|computer|cell|atom|ecosystem|battery|machine|kidney|brain)\b/i.test(lower)) {
    if (isPidgin) {
      if (/photosynthesis/i.test(lower)) return normalizePidginGrammar('Photosynthesis na the process wey plants use sunlight, water, and CO2 to make food and release oxygen.');
      if (/water cycle/i.test(lower)) return 'Water cycle: evaporation → condensation → precipitation → collection. Sun heat water to vapor, vapor form cloud, rain fall, water gather again.';
      if (/heart/i.test(lower)) return 'Heart na muscle wey pump blood around body. E send oxygen-rich blood go body and dirty blood go lungs to refresh.';
    }
    if (/photosynthesis/i.test(lower)) return 'Photosynthesis: plants use sunlight + water + CO₂ → glucose + oxygen.';
    if (/water cycle/i.test(lower)) return 'Water cycle: Evaporation → Condensation → Precipitation → Collection. Repeats continuously.';
    if (/heart/i.test(lower)) return 'The heart is a muscular pump — sends oxygen-rich blood to the body and oxygen-poor blood back to the lungs.';
  }

  // ── Generic last resort ────────────────────────────────────────────────────
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
  if (isPidgin && isLikelyPidgin(finalText)) return normalizePidginGrammar(finalText);
  return finalText;
}
