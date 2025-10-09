# Installing han-solo Dev Version

**Audience**: Developers working on han-solo itself

**Purpose**: System-level installation guide for development and testing

**User Installation**: See [docs/guides/installation.md](../../guides/installation.md) for end-user installation

---

This guide explains how to install the development version of han-solo v2.0.0 (pure MCP) for testing and development.

## Prerequisites

- Node.js v20.0.0 or higher
- npm or yarn
- Git
- Claude Code (for testing MCP integration)

## Architecture Note

han-solo v2.0.0 is **pure MCP-only** with no standalone CLI. All functionality is exposed through MCP tools that Claude Code calls. The development setup focuses on:
- Building the MCP server
- Testing MCP tools
- Developing new tools/features

## Installation Methods

### Method 1: Local Development (Recommended)

For active development with immediate reflection of changes:

```bash
# 1. Clone and navigate to han-solo directory
cd /path/to/hansolo

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Build MCP server
npm run build:mcp

# 5. Verify MCP server exists
ls -la bin/hansolo-mcp
# Should show: bin/hansolo-mcp (executable)
```

### Method 2: Global Link (Testing in Other Projects)

Create a symbolic link for testing in other projects:

```bash
# In han-solo directory
npm link

# Verify link
which hansolo-mcp
# Should show global bin path

# In another project
npm link hansolo-mcp
```

### Method 3: Pack and Install (Production-like)

Test as if installed from npm:

```bash
# In han-solo directory
npm pack
# Creates: hansolo-mcp-2.0.0.tgz

# Install in test project
cd /path/to/test/project
npm install /path/to/hansolo-mcp-2.0.0.tgz
```

## Setting Up MCP Server for Development

### For Claude Code Testing

Configure Claude Code to use your development MCP server:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hansolo-dev": {
      "command": "node",
      "args": ["/absolute/path/to/hansolo/bin/hansolo-mcp"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development",
        "HANSOLO_DEBUG": "true"
      }
    }
  }
}
```

**Important**: Use absolute path to your development copy.

### Starting MCP Server Manually (For Debugging)

```bash
# Start in foreground (see all output)
node bin/hansolo-mcp

# Start with debug logging
HANSOLO_DEBUG=1 node bin/hansolo-mcp

# Start with Node inspector (for debugging)
node --inspect bin/hansolo-mcp

# Start with breakpoints
node --inspect-brk bin/hansolo-mcp
```

The MCP server communicates via stdio (not HTTP), so manual testing requires an MCP client like Claude Code.

## Development Workflow

### Typical Development Cycle

```bash
# 1. Make changes to source files
vim src/mcp/tools/my-tool.ts

# 2. Build the project
npm run build

# 3. Build MCP server
npm run build:mcp

# 4. Restart Claude Code to reload MCP server

# 5. Test in Claude Code
```

### Watch Mode (Auto-rebuild)

For active development:

```bash
# Terminal 1: Watch and rebuild on changes
npm run dev

# Terminal 2: Watch and rebuild MCP server on changes
npm run dev:mcp

# Restart Claude Code when ready to test
```

### Testing MCP Tools

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run specific tool tests
npm test -- commit-tool

# Run with coverage
npm run test:coverage
```

## Verifying Installation

### Check Build Artifacts

```bash
# Check main build
ls -la dist/
# Should contain compiled TypeScript

# Check MCP server build
ls -la bin/hansolo-mcp
# Should be executable

# Check MCP server is valid Node script
head -n 1 bin/hansolo-mcp
# Should show: #!/usr/bin/env node
```

### Test MCP Server Loads

```bash
# Run MCP server with test input
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | node bin/hansolo-mcp
# Should respond with JSON-RPC response
```

### Test in Claude Code

1. Configure Claude Code (see above)
2. Restart Claude Code
3. Ask Claude: `"Show me han-solo status"`
4. Claude should call `hansolo_status` tool

## Using in Test Projects

### Initialize Test Project

```bash
# Create test project
mkdir test-hansolo && cd test-hansolo
git init
git remote add origin https://github.com/yourname/test-repo.git

# In Claude Code, ask:
# "Initialize han-solo in this project"

# Verify .hansolo directory created
ls -la .hansolo/
```

### Test Full Workflow

```bash
# In Claude Code:
# "Start a new feature for testing"
# "Commit with message 'test: verify workflow'"
# "Ship this feature"

# Verify in Git
git log
git remote -v
```

## Development Environment Variables

Configure han-solo behavior during development:

```bash
export NODE_ENV=development        # Development mode
export HANSOLO_DEBUG=1            # Enable debug output
export HANSOLO_LOG_LEVEL=debug    # Detailed logging
export HANSOLO_TEST_MODE=1        # Enable test mode features
export GITHUB_TOKEN=ghp_xxx       # GitHub API token (or use 'gh auth login')
```

## Debugging

### Debug MCP Server

```bash
# Start with Node inspector
node --inspect-brk bin/hansolo-mcp

# In Chrome: chrome://inspect
# Click "inspect" under Remote Target
# Set breakpoints in DevTools
```

