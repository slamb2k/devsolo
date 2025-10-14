# Launch

Start a new feature workflow. Creates a feature branch and devsolo session.

## Arguments

- `description` (optional): Description of the feature (used for branch name generation)
- `branchName` (optional): Explicit branch name to use (default: auto-generated)
- `auto` (optional): Automatically handle all prompts with recommended options (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow**

```
░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░
```
1. **Invoke git-droid sub-agent** to coordinate the launch workflow
2. git-droid will:
   - Analyze current git state (check if on main, clean working directory)
   - Handle uncommitted changes:
     - If present: Ask user "You have uncommitted changes. Would you like to: (a) bring them, (b) discard them, (c) cancel?"
     - If (a) stash: Stash changes so that they can be popped in the new session
     - If (b) discard: Don't keep the changes and launch a fresh session
     - If (c) cancel: Exit without launching
   - Handle existing session (offer to abort using SlashCommand tool to invoke `/devsolo:abort`)
   - Generate branch name if not provided:
     - From description → convert to kebab-case with appropriate prefix (feature/, fix/, docs/, etc)
     - From uncommitted changes → analyze diff to infer purpose
     - Fallback to timestamp → feature/YYYY-MM-DD-HHMMSS
   - Call `mcp__devsolo__devsolo_launch` with appropriate parameters
   - Report results following git-droid output style

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
/devsolo launch --branchName="feature/my-feature"

# Launch with description (branch name auto-generated)
/devsolo launch --description="Add user authentication system"

# Launch with auto mode (no prompts)
/devsolo launch --description="Fix login bug" --auto
```

## Notes

- Requires being on main branch with clean working directory (or will guide you to fix)
- Will abort any existing session on current branch
- Creates both git branch and devsolo session
- Checks out to the new branch automatically
