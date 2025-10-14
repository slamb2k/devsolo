# Feature: Command Output Consistency Alignment

## Feature Description

Standardize all devsolo command outputs to provide a consistent, intuitive user experience across all workflow operations. This feature ensures that:

1. **Pre-flight and Post-flight Sections**: Commands that perform validation (launch, commit, ship, swap, abort, cleanup, hotfix) display clearly labeled "Pre-flight Checks:" and "Post-flight Verifications:" sections
2. **Numbered User Options**: All user choices are presented as numbered options (1, 2, 3) with one option clearly marked as [RECOMMENDED]
3. **Structured Data Flow**: MCP tools return structured data (CheckOption arrays) that sub-agents format into consistent output
4. **Clear Responsibility Boundaries**: MCP layer returns data, sub-agent layer formats it, command layer orchestrates
5. **Visual Consistency**: All commands follow predictable patterns making the system intuitive and professional

This enhances usability by making command outputs predictable, professional, and easy to scan, while maintaining clean architectural separation between data generation and presentation.

## User Story

As a **developer using devsolo**
I want to **see consistent, clearly labeled output from all commands**
So that **I can quickly understand workflow state, validation results, and available options without confusion**

## Problem Statement

Currently, devsolo command outputs lack consistency across different commands:

1. **Inconsistent Section Labels**: Pre-flight and post-flight checks are displayed differently across commands, making it hard to identify validation stages
2. **Mixed Option Formats**: Some commands present options as letters (a/b/c), others as natural language prompts, creating cognitive overhead
3. **Unclear Recommendations**: Users don't know which option is safest or recommended, leading to hesitation
4. **Blurred Responsibilities**: Command files contain formatting logic that should be in sub-agents, and sub-agents sometimes duplicate MCP logic
5. **No Standard Template**: Each command has evolved independently without a unified output pattern

This inconsistency makes the system feel unpolished and increases the learning curve for users.

## Solution Statement

Implement a standardized output pattern system with three distinct layers:

**Layer 1: MCP Tools** (Data Generation)
- Return structured `CheckOption[]` arrays with all metadata (id, label, description, action, autoRecommended, risk)
- Return structured pre-flight and post-flight check results
- No formatting logic - pure data

**Layer 2: Sub-Agents** (Formatting)
- git-droid and docs-droid format structured data from MCP tools
- Apply standard templates with fixed section labels
- Convert CheckOption arrays to numbered lists with [RECOMMENDED] markers
- Handle all presentation logic

**Layer 3: Commands** (Orchestration)
- Display ASCII banner
- Invoke sub-agent with appropriate parameters
- Sub-agent handles MCP tool calls and formatting
- Present final output to user

**Standard Output Pattern for Validation Commands:**
```
[ASCII Banner]

## 🔍 Analysis (optional)

**Pre-flight Checks:**
- ✓ Check name (passed)
- ✗ Check name (failed)

**Options Required:**
Please choose an option:

1. Primary option (description) [RECOMMENDED]
   Risk: Low | Action: what happens

2. Alternative option (description)
   Risk: Medium | Action: what happens

---

**Operations Executed:**
- ✓ Operation 1
- ✓ Operation 2

**Post-flight Verifications:**
- ✓ Verification 1
- ✓ Verification 2

---

## ✅ Result Summary

**Next Steps:**
- Actionable guidance
```

## Relevant Files

### Output Style Guides
- **`.claude/output-styles/git-droid.md`** - Defines output formatting standards for git workflow operations. Needs update to include standard section labels and numbered option format.
- **`.claude/output-styles/docs-droid.md`** - Defines output formatting for documentation operations. Needs consistency with git-droid patterns.

