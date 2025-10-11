# devsolo Documentation

Welcome to the devsolo documentation. This folder contains all project documentation organized by purpose and audience.

## Documentation Structure

### 📚 [guides/](./guides/)
**User-facing how-to documentation**
- Installation and quickstart guides
- Usage patterns and examples
- Configuration and troubleshooting
- MCP and Claude Code integration guides
- Contributing guidelines

**For**: Users installing, configuring, or using devsolo in their projects

**Contains**:
- `quickstart.md` - Get up and running in 5 minutes
- `usage.md` - Practical examples and workflows
- `troubleshooting.md` - Common issues and solutions
- `mcp-integration.md` - Setting up devsolo with Claude Desktop
- `claude-code-commands.md` - Using devsolo in Claude Code

### 📖 [reference/](./reference/)
**External references and AI context**

Store external materials that provide context for development:
- Cached copies of external technical documentation (OpenAI, Anthropic, GitHub APIs, etc.)
- Repository snapshots (repomix outputs) for AI assistants to understand codebase context
- Reference implementations from other projects

**For**: AI assistants planning/coding, developers researching external APIs

**Purpose**: This folder stores reference materials from external sources that AI and developers can use during planning and implementation. These are NOT internal devsolo docs.

### 🛠️ [dev/](./dev/)
**Development documentation for devsolo contributors**
- **[system/](./dev/system/)** - Internal system documentation (source of truth for generating user-facing docs)
- **[plans/](./dev/plans/)** - Implementation plans, task lists, roadmaps
- **[reports/](./dev/reports/)** - Bug reports, reviews, implementation summaries
- **[learnings/](./dev/learnings/)** - Reusable patterns, strategies, best practices

**For**: Contributors developing devsolo features, maintainers

