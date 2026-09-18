import type { ProviderId } from '../types';
import { huggingfaceVideo } from '../providers/huggingface';
import { generateImageNative, checkNativeAIAvailable, classifyImageType, enhancePromptForQuality } from './nativeAIEngine';

export interface MediaGenerationRequest {
  kind: 'image' | 'video' | 'audio' | 'text-to-video';
  prompt?: string;
  preferredProviders?: ProviderId[];
  allowFallback?: boolean;
}

export interface MediaGenerationResult {
  kind: 'image' | 'video' | 'audio' | 'text-to-video';
  provider: ProviderId;
  model: string;
  latencyMs: number;
  imageBase64?: string;
  mediaUrl?: string;
  // When a provider succeeds after one or more failures, indicate the original requested provider and reason
  fallbackFrom?: string; // e.g., 'gemini'
  fallbackReason?: string; // e.g., 'NOT_CONFIGURED' | 'AUTH_FAILED' | 'ERROR'
}

export async function generateMedia(request: MediaGenerationRequest): Promise<MediaGenerationResult> {
  const startTime = Date.now();
  
  // Handle audio generation (local deterministic mock first)
  if (request.kind === 'audio') {
    try {
      // Try to use local deterministic mock provider if available
      try {
        const mod = await import('../providers/localAudioMock');
        const res = await mod.generateAudio(request.prompt, { lyrics: (request as any).lyrics, genre: (request as any).genre });
        const latencyMs = Date.now() - startTime;
        return {
          kind: 'audio',
          provider: 'local-audio-mock' as ProviderId,
          model: res.model || 'local-mock',
          latencyMs,
          mediaUrl: undefined,
          imageBase64: undefined,
          // Attach audioBase64 directly (caller can construct data URL)
          audioBase64: res.audioBase64 as any,
        } as any;
      } catch (innerErr) {
        console.warn('[MediaEngine] local-audio-mock not available or failed:', innerErr);
        // Fall through to provider chain if implemented later
      }
    } catch (e) {
      console.error('[MediaEngine] audio generation failed:', e);
      throw new Error('Audio generation failed');
    }
  }

  // Handle image generation
  // ARCHITECTURE: Native GPU (PRIMARY) → OpenRouter DALL-E 3 (Fallback 1) → Pollinations (Fallback 2)
  if (request.kind === 'image' && request.prompt) {
    // Improve prompt understanding: classify and enhance prompt for the best model selection and quality modifiers
    const imageType = classifyImageType(request.prompt!);
    let promptToUse = request.prompt!;
    try {
      promptToUse = enhancePromptForQuality(request.prompt!, imageType);
      console.log('[MediaEngine] Enhanced prompt for quality:', promptToUse.slice(0,200));
    } catch (e) {
      console.warn('[MediaEngine] Prompt enhancement failed, using original prompt');
    }

    // Respect configuration: when ComfyUI is explicitly enabled and configured as the image provider,
    // do NOT fall back to other providers. Fail honestly if ComfyUI is unavailable.
    const comfyMode = (process.env.COMFYUI_ENABLED === 'true') || (process.env.IMAGE_PROVIDER === 'comfyui');

    if (comfyMode) {
      try {
        // Only attempt native generation and return an explicit failure if it is unavailable
        console.log('[MediaEngine] COMFYUI mode enabled — using ComfyUI as authoritative provider');
        const available = await checkNativeAIAvailable();
        if (!available) {
          throw new Error('ComfyUI not available');
        }

        const result = await generateImageNative({ prompt: promptToUse, width: 1024, height: 1024 });
        const latencyMs = Date.now() - startTime;

        // Return canonical result
        return {
          kind: 'image',
          provider: 'native-gpu',
          model: result.model,
          latencyMs,
          imageBase64: (result as any).imageBase64,
          mediaUrl: undefined,
        } as any;
      } catch (err: any) {
        console.error('[MediaEngine] ComfyUI (authoritative) failed:', err?.message || err);
        // Per requirements, do not fall back — surface an error to caller
        throw new Error('ComfyUI image generation is currently unavailable.');
      }
    }

    // SIMPLIFIED ARCHITECTURE: Puter.js (client-side) + Jimeng (backend only)
    // Frontend tries Puter.js first, backend only provides Jimeng fallback
    console.log('[MediaEngine] Using Jimeng (free Chinese AI, no auth needed)');
    
    try {
      const { jimengImage } = await import('../providers/jimeng');
      const result = await jimengImage(promptToUse);
      const latencyMs = Date.now() - startTime;
      
      return {
        kind: 'image',
        provider: 'jimeng',
        model: result.model,
        latencyMs,
        imageBase64: undefined,
        mediaUrl: result.url,
      };
    } catch (err: any) {
      console.error('[MediaEngine] Jimeng failed:', err?.message || err);
      throw new Error('Image generation failed - Jimeng unavailable');
    }
  }

  // Handle video generation (text-to-video)
  if (request.kind === 'text-to-video' && request.prompt) {
    // Try FREE Pollinations video first
    try {
      console.log('[MediaEngine] Trying Pollinations for video generation (FREE)');
      const { pollinationsVideo } = await import('../providers/pollinations');
      const result = await pollinationsVideo(request.prompt);
      const latencyMs = Date.now() - startTime;
      console.log(`[MediaEngine] Success with Pollinations in ${latencyMs}ms`);
      
      return {
        kind: 'text-to-video',
        provider: 'pollinations',
        model: result.model,
        latencyMs,
        mediaUrl: result.videoUrl,
      };
    } catch (pollinationsErr: any) {
      console.warn('[MediaEngine] Pollinations video failed:', pollinationsErr.message);
      
      // Fallback to HuggingFace if available
      try {
        console.log('[MediaEngine] Trying HuggingFace for video generation');
        const result = await huggingfaceVideo(request.prompt);
        const latencyMs = Date.now() - startTime;
        console.log(`[MediaEngine] Success with HuggingFace in ${latencyMs}ms`);
        
        return {
          kind: 'text-to-video',
          provider: 'huggingface',
          model: result.model,
          latencyMs,
          mediaUrl: result.videoUrl,
        };
      } catch (hfErr: any) {
        console.error('[MediaEngine] HuggingFace video failed:', hfErr.message);
        throw new Error(`Video generation failed: ${hfErr.message}`);
      }
    }
  }

  throw new Error(`${request.kind} generation is unavailable: no provider returned a real output`);
}
