// BLACK AI — Visual Orchestrator endpoint
// Handles image generation requests from the visual explanation engine
// Routes: /api/v1/visual-orchestrator  (via vercel.json)
// Uses same Pollinations chain as api/image.js

// ── Prompt helpers (shared with image.js) ────────────────────────────────
function enhancePrompt(raw) {
  const cleaned = (raw || 'visual diagram').trim();
  if (/\b(photorealistic|ultra detailed|8k|masterpiece)\b/i.test(cleaned)) return cleaned;
  const lower = cleaned.toLowerCase();
  if (/\b(diagram|chart|infographic|flowchart|illustration|educational|explain|show|concept)\b/i.test(lower)) {
    return cleaned + ', clean professional educational illustration, labeled diagram, high contrast, clear typography, white background, detailed';
  }
  if (/\b(logo|icon|brand|symbol)\b/i.test(lower)) {
    return cleaned + ', vector style logo, clean modern design, professional, minimal, sharp edges';
  }
  return cleaned + ', photorealistic, ultra high detail, professional photography, perfect lighting, sharp focus, 8k resolution';
}

async function tryPollinations(prompt, seed) {
  const encodedPrompt = encodeURIComponent(prompt);
  const width = 1024;
  const height = 1024;
  const useSeed = seed || Math.floor(Math.random() * 1000000);
  const models = [
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${useSeed}&model=flux&nologo=true&enhance=true`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${useSeed}&model=turbo&nologo=true`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${useSeed}&nologo=true`,
  ];
  for (const url of models) {
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'BlackAI/2.0' },
        signal: AbortSignal.timeout(30000),
      });
      if (!resp.ok) continue;
      const contentType = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
      if (!contentType.startsWith('image/')) continue;
      const buffer = Buffer.from(await resp.arrayBuffer());
      if (!buffer.length) continue;
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.warn('[VisualOrchestrator] Pollinations attempt failed:', err.message);
    }
  }
  return null;
}

// ── Main handler ──────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();

  let bodyObj = req.body || {};
  if (!bodyObj.prompt && !bodyObj.messages) {
    try {
      const raw = await new Promise((resolve, reject) => {
        let d = '';
        req.on('data', c => { d += c.toString(); });
        req.on('end', () => resolve(d));
        req.on('error', reject);
      });
      if (raw) bodyObj = JSON.parse(raw);
    } catch (_) {}
  }

  // Extract prompt from body — support multiple formats
  const userPrompt = (
    bodyObj.prompt ||
    (bodyObj.messages && bodyObj.messages[bodyObj.messages.length - 1]?.content) ||
    'educational diagram'
  ).trim();

  const enhancedPrompt = enhancePrompt(userPrompt);
  console.log('[VisualOrchestrator] Generating visual for:', userPrompt.slice(0, 80));

  const imageUrl = await tryPollinations(enhancedPrompt, bodyObj.seed);

  if (!imageUrl) {
    return res.status(503).json({
      ok: false,
      error: 'Visual generation failed — image provider unavailable. Please try again.',
    });
  }

  // Build visual metadata for the frontend visual explanation engine
  const visual = {
    imageUrl,
    imageType: /\b(diagram|chart|infographic|flowchart|educational)\b/i.test(userPrompt) ? 'educational-diagram' : 'ai-image',
    title: userPrompt.length > 60 ? userPrompt.slice(0, 57) + '...' : userPrompt,
    description: `Visual explanation for: ${userPrompt}`,
    labels: [],
    steps: [],
    provider: 'pollinations',
    model: 'flux',
    latencyMs: Date.now() - startTime,
    sourceType: 'ai-generated',
  };

  return res.status(200).json({ ok: true, visual });
};
