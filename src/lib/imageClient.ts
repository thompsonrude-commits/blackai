import { GenerationStage, GeneratedImage, buildFinalImagePrompt } from './imageService';
import { generateImageWithPuter, isPuterAvailable } from './puterImageService';

export async function generateImage(prompt: string, options?: { preferredProviders?: string[]; allowFallback?: boolean }, onStage?: (stage: GenerationStage) => void): Promise<GeneratedImage> {
  onStage?.('analyzing');
  await new Promise((r) => setTimeout(r, 120));
  onStage?.('expanding');

  // PRIORITY: Try Puter.js first (Chinese app approach - truly free, client-side)
  try {
    onStage?.('planning');
    
    const puterAvailable = await isPuterAvailable();
    if (puterAvailable) {
      console.log('[ImageClient] Using Puter.js (free unlimited)');
      onStage?.('generating_candidates');
      
      // Detect if prompt needs text rendering
      const needsText = prompt.toLowerCase().match(/text|word|letter|sign|banner|poster|quote|caption|title/);
      
      const imageUrl = await generateImageWithPuter(prompt, {
        model: needsText ? 'qwen-image' : 'flux-dev',
        quality: 'high',
        width: 1024,
        height: 1024,
      });

      onStage?.('rendering');
      
      return {
        id: `puter_${Date.now()}`,
        prompt,
        imageUrl,
        generatedAt: Date.now(),
        model: needsText ? 'qwen-image-2.0-pro' : 'flux-2-dev',
        provider: 'puter',
        metadata: { source: 'puter.js', free: true, unlimited: true },
      };
    }
  } catch (puterErr: any) {
    console.warn('[ImageClient] Puter.js failed, falling back:', puterErr?.message);
  }

  // FALLBACK: Try backend API
  try {
    onStage?.('planning');

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
