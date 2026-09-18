// Image generation with unlimited-first fallback chain
// Priority: Stable Horde (unlimited) → Craiyon (unlimited) → Z-Image (2K/day) → Jimeng (100/day)
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
  const startTime = Date.now();
  
  // PRIORITY 1: Stable Horde (unlimited, community-powered)
  try {
    console.log('[Image API] Trying Stable Horde (unlimited)');
    const response = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '0000000000', // Anonymous key
      },
      body: JSON.stringify({
        prompt: prompt,
        params: {
          n: 1,
          width: 512,
          height: 512,
          steps: 30,
          cfg_scale: 7.5,
        },
        nsfw: false,
        trusted_workers: false,
        slow_workers: true,
        models: ['stable_diffusion'],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const jobId = data.id;

      // Poll for completion (max 3 minutes)
      for (let i = 0; i < 36; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s between polls
        
        const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`);
        const status = await statusResponse.json();

        if (status.done) {
          const resultResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`);
          const result = await resultResponse.json();
          
          if (result.generations && result.generations[0]) {
            return res.status(200).json({
              imageUrl: result.generations[0].img,
              provider: 'stablehorde',
              model: 'stable-diffusion',
              latencyMs: Date.now() - startTime,
            });
          }
        }
      }
    }
  } catch (error) {
    console.log('[Image API] Stable Horde failed:', error.message);
  }

  // PRIORITY 2: Craiyon (unlimited, ad-supported)
  try {
    console.log('[Image API] Trying Craiyon (unlimited fallback)');
    const response = await fetch('https://api.craiyon.com/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        model: 'none',
        negative_prompt: '',
        version: '35s5hfwn9n78gb06',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.images && data.images.length > 0) {
        return res.status(200).json({
          imageUrl: `data:image/png;base64,${data.images[0]}`,
          provider: 'craiyon',
          model: 'dall-e-mini',
          latencyMs: Date.now() - startTime,
        });
      }
    }
  } catch (error) {
    console.log('[Image API] Craiyon failed:', error.message);
  }

  // PRIORITY 3: Z-Image (2,000/day, high quality)
  try {
    console.log('[Image API] Trying Z-Image (2K/day limit)');
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx-v1',
        input: {
          prompt: prompt,
        },
        parameters: {
          size: '1024*1024',
          n: 1,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const taskId = data.output?.task_id;

      if (taskId) {
        // Poll for completion (max 60s)
        for (let i = 0; i < 12; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const statusResponse = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          const status = await statusResponse.json();
          
          if (status.output?.task_status === 'SUCCEEDED' && status.output?.results?.[0]?.url) {
            return res.status(200).json({
              imageUrl: status.output.results[0].url,
              provider: 'zimage',
              model: 'z-image-turbo',
              latencyMs: Date.now() - startTime,
            });
          }
        }
      }
    }
  } catch (error) {
    console.log('[Image API] Z-Image failed:', error.message);
  }

  // PRIORITY 4: Jimeng AI (80-100/day, ByteDance)
  try {
    console.log('[Image API] Trying Jimeng (80-100/day limit)');
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

    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.data?.image_url || data.image_url;

      if (imageUrl) {
        return res.status(200).json({
          imageUrl: imageUrl,
          provider: 'jimeng',
          model: 'jimeng-4.5',
          latencyMs: Date.now() - startTime,
        });
      }
    }
  } catch (error) {
    console.log('[Image API] Jimeng failed:', error.message);
  }

  // All providers failed
  return res.status(503).json({
    error: 'All image providers unavailable',
    message: 'Tried: Stable Horde, Craiyon, Z-Image, Jimeng - all failed',
    attempted: ['stablehorde', 'craiyon', 'zimage', 'jimeng'],
  });
};
