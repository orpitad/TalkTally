import { getHistory } from './sessionStorage';
import {
  SESSION_CONTENT_MAP,
  VOCAL_PLAY_STEPS,
  SIMPLE_WORDS_STEPS,
  PHONEME_FOCUS_STEPS,
  SENTENCE_BUILDING_STEPS,
  SessionStep,
} from './sessionData';

export type SessionType =
  | 'Vocal Play'
  | 'Simple Words'
  | 'Phoneme Focus'
  | 'Sentence Building';

export interface Recommendation {
  title: string;
  sessionType: SessionType;
  reason: string;
  steps: SessionStep[];
}

export const getNextRecommendation = async (): Promise<Recommendation> => {
  const history = await getHistory();

  // First session ever
  if (history.length === 0) {
    return {
      title: 'Getting Started',
      sessionType: 'Vocal Play',
      reason: "Let's start with some fun sounds to get used to the app!",
      steps: VOCAL_PLAY_STEPS,
    };
  }

  // Average accuracy of last 3 sessions
  const lastThree = history.slice(0, 3);
  const avgAccuracy =
    lastThree.reduce((acc, curr) => acc + curr.accuracy, 0) / lastThree.length;

  // Count how many sessions of each type have been done
  // (stored in history once we pass sessionType through — for now use accuracy bands)

  if (avgAccuracy < 30) {
    return {
      title: 'Just Make Sounds',
      sessionType: 'Vocal Play',
      reason: 'Focus on making any sound at all. No pressure — just play!',
      steps: VOCAL_PLAY_STEPS,
    };
  }

  if (avgAccuracy >= 30 && avgAccuracy < 50) {
    return {
      title: 'Sound Foundations',
      sessionType: 'Phoneme Focus',
      reason: "Great effort! Let's practice specific sounds that build words.",
      steps: PHONEME_FOCUS_STEPS,
    };
  }

  if (avgAccuracy >= 50 && avgAccuracy < 75) {
    return {
      title: 'First Words',
      sessionType: 'Simple Words',
      reason: "You're making progress! Time to try some real 1-syllable words.",
      steps: SIMPLE_WORDS_STEPS,
    };
  }

  return {
    title: 'Putting Words Together',
    sessionType: 'Sentence Building',
    reason: "Amazing work! Let's start combining two words into phrases.",
    steps: SENTENCE_BUILDING_STEPS,
  };
};