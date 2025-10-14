# Doc

Manage documentation following devsolo's documentation structure and conventions.

## Arguments

- No arguments: Run in **AUDIT MODE** - scan and fix documentation issues
- With arguments: Run in **CREATE MODE** - create new documentation

## Workflow

1. **Use the Task tool** to invoke the docs-droid sub-agent:
   - **subagent_type:** "docs-droid"
   - **description:** "Manage documentation"
   - **prompt:** "Execute documentation management according to the mode (audit or create) with the following parameters: [pass all user arguments]. You must:
     - For AUDIT MODE (no arguments): Scan all documentation, identify issues, report findings, present numbered options, and fix if approved
     - For CREATE MODE (with arguments): Analyze content, determine placement, apply naming conventions, check for superseded docs, create document, update READMEs
     - Format all results following docs-droid output style from `.claude/output-styles/docs-droid.md`
     - Use numbered options (3+ choices) with [RECOMMENDED] marker or yes/no for binary choices
     - Provide structured findings reports and summary reports with action counts"

2. **Display docs-droid's output verbatim** to the user
   - Show the complete formatted output exactly as returned by docs-droid
   - Do NOT add commentary, summaries, or interpretations
   - Do NOT intercept or modify the output
   - The user needs to see the options and formatted sections directly

**Output Formatting:** docs-droid handles all output formatting including:
- Structured findings reports with clear sections
- Numbered options for multiple choices (3+ options) with [RECOMMENDED] marker
- Yes/no confirmations for simple binary choices
- Summary reports with action counts
- Follow patterns from `.claude/output-styles/docs-droid.md`

### Mode 1: AUDIT MODE (No Arguments)

When called without arguments, performs a comprehensive documentation audit.

1. **Read Documentation Guidelines**
   - Load docs/README.md to understand structure and rules

2. **Scan All Documentation**
   - Find all .md files in docs/ directory
   - Check naming conventions (lowercase-with-hyphens.md)
   - Validate folder placement
   - Verify README.md completeness

3. **Identify Issues**
   - Naming violations (PascalCase, underscores, spaces)
   - Placement errors (wrong folders)
   - Missing README.md entries
   - Archival candidates (completed plans, superseded docs)

4. **Report Findings**
   - Show all issues in structured format
   - Group by issue type (naming, placement, missing entries, archival candidates)
   - Provide suggested fixes for each issue
   - Count total issues by category

5. **Present Options** (if issues found)
   - Use numbered options (1, 2, 3) for 3+ choices
   - Mark recommended option with [RECOMMENDED]
   - Show risk level and action for each option
   - Example options:
     1. Fix all issues (rename, move, update READMEs, archive) [RECOMMENDED]
     2. Fix only naming violations
     3. Skip fixes and report only

6. **Fix Issues (if approved)**
   - Rename files to follow conventions
   - Move files to correct folders
   - Update all README.md files
   - Archive superseded documents

7. **Summary Report**
   - Files renamed (count and list)
   - Files moved (count and list)
   - READMEs updated (count and list)
   - Documents archived (count and list)
   - Total changes made

#### Example

```
# Run documentation audit
/devsolo:doc

docs-droid will scan, report issues, and offer to fix them.
```

### Mode 2: CREATE MODE (With Arguments)

When called with arguments, creates new documentation from provided content.

**Arguments in Create Mode:**
- First argument: Document name (will be converted to lowercase-with-hyphens.md)
- Remaining arguments: Document content (markdown)

1. **Analyze Content**
   - Determine primary audience (users, developers, AI)
   - Identify document type (guide, spec, plan, report, reference)
   - Assess technical level and scope

2. **Determine Placement**
   - Apply decision tree from docs/README.md
   - Choose correct folder based on audience and type
   - Validate placement rules

3. **Apply Naming Conventions**
   - Convert to lowercase-with-hyphens.md
   - Handle special cases (dates, versions, scopes)
   - Ensure descriptive and concise

4. **Check for Superseded Documents**
   - Search for similar existing documents
   - Identify if any should be archived
   - Handle versioning appropriately

5. **Create Document**
   - Write file to determined location
   - Update folder's README.md
   - Archive superseded documents (if any)

6. **Report Actions**
   - Document created (path and size)
   - Placement reasoning (why this folder was chosen)
   - Naming applied (show before/after if converted)
   - READMEs updated (list which ones)
   - Documents archived (if any, with reason)

#### Examples

```
# Create user guide
/devsolo:doc "migration-guide" "# Migration Guide

How to migrate from v1 to v2...

## Steps
1. Backup your data
2. Install v2
3. Run migration script"

# Create implementation plan
/devsolo:doc "auth-feature-plan" "# Authentication Feature Plan

## Overview
Implement OAuth2 authentication...

## Tasks
- [ ] Design auth flow
- [ ] Implement OAuth2 provider
- [ ] Add tests"

# Create bug report
/devsolo:doc "login-bug-analysis" "# Login Bug Analysis

## Issue
Users cannot login after password reset...

## Root Cause
Session token not invalidated..."
```

## Documentation Structure

docs-droid follows this structure:

```
docs/
├── guides/              # User-facing how-to docs
├── reference/           # External references and AI context
├── dev/
│   ├── system/         # Internal system docs (source of truth)
│   ├── plans/          # Implementation plans and roadmaps
│   ├── reports/        # Bug reports, reviews, summaries
│   └── learnings/      # Patterns and best practices
├── specs/              # Product specifications
└── archive/            # Historical/superseded docs
```

## Naming Conventions

docs-droid enforces **lowercase-with-hyphens.md**:

```
✅ CORRECT:
- quickstart.md
- mcp-integration.md
- feature-auth-plan.md

❌ INCORRECT:
- QuickStart.md
- mcp_integration.md
- Feature Plan.md
```

## Placement Decision Tree

docs-droid uses this logic:

**Step 1: Who is the audience?**
- End users → docs/guides/
- AI/researchers → docs/reference/
- Developers → Step 2

**Step 2: What type of dev doc?**
- Internal system docs → docs/dev/system/
- Implementation plans → docs/dev/plans/
- Bug reports/reviews → docs/dev/reports/
- Patterns/learnings → docs/dev/learnings/
- Product specs → docs/specs/
- Historical → docs/archive/

## Notes

- docs-droid is strict about naming (no exceptions except README.md)
- docs-droid validates placement against docs/README.md rules
- docs-droid maintains all README.md files
- docs-droid automatically archives superseded documents
- All actions are reported clearly
- Audit mode asks before making changes
- Create mode determines placement automatically
- No banner display for this command (docs-droid handles all output)
