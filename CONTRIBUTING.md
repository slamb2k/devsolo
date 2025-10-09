# Contributing to han-solo

Thank you for your interest in contributing to han-solo! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/hansolo.git
   cd hansolo
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a feature branch:
   ```bash
   # Use han-solo itself!
   npm link
   hansolo launch --branch feature/your-feature
   ```

## Development Workflow

### Using han-solo for Development

We eat our own dog food! Use han-solo via Claude Code to manage your contribution:

1. **Configure han-solo MCP server** in Claude Code (see Installation below)
2. **Use natural language** to manage your workflow:
   ```
   "Launch a new feature for amazing functionality"
   → Claude uses hansolo_launch tool

   "Ship this feature"
   → Claude uses hansolo_ship tool

   "Create an emergency hotfix"
   → Claude uses hansolo_hotfix tool
   ```

### Manual Git Workflow

If you prefer the traditional Git approach:

1. Create a branch from `main`
2. Make your changes
3. Write/update tests
4. Update documentation
5. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git >= 2.30.0
- Claude Code (for MCP integration testing)

### MCP Server Setup

1. **Build the MCP server**:
   ```bash
   npm install
   npm run build
   ```

2. **Configure Claude Code** to load han-solo MCP server:
   ```json
   {
     "mcpServers": {
       "hansolo": {
         "command": "node",
         "args": ["/path/to/hansolo/build/index.js"]
       }
     }
   }
   ```

3. **Restart Claude Code** to load the MCP tools

4. **Test via natural language**: "Show han-solo status"

### Running Tests

```bash
# Build the project
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Making Changes

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or fixes
- `chore:` Maintenance tasks

Examples:
```bash
feat: add support for GitLab integration
fix: resolve merge conflict detection issue
docs: update API documentation for ship command
test: add unit tests for SessionRepository
```

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Ensure ESLint passes: `npm run lint`
- Format with Prettier: `npm run format`

### Testing Requirements

- Write tests for all new features
- Maintain or improve code coverage
- Ensure all tests pass before submitting PR
- Add integration tests for CLI commands

## Project Structure

```
hansolo/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── tools/             # MCP tool implementations
│   │   ├── init.ts
│   │   ├── launch.ts
│   │   ├── ship.ts
│   │   ├── status.ts
│   │   ├── sessions.ts
│   │   ├── swap.ts
│   │   ├── abort.ts
│   │   ├── commit.ts
│   │   └── status-line.ts
│   ├── core/              # Core functionality
│   │   ├── state-machine.ts
│   │   ├── session-manager.ts
│   │   ├── git-operations.ts
│   │   └── github-integration.ts
│   ├── models/            # Data models and types
│   └── utils/             # Utility functions
│       ├── prompts.ts     # Prompt-based parameter collection
│       ├── validation.ts
│       └── formatting.ts
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── contracts/         # Contract tests
├── build/                 # Compiled JavaScript
│   └── index.js          # Built MCP server
├── docs/                  # Documentation
│   ├── guides/           # User guides
│   ├── dev/              # Developer docs
│   └── specs/            # Product specs
└── scripts/              # Build and utility scripts
```

## Pull Request Process

1. **Update Documentation**: Ensure README.md and API.md reflect your changes
2. **Add Tests**: Include tests that cover your changes
3. **Update CHANGELOG**: Add your changes to CHANGELOG.md
4. **Pass CI**: Ensure all GitHub Actions checks pass
5. **Request Review**: Request review from maintainers

### PR Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] Added tests
- [ ] All tests pass
```

## Documentation

### API Documentation

When adding new public APIs:
1. Add JSDoc comments to your code
2. Update `docs/API.md`
3. Include usage examples

### README Updates

Update README.md for:
- New commands
- Configuration changes
- Breaking changes
- New features

## Release Process

Releases are automated via GitHub Actions when a tag is pushed:

```bash
git tag v1.2.3
git push origin v1.2.3
```

This will:
1. Run all tests
2. Build the project
3. Create GitHub release
4. Publish to npm
5. Build and push Docker images

## Getting Help

- **Discord**: [Join our Discord](https://discord.gg/hansolo)
- **Issues**: [GitHub Issues](https://github.com/slamb2k/hansolo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/slamb2k/hansolo/discussions)

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- GitHub releases
- Project README

## License

By contributing, you agree that your contributions will be licensed under the MIT License.