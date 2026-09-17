import type { LanguageDetection } from './types';
import { defaultLanguageRegistry, LanguageRegistry } from './registry';

const normalize = (value: string) => value.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function detectLanguage(text: string, registry: LanguageRegistry = defaultLanguageRegistry): LanguageDetection {
  const source = String(text || '').trim();
  if (!source) return { languageId: 'unknown', confidence: 0, level: 'unknown', reliable: false, segments: [], codeSwitching: false };

  const normalized = normalize(source);
  const scores = new Map<string, number>();
  for (const item of registry.list()) {
    let score = 0;
    for (const hint of item.detectionHints) {
      const token = normalize(hint);
      if (normalized.includes(token)) score += token.includes(' ') ? 3 : 2;
    }
    if (score > 0) scores.set(item.languageId, score);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    const english = /\b(the|and|is|are|what|how|please|this|that|with|you|your)\b/i.test(source);
    return { languageId: english ? 'en' : 'unknown', confidence: english ? 0.62 : 0.15, level: english ? 'medium' : 'unknown', reliable: english, segments: [{ text: source, languageId: english ? 'en' : 'unknown', confidence: english ? 0.62 : 0.15 }], codeSwitching: false };
  }

  const [winner, winningScore] = ranked[0];
  const total = ranked.reduce((sum, [, score]) => sum + score, 0);
  const confidence = Math.min(0.99, 0.55 + (winningScore / Math.max(total, 1)) * 0.44);
  const competing = ranked.filter(([, score]) => score >= Math.max(2, winningScore * 0.45)).map(([languageId]) => languageId);
  const codeSwitching = competing.length > 1 || (winner !== 'en' && /\b(the|and|is|are|please|with|my|your)\b/i.test(source));
  const segments = codeSwitching
    ? source.split(/([,.;!?]+)/).filter(Boolean).map((segment) => ({ text: segment, languageId: detectSegment(segment, winner, registry), confidence: 0.55 }))
    : [{ text: source, languageId: winner, confidence }];

  return { languageId: winner, confidence, level: confidence >= 0.8 ? 'high' : confidence >= 0.55 ? 'medium' : 'low', reliable: confidence >= 0.55, segments, codeSwitching };
}

function detectSegment(segment: string, fallback: string, registry: LanguageRegistry): string {
  const normalized = normalize(segment);
  for (const item of registry.list()) {
    if (item.detectionHints.some((hint) => normalized.includes(normalize(hint)))) return item.languageId;
  }
  return fallback;
}
