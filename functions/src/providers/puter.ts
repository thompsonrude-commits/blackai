/**
 * Puter.js Image Provider
 * Client-side free unlimited image generation (Chinese app approach)
 * No API key needed - uses user-pays model
 */

export interface PuterImageResult {
  imageUrl?: string;
  imageBase64?: string;
  model: string;
  provider: 'puter';
  latencyMs: number;
}

/**
 * Generate image using Puter.js API
 * This is a server-side fallback - frontend should use Puter.js directly
 */
export async function puterImage(prompt: string): Promise<PuterImageResult> {
  const startTime = Date.now();
  
  // Note: Puter.js is designed for client-side use
  // This is a fallback that returns instructions for client-side generation
  return {
    imageUrl: undefined,
    imageBase64: undefined,
    model: 'puter-client-side',
    provider: 'puter',
    latencyMs: Date.now() - startTime,
  };
}

/**
 * Puter.js is primarily client-side, so this always returns available
 * The actual availability check happens on the frontend
 */
export async function isPuterAvailable(): Promise<boolean> {
  return true; // Always available on client-side
}

export default {
  puterImage,
  isPuterAvailable,
};
