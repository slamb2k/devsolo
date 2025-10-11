# Prime

Prime Claude's understanding of the codebase by analyzing project structure and key documentation.

## Purpose

This command helps Claude build a comprehensive mental model of the han-solo project by:
- Exploring the file structure
- Reading core documentation
- Understanding the architecture and conventions

Use this at the start of a session or when you need to refresh context about the codebase.

## Workflow

1. **Display the priming banner:**

```
░█▀█░█▀▄░▀█▀░█▀▄▀█░▀█▀░█▀█░█▀▀░
░█▀▀░█▀▄░░█░░█░▀░█░░█░░█░█░█░█░
░▀░░░▀░▀░▀▀▀░▀░░░▀░▀▀▀░▀░▀░▀▀▀░
```

2. **Execute file exploration:**
   - Run `git ls-files` to see all tracked files
   - Understand project structure and organization
   - Identify key directories and file types

3. **Read core documentation:**
   - Read `README.md` - Project overview, features, and usage
   - Read `docs/README.md` - Documentation structure and conventions
   - Optionally read other key docs based on context

4. **Summarize understanding:**
   - Provide a concise summary of:
     - Project purpose and architecture
     - Key components and their roles
     - Documentation organization
     - Development conventions

## Example

```
# Prime understanding of the codebase
/hansolo:prime

Claude will explore the project structure, read key documentation,
and provide a summary of the codebase's architecture and conventions.
```

## When to Use

- **Start of session**: Get oriented in the codebase
- **After long conversations**: Refresh context about project structure
- **Before major changes**: Ensure understanding of architecture
- **When confused**: Re-establish mental model of the project

## What Gets Read

**Always:**
- `git ls-files` output (project structure)
- `README.md` (project overview)
- `docs/README.md` (documentation conventions)

**Optionally (based on context):**
- `CLAUDE.md` (instructions for Claude)
- `package.json` (dependencies and scripts)
- Key source files (as needed)

## Output

After priming, Claude will provide:

1. **Project Summary**
   - What the project does
   - Key features and capabilities

2. **Architecture Overview**
   - Main components and their relationships
   - Technology stack

3. **Directory Structure**
   - Key directories and their purposes
   - Code organization patterns

4. **Development Conventions**
   - Documentation standards
   - Workflow patterns
   - Naming conventions

## Notes

- This command is purely informational (no modifications)
- Output is conversational, not tool-based
- Helps establish shared context between user and Claude
- Can be run multiple times without side effects
- Particularly useful in long conversations to refresh Claude's working memory
