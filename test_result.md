#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## PR-V2-1 (Dark foundation, 4-tab nav, Welcome + Onboarding) — implemented $(date +%F)

user_problem_statement: V2 dark "Coach" redesign. PR-V2-1 = dark token foundation, 4-tab bar (Reply · Ask Lovli · Memory · More), Welcome hero screen, 3-step onboarding (Goal/Platform/Language). Ask Lovli tab is a STATIC SHELL (greeting + starter chips, input disabled) until PR-V2-4.

frontend:
  - task: "V2 dark theme foundation (colors.ts swap, PrimaryButton white pill, Chip/Input/GlassCard/Screen dark)"
    implemented: true
    working: "NA"
    files: ["/app/mobile/src/theme/colors.ts", "/app/mobile/src/components/PrimaryButton.tsx", "/app/mobile/src/components/Chip.tsx", "/app/mobile/src/components/GlassCard.tsx", "/app/mobile/src/components/Screen.tsx", "/app/mobile/src/components/Input.tsx", "/app/mobile/src/components/AppHeader.tsx"]
    needs_retesting: true
  - task: "4-tab bar: Reply · Ask Lovli (✦ glyph, glows active) · Memory · More, dark blur bg"
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/(tabs)/_layout.tsx"]
    needs_retesting: true
  - task: "Welcome screen (hero gradient + ambient glow + ✦ + serif headline + white '✦ Get started' CTA)"
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/welcome.tsx", "/app/mobile/src/components/AmbientGlow.tsx", "/app/mobile/app/index.tsx"]
    needs_retesting: true
  - task: "Onboarding 3-step wizard (Goal → Platform → Language), progress track, option list, Continue CTA, skip preserved; goal stored to AsyncStorage key lovli_goal"
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/onboarding.tsx"]
    needs_retesting: true
  - task: "Ask Lovli static shell (greeting bubble, 3 starter chips, disabled input, dimmed send)"
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/(tabs)/ask-lovli.tsx"]
    needs_retesting: true

agent_communication:
  - agent: "main"
    message: "PR-V2-1 done. NOTE: supervisor expo program pointed at /app/frontend after fork — fixed to /app/mobile. Backend untouched. Legacy screens (reply/memory/more/settings/paywall/login/signup) inherit dark tokens automatically; their dedicated restyles come in PR-V2-2..7, so don't fail them on pixel-perfection — only on broken/unreadable UI. No numeric confidence/scores anywhere (honesty rule)."

## PR-V2-2 (Reply Home emotion-first + Intent screen + staged Generating loader) — implemented
frontend:
  - task: "Reply Home V2: 'What's happening?' H1, feeling chips (single-select toggle + Skip), compact dashed upload row 'Show me the conversation', paste field, ✦ Get replies. Language toggle + Customize row REMOVED (defaults still sent to API)."
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/(tabs)/reply.tsx"]
  - task: "Intent phase: back header 'Got it. I read the chat.', parsed chat preview bubbles (them left / me right), WHAT DO YOU WANT? chips (Reply default), HOW SHOULD IT LAND? chips (optional toggle), ✦ Write it for me"
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/(tabs)/reply.tsx", "/app/mobile/src/components/reply/ChatPreview.tsx", "/app/mobile/src/utils/chatParse.ts"]
  - task: "Generating phase: staged 5-step loader (done/active/pending states, ~650ms cadence, min 2.2s, holds last stage until response)"
    implemented: true
    working: "NA"
    files: ["/app/mobile/src/components/reply/StagedLoader.tsx"]
  - task: "Results phase: back header 'Your reply' + existing ReadCard/reply cards (full restyle in PR-V2-3)"
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/(tabs)/reply.tsx"]

agent_communication:
  - agent: "main"
    message: "PR-V2-2: Reply tab is now a phase machine home→intent→generating→results (tab bar stays visible). feeling/intent/outcome stored client-side ONLY (sent in PR-V2-3). NO backend changes this PR; EMERGENT_LLM_KEY restored in backend/.env (was lost in fork) so real generation works. Main agent smoke-tested full happy path OK. NOTE: Metro runs in CI mode — code changes need `sudo supervisorctl restart expo`."

