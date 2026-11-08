# Lovli: rules for Claude Code

## Mobile rules (mobile/)

- The JWT lives in expo-secure-store only, never AsyncStorage.
- The backend URL comes only from EXPO_PUBLIC_BACKEND_URL.
- No secrets in the mobile bundle. OAuth client IDs are public identifiers and are fine. Client secrets are not.
- mobile/ios and mobile/android are not committed. Both platforms use Continuous Native Generation. Never run expo prebuild and never commit those folders.
- User facing copy never uses em dashes, en dashes, or spaced hyphens. Run yarn lint:copy before committing.
- Font family names live only in mobile/src/theme/typography.ts. Screens use the theme tokens, never a fontFamily string.
- No sparkle or star glyphs anywhere in the UI or in copy. The brand mark is the Lovli wordmark only.
