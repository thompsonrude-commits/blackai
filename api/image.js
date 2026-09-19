// Image generation with unlimited-first fallback chain
// Priority: Stable Horde (photorealistic) → Jimeng → Craiyon → Z-Image
// NO POLLINATIONS - per user request

// Intelligent prompt enhancement for photorealism
function enhancePrompt(userPrompt) {
  const cleaned = userPrompt.trim();
  const hasQualityKeywords = /\b(detailed|realistic|high quality|photorealistic|professional|photograph)\b/i.test(cleaned);
  if (hasQualityKeywords) return cleaned;
  
  const isAnimal = /\b(dog|cat|horse|cow|animal|bird|wildlife|pet)\b/i.test(cleaned);
  const isPerson = /\b(person|man|woman|people|human|portrait)\b/i.test(cleaned);
  
  if (isAnimal) {
    return cleaned + ', professional wildlife photography, photorealistic, detailed fur and textures, natural lighting, real animal, National Geographic style, 4k photograph, DSLR';
  }
  if (isPerson) {
    return cleaned + ', professional portrait photography, photorealistic, natural skin texture, studio lighting, real person, high detail, DSLR, 85mm lens';
  }
  return cleaned + ', professional photography, photorealistic, high detail, natural lighting, real, 4k photograph';
}

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

  const userPrompt = req.body?.prompt || 'beautiful scenery';
  const prompt = enhancePrompt(userPrompt);
  const startTime = Date.now();
  
  console.log('[Image API] User prompt:', userPrompt);
  console.log('[Image API] Enhanced:', prompt);
  
  // PRIORITY 1: Stable Horde (unlimited, photorealistic models)
  try {
    console.log('[Image API] Trying Stable Horde (photorealistic)');
    const response = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': '0000000000',
      },
      body: JSON.stringify({
        prompt: prompt,
        params: {
          n: 1,
          width: 512,
          height: 512,
          steps: 30,
          cfg_scale: 8,
          sampler_name: 'k_euler',
        },
        nsfw: false,
        trusted_workers: true,
        slow_workers: true,
        models: ['Realistic_Vision_V5.1', 'Deliberate'],
        r2: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const data = await response.json();
      const jobId = data.id;

      // Poll for completion (max 15 seconds then try next)
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`, {
          signal: AbortSignal.timeout(3000),
        });
        const status = await statusResponse.json();

        if (status.done) {
          const resultResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`, {
            signal: AbortSignal.timeout(3000),
          });
          const result = await resultResponse.json();
          
          if (result.generations && result.generations[0]) {
            console.log('[Image API] ✅ Stable Horde succeeded (photorealistic)');
            return res.status(200).json({
              imageUrl: result.generations[0].img,
              provider: 'stablehorde',
              model: 'Realistic_Vision_V5.1',
              latencyMs: Date.now() - startTime,
            });
          }
        }
      }
      console.log('[Image API] Stable Horde timed out, trying next provider');
    }
  } catch (error) {
    console.log('[Image API] Stable Horde failed:', error.message);
  }
  
  // PRIORITY 2: Jimeng (fast fallback)
  try {
    console.log('[Image API] Trying Jimeng (fast)');
    const encodedPrompt = encodeURIComponent(prompt);
    const response = await fetch(`https://jimeng.jianying.com/ai-platform/api/v1/text2image?prompt=${encodedPrompt}&model=jimeng-4.5&resolution=2k&ratio=1:1`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.data && data.data[0] && data.data[0].url) {
        return res.status(200).json({
          imageUrl: data.data[0].url,
          provider: 'jimeng',
          model: 'jimeng-4.5',
          latencyMs: Date.now() - startTime,
        });
      }
    }
  } catch (error) {
    console.log('[Image API] Jimeng failed:', error.message);
  }
  
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
