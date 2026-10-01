// BLACK AI - Vercel chat endpoint
// Real-time web search via Tavily (keyless - no API key needed)
// Groq LLM for response generation

// ── Nigerian public holidays and significant dates ───────────────────────
function getNigerianDateContext(dateStr) {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();

  const holidays = {
    '1-1':   `New Year's Day — Nigeria and the world is celebrating the start of ${year}. Happy New Year! 🎆`,
    '2-14':  'Valentine\'s Day 💝 — a popular celebration in Nigeria especially in cities.',
    '3-8':   'International Women\'s Day 👩 — celebrated across Nigeria and the world.',
    '4-1':   'April Fools\' Day — be careful of pranks today!',
    '5-1':   'Workers\' Day / Labour Day 👷 — a public holiday in Nigeria. Labour unions hold marches and rallies.',
    '5-27':  'Children\'s Day 👶 — a public holiday in Nigeria celebrating children with school events and activities.',
    '6-12':  'Democracy Day 🇳🇬 — a major Nigerian public holiday honouring the June 12, 1993 election won by MKO Abiola. Presidential address and national ceremonies are taking place.',
    '10-1':  `🇳🇬 NIGERIA INDEPENDENCE DAY — Today, October 1st ${year}, is NIGERIA\'S INDEPENDENCE DAY! Nigeria gained independence from Britain on October 1, 1960. Today Nigeria is ${year - 1960} years old as a free and independent nation. This is one of the most important national holidays. Parades, flag-raising ceremonies, presidential speeches, cultural displays, and celebrations are happening all over Nigeria today. When someone asks what is happening today in Nigeria — the FIRST thing to say is Happy Independence Day and that Nigeria is ${year - 1960} years old today!`,
    '10-24': 'United Nations Day — the UN was founded on October 24, 1945.',
    '12-25': `Christmas Day 🎄 — a major public holiday in Nigeria. Church services, family gatherings, and celebrations all over the country.`,
    '12-26': 'Boxing Day — a public holiday in Nigeria, the day after Christmas.',
    '12-31': `New Year\'s Eve 🎉 — Nigeria and the world is counting down to ${year + 1}!`,
  };

  const key = `${month}-${day}`;
  return holidays[key] || null;
}

