import { storage } from "@/src/utils/storage";

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
export type AuthUser = { id: string; email: string; created_at: string };
export type AuthResponse = { token: string; user: AuthUser };

async function req<T>(path: string, opts: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((opts.headers as any) || {}) };
  if (auth) {
    const token = await storage.secureGet<string>("talktally.jwt", "");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  if (!res.ok) {
    let msg = `API ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      msg = `${msg}: ${await res.text()}`;
    }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  // Auth
  requestCode: (email: string) =>
    req<{ message: string }>("/auth/request-code", { method: "POST", body: JSON.stringify({ email }) }),
  verifyCode: (email: string, code: string) =>
    req<AuthResponse>("/auth/verify-code", { method: "POST", body: JSON.stringify({ email, code }) }),
  me: () => req<AuthUser>("/auth/me", {}, true),

  // Profiles / sessions / transcribe
  createProfile: (name: string, age_cohort: string) =>
    req<Profile>("/profiles", { method: "POST", body: JSON.stringify({ name, age_cohort }) }, true),
  getProfile: (id: string) => req<Profile>(`/profiles/${id}`, {}, true),
  createSession: (payload: {
    profile_id: string;
    category_id: string;
    category_label: string;
    targets: SessionTargetPayload[];
  }) => req<SessionSummary>("/sessions", { method: "POST", body: JSON.stringify(payload) }, true),
  listSessions: (profile_id: string) =>
    req<SessionSummary[]>(`/sessions?profile_id=${encodeURIComponent(profile_id)}`, {}, true),
  getSession: (id: string) => req<SessionDetail>(`/sessions/${id}`, {}, true),
  transcribe: (audio_base64: string, ext: string, target_word: string) =>
    req<TranscribeResult>(
      "/transcribe",
      { method: "POST", body: JSON.stringify({ audio_base64, ext, target_word }) },
      true
    ),
};
