import { classifyUserIntent, type ClassifiedIntent } from '../../src/lib/providerAdapter';
import { LanguageCoordinationEngine } from './engine';
import type {
  CognitiveContext,
  CognitivePlan,
  KnowledgeRecord,
  SemanticRepresentation,
  VerificationResult,
} from './types';

export interface CognitiveEnginePlugin {
  capability: string;
  canHandle(plan: CognitivePlan): boolean;
  execute(plan: CognitivePlan): Promise<unknown>;
}

export class CognitiveBrain {
  private readonly contexts = new Map<string, CognitiveContext>();
  private readonly plugins = new Map<string, CognitiveEnginePlugin>();

  constructor(readonly language = new LanguageCoordinationEngine()) {}

  registerPlugin(plugin: CognitiveEnginePlugin): void {
    if (!plugin.capability.trim()) throw new Error('Plugin capability is required');
    this.plugins.set(plugin.capability, plugin);
  }

  getPlugin(capability: string): CognitiveEnginePlugin | undefined {
    return this.plugins.get(capability);
  }

  async plan(text: string, sessionId = 'anonymous', history: Array<{ role: string; content: string }> = []): Promise<CognitivePlan> {
    const previous = this.contexts.get(sessionId) ?? {};
    const classification = classifyUserIntent(text);
    const detection = this.language.detectLanguage(text);
    const semantic = await this.language.interpret(text, detection.languageId);
    const context = this.buildContext(previous, text, classification, history);
    const knowledge = this.language.knowledge.searchApproved(detection.languageId, text, classification.targetLanguage);
    const verification = verifyPlan(classification, detection.languageId, semantic, knowledge);
    this.contexts.set(sessionId, context);
    return {
      language: detection,
      semantic: { ...semantic, intent: classification.capability, targetLanguage: classification.targetLanguage },
      capability: classification.capability,
      targetLanguage: classification.targetLanguage,
      context,
      knowledge,
      verification,
    };
  }

  async execute(plan: CognitivePlan): Promise<unknown> {
    const plugin = this.plugins.get(plan.capability);
    if (!plugin || !plugin.canHandle(plan)) return undefined;
    return plugin.execute(plan);
  }

  rememberResponse(sessionId: string, response: string): void {
    const context = this.contexts.get(sessionId) ?? {};
    this.contexts.set(sessionId, { ...context, lastResponse: response });
  }

  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  private buildContext(
    previous: CognitiveContext,
    text: string,
    classification: ClassifiedIntent,
    history: Array<{ role: string; content: string }>,
  ): CognitiveContext {
    const lastUser = [...history].reverse().find((entry) => entry.role === 'user')?.content;
    const topic = lastUser && /\b(this|that|it|more|again|respectful|formal)\b/i.test(text)
      ? lastUser.slice(0, 200)
      : text.slice(0, 200);
    return {
      ...previous,
      previousLanguage: previous.previousLanguage ?? this.language.detectLanguage(lastUser ?? text).languageId,
      targetLanguage: classification.targetLanguage ?? previous.targetLanguage,
      currentIntent: classification.capability,
      topic,
      lastUserMessage: text,
    };
  }
}

function verifyPlan(
  classification: ClassifiedIntent,
  languageId: string,
  semantic: SemanticRepresentation,
  knowledge: KnowledgeRecord[],
): VerificationResult {
  const checks = [
    { name: 'language-detected', passed: languageId !== 'unknown', detail: `Detected ${languageId}` },
    { name: 'capability-selected', passed: Boolean(classification.capability), detail: classification.capability },
    { name: 'original-preserved', passed: semantic.preservedExpression.length > 0, detail: 'Original expression retained' },
    { name: 'knowledge-provenance', passed: knowledge.every((item) => Boolean(item.sourceType)), detail: `${knowledge.length} approved records` },
  ];
  const warnings = checks.filter((check) => !check.passed).map((check) => check.detail);
  return { passed: warnings.length === 0, checks, warnings };
}

export const defaultCognitiveBrain = new CognitiveBrain();
