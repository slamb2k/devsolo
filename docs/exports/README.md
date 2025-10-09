# Repository Exports & Artifacts

This folder contains repository snapshots, external tool outputs, and other artifacts useful for analysis.

## What Goes Here

- **Repomix outputs** - Full repository exports for AI context
- **GitHub repository exports** - Exported issue lists, PR histories, etc.
- **Dependency graphs** - Visual representations of code dependencies
- **Code statistics** - CLOC reports, complexity metrics
- **Coverage reports** - Test coverage summaries (snapshots)
- **Bundle analysis** - Build output analysis
- **Snapshot artifacts** - Point-in-time captures for reference

## Naming Convention

Include dates and context:
- `repomix-YYYY-MM-DD.md`
- `github-issues-export-YYYY-MM-DD.json`
- `dependency-graph-YYYY-MM-DD.svg`
- `code-stats-v1.0.0.md`

## Maintenance

These files can grow large:
- Consider `.gitignore` for very large exports
- Keep recent snapshots
- Archive or delete old exports when no longer needed
- Compress large files when possible

## Who This Is For

- Developers analyzing the codebase
- AI assistants needing full context
- Stakeholders reviewing project health
- New contributors getting oriented

## Related Documentation

- See [../reference/](../reference/) for current API documentation
- See [../dev/reports/](../dev/reports/) for analysis based on these exports
