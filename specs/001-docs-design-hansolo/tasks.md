# Tasks: han-solo Git Workflow Automation

**Input**: Design documents from `/specs/001-docs-design-hansolo/`
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
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

## Phase 3.1: Setup
- [X] T001 Create TypeScript project structure with src/, tests/, and config directories
- [X] T002 Initialize npm project with package.json including name @hansolo/cli
- [X] T003 [P] Configure TypeScript with tsconfig.json for Node.js 20+ target
- [X] T004 [P] Configure Jest with jest.config.js for unit and integration tests
- [X] T005 [P] Configure ESLint with .eslintrc.js for TypeScript linting
- [X] T006 Install core dependencies: @anthropic/mcp, typescript, ts-node
- [X] T007 Install Git/API dependencies: simple-git, @octokit/rest, @gitbeaker/node
- [X] T008 Install visual dependencies: chalk, ora, boxen, cli-table3
- [X] T009 Install testing dependencies: jest, @types/jest, playwright
- [X] T010 [P] Create .gitignore with node_modules, dist, .hansolo, coverage

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### Contract Tests (MCP Tools)
- [X] T011 [P] Create tests/contracts/configure-workflow.test.ts for configure_workflow tool
- [X] T012 [P] Create tests/contracts/start-workflow.test.ts for start_workflow tool
- [X] T013 [P] Create tests/contracts/execute-workflow-step.test.ts for execute_workflow_step tool
- [X] T014 [P] Create tests/contracts/get-sessions-status.test.ts for get_sessions_status tool
- [X] T015 [P] Create tests/contracts/swap-session.test.ts for swap_session tool
- [X] T016 [P] Create tests/contracts/abort-workflow.test.ts for abort_workflow tool
- [X] T017 [P] Create tests/contracts/validate-environment.test.ts for validate_environment tool
- [X] T018 [P] Create tests/contracts/manage-status-line.test.ts for manage_status_line tool
- [X] T019 [P] Create tests/contracts/create-branch.test.ts for create_branch tool
- [X] T020 [P] Create tests/contracts/cleanup-operations.test.ts for cleanup_operations tool
- [X] T021 [P] Create tests/contracts/rebase-on-main.test.ts for rebase_on_main tool

### Entity Model Tests
- [X] T022 [P] Create tests/models/workflow-session.test.ts for WorkflowSession entity
- [X] T023 [P] Create tests/models/workflow-state.test.ts for WorkflowState entity
- [X] T024 [P] Create tests/models/configuration.test.ts for Configuration entity
- [X] T025 [P] Create tests/models/git-branch.test.ts for GitBranch entity
- [X] T026 [P] Create tests/models/audit-entry.test.ts for AuditEntry entity
- [X] T027 [P] Create tests/models/state-transition.test.ts for StateTransition entity

### State Machine Tests
- [X] T028 [P] Create tests/state-machines/launch-workflow.test.ts for launch state machine
- [X] T029 [P] Create tests/state-machines/ship-workflow.test.ts for ship state machine
- [X] T030 [P] Create tests/state-machines/hotfix-workflow.test.ts for hotfix state machine

### Integration Tests (from Quickstart)
- [X] T031 Create tests/integration/scenario-1-init-project.test.ts for project initialization
- [X] T032 Create tests/integration/scenario-2-feature-development.test.ts for launch workflow
- [X] T033 Create tests/integration/scenario-3-ship-code.test.ts for ship workflow
- [X] T034 Create tests/integration/scenario-4-hotfix.test.ts for emergency hotfix
- [X] T035 Create tests/integration/scenario-5-multi-session.test.ts for session management
- [X] T036 Create tests/integration/scenario-6-no-ai-fallback.test.ts for AI degradation

## Phase 3.3: Core Implementation

### Data Models
- [X] T037 [P] Create src/models/workflow-session.ts implementing WorkflowSession interface
- [X] T038 [P] Create src/models/workflow-state.ts implementing WorkflowState interface
- [X] T039 [P] Create src/models/configuration.ts implementing Configuration interface
- [X] T040 [P] Create src/models/git-branch.ts implementing GitBranch interface
- [X] T041 [P] Create src/models/audit-entry.ts implementing AuditEntry interface
- [X] T042 [P] Create src/models/state-transition.ts implementing StateTransition interface
- [X] T043 [P] Create src/models/index.ts exporting all models

### State Machines
- [X] T044 Create src/state-machines/base-state-machine.ts with abstract StateMachine class
- [X] T045 Create src/state-machines/launch-workflow.ts implementing launch states
- [X] T046 Create src/state-machines/ship-workflow.ts implementing ship states
- [X] T047 Create src/state-machines/hotfix-workflow.ts implementing hotfix states
- [X] T048 Create src/state-machines/index.ts with state machine factory

### Core Services
- [X] T049 Create src/services/session-repository.ts for session persistence
- [X] T050 Create src/services/git-operations.ts wrapping Git CLI commands
- [X] T051 Create src/services/audit-logger.ts for audit trail management
- [X] T052 Create src/services/configuration-manager.ts for config handling
- [X] T053 Create src/services/validation-service.ts for state/input validation

### MCP Server Implementation
- [X] T054 Create src/mcp-server/server.ts implementing MCP server with JSON-RPC
- [X] T055 Create src/mcp-server/tools/configure-workflow.ts implementing tool
- [X] T056 Create src/mcp-server/tools/start-workflow.ts implementing tool
- [X] T057 Create src/mcp-server/tools/execute-workflow-step.ts implementing tool
- [X] T058 Create src/mcp-server/tools/get-sessions-status.ts implementing tool
- [X] T059 Create src/mcp-server/tools/swap-session.ts implementing tool
- [X] T060 Create src/mcp-server/tools/abort-workflow.ts implementing tool
- [X] T061 Create src/mcp-server/tools/validate-environment.ts implementing tool
- [X] T062 Create src/mcp-server/tools/manage-status-line.ts implementing tool
- [X] T063 Create src/mcp-server/tools/create-branch.ts implementing tool
- [X] T064 Create src/mcp-server/tools/cleanup-operations.ts implementing tool
- [X] T065 Create src/mcp-server/tools/rebase-on-main.ts implementing tool
- [X] T066 Create src/mcp-server/tool-registry.ts registering all tools

