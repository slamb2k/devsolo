# Feature: Migrate /doc and /prime Commands to MCP

## Feature Description

Migrate the `/doc` and `/prime` slash commands from local `.claude/commands/` directory to han-solo managed `.hansolo/commands/` directory and expose them as MCP prompts. This will:

1. Prevent duplicate slash commands when working in the han-solo repository itself (where both local slash commands and MCP prompts would otherwise appear)
2. Make documentation management and codebase priming capabilities available to all han-solo users via the MCP server
3. Establish `.hansolo/commands/` as the standard location for han-solo-managed custom slash commands
4. Extend `hansolo init` to automatically add documentation guidelines to CLAUDE.md

The `/doc` command provides comprehensive documentation management in two modes:
- **Audit mode**: Scans for naming convention issues, placement problems, missing README entries, and archival candidates
- **Create mode**: Creates new documentation with automatic placement, naming, and README updates

The `/prime` command helps Claude Code understand a codebase by reading core documentation files (README.md and docs/README.md).

## User Story

As a developer using han-solo
I want access to documentation management and codebase priming commands
So that I can maintain consistent documentation across my projects and quickly onboard AI assistants

As a han-solo contributor
I want slash commands to be exposed only through MCP
So that I don't see duplicate commands when working in the han-solo repository itself

## Problem Statement

Currently:
1. The `/doc` command exists in `.claude/commands/doc.md` - only available locally in the han-solo repo
2. The `/prime` command exists in `.claude/commands/disler/prime.md` - only available locally
3. When working in the han-solo repository, developers would see commands twice: once from local slash commands and once from the MCP server (if both were registered)
4. Users of han-solo in other projects don't have access to these useful documentation and priming capabilities
5. The `hansolo init` command adds git workflow guidance to CLAUDE.md but doesn't add documentation structure guidance
6. The `.hansolo/` directory isn't included in the published npm package

## Solution Statement

1. **Move commands to han-solo managed location**:
   - Move `.claude/commands/doc.md` → `.hansolo/commands/doc.md`
   - Move `.claude/commands/disler/prime.md` → `.hansolo/commands/prime.md`

2. **Expose via MCP prompts**:
   - Extend the MCP server's `ListPromptsRequestSchema` handler to include `doc` and `prime`
   - Implement dynamic prompt loading from `.hansolo/commands/*.md` in `GetPromptRequestSchema` handler
   - Support `$ARGUMENTS` placeholder substitution in markdown command files

3. **Update hansolo init**:
   - Extend `installClaudeGuidance()` in `ConfigurationManager` to add a documentation guidelines section
   - Include folder structure, naming conventions, placement rules, and references to `/hansolo:doc` and `/hansolo:prime`

4. **Update package distribution**:
   - Add `.hansolo/commands` to the `files` array in package.json to include commands in published package (excluding runtime data like session.json)

This approach:
- Eliminates duplicate commands in the han-solo repository
- Makes documentation tools available to all han-solo users
- Establishes a clear pattern for future han-solo-managed slash commands
- Integrates documentation guidance into the init workflow

## Relevant Files

### Existing Files to Modify

- **.claude/commands/doc.md**
  - Current location of documentation management command
  - Will be moved to `.hansolo/commands/doc.md`
  - Contains comprehensive audit and create mode logic

- **.claude/commands/disler/prime.md**
  - Current location of codebase priming command
  - Will be moved to `.hansolo/commands/prime.md`
  - Simple command that reads README.md and docs/README.md

- **src/mcp/hansolo-mcp-server.ts** (lines 340-494)
  - Contains `ListPromptsRequestSchema` handler (lists available prompts)
  - Contains `GetPromptRequestSchema` handler (returns prompt content)
  - Need to add `doc` and `prime` to the prompts list
  - Need to implement dynamic markdown file reading and $ARGUMENTS substitution

- **src/commands/hansolo-init.ts** (lines 145-148)
  - Contains initialization workflow
  - Calls `configManager.installClaudeGuidance()`
  - Already adds git workflow section to CLAUDE.md

- **src/services/configuration-manager.ts** (line 342+)
  - Contains `installClaudeGuidance()` method
  - Currently only adds git workflow management section
  - Need to add documentation guidelines section

