import type { KnowledgeCandidateInput, KnowledgeRecord, KnowledgeStatus } from './types';

const id = () => `lk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export class LanguageKnowledgeStore {
  private readonly records = new Map<string, KnowledgeRecord>();

  createCandidate(input: KnowledgeCandidateInput): KnowledgeRecord {
    if (!input.languageId || !input.expression.trim() || !input.meaning.trim()) throw new Error('languageId, expression, and meaning are required');
    const now = Date.now();
    const record: KnowledgeRecord = {
      knowledgeId: id(),
      languageId: input.languageId,
      targetLanguageId: input.targetLanguageId,
      dialect: input.dialect,
      expression: input.expression.trim(),
      meaning: input.meaning.trim(),
      literalMeaning: input.literalMeaning?.trim(),
      translation: input.translation?.trim(),
      category: input.category ?? 'expression',
      examples: input.examples ?? [],
      pronunciation: input.pronunciation?.trim(),
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      confidence: input.sourceType === 'admin_training' ? 0.85 : 0.55,
      verificationStatus: input.sourceType === 'admin_training' ? 'under_review' : 'candidate',
      verificationHistory: [{ status: input.sourceType === 'admin_training' ? 'under_review' : 'candidate', actor: input.createdBy, at: now }],
      numberOfConfirmations: 0,
      conflictingInterpretations: [],
      version: 1,
    };
    this.records.set(record.knowledgeId, record);
    this.detectConflicts(record);
    return this.clone(record);
  }

  search(languageId: string, expression: string, targetLanguageId?: string): KnowledgeRecord[] {
    const needle = expression.toLocaleLowerCase().trim();
    return [...this.records.values()]
      .filter((record) => record.languageId === languageId && (!targetLanguageId || !record.targetLanguageId || record.targetLanguageId === targetLanguageId))
      .filter((record) => record.verificationStatus !== 'rejected' && record.verificationStatus !== 'superseded')
      .filter((record) => record.expression.toLocaleLowerCase() === needle || record.expression.toLocaleLowerCase().includes(needle) || needle.includes(record.expression.toLocaleLowerCase()))
      .sort((a, b) => Number(b.verificationStatus === 'verified') - Number(a.verificationStatus === 'verified') || b.confidence - a.confidence)
      .map((record) => this.clone(record));
  }

  searchApproved(languageId: string, expression: string, targetLanguageId?: string): KnowledgeRecord[] {
    return this.search(languageId, expression, targetLanguageId)
      .filter((record) => record.verificationStatus === 'verified');
  }

  setStatus(knowledgeId: string, status: KnowledgeStatus, actor?: string, note?: string): KnowledgeRecord {
    const record = this.records.get(knowledgeId);
    if (!record) throw new Error(`Knowledge record not found: ${knowledgeId}`);
    if (record.verificationStatus === 'verified' && status !== 'verified' && actor !== record.createdBy) throw new Error('Verified knowledge requires an authorized verification actor');
    record.verificationStatus = status;
    record.updatedAt = Date.now();
    record.version += 1;
    record.verificationHistory.push({ status, actor, at: record.updatedAt, note });
    if (status === 'verified') record.confidence = Math.max(record.confidence, 0.9);
    return this.clone(record);
  }

  list(): KnowledgeRecord[] {
    return [...this.records.values()].map((record) => this.clone(record));
  }

  private detectConflicts(newRecord: KnowledgeRecord): void {
    for (const record of this.records.values()) {
      if (record.knowledgeId === newRecord.knowledgeId || record.languageId !== newRecord.languageId || record.expression.toLocaleLowerCase() !== newRecord.expression.toLocaleLowerCase()) continue;
      if (record.meaning.toLocaleLowerCase() !== newRecord.meaning.toLocaleLowerCase()) {
        record.conflictingInterpretations.push(newRecord.meaning);
        newRecord.conflictingInterpretations.push(record.meaning);
      }
    }
  }

  private clone(record: KnowledgeRecord): KnowledgeRecord {
    return { ...record, examples: [...record.examples], conflictingInterpretations: [...record.conflictingInterpretations], verificationHistory: record.verificationHistory.map((item) => ({ ...item })) };
  }
}
