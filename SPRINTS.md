# TalkTally — Sprint Plan (Prompts + Workable Checks)

Build the app in 9 sprints. **Each sprint ends in a concrete "workable condition" — do not start
the next sprint until the current check passes.** Give each prompt to your AI builder one at a
time. Prompts assume the full spec in [SPEC.md](SPEC.md) is available for reference.

Order is deliberate: backend first (independently testable with curl), then frontend layer by
layer (each screen verifiable in Expo Go before adding the next).

---

## Sprint 0 — Scaffolding & Boot

**Prompt:**
> Create the TalkTally monorepo skeleton. `backend/` = FastAPI app (`server.py`) with Motor/MongoDB
> connection from env, CORS open, and a single route `GET /api/` → `{"message":"TalkTally API","status":"ok"}`.
> Add `requirements.txt` (fastapi, uvicorn, motor, pydantic[email], pyjwt, passlib[bcrypt], groq,
> python-dotenv) and `backend/.env.example` (MONGO_URL, DB_NAME, GROQ_API_KEY, JWT_SECRET_KEY, JWT_ALGORITHM).
> `frontend/` = Expo SDK 54 + expo-router + TypeScript app with a single screen that renders
> "TalkTally" text, `app.json` with mic permissions, and `frontend/.env.example` (EXPO_PUBLIC_BACKEND_URL).
> No features yet — just both apps booting.

**Workable check:**
- `uvicorn server:app --host 0.0.0.0 --port 8001` starts; `curl http://localhost:8001/api/` returns the ok JSON.
- `npx expo start` boots; the app opens in Expo Go and shows "TalkTally".

---

## Sprint 1 — Backend Auth (email OTP + JWT)

**Prompt:**
> Add passwordless email-OTP auth to the FastAPI backend. `POST /api/auth/request-code {email}`:
> generate a 6-digit code, bcrypt-hash it, upsert into `otp_requests` with 10-min expiry and
> `attempts=0`, and log the plaintext as `[TalkTally OTP] <email> -> <code>`. `POST /api/auth/verify-code
> {email, code}`: enforce 10-min expiry + 5-attempt cap, on success upsert a `users` doc and return
> `{token, user}` (90-day HS256 JWT). Add a `get_current_user` dependency and `GET /api/auth/me`
> (Bearer-protected → UserOut). Validate email with EmailStr (invalid → 422).

**Workable check:**
```bash
curl -X POST localhost:8001/api/auth/request-code -H "Content-Type: application/json" -d '{"email":"t@t.dev"}'
# read the 6-digit code from the uvicorn console, then:
curl -X POST localhost:8001/api/auth/verify-code -H "Content-Type: application/json" -d '{"email":"t@t.dev","code":"<CODE>"}'
# copy the token, then:
curl localhost:8001/api/auth/me -H "Authorization: Bearer <TOKEN>"
```
- request-code → `{message}` and code in log; verify-code → `{token, user}`; me → the user.
- Wrong code 5× → blocked; invalid email → 422; no Bearer on `/me` → 401.

---

## Sprint 2 — Backend Profiles, Sessions, Transcribe

**Prompt:**
> Add the remaining backend routes (all Bearer-protected). `POST /api/profiles {name, age_cohort}`
> (empty name → "Child") and `GET /api/profiles/{id}` (unknown → 404). `POST /api/sessions
> {profile_id, category_id, category_label, targets[]}`: compute accuracy, correct_count, total_count,
> target_words; store full doc incl. base64 audio; return SessionSummary (no audio). `GET /api/sessions?profile_id=`
> → summaries desc by timestamp, `.limit(100)`, without targets. `GET /api/sessions/{id}` → SessionDetail
> with per-target base64 audio (unknown → 404). `POST /api/transcribe {audio_base64, ext, target_word}`:
> use official `groq.AsyncGroq` with `whisper-large-v3-turbo`; scoring = normalize lowercase letters,
> exact=100, substring=95, else difflib ratio×100; `correct = score>=65`. Missing GROQ_API_KEY → 500;
> bad base64 → 400. Use the models from SPEC.md section 5.

**Workable check:**
- Create a profile, create a session with 2 targets (1 correct), confirm `accuracy` math and that
  list omits audio while `/sessions/{id}` includes it.
- `POST /transcribe` with a real short WAV of the target word (needs GROQ_API_KEY) → `match_score` high,
  `correct=true`; unrelated audio → low score. Bad base64 → 400.
- Run `pytest backend/tests/ -v` (per SPEC.md section 9) — all green.

---

## Sprint 3 — Frontend Foundation (theme, storage, api, boot gate)

**Prompt:**
> Add the frontend shared layer. `src/theme.ts` (colors/spacing/radius/shadow per SPEC.md section 7).
> `src/utils/storage/` — a cross-platform secure+plain KV wrapper (AsyncStorage/expo-secure-store on
> native) exposing secureGet/secureSet/secureRemove; never call the underlying libs elsewhere.
> `src/api.ts` — typed fetch client hitting `EXPO_PUBLIC_BACKEND_URL/api`, auto-attaching the Bearer
> token from storage, with methods for every endpoint. `src/data/phonemes.ts` — the 15-milestone
> curriculum + `ageCohortMinMonths`. `app/_layout.tsx` — Stack + SafeAreaProvider + Ionicons font
> prewarm + splash handling. `app/index.tsx` — boot gate: JWT → `/login`; else `api.me()` → `/home`
> (if cached profileId) or `/onboarding`; spinner while deciding. Stub empty `/login`, `/onboarding`, `/home`.

