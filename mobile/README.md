# Lovli Mobile (Expo / React Native)

**Status:** placeholder. The Expo app will be scaffolded by **Claude Fable**. This folder, `.env.example`, and `docs/MOBILE_SETUP.md` exist so Claude Fable has a clean target.

## When ready, target structure

See `docs/MOBILE_SETUP.md` for the full target tree (screens, navigation, services, theme, etc.).

## Non-negotiables for the mobile app

1. **Only call the backend API** — never call Anthropic / Google / Mongo directly from the device.
2. Backend base URL comes from `EXPO_PUBLIC_BACKEND_URL`. No hardcoded URLs in components.
3. Bundle must NOT contain: Anthropic key, Google client secret, JWT secret, admin key, Mongo URL.
4. JWT token stored via **Expo SecureStore**, never AsyncStorage.
5. Follow the visual language in `/DESIGN_HANDOFF.md` (dark theme, lavender accent, premium minimal).
6. Reuse product constants documented in `docs/PROJECT_OVERVIEW.md` (platforms, vibes, languages, tone-label mapping).

## Local dev quickstart (once scaffolded)

```bash
cd mobile
cp .env.example .env
# fill in EXPO_PUBLIC_BACKEND_URL
npx expo start
```
