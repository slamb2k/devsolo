# Commit

Commit changes to the current feature branch with an auto-generated or custom message.

## Arguments

- `message` (optional): Custom commit message (default: auto-generated using conventional commits)
- `stagedOnly` (optional): Only commit staged files, not all changes (default: false)
- `auto` (optional): Automatically use recommended options (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░
```

**⚠️ CRITICAL OUTPUT REQUIREMENT:** After invoking the Task tool, you MUST immediately output the complete git-droid response as text to the user. DO NOT add commentary, summaries, or interpretations. The user needs to see all formatted sections and status information exactly as git-droid returns them.

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Coordinate commit workflow"
   - **prompt:** "Execute the commit workflow with the following parameters: [pass all user arguments]. You must:
     - Verify active session exists (guide to /devsolo:launch if not)
     - Verify there are changes to commit
     - Generate commit message if not provided (analyze git diff, apply Conventional Commits format)
     - Call `mcp__devsolo__devsolo_commit` MCP tool with message and stagedOnly flag
     - Format all results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps"

2. **⬆️ OUTPUT the complete git-droid response above as text to the user**
   - Display the ENTIRE formatted output exactly as git-droid returned it
   - Include ALL sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
   - Do NOT summarize, skip sections, or add commentary
   - The user MUST see this output before you proceed
   - Do NOT intercept or modify the output
   - The user needs to see the options and formatted sections directly

**Output Formatting:** git-droid handles all output formatting including:
- Pre-flight Checks section
- Operations Executed section
- Post-flight Verifications section
- Result Summary section
- Next Steps section

## Commit Message Generation Rules

### Type Detection
- **feat**: New features (new files, new functions, new capabilities)
- **fix**: Bug fixes (fixes in existing code, error handling)
- **docs**: Documentation (*.md files, comments, README)
- **style**: Code style (formatting, whitespace, no logic changes)
- **refactor**: Refactoring (restructuring without changing behavior)
- **perf**: Performance improvements
- **test**: Test additions or modifications
- **chore**: Maintenance (dependencies, build config, tooling)
- **ci**: CI/CD changes (.github/workflows, CI configs)
- **build**: Build system changes (package.json, webpack, etc)

### Scope Detection
Infer scope from changed files:
- src/auth/* → scope: auth
- src/api/* → scope: api
- docs/* → scope: docs
- tests/* → scope: test

### Description Generation
- Start with verb (add, implement, fix, update, remove, etc)
- Be concise (50 chars or less preferred)
- Describe WHAT changed, not HOW
- Use imperative mood ("add feature" not "added feature")

## Examples

### Auto-generated message example:
```
Changes:
- src/auth/login.ts (new file, +45 lines)
- src/auth/index.ts (modified, +12 -3)
- src/auth/auth.test.ts (new file, +89 lines)

Generated message: feat(auth): implement user authentication system
```

### Usage examples:
```
# Commit with auto-generated message
/devsolo:commit

# Commit with custom message
/devsolo:commit --message="feat(auth): add OAuth2 support"

# Commit only staged files
/devsolo:commit --stagedOnly

# Commit staged files with custom message
/devsolo:commit --message="fix(auth): resolve token expiry bug" --stagedOnly
```

## Notes

- Requires an active devsolo session (use /devsolo:launch first)
- Updates session state to CHANGES_COMMITTED
- When stagedOnly=true, only commits files added with `git add`
- When stagedOnly=false (default), stages and commits all changes
- Follows repository commit conventions
- Adds devsolo footer to commit automatically