## PR-V2-3.1 (Intent screen: per-generation language + person pickers) — implemented & self-tested
- REPLY LANGUAGE chips (English/Hinglish/Hindi + English mixed), preselect Settings default, override is per-generation (reset on each new flow via goToIntent).
- WHO'S THIS ABOUT? person chips from GET /api/memory-cards with 18px gradient avatar + "No one" default; tap-toggle deselect; row hidden when 0 cards; sends memory_card_id.
- Intent phase restructured: BackHeader + inner ScrollView (chips scroll) + pinned "✦ Write it for me" CTA.
- Self-tested via screenshots: rows render, toggle select/deselect verified via computed bg (rgb(167,139,250) ↔ rgb(17,18,28)), language override works. Test memory card "Ananya" seeded for tester@lovli.app.

## PR-V2-3.1 fix+move (person picker → Reply Home) — VERIFIED by testing agent (iteration_11, 6/6 pass)
- Root cause of hidden row: cold-boot fetch raced token restore (401 → empty). Fix: refetch on user?.id.
- Person picker on Home between paste + CTA; removed from Intent; language row stays on Intent.
- memory_card_id carry-through verified at network level; resets to "No one" on results→home.

## PR-V2-4 (Ask Lovli live: POST /api/ask-lovli + chat UI) — implemented
backend:
  - task: "POST /api/ask-lovli (auth): {message, history[{role:user|lovli,text}], person_id?} → {reply}. History capped 20 turns; person_id pulls memory card context; coach persona prompt (warm wingman, Hinglish-aware, qualitative-only honesty); counts against daily usage (429 same shape); 400 empty msg; 503 LLM fail. Provider routing same as generate-replies."
    implemented: true
    working: true  # main agent curl: 200 happy / 401 bad token / 400 empty / 429 over-limit all verified
    files: ["/app/backend/server.py", "/app/backend/llm_service.py", "/app/backend/models.py", "/app/docs/API_CONTRACT.md"]
frontend:
  - task: "Ask Lovli chat UI: enabled input + send, starter chips send + hide after thread starts, Lovli/user bubbles per V2 spec, typing indicator (pulsing ✦ + … bubble), thread persisted to AsyncStorage (lovli_ask_thread), auto-scroll, failed sends show retry affordance without wiping thread"
    implemented: true
    working: "NA"
    files: ["/app/mobile/app/(tabs)/ask-lovli.tsx", "/app/mobile/src/api/endpoints.ts"]
agent_communication:
  - agent: "main"
    message: "PR-V2-4: backend fully smoke-tested via curl. Tester daily count reset to 0 (full 8 quota). Greeting bubble is display-only (not sent in history). Each ask message consumes 1 daily generation."

## PR-V2-5 (Decode + More·Tools grid) + carry-in fix — implemented
backend:
  - task: "POST /api/decode (auth, multipart like generate-replies: manual_text/image + optional feeling/memory_card_id/language). Qualitative-only; vibe_label clamped server-side to 3 values. Counts vs daily limit. Contract in /app/docs/API_CONTRACT.md."
    implemented: true
    working: true  # main agent curl: 200 happy (rich JSON), 401, 400 no-input, clamp unit test all pass
frontend:
  - task: "Carry-in: logout clears lovli_ask_thread + lovli_ask_pending (AuthContext)"
    implemented: true
    working: "NA"
  - task: "app/decode.tsx: input (dashed upload + paste + optional person chips) → decode-flavored staged loader → result ('The decode' header, OVERALL VIBE glass card w/ 3-segment meter, POSITIVE SIGNS ✦ lavender, WATCH-OUTS ✦ pink, WHAT'S REALLY GOING ON, YOUR NEXT MOVE card, footer: Save to Memory + ✦ Ask Lovli about this)"
    implemented: true
    working: "NA"
  - task: "More·Tools grid: 3 sections, 9 tools (Ask Lovli NOT in grid); Decode the situation + Read the signals → /decode; other 7 keep 'coming soon' placeholder (real flows are PR4); Red flag check has rose icon tile; Premium upsell row kept at bottom"
    implemented: true
    working: "NA"
  - task: "Ask Lovli: consumes lovli_ask_pending on focus (sends decode summary as user message with person_id); PersonChip extracted to shared component (reply.tsx + decode.tsx)"
    implemented: true
    working: "NA"
