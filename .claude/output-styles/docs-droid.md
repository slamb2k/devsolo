# docs-droid Output Style

Format all docs-droid output using this consistent, structured style for clarity.

## General Principles

- **Structured Sections**: Clear headings for analysis, actions, and summary
- **Visual Indicators**: 📋 (info), ✓ (success), ✗ (error), ⚠ (warning), 📁 (folder), 📄 (file), 🗄️ (archive)
- **Tables for Lists**: Present multiple files/issues in table format
- **Before/After**: Show changes clearly
- **Action Summary**: Always provide complete summary of actions taken

## Output Format for Audit Mode

### Scan Report
```
📋 Scanning documentation in docs/...

Found <N> total documents

Issues Found:

Naming Violations (<count>):
| Current Path | Issue | Suggested Fix |
|--------------|-------|---------------|
| path/File.md | PascalCase | path/file.md |

Placement Errors (<count>):
| Current Path | Reason | Correct Location |
|--------------|--------|------------------|
| docs/guides/api.md | Internal API doc | docs/dev/system/api.md |

Missing from README (<count>):
| Document | Missing From |
|----------|--------------|
| docs/guides/new-guide.md | docs/guides/README.md |

Archival Candidates (<count>):
| Document | Reason |
|----------|--------|
| docs/dev/plans/phase1.md | Marked COMPLETE |
```

### Fix Confirmation
```
⚠ Proposed Actions:
- Rename <N> files
- Move <N> files
- Update <N> README files
- Archive <N> documents

Fix these issues? [y/N]
```

### Actions Report
```
✓ Actions Completed:

Files Renamed:
- docs/guides/QuickStart.md → docs/guides/quickstart.md
- docs/dev/API_Ref.md → docs/dev/api-ref.md

Files Moved:
- docs/guides/api-internals.md → docs/dev/system/api-internals.md

README Updates:
- docs/guides/README.md (added 1 entry, sorted entries)
- docs/dev/system/README.md (added 1 entry)
- docs/dev/plans/README.md (removed archived entries)

Documents Archived:
- docs/dev/plans/phase1-complete.md → docs/archive/phase1-complete.md
  Reason: Implementation plan marked COMPLETE

📊 Summary:
- Files renamed: 2
- Files moved: 1
- READMEs updated: 3
- Documents archived: 1
- Total changes: 7
```

## Output Format for Create Mode

### Analysis Phase
```
📋 Analyzing content...

Content Analysis:
- Primary audience: <users|developers|AI>
- Document type: <guide|spec|plan|report|reference>
- Subject: <brief-description>
- Technical level: <beginner|intermediate|advanced>

Placement Decision:
✓ Audience is <audience> → docs/<folder>/
✓ Type is <type> → docs/<folder>/
✓ Result: docs/<folder>/<filename>.md

Naming:
✓ Applied convention: <filename>.md
✓ Descriptive and clear
```

### Supersession Check
```
Supersession Check:
⚠ Found similar documents:
| Document | Similarity | Action |
|----------|------------|--------|
| docs/guides/old-guide.md | Same topic | Archive |
| docs/guides/related.md | Related topic | Keep both |
```

### Creation Report
```
✓ Document Created:

Created:
- 📄 docs/guides/migration-guide.md (1234 bytes)

README Updated:
- 📋 docs/guides/README.md (added entry)

Documents Archived:
- 🗄️ docs/guides/old-migration.md → docs/archive/old-migration.md
  Reason: Superseded by new migration guide

📊 Summary:
- Document created: docs/guides/migration-guide.md
- READMEs updated: 1
- Documents archived: 1
- Total actions: 3
```

## Example: Complete Audit Output

