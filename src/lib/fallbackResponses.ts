import { isLikelyPidgin, normalizePidginGrammar } from './pidginNormalizer';

// ── Country detection from timezone + cached location ─────────────────────
function detectUserCountry(): string {
  try {
    const cached = localStorage.getItem('9jai-location-context');
    if (cached) {
      const loc = JSON.parse(cached);
      if (loc?.country && typeof loc.country === 'string') return loc.country.trim();
    }
  } catch { /* ignore */ }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const t = tz.toLowerCase();
    if (t.includes('lagos')) return 'Nigeria';
    if (t.includes('kolkata') || t.includes('calcutta') || t.includes('mumbai') || t.includes('india')) return 'India';
    if (t.includes('london') || t.includes('europe/london')) return 'UK';
    if (t.includes('new_york') || t.includes('chicago') || t.includes('los_angeles') || (t.includes('america/') && !t.includes('sao_paulo') && !t.includes('bogota') && !t.includes('mexico'))) return 'USA';
    if (t.includes('accra')) return 'Ghana';
    if (t.includes('nairobi')) return 'Kenya';
    if (t.includes('johannesburg')) return 'South Africa';
    if (t.includes('sydney') || t.includes('australia')) return 'Australia';
    if (t.includes('toronto') || t.includes('canada')) return 'Canada';
    if (t.includes('dubai')) return 'UAE';
    if (t.includes('europe/')) return 'Europe';
  } catch { /* ignore */ }

  return 'Nigeria';
}

// ── Medicine profile by country ───────────────────────────────────────────
interface MedProfile {
  paracetamol: string; ibuprofen: string; antibiotic: string;
  antimalarial: string; cough: string; antacid: string; antidiarrheal: string;
}

