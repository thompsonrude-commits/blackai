import { GenerationStage, GeneratedImage, buildFinalImagePrompt } from './imageService';
import { normalizeImageResponse } from './imageResponse';

export async function generateImage(
  prompt: string,
  options?: { preferredProviders?: string[]; allowFallback?: boolean },
  onStage?: (stage: GenerationStage) => void,
): Promise<GeneratedImage> {
  onStage?.('analyzing');
  await new Promise((r) => setTimeout(r, 120));
  onStage?.('expanding');

  // Call Vercel API backend (unlimited-first providers)
  try {
    onStage?.('planning');
    console.log('[ImageClient] Using Vercel API backend (public provider routing)');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { auth } = await import('./firebase');
      if (auth?.currentUser && !auth.currentUser.isAnonymous) {
        const idToken = await auth.currentUser.getIdToken();
        if (idToken) headers['Authorization'] = 'Bearer ' + idToken;
      }
    } catch (e) {
      console.warn('[ImageClient] Failed to attach Firebase token for image generation:', e);
    }

    const bodyPayload: any = { prompt };
    if (options?.preferredProviders) bodyPayload.preferredProviders = options.preferredProviders;
    if (typeof options?.allowFallback === 'boolean') bodyPayload.allowFallback = options.allowFallback;

    onStage?.('generating_candidates');

    // Try the Vercel API endpoint
    const resp = await fetch('/api/v1/image/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    if (!resp.ok) {
      let errMsg = `Generation failed: ${resp.status}`;
      try {
        const body = await resp.json();
        if (body?.error) errMsg = body.error;
      } catch (e) {
        // Ignore JSON parse errors and fall back to the status message.
      }
      throw new Error(errMsg);
    }

    const data = await resp.json();
    if (!data) throw new Error('No response from image generation endpoint');

    onStage?.('rendering');

    const normalized = normalizeImageResponse(data);
    if (!normalized) {
      throw new Error('Image endpoint returned no image data');
    }

    return {
      id: `img_${Date.now()}`,
      prompt,
      imageUrl: normalized.imageUrl,
      generatedAt: Date.now(),
      model: data.model || 'unknown',
      provider: data.provider || null,
      metadata: data,
    } as GeneratedImage;
  } catch (err: any) {
    console.error('[ImageClient] Image generation failed:', err?.message || err);
    throw new Error(`Image generation unavailable: ${err?.message || 'Unknown error'}`);
  }
}

export { buildFinalImagePrompt };

