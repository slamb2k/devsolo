# MCP Reality Check: What Actually Works

## The Truth About MCP in Claude

### What MCP Does NOT Provide ❌
- **No slash commands in Claude's UI** - You won't see `/devsolo:launch` when typing `/`
- **No autocomplete menu** - No dropdown with command suggestions
- **No direct command invocation** - You can't type commands directly
- **No visible prompt registration** - Prompts aren't shown to users

### What MCP DOES Provide ✅
- **Behind-the-scenes tools** - Claude can call your tools based on natural language
- **Structured data exchange** - Claude gets proper schemas for parameters
- **Error handling** - Claude receives and can relay error messages
- **State management** - Tools can maintain session state

## How to Actually Use devsolo with Claude

### Method 1: Natural Language (Recommended)
Simply describe what you want in plain English:

```
User: "Initialize devsolo in this project"
Claude: [Calls devsolo_init tool behind the scenes]
Result: ✅ devsolo initialized successfully

User: "Start a new feature branch for authentication"
Claude: [Calls devsolo_launch with appropriate parameters]
Result: 🚀 Launched new workflow on branch: feature/auth
```

### Method 2: Explicit Tool Requests
Ask Claude to use specific tools:

```
User: "Use devsolo_status to check the current state"
Claude: [Explicitly calls devsolo_status tool]
Result: 📊 Current Workflow Status...
```

### Method 3: Descriptive Commands
Describe the operation you want:

```
User: "Switch to the main branch and stash my changes"
Claude: [Interprets intent, calls devsolo_swap with stash:true]
Result: 🔄 Swapped to branch: main (changes stashed)
```

## What About the "Prompts" We Built?

The MCP "prompts" feature we implemented:
- **Exists in the protocol** ✅
- **Can be queried by Claude** ✅
- **Provides structured templates** ✅
- **But doesn't appear in the UI** ❌

Think of prompts as "templates Claude knows about" rather than "commands users can type."

## The Slash Command Misconception

Many users expect MCP to provide slash commands because:
1. The terminology ("prompts") suggests user-facing commands
2. Other AI tools (like Cursor, Continue) have slash commands
3. The MCP spec talks about "user interaction"

But in Claude's current implementation:
- Slash commands are **built-in features only**
- MCP servers **cannot add new slash commands**
- The `/` menu is **not extensible via MCP**

## Practical Workarounds

### 1. Create a "Commands Cheatsheet"
Ask Claude to show available commands:

```
User: "What devsolo commands are available?"
Claude: Here are the available devsolo operations:
- Initialize: "Set up devsolo"
- Launch: "Start a new feature"
- Status: "Check current state"
- Sessions: "List all workflows"
- Ship: "Commit and push changes"
- Swap: "Switch branches"
- Abort: "Cancel workflow"
```

### 2. Use Conversational Patterns
Develop natural phrases that trigger specific tools:

| What You Say | What Claude Does |
|-------------|------------------|
| "devsolo init" | Calls `devsolo_init` |
| "new feature branch" | Calls `devsolo_launch` |
| "show sessions" | Calls `devsolo_sessions` |
| "switch to main" | Calls `devsolo_swap` |
| "ship it" | Calls `devsolo_ship` |

### 3. Create Aliases in Your Mind
Remember these patterns:
- "init han" → initialization
- "launch feature" → new branch
- "ship changes" → commit/push/PR
- "swap to" → branch switching

## Why This is Actually OK

Despite the lack of slash commands, the current approach has benefits:

1. **More Natural**: You don't need to remember exact syntax
2. **Flexible**: Claude interprets variations of the same request
3. **Contextual**: Claude understands context from conversation
4. **Error-Tolerant**: Typos and variations still work

## Future Possibilities

Claude may eventually support:
- MCP servers registering UI commands
- Custom slash command extensions
- Visual command palettes
- Interactive prompt UIs

But these aren't available today (as of late 2024).

## The Bottom Line

**Stop expecting slash commands from MCP servers.** Instead:

1. **Use natural language** - It's what Claude is best at
2. **Be descriptive** - Claude will figure out which tool to use
3. **Think conversationally** - Not command-line style
4. **Embrace the AI way** - Let Claude handle the details

## Examples of What Actually Works

### ✅ These Work:
```
"Initialize devsolo for this project"
"Create a new feature branch called user-auth"
"Show me all my active devsolo sessions"
"Commit my changes with message 'fix: memory leak'"
"Switch to the payments branch and stash current changes"
```

### ❌ These Don't Work:
```
/devsolo:init
/devsolo:launch --branch feature/auth
devsolo/ship --push --create-pr
@devsolo status
!devsolo sessions --all
```

## TL;DR

- MCP doesn't provide slash commands in Claude's UI
- You interact through natural language only
- Claude calls MCP tools behind the scenes
- This is a limitation of Claude's current MCP implementation
- Just talk naturally to Claude and let it handle the tools