/**
 * BLACK AI local-first chat engine.
 * External providers are optional accelerators behind the proxy, not the app brain.
 */

import { proxyChat as _proxyChat, proxyImage, proxyVisualOrchestrator } from './aiProxy';
import { getLocalFallbackResponse } from './fallbackResponses';
import { buildRequestPlan } from './intelligenceOrchestrator';
import { knowledgeEngine } from './platform/knowledgeEngine';
import { trackChatRequest } from './platform/analytics';
import { recoveryService, QueuedRequest } from './platform/recoveryService';
import { hasBrowserCapability } from './inHouseEngine';
import { classifyUserIntent, getEngineRouteOrder, sanitizeUserFacingText } from './providerAdapter';
import { defaultCognitiveBrain, defaultLanguageCoordinationEngine } from '../../core/language-intelligence';
import { routeResearchRequest } from '../../core/research';
import { engineManager } from './engineManager';
import { shouldUseAgentSystem, executeAgentWorkflow, explainWorkflow } from './agentOrchestrator';

export interface ChatMessageLike {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MAX_CONTEXT_CHARS = 12000;
const MAX_HISTORY_MESSAGES = 16;

function getCurrentConversationLanguage(): string {
  try {
    const stored = localStorage.getItem('conversation_language');
    if (stored) return stored;
  } catch {
    // ignore localStorage access issues and fall back to default
  }
  return 'pcm';
}

function buildBoundedContext(messages: ChatMessageLike[]): ChatMessageLike[] {
  const system = messages.find((message) => message.role === 'system');
  const nonSystem = messages.filter((message) => message.role !== 'system');
  const selected: ChatMessageLike[] = [];
  let chars = system?.content.length ?? 0;

  for (let index = nonSystem.length - 1; index >= 0 && selected.length < MAX_HISTORY_MESSAGES; index--) {
    const message = nonSystem[index];
    const content = message.content.slice(0, 4000);
    if (selected.length > 0 && chars + content.length > MAX_CONTEXT_CHARS) break;
    selected.unshift({ role: message.role, content });
    chars += content.length;
  }

  return system ? [{ ...system, content: system.content.slice(0, 5000) }, ...selected] : selected;
}

async function* wordStream(text: string): AsyncGenerator<string> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
    yield chunk;
    await new Promise((resolve) => setTimeout(resolve, 18));
  }
}

async function retryQueuedChatRequest(request: QueuedRequest): Promise<boolean> {
  try {
    const result = await _proxyChat({
      messages: request.messages,
      temperature: 0.7,
      maxTokens: 2048,
    });
    if (result.text) {
      recoveryService.recordSuccess(result.provider, result.latencyMs, 0.8, request.capability);
      recoveryService.evaluateOfflineMode(request.capability);
      return true;
    }
    recoveryService.recordFailure('proxy', result.error ?? 'empty response', request.capability);
    return false;
  } catch (err: any) {
    recoveryService.recordFailure('proxy', err?.message ?? 'retry failure', request.capability);
    return false;
  }
}

recoveryService.setRetryHandler(retryQueuedChatRequest);

export function requiresExplicitVisualRequest(text?: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  const asksForExplanation = /\b(explain|teach|describe|show|illustrate|demonstrate|how does|how to|show me how)\b/i.test(t);
  const asksForVisual = /\b(diagram|chart|graph|visual|image|picture|illustration|flowchart|timeline|mind map|infographic|schematic|map)\b/i.test(t);
  const directVisualCommand = /\b(with\s+(?:a\s+)?(?:diagram|chart|graph|visual|image|picture|illustration|infographic)|(?:draw|make|create|show|generate)\s+(?:me\s+)?(?:a\s+)?(?:diagram|chart|graph|visual|image|picture|illustration|infographic)|(?:diagram|chart|graph|visual|image|picture|illustration|infographic)\s+(?:of|for)\b)/i.test(t);
  return (asksForExplanation && asksForVisual) || directVisualCommand;
}

