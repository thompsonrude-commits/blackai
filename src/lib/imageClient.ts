import { GenerationStage, GeneratedImage, buildFinalImagePrompt } from './imageService';
import { generateImageWithPuter, isPuterAvailable } from './puterImageService';

export async function generateImage(prompt: string, options?: { preferredProviders?: string[]; allowFallback?: boolean }, onStage?: (stage: GenerationStage) => void): Promise<GeneratedImage> {
  onStage?.('analyzing');
  await new Promise((r) => setTimeout(r, 120));
  onStage?.('expanding');

  // PRIORITY 1: Backend API (Stable Horde → Craiyon → Z-Image → Jimeng)
  try {
    onStage?.('planning');
    console.log('[ImageClient] Trying backend API (unlimited-first providers)');

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
  } catch (backendError: any) {
    console.warn('[ImageClient] Backend failed:', backendError?.message);
    
    // FALLBACK: Try Puter.js client-side (user-pays model)
    try {
      console.log('[ImageClient] Falling back to Puter.js (user-pays)');
      onStage?.('generating_candidates');
      
      const imageDataUrl = await generateImageWithPuter(prompt, {
        model: 'flux-dev',
        quality: 'medium',
      });

      return {
        id: `puter_${Date.now()}`,
        prompt,
        imageUrl: imageDataUrl, // Data URL from Puter.js
        generatedAt: Date.now(),
        model: 'puter-flux-dev',
        provider: 'puter',
        metadata: { source: 'client-side', userPays: true },
      } as GeneratedImage;
    } catch (puterError: any) {
      console.error('[ImageClient] Puter.js also failed:', puterError?.message);
      throw new Error(`Image generation unavailable: Backend offline and Puter.js failed (${puterError?.message})`);
    }
  }
}

export { buildFinalImagePrompt };
