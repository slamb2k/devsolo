# Changelog

All notable changes to han-solo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Emergency hotfix workflow with expedited deployment
- Comprehensive documentation (README, LICENSE, API docs)
- Configuration examples (YAML and JSON formats)
- GitHub Actions CI/CD pipelines
- Docker support with multi-stage build
- Contributing guidelines
- MCP server integration for Claude Code
- GitHub API integration for automatic PR creation

### Changed
- Improved TypeScript strict mode compliance
- Enhanced test infrastructure
- Updated session management with locking mechanism

### Fixed
- TypeScript compilation errors in state machines
- Test suite mock implementations
- Branch name validation in WorkflowSession

## [1.0.0] - 2024-01-20

### Added
- Initial release of han-solo
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

[Unreleased]: https://github.com/slamb2k/hansolo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/slamb2k/hansolo/releases/tag/v1.0.0