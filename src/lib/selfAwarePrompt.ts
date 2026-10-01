/**
 * Self-Aware AI System Prompts
 *
 * Adds a minimal, natural capabilities note to the system prompt.
 * NEVER injects "I cannot X" statements — those make the AI sound broken.
 * The AI should attempt everything and explain naturally if something fails.
 */

import { getSystemCapabilities } from './providerHealth';

export interface SelfAwareContext {
  capabilities: string;
  limitations: string;
  suggestions: string;
}

/**
 * Build a short, natural capability note for the system prompt.
 * Keeps it minimal — the goal is awareness, not a list of restrictions.
 */
export async function buildSelfAwarePrompt(): Promise<string> {
  try {
    const capabilities = await getSystemCapabilities();

    const available: string[] = [];
    if (capabilities.chat) available.push('conversation and Q&A');
    if (capabilities.vision) available.push('image analysis');
    if (capabilities.ocr) available.push('text extraction from images');
    if (capabilities.search) available.push('live web search');
    if (capabilities.imageGeneration) available.push('image generation');
    if (capabilities.textToSpeech) available.push('text-to-speech');
    if (capabilities.speechToText) available.push('voice input');
    if (capabilities.translation) available.push('translation');
    if (capabilities.weather) available.push('weather lookup');

    if (available.length === 0) return '';

    return `\n\n# ACTIVE CAPABILITIES\nYou currently have: ${available.join(', ')}. Use them naturally when relevant without announcing them.`;
  } catch {
    return '';
  }
}

/**
 * Detect if user is asking for an unavailable feature.
 * Returns null (do nothing) for most cases — let the AI answer naturally.
 * Only returns a message for hardware permissions the browser must grant.
 */
export async function detectUnavailableFeatureRequest(
  userMessage: string
): Promise<{ feature: string; message: string } | null> {
  // Only block on camera/mic which require explicit browser permission grants.
  // Everything else — the AI should just try and respond naturally.
  const lower = userMessage.toLowerCase();

  if (/\b(camera|take photo|scan with camera)\b/i.test(lower)) {
    return {
      feature: 'camera',
      message: 'Tap the camera icon in the toolbar to open it.',
    };
  }

  if (/\b(record voice|speak to me|voice note)\b/i.test(lower)) {
    return {
      feature: 'stt',
      message: 'Tap the mic icon to start speaking.',
    };
  }

  return null;
}

/**
 * Get a natural system status summary (for admin/debug use only, not injected into normal prompts).
 */
export async function getSystemStatusMessage(): Promise<string> {
  try {
    const capabilities = await getSystemCapabilities();
    const total = Object.keys(capabilities).length;
    const available = Object.values(capabilities).filter(Boolean).length;
    return `${available}/${total} subsystems active.`;
  } catch {
    return 'Status unavailable.';
  }
}

/**
 * Build help message based on capabilities
 */
export async function buildHelpMessage(): Promise<string> {
  const capabilities = await getSystemCapabilities();

  const lines: string[] = ['Here is what I can do:\n'];

  if (capabilities.chat) lines.push('Chat in English, Pidgin, Yoruba, Igbo, Hausa, Edo and more');
  if (capabilities.imageGeneration) lines.push('Generate images from descriptions');
  if (capabilities.vision) lines.push('Analyse and describe images');
  if (capabilities.ocr) lines.push('Extract text from photos and documents');
  if (capabilities.search) lines.push('Search the web for current information');
  if (capabilities.weather) lines.push('Get weather for any location');
  if (capabilities.time) lines.push('Tell you the time in any timezone');
  if (capabilities.textToSpeech) lines.push('Read responses aloud');
  if (capabilities.speechToText) lines.push('Accept voice input');
  if (capabilities.translation) lines.push('Translate between languages');

  return lines.join('\n');
}

/**
 * Build capability response (kept for backward compat — always returns empty string now)
 */
export async function buildCapabilityResponse(_requestedFeature: string): Promise<string> {
  return '';
}
