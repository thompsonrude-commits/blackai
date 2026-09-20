import type { ProviderId } from '../types';

export type ProviderDefinition = {
  providerId: ProviderId;
  displayName: string;
  capability: 'CHAT' | 'IMAGE' | 'VISION' | 'OCR' | 'TTS' | 'SEARCH' | 'VIDEO' | 'LOCAL' | 'UTILITY' | 'ANALYSIS' | 'CREATIVE' | 'SPECIALIZED';
  secretName?: string;
  local?: boolean;
  models?: string[];
  routingPriority?: number; // lower is higher priority
  fallbackEligible?: boolean;
  adapterPath?: string;
};

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  { providerId: 'jimeng', displayName: 'Jimeng / Dreamina', capability: 'IMAGE', local: false, models: ['jimeng-4.5'], routingPriority: 1, fallbackEligible: true, adapterPath: '../providers/jimeng' },
  { providerId: 'zimage', displayName: 'Alibaba Z-Image Turbo (ModelScope)', capability: 'IMAGE', secretName: 'MODELSCOPE_TOKEN', local: false, models: ['z-image-turbo'], routingPriority: 2, fallbackEligible: true, adapterPath: '../providers/zimage' },
  { providerId: 'stablehorde', displayName: 'AI Horde', capability: 'IMAGE', local: false, models: ['stable_diffusion'], routingPriority: 3, fallbackEligible: true, adapterPath: '../providers/stablehorde' },
  { providerId: 'cloudflare', displayName: 'Cloudflare Workers AI', capability: 'IMAGE', secretName: 'CLOUDFLARE_API_TOKEN', local: false, models: ['@cf/stabilityai/stable-diffusion-xl-base-1.0'], routingPriority: 4, fallbackEligible: true, adapterPath: '../providers/cloudflare' },
  
  // ===== VIDEO PROVIDERS =====
  { providerId: 'kling', displayName: 'Kling AI (Kuaishou)', capability: 'VIDEO', secretName: 'KLING_COOKIE', local: false, models: ['kling-1.5-std', 'kling-1.5-pro'], routingPriority: 1, fallbackEligible: true, adapterPath: '../providers/kling' },
  { providerId: 'native-gpu', displayName: 'ComfyUI (native GPU)', capability: 'IMAGE', secretName: 'COMFYUI_ENDPOINT', local: true, models: ['comfyui'], routingPriority: 10, fallbackEligible: false, adapterPath: './comfyAdapter' },
  { providerId: 'grok', displayName: 'Grok (xAI)', capability: 'CHAT', secretName: 'GROK_KEY', local: false, models: ['grok-1'], routingPriority: 20, fallbackEligible: true, adapterPath: '../providers/grok' },
  { providerId: 'ollama', displayName: 'Ollama (self-hosted)', capability: 'CHAT', local: true, models: ['ollama-local'], routingPriority: 15, fallbackEligible: true, adapterPath: '../providers/ollama' },
  { providerId: 'groq', displayName: 'Groq', capability: 'CHAT', secretName: 'GROQ_KEY', local: false, models: ['groq-1'], routingPriority: 25, fallbackEligible: true, adapterPath: '../providers/groq' },
  { providerId: 'huggingface', displayName: 'HuggingFace', capability: 'CHAT', secretName: 'HF_KEY', local: false, models: ['hf-inference'], routingPriority: 30, fallbackEligible: true, adapterPath: '../providers/huggingface' },
  { providerId: 'mistral', displayName: 'Mistral AI', capability: 'CHAT', secretName: 'MISTRAL_KEY', local: false, models: ['mistral-large'], routingPriority: 35, fallbackEligible: true, adapterPath: '../providers/mistral' },
  { providerId: 'together', displayName: 'Together AI', capability: 'CHAT', secretName: 'TOGETHER_KEY', local: false, models: ['together-1'], routingPriority: 40, fallbackEligible: true, adapterPath: '../providers/together' },
  { providerId: 'tavily', displayName: 'Tavily', capability: 'SEARCH', secretName: 'TAVILY_KEY', local: false, models: [], routingPriority: 50, fallbackEligible: false, adapterPath: '../providers/tavily' },
  { providerId: 'tesseract', displayName: 'Tesseract OCR', capability: 'OCR', local: true, models: [], routingPriority: 5, fallbackEligible: false, adapterPath: '../providers/tesseract' },
  { providerId: 'google-tts', displayName: 'Google TTS', capability: 'TTS', secretName: 'GOOGLE_TTS_KEY', local: false, models: [], routingPriority: 15, fallbackEligible: true, adapterPath: '../providers/googleTTS' },
  { providerId: 'ollama-vision', displayName: 'Ollama Vision', capability: 'VISION', local: true, models: ['llava'], routingPriority: 10, fallbackEligible: true, adapterPath: '../providers/ollamaVision' },
  { providerId: 'deepseek', displayName: 'DeepSeek (disabled)', capability: 'SEARCH', secretName: 'DEEPSEEK_KEY', local: false, models: [], routingPriority: 999, fallbackEligible: false, adapterPath: '../providers/deepseek' },
  // Local mock provider for audio/media used for testing and offline deterministic generation
  { providerId: 'local-audio-mock', displayName: 'Local Audio Mock', capability: 'CREATIVE', local: true, models: ['mock-audio'], routingPriority: 200, fallbackEligible: true, adapterPath: './localAudioMock' },
];
