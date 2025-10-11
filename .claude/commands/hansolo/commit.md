# Commit

Commit changes to the current feature branch with an auto-generated or custom message.

## Arguments

- `message` (optional): Custom commit message (default: auto-generated using conventional commits)
- `stagedOnly` (optional): Only commit staged files, not all changes (default: false)
- `auto` (optional): Automatically use recommended options (default: false)

## Workflow

1. **Invoke git-droid sub-agent** to coordinate the commit workflow
2. git-droid will:
   - Verify active session exists (guide to /hansolo launch if not)
   - Verify there are changes to commit
   - Generate commit message if not provided:
     - Analyze `git diff` to understand changes
     - Identify changed files and their purposes
     - Apply **Conventional Commits** format: `<type>(<scope>): <description>`
     - Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
     - Infer type from changes (new files = feat, bug fixes = fix, docs = docs, etc)
   - **Display the following banner immediately before calling the MCP tool:**

```
░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░
```

   - Call `mcp__hansolo__hansolo_commit` with message and stagedOnly flag
   - Report results following git-droid output style

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
/hansolo commit

# Commit with custom message
/hansolo commit --message="feat(auth): add OAuth2 support"

# Commit only staged files
/hansolo commit --stagedOnly

# Commit staged files with custom message
/hansolo commit --message="fix(auth): resolve token expiry bug" --stagedOnly
```

## Notes

- Requires an active han-solo session (use /hansolo launch first)
- Updates session state to CHANGES_COMMITTED
- When stagedOnly=true, only commits files added with `git add`
- When stagedOnly=false (default), stages and commits all changes
- Follows repository commit conventions
- Adds han-solo footer to commit automatically
