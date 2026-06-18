# Lovli Mobile — Design Handoff v2 ("Calm Conversation Studio")

Source of truth: `design/lovli-mobile-design-board-v2.html` (open in a browser — the motion previews are live; import to Figma via html.to.design).
Supersedes `MOBILE_DESIGN_HANDOFF.md` (v1) for visual/motion decisions. Product constants, API surface, and banned vocabulary remain governed by `docs/PROJECT_OVERVIEW.md` and `docs/API_CONTRACT.md`.

---

## 1. Concept contract

The chat is the object; Lovli is the lighting. Per screen: stage (radial-washed background) → one focal surface → quiet rail of controls → fixed white CTA. **Rule of one:** one bordered focal container per region; group everything else with spacing. Depth comes from surface lightness + 1px top highlights + one focused shadow, not borders.

## 2. v2 tokens (delta from v1)

| Token | Value | Note |
|---|---|---|
| Stage wash | radial lavender 7.5% at 24%/-6% + sky 3.5% at 110%/14% | one per screen, never a visible blob |
| Surface | `#11121C` + `inset 0 1px 0 rgba(248,250,252,.05)` | standard raised layer |
| Float | `#171827` + highlight 6% + `0 24px 48px -20px rgba(0,0,0,.55)` | focal objects only |
| Hairline | `rgba(248,250,252,.07)` | replaces most borders |
| Hero type | 28/600 Space Grotesk, -0.018em | emotional moments only |
| Body | 15/400 Figtree, 1.55 | up from 14 |
| Reply text | 17–18/400, 1.6 | lead card 18 |
| Caps labels | tone labels only | all other eyebrows removed |
| CTA | white pill 52px, glow `0 14px 36px rgba(167,139,250,.24)`, press scale .97 | brightest object on screen |
| Radius | 14 rows · 16–18 cards · 20–24 canvas · 26 sheet · 999 pills | |

## 3. Screen inventory (board → app)

| Board | Screen | Key v2 changes |
|---|---|---|
| R1 | Reply first-run | 28px hero, chat canvas w/ Screenshot·Paste moderail, example link in-canvas, example reply card, fixed CTA zone w/ usage+privacy metadata line |
| R2 | Reply + screenshot | screenshot as floating object (148×196, shadow, ✕ chip, "never stored" overlay), customize row lavender-tinted when memory active |
| R3 | Reply + paste | pasted text renders as chat bubbles (their msg left dark, your context right outlined), not a textarea |
| R4 | Customize sheet | platform = segmented, vibes = chips, memory selector row, quick note, Done |
| R5 | Generating | screenshot dims + glow pulse, 3 breathing dots, 3-phase microcopy |
| R6 | Results | context bar (back · platform·lang·vibe · usage), lead reply card (18px text, lavender hairline, full-width Copy pill, regenerate as text), cards 2–3 compact |
| R7 | Copy success | pill morphs to Copied (1.8s), toast "Copied. Go send it.", memory nudge slides in below copied card (once/session), other cards dim |
| R8 | Limit reached | full-screen: "That's 8 for today." / resets at midnight / Get Early Access + Back to Reply |
| O1–O6 | Splash, onboarding ×3, login, signup | O2 = animated chat→replies morph + "Copy. Send. Done. · Made for Indian chats · Private by design"; selection rows instead of chips; auth = centered hero + grouped-list inputs |
| M1–M4 | Memory empty/list/add/selector | journal notes: nickname title + inline soft labels in prose + hairlines; ghost EXAMPLE note in empty state; add/edit = grouped sections w/ pinned Save; selector = sheet rows with "N details saved" |
| P1–P3 | Pro, submitted, settings | Pro = unlock narrative (4 icon rows + hairlines, "Free stays free" line, fixed CTA); submitted = "You're on the list."; settings = iOS grouped lists |

States: error banner, offline, toast in T2; regenerate confirm pattern carried from v1 (styled inline, never default alert).

## 4. Motion spec (binding — see board Page 7 for live previews)

Tokens: instant 120 · quick 180 · standard 240 · gentle 320 · ease `cubic-bezier(.2,.8,.2,1)` · exits ease-in · springs only sheet + CTA press.

| Animation | Trigger | Spec | Implement | Haptic |
|---|---|---|---|---|
| Reply card reveal | results push | 8px fade-up, 80ms stagger, 320ms | Moti, delay=index*80 | success notif on settle |
| Copy morph | copy tap | white→lavender-tint 180ms, hold 1.8s, toast rises | Reanimated interpolate + expo-clipboard | light impact |
| Thinking | generate | dots breathe 1.6s; 3 microcopy phases crossfade 240ms | Moti loop | none |
| Sheet | customize tap | spring up, backdrop→60% | @gorhom/bottom-sheet, snap 70% | selection on snap |
| Screenshot drop-in | picker resolve | scale 1.05→1 + settle, 320ms | Moti | light impact |
| CTA press | press in/out | scale .97, glow +10%, 120/180ms | Pressable+Reanimated | none |
| Onboarding morph | O2 mount | bubble 320ms → replies stagger → tagline; total ≈2.2s then static | Moti sequence | none |
| Nav | tab change | cross-fade 180ms + indicator glide | Reanimated layout | none |
| Screens | reply↔results, settings | native push/pop 280ms, state preserved | Expo Router defaults | — |

Rule: never two simultaneous large movements; content settles before accents animate.

## 5. Build order

1. **Theme + primitives:** tokens → Screen shell, CTA, GhostButton, Segmented, Chip, Surface/Float, Header, BottomNav, Toast.
2. **Money path R1→R8** end-to-end with API wiring, haptics, clipboard.
3. **O1–O6**, then **M1–M4**, then **P1–P3**, then states polish.

**Ship static first:** O2 morph, tab cross-fade. **Must animate in v1:** card stagger, copy morph, thinking phases, sheet, CTA press, screenshot drop-in.

## 6. Do not build

Notifications, reminders, streaks, gamification, scores/rankings of any kind, extra reply-card actions, pricing/“Most Popular”/comparison tables, human-coach language, real delete-account logic, heavy blur on scrolling lists.

## 7. Open risks

- Segmented control at 360px with "Hindi + English" — test truncation; fall back to shorter middle label width or scrollable rail.
- Paste mode + keyboard vs fixed CTA — KeyboardAvoidingView; CTA docks above keyboard.
- Nav backdrop-blur perf on low-end Android — fall back to solid `rgba(13,14,22,.95)`.
- Memory prose layout with long values — clamp at 3 lines per label group, expand on tap.
