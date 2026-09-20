/**
 * Z-Image (Alibaba Tongyi-MAI) Provider
 * 
 * TRULY FREE - No authentication, no charges to users
 * 
 * Model: Z-Image-Turbo (6B parameters)
 * Architecture: S3-DiT (Single-Stream Diffusion Transformer)
 * Resolution: Up to 1536x1536 (recommended: 1024x1024)
 * Speed: Sub-second on H800, 2-5s on consumer GPUs
 * License: Apache 2.0 (fully open-source)
 * 
 * Hosted by: ModelScope (Alibaba Cloud)
 * Cost: FREE - Unlimited compute provided by ModelScope
 * Rate Limits: ~50-100 generations/hour for free accounts
 * 
 * Best for: Photorealistic images, bilingual text rendering (Chinese + English)
 */

import fetch from 'node-fetch';

interface ZImageGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
}

interface ZImageTaskResponse {
  task_id: string;
  task_status?: string;
  output_images?: string[];
  error?: string;
}

const ZIMAGE_API_BASE = 'https://api-inference.modelscope.cn/v1';
const MODEL_ID = 'Tongyi-MAI/Z-Image-Turbo';
const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Generate image using Z-Image Turbo (Alibaba)
 * Asynchronous API - submit task, then poll for completion
 */
export async function generateImage(params: ZImageGenerationParams): Promise<string> {
  const {
    prompt,
    width = 1024,
    height = 1024,
    num_inference_steps = 9, // Optimal for Turbo variant
    guidance_scale = 0.0, // Turbo skips CFG
  } = params;

  try {
    // Step 1: Submit generation task
    console.log('[Z-Image] Submitting generation task...');
    
    const submitResponse = await fetch(`${ZIMAGE_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ModelScope-Async-Mode': 'true',
        ...(process.env.MODELSCOPE_TOKEN ? { Authorization: `Bearer ${process.env.MODELSCOPE_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL_ID,
        prompt,
        height,
        width,
        num_inference_steps,
        guidance_scale,
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Z-Image submission failed: ${submitResponse.status} ${errorText}`);
    }

    const submitData = await submitResponse.json() as ZImageTaskResponse;
    const taskId = submitData.task_id;

    if (!taskId) {
      throw new Error('Z-Image: No task_id returned');
    }

    console.log(`[Z-Image] Task submitted: ${taskId}`);

    // Step 2: Poll for completion
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts × 2s = 60s timeout
    const pollInterval = 2000; // 2 seconds

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;

      console.log(`[Z-Image] Polling attempt ${attempts}/${maxAttempts}...`);

      const statusResponse = await fetch(`${ZIMAGE_API_BASE}/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'X-ModelScope-Task-Type': 'image_generation',
          ...(process.env.MODELSCOPE_TOKEN ? { Authorization: `Bearer ${process.env.MODELSCOPE_TOKEN}` } : {}),
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!statusResponse.ok) {
        console.warn(`[Z-Image] Poll failed: ${statusResponse.status}`);
        continue;
      }

      const statusData = await statusResponse.json() as ZImageTaskResponse;

      if (statusData.task_status === 'SUCCEED' && statusData.output_images?.length) {
        const imageUrl = statusData.output_images[0];
        console.log('[Z-Image] ✅ Generation complete');

        // Download image and convert to base64
        const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.buffer();
        const base64 = imageBuffer.toString('base64');
        return `data:image/png;base64,${base64}`;
      }

      if (statusData.task_status === 'FAILED') {
        throw new Error(`Z-Image generation failed: ${statusData.error || 'Unknown error'}`);
      }

      // Still processing, continue polling
      console.log(`[Z-Image] Status: ${statusData.task_status || 'PENDING'}`);
    }

    throw new Error('Z-Image generation timeout after 60 seconds');
  } catch (error: any) {
    console.error('[Z-Image] Error:', error.message);
    throw error;
  }
}

/**
 * Check if Z-Image is available (no auth required, always available)
 */
export async function isAvailable(): Promise<boolean> {
  try {
    // Test connectivity to ModelScope API
    const response = await fetch(`${ZIMAGE_API_BASE}/models/${MODEL_ID}`, {
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
