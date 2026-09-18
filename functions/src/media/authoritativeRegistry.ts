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
  // ===== TRULY UNLIMITED IMAGE PROVIDERS (Community-powered & Ad-supported) =====
  { providerId: 'stablehorde', displayName: 'Stable Horde (Community Unlimited)', capability: 'IMAGE', local: false, models: ['stable-diffusion'], routingPriority: 1, fallbackEligible: true, adapterPath: '../providers/stablehorde' },
  { providerId: 'craiyon', displayName: 'Craiyon (Ad-supported Unlimited)', capability: 'IMAGE', local: false, models: ['dall-e-mini'], routingPriority: 2, fallbackEligible: true, adapterPath: '../providers/craiyon' },
  
  // ===== RATE-LIMITED FREE IMAGE PROVIDERS (High quality fallbacks) =====
  { providerId: 'zimage', displayName: 'Z-Image Turbo (Alibaba 2K/day)', capability: 'IMAGE', local: false, models: ['z-image-turbo'], routingPriority: 3, fallbackEligible: true, adapterPath: '../providers/zimage' },
  { providerId: 'jimeng', displayName: 'Jimeng AI (ByteDance 80-100/day)', capability: 'IMAGE', local: false, models: ['jimeng-4.5'], routingPriority: 4, fallbackEligible: true, adapterPath: '../providers/jimeng' },
  
  // ===== USER-PAYS PROVIDERS (Users charged per generation) =====
  { providerId: 'puter', displayName: 'Puter.js (User-Pays $0.03-0.10)', capability: 'IMAGE', local: false, models: ['qwen-image-2.0-pro', 'flux-2-dev'], routingPriority: 50, fallbackEligible: true, adapterPath: '../providers/puter' },
  
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
