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
import { getEngineRouteOrder, sanitizeUserFacingText } from './providerAdapter';
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
    let knowledgeContext = '';

    if (lastUserMessage) {
      try {
        // Use both platform knowledge engine and new core knowledge engine
        const knowledgeResults = await knowledgeEngine.search(lastUserMessage.content, {
          topK: 3,
          minSimilarity: 0.6,
        });

        if (knowledgeResults.length > 0) {
          knowledgeContext = '\n\n[Relevant Knowledge]:\n' + knowledgeResults
            .slice(0, 3)
            .map((result) => `- ${result.entry.content.slice(0, 600)} (${result.entry.metadata.language})`)
            .join('\n')
            .slice(0, 2200);
        }
        
        // Also query the new core knowledge engine
        if (engineManager.isInitialized) {
          const coreKnowledgeResults = await engineManager.queryKnowledge(
            lastUserMessage.content,
            { maxResults: 3, language: conversationLanguage }
          );
          
          if (coreKnowledgeResults.length > 0) {
            const coreContext = coreKnowledgeResults
              .map((doc) => `- ${doc.title}: ${doc.content.slice(0, 500)}${doc.tags ? ` [Tags: ${doc.tags.join(', ')}]` : ''}`)
              .join('\n');
            knowledgeContext += knowledgeContext ? '\n' + coreContext : '\n\n[Relevant Knowledge]:\n' + coreContext;
            console.log(`[AI] Core knowledge engine added ${coreKnowledgeResults.length} documents to context`);
          }
        }
      } catch (err) {
        console.warn('[AI] Knowledge search failed:', err);
      }
    }

    // Use NLIE Engine for Nigerian language detection (enhanced detection)
    let nlieDetection;
    try {
      if (lastUserMessage && engineManager.isInitialized) {
        nlieDetection = await engineManager.detectLanguage(lastUserMessage.content);
        console.log('[AI] NLIE detection result:', nlieDetection);
      }
    } catch (err) {
      console.warn('[AI] NLIE detection failed, falling back to default:', err);
    }

    const detectedLanguage = lastUserMessage
      ? defaultLanguageCoordinationEngine.detectLanguage(lastUserMessage.content)
      : undefined;
    const cognitivePlan = lastUserMessage
      ? await defaultCognitiveBrain.plan(lastUserMessage.content, 'default', messages.map((message) => ({
          role: message.role,
          content: message.content,
        })))
      : undefined;
    
    // Build language context with NLIE detection if available
    const languageContext = detectedLanguage?.reliable || nlieDetection
      ? {
          role: 'system' as const,
          content: `Language coordination: preserve the user's original expression and respond in or appropriately explain ${nlieDetection?.language || detectedLanguage?.languageId}. ${nlieDetection ? `NLIE detection: ${nlieDetection.language} (confidence: ${nlieDetection.confidence.toFixed(2)}, code-switching: ${nlieDetection.isCodeSwitched ? 'detected' : 'none'}).` : ''} Code-switching: ${detectedLanguage?.codeSwitching || nlieDetection?.isCodeSwitched ? 'present' : 'not detected'}. Capability: ${cognitivePlan?.capability ?? 'chat'}. Verification: ${cognitivePlan?.verification.passed ? 'passed' : 'uncertain'}. Do not claim a translation is verified unless supported by supplied knowledge.`,
        }
      : undefined;
    const enrichedMessages = lastUserMessage
      ? [
          ...messages.slice(0, -1),
          ...(languageContext ? [languageContext] : []),
          ...(knowledgeContext
            ? [{
                role: 'user' as const,
                content: lastUserMessage.content.slice(0, 4000) + knowledgeContext,
              }]
            : [lastUserMessage]),
        ]
      : messages;

    const boundedMessages = buildBoundedContext(enrichedMessages);

    // If visual explanation is needed, attempt to generate a diagram/image first and attach it to the chat context
    let messagesForChat = boundedMessages;
    try {
      const lastUserText = lastUserMessage?.content;
      if (requiresExplicitVisualRequest(lastUserText)) {
        const visualPrompt = `Create a clear labeled diagram or educational visual for: ${lastUserText}. Include labels for major parts and a concise caption describing each part.`;
        const vc = await proxyVisualOrchestrator({ prompt: visualPrompt, selectedLanguage: conversationLanguage, conversationLanguage });
        if (vc && vc.ok && vc.visual && (vc.visual.imageUrl || vc.visual.dataUrl)) {
          const imageUrl = vc.visual.imageUrl || vc.visual.dataUrl;
          // Attach the generated image as an assistant message so the chat model treats it as available context
          messagesForChat = [
            ...boundedMessages,
            { role: 'assistant' as const, content: `__IMAGE__${imageUrl}` },
            // Also attach structured visual metadata the model can consume
            { role: 'assistant' as const, content: `__VISUAL_META__${JSON.stringify(vc.visual)}` },
            { role: 'system' as const, content: `An educational diagram was generated, attached, and metadata is available. The assistant must reference the visual explicitly, describe labeled parts, use numbered labels (Label 1, Label 2), and avoid saying it cannot display images.` },
          ];
        }
      }
    } catch (err) {
      console.warn('[AI] Visual generation attempt failed:', err);
      // Continue without image — fallback to text-only explanation
    }

    const requestPlan = buildRequestPlan(lastUserMessage?.content ?? '', conversationLanguage);

    // Check if request requires agent system (multi-step complex workflow)
    if (lastUserMessage && shouldUseAgentSystem(lastUserMessage.content)) {
      console.log('[AI] Request requires agent system, routing to workflow orchestration');
      const explanation = explainWorkflow(lastUserMessage.content);
      
      try {
        // Yield explanation first
        yield* wordStream(explanation + '\n\n');
        
        // Execute workflow
        const workflowResult = await executeAgentWorkflow(
          lastUserMessage.content,
          messages,
          'user-session'
        );
        
        if (workflowResult.success) {
          recoveryService.recordSuccess('agent-workflow', 0, 0.9, 'workflow');
          yield* wordStream(workflowResult.finalResponse);
          return;
        } else {
          console.warn('[AI] Agent workflow failed, falling back to standard processing');
          yield* wordStream('The multi-step workflow encountered issues. Let me try a simpler approach...\n\n');
          // Fall through to standard processing
        }
      } catch (err) {
        console.error('[AI] Agent workflow error:', err);
        yield* wordStream('I had trouble with the multi-step processing. Let me handle this in a simpler way...\n\n');
        // Fall through to standard processing
      }
    }

    if (lastUserMessage) {
      const researchResponse = await routeResearchRequest(lastUserMessage.content);
      if (researchResponse) {
        const text = sanitizeUserFacingText(researchResponse.response);
        recoveryService.recordSuccess('local-research', 0, 0.8, 'research');
        yield* wordStream(text);
        return;
      }
    }

    const result = await _proxyChat({
      messages: messagesForChat,
      temperature,
      maxTokens: 1024,
      preferredProviders: requestPlan.providerOrder,
      targetLanguage: conversationLanguage,
    });
    const latency = Date.now() - startTime;

    if (result.text) {
      recoveryService.recordSuccess(result.provider, latency, 0.8, 'chat');
      recoveryService.evaluateOfflineMode('chat');
      trackChatRequest(result.provider, true, latency);

      if (lastUserMessage) defaultCognitiveBrain.rememberResponse('default', result.text);

      yield* wordStream(result.text);
      return;
    }

    throw new Error(result.error ?? 'Empty response from proxy');
  } catch (err: any) {
    const latency = Date.now() - startTime;
    const failureMessage = err?.message || 'unknown failure';
    recoveryService.recordFailure('proxy', failureMessage, 'chat');
    trackChatRequest('proxy', false, latency);
    console.warn('[AI] Proxy chat failed:', failureMessage);

    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    const queuedRequest: QueuedRequest = {
      id: `chat-${Date.now()}`,
      messages,
      capability: 'chat',
      createdAt: Date.now(),
    };
    recoveryService.enqueueRequest(queuedRequest);
    recoveryService.evaluateOfflineMode('chat');

    const routeOrder = getEngineRouteOrder('chat');
    const browserReady = hasBrowserCapability('chat');
    const availableLocal = routeOrder.includes('local') || routeOrder.includes('browser') || browserReady;
    const languageCode = getCurrentConversationLanguage();
    const fallbackText = availableLocal
      ? getLocalFallbackResponse(lastUserMessage?.content ?? 'How can I help?', languageCode)
      : 'The live AI provider is temporarily unavailable. Please try again when the connection is restored.';

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
