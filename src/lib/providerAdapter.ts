export type Capability =
  | 'chat'
  | 'language'
  | 'vision'
  | 'ocr'
  | 'search'
  | 'research'
  | 'weather'
  | 'time'
  | 'stt'
  | 'tts'
  | 'camera'
  | 'image'
  | 'document'
  | 'music'
  | 'visual'
  | 'spreadsheet'
  | 'chart'
  | 'presentation'
  | 'audio'
  | 'summary'
  | 'translate'
  | 'transcribe';

export type EngineRoute = 'browser' | 'local' | 'external' | 'fallback';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
]);

// Only strip internal reasoning tags and real secret leaks.
// Never redact URLs, HTTP status codes, or any other content the user should see.
export function sanitizeUserFacingText(input: string): string {
  return (input || '')
    .replace(/<\s*think[^>]*>.*?<\s*\/\s*think\s*>/gis, '')
    .replace(/<\s*think[^>]*\/?>/gis, '')
    .replace(/\b(?:Authorization|Bearer|x-api-key)\s*[:=]\s*\S+/gi, '[redacted]')
    .trim();
}

export function isBlockedProviderEndpoint(url: string): boolean {
  try {
    const parsed = new URL(url);
    return BLOCKED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function getEngineRouteOrder(capability: Capability): EngineRoute[] {
  const base: EngineRoute[] = ['local', 'browser', 'external', 'fallback'];

  switch (capability) {
    case 'weather':
      return ['browser', 'local', 'external', 'fallback'];
    case 'time':
      return ['browser', 'local', 'external', 'fallback'];
    case 'camera':
      return ['browser', 'local', 'external', 'fallback'];
    case 'stt':
      return ['browser', 'local', 'external', 'fallback'];
    case 'tts':
      return ['browser', 'local', 'external', 'fallback'];
    case 'vision':
    case 'ocr':
    case 'document':
      return ['local', 'browser', 'external', 'fallback'];
    case 'search':
    case 'research':
      return ['local', 'browser', 'external', 'fallback'];
    case 'image':
    case 'visual':
      return ['local', 'browser', 'external', 'fallback'];
    case 'music':
      return ['local', 'browser', 'external', 'fallback'];
    default:
      return base;
  }
}

export interface ClassifiedIntent {
  capability: Capability;
  confidence: number;
  targetLanguage?: string;
  normalizedPrompt: string;
  secondaryCapabilities?: Capability[];
}

function buildSecondaryCapabilities(primary: Capability, detected: Capability[]): Capability[] {
  return Array.from(new Set(detected.filter((item) => item !== primary)));
}

export function classifyUserIntent(input: string): ClassifiedIntent {
  const text = (input || '').trim();
  const normalized = text.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return { capability: 'chat', confidence: 0.1, normalizedPrompt: '' };
  }

  const detected: Capability[] = [];

  const translationMatch = /(translate|translation|translat(e|ion)|into\s+(?:edo|yoruba|igbo|hausa|pidgin|english)|(?:s[ụu]ghar[iị]a|tum[ọo]|traduce)\s+(?:ya|to|into))/i.exec(lower);
  if (translationMatch) detected.push('language');

  const hasImageRequestVerb = /\b(?:generate|create|make|draw|paint|design|build|render|produce|illustrate|show|display|ṣe|yi|give\s+me|i\s+want|i\s+wan|abeg\s+make)\b/i.test(lower);
  const hasExplicitImageTarget = /\b(?:logo|poster|banner|picture|image|photo|artwork|visual|diagram|chart|graph|infographic|aworan|hoto|foto|illustration|avatar|thumbnail|cover|portrait|painting|drawing|sketch|wallpaper|graphic)\b/i.test(lower);
  const hasStrongImagePattern = /(?:generate|create|make|draw|paint|design|build|render|produce|illustrate|show|ṣe|yi)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:logo|poster|banner|picture|image|photo|artwork|visual|diagram|chart|graph|infographic|aworan|hoto|foto|illustration|avatar|thumbnail|cover|portrait|painting|drawing|sketch|wallpaper|graphic)/i.test(lower);
  const hasVisualExplanationPattern = /\b(?:explain|teach|describe|show|illustrate|demonstrate)\b.*\b(?:diagram|image|picture|visual|chart|graph|illustration|infographic|poster|banner|logo)\b|\b(?:diagram|image|picture|visual|chart|graph|illustration|infographic|poster|banner|logo)\b.*\b(?:explain|teach|describe|show|illustrate|demonstrate)\b/i.test(lower);
  if ((hasImageRequestVerb && hasExplicitImageTarget) || hasStrongImagePattern || hasVisualExplanationPattern) {
    detected.push('image');
  }

  const musicMatch = /(song|music|beat|lyrics|instrumental|afrobeats|afrobeat|amapiano|highlife|gospel|hip[- ]?hop|r&b|reggae|dancehall|compose|melody|track|mix|master|vocal)/i.exec(lower);
  if (musicMatch) detected.push('music');

  // Only trigger search for EXPLICIT search requests
  const searchMatch = /(search( the web| for| this)?|latest news|breaking news|what's new today|find information online|look up on the web|browse the web|web search|news today)/i.exec(lower);
  if (searchMatch) detected.push('search');

  const documentMatch = /(pdf|docx?|excel|sheet|spreadsheet|csv|xlsx|pptx?|document|report|table|extract|analyz(e|ing) this (pdf|document|spreadsheet)|clean this spreadsheet|summarize.*(pdf|document|sheet))/i.exec(lower);
  if (documentMatch) detected.push('document');

  const ocrMatch = /(ocr|scan|read this image|extract text|caption|image text|document image|analyze image|describe this image|what is in this picture)/i.exec(lower);
  if (ocrMatch) detected.push('ocr');

  const voiceMatch = /(speak|voice|read aloud|narration|text to speech|tts|audio|transcrib(e|ing)|voiceover|record)/i.exec(lower);
  if (voiceMatch) detected.push('tts');

  const visionMatch = /(analyz(e|ing) this image|describe the image|image understanding|vision|visual question|what is in the image|object recognition|scene analysis)/i.exec(lower);
  if (visionMatch) detected.push('vision');

  const weatherMatch = /(weather|temperature|forecast|rain|sunny|humidity)/i.exec(lower);
  if (weatherMatch) detected.push('weather');

  // Research: only flag for genuine clinical/research queries, not everyday health chat
  const researchMatch = /(one health|zoonotic|veterinary|livestock|antimicrobial resistance|epilepsy|seizure|anti[- ]?seizure|cenobamate|clinical trials?|drug-resistant|plant health|environmental health|food safety)/i.exec(lower);
  if (researchMatch) detected.push('research');

  const priority: Capability[] = ['language', 'research', 'image', 'music', 'search', 'document', 'ocr', 'tts', 'vision', 'weather', 'chat'];
  const primary = priority.find((capability) => detected.includes(capability)) ?? 'chat';

  const baseResult: ClassifiedIntent = {
    capability: primary,
    confidence: primary === 'chat' ? 0.6 : 0.9,
    normalizedPrompt: normalized,
    secondaryCapabilities: buildSecondaryCapabilities(primary, detected),
  };

  if (primary === 'language') {
    const languageMatch = lower.match(/(?:into|to)\s+(edo|yoruba|igbo|hausa|pidgin|english|nigerian pidgin)/i);
    return { ...baseResult, targetLanguage: languageMatch ? languageMatch[1].toLowerCase() : undefined, confidence: 0.92 };
  }
  if (primary === 'image') return { ...baseResult, confidence: 0.94 };
  if (primary === 'music') return { ...baseResult, confidence: 0.91 };
  if (primary === 'search') return { ...baseResult, confidence: 0.9 };
  if (primary === 'document') return { ...baseResult, confidence: 0.88 };
  if (primary === 'ocr') return { ...baseResult, confidence: 0.87 };
  if (primary === 'tts') return { ...baseResult, confidence: 0.8 };
  if (primary === 'vision') return { ...baseResult, confidence: 0.86 };
  if (primary === 'weather') return { ...baseResult, confidence: 0.74 };
  if (primary === 'research') return { ...baseResult, confidence: 0.9 };

  return baseResult;
}

// Natural, brief capability messages — no "I cannot" phrasing
export function buildLocalCapabilityMessage(capability: Capability, userInput: string): string {
  switch (capability) {
    case 'weather':
      return 'What location do you want the weather for?';
    case 'time':
      return 'Which timezone do you need?';
    case 'search':
    case 'research':
      return 'Ask away — I will answer from everything I know.';
    case 'vision':
    case 'ocr':
    case 'document':
      return 'Upload your image or document and I will analyse it.';
    case 'camera':
      return 'Tap the camera button and allow access, then I can read or analyse whatever you point at.';
    case 'stt':
      return 'Tap the mic icon to speak.';
    case 'tts':
      return 'Tap the speaker on any message to hear it read aloud.';
    case 'music':
      return 'Tell me the style, mood, or lyrics you want and I will help build the song.';
    case 'image':
    case 'visual':
      return 'Describe what you want and I will generate it now.';
    default:
      return 'What can I help you with?';
  }
}

export function isExternalProviderAllowed(url: string): boolean {
  return !isBlockedProviderEndpoint(url);
}
