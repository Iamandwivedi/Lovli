# Lovli — `/api/feature` contract + per-feature prompts (PR4, reconciled for V2)

> June 2026: original pre-V2 spec recovered from the user's local repo and merged
> with the V2 reconciliation. The stable `feature_id` values in
> `mobile/src/constants/more-features.ts` are the contract keys.
> STATUS: APPROVED (user review) — implemented in PR4a.

## 1. Route — ONE additive endpoint

`POST /api/feature` (auth: Bearer JWT) — multipart form, same shape as `/api/decode`.
`/api/generate-replies` and `/api/decode` stay **untouched**.

| field              | type   | notes                                                              |
|--------------------|--------|--------------------------------------------------------------------|
| `feature_id`       | str ✱  | one of the 7 below — 400 otherwise                                 |
| `manual_text`      | str    | pasted chat / situation ("chat context" for glow_up)               |
| `text_secondary`   | str    | optional 2nd field — fair_verdict: "Their side"; what_should_i_do: "Your goal" |
| `draft_text`       | str    | **glow_up_reply only** — the user's draft. Ignored by others.      |
| `image`            | file   | screenshot, JPG/PNG/WEBP ≤ 6MB (same validation as decode)         |
| `feeling`          | str    | optional emotion chip                                              |
| `memory_card_id`   | str    | optional — pulls the same memory context block as decode           |
| `language`         | str    | default "Hinglish"                                                 |
| `client_local_date`| str    | YYYY-MM-DD, for the daily counter reset                            |

Input validation (400):
- `glow_up_reply` → requires non-empty `draft_text` ("Paste the reply you want to glow up.")
- all others → requires `manual_text` **or** `image` (same message as decode)

Feature ids served: `red_flag_check`, `what_should_i_do`, `settle_the_fight`,
`the_other_side`, `fair_verdict`, `breakup_clarity`, `glow_up_reply`.
(`decode_situation` / `read_signals` keep routing to `/api/decode`; `ask_lovli` is a tab.)

## 2. Response — specced shape mapped onto the V2 result surface

```json
{
  "generation_id": "uuid",
  "feature_id": "red_flag_check",
  "verdict": "Mild — but fixable.",
  "points": [
    { "text": "…", "tone": "positive" },
    { "text": "…", "tone": "warning" },
    { "text": "…", "tone": "neutral" }
  ],
  "actions": ["…", "…"],
  "replies": ["…"]
}
```

