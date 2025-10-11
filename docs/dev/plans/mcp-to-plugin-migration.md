# MCP to Plugin Migration

**Status:** Planning
**Created:** 2025-10-11
**Target:** v3.0.0

## Overview

Migrate han-solo from MCP-based architecture to Claude Code's native plugin system using custom slash commands and specialized sub-agents. This migration will provide a cleaner architecture, better integration with Claude Code, and improved maintainability.

## Guiding Principles

Refer to official Claude Code documentation for format and best practices of structuring custom slash commands. Migrate the current codebase based on the following principles. Ensure the migration is clean and complete with minimal redundant code left behind.

**Important:** If unsure about the best way to migrate a specific piece of code or whether something should be migrated/deleted, ask for clarification.

## Phase 1: Prompt Migration

### Objective

Migrate all MCP prompts to custom slash commands stored in `.claude/commands/hansolo/`.

### Reference Format

Use existing slash commands in `.hansolo/commands/` as format references:

**`.hansolo/commands/prime.md`** - Simple command example:
- Minimal front matter (title and description)
- Clear instructions with sections
- Direct tool usage (Run bash commands, Read files)
- Simple execution flow

**`.hansolo/commands/doc.md`** - Complex command example:
- Mode detection based on arguments
- Detailed step-by-step workflows
- Decision trees for logic branching
- Comprehensive reporting requirements
- Multiple modes (AUDIT and CREATE)

**Key Format Elements:**
```markdown
# Command Title
Brief description of what the command does

## Instructions

### Step 1: Do something
Description of what to do

### Step 2: Do something else
More detailed instructions

## Report

Summary section for results
```

**Target Location:** All new slash commands go in `.claude/commands/hansolo/` to match Claude Code plugin structure.

### Slash Command Requirements

Each slash command should follow these guiding principles:

#### 1. **Argument Specification**
- Include all arguments currently provided to MCP prompts
- Full descriptions for each argument
- Argument hints in the front matter
- Clear indication of required vs optional arguments

**Example Front Matter:**
```yaml
---
description: Start a new feature workflow
arguments:
  - name: description
    description: Description of the feature
    required: false
  - name: branchName
    description: Name for the feature branch
    required: false
  - name: auto
    description: Automatically resolve prompts
    required: false
---
```

#### 2. **Pre-flight Check Awareness**
- Understand required arguments for execution
- Know which pre-flight checks must pass
- Reference: `docs/dev/system/pre-flight-checks.md`
- Reference: `docs/dev/system/command-architecture.md`

#### 3. **State Management Logic Migration**

**Current State (MCP):**
- MCP command detects missing state (no session, no commit message, no PR description)
- Returns elicitation prompt for Claude to resolve
- Claude generates missing information and calls MCP again

**Target State (Slash Command):**
- Slash command handles state detection proactively
- Generates missing information (commit messages, PR descriptions, branch names)
- Calls MCP with complete arguments
- **MCP tools still validate pre-flight and post-flight checks but report outcomes** (not halt or elicit)
- Slash command/git-droid manages check results and determines next actions

**State Scenarios to Migrate:**
- No active session → Slash command prompts user or auto-generates
- No commit message → Slash command analyzes diff and generates message
- No PR description → Slash command analyzes commits and generates description
- No branch name → Slash command generates from description/changes

#### 4. **State Machine Rules**
- Understand state machine rules from MCP prompts and hansolo constitution
- Reference: `docs/dev/system/pre-flight-checks.md`
- Enforce same state transitions and validations
- Maintain session state integrity

#### 5. **Blocking vs Non-blocking Behavior**

**Non-blocking (Continue with guidance):**
- Missing optional parameters
- Warning-level pre-flight checks
- Informational messages

**Blocking (Halt and require resolution):**
- Error-level pre-flight checks
- Missing required session
- Critical validation failures
- Branch reuse violations

Reference: `docs/dev/system/pre-flight-checks.md` for complete blocking/non-blocking scenarios

#### 6. **MCP Tool Responsibilities**

MCP tools should be focused and single-purpose. Orchestration moves to slash commands/git-droid.

**Tool Constraints:**

