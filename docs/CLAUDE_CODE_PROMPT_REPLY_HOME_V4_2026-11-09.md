# Claude Code prompt: implement Reply home V4

Put the exported PNGs in docs/design/reply-home-v4/ first, then paste everything below the line into Claude Code from the repo root.

---

Implement the Reply home V4 redesign in mobile/. The approved designs are PNGs in docs/design/reply-home-v4/. Open every one of them before writing code. The file names say which state each shows: A (returning user, person selected, this is the baseline), A1 (people saved, none selected), A2 (person selected, no story yet), A3 (long first name), B (new user, nothing saved), C (composer focused, keyboard open), E (text typed), F (screenshot attached), G (out of free reads), H (Pro), J (person picker sheet), and three toasts.

Read CLAUDE.md and follow it. Three rules matter most here: user facing copy never contains em dashes, en dashes or spaced hyphens (run yarn lint:copy); font families come only from src/theme/typography.ts tokens; no sparkle or star glyph anywhere.

SCOPE

Change only these:
- mobile/app/(tabs)/reply.tsx: the HomePhase component and the small amount of wiring in ReplyScreen that feeds it. The intent, generating and results phases change only as described under "Move, do not delete".
- New components under mobile/src/components/reply/: Composer.tsx, PersonCard.tsx, PersonPickerSheet.tsx, Greeting.tsx. Reuse GlassCard, Chip, PersonChip, Input, PrivacySheet patterns where they fit.
- mobile/src/components/AppHeader.tsx only if the left side does not already render the plain "Lovli" wordmark in display type with no mark or tile. The design shows the wordmark at 22pt.

Do not touch mobile/app/(tabs)/_layout.tsx. The tab bar stays exactly as it is. Do not touch backend/, frontend/, the API client, or src/theme. Every colour, radius and font the design needs already exists in src/theme/colors.ts and typography.ts. If you believe a token is missing, stop and say which one.

WHAT THE HOME PHASE BECOMES

Top to bottom, matching PNG A:
1. AppHeader with the credits chip and the avatar, as today.
2. Greeting (new Greeting.tsx). Two lines in typography.display.hero. Line 1: "Hey " in colors.text followed by the user's first name in colors.lavenderText. First name is the first whitespace separated token of user.name, trimmed. If there is no name, line 1 is "Hey there". Line 2: "What's going on?" in colors.text. If line 1 would exceed one line at hero size, render both lines in display.h1 instead. Measure with onTextLayout, do not guess from character count. Never truncate or wrap line 1.
   Subline, body.base in colors.textMuted, 8pt below: "Paste their last text. I'll read it with you." For new users with no memory cards: "Paste a chat or try a sample. I'll read it with you." When out of free reads (G): "You've used today's 10 reads. Back at midnight, or go Pro now." in colors.amber. The number 10 must come from the usage object, not be hard coded.
3. A flexible spacer. The utility zone below is pinned toward the bottom so the layout matches the PNGs. The home phase no longer scrolls on an iPhone 16 class screen. Pass scroll={false} to Screen for the home phase and build the layout with flex. If content cannot fit on a given device (smaller phone, large Dynamic Type), fall back to allowing scroll rather than clipping.
4. PersonCard (new PersonCard.tsx), one of three variants, decided by memoryCards, memoryId and a new local boolean personSkipped:
   - memoryCards.length === 0: a glass card with h3 "Not sure yet? Start with a sample chat" and small muted "See how I read a real convo before you share yours", chevron right, onPress pushes /sample. testID try-sample-chip. (PNG B)
   - memoryCards.length > 0 and a person is selected: glass card with a 36pt gradient avatar showing the person's initial, nickname in h3, second line in small muted: "Last time: " plus the latest timeline entry's text plus " · " plus a relative time ("2 days ago"), one line, ellipsis. Reuse whatever ContinuityStrip already does to derive that text and relative time, then delete ContinuityStrip if nothing else imports it. If the person has no timeline entries, the second line is "No story yet. I'll start remembering after your first reply." (PNG A2). Chevron right. Tapping the card opens PersonPickerSheet. Below the card, left aligned, a text link in body.label colors.lavenderText reading "Someone else", which also opens the sheet. testID person-section on the wrapper, person-card on the card.
   - memoryCards.length > 0, nobody selected, not skipped: glass card with a 36pt lavender tint circle holding a 20pt person-outline icon in colors.lavenderText, h3 "Who are we texting?", small muted "Pick someone, or skip it.", chevron right, tap opens the sheet. Below it a horizontal row of pills 32pt tall: up to three most recent people (PersonChip, with a 20pt avatar and first name, testID person-{id}) and a last plain glass pill "Skip" (testID person-none). Tapping a name sets memoryId. Tapping Skip sets personSkipped true, which hides the pill row and renders the selected variant with the card reading "No one in particular" and a "Change" link under it that reopens the sheet. (PNG A1) personSkipped and memoryId reset at the start of each new flow exactly as memoryId resets today.
