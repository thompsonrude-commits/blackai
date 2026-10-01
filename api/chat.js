// BLACK AI - Vercel chat endpoint
// Real-time web search via Tavily (keyless - no API key needed)
// Groq LLM for response generation

// ── Location-aware guidance builder ─────────────────────────────────────────
function buildLocationGuidance(country, city) {
  const c = (country || 'Nigeria').toLowerCase();

  // Medicine brands by country
  const medicine = (() => {
    if (/nigeria|lagos|abuja|kano|ibadan/.test(c)) return 'Paracetamol→Panadol/Emzor/M&B | Ibuprofen→Felvin/Advil | Antibiotic→Amoxil/Augmentin | Malaria→Coartem/Lonart | Cough→Coflin/Benylin | Antacid→Omeprazole/Maalox | Ulcer→Flagyl+Omeprazole';
    if (/india|mumbai|delhi|bangalore|chennai|kolkata|hyderabad/.test(c)) return 'Paracetamol→Crocin/Dolo 650/Calpol | Ibuprofen→Combiflam/Zerodol/Brufen | Antibiotic→Azithral/Ciprobid/Amoxycillin | Malaria→Lariago/Falcigo | Cough→Benadryl/Ascoril | Antacid→Pan-D/Gelusil/Eno';
    if (/uk|england|scotland|wales|britain|london|manchester/.test(c)) return 'Paracetamol→Paracetamol(own-brand)/Calpol | Ibuprofen→Nurofen/Brufen | Antibiotic→Amoxicillin/Augmentin | Cough→Benylin/Lemsip | Antacid→Gaviscon/Rennie | Cold→Lemsip/Beechams';
    if (/usa|united states|america|new york|california|texas|florida/.test(c)) return 'Paracetamol→Tylenol/Panadol | Ibuprofen→Advil/Motrin/Aleve | Antibiotic→Amoxicillin/Z-Pack | Cough→Robitussin/DayQuil | Cold→NyQuil/DayQuil | Antacid→Tums/Pepto-Bismol/Nexium';
    if (/ghana|accra|kumasi/.test(c)) return 'Paracetamol→Panadol/Hedex | Ibuprofen→Brufen | Antibiotic→Amoxicillin/Co-trimoxazole | Malaria→Coartem/Artesunate | Cough→Benylin/Actifed';
    if (/kenya|nairobi|mombasa|east africa/.test(c)) return 'Paracetamol→Panadol/Hedex | Ibuprofen→Brufen | Antibiotic→Amoxicillin/Doxycycline | Malaria→ALu(Coartem)/SP | Cough→Benylin';
    if (/south africa|johannesburg|cape town|durban/.test(c)) return 'Paracetamol→Panado/Disprin | Ibuprofen→Voltaren/Ibuprofen | Antibiotic→Amoxicillin/Augmentin | Cough→Benylin/Actifed | Antacid→Gaviscon/Rennies';
    if (/australia|sydney|melbourne|brisbane/.test(c)) return 'Paracetamol→Panadol/Panamax | Ibuprofen→Nurofen/Advil | Antibiotic→Amoxycillin/Augmentin | Cough→Benadryl/Robitussin | Cold→Codral';
    if (/canada|toronto|vancouver|montreal/.test(c)) return 'Paracetamol→Tylenol/Tempra | Ibuprofen→Advil/Motrin | Antibiotic→Amoxicillin/Biaxin | Cough→Robitussin/Buckley\'s | Cold→NyQuil';
    if (/uae|dubai|abu dhabi/.test(c)) return 'Paracetamol→Panadol/Adol | Ibuprofen→Brufen/Advil | Antibiotic→Amoxicillin/Augmentin | Cough→Benylin/Piriton';
    return `Generic names: Paracetamol, Ibuprofen, Amoxicillin — advise user to ask local pharmacist for brand name available in ${country}`;
  })();

  // Currency
  const currency = (() => {
    if (/nigeria/.test(c)) return '₦ Nigerian Naira. Banks: GTBank, Access, Zenith, First Bank, Kuda, OPay.';
    if (/india/.test(c)) return '₹ Indian Rupee. UPI apps: PhonePe, Google Pay, Paytm. Banks: SBI, HDFC, ICICI.';
    if (/uk|england|britain/.test(c)) return '£ British Pound. Banks: Barclays, HSBC, Lloyds, Monzo, Revolut.';
    if (/usa|united states|america/.test(c)) return '$ US Dollar. Banks: Chase, Bank of America, Wells Fargo. Apps: Zelle, Venmo, Cash App.';
    if (/ghana/.test(c)) return 'GH₵ Ghanaian Cedi. Mobile: MTN MoMo, Vodafone Cash. Banks: GCB, Ecobank.';
    if (/kenya/.test(c)) return 'KES Kenyan Shilling. Mobile: M-Pesa (Safaricom). Banks: KCB, Equity Bank.';
    if (/south africa/.test(c)) return 'R South African Rand. Banks: FNB, Standard Bank, Absa, Capitec.';
    if (/australia/.test(c)) return 'AUD Australian Dollar. Banks: Commonwealth, ANZ, NAB, Westpac.';
    if (/canada/.test(c)) return 'CAD Canadian Dollar. Banks: RBC, TD Bank, Scotiabank, Interac e-Transfer.';
    if (/uae|emirates/.test(c)) return 'AED UAE Dirham. Banks: Emirates NBD, ADCB, Abu Dhabi Islamic Bank.';
    if (/europe|germany|france|spain|italy|netherlands/.test(c)) return '€ Euro. Banks vary by country.';
    return `Local currency of ${country}. Advise user to confirm local banking options.`;
  })();

  // Emergency numbers
  const emergency = (() => {
    if (/nigeria/.test(c)) return '112 (general), 767/199 (police), 115 (FRSC road), 08032003454 (NEMA)';
    if (/india/.test(c)) return '112 (general), 100 (police), 108 (ambulance), 101 (fire), 1098 (child helpline)';
    if (/uk|england|britain/.test(c)) return '999 (emergency), 111 (non-urgent NHS medical)';
    if (/usa|united states|america/.test(c)) return '911 (all emergencies)';
    if (/ghana/.test(c)) return '191 (police), 192 (ambulance), 193 (fire)';
    if (/kenya/.test(c)) return '999 or 112 (general), 0800 720 999 (police)';
    if (/south africa/.test(c)) return '10111 (police), 10177 (ambulance), 107 (fire)';
    if (/australia/.test(c)) return '000 (all emergencies)';
    if (/canada/.test(c)) return '911 (all emergencies)';
    if (/uae|emirates/.test(c)) return '999 (police), 998 (ambulance), 997 (fire)';
    return `Use local emergency number for ${country}`;
  })();

  return `
LOCATION CONTEXT — USER IS IN: ${city ? city + ', ' : ''}${country}
Use ONLY locally available brands and services for this location.
Medicine brands: ${medicine}
Currency: ${currency}
Emergency numbers: ${emergency}
For any location-sensitive topic (medicine, law, finance, food, weather), adapt specifically to ${country}. Do NOT give Nigerian brands to non-Nigerian users. Do NOT give US brands to Nigerian users. Match brands to location.`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Read raw body
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    let body;
    try { body = JSON.parse(raw); }
    catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }

    const { messages, temperature = 0.7, maxTokens = 2048 } = body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;
    if (!GROQ_KEY) {
      return res.status(500).json({
        error: 'API key not configured',
        text: 'Backend configuration error.',
        provider: 'none',
        model: 'error'
      });
    }

    const userQuery = messages[messages.length - 1]?.content || '';

    // ── Real-time web search via Tavily ──────────────────────────────────────
    async function tavilySearch(query) {
      try {
        const TAVILY_KEY = process.env.TAVILY_API_KEY || process.env.TAVILY_KEY;
        const headers = {
          'Content-Type': 'application/json',
          ...(TAVILY_KEY
            ? { 'Authorization': `Bearer ${TAVILY_KEY}` }
            : { 'X-Tavily-Access-Mode': 'keyless' })
        };

        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query,
            search_depth: 'basic',
            include_answer: true,
            include_raw_content: false,
            max_results: 6,
            include_domains: [],
            exclude_domains: []
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (!r.ok) {
          const err = await r.text();
          console.warn('[Search] Tavily error:', r.status, err.substring(0, 100));
          return null;
        }

        const d = await r.json();
        const parts = [];

        if (d.answer) {
          parts.push(`**Direct Answer:** ${d.answer}`);
        }

        if (d.results?.length) {
          d.results.slice(0, 5).forEach(item => {
            if (item.content) {
              parts.push(`**${item.title}**\n${item.content.substring(0, 400)}\nSource: ${item.url}`);
            }
          });
        }

        return parts.length ? parts.join('\n\n') : null;
      } catch (e) {
        console.warn('[Search] Tavily failed:', e.message);
        return null;
      }
    }

    // ── Run search ───────────────────────────────────────────────────────────
    console.log('[Chat] Searching:', userQuery.substring(0, 80));
    const searchResults = await tavilySearch(userQuery);

    if (searchResults) {
      console.log('[Chat] Got search results, chars:', searchResults.length);
    } else {
      console.warn('[Chat] No search results, using training data only');
    }

    // ── Extract user country from system message ─────────────────────────────
    // The frontend injects "Location: City, Country" into the system prompt
    let userCountry = 'Nigeria'; // default
    let userCity = '';
    const systemMsg = messages.find(m => m.role === 'system');
    if (systemMsg && systemMsg.content) {
      const locationMatch = systemMsg.content.match(/\*\*Location\*\*:\s*([^,\n]+),?\s*([^\n|*]+)?/i)
        || systemMsg.content.match(/Location[:\s]+([^,\n]+),?\s*([^\n|*]+)?/i);
      if (locationMatch) {
        userCity = (locationMatch[1] || '').trim();
        userCountry = (locationMatch[2] || locationMatch[1] || 'Nigeria').trim().replace(/\*+/g, '').trim();
      }
    }

    // Build location-aware medicine/law/currency context
    const locationGuidance = buildLocationGuidance(userCountry, userCity);

    // ── Build enriched messages ──────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const systemContent = searchResults
      ? `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.

You are a SPECIALIST in every field: medicine, law, engineering, finance, science, agriculture, psychology, technology, cooking, fitness, history, and all other disciplines. You give deep, specific, expert-level answers — not generic, cautious, or watered-down responses.

CONVERSATION RULES — HIGHEST PRIORITY:
- Casual messages get casual replies. A greeting gets a greeting back. SHORT.
- NEVER explain, define, or describe what a casual phrase means — just respond naturally.
- Read the room: casual = short friendly reply. Knowledge question = deep specialist answer.

LANGUAGE LOCK — ABSOLUTE RULE:
- Detect the language the user writes in. Reply ONLY in that exact same language.
- User writes Pidgin → reply 100% in Pidgin. Zero English words.
- User writes English → reply 100% in English. Zero Pidgin words.
- NEVER mix languages. NEVER switch unless the user switches first.

${locationGuidance}

SPECIALIST RULES (for knowledge questions only):
- MEDICINE: Give brands available in ${userCountry}, exact doses, mechanisms — like a consultant doctor
- LAW: Cite laws of ${userCountry} — like a senior barrister
- FINANCE: Use ${userCountry} currency and local institutions — like a CFO
- ENGINEERING: Show formulas, calculations, specifications — like a chief engineer
- SCIENCE: Show derivations, formulas, data — like a research professor
- ALL FIELDS: Go deep and specific. NEVER just say "consult a professional" without first giving the actual expert answer

LIVE WEB SEARCH RESULTS:
===
${searchResults}
===

Use search results as primary source of truth. Be specific, accurate, and genuinely helpful.`
      : `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.

You are a SPECIALIST in every field: medicine, law, engineering, finance, science, agriculture, psychology, technology, cooking, fitness, history, and all other disciplines.

CONVERSATION RULES — HIGHEST PRIORITY:
- Casual messages get casual replies. A greeting gets a greeting back. SHORT.
- NEVER explain, define, or describe what a casual phrase means — just respond naturally.
- Read the room: casual = short friendly reply. Knowledge question = deep specialist answer.

LANGUAGE LOCK — ABSOLUTE RULE:
- Detect the language the user writes in. Reply ONLY in that exact same language.
- User writes Pidgin → reply 100% in Pidgin. Zero English words.
- User writes English → reply 100% in English. Zero Pidgin words.
- NEVER mix languages. NEVER switch unless the user switches first.

${locationGuidance}

SPECIALIST RULES (for knowledge questions only):
- MEDICINE: Give brands available in ${userCountry}, exact doses, mechanisms — like a consultant doctor
- LAW: Cite laws of ${userCountry} — like a senior barrister
- FINANCE: Use ${userCountry} currency and local institutions — like a CFO
- ENGINEERING: Show formulas, calculations, specifications — like a chief engineer
- SCIENCE: Show derivations, formulas, data — like a research professor
- ALL FIELDS: Go deep and specific. NEVER just say "consult a professional" without first giving the actual expert answer

Web search unavailable. Answer from training data with full specialist depth.`;

    let finalMessages = [...messages];

    // Trim history to last 10 messages (+ system) to avoid context overflow
    const systemMessages = finalMessages.filter(m => m.role === 'system');
    const nonSystemMessages = finalMessages.filter(m => m.role !== 'system');
    const trimmedNonSystem = nonSystemMessages.slice(-10); // keep last 10 exchanges
    finalMessages = [...systemMessages, ...trimmedNonSystem];

    const sysIdx = finalMessages.findIndex(m => m.role === 'system');
    if (sysIdx >= 0) {
      finalMessages[sysIdx] = { role: 'system', content: systemContent };
    } else {
      finalMessages = [{ role: 'system', content: systemContent }, ...finalMessages];
    }

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const callGroq = async (model) => {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`
          },
          body: JSON.stringify({
            model,
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
            stream: false
          }),
          signal: AbortSignal.timeout(50000),
        });
        if (!r.ok) {
          const errText = await r.text().catch(() => '');
          console.error(`[Chat] ${model} error ${r.status}:`, errText.slice(0, 200));
          return null;
        }
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      } catch (err) {
        console.warn(`[Chat] ${model} threw:`, err.message);
        return null;
      }
    };

    let text = await callGroq('openai/gpt-oss-120b');
    if (!text || text.trim() === '') {
      console.warn('[Chat] Primary model empty, trying openai/gpt-oss-20b...');
      text = await callGroq('openai/gpt-oss-20b');
    }
    if (!text || text.trim() === '') {
      console.warn('[Chat] Second model empty, trying gemma2-9b-it...');
      text = await callGroq('gemma2-9b-it');
    }
    if (!text || text.trim() === '') {
      text = "I'm sorry, I couldn't generate a response. Please try again.";
    }

    // Strip internal reasoning sections
    text = text
      .replace(/^#+\s*Reasoning\s+Summary\b[\s\S]*?\n{2,}/im, '')
      .replace(/^\*{0,2}Reasoning\s+Summary\*{0,2}\s*\n[\s\S]*?\n{2,}/im, '')
      .trim();

    return res.status(200).json({
      text,
      content: text,
      choices: [{ message: { content: text } }],
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      searchUsed: !!searchResults,
      latencyMs: Date.now() - startTime,
      cached: false
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Internal error',
      text: 'Please try again.',
      provider: 'none',
      model: 'error',
      details: error.message
    });
  }
};

module.exports.config = { api: { bodyParser: false } };