**`commit` Tool:**
- **Focus:** Committing code only
- **Responsibilities:**
  - Stage files (all or staged only)
  - Create git commit with message
  - Update session state to CHANGES_COMMITTED
  - Validate pre-flight: session exists, has uncommitted changes
  - Report post-flight: commit successful, session state updated
- **Does NOT:**
  - Launch sessions
  - Generate commit messages (slash command does this)
  - Orchestrate multi-step workflows

**`ship` Tool:**
- **Focus:** Pushing, creating PRs, monitoring checks, merging
- **Responsibilities:**
  - Push branch to remote
  - Create or update pull request
  - Wait for CI checks to pass
  - Merge pull request (squash merge)
  - Validate pre-flight: session exists, on feature branch, no uncommitted changes, has commits
  - Report post-flight: PR created/merged, checks passed
- **Does NOT:**
  - Clean up branches (cleanup tool does this)
  - Switch to main (cleanup tool does this)
  - Commit uncommitted changes (commit tool does this)

**`cleanup` Tool:**
- **Focus:** Ensuring clean workable state after shipping
- **Responsibilities:**
  - Switch back to main branch
  - Pull latest from remote (sync main)
  - Delete local feature branch
  - Delete remote feature branch
  - Mark session as COMPLETE
  - Clean up session data
  - Validate pre-flight: on main or feature branch, no uncommitted changes
  - Report post-flight: on main, main synced, branches deleted, session closed
- **Does NOT:**
  - Merge PRs (ship tool does this)
  - Create commits (commit tool does this)

**General MCP Tool Pattern:**
- Perform focused, single-purpose operation
- Validate pre-flight checks → **Report results** (not halt)
- Execute operation
- Verify post-flight checks → **Report results**
- Return structured response with check outcomes
- Let slash command/git-droid decide next actions based on results

#### 7. **Orchestration Migration**

**Current State (MCP Server):**
- MCP prompts orchestrate multi-step workflows
- Example: `ship` detects uncommitted changes → returns elicitation → Claude commits → calls ship again
- Example: `commit` detects no session → returns elicitation → Claude launches → calls commit again
- Orchestration logic embedded in MCP tools

**Target State (Slash Command/git-droid):**
- Slash commands orchestrate workflows
- git-droid coordinates MCP tool calls
- MCP tools remain focused on single operations

**Orchestration Patterns:**

**Pattern 1: Slash Command Orchestration**
```
/hansolo ship
  ↓ (slash command checks state)
Has uncommitted changes?
  ↓ YES
Call /hansolo commit (via SlashCommand tool)
  ↓ (commit completes)
Call git-droid ship
  ↓ (ship completes)
Call git-droid cleanup
  ↓ (cleanup completes)
Display final result
```

**Pattern 2: git-droid Orchestration**
```
git-droid ship workflow
  ↓
Check pre-flight (via mcp commit tool)
  ↓ (uncommitted changes detected)
Request commit first (return to slash command)
  ↓ (slash command calls /hansolo commit)
Re-invoke ship workflow
  ↓
Call mcp ship tool (push, PR, merge)
  ↓
Call mcp cleanup tool (branches, main sync)
  ↓
Return aggregated results
```

**Using SlashCommand Tool:**

When orchestration requires calling other slash commands:

```markdown
# In /hansolo ship slash command

Check if session exists:
  - No session? Call `/hansolo launch` using SlashCommand tool
  - Session exists? Continue

Check for uncommitted changes:
  - Has changes? Call `/hansolo commit` using SlashCommand tool
  - No changes? Continue

Invoke git-droid ship workflow:
  - Call mcp ship tool
  - Call mcp cleanup tool
  - Display results
```

**Example SlashCommand Tool Usage:**
```typescript
// In slash command logic
if (!session) {
  // Call /hansolo launch to create session
  await slashCommandTool({
    command: "/hansolo launch",
    args: { description: featureDescription }
  });
}

if (hasUncommittedChanges) {
  // Call /hansolo commit to commit changes
  await slashCommandTool({
    command: "/hansolo commit",
    args: { message: generatedCommitMessage }
  });
}

// Now proceed with ship
await gitDroid.ship({ prDescription });
```

