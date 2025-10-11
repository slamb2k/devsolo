# Init

Initialize han-solo in your project. Creates configuration and session storage.

## Arguments

- `scope` (optional): Installation scope - "project" or "user" (default: "project")
- `force` (optional): Force reinitialization if already initialized (default: false)

## Workflow

**Display the following banner immediately before doing anything else:**

```
░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░
```

Once displayed, continue with the following steps:

1. Use the `mcp__hansolo__hansolo_init` tool to initialize han-solo
2. Pass along the provided arguments (`scope`, `force`)
3. Report initialization results

## Output Format

Present initialization results clearly:
- Scope: project or user
- Configuration location: .hansolo/config.yaml
- Session storage: .hansolo/sessions/
- Status: initialized successfully or already initialized
