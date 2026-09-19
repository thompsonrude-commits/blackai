// Image generation - Jimeng AI (ByteDance) - Fast & Reliable
// Intelligent prompt enhancement for better quality

function enhancePrompt(userPrompt) {
  const cleaned = userPrompt.trim();
  
  // If prompt is already detailed, use as-is
  const hasQualityKeywords = /\b(detailed|realistic|high quality|photorealistic|professional|4k|8k|hd|masterpiece)\b/i.test(cleaned);
  if (hasQualityKeywords) {
    return cleaned;
  }
  
  // Detect subject type for appropriate enhancement
  const isPortrait = /\b(person|man|woman|face|portrait|people|human)\b/i.test(cleaned);
  const isAnimal = /\b(dog|cat|horse|animal|bird|wildlife|pet)\b/i.test(cleaned);
  const isLandscape = /\b(landscape|scenery|mountain|ocean|forest|nature|sky|sunset|sunrise)\b/i.test(cleaned);
  const isObject = /\b(car|vehicle|building|house|product|furniture|tool)\b/i.test(cleaned);
  
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
  
  // Jimeng AI (ByteDance) - Fast, reliable, 80-100 images/day
  try {
    console.log('[Image API] Using Jimeng (ByteDance)');
    const response = await fetch('https://aiapi.talkface.com/jmai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.imageBase64) {
        console.log('[Image API] ✅ Image generated successfully');
        return res.status(200).json({
          imageUrl: data.imageBase64,
          provider: 'jimeng',
          model: 'jimeng-4.5',
          latencyMs: Date.now() - startTime,
        });
      }
    }
    
    console.error('[Image API] Jimeng returned invalid response');
  } catch (error) {
    console.error('[Image API] Image generation failed:', error.message);
  }

  // All providers failed
  return res.status(503).json({
    error: 'Image generation is currently unavailable. Please try again.',
    provider: 'jimeng',
  });
};
