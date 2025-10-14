# Launch

Start a new feature workflow. Creates a feature branch and devsolo session.

## Arguments

- `description` (optional): Description of the feature (used for branch name generation)
- `branchName` (optional): Explicit branch name to use (default: auto-generated)
- `auto` (optional): Automatically handle all prompts with recommended options (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░
```

1. **Use the Task tool** to invoke the git-droid sub-agent:
   - **subagent_type:** "git-droid"
   - **description:** "Coordinate launch workflow"
   - **prompt:** "Execute the launch workflow with the following parameters: [pass all user arguments]. You must:
     - Analyze current git state (check if on main, clean working directory)
     - Handle uncommitted changes (present numbered options if present)
     - Handle existing session (offer to abort using SlashCommand tool to invoke `/devsolo:abort`)
     - Generate branch name if not provided (from description, diff analysis, or timestamp)
     - Call `mcp__devsolo__devsolo_launch` MCP tool with appropriate parameters
     - Format all results following git-droid output style from `.claude/output-styles/git-droid.md`
     - Include these sections: Pre-flight Checks, Operations Executed, Post-flight Verifications, Result Summary, Next Steps
     - Present numbered options for user choices with [RECOMMENDED] marker when needed"

2. git-droid will execute the workflow and return formatted results

**Output Formatting:** git-droid handles all output formatting including:
- Pre-flight Checks section
- Operations Executed section
- Post-flight Verifications section
- Result Summary section
- Next Steps section
- Numbered options for user choices (with [RECOMMENDED] marker)

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
