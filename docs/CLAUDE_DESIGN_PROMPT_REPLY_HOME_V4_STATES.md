# Claude Design prompt: Reply home V4, all states

Follow up to CLAUDE_DESIGN_PROMPT_REPLY_HOME_V4.md. Attach the approved Frame A, the current app screenshot (tab bar reference only), and paste everything below the line.

---

Continue the Reply home V4 set in this project. Frame A (returning user, person selected, "Hey Aman / What's going on?") is approved and locked. Do not change its layout, type, spacing, colours or copy. Every frame below is Frame A with exactly one thing different, so the states can be built as conditions on one screen, not as separate screens.

TWO CORRECTIONS FIRST

1. Tab bar. Replace the tab bar in all frames with the app's existing one, reproduced from the attached app screenshot: a glass bar with radius 28, 1pt border rgba(255,255,255,0.10), the active tab sitting in a raised pill with a 1pt lavender hairline border rgba(167,139,250,0.30) and a short lavender line centred above it, active icon and label #C4B5FD, inactive icons and labels #8A8A94. Icons are Ionicons: Reply chatbubble (active), Ask Lovli chatbubble-ellipses-outline, Memory heart-outline, More grid-outline. The screenshot shows a sparkle icon on Ask Lovli and sparkle marks in the chip and the sample link, those are retired, do not reproduce them.
2. Everything else in the attached app screenshot is the old home and is not a reference for anything.

DESIGN SYSTEM
Same tokens as the approved set. If a value is not named here, use the one already in Frame A.
- Amber tint for notices: fill rgba(217,169,110,0.14), border rgba(217,169,110,0.30), text #D9A96E.
- Pink for errors: text #D6A6B0, tint rgba(214,166,176,0.12).
- Toast: raised glass, fill rgba(17,18,28,0.96), 1pt border #262737, radius 16, padding 12 by 16, body base text #E5E7EB, 16pt line icon on the left. Slides down from under the header, 16pt side margins, auto dismisses. One toast at a time.

FRAMES

A1. Returning user, people saved in Memory, none selected yet.
The person card becomes a picker prompt. Same glass card, same height as the Aanya card. Left: a 36pt circle in lavender tint with a 20pt person line icon in #C4B5FD. Text: h3 "Who are we texting?" and small muted "Pick someone, or skip it. I'll still read the chat." Chevron right. Below the card, instead of "Someone else", a horizontal row of up to three pills 32pt tall, lavender tint fill and border: each with a 20pt gradient avatar and the first name, most recent first, for example "Aanya", "Riya", then a last plain glass pill "Skip". Tapping a name selects that person and the card becomes the Frame A card. Tapping Skip hides the row and the card reads "No one in particular" with a small "Change" link under it.

A2. Returning user, person selected, no story saved for them yet.
Frame A card with the second line replaced by "No story yet. I'll start remembering after your first reply." in small muted. Everything else identical.

A3. Long first name.
Frame A with the name "Siddharth" on line 1. Rule: if "Hey " plus the name does not fit one line at 34pt, both greeting lines drop to h1 31/36. Never truncate the name, never wrap line 1.

B. New user, nothing saved anywhere. Already approved, keep as is. Confirm the name rule: if the account has a first name, line 1 is "Hey " plus the name in lavender exactly as Frame A, otherwise "Hey there".

C. Composer focused, keyboard open. Already approved, keep as is.

E. Text typed, keyboard dismissed.
Full Frame A layout with the composer holding two lines of typed text "Haan dekha, bas thoda busy tha. Saturday chai still on?" in #F8FAFC, send button enabled (white with lavender shadow). Composer height grows with the text up to four lines, then scrolls inside.

F. Screenshot attached.
Full Frame A layout. Inside the composer above the toolbar: a 56pt rounded thumbnail (radius 10) of a chat screenshot with a 20pt remove control at its top right corner (dark circle, white x). Placeholder changes to "Add a note (optional)". Send enabled. If text is also typed, both show. Removing the thumbnail returns the composer to its empty state and disables send unless text remains.

G. Out of free reads.
Frame A with the chip reading "Back tomorrow, or go Pro" in the same amber chip, and the subline replaced by amber text #D9A96E: "You've used today's 10 reads. Back at midnight, or go Pro now." The composer stays fully usable so the user can prepare the text. Send is enabled and opens the existing paywall sheet, do not design the sheet.

H. Pro user.
Frame A with the chip reading "Pro" in lavender tint fill rgba(167,139,250,0.14), border rgba(167,139,250,0.30), text #C4B5FD. Nothing else changes.

I. Toasts, shown on Frame A, one frame each or stacked as a strip beneath the screens:
- Paste tapped with an empty clipboard: clipboard icon, "Nothing to paste yet. Copy their message first."
- Screenshot over 6MB or unreadable: image icon in #D6A6B0, text "That screenshot is too big. Try one under 6MB." in #E5E7EB.
- Send failed, no connection: cloud-offline icon in #D6A6B0, "Couldn't reach Lovli. Check your connection and try again." A "Retry" link in #C4B5FD at the right end of the toast.

J. Person picker sheet (opened from the card, "Someone else", or a name pill).
Bottom sheet over Frame A with a scrim rgba(5,5,9,0.55). Sheet: fill rgba(17,18,28,0.96), top radius 24, grab handle, 16pt padding. Title h2 "Who are we texting?". List rows 60pt: 36pt gradient avatar, name in bodySemibold #F8FAFC, last time line in small #A1A1AA or "No story yet" if none, selected row has a lavender check at the right. Top row is the currently selected person. After the people: a row with a lavender tint circle and a plus icon, "Someone new", and a row with a plain circle and a dash free label "No one in particular". Max five rows visible, then the list scrolls. Rows are 44pt minimum tap targets.

RULES THAT STILL APPLY
- No em dashes, en dashes or spaced hyphens anywhere. The middle dot in the person card is the only separator.
- No sparkle, star or glitter glyph anywhere, including the tab bar.
- The word "AI" does not appear.
- Lovli speaks in first person. Never a concierge.
- Every tap target at least 44pt. Body contrast at least 4.5:1.
- Nothing scrolls on the home screen except the composer text and the picker sheet list.

DELIVERABLES
One board. Row 1: A (locked, for reference), A1, A2, A3. Row 2: B, C, E, F. Row 3: G, H, J. Row 4: the three toasts as a strip. All screens iPhone 16 at 393 by 852 with the corrected tab bar. Under the board, a short state table: state name, the condition that triggers it, which element differs from Frame A.
