# TalkTally — Build Specification

A warm, tactile mobile app for parents of toddlers **12–36 months** that guides them through
speech-development milestones using flashcards, mic-based room calibration, on-device audio
recording, and **AI-scored pronunciation** (Groq Whisper), keeping a session history with
playback of the child's recordings.

This document is a complete, self-contained spec — hand it (or the copy-paste prompt at the
end) to an AI builder to recreate the app.

---

## 1. Tech Stack

**Frontend** — Expo SDK 54, React Native 0.81, TypeScript, expo-router v6 (file-based routing),
expo-audio (record/playback + dB metering), expo-file-system (base64 audio), expo-linear-gradient,
@expo/vector-icons (Ionicons), react-native-safe-area-context, AsyncStorage + expo-secure-store
(behind a storage wrapper). New Architecture enabled.

**Backend** — FastAPI + Uvicorn, Motor (async MongoDB), PyJWT (HS256, 90-day tokens),
passlib[bcrypt] (OTP hashing), official `groq` async SDK (Whisper `whisper-large-v3-turbo`),
pydantic + EmailStr. All routes prefixed `/api`, CORS open.

---

## 2. Auth Flow (passwordless email OTP)

1. User enters email → `POST /api/auth/request-code`. Backend generates a 6-digit code,
   bcrypt-hashes it, stores in `otp_requests` (10-min expiry, `attempts=0`), and **logs the
   plaintext to the server console** (`[TalkTally OTP] <email> -> <code>`). No real email is sent.
2. User enters code → `POST /api/auth/verify-code`. Enforces 10-min expiry + 5-attempt limit,
   upserts a `users` doc, returns `{ token, user }`.
3. JWT stored in secure storage, attached as `Authorization: Bearer <jwt>` on all authed calls.
   Sign-out clears it and returns to `/login`.

---

## 3. Screens & Routes (expo-router `app/`)

| Route | Purpose |
|---|---|
| `index.tsx` | **Boot gate** — reads JWT → `/login` if none; else `GET /auth/me` → `/home` (profile cached) or `/onboarding`. Shows a centered spinner. |
| `login.tsx` | Two-step email → 6-digit OTP. Paste support, auto-advance, backspace, 30s resend cooldown, error messaging. Stores JWT, routes to `/onboarding`. |
| `onboarding.tsx` | Child first name (default "Child") + age-cohort picker (`12-18M / 18-24M / 24-30M / 30-36M`). `POST /api/profiles`, cache id/name/cohort in AsyncStorage. |
| `home.tsx` | Avatar w/ initials, cohort chip, personalized **Smart Tip** card (frosted glass over gradient), segmented **Syllabus / History** control, pull-to-refresh, sign-out. |
| `calibrate.tsx` | 2-second mic sweep with live LED-bar dB meter (`useAudioRecorder({ isMeteringEnabled: true })`) to establish a room noise floor before practice. |
| `practice.tsx` | Flashcard session: word + emoji + phoneme + coaching tip. Tap-to-record → pulsing "sound bubble" → base64 encode → `POST /api/transcribe` → match score → Correct / Skip / Retry. On finish, `POST /api/sessions`. |
| `scoreboard.tsx` | Accuracy ring, correct/total/XP, per-word transcript, "Complete Lesson" commits and returns home. |
| `session/[id].tsx` | History detail — per-word audio playback (rebuild base64 → temp file → `Audio.createAudioPlayer`). |
| `_layout.tsx` | Root Stack + SafeAreaProvider; prewarms Ionicons font (required for Expo Go Android); manages splash screen. |

**User journey:**
`/login → /onboarding → /home → [Syllabus] → /calibrate → /practice → /scoreboard → /home`
`/home → [History] → /session/[id]`

---

## 4. Backend API Reference (all under `/api`, 🔒 = needs Bearer)

- `POST /auth/request-code` `{email}` → `{message}` (code logged to console)
- `POST /auth/verify-code` `{email, code}` → `{token, user}`
- `GET 🔒 /auth/me` → `UserOut`
- `POST 🔒 /profiles` `{name, age_cohort}` → `Profile`
- `GET 🔒 /profiles/{id}` → `Profile`
- `POST 🔒 /sessions` `{profile_id, category_id, category_label, targets[]}` → `SessionSummary`
- `GET 🔒 /sessions?profile_id=<id>` → `SessionSummary[]` (desc by timestamp, `.limit(100)`)
- `GET 🔒 /sessions/{id}` → `SessionDetail` (includes base64 audio per target)
- `POST 🔒 /transcribe` `{audio_base64, ext, target_word}` → `{transcript, match_score, correct}`