**Benefits of Orchestration Migration:**
- Clear separation of concerns
- MCP tools remain simple and focused
- Easier to test individual operations
- Better error handling and recovery
- Slash commands provide user-facing orchestration
- git-droid provides git-aware coordination

### Commands to Migrate

**From MCP Prompts:**
1. `/hansolo:init` → `/hansolo init`
2. `/hansolo:launch` → `/hansolo launch`
3. `/hansolo:commit` → `/hansolo commit`
4. `/hansolo:ship` → `/hansolo ship`
5. `/hansolo:status` → `/hansolo status`
6. `/hansolo:sessions` → `/hansolo sessions`
7. `/hansolo:swap` → `/hansolo swap`
8. `/hansolo:abort` → `/hansolo abort`
9. `/hansolo:cleanup` → `/hansolo cleanup`
10. `/hansolo:hotfix` → `/hansolo hotfix`
11. `/hansolo:status-line` → `/hansolo status-line`

**From Existing .hansolo/commands (already slash commands, migrate to .claude/commands/hansolo/):**
1. `.hansolo/commands/doc.md` → `.claude/commands/hansolo/doc.md`
2. `.hansolo/commands/prime.md` → `.claude/commands/hansolo/prime.md`

**Note:** The `.hansolo/commands/` files already use slash command format and should be used as reference examples for migrating MCP prompts.

### Migration Checklist per Command

**For MCP Prompts → Slash Commands:**
- [ ] Create slash command file in `.claude/commands/hansolo/`
- [ ] Use `.hansolo/commands/doc.md` and `prime.md` as format references
- [ ] Migrate argument specifications with full descriptions in front matter
- [ ] Migrate state detection and generation logic
- [ ] Implement orchestration logic (call other slash commands via SlashCommand tool)
- [ ] Implement pre-flight check result handling
- [ ] Maintain state machine rules
- [ ] Preserve blocking/non-blocking behavior
- [ ] Test with git-droid integration
- [ ] Update documentation

**For Existing .hansolo/commands → .claude/commands/hansolo:**
- [ ] Copy command file to `.claude/commands/hansolo/`
- [ ] Update any MCP-specific references to use new architecture
- [ ] Integrate with git-droid or docs-droid as appropriate
- [ ] Test functionality in new location
- [ ] Update documentation references

**For MCP Tools:**
- [ ] Simplify to single-purpose operation
- [ ] Keep pre-flight/post-flight validation but report results only
- [ ] Remove elicitation logic (moved to slash command)
- [ ] Remove orchestration logic (moved to slash command/git-droid)
- [ ] Return structured response with check outcomes
- [ ] Test individual operation in isolation
- [ ] Update API documentation

## Phase 1b: Prime Command Migration

### Objective

Migrate the `prime` command from `.hansolo/commands/prime.md` to `.claude/commands/hansolo/prime.md`.

### Source Reference

**Current:** `.hansolo/commands/prime.md`
```markdown
# Prime
> Execute the following sections to understand the codebase then summarize your understanding.

## Run
git ls-files

## Read
README.md
docs/README.md
```

### Migration Strategy

**Step 1: Direct Copy**
- Copy `.hansolo/commands/prime.md` to `.claude/commands/hansolo/prime.md`
- Provides immediate codebase priming functionality in new location

**Step 2: Enhancement (Optional)**
- Add more comprehensive codebase reading
- Include key system documentation references
- Add architecture diagram references
- Include recent change summaries

**Purpose:**
The prime command helps Claude quickly understand the hansolo codebase structure by:
- Listing all files in the repository
- Reading core documentation (README, docs structure)
- Providing foundation for working with the codebase

**Usage:**
- `/hansolo prime` - Prime understanding of hansolo codebase

## Phase 2: Git Management Sub-Agent

### Objective

Create a specialized `git-droid` sub-agent to handle all git operations for han-solo.

### Sub-Agent Principles

The git-droid should understand and enforce:

1. **Modern Git Workflow Best Practices**
   - Feature branch workflow
   - Trunk-based development principles
   - Clean, linear commit history

