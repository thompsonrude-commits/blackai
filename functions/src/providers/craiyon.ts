/**
 * Craiyon (DALL-E Mini) Provider
 * 
 * TRULY UNLIMITED - Ad-supported, free forever
 * 
 * Model: DALL-E Mini (2022 model)
 * Quality: Lower than modern models (old architecture)
 * Speed: ~60 seconds per generation
 * Resolution: 256x256 base (can upscale)
 * Limits: NONE - truly unlimited
 * Cost: FREE - no charges, ad-supported
 * 
 * Best for: Emergency fallback when all else fails
 * Weaknesses: Faces, hands, text rendering, photorealism
 * 
 * Website: craiyon.com
 */

import fetch from 'node-fetch';

const CRAIYON_API = 'https://api.craiyon.com';
const REQUEST_TIMEOUT_MS = 8_000;

interface CraiyonGenerationParams {
  prompt: string;
  version?: 'v3' | 'v2' | 'v1'; // v3 = newest
  negative_prompt?: string;
}

interface CraiyonResponse {
  images: string[]; // Array of base64 images
  next_prompt?: string;
  created?: number;
}

/**
 * Generate image using Craiyon (DALL-E Mini)
 * Returns base64-encoded image
 */
export async function generateImage(params: CraiyonGenerationParams): Promise<string> {
  const {
    prompt,
    version = 'v3',
    negative_prompt = 'blurry, distorted, low quality, watermark',
  } = params;

  try {
    console.log('[Craiyon] Generating image...');
    
    const response = await fetch(`${CRAIYON_API}/v3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        token: null, // Anonymous access
        model: version === 'v3' ? 'art' : 'photo', // art model = better quality
        negative_prompt,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Craiyon generation failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as CraiyonResponse;

    if (!data.images || data.images.length === 0) {
      throw new Error('Craiyon: No images returned');
    }

    console.log(`[Craiyon] ✅ Generated ${data.images.length} images`);

    // Return first image as base64 data URL
    // Craiyon returns raw base64, need to add data URL prefix
    const base64Image = data.images[0];
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (error: any) {
    console.error('[Craiyon] Error:', error.message);
    throw error;
  }
}

/**
 * Check if Craiyon is available
 */
export async function isAvailable(): Promise<boolean> {
  try {
    // Simple connectivity check
    const response = await fetch('https://www.craiyon.com', {
      method: 'HEAD',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  generateImage,
  isAvailable,
};
