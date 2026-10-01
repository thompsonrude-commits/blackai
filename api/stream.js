// Vercel serverless function for stream endpoint
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Direct Groq API call (same as chat endpoint)
  try {
    const { messages, temperature = 0.7, maxTokens = 2048 } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;
    if (!GROQ_KEY) {
      return res.status(500).json({ 
        error: 'API key not configured',
        text: 'Backend configuration error.',
        provider: 'none'
      });
    }

    const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'gemma2-9b-it'];
    let text = null;
    let usedModel = null;

    for (const model of MODELS) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
          }),
          signal: AbortSignal.timeout(50000),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.warn(`[Stream] ${model} returned ${response.status}:`, errorText.slice(0, 120));
          continue;
        }

        const data = await response.json();
        const candidate = data.choices?.[0]?.message?.content;
        if (candidate && candidate.trim()) {
          text = candidate;
          usedModel = model;
          break;
        }
      } catch (err) {
        console.warn(`[Stream] ${model} threw:`, err.message);
      }
    }

    if (!text) {
      return res.status(503).json({
        error: 'AI provider error',
        text: 'Service temporarily unavailable. Please try again.',
        provider: 'groq'
      });
    }

    return res.status(200).json({
      text,
      provider: 'groq',
      model: usedModel,
      tokensUsed: undefined,
    });
  } catch (error) {
    console.error('Stream error:', error);
    return res.status(500).json({ 
      error: 'Internal error',
      text: 'Service temporarily unavailable',
      provider: 'none'
    });
  }
};