**dev/system/** contains:
- `installation.md` - Developer installation methods (npm link, local dev setup)
- `configuration.md` - Complete configuration schema and all settings
- `api.md` - TypeScript API documentation for internal classes
- `mcp-tools.md` - MCP tools implementation guide for developers
- `mcp-architecture.md` - MCP server architecture overview
- `pre-flight-checks.md` - Pre-flight and post-flight check specifications

### 📋 [specs/](./specs/)
**Product specifications and strategic documents**
- Product Requirements Document (PRD)
- Product brief and vision
- Core principles and design philosophy
- Feature specifications

**For**: Product managers, stakeholders, contributors understanding design decisions

### 📦 [exports/](./exports/)
**Repository snapshots and artifacts**
- Repomix outputs
- GitHub exports
- Code statistics
- Analysis artifacts

**For**: Anyone analyzing the codebase, AI assistants, new contributors

### 🗄️ [archive/](./archive/)
**Historical and superseded documentation**
- Completed implementation plans
- Superseded specifications
- Migration guides (historical)
- Deprecated approaches

**For**: Understanding historical context and evolution of the project

## Documentation Placement Rules

Use this decision tree to determine where a document belongs:

### 1. Who is the primary audience?

**End users** (people using devsolo in their projects)
→ `guides/`

**AI assistants / External researchers**
→ `reference/`

**Developers building devsolo**
→ Continue to step 2

### 2. What type of developer documentation?

**Internal system documentation** (APIs, commands, configuration schema)
→ `dev/system/` - This is the source of truth

**Implementation plans, roadmaps, task lists**
→ `dev/plans/`

**Bug reports, reviews, analysis, summaries**
→ `dev/reports/`

**Patterns, best practices, learnings**
→ `dev/learnings/`

**Product requirements, design philosophy**
→ `specs/`

**Superseded or historical documentation**
→ `archive/`

## File Naming Conventions

### Standard Format
Use **lowercase with hyphens** for all filenames:

```
✅ CORRECT:
- quickstart.md
- mcp-integration.md
- command-review-report.md
- feature-authentication-plan.md

❌ INCORRECT:
- QuickStart.md
- mcp_integration.md
- CommandReviewReport.md
- Feature Authentication Plan.md
```

### Special Cases

**Dated snapshots** - Include ISO date:
```
export-2025-10-09.md
codebase-snapshot-2025-01-15.md
```

**Versioned documents** - Include version:
```
api-v2.md
changelog-v1.md
```

**Scoped documents** - Use clear scope prefixes:
```
feature-<name>-implementation.md
bug-<issue>-analysis.md
pattern-<name>-guide.md
```

## Placement Examples

### Example 1: API Documentation
**Question**: Where does complete TypeScript API documentation belong?

**Answer**: `dev/system/api.md`

**Reasoning**: Internal system documentation (source of truth). Developers building devsolo need complete API details. User-facing API guide would be simplified and go in `guides/`.

### Example 2: Installation Guide
**Question**: We have TWO installation docs. Where do they go?

**Answer**:
- User installation (npm install from registry) → `guides/installation.md` *(create this)*
- Dev installation (npm link, local dev) → `dev/system/installation.md` ✅

**Reasoning**: Different audiences need different installation paths.

### Example 3: MCP Integration Guide
**Question**: Guide for setting up devsolo MCP server with Claude?

**Answer**: `guides/mcp-integration.md` ✅

**Reasoning**: End users setting up integration. Practical how-to guide.

### Example 4: Cached Anthropic API Docs
**Question**: Downloaded copy of Anthropic API documentation?

**Answer**: `reference/anthropic-api-docs.md`

**Reasoning**: External reference material for AI/developers to use during planning.

### Example 5: Implementation Plan
**Question**: Plan for implementing new feature?

**Answer**:
- Active/current plan → `dev/plans/feature-name-plan.md`
- Completed/superseded plan → `archive/feature-name-plan.md`

**Reasoning**: Plans move to archive when completed or obsolete.

## Quick Navigation

**I want to...**
- **Get started with devsolo** → [guides/quickstart.md](./guides/quickstart.md)
- **See usage examples** → [guides/usage.md](./guides/usage.md)
- **Learn about MCP tools** → [guides/mcp-tools-reference.md](./guides/mcp-tools-reference.md)
- **Set up Claude Code integration** → [guides/mcp-integration.md](./guides/mcp-integration.md)
- **Migrate from CLI version** → [guides/migration-from-cli.md](./guides/migration-from-cli.md)
- **Understand internal APIs** → [dev/system/api.md](./dev/system/api.md)
- **See MCP tools implementation** → [dev/system/mcp-tools.md](./dev/system/mcp-tools.md)
- **Understand MCP architecture** → [dev/system/mcp-architecture.md](./dev/system/mcp-architecture.md)
- **Understand complete config schema** → [dev/system/configuration.md](./dev/system/configuration.md)
- **Understand the product vision** → [specs/devsolo-prd.md](./specs/devsolo-prd.md)
- **Contribute code** → [dev/learnings/](./dev/learnings/) + [dev/reports/](./dev/reports/)
- **Understand why something was done** → [archive/](./archive/)

## Maintenance Guidelines

### Documentation Consistency

When working on documentation:
- Follow the naming convention: `lowercase-with-hyphens.md`
- Place documents in the correct folder (use decision tree)
- Update folder README.md to index new documents
- Link related documents for cross-references
- Archive completed or superseded documentation

### Adding New Documentation Manually

1. **Determine placement** using the decision tree above
2. **Name the file** following naming conventions
3. **Create the document** with clear structure and headings
4. **Update the folder's README.md** to index the new document
5. **Link related documents** for cross-references

### Archiving Documentation

Move documents to `archive/` when:
- Implementation plans are completed
- Specifications are superseded by newer versions
- Approaches are deprecated
- Documentation becomes historical reference only

**Process**:
1. Move file to `archive/` preserving original name
2. Update archive README.md with entry and reason for archival
3. Remove from original folder's README.md
4. Add redirect note in original location if needed

### Updating README Files

Each folder's README.md should contain:
- **What the folder contains** - Brief description
- **Who it's for** - Primary audience
- **Document index** - List of documents with descriptions
- **Naming conventions** - Folder-specific rules if any
- **Related documentation** - Links to related folders

## README Template

```markdown
# [Folder Name]

Brief description of what this folder contains.

## Contents

- **document-name.md** - Description of what this document covers
- **another-doc.md** - Description of this document

## Who This Is For

Primary audience description.

## Related Documentation

- See [folder/](../folder/) for related docs
```

## Questions?

If you're unsure where a document belongs:

1. **Check the decision tree** in "Documentation Placement Rules"
2. **Look at examples** in "Placement Examples"
3. **Read the folder READMEs** for specific guidance
4. **Ask yourself**:
   - Who is the primary audience?
   - What is the purpose of this document?
   - Is this current or historical?

When in doubt, favor more specific folders (e.g., `dev/system/` over `dev/`).
