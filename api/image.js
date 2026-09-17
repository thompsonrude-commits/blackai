// Simple image generation fallback
// Frontend uses Puter.js for free unlimited generation
// This is just a fallback endpoint
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

  const prompt = req.body?.prompt || '3D concept art';
  
  // Enhanced Pollinations - best quality settings
  // Using turbo model with proper enhancement
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 10000000);
  
  // Use highest quality Pollinations settings
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true&enhance=true&private=true`;
  
  return res.status(200).json({
    imageUrl: imageUrl,
    provider: 'pollinations',
    model: 'flux-pro',
    latencyMs: 0,
    note: 'Backend fallback - frontend uses Puter.js for free unlimited generation'
  });
};
