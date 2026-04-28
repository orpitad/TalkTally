import { getHistory, SessionRecord } from './sessionStorage';

export type SessionType = 'Vocal Play' | 'Simple Words' | 'Phoneme Focus' | 'Sentence Building';

interface Recommendation {
  title: string;
  sessionType: SessionType;
  reason: string;
}

export const getNextRecommendation = async (): Promise<Recommendation> => {
  const history = await getHistory();
  
  if (history.length === 0) {
    return {
      title: "Getting Started",
      sessionType: 'Vocal Play',
      reason: "Let's start with some fun sounds to get used to the app!"
    };
  }

  // Calculate average accuracy of the last 3 sessions
  const lastThree = history.slice(0, 3);
  const avgAccuracy = lastThree.reduce((acc, curr) => acc + curr.accuracy, 0) / lastThree.length;

  if (avgAccuracy < 40) {
    return {
      title: "Vocal Encouragement",
      sessionType: 'Vocal Play',
      reason: "Focusing on making any sound at all. No pressure, just play!"
    };
  } else if (avgAccuracy >= 40 && avgAccuracy < 80) {
    return {
      title: "Building Blocks",
      sessionType: 'Simple Words',
      reason: "Great progress! Let's try some specific 1-syllable words."
    };
  } else {
    return {
      title: "Advanced Mastery",
      sessionType: 'Sentence Building',
      reason: "You're crushing it! Time to try putting two words together."
    };
  }
};