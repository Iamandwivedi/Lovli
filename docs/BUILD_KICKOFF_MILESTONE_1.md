# Lovli Build Tab — Kickoff Prompt (Milestone 1)

Copy everything below the line into the Build tab.

---

You are the Lovli Build tab. Your job is to implement the Lovli mobile app in Expo / React Native inside `/mobile`. The Design tab has finished the v2 design; you implement it. Do not redesign, do not add features, do not touch `/backend` or `/frontend`.

## Read these first, in this order

1. `docs/MOBILE_SETUP.md` — stack, structure, non-negotiables (SecureStore for JWT, `EXPO_PUBLIC_BACKEND_URL`, never bundle secrets).
2. `docs/API_CONTRACT.md` — every endpoint you'll call. The backend is live at https://api.lovli.in. Do not create or modify backend code.
3. `docs/MOBILE_DESIGN_HANDOFF_V2.md` — the binding design spec: tokens, screen inventory, motion table, build order, do-not-build list, open risks.
4. `docs/PROJECT_OVERVIEW.md` — product constants (3 platforms, 3 languages, 5 vibes, tone-label mapping) and banned vocabulary. All UI copy comes from here and the handoff; never invent copy.
5. `design/lovli-mobile-design-board-v2.html` — open in a browser; this is the visual truth, and its animations are the motion reference. Figma file "Lovli Mobile UI v2" (Lovli project) mirrors it as static frames.

## Milestone 1 scope — theme, core components, money path (R1–R8)

Deliver a working loop on a real device via Expo Go: open app → upload screenshot or paste chat → generate → see 3 replies → copy → hit limit gracefully.

### 1. Theme (`src/theme/`)
Mirror the handoff §2 tokens exactly: colors (incl. stage radial wash, surface/float shadows, hairline), typography (Space Grotesk via expo-font: hero 28/600, title 22/600; Figtree body 15, reply text 17–18, meta 12.5; caps only for tone labels), spacing (4px base), radius (14/16–18/20–24/26/999).

### 2. Core components (`src/components/ui/`)
Screen shell (stage background + safe areas) · Header (mark, wordmark, plan, cog) · PrimaryCTA (white pill 52px, glow, press scale .97) · GhostButton · SegmentedControl · Chip · Surface + Float cards · BottomNav (3 tabs: Reply / Pro / Memory, gliding lavender indicator; Settings is NEVER a tab) · Toast · ErrorBanner · ThinkingState (3 breathing dots + 3-phase microcopy).

### 3. Screens R1–R8 (`src/screens/reply/`)
Per handoff §3: Reply screen with chat canvas (Screenshot/Paste modes, "No screenshot? Try an example" inserting the canned chat "Movie kab dekh rahe ho phir? 😏", privacy line "Screenshots are never stored", first-run example card), customize bottom sheet (@gorhom/bottom-sheet: platform segmented, vibe chips, memory selector — may show "None" only in M1, quick note), fixed CTA zone with usage + "Private by design", generating state, Results as a pushed screen (lead reply card + 2 compact cards, Copy via expo-clipboard + light haptic + "Copied. Go send it." toast, regenerate with styled inline confirm — never Alert defaults), memory-nudge row (stub the navigation; Memory tab ships in M2), limit-reached full screen ("That's 8 for today." / "Resets at midnight…").

### 4. API wiring
Auth can be stubbed with a dev token for M1 if needed, but `/generate-replies` must be real: multipart field `image`, JPG/PNG/WEBP ≤6MB, send IANA timezone + local YYYY-MM-DD, handle 429 → limit screen, 503/errors → calm error banner with `extractErrorMessage` ported from `frontend/src/lib/api.js`.

### 5. Motion (must-have in M1)
Card stagger (8px fade-up, 80ms), copy morph (1.8s), thinking phases, sheet spring, CTA press, screenshot drop-in — specs in handoff §4. Use Reanimated/Moti. Ship-static-later list also in §4.

## Hard rules

- No new features, screens, or copy beyond the spec. No scores, streaks, notifications, extra reply-card actions, pricing, or human-coach/wingman language anywhere.
- Banned vocabulary list in `PROJECT_OVERVIEW.md` applies to code comments and analytics event names too.
- 390px primary, verify at 360px (segmented control truncation is a known risk — handoff §7).
- Test on device via Expo Go before calling anything done.

## Definition of done (Milestone 1)

A reviewer can: sign in (or dev-auth), paste the example chat, generate, watch the thinking state, see 3 staggered reply cards with tone labels, copy one (haptic + toast), regenerate with confirm, attach a screenshot instead and repeat, and hit the 429 limit state — all without visual overflow at 390 and 360, with the bottom nav never overlapping content.

When M1 is done, report back what was built, what deviated from the handoff and why, and screenshots at 390px — the Design tab will run design QA before M2 (onboarding + auth) starts.
