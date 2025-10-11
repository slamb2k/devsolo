
# Implementation Plan: NPM Package Publishing and Interactive CLI Installer

**Branch**: `002-we-need-to` | **Date**: 2025-09-23 | **Spec**: [/specs/002-we-need-to/spec.md](/specs/002-we-need-to/spec.md)
**Input**: Feature specification from `/specs/002-we-need-to/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Publishing devsolo to npm with an interactive post-install wizard that guides users through configuration options tailored to their development workflow. The installer must work across npm install (local), npm install -g (global), and npx execution modes while providing a beautiful CLI experience with clear progress feedback and actionable next steps.

## Technical Context
**Language/Version**: Node.js 18+ (LTS)
**Primary Dependencies**: npm registry, cli-prompts library (NEEDS CLARIFICATION: specific CLI framework - inquirer, prompts, or custom?), chalk for colors, ora for spinners
**Storage**: Configuration files in `.devsolo/` directory (project or user level based on installation type)
**Testing**: Jest for unit tests, integration tests for installer flows
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows with terminal emulator)
**Project Type**: single - CLI tool with installer
**Performance Goals**: Installer completion < 30 seconds, sub-second response to user input
**Constraints**: Must work in CI/CD environments (non-interactive mode), terminal compatibility (ANSI colors, Unicode support)
**Scale/Scope**: Support for unlimited concurrent installations, configuration profiles for teams of any size

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principle Alignment
- [x] **Hybrid Orchestration**: Installer enhances but doesn't control workflow execution
- [x] **State Machine Determinism**: Installation state can be tracked and resumed
- [x] **Linear History**: N/A - installer doesn't affect Git operations
- [x] **User Sovereignty**: Explicit permission for each configuration choice, skippable installer
- [x] **Ambient Awareness**: Visual feedback with progress bars, colors, and clear status
- [x] **AI-Assisted, Not AI-Dependent**: Installer works without AI, manual input for all options
- [x] **Initialization First**: Installer sets up initial `.devsolo/` configuration structure

### Quality Gates
- [x] **Non-Interactive Support**: Must detect and handle CI/CD environments
- [x] **Cross-Platform Compatibility**: Works on all major operating systems
- [x] **Graceful Degradation**: Falls back when terminal features unavailable
- [x] **Configuration Persistence**: Settings saved to appropriate `.devsolo/` directory
- [x] **Error Recovery**: Clear error messages with actionable recovery steps

## Project Structure

### Documentation (this feature)
```
specs/002-we-need-to/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project) - CLI tool with installer components

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Package setup and publishing tasks
- Installer implementation tasks grouped by component
- Configuration management tasks
- Test implementation for each component

**Detailed Task Breakdown (for /tasks command)**:
1. **Package Setup Tasks** [P]:
   - Create package.json with npm publishing config
   - Set up bin entry for CLI executable
   - Configure postinstall script hook
   - Add required dependencies

2. **Installer Core Tasks**:
   - Implement installation context detection
   - Create session management system
   - Build prompt configuration loader
   - Implement wizard flow controller

3. **Configuration Tasks**:
   - Create config schema and validators
   - Implement config file I/O operations
   - Build migration system for upgrades
   - Add config backup/restore capability

4. **UI Components Tasks** [P]:
   - Create welcome banner with ASCII art
   - Implement progress indicators
   - Build prompt widgets (select, input, etc.)
   - Add color and animation system

5. **Integration Tasks**:
   - CI/CD environment detection
   - Non-interactive mode implementation
   - npx execution support
   - Global vs local install handling

6. **Test Tasks** [P]:
   - Unit tests for each component
   - Integration tests for wizard flow
   - Contract tests for API endpoints
   - End-to-end installation tests

**Ordering Strategy**:
- Start with package setup (foundation)
- Build core installer components
- Add UI layer on top
- Implement integrations
- Complete with comprehensive testing

**Parallelization Opportunities**:
- UI components can be built independently [P]
- Test files can be created in parallel [P]
- Documentation updates parallel to code [P]

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitution violations - section not needed*


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (resolved in research.md)
- [x] No complexity deviations (design aligns with constitution)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