function getMedProfile(country: string): MedProfile {
  const c = country.toLowerCase();
  if (/nigeria/.test(c)) return { paracetamol: 'Panadol / Emzor / M&B (500mg)', ibuprofen: 'Felvin / Advil (400mg)', antibiotic: 'Amoxil 500mg / Augmentin 625mg', antimalarial: 'Coartem / Lonart DS', cough: 'Coflin syrup (dry) / Benylin Expectorant (wet) — 10ml 3x daily', antacid: 'Omeprazole 20mg / Maalox', antidiarrheal: 'Loperamide / ORS sachets' };
  if (/india/.test(c)) return { paracetamol: 'Crocin / Dolo 650 / Calpol (650mg)', ibuprofen: 'Combiflam / Zerodol / Brufen (400mg)', antibiotic: 'Azithral 500mg / Ciprobid', antimalarial: 'Lariago / Falcigo / Coartem', cough: 'Benadryl syrup / Ascoril LS — 10ml 3x daily', antacid: 'Pan-D / Gelusil / Eno', antidiarrheal: 'Eldoper / Electral ORS' };
  if (/^uk$|england|britain|scotland|wales/.test(c)) return { paracetamol: 'Paracetamol 500mg (Boots/Tesco own-brand) / Calpol', ibuprofen: 'Nurofen / Brufen (200-400mg)', antibiotic: 'Amoxicillin 500mg / Co-amoxiclav (prescription)', antimalarial: 'Malarone / Riamet (prescription)', cough: 'Benylin / Lemsip / Covonia', antacid: 'Gaviscon / Rennie / Omeprazole', antidiarrheal: 'Imodium / Dioralyte ORS' };
  if (/usa|united states|america/.test(c)) return { paracetamol: 'Tylenol (Acetaminophen 500mg)', ibuprofen: 'Advil / Motrin / Aleve (200-400mg)', antibiotic: 'Amoxicillin 500mg / Z-Pack (prescription)', antimalarial: 'Malarone / Coartem (prescription)', cough: 'Robitussin / DayQuil / Mucinex', antacid: 'Tums / Pepto-Bismol / Nexium', antidiarrheal: 'Imodium / Pedialyte ORS' };
  if (/ghana/.test(c)) return { paracetamol: 'Panadol / Hedex (500mg)', ibuprofen: 'Brufen / Ibuprofen (400mg)', antibiotic: 'Amoxicillin 500mg / Co-trimoxazole', antimalarial: 'Coartem / Artesunate+Amodiaquine', cough: 'Benylin / Actifed — 10ml 3x daily', antacid: 'Omeprazole / Gelusil', antidiarrheal: 'Loperamide / ORS sachets' };
  if (/kenya|east africa/.test(c)) return { paracetamol: 'Panadol / Hedex (500mg)', ibuprofen: 'Brufen / Ibuprofen (400mg)', antibiotic: 'Amoxicillin 500mg / Doxycycline', antimalarial: 'ALu (Coartem) / Fansidar', cough: 'Benylin / Actifed — 10ml 3x daily', antacid: 'Omeprazole / Maalox', antidiarrheal: 'Loperamide / ORS sachets' };
  if (/south africa/.test(c)) return { paracetamol: 'Panado / Disprin (500mg)', ibuprofen: 'Voltaren / Ibuprofen (400mg)', antibiotic: 'Amoxicillin / Co-amoxiclav (Augmentin)', antimalarial: 'Coartem / Riamet (prescription)', cough: 'Benylin / Actifed', antacid: 'Gaviscon / Rennies / Omeprazole', antidiarrheal: 'Imodium / Rehydrat ORS' };
  if (/australia/.test(c)) return { paracetamol: 'Panadol / Panamax (500mg)', ibuprofen: 'Nurofen / Advil (200-400mg)', antibiotic: 'Amoxycillin / Augmentin (prescription)', antimalarial: 'Malarone / Coartem (prescription)', cough: 'Benadryl / Robitussin / Codral', antacid: 'Gaviscon / Mylanta / Nexium', antidiarrheal: 'Gastro-Stop / Hydralyte ORS' };
  if (/canada/.test(c)) return { paracetamol: "Tylenol / Tempra (500mg)", ibuprofen: 'Advil / Motrin (200-400mg)', antibiotic: "Amoxicillin / Biaxin (prescription)", antimalarial: 'Malarone (prescription)', cough: "Robitussin / Buckley's", antacid: 'Tums / Gaviscon / Nexium', antidiarrheal: 'Imodium / Pedialyte ORS' };
  if (/uae|emirates/.test(c)) return { paracetamol: 'Panadol / Adol (500mg)', ibuprofen: 'Brufen / Advil (400mg)', antibiotic: 'Amoxicillin / Augmentin (prescription)', antimalarial: 'Coartem / Malarone (prescription)', cough: 'Benylin / Piriton', antacid: 'Omeprazole / Gaviscon', antidiarrheal: 'Loperamide / ORS sachets' };
  return { paracetamol: 'Paracetamol 500mg (ask pharmacist for local brand)', ibuprofen: 'Ibuprofen 400mg (ask pharmacist)', antibiotic: 'Amoxicillin 500mg (ask doctor)', antimalarial: 'Artemisinin-based therapy (ask doctor)', cough: 'Ask pharmacist for cough syrup with Dextromethorphan (dry) or Guaifenesin (wet)', antacid: 'Omeprazole 20mg (ask pharmacist)', antidiarrheal: 'Loperamide + ORS (ask pharmacist)' };
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
  if (/(vbèè\s+óye\s+hé|vbèè\s+oye\s+he|\bkoyo\b|\bkọyọ\b|\bdọmọ\b)/i.test(raw)) return 'edo';
  if (/(vbẹe\s+oye\s+hẹ|oyese|uru\s+ese|esan)/i.test(raw)) return 'esan';
  if (/((\bhello\b|\bhi\b|\bhey\b|\bwhat\b|\bhow\b|\bplease\b|\bthank\b))/i.test(normalized)) return 'en';
  return 'pcm';
}

// ── Smart intent classifier ────────────────────────────────────────────────
function classifyIntent(lower: string): string {
  if (/\b(hello|hi\b|hey\b|good\s*(morning|afternoon|evening|night)|how are you|how you dey|how far\b|wetin dey|what.?s up|sup\b|morning\b|evening\b)\b/i.test(lower)) return 'greeting';
  if (/\b(thank|thanks|appreciate|well done|e don do|na you|God bless|dalu|ese\b|o se\b|ose\b)\b/i.test(lower)) return 'thanks';
  if (/\b(today|date|time|day|wetin.*date|what.*date|current.*date|what.*time|wetin.*time|wetin.*today)\b/i.test(lower)) return 'datetime';
  if (/\b(news|latest|happen|dey happen|what.*happen|today.*nigeria|nigeria.*today|current|update|trending|breaking)\b/i.test(lower)) return 'news';
  if (/\b(weather|forecast|rain|temperature|sunny|cloudy|storm|hot|cold)\b/i.test(lower)) return 'weather';
  if (/\b(what is \d|\d\s*[\+\-\*\/]\s*\d|calculate|sum|multiply|divide|plus|minus)\b/i.test(lower)) return 'maths';
  if (/\b(headache|head.*pain|migraine|my head)\b/i.test(lower)) return 'headache';
  if (/\b(fever|temperature|malaria|shaking|dey shake|body hot|hot body)\b/i.test(lower)) return 'fever';
  if (/\b(cough|cold|catarrh|sore throat|runny nose|flu\b)\b/i.test(lower)) return 'cough';
  if (/\b(stomach|belle|belly|ulcer|indigestion|vomit|diarrhea|purging|dey purge|running stomach|nausea)\b/i.test(lower)) return 'stomach';
  if (/\b(body pain|body ache|joint pain|back pain|waist pain|muscle pain)\b/i.test(lower)) return 'bodyache';
  if (/\b(blood pressure|hypertension|chest pain|dizzy|dizziness)\b/i.test(lower)) return 'bp';
  if (/\b(diabetes|blood sugar|insulin|metformin)\b/i.test(lower)) return 'diabetes';
  if (/\b(infection|bacteria|antibiotic|typhoid|uti|wound)\b/i.test(lower)) return 'infection';
  if (/\b(photosynthesis|water cycle|heart\b|pulley|cell\b|atom\b|ecosystem|battery|kidney|brain)\b/i.test(lower)) return 'science';
  return 'unknown';
}

