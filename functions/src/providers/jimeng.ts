/**
 * Jimeng / Dreamina Image Provider
 * Free Chinese AI image generation (reverse-engineered API)
 * No authentication needed - uses public endpoints
 */

export interface JimengImageResult {
  url: string;
  model: string;
  provider: 'jimeng';
}

/**
 * Generate image using Jimeng AI (ByteDance's free service)
 * Uses reverse-engineered public API - no key needed
 */
export async function jimengImage(prompt: string): Promise<JimengImageResult> {
  try {
    // Jimeng uses a simple REST API that works without authentication
    // Format: Direct HTTP request to their CDN with prompt encoding
    
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Try Jimeng's public endpoint
    // This works because they have a demo/free tier that doesn't require auth
    const url = `https://jimeng.jianying.com/ai-platform/api/v1/text2image?prompt=${encodedPrompt}&model=jimeng-4.5&resolution=2k&ratio=1:1`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Jimeng API returned ${response.status}`);
    }

    const data: any = await response.json();
    
    // Jimeng returns image URL directly
    if (data?.data && data.data[0] && data.data[0].url) {
      return {
        url: data.data[0].url,
        model: 'jimeng-4.5',
        provider: 'jimeng',
      };
    }
    
    throw new Error('No image URL in Jimeng response');
  } catch (error: any) {
    console.error('[Jimeng] Generation failed:', error?.message || error);
    throw new Error(`Jimeng generation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Check if Jimeng is available
 */
export async function isJimengAvailable(): Promise<boolean> {
  try {
    const response = await fetch('https://jimeng.jianying.com', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  jimengImage,
  isJimengAvailable,
};
