# Internal System Documentation

This folder contains internal system documentation that serves as the **source of truth** for devsolo. These documents describe how the system works internally and are used to generate user-facing documentation.

## Purpose

The `dev/system/` folder is for **comprehensive technical documentation** about devsolo's internal workings. This is where developers working on devsolo come to understand:
- Complete API surfaces and interfaces
- All available commands with implementation details
- Full configuration schema and settings
- System behaviors and guarantees

**Important**: This is NOT user-facing documentation. Simplified, task-oriented guides for end users belong in `docs/guides/`.

## Contents

### API Documentation
- **api.md** - Complete TypeScript API documentation for all commands, models, services, state machines, and the MCP server

### Command Reference
- **commands.md** - Exhaustive reference of all commands with:
  - CLI usage patterns
  - MCP access methods
  - Implementation details
  - Test coverage information
  - Cross-reference tables

- **command-architecture.md** - Command architecture and execution flow:
  - Base class architecture (BaseMCPTool)
  - 8-phase execution pipeline
  - Pre-flight and post-flight checks per command
  - Elicitation vs error/halting scenarios
  - State machine and transitions
  - Banner display implementation
  - Error handling strategy

### Configuration
- **configuration.md** - Complete configuration schema including:
  - All available settings
  - Global, project, and session-level configurations
  - YAML format specifications
  - Platform-specific settings
  - CI/CD integration options

### System Specifications
- **pre-flight-checks.md** - Comprehensive documentation of pre-flight and post-flight checks:
  - All validation performed before/after commands
  - Defensive guarantees
  - Error handling specifications

### Developer Installation
- **installation.md** - Developer installation methods:
  - npm link for local development
  - Local file installation
  - Development workflows

## Who This Is For

- **devsolo contributors** developing new features
- **Maintainers** reviewing implementation details
- **AI assistants** generating user-facing documentation from system specs
- **Technical writers** creating simplified guides

## Relationship to User Documentation

Documents in this folder are **detailed technical specifications**. When creating user-facing guides:

1. Read the relevant system documentation here
2. Extract the information users need
3. Simplify and add practical examples
4. Create task-oriented guides in `docs/guides/`

**Example**:
- `dev/system/configuration.md` → Complete YAML schema (all 50+ settings)
- `guides/configuration.md` → "How to configure devsolo" (10 most common settings)

## Naming Conventions

Follow standard markdown naming:
- `lowercase-with-hyphens.md`
- Be descriptive and specific
- Match the subject matter (e.g., `api.md`, `commands.md`)

## Related Documentation

- See [guides/](../../guides/) for user-facing how-to documentation
- See [dev/plans/](../plans/) for implementation planning
- See [specs/](../../specs/) for product requirements
- See [reference/](../../reference/) for external references
