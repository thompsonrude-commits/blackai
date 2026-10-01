// BLACK AI — Vision / OCR API endpoint
// Analyzes images using Groq's vision models (qwen/qwen3.8-27b, llama-4-scout)
// Handles both /api/ai/vision and /api/v1/vision/analyze via vercel.json routing

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Session-Id');

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

    const { imageBase64, imageUrl, prompt, task } = body;

    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({ error: 'imageBase64 or imageUrl required' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_KEY;
    if (!GROQ_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const startTime = Date.now();

    // Build the image content part for Groq vision
    let imageContent;
    if (imageBase64) {
      // imageBase64 may already be a full data URL (data:image/...;base64,...)
      const isDataUrl = imageBase64.startsWith('data:');
      const dataUrl = isDataUrl ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      imageContent = {
        type: 'image_url',
        image_url: { url: dataUrl },
      };
    } else {
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl },
      };
    }

    const systemPrompt = task === 'ocr'
      ? 'You are an expert OCR system. Extract ALL visible text from the image exactly as it appears, preserving line breaks. Return only the extracted text with no commentary.'
      : (prompt || 'Analyze this image in detail. Describe what you see, including any text, objects, people, scenes, products, labels, or other notable elements. Be thorough and specific.');

    const userContent = task === 'ocr'
      ? [
          { type: 'text', text: 'Extract all text from this image:' },
          imageContent,
        ]
      : [
          { type: 'text', text: typeof prompt === 'string' && prompt.length > 10 ? prompt : 'Analyze and describe this image in detail:' },
          imageContent,
        ];

    // Try Groq vision models in order (current as of Oct 2026)
    // qwen/qwen3.8-27b supports vision (images up to 20 MB)
    const VISION_MODELS = [
      'qwen/qwen3.8-27b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
    ];

    let responseText = null;
    let usedModel = null;

    for (const model of VISION_MODELS) {
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            temperature: 0.2,
            max_tokens: 2048,
          }),
          signal: AbortSignal.timeout(45000),
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.warn(`[Vision] Model ${model} failed ${resp.status}:`, errText.slice(0, 120));
          continue;
        }

        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text && text.trim().length > 0) {
          responseText = text.trim();
          usedModel = model;
          break;
        }
      } catch (err) {
        console.warn(`[Vision] Model ${model} threw:`, err.message);
      }
    }

    if (!responseText) {
      return res.status(503).json({
        error: 'Vision analysis failed — no model responded',
        text: 'Vision analysis is temporarily unavailable. Please try again.',
        description: '',
        objects: [],
        provider: 'groq',
        model: 'unavailable',
        latencyMs: Date.now() - startTime,
      });
    }

    return res.status(200).json({
      text: responseText,
      description: responseText,
      objects: [],
      provider: 'groq',
      model: usedModel,
      latencyMs: Date.now() - startTime,
    });

  } catch (error) {
    console.error('[Vision] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal error',
      text: 'Vision analysis failed. Please try again.',
      description: '',
      objects: [],
      provider: 'none',
      model: 'error',
    });
  }
};
