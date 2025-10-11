# Init

Initialize devsolo in your project. Creates configuration and session storage.

## Arguments

- `scope` (optional): Installation scope - "project" or "user" (default: "project")
- `force` (optional): Force reinitialization if already initialized (default: false)

## Workflow

**Display the following banner immediately before calling the MCP tool:**

```
░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░
```

1. Use the `mcp__devsolo__devsolo_init` tool to initialize devsolo
2. Pass along the provided arguments (`scope`, `force`)
3. Report initialization results

## Output Format

Present initialization results clearly:
- Scope: project or user
- Configuration location: .devsolo/config.yaml
- Session storage: .devsolo/sessions/
- Status: initialized successfully or already initialized
