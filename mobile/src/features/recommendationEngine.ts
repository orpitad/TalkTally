import { getHistory } from './sessionStorage';
import { ALL_SESSIONS, SessionDefinition, SessionStep } from './sessionData';

export interface Recommendation {
  sessionNumber: number;        // 1–15
  title: string;
  sessionType: string;
  level: string;
  reason: string;
  steps: SessionStep[];
  isLastSession: boolean;       // true when on session 15
  progressPercent: number;      // 0–100 overall progress
}

// Level labels and colours for UI
export const LEVEL_META = {
  Beginner:     { emoji: '🌱', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  Intermediate: { emoji: '🌿', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  Experienced:  { emoji: '🌳', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

const LEVEL_UNLOCK: Record<string, number> = {
  Beginner:     0,   // sessions 1–5
  Intermediate: 5,   // sessions 6–10 (unlocks after 5 sessions)
  Experienced:  10,  // sessions 11–15 (unlocks after 10 sessions)
};

// Reasons shown on the home screen card
const REASONS: Record<number, string> = {
  1:  "Let's start with some fun sounds. No pressure — just play!",
  2:  "Time to practice mouth shapes that build speech foundations.",
  3:  "Great start! Let's focus on your first consonant sounds — B, M and P.",
  4:  "Body parts are always nearby — perfect for quick word practice!",
  5:  "Let's name the things your child loves most.",
  6:  "Verbs are the engine of language. Let's get moving!",
  7:  "Animals + sounds = double the fun and double the learning!",
  8:  "Building on your first sounds with D, W and N.",
  9:  "Two-word requests are a game-changer. Let's practice them!",
  10: "Adding describing words opens up a whole new world of language.",
  11: "Questions show curiosity — the biggest sign of a growing mind!",
  12: "Naming emotions helps your child communicate needs and feelings.",
  13: "Three words together — your child is telling mini stories!",
  14: "Polishing advanced sounds that make speech clearer.",
  15: "This is the mastery session. Your child has come so far! 🌟",
};

export const getNextRecommendation = async (): Promise<Recommendation> => {
  const history = await getHistory();
  const completedCount = history.length;

  // Determine which session to show next (1-indexed, wraps after 15)
  // After completing all 15, cycle back to session 1 (mastery loop)
  const nextSessionIndex = completedCount % ALL_SESSIONS.length;
  const session: SessionDefinition = ALL_SESSIONS[nextSessionIndex];

  return {
    sessionNumber:   session.id,
    title:           session.title,
    sessionType:     session.type,
    level:           session.level,
    reason:          REASONS[session.id] ?? session.description,
    steps:           session.steps,
    isLastSession:   session.id === 15,
    progressPercent: Math.min(Math.round((completedCount / 15) * 100), 100),
  };
};

// Utility: get all sessions the user has unlocked
export const getUnlockedSessions = (completedCount: number): SessionDefinition[] => {
  return ALL_SESSIONS.filter((_, i) => i <= completedCount);
};

// Utility: get current level label
export const getCurrentLevel = (completedCount: number): string => {
  if (completedCount >= 10) return 'Experienced';
  if (completedCount >= 5)  return 'Intermediate';
  return 'Beginner';
};