# Lovli — Design & UI/UX Handoff

A single source of truth for any agent or designer continuing work on the Lovli web app.
This document captures every binding design decision made to date. Treat it as the spec.

> **Scope:** This applies ONLY to the Lovli web app under `app.lovli.in` (the React app in `/frontend`). The landing page at `lovli.in` is governed separately and is NOT covered here.

---

## 1. Brand & Positioning

**Product:** Lovli — an AI dating-chat reply coach for India.

**Voice & tone:**
- Premium, minimal, dark, emotionally warm.
- Apple-like in clarity.
- Functional, clean, easy to use.
- Trustworthy and private.

**Lovli is NOT:**
- A gaming app, crypto app, or generic AI dashboard.
- A surveillance / CRM / psychology tool (especially in Memory).
- A flashy or salesy product (especially in Pro).

**Forbidden vocabulary (banned in product copy):**
- Anything that implies tracking or manipulation: `track`, `analyze`, `psychology`, `behavior patterns`, `crush profile`, `optimize attraction`, `make them fall for you`, `score`, `surveillance`, `attraction hacks`.
- Sales/coach language in Pro: `wingman`, `real Indian wingman`, `human coach`, `dating expert`, `1:1 call`, `human guidance`, `manual support`, `most popular`.
- Robotic UI labels: `Option 1 / Option 2 / Option 3`.

---

## 2. Color Palette (binding)

All design values live as CSS variables in `/frontend/src/index.css` and Tailwind tokens under `lovli-*` in `/frontend/tailwind.config.js`. Never hard-code raw hex in components.

### Core dark
| Token | Hex | Use |
|---|---|---|
| `--lovli-bg` | `#050509` | Page background (darkest layer) |
| `--lovli-bg-deep` | `#090A14` | Secondary dark surface |
| `--lovli-card` | `#11121C` | Standard card / input background |
| `--lovli-card-2` | `#171827` | Glass card / modal / hero |
| `--lovli-border` | `#2A2B3A` | Default border |
| `--lovli-border-strong` | `#3A3B4D` | Hover/strong border |

### Accents
| Token | Hex | Use |
|---|---|---|
| `--lovli-lavender` | `#A78BFA` | Primary accent (selected, focus, active) |
| `--lovli-lavender-soft` | `#C4B5FD` | Light accent (decorative only) |
| `--lovli-violet` | `#8B5CF6` | Secondary accent (gradient stops only) |
| `--lovli-sky` | `#38BDF8` | Cool accent (decorative hero glow) |
| `--lovli-sky-soft` | `#60A5FA` | Light cool accent |

### Text
| Token | Hex | Use |
|---|---|---|
| `--lovli-text` | `#F8FAFC` | Main body and headings |
| `--lovli-text-soft` | `#E5E7EB` | Secondary content, labels |
| `--lovli-text-muted` | `#A1A1AA` | Helper text, meta info |
| `--lovli-text-faint` | `#71717A` | Placeholders, optional markers |

### Accent gradient (use SPARINGLY)
`linear-gradient(135deg, #A78BFA 0%, #8B5CF6 45%, #38BDF8 100%)`
**Allowed only for:** Hero radial washes (low opacity ≤16%), icon glow, decorative hairlines.
**Banned for:** Card fills, chip fills, button backgrounds, body text backgrounds.

### Color usage rules
- Lavender = the **only** primary accent for selected states, focus rings, active indicators, small icons.
- White (`#FFFFFF`) = **only** for the primary CTA pill background.
- Never use raw red, blue, green, or purple defaults. Use Lovli tokens.
- No "blue-to-purple" or "purple-to-pink" gradients anywhere.

---

## 3. Typography

**Font families:**
- `Space Grotesk` (display, via `font-display` class) — h1, h2, h3, brand mark.
- `Figtree` (body, default) — everything else.

