/**
 * Puter.js Free Unlimited Image Generation
 * The same approach Chinese apps use - truly free, no API keys, no backend costs
 * User-pays model: each user covers their own AI usage through Puter account
 */

// Puter.js types
interface PuterAI {
  txt2img: (prompt: string, options?: {
    model?: string;
    quality?: 'low' | 'medium' | 'high';
    width?: number;
    height?: number;
  }) => Promise<HTMLImageElement>;
}

interface Puter {
  ai: PuterAI;
  auth?: {
    isSignedIn: () => boolean;
    signIn: () => Promise<void>;
  };
}

declare global {
  interface Window {
    puter?: Puter;
  }
}

// Load Puter.js SDK dynamically
let puterLoaded = false;
let puterLoading: Promise<void> | null = null;

async function loadPuter(): Promise<void> {
  if (puterLoaded && window.puter) return;
  if (puterLoading) return puterLoading;

  puterLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => {
      puterLoaded = true;
      console.log('[Puter] SDK loaded successfully');
      resolve();
    };
    script.onerror = () => {
      puterLoading = null;
      reject(new Error('Failed to load Puter.js SDK'));
    };
    document.head.appendChild(script);
  });

  return puterLoading;
}

export interface PuterImageOptions {
  model?: 'qwen-image' | 'flux-pro' | 'flux-dev' | 'stable-diffusion' | 'grok-imagine' | 'gpt-image' | 'gemini-image';
  quality?: 'low' | 'medium' | 'high';
  width?: number;
  height?: number;
}

const MODEL_MAP: Record<string, string> = {
  'qwen-image': 'qwen/qwen-image-2.0-pro',
  'flux-pro': 'black-forest-labs/flux-2-pro',
  'flux-dev': 'black-forest-labs/flux-2-dev',
  'stable-diffusion': 'stabilityai/stable-diffusion-3-medium',
  'grok-imagine': 'x-ai/grok-imagine-image',
  'gpt-image': 'openai/gpt-image-2',
  'gemini-image': 'google/gemini-3-pro-image-preview',
};

/**
 * Generate image using Puter.js (free, unlimited)
 * This is the same approach Chinese AI apps use for free generation
 */
export async function generateImageWithPuter(
  prompt: string,
  options: PuterImageOptions = {}
): Promise<string> {
  try {
    // Load Puter.js if not already loaded
    await loadPuter();

    if (!window.puter) {
      throw new Error('Puter.js not available');
    }

    // Use Qwen Image by default (Chinese AI model, fast and free)
    const model = MODEL_MAP[options.model || 'qwen-image'];
    
    // Generate image
    const imageElement = await window.puter.ai.txt2img(prompt, {
      model,
      quality: options.quality || 'medium',
      width: options.width || 1024,
      height: options.height || 1024,
    });

    // Convert image element to data URL
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth || 1024;
      canvas.height = imageElement.naturalHeight || 1024;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      imageElement.onload = () => {
        ctx.drawImage(imageElement, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      imageElement.onerror = () => {
        reject(new Error('Failed to load generated image'));
      };

      // If image already loaded
      if (imageElement.complete) {
        ctx.drawImage(imageElement, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      }
    });
  } catch (error: any) {
    console.error('[PuterImage] Generation failed:', error);
    throw new Error(`Puter image generation failed: ${error.message}`);
  }
}

/**
 * Check if Puter.js is available and ready
 */
export async function isPuterAvailable(): Promise<boolean> {
  try {
    await loadPuter();
    return !!window.puter;
  } catch {
    return false;
  }
}

/**
 * Get list of available models
 */
export function getAvailableModels(): { id: string; name: string; description: string }[] {
  return [
    {
      id: 'qwen-image',
      name: 'Qwen Image 2.0 Pro',
      description: 'Alibaba\'s flagship model - fast, high quality, supports text rendering'
    },
    {
      id: 'flux-pro',
      name: 'FLUX.2 Pro',
      description: 'Premium quality, best for detailed artwork'
    },
    {
      id: 'flux-dev',
      name: 'FLUX.2 Dev',
      description: 'Good balance of speed and quality'
    },
    {
      id: 'gpt-image',
      name: 'GPT Image 2',
      description: 'OpenAI\'s image model, great for realistic photos'
    },
    {
      id: 'gemini-image',
      name: 'Gemini 3 Pro Image',
      description: 'Google\'s model, excellent for creative concepts'
    },
    {
      id: 'grok-imagine',
      name: 'Grok Imagine',
      description: 'X AI\'s model, good for diverse styles'
    },
    {
      id: 'stable-diffusion',
      name: 'Stable Diffusion 3',
      description: 'Classic open-source model, reliable quality'
    },
  ];
}

export default {
  generateImageWithPuter,
  isPuterAvailable,
  getAvailableModels,
};
