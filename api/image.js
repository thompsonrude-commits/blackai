// Image generation with unlimited-first fallback chain
// Priority: Stable Horde (unlimited) → Craiyon (unlimited) → Z-Image (2K/day) → Jimeng (100/day)

// Intelligent prompt enhancement for better quality
function enhancePrompt(userPrompt) {
  const cleaned = userPrompt.trim();
  
  // If prompt is already detailed (has quality keywords), use as-is
  const hasQualityKeywords = /\b(detailed|realistic|high quality|photorealistic|professional|4k|8k|hd|masterpiece)\b/i.test(cleaned);
  if (hasQualityKeywords) {
    return cleaned;
  }
  
  // Detect subject type for appropriate enhancement
  const isPortrait = /\b(person|man|woman|face|portrait|people|human)\b/i.test(cleaned);
  const isAnimal = /\b(dog|cat|horse|animal|bird|wildlife|pet)\b/i.test(cleaned);
  const isLandscape = /\b(landscape|scenery|mountain|ocean|forest|nature|sky|sunset|sunrise)\b/i.test(cleaned);
  const isObject = /\b(car|vehicle|building|house|product|furniture|tool)\b/i.test(cleaned);
  
  // Add appropriate quality modifiers
  let enhanced = cleaned;
  
  if (isPortrait) {
    enhanced += ', photorealistic portrait, detailed face, professional photography, studio lighting';
  } else if (isAnimal) {
    enhanced += ', realistic animal photography, detailed fur/feathers, natural pose, complete anatomy, professional wildlife photography';
  } else if (isLandscape) {
    enhanced += ', stunning landscape photography, vivid colors, high detail, professional composition, natural lighting';
  } else if (isObject) {
    enhanced += ', professional product photography, detailed, clean background, studio lighting';
  } else {
    enhanced += ', high quality, detailed, realistic, professional';
  }
  
  return enhanced;
}

// Negative prompts to avoid common AI artifacts
const NEGATIVE_PROMPT = 'deformed, distorted, disfigured, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, mutated, ugly, blurry, bad art, beginner, amateur, low quality, watermark';

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
  console.log('[Image API] Enhanced prompt:', prompt);
  
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
          steps: 25, // Balanced steps for good quality + speed
          cfg_scale: 7.5, // Balanced guidance
          sampler_name: 'k_euler', // Fast sampler
          karras: true,
        },
        nsfw: false,
        trusted_workers: true,
        slow_workers: true,
        models: ['Deliberate'], // Single fast, quality model
        r2: true,
        censor_nsfw: true,
        replacement_filter: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const jobId = data.id;

      // Poll for completion (max 60 seconds - fail faster to try next provider)
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s between polls
        
        const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`);
        const status = await statusResponse.json();

        if (status.done) {
          const resultResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`);
          const result = await resultResponse.json();
          
          if (result.generations && result.generations[0]) {
            console.log('[Image API] ✅ Stable Horde succeeded');
            return res.status(200).json({
              imageUrl: result.generations[0].img,
              provider: 'stablehorde',
              model: 'stable-diffusion',
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

  // PRIORITY 2: Craiyon (unlimited, ad-supported) - FASTER
  try {
    console.log('[Image API] Trying Craiyon (fast, unlimited fallback)');
    const response = await fetch('https://api.craiyon.com/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        model: 'art', // Faster than photo model
        negative_prompt: NEGATIVE_PROMPT,
        version: '35s5hfwn9n78gb06',
      }),
      signal: AbortSignal.timeout(90000), // 90s timeout
    });

    if (response.ok) {
      const data = await response.json();
      if (data.images && data.images.length > 0) {
        console.log('[Image API] ✅ Craiyon succeeded');
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