export async function* unifiedChatStream(messages: ChatMessageLike[], temperature = 0.7): AsyncGenerator<string> {
  const startTime = Date.now();

  try {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    const conversationLanguage = getCurrentConversationLanguage();

    // ── OPT-IN PROFESSIONAL TRAINING (only on explicit "train me" commands) ──
    if (lastUserMessage) {
      try {
        const { detectTrainingRequest, getTrainingIntroduction } = await import('./professionalTraining');
        const trainingRequest = detectTrainingRequest(lastUserMessage.content);
        if (trainingRequest.shouldStartTraining && trainingRequest.trainingType) {
          const intro = getTrainingIntroduction(trainingRequest.trainingType);
          yield* wordStream(intro);
          return;
        }
      } catch (err) {
        console.warn('[AI] Training detection failed (non-blocking):', err);
      }
    }

    // ── DIRECT API CALL — no pre-processing delays ────────────────────────────
    // Bound context to prevent overflow
    const boundedMessages = buildBoundedContext(messages);

    const result = await _proxyChat({
      messages: boundedMessages,
      temperature,
      maxTokens: 2048,
      targetLanguage: conversationLanguage,
    });

    const latency = Date.now() - startTime;

    if (result.text) {
      recoveryService.recordSuccess(result.provider, latency, 0.8, 'chat');
      recoveryService.evaluateOfflineMode('chat');
      trackChatRequest(result.provider, true, latency);

      yield* wordStream(sanitizeUserFacingText(result.text));
      return;
    }

    throw new Error(result.error ?? 'Empty response from proxy');

  } catch (err: any) {
    const latency = Date.now() - startTime;
    const failureMessage = err?.message || 'unknown failure';
    recoveryService.recordFailure('proxy', failureMessage, 'chat');
    trackChatRequest('proxy', false, latency);
    console.warn('[AI] Proxy chat failed:', failureMessage);

    const queuedRequest: QueuedRequest = {
      id: `chat-${Date.now()}`,
      messages,
      capability: 'chat',
      createdAt: Date.now(),
    };
    recoveryService.enqueueRequest(queuedRequest);
    recoveryService.evaluateOfflineMode('chat');

    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    const languageCode = getCurrentConversationLanguage();
    const fallbackText = getLocalFallbackResponse(lastUserMessage?.content ?? 'How can I help?', languageCode);

    yield* wordStream(sanitizeUserFacingText(fallbackText));
    return;
  }
}

export async function discoverLanguage(nameOrRegion: string, location: string, isRegional = false) {
  const prompt = isRegional
    ? `Research the major indigenous languages in ${nameOrRegion} in ${location}. Provide brief details and sample phrases.`
    : `Research ${nameOrRegion} language in ${location}. Provide a short dictionary, key phrases, and a cultural overview.`;

  let text = '';
  for await (const chunk of unifiedChatStream([{ role: 'user', content: prompt }], 0.5)) {
    text += chunk;
  }

  return { text, sources: [] };
}

export async function translateAndSpeak(text: string, language: string): Promise<string> {
  let result = '';
  for await (const chunk of unifiedChatStream([{ role: 'user', content: `Translate to ${language}: "${text}".` }])) {
    result += chunk;
  }
  return result || getLocalFallbackResponse(text, language.slice(0, 2));
}

export const EDO_SYSTEM_INSTRUCTION = `You are BLACK AI — a local-first Edo (Bini) language assistant.

Use verified Edo forms from the supplied lexicon and preserve Edo diacritics such as ẹ and ọ.
Respect Bini consonant clusters including gh, vb, rh, kh, kp, gb, and mw.
The Edo Nation glossary includes historical, royal, religious, place, and cultural terms.
Label those as cultural or historical terms rather than presenting them as everyday translations.
The glossary records more than one meaning for Ebo; ask for context before choosing one.
When teaching verbs, give the Edo form, English meaning, pronunciation, and a short example.
Do not invent Edo conjugation or tense paradigms. Edo aspect, negation, focus, and tone can depend on
the construction and context; if a form is uncertain, say so and ask for a native-speaker correction.
Prefer subject-verb-object examples unless a verified entry says otherwise.
Respond in the user\'s requested language and keep replies short, clear, and useful.`;

export type ChatAttachment = {
  id?: string;
  type: 'image' | 'audio' | 'file' | 'url';
  name?: string;
  dataUrl?: string;
  data?: string;
  mimeType?: string;
  url?: string;
};

export async function generateEdoAudio(_text: string): Promise<string> {
  return '';
}

export function getEdoChat() {
  return {
    async *sendMessageStream({ message, attachments, vocabContext }: { message: string; attachments?: ChatAttachment[]; vocabContext?: string }) {
      const prompt = attachments?.length ? `${message}\nAttachments: ${attachments.map((a) => a.url || a.dataUrl || a.name || 'file').join(', ')}` : message;
      const context = vocabContext ? `\n\nVerified Edo lexicon:\n${vocabContext}` : '';
      for await (const chunk of unifiedChatStream([
        { role: 'system', content: EDO_SYSTEM_INSTRUCTION + context },
        { role: 'user', content: prompt },
      ])) {
        yield chunk;
      }
    },
  };
}

export function transcribeWithWhisper(_input: string | File | Blob): string {
  return 'Transcript unavailable locally.';
}

export function transcribeEdoAudio(_audio: Blob | string): string {
  return 'Audio transcription unavailable locally.';
}
