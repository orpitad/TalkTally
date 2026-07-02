# TalkTally — Pediatric Speech Companion (Expo Mobile App)

> A warm, tactile mobile companion for parents of toddlers **12–36 months**. TalkTally guides caregivers through developmental speech milestones with flashcards, mic-based room calibration, on-device recording, and **AI-scored pronunciation** using **Groq's free-tier Whisper-large-v3-turbo** — then keeps a session history with playback of the child's raw vocal attempts.

Built on **Expo SDK 54** (React Native + expo-router) with a **FastAPI + MongoDB** backend. **Fully open-source and self-hostable** — runs on your laptop with Expo Go on your phone.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [File-by-File Guide](#file-by-file-guide)
5. [Prerequisites](#prerequisites)
6. [Local Setup (Laptop + Expo Go)](#local-setup-laptop--expo-go)
7. [Environment Variables](#environment-variables)
8. [Auth Flow (Email + 6-digit OTP)](#auth-flow-email--6-digit-otp)
9. [Full User Journey](#full-user-journey)
10. [Backend API Reference](#backend-api-reference)
11. [Where External APIs / Keys / Icons Live](#where-external-apis--keys--icons-live)
12. [Testing](#testing)
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
| **Flashcard practice** | Word + emoji + phoneme + parent coaching tip. **Tap-to-record → live sound-bubble → Groq Whisper transcription → AI match score → Correct / Skip / Retry**. |
| **Scoreboard** | Accuracy ring, correct / total / XP, per-word transcript, one-tap "Complete Lesson" that commits the session. |
| **History** | Reverse-chronological session cards with accuracy ring; drilling in reveals **per-word audio playback** (▶ PLAY BALL, ▶ PLAY BABY). |
| **Sign-out** | Home settings icon clears the JWT + local state and returns to /login. |

---

## Tech Stack

**Frontend** (`/app/frontend`)
- Expo SDK **54**, React Native **0.81**, TypeScript
- **expo-router v6** file-based routing
- **expo-audio 1.1** for recording + playback + dB metering
- **expo-file-system** for base64 audio encoding
- **expo-linear-gradient**, **@expo/vector-icons** (Ionicons)
- **react-native-safe-area-context** for insets
- `@react-native-async-storage/async-storage` — token & profile cache

**Backend** (`/app/backend`)
- FastAPI + Uvicorn
- **Motor** async MongoDB driver
- **PyJWT** for JWT sessions (HS256, 90-day)
- **passlib[bcrypt]** for OTP hashing
- **groq** — official async Groq SDK (Whisper transcription)
- **pydantic + EmailStr** for validation

---

## Project Structure

```text
/app
├── README.md                          ← you are here
├── design_guidelines.json             ← generated design tokens (Tactile Playful Light)
├── config.json                        ← app metadata (kept as-is)
├── memory/
│   ├── PRD.md                         ← product requirements document
│   └── test_credentials.md            ← how to sign in during testing (email OTP)
├── backend/
│   ├── .env                           ← MONGO_URL, DB_NAME, GROQ_API_KEY, JWT_SECRET_KEY
│   ├── .env.example                   ← template (safe to commit)
│   ├── requirements.txt               ← Python deps (fastapi, motor, pyjwt, passlib, groq …)
│   ├── server.py                      ← ALL FastAPI routes (auth, profiles, sessions, transcribe)
│   └── tests/
│       ├── conftest.py
│       ├── test_talktally_api.py      ← profiles/sessions/transcribe regression
│       └── test_auth_talktally.py     ← email OTP + JWT auth tests
├── frontend/
│   ├── .env                           ← EXPO_PUBLIC_BACKEND_URL
│   ├── app.json                       ← Expo manifest (permissions, plugins, icons)
│   ├── package.json                   ← JS deps + expo scripts
│   ├── metro.config.js                ← bundler config (leave alone)
│   ├── eslint.config.js
│   ├── tsconfig.json                  ← `@/*` path alias → project root
│   ├── assets/images/                 ← icon.png, adaptive-icon.png, splash-image.png, favicon.png
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
│       ├── data/phonemes.ts           ← 15-milestone curriculum
│       ├── hooks/use-icon-fonts.ts    ← Ionicons prewarm hook
│       └── utils/storage/             ← cross-platform secure/plain KV wrapper
└── tests/                             ← reserved for future integration tests
```

---

## File-by-File Guide

### Backend

| File | Purpose |
|---|---|
| `backend/.env` | Runtime secrets (see [Environment Variables](#environment-variables)). |
| `backend/.env.example` | Committable template — copy to `.env` and fill in your keys. |
| `backend/requirements.txt` | Pinned Python deps. |
| `backend/server.py` | Monolithic FastAPI app. Sections: **models** (`Profile`, `SessionCreate`, `SessionTarget`, `AuthResponse` …), **auth** (`request-code`, `verify-code`, `me`, `get_current_user` dependency), **profiles** CRUD, **sessions** CRUD (`.limit(100)` on list), **Whisper transcribe** (uses the official `groq.AsyncGroq` SDK with model `whisper-large-v3-turbo`). All routes prefixed `/api`. |
| `backend/tests/test_talktally_api.py` | Pytest suite for profiles / sessions / transcribe. |
| `backend/tests/test_auth_talktally.py` | Pytest suite for request-code / verify-code / JWT / attempts / expiry. |

### Frontend Screens (`frontend/app/`)

| Route | Purpose |
|---|---|
| `_layout.tsx` | Root Stack + SafeAreaProvider. Prewarms Ionicons font (required for Expo Go Android). |
| `+html.tsx` | HTML shell for the Expo web preview. |
| `index.tsx` | **Boot gate.** Reads JWT from secure storage → `/login` if absent; else calls `/api/auth/me` → `/home` (profile exists) or `/onboarding`. |
| `login.tsx` | Two-step **email → 6-digit OTP** screen. Handles paste, auto-advance, backspace, 30-second resend cooldown, `login-error` messaging. Stores JWT via `storage.secureSet("talktally.jwt", …)` and routes to `/onboarding`. |
| `onboarding.tsx` | Name input + age-cohort picker. Creates profile via `POST /api/profiles` and caches `profileId / profileName / profileCohort` in AsyncStorage. |
| `home.tsx` | Avatar, cohort, personalised recommendation card, Syllabus grid + History list, pull-to-refresh, sign-out button (`edit-profile-button`). |
| `calibrate.tsx` | Uses `expo-audio.useAudioRecorder({ isMeteringEnabled: true })` to sample `metering` dB values for 2 s and compute a room noise floor. |
| `practice.tsx` | Full flashcard session. Records audio → reads to base64 (`expo-file-system` on native, `FileReader` on web) → posts to `/api/transcribe` → shows AI match score + Correct/Skip/Retry. On completion posts full session to `/api/sessions`. |
| `scoreboard.tsx` | Success screen: accuracy ring, XP, per-word transcript summary. |
| `session/[id].tsx` | History detail. Rebuilds base64 → file (`expo-file-system.writeAsStringAsync`) then plays via `Audio.createAudioPlayer`. |

### Frontend Shared (`frontend/src/`)

| File | Purpose |
|---|---|
| `api.ts` | Typed `fetch` wrapper (`req<T>()`). Bearer token attached automatically. Exports the `api` singleton. |
| `theme.ts` | Design tokens: `colors`, `spacing`, `radius`, `shadow`. |
| `state.ts` | Module-level in-memory store for the active session (audio blobs are too big for router params). |
| `data/phonemes.ts` | The 15-milestone curriculum. |
| `hooks/use-icon-fonts.ts` | Ionicons font prewarm — do not modify. |
| `utils/storage/` | Cross-platform secure key-value store. Always use this instead of `AsyncStorage` / `expo-secure-store` directly. |

### Config

| File | Purpose |
|---|---|
| `frontend/app.json` | Expo manifest. Declares `NSMicrophoneUsageDescription` (iOS) and `RECORD_AUDIO` (Android). Plugins: `expo-router`, `expo-splash-screen`, `expo-audio`. Icons point at `assets/images/*`. |
| `frontend/.env` | `EXPO_PUBLIC_BACKEND_URL` — the URL of your local backend (e.g. `http://192.168.1.42:8001` — see [Local Setup](#local-setup-laptop--expo-go)). |
| `frontend/metro.config.js` | Bundler config. |
| `design_guidelines.json` | Design tokens (palette, typography, component sizing). |
| `config.json` | App metadata (kept). |
| `memory/PRD.md` | Product requirements doc. |
| `memory/test_credentials.md` | How to sign in during automated testing (email OTP retrieval). |

---

## Prerequisites

- **Node.js ≥ 20** with **Yarn** (`corepack enable` or `npm i -g yarn`)
- **Python ≥ 3.11**
- **MongoDB** — either local (`brew install mongodb-community` / apt) or a free **MongoDB Atlas** cluster
- **Expo Go** app installed on your iPhone / Android (search "Expo Go" in the App/Play Store)
- Your laptop and your phone on the **same Wi-Fi network**
- A free **Groq API key** — sign up at <https://console.groq.com/keys> (Whisper transcription is on their free tier)

---

## Local Setup (Laptop + Expo Go)

### 1. Clone & install

```bash
git clone <this-repo>
cd talktally

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
```

### 2. Configure environment

> ⚠️ **Dotfiles are hidden by default.** `.env` and `.env.example` start with a dot and are hidden in Finder / File Explorer / most editors. Toggle "Show hidden files" (macOS: `Cmd+Shift+.` in Finder; Windows: View → Hidden items; VS Code shows them by default).
> **Both `backend/.env.example` and `frontend/.env.example` ship with this repo** — if you don't see them, enable hidden files.

```bash
# Backend
cd backend
cp .env.example .env
# Then open .env and:
#   - set GROQ_API_KEY to your Groq key
#   - (optional) point MONGO_URL to your Atlas URI
#   - generate a fresh JWT_SECRET_KEY:
#       python -c "import secrets; print(secrets.token_hex(32))"
```

Find your laptop's **LAN IP** (so your phone can reach the backend):

```bash
# macOS / Linux
ifconfig | grep -E "inet (192|10)"
# Windows
ipconfig | findstr IPv4
```

Then create `frontend/.env`:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.42:8001    # ← replace with YOUR laptop IP
```

> ⚠️ Do **not** use `http://localhost:8001` — Expo Go runs on your phone, which cannot see your laptop's `localhost`.

### 3. Start MongoDB

```bash
# Local install
mongod --dbpath ~/data/db

# Or use Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 4. Start the backend

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see `INFO:     Uvicorn running on http://0.0.0.0:8001`.

Smoke test in a new terminal:

```bash
curl http://localhost:8001/api/
# {"message":"TalkTally API","status":"ok"}
```

### 5. Start Expo

```bash
cd frontend
yarn start
```

Metro prints a **QR code** and a URL like `exp://192.168.1.42:8081`.

### 6. Open in Expo Go

1. Open **Expo Go** on your phone.
2. Scan the QR code (iOS: use the camera app; Android: tap "Scan QR Code" inside Expo Go).
3. TalkTally boots on your phone.

### 7. Sign in

1. Enter any email on the Login screen and tap **Send Code**.
2. Back in your **backend terminal** you'll see:
   ```
   WARNING [TalkTally OTP] you@example.com -> 482119
   ```
3. Type those 6 digits on your phone → you're in.

> **Note:** OTP emails are **not actually sent** in this build — codes only appear in the backend console. Swap in Resend/SendGrid for production.

---

## Environment Variables

### `backend/.env`

| Key | Purpose | Notes |
|---|---|---|
| `MONGO_URL` | Mongo connection string. | `mongodb://localhost:27017` for local, or your Atlas URI. |
| `DB_NAME` | Mongo database name. | Any name — e.g. `talktally`. |
| `GROQ_API_KEY` | Groq Whisper API key. | **Free** — grab from <https://console.groq.com/keys>. Required for `/api/transcribe`. |
| `JWT_SECRET_KEY` | 64-byte hex secret for signing session tokens. | Regenerate = invalidates all existing tokens. |
| `JWT_ALGORITHM` | Defaults to `HS256`. | |

### `frontend/.env`

| Key | Purpose |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | Base URL for backend calls, used by `src/api.ts`. Must be reachable from the phone (use your laptop LAN IP, not `localhost`). |

---

## Auth Flow (Email + 6-digit OTP)

1. User enters email on `/login`. UI calls `POST /api/auth/request-code`.
2. Backend generates a 6-digit code, **bcrypt-hashes** it, stores in `otp_requests` (10-min expiry, `attempts=0`), and **logs the plaintext code to stderr**:
   ```
   [TalkTally OTP] parent@example.com -> 482119
   ```
   > **MOCKED:** no email is actually sent. Retrieve the code from the backend console.
3. UI advances to the OTP step; user types 6 digits. Client calls `POST /api/auth/verify-code`.
4. Backend verifies the hash, enforces 5-attempt / 10-minute limits, upserts a `users` doc, and returns `{ token, user }`.
5. Token is stored via `storage.secureSet("talktally.jwt", token)` and attached to every subsequent request in `src/api.ts` as `Authorization: Bearer …`.
6. Sign-out clears the token and returns to `/login`.

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

`match_score` = `SequenceMatcher` ratio × 100 (exact match = 100). `correct = match_score ≥ 65`.

---

## Where External APIs / Keys / Icons Live

### 🔑 `GROQ_API_KEY` (free Whisper transcription)
- **Location**: `backend/.env` → `GROQ_API_KEY=gsk_…`
- **Loaded in**: `backend/server.py` (top of file, via `os.environ.get("GROQ_API_KEY")`).
- **Used in**: `POST /api/transcribe` — passed into `AsyncGroq(api_key=GROQ_API_KEY)` from the official `groq` Python SDK. Model: `whisper-large-v3-turbo`.
- **Cost**: **free** on Groq's generous free tier at the time of writing (see <https://groq.com/pricing>). Sign-up at <https://console.groq.com/keys>.

### 📦 `groq` Python library
- Official Groq SDK, imported in `backend/server.py`:
  ```python
  from groq import AsyncGroq
  ```
- Used only for the async Whisper transcription call. No other AI providers are wired in.

### 🖼️ Icons
- **`@expo/vector-icons` (Ionicons set)** — the sole icon library used app-wide. Every `<Ionicons name="…" />` reference lives in:
  - `app/login.tsx` — `chatbubbles`, `arrow-forward`, `checkmark`
  - `app/onboarding.tsx` — `checkmark-circle`, `ellipse-outline`, `arrow-forward`
  - `app/home.tsx` — `log-out-outline`, `chevron-forward`, `arrow-forward`
  - `app/calibrate.tsx` — `chevron-back`, `mic`, `arrow-forward`
  - `app/practice.tsx` — `close`, `bulb`, `stop`, `checkmark-circle`, `close-circle`, `refresh`
  - `app/scoreboard.tsx` — `checkmark`
  - `app/session/[id].tsx` — `chevron-back`, `play`, `pause`
- **Prewarming**: `src/hooks/use-icon-fonts.ts` is invoked from `app/_layout.tsx` so Ionicons render immediately in **Expo Go Android**. Do not remove.
- **App icons & splash**: `frontend/assets/images/icon.png`, `adaptive-icon.png`, `splash-image.png`, `favicon.png`. Ship as a simple "TT" coral logo — replace freely to rebrand.

### 🔐 Storage abstraction (`@/src/utils/storage`)
- Cross-platform key-value + secure store wrapper (uses `AsyncStorage` on native, `localStorage` + secure fallbacks on web).
- Used in `app/login.tsx` (JWT), `app/index.tsx` (bootstrap read), `app/home.tsx` (sign-out clear), `src/api.ts` (attach Bearer).
- **Never import** `@react-native-async-storage/async-storage`, `expo-secure-store`, or `react-native-mmkv` directly — always go through this helper.

---

## Testing

### Backend (pytest)

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

Covers all profiles / sessions / transcribe / auth routes including expiry, bad codes, attempts limits, and Whisper end-to-end.

### Manual sign-in during testing

```bash
curl -X POST http://localhost:8001/api/auth/request-code \
     -H "Content-Type: application/json" \
     -d '{"email":"tester@talktally.dev"}'
# Then check the uvicorn console for the 6-digit code.
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

- **Real email delivery** — swap the `logger.warning` in `request_code` for **Resend / SendGrid**.
- **Viral share-clip card** — export a per-word audio card ("Watch my baby say Ball!") for social sharing; audio is already stored in `SessionDetail.targets[*].audio_base64`.
- **Mastery heatmap + streaks** for retention.
- **DEV_MODE flag** to hide OTPs from prod logs.
- **Multi-child profiles** and clinician export.

---

_Built with ❤️ using Expo + FastAPI + MongoDB + Groq Whisper._
