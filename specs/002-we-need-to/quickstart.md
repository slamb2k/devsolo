# Quickstart Guide: devsolo NPM Installation

## Prerequisites
- Node.js 18+ (LTS)
- npm 8+ or yarn 1.22+
- Git installed and configured

## Installation Options

### Option 1: Global Installation (Recommended)
```bash
npm install -g @devsolo/cli
```

### Option 2: Project-Level Installation
```bash
npm install --save-dev @devsolo/cli
```

### Option 3: Try Without Installing
```bash
npx @devsolo/cli init
```

## First-Time Setup

After installation, the interactive setup wizard will automatically launch. If it doesn't, run:
```bash
devsolo configure
```

### Setup Wizard Walkthrough

1. **Welcome Screen**
   - ASCII art banner displays
   - Version and system info shown
   - Press Enter to continue

2. **Workflow Configuration**
   ```
   ? Select your branch naming pattern:
   > feature/{ticket}-{description}
     feature/{description}
     {type}/{description}
     Custom pattern...

   ? Choose commit message style:
   > Conventional (feat, fix, chore)
     Semantic (add, change, remove)
     Custom format...

   ? Enable automatic rebasing?
   > Yes (recommended)
     No

   ? How should PRs be merged?
   > Always squash
     Ask each time
     Never squash
   ```

3. **Integration Setup**
   ```
   ? Select your CI/CD platform:
   > GitHub Actions
     GitLab CI
     Jenkins
     Circle CI
     None

   ? Enable notifications?
   > Slack
     Email
     Microsoft Teams
     None
   ```

4. **Display Preferences**
   ```
   ? Enable colored output? (Y/n)
   ? Use emoji in messages? (y/N)
   ? Show animations and progress bars? (Y/n)
   ```

5. **Review and Confirm**
   - Summary of all selections displayed
   - Option to go back and modify
   - Confirm to save configuration

## Verification Steps

### 1. Check Installation
```bash
devsolo --version
# Output: @devsolo/cli v1.0.0
```

### 2. Verify Configuration
```bash
devsolo config show
# Displays current configuration
```

### 3. Initialize First Project
```bash
cd your-project
devsolo init
# Creates .devsolo/ directory and sets up Git hooks
```

### 4. Test Workflow Commands
```bash
# Start a new feature
devsolo launch feature "add user authentication"

# Check status
devsolo status

# When ready to ship
devsolo ship
```

## CI/CD Setup

### For GitHub Actions
```yaml
# .github/workflows/devsolo.yml
name: devsolo workflow
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g @devsolo/cli
      - run: devsolo validate
```

### For GitLab CI
```yaml
# .gitlab-ci.yml
stages:
  - validate

devsolo-check:
  stage: validate
  image: node:18
  script:
    - npm install -g @devsolo/cli
    - devsolo validate
```

## Common Scenarios

### Scenario 1: Team Onboarding
```bash
# Share configuration
devsolo config export > team-config.json

# New team member imports
devsolo config import team-config.json
```

### Scenario 2: Upgrade Existing Installation
```bash
# Check current version
devsolo --version

# Upgrade globally
npm update -g @devsolo/cli

# Run configuration migration
devsolo configure --upgrade
```

### Scenario 3: Non-Interactive Installation (CI)
```bash
# Set environment variables
export DEVSOLO_BRANCH_PATTERN="feature/{description}"
export DEVSOLO_COMMIT_STYLE="conventional"
export DEVSOLO_AUTO_REBASE="true"
export DEVSOLO_CI="github-actions"

# Install with --ci flag
npm install -g @devsolo/cli --ignore-scripts
devsolo configure --ci
```

## Troubleshooting

### Issue: Installer doesn't start automatically
**Solution**: Run `devsolo configure` manually

### Issue: Permission denied during global install
**Solution**: Use sudo (Linux/Mac) or run as Administrator (Windows)
```bash
sudo npm install -g @devsolo/cli
```

### Issue: Configuration not found
**Solution**: Check configuration location
```bash
# Global install
ls ~/.devsolo/config.json

# Local install
ls ./.devsolo/config.json
```

### Issue: Terminal doesn't support colors/animations
**Solution**: The installer auto-detects and falls back to plain text

## Next Steps

1. Read the [full documentation](https://devsolo.dev/docs)
2. Join the [community Slack](https://devsolo.dev/slack)
3. Report issues on [GitHub](https://github.com/devsolo/cli/issues)
4. Configure your IDE integration

## Quick Reference

| Command | Description |
|---------|-------------|
| `devsolo configure` | Run setup wizard |
| `devsolo config show` | Display configuration |
| `devsolo init` | Initialize project |
| `devsolo launch` | Start new feature |
| `devsolo ship` | Complete workflow |
| `devsolo status` | Check current state |
| `devsolo --help` | Show all commands |

## Success Criteria Validation

✅ **Installation**: Package installs via npm/npx
✅ **Configuration**: Wizard completes and saves settings
✅ **Initialization**: Project setup creates .devsolo/ directory
✅ **Workflow**: Basic commands execute successfully
✅ **CI/CD**: Non-interactive mode works in pipelines

---
*Generated for devsolo v1.0.0*