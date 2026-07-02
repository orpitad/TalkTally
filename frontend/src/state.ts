// Simple in-memory session-in-progress store (audio blobs are too large for router params).
import type { PhonemeCategory, PhonemeTarget } from "./data/phonemes";
import type { SessionTargetPayload, SessionSummary } from "./api";

type ActiveSession = {
  category: PhonemeCategory;
  targets: SessionTargetPayload[];
  startedAt: number;
};

let active: ActiveSession | null = null;
let lastSummary: SessionSummary | null = null;

export const sessionStore = {
  start(category: PhonemeCategory) {
    active = { category, targets: [], startedAt: Date.now() };
  },
  addTarget(target: PhonemeTarget, correct: boolean, transcript = "", audio_base64 = "", audio_ext = "m4a") {
    if (!active) return;
    active.targets.push({
      word: target.word,
      target_phoneme: target.target_phoneme,
      correct,
      transcript,
      audio_base64,
      audio_ext,
    });
  },
  get() {
    return active;
  },
  clear() {
    active = null;
  },
  setSummary(s: SessionSummary) {
    lastSummary = s;
  },
  getSummary() {
    return lastSummary;
  },
};