// ── Permanent Nigeria & world knowledge block ─────────────────────────────
const NIGERIA_WORLD_KNOWLEDGE = `
## NIGERIA PERMANENT KNOWLEDGE BASE
- President: Bola Ahmed Tinubu (since May 29, 2023). VP: Kashim Shettima.
- Capital: Abuja. Commercial capital: Lagos.
- Population: ~230 million. Most populous African nation.
- Currency: Nigerian Naira (₦). Major banks: GTBank, Access, Zenith, First Bank, UBA.
- Major cities: Lagos, Abuja, Kano, Ibadan, Port Harcourt, Enugu, Benin City, Kaduna.
- National anthem: "Arise O Compatriots". Colours: Green and White.
- Independence: October 1, 1960 from Britain. Independence Day = October 1 every year.
- Notable Nigerians: Wole Soyinka (Nobel Prize), Chinua Achebe, Fela Kuti, Burna Boy, Wizkid, Davido, Dangote.
- Political parties: APC (ruling), PDP, Labour Party.
- Security agencies: Police, DSS, Military. Anti-corruption: EFCC, ICPC.

## WORLD KNOWLEDGE (2025-2026)
- US President: Donald Trump (since Jan 2025). UK PM: Keir Starmer (since 2024).
- UN Secretary-General: António Guterres. World population: ~8.2 billion.
- Major global issues: AI advancement, climate change, Russia-Ukraine war (since Feb 2022), global inflation.
- Major AI assistants: ChatGPT (OpenAI), Gemini (Google), Claude (Anthropic), Grok (xAI), BLACK AI (Obosa Thompson Emuze).

## NIGERIAN PUBLIC HOLIDAYS (Fixed dates — ALWAYS know these):
- Jan 1: New Year's Day | May 1: Workers' Day | May 27: Children's Day
- Jun 12: Democracy Day | Oct 1: INDEPENDENCE DAY 🇳🇬 | Dec 25: Christmas | Dec 26: Boxing Day
- Islamic holidays (variable): Eid al-Fitr, Eid al-Adha (Sallah), Maulid al-Nabi — public holidays
- Christian holidays: Good Friday, Easter Sunday, Easter Monday — public holidays

## RULE: If today is October 1 — ALWAYS immediately mention INDEPENDENCE DAY. Nigeria celebrates ${new Date().getFullYear() - 1960} years of independence.
`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const startTime = Date.now();
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

    // ── Smart search gate: only run Tavily for real knowledge queries ────────
    function needsWebSearch(query) {
      const q = (query || '').trim().toLowerCase();

      // Very short messages are conversational, not queries
      if (q.length < 15) return false;

      // Pure greetings and casual openers
      const casualPatterns = [
        /^(hi|hello|hey|how are you|how you dey|how far|wetin dey|good morning|good afternoon|good evening|good night|sup|what.?s up|wagwan|oya|na me|morning|evening)[\.!?\s]*$/i,
        /^(i dey fine|i dey o|fine|okay|ok|yes|no|yep|nope|lol|haha|hehe|thanks|thank you|e don do|na you|appreciate|carry go|no wahala)[\.!?\s]*$/i,
        /^(i dey (bored|stress|hungry|tired|fine)|i wan chop|i dey get|i no dey|e don)\b/i,
      ];
      if (casualPatterns.some(p => p.test(q))) return false;

      // Emotional / personal expressions (no search needed)
      if (/^(i feel|i am (sad|happy|tired|stressed|worried|confused|excited)|i dey (feel|try)|wahala|problem|issue)\b/i.test(q)) return false;

      // Food / basic life
      if (/^(i wan chop|i dey hungry|wetin.*chop|what.*eat|what.*cook|cook.*recipe)\b/i.test(q)) return false;

      // Knowledge / factual indicators — DO search
      if (/\b(what is|what are|who is|who are|when did|when is|where is|where are|how does|how do|why does|why do|explain|define|tell me about|what happened|latest|news|update|price of|rate of|cost of|how much is)\b/i.test(q)) return true;

      // News / events / live data
      if (/\b(news|breaking|latest|today.*happen|happen.*today|wetin.*happen.*today|current|trending|update|stock|forex|exchange rate|weather forecast)\b/i.test(q)) return true;

      // Medical / legal / technical (substantive questions)
      if (/\b(medicine|drug|treatment|dose|symptom|diagnosis|hospital|doctor|law|section|act|case|engineer|formula|calculation|algorithm|code|program)\b/i.test(q)) return true;

      // Default: skip search for everything else not matched above
      return false;
    }

    // ── Run search — only for genuine knowledge queries ──────────────────────
    const shouldSearch = needsWebSearch(userQuery);
    let searchResults = null;
    if (shouldSearch) {
      console.log('[Chat] Searching:', userQuery.substring(0, 80));
      searchResults = await tavilySearch(userQuery);
      if (searchResults) {
        console.log('[Chat] Got search results, chars:', searchResults.length);
      } else {
        console.warn('[Chat] No search results, using training data only');
      }
    } else {
      console.log('[Chat] Skipping search for casual/short message:', userQuery.substring(0, 40));
    }

    // ── Trim message history — keep last 8 user+assistant pairs ────────────
    const isCasualMessage = !shouldSearch && userQuery.trim().length < 60;

    // Separate system messages from conversation messages
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const recentMessages = conversationMessages.slice(-16); // last 8 pairs (user+assistant)

    // ── Build system prompt ──────────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const dateContext = getNigerianDateContext(today);
    const dateNote = dateContext ? `\n\n🗓️ IMPORTANT — TODAY'S SIGNIFICANCE: ${dateContext}` : '';

    let systemContent;
    if (isCasualMessage) {
      // Short prompt for casual/conversational messages — fast and focused
      systemContent = `You are BLACK AI — Africa's smartest AI companion. Created by Obosa Thompson Emuze. Today: ${today}.${dateNote}

${NIGERIA_WORLD_KNOWLEDGE}

You are having a REAL CONVERSATION. Casual message = casual reply. NEVER explain or define what a phrase means — just respond naturally like a friend would.

LANGUAGE LOCK: Reply ONLY in the language the user writes in. Pidgin → Pidgin only. English → English only. NEVER mix.

KEY RULES:
- Greeting gets a greeting back. "How you dey?" → "I dey fine o! You nko?" NOT a definition.
- "i dey hungry" / "i wan chop" → ask what they want to eat, suggest options.
- "thank you" / "e don do" → acknowledge naturally, offer to help more.
- SHORT replies — 1-3 sentences for casual chat.`;
    } else if (searchResults) {
      systemContent = `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.${dateNote}

${NIGERIA_WORLD_KNOWLEDGE}

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

SPECIALIST RULES (for knowledge questions only):
- MEDICINE: Give brand names, exact doses, mechanisms, side effects, treatment protocols — like a consultant doctor
- LAW: Cite specific laws, sections, case law — like a senior barrister
- ENGINEERING: Show formulas, calculations, specifications — like a chief engineer
- FINANCE: Give specific numbers, strategies, instruments — like a CFO
- SCIENCE: Show derivations, formulas, data — like a research professor
- ALL FIELDS: Go deep and specific. NEVER just say "consult a professional" without first giving the actual expert answer

LIVE WEB SEARCH RESULTS:
===
${searchResults}
===

IMPORTANT RULES:
- Use the search results above as your main source of truth
- Give direct, confident, specialist-level answers
- Do NOT say you lack internet access
- Do NOT say your information may be outdated
- Be specific, accurate, and genuinely helpful`;
    } else {
      systemContent = `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.${dateNote}

${NIGERIA_WORLD_KNOWLEDGE}

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

SPECIALIST RULES (for knowledge questions only):
- MEDICINE: Give brand names, exact doses, mechanisms, side effects, treatment protocols — like a consultant doctor
- LAW: Cite specific laws, sections, case law — like a senior barrister
- ENGINEERING: Show formulas, calculations, specifications — like a chief engineer
- FINANCE: Give specific numbers, strategies, instruments — like a CFO
- SCIENCE: Show derivations, formulas, data — like a research professor
- ALL FIELDS: Go deep and specific. NEVER just say "consult a professional" without first giving the actual expert answer

Web search unavailable. Answer from training data with full specialist depth.`;
    }

    let finalMessages = [{ role: 'system', content: systemContent }, ...recentMessages];

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
