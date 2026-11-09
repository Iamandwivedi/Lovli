# Claude Design prompt: Reply home V4 (greeting hero + composer)

Paste everything below the line into Claude Design.

---

Design the Reply home of Lovli, an iOS app that reads a dating or relationship chat and writes three replies in the user's own voice, English or Hinglish. This is the screen a signed in user lands on. Dark mode only. iPhone 16 frame, 393 by 852 points.

WHAT THIS SCREEN DOES
It captures the conversation and nothing else. The user pastes their last text or attaches a screenshot, optionally types a note, and hits send. Everything else in the flow (how they feel, what they want, how it should land, reply language) happens on the next step, which already exists and is not part of this brief. Do not add tone, vibe, platform, language, feeling or situation controls to this screen.

REFERENCE FEEL
Two zone layout like modern assistant home screens: a tall soft gradient hero with a large personal greeting on top, then a dark glass utility zone with one card, small capture buttons and a composer at the bottom. Keep that structure but make it unmistakably Lovli: warm, a little cheeky, privacy forward. Not a generic AI assistant. No logo tile, no model name slot.

DESIGN SYSTEM (existing tokens, do not invent new ones)

Surfaces
- Screen gradient: #050509 at the top to #0A0918 at the bottom.
- Hero glow: radial lavender rgba(167,139,250,0.24) anchored top right, fading to transparent by about 45 percent of screen height. Nothing else lives in the hero besides the header and greeting.
- Glass card: fill rgba(17,18,28,0.86), 1pt border #262737, radius 20, padding 16.
- Raised glass (composer, icon buttons): fill rgba(255,255,255,0.10), 1pt border rgba(255,255,255,0.10). Composer radius 16.
- Pill radius 999.

Accent
- Lavender #A78BFA. Lavender text #C4B5FD. Deep violet #8B5CF6.
- Lavender tint fill rgba(167,139,250,0.14) with border rgba(167,139,250,0.30).
- Avatar gradient 135 degrees, #A78BFA to #8B5CF6.

Text
- Primary #F8FAFC, body #E5E7EB, muted #A1A1AA, faint #8A8A94 (placeholders and captions only), disabled #3F3F46.

Semantic
- Amber #D9A96E for the free credits chip. Pink #D6A6B0 is for warnings and is not used on this screen. Green #86C89D is not used on this screen.

Primary CTA
- White pill #FFFFFF, label #050509, shadow rgba(167,139,250,0.22). On this screen the send button is the only CTA. There is no separate Get replies pill.

Type (exact, no other fonts, no other sizes)
- Display: Bricolage Grotesque Bold. hero 34/39, h1 31/36, h2 SemiBold 22/26, h3 SemiBold 18/22. Letter spacing 0.
- Body: Outfit. large 16/24, base 15/22, small 13/18, label Medium 13/16, caption 12/16.

Brand
- The brand mark is the word "Lovli" set in Bricolage Grotesque Bold. No icon, no tile, no logo glyph. No sparkle, star or glitter glyph anywhere, in UI or in copy.

Spacing scale: 4, 8, 12, 16, 24, 32. Side margins 16.

LAYOUT, TOP TO BOTTOM

Frame A: returning user, person selected

1. Status bar.
2. Header row, 44pt tall.
   Left: "Lovli" wordmark, 22pt display, #F8FAFC.
   Right: amber chip then avatar. Chip: pill, fill rgba(217,169,110,0.14), border 1pt rgba(217,169,110,0.30), text #D9A96E, label style, reads "10 left today". Avatar: 34pt circle, gradient fill, white initial "A", opens Settings.
3. Hero greeting, 24pt below the header, left aligned, hero display style, two lines.
   Line 1: "Hey " in #F8FAFC followed by the first name "Aman" in #C4B5FD.
   Line 2: "What's going on?" in #F8FAFC.
   8pt below, one body base line in #A1A1AA: "Overthinking their last text? Paste it. I'll read it with you."
4. Person card, 24pt below the subline. Glass card, full width. This is the continuity strip and the person picker in one.
   Row: 36pt gradient avatar with initial "A", then two text lines: "Aanya" in h3 #F8FAFC, and "Last time: she asked about Saturday chai · 2 days ago" in small #A1A1AA, truncated with an ellipsis at one line. Chevron right in #8A8A94 at the far right.
   Tapping the card opens the existing person picker sheet. 8pt below the card, left aligned, a text link in label style #C4B5FD: "Someone else", which opens the same picker.