- **package.json**
  - `files` array currently: `["dist", "bin", "templates", "scripts", "README.md", "LICENSE"]`
  - Need to add `.hansolo/commands` to distribute command files (not entire `.hansolo/` since it contains runtime data)

- **.gitignore**
  - Currently ignores all of `.hansolo/` but un-ignores `.hansolo/templates/` and `.hansolo/hooks/`
  - Need to add `!.hansolo/commands/` so command files are tracked in git
  - Runtime files (session.json, config.json) should remain ignored

- **docs/guides/claude-code-commands.md**
  - Documents how MCP commands work in Claude Code
  - Need to add `/hansolo:doc` and `/hansolo:prime` to the command list

- **docs/README.md**
  - Main documentation overview
  - May need updates to reference new commands

- **CLAUDE.md**
  - Repository-level Claude Code instructions
  - Will receive new documentation guidelines section via `hansolo init`

### New Files

- **.hansolo/commands/doc.md**
  - Moved from `.claude/commands/doc.md`
  - No content changes, just new location

- **.hansolo/commands/prime.md**
  - Moved from `.claude/commands/disler/prime.md`
  - No content changes, just new location

## Implementation Plan

### Phase 1: Foundation
1. Create `.hansolo/commands/` directory structure
2. Move command files to new location
3. Update package.json to include `.hansolo/` in distributed files
4. Verify command files have correct markdown structure for MCP prompt handling

### Phase 2: Core Implementation
1. Extend MCP server `ListPromptsRequestSchema` handler to register `doc` and `prime` prompts
2. Implement dynamic markdown file reading in `GetPromptRequestSchema` handler
3. Implement `$ARGUMENTS` and `$ARGUMENT1` placeholder substitution
4. Test MCP prompt delivery for both commands

### Phase 3: Integration
1. Extend `installClaudeGuidance()` to add documentation guidelines section to CLAUDE.md
2. Update documentation (claude-code-commands.md, docs/README.md)
3. Test end-to-end: `hansolo init` → CLAUDE.md contains both git and documentation guidance
4. Test MCP commands work correctly in Claude Code
5. Verify no duplicate commands appear when working in han-solo repository

## Step by Step Tasks

### Step 1: Create Directory and Move Command Files

- [ ] Create `.hansolo/commands/` directory
- [ ] Move `.claude/commands/doc.md` to `.hansolo/commands/doc.md`
- [ ] Move `.claude/commands/disler/prime.md` to `.hansolo/commands/prime.md`
- [ ] Verify markdown structure is compatible with MCP prompt handling
- [ ] Remove empty `.claude/commands/disler/` directory if no other files remain

### Step 2: Update Package Distribution and Git Tracking

- [ ] Edit `package.json`
- [ ] Add `.hansolo/commands` to the `files` array
- [ ] Verify change: `files: ["dist", "bin", "templates", "scripts", ".hansolo/commands", "README.md", "LICENSE"]`
- [ ] This excludes runtime data (session.json, config.json) while including command files

- [ ] Edit `.gitignore`
- [ ] Add `!.hansolo/commands/` after the `.hansolo/` ignore rule
- [ ] This ensures command files are tracked in git while runtime files remain ignored
- [ ] Verify the pattern:
  ```
  # han-solo runtime files
  .hansolo/
  !.hansolo/templates/
  !.hansolo/hooks/
  !.hansolo/commands/
  ```

### Step 3: Extend MCP Server - List Prompts Handler

- [ ] Open `src/mcp/hansolo-mcp-server.ts`
- [ ] Locate `ListPromptsRequestSchema` handler (around line 340)
- [ ] Add `doc` prompt registration after existing prompts:
  ```typescript
  {
    name: 'doc',
    description: '📚 Manage documentation structure and conventions',
    arguments: [
      {
        name: 'name',
        description: 'Document name (for create mode)',
        required: false,
      },
      {
        name: 'content',
        description: 'Document content (for create mode)',
        required: false,
      },
    ],
  }
  ```
- [ ] Add `prime` prompt registration:
  ```typescript
  {
    name: 'prime',
    description: '🎯 Prime Claude Code with codebase context',
    arguments: [],
  }
  ```

### Step 4: Implement Dynamic Markdown File Reading

