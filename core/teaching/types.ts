export type TeachingDeliveryMode = 'text' | 'audio' | 'audio_text';

export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export type TeachingSegmentKind =
  | 'introduction'
  | 'connection'
  | 'objective'
  | 'explanation'
  | 'example'
  | 'analogy'
  | 'application'
  | 'question'
  | 'exercise'
  | 'recap'
  | 'transition';

export interface LearnerState {
  learnerId: string;
  level: LearnerLevel;
  currentConcept: string;
  completedConcepts: string[];
  weakConcepts: string[];
  misconceptions: string[];
  assessmentHistory: Array<{ prompt: string; answer: string; correct: boolean; at: number }>;
  mastery: Record<string, number>;
  lessonPosition: number;
}

export interface ResourceProvenance {
  source: string;
  version: string;
  confidence: number;
  researchStatus: 'local' | 'reviewed' | 'verified';
  knowledgeStatus: 'approved' | 'candidate';
}

export interface LessonSegment {
  id: string;
  kind: TeachingSegmentKind;
  title: string;
  text: string;
  speech: string;
  provenance: ResourceProvenance;
}

export interface TeachingQuestion {
  id: string;
  prompt: string;
  expectedConcept: string;
  remediation: string;
  advancement: string;
}

export interface TeachingSession {
  sessionId: string;
  topic: string;
  learnerState: LearnerState;
  competency: string;
  objectives: string[];
  lessonSegments: LessonSegment[];
  questions: TeachingQuestion[];
  examples: string[];
  exercises: string[];
  assessment: { prompt: string; expectedConcept: string };
  deliveryMode: TeachingDeliveryMode;
  provenance: ResourceProvenance;
  createdAt: number;
}

export interface TeachingResponse {
  session: TeachingSession;
  text: string;
  speechSegments: string[];
}