5. Composer, 16pt below. Raised glass container, radius 16, full width, min height 116pt.
   Top: multiline text field, two lines visible, text #F8FAFC body large, placeholder #8A8A94: "Paste their last text, or type what they said".
   Bottom toolbar inside the container, 44pt tall, 12pt inset.
   Left: two 40pt circular icon buttons 8pt apart, glass fill, 20pt line icons in #E5E7EB, with 44pt hit areas. First is Paste (clipboard icon), second is Screenshot (image icon). No camera. No microphone. No cloud upload icon.
   Right: 44pt circular send button. Disabled: fill rgba(255,255,255,0.10), arrow #3F3F46. Enabled: fill #FFFFFF, arrow #050509, shadow rgba(167,139,250,0.22). Enabled when the field has text or a screenshot is attached. This is the primary CTA.
   Attached screenshot state: a 56pt rounded thumbnail with a small remove control appears inside the composer above the toolbar, and the placeholder changes to "Add a note (optional)".
6. Privacy line, 12pt below the composer, caption style, centered on one line: 12pt lock line icon, "PRIVATE" in #A1A1AA with 0.6 letter spacing, two spaces, "Read once, never saved." in #8A8A94, one space, "How it works" in #C4B5FD.
7. Tab bar, glass, four tabs, Ionicons: Reply (chatbubble, active), Ask Lovli (chatbubble-ellipses-outline), Memory (heart-outline), More (grid-outline). Active icon and label #C4B5FD with a short lavender underline, inactive #8A8A94. Labels in caption style.

Fit rule: everything from the greeting to the privacy line fits above the tab bar at 852pt with no scrolling. If it does not fit, reduce the gap between header and greeting and the hero glow height. Never reduce the type sizes.

Frame B: new user, no person yet

- Greeting: "Hey there" on line 1 (use the first name in lavender if one exists, exactly as in A), "What's going on?" on line 2.
- Subline: "Paste a chat or try a sample. I'll read it with you."
- The person card is replaced by one suggestion card, glass, full width: h3 "Not sure yet? Start with a sample chat", below it in small #A1A1AA "See how I read a real convo before you share yours", chevron right. Tapping opens the existing sample flow.
- No "Someone else" link.
- Composer, privacy line and tab bar are identical to A. Chip reads "10 left today".

Frame C: composer focused, keyboard open, returning user

- The iOS keyboard covers the bottom 336pt. The tab bar is hidden behind it.
- The hero collapses. Header row stays. The greeting becomes one h2 line, "What's going on, Aman?", no subline, no glow.
- The person card collapses to a lavender tint pill, 32pt tall, left aligned, small avatar 20pt plus "Aanya" in label style #C4B5FD.
- The composer sits directly above the keyboard, expanded to four visible lines. The privacy line sits between the composer and the keyboard with an 8pt gap.
- Show the send button enabled with sample typed text in the field: "Haan dekha, bas thoda busy tha. Saturday chai still on?"

Frame D: chip states (swatches only, not a full screen)

- "10 left today" in amber as above.
- "Back tomorrow, or go Pro" in amber, same chip.
- "Pro" in lavender tint fill rgba(167,139,250,0.14), border rgba(167,139,250,0.30), text #C4B5FD.

INTERACTION NOTES
- Send goes to the existing next step (feeling, intent, outcome, language). Do not design that step.
- Paste reads the clipboard and drops the text into the field. Screenshot opens the photo picker. Both exist.
- Tapping the person card or "Someone else" opens the existing person picker sheet.
- Tapping "How it works" opens the existing privacy sheet.
- The screen does not scroll. The hero does not parallax.

COPY RULES (hard)
- No em dashes, en dashes or spaced hyphens anywhere. Use commas, colons or periods. The middle dot in the person card is the only separator allowed.
- No sparkle, star or glitter marks. The word "AI" does not appear.
- Lovli speaks in first person ("I'll read it with you"), warm and a little cheeky. Never a concierge: never "May I help you", never "How can I assist".
- Sentence case everywhere except the PRIVATE caption.

ACCESSIBILITY
- Every tap target at least 44pt by 44pt.
- Body text contrast at least 4.5:1 against the surface it sits on. #8A8A94 is used only for captions and placeholders.
- At larger Dynamic Type sizes the hero may wrap to three lines. Nothing else reflows.

DELIVERABLES
Three iPhone 16 screens at 393 by 852 labeled A, B and C, side by side, with the Frame D chip swatches beneath them. Use the exact hex values, font names and sizes above so the screens can be rebuilt from the app's theme tokens without guessing.
