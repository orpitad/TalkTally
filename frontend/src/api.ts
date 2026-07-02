const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BASE) {
  console.warn("EXPO_PUBLIC_BACKEND_URL is not set");
}

export type Profile = { id: string; name: string; age_cohort: string; created_at: string };
export type SessionTargetPayload = {
  word: string;
  target_phoneme: string;
  correct: boolean;
  transcript?: string;
  audio_base64?: string;
  audio_ext?: string;
};
export type SessionSummary = {
  id: string;
  profile_id: string;
  category_id: string;
  category_label: string;
  accuracy: number;
  correct_count: number;
  total_count: number;
  timestamp: string;
  target_words: string[];
};
export type SessionDetail = SessionSummary & { targets: SessionTargetPayload[] };
export type TranscribeResult = { transcript: string; match_score: number; correct: boolean };

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json();
}

export const api = {
  createProfile: (name: string, age_cohort: string) =>
    req<Profile>("/profiles", { method: "POST", body: JSON.stringify({ name, age_cohort }) }),
  getProfile: (id: string) => req<Profile>(`/profiles/${id}`),
  createSession: (payload: {
    profile_id: string;
    category_id: string;
    category_label: string;
    targets: SessionTargetPayload[];
  }) => req<SessionSummary>("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  listSessions: (profile_id: string) =>
    req<SessionSummary[]>(`/sessions?profile_id=${encodeURIComponent(profile_id)}`),
  getSession: (id: string) => req<SessionDetail>(`/sessions/${id}`),
  transcribe: (audio_base64: string, ext: string, target_word: string) =>
    req<TranscribeResult>("/transcribe", {
      method: "POST",
      body: JSON.stringify({ audio_base64, ext, target_word }),
    }),
};
