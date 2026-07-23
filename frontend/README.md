# TalkTally Mobile App

Expo/React Native mobile client for TalkTally. Use Expo Go on a phone for local testing.

## Environment

Create `frontend/.env` from `frontend/.env.example`.

```env
EXPO_PUBLIC_BACKEND_URL=http://YOUR_LAPTOP_LAN_IP:8001
```

For this machine right now, the detected Wi-Fi IP is:

```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.10.45:8001
```

Use the laptop LAN IP, not `localhost`, because Expo Go runs on your phone.

## Run Locally On A Phone

From repo root:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

In another terminal:

```powershell
cd frontend
npm install
npm run start
```

Then open Expo Go on your phone and scan the QR code from the terminal/browser.

## Troubleshooting: App Won't Load In Expo Go (Windows)

On Windows, the most common cause is **Windows Defender Firewall blocking inbound
connections to Metro (port 8081)**. The dev server binds to `0.0.0.0:8081`, so it
works from `localhost` on the laptop (loopback bypasses the firewall) but the phone's
connection is silently dropped — Expo Go hangs on "Downloading" or times out.

Fix: open **PowerShell as Administrator** and add inbound rules once:

```powershell
netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081 profile=private,domain
netsh advfirewall firewall add rule name="TalkTally Backend 8001" dir=in action=allow protocol=TCP localport=8001 profile=private,domain
```

The first rule lets Expo Go download the bundle; the second lets the phone reach the
backend API. Then restart Metro with `npx expo start --lan --clear`.

Other things to check:
- Phone and laptop are on the **same Wi-Fi** (and the same band/SSID).
- The router doesn't have **AP/client isolation** enabled (blocks device-to-device traffic).
- `EXPO_PUBLIC_BACKEND_URL` uses the laptop's current LAN IP (run `ipconfig`), not `localhost`.
- From the phone's browser, `http://<LAPTOP_LAN_IP>:8081/status` should return
  `packager-status:running`. If it doesn't, it's a network/firewall issue, not the app.
- Tunnel mode (`npx expo start --tunnel`) bypasses LAN entirely, but relies on ngrok and
  can time out (`ngrok tunnel took too long to connect`) — fix the firewall/LAN route first.

## Backend Requirements

The backend also needs `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=talktally
GROQ_API_KEY=
JWT_SECRET_KEY=replace-with-64-hex-character-secret
JWT_ALGORITHM=HS256
```

Install/start MongoDB locally or replace `MONGO_URL` with a MongoDB Atlas URI.

`GROQ_API_KEY` is required for real pronunciation transcription. Login, onboarding, profile, and session flows can run without it, but recording transcription returns `GROQ_API_KEY missing` until you add a real key and restart the backend.

## Sign In During Local Testing

1. Enter any email in the app.
2. Watch the backend terminal for a line like `[TalkTally OTP] parent@example.com -> 123456`.
3. Enter that 6-digit code in Expo Go.
