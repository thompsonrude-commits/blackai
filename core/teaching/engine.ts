import type {
  LearnerLevel,
  LearnerState,
  ResourceProvenance,
  TeachingDeliveryMode,
  TeachingResponse,
  TeachingQuestion,
  TeachingSession,
} from './types';

const STORAGE_PREFIX = 'blackai_teaching_session:';

const DEFAULT_PROVENANCE: ResourceProvenance = {
  source: 'local-professor-lesson-planner',
  version: '1.0',
  confidence: 0.7,
  researchStatus: 'local',
  knowledgeStatus: 'approved',
};

function normalizeTopic(input: string): string {
  return input
    .replace(/^\s*(teach|explain|lesson|lecture|learn)\s+(?:me\s+)?/i, '')
    .replace(/\b(to me|please|about)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'the requested concept';
}

function inferLevel(input: string): LearnerLevel {
  if (/\b(professional|expert|advanced|graduate|research)\b/i.test(input)) return 'professional';
  if (/\b(intermediate|undergraduate|university)\b/i.test(input)) return 'intermediate';
  return 'beginner';
}

function levelPhrase(level: LearnerLevel): string {
  return level === 'beginner'
    ? 'We will build the idea from first principles and connect each term to something familiar.'
    : level === 'intermediate'
      ? 'We will connect the core idea to its formal model and use it in a practical setting.'
      : 'We will work with the formal model, assumptions, limitations, and professional implications.';
}

function segment(
  id: string,
  kind: TeachingSession['lessonSegments'][number]['kind'],
  title: string,
  text: string,
  provenance: ResourceProvenance,
): TeachingSession['lessonSegments'][number] {
  const speech = text
    .replace(/\*\*/g, '')
    .replace(/\n+/g, ' ')
    .replace(/:/g, '.');
  return { id, kind, title, text, speech, provenance };
}

export function createLearnerState(learnerId = 'anonymous', level: LearnerLevel = 'beginner'): LearnerState {
  return {
    learnerId,
    level,
    currentConcept: '',
    completedConcepts: [],
    weakConcepts: [],
    misconceptions: [],
    assessmentHistory: [],
    mastery: {},
    lessonPosition: 0,
  };
}

export function createTeachingSession(
  request: string,
  learnerState = createLearnerState(),
  deliveryMode: TeachingDeliveryMode = 'text',
  provenance: ResourceProvenance = DEFAULT_PROVENANCE,
): TeachingSession {
  const topic = normalizeTopic(request);
  const level = learnerState.level === 'beginner' && inferLevel(request) !== 'beginner'
    ? inferLevel(request)
    : learnerState.level;
  const state = { ...learnerState, level, currentConcept: topic };
  const objective = `Explain ${topic} clearly, apply it to a realistic situation, and check whether the learner can use the idea independently.`;
  const question: TeachingQuestion = {
    id: `${topic.toLowerCase().replace(/\W+/g, '-')}-check`,
    prompt: `Before we continue, explain in your own words what ${topic} means and why it matters.`,
    expectedConcept: topic,
    remediation: `Let us slow down and revisit the central idea of ${topic} using a simpler example before trying the question again.`,
    advancement: `Good. You have shown a working understanding of ${topic}; next we can examine a more demanding application.`,
  };
  const segments = [
    segment('intro', 'introduction', 'Introduction', `Let us begin with ${topic}. Think of this as a guided conversation: I will introduce the idea, connect it to what you already know, and then ask you to use it.`, provenance),
    segment('connection', 'connection', 'Connection to previous knowledge', `You already have useful knowledge to build on. ${levelPhrase(level)} The important question is not only what ${topic} is, but how it changes the way you reason about a real problem.`, provenance),
    segment('objectives', 'objective', 'Learning objectives', `By the end of this lesson, you should be able to: define ${topic}; recognize its key parts; explain one example; and use the idea to solve a practical problem.`, provenance),
    segment('explanation', 'explanation', 'Core explanation', `${topic} is best understood as a relationship between an idea, the conditions that shape it, and the result it produces. We will keep asking what changes, what stays constant, and what evidence would show that our explanation is sound.`, provenance),
    segment('example', 'example', 'Worked example', `Imagine a practical situation involving ${topic}. Start by naming the problem, identify the relevant parts, then predict what should happen before checking the result. This turns a definition into a method you can reuse.`, provenance),
    segment('analogy', 'analogy', 'Analogy', `A useful analogy is to think of ${topic} as a system with inputs, a process, and an outcome. The analogy is not the full technical model, but it gives us a mental map before we add precision.`, provenance),
    segment('application', 'application', 'Practical application', `Professionals use ${topic} when they need to make a decision, explain evidence, or predict an outcome. In practice, state your assumptions, apply the concept, and check whether the conclusion fits the available evidence.`, provenance),
    segment('question', 'question', 'Professor question', question.prompt, provenance),
    segment('exercise', 'exercise', 'Practice exercise', `Try this: choose one familiar example of ${topic}, describe its input and outcome, and explain what would change if one important condition changed.`, provenance),
    segment('recap', 'recap', 'Recap', `Today we introduced ${topic}, connected it to prior knowledge, built a mental model, and applied it to a practical situation. The key habit is to explain the relationship rather than memorize an isolated sentence.`, provenance),
    segment('transition', 'transition', 'Next concept', `Once you can explain ${topic} and use it in an example, we can move to its limitations, competing interpretations, and a more advanced assessment.`, provenance),
  ];
  return {
    sessionId: `teach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topic,
    learnerState: state,
    competency: topic,
    objectives: [objective],
    lessonSegments: segments,
    questions: [question],
    examples: [`A practical example involving ${topic}`],
    exercises: [`Apply ${topic} to a familiar real-world situation.`],
    assessment: { prompt: question.prompt, expectedConcept: topic },
    deliveryMode,
    provenance,
    createdAt: Date.now(),
  };
}

export function renderTextLecture(session: TeachingSession): string {
  return session.lessonSegments.map((item) => `**${item.title}**\n\n${item.text}`).join('\n\n');
}

export function renderSpeechLecture(session: TeachingSession): string[] {
  return session.lessonSegments.map((item) => item.speech);
}

export function renderTeachingResponse(session: TeachingSession): TeachingResponse {
  return { session, text: renderTextLecture(session), speechSegments: renderSpeechLecture(session) };
}

export function evaluateTeachingAnswer(
  session: TeachingSession,
  answer: string,
): { correct: boolean; feedback: string; session: TeachingSession } {
  const normalized = answer.toLowerCase();
  const topicWords = session.topic.toLowerCase().split(/\s+/).filter((word) => word.length >= 3);
  const correct = topicWords.length > 0 && topicWords.some((word) => normalized.includes(word));
  const now = Date.now();
  const mastery = Math.min(1, (session.learnerState.mastery[session.topic] ?? 0) + (correct ? 0.25 : 0));
  const nextState: LearnerState = {
    ...session.learnerState,
    assessmentHistory: [...session.learnerState.assessmentHistory, { prompt: session.assessment.prompt, answer, correct, at: now }],
    mastery: { ...session.learnerState.mastery, [session.topic]: mastery },
    completedConcepts: correct && mastery >= 0.75 && !session.learnerState.completedConcepts.includes(session.topic)
      ? [...session.learnerState.completedConcepts, session.topic]
      : session.learnerState.completedConcepts,
    weakConcepts: correct
      ? session.learnerState.weakConcepts.filter((item) => item !== session.topic)
      : [...new Set([...session.learnerState.weakConcepts, session.topic])],
    misconceptions: correct ? session.learnerState.misconceptions : [...new Set([...session.learnerState.misconceptions, answer])],
    lessonPosition: correct ? session.learnerState.lessonPosition + 1 : session.learnerState.lessonPosition,
  };
  return {
    correct,
    feedback: correct ? session.questions[0].advancement : session.questions[0].remediation,
    session: { ...session, learnerState: nextState },
  };
}

export function saveTeachingSession(session: TeachingSession): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${STORAGE_PREFIX}${session.learnerState.learnerId}`, JSON.stringify(session));
}

export function loadTeachingSession(learnerId = 'anonymous'): TeachingSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${learnerId}`);
    return raw ? JSON.parse(raw) as TeachingSession : null;
  } catch {
    return null;
  }
}

export function setTeachingDeliveryMode(session: TeachingSession, deliveryMode: TeachingDeliveryMode): TeachingSession {
  return { ...session, deliveryMode };
}
