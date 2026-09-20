// Vercel chat endpoint with direct Groq integration
// Disable Vercel's built-in body parser - handle manually
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id, X-User-Id');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read raw body from stream (bypasses Vercel body parser entirely)
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    let body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body', details: e.message });
    }

    const { messages, temperature = 0.7, maxTokens = 2048 } = body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;

    if (!GROQ_KEY) {
      return res.status(500).json({
        error: 'API key not configured',
        text: 'Backend configuration error. Please contact administrator.',
        provider: 'none',
        model: 'error'
      });
    }

    const callGroq = async (model) => {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model,
          messages,
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

    // Try primary model first, then fallback
    let text = await callGroq('openai/gpt-oss-120b');
    if (!text || text.trim() === '') {
      console.warn('[Chat] Primary model empty, trying groq/compound...');
      text = await callGroq('groq/compound');
    }
    if (!text || text.trim() === '') {
      console.warn('[Chat] Both models returned empty response');
      text = "I'm sorry, I couldn't generate a response. Please try again.";
    }

    // Strip internal reasoning/thinking sections the model sometimes prepends
    // These are model-internal metadata not meant for end users
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
  api: {
    bodyParser: false,
  },
};
