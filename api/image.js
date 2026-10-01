// BLACK AI — Image generation endpoint
// Provider chain (fastest/most reliable first):
//   1. Pollinations.ai  — free, no key, fast, FLUX model (5-15s)
//   2. Stable Horde     — free, community GPU, good quality (30-90s)
//   3. Craiyon          — free, slower, lower quality fallback (~60s)
// Routes: /api/ai/image, /api/image, /api/v1/image/generate  (all via vercel.json)

// ── Prompt helpers ──────────────────────────────────────────────────────────

function enhancePrompt(raw) {
  const cleaned = (raw || 'beautiful African scenery').trim();

  // Don't double-enhance if already has quality keywords
  if (/\b(photorealistic|ultra detailed|8k|professional photograph|masterpiece)\b/i.test(cleaned)) {
    return cleaned;
  }

  const lower = cleaned.toLowerCase();

  if (/\b(person|man|woman|people|human|portrait|face|professional|executive)\b/i.test(lower)) {
    return cleaned + ', professional portrait photography, photorealistic, natural skin texture, studio lighting, ultra high detail, 8k resolution, sharp focus, real person';
  }
  if (/\b(landscape|forest|mountain|beach|sunset|sunrise|nature|river|ocean|savanna|sky)\b/i.test(lower)) {
    return cleaned + ', breathtaking landscape photography, photorealistic, golden hour lighting, vivid colors, National Geographic style, ultra sharp, 8k resolution';
  }
  if (/\b(animal|dog|cat|lion|tiger|elephant|bird|wildlife|horse|zebra|giraffe)\b/i.test(lower)) {
    return cleaned + ', award-winning wildlife photography, photorealistic, ultra detailed fur texture, natural habitat, dramatic lighting, National Geographic quality, 8k';
  }
  if (/\b(building|architecture|house|office|room|interior|city|street|town)\b/i.test(lower)) {
    return cleaned + ', professional architectural photography, photorealistic, perfect lighting, ultra detailed, sharp focus, 8k resolution';
  }
  if (/\b(food|dish|meal|cuisine|restaurant|plate|cook)\b/i.test(lower)) {
    return cleaned + ', professional food photography, photorealistic, macro lens, soft lighting, vibrant colors, appetizing presentation, 8k';
  }
  if (/\b(logo|icon|brand|symbol|emblem|badge)\b/i.test(lower)) {
    return cleaned + ', vector style logo, clean modern design, professional, minimal, sharp edges, transparent background';
  }
  if (/\b(diagram|chart|infographic|flowchart|illustration|educational)\b/i.test(lower)) {
    return cleaned + ', clean professional infographic, labeled diagram, educational illustration, high contrast, clear typography, white background';
  }

  return cleaned + ', photorealistic, ultra high detail, professional photography, perfect lighting, sharp focus, 8k resolution, masterpiece';
}

// ── Helper: fetch image URL and convert to base64 data URL ─────────────────
async function fetchAsDataUrl(url, timeoutMs = 20000) {
  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': 'BlackAI/2.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const contentType = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (!contentType.startsWith('image/')) throw new Error(`Non-image content-type: ${contentType}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  if (!buffer.length) throw new Error('Empty response body');
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

// ── Provider 1: Pollinations.ai ─────────────────────────────────────────────
async function tryPollinations(prompt, seed) {
  const encodedPrompt = encodeURIComponent(prompt);
  const width = 1024;
  const height = 1024;
  const useSeed = seed || Math.floor(Math.random() * 1000000);

  // Try FLUX first, then turbo as immediate fallback
  const models = [
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${useSeed}&model=flux&nologo=true&enhance=true`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${useSeed}&model=turbo&nologo=true`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${useSeed}&nologo=true`,
  ];

  for (const url of models) {
    try {
      const dataUrl = await fetchAsDataUrl(url, 30000);
      return dataUrl;
    } catch (err) {
      console.warn('[Image] Pollinations attempt failed:', err.message);
    }
  }
  return null;
}