agent_communication:
  - agent: "main"
    message: "Non-decode More tiles intentionally show 'coming soon' toast — do NOT report as bug (PR4 scope). Save to Memory appends a note to card.notes via PATCH /api/memory-cards/{id}. Tester has card 'Ananya'."

## PR-V2-6 (Memory List + Timeline, additive fields) — implemented
backend: MemoryCard += stage/stage_duration/platform/city/timeline[]/facts[] (all optional, old cards untouched); PATCH already existed; _extra_memory_context() now feeds new fields into generate/ask-lovli/decode context. Main agent verified: PATCH with full V2 payload returns all fields (Ananya seeded: Talking·3 weeks, Hinge, Mumbai, 3 timeline entries incl 1 upcoming, 4 facts incl 1 avoid + 1 date).
frontend:
  - memory.tsx: V2 list (serif Memory H1 + intro, ✦ Add a memory, YOUR PEOPLE — first card elevated w/ 44px gradient avatar + meta 'Hinge · talking 3 weeks' + fact chips; others flat w/ tint avatar). Card tap → /memory/[id] detail. Empty state = hero copy + CTA only.
  - memory/[id].tsx: person detail (back + Edit→/memory/edit/[id], 56px avatar w/ glow, stage pill + meta, YOUR STORY SO FAR timeline w/ glowing dots + outlined upcoming dots sorted last, ＋ Add a moment bottom sheet → PATCH, THE LITTLE THINGS fact chips lavender/pink).
  - memory/edit/[id].tsx: existing MemoryForm edit flow (unchanged).
  - decode.tsx Save to Memory now appends a timeline entry (title 'Decode saved') instead of a note.
NOTE for tester: facts add/remove UI is NOT in this PR (edit via API/Edit-form scope note) — don't report as bug. Delete-person action moved out of the list (list is tap-to-detail); deletion via edit flow scope.

## PR-V2-7 (Premium waitlist paywall + Settings) + FINAL V2 QA PASS — VERIFIED (iteration_15, 5/5 pass)
frontend:
  - task: "Settings: account row → /paywall, language picker (PATCH /api/settings, persists), vibe/dating pickers + notif/faceid toggles persist in lovli_prefs; Delete my memories (type-DELETE guard) wipes all memory cards via API + lovli_ask_thread + lovli_ask_pending; logout clears both keys"
    implemented: true
    working: true
  - task: "Paywall: waitlist-only CTA (POST /api/waitlist pro/premium_v2/plan) → confirmation state, no double-submit; yearly preselect + BEST VALUE; restore toast; PAYMENTS_ENABLED=false intentional"
    implemented: true
    working: true
  - task: "Final QA: honesty regex ZERO matches across 8 screens; dark audit clean (white only on CTA pills/toggle knobs); 4-tab active states + ✦ glow OK; strict tsc clean after fixing _layout TabButton, Input focus types, storage.getItem fallbacks, MemoryForm cast"
    implemented: true
    working: true
agent_communication:
  - agent: "main"
    message: "V2 milestone COMPLETE. Added accessibilityState.disabled to delete-confirm-button (testing agent LOW finding). Ananya reseeded with full V2 fields (stage/platform/city/3 timeline/4 facts). Release blockers tracked as checkboxes in /app/docs/RELEASE_CHECKLIST.md — env stays on preview proxy until a release build is cut (PR4 is next)."