5. Composer (new Composer.tsx), matching PNGs A, E, F and the composer states strip. A raised glass container, radius radii.input, min height 116. Inside: a multiline TextInput bound to manual, placeholder "Paste their last text, or type what they said", two lines visible, grows to four lines then scrolls internally. testID manual-text-input. Below the field a 44pt toolbar: left, two 40pt circular glass icon buttons with 44pt hit areas, clipboard-outline (onPaste, testID capture-paste, accessibilityLabel "Paste from clipboard") and image-outline (onPickImage, testID upload-area, accessibilityLabel "Choose a screenshot"). Right, a 44pt circular send button, testID generate-replies-button, accessibilityLabel "Get replies". Disabled when there is no image and manual.trim() is empty: fill colors.glassFill, arrow colors.textDisabled. Enabled: fill colors.ctaBg, arrow colors.ctaText, shadow colors.ctaShadow. onPress calls goToIntent.
   When image is set, render a 56pt thumbnail (radius radii.sm) above the toolbar with a 20pt remove control at its top right (testID upload-remove-button, accessibilityLabel "Remove screenshot") and change the placeholder to "Add a note (optional)". testID upload-preview on the thumbnail wrapper. (PNG F)
6. Privacy line, unchanged in content and testID privacy-line, now centred and 12pt under the composer: lock icon, "PRIVATE", "  Read once, never saved. ", "How it works" link.

Out of free reads (PNG G): the chip reads what creditsText already produces, the subline is the amber copy above, the composer stays fully usable, and the send button is enabled. In goToIntent, when usage.plan !== "pro" and remaining <= 0, push /paywall instead of showing the toast. Remove the old credits-hint text. Pro (PNG H) needs no new work beyond confirming the chip tone.

Keyboard open (PNG C): add a small useKeyboardVisible hook (Keyboard.addListener for keyboardWillShow and keyboardWillHide on iOS, keyboardDidShow and keyboardDidHide on Android). While visible: the greeting collapses to a single display.h2 line, "What's going on, Aman?" with the name in lavenderText (or "What's going on?" with no name), the subline and the spacer disappear, the person card collapses to a 32pt lavender tint pill with a 20pt avatar and the nickname (hidden entirely when nobody is selected), and the composer sits above the keyboard with the privacy line 8pt below it. Wrap the home phase in KeyboardAvoidingView with behavior padding on iOS. Verify the composer is never hidden behind the keyboard.

PersonPickerSheet (PNG J): model it on PrivacySheet's modal mechanics. Scrim colors.scrim. Sheet fill colors.card, fully opaque, top radius 24, grab handle, 16pt padding. Title "Who are we texting?" in display.h2. Rows 60pt: 36pt gradient avatar, nickname in body.bodySemibold colors.text, second line in body.small colors.textMuted showing the same continuity text as the card or "No story yet". The selected person shows a checkmark icon in colors.lavender at the right and sorts first; the rest sort by most recent timeline entry. After the people: a row with a lavender tint circle and an add icon, "Someone new", which pushes /memory/new or whatever route creates a memory card today (check memory.tsx and reuse it). Then a row with a plain glass circle and "No one in particular", which clears memoryId and sets personSkipped. Max five rows visible, then the list scrolls. Every row at least 44pt tall. Selecting anything closes the sheet.

Toasts: keep the existing toast utility. Update these strings exactly:
- Empty clipboard on paste: "Nothing to paste yet. Copy their message first."
- Screenshot over the 6MB cap or unreadable: "That screenshot is too big. Try one under 6MB."
- Network failure during generation: "Couldn't reach Lovli. Check your connection and try again." If the toast utility supports an action, add "Retry" that calls startGeneration again with the same arguments. If it does not, leave the copy only and say so in your report.
- Delete the toast "Show me the conversation first. Screenshot or paste." The send button is disabled in that case, so it can no longer fire.

MOVE, DO NOT DELETE

SituationSection (situation chips plus the note field) and the feeling check-in (FEELINGS chips with Skip) leave the home phase and move into the intent phase, above the existing WHAT DO YOU WANT? section, in this order: HOW ARE YOU FEELING?, then ANYTHING LOVLI SHOULD KNOW? with the note. Their state, handlers, testIDs (feeling-section, feeling-{label}, feeling-skip) and the buildUserNote call in startGeneration stay as they are. The intent phase already scrolls.

DELETE

CaptureTarget and the two capture tiles, the WHO'S THIS ABOUT? chip row, the standalone "Not sure yet? Try with a sample chat" chip, the Get replies PrimaryButton on the home phase, the credits-hint text, and any styles that become unused. Remove unused imports.

COPY, VERBATIM

Everything in quotes above is final. The heading "Kya scene hai?" is gone from this screen. After the change, grep the whole mobile/ folder for "Kya scene", "scene hai", "Kya", "Haan", "yaar" and any other Hinglish in UI chrome (headings, labels, buttons, loader stages, empty states). Do not change those occurrences. List them in your report with file and line so they can be decided separately. User typed content and generated replies are not chrome.

ACCESSIBILITY

Every tap target at least 44pt by 44pt. Every icon button has an accessibilityLabel. The send button reports accessibilityState disabled when disabled. The greeting is one accessible element reading "Hey Aman. What's going on?".

PROCESS

Work on a new branch from main named reply-home-v4. Make it three commits, in this order, and stop and report after each one with a short summary and anything you were unsure about:
1. Layout: Greeting, PersonCard variants, Composer, privacy line, deletions, and the move of situation and feeling into the intent phase. Home phase matches PNGs A, A1, A2, A3, B, E, F, G, H.
2. PersonPickerSheet and the toast copy.
3. Keyboard handling and PNG C.

Before each report run yarn tsc --noEmit, yarn lint and yarn lint:copy and include the results. Do not run expo prebuild. Do not commit mobile/ios or mobile/android. Do not merge.

Also update the header comment at the top of reply.tsx so the "home:" line describes the new layout.
