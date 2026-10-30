// BLACK AI — Image generation endpoint
// Also handles /api/v1/video and /api/v1/visual-orchestrator (merged to stay within 12 function limit)
// Provider chain: Pollinations FLUX → Stable Horde → Craiyon

function enhancePrompt(raw) {
  const cleaned = (raw || 'beautiful African scenery').trim();
  if (/\b(photorealistic|ultra detailed|8k|masterpiece)\b/i.test(cleaned)) return cleaned;
  const lower = cleaned.toLowerCase();
  if (/\b(person|man|woman|people|human|portrait|face)\b/i.test(lower))
    return cleaned + ', professional portrait photography, photorealistic, studio lighting, ultra high detail, 8k';
  if (/\b(landscape|forest|mountain|beach|sunset|nature|river|ocean|savanna)\b/i.test(lower))
    return cleaned + ', breathtaking landscape photography, photorealistic, golden hour, National Geographic style, 8k';
  if (/\b(animal|dog|cat|lion|elephant|bird|wildlife)\b/i.test(lower))
    return cleaned + ', award-winning wildlife photography, photorealistic, natural habitat, dramatic lighting, 8k';
  if (/\b(building|architecture|house|city|street)\b/i.test(lower))
    return cleaned + ', professional architectural photography, photorealistic, perfect lighting, 8k';
  if (/\b(logo|icon|brand|symbol)\b/i.test(lower))
    return cleaned + ', vector style logo, clean modern design, professional, minimal, sharp edges';
  if (/\b(diagram|chart|infographic|educational)\b/i.test(lower))
    return cleaned + ', clean professional infographic, high contrast, clear typography, white background';
  return cleaned + ', photorealistic, ultra high detail, professional photography, perfect lighting, 8k, masterpiece';
}

async function fetchAsDataUrl(url, timeoutMs = 20000) {
  const resp = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'BlackAI/2.0' }, signal: AbortSignal.timeout(timeoutMs) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const contentType = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (!contentType.startsWith('image/')) throw new Error(`Non-image: ${contentType}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  if (!buffer.length) throw new Error('Empty body');
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function tryPollinations(prompt, seed) {
  const ep = encodeURIComponent(prompt);
  const s = seed || Math.floor(Math.random() * 1000000);
  const urls = [
    `https://image.pollinations.ai/prompt/${ep}?width=1024&height=1024&seed=${s}&model=flux&nologo=true&enhance=true`,
    `https://image.pollinations.ai/prompt/${ep}?width=1024&height=1024&seed=${s}&model=turbo&nologo=true`,
    `https://image.pollinations.ai/prompt/${ep}?width=1024&height=1024&seed=${s}&nologo=true`,
  ];
  for (const url of urls) {
    try { return await fetchAsDataUrl(url, 30000); }
    catch (err) { console.warn('[Image] Pollinations failed:', err.message); }
  }
  return null;
}

async function tryStableHorde(prompt) {
  try {
    const sub = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': '0000000000' },
      body: JSON.stringify({ prompt, params: { n: 1, width: 768, height: 768, steps: 25, cfg_scale: 7, sampler_name: 'k_dpmpp_2m', karras: true }, nsfw: false, trusted_workers: false, slow_workers: true, models: ['Realistic_Vision_V5.1', 'Deliberate', 'DreamShaper'], r2: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!sub.ok) return null;
    const { id } = await sub.json();
    if (!id) return null;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const chk = await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`, { signal: AbortSignal.timeout(4000) });
        if (!chk.ok) continue;
        const st = await chk.json();
        if (!st.done) continue;
        const res2 = await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`, { signal: AbortSignal.timeout(4000) });
        if (!res2.ok) return null;
        const r = await res2.json();
        const img = r.generations?.[0]?.img;
        if (!img) return null;
        if (img.startsWith('http')) { try { return await fetchAsDataUrl(img, 10000); } catch { return `data:image/webp;base64,${img}`; } }
        return `data:image/webp;base64,${img}`;
      } catch (e) { console.warn('[Image] Horde poll error:', e.message); }
    }
    return null;
  } catch (err) { console.warn('[Image] StableHorde failed:', err.message); return null; }
}

async function tryCraiyon(prompt) {
  try {
    const r = await fetch('https://api.craiyon.com/v3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, model: 'none', negative_prompt: 'blurry, low quality, ugly', version: '35s5hfwn9n78gb06' }), signal: AbortSignal.timeout(55000) });
    if (!r.ok) return null;
    const d = await r.json();
    const f = d.images?.[0];
    return f ? `data:image/png;base64,${f}` : null;
  } catch (err) { console.warn('[Image] Craiyon failed:', err.message); return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parse body
  let bodyObj = req.body || {};
  if (!bodyObj.prompt) {
    try {
      const raw = await new Promise((resolve, reject) => {
        let d = ''; req.on('data', c => { d += c.toString(); }); req.on('end', () => resolve(d)); req.on('error', reject);
      });
      if (raw) bodyObj = JSON.parse(raw);
    } catch (_) {}
  }

  const startTime = Date.now();
  const url = req.url || '';

  // Handle visual-orchestrator requests (merged here to stay under 12-function limit)
  if (url.includes('visual-orchestrator')) {
    const vp = bodyObj.prompt || (bodyObj.messages && bodyObj.messages[bodyObj.messages.length - 1]?.content) || 'visual concept';
    const vi = await tryPollinations(enhancePrompt(vp), null);
    if (vi) return res.status(200).json({ ok: true, visual: { imageUrl: vi, provider: 'pollinations', model: 'flux', title: vp.slice(0, 60), latencyMs: Date.now() - startTime } });
    return res.status(503).json({ ok: false, error: 'Visual generation unavailable.' });
  }

  // Handle video requests (returns cinematic image as placeholder)
  if (url.includes('video')) {
    const vp = bodyObj.prompt || 'cinematic scene';
    const vi = await tryPollinations(enhancePrompt(vp + ', cinematic shot, 16:9, film still'), null);
    if (vi) return res.status(200).json({ outputUrl: vi, videoUrl: vi, provider: 'pollinations', model: 'flux', latencyMs: Date.now() - startTime });
    return res.status(503).json({ error: 'Video generation unavailable.' });
  }

  // Regular image generation
  const userPrompt = (bodyObj.prompt || 'beautiful African scenery').trim();
  const prompt = enhancePrompt(userPrompt);

  console.log('[Image] Prompt:', userPrompt.slice(0, 80));

  // 1. Pollinations
  const p1 = await tryPollinations(prompt, bodyObj.seed);
  if (p1) { console.log('[Image] ✅ Pollinations'); return res.status(200).json({ imageUrl: p1, provider: 'pollinations', model: 'flux', latencyMs: Date.now() - startTime }); }

  // 2. Stable Horde
  const p2 = await tryStableHorde(prompt);
  if (p2) { console.log('[Image] ✅ StableHorde'); return res.status(200).json({ imageUrl: p2, provider: 'stablehorde', model: 'Realistic_Vision_V5.1', latencyMs: Date.now() - startTime }); }

  // 3. Craiyon
  const p3 = await tryCraiyon(prompt);
  if (p3) { console.log('[Image] ✅ Craiyon'); return res.status(200).json({ imageUrl: p3, provider: 'craiyon', model: 'dall-e-mini', latencyMs: Date.now() - startTime }); }

  console.error('[Image] All providers failed');
  return res.status(503).json({ error: 'All image providers are currently unavailable. Please try again in a few minutes.', attempted: ['pollinations', 'stablehorde', 'craiyon'], latencyMs: Date.now() - startTime });
};
