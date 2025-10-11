# Research Findings: NPM Package Publishing and Interactive CLI Installer

**Feature**: 002-we-need-to | **Date**: 2025-09-23

## Executive Summary
Research conducted to resolve technical uncertainties for the npm package publishing and interactive installer feature. Focus on CLI framework selection, package naming conventions, configuration storage strategies, and CI/CD compatibility.

## Research Areas

### 1. NPM Package Naming
**Decision**: `@devsolo/cli`
**Rationale**:
- Scoped packages provide namespace protection and brand identity
- Follows npm best practices for organization-owned packages
- Allows future expansion (@devsolo/server, @devsolo/hooks, etc.)
- Clear, memorable, and professional
**Alternatives Considered**:
- `devsolo` - Simple but may conflict with existing packages
- `devsolo-cli` - Hyphenated names less preferred in npm ecosystem
- `@han/solo` - Split namespace confusing

### 2. CLI Framework Selection
**Decision**: `inquirer` with `chalk` and `ora`
**Rationale**:
- Inquirer: Most mature and battle-tested prompt library (100M+ weekly downloads)
- Excellent accessibility support and terminal compatibility
- Rich widget set: select, multiselect, confirm, input, password
- Built-in validation and error handling
- Chalk: De facto standard for terminal colors
- Ora: Elegant spinners with fallback support
**Alternatives Considered**:
- `prompts` - Lighter but less feature-rich
- `enquirer` - Good but smaller community
- Custom implementation - Unnecessary complexity

### 3. Configuration Storage Location
**Decision**: Dual-location strategy based on installation type
**Rationale**:
- Global install: `~/.devsolo/config.json` - User-level preferences
- Local install: `./.devsolo/config.json` - Project-specific settings
- Project config takes precedence over user config when both exist
- Follows established CLI patterns (npm, git, etc.)
**Alternatives Considered**:
- Single location only - Too restrictive
- Environment variables - Hard to manage complex config
- Package.json integration - Pollutes project manifest

### 4. Workflow Configuration Options
**Decision**: Configurable workflow preferences
**Rationale**: Teams have different processes and requirements
**Configurable Options**:
- **Branch naming**: Pattern template (e.g., `feature/{ticket}-{description}`)
- **Commit style**: Conventional, semantic, or custom format
- **PR templates**: Enable/disable, custom template path
- **Auto-rebase**: Frequency and strategy
- **Squash preference**: Always, prompt, or never
- **Review requirements**: Number of approvals needed
- **CI/CD integration**: GitHub Actions, GitLab CI, Jenkins, etc.
- **Notification preferences**: Slack, email, or none
**Alternatives Considered**:
- Fixed workflow - Too opinionated
- Unlimited customization - Too complex

### 5. Visual Experience Requirements
**Decision**: Progressive enhancement approach
**Rationale**: Beautiful when possible, functional everywhere
**Implementation**:
- ASCII art banner with devsolo branding
- Color-coded status messages (success=green, warning=yellow, error=red)
- Animated spinners during async operations
- Progress bars for multi-step processes
- Box-drawing characters for structured output
- Emoji support with fallback to ASCII equivalents
**Alternatives Considered**:
- Plain text only - Poor user experience
- Heavy graphics - Terminal compatibility issues

### 6. CI/CD Detection and Handling
**Decision**: Auto-detect and skip interactive mode
**Rationale**: CI environments need non-interactive execution
**Detection Methods**:
- Check `CI` environment variable (standard)
- Check `CONTINUOUS_INTEGRATION` variable
- Detect common CI env vars (GITHUB_ACTIONS, GITLAB_CI, JENKINS_HOME)
- TTY detection: `process.stdout.isTTY`
- Flag override: `--non-interactive` or `--ci`
**Behavior in CI**:
- Skip interactive installer
- Use defaults or environment variables
- Silent mode with exit codes only
**Alternatives Considered**:
- Always interactive - Breaks CI pipelines
- Separate CI package - Maintenance burden

### 7. Upgrade Behavior
**Decision**: Smart upgrade with configuration migration
**Rationale**: Preserve user settings while enabling new features
**Upgrade Strategy**:
- Detect existing installation via config file version
- Prompt to review new configuration options
- Migrate existing settings to new schema
- Backup old config before modification
- Show changelog highlights
- Option to skip and keep current config
**Alternatives Considered**:
- Overwrite config - Data loss risk
- Never touch config - Misses new features

### 8. Post-Install Hook Implementation
**Decision**: npm scripts with cross-platform compatibility
**Rationale**: Standard npm lifecycle hooks work everywhere
**Implementation**:
- Use `postinstall` script in package.json
- Detect installation context (global vs local vs npx)
- Check for `--ignore-scripts` flag
- Graceful failure if installer can't run
- Option to re-run: `npx @devsolo/cli configure`
**Alternatives Considered**:
- Manual setup only - Poor developer experience
- Binary wrapper - Complex distribution

## Technical Specifications

### Installation Contexts
1. **Global**: `npm install -g @devsolo/cli`
   - Config: `~/.devsolo/config.json`
   - Binary: System PATH
   - Updates: Manual via npm update

2. **Local**: `npm install @devsolo/cli`
   - Config: `./.devsolo/config.json`
   - Binary: `./node_modules/.bin/devsolo`
   - Updates: Via package.json

3. **npx**: `npx @devsolo/cli`
   - Config: Temporary or prompt to save
   - Binary: Cached temporarily
   - Updates: Always latest

### Configuration Schema
```json
{
  "version": "1.0.0",
  "workflow": {
    "branchPattern": "feature/{ticket}-{description}",
    "commitStyle": "conventional",
    "autoRebase": true,
    "squashMerge": "always"
  },
  "integration": {
    "ci": "github-actions",
    "notifications": "slack"
  },
  "ui": {
    "colors": true,
    "emoji": true,
    "animations": true
  }
}
```

## Resolved Clarifications

All NEEDS CLARIFICATION items from the specification have been resolved:
1. **Package name**: `@devsolo/cli`
2. **CLI framework**: inquirer + chalk + ora
3. **Config location**: Dual-location based on install type
4. **Workflow options**: Comprehensive list defined
5. **Visual requirements**: Progressive enhancement approach
6. **CI/CD handling**: Auto-detection with overrides
7. **Upgrade behavior**: Smart migration strategy

## Next Steps
Proceed to Phase 1 (Design & Contracts) with these technical decisions to create:
- Data model for configuration entities
- API contracts for installer operations
- Contract tests for validation
- Quickstart guide for users
- Update CLAUDE.md with new capabilities