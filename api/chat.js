// Vercel chat endpoint with Groq + real-time web search
// Web search keeps responses current and accurate
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse raw body
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

    // ── 1. Detect if the query needs fresh/current information ──────────────
    const userMessage = messages[messages.length - 1]?.content || '';
    const needsCurrentInfo = /\b(governor|governors|president|minister|senator|current|latest|recent|today|now|2024|2025|2026|news|price|rate|exchange|usd|naira|ngn|election|win|won|result|score|match|game|live|died|dead|born|new|update|who is|who are|what is the current|how much is)\b/i.test(userMessage);

    // ── 2. Web search function (DuckDuckGo Instant Answer API - free) ────────
    async function webSearch(query) {
      try {
        const encoded = encodeURIComponent(query);
        // DuckDuckGo Instant Answer API
        const ddgUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
        const ddgRes = await fetch(ddgUrl, {
          headers: { 'User-Agent': 'BlackAI/1.0' },
          signal: AbortSignal.timeout(5000)
        });
        const ddgData = await ddgRes.json();

        let results = [];

        // Abstract (main answer)
        if (ddgData.Abstract && ddgData.Abstract.length > 10) {
          results.push(`📌 ${ddgData.AbstractText || ddgData.Abstract}`);
        }

        // Answer (short direct answer)
        if (ddgData.Answer) {
          results.push(`✅ ${ddgData.Answer}`);
        }

        // Related topics
        if (ddgData.RelatedTopics && ddgData.RelatedTopics.length > 0) {
          const topics = ddgData.RelatedTopics
            .slice(0, 5)
            .filter(t => t.Text)
            .map(t => `• ${t.Text}`);
          if (topics.length > 0) results.push(...topics);
        }

        // Infobox (structured data like tables)
        if (ddgData.Infobox && ddgData.Infobox.content) {
          const info = ddgData.Infobox.content
            .slice(0, 8)
            .map(item => `• ${item.label}: ${item.value}`)
            .join('\n');
          if (info) results.push(info);
        }

        if (results.length === 0) {
          // Fallback: try SearXNG public instance
          return await searxSearch(query);
        }

        return results.join('\n').substring(0, 3000);
      } catch (e) {
        console.warn('[Search] DuckDuckGo failed:', e.message);
        return await searxSearch(query);
      }
    }

    // Fallback search using public SearXNG instance
    async function searxSearch(query) {
      try {
        const encoded = encodeURIComponent(query);
        const url = `https://searx.be/search?q=${encoded}&format=json&categories=general`;
        const r = await fetch(url, {
          headers: { 'User-Agent': 'BlackAI/1.0', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000)
        });
        const data = await r.json();
        if (data.results && data.results.length > 0) {
          const snippets = data.results
            .slice(0, 5)
            .map(r => `• ${r.title}: ${r.content}`)
            .join('\n');
          return snippets.substring(0, 3000);
        }
        return null;
      } catch (e) {
        console.warn('[Search] SearXNG also failed:', e.message);
        return null;
      }
    }

    // ── 3. Build messages with search context if needed ─────────────────────
    let finalMessages = [...messages];

    if (needsCurrentInfo) {
      console.log('[Chat] Query needs current info, searching:', userMessage.substring(0, 80));
      const searchResults = await webSearch(userMessage);

      if (searchResults) {
        console.log('[Chat] Got search results, length:', searchResults.length);
        // Inject search results as a system message just before the user's query
        const systemMsg = {
          role: 'system',
          content: `You are BLACK AI, Africa's smartest AI assistant. You have access to the following REAL-TIME web search results to answer the user's question accurately and with current information. Use these results as your primary source of truth. Do NOT say you don't have internet access if you have search results below.

CURRENT WEB SEARCH RESULTS (fetched right now):
---
${searchResults}
---

Use the above real-time data to give an accurate, up-to-date answer. If the search results don't fully answer the question, supplement with your training knowledge but clearly note what is from search vs training data. Always be direct and helpful.`
        };

        // Insert system message at start, keep conversation history
        const existingSystem = finalMessages.find(m => m.role === 'system');
        if (existingSystem) {
          // Append to existing system message
          existingSystem.content += '\n\n' + systemMsg.content;
        } else {
          finalMessages = [systemMsg, ...finalMessages];
        }
      } else {
        console.log('[Chat] Search returned no results, using training data with disclaimer');
        // Still inject a system message telling AI to be transparent about data currency
        const fallbackSystem = {
          role: 'system',
          content: `You are BLACK AI. Web search is currently unavailable. When answering questions about current events, governors, officials, prices, or recent news, clearly state the date of your training data and advise the user to verify current information from official sources like government websites or reputable news outlets.`
        };
        const existingSystem = finalMessages.find(m => m.role === 'system');
        if (!existingSystem) {
          finalMessages = [fallbackSystem, ...finalMessages];
        }
      }
    }

    // ── 4. Call Groq with enriched messages ─────────────────────────────────
    const callGroq = async (model, msgs) => {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: msgs,
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      });
      if (!r.ok) {
        const err = await r.text();
        console.error(`[Chat] ${model} error ${r.status}:`, err);
        return null;
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || null;
    };

    // Try primary then fallback model
    let text = await callGroq('openai/gpt-oss-120b', finalMessages);
    if (!text || text.trim() === '') {
      console.warn('[Chat] Primary model empty, trying groq/compound...');
      text = await callGroq('groq/compound', finalMessages);
    }
    if (!text || text.trim() === '') {
      text = "I'm sorry, I couldn't generate a response right now. Please try again.";
    }

    // ── 5. Strip internal reasoning sections from response ──────────────────
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
      searchUsed: needsCurrentInfo,
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

// Tell Vercel NOT to parse the body - we do it ourselves
module.exports.config = {
  api: { bodyParser: false },
};
