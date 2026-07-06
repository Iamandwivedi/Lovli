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