**Scale (binding):**
| Role | Size | Weight | Class hint |
|---|---|---|---|
| Page h1 | 22px | 600 | `font-display text-[22px] font-semibold` |
| Section h2 | 16px | 600 | `font-display text-[16px] font-semibold` |
| Card title h3 | 17px | 600 | `font-display text-[17px] font-semibold` |
| Body | 14px | 400 | `text-[14px]` |
| Reply text (hero) | 17px | 400 | `text-[17px] leading-[1.6]` |
| Helper / muted | 12.5px or 13px | 400 | `text-[12.5px] text-lovli-text-muted` |
| Label above input | 12.5px | 500 | `text-[12.5px] font-medium text-lovli-text-soft` |
| Tiny meta (uppercase tag) | 11px | 500 | `text-[11px] font-medium uppercase tracking-[0.08em]` |

**Rules:**
- All page-level h1 = 22px. No exceptions.
- Auth screens (Login/Signup/Onboarding/EarlyAccess/Privacy/Terms) also use 22px h1.
- Headings get `letter-spacing: -0.012em` automatically via base styles.
- Never use `text-2xl`, `text-3xl` etc — always use explicit `text-[Npx]` to keep the rhythm exact.

---

## 4. Spacing System

Use multiples of 4 — primarily **8 / 12 / 16 / 24 / 32**.

| Context | Spacing |
|---|---|
| Vertical gap inside a card | `space-y-5` (20px) |
| Vertical gap between sections on a page | `space-y-6` (24px) |
| Card padding (standard) | `p-5` (20px) |
| Card padding (hero) | `p-5` (20px), `rounded-3xl` |
| Card padding (inner micro-card) | `p-4` (16px) |
| Form input gap | `space-y-1.5` between label and input |
| Chip gap | `gap-2` (8px) |
| Page horizontal padding | `px-4` (16px) — mobile-first |

**Bottom-nav safe spacing (binding):**
```
--lovli-nav-safe-bottom: calc(104px + 64px + env(safe-area-inset-bottom));
```
Applied via `AppShell.jsx` to every screen that has the floating tab bar. Guarantees ≥90px clearance between the last CTA and the nav pill on every device. Do NOT bypass this on individual pages.

---

## 5. Component System

### 5.1 Cards
| Type | Background | Border | Radius | Padding |
|---|---|---|---|---|
| Hero block | `bg-lovli-card-2/70` | `border-lovli-border` | `rounded-3xl` | `p-5` |
| Glass card (`lovli-glass` class) | `bg-lovli-card-2/78` + `backdrop-blur-xl` | `border-lovli-border` | `rounded-2xl` | `p-5` |
| Standard card | `bg-lovli-card` | `border-lovli-border` | `rounded-2xl` | `p-4` or `p-5` |
| Modal | `bg-lovli-card-2/95` + `backdrop-blur-2xl` | `border-lovli-border` | `rounded-3xl` | `p-6` |

Shadow: only on `lovli-glass` and modals → `shadow-[0_16px_48px_rgba(0,0,0,0.55)]`.
No heavy glow on regular cards.

### 5.2 Primary CTA (`.lovli-cta` class)
- Background: solid `#FFFFFF`.
- Text: `#050509`.
- Pill shape: `rounded-full`.
- Subtle glow: `box-shadow: 0 12px 32px rgba(167,139,250,0.22)`.
- Hover: brighter glow + 1px lift.
- Min-height: 46–50px.
- **Used only for the single primary action on a screen** (Generate replies, Save memory, Save changes, Sign in, Sign up, Get Early Access, Done, Continue, Add Memory).

### 5.3 Secondary buttons
- Background: `bg-lovli-card` (or transparent).
- Border: `border-lovli-border`.
- Text: `text-lovli-text-soft`.
- Hover: `bg-lovli-card-2 + border-lovli-border-strong + text-lovli-text`.
- Pill shape on action buttons; `rounded-xl` on settings rows.
- **Examples:** Regenerate, Logout, Cancel, Skip.

### 5.4 Destructive buttons
- Background: `bg-rose-500/10`.
- Border: `border-rose-300/20`.
- Text: `text-rose-200`.
- Hover: `bg-rose-500/15`.
- Keep subtle, never loud. The text stays **"Delete"** — do not rename to "Forget this".