## Phase 3.4: Integration Layer

### Git Platform Integration
- [ ] T067 Create src/integrations/github-client.ts using Octokit
- [ ] T068 Create src/integrations/gitlab-client.ts using @gitbeaker
- [ ] T069 Create src/integrations/git-platform-factory.ts for platform selection

### Visual Output System
- [X] T070 Create src/ui/console-output.ts with chalk colors and icons
- [X] T071 Create src/ui/progress-indicators.ts with ora spinners
- [X] T072 Create src/ui/table-formatter.ts with cli-table3
- [X] T073 Create src/ui/box-formatter.ts with boxen for banners

### Command Handlers
- [X] T074 Create src/commands/hansolo-init.ts for /hansolo:init command
- [ ] T075 Create src/commands/hansolo-launch.ts for /hansolo:launch command
- [ ] T076 Create src/commands/hansolo-ship.ts for /hansolo:ship command
- [ ] T077 Create src/commands/hansolo-hotfix.ts for /hansolo:hotfix command
- [ ] T078 Create src/commands/hansolo-status.ts for /hansolo:status command
- [ ] T079 Create src/commands/hansolo-sessions.ts for /hansolo:sessions command
- [ ] T080 Create src/commands/hansolo-swap.ts for /hansolo:swap command
- [ ] T081 Create src/commands/hansolo-abort.ts for /hansolo:abort command
- [ ] T082 Create src/commands/hansolo-cleanup.ts for /hansolo:cleanup command
- [ ] T083 Create src/commands/hansolo-validate.ts for /hansolo:validate command
- [ ] T084 Create src/commands/hansolo-config.ts for /hansolo:config command
- [ ] T085 Create src/commands/hansolo-status-line.ts for /hansolo:status-line command
- [ ] T086 Create src/commands/command-registry.ts registering all commands

### Hooks and Templates
- [ ] T087 Create src/hooks/pre-commit.ts blocking direct main commits
- [ ] T088 Create src/hooks/pre-push.ts validating branch state
- [ ] T089 Create src/hooks/post-merge.ts for cleanup operations
- [ ] T090 Create src/hooks/install-hooks.ts for hook installation
- [ ] T091 [P] Create templates/commit-message.txt template
- [ ] T092 [P] Create templates/pull-request.md template

## Phase 3.5: Polish & Quality

### Additional Unit Tests
- [ ] T093 [P] Create tests/services/session-repository.test.ts
- [ ] T094 [P] Create tests/services/git-operations.test.ts
- [ ] T095 [P] Create tests/services/audit-logger.test.ts
- [ ] T096 [P] Create tests/ui/console-output.test.ts
- [ ] T097 [P] Create tests/hooks/pre-commit.test.ts

### CLI Entry Points
- [X] T098 Create src/cli.ts as main CLI entry point with command parsing
- [X] T099 Create src/index.ts exporting public API
- [X] T100 Create bin/hansolo.js as executable script

### Build and Package
- [ ] T101 Configure package.json scripts: build, test, lint, package
- [ ] T102 Create .npmignore for package publishing
- [ ] T103 Create rollup.config.js for bundling
- [ ] T104 Create scripts/install.js for post-install setup

### Documentation
- [ ] T105 [P] Create README.md with installation and usage instructions
- [ ] T106 [P] Create docs/api.md documenting MCP tools
- [ ] T107 [P] Create docs/configuration.md for config options
- [ ] T108 [P] Create docs/troubleshooting.md for common issues

### Performance Testing
- [ ] T109 Create tests/performance/command-response.test.ts (<100ms requirement)
- [ ] T110 Create tests/performance/session-load.test.ts (100+ sessions)

---

## Task Dependencies

### Critical Path
```
Setup (T001-T010) → Contract Tests (T011-T030) → Models (T037-T043) →
State Machines (T044-T048) → MCP Server (T054-T066) → Commands (T074-T086) →
Integration Tests (T031-T036)
```

### Parallel Execution Examples

**Example 1: Run all contract tests in parallel**
```bash
Task agent run T011 T012 T013 T014 T015 T016 T017 T018 T019 T020 T021
```

**Example 2: Run all model implementations in parallel**
```bash
Task agent run T037 T038 T039 T040 T041 T042 T043
```

**Example 3: Run all unit tests in parallel**
```bash
Task agent run T093 T094 T095 T096 T097
```

## Validation Checklist
- [x] All 11 MCP tools have contract tests (T011-T021)
- [x] All 6 entities have model tests and implementations (T022-T027, T037-T043)
- [x] All 3 workflow state machines tested and implemented (T028-T030, T044-T048)
- [x] All 6 quickstart scenarios have integration tests (T031-T036)
- [x] All 12 /hansolo: commands implemented (T074-T085)
- [x] Visual output system complete (T070-T073)
- [x] Git platform integration for GitHub/GitLab (T067-T069)
- [x] Performance tests for requirements (T109-T110)

## Execution Summary
- **Total Tasks**: 110
- **Parallel Tasks**: 43 (marked with [P])
- **Sequential Tasks**: 67
- **Estimated Time**: 40-60 hours with parallelization

---

*Generated from han-solo implementation plan and design documents*