import { describe, expect, it } from 'vitest';
import {
  createLearnerState,
  createTeachingSession,
  evaluateTeachingAnswer,
  renderSpeechLecture,
  renderTextLecture,
  setTeachingDeliveryMode,
} from '../index';

describe('delivery-independent Personal Professor', () => {
  it('renders text and speech from the same lesson session', () => {
    const session = createTeachingSession('Teach me electrical engineering', createLearnerState('learner-1', 'beginner'), 'text');
    expect(renderTextLecture(session)).toContain('Learning objectives');
    expect(renderSpeechLecture(session)).toHaveLength(session.lessonSegments.length);
    expect(renderSpeechLecture(session)[0]).toContain('Let us begin');
  });

  it('preserves learner state while switching delivery modes', () => {
    const session = createTeachingSession('Ohm law', createLearnerState('learner-1'), 'text');
    const audio = setTeachingDeliveryMode(session, 'audio');
    const combined = setTeachingDeliveryMode(audio, 'audio_text');
    expect(combined.learnerState).toEqual(session.learnerState);
    expect(combined.topic).toBe(session.topic);
  });

  it('advances correct answers and remediates incorrect answers', () => {
    const session = createTeachingSession('Ohm law');
    const wrong = evaluateTeachingAnswer(session, 'I am not sure');
    expect(wrong.correct).toBe(false);
    expect(wrong.session.learnerState.weakConcepts).toContain(session.topic);
    const right = evaluateTeachingAnswer(session, 'Ohm law describes a relationship between voltage and current');
    expect(right.correct).toBe(true);
    expect(right.session.learnerState.assessmentHistory).toHaveLength(1);
  });
});
