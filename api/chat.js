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

    // ── Build enriched messages ──────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const systemContent = searchResults
      ? `You are BLACK AI, Africa's most intelligent AI assistant. Today's date is ${today}.

You have real-time web search results below. These are CURRENT, UP-TO-DATE facts fetched right now from the live web. Always use these as your primary source of truth over your training data.

LIVE WEB SEARCH RESULTS:
===
${searchResults}
===

IMPORTANT RULES:
- Use the search results above as your main source of truth
- Give direct, confident answers based on what you found
- Do NOT say you lack internet access - you have current results
- Do NOT say your information may be outdated - use the search results
- Be concise, accurate, and helpful`
      : `You are BLACK AI, Africa's most intelligent AI assistant. Today's date is ${today}.

Web search is temporarily unavailable. Answer from your training data but be transparent - tell the user your answer is based on training data and they should verify time-sensitive information from official sources.`;

    let finalMessages = [...messages];
    const sysIdx = finalMessages.findIndex(m => m.role === 'system');
    if (sysIdx >= 0) {
      finalMessages[sysIdx] = { role: 'system', content: systemContent };
    } else {
      finalMessages = [{ role: 'system', content: systemContent }, ...finalMessages];
    }

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const callGroq = async (model) => {
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
        })
      });
      if (!r.ok) {
        console.error(`[Chat] ${model} error ${r.status}:`, await r.text());
        return null;
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || null;
    };

    let text = await callGroq('openai/gpt-oss-120b');
    if (!text || text.trim() === '') {
      console.warn('[Chat] Primary model empty, trying groq/compound...');
      text = await callGroq('groq/compound');
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
      latencyMs: 0,
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