// ── Main fallback response function ───────────────────────────────────────
export function getLocalFallbackResponse(input: string, languageCode?: string): string {
  const normalized = (input || '').trim();
  const code = languageCode || detectFallbackLanguageCode(normalized);
  const country = detectUserCountry();
  const med = getMedProfile(country);
  const isPidgin = code === 'pcm';
  const lower = normalized.toLowerCase();
  const intent = classifyIntent(lower);

  if (!normalized) {
    const unavail = { en: 'The AI service is temporarily unavailable. Please try again.', pcm: 'AI service no dey available for now. Try again small small.', yo: 'Iṣẹ́ AI ko sí. Jọ̀ ṣe ìgbà díẹ̀.', ig: 'Ndị AI anaghị ahu. Biko nwaa.', ha: 'Aikin AI ba a samu. Ka sake gwadawa.', edo: 'Ẹghẹ AI ọ rre khin. Tẹ vbe kpa rre.', esan: 'Ẹghẹ AI ọ rre khin. Tẹ vbe kpa rre.' } as const;
    return unavail[code as keyof typeof unavail] || unavail.pcm;
  }

  if (intent === 'greeting') {
    const g = { en: "I'm doing great! What's on your mind?", pcm: 'I dey fine o! You nko?', yo: 'Àlàáfíà! Báwo ni ìwọ?', ig: "Ọ dị mma! Gịnị dị n'obi gị?", ha: 'Lafiya lau! Kai fa?', edo: "Ọy' ẹsé! Vbèè óye hé rẹn?", esan: 'Ọyese! Vbẹe oye hẹ rẹn?' } as const;
    return g[code as keyof typeof g] || g.en;
  }

  if (intent === 'thanks') {
    const responses = isPidgin
      ? ['No wahala! I dey always here for you.', 'Carry go! Wetin else I fit help you with?', 'E don do! Ask me anything anytime.', 'Na my work! I happy say I fit help.']
      : ['Anytime! Feel free to ask me anything.', "You're welcome! What else can I help with?", 'Happy to help! Ask me anything anytime.'];
    return responses[Math.floor(Date.now() / 1000) % responses.length];
  }

  if (intent === 'datetime') {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
      return isPidgin
        ? `Today na **${dateStr}**. Time na **${timeStr}** for your location.`
        : `Today is **${dateStr}**. The current time is **${timeStr}** in your location.`;
    } catch {
      return isPidgin ? 'Check the date for your phone — I no fit access live data right now.' : 'Check your device for the current date — live data is temporarily unavailable.';
    }
  }

  if (intent === 'news') {
    return isPidgin
      ? 'My internet connection no dey work right now so I no fit fetch live news. Try again small or check Twitter/X, BBC Pidgin, or Channels TV for latest.'
      : `I can't fetch live news right now. Check BBC News, Reuters, or local news sites for the latest from ${country}.`;
  }

  if (intent === 'weather') {
    const w = { en: 'Which location do you want the weather for?', pcm: 'Which place you wan check weather?', yo: 'Ìpínlẹ̀ wo ni o fẹ́?', ig: 'Ebe ole ị chọọ?', ha: 'Wane wuri?', edo: 'Location ole?', esan: 'Location ole?' } as const;
    return w[code as keyof typeof w] || w.en;
  }

  if (intent === 'maths') {
    try {
      const expr = lower.replace(/[^0-9+\-*/.()\s]/g, '').trim();
      if (expr && /^[\d+\-*/().\s]+$/.test(expr)) {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr})`)();
        if (typeof result === 'number' && isFinite(result)) return `${expr} = **${result}**`;
      }
    } catch { /* fall through */ }
    return isPidgin ? 'Write the calculation clearly e.g. "wetin be 25 × 4"' : 'Please write the calculation clearly, e.g. "what is 25 × 4?"';
  }

  if (intent === 'headache') return isPidgin
    ? `For headache: take **${med.paracetamol}** — 2 tablets with water. If e strong pass, try **${med.ibuprofen}** — 1 tablet after food. Rest for quiet dark place, drink water. No stop after 3 days, go doctor.`
    : `**Headache:** Take **${med.paracetamol}** (2 tablets) or **${med.ibuprofen}** (1 tablet with food). Rest in a quiet dark room, drink water. Persists over 3 days → see a doctor. *(${country} brands)*`;

  if (intent === 'fever') return isPidgin
    ? `For fever: take **${med.paracetamol}** — 2 tablets every 6 hours. If na malaria, use **${med.antimalarial}** follow the pack. Drink plenty water. No stop after 3 days, go hospital.`
    : `**Fever:** Take **${med.paracetamol}** (2 tablets every 6h). Malaria suspected → **${med.antimalarial}**. Drink plenty water. Lasts 3+ days → hospital. *(${country} brands)*`;

  if (intent === 'cough') return isPidgin
    ? `For cough: **${med.cough}**. Drink warm water. Sore throat — gargle with warm salt water. No better after 1 week, see doctor.`
    : `**Cough/Cold:** ${med.cough}. Warm water with honey, gargle salt water for sore throat. No improvement after 1 week → see a doctor. *(${country} brands)*`;

  if (intent === 'stomach') return isPidgin
    ? `Stomach pain/ulcer: take **${med.antacid}** before food. Running stomach: **${med.antidiarrheal}** + drink ORS to replace fluid.`
    : `**Stomach/Ulcer:** **${med.antacid}** (daily before food). Diarrhoea → **${med.antidiarrheal}** + ORS. *(${country} brands)*`;

  if (intent === 'bodyache') return isPidgin
    ? `For body pain: take **${med.ibuprofen}** — 1 tablet 3 times daily after food. Or Diclofenac 50mg 2 times daily after food. Put warm cloth on the pain area.`
    : `**Body/Joint Pain:** **${med.ibuprofen}** (1 tablet 3x daily with food) or Diclofenac 50mg twice daily with food. Apply a warm compress. *(${country} brands)*`;

  if (intent === 'bp') return isPidgin
    ? `⚠️ Chest pain — go hospital fast. High BP: continue your prescribed medicine (Amlodipine or Lisinopril). Reduce salt, rest well.`
    : `⚠️ **Chest pain → go to hospital immediately.** For known high BP: continue prescribed medicine (Amlodipine/Lisinopril). Reduce salt, rest, follow up with doctor.`;

  if (intent === 'diabetes') return isPidgin
    ? `Diabetes (Type 2): take **Metformin 500mg** 2 times daily with food. Avoid sugar, white rice, bread. Exercise small. Check blood sugar regular.`
    : `**Diabetes (Type 2):** Metformin 500mg twice daily with meals. Avoid sugar and refined carbs. Exercise daily. Monitor blood sugar regularly.`;

  if (intent === 'infection') return isPidgin
    ? `For infection: mild — **${med.antibiotic}** 3 times daily for 5-7 days. Strong — Augmentin 2 times daily. Typhoid — Ciprofloxacin 500mg 2 times daily for 7-10 days. Finish the full course.`
    : `**Bacterial infection:** Mild → **${med.antibiotic}** 3x daily for 5-7 days. Severe → Augmentin twice daily. Typhoid → Ciprofloxacin 500mg twice daily for 7-10 days. Complete the full course. *(${country} brands)*`;

  if (intent === 'science') {
    if (/photosynthesis/i.test(lower)) return isPidgin ? normalizePidginGrammar('Photosynthesis na the process wey plants use sunlight, water, and CO2 to make food and release oxygen.') : 'Photosynthesis: plants convert sunlight + water + CO₂ → glucose + oxygen.';
    if (/water cycle/i.test(lower)) return 'Water cycle: Evaporation → Condensation → Precipitation → Collection.';
    if (/heart/i.test(lower)) return isPidgin ? 'Heart na muscle wey pump blood around body.' : 'The heart pumps oxygen-rich blood to the body and returns oxygen-poor blood to the lungs.';
  }

  // Unknown — honest about connection issue
  return isPidgin
    ? 'E be like say my connection no dey work well right now. Try again small or rephrase your question.'
    : "My connection is temporarily down. Please try again in a moment.";
}