2. **Safety Guardrails**
   - Prevent accidental commits to main
   - Detect and prevent merge conflicts
   - Never lose work (smart stashing, recovery)
   - Validate before destructive operations

3. **Feature-Driven Approach**
   - Feature-driven branch naming
   - Feature-driven commit organization
   - Clear relationship between features and PRs

4. **Consistent Conventions**
   - Conventional commit messages (feat/fix/docs/refactor/etc)
   - Descriptive PR descriptions (Summary, Changes, Testing sections)
   - Smart branch naming based on standard conventions
   - Smart stash naming based on commit message conventions

### Git-Droid Capabilities

**Core Operations:**
- Branch management (create, delete, switch, list)
- Commit operations (stage, commit, amend)
- Stash operations (save, pop, list, apply)
- Remote operations (push, pull, fetch)
- Status and diff queries
- Conflict detection and resolution guidance

**Orchestration:**
- Coordinate multi-step git workflows
- Call MCP tools in proper sequence
- Handle check results from MCP tools
- Decide next actions based on validation outcomes
- Aggregate results from multiple operations

**Smart Features:**
- Generate commit messages from diffs
- Generate PR descriptions from commits
- Generate branch names from descriptions
- Suggest resolution for common issues
- Validate operations before execution
- Recover from failed operations

### Usage Pattern

```
User → /hansolo launch "Add user authentication"
  ↓
Slash Command → git-droid: create branch with smart name
  ↓
git-droid → MCP tools: perform git operations
  ↓
git-droid → Returns structured result with pre-flight checks
  ↓
Slash Command → Displays formatted output to user
```

### Output Style

Create custom output style for git-droid that displays:

**Structured Result Format:**
```
🔍 Pre-flight Checks
  ✓ Check 1: Success message
  ✗ Check 2: Failure message
    💡 Suggestion: How to resolve

📋 Steps Executed
  1. Created branch: feature/user-authentication
  2. Stashed 3 uncommitted files
  3. Checked out new branch

✅ Post-flight Verifications
  ✓ Verification 1: Success
  ✓ Verification 2: Success

📊 Summary
  Branch: feature/user-authentication
  Session: abc-123-def
  State: BRANCH_READY
```

**Table Format for Lists:**
- Session lists
- Branch lists
- Commit histories
- Stash lists

### Integration Points

**Slash Commands → git-droid:**
- Pass high-level intent ("create feature branch for X")
- git-droid determines specific operations
- git-droid orchestrates MCP tool calls
- git-droid returns aggregated results

**git-droid → MCP Tools:**
- Primary mechanism for git operations
- Call MCP tools for focused operations (commit, ship, cleanup)
- Receive pre-flight/post-flight check results
- Decide next actions based on check outcomes
- Use existing MCP tools where available
- Fallback to GitHub API/CLI for unsupported operations

**git-droid → Slash Commands (via SlashCommand tool):**
- Call other slash commands when workflow requires it
- Example: ship workflow needs commit → calls `/hansolo commit`
- Example: commit workflow needs session → calls `/hansolo launch`
- Maintains clean separation and reusability

**git-droid → Output:**
- Format results using custom output style
- Aggregate pre-flight/post-flight checks from all called tools
- Provide actionable feedback
- Display complete workflow status

### Migration from MCP

**Current MCP Direct Calls:**
```typescript
// In slash command or MCP tool
await gitOps.createBranch(branchName);
await gitOps.commit(message);
```

**Target git-droid Pattern:**
```
/hansolo ship
  ↓ (slash command detects uncommitted changes)
Call /hansolo commit (via SlashCommand tool)
  ↓ (commit slash command)
git-droid: commit workflow
  ↓ (sub-agent orchestrates)
Call mcp commit tool → returns check results
  ↓ (git-droid evaluates results)
Returns: Structured result with checks
  ↓ (back to ship slash command)
git-droid: ship workflow
  ↓ (sub-agent orchestrates)
Call mcp ship tool → returns check results
Call mcp cleanup tool → returns check results
  ↓ (git-droid aggregates results)
Returns: Complete workflow result
```

