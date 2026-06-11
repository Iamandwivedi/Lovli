# Lovli Mobile — Design Specification

> **For:** any design / frontend agent picking up the Lovli mobile app.
> **Source of truth:** this file + the live UI under `/app/frontend/`. If anything below conflicts with the code, the code wins — update this file in the same PR.
> **Last updated:** Feb 2026 — Lovli mobile MVP (Expo SDK 54, expo-router 6, React Native 0.81).

---

## 0. TL;DR — what Lovli looks and feels like

Lovli is an **AI dating coach for Indian chats**. The mobile app must feel:

- premium · minimal · dark · emotionally warm · private · trustworthy
- Apple-like in clarity · mobile-first · easy to use
- **not** flashy · **not** childish · **not** like a cheap dating app · **not** like a generic AI dashboard

The whole product reduces to one promise:

> *"Upload the chat, choose language, and get 3 natural replies."*

Everything in this spec serves that promise. If a design choice doesn't help that core flow feel calm, fast, and private — cut it.

---

## 1. Brand identity

### 1.1 Logo / mark

Temporary mark only — final logo will be provided later. Do **not** redesign it.

- Component: `src/components/LovliLogo.tsx`
- Mark = rounded square (radius `size * 0.32`) filled with `colors.violet` (#8B5CF6), with an Ionicons `sparkles` glyph at `size * 0.5` in pure white centered inside, plus a soft lavender glow halo behind it (`colors.lavenderGlow`).
- Wordmark "Lovli" sits to the right of the mark in `font-weight: 700`, letter-spacing `-0.4`, font-size scales to `max(18, size * 0.55)`.
- Default size on app header = 28px. On Login/Signup hero = 36px. On Splash = 56px.

When the final logo arrives, replace the SVG/View composition inside `LovliLogo.tsx` only — do not touch any screen.

### 1.2 Voice and tone (copy)

Lovli sounds like a quietly confident friend who's seen a thousand chats. Every label, button, toast, and helper line should pass these checks:

- Plain English (or Hinglish where appropriate). No "leverage", "powered by AI", "next-gen".
- Calm. Never urgent, never aggressive.
- Private-by-default. Reassuring, not surveillance-y.
- Direct. Verbs > nouns. "Generate replies", not "Reply Generation".

#### ✅ Words / phrases we use
- "Stuck on what to reply?"
- "Upload the chat, choose language, and get 3 natural replies."
- "Only upload chats you're comfortable sharing."
- "Your chats stay yours."
- "Private by default. You control what gets saved."
- "Save the little things they mention so future replies feel more thoughtful."
- "Copied. Go send it."
- "Something went wrong. Try again."
- "Upload a screenshot or paste the chat first."

#### ❌ Words / phrases we never use
- **Surveillance-flavoured:** track, stalk, crush profile, behaviour score, analyze her/his psychology, surveillance
- **Manipulation-flavoured:** make them fall for you, win them over, attractiveness hacks, optimize attraction, pickup
- **Hype:** revolutionary, unlock, supercharge, AI-powered, game-changing, world-class
- **Dating-app-cliché:** matches, swipes, chemistry score, vibe meter
- **Coach-ish:** Real Indian Wingman, human coach, 1:1 guidance, dating expert, manual support, wingman

### 1.3 Reply tone labels (the only place we name vibes to the user)

The Reply screen lets the user pick a **vibe** (input) but shows a **tone label** (output). The mapping lives in `app/(tabs)/reply.tsx`:

| Vibe (input) | Tone label (shown on the reply card) |
|---|---|
| Playful | PLAYFUL |
| Flirty | SMOOTH *(softened on purpose — "Flirty" sounds cheaper than what we ship)* |
| Sincere | SINCERE |
| Respectful | RESPECTFUL |
| Confident | CONFIDENT |
| *(fallback)* | WARM |

If you add a new vibe, add a new tone label too. **Never** show "Option 1 / 2 / 3" on the reply cards.

---

## 2. Color system

All tokens live in **`src/theme/colors.ts`** as a single `colors` object. Never hard-code hex values in screens — import from the theme.

### 2.1 Surfaces (dark stack)
| Token | Hex | Use |
|---|---|---|
| `colors.bg` | `#050509` | Root app background. Static rows inside settings. |
| `colors.midnight` | `#090A14` | Modal sheets, dropdowns. |
| `colors.card` | `#11121C` | Default card background, chip background (unselected), input background. |
| `colors.cardGlass` | `#171827` | Glass card (the one used on Login / Onboarding / Pro waitlist). |
| `colors.cardElevated` | `#1B1C2A` | Reply result cards, lifted surfaces. |
| `colors.border` | `#2A2B3A` | Every default 1px border. |
| `colors.borderStrong` | `#383A4D` | Hover/elevated border. |

Backgrounds are **always solid**, never gradients. Gradients muddy the dark palette.

### 2.2 Accents (use sparingly)
| Token | Hex | Use |
|---|---|---|
| `colors.lavender` | `#A78BFA` | Selected chip border, focus border, lavender glow, small accent icons, active tab tint, tone-dot. |
| `colors.lavenderSoft` | `#C4B5FD` | Tone label text on reply cards. Field labels inside memory cards. |
| `colors.violet` | `#8B5CF6` | Lovli mark fill only. |
| `colors.sky` | `#38BDF8` | Reserved — not used yet. Keep for future status badges. |
| `colors.blue` | `#60A5FA` | Reserved — not used yet. |

**Hard rule:** the UI must never feel "too purple" or "too blue". Accents = small icons, selected chip borders, focus glow, tone dots, the Pro card border. Everything else stays in greys.

### 2.3 Text
| Token | Hex | Use |
|---|---|---|
| `colors.text` | `#F8FAFC` | Headings, body text on cards, primary value text. |
| `colors.textSoft` | `#E5E7EB` | Section titles, secondary buttons, settings static values. |
| `colors.textMuted` | `#A1A1AA` | Subtitles, helper lines, usage text, "or" divider, legal line. |
| `colors.textFaint` | `#71717A` | Input placeholders. |

### 2.4 State
| Token | Hex | Use |
|---|---|---|
| `colors.danger` | `#F87171` | Reserved. |
| `colors.dangerSoft` | `#FCA5A5` | Delete button text + border (`memory-delete-*`). |
| `colors.success` | `#86EFAC` | Reserved. |

### 2.5 Glow / overlays
| Token | Value | Use |
|---|---|---|
| `colors.lavenderGlow` | `rgba(167, 139, 250, 0.25)` | Lovli mark glow halo. |
| `colors.lavenderGlowSoft` | `rgba(167, 139, 250, 0.12)` | Selected chip background fill. |
| `colors.scrim` | `rgba(0, 0, 0, 0.55)` | Modal backdrop. |

---

## 3. Spacing

Single 8-pt grid, exposed as `space` in `src/theme/colors.ts`:

```
xs   4
s    8
m    12
l    16
xl   24
xxl  32
xxxl 48
```

**Rules**
- Default screen horizontal padding = `space.l` (16).
- Default gap between unrelated cards / sections = `space.l` (16).
- Inside a card, gap between rows = `space.m` (12). Gap between a label and its input = 6.
- Section title → content gap = `space.m` (12) or `space.l` (16) for screen-level sections.
- Headline → subtext gap = 6.
- Bottom safe-area buffer on tab screens = `TAB_BAR_SPACE = 132` (defined in `src/components/Screen.tsx`). Do not lower this — the floating tab bar will hijack taps on primary CTAs.

If a layout feels cramped, increase by 8, not by 4. We deliberately use 2-3× more whitespace than feels comfortable on light dashboards.

---

## 4. Radii

| Token | Value | Use |
|---|---|---|
| `radii.sm` | 10 | Small static value rows in Settings. |
| `radii.md` | 14 | Inputs, memory option rows. |
| `radii.lg` | 18 | Upload dashed area, preview image. |
| `radii.xl` | 22 | Glass cards, plan cards, reply result cards, modal sheet (top corners). |
| `radii.pill` | 999 | Buttons, chips, usage pills, tone dot, modal handle. |

Cards = `radii.xl`. Buttons & chips = `radii.pill`. Inputs = `radii.md`. Never use `radii.sm` on a card.

---

## 5. Typography

Default system font for now. Hierarchy is built with size + weight, **not** with extra families. Sizes live in `fontSize` in `src/theme/colors.ts` but most type is declared inline because it follows a screen-specific scale.

### 5.1 Hierarchy

| Role | Size | Weight | Letter-spacing | Color | Example |
|---|---|---|---|---|---|
| Screen H1 | 26 | 700 | -0.5 | `text` | "Stuck on what to reply?", "Lovli Pro", "Lovli Memory" |
| Card H1 (auth) | 24 | 700 | -0.4 | `text` | "Welcome back", "Create your account" |
| Section H1 | 22 | 700 | -0.3 | `text` | "Choose a reply", "A few quick basics" |
| Card title | 17 | 600 | -0.2 | `text` | "Upload chat screenshot", "Customize reply", "Account", "Preferences" |
| Sub-section label | 13 | 600 | — | `textSoft` | "Platform", "Vibe", inside Customize / Memory |
| Field label | 14 | 500 | — | `textSoft` | "Email", "Password", "Nickname" |
| Body | 14 | 400 | — | `text` / `textSoft` | Card body, settings static values |
| Reply text | 17 | 400 | line-height 26 | `text` | The actual reply on a result card — always the heaviest text on the card |
| Sub / muted | 14 | 400 | line-height 20 | `textMuted` | Subtitles, helpers |
| Helper | 11.5 | 400 | line-height 16 | `textMuted` | "Used as your default. You can…" |
| Pill / chip | 14 | 500 → 600 selected | — | `textSoft` → `text` selected | All chips |
| Tone label | 11 | 600 | 1.2 (`textTransform: uppercase`) | `lavenderSoft` | "PLAYFUL", "SMOOTH", etc. |
| Legal / micro | 11 | 400 | — | `textMuted` | Terms & Privacy line |

### 5.2 Type rules
- Headings always use negative letter-spacing for a tighter, more premium feel.
- Tone labels are the **only** place we use uppercase + wide letter-spacing.
- Helper / privacy lines stay at 11–11.5px with `colors.textMuted`. Never bigger — that's how "calm" reads.
- Reply text uses `lineHeight: 26` on a `fontSize: 17` — explicitly generous so a 3-line reply still breathes.
- Don't introduce a second font family. Don't load Inter / Roboto / SF / Satoshi etc. The whole identity is in the palette + spacing + motion.

---

## 6. Components (all live in `src/components/`)

Every reusable piece is a thin, named component. Screens **compose**, they don't restyle.

### 6.1 `PrimaryButton` — `src/components/PrimaryButton.tsx`
The white pill. **Only** for the main action on a screen.

- Background `#FFFFFF`. Text `colors.bg` (`#050509`), weight 700, size 15.
- Height 52, radius `radii.pill`, horizontal padding 22.
- Outer "glow" View at `top/left/right/bottom: -6` with `rgba(255,255,255,0.05)` — the subtle premium halo (no purple).
- Pressed = `scale(0.985)` + 0.92 opacity. Disabled = 0.5 opacity.
- Loading state shows a small `ActivityIndicator` in `colors.bg` and replaces the label.

Where it's used:
- Login `Sign in`, Signup `Create account`
- Onboarding `Continue`
- Reply `Generate replies` (loading label: `Generating replies…`)
- Pro `Get Early Access`
- Memory `Save Memory` / `Save changes`
- Settings `Save changes`
- Memory list `Add Memory`

There is **at most one** primary button visible per screen.

### 6.2 `SecondaryButton` — `src/components/SecondaryButton.tsx`
Dark glass alternative. Three variants:
- `secondary` (default): `colors.card` bg, `colors.border` 1px border, `colors.text` label.
- `ghost`: transparent bg, transparent border (used for "Cancel" and "Log out").
- `danger`: `rgba(248,113,113,0.08)` bg, `rgba(248,113,113,0.25)` border, `colors.dangerSoft` label.

Min height 48, `radii.pill`. Supports `iconLeft` and `iconRight` (Ionicons, 16px).

### 6.3 `Chip` — `src/components/Chip.tsx`
The most used selection control. Two sizes: `md` (default, min-height 38) and `sm` (min-height 32).

- **Unselected:** `colors.card` bg, `colors.border` 1px border, `colors.textSoft` label at weight 500.
- **Selected:** `rgba(167, 139, 250, 0.12)` bg, `colors.lavender` 1px border, `colors.text` label at weight 600, lavender shadow glow `shadowOpacity: 0.45, shadowRadius: 10`.
- Pressed = scale(0.98) + 0.85 opacity. No haptics yet (add `expo-haptics` `Selection` if we ever do).
- Never use a heavy gradient fill. Lavender is the border + glow, the fill stays subtle.

Used for: reply language, platform, vibe, memory relationship stage, settings preferences, pro early-access reason. **Always wrap chip rows in a `flexWrap: "wrap"` container with `gap: 8`**.

### 6.4 `Input` — `src/components/Input.tsx`
Dark inset input.

- Background `colors.card`, 1px `colors.border`, radius `radii.md`, horizontal padding `space.l`, vertical padding 14, min-height 48.
- Text `colors.text` size 15. Placeholder `colors.textFaint`. Cursor & selection = `colors.lavender`.
- Focused state adds `colors.lavender` border and a soft lavender shadow (`shadowOpacity: 0.4, shadowRadius: 8`).
- `multiline` variant: min-height 96, `textAlignVertical: "top"`, top padding `space.m`.
- Optional `label` (above) and `helper` (below) — both small, muted.

**Never** use a thick outline, never use a 2px border, never put icons inside the input.

### 6.5 `GlassCard` — `src/components/GlassCard.tsx`
The default container.

- `variant="glass"` (default): `colors.cardGlass` bg, `colors.border` border.
- `variant="solid"`: `colors.card` bg, `colors.border` border.
- `variant="elevated"`: `colors.cardElevated` bg, `colors.borderStrong` border.
- 1px border, `radii.xl`, padding `space.l` when `padded`.
- Shadow `{0, 12, 22, 0.35}` — sits the card slightly off the background but never glows.

Use `glass` for hero cards (Login form, Onboarding card, Memory items). Use `solid` for in-screen blocks (Upload card, Customize card, Settings sections, Add-memory sections). Use `elevated` only for individual reply results.

### 6.6 `Screen` — `src/components/Screen.tsx`
Page wrapper. Handles SafeArea, vertical scroll, refresh control, keyboard avoiding, and the bottom-tab buffer.

Props that matter:
- `scroll` (default `true`): wraps content in a ScrollView.
- `refreshing` / `onRefresh`: shows pull-to-refresh with lavender tint.
- `bottomTabSpacing`: pass `true` on any screen inside `(tabs)` so the content scrolls above the floating tab bar (`TAB_BAR_SPACE = 132`).
- `keyboardAvoiding` (default `true`): wraps in `KeyboardAvoidingView` with `behavior: "padding"` on iOS.

**Every screen** in this app uses `<Screen>` as its outer element. Do not roll your own.

### 6.7 `AppHeader` — `src/components/AppHeader.tsx`
The top row on every tab screen. Lovli mark + name on the left, a circular gear icon on the right that opens `/settings`. The gear lives in a 40×40 round button with `colors.card` bg and `colors.border` border.

**Settings is reached from this gear, never from the bottom tab bar.**

### 6.8 `LovliLogo` — `src/components/LovliLogo.tsx`
See §1.1 above.

### 6.9 `ToastContext` — `src/context/ToastContext.tsx`
Single toast at the bottom of the screen. Pill-shaped, dark glass, `colors.cardGlass` with `colors.border`. Animated fade + 20px slide-up, lives for 2.8 s (long enough to read, short enough to feel calm).

Toast kinds:
- `default` — neutral border.
- `success` — lavender-tinted border (used for "Copied. Go send it.", "Memory saved.", "Settings saved.").
- `error` — soft red border (used for validation and network failures).

**Always** call `useToast()` from screens — never use `Alert.alert` for normal feedback. `Alert.alert` is only kept for the native Memory-delete confirm; on web it falls back to `window.confirm`.

---

## 7. Screen-by-screen UI specs

For each screen we list: route file, hero, layout order, key testIDs, and any rules unique to that screen.

### 7.1 Splash — `app/index.tsx`
- Dark `colors.bg` background.
- `LovliLogo size={56}` centered.
- `ActivityIndicator` in `colors.lavender` 24px below the logo.
- Redirects automatically: unauthed → `/login`; authed without preferred platform / onboarding → `/onboarding`; otherwise → `/(tabs)/reply`.
- No flashy entrance. No animated logo. testID: `splash-screen`.

### 7.2 Login — `app/login.tsx`
Order top to bottom:
1. `LovliLogo size={36}` row (mark + "Lovli").
2. `GlassCard` containing:
   - H1 "Welcome back" (24/700, -0.4).
   - Sub "Sign in to keep your generations and memory cards." (`textMuted`, lh 20).
   - Privacy cue: lock icon 12px lavender + "Your chats stay yours." (11.5px muted).
   - Email input → Password input → `Sign in` PrimaryButton.
   - Divider with `OR` (11px 1.6-letter-spaced muted) between two `colors.border` 1px lines.
   - `Continue with Google` SecondaryButton with Google glyph (16). **Disabled until mobile OAuth client is provisioned** — when disabled, a tap shows toast "Google sign in is coming soon."
   - Bottom row: "New to Lovli? " (muted) + "Create an account" (underlined, links to `/signup`).
3. Legal line below the card: "By continuing you agree to our [Terms] and [Privacy]." — 11px, muted.

### 7.3 Signup — `app/signup.tsx`
Same shell as Login. Inside the card:
- H1 "Create your account".
- Sub "A clean place to keep your replies and memory cards."
- Name → Email → Password → `Create account` PrimaryButton.
- Bottom row: "Already have an account? Sign in".

### 7.4 Onboarding — `app/onboarding.tsx`
- Hero card has: H1 "A few quick basics", sub "Helps Lovli start with your defaults. You can change these anytime."
- Two chip groups:
  1. "Where do you mostly chat?" — Instagram / Dating platform / WhatsApp.
  2. "Default reply language" — English / Hinglish / Hindi + English mixed.
- Helper under the chips: "Language is only a default. You can change it every time you generate."
- Primary `Continue` + ghost `Skip for now` below the card.
- **Never** ask for preferred reply style here. The user picks vibe per message.

### 7.5 Reply (the most important screen) — `app/(tabs)/reply.tsx`
Must read at a glance as **Upload → Choose language → Generate**. Order:

1. `AppHeader` (Lovli mark left, gear right).
2. H1 "Stuck on what to reply?" + sub "Upload the chat, choose language, and get 3 natural replies."
3. **Upload card** (`GlassCard` solid):
   - Card title "Upload chat screenshot" + sub "Instagram, Dating platform, or WhatsApp".
   - Dashed border area, min-height 160, with: 48×48 lavender-tinted round icon (cloud-upload, 26px lavender), title "Tap to browse" (15/600), hint "JPG, PNG, or WEBP" (12 muted).
   - When an image is selected: 220-tall preview with rounded corners and a circular `×` close button top-right (30×30, dark scrim bg, `colors.border` border).
   - Privacy line at the bottom of the card: shield icon + "Only upload chats you're comfortable sharing."
4. Manual paste `Input` (multiline, label "Or paste the chat", placeholder "Paste the chat or explain the situation…"). Default height 96.
5. **Reply language** — section label + chip row (Hinglish selected by default for Indian users).
6. **Customize reply** (collapsed by default) `GlassCard` solid:
   - Pressable header with "Customize reply" title and one-line summary "Instagram • Playful • No memory". Chevron rotates.
   - When expanded: Platform chips, Vibe chips, "Personalize with memory" selector (opens a bottom-sheet modal listing the user's memory cards + a "None" option).
   - Memory feels **optional**, not required. Default = "None".
7. **Usage / privacy row** — two pills side by side:
   - Left: "0 of 8 used today" with a 6px dot (lavender if `plan === "pro"`, otherwise muted). When `plan === "pro"`, the pill reads "Pro — unlimited".
   - Right: lock icon + "Private".
8. **`Generate replies`** PrimaryButton. Loading label: "Generating replies…".

After generation, append below the button:
- H2 "Choose a reply" + sub "Edit it if you want. Make it yours."
- 3 **Reply result cards** (`elevated` variant), stacked with `space.l` gap, each animated in with a fade + 10-px slide-up, staggered by `80 ms × index`.

Each reply card contains, in order:
- Tone row: 6px lavender dot with lavender glow + tone label (uppercase, lavender-soft).
- Reply text (17/26lh, `colors.text`).
- Actions row (wrap):
  - **Copy** = white pill (`#FFFFFF` bg, `colors.bg` text, weight 700, size 13). Icon `copy-outline` 14px. Becomes `checkmark-circle` + "Copied" for ~1.8 s after press. Also fires `POST /feedback` with `generation_id` + `copied_reply_index`.
  - **Regenerate** = dark pill (`colors.card`, `colors.border`), icon `refresh` 14px, label "Regenerate". Disabled while generating.

**Hard rules on the reply card**
- Only two actions: Copy and Regenerate. Never add Shorter / More flirty / More Hinglish / Save / Share / Score / Rate / Rewrite.
- Never label cards "Option 1 / 2 / 3" — always tone labels.
- Cards must never sit under the floating tab bar. The Screen has `bottomTabSpacing` → `TAB_BAR_SPACE: 132` of bottom padding.

**Validation:** if both image and manual text are empty when Generate is tapped → error toast "Upload a screenshot or paste the chat first."

**Generate loading state:** while waiting, show a centered `ActivityIndicator` (lavender) with sub "Lovli is reading the vibe…" below the Generate button. Prevent duplicate taps.

### 7.6 Pro — `app/(tabs)/pro.tsx`
- `AppHeader`.
- H1 "Lovli Pro" + a "Coming soon" pill (lavender-tinted, 10.5/600, 0.6 letter-spacing, uppercase).
- Headline-sub "More replies. Smarter personalization."
- Long sub "For users who want unlimited generations, better memory, and early access to new AI features."
- **Two plan cards** stacked with `space.m` gap:
  - **Free** — `colors.card` bg, `colors.border` border. Tagline "For trying Lovli."
    - 8 generations/day · 3 replies each time · Basic vibes · Standard memory
  - **Pro** — same shape but with a lavender accent: `colors.lavender` border + `rgba(167,139,250,0.06)` bg + soft lavender shadow. Tagline "For users who want more."
    - Unlimited generations · Advanced memory · More reply styles · Early access to new AI features
    - A small "Coming soon" pill on the right of the title.
  - Each feature is a row with a `checkmark` icon (14px) and 14/400 text in `colors.textSoft`.
- **Get Early Access form** (`GlassCard` solid):
  - Card title "Get Early Access" + sub "Tell us what you want most."
  - Email input.
  - Sub-section label "What do you want most from Pro?"
  - 5 reason chips: Unlimited replies / Advanced memory / More reply styles / Early AI features / Not sure yet.
  - `Get Early Access` PrimaryButton → `POST /waitlist { email, type: "pro", source, what_you_want }`.
  - After success: replace the form with a `pro-joined-block` showing "You're on the list ✦" and the line "We'll email you when Pro opens."

**Never** show: payments, Stripe, checkout, paid subscription activation, fake urgency, or a loud "Most popular" badge.

### 7.7 Memory list — `app/(tabs)/memory.tsx`
- `AppHeader`.
- H1 "Lovli Memory".
- Sub-headline "Remember meaningful details." (17/600).
- Sub "Save the little things they mention so future replies feel more thoughtful."
- Trust cue: shield icon + "Private by default. You control what gets saved." (11.5 muted).
- Primary `Add Memory` button.
- **Empty state** (`memory-empty`): "No memories yet" (17/700) + "Save the little things so future replies feel more thoughtful."
- Otherwise, a stacked list of memory cards.

#### Memory card layout (private journal feel — not a CRM)
A `GlassCard` (default glass) with:
1. Nickname (17/700).
2. Optional relationship-stage pill underneath the nickname (small, `colors.card` bg, `colors.border` border).
3. Optional current-situation line (14/20lh, `colors.textSoft`).
4. Only the **filled** labelled fields, in this order:
   - "Good to remember" → `likes`
   - "Things to avoid" → `dislikes`
   - "How they usually talk" → `communication_style`
   - "Inside jokes" → `inside_jokes`
   - "Important moments" → `important_dates`
   - "What feels right" → `best_approach`
   - "Your notes" → `notes`
   Each: lavender-soft uppercase 11/600 label, then 14/20lh `textSoft` value.
   **Never** render an empty labelled field.
5. Actions row at the bottom: `Edit` (dark pill, edit icon) and `Delete` (soft-red pill, trash icon). Delete is **clear but not aggressive**.

**Hard rules**
- No scores, no charts, no timeline analytics, no "match strength", no AI personality tracking.
- Never call this a "crush profile". Never say "track" / "analyze".
- Don't show empty section labels — hide what's empty.

Pull-to-refresh is enabled.

### 7.8 Memory Add / Edit — `app/memory/add.tsx` + `app/memory/[id].tsx` → both render `src/screens/MemoryForm.tsx`
- Top header row: back chevron · centered title ("Add Memory" / "Edit Memory") · empty spacer to balance.
- Sub: "Use nicknames, not real names. You can edit or delete this anytime."
- Three `GlassCard` solid sections, each with a 17/600 title and a `gap: space.m` of inputs:
  1. **Basic context** — Nickname (required), Current situation (multiline), Where you met, What do you want with this person?, Relationship stage chips (Not connected yet / Texting / Talking / Dating / Complicated).
  2. **Good to remember** — Good to remember, Things to avoid, How they usually talk, Inside jokes, Important moments. All multiline.
  3. **Your notes** — What feels right, Your notes. Both multiline.
- Bottom of screen: `Save Memory` (or `Save changes` on edit) PrimaryButton + ghost `Cancel` button.

**Validation:** Nickname required. If empty → toast "Add a nickname so you can find this memory later."

### 7.9 Settings — `app/settings.tsx`
Opened from the gear icon in `AppHeader`. **Never a bottom tab.**

- Top row: back chevron + centered "Settings" title + balance spacer.
- Sub "Manage your account, preferences, and privacy."
- **Account** card: Name input (synced from `user.name` via `useEffect` on `user?.id`), static Email row, static Login method row ("Email" / "Google" / etc.).
- **Preferences** card: Default language chip row + helper "Used as your default. You can still choose a different language before every generation."; Default platform chip row + helper "Used as your default. You can change platform on each reply."
- **Plan** card: static "Current plan" (Free / Pro), static "Daily usage" (e.g. "0 of 8 used today" or "Pro — unlimited generations"), `Get Early Access` SecondaryButton → routes to `/(tabs)/pro`.
- **Privacy** card: lock icon + "Private by design. You control what gets saved."
- Footer: `Save changes` PrimaryButton (calls `PATCH /settings`), `Log out` ghost button with `log-out-outline` icon (clears session, navigates to `/login`).

Static value rows use `colors.bg` bg + `colors.border` border + `radii.md` — they look like read-only inputs, which they are.

### 7.10 Privacy and trust cues (cross-screen)

Sprinkled deliberately, always small, always muted:

- Login: "Your chats stay yours."
- Reply (under upload): "Only upload chats you're comfortable sharing."
- Reply (right pill): "Private".
- Memory header: "Private by default. You control what gets saved."
- Memory form sub: "Use nicknames, not real names. You can edit or delete this anytime."
- Settings privacy card: "Private by design. You control what gets saved."

If we add a new screen, ask: *"Is there one place a small trust cue would calm the user down?"* Add one if yes.

---

## 8. Motion

Use motion sparingly. Goal = "feels alive, not flashy".

- **Reply card entrance** (`Animated.View` in `reply.tsx`): opacity 0→1 over 320ms, translateY 10→0 over 360ms, staggered by `80ms × index`.
- **Toast** (`ToastContext.tsx`): opacity 0→1 over 220ms + translateY 20→0 over 260ms on appear; reverse on dismiss (180ms / 200ms).
- **Button press** (Primary/Secondary): `transform: scale(0.985)` + 0.92 opacity.
- **Chip press**: `scale(0.98)` + 0.85 opacity.

**Never** add: bouncing springs, parallax, neon trails, confetti, lottie loaders.

If a future screen needs a transition (e.g. customize-reply expand/collapse), use `react-native-reanimated`'s `LayoutAnimation` with a soft easing curve. No layout jump on first paint.

---

## 9. Iconography

Single icon system: **Ionicons** from `@expo/vector-icons`. Outline variant by default, filled when "active".

Standard usage:

| Where | Icon | Size | Color |
|---|---|---|---|
| Reply tab (active / inactive) | `chatbubbles` / `chatbubbles-outline` | 22 | `lavender` / `textMuted` |
| Pro tab (active / inactive) | `sparkles` / `sparkles-outline` | 22 | same |
| Memory tab (active / inactive) | `bookmark` / `bookmark-outline` | 22 | same |
| Settings gear | `settings-outline` | 20 | `textSoft` |
| Upload area | `cloud-upload-outline` | 26 | `lavender` |
| Privacy cues | `lock-closed-outline` / `shield-checkmark-outline` | 12 | `lavender` |
| Memory delete | `trash-outline` | 14 | `dangerSoft` |
| Memory edit | `create-outline` | 14 | `textSoft` |
| Reply copy | `copy-outline` → `checkmark-circle` | 14 | `bg` (on white pill) |
| Reply regenerate | `refresh` | 14 | `textSoft` |
| Pro plan feature row | `checkmark` | 14 | `lavender` (Pro card) / `textSoft` (Free card) |
| Back button | `chevron-back` | 24 | `textSoft` |
| Chevron in collapsible | `chevron-down` / `chevron-up` | 20 | `textMuted` |
| Modal/picker right chevron | `chevron-forward` | 18 | `textMuted` |

**Hard rules**
- No emoji icons in UI (the only emoji we allow is `✦` in "You're on the list ✦").
- Consistent stroke (Ionicons default).
- Don't mix in Material / Feather / Lucide.
- Don't introduce custom SVG icons unless you also add them to this table.

---

## 10. Layout patterns

### 10.1 Touch targets
- Minimum 44×44 iOS / 48 Android. All primary buttons are 52 tall, chips are 38+, the gear icon is 40×40, tab buttons are full-height (~72).
- Use `hitSlop={10}` on the small icons (gear, back chevron, image remove).

### 10.2 Safe areas
- `<Screen>` already handles `useSafeAreaInsets()`. Don't add a second `SafeAreaView` on top of it.
- The bottom tab bar uses `Math.max(insets.bottom, 8)` so it never crashes into the iOS home indicator.

### 10.3 Keyboard
- `<Screen keyboardAvoiding>` is default-true and uses `KeyboardAvoidingView` with `behavior: "padding"` on iOS only.
- Inside `ScrollView` we set `keyboardShouldPersistTaps="handled"` so a tap on a chip while the keyboard is open dismisses the keyboard AND selects the chip.
- For multi-line inputs, ensure the input is reachable above the keyboard — don't put any tall content below them.

### 10.4 Bottom tab overlay
- The tab bar floats at `position: absolute, bottom: 0`. To prevent it from hijacking taps on bottom-edge CTAs:
  - **Use `<Screen bottomTabSpacing>` on every tab screen.** This adds `TAB_BAR_SPACE: 132` of bottom padding inside the scroll view.
  - Do **not** reduce `TAB_BAR_SPACE`. We tested 96 and the tab bar started intercepting clicks on `Generate replies` / `Save Memory` / `Log out`.

### 10.5 Modals / sheets
- We use a single bottom-sheet pattern (see Memory Picker inside `reply.tsx`):
  - Backdrop = `colors.scrim`.
  - Sheet = `colors.midnight` bg, top corners `22`, `colors.border` 1px top border, max-height `80%`.
  - 36×4 handle in `colors.border`, centered.
  - Title 17/700 + sub 12 muted.
- Tap outside the sheet (the backdrop `Pressable`) to close. Always provide an explicit `Close` SecondaryButton too.

### 10.6 Lists, refresh, scrolling
- All scrolls are vertical. Never use horizontal scroll for the main flow.
- Lists use pull-to-refresh with `<RefreshControl tintColor={colors.lavender} colors={[colors.lavender]} />` (already wired in `<Screen onRefresh>`).
- No infinite scroll — memory lists are small.

---

## 11. States

### 11.1 Loading
- Buttons: replace label with localized progress text (`Signing in…`, `Generating replies…`, `Saving…`, `Saving memory…`) and the small ActivityIndicator inside the button.
- Pages waiting for data (memory edit screen, settings on cold start): centered muted "Loading…" text — no spinner shadow.
- **Never** use a global blocking spinner. Per-button or per-section only.

### 11.2 Error
Always calm, always human. Approved phrases:
- "Something went wrong. Try again."
- "Upload a screenshot or paste the chat first."
- "This image is too large."
- "Session expired. Please sign in again."
- "You've used today's free generations."
- "Could not save right now. Try again."
- "Could not copy. Long-press to copy."
- "Could not load memory."

Errors surface as **toast** for transient issues, and as inline text in the form when relevant. Never as a modal alert.

### 11.3 Empty
- Memory: "No memories yet" / "Save the little things so future replies feel more thoughtful." / `Add Memory` button.
- Reply (pre-generation): the upload card + paste field doubles as the empty state. We don't show a separate "no replies yet" block.

### 11.4 Disabled
- 0.5 opacity, pointer events still register but `onPress` is short-circuited inside the component.
- Used for: Google sign-in (placeholder), Save buttons while saving, Regenerate while a request is in flight, Generate while limit is reached.

---

## 12. Form rules

- Labels always go **above** inputs. Helpers go **below**.
- Optional fields: don't label them "(optional)" — just don't require them. The first field of a section can be required (Nickname on Memory).
- Group long forms into 2–3 `GlassCard solid` sections, each titled. Never one giant card.
- Keyboard types: `email-address` on email, `default` everywhere else. Autocapitalize off for email/password, "words" for name/nickname.
- Don't auto-uppercase the first letter of multi-line free-text fields except `name`/`nickname`.

---

## 13. Accessibility

- All interactive components expose a `testID` (kebab-case, function-named, unique). The bottom tabs use `tabBarButtonTestID`, the gear uses `open-settings-button`, every chip uses `<group>-<value>` (e.g. `vibe-Playful`).
- All headings stay `<Text>` (not `accessibilityRole="header"`) for now — RN handles role inference.
- Color contrast: every body text is `#E5E7EB` or brighter on a `#11121C`–`#171827` surface (>= 11:1 contrast). Helpers / placeholders at `#A1A1AA`–`#71717A` stay AA only — that's intentional (calm). Never use `colors.textFaint` for actionable text.
- Tap targets ≥ 44×44.
- All toasts also render as `testID="toast-message"` so screen readers and automated tests can pick them up.

---

## 14. Cross-platform notes

- We target **iOS, Android, and web** (Expo Router renders web too — used by the preview tunnel and by the testing agent). Anything that's not a regular `View`/`Text`/`Pressable` must be tested in all three.
- `BlurView` is only used in the tab bar background on iOS; on Android we fall back to a solid `rgba(11,12,20,0.92)`.
- `Alert.alert` with multi-button is a no-op on react-native-web. For confirms (e.g. Memory delete) we branch on `Platform.OS === "web"` and use `window.confirm`.
- `expo-image-picker` permission flow: check `getMediaLibraryPermissionsAsync` first, then `requestMediaLibraryPermissionsAsync`. If denied and `canAskAgain === false`, show a toast pointing the user to Settings — don't dead-end.

---

## 15. What we deliberately don't ship

These are recurring temptations. Push back on them in code review.

- Photo ranking, attractiveness score, dating compatibility score, vibe meter, chat history analytics, AI personality tracking.
- Human coach / "wingman" framing.
- Payments (Stripe, RazorPay, Apple IAP). Pro is **waitlist only**.
- Notifications, reminders, "date ideas", AI bio glow-up tools.
- Extra reply rewrite buttons (Shorter / More flirty / More Hinglish / Save / Share / Score / Rate). The contract is **3 replies, Copy + Regenerate**.
- Admin dashboard, internal tools, charts.
- Onboarding step asking for "preferred reply style" — removed on purpose. Vibe is chosen per-message.

If a feature would push the app toward "AI dashboard" or "cheap dating app", drop it.

---

## 16. File map (where to change what)

```
app/
  _layout.tsx                  ← Providers (AuthProvider, ToastProvider, SafeAreaProvider) + Stack
  index.tsx                    ← Splash + routing decision
  login.tsx                    ← Sign in screen
  signup.tsx                   ← Create account
  onboarding.tsx               ← 2-question onboarding
  settings.tsx                 ← Settings (opened from header gear)
  memory/
    add.tsx                    ← Add Memory route
    [id].tsx                   ← Edit Memory route
  (tabs)/
    _layout.tsx                ← Bottom tab bar (Reply / Pro / Memory), gear is NOT here
    reply.tsx                  ← Main screen
    pro.tsx                    ← Pro waitlist
    memory.tsx                 ← Memory list

src/
  theme/colors.ts              ← All color tokens, space, radii, fontSize
  components/
    AppHeader.tsx              ← Top row with Lovli mark + gear
    Chip.tsx                   ← Selection chip
    GlassCard.tsx              ← Container (glass / solid / elevated)
    Input.tsx                  ← Dark inset input
    LovliLogo.tsx              ← Temporary brand mark
    PrimaryButton.tsx          ← White pill CTA
    SecondaryButton.tsx        ← Dark glass / ghost / danger
    Screen.tsx                 ← Page wrapper (safe area, scroll, kb, tab buffer)
  context/
    AuthContext.tsx            ← Token + user, login/signup/logout/refreshMe
    ToastContext.tsx           ← In-app toast
  screens/
    MemoryForm.tsx             ← Shared Add/Edit Memory form
  api/
    client.ts                  ← Axios instance + interceptors
    endpoints.ts               ← Typed endpoint methods
  utils/storage/               ← Provided helpers; we use secureSet/secureGet for the token
```

**Don't touch:**
- `metro.config.js` (only the `@/*` alias and Metro cache config — leave them).
- `frontend/.env` — `EXPO_PACKAGER_PROXY_URL` and `EXPO_PACKAGER_HOSTNAME` are protected. `EXPO_PUBLIC_BACKEND_URL=https://app.lovli.in` is set deliberately.
- `app/+html.tsx` — the web HTML wrapper.
- `backend/` — there is **no Lovli backend in this repo**. The mobile app calls `https://app.lovli.in/api` directly.

---

## 17. Adding a new screen (checklist)

1. Decide if it lives inside `(tabs)` or at the root. Bottom tabs are **fixed** at 3 — Reply, Pro, Memory. Anything else is at the root (e.g. `app/settings.tsx`, `app/memory/add.tsx`).
2. Wrap the screen with `<Screen testID="…-page">`. Pass `bottomTabSpacing` if it's inside `(tabs)`.
3. Start with `<AppHeader />` for tab screens, or a back-chevron header row for root screens (see `settings.tsx` for the pattern).
4. Use `colors`, `space`, `radii`, `fontSize` tokens — never hard-code colors / pixel values.
5. Compose with `GlassCard`, `Chip`, `Input`, `PrimaryButton`, `SecondaryButton`. Build new primitives only if you have 2+ uses.
6. Add a small privacy cue if it fits the screen.
7. Every interactive element gets a unique `testID` in kebab-case describing **what it does**, not what it looks like.
8. Add ToastContext for success / error feedback. Never `Alert.alert` for normal feedback.
9. If you add an API call, put the typed method in `src/api/endpoints.ts`. Never call `axios` directly from a screen.
10. Re-read §15 — confirm you're not shipping something we deliberately don't.

---

## 18. Reference numbers (cheat sheet for design reviews)

- Screen H-padding: **16**
- Card padding: **16**
- Section gap: **16**
- Within-card row gap: **12**
- Label → input gap: **6**
- Card radius: **22**
- Input radius: **14**
- Pill / chip radius: **999**
- Primary button height: **52**
- Secondary button min-height: **48**
- Chip min-height: **38** (md) / **32** (sm)
- Tab bar height: **64 + safe-area-inset-bottom**
- Bottom screen padding above tab bar: **132**
- Toast lifetime: **2.8 s** (220ms in / 200ms out)
- Reply card entrance: **320–360ms**, staggered **80ms × index**

When in doubt, multiply by 8.
