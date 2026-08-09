# Run Lovli on a physical phone

Lovli cannot run in Expo Go. It uses Face ID (`expo-local-authentication`) and
scheduled notifications (`expo-notifications`), which need real native code — so
you need a **dev build** or an **EAS build**. Both are covered below.

The app points at production (`https://api.lovli.in`) by default, so a build
works on cellular, on any Wi-Fi, anywhere. Nothing to edit first.

---

## Which path?

| | Local build | EAS build |
|---|---|---|
| Needs | Xcode / Android Studio on this Mac | Just an Expo account |
| Time | ~5–10 min first run | ~15 min, runs in the cloud |
| Best for | Daily development with fast reloads | Getting it on someone else's phone |

---

## A. Local build (fastest for you)

### iPhone

1. Plug the phone in, unlock it, tap **Trust** if prompted.
2. ```bash
   cd mobile
   yarn install
   yarn ios:device
   ```
3. Xcode signing, first time only: open `mobile/ios/Lovli.xcworkspace`, select
   the **Lovli** target → **Signing & Capabilities** → tick *Automatically
   manage signing* and pick your Apple ID team. A free Apple ID works; the build
   just expires after 7 days.
4. On the phone: **Settings → General → VPN & Device Management** → trust your
   developer certificate. iOS refuses to launch the app until you do.

### Android

```bash
cd mobile
yarn install
yarn android:device
```

Enable **Developer options → USB debugging** on the phone first, and accept the
debugging prompt when it appears.

### Day to day

After the build is installed, you only need the bundler:

```bash
yarn start          # or `yarn start:clear` after changing env or native config
```

---

## B. EAS build (no Xcode)

```bash
npm install -g eas-cli
eas login                 # your Expo account
eas init                  # links the project, writes extra.eas.projectId
eas build --profile development --platform ios
```

EAS prints a QR code and an install link when it finishes.

For iOS this needs an Apple Developer account and the device registered
(`eas device:create`). Android has no such requirement — the build produces an
APK you can install directly, which makes `--platform android` the quickest way
to get Lovli onto a phone that isn't yours.

> **Why `eas.json` sets `env`:** EAS builds never receive `.env` or `.env.local`
> — they are git-ignored and never uploaded. Build-time values must live in
> `eas.json` under each profile, which is already done.

---

## Pointing at a local backend instead

Default is production. To develop against a backend on this Mac:

1. Start it, bound so the phone can reach it:
   ```bash
   cd backend
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```
2. Get the Mac's LAN IP: `ipconfig getifaddr en0`
3. In `mobile/.env.local`, uncomment the two lines and set that IP.
4. `yarn start:clear` — env changes need the cache cleared.

Phone and Mac must be on the same Wi-Fi. Comment those lines back out before
building for a device, or the build will only work at your desk.

`.env.local` overrides `.env` (Expo precedence: `.env.{mode}.local` →
`.env.local` → `.env.{mode}` → `.env`), and both are git-ignored.

---

## Verify it works

1. Sign in — this hits `POST /api/auth/login` on the real backend.
2. Save a person in Memory, change a setting in Settings.
3. **Delete the app, reinstall, sign in again.**

Everything should come back — the person, the setting, the Ask Lovli thread.
That round trip is `GET /api/bootstrap` restoring account state that used to
live only on the device, and it is the single best end-to-end check that the
backend, database and migration are all healthy.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Network errors on every screen | Bundler cached the old env | `yarn start:clear` |
| Works on Wi-Fi, dead on cellular | `.env.local` still points at a LAN IP | Comment those lines, rebuild |
| "Untrusted Developer" on launch | Certificate not trusted yet | Settings → General → VPN & Device Management |
| Face ID prompt never appears | Ran in Expo Go | Use a dev build — Expo Go has no native module |
| Auto-login does nothing | `ALLOW_TEST_LOGIN` is false in production | Expected. Sign in with a real account |
| Build fails after changing `app.json` | Stale native project | `yarn prebuild:clean` then rebuild |
