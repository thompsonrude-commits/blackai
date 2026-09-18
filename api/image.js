// Image generation using Jimeng AI (ByteDance free service)
// No API key required
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

  const prompt = req.body?.prompt || 'beautiful scenery';
  
  try {
    // Call Jimeng AI API (ByteDance free service)
    const response = await fetch('https://jimeng.jianying.com/ai-platform/api/v1/text2image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        prompt,
        model: 'jimeng-4.5',
        width: 1024,
        height: 1024,
        steps: 30,
        guidance_scale: 7.5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Jimeng API failed: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.image_url || data.image_url;

    if (!imageUrl) {
      throw new Error('No image URL returned from Jimeng');
    }

    return res.status(200).json({
      imageUrl: imageUrl,
      provider: 'jimeng',
      model: 'jimeng-4.5',
      latencyMs: 0,
    });
  } catch (error) {
    console.error('[api/image] Jimeng failed:', error);
    
    // Return error instead of falling back to Pollinations
    return res.status(500).json({
      error: 'Image generation failed',
      message: error.message,
      provider: 'jimeng',
    });
  }
};

