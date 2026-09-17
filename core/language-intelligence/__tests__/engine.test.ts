import { describe, expect, it } from 'vitest';
import { LanguageCoordinationEngine } from '../engine';
import { LanguageKnowledgeStore } from '../knowledge';
import { detectLanguage } from '../detector';
import { ingestTrainingEntries } from '../trainingAdapter';
import { CognitiveBrain } from '../cognitive';

describe('African language coordination engine', () => {
  it('detects Nigerian Pidgin as a first-class language', () => {
    const result = detectLanguage('Abeg, make we go now');
    expect(result.languageId).toBe('pcm');
    expect(result.reliable).toBe(true);
  });

  it('detects the core Nigerian language profiles independently of capability', () => {
    expect(detectLanguage('Kọyọ, vbèè oye hẹ?').languageId).toBe('edo');
    expect(detectLanguage('Bawo ni, ẹ ṣé').languageId).toBe('yo');
    expect(detectLanguage('Kedu, biko nno').languageId).toBe('ig');
    expect(detectLanguage('Sannu, yaya lafiya?').languageId).toBe('ha');
  });

  it('detects Edo and preserves the original expression', async () => {
    const engine = new LanguageCoordinationEngine();
    const result = await engine.interpret('Koyo');
    expect(result.sourceLanguage).toBe('edo');
    expect(result.preservedExpression).toBe('Koyo');
  });

  it('uses verified knowledge for cross-language translation without an English hop', async () => {
    const store = new LanguageKnowledgeStore();
    const record = store.createCandidate({
      languageId: 'edo',
      targetLanguageId: 'yo',
      expression: 'Koyo',
      meaning: 'greeting',
      translation: 'Bawo',
      sourceType: 'admin_training',
    });
    store.setStatus(record.knowledgeId, 'verified', 'admin');
    const result = await new LanguageCoordinationEngine(undefined, store).translate('Koyo', 'yo', 'edo');
    expect(result.text).toBe('Bawo');
    expect(result.verified).toBe(true);
    expect(result.provider).toBe('knowledge-store');
  });

  it('records conflicts instead of overwriting regional meanings', () => {
    const store = new LanguageKnowledgeStore();
    const first = store.createCandidate({ languageId: 'edo', expression: 'example', meaning: 'meaning A', sourceType: 'community_contribution', dialect: 'Benin' });
    store.createCandidate({ languageId: 'edo', expression: 'example', meaning: 'meaning B', sourceType: 'community_contribution', dialect: 'Owan' });
    expect(store.list().find((item) => item.knowledgeId === first.knowledgeId)?.conflictingInterpretations).toContain('meaning B');
  });

  it('keeps admin training as provenance-preserving candidates until verification', () => {
    const store = new LanguageKnowledgeStore();
    const [candidate] = ingestTrainingEntries([{
      nativeText: 'Kọyọ',
      englishText: 'Hello',
      phonetics: 'ko-yo',
      context: 'Greeting',
      type: 'conversation',
    }], 'edo', store, { createdBy: 'admin-1', sourceReference: 'admin-training' });

    expect(candidate.verificationStatus).toBe('under_review');
    expect(candidate.sourceType).toBe('admin_training');
    expect(candidate.createdBy).toBe('admin-1');
    expect(candidate.sourceReference).toBe('admin-training');
  });

  it('builds a language-independent cognitive plan with context and verification', async () => {
    const brain = new CognitiveBrain();
    const first = await brain.plan('Translate this to Edo', 'session-1');
    const followUp = await brain.plan('Make it more respectful', 'session-1', [
      { role: 'user', content: 'Translate this to Edo' },
    ]);

    expect(first.capability).toBe('language');
    expect(first.targetLanguage).toBe('edo');
    expect(first.semantic.sourceLanguage).toBe('en');
    expect(first.verification.passed).toBe(true);
    expect(followUp.context.currentIntent).toBe('chat');
    expect(followUp.context.targetLanguage).toBe('edo');
    expect(followUp.context.topic).toContain('Translate this to Edo');
  });

  it('supports capability plugins without replacing the classifier', async () => {
    const brain = new CognitiveBrain();
    brain.registerPlugin({
      capability: 'chat',
      canHandle: (plan) => plan.capability === 'chat',
      execute: async (plan) => plan.semantic.preservedExpression,
    });
    const plan = await brain.plan('Abeg, make we go now');
    expect(await brain.execute(plan)).toBe('Abeg, make we go now');
  });
});
