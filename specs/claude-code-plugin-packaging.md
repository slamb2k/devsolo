# Feature: Claude Code Plugin Packaging

## Feature Description
Package han-solo as a proper Claude Code plugin with standardized plugin structure, enabling users to install and use han-solo through Claude Code's native plugin system instead of manually configuring the MCP server. This simplifies installation, improves discoverability, and provides a better user experience aligned with Claude Code's plugin ecosystem.

The plugin will bundle the MCP server, slash commands, and sub-agents into a single installable package that can be distributed through a Claude Code marketplace or installed locally for development.

## User Story
As a Claude Code user
I want to install han-solo as a plugin through Claude Code's native plugin system
So that I can start using han-solo workflows without manually configuring MCP servers and slash commands

## Problem Statement
Currently, han-solo requires manual installation steps:
1. Clone the repository
2. Build from source (`npm install && npm run build`)
3. Manually configure MCP server in Claude Code settings
4. Restart Claude Code
5. Initialize han-solo in each project

This creates friction for new users and makes han-solo less discoverable within the Claude Code ecosystem. Users must know about han-solo beforehand and follow multi-step installation instructions, which increases the barrier to adoption.

## Solution Statement
Transform han-solo into a Claude Code plugin with the proper plugin structure (`.claude-plugin/plugin.json`, bundled MCP server, slash commands, and agents). This enables users to:

1. Install via Claude Code plugin system: `/plugin install hansolo`
2. Automatic MCP server configuration through plugin manifest
3. Slash commands and sub-agents automatically registered
4. One-command installation and activation

The plugin will maintain backward compatibility with manual MCP server installation for users who prefer that approach.

## Relevant Files
Use these files to implement the feature:

### Existing Files to Modify

- **package.json** (lines 1-101)
  - Update build scripts to include plugin packaging
  - Add plugin distribution to `files` array
  - Update package metadata for plugin distribution

- **src/mcp/hansolo-mcp-server.ts** (lines 1-100+)
  - Ensure MCP server works in plugin context
  - Handle `${CLAUDE_PLUGIN_ROOT}` path resolution
  - Verify server initialization works when bundled in plugin

- **tsconfig.json** (lines 1-29)
  - May need adjustments for plugin-specific build output

- **tsconfig.mcp.json** (lines 1-31)
  - Adjust MCP server build configuration for plugin packaging

