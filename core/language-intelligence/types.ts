export type SupportLevel = 'planned' | 'experimental' | 'partial' | 'supported' | 'verified';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';
export type KnowledgeStatus = 'candidate' | 'under_review' | 'verified' | 'rejected' | 'superseded';
export type KnowledgeSource = 'admin_training' | 'verified_user' | 'community_contribution' | 'system_generated' | 'imported_dataset';
export type KnowledgeCategory = 'vocabulary' | 'expression' | 'idiom' | 'proverb' | 'grammar' | 'culture' | 'pronunciation' | 'terminology';

export interface LanguageProfile {
  languageId: string;
  displayName: string;
  nativeName: string;
  alternativeNames: string[];
  languageFamily: string;
  countryRegions: string[];
  dialects: string[];
  writingSystems: string[];
  supportLevel: SupportLevel;
  rtl: boolean;
  capabilities: {
    textInput: boolean;
    textOutput: boolean;
    translation: boolean;
    interpretation: boolean;
    speechRecognition: boolean;
    textToSpeech: boolean;
    conversation: boolean;
    learning: boolean;
  };
  culturalContextAvailable: boolean;
  trainingDataAvailable: boolean;
  detectionHints: string[];
}

export interface LanguageDetection {
  languageId: string;
  confidence: number;
  level: ConfidenceLevel;
  reliable: boolean;
  segments: Array<{ text: string; languageId: string; confidence: number }>;
  codeSwitching: boolean;
  dialect?: string;
}

export interface SemanticRepresentation {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage?: string;
  intent: string;
  meaning: string;
  entities: Array<{ value: string; type: string }>;
  relationships?: Array<{ subject: string; relation: string; object: string }>;
  numbers?: string[];
  dates?: string[];
  locations?: string[];
  names?: string[];
  tone?: string;
  emotion?: string;
  culturalContext?: string;
  idioms: string[];
  ambiguity: string[];
  codeSwitching?: boolean;
  confidence?: number;
  provenance?: string[];
  preservedExpression: string;
}

export interface KnowledgeRecord {
  knowledgeId: string;
  languageId: string;
  targetLanguageId?: string;
  dialect?: string;
  expression: string;
  meaning: string;
  literalMeaning?: string;
  translation?: string;
  category: KnowledgeCategory;
  examples: string[];
  pronunciation?: string;
  sourceType: KnowledgeSource;
  sourceReference?: string;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
  confidence: number;
  verificationStatus: KnowledgeStatus;
  verificationHistory: Array<{ status: KnowledgeStatus; actor?: string; at: number; note?: string }>;
  numberOfConfirmations: number;
  conflictingInterpretations: string[];
  version: number;
}

export interface KnowledgeCandidateInput {
  languageId: string;
  targetLanguageId?: string;
  dialect?: string;
  expression: string;
  meaning: string;
  literalMeaning?: string;
  translation?: string;
  category?: KnowledgeCategory;
  examples?: string[];
  pronunciation?: string;
  sourceType: KnowledgeSource;
  sourceReference?: string;
  createdBy?: string;
}

export interface LanguageProvider {
  translate(input: {
    sourceText: string;
    sourceLanguage: string;
    targetLanguage: string;
    semantic?: SemanticRepresentation;
  }): Promise<{ text: string; confidence?: number; provider: string }>;
  interpret?(input: {
    sourceText: string;
    sourceLanguage: string;
    semantic: SemanticRepresentation;
  }): Promise<Partial<SemanticRepresentation>>;
}

export interface TranslationResult {
  original: string;
  sourceLanguage: LanguageDetection;
  targetLanguage: string;
  text: string;
  semantic: SemanticRepresentation;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  provider: string;
  verified: boolean;
  notes: string[];
}

export interface CognitiveContext {
  sessionId?: string;
  previousLanguage?: string;
  targetLanguage?: string;
  currentIntent?: string;
  topic?: string;
  lastUserMessage?: string;
  lastResponse?: string;
}

export interface CognitivePlan {
  language: LanguageDetection;
  semantic: SemanticRepresentation;
  capability: string;
  targetLanguage?: string;
  context: CognitiveContext;
  knowledge: KnowledgeRecord[];
  verification: VerificationResult;
}

export interface VerificationResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  warnings: string[];
}