// ── Provider 2: Stable Horde (async job queue) ──────────────────────────────
// Kept under 45s total to stay safely within Vercel's 60s function limit
async function tryStableHorde(prompt) {
  try {
    const submitResp = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '0000000000', // anonymous key
      },
      body: JSON.stringify({
        prompt,
        params: {
          n: 1,
          width: 768,
          height: 768,
          steps: 25,
          cfg_scale: 7,
          sampler_name: 'k_dpmpp_2m',
          karras: true,
        },
        nsfw: false,
        trusted_workers: false,
        slow_workers: true,
        models: ['Realistic_Vision_V5.1', 'Deliberate', 'DreamShaper', 'stable_diffusion'],
        r2: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!submitResp.ok) {
      console.warn('[Image] StableHorde submit failed:', submitResp.status);
      return null;
    }

    const { id: jobId } = await submitResp.json();
    if (!jobId) return null;

    // Poll for up to 40 seconds (8 × 5s intervals)
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 5000));

      try {
        const checkResp = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!checkResp.ok) continue;

        const status = await checkResp.json();
        if (!status.done) {
          console.log(`[Image] StableHorde queue position: ${status.queue_position}, wait: ${status.wait_time}s`);
          continue;
        }

        const resultResp = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!resultResp.ok) return null;

        const result = await resultResp.json();
        const imgData = result.generations?.[0]?.img;
        if (!imgData) return null;

        // Stable Horde returns either base64 or a URL depending on r2 flag
        if (imgData.startsWith('http')) {
          try {
            return await fetchAsDataUrl(imgData, 10000);
          } catch {
            return `data:image/webp;base64,${imgData}`;
          }
        }
        // Already base64 (no data: prefix)
        return `data:image/webp;base64,${imgData}`;
      } catch (pollErr) {
        console.warn('[Image] StableHorde poll error:', pollErr.message);
      }
    }

    return null; // timed out
  } catch (err) {
    console.warn('[Image] StableHorde failed:', err.message);
    return null;
  }
}

// ── Provider 3: Craiyon ─────────────────────────────────────────────────────
async function tryCraiyon(prompt) {
  try {
    const resp = await fetch('https://api.craiyon.com/v3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: 'none',
        negative_prompt: 'blurry, low quality, ugly, deformed',
        version: '35s5hfwn9n78gb06',
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const first = data.images?.[0];
    if (!first) return null;
    return `data:image/png;base64,${first}`;
  } catch (err) {
    console.warn('[Image] Craiyon failed:', err.message);
    return null;
  }
}

// ── Main handler ────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parse body (Vercel may pre-parse or leave raw)
  let bodyObj = req.body || {};
  if (!bodyObj.prompt) {
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

  const userPrompt = (bodyObj.prompt || 'beautiful African scenery').trim();
  const prompt = enhancePrompt(userPrompt);
  const startTime = Date.now();

  console.log('[Image] User prompt:', userPrompt.slice(0, 80));
  console.log('[Image] Enhanced:', prompt.slice(0, 120));

  // ── Try providers in order ──────────────────────────────────────────────

  // 1. Pollinations (fastest — 5-15s, free, no key required)
  console.log('[Image] Trying Pollinations.ai (FLUX)...');
  const pollinationsResult = await tryPollinations(prompt, bodyObj.seed);
  if (pollinationsResult) {
    console.log('[Image] ✅ Pollinations succeeded in', Date.now() - startTime, 'ms');
    return res.status(200).json({
      imageUrl: pollinationsResult,
      provider: 'pollinations',
      model: 'flux',
      latencyMs: Date.now() - startTime,
    });
  }

  // 2. Stable Horde (community GPUs, good quality but can be slow)
  console.log('[Image] Trying Stable Horde...');
  const hordeResult = await tryStableHorde(prompt);
  if (hordeResult) {
    console.log('[Image] ✅ Stable Horde succeeded in', Date.now() - startTime, 'ms');
    return res.status(200).json({
      imageUrl: hordeResult,
      provider: 'stablehorde',
      model: 'Realistic_Vision_V5.1',
      latencyMs: Date.now() - startTime,
    });
  }

  // 3. Craiyon (slower but reliable last resort)
  console.log('[Image] Trying Craiyon...');
  const craiyonResult = await tryCraiyon(prompt);
  if (craiyonResult) {
    console.log('[Image] ✅ Craiyon succeeded in', Date.now() - startTime, 'ms');
    return res.status(200).json({
      imageUrl: craiyonResult,
      provider: 'craiyon',
      model: 'dall-e-mini',
      latencyMs: Date.now() - startTime,
    });
  }

  // All providers failed
  console.error('[Image] All providers failed after', Date.now() - startTime, 'ms');
  return res.status(503).json({
    error: 'All image providers are currently unavailable. Please try again in a few minutes.',
    attempted: ['pollinations', 'stablehorde', 'craiyon'],
    latencyMs: Date.now() - startTime,
  });
};