- **.claude/commands/hansolo/** (all 13 slash command files)
  - Move to plugin structure: `commands/`
  - Verify markdown format compatibility with plugin system

- **.claude/agents/** (git-droid.md, docs-droid.md)
  - Move to plugin structure: `agents/`
  - Verify agent definitions work in plugin context

- **scripts/postinstall.js** (lines 1-140)
  - Update to handle plugin installation context
  - Detect when installed as plugin vs npm package
  - Skip interactive wizard when installed as plugin

- **README.md** (lines 1-670)
  - Add plugin installation instructions
  - Document both plugin and manual installation methods
  - Update quick start to prioritize plugin installation

### New Files to Create

- **.claude-plugin/plugin.json**
  - Plugin manifest with metadata
  - MCP server configuration with `${CLAUDE_PLUGIN_ROOT}` paths
  - Plugin versioning and dependencies

- **.claude-plugin/.mcp.json** (optional alternative)
  - Standalone MCP server configuration
  - Can be used instead of inline in plugin.json

- **scripts/build-plugin.js**
  - Build script to create plugin package structure
  - Copy compiled MCP server to plugin distribution
  - Copy slash commands and agents to plugin structure
  - Generate plugin manifest with correct paths

- **scripts/package-plugin.js**
  - Package plugin for distribution
  - Create `.tar.gz` or `.zip` for marketplace
  - Validate plugin structure before packaging

- **marketplace.json** (for local development/testing)
  - Local marketplace definition for testing
  - Points to local plugin directory or package

- **docs/guides/plugin-installation.md**
  - Complete guide for installing han-solo as plugin
  - Troubleshooting plugin-specific issues
  - Explain plugin vs manual installation

- **docs/dev/plans/plugin-packaging-implementation.md**
  - Detailed implementation notes
  - Technical decisions and trade-offs
  - Plugin distribution strategy

## Implementation Plan

### Phase 1: Foundation - Plugin Structure Setup
Create the basic plugin structure and build tooling to package han-solo as a Claude Code plugin. This phase establishes the foundation without breaking existing functionality.

**Key deliverables:**
- Plugin manifest (`.claude-plugin/plugin.json`)
- Build scripts for plugin packaging
- Plugin directory structure
- Local testing setup

### Phase 2: Core Implementation - Integration and Migration
Integrate existing han-solo components (MCP server, slash commands, sub-agents) into the plugin structure. Update build process to output both npm package and plugin package.

**Key deliverables:**
- MCP server bundled in plugin with correct path resolution
- Slash commands and agents in plugin structure
- Dual build output (npm + plugin)
- Updated package.json scripts

### Phase 3: Integration - Testing and Documentation
Test the plugin installation end-to-end, document installation process, and ensure backward compatibility with manual installation method.

**Key deliverables:**
- End-to-end plugin installation testing
- Comprehensive installation documentation
- Backward compatibility verification
- Distribution preparation

## Step by Step Tasks

### Step 1: Create Plugin Manifest Structure
- Create `.claude-plugin/` directory at repository root
- Create `.claude-plugin/plugin.json` with metadata:
  ```json
  {
    "name": "hansolo",
    "displayName": "han-solo",
    "description": "AI-native Git workflow automation for Claude Code",
    "version": "2.0.0",
    "author": "han-solo contributors",
    "license": "MIT",
    "homepage": "https://github.com/slamb2k/hansolo",
    "repository": {
      "type": "git",
      "url": "https://github.com/slamb2k/hansolo.git"
    },
    "mcpServers": {
      "hansolo": {
        "command": "node",
        "args": ["${CLAUDE_PLUGIN_ROOT}/dist/mcp/hansolo-mcp-server.js"],
        "env": {}
      }
    }
  }
  ```
- Validate JSON schema matches Claude Code plugin requirements

### Step 2: Create Plugin Build Script
- Create `scripts/build-plugin.js` to:
  - Build TypeScript source (`npm run build`)
  - Create plugin distribution directory (`dist-plugin/`)
  - Copy `.claude-plugin/plugin.json` to `dist-plugin/.claude-plugin/`
  - Copy compiled MCP server from `dist/mcp/` to `dist-plugin/dist/mcp/`
  - Copy slash commands from `.claude/commands/hansolo/` to `dist-plugin/commands/`
  - Copy sub-agents from `.claude/agents/` to `dist-plugin/agents/`
  - Copy necessary dependencies (node_modules subset or bundle)
- Add `build:plugin` script to package.json
- Test build script produces correct structure

### Step 3: Update MCP Server for Plugin Context
- Modify `src/mcp/hansolo-mcp-server.ts`:
  - Add detection for `${CLAUDE_PLUGIN_ROOT}` environment variable
  - Resolve file paths relative to plugin root when in plugin context
  - Ensure `.hansolo/` directory creation works in plugin context
  - Add logging to distinguish plugin mode vs manual mode
- Test MCP server initializes correctly when invoked from plugin path
- Verify all MCP tools work with plugin-relative paths

### Step 4: Create Plugin Directory Structure
- Create plugin structure matching Claude Code requirements:
  ```
  dist-plugin/
  ├── .claude-plugin/
  │   └── plugin.json
  ├── commands/              # Slash commands
  │   ├── abort.md
  │   ├── cleanup.md
  │   ├── commit.md
  │   ├── doc.md
  │   ├── hotfix.md
  │   ├── init.md
  │   ├── launch.md
  │   ├── prime.md
  │   ├── sessions.md
  │   ├── ship.md
  │   ├── status-line.md
  │   ├── status.md
  │   └── swap.md
  ├── agents/                # Sub-agents
  │   ├── git-droid.md
  │   └── docs-droid.md
  ├── dist/                  # Compiled MCP server
  │   └── mcp/
  │       └── hansolo-mcp-server.js
  ├── node_modules/          # Bundled dependencies
  └── README.md
  ```
- Verify directory structure matches Claude Code plugin expectations

### Step 5: Update Package.json for Plugin Build
- Add new scripts to `package.json`:
  ```json
  "build:plugin": "node scripts/build-plugin.js",
  "package:plugin": "node scripts/package-plugin.js",
  "test:plugin": "node scripts/test-plugin.js"
  ```
- Update `prepack` script to include plugin build
- Add `dist-plugin/` to `.gitignore`
- Test all build scripts execute without errors

### Step 6: Create Plugin Packaging Script
- Create `scripts/package-plugin.js` to:
  - Validate plugin structure (all required files present)
  - Validate plugin.json schema
  - Create `.tar.gz` archive of `dist-plugin/` directory
  - Name archive: `hansolo-plugin-v2.0.0.tar.gz`
  - Generate SHA256 checksum for verification
  - Output package to `packages/` directory
- Test packaging script produces valid archive
- Verify archive can be extracted and maintains structure

### Step 7: Update Postinstall Script for Plugin Context
- Modify `scripts/postinstall.js`:
  - Add detection for plugin installation context
  - Skip interactive wizard when installed as plugin
  - Log message: "Installed as Claude Code plugin - no setup required"
  - When not in plugin context, continue existing behavior
- Add environment variable check: `CLAUDE_PLUGIN_ROOT`
- Test postinstall behavior in both contexts

### Step 8: Create Local Test Marketplace
- Create `marketplace.json` for local testing:
  ```json
  {
    "name": "local-hansolo-test",
    "version": "1.0.0",
    "plugins": {
      "hansolo": {
        "name": "hansolo",
        "description": "AI-native Git workflow automation",
        "version": "2.0.0",
        "source": "file:///path/to/hansolo/dist-plugin",
        "homepage": "https://github.com/slamb2k/hansolo"
      }
    }
  }
  ```
- Document how to add local marketplace to Claude Code
- Create test script to verify plugin installation

### Step 9: Test End-to-End Plugin Installation
- Build plugin: `npm run build:plugin`
- Package plugin: `npm run package:plugin`
- Install in test Claude Code instance
- Verify MCP server loads correctly
- Test all 13 slash commands work as expected
- Test git-droid and docs-droid sub-agents function
- Verify all MCP tools execute successfully
- Test initialization: `/hansolo:init`
- Complete full workflow: launch → commit → ship

### Step 10: Update Documentation for Plugin Installation
- Update `README.md`:
  - Add "Installation via Plugin" as primary method
  - Move manual MCP installation to "Alternative Installation"
  - Add troubleshooting section for plugin installation
  - Update architecture diagrams to show plugin structure
- Create `docs/guides/plugin-installation.md`:
  - Step-by-step plugin installation guide
  - How to add marketplace
  - How to install from marketplace
  - How to verify installation
  - Common issues and solutions
- Update `docs/guides/installation.md` with plugin method
- Add plugin distribution section to contributing guide

### Step 11: Create Plugin Distribution Documentation
- Create `docs/dev/plans/plugin-packaging-implementation.md`:
  - Document build process details
  - Explain plugin structure decisions
  - Document path resolution strategy
  - Note dependencies bundling approach
  - List testing procedures
- Document marketplace submission process (when available)
- Create PLUGIN_CHANGELOG.md for plugin-specific changes

### Step 12: Add Backward Compatibility Tests
- Test manual MCP installation still works
- Verify users can switch between plugin and manual mode
- Test that existing `.hansolo/` directories work in plugin mode
- Verify slash commands work identically in both modes
- Test MCP tools produce identical results
- Document any differences between installation methods

### Step 13: Validate and Run All Tests
- Run full test suite: `npm test`
- Run MCP-specific tests: `npm run test:mcp`
- Run plugin build: `npm run build:plugin`
- Run plugin package: `npm run package:plugin`
- Verify no regressions in existing functionality
- Test in fresh Claude Code environment
- Validate plugin package structure
- Check all documentation links work

## Testing Strategy

### Unit Tests
- **Plugin Build Script Tests**
  - Test `build-plugin.js` creates correct directory structure
  - Verify all required files are copied
  - Test plugin.json generation with correct paths
  - Verify MCP server compilation for plugin context

- **MCP Server Plugin Mode Tests**
  - Test path resolution with `${CLAUDE_PLUGIN_ROOT}`
  - Verify server initialization in plugin context
  - Test all MCP tools work with plugin-relative paths
  - Verify `.hansolo/` directory creation from plugin

- **Packaging Script Tests**
  - Test `package-plugin.js` creates valid archive
  - Verify archive structure matches expectations
  - Test checksum generation
  - Verify extracted plugin maintains structure

### Integration Tests
- **Plugin Installation Flow**
  - Test adding local marketplace to Claude Code
  - Test plugin installation via `/plugin install`
  - Verify MCP server auto-starts after installation
  - Test slash commands are registered
  - Verify sub-agents are available

- **Full Workflow Tests**
  - Test `/hansolo:init` initializes project
  - Test `/hansolo:launch` creates feature branch
  - Test `/hansolo:commit` commits changes
  - Test `/hansolo:ship` completes full workflow
  - Verify all 13 slash commands work end-to-end

- **Backward Compatibility Tests**
  - Test manual MCP installation alongside plugin
  - Verify existing projects work with plugin
  - Test switching between installation methods
  - Verify no conflicts between modes

### Edge Cases
- **Installation Edge Cases**
  - Plugin installed while manual MCP config exists
  - Plugin installed in project with existing `.hansolo/` directory
  - Plugin installed without Node.js dependencies available
  - Plugin installation on Windows/Linux/macOS
  - Plugin installed with spaces in path

- **MCP Server Edge Cases**
  - MCP server starts before dependencies are ready
  - Multiple Claude Code instances loading same plugin
  - Plugin updated while sessions are active
  - MCP server crashes and needs restart

- **Path Resolution Edge Cases**
  - Plugin installed in non-standard location
  - Relative paths in plugin.json
  - Symlinked plugin directories
  - Plugin moved after installation

- **Slash Command Edge Cases**
  - Slash commands invoked before MCP server ready
  - Command markdown files modified after installation
  - Multiple plugins with overlapping command names
  - Commands with special characters in arguments

## Acceptance Criteria
1. **Plugin Structure**: Plugin package contains all required files in correct structure (`.claude-plugin/plugin.json`, `commands/`, `agents/`, `dist/mcp/`)

2. **Installation**: Users can install han-solo via `/plugin install hansolo` without manual configuration

3. **MCP Server**: MCP server auto-starts when plugin is enabled and all 11 MCP tools work correctly

4. **Slash Commands**: All 13 slash commands (`/hansolo:*`) are registered and functional after plugin installation

5. **Sub-Agents**: git-droid and docs-droid sub-agents work correctly in plugin context

6. **Documentation**: README.md and installation guides document plugin installation as primary method

7. **Backward Compatibility**: Manual MCP installation method still works for users who prefer it

8. **Testing**: All existing tests pass plus new plugin-specific tests

9. **Build Process**: `npm run build:plugin` and `npm run package:plugin` succeed without errors

10. **End-to-End Workflow**: Complete workflow (init → launch → commit → ship) works in plugin mode

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run clean` - Clean previous build artifacts
- `npm run build` - Build TypeScript source code
- `npm run build:mcp` - Build MCP server specifically
- `npm run build:plugin` - Build plugin distribution package
- `npm run package:plugin` - Package plugin into distributable archive
- `npm test` - Run all unit tests
- `npm run test:mcp` - Run MCP-specific tests
- `npm run test:plugin` - Run plugin-specific tests (if created)
- `npm run lint` - Verify code style
- `npm run typecheck` - Verify TypeScript types
- `ls -la dist-plugin/.claude-plugin/plugin.json` - Verify plugin manifest exists
- `cat dist-plugin/.claude-plugin/plugin.json` - Verify plugin.json content
- `ls -la dist-plugin/commands/ | wc -l` - Verify 13 slash commands copied (14 lines with total)
- `ls -la dist-plugin/agents/ | wc -l` - Verify 2 agents copied (3 lines with total)
- `ls -la dist-plugin/dist/mcp/` - Verify MCP server bundled
- `tar -tzf packages/hansolo-plugin-v2.0.0.tar.gz | head -20` - Verify package contents
- `node dist/mcp/hansolo-mcp-server.js` - Verify MCP server runs (will wait for input, Ctrl+C to exit)

## Notes

### Plugin Distribution Strategy
- **Phase 1 (Current)**: Local installation via file path for testing
- **Phase 2 (Future)**: Publish to official Claude Code marketplace (when available)
- **Phase 3 (Future)**: Support installation via GitHub URL for development versions

### Dependency Bundling
The plugin must bundle all Node.js dependencies since Claude Code plugin system may not have access to npm. Two approaches:
1. **Bundle node_modules**: Include all dependencies in plugin package (larger size)
2. **Webpack/esbuild**: Bundle MCP server into single JS file with dependencies (smaller, more complex)

**Recommendation**: Start with bundled node_modules for simplicity, optimize later if size is an issue.

### Path Resolution Strategy
Use `${CLAUDE_PLUGIN_ROOT}` environment variable for all plugin-relative paths:
- MCP server: `${CLAUDE_PLUGIN_ROOT}/dist/mcp/hansolo-mcp-server.js`
- Slash commands: Automatically discovered in `${CLAUDE_PLUGIN_ROOT}/commands/`
- Sub-agents: Automatically discovered in `${CLAUDE_PLUGIN_ROOT}/agents/`

### Backward Compatibility
Maintain support for manual MCP installation to support:
- Users who prefer manual control
- Development and debugging workflows
- CI/CD environments where plugin installation isn't available
- Organizations with security policies requiring manual review

### Future Enhancements
- Auto-update support when new versions published
- Plugin configuration UI for han-solo preferences
- Multiple marketplace support (official, community, private)
- Plugin telemetry for usage analytics (opt-in)
- Plugin-specific slash command namespace (`/hansolo:*` vs `/*`)

### Security Considerations
- Plugin package should be signed for verification
- MCP server should validate all inputs from Claude Code
- File system access should be restricted to project directory
- Environment variables should be sanitized
- No credentials should be bundled in plugin package

### Performance Considerations
- MCP server should start quickly (<2s) to avoid blocking Claude Code
- Slash commands should provide immediate feedback (banner display)
- Large file operations should show progress
- Background operations should not block UI
- Session storage should be efficient for many concurrent sessions