### Debug Tool Execution

Add console.log or use debugger statements:

```typescript
// In src/mcp/tools/commit-tool.ts
async execute(input: CommitToolInput): Promise<SessionToolResult> {
  console.log('CommitTool.execute called with:', input);
  debugger; // Breakpoint here
  // ...
}
```

### View MCP Communication

```bash
# Enable MCP protocol logging
HANSOLO_DEBUG_MCP=1 node bin/hansolo-mcp
```

This logs all JSON-RPC messages between Claude Code and han-solo.

### Check Tool Registration

```typescript
// In bin/hansolo-mcp or src/mcp/server.ts
console.log('Registered tools:', Array.from(server.tools.keys()));
```

## Troubleshooting

### Issue: MCP Server Not Found

```bash
# Check file exists
ls -la /path/to/hansolo/bin/hansolo-mcp

# Check executable bit
chmod +x /path/to/hansolo/bin/hansolo-mcp

# Check shebang
head -n 1 /path/to/hansolo/bin/hansolo-mcp
# Should be: #!/usr/bin/env node
```

### Issue: Claude Code Can't Load MCP Server

1. Check `claude_desktop_config.json` has absolute path
2. Check Node is in PATH: `which node`
3. Restart Claude Code completely (not just close window)
4. Check Claude Code logs for errors

### Issue: Changes Not Reflected

```bash
# Rebuild everything
npm run build
npm run build:mcp

# Restart Claude Code (required to reload MCP server)
```

### Issue: Tool Not Available

```bash
# Check tool is registered
grep -r "hansolo_mytool" src/mcp/

# Check tool is exported in server
grep "MyTool" bin/hansolo-mcp

# Verify build included new tool
npm run build:mcp
```

### Issue: TypeScript Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build

# Check TypeScript version
npx tsc --version
# Should be 5.x
```

### Issue: Test Failures

```bash
# Clean test cache
npm run test:clean

# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- src/mcp/tools/commit-tool.test.ts
```

## Building for Distribution

### Create Release Build

```bash
# Clean build
rm -rf dist/ bin/hansolo-mcp

# Install production dependencies only
npm ci --production

# Build
npm run build
npm run build:mcp

# Test the build
node bin/hansolo-mcp
```

### Create Package

```bash
# Create tarball
npm pack

# Test installation from tarball
npm install -g hansolo-mcp-2.0.0.tgz
```

## Project Structure (for Developers)

```
hansolo/
├── bin/
│   └── hansolo-mcp          # Built MCP server executable
├── src/
│   ├── mcp/
│   │   ├── server.ts        # MCP server implementation
│   │   ├── tools/           # MCP tool implementations
│   │   │   ├── launch-tool.ts
│   │   │   ├── commit-tool.ts
│   │   │   ├── ship-tool.ts
│   │   │   └── ...
│   │   └── validation/      # Validation services
│   ├── core/
│   │   ├── git/             # Git operations
│   │   ├── github/          # GitHub integration
│   │   └── sessions/        # Session management
│   └── utils/               # Utilities
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── fixtures/            # Test fixtures
├── docs/
│   ├── guides/              # User documentation
│   └── dev/                 # Developer documentation
└── dist/                    # Built TypeScript output
```

## Next Steps for Developers

1. Read [MCP Architecture](mcp-architecture.md) - Understand the architecture
2. Read [MCP Tools System](mcp-tools.md) - Learn tool patterns
3. Read [API Reference](api.md) - Core service APIs
4. Read [Contributing Guide](../../../CONTRIBUTING.md) - Contribution guidelines
5. Check [Development Learnings](../learnings/) - Patterns and best practices

## Common Development Tasks

### Adding a New MCP Tool

1. Create tool file: `src/mcp/tools/my-tool.ts`
2. Implement `MCPTool` interface
3. Add pre-flight checks
4. Add post-flight verifications
5. Register in `src/mcp/server.ts`
6. Write tests: `tests/unit/mcp/tools/my-tool.test.ts`
7. Update documentation

### Updating Pre-Flight Checks

1. Edit `src/mcp/validation/pre-flight-check-service.ts`
2. Add new check method
3. Use in relevant tools
4. Write tests

### Updating Tool Results

1. Edit `src/mcp/types/results.ts`
2. Update result interfaces
3. Update tools using the results
4. Update tests

### Running CI Locally

```bash
# Run all checks that CI runs
npm run ci

# Which includes:
# - lint
# - type check
# - unit tests
# - integration tests
# - build
```

## Support for Developers

- **Architecture Docs**: `docs/dev/system/mcp-architecture.md`
- **Tool Development**: `docs/dev/system/mcp-tools.md`
- **Patterns**: `docs/dev/learnings/`
- **GitHub Issues**: Report bugs or ask questions
- **Discussions**: Ask development questions

---

**Installation Guide Version**: 2.0.0 (Pure MCP)

**Last Updated**: 2025-10-10

**Target Audience**: han-solo developers and contributors
