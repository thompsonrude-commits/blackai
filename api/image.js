// Free unlimited image generation - user pays model (like Chinese apps)
// Uses multiple free providers with intelligent fallback
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
  const model = req.body?.model || 'auto';
  
  // Strategy: Use truly free APIs (no key needed, no watermark)
  // These work just like Chinese AI apps - 100% free for users
  
  // Check if prompt needs text rendering
  const needsTextRendering = prompt.toLowerCase().match(/text|word|letter|sign|banner|poster|quote|caption|title/);
  
  // Option 1: Ideogram (best for text rendering - posters, banners, quotes)
  if (needsTextRendering) {
    try {
      // Ideogram has a generous free tier and excels at text rendering
      const ideogramResponse = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_request: {
            prompt: prompt,
            aspect_ratio: 'ASPECT_1_1',
            model: 'V_2',
            magic_prompt_option: 'AUTO',
          }
        }),
      });

      if (ideogramResponse.ok) {
        const ideogramData = await ideogramResponse.json();
        if (ideogramData.data && ideogramData.data[0] && ideogramData.data[0].url) {
          return res.status(200).json({
            imageUrl: ideogramData.data[0].url,
            provider: 'ideogram',
            model: 'ideogram-v2',
            latencyMs: 0,
            hasWatermark: false,
            supportsText: true
          });
        }
      }
    } catch (err) {
      console.log('[Image] Ideogram unavailable, trying next...');
    }
  }

  // Option 2: Prodia (free, fast, no watermark, no API key required)
  // Option 2: Prodia (free, fast, no watermark, no API key required)
  try {
    const prodiaResponse = await fetch('https://api.prodia.com/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${prompt}, high quality, detailed, vibrant colors`,
        model: 'dreamshaper_8.safetensors [9d40847d]',
        negative_prompt: 'watermark, text, logo, signature, low quality, blurry, distorted',
        steps: 25,
        cfg_scale: 7,
        seed: Math.floor(Math.random() * 1000000),
        sampler: 'DPM++ 2M Karras',
        width: 1024,
        height: 1024,
      }),
    });

    if (prodiaResponse.ok) {
      const prodiaData = await prodiaResponse.json();
      if (prodiaData.job) {
        // Poll for result (Prodia generates async)
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const jobResponse = await fetch(`https://api.prodia.com/job/${prodiaData.job}`);
          const jobData = await jobResponse.json();
          
          if (jobData.status === 'succeeded' && jobData.imageUrl) {
            return res.status(200).json({
              imageUrl: jobData.imageUrl,
              provider: 'prodia',
              model: 'dreamshaper-8',
              latencyMs: attempts * 1000,
              hasWatermark: false
            });
          }
          if (jobData.status === 'failed') break;
          attempts++;
        }
      }
    }
  } catch (err) {
    console.log('[Image] Prodia unavailable, trying next...');
  }

  // Option 3: Cloudflare Workers AI (free tier, good for text)
  if (needsTextRendering) {
    try {
      const cfResponse = await fetch('https://api.cloudflare.com/client/v4/accounts/demo/ai/run/@cf/black-forest-labs/flux-1-schnell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          num_steps: 4,
        }),
      });

      if (cfResponse.ok) {
        const blob = await cfResponse.blob();
        if (blob.size > 0) {
          const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
          return res.status(200).json({
            imageUrl: `data:image/png;base64,${base64}`,
            provider: 'cloudflare',
            model: 'flux-schnell',
            latencyMs: 0,
            hasWatermark: false,
            supportsText: true
          });
        }
      }
    } catch (err) {
      console.log('[Image] Cloudflare unavailable, trying next...');
    }
  }

  // Option 2: Vyro.ai (free, no key, works well)
  try {
    const vyroResponse = await fetch('https://api.vyro.ai/v1/imagine/api/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `${prompt}, masterpiece, best quality`,
        style_id: 122, // Realistic
        aspect_ratio: '1:1',
        high_res_results: 1,
      }),
    });

    if (vyroResponse.ok) {
      const vyroData = await vyroResponse.json();
      if (vyroData.data && vyroData.data[0] && vyroData.data[0].url) {
        return res.status(200).json({
          imageUrl: vyroData.data[0].url,
          provider: 'vyro',
          model: 'imagine',
          latencyMs: 0,
          hasWatermark: false
        });
      }
    }
  } catch (err) {
    console.log('[Image] Vyro unavailable, trying next...');
  }

  // Option 3: Picsum photos for immediate fallback (real photos, not AI but beautiful)
  if (prompt.toLowerCase().match(/photo|nature|landscape|portrait|city|building/)) {
    const seed = encodeURIComponent(prompt.slice(0, 50));
    const imageUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
    return res.status(200).json({
      imageUrl: imageUrl,
      provider: 'picsum',
      model: 'real-photos',
      latencyMs: 0,
      hasWatermark: false,
      note: 'Using real photo - AI services temporarily busy'
    });
  }

  // Fallback: Pollinations (works but has watermark)
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 1000000)}`;
  
  return res.status(200).json({
    imageUrl: imageUrl,
    provider: 'pollinations',
    model: 'flux',
    latencyMs: 0,
    hasWatermark: true,
    note: 'Using Pollinations fallback - may have small watermark'
  });
};