### Sub-Agent Definitions
- **`.claude/agents/git-droid.md`** - Git workflow coordination agent. Needs explicit formatting templates and responsibility clarification (formats MCP data, doesn't duplicate logic).
- **`.claude/agents/docs-droid.md`** - Documentation management agent. Needs standard template updates.

### Command Files (All need orchestration-only updates)
- **`.claude/commands/devsolo/launch.md`** - Remove formatting instructions, rely on git-droid
- **`.claude/commands/devsolo/commit.md`** - Remove formatting instructions, rely on git-droid
- **`.claude/commands/devsolo/ship.md`** - Remove formatting instructions, rely on git-droid
- **`.claude/commands/devsolo/swap.md`** - Remove formatting instructions, rely on git-droid
- **`.claude/commands/devsolo/abort.md`** - Remove formatting instructions, rely on git-droid
- **`.claude/commands/devsolo/cleanup.md`** - Remove formatting instructions, rely on git-droid
- **`.claude/commands/devsolo/hotfix.md`** - Remove formatting instructions, rely on git-droid
- **`.claude/commands/devsolo/status.md`** - Simple command, ensure consistent format
- **`.claude/commands/devsolo/sessions.md`** - Simple command, ensure consistent format
- **`.claude/commands/devsolo/init.md`** - Simple command, ensure consistent format
- **`.claude/commands/devsolo/status-line.md`** - Simple command, ensure consistent format
- **`.claude/commands/devsolo/prime.md`** - Informational command, no changes needed
- **`.claude/commands/devsolo/doc.md`** - Uses docs-droid, update to match patterns

### Validation Services (Reference Only - No Changes Needed)
- **`src/services/validation/pre-flight-check-service.ts`** - Contains CheckOption structure (lines 8-15) already properly designed
- **`src/services/validation/post-flight-verification.ts`** - Post-flight check structure
- **`src/mcp/tools/workflow-tool-base.ts`** - Standardized workflow execution pattern (lines 54-118)
- **`src/mcp/tools/base-tool.ts`** - Tool result interfaces

### Reference Documentation
- **`docs/dev/reports/command-output-consistency-review.md`** - Current state analysis and examples. Will be updated to reflect new standards.

### New Files

None - all changes are to existing files.

## Implementation Plan

### Phase 1: Foundation - Define Standard Patterns

**Create the definitive output pattern specification:**
1. Document standard section labels and ordering
2. Define numbered option format with [RECOMMENDED] indicator
3. Clarify layer responsibilities (MCP data, sub-agent formatting, command orchestration)
4. Create before/after examples for all command types

**Deliverable**: Updated `docs/dev/reports/command-output-consistency-review.md` with canonical patterns

### Phase 2: Core Implementation - Sub-Agent Templates

**Update sub-agent formatting logic:**
1. Update git-droid with standard output templates
2. Add CheckOption → numbered list formatting rules
3. Add explicit section labels ("Pre-flight Checks:", "Post-flight Verifications:")
4. Update docs-droid to match patterns
5. Remove any logic that duplicates MCP tool responsibilities

**Deliverable**: Updated `.claude/agents/git-droid.md` and `.claude/agents/docs-droid.md` with templates

### Phase 3: Integration - Command File Updates

**Simplify command files to pure orchestration:**
1. Update validation commands (launch, commit, ship, swap, abort, cleanup, hotfix)
2. Update query commands (status, sessions, init, status-line)
3. Update special commands (doc)
4. Remove all formatting instructions from command files
5. Add clear delegation to sub-agents

**Deliverable**: All 13 command files updated for consistency

## Step by Step Tasks

### Step 1: Update Output Style Guide for git-droid

- Read current `.claude/output-styles/git-droid.md`
- Add "Standard Output Pattern for Validation Commands" section with complete template
- Add "Numbered Option Format" section specifying:
  - Format: `1. Label (description) [RECOMMENDED]`
  - Risk display: `Risk: Low | Action: what happens`
  - Auto-recommended option always has `[RECOMMENDED]` marker
- Add "Standard Section Labels" section mandating:
  - "Pre-flight Checks:" (not "Pre-flight checks" or "PreFlight")
  - "Post-flight Verifications:" (not "Post-flight checks")
  - "Operations Executed:" (not "Operations" or "Steps")
  - "Result Summary:" or "Error Summary:"
  - "Next Steps:" (always ends with this)
- Add examples showing complete output for success and failure cases
- Update existing examples to use new patterns

### Step 2: Update Output Style Guide for docs-droid

- Read current `.claude/output-styles/docs-droid.md`
- Ensure consistency with git-droid patterns (section labels, formatting)
- Add numbered option format for audit mode confirmations
- Update examples to match new standards

### Step 3: Update git-droid Agent Definition

- Read current `.claude/agents/git-droid.md`
- Add "Output Formatting Responsibility" section clarifying:
  - git-droid receives structured data from MCP tools
  - git-droid formats using templates from output style guide
  - git-droid does NOT duplicate MCP tool logic
- Add "Standard Output Templates" section with:
  - Template for successful operations
  - Template for operations with prompts
  - Template for failed operations
- Add "CheckOption Formatting" section showing how to convert CheckOption[] to numbered list
- Update all example scenarios to show new output format
- Add explicit instruction: "MUST use section labels exactly as specified in output style guide"

### Step 4: Update docs-droid Agent Definition

- Read current `.claude/agents/docs-droid.md`
- Add similar "Output Formatting Responsibility" section
- Add templates for audit mode and create mode
- Ensure numbered options for "Fix these issues? [y/N]" prompts
- Update examples to match new format

### Step 5: Update Validation Command Files (7 files)

For each of launch, commit, ship, swap, abort, cleanup, hotfix:
- Remove all formatting instructions (move to git-droid)
- Update workflow section to:
  1. Display banner
  2. Invoke git-droid sub-agent
  3. git-droid analyzes, calls MCP tools, formats output
  4. Report results (git-droid handles all formatting)
- Simplify to pure orchestration
- Reference git-droid output style for formatting

### Step 6: Update Query Command Files (4 files)

For each of status, sessions, init, status-line:
- These bypass sub-agents (call MCP directly)
- Ensure consistent output structure:
  - Banner
  - Main content (formatted tables/lists)
  - Next steps
- No pre-flight/post-flight sections (these tools don't use validation)
- Keep formatting in command file (no sub-agent involved)

### Step 7: Update Special Command Files (2 files)

- **prime.md**: No changes needed (informational only)
- **doc.md**: Update to delegate formatting to docs-droid, ensure numbered options

### Step 8: Update Consistency Review Document

- Read current `docs/dev/reports/command-output-consistency-review.md`
- Update all example outputs to show:
  - Exact section labels ("Pre-flight Checks:" not "Pre-flight checks")
  - Numbered options with [RECOMMENDED]
  - Consistent section ordering
- Add "Layer Responsibility" section explaining:
  - MCP: Returns `preFlightChecks: CheckResult[]`, `postFlightVerifications: CheckResult[]`
  - Sub-agent: Formats into "Pre-flight Checks:" and "Post-flight Verifications:" sections
  - Command: Displays banner, invokes sub-agent
- Update all 13 command examples
- Add before/after comparisons showing improvements

### Step 9: Validate All Command Outputs

- Review each command definition
- Trace data flow: Command → Sub-agent → MCP → Sub-agent → User
- Verify section labels are exact
- Verify option format is consistent
- Verify responsibility boundaries are clear
- Check no formatting logic remains in command files
- Check no MCP logic duplication in sub-agents

## Testing Strategy

### Unit Tests

No unit tests required - this is a documentation/template update, not code changes.

### Integration Tests

**Manual Testing Approach:**
1. Test each command with various scenarios
2. Verify section labels appear exactly as specified
3. Verify options are numbered with [RECOMMENDED]
4. Verify pre-flight/post-flight sections appear for validation commands
5. Verify consistent ordering across all commands

**Test Scenarios:**
- Launch with clean directory → verify pre-flight shows ✓
- Launch with uncommitted changes → verify numbered options appear
- Commit with no changes → verify error handling
- Ship with uncommitted changes → verify auto-commit flow
- All commands with --auto flag → verify [RECOMMENDED] option used

### Edge Cases

- Commands called when not initialized (init required)
- Commands with multiple failed pre-flight checks (multiple option sets)
- Commands with warnings but no errors (proceed with warning display)
- Commands with prompt-level checks (options displayed)
- Commands in auto mode (automatic option selection)
- Commands with no active session (appropriate guidance)

## Acceptance Criteria

1. ✅ All validation commands (launch, commit, ship, swap, abort, cleanup, hotfix) display "Pre-flight Checks:" section
2. ✅ All validation commands display "Post-flight Verifications:" section after operations
3. ✅ All user options are numbered (1, 2, 3, ...) consistently
4. ✅ Exactly one option in each set has [RECOMMENDED] marker
5. ✅ Section labels are exact matches across all commands
6. ✅ Query commands (status, sessions, init, status-line) use simpler format without check sections
7. ✅ Command files contain only orchestration logic (no formatting)
8. ✅ Sub-agent files contain all formatting templates and logic
9. ✅ Output style guides document exact patterns with examples
10. ✅ Consistency review document shows canonical examples for all commands
11. ✅ Risk levels displayed for all options (Risk: Low/Medium/High)
12. ✅ Actions shown for all options (Action: what gets executed)
13. ✅ "Next Steps:" section appears at end of every command output
14. ✅ ASCII banners display before all operations
15. ✅ Success uses "## ✅", errors use "## ✗"

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

**Since this is documentation/template updates, validation is manual review:**

1. **Review all updated files**:
   ```bash
   git diff .claude/output-styles/
   git diff .claude/agents/
   git diff .claude/commands/devsolo/
   git diff docs/dev/reports/command-output-consistency-review.md
   ```

2. **Verify section label consistency**:
   ```bash
   grep -r "Pre-flight Checks:" .claude/
   grep -r "Post-flight Verifications:" .claude/
   grep -r "Operations Executed:" .claude/
   grep -r "Next Steps:" .claude/
   ```

3. **Check for formatting instructions in command files** (should find none):
   ```bash
   grep -r "format" .claude/commands/devsolo/ | grep -v "format:" | grep -v "## "
   ```

4. **Verify numbered option format**:
   ```bash
   grep -r "\[RECOMMENDED\]" .claude/
   ```

5. **Test each command scenario** (manual):
   - `/devsolo:launch` with clean directory
   - `/devsolo:launch` with uncommitted changes (verify numbered options)
   - `/devsolo:commit` with changes
   - `/devsolo:ship` complete workflow
   - `/devsolo:info` query
   - `/devsolo:sessions` list

6. **Verify output examples in consistency review**:
   ```bash
   cat docs/dev/reports/command-output-consistency-review.md | grep "Pre-flight Checks:"
   cat docs/dev/reports/command-output-consistency-review.md | grep "\[RECOMMENDED\]"
   ```

## Notes

### Key Design Decisions

1. **Why numbered options?**
   - More intuitive than letters (a/b/c)
   - Scales better (can show 10+ options)
   - Industry standard (installers, CLI tools)
   - Clear hierarchy (1 is typically "yes/continue")

2. **Why [RECOMMENDED]?**
   - Reduces decision paralysis
   - Guides users to safest option
   - Aligns with auto mode behavior
   - Clear visual indicator

3. **Why exact section labels?**
   - Pattern recognition
   - Scanability
   - Professional appearance
   - Consistency builds trust

4. **Why separate layers?**
   - Single Responsibility Principle
   - MCP tools can be tested independently
   - Sub-agents can be reused
   - Commands remain simple
   - Easy to maintain and extend

### Future Considerations

1. **Internationalization**: If devsolo ever supports multiple languages, the section labels can be translated while maintaining structure
2. **Color coding**: Future enhancement could add color to section headers for visual distinction
3. **Machine-readable output**: The structured CheckOption format could be exposed as JSON for programmatic consumption
4. **Logging**: Structured output makes it easy to log workflow stages for debugging
5. **Analytics**: Consistent patterns enable tracking which options users choose most often

### Dependencies

- No new dependencies required
- No code changes required
- No breaking changes to MCP tool interfaces
- Backward compatible (existing CheckOption structure unchanged)

### Migration Notes

This is a documentation-only change with no code modifications. All existing MCP tools, services, and validation logic remain unchanged. The CheckOption structure in `src/services/validation/pre-flight-check-service.ts` already contains all necessary fields (id, label, description, action, autoRecommended, risk) - we're simply standardizing how this data is formatted in output.

### Reference Standards

- Section labels use Title Case with colon: "Pre-flight Checks:"
- Options use sentence case: "Stash changes and continue"
- Risk levels: Low, Medium, High (capitalized)
- Success indicator: ✅ (green check emoji)
- Failure indicator: ✗ (red X)
- Individual checks: ✓ (checkmark) for pass, ✗ for fail, ⚠ for warning
- Sections separated by `---` horizontal rules
- Markdown headers: `##` for major sections, `###` for subsections
