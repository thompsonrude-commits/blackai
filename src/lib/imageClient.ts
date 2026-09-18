import { GenerationStage, GeneratedImage, buildFinalImagePrompt } from './imageService';
import { generateImageWithPuter, isPuterAvailable } from './puterImageService';

export async function generateImage(prompt: string, options?: { preferredProviders?: string[]; allowFallback?: boolean }, onStage?: (stage: GenerationStage) => void): Promise<GeneratedImage> {
  onStage?.('analyzing');
  await new Promise((r) => setTimeout(r, 120));
  onStage?.('expanding');

  // PRIORITY 1: Backend API (Jimeng → Z-Image, truly FREE for users)
  try {
    onStage?.('planning');
    console.log('[ImageClient] Using backend API (Jimeng/Z-Image - FREE)');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { auth } = await import('./firebase');
      if (auth?.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch (e) {
      // ignore token acquisition errors
    }

    const bodyPayload: any = { prompt };
    if (options?.preferredProviders) bodyPayload.preferredProviders = options.preferredProviders;
    if (typeof options?.allowFallback === 'boolean') bodyPayload.allowFallback = options.allowFallback;

    onStage?.('generating_candidates');
    const resp = await fetch('/api/v1/image/generate', { method: 'POST', headers, body: JSON.stringify(bodyPayload) });
    
    if (!resp.ok) {
      let errMsg = `Generation failed: ${resp.status}`;
      try {
        const body = await resp.json();
        if (body?.error) errMsg = body.error;
      } catch (e) {}
      throw new Error(errMsg);
    }

    const data = await resp.json();
    if (!data) throw new Error('No response from image generation endpoint');

    onStage?.('rendering');
    
    if (data.generationId) {
      return {
        id: data.generationId,
        prompt,
        imageUrl: data.mediaUrl || '',
        generatedAt: Date.now(),
        model: data.model || data.provider || 'unknown',
        provider: data.provider || null,
        metadata: data,
      } as GeneratedImage;
    }

    if (data.mediaUrl || data.imageUrl) {
      return {
        id: `img_${Date.now()}`,
        prompt,
        imageUrl: data.mediaUrl || data.imageUrl,
        generatedAt: Date.now(),
        model: data.model || data.provider || 'unknown',
        provider: data.provider || null,
        metadata: data,
      } as GeneratedImage;
    }

    throw new Error('Image generation returned no mediaUrl or generationId');
  } catch (err: any) {
    console.warn('[imageClient] generateImage failed:', err?.message || err);
    throw err;
  }
}

export { buildFinalImagePrompt };
