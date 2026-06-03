# TalkTally Mobile

This directory contains the TalkTally mobile app built with Expo + React Native (TypeScript).

## Prerequisites
- Node.js (18+ recommended)
- npm or yarn
- Expo CLI: `npm install -g expo-cli` (optional if using `npx expo`)
- For device/emulator testing:
  - Android: Android Studio + emulator, or a physical device with USB debugging
  - iOS: Xcode + simulator (macOS only) or physical device

## Install dependencies
From the repo root or inside the mobile folder:

```bash
cd mobile
npm install
# or
# yarn
```

If you use Expo-managed workflow you may also need to install native dependency tooling via `expo install` for platform-specific packages. Most dependencies are listed in `mobile/package.json`.

## Environment
No server environment variables are required to run the mobile app locally. If you want the app to sync with a backend, set the API base URL in your local development configuration (see `mobile/src/services/api.ts` if present) or use an environment solution such as react-native-config or expo-constants.

## Run (development)
Start the Expo dev server:

```bash
# from mobile/
npm run start
# opens Metro/Expo dev tools
```

Then:
- Scan the QR with Expo Go (Android/iOS) to test on a physical device (if using a managed Expo app)
- Or run on an emulator:
  - `npm run android` (Android emulator / device)
  - `npm run ios` (iOS simulator — macOS only)

## Build (production)
For production builds you can use EAS (Expo Application Services) or the classic `expo build` (depending on your Expo setup). Example with EAS:

```bash
# Install EAS CLI if not present
npm install -g eas-cli
# Login and follow eas build steps
eas build --platform ios
eas build --platform android
```

See Expo docs for more details: https://docs.expo.dev/

## Voice & Audio Notes
- The app uses Expo Audio for recording and metering. You will be prompted for microphone permissions on first calibration run.
- Audio files are saved locally on the device only (MVP) and are not uploaded to the server unless you enable a cloud backup in a future release.

## Common issues
- If microphone metering stays at -160 dB, ensure the app has microphone permission and try calibrating again.
- For iOS simulator microphone support, use a real device or configure the simulator to use the host microphone.

## Helpful commands
- `npm run start` — Start Expo dev tools
- `npm run android` — Run on Android emulator/device
- `npm run ios` — Run on iOS simulator (macOS only)
- `npm run web` — Run web (limited support)

## Contributing
See the repository root README for contribution guidelines. Please run linters and type checks before submitting PRs.