**Scoring:** normalize both strings to lowercase letters only; exact match = 100; substring
(either contains the other) = 95; else `difflib.SequenceMatcher` ratio × 100.
**`correct = match_score ≥ 65`.** Empty target or empty transcript = 0.

---

## 5. Data Models & Collections

- **Profile:** `id (uuid)`, `name`, `age_cohort`, `created_at`
- **SessionTarget:** `word`, `target_phoneme`, `correct`, `transcript`, `audio_base64`, `audio_ext` (default `m4a`)
- **SessionSummary:** `id`, `profile_id`, `category_id`, `category_label`, `accuracy (int %)`, `correct_count`, `total_count`, `timestamp`, `target_words[]`
- **SessionDetail:** SessionSummary + `targets[]` (with base64 audio)
- **User:** `id`, `email`, `created_at`
- Mongo collections: `users`, `otp_requests`, `profiles`, `sessions`.

---

## 6. Curriculum — 15 Age-Graded Phoneme Milestones

Each category: `id, label, phoneme_group, age_min_months, color, emoji, description, targets[]`.
Each target: `word, target_phoneme, emoji, coaching`. Home filters categories by
`age_min_months ≤ cohort start month`.

| # | Label | Group | Min age | Target words |
|---|---|---|---|---|
| 1 | Bilabials | /p, b, m/ | 12m | Mama, Papa, Ball, Baby |
| 2 | Alveolars | /t, d, n/ | 15m | Toe, Dog, No, Duck |
| 3 | Velars | /k, g/ | 18m | Cat, Go, Cup |
| 4 | Glides | /w, j/ | 18m | Wow, Yes, Water |
| 5 | Nasal Endings | /-n, -m, -ng/ | 20m | Down, Home, Sing |
| 6 | Early Fricatives | /f, s/ | 22m | Fish, Sun, Off |
| 7 | Aspirated /h/ | /h/ | 22m | Hi, Hop |
| 8 | Two-Syllable Words | CVCV | 24m | Bunny, Doggy, Kitty |
| 9 | Lateral /l/ | /l/ | 26m | Love, Ball, Lion |
| 10 | Rhotic /r/ | /r/ | 30m | Roar, Red, Car |
| 11 | Sh Words | /ʃ/ | 30m | Shoe, Fish, Shell |
| 12 | Ch Words | /tʃ/ | 30m | Chair, Cheese |
| 13 | Voiced Fricatives | /v, z/ | 32m | Van, Zoo, Bees |
| 14 | Consonant Blends | /bl, tr, sp/ | 34m | Blue, Truck, Spoon |
| 15 | Short Phrases | Multi-word | 30m | More milk, All done, My turn |

Every target carries a parent coaching tip, e.g. Ball → *"Voiced pop — lips together, then
release."*, Cat → *"Hold tongue tip down, back goes up."*, Roar → *"Curl tongue back, growl: 'rrr'."*

Cohort → min-month map: `12-18M→12, 18-24M→18, 24-30M→24, 30-36M→30`.

---

## 7. Design System — "Tactile / Playful (Light)"

Feels like a premium wooden educational toy: soft, chunky, friendly. Clinical trust for parents
+ playful delight for toddlers. **Avoid generic dark AI UI.**

**Colors**
| Token | Hex | Role |
|---|---|---|
| surface | `#FDFBF7` | Cream background |
| surface2 | `#FFFFFF` | Card |
| surface3 | `#F3EFE6` | Muted tertiary |
| brand | `#FF8A65` | Coral primary |
| brandSoft | `#FFE0B2` | Coral tint |
| brand2 | `#64B5F6` | Sky secondary |
| success | `#81C784` | Mint |
| warning | `#FFD54F` | Skip / warn |
| error | `#E57373` | Danger |
| onSurface | `#2A2A2E` | Body text |
| onSurfaceMuted | `#6B6A6F` | Secondary text |
| border | `#EAE6DF` | Hairline |

- **Typography:** display = **Fredoka** (playful headings), body = **Nunito**, loaded via
  expo-font (not @expo-google-fonts). Scale: 12 / 14 / 16 / 20 / 24.
- **Spacing:** 8pt grid — 4 · 8 · 12 · 16 · 24 · 32 · 48. **Radius:** 8 · 16 · 24 · 999 (pill).
- **Shadow Tier 2** on every card/button for physical "lift" (offset y6, opacity ~0.08, radius 16, elevation 4).
- **Buttons:** oversized, minimum 56pt height (parents holding toddlers + toddlers tapping).
- **Glassmorphism:** frosted glass on the Home recommendation card (over a vibrant gradient) and
  sticky headers/tabs. iOS `expo-glass-effect`, Android `expo-blur`, low-end fallback solid
  `surface2`. Keep flashcard foregrounds sharp/solid — no glass on the main card canvas or primary buttons.
