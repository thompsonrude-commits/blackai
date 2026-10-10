// BLACK AI - Vercel chat endpoint
// Groq LLM + optional Tavily web search

// ── Nigerian public holidays ──────────────────────────────────────────────
function getHolidayNote(today) {
  const [y, m, d] = today.split('-').map(Number);
  const key = `${m}-${d}`;
  const yr = y || new Date().getFullYear();
  const h = {
    '1-1': `New Year's Day 🎆 — Happy New Year ${yr}!`,
    '5-1': `Workers' Day 👷 — Public holiday in Nigeria.`,
    '5-27': `Children's Day 👶 — Public holiday in Nigeria.`,
    '6-12': `Democracy Day 🇳🇬 — Honours June 12, 1993 election / MKO Abiola.`,
    '10-1': `🇳🇬 NIGERIA INDEPENDENCE DAY — October 1, 1960. Nigeria is ${yr - 1960} years old today! Parades, flag ceremonies, presidential address happening nationwide. ALWAYS greet users with this.`,
    '12-25': `Christmas Day 🎄 — Major public holiday. Church, family, celebrations.`,
    '12-26': `Boxing Day — Public holiday in Nigeria.`,
  };
  return h[key] ? `\n🗓️ TODAY: ${h[key]}` : '';
}

// ── Context blocks (only injected when relevant) ──────────────────────────
const CTX_NIGERIA = `Nigeria: President Tinubu (since May 2023), VP Shettima. Capital Abuja, commercial capital Lagos. Population ~230m. Currency ₦ Naira. Banks: GTBank, Access, Zenith, First Bank, UBA. Independence Oct 1 1960. Anthem "Arise O Compatriots".`;

const CTX_WORLD = `World 2025-2026: US President Donald Trump (Jan 2025). UK PM Keir Starmer. UN SG António Guterres. World pop ~8.2bn. Russia-Ukraine war ongoing since Feb 2022. Major AIs: ChatGPT, Gemini, Claude, Grok, BLACK AI.`;

const CTX_TRANSPORT = `Lagos geography — MAINLAND (not island): Mile 2=Amuwo-Odofin motor park (NOT Victoria Island), Oshodi=transport hub, Ojota=bus park, Ikeja=state capital, Apapa=port area, Ikorodu=BRT terminus, Surulere, Agege, Mushin, Festac. ISLAND (via bridge): Lagos Island=CMS/Marina/Idumota, Victoria Island (VI)=upscale, Ikoyi, Lekki, Ajah. BRIDGES: Carter(Apapa→Lagos Island), Eko(Apapa→Lagos Island), 3rd Mainland(Oworo→Lagos Island-longest), Falomo(Lagos Island→Ikoyi/VI). TO GET TO VI: Take danfo/BRT to CMS, then keke/danfo→Falomo→VI. Never say Mile 2 is VI. Correct Oshodi→VI: Danfo to CMS via 3rd Mainland Bridge, then keke to VI. ~45min–1.5hr. ₦200-400.
Abuja: Planned city. Wuse 1&2, Garki 1&2, Maitama, Asokoro. Uber/Bolt, keke, mini-buses.
Port Harcourt: GRA, Trans Amadi, Mile 1 market (≠Lagos Mile 2). Keke, okada, Uber.
Kano: Sabon Gari, Nassarawa, Bompai. Yellow minibuses, keke.
Ibadan: UI, Bodija, Dugbe, Ring Road. Keke, Uber.
World transport: UK=Tube(Oyster/contactless)+National Rail. NYC=MTA subway (lines A/C/E,1/2/3,4/5/6,L,N/Q/R/W)+MetroCard. India=Delhi Metro+Mumbai local trains+auto-rickshaw. South Africa=Gautrain+minibus taxis+Uber. Ghana=Trotros+Uber. Kenya=Matatus+Uber. Europe=U-Bahn/S-Bahn+Métro+trams. Australia=Opal/Myki cards. Dubai=Metro Red+Green+Careem. China=city metros+HSR+Didi. ALWAYS ask transport mode and starting point before giving directions. NEVER invent route names — say "check Google Maps" if unsure.`;

const CTX_MEDICINE = `When asked about health/medicine: give specific brand names + generic name, exact dose, frequency, duration. Nigerian brands: Panadol/Emzor(paracetamol), Felvin/Advil(ibuprofen), Amoxil/Augmentin(antibiotic), Coartem/Lonart(malaria), Coflin/Benylin(cough), Omeprazole/Maalox(stomach), Loperamide/ORS(diarrhoea). Give first-line, second-line options. Mention when to see a doctor. NEVER just say "see a doctor" without first giving the actual medical information.`;

const CTX_LAWS = `Nigerian law: 1999 Constitution, Criminal Code, Penal Code, CAMA 2020, Land Use Act, Labour Act, Evidence Act. EFCC/ICPC anti-corruption. Always cite specific sections. Compare with international law where relevant.`;

