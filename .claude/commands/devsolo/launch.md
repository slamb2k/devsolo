# Launch

Start a new feature workflow. Creates a feature branch and devsolo session.

## Arguments

- `description` (optional): Description of the feature (used for branch name generation)
- `branchName` (optional): Explicit branch name to use (default: auto-generated)
- `auto` (optional): Automatically handle all prompts with recommended options (default: false)
- `verbose` (optional): Show detailed output with all sections (default: false, brief mode)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░
```

**⚠️ CRITICAL OUTPUT REQUIREMENT:** After EVERY Task tool invocation in this workflow, you MUST immediately output the complete git-droid response as text to the user. DO NOT proceed to check signals or continue to the next stage without first displaying the full output. The user needs to see all numbered options, formatted sections, and status information.

**Before starting the workflow, resolve auto mode:**
1. If `--auto` argument was provided: use that value (true or false)
2. Otherwise, read `.devsolo/config.yaml` and check for `preferences.autoMode`
3. Pass the resolved auto mode to all nested MCP tool calls and slash command invocations using `--auto:true` or `--auto:false`

**Before starting the workflow, resolve verbose mode:**
1. If `--verbose` argument was provided: use that value (true or false)
2. Otherwise, read `.devsolo/config.yaml` and check for `preferences.verboseMode`
3. If not in config, default to `false` (brief mode)
4. Pass the resolved verbose mode to all nested git-droid sub-agent invocations using `verbose=true` or `verbose=false`
5. In brief mode (verbose=false), git-droid agents should show minimal output: status indicator + result summary only
6. In verbose mode (verbose=true), git-droid agents should show all sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps

The launch workflow consists of up to four stages, each using a separate git-droid sub-agent invocation:

### Stage 1: Initialize Launch Workflow

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Initialising launch workflow..."
   - **prompt:** "Initialize the launch workflow with the following parameters: [pass all user arguments]. You must:
     - Check if on main branch
     - Check if main is up to date with remote
     - Check for uncommitted changes using `git status`
     - Check for existing active session
     - Report all findings
     - If uncommitted changes detected: Present numbered options:
       1. Move changes to feature branch [RECOMMENDED]
       2. Discard changes
       3. Abort launch
     - NOTE: If uncommitted changes are unrelated to the new feature, user should abort, launch current work as a feature first, then use /devsolo:swap to switch to new work
     - If existing session detected: Present numbered options:
       1. Abort existing session [RECOMMENDED]
       2. Keep both sessions
       3. Abort launch
     - If both issues detected: Present combined options handling both
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks, Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: HANDLE_CHANGES' (uncommitted changes detected)
       * 'Next Stage: HANDLE_SESSION' (existing session detected, no changes)
       * 'Next Stage: HANDLE_BOTH' (both issues detected)
       * 'Next Stage: CREATE_BRANCH' (clean state, ready to launch)
       * 'Next Stage: ABORTED' (user cancelled or not on main/out of sync)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, numbered options, Result Summary
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: HANDLE_CHANGES', proceed to Stage 2 (Handle Uncommitted Changes)
   - If 'Next Stage: HANDLE_SESSION', skip to Stage 3 (Handle Existing Session)
   - If 'Next Stage: HANDLE_BOTH', proceed to Stage 2 then Stage 3
   - If 'Next Stage: CREATE_BRANCH', skip to Stage 4 (Create Feature Branch)
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 2: Handle Uncommitted Changes (Conditional)

Only execute this stage if Stage 1 returned 'HANDLE_CHANGES' or 'HANDLE_BOTH'.

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Handling uncommitted changes..."
   - **prompt:** "Handle uncommitted changes based on user's choice from Stage 1. You must:
     - If user chose move changes (option 1): Changes will be auto-stashed and restored on feature branch (no action needed in this stage, proceed to next stage)
     - If user chose discard (option 2): Force clean working directory (git reset --hard)
     - Verify action succeeded
     - Check again if existing session exists (for HANDLE_BOTH case)
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: HANDLE_SESSION' (if existing session also detected)
       * 'Next Stage: CREATE_BRANCH' (if no session conflict)
       * 'Next Stage: ABORTED' (if action failed)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Operations Executed, Post-flight Verifications, Result Summary
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: HANDLE_SESSION', proceed to Stage 3 (Handle Existing Session)
   - If 'Next Stage: CREATE_BRANCH', skip to Stage 4 (Create Feature Branch)
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 3: Handle Existing Session (Conditional)

Only execute this stage if Stage 1 or 2 returned 'HANDLE_SESSION'.

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Handling existing session..."
   - **prompt:** "Handle existing session based on user's choice from Stage 1. You must:
     - If user chose abort session: Use SlashCommand tool to invoke `/devsolo:abort`
     - If user chose keep both: Continue to CREATE_BRANCH
     - Verify session handling succeeded
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: CREATE_BRANCH' (session handled successfully)
       * 'Next Stage: ABORTED' (user cancelled or abort failed)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Operations Executed, Post-flight Verifications, Result Summary
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

3. **Check the response** for the "Next Stage:" directive in Result Summary:
   - If 'Next Stage: CREATE_BRANCH', proceed to Stage 4 (Create Feature Branch)
   - If 'Next Stage: ABORTED', terminate workflow

### Stage 4: Create Feature Branch

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Creating feature branch..."
   - **prompt:** "Create the feature branch with the following parameters: [pass all user arguments]. You must:
     - Generate branch name from description if not provided (follow branch name generation rules)
     - Call `mcp__devsolo__devsolo_launch` MCP tool with branch name and description
     - Create feature branch
     - Create session
     - Checkout to new branch
     - Format results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Operations Executed, Post-flight Verifications, Result Summary, Next Steps
     - IMPORTANT: In your Result Summary section, include EXACTLY one of:
       * 'Next Stage: COMPLETED' (launch successful)"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed

**Output Formatting:** Each git-droid stage handles its own output formatting following the git-droid output style

## Launch Workflow Details

The launch command orchestrates up to four distinct stages:

### Stage 1: Initialising launch workflow...

**Purpose:** Pre-flight checks and issue detection

**Operations:**
- Check if on main branch
- Check if main is up to date with remote
- Check for uncommitted changes
- Check for existing active session
- Report all findings
- Present context-appropriate numbered options
- Return signal for next stage decision

**Output:**
- Pre-flight Checks section
- Result Summary
- Signal: Next Stage: HANDLE_CHANGES | HANDLE_SESSION | HANDLE_BOTH | CREATE_BRANCH | ABORTED

### Stage 2: Handling uncommitted changes... (Conditional)

**Purpose:** Resolve uncommitted changes before launch

**When Executed:** Only if Stage 1 returned HANDLE_CHANGES or HANDLE_BOTH

**Operations:**
- Execute user's choice (move to feature branch / discard)
- If move to feature: No action needed (MCP tool auto-stashes and pops)
- If discard: Force clean working directory (git reset --hard)
- Verify action succeeded
- Check again if existing session exists

**Note:** If uncommitted changes are unrelated to the new feature, user should abort and use /devsolo:swap workflow instead (launch current work first, then swap to new work)

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Signal: Next Stage: HANDLE_SESSION | CREATE_BRANCH | ABORTED

### Stage 3: Handling existing session... (Conditional)

**Purpose:** Resolve existing session conflict

**When Executed:** Only if Stage 1 or 2 returned HANDLE_SESSION

**Operations:**
- If user chose abort: Invoke `/devsolo:abort` via SlashCommand
- If user chose keep both: Continue to create new session
- Verify session handling succeeded

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Signal: Next Stage: CREATE_BRANCH | ABORTED

### Stage 4: Creating feature branch...

**Purpose:** Create feature branch and session

**Operations:**
- Generate branch name from description if not provided
- Call `mcp__devsolo__devsolo_launch` MCP tool
- Create feature branch
- Create devsolo session
- Checkout to new branch

**Output:**
- Operations Executed section
- Post-flight Verifications
- Result Summary
- Next Steps
- Signal: Next Stage: COMPLETED

## Branch Name Generation Rules

When generating branch name from description:
- **feature/** - New features or enhancements (default)
- **fix/** - Bug fixes (if description contains "fix", "bug", "issue")
- **docs/** - Documentation changes (if description contains "doc", "documentation", "readme")
- **refactor/** - Code refactoring (if description contains "refactor", "restructure", "reorganize")
- **test/** - Test additions (if description contains "test", "testing")
- **chore/** - Maintenance tasks (if description contains "chore", "maintenance", "dependency")

Examples:
- "Add user authentication" → feature/add-user-authentication
- "Fix login bug" → fix/login-bug
- "Update README" → docs/update-readme
- "Refactor auth module" → refactor/auth-module

## Examples

```
# Launch with explicit branch name
/devsolo:launch --branchName="feature/my-feature"

# Launch with description (branch name auto-generated)
/devsolo:launch --description="Add user authentication system"

# Launch with auto mode (no prompts)
/devsolo:launch --description="Fix login bug" --auto
```

## Notes

- Requires being on main branch with clean working directory (or will guide you to fix)
- Will abort any existing session on current branch
- Creates both git branch and devsolo session
- Checks out to the new branch automatically