- **Haptics:** tab press = light, record start/stop = medium, correct = success, skip = light,
  lesson complete = success.
- **Navigation:** bottom tabs. **Icons:** Phosphor (design spec) / Ionicons (current build).

---

## 8. Screen-by-Screen Wireframes

**Login** — Centered brand mark (`chatbubbles` icon) + "TalkTally". Step 1: one large rounded
email input + chunky coral "Send Code" button. Step 2: six large boxed digit inputs
(auto-advance, paste-fill, backspace-to-prev), a muted resend link with 30s cooldown counter,
inline error banner (soft red). `checkmark`/`arrow-forward` icons on CTAs.

**Onboarding** — Large rounded text input for the child's name (placeholder "Child"). Below, a
horizontal carousel of oversized pill cards for age cohorts (12-18M, 18-24M, 24-30M, 30-36M),
selected card highlighted with coral + `checkmark-circle`, others `ellipse-outline`. Sticky
chunky "Continue" button. Error → soft red "Oops, couldn't save profile" + retry.

**Home Dashboard** — Top: child avatar (initials in a coral circle), name, cohort chip,
`log-out-outline` settings icon (sign-out). A frosted-glass **Smart Tip** recommendation card over
a colorful gradient. A chunky segmented control: **Syllabus** | **History**.
- *Syllabus:* grid/list of big tactile milestone cards (emoji, label, phoneme group, tinted
  background), tap → `/calibrate`. Loading = pulsing skeleton cards.
- *History:* rounded list rows (category label, accuracy ring/bar, date), tap → `/session/[id]`.
  Empty = sleeping-bear illustration "No sessions yet. Let's start practicing!". Pull-to-refresh.

**Room Calibration** — `chevron-back` header. Centered playful pulse ring / soft visualizer that
expands with ambient noise; live LED-bar dB meter. Large Fredoka text "Shh... Let's listen to the
room". Big raised "Calibrate" pill (`mic` → `arrow-forward`). 2-second sweep computes a noise
floor, then advances to `/practice`. Error = mic-permission-denied message.

**Flashcard Practice** — Sticky parent coaching tip at top (glass over scrolling content, `bulb`
icon). Massive central 3D-like card: target emoji/image + word in bold Fredoka + phoneme label.
Giant circular Record button; while recording it becomes a pulsing "sound bubble" visualizer
(`stop` to end). After transcription: score feedback + two chunky buttons **Correct** (green,
`checkmark-circle`) and **Skip** (yellow, `close-circle`), plus **Retry** (`refresh`). `close` to
exit. Advances through all targets in the category, then `/scoreboard`.

**Scoreboard** — Celebratory confetti/stars. Massive central accuracy metric (e.g. "80%") inside a
soft glowing ring. Correct / total / XP tallies; per-word transcript summary rows. Milestone badges.
Sticky "Complete Lesson" button (`checkmark`) → `POST /sessions` → `/home`.

**History Detail** — `chevron-back` header + session meta (category, date, accuracy). List of chunky
card rows: each row = target word, phoneme icon, score indicator, prominent Play button
(`play`/`pause`) that plays the child's stored recording. Empty = "No recordings found for this
session."

---

## 9. Backend Test Suite (pytest) — what to cover

Tests hit a running server (`base_url` + `api_client` fixtures in `conftest.py`). OTP codes are
retrieved by tailing the backend log for the `[TalkTally OTP] <email> -> <code>` line.

**Health**
- `GET /api/` → 200, `{message: "TalkTally API", status: "ok"}`.

**Auth — request-code**
- Valid email → 200, message contains "Code sent"; a 6-digit code appears in the log.
- Invalid email (`not-an-email`) → 422.

**Auth — verify-code**
- 5 wrong attempts → each 400 "Invalid code"; 6th (even correct) → blocked "Too many attempts".
- Correct code → 200, returns `{token, user}` with a valid JWT; code is single-use (second verify → 400).
- Expired code (>10 min) → 400 "Code expired".
- No code requested for email → 400 "No code requested".

**Auth — me**
- Valid Bearer → 200 `UserOut`. Missing/invalid/expired token → 401.

**Profiles**
- `POST /profiles` → 200 with `id`, `name`, `age_cohort`, `created_at`; empty name defaults to "Child".
- `GET /profiles/{id}` round-trips the created profile; unknown id → 404.

**Sessions**
- `POST /sessions` computes `accuracy = round(correct/total*100)`, `correct_count`, `total_count`,
  `target_words`; returns a `SessionSummary` (no audio).
