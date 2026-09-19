// Image generation with unlimited-first fallback chain
// Priority: Stable Horde (photorealistic) → Jimeng → Craiyon → Z-Image
// NO POLLINATIONS - per user request

// Detect if prompt requests text on image (signs, posters, labels, etc.)
function detectTextRequest(prompt) {
  const lower = prompt.toLowerCase();
  const textPatterns = [
    /\b(sign|poster|banner|label|text|writing|words?|letters?|saying|reading|displaying)\b/i,
    /\b(bearing|with|showing|that says|labeled|titled)\b.*["']/i,
    /["'].*["']/  // Quoted text
  ];
  return textPatterns.some(pattern => pattern.test(lower));
}

// Extract text content from prompt
function extractTextContent(prompt) {
  const matches = prompt.match(/["']([^"']+)["']/g);
  if (matches) {
    return matches.map(m => m.replace(/["']/g, '')).join(' ');
  }
  
  // Also try common patterns like "bearing X", "saying X", "reading X"
  const bearingMatch = prompt.match(/\b(?:bearing|saying|reading|displaying|showing|with text)\s+(.+?)(?:\s+street|$)/i);
  if (bearingMatch) {
    return bearingMatch[1].trim();
  }
  
  return null;
}

// Remove text-related phrases from prompt (AI can't generate readable text)
function removeTextInstructions(prompt) {
  let cleaned = prompt
    .replace(/\b(bearing|saying|reading|displaying|showing|with text|that says|labeled|titled)\s+["']?[^"',\.]+["']?/gi, '')
    .replace(/["'][^"']+["']/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  // Clean up artifacts
  cleaned = cleaned.replace(/\s+of\s+a\s+of/, ' of');
  cleaned = cleaned.replace(/\s+of\s+$/, '');
  
  return cleaned;
}

// Intelligent prompt enhancement for photorealism
function enhancePrompt(userPrompt) {
  let cleaned = userPrompt.trim();
  const lower = cleaned.toLowerCase();
  
  // Check if user wants text on image
  const hasTextRequest = detectTextRequest(cleaned);
  const textContent = hasTextRequest ? extractTextContent(cleaned) : null;
  
  // Remove text instructions since AI can't generate readable text
  if (hasTextRequest) {
    cleaned = removeTextInstructions(cleaned);
    console.log('[Image API] Removed text request. Original:', userPrompt);
    console.log('[Image API] Cleaned prompt:', cleaned);
    if (textContent) {
      console.log('[Image API] ⚠️ Text content removed (AI cannot generate readable text):', textContent);
    }
  }
  
  const hasQualityKeywords = /\b(detailed|realistic|high quality|photorealistic|professional|photograph)\b/i.test(cleaned);
  if (hasQualityKeywords) return { prompt: cleaned, hasText: hasTextRequest, textContent };
  
  const isSign = /\b(sign|signage|road sign|street sign|warning sign|billboard)\b/i.test(lower);
  const isAnimal = /\b(dog|cat|horse|cow|lion|tiger|elephant|animal|bird|wildlife|pet|zebra|giraffe|bear)\b/i.test(lower);
  const isPerson = /\b(person|man|woman|people|human|portrait|face|manager|executive|professional|businessman|businesswoman)\b/i.test(lower);
  const isLandscape = /\b(landscape|scenery|forest|mountain|beach|sunset|sunrise|nature|river|ocean|savana|savanna|desert)\b/i.test(lower);
  const isBuilding = /\b(building|office|house|room|interior|desk|workspace|architecture)\b/i.test(lower);
  
  let enhanced = cleaned;
  
  if (isSign) {
    enhanced = cleaned + ', professional product photography, photorealistic, clean modern design, sharp focus, studio lighting, ultra detailed, 8k resolution, clear and legible';
  } else if (isAnimal) {
    enhanced = cleaned + ', award-winning wildlife photography, photorealistic, ultra detailed fur and skin texture, natural habitat, dramatic lighting, National Geographic quality, Canon EOS R5, 400mm lens, 8k, sharp focus, depth of field';
  } else if (isPerson) {
    enhanced = cleaned + ', professional portrait photography, photorealistic, natural skin texture with visible pores, studio lighting setup, real person, ultra high detail, full body in frame, Canon EOS 5D, 85mm f/1.4 lens, 8k resolution, perfect composition';
  } else if (isLandscape) {
    enhanced = cleaned + ', breathtaking landscape photography, photorealistic, golden hour lighting, vivid colors, National Geographic style, ultra sharp details, wide angle, 8k resolution, professional DSLR';
  } else if (isBuilding) {
    enhanced = cleaned + ', professional architectural photography, photorealistic, perfect lighting, ultra detailed, sharp focus, clean composition, 8k resolution, full frame visible';
  } else {
    enhanced = cleaned + ', professional photography, photorealistic, ultra high detail, perfect lighting, sharp focus, 8k resolution, masterpiece';
  }
  
  return { prompt: enhanced, hasText: hasTextRequest, textContent };
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
  const promptResult = enhancePrompt(userPrompt);
  const prompt = typeof promptResult === 'string' ? promptResult : promptResult.prompt;
  const hasTextRequest = typeof promptResult === 'object' ? promptResult.hasText : false;
  const textContent = typeof promptResult === 'object' ? promptResult.textContent : null;
  const startTime = Date.now();
  
  console.log('[Image API] User prompt:', userPrompt);
  console.log('[Image API] Enhanced:', prompt);
  
  if (hasTextRequest) {
    console.log('[Image API] ⚠️ WARNING: User requested text on image');
    console.log('[Image API] ⚠️ AI image generators cannot create readable text');
    if (textContent) {
      console.log('[Image API] ⚠️ Requested text:', textContent);
    }
  }
  
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
          width: 768,
          height: 768,
          steps: 40,
          cfg_scale: 9,
          sampler_name: 'k_dpmpp_2m',
          karras: true,
          hires_fix: true,
          clip_skip: 2,
        },
        nsfw: false,
        trusted_workers: true,
        slow_workers: true,
        models: ['Realistic_Vision_V5.1', 'Deliberate', 'DreamShaper'],
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
              warning: hasTextRequest ? 'AI cannot generate readable text. Text was removed from prompt.' : undefined,
              requestedText: textContent || undefined,
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
    const response = await fetch(`https://jimeng.jianying.com/ai-platform/api/v1/text2image?prompt=${encodedPrompt}&model=jimeng-4.5&resolution=4k&ratio=1:1`, {
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
          warning: hasTextRequest ? 'AI cannot generate readable text. Text was removed from prompt.' : undefined,
          requestedText: textContent || undefined,
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
              warning: hasTextRequest ? 'AI cannot generate readable text. Text was removed from prompt.' : undefined,
              requestedText: textContent || undefined,
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
          warning: hasTextRequest ? 'AI cannot generate readable text. Text was removed from prompt.' : undefined,
          requestedText: textContent || undefined,
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
              warning: hasTextRequest ? 'AI cannot generate readable text. Text was removed from prompt.' : undefined,
              requestedText: textContent || undefined,
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
          warning: hasTextRequest ? 'AI cannot generate readable text. Text was removed from prompt.' : undefined,
          requestedText: textContent || undefined,
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