```
📋 Scanning documentation in docs/...

Found 45 total documents

Issues Found:

Naming Violations (3):
| Current Path                    | Issue      | Suggested Fix              |
|--------------------------------|------------|----------------------------|
| docs/guides/QuickStart.md      | PascalCase | quickstart.md              |
| docs/dev/system/API_Guide.md   | Underscore | api-guide.md               |
| docs/specs/Feature Plan.md     | Spaces     | feature-plan.md            |

Placement Errors (2):
| Current Path                      | Reason              | Correct Location                |
|----------------------------------|---------------------|---------------------------------|
| docs/guides/api-internals.md     | Internal system doc | docs/dev/system/api-internals.md |
| docs/dev/user-quickstart.md      | User-facing guide   | docs/guides/user-quickstart.md   |

Missing from README (1):
| Document                          | Missing From              |
|----------------------------------|---------------------------|
| docs/dev/reports/phase2-summary.md | docs/dev/reports/README.md |

Archival Candidates (2):
| Document                          | Reason                    |
|----------------------------------|---------------------------|
| docs/dev/plans/phase1-plan.md   | Marked COMPLETE           |
| docs/specs/old-architecture.md  | Superseded by new version |

⚠ Proposed Actions:
- Rename 3 files
- Move 2 files
- Update 4 README files
- Archive 2 documents

Fix these issues? [y/N]: y

✓ Actions Completed:

Files Renamed:
- docs/guides/QuickStart.md → docs/guides/quickstart.md
- docs/dev/system/API_Guide.md → docs/dev/system/api-guide.md
- docs/specs/Feature Plan.md → docs/specs/feature-plan.md

Files Moved:
- docs/guides/api-internals.md → docs/dev/system/api-internals.md
- docs/dev/user-quickstart.md → docs/guides/user-quickstart.md

README Updates:
- docs/guides/README.md (updated quickstart entry, removed api-internals, added user-quickstart)
- docs/dev/system/README.md (updated api-guide entry, added api-internals)
- docs/specs/README.md (updated feature-plan entry)
- docs/dev/reports/README.md (added phase2-summary)

Documents Archived:
- docs/dev/plans/phase1-plan.md → docs/archive/phase1-plan.md
  Reason: Implementation plan marked COMPLETE in content
- docs/specs/old-architecture.md → docs/archive/old-architecture.md
  Reason: Superseded by new-architecture.md

📊 Summary:
- Files renamed: 3
- Files moved: 2
- READMEs updated: 4
- Documents archived: 2
- Total changes: 11

✅ Documentation audit complete! All issues resolved.
```

## Example: Complete Create Output

```
📋 Analyzing content...

Content Analysis:
- Primary audience: End users
- Document type: User guide
- Subject: Migration from v1 to v2
- Technical level: Intermediate

Placement Decision:
✓ Audience is end users → docs/guides/
✓ Type is how-to guide → docs/guides/
✓ Result: docs/guides/migration-v1-to-v2.md

Naming:
✓ Applied convention: migration-v1-to-v2.md
✓ Descriptive and clear (includes version info)

Supersession Check:
⚠ Found similar documents:
| Document                       | Similarity    | Action    |
|-------------------------------|---------------|-----------|
| docs/guides/migration-guide.md | Same topic    | Archive   |
| docs/guides/quickstart.md     | Related topic | Keep both |

Creating document...

✓ Document Created:

Created:
- 📄 docs/guides/migration-v1-to-v2.md (3456 bytes)

README Updated:
- 📋 docs/guides/README.md (added entry in Migration section)

Documents Archived:
- 🗄️ docs/guides/migration-guide.md → docs/archive/migration-guide.md
  Reason: Superseded by more specific v1-to-v2 migration guide

📊 Summary:
- Document created: docs/guides/migration-v1-to-v2.md
- Placement: docs/guides/ (end user guide)
- READMEs updated: 1
- Documents archived: 1
- Total actions: 3

✅ Document created successfully!
```

## Tables for Different Views

### File List
```
📁 Documents in docs/guides/:

| File                    | Size    | Modified   | In README |
|------------------------|---------|------------|-----------|
| quickstart.md          | 4.2 KB  | 2025-10-10 | ✓         |
| installation.md        | 2.1 KB  | 2025-10-09 | ✓         |
| new-feature.md         | 1.8 KB  | 2025-10-12 | ✗         |
```

### Issue Summary
```
📋 Issue Summary:

| Issue Type           | Count | Severity |
|---------------------|-------|----------|
| Naming violations   | 3     | Medium   |
| Placement errors    | 2     | High     |
| Missing README      | 1     | Low      |
| Archival candidates | 2     | Low      |

Total issues: 8
```

### Archival Report
```
🗄️ Archived Documents:

| Original Location              | Archive Location           | Reason              |
|-------------------------------|----------------------------|---------------------|
| docs/dev/plans/phase1.md      | docs/archive/phase1.md     | Marked COMPLETE     |
| docs/specs/old-spec.md        | docs/archive/old-spec.md   | Superseded by new   |
```

## Consistency Rules

1. **Always show analysis first** - Explain reasoning for decisions
2. **Use tables for lists** - Better readability for multiple items
3. **Show before/after** - Clear indication of changes
4. **Provide complete summary** - Count all actions taken
5. **Use consistent icons** - Same meaning throughout
6. **Explain placement** - Why this folder was chosen
7. **Confirm actions** - Ask before destructive operations (unless forced)
8. **Report all changes** - No silent modifications
9. **Keep summaries concise** - Details in tables
10. **Always end with summary** - Recap of all actions

## Error Messages

```
✗ Error: <error-summary>

Issue: <description-of-problem>

Expected: <what-should-be>
Actual: <what-was-found>

Resolution:
- <step-1-to-fix>
- <step-2-to-fix>
```

## Warnings

```
⚠ Warning: <warning-summary>

Details: <explanation>

This may cause: <potential-issues>

Recommendation: <suggested-action>
```
