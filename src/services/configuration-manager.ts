import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { Configuration } from '../models/configuration';
import { Logger, LogLevel } from './logger';

export class ConfigurationManager {
  private configPath: string;
  private config: Configuration | null = null;
  private fileWatcher: any | null = null;

  constructor(basePath: string = '.devsolo') {
    // Always resolve relative to current working directory
    const resolvedBasePath = path.resolve(process.cwd(), basePath);
    this.configPath = path.join(resolvedBasePath, 'config.yaml');
  }

  async load(): Promise<Configuration> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const parsed = yaml.parse(data);
      this.config = Configuration.fromJSON(parsed);

      // Configure logger based on preferences
      this.configureLogger(this.config);

      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config doesn't exist yet, return default
        this.config = Configuration.getDefault();
        this.configureLogger(this.config);
        return this.config;
      }
      throw error;
    }
  }

  /**
   * Configure global logger based on config preferences
   */
  private configureLogger(config: Configuration): void {
    const logger = Logger.getInstance();

    // Map config log level to logger log level
    const logLevelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      none: LogLevel.NONE,
    };

    const level = config.preferences.logLevel
      ? logLevelMap[config.preferences.logLevel] ?? LogLevel.WARN
      : LogLevel.WARN;

    // Configure logger
    logger.configure({
      level,
      logFile: config.preferences.logFile,
      includeTimestamp: true,
      includeLevel: true,
    });
  }

  async save(config?: Configuration): Promise<void> {
    const configToSave = config || this.config;
    if (!configToSave) {
      throw new Error('No configuration to save');
    }

    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });

    const data = yaml.stringify(configToSave.toJSON());

    // Write atomically
    const tempFile = `${this.configPath}.tmp`;
    await fs.writeFile(tempFile, data);
    await fs.rename(tempFile, this.configPath);

    this.config = configToSave;
  }

  // Alias for load to match MCP tool expectations
  async loadConfig(): Promise<Configuration> {
    return this.load();
  }

  // Alias for save to match MCP tool expectations
  async saveConfig(config: Configuration): Promise<void> {
    return this.save(config);
  }

  // Additional aliases for commands
  async loadConfiguration(): Promise<Configuration> {
    return this.load();
  }

  async saveConfiguration(config: Configuration): Promise<void> {
    return this.save(config);
  }

  async createDefaultConfiguration(): Promise<Configuration> {
    return Configuration.getDefault();
  }

  async initialize(): Promise<Configuration> {
    const existingConfig = await this.exists();

    if (existingConfig) {
      throw new Error('Configuration already exists. Use "devsolo config" to modify.');
    }

    const config = new Configuration({
      initialized: true,
      scope: 'project',
      version: '1.0.0',
    });

    await this.save(config);

    // Create marker file
    const markerPath = path.join(path.dirname(this.configPath), 'devsolo.yaml');
    await fs.writeFile(markerPath, `# devsolo project marker file
# This file indicates that devsolo has been initialized in this project
version: 1.0.0
initialized: true
created: ${new Date().toISOString()}
`);

    return config;
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  async isInitialized(): Promise<boolean> {
    const markerPath = path.join(path.dirname(this.configPath), 'devsolo.yaml');
    try {
      await fs.access(markerPath);
      return true;
    } catch {
      return false;
    }
  }

  async validate(): Promise<boolean> {
    if (!await this.isInitialized()) {
      throw new Error('devsolo not initialized. Run "/devsolo:init" first.');
    }

    const config = await this.load();
    const errors = config.validate();

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  async getInstallPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getInstallPath();
  }

  async getSessionsPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getSessionsPath();
  }

  async getAuditPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getAuditPath();
  }

  async getHooksPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getHooksPath();
  }

  async getTemplatesPath(): Promise<string> {
    const config = this.config || await this.load();
    return config.getTemplatesPath();
  }

  async updatePreferences(preferences: Partial<typeof Configuration.prototype.preferences>): Promise<Configuration> {
    const config = await this.load();
    config.preferences = {
      ...config.preferences,
      ...preferences,
    };
    await this.save(config);
    return config;
  }

  async updateGitPlatform(platform: typeof Configuration.prototype.gitPlatform): Promise<Configuration> {
    const config = await this.load();
    config.gitPlatform = platform;
    await this.save(config);
    return config;
  }

  async enableComponent(component: keyof typeof Configuration.prototype.components): Promise<Configuration> {
    const config = await this.load();
    config.components[component] = true;
    await this.save(config);
    return config;
  }

  async disableComponent(component: keyof typeof Configuration.prototype.components): Promise<Configuration> {
    const config = await this.load();

    if (component === 'mpcServer') {
      throw new Error('Cannot disable MCP Server - it is required for devsolo to function');
    }

    config.components[component] = false;
    await this.save(config);
    return config;
  }

  async watchForChanges(callback: (config: Configuration) => void): Promise<void> {
    if (this.fileWatcher) {
      await this.stopWatching();
    }

    // Use fs.watch for file changes
    const fs = await import('fs');
    this.fileWatcher = fs.watch(this.configPath, async (eventType) => {
      if (eventType === 'change') {
        try {
          const config = await this.load();
          callback(config);
        } catch (error) {
          console.error('Error reloading config:', error);
        }
      }
    });
  }

  async stopWatching(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
  }

  async getGitPlatformToken(): Promise<string | null> {
    const config = await this.load();

    if (!config.gitPlatform?.token) {
      // Try to get from environment variables
      const platform = config.gitPlatform?.type;

      if (platform === 'github') {
        return process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN'] || null;
      } else if (platform === 'gitlab') {
        return process.env['GITLAB_TOKEN'] || process.env['GL_TOKEN'] || null;
      }
    }

    return config.gitPlatform?.token || null;
  }

  async installHooks(): Promise<void> {
    const hooksPath = await this.getHooksPath();
    await fs.mkdir(hooksPath, { recursive: true });

    // Pre-commit hook
    const preCommitHook = `#!/bin/bash
# devsolo pre-commit hook
# Enforces workflow and runs quality checks

# Check for active devsolo session on current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
SESSION_ID=""
if [ -d ".devsolo/sessions" ] && [ -n "$CURRENT_BRANCH" ]; then
  for session_file in .devsolo/sessions/*.json; do
    [ -f "$session_file" ] || continue
    BRANCH_NAME=$(jq -r '.branchName // empty' "$session_file" 2>/dev/null)
    if [ "$BRANCH_NAME" == "$CURRENT_BRANCH" ]; then
      SESSION_ID=$(basename "$session_file" .json)
      SESSION_STATE=$(jq -r '.currentState' "$session_file" 2>/dev/null)
      if [ "$SESSION_STATE" != "COMPLETE" ] && [ "$SESSION_STATE" != "ABORTED" ]; then
        echo "❌ devsolo session active on this branch!"
        echo "📝 Use '/devsolo:commit' to commit changes"
        echo "   Or use '/devsolo:abort' to exit the workflow"
        exit 1
      fi
      break
    fi
  done
fi

# Prevent direct commits to main/master branches
branch=$(git branch --show-current)
if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "❌ Direct commits to $branch are not allowed!"
  echo "Use '/devsolo:launch' to create a feature branch"
  exit 1
fi

# Run linting (fail on errors only, not warnings)
echo "🔍 Running linter..."
lint_output=$(npm run lint 2>&1)
if echo "$lint_output" | grep -qE "✖ [0-9]+ problems \\([1-9][0-9]* error"; then
  echo "❌ Lint check failed with errors!"
  echo "Run 'npm run lint' to see errors"
  exit 1
else
  echo "✅ Lint check passed"
fi

# Run type checking
echo "🔍 Running type check..."
if npm run build > /dev/null 2>&1; then
  echo "✅ Type check passed"
else
  echo "❌ Type check failed!"
  echo "Run 'npm run build' to see errors"
  exit 1
fi

exit 0
`;

    await fs.writeFile(path.join(hooksPath, 'pre-commit'), preCommitHook, { mode: 0o755 });

    // Pre-push hook
    const prePushHook = `#!/bin/bash
# devsolo pre-push hook
# Validates branch state and runs tests before pushing

# Check for active devsolo session on current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
SESSION_ID=""
if [ -d ".devsolo/sessions" ] && [ -n "$CURRENT_BRANCH" ]; then
  for session_file in .devsolo/sessions/*.json; do
    [ -f "$session_file" ] || continue
    BRANCH_NAME=$(jq -r '.branchName // empty' "$session_file" 2>/dev/null)
    if [ "$BRANCH_NAME" == "$CURRENT_BRANCH" ]; then
      SESSION_ID=$(basename "$session_file" .json)
      SESSION_STATE=$(jq -r '.currentState' "$session_file" 2>/dev/null)
      if [ "$SESSION_STATE" != "COMPLETE" ] && [ "$SESSION_STATE" != "ABORTED" ]; then
        echo "❌ devsolo session active on this branch!"
        echo "📝 Use '/devsolo:ship' to push changes"
        echo "   Or complete the workflow with '/devsolo:ship'"
        exit 1
      fi
      break
    fi
  done
fi

branch=$(git branch --show-current)

if [[ "$branch" == "main" || "$branch" == "master" ]]; then
  echo "❌ Direct pushes to $branch are not allowed!"
  exit 1
fi

# Run tests before pushing
echo "🧪 Running tests..."
if npm test > /dev/null 2>&1; then
  echo "✅ All tests passed"
else
  echo "❌ Tests failed!"
  echo "Run 'npm test' to see failures"
  exit 1
fi

echo "✅ Push validation passed"
exit 0
`;

    await fs.writeFile(path.join(hooksPath, 'pre-push'), prePushHook, { mode: 0o755 });

    // Link hooks to Git
    const gitHooksPath = path.join('.git', 'hooks');
    try {
      await fs.symlink(path.join('..', '..', hooksPath, 'pre-commit'), path.join(gitHooksPath, 'pre-commit'));
      await fs.symlink(path.join('..', '..', hooksPath, 'pre-push'), path.join(gitHooksPath, 'pre-push'));
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async installClaudeGuidance(): Promise<void> {
    const MARKER_START = '<!-- BEGIN DEVSOLO MANAGED SECTION - DO NOT EDIT -->';
    const MARKER_END = '<!-- END DEVSOLO MANAGED SECTION -->';

    // Read existing CLAUDE.md if it exists
    let existingContent = '';
    try {
      existingContent = await fs.readFile('CLAUDE.md', 'utf-8');
    } catch (error) {
      // File doesn't exist yet, that's fine
    }

    // Check if markers already exist
    if (existingContent.includes(MARKER_START)) {
      // Replace content between markers
      const before = existingContent.substring(0, existingContent.indexOf(MARKER_START));
      const after = existingContent.substring(existingContent.indexOf(MARKER_END) + MARKER_END.length);

      const updatedContent = `${before}${MARKER_START}
${this.getDevSoloSection()}
${MARKER_END}${after}`;

      await fs.writeFile('CLAUDE.md', updatedContent);
    } else {
      // Add marked section to existing content or create new file
      const newContent = existingContent
        ? `${existingContent}\n\n${MARKER_START}\n${this.getDevSoloSection()}\n${MARKER_END}`
        : `# CLAUDE.md\n\nThis file provides guidance to Claude Code when working with this repository.\n\n${MARKER_START}\n${this.getDevSoloSection()}\n${MARKER_END}`;

      await fs.writeFile('CLAUDE.md', newContent);
    }
  }

  private getDevSoloSection(): string {
    return `
## 🚀 devsolo Git Workflow Management

This section is automatically managed by devsolo. Last updated: ${new Date().toISOString()}

### IMPORTANT: Always Use Slash Commands for devsolo Operations

When working with devsolo workflows, **ALWAYS use slash commands** instead of calling MCP tools directly:

✅ **CORRECT**: Use \`SlashCommand\` tool
- \`/devsolo:launch\` - Start new feature workflow
- \`/devsolo:commit\` - Commit changes
- \`/devsolo:ship\` - Push, create PR, and merge
- \`/devsolo:hotfix\` - Create emergency hotfix
- \`/devsolo:swap\` - Switch between workflow sessions
- \`/devsolo:abort\` - Abort current workflow
- \`/devsolo:cleanup\` - Clean up expired sessions

❌ **INCORRECT**: Direct MCP tool calls (e.g., \`mcp__devsolo__devsolo_launch\`)

**Why slash commands?**
Slash commands provide essential context that MCP tools need:
- Load configuration (autoMode, verboseMode) from .devsolo/config.yaml
- Provide commit message guidance and PR description templates
- Set up proper workflow context and instructions
- Ensure consistent behavior across operations

**Exception**: Read-only query tools can be called directly:
- \`devsolo_info\` - Show current workflow information
- \`devsolo_sessions\` - List workflow sessions

### Workflow Detection

Before performing git operations, check for active devsolo session on current branch:

\`\`\`javascript
// Check if devsolo is managing current branch
const currentBranch = execSync('git branch --show-current').toString().trim();

// Scan session files to find one matching current branch
if (fs.existsSync('.devsolo/sessions')) {
  const files = fs.readdirSync('.devsolo/sessions');
  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const sessionPath = \`.devsolo/sessions/\${file}\`;
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));

    if (session.branchName === currentBranch &&
        session.currentState !== 'COMPLETE' &&
        session.currentState !== 'ABORTED') {
      // devsolo is active on this branch - MUST use MCP tools
      return 'use-devsolo-mcp';
    }
  }
}
// No active session on current branch - can use standard git
return 'use-standard-git';
\`\`\`

### ⛔ When devsolo Session is Active

If an active session exists for the current branch, **NEVER** use these commands:
- \`git commit\` → Use \`/devsolo:ship\` instead
- \`git push\` → Use \`/devsolo:ship --push\` instead
- \`gh pr create\` → Use \`/devsolo:ship --create-pr\` instead
- \`git checkout -b\` → Use \`/devsolo:launch\` instead
- \`git rebase\` → devsolo handles this automatically

### ✅ When No Session Exists

If no active session exists for the current branch:
- Safe to use standard git commands
- Can optionally start devsolo workflow with \`/devsolo:launch\`
- Direct git operations won't conflict with devsolo
- Other branches may have active sessions (devsolo supports concurrent workflows)

### Why This Enforcement?

devsolo maintains a state machine tracking:
- Linear history enforcement
- Automatic rebasing and conflict resolution
- PR readiness validation
- Workflow audit trail

Direct git operations bypass this state tracking and will cause workflow corruption.

### Team Collaboration

- **With devsolo**: Follow session-based rules above
- **Without devsolo**: Use standard git workflow
- **Mixed teams**: Both can work simultaneously using session detection

## 📚 Documentation Guidelines

When creating or updating documentation, follow the structure defined in \`docs/README.md\`.

### Folder Structure

- **\`docs/guides/\`** - User-facing how-to documentation (installation, quickstart, usage, troubleshooting, integrations)
- **\`docs/reference/\`** - External references and AI context (cached external docs, repomix snapshots)
- **\`docs/dev/system/\`** - Internal system documentation (source of truth for generating user docs)
- **\`docs/dev/plans/\`** - Implementation plans, task lists, roadmaps
- **\`docs/dev/reports/\`** - Bug reports, reviews, implementation summaries
- **\`docs/dev/learnings/\`** - Reusable patterns, strategies, best practices
- **\`docs/specs/\`** - Product specifications and design philosophy
- **\`docs/archive/\`** - Superseded or historical documentation

### Naming Conventions

Always use **lowercase-with-hyphens.md** format:

\`\`\`
✅ CORRECT: quickstart.md, mcp-integration.md, feature-plan.md
❌ INCORRECT: QuickStart.md, mcp_integration.md, Feature Plan.md
\`\`\`

For dated snapshots: \`repomix-2025-10-09.md\`, \`export-2025-01-15.md\`

### Placement Rules

**Before creating documentation**, read \`docs/README.md\` for the complete decision tree. Quick guide:

- **User guides** (how-to for end users) → \`docs/guides/\`
- **External references** (cached external docs, repomix snapshots) → \`docs/reference/\`
- **Internal system docs** (APIs, commands, config schema) → \`docs/dev/system/\`
- **Implementation plans** → \`docs/dev/plans/\`
- **Bug reports, reviews** → \`docs/dev/reports/\`
- **Patterns, learnings** → \`docs/dev/learnings/\`
- **Product specs** → \`docs/specs/\`
- **Completed/superseded docs** → \`docs/archive/\`

### Using the /devsolo:docs Command

The \`/devsolo:docs\` slash command has two modes:

**AUDIT MODE** (no arguments): \`/devsolo:docs\`
- Scans all documentation for naming and placement issues
- Checks for missing README.md entries
- Identifies documents that should be archived
- Offers to fix issues automatically
- Updates all README.md files
- Reports all findings and actions

**CREATE MODE** (with content): \`/devsolo:docs <name> <content>\`
- Analyzes your content to determine correct placement
- Applies naming conventions automatically
- Updates relevant README.md files
- Archives superseded documents
- Reports all actions taken

### Priming Claude Code

Use \`/devsolo:prime\` to quickly give Claude Code context about the codebase:
- Reads README.md and docs/README.md
- Provides overview of project structure
- Helps Claude Code understand documentation organization before making changes

### Maintaining READMEs

When adding significant documentation:
1. Create the document in the appropriate folder
2. Update that folder's README.md with an entry
3. Link related documents for cross-references
`;
  }

  async removeClaudeGuidance(): Promise<void> {
    try {
      const content = await fs.readFile('CLAUDE.md', 'utf-8');
      const MARKER_START = '<!-- BEGIN DEVSOLO MANAGED SECTION - DO NOT EDIT -->';
      const MARKER_END = '<!-- END DEVSOLO MANAGED SECTION -->';

      if (content.includes(MARKER_START)) {
        const before = content.substring(0, content.indexOf(MARKER_START));
        const after = content.substring(content.indexOf(MARKER_END) + MARKER_END.length);

        const cleaned = `${before}${after}`.trim();

        if (cleaned) {
          await fs.writeFile('CLAUDE.md', cleaned);
        } else {
          // File would be empty, remove it
          await fs.unlink('CLAUDE.md');
        }
      }
    } catch {
      // File doesn't exist, nothing to remove
    }
  }

  async installTemplates(): Promise<void> {
    const templatesPath = await this.getTemplatesPath();
    await fs.mkdir(templatesPath, { recursive: true });

    // Commit message template
    const commitTemplate = `# <type>: <subject>

# <body>

# <footer>

# Type should be one of: feat, fix, docs, style, refactor, test, chore
# Subject: imperative mood, max 50 chars
# Body: explain what and why, not how
# Footer: references to issues, breaking changes
`;

    await fs.writeFile(path.join(templatesPath, 'commit-message.txt'), commitTemplate);

    // PR template
    const prTemplate = `## Summary
<!-- Brief description of changes -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No merge conflicts

## Related Issues
<!-- Link to related issues -->
Closes #
`;

    await fs.writeFile(path.join(templatesPath, 'pull-request.md'), prTemplate);
  }

  async installClaudeCodeSettings(scope: 'local' | 'team'): Promise<void> {
    const claudePath = '.claude';
    await fs.mkdir(claudePath, { recursive: true });

    const settingsFile = scope === 'local' ? 'settings.local.json' : 'settings.json';
    const settingsPath = path.join(claudePath, settingsFile);

    // Get absolute path to statusline.sh
    const statusLineScriptPath = path.resolve(claudePath, 'statusline.sh');

    const settings = {
      statusLine: {
        type: 'command',
        command: statusLineScriptPath,
        padding: 0,
      },
    };

    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }

  async installStatusLine(): Promise<void> {
    const statusLinePath = '.claude';
    await fs.mkdir(statusLinePath, { recursive: true });

    const statusLineScript = `#!/bin/bash

# DevSolo Status Line Script
# Outputs current devsolo session status for Claude Code status line

# ANSI Color Codes
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
BLUE='\\033[0;34m'
MAGENTA='\\033[0;35m'
CYAN='\\033[0;36m'
GRAY='\\033[0;90m'
BOLD='\\033[1m'
RESET='\\033[0m'

# Read JSON input from Claude Code (optional, contains session info)
INPUT=$(cat)

# Extract working directory from JSON input if available
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

# Extract context/token information from transcript
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
TOKEN_USED="0"  # Default to 0 to show "Pending..." when no transcript data available
TOKEN_TOTAL=200000  # Claude Code's standard context window
TOKEN_BUDGET=""

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Get context length from the MOST RECENT message (inspired by ccstatusline)
  # Context = input_tokens + cache_read_input_tokens + cache_creation_input_tokens
  # This represents the actual context window size including cached content
  TOKEN_USED=$(tail -1 "$TRANSCRIPT_PATH" | jq '.message.usage | (.input_tokens + (.cache_read_input_tokens // 0) + (.cache_creation_input_tokens // 0))' 2>/dev/null)

  # If transcript is empty or extraction failed, default to 0 to show "Pending..." state
  if [ "$TOKEN_USED" = "null" ] || [ -z "$TOKEN_USED" ]; then
    TOKEN_USED="0"
  fi
fi

# Change to workspace directory if provided
if [ -n "$CWD" ]; then
  cd "$CWD" 2>/dev/null || true
fi

# Read current git branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-branch")

# Check for active devsolo session on current branch
SESSION_DIR=".devsolo/sessions"
SESSION_FILE=""
SESSION_ID=""
SESSION_STATE=""

if [ -d "$SESSION_DIR" ]; then
  # Find session for current branch
  for session in "$SESSION_DIR"/*.json; do
    if [ -f "$session" ]; then
      SESSION_BRANCH=$(jq -r '.branchName // empty' "$session" 2>/dev/null)
      if [ "$SESSION_BRANCH" = "$BRANCH" ]; then
        SESSION_FILE="$session"
        SESSION_ID=$(jq -r '.id // empty' "$session" 2>/dev/null)
        SESSION_STATE=$(jq -r '.currentState // empty' "$session" 2>/dev/null)
        break
      fi
    fi
  done
fi

# Function to create a bar graph
create_bar() {
  local used=$1
  local total=$2
  local width=10

  if [ -z "$used" ] || [ -z "$total" ] || [ "$total" -eq 0 ]; then
    echo ""
    return
  fi

  local percentage=$((used * 100 / total))
  local filled=$((used * width / total))

  # Choose color based on usage
  local bar_color=""
  if [ $percentage -lt 50 ]; then
    bar_color="$GREEN"
  elif [ $percentage -lt 80 ]; then
    bar_color="$YELLOW"
  else
    bar_color="$RED"
  fi

  # Build the bar
  local bar="\${bar_color}"
  for ((i=0; i<filled; i++)); do
    bar+="█"
  done
  bar+="\${GRAY}"
  for ((i=filled; i<width; i++)); do
    bar+="░"
  done
  bar+="\${RESET}"

  echo -e " \${bar} \${percentage}%"
}

# Build status line
if [ -n "$SESSION_ID" ]; then
  # Active session found
  SHORT_ID="\${SESSION_ID:0:8}"

  # Color/emoji based on state
  state_color=""
  case "$SESSION_STATE" in
    "COMPLETE")
      EMOJI="✅"
      state_color="$GREEN"
      ;;
    "ABORTED")
      EMOJI="❌"
      state_color="$RED"
      ;;
    "WAITING_APPROVAL"|"PR_CREATED")
      EMOJI="⏳"
      state_color="$YELLOW"
      ;;
    "BRANCH_READY")
      EMOJI="📝"
      state_color="$BLUE"
      ;;
    "CHANGES_COMMITTED"|"PUSHED")
      EMOJI="📝"
      state_color="$MAGENTA"
      ;;
    "REBASING"|"MERGING")
      EMOJI="🔄"
      state_color="$CYAN"
      ;;
    *)
      EMOJI="🚀"
      state_color="$CYAN"
      ;;
  esac

  # Build context window display if available
  CONTEXT_DISPLAY=""
  if [ -n "$TOKEN_USED" ] && [ -n "$TOKEN_TOTAL" ]; then
    BAR=$(create_bar "$TOKEN_USED" "$TOKEN_TOTAL")
    CONTEXT_DISPLAY="\${GRAY}|\${RESET} \${CYAN}\${TOKEN_USED}\${RESET}/\${CYAN}\${TOKEN_TOTAL}\${RESET}\${BAR}"
  elif [ -n "$TOKEN_BUDGET" ]; then
    CONTEXT_DISPLAY="\${GRAY}|\${RESET} \${CYAN}budget: \${TOKEN_BUDGET}\${RESET}"
  fi

  echo -e "\${BOLD}[devsolo]\${RESET} $EMOJI \${GREEN}\${SHORT_ID}\${RESET} \${GRAY}|\${RESET} \${YELLOW}\${BRANCH}\${RESET} \${GRAY}|\${RESET} \${state_color}\${SESSION_STATE}\${RESET}\${CONTEXT_DISPLAY}"
else
  # No active session
  # Build context window display if available
  CONTEXT_DISPLAY=""
  if [ -n "$TOKEN_USED" ] && [ -n "$TOKEN_TOTAL" ]; then
    BAR=$(create_bar "$TOKEN_USED" "$TOKEN_TOTAL")
    CONTEXT_DISPLAY=" \${GRAY}|\${RESET} \${CYAN}\${TOKEN_USED}\${RESET}/\${CYAN}\${TOKEN_TOTAL}\${RESET}\${BAR}"
  elif [ -n "$TOKEN_BUDGET" ]; then
    CONTEXT_DISPLAY=" \${GRAY}|\${RESET} \${CYAN}budget: \${TOKEN_BUDGET}\${RESET}"
  fi

  echo -e "\${BOLD}[devsolo]\${RESET} 📁 \${YELLOW}\${BRANCH}\${RESET} \${GRAY}|\${RESET} \${GRAY}no session\${RESET}\${CONTEXT_DISPLAY}"
fi
`;

    const scriptPath = path.join(statusLinePath, 'statusline.sh');
    await fs.writeFile(scriptPath, statusLineScript, { mode: 0o755 });
  }

  // Additional methods for test compatibility

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }
    if (this.config) {
      (this.config as any)[key] = value;
      await this.save(this.config);
    }
  }

  async setWorkflowConfig(workflowType: string, config: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }
    if (this.config) {
      if (!(this.config as any).workflows) {
        (this.config as any).workflows = {};
      }
      (this.config as any).workflows[workflowType] = config;
      await this.save(this.config);
    }
  }

  // Alias methods for compatibility with new tools
  get(key: string): any {
    if (!this.config) {
      return undefined;
    }
    const keys = key.split('.');
    let value: any = this.config;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.config) {
      await this.load();
    }
    if (this.config) {
      const keys = key.split('.');
      let target: any = this.config;
      for (let i = 0; i < keys.length - 1; i++) {
        const currentKey = keys[i];
        if (!currentKey) {
          continue;
        }
        if (!target[currentKey]) {
          target[currentKey] = {};
        }
        target = target[currentKey];
      }
      const lastKey = keys[keys.length - 1];
      if (lastKey) {
        target[lastKey] = value;
      }
    }
  }
}