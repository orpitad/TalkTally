# TalkTally — Product Requirements Document

## Summary
**TalkTally** is a warm, tactile Expo mobile companion that helps parents of toddlers (12–36 months) practice developmental speech milestones with their child. It combines guided phonetic flashcards, mic-based room calibration, on-device recording, and AI-scored pronunciation (**Groq Whisper-large-v3-turbo**, free tier), all synced to a MongoDB session history via a FastAPI backend.

## Users
- Parents/caregivers of toddlers doing home speech practice.
- Optional secondary users: SLPs coaching a family remotely (reviewing session logs).

## Core User Flow (v1)
1. **Onboarding** — Enter child's first name (default "Child") and pick an age cohort (12–18M / 18–24M / 24–30M / 30–36M). Profile is stored in MongoDB and locally (AsyncStorage).
2. **Home dashboard** — Avatar with initials, cohort label, "Smart Tip" recommendation card, segmented tabs:
   - **Syllabus** — Cards for phoneme milestones (Bilabials /p,b,m/, Alveolars /t,d,n/, Velars /k,g/, Glides, Nasal endings, Early fricatives, /h/, Two-syllable words, Lateral /l/, Rhotic /r/, Sh/Ch, Voiced fricatives, Blends, Short phrases — 15 total). Filtered by age cohort.
   - **History** — Reverse-chronological session cards with accuracy ring, target words, tap → detail.
3. **Room calibration** — 2-second mic sweep with live LED-bar meter; captures noise floor before practice.
4. **Flashcard practice** — Word + emoji + phoneme + coaching tip. Tap-to-record → live "sound bubble" visualizer → auto-transcribe with Whisper → AI match score → parent taps **Correct** or **Skip**. Retry supported.
5. **Scoreboard** — Accuracy % ring, correct/total/XP, per-word transcript summary, "Complete Lesson" saves session.
6. **History detail** — Per-word rows with playback of the child's original recording (base64 audio stored per target).

## Tech Architecture
- **Frontend**: Expo 54 (React Native 0.81, expo-router 6 file-based routing), `expo-audio` for record + playback, `expo-file-system` for base64 encode, `expo-linear-gradient`, `@expo/vector-icons`, `react-native-safe-area-context`. AsyncStorage for local profile cache.
- **Backend**: FastAPI + Motor (async MongoDB). Routes under `/api`.
  - `POST /api/profiles` · `GET /api/profiles/{id}`
  - `POST /api/sessions` · `GET /api/sessions?profile_id=` · `GET /api/sessions/{id}`
  - `POST /api/transcribe` — accepts `{audio_base64, ext, target_word}`, calls Groq's official `AsyncGroq` client with model `whisper-large-v3-turbo` using `GROQ_API_KEY`, returns `{transcript, match_score, correct}`.
- **Storage**: MongoDB collections `profiles`, `sessions`. Audio clips stored as base64 inside each session's `targets` array.
- **AI**: `whisper-large-v3-turbo` via Groq (free tier). Match scoring = normalized string equality → substring → SequenceMatcher ratio. Threshold correct ≥ 65%.

## Design
- Personality: **Tactile / Playful LIGHT** (see `/app/design_guidelines.json`).
- Palette: cream surface `#FDFBF7`, coral brand `#FF8A65`, sky `#64B5F6`, mint success `#81C784`, warm cream tertiary `#F3EFE6`.
- Typography: system bold for display (falls back gracefully on all devices).
- Chunky ≥ 56pt buttons, oversized flashcards, soft shadows for physical "lift".

## Permissions
- iOS `NSMicrophoneUsageDescription` and Android `RECORD_AUDIO` declared via `expo-audio` config plugin + `app.json`.

## Non-goals (v1)
- Push notifications.
- Multi-child profiles.
- Clinician export/PDF reports.
- Offline mode (requires backend for Whisper).

## Next Enhancements
- Streaks + weekly progress chart.
- Per-phoneme mastery heatmap.
- Shareable clip card ("Watch my baby say Ball!") — social hook for organic growth.