### 5.5 Inputs (binding)
- Height: 44px (`h-11`).
- Radius: `rounded-xl`.
- Background: `bg-lovli-card`.
- Border: `border-lovli-border`.
- Placeholder: `placeholder:text-lovli-text-faint`.
- Focus: lavender border + 3px lavender/18%-opacity ring (global rule in `index.css`).
- No harsh outlines, no admin-dashboard styling.

### 5.6 Chips (`ChipGroup`)
- Container: `flex flex-wrap gap-2`.
- Each chip: `min-h-[36px] rounded-full px-3.5 py-1.5 text-xs font-medium`.
- Inactive: `border-lovli-border bg-lovli-card text-lovli-text-soft/85`.
- Hover: `bg-lovli-card-2 + border-lovli-border-strong`.
- Active (`.lovli-chip-active`): subtle lavender fill (`rgba(167,139,250,0.10)`) + lavender border (`rgba(167,139,250,0.55)`) + soft glow.
- **No gradient fills on chips.** Ever.

### 5.7 Bottom navigation
- 3 tabs only: **Reply / Pro / Memory**. Settings is NEVER a bottom tab — accessible from top-right cog only.
- Floating pill: `rounded-[24px]`, `bg-lovli-card-2/82`, `backdrop-blur-2xl`, `border-lovli-border`.
- Active tab: lavender icon + lavender label + 3px lavender pill indicator on top edge (animated via `motion.span layoutId="bottom-nav-indicator"`).
- Inactive: `text-lovli-text-muted`, icon stroke 1.7.
- Active: icon stroke 2.2.
- Safe-area aware: `paddingBottom: max(12px, calc(env(safe-area-inset-bottom) + 6px))`.
- Width: `w-[min(440px,calc(100vw-20px))]`.
- Pointer-events isolated to the inner pill so scroll isn't blocked.

### 5.8 Top header (`TopHeader.jsx`)
- Sticky at `top:0`, `z-30`, `bg-lovli-bg/85 + backdrop-blur-xl`.
- Safe-area aware: `paddingTop: calc(env(safe-area-inset-top) + 0.6rem)`.
- Left: Lovli mark + wordmark (linked to `/app`).
- Right: plan badge ("Free" / "Pro") + settings cog (links to `/settings`).
- Plan badge: lavender border if Pro, neutral if Free.

---

## 6. Page Patterns

### 6.1 Reply screen (`AppReply.jsx`) — Option B layout
**Visible by default:**
1. h1 "Stuck on what to reply?" + 14px muted subtext.
2. **Upload card** (primary focus): lavender icon, dashed `border-lovli-border`, on hover → `border-lovli-lavender/40 + bg-lovli-card-2`.
3. Manual paste textarea (3 rows).
4. Reply language chips: `English` / `Hinglish` / `Hindi + English mixed`.
5. **"Customize reply"** collapsible bar (collapsed by default) — shows live summary `"Platform • Vibe • Memory"` when collapsed.
6. Usage row + privacy chip.
7. Primary CTA: **Generate replies** (white pill).

**Inside the collapsed Customize section:**
- Platform chips: **only** `Instagram / Dating platform / WhatsApp`.
- Vibe chips: `Playful / Flirty / Sincere / Respectful / Confident`.
- Memory selector (optional) — labeled `"Personalize with memory (optional)"`.
- Quick note textarea (optional).

### 6.2 Reply results (`ReplyResultCard.jsx`)
- Section heading: **"Choose a reply"** + "Edit it if you want. Make it yours." subtext.
- Each card has:
  - Tiny lavender dot + uppercase tone label mapped from vibe:
    - Playful → `PLAYFUL`, Flirty → `SMOOTH`, Sincere → `SINCERE`, Respectful → `RESPECTFUL`, Confident → `CONFIDENT`. Fallback: `WARM`.
  - Reply text as the **hero**: 17px, line-height 1.6, `text-lovli-text`.
  - Two actions ONLY: **Copy** (primary white pill) + **Regenerate** (quieter ghost). Copy swaps to "Copied" for 1.8s + toast "Copied. Go send it.".
