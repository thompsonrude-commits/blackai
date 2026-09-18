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

  // Handle image generation.
  if (request.kind === 'image' && request.prompt) {
    const imageType = classifyImageType(request.prompt!);
    let promptToUse = request.prompt!;
    try {
      promptToUse = enhancePromptForQuality(request.prompt!, imageType);
      console.log('[MediaEngine] Enhanced prompt for quality:', promptToUse.slice(0, 200));
    } catch (e) {
      console.warn('[MediaEngine] Prompt enhancement failed, using original prompt');
    }

    const comfyMode = (process.env.COMFYUI_ENABLED === 'true') || (process.env.IMAGE_PROVIDER === 'comfyui');

    if (comfyMode) {
      try {
        console.log('[MediaEngine] COMFYUI mode enabled — using ComfyUI as authoritative provider');
        const available = await checkNativeAIAvailable();
        if (!available) {
          throw new Error('ComfyUI not available');
        }

        const result = await generateImageNative({ prompt: promptToUse, width: 1024, height: 1024 });
        const latencyMs = Date.now() - startTime;

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
        throw new Error('ComfyUI image generation is currently unavailable.');
      }
    }

    try {
      console.log('[MediaEngine] Trying Jimeng AI (ByteDance - FREE, no auth)');
      const { jimengImage } = await import('../providers/jimeng');
      const result = await jimengImage(promptToUse);
      return {
        kind: 'image',
        provider: 'jimeng',
        model: result.model,
        latencyMs: Date.now() - startTime,
        imageBase64: undefined,
        mediaUrl: result.url,
      };
    } catch (jimengError: any) {
      console.warn('[MediaEngine] Jimeng failed, trying Z-Image:', jimengError.message);
      
      // Try Z-Image (Alibaba) as fallback
      try {
        console.log('[MediaEngine] Trying Z-Image Turbo (Alibaba - FREE, no auth)');
        const { generateImage: zImageGenerate } = await import('../providers/zimage');
        const imageBase64 = await zImageGenerate({ prompt: promptToUse });
        return {
          kind: 'image',
          provider: 'zimage',
          model: 'z-image-turbo',
          latencyMs: Date.now() - startTime,
          imageBase64,
          mediaUrl: undefined,
        };
      } catch (zimageError: any) {
        const reason = zimageError instanceof Error ? zimageError.message : String(zimageError);
        console.error('[MediaEngine] All free image providers unavailable:', reason);
        throw new Error(`Image provider unavailable: Jimeng and Z-Image both failed`);
      }
    }
  }

  // Handle video generation (text-to-video)
  if (request.kind === 'text-to-video' && request.prompt) {
    // Try Kling AI first (Chinese free provider with cookie auth)
    try {
      console.log('[MediaEngine] Trying Kling AI for video generation (FREE with cookie)');
      const { klingVideo } = await import('../providers/kling');
      const result = await klingVideo(request.prompt, {
        highQuality: false, // Use standard quality for speed
        duration: 5,
        aspectRatio: '16:9',
      });
      const latencyMs = Date.now() - startTime;
      console.log(`[MediaEngine] Success with Kling AI in ${latencyMs}ms`);

      return {
        kind: 'text-to-video',
        provider: 'kling',
        model: result.model,
        latencyMs,
        mediaUrl: result.videoUrl,
      };
    } catch (klingErr: any) {
      console.warn('[MediaEngine] Kling AI video failed:', klingErr.message);
      
      // Fallback to HuggingFace if Kling fails
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
        throw new Error(`Video generation failed: Both Kling and HuggingFace unavailable`);
      }
    }
  }

  throw new Error(`${request.kind} generation is unavailable: no provider returned a real output`);
}
