# Documentation Management
Manage documentation following han-solo's documentation structure and conventions.

## Instructions

### Mode Detection

**If NO arguments provided** (`$ARGUMENTS` is empty):
- Run in **AUDIT MODE**: Check existing documentation for issues and fix them

**If arguments provided**:
- Run in **CREATE MODE**: Create new documentation from provided content

---

## AUDIT MODE (No Arguments)

When called without arguments, perform a comprehensive documentation audit and cleanup.

### Step 1: Read Documentation Guidelines
Read `docs/README.md` to understand:
- Folder structure and placement rules
- Naming conventions
- Document organization principles

### Step 2: Scan All Documentation Files
Find all `.md` files in the `docs/` directory and check for:

**Naming Convention Issues**:
- Files NOT using `lowercase-with-hyphens.md` format
- Examples: `QuickStart.md`, `mcp_integration.md`, `API.md`, `Feature Plan.md`
- Exceptions: `README.md` files are always allowed

**Placement Issues**:
- User guides in wrong folders (should be in `docs/guides/`)
- Internal system docs in wrong locations (should be in `docs/dev/system/`)
- External docs not in `docs/reference/`
- Implementation plans not in `docs/dev/plans/`
- Reports not in `docs/dev/reports/`

**Missing from README.md**:
- Documents that exist but aren't listed in their folder's README.md

**Superseded Documents**:
- Multiple versions of the same document (keep latest, archive old)
- Completed implementation plans (should be in `docs/archive/`)
- Deprecated specifications

### Step 3: Report Issues
List all issues found with:
- Current file path
- Issue type (naming, placement, or both)
- Suggested fix (correct filename and/or location)

### Step 4: Offer to Fix
Ask the user if they want to fix these issues. If yes:
- Rename files to follow conventions
- Move files to correct folders
- Update all README.md files
- Archive superseded documents

### Step 5: Update README Files
Regardless of issues found, audit and update all README.md files:
- Ensure all documents in each folder are listed
- Remove entries for non-existent files
- Maintain alphabetical or logical ordering
- Add missing document descriptions

### Step 6: Check for Archival Candidates
Search for documents that should be archived:
- Implementation plans marked as completed or superseded
- Old versions of specifications
- Deprecated approaches or guides
- Documents with "COMPLETE", "DEPRECATED", or "SUPERSEDED" in content

Move these to `docs/archive/` and update archive README.

### Step 7: Report All Actions
Summarize in the Report section:
- **Issues found**: Count and list
- **Files renamed**: Old name → New name
- **Files moved**: Old path → New path
- **README updates**: Which READMEs were modified
- **Documents archived**: What was moved to archive and why
- **Total changes**: Summary of all actions taken

---

## CREATE MODE (With Arguments)

When called with arguments, create new documentation from the provided content.

### Document Name
$ARGUMENT1

### Document Content
$ARGUMENTS

### Step 1: Read Documentation Guidelines
Read `docs/README.md` to understand structure and placement rules.

### Step 2: Analyze Content
Determine from the content:
- Primary audience (users, developers, AI assistants)
- Document type (guide, specification, plan, report, reference)
- Appropriate folder placement using decision tree

**Decision Tree**:

**Step 2a: Who is the primary audience?**
- **End users** (using han-solo in their projects) → `docs/guides/`
- **AI assistants / External researchers** → `docs/reference/`
- **Developers building han-solo** → Continue to Step 2b

**Step 2b: What type of developer documentation?**
- **Internal system docs** (APIs, commands, config schema) → `docs/dev/system/`
- **Implementation plans, roadmaps** → `docs/dev/plans/`
- **Bug reports, reviews, analysis** → `docs/dev/reports/`
- **Patterns, best practices, learnings** → `docs/dev/learnings/`
- **Product requirements, design philosophy** → `docs/specs/`
- **Superseded or historical** → `docs/archive/`

### Step 3: Apply Naming Conventions

**Standard format**: `lowercase-with-hyphens.md`

Examples:
- ✅ `quickstart.md`, `mcp-integration.md`, `feature-auth-plan.md`
- ❌ `QuickStart.md`, `mcp_integration.md`, `Feature Plan.md`

**Special cases**:
- Dated snapshots: `repomix-2025-10-09.md`, `export-2025-01-15.md`
- Versioned docs: `api-v2.md`, `changelog-v1.md`
- Scoped docs: `feature-<name>-plan.md`, `bug-<issue>-report.md`

### Step 4: Check for Superseded Documents
Search for existing documents with similar:
- Filename patterns
- Subject matter
- Purpose or scope

If found, consider if they should be archived.

### Step 5: Create the Document
Write the document to the determined location with the correct filename.

### Step 6: Update README.md
Add an entry to the folder's README.md following this pattern:
```markdown
- **filename.md** - Brief description of what this document covers
```

Insert alphabetically or in the appropriate section.

### Step 7: Archive Superseded Documents
If you found documents that are superseded:
1. Move to `docs/archive/` preserving filename
2. Update `docs/archive/README.md` with entry and reason
3. Remove from original folder's README.md

### Step 8: Report Actions
Summarize in the Report section:
- **Document created**: Full path and filename
- **Placement reasoning**: Why this folder was chosen
- **README updated**: Which README.md was updated
- **Documents archived**: Any documents moved to archive (if applicable)
- **Total changes**: Summary of all actions taken

---

## Report

After completing the task in either mode, provide a comprehensive report of all actions taken.
