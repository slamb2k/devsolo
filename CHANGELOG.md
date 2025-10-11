# Changelog

All notable changes to devsolo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: Migrated to pure MCP architecture - all functionality now exposed via MCP tools
- **BREAKING**: Removed CLI commands in favor of natural language interface through Claude Code
- **BREAKING**: Installation now via MCP server configuration instead of npm package
- Redesigned all tools for prompt-based parameter collection
- Updated documentation to reflect MCP-first approach
- Restructured project for MCP server pattern

### Added
- 11 MCP tools for complete workflow management:
  - `devsolo_init`: Project initialization
  - `devsolo_launch`: Feature branch creation
  - `devsolo_ship`: Complete shipping workflow
  - `devsolo_hotfix`: Emergency fixes
  - `devsolo_status`: Workflow status
  - `devsolo_sessions`: Session management
  - `devsolo_swap`: Session switching
  - `devsolo_abort`: Workflow cancellation
  - `devsolo_commit`: Direct commits
  - `devsolo_status_line`: Terminal awareness configuration
- Natural language interface via Claude Code
- Prompt-based parameter collection for user-friendly interactions
- Comprehensive user guides and MCP tools reference documentation
- Migration guide from CLI to MCP approach
- MCP architecture documentation

### Deprecated
- CLI commands (devsolo launch, devsolo ship, etc.) - use MCP tools instead
- npm installation workflow - use MCP server configuration
- Slash commands - use natural language with Claude Code

### Removed
- Old CLI entry points
- Interactive CLI prompts (replaced with MCP prompts)
- npm installer scripts

## [1.0.0] - 2024-01-20

### Added
- Initial release of devsolo
- Core workflow automation with state machines
- Linear history enforcement
- Session management system
- CLI commands: init, launch, ship, abort, swap, sessions
- Git operations service
- Audit logging system
- Configuration management
- Interactive progress indicators
- ASCII art banners and visual feedback

### Features
- **Workflow Automation**: Automated Git workflow with state machine control
- **Linear History**: Enforces clean, linear Git history
- **Session Management**: Multiple concurrent workflow sessions
- **Smart Branching**: Automatic branch creation and management
- **Safety Checks**: Pre-flight validation and safety measures
- **Audit Trail**: Complete audit logging of all operations
- **Visual Feedback**: Progress bars, spinners, and colored output

### Security
- Protected branch enforcement
- Secret scanning capabilities
- User configuration validation

[Unreleased]: https://github.com/slamb2k/devsolo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/slamb2k/devsolo/releases/tag/v1.0.0