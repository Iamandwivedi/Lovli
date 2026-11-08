# Google sign in: setup runbook

Everything in code is done: the login and signup buttons, the native SDK wrapper, `POST /api/auth/google/token`, and the tests. The button stays hidden in every build because the config still holds placeholders. This runbook fills them in. Budget about 20 minutes.

## Where things stand today (audited 2026-11-08)

| Place | Value today | Needs |
|---|---|---|
| Production `GET https://api.lovli.in/api/auth/google/config` | `enabled: true`, `client_id` = `135204619232-9nq4vgt21od36mkvrs3emst9ng491u4m.apps.googleusercontent.com` | Nothing. A Web client already exists in Google Cloud project number `135204619232`. Reuse it. |
| Railway `GOOGLE_IOS_CLIENT_ID` | Not visible from outside; `backend/.env.example` ships it empty | The iOS client ID (step 3) |
| `mobile/eas.json`, all four profiles (development, simulator, preview, production) | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` are both `REPLACE_ME.apps.googleusercontent.com` | Real IDs (step 5) |
| `mobile/app.json`, plugin `@react-native-google-signin/google-signin` | `iosUrlScheme: com.googleusercontent.apps.TODO-REPLACE-WITH-REVERSED-IOS-CLIENT-ID` | The reversed iOS client ID (step 5), then a new native build (step 6) |
| `mobile/.env` | Neither Google variable is present, so both read as empty | Real IDs for local dev (step 5) |
| `mobile/.env.example` | Both Google variables present and empty | Nothing |
| `backend/.env.example` | `GOOGLE_CLIENT_ID=xxxxx...` placeholder, `GOOGLE_IOS_CLIENT_ID=` empty | Nothing, it is an example file |
| Android | `app.json` has `android.package: in.lovli.app`, the EAS profiles are platform agnostic, and `yarn build:dev:android` exists. No `android/` folder is generated locally. | An Android OAuth client if you intend to ship Android builds (step 4). Skip it otherwise. |

How the code behaves with these values:

1. `mobile/src/auth/google.ts` reads both IDs at bundle time. `isGoogleConfigured()` is true only when the web client ID is non empty. In a dev build an empty web client ID logs one warning on launch so you know why the button is missing.
2. `mobile/src/components/GoogleSignIn.tsx` renders nothing unless `isGoogleConfigured()` is true. Only then does it call `GET /api/auth/google/config`, and it still renders nothing unless that answers `enabled: true`. So the button appears only when both the bundle and the backend are configured.
3. `POST /api/auth/google/token` accepts an id_token whose audience is either `GOOGLE_CLIENT_ID` or `GOOGLE_IOS_CLIENT_ID`. Empty values are dropped from the list, so with `GOOGLE_IOS_CLIENT_ID` empty only the web client ID is accepted. It answers 503 when `GOOGLE_CLIENT_ID` is empty and 401 for any verification failure, with the reason kept in the server log. When the app configures the SDK with the web client ID, the SDK mints id_tokens for that web client on both platforms, so `GOOGLE_IOS_CLIENT_ID` is a safety net rather than a requirement. Set it anyway.

## Steps

### 1. Google Cloud Console, project and consent screen

1. Open https://console.cloud.google.com and pick the project that owns client `135204619232-9nq4...`. Its project number is `135204619232`. If you cannot find it, search the project list for that number. Do not create a second project; the backend already verifies against this one.
2. Go to APIs and Services, then OAuth consent screen.
3. User type: External. App name: Lovli. User support email: the address you want users to see. Developer contact email: your own.
4. Scopes: `openid`, `email`, `profile`. Nothing else.
5. While the app is unpublished, add every Google account you will test with under Test users. Accounts not on that list get an access blocked screen.
6. Save. You can publish the consent screen later; sign in works for test users without publishing.

### 2. The Web client

1. Go to APIs and Services, then Credentials.
2. Confirm the OAuth 2.0 Client ID of type Web application with ID `135204619232-9nq4vgt21od36mkvrs3emst9ng491u4m.apps.googleusercontent.com` exists. Copy its client ID. That is your web client ID for every step below.
3. Nothing to add for the mobile path. Authorized redirect URIs are only for the retired web app; leave them as they are.
4. If the client does not exist after all, create one: Create Credentials, OAuth client ID, type Web application, name `Lovli backend`. Then update `GOOGLE_CLIENT_ID` on Railway to the new value, otherwise step 7 will fail.

### 3. The iOS client

1. Credentials, Create Credentials, OAuth client ID.
2. Application type: iOS. Name: `Lovli iOS`. Bundle ID: `in.lovli.app`. Leave App Store ID and Team ID empty for now.
3. Create. Copy two values from the result:
   the client ID, which looks like `135204619232-abcdef.apps.googleusercontent.com`, and
   the iOS URL scheme, which is the same ID reversed: `com.googleusercontent.apps.135204619232-abcdef`.

### 4. The Android client (only if you will build for Android)

1. From `mobile/` run `eas credentials`, choose Android, the `development` profile, and read the SHA-1 fingerprint of the keystore EAS holds. Preview and production builds use the same keystore unless you created separate ones, in which case repeat for each.
2. Credentials, Create Credentials, OAuth client ID, type Android. Name: `Lovli Android`. Package name: `in.lovli.app`. SHA-1: the value from the previous step.
3. Create. You do not need to copy anything: Android id_tokens carry the web client ID, and Google matches the package and SHA-1 on its side.
4. For a local `yarn android` build the debug keystore differs. Add a second Android client with the SHA-1 from `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`.

### 5. Put each value where it belongs

| Value | Goes to |
|---|---|
| Web client ID | `mobile/eas.json`, every profile, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Web client ID | `mobile/.env`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (add the line, it is not there today) |
| Web client ID | Railway, `GOOGLE_CLIENT_ID` (already set to this value today) |
| iOS client ID | `mobile/eas.json`, every profile, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| iOS client ID | `mobile/.env`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (add the line) |
| iOS client ID | Railway, `GOOGLE_IOS_CLIENT_ID` |
| Reversed iOS client ID | `mobile/app.json`, the `iosUrlScheme` option of the `@react-native-google-signin/google-signin` plugin |

Notes:

1. Both IDs are public identifiers, not secrets. Committing them in `eas.json` and `app.json` is fine. There is no client secret anywhere in the mobile path.
2. Railway variables apply on the next deploy. Redeploy the backend after changing them.
3. `mobile/.env` is gitignored; `mobile/.env.example` already documents both lines.

### 6. Rebuild the native app

1. Changing `iosUrlScheme` in `app.json` changes the native Info.plist. A JavaScript only update does not pick it up; you need a new native build.
2. Cloud: `yarn build:dev:ios` from `mobile/`, then install the result on the phone.
3. Local simulator or device: delete nothing, just run `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios` from `mobile/` so Continuous Native Generation regenerates `ios/` with the new scheme. Do not run `expo prebuild` by hand and do not commit `ios/` or `android/`.
4. The dev client itself also opens through this URL scheme, so a wrong value shows up immediately as a failed launch.

### 7. Verify

1. `curl https://api.lovli.in/api/auth/google/config` returns `"enabled":true` and the web client ID.
2. Launch the new build. The Continue with Google button appears on both the login and the signup screen under the OR divider. If it is missing in a dev build, read the Metro log: an empty web client ID prints `Google sign in is hidden: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is empty.`
3. Tap it with one of the test users from step 1. The Google sheet opens, you pick the account, and you land in the app signed in.
4. Confirm the account: `GET /api/auth/me` with the new token, or look in Mongo, shows `auth_provider: "google"` for a brand new email, or `"both"` for an email that already had a password.
5. If the sheet opens but the app shows the Google sign in toast, check the Railway log for `google id_token rejected`. `audience mismatch` means the client IDs in the bundle and on Railway do not belong to the same project or the iOS ID is missing. `invalid_client` on the device usually means the reversed client ID in `app.json` does not match the iOS client.
