# Init

Initialize devsolo in your project. Creates configuration and session storage.

## Arguments

- `scope` (optional): Installation scope - "project" or "user" (default: "project")
- `force` (optional): Force reinitialization if already initialized (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░
```

1. Use the `mcp__devsolo__devsolo_init` tool to initialize devsolo
2. Pass along the provided arguments (`scope`, `force`)
3. Report initialization results

## Output Format

Present initialization results in a clear, structured format:

```
## ✅ Initialization Complete

**Scope:** project
**Configuration:** .devsolo/config.yaml
**Session Storage:** .devsolo/sessions/
**Status:** Initialized successfully

---

**Created Files:**
- .devsolo/config.yaml
- .devsolo/sessions/

**Next Steps:**

- Use `/devsolo:launch` to start a new feature workflow
- Use `/devsolo:info` to check workflow status
```

**Formatting Guidelines:**
- Show clear initialization status (success/already initialized)
- List all created files and directories
- Display configuration and storage locations
- Provide actionable next steps
- Use consistent section structure
- Follow markdown formatting standards