- [ ] In `GetPromptRequestSchema` handler (around line 497)
- [ ] Create helper function to read markdown files from `.hansolo/commands/`:
  ```typescript
  const readCommandMarkdown = async (commandName: string): Promise<string> => {
    const commandPath = path.join(process.cwd(), '.hansolo', 'commands', `${commandName}.md`);
    if (!fs.existsSync(commandPath)) {
      throw new Error(`Command file not found: ${commandPath}`);
    }
    return await fs.promises.readFile(commandPath, 'utf-8');
  };
  ```

### Step 5: Implement Arguments Substitution

- [ ] Add argument substitution logic in `GetPromptRequestSchema` handler
- [ ] For `doc` command:
  ```typescript
  if (name === 'doc' || name === 'prime') {
    let markdown = await readCommandMarkdown(name);

    // Substitute $ARGUMENTS with all arguments
    if (args) {
      const allArgs = Object.values(args).filter(v => v !== undefined && v !== '').join(' ');
      markdown = markdown.replace(/\$ARGUMENTS/g, allArgs);

      // Substitute $ARGUMENT1 with first argument
      const firstArg = Object.values(args)[0] || '';
      markdown = markdown.replace(/\$ARGUMENT1/g, String(firstArg));
    } else {
      // No arguments provided - empty string
      markdown = markdown.replace(/\$ARGUMENTS/g, '');
      markdown = markdown.replace(/\$ARGUMENT1/g, '');
    }

    return {
      description: `Execute ${name} command`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: markdown,
          },
        },
      ],
    };
  }
  ```

### Step 6: Update Configuration Manager - Documentation Guidance

