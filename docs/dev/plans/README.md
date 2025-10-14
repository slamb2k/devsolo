# Implementation Plans

This folder contains implementation plans, task lists, and roadmaps for upcoming features and improvements.

## Contents

### Completed Plans

- **phase3-pure-mcp-architecture.md** - ✅ **COMPLETED** - Phase 3 (Pure MCP Pivot) implementation plan: architectural pivot from dual CLI/MCP to pure MCP server, deleted ~8,300 lines, removed ESM dependencies, achieved 40% codebase reduction (shipped in PR #79, v2.0.0)
- **phase2-architecture-cleanup-plan.md** - ✅ COMPLETED - Phase 2 (Architecture Cleanup) implementation plan: removed dead MCP server code (2,600 lines), fixed test suite (re-enabled 50% of skipped tests), and refactored large command files (700+ lines → <300 lines)
- **codebase-cleanup-phase1-plan.md** - ✅ COMPLETED - Phase 1 (Quick Wins) implementation plan for codebase optimization: removed build artifacts, unused dependencies, and runtime files

### Active Plans

- **multi-stage-orchestration.md** - Multi-stage sub-agent orchestration pattern for complex workflows: breaks git-droid operations into distinct stages with clear progress indicators (ship, swap, abort, launch, cleanup commands)

## What Goes Here

- Feature implementation plans
- Task breakdowns for complex changes
- Roadmaps and milestones
- Sprint/iteration plans
- Architecture change proposals

## Naming Convention

Use descriptive names with dates:
- `feature-name-implementation-plan.md`
- `YYYY-MM-DD-task-list.md`
- `refactor-component-plan.md`

## Lifecycle

When a plan is completed:
1. Add completion status to the document
2. Keep it here for reference (shows what was planned vs executed)
3. Create a summary in [../reports/](../reports/) if significant learnings emerged
4. If superseded by a new approach, move to [../../archive/](../../archive/)

## Related Documentation

- See [../reports/](../reports/) for summaries after plan execution
- See [../learnings/](../learnings/) for patterns discovered during implementation
