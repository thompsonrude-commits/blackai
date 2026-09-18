/**
 * Stable Horde (AI Horde) Provider
 * 
 * TRULY UNLIMITED - Community-powered distributed computing
 * 
 * How it works:
 * - Volunteers donate spare GPU power
 * - Queue-based system (anonymous users = lowest priority)
 * - Non-profit, registered ASBL in Luxembourg
 * - 170M+ images generated since 2022
 * 
 * Quality: Stable Diffusion models (good quality)
 * Speed: 30 seconds to 5 minutes (variable, depends on queue)
 * Limits: NONE - truly unlimited forever
 * Cost: FREE - no charges ever
 * 
 * API: https://stablehorde.net
 * Docs: https://github.com/Haidra-Org/AI-Horde
 */

import fetch from 'node-fetch';

const STABLE_HORDE_API = 'https://stablehorde.net/api/v2';
const ANONYMOUS_API_KEY = '0000000000'; // 10 zeros = anonymous access

interface StableHordeGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler_name?: string;
  seed?: string;
}

interface StableHordeSubmitResponse {
  id: string;
  kudos: number;
  message?: string;
}

interface StableHordeCheckResponse {
  finished: number;
  processing: number;
  restarted: number;
  waiting: number;
  done: boolean;
  faulted: boolean;
  wait_time: number;
  queue_position: number;
  kudos: number;
  is_possible: boolean;
  generations?: Array<{
    img: string; // base64 image
    seed: string;
    id: string;
    censored: boolean;
  }>;
}

/**
 * Generate image using Stable Horde
 * Returns base64-encoded image
 */
export async function generateImage(params: StableHordeGenerationParams): Promise<string> {
  const {
    prompt,
    width = 512, // Start smaller for faster queue
    height = 512,
    steps = 30,
    cfg_scale = 7.5,
    sampler_name = 'k_euler_a',
  } = params;

  try {
    console.log('[StableHorde] Submitting generation request...');
    
    // Step 1: Submit generation request
    const submitResponse = await fetch(`${STABLE_HORDE_API}/generate/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANONYMOUS_API_KEY,
      },
      body: JSON.stringify({
        prompt,
        params: {
          width,
          height,
          steps,
          cfg_scale,
          sampler_name,
          seed_variation: 1,
          post_processing: [],
          karras: true,
          tiling: false,
          hires_fix: false,
          clip_skip: 1,
          n: 1, // Number of images
        },
        nsfw: false,
        trusted_workers: false,
        slow_workers: true, // Allow slower workers for higher availability
        censor_nsfw: false,
        workers: [],
        worker_blacklist: false,
        models: ['stable_diffusion'], // Use any Stable Diffusion model
        r2: true, // Use R2 for faster image delivery
        shared: false,
        replacement_filter: true,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`StableHorde submission failed: ${submitResponse.status} ${errorText}`);
    }

    const submitData = await submitResponse.json() as StableHordeSubmitResponse;
    const generationId = submitData.id;

    if (!generationId) {
      throw new Error('StableHorde: No generation ID returned');
    }

    console.log(`[StableHorde] Generation queued: ${generationId}`);
    if (submitData.message) {
      console.log(`[StableHorde] Message: ${submitData.message}`);
    }

    // Step 2: Poll for completion
    let attempts = 0;
    const maxAttempts = 120; // 120 attempts × 3s = 6 minutes max wait
    const pollInterval = 3000; // 3 seconds

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      const checkResponse = await fetch(`${STABLE_HORDE_API}/generate/check/${generationId}`, {
        method: 'GET',
      });

      if (!checkResponse.ok) {
        console.warn(`[StableHorde] Check failed: ${checkResponse.status}`);
        continue;
      }

      const checkData = await checkResponse.json() as StableHordeCheckResponse;

      // Log progress
      if (attempts % 5 === 0) { // Every 15 seconds
        console.log(`[StableHorde] Queue position: ${checkData.queue_position}, Wait time: ~${checkData.wait_time}s`);
      }

      if (checkData.done && checkData.generations && checkData.generations.length > 0) {
        console.log(`[StableHorde] ✅ Generation complete after ${attempts * (pollInterval / 1000)}s`);
        
        const generation = checkData.generations[0];
        
        if (generation.censored) {
          console.warn('[StableHorde] Image was censored by worker');
        }

        // Image comes as base64, return as data URL
        const base64Image = generation.img;
        return `data:image/webp;base64,${base64Image}`;
      }

      if (checkData.faulted) {
        throw new Error('StableHorde generation faulted');
      }

      if (!checkData.is_possible) {
        throw new Error('StableHorde: Generation not possible with current workers');
      }

      // Still processing, continue polling
    }

    throw new Error('StableHorde generation timeout after 6 minutes');
  } catch (error: any) {
    console.error('[StableHorde] Error:', error.message);
    throw error;
  }
}

/**
 * Check if Stable Horde is available
 */
export async function isAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${STABLE_HORDE_API}/status/heartbeat`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get current horde statistics (optional, for monitoring)
 */
export async function getStats() {
  try {
    const response = await fetch(`${STABLE_HORDE_API}/status/performance`, {
      method: 'GET',
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('[StableHorde] Could not fetch stats:', error);
  }
  return null;
}

export default {
  generateImage,
  isAvailable,
  getStats,
};
