import { GenerationStage, GeneratedImage, buildFinalImagePrompt } from './imageService';
// Puter.js removed - using Vercel API backend with unlimited-first strategy

export async function generateImage(prompt: string, options?: { preferredProviders?: string[]; allowFallback?: boolean }, onStage?: (stage: GenerationStage) => void): Promise<GeneratedImage> {
  onStage?.('analyzing');
  await new Promise((r) => setTimeout(r, 120));
  onStage?.('expanding');

  // Call Vercel API backend (Stable Horde → Craiyon → Z-Image → Jimeng)
  try {
    onStage?.('planning');
    console.log('[ImageClient] Using Vercel API backend (unlimited-first providers)');

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
    
    // Try the Vercel API endpoint
    const resp = await fetch('/api/image', { 
      method: 'POST', 
      headers, 
      body: JSON.stringify(bodyPayload) 
    });
    
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
    
    return {
      id: `img_${Date.now()}`,
      prompt,
      imageUrl: data.imageUrl,
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