**Workable check:**
- App boots to the spinner then lands on the `/login` stub (no token yet). No red error screen.
- With a token manually placed in storage, boot routes to `/onboarding`. Fonts/icons render.

---

## Sprint 4 — Frontend Auth (login OTP flow)

**Prompt:**
> Build `app/login.tsx`: two-step email → 6-digit OTP. Step 1: email input + "Send Code" calling
> `api.requestCode`. Step 2: six boxed digit inputs with auto-advance, backspace-to-previous, and
> paste-fill; a resend link with a 30s cooldown; inline error banner. On `api.verifyCode` success,
> `storage.secureSet("talktally.jwt", token)` and route to `/onboarding`. Match the Tactile/Playful
> design (coral CTAs, 56pt+ buttons, chatbubbles brand mark).

**Workable check:**
- Enter an email → tap Send Code → read the code from the backend console → enter it → land on `/onboarding`.
- Kill and reopen the app: boot gate skips login (token persisted) and goes to onboarding.
- Wrong code shows the error banner; resend disabled for 30s.

---

## Sprint 5 — Onboarding + Home (Syllabus & History)

**Prompt:**
> Build `app/onboarding.tsx`: name input (default "Child") + age-cohort pill carousel
> (12-18M/18-24M/24-30M/30-36M) → `api.createProfile`, cache profileId/name/cohort in AsyncStorage,
> route to `/home`. Build `app/home.tsx`: avatar w/ initials, cohort chip, frosted-glass Smart Tip
> card, segmented Syllabus/History control, sign-out (clear JWT → `/login`), pull-to-refresh.
> Syllabus = milestone cards filtered by cohort start age (tap → `/calibrate?categoryId=`). History =
> `api.listSessions` rows with accuracy (tap → `/session/[id]`), empty-state illustration.

**Workable check:**
- Complete onboarding → land on Home with your child's name/avatar and cohort-filtered milestones.
- Toggle Syllabus/History; History shows the empty state; pull-to-refresh works; sign-out returns to login.
- Reopen app → boot gate now goes straight to Home (cached profile).

---

## Sprint 6 — Calibration + Practice (record → transcribe → score)

**Prompt:**
> Build `app/calibrate.tsx`: 2-second mic sweep using expo-audio `useAudioRecorder({isMeteringEnabled:true})`,
> live LED-bar dB meter + pulse ring, compute a noise floor, then route to `/practice`. Build
> `app/practice.tsx`: iterate the selected category's targets. Show coaching tip, big central card
> (emoji/word/phoneme), giant Record button that becomes a pulsing "sound bubble" while recording.
> On stop: read the clip to base64 (expo-file-system native / FileReader web) → `api.transcribe` →
> show score + Correct/Skip/Retry. Accumulate targets in `src/state.ts`. After the last target,
> route to `/scoreboard`.

**Workable check:**
- Tap a milestone → calibration meter reacts to sound → Practice loads the first card.
- Record the target word → transcript + score appear; Correct/Skip advance through all targets → reach Scoreboard.
- Mic permission prompt appears first run; denying shows the error state, not a crash.

---

## Sprint 7 — Scoreboard + History Detail (playback)

**Prompt:**
> Build `app/scoreboard.tsx`: accuracy ring, correct/total/XP, per-word transcript rows, and a
> "Complete Lesson" button that calls `api.createSession` with the accumulated targets and routes to
> `/home`. Build `app/session/[id].tsx`: fetch `api.getSession`, list target rows (word, phoneme, score,
> Play button); rebuild base64 → temp file (expo-file-system) → play via expo-audio
> `createAudioPlayer` with play/pause state.

**Workable check:**
- Finish a session → Scoreboard shows correct accuracy → Complete Lesson persists it → Home History now lists it.
- Open the session from History → each word's Play button plays back the recording you made.

---

## Sprint 8 — Design Polish + Full E2E

**Prompt:**
> Final polish pass. Load Fredoka (display) + Nunito (body) via expo-font and apply per the design
> system. Add frosted glass (expo-blur/expo-glass-effect, solid fallback) to the Home Smart Tip card
> and sticky practice coaching header. Add haptics (tab light, record medium, correct success, skip
> light, complete success). Verify loading/empty/error states on every screen. Ensure Tier-2 shadows,
> 56pt+ buttons, 8pt spacing throughout.

**Workable check (full journey):**
- Fresh install → login → onboarding → pick milestone → calibrate → practice (record + score) →
  scoreboard → home → open history → play back audio. No crashes, fonts/glass/haptics present.
- Test on both a physical Android and iOS device via Expo Go on the same Wi-Fi as the backend.

---

## Cross-Sprint Tips
- Keep the backend running and re-run its curl/pytest checks after any backend change.
- If Expo Go won't load on the phone, it's almost always Windows Firewall on port 8081 — see the
  Troubleshooting section in `frontend/README.md`.
- Commit at the end of each green sprint so you always have a working checkpoint to return to.