- `verdict` — one sentence, serif headline inside the glass card (Decode-style).
  **`red_flag_check` is clamped server-side** (like decode's `vibe_label`) to exactly
  FOUR severity tiers:
  `"All clear — no red flags."` / `"Mild — but fixable."` /
  `"Pattern worth taking seriously."` / `"This is serious — please don't brush it off."`
  The 4th tier exists for control/coercion/abuse patterns — when it fires, `actions`
  gently point toward trusted people / professional support, never texting tactics.
  Unrecognized model output clamps to the "pattern" tier (never downplay).
  Other features: free-text single sentence (honesty rule enforced by prompt).
- `points[]` — 1–5 bullets `{text, tone}`. `tone` drives the ✦ colour: `positive` →
  lavender, `warning` → pink, `neutral` → soft gray. Plain-string points are coerced
  to `neutral`. Rendered as the ✦ bullet list.
- `actions[]` — 0–3 items → **YOUR NEXT MOVE** card (numbered if >1; hidden if empty).
- `replies[]` — 0–3 send-ready lines → **"I'd send this"** card with copy button;
  section hidden when empty. LOCKED POLICY (enforced server-side, not just prompts):
  `glow_up_reply` always (2–3 improved drafts, PRIMARY output); `settle_the_fight` +
  `what_should_i_do` conditional (only when a message is the right move);
  **`breakup_clarity` NEVER** (closure, not re-engagement — explicit in its suffix);
  all other features forced to `[]`.

Validator (`validate_feature_payload`, mirrors `validate_decode_payload`): strip code
fences + regex-extract the first `{...}` (via `parse_lovli_json`), verdict + ≥1 point
required (else one stricter retry on the same provider), tones clamped, lists capped.

## 3. Locked decisions (still stand)

- **Shared daily counter** — every feature call `$inc`s `daily_generation_count`;
  free limit bumps **8 → 10** (`DAILY_LIMIT_FREE = 10`; `/api/usage` propagates it
  to the UI automatically). Same 429 shape.
- **Same `generations` collection** — additive nullable fields on `Generation`:
  `feature_id: Optional[str] = None`, `result: Optional[dict] = None` (verdict/points/
  actions/replies). Feature rows: `generated_replies = replies` (may be `[]`),
  `vibe = feeling or ""`, `platform = "feature"`. Old docs untouched; `/api/feedback`
  keeps working via `generation_id`.
- Ask Lovli is a tab — the old "hide Continue-with-Lovli for ask_lovli" note is moot.

## 4. Prompts — honesty rule in EVERY suffix

`llm_service.py`: one shared `FEATURE_SYSTEM_BASE` (first-person Lovli wingman voice,
Hinglish-aware, strict JSON output) that hard-embeds:

> HONESTY RULE (hard): qualitative reads ONLY. NEVER numeric confidence, percentages,
> scores out of 10, counts of red flags, or invented facts. If you can't know, say so.

plus a `FEATURE_PROMPTS[feature_id]` suffix per feature:

| feature            | suffix focus                                                                                            | verdict guidance                                   |
|--------------------|---------------------------------------------------------------------------------------------------------|----------------------------------------------------|
| `red_flag_check`   | Scan for control, disrespect, manipulation, love-bombing vs normal friction. Warm but don't sugar-coat.  | EXACTLY one of the 4 clamped severity tiers        |
| `what_should_i_do` | Best next move for the user's goal (use memory goal if present). Decisive, one main recommendation.      | the move in one sentence ("Give it two days, then…")|
| `settle_the_fight` | Why the fight really happened (needs under the words), how to de-escalate without losing self-respect.   | the real cause in one line                          |
| `the_other_side`   | Steelman the other person's POV — what they likely felt/meant. No mind-reading presented as fact.        | their side in one line ("They likely felt dismissed…")|
| `fair_verdict`     | Unbiased referee — who's right, who owes what apology. Can rule against the user.                        | the ruling ("Both dropped the ball — you first.")   |
| `breakup_clarity`  | Stay-or-go thinking framework. NEVER commands a breakup — clarifies what user already knows. Extra-gentle.| the pattern seen, not a directive                   |
| `glow_up_reply`    | Rewrite the draft: smoother, confident, same intent and voice, no cringe. Keep user's language mix.      | what changed and why it lands better                |

## 5. Frontend — one shared FeatureResult screen

- **`app/feature/[id].tsx`** — phase machine `input → loading → result` (Decode pattern,
  tab bar hidden, back header). Invalid id → redirect to More.
- **`src/constants/feature-config.ts`** — per-feature UI config: screen title, intro line,
  input placeholder, `wantsDraft` (glow_up: "Your draft" required field + optional chat
  context), 3 staged-loader lines, verdict kicker label (e.g. `THE VERDICT`, `THEIR SIDE`),
  points section header, rose accent flag (red_flag_check).
- Inputs reuse V2 components (dashed upload, emotion chips, PersonChip row, staged loader).
  Shared pieces extracted to `src/components/feature/`; `decode.tsx` NOT refactored this PR
  (regression safety) — dedupe noted for cleanup later.
- Result surface: serif verdict in glass card → ✦ points (tone-coloured) → YOUR NEXT MOVE →
  optional "I'd send this" reply card (copy button).
- **Decode footer pattern on every result**: `Save to Memory` (PATCH timeline entry —
  title "<Feature title> saved", detail = verdict) + `✦ Ask Lovli about this`
  (`lovli_ask_pending` = { text: verdict + top points summary, personId }).
- More grid: all 7 tiles route to `/feature/[id]` (placeholder toast removed).

## 6. Errors

Same family as decode: 400 missing input / bad image · 401 · 413 image too large ·
422 unknown feature_id · 429 daily limit · 503 `"Lovli couldn't work through this right
now. Try again."`

## 7. Rollout

1. PR4a — backend `/api/feature` skeleton (all 7 prompt suffixes) + **Red flag check** e2e
   (grid tile → input → loader → result → footer handoffs) → user review.
2. PR4b — remaining 6 tools in one batch (config-driven, same screen).