## PR4a (/api/feature skeleton + Red flag check e2e) — implemented, main-agent smoke-tested
backend:
  - task: "POST /api/feature (auth, multipart like /decode + feature_id, text_secondary, draft_text): 7 feature suffixes in llm_service (FEATURE_SUFFIXES); shared {verdict, points[{text,tone}], actions[], replies[]} schema; red_flag_check verdict clamped to 4 severity tiers server-side; replies forced [] for non-reply-capable features (only glow_up/settle_the_fight/what_should_i_do can return replies, breakup_clarity never); persists to generations with feature_id+result; shared daily counter, DAILY_LIMIT_FREE bumped 8→10"
    implemented: true
    working: true  # main agent: 401/400 unknown/400 no-input/400 glow-up-no-draft all pass; happy path with memory context returns clamped verdict + warning tones + replies stripped; generation row + counter verified in mongo; clamp+validator unit tests pass
    files: ["/app/backend/server.py", "/app/backend/llm_service.py", "/app/backend/models.py", "/app/docs/FEATURE_API_AND_PROMPTS.md"]
frontend:
  - task: "app/feature/[id].tsx: config-driven phase machine (input → staged loader → result) using src/constants/feature-config.ts; verdict glass card (rose border for red flag), tone-coloured ✦ points, numbered YOUR NEXT MOVE, I'D SEND THIS reply cards with copy, Decode footer (Save to Memory timeline entry + ✦ Ask Lovli handoff); More grid: red_flag tile → /feature/red_flag_check (other 6 still 'coming soon' until PR4b)"
    implemented: true
    working: "NA"  # main agent screenshot e2e: More → tile → input → result verified incl. 4th severity tier + support-first actions
    files: ["/app/mobile/app/feature/[id].tsx", "/app/mobile/src/constants/feature-config.ts", "/app/mobile/app/(tabs)/more.tsx", "/app/mobile/src/api/endpoints.ts"]
agent_communication:
  - agent: "main"
    message: "PR4a: only red_flag_check is wired in the More grid — other 6 tiles intentionally 'coming soon' (PR4b), do NOT report as bug. All 7 feature_ids already work via direct URL /feature/<id> and via API. Free limit is now 10/day. LLM budget: keep feature calls minimal."

## PR4b (remaining 6 tools + chained glow-up) — VERIFIED by testing agent (iteration_17, all green)
frontend:
  - task: "More grid: all 9 tiles live, zero placeholders (decode+signals → /decode, other 7 → /feature/[id]); per-feature input variants (secondary inputs for what_should_i_do/fair_verdict, required draft for glow_up); copy pass (first-person Lovli, Hinglish touches, per-feature askSuffix); chained '✦ Glow up this reply' on settle/what_should reply cards → opens glow_up prefilled (draft+person), never auto-runs; breakup_clarity: no reply card ever + closure-framed Ask Lovli handoff; user language_preference now sent on feature calls"
    implemented: true
    working: true  # iteration_17: all 9 navigations, chained flow, closure framing exact-match, 429 at 10th gen handled gracefully, honesty regex zero matches
agent_communication:
  - agent: "main"
    message: "Post-test fix: More grid ScrollView was scrollEnabled={false} clipping the last row behind the tab bar — now scrollable with paddingBottom 96. Deleted dead src/constants/more-features.ts (ids live in feature-config.ts + FEATURE_SUFFIXES). RELEASE_CHECKLIST PR4 blocker ticked. Testing agent's 'reset state on params.id change' suggestion intentionally skipped — push creates a new stack instance (verified working in chained flow)."

## PR4c (RECENT strip + copy fixes) — VERIFIED by testing agent (iteration_18, all green, 0 LLM)
backend:
  - task: "Decode results now persisted to generations (feature_id='decode'); GET /api/recent-results (last N feature/decode rows: generation_id/feature_id/verdict/created_at); GET /api/generations/{id} (owner-scoped, 404 otherwise); DELETE /api/generations (all user rows — wired into Delete my memories)"
    implemented: true
    working: true
frontend:
  - task: "More tab RECENT section (≤5 rows, tool·verdict·relative time, hidden when empty, refetch on focus); tap → read-only restore via ?gen= param on /decode and /feature/[id] (zero generation cost, back → More); Settings delete also calls DELETE /api/generations + updated sheet copy; fair_verdict points label 'BOTH SIDES, HONESTLY'; red_flag tier-aware Ask-Lovli handoff (safety suffix on tier 4)"
    implemented: true
    working: true
