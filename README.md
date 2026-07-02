# TalkTally — Pediatric Speech Companion (Expo Mobile App)

> A warm, tactile mobile companion for parents of toddlers **12–36 months**. TalkTally guides caregivers through developmental speech milestones with flashcards, mic-based room calibration, on-device recording, and **AI-scored pronunciation** — then keeps a session history with playback of the child's raw vocal attempts.

Built on **Expo SDK 54** (React Native + expo-router) with a **FastAPI + MongoDB** backend, wrapped by the Emergent preview / deployment platform.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [File-by-File Guide](#file-by-file-guide)
5. [Environment Variables](#environment-variables)
6. [Running Locally (inside the Emergent container)](#running-locally-inside-the-emergent-container)
7. [Auth Flow (Email + 6-digit OTP)](#auth-flow-email--6-digit-otp)
8. [Full User Journey](#full-user-journey)
9. [Backend API Reference](#backend-api-reference)
10. [Where Emergent APIs / Keys / Icons Are Used](#where-emergent-apis--keys--icons-are-used)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Design System](#design-system)
14. [Roadmap / Next Enhancements](#roadmap--next-enhancements)

---

## Feature Overview

| Area | What it does |
|---|---|
| **Sign-in** | Email + 6-digit code (magic OTP). Codes are dev-logged to the backend (`grep "TalkTally OTP"`). Long-lived JWT (90 days) stored in secure device storage. |
| **Child onboarding** | First name (default *"Child"*) + age cohort (12–18 / 18–24 / 24–30 / 30–36 months). Profile persisted to MongoDB + AsyncStorage cache. |
| **Home dashboard** | Avatar with initials, cohort chip, personalised **Smart Tip** card, and a **Syllabus / History** segmented control. |
| **Syllabus** | **15 developmental phonetics milestones** filtered by cohort (Bilabials → Blends → Short phrases). Each card leads into a calibration + practice session. |
| **Room calibration** | 2-second mic sweep with live LED-bar dB meter; establishes a noise floor before practice. |
| **Flashcard practice** | Word + emoji + phoneme + parent coaching tip. **Tap-to-record → live sound-bubble → Whisper transcription → AI match score → Correct / Skip / Retry**. |
| **Scoreboard** | Accuracy ring, correct / total / XP, per-word transcript, one-tap "Complete Lesson" that commits the session. |
| **History** | Reverse-chronological session cards with accuracy ring; drilling in reveals **per-word audio playback** (▶ PLAY BALL, ▶ PLAY BABY). |
| **Sign-out** | Home settings icon clears the JWT + local state and returns to /login. |

---

## Tech Stack

**Frontend** (`/app/frontend`)
- Expo SDK **54**, React Native **0.81**, TypeScript
- **expo-router v6** file-based routing
- **expo-audio 1.1** for recording + playback + dB metering
- **expo-file-system** (legacy) for base64 audio encoding
- **expo-linear-gradient**, **@expo/vector-icons** (Ionicons)
- **react-native-safe-area-context** for insets
- `@react-native-async-storage/async-storage` (via `@/src/utils/storage`) — token & profile cache

**Backend** (`/app/backend`)
- FastAPI + Uvicorn
- **Motor** async MongoDB driver
- **PyJWT** for JWT sessions (HS256, 90-day)
- **passlib[bcrypt]** for OTP + password hashing
- **emergentintegrations** — Whisper STT via the Emergent Universal LLM Key
- **pydantic + EmailStr** for validation

**Platform**
- Emergent Kubernetes preview container (ingress routes `/api/*` → backend :8001, everything else → Expo :3000)
- Supervisor process manager (`backend`, `expo`, `mongodb`, `code-server`)

---

## Project Structure

```text
/app
├── README.md                          ← you are here
├── design_guidelines.json             ← generated design tokens (Tactile Playful Light)
├── config.json                        ← Emergent platform metadata
├── entrypoint.sh
├── memory/
│   ├── PRD.md                         ← product requirements document
│   └── test_credentials.md            ← how to sign in during testing (no fixed creds — email OTP)
├── backend/
│   ├── .env                           ← MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, JWT_SECRET_KEY
│   ├── requirements.txt               ← Python deps (fastapi, motor, pyjwt, passlib, emergentintegrations …)
│   ├── server.py                      ← ALL FastAPI routes (auth, profiles, sessions, transcribe)
│   └── tests/
│       ├── test_talktally_api.py      ← profiles/sessions/transcribe regression
│       └── test_auth_talktally.py     ← email OTP + JWT auth tests
├── frontend/
│   ├── .env                           ← EXPO_PUBLIC_BACKEND_URL, EXPO_PACKAGER_* (protected)
│   ├── app.json                       ← Expo manifest (permissions, plugins, icons)
│   ├── package.json                   ← JS deps + expo scripts
│   ├── metro.config.js                ← PROTECTED — do not edit
│   ├── eslint.config.js
│   ├── tsconfig.json                  ← `@/*` path alias → project root
│   ├── assets/                        ← icon.png, adaptive-icon.png, splash-image.png, favicon.png
│   ├── app/                           ← expo-router file-based routes
│   │   ├── _layout.tsx                ← root layout (SafeAreaProvider, Stack, font prewarm)
│   │   ├── +html.tsx                  ← HTML shell for web build
│   │   ├── index.tsx                  ← boot / auth-gated redirect
│   │   ├── login.tsx                  ← email → OTP screen
│   │   ├── onboarding.tsx             ← child profile creation
│   │   ├── home.tsx                   ← Syllabus + History tabs
│   │   ├── calibrate.tsx              ← mic dB meter calibration
│   │   ├── practice.tsx               ← flashcard record + Whisper score
│   │   ├── scoreboard.tsx             ← end-of-session recap
│   │   └── session/[id].tsx           ← history detail with playback
│   └── src/
│       ├── api.ts                     ← typed fetch client (Bearer token attached)
│       ├── theme.ts                   ← colors, spacing, radius, shadows
│       ├── state.ts                   ← in-memory active-session store
│       ├── data/
│       │   └── phonemes.ts            ← 15-milestone curriculum
│       ├── hooks/
│       │   └── use-icon-fonts.ts      ← platform-provided icon prewarm hook
│       └── utils/storage/             ← platform-provided secure/plain KV wrapper
└── tests/                             ← reserved for future integration tests
```

---

## File-by-File Guide

### Backend

| File | Purpose |
|---|---|
| `backend/.env` | Runtime secrets (see [Environment Variables](#environment-variables)). |
| `backend/requirements.txt` | Pinned Python deps. Update **only** via `pip install ... && pip freeze > requirements.txt`. |
| `backend/server.py` | Monolithic FastAPI app. Sections: **models** (`Profile`, `SessionCreate`, `SessionTarget`, `AuthResponse` …), **auth** (`request-code`, `verify-code`, `me`, `get_current_user` dependency), **profiles** CRUD, **sessions** CRUD (`.limit(100)` on list), **Whisper transcribe** (uses `emergentintegrations.llm.openai.speech_to_text.OpenAISpeechToText`). All routes prefixed `/api`. |
| `backend/tests/test_talktally_api.py` | Pytest suite for profiles / sessions / transcribe. |
| `backend/tests/test_auth_talktally.py` | Pytest suite for request-code / verify-code / JWT / attempts / expiry. |

### Frontend Screens (`frontend/app/`)

| Route | Purpose |
|---|---|
| `_layout.tsx` | Root Stack + SafeAreaProvider. Prewarms Ionicons font (do NOT remove the prewarm — required for Expo Go Android). |
| `+html.tsx` | HTML shell for the Expo web preview. |
| `index.tsx` | **Boot gate.** Reads JWT from secure storage → `/login` if absent; else calls `/api/auth/me` → `/home` (profile exists) or `/onboarding`. |
| `login.tsx` | Two-step **email → 6-digit OTP** screen. Handles paste, auto-advance, backspace, 30-second resend cooldown, `login-error` messaging. Stores JWT via `storage.secureSet("talktally.jwt", …)` and routes to `/onboarding`. |
| `onboarding.tsx` | Name input + age-cohort picker. Creates profile via `POST /api/profiles` and caches `profileId / profileName / profileCohort` in AsyncStorage. |
| `home.tsx` | Avatar, cohort, personalised recommendation card (worst-scoring category if history exists, else age-appropriate default), **Syllabus** grid + **History** list, pull-to-refresh, sign-out button (`edit-profile-button`). |
| `calibrate.tsx` | Uses `expo-audio.useAudioRecorder({ isMeteringEnabled: true })` to sample `metering` dB values for 2 s and compute a room noise floor. |
| `practice.tsx` | Full flashcard session. Records audio → reads to base64 (`expo-file-system` legacy on native, `FileReader` on web) → posts to `/api/transcribe` → shows AI match score + Correct/Skip/Retry. On completion posts full session to `/api/sessions`. |
| `scoreboard.tsx` | Success screen: accuracy ring, XP, per-word transcript summary. |
| `session/[id].tsx` | History detail. Rebuilds base64 → file (`expo-file-system.writeAsStringAsync`) then plays via `Audio.createAudioPlayer`. |

### Frontend Shared (`frontend/src/`)

| File | Purpose |
|---|---|
| `api.ts` | Typed `fetch` wrapper (`req<T>()`). Bearer token attached automatically for protected routes. Exports the `api` singleton (`api.requestCode`, `api.verifyCode`, `api.me`, `api.createProfile`, `api.createSession`, `api.listSessions`, `api.getSession`, `api.transcribe` …). |
| `theme.ts` | Design tokens: `colors` (cream + coral palette), `spacing` (8pt grid), `radius`, `shadow`. Consumed by every screen. |
| `state.ts` | Module-level in-memory store for the *active* session. Session audio blobs are too big to pass through router params — the store keeps them until `finishSession()` posts and clears. |
| `data/phonemes.ts` | **The curriculum.** 15 `PhonemeCategory` objects with `id`, `label`, `phoneme_group`, `age_min_months`, `color`, `emoji`, `description`, and `targets[]` (each: `word`, `target_phoneme`, `emoji`, `coaching`). Exposes `ageCohortMinMonths()` helper. |
| `hooks/use-icon-fonts.ts` | **Platform-provided** — prewarms `@expo/vector-icons` for Expo Go Android. Do not modify. |
| `utils/storage/` | **Platform-provided** cross-platform key-value + secure storage abstraction (`storage.setItem`, `storage.secureSet`, `storage.secureGet`, `storage.secureRemove`, …). Always use this instead of importing `AsyncStorage` / `expo-secure-store` directly. |

### Platform / Config

| File | Purpose |
|---|---|
| `frontend/app.json` | Expo manifest. Declares `NSMicrophoneUsageDescription` (iOS) and `RECORD_AUDIO` (Android). Plugins: `expo-router`, `expo-splash-screen`, `expo-audio`. Icons point at `assets/images/*`. |
| `frontend/.env` | `EXPO_PUBLIC_BACKEND_URL` (used by `src/api.ts`), plus **protected** `EXPO_PACKAGER_PROXY_URL` / `EXPO_PACKAGER_HOSTNAME` (never edit — set by the Emergent preview). |
| `frontend/metro.config.js` | Bundler config — **protected**. |
| `design_guidelines.json` | Generated by the Emergent design agent; source of truth for palette, typography, component sizing. |
| `config.json` | Emergent platform metadata. |
| `memory/PRD.md` | Product requirements doc — user flows, non-goals, next enhancements. |
| `memory/test_credentials.md` | How to sign in during automated testing (email OTP retrieval). |

---

## Environment Variables

### `backend/.env`

| Key | Purpose | Notes |
|---|---|---|
| `MONGO_URL` | Local Mongo connection string. | **Protected** — set by the platform. |
| `DB_NAME` | Mongo database name. | Kept as `test_database` in preview. |
| `EMERGENT_LLM_KEY` | Emergent Universal LLM key. | Used by `emergentintegrations` to call **OpenAI Whisper-1** for pronunciation transcription. Also works for GPT / Gemini / Claude text if you extend the app. |
| `JWT_SECRET_KEY` | Random 64-byte hex secret. | Signs 90-day auth JWTs. Regenerate = invalidate all existing tokens. |
| `JWT_ALGORITHM` | Defaults to `HS256`. | |

### `frontend/.env`

| Key | Purpose |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | Base URL for backend calls; used by `src/api.ts`. |
| `EXPO_PACKAGER_PROXY_URL` | **PROTECTED** — do not modify. Powers the preview URL & Expo Go QR. |
| `EXPO_PACKAGER_HOSTNAME` | **PROTECTED** — do not modify. |

---

## Running Locally (inside the Emergent container)

Everything is already wired to Supervisor. You should never need `expo start` / `uvicorn` by hand.

```bash
# Restart services after edits
sudo supervisorctl restart backend
sudo supervisorctl restart expo

# Tail logs
tail -f /var/log/supervisor/backend.err.log      # includes dev-mode OTP codes
tail -f /var/log/supervisor/expo.out.log

# Quick backend smoke test
curl -s http://localhost:8001/api/                # {"message":"TalkTally API","status":"ok"}
```

Frontend preview URL is exposed by the platform — grab it from the Emergent UI or from `EXPO_PUBLIC_BACKEND_URL` in `frontend/.env` (drop `/api`).

---

## Auth Flow (Email + 6-digit OTP)

1. User enters email on `/login`. UI calls `POST /api/auth/request-code`.
2. Backend generates a 6-digit code, **bcrypt-hashes** it, stores in `otp_requests` (10-min expiry, `attempts=0`), and **logs the plaintext code to stderr**:
   ```
   [TalkTally OTP] parent@example.com -> 482119
   ```
   > **`MOCKED`**: no email is actually sent. Retrieve the code with `grep "TalkTally OTP" /var/log/supervisor/backend.err.log`. Wire up Resend / SendGrid before shipping to production.
3. UI advances to the OTP step; user types 6 digits. Client calls `POST /api/auth/verify-code`.
4. Backend verifies the hash, enforces 5-attempt / 10-minute limits, upserts a `users` doc, and returns `{ token, user }`.
5. Token is stored via `storage.secureSet("talktally.jwt", token)` and attached to every subsequent request in `src/api.ts` as `Authorization: Bearer …`.
6. Sign-out (home `edit-profile-button`) calls `storage.secureRemove("talktally.jwt")` and returns to `/login`.

---

## Full User Journey

```text
/login  →  /onboarding  →  /home
                            ├─ Syllabus tab  →  /calibrate  →  /practice  →  /scoreboard  →  /home
                            └─ History tab   →  /session/[id]  (playback)
```

---

## Backend API Reference

All routes are prefixed with `/api`. Routes marked 🔒 require `Authorization: Bearer <jwt>`.

### Auth
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/request-code` | `{ email }` | `{ message }` — code logged to stderr |
| POST | `/auth/verify-code` | `{ email, code }` | `{ token, user }` |
| GET | 🔒 `/auth/me` | — | `UserOut` |

### Profiles
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | 🔒 `/profiles` | `{ name, age_cohort }` | `Profile` |
| GET | 🔒 `/profiles/{id}` | — | `Profile` |

### Sessions
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | 🔒 `/sessions` | `{ profile_id, category_id, category_label, targets[] }` | `SessionSummary` |
| GET | 🔒 `/sessions?profile_id=<id>` | — | `SessionSummary[]` (desc by timestamp, `.limit(100)`) |
| GET | 🔒 `/sessions/{id}` | — | `SessionDetail` (includes base64 audio per target) |

### Speech-to-Text
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | 🔒 `/transcribe` | `{ audio_base64, ext, target_word }` | `{ transcript, match_score, correct }` |

`match_score` is `SequenceMatcher` ratio × 100 (exact match = 100). `correct = match_score ≥ 65`.

---

## Where Emergent APIs / Keys / Icons Are Used

This section maps every touchpoint to Emergent-provided assets.

### 🔑 `EMERGENT_LLM_KEY` (Universal LLM key)
- **Location**: `backend/.env` → `EMERGENT_LLM_KEY=sk-emergent-…`
- **Loaded in**: `backend/server.py` (top of file, via `os.environ.get("EMERGENT_LLM_KEY")`).
- **Used in**: `POST /api/transcribe` — passed into `OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)` from `emergentintegrations.llm.openai.speech_to_text`. This is the **only** API call to an Emergent-brokered LLM in the app today. Model: `whisper-1`.
- **What it costs**: consumes credits from your Emergent Universal LLM balance. Top up via **Emergent → Profile → Universal Key → Add Balance** (auto-top-up recommended).

### 📦 `emergentintegrations` Python library
- **Location**: pre-installed in the container, imported at the top of `backend/server.py`:
  ```python
  from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText
  ```
- **Purpose**: proxies OpenAI / Gemini / Claude / Whisper calls through the Emergent backend using the Universal LLM Key. No direct OpenAI / Anthropic keys are stored in this repo.

### 🌐 Emergent Platform env vars (**do not modify**)
- `frontend/.env` → `EXPO_PACKAGER_PROXY_URL`, `EXPO_PACKAGER_HOSTNAME` — power the preview URL + Expo Go QR code.
- `EXPO_PUBLIC_BACKEND_URL` — auto-populated by Emergent so the mobile client can reach the backend without hardcoding IPs.
- `/etc/supervisor/conf.d/supervisord.conf` — READONLY, managed by the platform.

### 🖼️ Icons
- **`@expo/vector-icons` (Ionicons set)** — the sole icon library used app-wide. Every `<Ionicons name="…" />` reference lives in:
  - `app/login.tsx` — `chatbubbles`, `arrow-forward`, `checkmark`
  - `app/onboarding.tsx` — `checkmark-circle`, `ellipse-outline`, `arrow-forward`
  - `app/home.tsx` — `log-out-outline`, `chevron-forward`, `arrow-forward`
  - `app/calibrate.tsx` — `chevron-back`, `mic`, `arrow-forward`
  - `app/practice.tsx` — `close`, `bulb`, `stop`, `checkmark-circle`, `close-circle`, `refresh`
  - `app/scoreboard.tsx` — `checkmark`
  - `app/session/[id].tsx` — `chevron-back`, `play`, `pause`
- **Prewarming**: `src/hooks/use-icon-fonts.ts` (platform-provided) is invoked from `app/_layout.tsx` so Ionicons render immediately in **Expo Go Android** (which is otherwise slow to load the font). **Do not remove this hook**.
- **App icons** (splash / adaptive / favicon): `frontend/assets/images/icon.png`, `adaptive-icon.png`, `splash-image.png`, `favicon.png` — declared in `app.json`. Replace these to rebrand.

### 🚀 Emergent deployment / publish
- **Not called from code.** Publishing to iOS / Android / web is triggered from the **Publish** button in the top-right of the Emergent UI. Do not scaffold EAS / build tools here.

### 🧪 Platform storage abstraction (`@/src/utils/storage`)
- Emergent-shipped cross-platform KV + secure store wrapper.
- Used in `app/login.tsx` (JWT), `app/index.tsx` (bootstrap read), `app/home.tsx` (sign-out clear), `src/api.ts` (attach Bearer).
- **Never import** `@react-native-async-storage/async-storage`, `expo-secure-store`, or `react-native-mmkv` directly.

---

## Testing

### Backend (pytest, 20 cases)
```bash
pytest /app/backend/tests/ -v
```
Covers all profiles / sessions / transcribe / auth routes including expiry, bad codes, attempts limits, and Whisper end-to-end with a synthetic WAV.

### Frontend (Playwright via the platform testing agent)
The testing agent drives the preview URL end-to-end (login → onboarding → home → calibrate). Reports saved to `/app/test_reports/iteration_<n>.json`.

To sign in during a test:
```bash
curl -X POST $EXPO_PUBLIC_BACKEND_URL/api/auth/request-code \
     -H "Content-Type: application/json" \
     -d '{"email":"tester@talktally.dev"}'
grep "TalkTally OTP" /var/log/supervisor/backend.err.log | tail -1
```

---

## Deployment

1. Click **Publish** (top-right, Emergent UI).
2. Fill iOS / Android build credentials as prompted.
3. The Emergent build pipeline handles Expo prebuild, native compile, and store artifacts.
4. Push-notifications & LAN dev tricks are **not** required — everything is served through Emergent's ingress in production.

Deployment health checks:
```bash
# From the container
curl -s http://localhost:8001/api/                     # backend up
curl -s $EXPO_PUBLIC_BACKEND_URL/api/                  # backend reachable via ingress
```

---

## Design System

Palette (from `design_guidelines.json`, mirrored in `src/theme.ts`):

| Token | Hex | Role |
|---|---|---|
| `surface` | `#FDFBF7` | Cream background |
| `surface2` | `#FFFFFF` | Card |
| `surface3` | `#F3EFE6` | Muted tertiary |
| `brand` | `#FF8A65` | Coral primary |
| `brand2` | `#64B5F6` | Sky secondary |
| `success` | `#81C784` | Mint success |
| `warning` | `#FFD54F` | Skip / warn |
| `error` | `#E57373` | Danger |
| `onSurface` | `#2A2A2E` | Body text |
| `onSurfaceMuted` | `#6B6A6F` | Secondary text |

Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 (8pt grid).
Radius: 8 · 16 · 24 · 999 (pill).
Typography: system bold — playful yet clinical.

---

## Roadmap / Next Enhancements

- **Real email delivery** — swap the `logger.warning` in `request_code` for **Resend / SendGrid**. Ask any Emergent agent to wire it up.
- **Viral share-clip card** — export a per-word audio card ("Watch my baby say Ball!") for social sharing; the audio is already stored in `SessionDetail.targets[*].audio_base64`.
- **Mastery heatmap + streaks** for retention.
- **DEV_MODE flag** to hide OTPs from prod logs.
- **Multi-child profiles** and clinician export.

---

_Built with ❤️ using Expo + FastAPI + MongoDB, orchestrated by the Emergent platform._