// ── Detect which knowledge blocks are needed ──────────────────────────────
function getContextBlocks(query) {
  const q = (query || '').toLowerCase();
  const blocks = [CTX_NIGERIA]; // always include basic Nigeria context

  if (/\b(world|global|international|usa|uk|china|india|europe|africa|america|president|prime minister|UN|war|ukraine|russia|election)\b/i.test(q)) {
    blocks.push(CTX_WORLD);
  }
  if (/\b(direction|go to|how.*reach|how.*get to|way to|transport|danfo|BRT|keke|okada|okada|bus|train|uber|bolt|victoria island|mile 2|oshodi|ikeja|lekki|abuja|port harcourt|kano|ibadan|london|tube|subway|metro|matatu|trotro|bus stop|motor park|from.*to|route|road|traffic|drive|walk|journey)\b/i.test(q)) {
    blocks.push(CTX_TRANSPORT);
  }
  if (/\b(medicine|drug|tablet|dose|sick|pain|fever|malaria|cough|headache|stomach|hospital|doctor|pharmacy|treatment|symptom|infection|blood pressure|diabetes|panadol|paracetamol|ibuprofen)\b/i.test(q)) {
    blocks.push(CTX_MEDICINE);
  }
  if (/\b(law|legal|court|section|act|constitution|rights|EFCC|police|arrest|sue|contract|criminal|civil)\b/i.test(q)) {
    blocks.push(CTX_LAWS);
  }

  return blocks.join('\n');
}

// ── Tavily web search ─────────────────────────────────────────────────────
async function tavilySearch(query) {
  try {
    const TAVILY_KEY = process.env.TAVILY_API_KEY || process.env.TAVILY_KEY;
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TAVILY_KEY ? { 'Authorization': `Bearer ${TAVILY_KEY}` } : { 'X-Tavily-Access-Mode': 'keyless' })
      },
      body: JSON.stringify({ query, search_depth: 'basic', include_answer: true, include_raw_content: false, max_results: 5 }),
      signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    const parts = [];
    if (d.answer) parts.push(`Answer: ${d.answer}`);
    if (d.results?.length) {
      d.results.slice(0, 4).forEach(item => {
        if (item.content) parts.push(`${item.title}: ${item.content.substring(0, 300)} (${item.url})`);
      });
    }
    return parts.length ? parts.join('\n\n') : null;
  } catch (e) {
    console.warn('[Search] Tavily failed:', e.message);
    return null;
  }
}

// ── Smart search gate ─────────────────────────────────────────────────────
function needsWebSearch(q) {
  q = (q || '').trim().toLowerCase();
  if (q.length < 12) return false;
  if (/^(hi|hello|hey|how are you|how you dey|how far|wetin dey|good morning|good night|thanks|thank you|e don do|okay|ok|lol|haha|i dey|i wan chop|i dey hungry|morning|evening)[\.!?\s]*$/i.test(q)) return false;
  if (/^(i feel|i am (sad|happy|tired)|i dey (feel|try|stress|bored)|wahala)\b/i.test(q)) return false;
  if (/\b(what is|what are|who is|who are|when did|when is|where is|how does|why does|explain|define|latest|news|update|price of|rate of|how much is|dollar rate|naira.*dollar|exchange rate|weather|forecast|happening today|wetin dey happen|current)\b/i.test(q)) return true;
  if (/\b(medicine|drug|treatment|symptom|law|section|act|formula|calculation|algorithm|stock|forex|bitcoin|crypto|btc|eth)\b/i.test(q)) return true;
  return false;
}

// ── Main handler ──────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const startTime = Date.now();

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
      return res.status(500).json({ error: 'API key not configured', text: 'Backend configuration error.', provider: 'none', model: 'error' });
    }

    const userQuery = messages[messages.length - 1]?.content || '';
    const today = new Date().toISOString().split('T')[0];
    const holidayNote = getHolidayNote(today);
    const contextBlocks = getContextBlocks(userQuery);

    // Run web search only when genuinely needed
    let searchResults = null;
    if (needsWebSearch(userQuery)) {
      console.log('[Chat] Searching:', userQuery.substring(0, 60));
      searchResults = await tavilySearch(userQuery);
    }

    // Trim message history — keep last 8 pairs only
    const convMessages = messages.filter(m => m.role !== 'system').slice(-16);

    // ── Build compact system prompt ──────────────────────────────────────────
    const baseIdentity = `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.${holidayNote}

${contextBlocks}

CONVERSATION RULE #1: Casual message = casual reply. Greeting = greeting back. NEVER explain or define what a phrase means. "How you dey?" → "I dey fine o! You nko?" NEVER a definition.

LANGUAGE LOCK: Detect the user's language and reply ONLY in that language. Pidgin → 100% Pidgin. English → 100% English. Yoruba → 100% Yoruba. NEVER mix languages.

SPECIALIST: Give deep, specific, expert answers. Never say "consult a professional" without first giving the actual answer.

ALWAYS WORKS:
- Calculator: compute any arithmetic immediately and show the answer
- Translation: translate any phrase when asked, no refusal
- Jokes: tell a Naija/local joke when asked
- Currency: 1 USD ≈ ₦1,600 | 1 GBP ≈ ₦2,000 | 1 EUR ≈ ₦1,750 (mid-2026 approx, check live for exact)`;

    const systemContent = searchResults
      ? `${baseIdentity}\n\nLIVE SEARCH RESULTS:\n${searchResults}\n\nUse search results as primary source. Be specific and accurate.`
      : `${baseIdentity}\n\nAnswer from training data. Be thorough and specific.`;

    const finalMessages = [{ role: 'system', content: systemContent }, ...convMessages];

    // ── Call Groq with fallback chain ────────────────────────────────────────
    const callGroq = async (model) => {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({ model, messages: finalMessages, temperature, max_tokens: maxTokens, stream: false }),
          signal: AbortSignal.timeout(45000),
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
    if (!text?.trim()) text = await callGroq('openai/gpt-oss-20b');
    if (!text?.trim()) text = await callGroq('gemma2-9b-it');
    if (!text?.trim()) text = "I'm having trouble connecting right now. Please try again.";

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
    return res.status(500).json({ error: 'Internal error', text: 'Please try again.', provider: 'none', model: 'error', details: error.message });
  }
};

module.exports.config = { api: { bodyParser: false } };