- `GET /sessions?profile_id=` returns summaries desc by timestamp, capped at 100, without `targets`.
- `GET /sessions/{id}` returns full `SessionDetail` including base64 audio per target; unknown id → 404.

**Transcribe**
- Missing `GROQ_API_KEY` → 500 "GROQ_API_KEY missing".
- Invalid base64 → 400.
- Valid WAV/M4A + target word → 200 `{transcript, match_score (0-100), correct}`; exact word match
  scores 100 / `correct=true`; unrelated audio scores low / `correct=false` (threshold 65).

---

## 10. Environment & Config

**`frontend/.env`**
```
EXPO_PUBLIC_BACKEND_URL=http://<laptop-LAN-IP>:8001
```

**`backend/.env`**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=talktally
GROQ_API_KEY=          # free from https://console.groq.com/keys
JWT_SECRET_KEY=        # 64 hex chars: python -c "import secrets; print(secrets.token_hex(32))"
JWT_ALGORITHM=HS256
```

**`app.json`** — mic permissions (`NSMicrophoneUsageDescription` iOS, `RECORD_AUDIO` Android);
plugins: expo-router, expo-splash-screen, expo-audio, expo-asset. New Architecture enabled.

Runs locally: MongoDB + `uvicorn server:app --host 0.0.0.0 --port 8001 --reload`, then
`npx expo start --lan` and scan the QR in Expo Go (phone + laptop on the same Wi-Fi).

---

## 11. Copy-Paste Build Prompt

> Build **TalkTally**, a React Native (Expo SDK 54, expo-router, TypeScript) + FastAPI/MongoDB app:
> a pediatric speech-practice companion for parents of toddlers aged 12–36 months.
>
> **Auth:** passwordless email OTP. `POST /api/auth/request-code` generates a 6-digit code,
> bcrypt-hashes it (10-min expiry, 5-attempt limit), and logs the plaintext to the server console
> (no real email). `POST /api/auth/verify-code` validates and returns a 90-day HS256 JWT + user.
> Store the JWT in secure storage; send it as `Authorization: Bearer` on all authed calls.
> `GET /api/auth/me` validates the token.
>
> **Screens (expo-router):** boot gate (JWT → login / home / onboarding); login (email → 6-digit
> OTP with paste, auto-advance, 30s resend cooldown); onboarding (child name + age cohort
> 12-18M/18-24M/24-30M/30-36M); home (avatar, cohort chip, frosted-glass "Smart Tip" card,
> Syllabus/History segmented control, pull-to-refresh, sign-out); calibrate (2s live dB meter noise
> floor via expo-audio metering); practice (flashcard with word/emoji/phoneme/coaching tip,
> tap-to-record with a pulsing "sound bubble," Groq Whisper transcription → match score →
> Correct/Skip/Retry); scoreboard (accuracy ring, XP, per-word transcript, Complete Lesson);
> session detail (per-word audio playback).
>
> **Backend (FastAPI + Motor/MongoDB):** `/api` routes for auth, profiles (`POST/GET /profiles`),
> sessions (`POST /sessions`, `GET /sessions?profile_id=`, `GET /sessions/{id}` with base64 audio
> per target, list capped at 100 desc by timestamp), and `POST /transcribe` using the official
> `groq` async SDK with model `whisper-large-v3-turbo`. Scoring: normalize to lowercase letters,
> exact=100, substring=95, else difflib ratio×100; `correct = score ≥ 65`. Store audio as base64
> in each session target for later playback.
>
> **Curriculum:** 15 age-graded phoneme milestones (Bilabials /p,b,m/ at 12m through Consonant
> Blends /bl,tr,sp/ at 34m and Short Phrases), each with a color, emoji, description, and target
> words carrying a parent coaching tip. Home filters milestones by the child's cohort start age.
> [paste the 15-milestone table from section 6]
>
> **Design — "Tactile / Playful, light":** feels like a premium wooden toy. Cream `#FDFBF7`
> background, coral brand `#FF8A65`, sky `#64B5F6`, mint success `#81C784`; Fredoka display +
> Nunito body fonts via expo-font; 8pt spacing grid; radii 8/16/24/pill; Tier-2 shadows on every
> card/button for physical lift; oversized 56pt+ buttons; frosted glass on the recommendation card
> and sticky headers; haptics on record/score/tab/complete. Define loading/empty/error states per
> screen (e.g. empty history = sleeping-bear illustration).
>
> **Env:** frontend `EXPO_PUBLIC_BACKEND_URL`; backend `MONGO_URL`, `DB_NAME`, `GROQ_API_KEY`,
> `JWT_SECRET_KEY`, `JWT_ALGORITHM`. Add mic permissions for iOS + Android. Runs locally with Expo
> Go on a phone against a laptop backend on the same Wi-Fi.
