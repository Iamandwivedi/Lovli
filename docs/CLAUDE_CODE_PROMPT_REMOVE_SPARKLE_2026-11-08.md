# Lovli mobile: remove the sparkle mark everywhere

Work only inside /mobile. Read CLAUDE.md first and keep every rule in it. One task, one commit. Do not refactor anything that is not part of this task. Do not touch /backend or /frontend.

## Decision

The four point sparkle (the `Sparkle` component, the ✦ glyph U+2726, and the Ionicons `sparkles` icon) is retired from the app completely. The app icon is the plain "Lovli" wordmark, so the in-app brand becomes the wordmark too. Nothing in the app should look like a sparkle, star, or AI glitter mark after this.

Replacements, decided:
- The logo tile becomes the wordmark only. No tile, no mark, just "Lovli" in the display font.
- The Ask Lovli chat avatar becomes a small monogram circle: the letter L in the display font, lavender text on the existing lavender tint, same diameter the sparkle avatar used.
- The Ask Lovli tab icon becomes `chatbubble-ellipses` active and `chatbubble-ellipses-outline` inactive.
- Decorative sparkles next to section labels, eyebrows, and chips are simply removed. The text stays and the layout keeps its spacing.
- Sparkles used as list bullets are replaced by a 5px filled circle in the same colour the sparkle had, vertically centred on the first line of text.
- The staged loader keeps its stages and reduce motion handling, but the animated sparkle becomes a soft pulsing lavender ring (a 34px circle with a 2px lavender border, scaling 1.0 to 1.08 and fading 1.0 to 0.6 on the same 900ms loop). No icon inside it.

## Inventory to clear

Current usages, found with `grep -rn "Sparkle\|✦\|sparkles" app src`. Clear every one and grep again before committing.

Components
- src/components/Sparkle.tsx: delete the file once nothing imports it.
- src/components/PrimaryButton.tsx: remove the `withSparkle` prop, the Sparkle import, and the leading glyph. The label is now the only content, centred. Remove `withSparkle={false}` from every caller (onboarding.tsx, forgot-password.tsx, PrivacySheet.tsx, and any others the type checker finds).
- src/components/LovliLogo.tsx: drop the tile and the Sparkle. Render the wordmark. Keep `size`, `showName`, `style`, and `testID="lovli-mark"`. When `showName` is false (one caller passes it), render the wordmark anyway at the small size, because there is no mark to fall back to. Check that caller still looks right.
- src/components/AppLockGate.tsx: the 26px glow sparkle becomes the LovliLogo wordmark.
- src/components/AppHeader.tsx: remove the amber sparkle beside the credits count. Text only.
- src/components/reply/InsightCard.tsx, NotedCard.tsx, ReplyCard.tsx, ContinuityStrip.tsx: remove the eyebrow sparkles.
- src/components/reply/ResultActions.tsx: the "Ask Lovli about this" pill icon becomes Ionicons `chatbubble-ellipses-outline` at the same size and colour.
- src/components/reply/StagedLoader.tsx: the pulsing ring described above.

Screens
- app/(tabs)/_layout.tsx: Ask Lovli tab icons as above.
- app/(tabs)/ask-lovli.tsx: the avatar becomes the L monogram; the other two sparkles (starter chips area and greeting) are removed.
- app/(tabs)/reply.tsx: three eyebrow sparkles removed. Update the header comment that mentions "✦ Get replies".
- app/(tabs)/more.tsx: remove.
- app/decode.tsx: three sparkles. The ones that act as bullets become dots in their existing colours (lavender and pink), the eyebrow one is removed.
- app/feature/[id].tsx: the per point sparkle coloured by TONE_COLOR becomes the 5px dot in that colour. The other two are removed. Update the comment that mentions "✦ Glow up this reply".
- app/paywall.tsx: both removed, including the 16px glow one.
- app/settings/learned.tsx: removed.
- app/settings.tsx: the badge text "✦ PREMIUM" becomes "PREMIUM".

Strings and config
- src/utils/notifications.ts: remove the trailing " ✦" from both notification titles.
- src/constants/feature-config.ts: update the two comments that mention ✦. Check whether any actual string values in that file or elsewhere contain ✦ and remove the glyph from them.
- src/theme/colors.ts: delete the `sparkle` token if nothing uses it after this change. Update the `violetDeep` comment so it no longer describes the sparkle.

## Guardrail

Extend mobile/scripts/check-dashes.sh so the same perl scan also fails on ✦ (U+2726) and ✧ (U+2727) in app and src, with the same comment exclusions. Rename nothing; the script name and the `lint:copy` entry stay. Update the failure message to say "dash or sparkle glyph". Prove it the same way as before: plant a ✦ in a string, see it fail, remove the plant.

Add one line to CLAUDE.md under mobile rules: "No sparkle or star glyphs anywhere in the UI or in copy. The brand mark is the Lovli wordmark only."

## Verify

Run `yarn typecheck`, `yarn lint`, `yarn lint:copy`. Then `grep -rn "Sparkle\|✦\|sparkles" app src` must return nothing. Reload the app on the phone (Metro is running) and screenshot: login, Reply home, a generated result with the Noted card, Ask Lovli with one Lovli bubble, More tab, the staged loader mid run, and the app lock screen if you can trigger it. Commit with a message that says the sparkle mark is retired in favour of the wordmark.

Report: the file count touched, the screenshots, and anything that looked empty or unbalanced after the sparkle came out so I can decide whether it needs a different fix.