agent_communication:
  - agent: "main"
    message: "PR4c complete. Tier-4 handoff visually verified (Lovli responded safety-first). Post-test: generations wiped by destructive test (strip empty until new results), Ananya recreated + reseeded with rich V2 fields (id fad34d06-33b8-4b54-9e9a-8bbbf73bb491). Known cosmetic: RN-web deprecated shadow*/pointerEvents warnings."

## FINAL BACKLOG PR (notifications + Face ID + facts edit + per-person delete) — VERIFIED (iteration_19 + main-agent fix verification)
backend:
  - task: "TimelineEntry += optional date (ISO, additive, never parsed from date_label)"
    implemented: true
    working: true  # curl-verified PATCH round-trip
frontend:
  - task: "Local notifications (expo-notifications): discreet-by-default copy, 'Show details' toggle (default OFF), reminders at 9AM local from upcoming entries with real date, weekly check-in Sun 6PM, contextual permission w/ Open Settings on blocked, resync on start/toggle/add-moment/delete/logout. NATIVE-ONLY delivery → RELEASE_CHECKLIST device-verification item. Pure logic unit-tested (scripts/test-pure-logic.js 14/14)"
    implemented: true
    working: true  # web-testable parts green in iteration_19
  - task: "Face ID gate (AppLockGate + expo-local-authentication): locks on launch + background→active (NOT inactive→active), passcode fallback, retry overlay; web = no-op w/ toast. Device verification on checklist"
    implemented: true
    working: true
  - task: "Facts add/remove chips + kind picker in Edit; 'Delete this person' typed confirm (clears pending Ask Lovli ref, resyncs notifications, lands on /memory)"
    implemented: true
    working: true
agent_communication:
  - agent: "main"
    message: "Fixed iteration_19 CRITICAL fact-wipe bug (setFacts on load had been lost in an edit race — re-applied; round-trip verified via UI+API). Fixed post-delete landing (/reply bug): load effect re-ran on router identity change firing bogus 'Memory not found.'+back() — effect now keyed [mode,id] with cancelled guard; delete modal switched to fade (RN-web slide stuck offscreen on this screen). Delete e2e re-verified: sheet renders, lands /memory, list consistent. Ananya intact (3 facts)."

## PR-V2-3 (review blocker fix: emotional context + Generated surface) — implemented, needs testing agent verification
backend:
  - task: "/generate-replies: additive optional Form params feeling/intent/outcome/goal folded into both prompt builders (absent → prompt byte-identical, proven vs pre-change snapshot); rich schema += wingman_advice (soft-optional, falls back to tone_notes); new optional response object insight {temperature warm|mixed|cold, noticing[≤3], whats_going_on, wingman_advice} mapped server-side from read (read unchanged for old clients; legacy non-rich keys unchanged, curl-diff proven)"
    implemented: true
    working: true  # curl: legacy keys identical; rich returns insight + read + labels
frontend:
  - task: "reply.tsx: sends feeling/intent/outcome + goal (lovli_goal) with generation; results phase V2 surface — insight glass card (HERE'S WHAT I'M NOTICING + dot temp pill Warm amber #FFB259 / Mixed lavender / Cold blue-gray, ✦ noticing, What's really going on / If I were your wingman) → I'D SEND THIS 👇 single primary serif reply with Copy/Edit/Regenerate → OR MAKE IT… chips (Funny/Romantic/Confident/Shorter/Longer regenerate with tone hint via user_note); fallback to PR-INT ReadCard + 3 cards when insight missing"
    implemented: true
    working: "NA"  # main agent screenshot: full surface renders per spec
agent_communication:
  - agent: "main"
    message: "PR-V2-3 was the code-review blocker (never implemented; plan skipped V2-2→V2-3.1). Note: mobile/app/tabs_tmp/ does not exist anywhere (nothing to delete). Home CTA is 'Get replies', intent phase CTA testID write-it-button. Free limit 10/day, counter reset to 1 used."
