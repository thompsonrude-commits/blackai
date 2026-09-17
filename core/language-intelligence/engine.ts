import { detectLanguage } from './detector';
import { defaultLanguageRegistry, LanguageRegistry } from './registry';
import { LanguageKnowledgeStore } from './knowledge';
import type { LanguageProvider, SemanticRepresentation, TranslationResult } from './types';

export class LanguageCoordinationEngine {
  constructor(
    readonly registry: LanguageRegistry = defaultLanguageRegistry,
    readonly knowledge: LanguageKnowledgeStore = new LanguageKnowledgeStore(),
    readonly provider?: LanguageProvider,
  ) {}

  detectLanguage(text: string) {
    return detectLanguage(text, this.registry);
  }

  async interpret(text: string, sourceLanguage?: string): Promise<SemanticRepresentation> {
    const detection = sourceLanguage
      ? { ...this.detectLanguage(text), languageId: sourceLanguage, confidence: 1 }
      : this.detectLanguage(text);
    const known = this.knowledge.searchApproved(detection.languageId, text)[0];
    const segments = detection.segments;
    const entities = extractEntities(text);
    const base: SemanticRepresentation = {
      sourceText: text,
      sourceLanguage: detection.languageId,
      intent: 'statement',
      meaning: known?.meaning ?? text,
      entities,
      numbers: text.match(/\b\d+(?:[.,]\d+)?\b/g) ?? [],
      dates: text.match(/\b(?:today|tomorrow|yesterday|\d{1,4}[/-]\d{1,2}[/-]\d{1,4})\b/gi) ?? [],
      locations: entities.filter((entity) => entity.type === 'location').map((entity) => entity.value),
      names: entities.filter((entity) => entity.type === 'name').map((entity) => entity.value),
      culturalContext: known?.category === 'culture' || known?.category === 'proverb' ? known.meaning : undefined,
      idioms: known?.category === 'idiom' || known?.category === 'proverb' ? [text] : [],
      ambiguity: known?.conflictingInterpretations ?? [],
      codeSwitching: detection.codeSwitching,
      confidence: known?.confidence ?? detection.confidence,
      provenance: known ? [known.sourceReference ?? known.sourceType] : [],
      preservedExpression: text,
    };
    if (this.provider?.interpret) return { ...base, ...(await this.provider.interpret({ sourceText: text, sourceLanguage: detection.languageId, semantic: base })) };
    return base;
  }

  async translate(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult> {
    this.registry.require(targetLanguage);
    const detection = sourceLanguage
      ? { languageId: sourceLanguage, confidence: 1, level: 'high' as const, reliable: true, segments: [{ text, languageId: sourceLanguage, confidence: 1 }], codeSwitching: false }
      : this.detectLanguage(text);
    const semantic = await this.interpret(text, detection.languageId);
    const known = this.knowledge.searchApproved(detection.languageId, text, targetLanguage)[0];
    let translated = known?.translation;
    let providerName = 'knowledge-store';
    let confidence = known?.confidence ?? 0;
    const notes: string[] = [];

    if (!translated && this.provider) {
      const result = await this.provider.translate({ sourceText: text, sourceLanguage: detection.languageId, targetLanguage, semantic });
      translated = result.text;
      confidence = result.confidence ?? detection.confidence * 0.75;
      providerName = result.provider;
    }

    if (!translated) {
      translated = semantic.meaning;
      confidence = Math.min(detection.confidence, 0.45);
      notes.push('No verified translation or provider response was available; meaning is returned without claiming a target-language translation.');
    }
    if (semantic.ambiguity.length > 0) notes.push('Conflicting interpretations exist for this expression; review the context before relying on the result.');
    return {
      original: text,
      sourceLanguage: detection,
      targetLanguage,
      text: translated,
      semantic,
      confidence,
      confidenceLevel: confidence >= 0.8 ? 'high' : confidence >= 0.55 ? 'medium' : confidence > 0 ? 'low' : 'unknown',
      provider: providerName,
      verified: Boolean(known?.verificationStatus === 'verified'),
      notes,
    };
  }
}

export const defaultLanguageCoordinationEngine = new LanguageCoordinationEngine();

function extractEntities(text: string): Array<{ value: string; type: string }> {
  const entities: Array<{ value: string; type: string }> = [];
  for (const match of text.matchAll(/\b(?:in|at|from|to)\s+([A-Z][\w-]*(?:\s+[A-Z][\w-]*)*)/g)) {
    entities.push({ value: match[1], type: 'location' });
  }
  for (const match of text.matchAll(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g)) {
    if (!entities.some((entity) => entity.value === match[0])) entities.push({ value: match[0], type: 'name' });
  }
  return entities;
}
