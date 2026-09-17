import type { ExtractedTrainingEntry } from '../../src/lib/trainingExtraction';
import { LanguageKnowledgeStore } from './knowledge';
import type { KnowledgeSource } from './types';

export function ingestTrainingEntries(
  entries: ExtractedTrainingEntry[],
  languageId: string,
  store: LanguageKnowledgeStore,
  options: { createdBy?: string; sourceReference?: string; sourceType?: KnowledgeSource } = {},
) {
  return entries.map((entry) => store.createCandidate({
    languageId,
    expression: entry.nativeText,
    meaning: entry.englishText,
    pronunciation: entry.phonetics || undefined,
    examples: entry.context ? [entry.context] : [],
    category: entry.type === 'culture' ? 'culture' : entry.type === 'conversation' ? 'expression' : 'vocabulary',
    sourceType: options.sourceType ?? 'admin_training',
    createdBy: options.createdBy,
    sourceReference: options.sourceReference,
  }));
}
