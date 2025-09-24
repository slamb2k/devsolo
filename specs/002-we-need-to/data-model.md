# Data Model: NPM Package Publishing and Interactive CLI Installer

**Feature**: 002-we-need-to | **Date**: 2025-09-23

## Entity Definitions

### 1. InstallationContext
**Purpose**: Represents the environment and mode of han-solo installation
**Fields**:
- `type`: enum ['global', 'local', 'npx'] - Installation method used
- `npmVersion`: string - NPM version for compatibility checks
- `nodeVersion`: string - Node.js version for compatibility
- `platform`: enum ['darwin', 'linux', 'win32'] - Operating system
- `isCI`: boolean - Whether running in CI/CD environment
- `isTTY`: boolean - Whether terminal is interactive
- `installPath`: string - Absolute path where han-solo is installed
- `timestamp`: Date - When installation occurred

**Validation Rules**:
- nodeVersion must be >= 18.0.0
- npmVersion must be >= 8.0.0
- installPath must be valid directory path

### 2. ConfigurationProfile
**Purpose**: User's workflow preferences and settings for han-solo
**Fields**:
- `version`: string - Config schema version for migrations
- `workflow`: WorkflowSettings - Git workflow preferences
- `integration`: IntegrationSettings - External tool integrations
- `ui`: UISettings - Terminal display preferences
- `metadata`: ConfigMetadata - Config file metadata

**Validation Rules**:
- version must match supported schema versions
- All nested objects must be valid

### 3. WorkflowSettings
**Purpose**: Git workflow behavior configuration
**Fields**:
- `branchPattern`: string - Template for branch naming
- `commitStyle`: enum ['conventional', 'semantic', 'custom'] - Commit message format
- `autoRebase`: boolean - Automatically rebase feature branches
- `squashMerge`: enum ['always', 'prompt', 'never'] - Squash merge preference
- `prTemplate`: string | null - Path to PR template file
- `reviewRequirements`: number - Minimum approvals needed

**Validation Rules**:
- branchPattern must contain at least one variable placeholder
- reviewRequirements must be >= 0
- prTemplate path must exist if provided

### 4. IntegrationSettings
**Purpose**: External service integrations
**Fields**:
- `ci`: enum ['github-actions', 'gitlab-ci', 'jenkins', 'circle-ci', 'none'] - CI/CD platform
- `notifications`: enum ['slack', 'email', 'teams', 'none'] - Notification service
- `issueTracker`: enum ['github', 'gitlab', 'jira', 'none'] - Issue tracking system
- `customHooks`: string[] - Paths to custom Git hooks

**Validation Rules**:
- customHooks paths must exist
- At most one notification service active

### 5. UISettings
**Purpose**: Terminal display and interaction preferences
**Fields**:
- `colors`: boolean - Enable colored output
- `emoji`: boolean - Use emoji in output
- `animations`: boolean - Show spinners and progress bars
- `verbosity`: enum ['quiet', 'normal', 'verbose'] - Output detail level
- `theme`: enum ['default', 'minimal', 'neon'] - Visual theme

**Validation Rules**:
- If !isTTY, animations must be false
- If !colors, theme must be 'minimal'

### 6. ConfigMetadata
**Purpose**: Configuration file metadata for management
**Fields**:
- `createdAt`: Date - Initial configuration date
- `updatedAt`: Date - Last modification date
- `createdBy`: string - han-solo version that created config
- `lastModifiedBy`: string - han-solo version that last modified
- `installationId`: string - Unique installation identifier (UUID)

**Validation Rules**:
- updatedAt >= createdAt
- installationId must be valid UUID v4

### 7. InstallerSession
**Purpose**: Tracks installer wizard progress for resume capability
**Fields**:
- `sessionId`: string - Unique session identifier (UUID)
- `startedAt`: Date - Session start timestamp
- `currentStep`: enum ['welcome', 'workflow', 'integration', 'ui', 'review', 'complete'] - Current wizard step
- `responses`: Map<string, any> - User responses collected so far
- `completedSteps`: string[] - Steps already completed
- `isComplete`: boolean - Whether installation finished

**Validation Rules**:
- sessionId must be valid UUID v4
- currentStep must follow defined flow order
- completedSteps cannot contain duplicates

### 8. InstallerPrompt
**Purpose**: Individual question/input in the installer wizard
**Fields**:
- `id`: string - Unique prompt identifier
- `type`: enum ['select', 'multiselect', 'input', 'confirm', 'password'] - Input widget type
- `message`: string - Question text displayed to user
- `choices`: Choice[] | null - Available options for select types
- `default`: any - Default value if user skips
- `validation`: ValidationRule | null - Input validation rules
- `when`: ConditionalRule | null - Conditional display logic

**Validation Rules**:
- choices required for select/multiselect types
- default must match choice value if choices present
- validation regex must be valid

### 9. PackageManifest
**Purpose**: NPM package configuration for publishing
**Fields**:
- `name`: string - Package name (@hansolo/cli)
- `version`: string - Semantic version
- `description`: string - Package description
- `bin`: Map<string, string> - Executable commands
- `scripts`: Map<string, string> - NPM lifecycle scripts
- `dependencies`: Map<string, string> - Runtime dependencies
- `engines`: EngineRequirements - Node/npm version requirements
- `publishConfig`: PublishSettings - NPM registry settings

**Validation Rules**:
- name must be valid npm package name
- version must follow semantic versioning
- bin entries must point to existing files

## State Transitions

### InstallerSession States
```
INIT → WELCOME → WORKFLOW_CONFIG → INTEGRATION_CONFIG →
UI_CONFIG → REVIEW → SAVING → COMPLETE

Abort possible from: WELCOME, WORKFLOW_CONFIG, INTEGRATION_CONFIG, UI_CONFIG, REVIEW
Resume possible from: WORKFLOW_CONFIG, INTEGRATION_CONFIG, UI_CONFIG
```

### ConfigurationProfile Lifecycle
```
NONE → CREATED → ACTIVE → UPGRADED → ACTIVE
                    ↓
                 BACKED_UP
```

## Relationships

1. **InstallationContext** → **ConfigurationProfile** (1:1)
   - Each installation has one active configuration

2. **ConfigurationProfile** → **WorkflowSettings** (1:1)
   - Configuration contains workflow settings

3. **ConfigurationProfile** → **IntegrationSettings** (1:1)
   - Configuration contains integration settings

4. **ConfigurationProfile** → **UISettings** (1:1)
   - Configuration contains UI settings

5. **InstallerSession** → **InstallerPrompt** (1:many)
   - Session presents multiple prompts

6. **InstallerSession** → **ConfigurationProfile** (1:1)
   - Session produces final configuration

## Invariants

1. Global installations must use user-level config directory
2. Local installations must use project-level config directory
3. CI environments must skip interactive installer
4. Configuration version changes require migration
5. Incomplete sessions can be resumed from last step
6. All paths in configuration must be absolute or relative to config location