**Separation of Concerns:**
- **Slash Commands:** User interface, orchestration decisions, state generation
- **git-droid:** Git workflow coordination, MCP tool sequencing, result aggregation
- **MCP Tools:** Focused operations, validation reporting, state persistence

## Phase 3: Documentation Management

### Objective

Migrate documentation management to slash commands and create a specialized `docs-droid` sub-agent.

### Slash Command Migration

**Current:** `.hansolo/commands/doc.md` - Existing slash command for documentation management

**Source Reference:** `.hansolo/commands/doc.md`
- Already implements AUDIT MODE (no arguments) and CREATE MODE (with arguments)
- Follows han-solo documentation structure and conventions
- Comprehensive workflow for checking, fixing, and creating documentation
- Directly calls file operations (Read, Write, Edit tools)
- Should be migrated to `.claude/commands/hansolo/doc.md`

**Migration Strategy:**

**Step 1: Direct Copy**
- Copy `.hansolo/commands/doc.md` to `.claude/commands/hansolo/doc.md`
- This provides immediate functionality in new location

**Step 2: Integration with docs-droid**
- Enhance slash command to use docs-droid sub-agent for operations
- docs-droid provides coordination and smart features
- Slash command remains the user interface

**Step 3: Format Alignment**
- Ensure front matter matches Claude Code slash command format
- Add argument hints and descriptions
- Update any MCP-specific references

**Current Capabilities:**
- `/hansolo doc` (no args) - AUDIT MODE: Check existing documentation for issues and fix them
  - Scans all `.md` files in `docs/` directory
  - Checks naming conventions (`lowercase-with-hyphens.md`)
  - Validates placement per `docs/README.md` guidelines
  - Identifies missing README.md entries
  - Finds superseded documents
  - Offers to fix all issues found
  - Updates all README.md files
  - Archives outdated documentation

- `/hansolo doc <name> <content>` - CREATE MODE: Create new documentation from provided content
  - Analyzes content to determine placement
  - Applies naming conventions
  - Checks for superseded documents
  - Creates document in correct location
  - Updates appropriate README.md
  - Archives old versions if needed

**Planned Extensions:**
- `/hansolo doc update <file>` - Update existing documentation
- `/hansolo doc archive <file>` - Archive specific documentation (currently part of audit mode)

### Docs-Droid Principles

The docs-droid should maintain:

1. **Standard Documentation Structure**
   - Folder structure as defined in `docs/README.md`
   - Naming conventions: `lowercase-with-hyphens.md`
   - Dated snapshots: `repomix-2025-10-11.md`

2. **Documentation Guidelines**
   - Follow CLAUDE.md guidelines
   - Use decision tree from `docs/README.md`
   - Reference: `docs/dev/system/documentation-guidelines.md` (if exists)

3. **Relevance Maintenance**
   - Automatically archive outdated documentation
   - Update README.md indexes in each folder
   - Flag superseded documents
   - Maintain cross-references

4. **AI Agent Optimization**
   - Generate clear, structured documentation
   - Include metadata for AI consumption
   - Maintain relationships between documents
   - Support semantic search and retrieval

### Docs-Droid Capabilities

**Document Management:**
- Create documentation in correct location
- Update existing documentation
- Archive superseded documents
- Generate README.md indexes

**Validation:**
- Check naming conventions
- Verify correct folder placement
- Detect missing README entries
- Identify outdated documents

**Smart Features:**
- Suggest correct location based on content
- Generate appropriate filenames
- Update cross-references automatically
- Archive with metadata preservation

### Usage Pattern

```
User → /hansolo doc create "API Guide" <content>
  ↓
Slash Command → docs-droid: analyze and place document
  ↓
docs-droid → Determines location (guides/, dev/, etc)
  ↓
docs-droid → Creates file with correct naming
  ↓
docs-droid → Updates relevant README.md
  ↓
docs-droid → Returns summary of actions
```

### Output Style

Similar to git-droid, create structured output:

