
# Implementation Plan: han-solo Git Workflow Automation

**Branch**: `001-docs-design-hansolo` | **Date**: 2025-09-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-docs-design-hansolo/spec.md`

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
han-solo is a Git workflow automation tool that enforces linear history and prevents merge conflicts through a dual-layer architecture combining deterministic MCP server state machines with Claude Code AI assistance. The tool provides workflow commands for initialization, feature development, shipping code, and hotfix management while maintaining developer control over critical decisions.

## Technical Context
**Language/Version**: TypeScript/Node.js 20+
**Primary Dependencies**: MCP SDK, Git CLI, GitHub/GitLab API clients
**Storage**: JSON files for session state, YAML for configuration
**Testing**: Jest for unit tests, Playwright for integration tests
**Target Platform**: Linux/macOS/Windows terminals, Claude Code environment
**Project Type**: single - CLI tool with MCP server backend
**Performance Goals**: <100ms command response, instant state transitions
**Constraints**: Must work offline (except remote operations), <50MB install size
**Scale/Scope**: Support 100+ concurrent sessions, unlimited project size

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### han-solo Specific Gates (from Constitution v4.0.0)

1. **Hybrid Orchestration**: ✅ PASS
   - MCP Server for deterministic control
   - Claude Code for intelligence layer
   - Clear separation of concerns maintained

2. **State Machine Determinism**: ✅ PASS
   - Immutable state machines defined
   - Strict validation rules enforced
   - MCP server as sole authority

3. **Linear History (NON-NEGOTIABLE)**: ✅ PASS
   - No merge commits allowed
   - Squash-merge only for PRs
   - Pre-merge rebasing mandatory

4. **User Sovereignty**: ✅ PASS
   - Explicit approval for all operations
   - Manual fallbacks provided
   - Abort mechanisms available

5. **Ambient Awareness**: ✅ PASS
   - Status lines for terminal awareness
   - Visual feedback with colors/icons
   - Comprehensive audit trails

6. **AI-Assisted, Not AI-Dependent**: ✅ PASS
   - Deterministic completion guaranteed
   - Manual input paths at every point
   - Graceful degradation without AI

7. **Initialization First**: ✅ PASS
   - Mandatory init before any command
   - hansolo.yaml marks initialization
   - Components in .hansolo/ directory

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
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

**Structure Decision**: Option 1 (Single project structure) - han-solo is a CLI tool with MCP server backend

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
- Each MCP tool → contract test task [P]
- Each entity → model creation task [P]
- Each workflow state machine → state test task [P]
- Each user scenario → integration test task
- Implementation tasks to make tests pass

**Specific Tasks to Generate**:
1. Project setup and dependencies (npm, TypeScript, MCP SDK)
2. State machine tests (11 tools × test file) [P]
3. Entity model tests (6 entities × test file) [P]
4. MCP server implementation with tools
5. Session management implementation
6. Git operations wrapper
7. GitHub/GitLab API integration
8. Visual output system (colors, spinners, tables)
9. Command handlers (/hansolo:* commands)
10. Integration tests from quickstart scenarios

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Core → Models → Services → Commands → Integration
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 40-50 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


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
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

**Artifacts Generated**:
- [x] research.md - Technology decisions and architecture patterns
- [x] data-model.md - 6 entities with state machines defined
- [x] contracts/mcp-tools.json - MCP server tools contract
- [x] contracts/state-machines.yaml - Immutable workflow states
- [x] quickstart.md - 6 validation scenarios with tests
- [x] CLAUDE.md updated - Project context for Claude Code

---
*Based on Constitution v4.0.0 - See `.specify/memory/constitution.md`*
