# Mobile Setup (for Claude Fable)

Lovli's mobile app is an Expo + React Native + TypeScript project that hits the **same backend** as the web app. No separate backend. No direct calls to Claude / Google / Mongo from the device.

## Target stack

- Expo SDK (latest stable)
- React Native + TypeScript
- Expo Router (file-based) — preferred. React Navigation is also fine.
- `react-native-safe-area-context` for safe areas
- `expo-secure-store` for JWT storage
- `expo-image-picker` for screenshot uploads
- `expo-clipboard` for copying replies
- Theme tokens mirror `DESIGN_HANDOFF.md`

## Target structure (binding)

```
mobile/
  app.json
  package.json
  tsconfig.json
  .env.example
  src/
    app/                       # if using Expo Router
    navigation/
      RootNavigator.tsx
      BottomTabs.tsx           # 3 tabs: Reply / Pro / Memory
    screens/
      auth/                    LoginScreen, SignupScreen
      onboarding/              OnboardingScreen
      reply/                   ReplyScreen, ResultsScreen
      memory/                  MemoryScreen, AddEditMemoryScreen
      pro/                     ProScreen
      settings/                SettingsScreen
    components/
      ui/                      Button, Card, Input, Chip, Screen
      reply/, memory/
    services/                  api.ts, authApi, generationApi, memoryApi, proApi, settingsApi
    hooks/                     useAuth, useApi, useTheme
    theme/                     colors.ts, spacing.ts, typography.ts, radius.ts
    constants/                 product.ts, api.ts
    types/                     auth, memory, generation, user
    lib/                       storage.ts, errors.ts, validators.ts
    assets/
```

## Non-negotiables

1. **Backend URL via `EXPO_PUBLIC_BACKEND_URL`** — no hardcoded URLs in components.
2. **Auth token in SecureStore**, never AsyncStorage.
3. **Never bundle**: `ANTHROPIC_API_KEY`, `MONGO_URL`, `JWT_SECRET`, `ADMIN_KEY`, `GOOGLE_CLIENT_SECRET`.
4. **Visual system mirrors `DESIGN_HANDOFF.md`** — palette, 22/16/17/14 typography scale, white-pill primary CTA, lavender-bordered active chips, etc.
5. **Product constants come from `docs/PROJECT_OVERVIEW.md`** — 3 platforms, 5 vibes, 3 languages, tone-label mapping.
6. **Bottom tabs = 3** (Reply / Pro / Memory). Settings is reached from the top-right cog, never a bottom tab.
7. **Error helper** — port `extractErrorMessage(err, fallback)` from `frontend/src/lib/api.js`. Pydantic 422 returns `detail` as an array.
8. **Image upload** — multipart, field name `image`, accept JPG/PNG/WEBP, ≤6MB.
9. **Daily-limit math is server-side**. Always send IANA timezone + local YYYY-MM-DD with each generation.

## API surface (read this first)

See `docs/API_CONTRACT.md` for full method/path/body/response table.

## Local dev

```bash
cd mobile
cp .env.example .env
# set EXPO_PUBLIC_BACKEND_URL=https://<your-railway>.up.railway.app  (or https://api.lovli.in)
npx expo start
```

During dev against Railway directly, also add the Expo tunnel URL (if used) to the backend's `CORS_ORIGINS`.

## Production builds

Use EAS Build for iOS + Android. Anthropic and Mongo never appear in the mobile config.