```
📝 Documentation Action

📋 Analysis
  Type: User guide
  Audience: End users
  Location: docs/guides/

✅ Actions Taken
  ✓ Created: docs/guides/api-guide.md
  ✓ Updated: docs/guides/README.md
  ✓ Validated: Naming conventions
  ✓ Cross-referenced: Related documents

📊 Summary
  File: api-guide.md
  Location: docs/guides/
  Size: 2,345 words
  Status: Active
```

## Phase 4: Cleanup and Testing

### Cleanup Tasks

1. **Remove Redundant MCP Code**
   - Identify MCP-specific code no longer needed
   - Remove elicitation logic moved to slash commands
   - Clean up unused imports and dependencies

2. **Update Documentation**
   - Update all references to MCP prompts
   - Document new slash command usage
   - Update architecture diagrams
   - Revise installation and setup guides

3. **Configuration Migration**
   - Update MCP server configuration if needed
   - Add sub-agent configurations
   - Update Claude Code settings

### Testing Strategy

**Unit Tests:**
- Test slash commands independently
- Test git-droid operations
- Test docs-droid operations
- Test MCP tools (reduced scope)

**Integration Tests:**
- Test full workflows (launch → commit → ship)
- Test sub-agent coordination
- Test error handling and recovery
- Test state machine transitions

**User Acceptance Testing:**
- Test with real git repositories
- Test with various git states
- Test error scenarios
- Gather user feedback

## Migration Strategy

### Approach

**Incremental Migration (Recommended):**
1. Implement git-droid sub-agent
2. Migrate one slash command at a time
3. Test thoroughly after each migration
4. Keep MCP fallback during transition
5. Complete docs-droid after core commands stable
6. Final cleanup and removal of old code

**Advantages:**
- Lower risk
- Easier to debug
- Can rollback individual commands
- Users can test incrementally

### Risk Mitigation

**Risks:**
1. Breaking existing workflows
2. Data loss during migration
3. State inconsistencies
4. Performance regressions

**Mitigations:**
1. Comprehensive testing at each step
2. Maintain backward compatibility during transition
3. Detailed migration documentation
4. User communication and support
5. Rollback plan for each phase

## Success Criteria

**Functional:**
- [ ] All slash commands working with full feature parity
- [ ] git-droid handling all git operations correctly
- [ ] docs-droid managing documentation effectively
- [ ] All tests passing
- [ ] No redundant MCP code remaining

**User Experience:**
- [ ] Clearer command interface
- [ ] Better error messages
- [ ] Improved output formatting
- [ ] Faster execution (if applicable)
- [ ] Easier to understand and use

**Technical:**
- [ ] Clean architecture with clear separation of concerns
- [ ] Well-documented sub-agents
- [ ] Maintainable codebase
- [ ] Good test coverage
- [ ] Performance baseline maintained or improved

## Open Questions

1. **Official Claude Code Documentation**
   - Where is the official documentation for custom slash commands?
   - What are the latest best practices for sub-agents?
   - Are there examples of similar migrations?

2. **Backward Compatibility**
   - Should we maintain MCP prompts during transition?
   - How long should transition period last?
   - What communication plan for users?

3. **Sub-Agent Implementation**
   - Best practices for sub-agent creation?
   - How to handle sub-agent output styling?
   - Performance implications of sub-agents?

4. **Migration Details**
   - Which specific code should be deleted?
   - Which MCP tools should remain?
   - How to handle edge cases?

## Next Steps

1. **Research Phase**
   - Review official Claude Code documentation
   - Study sub-agent best practices
   - Analyze current MCP implementation in detail

2. **Design Phase**
   - Design git-droid architecture
   - Design docs-droid architecture
   - Design slash command structure
   - Plan migration sequence

3. **Implementation Phase**
   - Implement git-droid
   - Migrate first slash command (status - read-only)
   - Test and iterate
   - Continue with remaining commands

4. **Validation Phase**
   - Run full test suite
   - Perform user acceptance testing
   - Gather feedback
   - Refine based on learnings

---

**References:**
- `docs/dev/system/pre-flight-checks.md` - Pre-flight check specifications
- `docs/dev/system/command-architecture.md` - Command architecture details
- `docs/README.md` - Documentation structure
- `CLAUDE.md` - Project guidelines