- Animation: subtle staggered fade-up (y: 10→0, opacity 0→1, 320ms, 80ms stagger per card).
- **FORBIDDEN actions on reply cards:** Save, Share, Score, Rate, Shorter, More flirty, More Hinglish, Rewrite, Feedback popover.

### 6.3 Memory tab (`Memory.jsx`)
- Hero icon: `BookHeart` (NOT `BrainCircuit`). Eyebrow: `"LOVLI MEMORY"`. Headline: `"Remember meaningful details."`
- Subtext: "Save the little things they mention so future replies feel more thoughtful."
- Privacy cue: LockKeyhole + "Private by default. You control what gets saved."
- Action button: **"Add Memory"** (not "Create memory"). Test ID stays `memory-create-button`.
- Cards = journal-style stacked entries. Soft labels in tiny uppercase:
  - `GOOD TO REMEMBER` ← `likes` field
  - `THINGS TO AVOID` ← `dislikes` field
  - `HOW THEY USUALLY TALK` ← `communication_style`
  - `INSIDE JOKES` ← `inside_jokes`
  - `IMPORTANT MOMENTS` ← `important_dates`
  - `WHAT FEELS RIGHT` ← `best_approach`
  - `YOUR NOTES` ← `notes`
- **Hide empty fields entirely.** Don't render the label if the value is empty.
- Card actions: Edit + Delete (Delete stays "Delete", not "Forget this").
- Modal `MemoryFormDialog`: titled "Add Memory" with subtext "Use nicknames, not real names. You can edit or delete this anytime." 3 grouped `FormSection`s: **Basic context / Good to remember / Your notes**.

### 6.4 Pro tab (`Pro.jsx`)
- Hero: lavender "Coming soon" pill + h1 **"More replies. Smarter personalization."** + 14px subtext.
- Free vs Pro = **two stacked `PlanCard` components**. NOT a comparison table.
- Feature lists are binding:
  - **Free**: `8 generations / day`, `3 replies each time`, `Basic vibes`, `Standard memory`.
  - **Pro**: `Unlimited generations`, `Advanced memory`, `More reply styles`, `Early access to new AI features`.
- Free card: neutral checks. Pro card: subtle lavender border, lavender checks, small "COMING SOON" pill.
- CTA: **"Get Early Access"** (NEVER "Upgrade", "Buy", "Subscribe").
- Inline waitlist form: email + 5 reason chips (`Unlimited replies / Advanced memory / More reply styles / Early AI features / Not sure yet`). NO long survey questions.
- Footer trust line: "We'll only email you about Pro early access."

### 6.5 Settings (`Settings.jsx`)
4 sections, each with a `SectionHeader` (small lavender icon + 13px title):
1. **Account** — Name (editable), Email (disabled), Login method row (`Email & password` / `Google`), Save changes (white pill), Logout (bordered ghost).
2. **Preferences** — Default language chips + helper "Used as your default. You can still choose a different language before every generation." / Default platform chips + helper "Used as your default. You can change platform on each reply." **Timezone input is hidden** (auto-detected from browser per generation).
3. **Plan** — Current plan badge, "X of 8 used today" usage row, lavender-accented "Get early access to Pro" link.
4. **Privacy** — LockKeyhole + "Private by design. You control what gets saved." + screenshots-not-stored note + disabled "Delete account (coming soon)" placeholder. **Do not build real delete-account logic.**

### 6.6 Auth screens (Login / Signup)
- Lovli mark + wordmark at top.
- `lovli-glass` card with h1 (22px) + subtext + privacy cue + form + Separator + Google button.
- Privacy cue: LockKeyhole + **"Your chats stay yours."**
- Google button text: "Continue with Google".
- Footer: Terms + Privacy links.
- Error handling: ALL `toast.error(...)` calls use `extractErrorMessage(err, fallback)` from `lib/api.js` to safely render Pydantic 422 array details.

