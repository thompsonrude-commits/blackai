// BLACK AI — Video generation endpoint
// Route: /api/v1/video  (via vercel.json)
//
// Currently: generates a high-quality still image as a video placeholder
// using Pollinations FLUX (same as api/image.js).
//
// Future: integrate Runway, Pika, Kling, or Hailuo APIs for real video.

async function tryPollinations(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const useSeed = Math.floor(Math.random() * 1000000);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${useSeed}&model=flux&nologo=true&enhance=true`;
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'BlackAI/2.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) return null;
    const contentType = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!contentType.startsWith('image/')) return null;
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (!buffer.length) return null;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('[Video] Pollinations failed:', err.message);
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Session-Id');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const startTime = Date.now();

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

  const prompt = (bodyObj.prompt || 'cinematic video scene').trim();

  // Generate a high-quality 16:9 image as video placeholder
  const imageUrl = await tryPollinations(
    prompt + ', cinematic shot, 16:9 aspect ratio, film still, professional cinematography, high quality'
  );

  if (imageUrl) {
    return res.status(200).json({
      outputUrl: imageUrl,
      videoUrl: imageUrl,
      provider: 'pollinations-image',
      model: 'flux',
      note: 'Full video generation coming soon. Showing a cinematic image frame for now.',
      latencyMs: Date.now() - startTime,
    });
  }

  return res.status(503).json({
    error: 'Video generation temporarily unavailable. Please try again.',
    outputUrl: '',
    videoUrl: '',
    provider: 'none',
    latencyMs: Date.now() - startTime,
  });
};
