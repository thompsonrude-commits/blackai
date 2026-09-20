// Vercel chat endpoint with Groq + real-time web search
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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

    // ── 1. Detect queries needing current/real-time information ─────────────
    const userQuery = messages[messages.length - 1]?.content || '';
    const needsSearch = true; // Always search for current info

    // ── 2. Search functions ──────────────────────────────────────────────────

    // Wikipedia - completely free, no API key, very reliable
    async function searchWikipedia(query) {
      try {
        const encoded = encodeURIComponent(query);
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&srlimit=3&origin=*`;
        const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
        const d = await r.json();
        if (!d.query?.search?.length) return null;

        const snippets = [];
        for (const item of d.query.search.slice(0, 2)) {
          try {
            const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(item.title)}&format=json&exsentences=5&origin=*`;
            const sr = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
            const sd = await sr.json();
            const pages = sd.query?.pages;
            if (pages) {
              const page = Object.values(pages)[0];
              if (page.extract && page.extract.length > 50) {
                snippets.push(`[Wikipedia: ${page.title}]\n${page.extract.substring(0, 600)}`);
              }
            }
          } catch (e) { /* skip */ }
        }
        return snippets.length ? snippets.join('\n\n') : null;
      } catch (e) {
        console.warn('[Search] Wikipedia failed:', e.message);
        return null;
      }
    }

    // DuckDuckGo Instant Answer - free
    async function searchDDG(query) {
      try {
        const encoded = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 BlackAI/1.0' },
          signal: AbortSignal.timeout(5000)
        });
        const d = await r.json();
        const parts = [];
        if (d.Answer) parts.push(`Answer: ${d.Answer}`);
        if (d.AbstractText && d.AbstractText.length > 20) parts.push(`Summary: ${d.AbstractText.substring(0, 500)}`);
        if (d.RelatedTopics?.length) {
          const topics = d.RelatedTopics.filter(t => t.Text).slice(0, 4).map(t => `• ${t.Text}`).join('\n');
          if (topics) parts.push(topics);
        }
        return parts.length ? parts.join('\n') : null;
      } catch (e) {
        console.warn('[Search] DDG failed:', e.message);
        return null;
      }
    }

    // Brave Search - free tier available (uses API key if configured)
    async function searchBrave(query) {
      const key = process.env.BRAVE_SEARCH_KEY || process.env.BRAVE_API_KEY;
      if (!key) return null;
      try {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&freshness=pm`;
        const r = await fetch(url, {
          headers: { 'Accept': 'application/json', 'X-Subscription-Token': key },
          signal: AbortSignal.timeout(6000)
        });
        const d = await r.json();
        if (!d.web?.results) return null;
        return d.web.results.slice(0, 5)
          .map(item => `[${item.title}]\n${item.description}\nSource: ${item.url}`)
          .join('\n\n');
      } catch (e) { return null; }
    }

    // Tavily Search - excellent for AI grounding (uses API key if configured)  
    async function searchTavily(query) {
      const key = process.env.TAVILY_API_KEY || process.env.TAVILY_KEY;
      if (!key) return null;
      try {
        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: key,
            query,
            search_depth: 'basic',
            include_answer: true,
            max_results: 5
          }),
          signal: AbortSignal.timeout(8000)
        });
        const d = await r.json();
        const parts = [];
        if (d.answer) parts.push(`Direct Answer: ${d.answer}`);
        if (d.results?.length) {
          d.results.slice(0, 4).forEach(item => {
            parts.push(`[${item.title}]\n${item.content?.substring(0, 300)}\nSource: ${item.url}`);
          });
        }
        return parts.length ? parts.join('\n\n') : null;
      } catch (e) { return null; }
    }

    // ── 3. Run searches in parallel and combine results ─────────────────────
    let searchContext = null;

    if (needsSearch) {
      console.log('[Chat] Searching for:', userQuery.substring(0, 80));

      const [tavily, brave, wiki, ddg] = await Promise.allSettled([
        searchTavily(userQuery),
        searchBrave(userQuery),
        searchWikipedia(userQuery),
        searchDDG(userQuery)
      ]);

      const parts = [];
      if (tavily.status === 'fulfilled' && tavily.value) parts.push(tavily.value);
      if (brave.status === 'fulfilled' && brave.value) parts.push(brave.value);
      if (wiki.status === 'fulfilled' && wiki.value) parts.push(wiki.value);
      if (ddg.status === 'fulfilled' && ddg.value) parts.push(ddg.value);

      if (parts.length > 0) {
        searchContext = parts.join('\n\n---\n\n').substring(0, 4000);
        console.log('[Chat] Search context length:', searchContext.length, 'from', parts.length, 'sources');
      } else {
        console.log('[Chat] All searches failed, proceeding without search context');
      }
    }

    // ── 4. Build messages with search context injected ──────────────────────
    let finalMessages = [...messages];

    if (needsSearch) {
      const systemContent = searchContext
        ? `You are BLACK AI, Africa's smartest AI. You have real-time web search results below. Use them as your PRIMARY and most accurate source of information. The search results reflect CURRENT data as of today.

REAL-TIME SEARCH RESULTS:
===
${searchContext}
===

Instructions:
- Use the search results above as your primary source
- Give direct, confident answers based on what you found
- If search results contain the answer, state it clearly without hedging
- Only fall back to training data if search results don't cover the topic
- Do NOT say you lack internet access — you have current search results above`
        : `You are BLACK AI. Web search is unavailable right now. For questions about current events, officials, or recent news, state clearly when your training data is from and recommend the user verify from official sources like government websites or news outlets.`;

      const existingSystem = finalMessages.findIndex(m => m.role === 'system');
      if (existingSystem >= 0) {
        finalMessages[existingSystem] = { role: 'system', content: systemContent };
      } else {
        finalMessages = [{ role: 'system', content: systemContent }, ...finalMessages];
      }
    }

    // ── 5. Call Groq ─────────────────────────────────────────────────────────
    const callGroq = async (model, msgs) => {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({ model, messages: msgs, temperature, max_tokens: maxTokens, stream: false })
      });
      if (!r.ok) {
        console.error(`[Chat] ${model} error ${r.status}:`, await r.text());
        return null;
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || null;
    };

    let text = await callGroq('openai/gpt-oss-120b', finalMessages);
    if (!text || text.trim() === '') {
      console.warn('[Chat] Primary model empty, trying groq/compound...');
      text = await callGroq('groq/compound', finalMessages);
    }
    if (!text || text.trim() === '') {
      text = "I'm sorry, I couldn't generate a response right now. Please try again.";
    }

    // ── 6. Strip internal reasoning sections ────────────────────────────────
    text = text
      .replace(/^#+\s*Reasoning\s+Summary\b[\s\S]*?\n{2,}/im, '')
      .replace(/^\*{0,2}Reasoning\s+Summary\*{0,2}\s*\n[\s\S]*?\n{2,}/im, '')
      .replace(/^Reasoning\s+Summary\s*\n[\s\S]*?\n{2,}/im, '')
      .trim();

    return res.status(200).json({
      text,
      content: text,
      choices: [{ message: { content: text } }],
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      searchUsed: needsSearch && !!searchContext,
      latencyMs: 0,
      cached: false
    });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      error: 'Internal error',
      text: 'Local fallback mode is active. Please try again.',
      provider: 'none',
      model: 'error',
      details: error.message
    });
  }
};

module.exports.config = { api: { bodyParser: false } };