- [ ] Open `src/services/configuration-manager.ts`
- [ ] Locate `installClaudeGuidance()` method (around line 342)
- [ ] After the existing git workflow section, add documentation guidelines section:
  ```typescript
  const documentationSection = `
  ## 📚 Documentation Guidelines

  When creating or updating documentation, follow the structure defined in \`docs/README.md\`.

  ### Folder Structure

  - **\`docs/guides/\`** - User-facing how-to documentation (installation, quickstart, usage, troubleshooting, integrations)
  - **\`docs/reference/\`** - External references and AI context (cached external docs, repomix snapshots)
  - **\`docs/dev/system/\`** - Internal system documentation (source of truth for generating user docs)
  - **\`docs/dev/plans/\`** - Implementation plans, task lists, roadmaps
  - **\`docs/dev/reports/\`** - Bug reports, reviews, implementation summaries
  - **\`docs/dev/learnings/\`** - Reusable patterns, strategies, best practices
  - **\`docs/specs/\`** - Product specifications and design philosophy
  - **\`docs/archive/\`** - Superseded or historical documentation

  ### Naming Conventions

  Always use **lowercase-with-hyphens.md** format:

  \`\`\`
  ✅ CORRECT: quickstart.md, mcp-integration.md, feature-plan.md
  ❌ INCORRECT: QuickStart.md, mcp_integration.md, Feature Plan.md
  \`\`\`

  For dated snapshots: \`repomix-2025-10-09.md\`, \`export-2025-01-15.md\`

  ### Placement Rules

  **Before creating documentation**, read \`docs/README.md\` for the complete decision tree. Quick guide:

  - **User guides** (how-to for end users) → \`docs/guides/\`
  - **External references** (cached external docs, repomix snapshots) → \`docs/reference/\`
  - **Internal system docs** (APIs, commands, config schema) → \`docs/dev/system/\`
  - **Implementation plans** → \`docs/dev/plans/\`
  - **Bug reports, reviews** → \`docs/dev/reports/\`
  - **Patterns, learnings** → \`docs/dev/learnings/\`
  - **Product specs** → \`docs/specs/\`
  - **Completed/superseded docs** → \`docs/archive/\`

  ### Using the /doc Command

  The \`/doc\` slash command has two modes:

  **AUDIT MODE** (no arguments): \`/doc\`
  - Scans all documentation for naming and placement issues
  - Checks for missing README.md entries
  - Identifies documents that should be archived
  - Offers to fix issues automatically
  - Updates all README.md files
  - Reports all findings and actions

  **CREATE MODE** (with content): \`/doc <name> <content>\`
  - Analyzes your content to determine correct placement
  - Applies naming conventions automatically
  - Updates relevant README.md files
  - Archives superseded documents
  - Reports all actions taken

  ### Maintaining READMEs

  When adding significant documentation:
  1. Create the document in the appropriate folder
  2. Update that folder's README.md with an entry
  3. Link related documents for cross-references
  `;
  ```
- [ ] Append `documentationSection` to the CLAUDE.md content after git workflow section
- [ ] Update the boundary marker comment to include both sections

### Step 7: Build and Test MCP Server

- [ ] Run `npm run build` to compile TypeScript changes
- [ ] Run `npm run build:mcp` to build MCP server specifically
- [ ] Verify no TypeScript compilation errors
- [ ] Check that `.hansolo/commands/` files are included in the build output

### Step 8: Update Documentation

- [ ] Open `docs/guides/claude-code-commands.md`
- [ ] Add `/hansolo:doc` command to the command list with description and examples
- [ ] Add `/hansolo:prime` command to the command list
- [ ] Include usage examples for both audit and create modes of /doc

- [ ] Open `docs/README.md`
- [ ] Verify the documentation structure description is current
- [ ] Add note about `/hansolo:doc` command for creating documentation

- [ ] Update main `README.md` if necessary to reference new commands

### Step 9: Test hansolo init - Documentation Guidance

- [ ] Create a temporary test directory
- [ ] Initialize git: `git init`
- [ ] Run `hansolo init` (project scope)
- [ ] Verify CLAUDE.md is created
- [ ] Verify CLAUDE.md contains both:
  - Git workflow management section (existing)
  - Documentation guidelines section (new)
- [ ] Check section formatting and markdown rendering
- [ ] Verify boundary markers are correct

### Step 10: Test MCP Commands in Claude Code

- [ ] Configure han-solo MCP server in Claude Desktop config
- [ ] Restart Claude Desktop to load updated MCP server
- [ ] In Claude Code, type `/hansolo:doc` and verify command appears
- [ ] Test audit mode: `/hansolo:doc` with no arguments
- [ ] Test create mode: `/hansolo:doc test-doc "# Test\nThis is a test document"`
- [ ] Type `/hansolo:prime` and verify command appears
- [ ] Test prime command executes correctly (reads README files)

### Step 11: Verify No Duplicate Commands

- [ ] Open Claude Code in the han-solo repository itself
- [ ] Type `/` and check command list
- [ ] Verify `/hansolo:doc` appears only once (from MCP, not local)
- [ ] Verify `/hansolo:prime` appears only once (from MCP, not local)
- [ ] Confirm no `/doc` or `/prime` local commands appear

### Step 12: Run All Validation Commands

Execute every validation command below to ensure zero regressions.

## Testing Strategy

### Unit Tests

- **Markdown File Reading**
  - Test `readCommandMarkdown()` function with existing command files
  - Test error handling when command file doesn't exist
  - Verify correct file paths are constructed

- **Arguments Substitution**
  - Test `$ARGUMENTS` substitution with multiple arguments
  - Test `$ARGUMENT1` substitution with first argument only
  - Test empty arguments (both placeholders should become empty strings)
  - Test special characters in arguments (quotes, spaces, etc.)

- **CLAUDE.md Generation**
  - Test `installClaudeGuidance()` creates file if it doesn't exist
  - Test it appends to existing CLAUDE.md content
  - Test both git workflow and documentation sections are present
  - Test boundary markers are correctly placed

### Integration Tests

- **MCP Server Prompt Registration**
  - Test `ListPromptsRequestSchema` returns `doc` and `prime` in prompts list
  - Verify prompt descriptions and argument schemas are correct

- **MCP Server Prompt Execution**
  - Test `GetPromptRequestSchema` with `doc` command (audit mode - no args)
  - Test `GetPromptRequestSchema` with `doc` command (create mode - with args)
  - Test `GetPromptRequestSchema` with `prime` command
  - Verify returned markdown contains substituted arguments

- **End-to-End hansolo init**
  - Run `hansolo init` in a fresh repository
  - Verify CLAUDE.md creation with complete content
  - Verify `.hansolo/` directory structure is created
  - Verify all initialization steps complete successfully

### Edge Cases

- **Missing Command Files**
  - What happens if `.hansolo/commands/doc.md` is deleted?
  - Should return helpful error message

- **Malformed Arguments**
  - Empty strings, null, undefined values
  - Should gracefully handle and substitute with empty string

- **Existing CLAUDE.md with Custom Content**
  - User has custom sections in CLAUDE.md
  - Should preserve custom content and append han-solo sections

- **Package Distribution**
  - Verify `.hansolo/commands/` files are included in `npm pack` output
  - Test installation of package in another project includes command files

- **MCP Server Restart**
  - Modify `.hansolo/commands/doc.md` content while MCP server is running
  - Restart MCP server
  - Verify changes are reflected in prompt execution

## Acceptance Criteria

- [ ] `.hansolo/commands/doc.md` exists and contains complete documentation management logic
- [ ] `.hansolo/commands/prime.md` exists and contains codebase priming logic
- [ ] `.claude/commands/doc.md` and `.claude/commands/disler/prime.md` are removed
- [ ] `package.json` includes `.hansolo/commands` in files array (not entire `.hansolo/` directory)
- [ ] `.gitignore` un-ignores `.hansolo/commands/` so command files are tracked in git
- [ ] Runtime files (.hansolo/session.json, .hansolo/config.json) remain git-ignored
- [ ] MCP server's `ListPromptsRequestSchema` returns `doc` and `prime` prompts
- [ ] MCP server's `GetPromptRequestSchema` correctly reads markdown files and substitutes arguments
- [ ] `hansolo init` creates CLAUDE.md with both git workflow and documentation guidelines sections
- [ ] `/hansolo:doc` command works in Claude Code (audit mode)
- [ ] `/hansolo:doc <name> <content>` command works in Claude Code (create mode)
- [ ] `/hansolo:prime` command works in Claude Code
- [ ] When working in han-solo repository, commands appear only once (via MCP)
- [ ] Documentation is updated to reflect new commands
- [ ] All existing tests pass
- [ ] No TypeScript compilation errors
- [ ] Published package includes command files

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

- `npm run build` - Verify TypeScript compilation succeeds
- `npm run build:mcp` - Verify MCP server builds successfully
- `npm run test` - Run all existing tests to ensure no regressions
- `npm pack` - Create package tarball and verify `.hansolo/commands/` is included (but not `.hansolo/session.json` or other runtime data)
- `npm run lint` - Verify code style compliance
- `git status` - Ensure only intended files are changed
- Create test repository and run `hansolo init` - Verify CLAUDE.md generation
- In Claude Code, test `/hansolo:doc` (audit mode) - Verify command executes
- In Claude Code, test `/hansolo:doc test "# Test"` (create mode) - Verify document creation
- In Claude Code, test `/hansolo:prime` - Verify codebase priming
- In han-solo repo, verify `/hansolo:doc` appears only once in command list
- Restart Claude Desktop and verify commands are still available

## Notes

### Future Enhancements

1. **Additional Commands**: `.hansolo/commands/` can become the home for other han-solo-managed slash commands like `/feature`, `/tasks`, `/plan`, etc.

2. **Command Discovery**: Could implement automatic discovery of all `.md` files in `.hansolo/commands/` and register them as MCP prompts dynamically

3. **Argument Validation**: Could add schema validation for command arguments based on patterns in the markdown files

4. **Command Templates**: Could provide templates for creating new slash commands in `.hansolo/commands/`

### Design Decisions

- **Why .hansolo/commands/ instead of .claude/commands/?**
  - Prevents duplicate commands when working in han-solo repository
  - Clearly separates han-solo-managed commands from user/project commands
  - Enables distribution via npm package (only `.hansolo/commands/` is published, not runtime data)
  - When dogfooding han-solo to build han-solo, `.hansolo/` contains session.json and other runtime state that should not be published

- **Why MCP prompts instead of MCP tools?**
  - Prompts preserve the markdown format and instructions
  - No need to rewrite complex logic in TypeScript
  - Easier to maintain and update
  - Better matches the nature of these commands (instructions to Claude)

- **Why extend hansolo init with documentation guidance?**
  - Provides a complete onboarding experience
  - Ensures consistent documentation practices across projects
  - Makes documentation structure discoverable
  - Reinforces the value of structured documentation

### Dependencies

- Requires `@modelcontextprotocol/sdk` (already in dependencies)
- Requires Node.js `fs` module (built-in)
- Requires Node.js `path` module (built-in)

### Breaking Changes

None. This is purely additive functionality:
- Existing commands continue to work
- Existing init behavior is preserved (just extended)
- No changes to existing APIs or interfaces
