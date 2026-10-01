// BLACK AI - Vercel chat endpoint
// Real-time web search via Tavily (keyless - no API key needed)
// Groq LLM for response generation

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

    let systemContent;
    if (isCasualMessage) {
      // Short prompt for casual/conversational messages — fast and focused
      systemContent = `You are BLACK AI — Africa's smartest AI companion. Created by Obosa Thompson Emuze. Today: ${today}.

You are having a REAL CONVERSATION. Casual message = casual reply. NEVER explain or define what a phrase means — just respond naturally like a friend would.

LANGUAGE LOCK: Reply ONLY in the language the user writes in. Pidgin → Pidgin only. English → English only. NEVER mix.

KEY RULES:
- Greeting gets a greeting back. "How you dey?" → "I dey fine o! You nko?" NOT a definition.
- "i dey hungry" / "i wan chop" → ask what they want to eat, suggest options.
- "thank you" / "e don do" → acknowledge naturally, offer to help more.
- SHORT replies — 1-3 sentences for casual chat.`;
    } else if (searchResults) {
      systemContent = `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.

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
      systemContent = `You are BLACK AI — Africa's most intelligent AI. Created by Obosa Thompson Emuze. Today: ${today}.

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

Web search is temporarily unavailable. Answer from your training data with full specialist depth.`;
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