---

## 7. Motion & Animation

**Allowed:**
- Subtle fade-up on entry (y: 8→0, opacity 0→1, 200–320ms).
- Staggered card entry (80ms delay per card).
- Smooth hover lift (1px translateY, 180ms).
- Active-state cross-fade (lavender icon swap, 200ms).
- Collapsible height/opacity transition (220ms cubic-bezier `[0.2, 0.8, 0.2, 1]`).

**Forbidden:**
- Bouncing springs (other than the bottom-nav indicator which uses `stiffness: 360, damping: 30`).
- Flashy parallax.
- `transition: all` (be specific about properties).
- Anything that slows perceived performance.

---

## 8. Privacy & Trust Cues

Always subtle (12.5px, muted text + small LockKeyhole icon). Never legal-heavy.

| Where | Cue |
|---|---|
| Login + Signup | "Your chats stay yours." |
| Reply upload area | "Only upload chats you're comfortable sharing." |
| Memory hero + modal footer | "Private by default. You control what gets saved." |
| Settings → Privacy section | "Private by design. You control what gets saved." |
| Pro footer | "We'll only email you about Pro early access." |

---

## 9. Icon System

- Library: **`lucide-react` only**. Never use emoji or other libraries.
- Stroke width: 1.7 inactive, 2.2 active.
- Sizes: `h-3 w-3` (cue), `h-3.5 w-3.5` (small action), `h-4 w-4` (standard), `h-5 w-5` (nav).
- Color: `text-lovli-text-soft` or `text-lovli-lavender` for accents.
- Brand mark: `LovliMark.jsx` — DO NOT replace it without explicit approval. Keep the temporary mark.
- Notable icon assignments:
  - Memory page hero: `BookHeart` (not `BrainCircuit`, which feels clinical).
  - Memory preview avatar: `NotebookText`.
  - Reply nav tab: `MessageSquareText`.
  - Pro nav tab: `Sparkles`.
  - Memory nav tab: `BrainCircuit` (kept here because it's tiny + needs a unique silhouette).
  - Privacy cue: `LockKeyhole`.
  - Settings sections: `UserRound` / `SlidersHorizontal` / `BadgeCheck` / `ShieldCheck`.

---

## 10. Mobile & Safe-Area

- Default viewport target: **iPhone 13 (390×844)**.
- Container max-width: `max-w-[480px]` mobile / `sm:max-w-[520px]` / `md:max-w-[560px]` — Lovli stays mobile-feel even on desktop.
- Always test for: no horizontal overflow, no text cut-off, no nav overlap, comfortable tap targets (44×44 min), readable on small screens.
- Use `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` in sticky/fixed elements.

---

## 11. Test ID Conventions

Every interactive element AND every element displaying critical user-facing info MUST have a unique `data-testid` in kebab-case, role-based naming (not appearance-based).

**Critical existing IDs (do NOT rename):**
- `generate-replies-button`, `reply-screenshot-uploader`, `reply-paste-textarea`, `reply-customize-toggle`, `reply-customize-summary`, `reply-result-card`, `reply-copy-button`, `reply-regenerate-button`, `reply-tone-label`, `reply-results-heading`.
- `memory-create-button`, `memory-form`, `memory-form-*-input`, `memory-save-button`, `memory-edit-button`, `memory-delete-button`, `memory-card-item`, `memory-card-nickname`.
- `pro-early-access-submit-button`, `pro-early-access-email-input`, `pro-reason-<value>`, `free-plan-card`, `pro-plan-card`, `pro-coming-soon-badge`, `pro-status-badge`.
- `settings-name-input`, `settings-language-toggle`, `settings-platform-toggle`, `settings-save-button`, `settings-logout-button`, `settings-delete-account-button`, `settings-plan-badge`, `settings-usage-text`, `settings-pro-link`, `settings-login-method`, `settings-account-section`, `settings-preferences-section`, `settings-plan-section`, `settings-privacy-section`, `settings-privacy-cue`.
- `bottom-nav`, `bottom-nav-reply`, `bottom-nav-pro`, `bottom-nav-memory`.
- `top-header`, `top-header-logo`, `top-header-plan-badge`, `top-header-settings-button`.
- `login-page`, `login-email-input`, `login-password-input`, `login-submit-button`, `login-google-button`, `login-privacy-cue`, `login-signup-link`.
- `signup-page`, `signup-name-input`, `signup-email-input`, `signup-password-input`, `signup-submit-button`, `signup-google-button`, `signup-privacy-cue`, `signup-login-link`.

---

## 12. File Map

| File | Owns |
|---|---|
| `/frontend/src/index.css` | Color tokens, body bg, `.lovli-cta`, `.lovli-glass`, `.lovli-chip-active`, `.lovli-noise`, focus ring, `--lovli-nav-safe-bottom` |
| `/frontend/tailwind.config.js` | `lovli-*` color tokens, font families |
| `/frontend/src/components/AppShell.jsx` | Page shell, padding-bottom safe spacing |
| `/frontend/src/components/TopHeader.jsx` | Sticky header, plan badge, settings cog |
| `/frontend/src/components/BottomNav.jsx` | Floating tab bar, 3 tabs, lavender indicator |
| `/frontend/src/components/GlassCard.jsx` | Reusable glass card |
| `/frontend/src/components/ChipGroup.jsx` | Reusable chip group with active state |
| `/frontend/src/components/ScreenshotUploader.jsx` | Reply upload card |
| `/frontend/src/components/ReplyResultCard.jsx` | Single generated reply card |
| `/frontend/src/components/UsageCounter.jsx` | "X of 8 used today" chip |
| `/frontend/src/components/LoadingState.jsx` | Lavender dots loading animation |
| `/frontend/src/components/UpgradeModal.jsx` | Pro waitlist modal |
| `/frontend/src/components/EarlyAccessForm.jsx` | Memory early access waitlist form |
| `/frontend/src/components/AuthGoogleButton.jsx` | Google OAuth button |
| `/frontend/src/components/LovliMark.jsx` | Brand mark (do NOT replace) |
| `/frontend/src/pages/*.jsx` | Page-level layouts |

---

## 13. Don'ts (Cumulative)

- ❌ Don't introduce a giant Free vs Pro comparison table.
- ❌ Don't add a "Most Popular" badge, sales urgency, or pricing screen.
- ❌ Don't change Pro CTA away from "Get Early Access".
- ❌ Don't add Settings as a bottom tab.
- ❌ Don't add new actions on reply cards.
- ❌ Don't rename Delete to "Forget this".
- ❌ Don't reintroduce `BrainCircuit` on the Memory page hero.
- ❌ Don't render empty memory fields.
- ❌ Don't use gradient fills on chips, buttons, or card backgrounds.
- ❌ Don't use raw hex outside design tokens.
- ❌ Don't break the 22px h1 / 16px h2 / 17px card-title / 14px body rhythm.
- ❌ Don't bypass `--lovli-nav-safe-bottom`; never reduce bottom padding on AppShell screens.
- ❌ Don't add new product features in design passes.

---

## 14. Workflow Rules for the Next Agent

1. **Always read this file in full before touching UI.**
2. Reference `/frontend/src/index.css` and `/frontend/tailwind.config.js` for tokens. Never invent new colors.
3. Reuse Shadcn primitives from `/frontend/src/components/ui/`. Compose, don't reinvent.
4. After any UI change: run `mcp_lint_javascript` on `/frontend/src` and `mcp_screenshot_tool` at viewport `390×844` to verify.
5. Preserve all `data-testid`s. If you add a new interactive element, give it a stable kebab-case test ID.
6. If you must deviate from this spec, document the deviation back into this file in the same PR.

---

**Last updated:** Final QA + Vercel/Railway migration prep.
**Maintainer:** Whoever currently has the build-agent context.
