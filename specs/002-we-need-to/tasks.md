# Tasks: NPM Package Publishing and Interactive CLI Installer

**Input**: Design documents from `/specs/002-we-need-to/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Structure per plan.md: Single CLI project structure

## Phase 3.1: Setup
- [ ] T001 Create npm package structure with package.json at repository root
- [ ] T002 Configure package.json with @hansolo/cli name, version 1.0.0, and npm publishing settings
- [ ] T003 Add dependencies: inquirer@9.x, chalk@5.x, ora@6.x, commander@11.x to package.json
- [ ] T004 Add dev dependencies: jest@29.x, @types/node@18.x, @types/inquirer@9.x, typescript@5.x
- [ ] T005 Create bin/hansolo.js as main CLI entry point with shebang and commander setup
- [ ] T006 Configure postinstall script in package.json to trigger installer
- [ ] T007 [P] Create TypeScript config (tsconfig.json) for Node.js 18+ target
- [ ] T008 [P] Setup Jest configuration (jest.config.js) for unit and integration tests
- [ ] T009 [P] Create .npmignore to exclude specs/, tests/, and development files
- [ ] T010 [P] Initialize ESLint config with Node.js and TypeScript rules

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Operations)
- [ ] T011 [P] Contract test getInstallationContext in tests/contract/test_installation_context.js
- [ ] T012 [P] Contract test startInstallerSession in tests/contract/test_start_session.js
- [ ] T013 [P] Contract test resumeInstallerSession in tests/contract/test_resume_session.js
- [ ] T014 [P] Contract test getStepPrompts in tests/contract/test_prompts.js
- [ ] T015 [P] Contract test validateInput in tests/contract/test_validation.js
- [ ] T016 [P] Contract test saveConfiguration in tests/contract/test_save_config.js
- [ ] T017 [P] Contract test loadConfiguration in tests/contract/test_load_config.js
- [ ] T018 [P] Contract test migrateConfiguration in tests/contract/test_migrate_config.js

### Integration Tests (User Scenarios)
- [ ] T019 [P] Integration test global installation flow in tests/integration/test_global_install.js
- [ ] T020 [P] Integration test local installation flow in tests/integration/test_local_install.js
- [ ] T021 [P] Integration test npx execution flow in tests/integration/test_npx_flow.js
- [ ] T022 [P] Integration test CI/CD non-interactive mode in tests/integration/test_ci_mode.js
- [ ] T023 [P] Integration test configuration upgrade scenario in tests/integration/test_upgrade.js
- [ ] T024 [P] Integration test session resume capability in tests/integration/test_resume.js

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Models/Entities
- [ ] T025 [P] InstallationContext model in src/models/InstallationContext.js
- [ ] T026 [P] ConfigurationProfile model in src/models/ConfigurationProfile.js
- [ ] T027 [P] WorkflowSettings model in src/models/WorkflowSettings.js
- [ ] T028 [P] IntegrationSettings model in src/models/IntegrationSettings.js
- [ ] T029 [P] UISettings model in src/models/UISettings.js
- [ ] T030 [P] ConfigMetadata model in src/models/ConfigMetadata.js
- [ ] T031 [P] InstallerSession model in src/models/InstallerSession.js
- [ ] T032 [P] InstallerPrompt model in src/models/InstallerPrompt.js
- [ ] T033 [P] PackageManifest model in src/models/PackageManifest.js

### Services/Core Logic
- [ ] T034 ContextDetector service in src/services/ContextDetector.js (detect install type, CI, TTY)
- [ ] T035 SessionManager service in src/services/SessionManager.js (create, resume, save sessions)
- [ ] T036 ConfigManager service in src/services/ConfigManager.js (load, save, migrate configs)
- [ ] T037 PromptBuilder service in src/services/PromptBuilder.js (build prompts for each step)
- [ ] T038 Validator service in src/services/Validator.js (validate user inputs)
- [ ] T039 MigrationEngine service in src/services/MigrationEngine.js (upgrade configs)

### CLI Commands/UI Components
- [ ] T040 [P] WelcomeBanner component in src/cli/components/WelcomeBanner.js (ASCII art)
- [ ] T041 [P] ProgressIndicator component in src/cli/components/ProgressIndicator.js
- [ ] T042 [P] ThemeManager in src/cli/components/ThemeManager.js (colors, emoji support)
- [ ] T043 InstallerWizard main flow in src/cli/InstallerWizard.js (orchestrate steps)
- [ ] T044 WorkflowStep implementation in src/cli/steps/WorkflowStep.js
- [ ] T045 IntegrationStep implementation in src/cli/steps/IntegrationStep.js
- [ ] T046 UIStep implementation in src/cli/steps/UIStep.js
- [ ] T047 ReviewStep implementation in src/cli/steps/ReviewStep.js
- [ ] T048 Configure command in src/cli/commands/configure.js (manual trigger)

### API Implementation
- [ ] T049 Installation context detection endpoint in src/lib/installer/context.js
- [ ] T050 Session management endpoints in src/lib/installer/session.js
- [ ] T051 Prompt delivery system in src/lib/installer/prompts.js
- [ ] T052 Input validation system in src/lib/installer/validation.js
- [ ] T053 Configuration I/O operations in src/lib/installer/config.js
- [ ] T054 Migration operations in src/lib/installer/migration.js

## Phase 3.4: Integration

### System Integration
- [ ] T055 Wire postinstall hook to InstallerWizard in scripts/postinstall.js
- [ ] T056 Implement CI/CD detection logic with environment variables
- [ ] T057 Add npx execution support with temporary config handling
- [ ] T058 Implement config file resolution (global vs local precedence)
- [ ] T059 Add terminal capability detection and fallback modes
- [ ] T060 Create error recovery and rollback mechanisms

### External Integration
- [ ] T061 [P] GitHub Actions detection and config in src/integrations/github.js
- [ ] T062 [P] GitLab CI detection and config in src/integrations/gitlab.js
- [ ] T063 [P] Jenkins detection and config in src/integrations/jenkins.js
- [ ] T064 [P] Slack notification setup in src/integrations/slack.js

## Phase 3.5: Polish

### Unit Tests
- [ ] T065 [P] Unit tests for ContextDetector in tests/unit/test_context_detector.js
- [ ] T066 [P] Unit tests for SessionManager in tests/unit/test_session_manager.js
- [ ] T067 [P] Unit tests for ConfigManager in tests/unit/test_config_manager.js
- [ ] T068 [P] Unit tests for Validator in tests/unit/test_validator.js
- [ ] T069 [P] Unit tests for MigrationEngine in tests/unit/test_migration.js

### Performance & Documentation
- [ ] T070 Performance test: Installer completes < 30 seconds
- [ ] T071 Performance test: Sub-second response to user input
- [ ] T072 [P] Create README.md with installation and usage instructions
- [ ] T073 [P] Create CONTRIBUTING.md with development setup
- [ ] T074 [P] Generate API documentation from JSDoc comments
- [ ] T075 Add telemetry for installer success/failure rates

### Final Validation
- [ ] T076 Run quickstart.md verification steps
- [ ] T077 Test all three installation methods (global, local, npx)
- [ ] T078 Validate CI/CD mode in GitHub Actions
- [ ] T079 Cross-platform testing (Linux, macOS, Windows)
- [ ] T080 Publish to npm registry as @hansolo/cli v1.0.0

## Dependencies
- Setup (T001-T010) must complete first
- Tests (T011-T024) before any implementation
- Models (T025-T033) can be parallel, no interdependencies
- Services (T034-T039) depend on models
- CLI components (T040-T048) depend on services
- API implementation (T049-T054) depends on services
- Integration (T055-T064) depends on core implementation
- Polish (T065-T080) depends on all implementation

## Parallel Execution Examples

### Launch all contract tests together (T011-T018):
```javascript
await Promise.all([
  Task("Contract test getInstallationContext in tests/contract/test_installation_context.js"),
  Task("Contract test startInstallerSession in tests/contract/test_start_session.js"),
  Task("Contract test resumeInstallerSession in tests/contract/test_resume_session.js"),
  Task("Contract test getStepPrompts in tests/contract/test_prompts.js"),
  Task("Contract test validateInput in tests/contract/test_validation.js"),
  Task("Contract test saveConfiguration in tests/contract/test_save_config.js"),
  Task("Contract test loadConfiguration in tests/contract/test_load_config.js"),
  Task("Contract test migrateConfiguration in tests/contract/test_migrate_config.js")
]);
```

### Launch all models together (T025-T033):
```javascript
await Promise.all([
  Task("InstallationContext model in src/models/InstallationContext.js"),
  Task("ConfigurationProfile model in src/models/ConfigurationProfile.js"),
  Task("WorkflowSettings model in src/models/WorkflowSettings.js"),
  Task("IntegrationSettings model in src/models/IntegrationSettings.js"),
  Task("UISettings model in src/models/UISettings.js"),
  Task("ConfigMetadata model in src/models/ConfigMetadata.js"),
  Task("InstallerSession model in src/models/InstallerSession.js"),
  Task("InstallerPrompt model in src/models/InstallerPrompt.js"),
  Task("PackageManifest model in src/models/PackageManifest.js")
]);
```

### Launch UI components in parallel (T040-T042):
```javascript
await Promise.all([
  Task("WelcomeBanner component in src/cli/components/WelcomeBanner.js"),
  Task("ProgressIndicator component in src/cli/components/ProgressIndicator.js"),
  Task("ThemeManager in src/cli/components/ThemeManager.js")
]);
```

## Notes
- Each task specifies exact file paths for clarity
- [P] marks tasks that can run in parallel (different files)
- Services must be implemented sequentially (shared dependencies)
- All tests must fail before implementation begins (TDD)
- Commit after completing each task or parallel group
- Total tasks: 80 (comprehensive coverage of all requirements)

## Success Criteria
✅ All 8 API operations have contract tests
✅ All 9 entities have model implementations
✅ All 6 installation scenarios have integration tests
✅ CLI installer works in all three modes (global, local, npx)
✅ Non-interactive mode works in CI/CD environments
✅ Configuration migration handles upgrades
✅ Package publishes successfully to npm registry