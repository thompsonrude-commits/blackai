// AI Image Upscaling API
// Uses free/open services for real image enhancement

const fetch = require('node-fetch');

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

  try {
    const { imageUrl, scale = 2 } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Option 1: Try using Replicate's free tier (requires API key)
    const replicateKey = process.env.REPLICATE_API_TOKEN;
    
    if (replicateKey) {
      try {
        const upscaleResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa', // Real-ESRGAN x2
            input: {
              image: imageUrl,
              scale: scale,
              face_enhance: false,
            },
          }),
        });

        if (!upscaleResponse.ok) {
          throw new Error('Replicate API failed');
        }

        const prediction = await upscaleResponse.json();
        
        // Poll for result (Replicate is async)
        let result = prediction;
        let attempts = 0;
        while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: { 'Authorization': `Token ${replicateKey}` },
          });
          result = await pollResponse.json();
          attempts++;
        }

        if (result.status === 'succeeded' && result.output) {
          return res.status(200).json({
            success: true,
            upscaledUrl: result.output,
            method: 'replicate-realesrgan',
            newWidth: null, // Not provided by Replicate
            newHeight: null,
          });
        }
      } catch (replicateErr) {
        console.error('[Upscale] Replicate failed:', replicateErr);
        // Fall through to alternative
      }
    }

    // Option 2: Use imglarger.com free API (no key needed)
    try {
      const imglargerResponse = await fetch('https://api.imglarger.com/api/Upscaler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          scaleRadio: scale,
        }),
      });

      if (imglargerResponse.ok) {
        const imglargerData = await imglargerResponse.json();
        if (imglargerData.data?.downloadUrl) {
          return res.status(200).json({
            success: true,
            upscaledUrl: imglargerData.data.downloadUrl,
            method: 'imglarger',
            newWidth: null,
            newHeight: null,
          });
        }
      }
    } catch (imglargerErr) {
      console.error('[Upscale] imglarger failed:', imglargerErr);
      // Fall through
    }

    // Option 3: Fallback - return original with instruction to use client-side enhanced upscale
    return res.status(200).json({
      success: false,
      error: 'AI upscaling services unavailable. Using client-side enhancement.',
      fallbackToClient: true,
    });

  } catch (err) {
    console.error('[Upscale] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Upscaling failed',
      fallbackToClient: true,
    });
  }
};
