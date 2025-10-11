# Prompt-Based Parameter Collection Pattern

**Pattern Type**: MCP Tool Design Pattern

**Problem**: Elicitations not supported in Claude Code

**Solution**: Return successful results with prompts instead of errors for missing optional parameters

---

## Context

### The Challenge

MCP (Model Context Protocol) includes a feature called "elicitations" that allows tools to request additional information from users when required parameters are missing. However, **Claude Code does not currently support elicitations**.

When a tool is called without required parameters, the traditional approach would be:
1. Tool detects missing parameter
2. Tool returns error: "Missing required parameter: message"
3. User sees error
4. User manually retries with parameter

This creates a poor user experience, especially in an AI-assisted workflow where Claude could help fill in the missing information.

### The Opportunity

Claude Code excels at conversational, multi-turn interactions. Instead of treating missing parameters as errors, we can leverage Claude's ability to:
- Analyze the current state (e.g., git diff for commit messages)
- Generate appropriate content (e.g., commit messages, PR descriptions)
- Engage in multi-turn conversations to gather information
- **Ask users for input when needed** (hybrid approach)
- Present options and let users choose or modify suggestions

## The Pattern

### Core Concept

**Return success with a prompt instead of an error for missing optional parameters.**

When a parameter is missing but could be inferred or generated:
1. ✅ Return `success: true` (not an error)
2. ✅ Include a message prompting next steps
3. ✅ Provide context to help Claude generate the missing information
4. ✅ Let Claude handle the multi-turn conversation

### Implementation Structure

```typescript
// Traditional approach (error)
if (!input.message) {
  return {
    success: false,
    errors: ["Missing required parameter: message"],
  };
}

// Prompt-based approach (success with prompt)
if (!input.message) {
  return {
    success: true,
    message: "No commit message provided. Please analyze the changes and provide an appropriate commit message.",
    data: {
      changedFiles: await this.gitOps.getChangedFiles(),
      diffSummary: await this.gitOps.getDiffSummary(),
    },
    nextSteps: [
      "Review the changed files",
      "Generate a conventional commit message",
      "Call devsolo_commit again with the generated message",
    ],
  };
}
```

## Hybrid Approach: AI Generation + User Input

### The Extension

While the pattern excels at AI-generated content, it can also support **user-provided input**. Claude can:
1. Present the prompt to the user
2. Ask the user for their input
3. Use the user's input directly (or modify it based on their feedback)
4. Retry the tool call with the user-provided parameter

This creates a **flexible three-way interaction**:
- **Fully AI-Generated**: Claude generates the parameter automatically
- **User-Provided**: Claude asks user, user provides, Claude uses it
- **AI-Suggested + User-Modified**: Claude suggests, user modifies, Claude uses modified version

### When to Use Each Approach

**AI-Generated** (Claude decides):
```
User: "Commit my changes"
→ Claude analyzes diff
→ Claude generates commit message
→ Claude commits automatically
```

**User-Provided** (Claude asks):
```
User: "Commit my changes"
→ Claude: "I see you have changes to auth.ts. What commit message would you like to use?"
→ User: "fix: resolve JWT token expiration bug"
→ Claude commits with user's message
```

**AI-Suggested + User-Modified** (Collaborative):
```
User: "Commit my changes"
→ Claude: "I suggest: 'feat: add user authentication'. Does this work or would you like to modify it?"
→ User: "Change it to 'feat: add OAuth2 authentication with Google provider'"
→ Claude commits with modified message
```

### Implementation Pattern for User Input

The same prompt-based result enables all three approaches:

```typescript
if (!input.message) {
  return {
    success: true,
    message: "No commit message provided. I can either generate one based on your changes, or you can provide one yourself.",
    data: {
      changedFiles: await this.gitOps.getChangedFiles(),
      diffSummary: await this.gitOps.getDiffSummary(),
      // AI can use this to generate suggestions
      suggestedMessages: await this.generateSuggestions(),
    },
    nextSteps: [
      "Option 1: I can analyze the changes and generate a commit message",
      "Option 2: You can provide a commit message directly",
      "Option 3: I can suggest a message and you can modify it",
      "Call devsolo_commit with your chosen message",
    ],
  };
}
```

### Real-World Example: User Input Flow

**Scenario**: User wants to provide their own commit message

```
User: Commit my changes

Claude: I see you've modified 3 files related to authentication.
        Would you like me to generate a commit message, or would you
        prefer to provide one yourself?

User: I'll provide it: "feat: integrate Auth0 for SSO login"

Claude: [Calls devsolo_commit with message "feat: integrate Auth0 for SSO login"]
        Committed successfully with your message!
```

**What Happened**:
1. Tool returned success with prompt and context
2. Claude presented the prompt to user
3. Claude asked if user wanted to provide message
4. User provided their own message
5. Claude used user's message to call tool
6. Success!

### Real-World Example: Collaborative Flow

**Scenario**: Claude suggests, user modifies

```
User: Commit my changes with a good message

Claude: I've analyzed your changes. Here's what I suggest:
        "feat: add user authentication with OAuth2 and JWT tokens"

        Does this work, or would you like to modify it?

User: Make it more specific: "feat: add OAuth2 authentication with Google and GitHub providers"

Claude: [Calls devsolo_commit with the modified message]
        Committed with your updated message!
```

### When User Input is Better

**Use user input when**:
- User has domain knowledge Claude doesn't (ticket numbers, project terminology)
- User wants precise control over wording
- Changes are sensitive and require human judgment
- User preferences are involved (subjective decisions)
- Context is unclear and user needs to disambiguate

**Examples**:
```
User: "Commit my changes"
Claude: "I see changes to both the database schema and the API.
         Are these related changes, or should they be separate commits?"
User: "Separate commits please - first the schema, then the API"
```

```
User: "Ship this feature"
Claude: "Should I mark this PR as ready for review, or as a draft
         since you mentioned it's still experimental?"
User: "Mark it as draft for now"
```

### Prompt Wording for User Input

To encourage user input, use inviting language:

```typescript
// Good: Offers both options
message: "No commit message provided. I can generate one based on your changes, or you can provide one yourself."

// Good: Asks user preference
message: "I see you've made authentication changes. Would you like me to suggest a commit message, or would you prefer to write your own?"

// Good: Collaborative tone
message: "I can help with this commit message. What would you like to emphasize about these changes?"

// Less good: Assumes AI generation
message: "No commit message provided. I'll generate one for you."

// Less good: Doesn't offer user option
message: "Missing commit message. Analyzing changes..."
```

### Handling User Responses

Claude Code naturally handles user responses in conversation:

```typescript
// The tool returns the same prompt-based result
// Claude can then:
// 1. Generate content automatically
// 2. Ask user for input
// 3. Suggest and let user modify
// All without changing the tool implementation!
```

The beauty of this pattern is that **the tool doesn't need to know** whether Claude will generate the parameter or ask the user. The tool just provides:
- Context (changed files, diff, etc.)
- Options (generate, provide, suggest)
- Clear next steps

Claude makes the decision based on:
- User's request tone ("commit my changes" vs "commit with my message")
- Conversation context
- User's previous preferences
- Complexity of the task

### Benefits of Hybrid Approach

1. **User Control**: Users can override AI when they want
2. **AI Assistance**: AI helps when users want it
3. **Flexibility**: Same tool supports both workflows
4. **Natural Flow**: Claude decides based on context
5. **No Tool Changes**: Implementation stays the same

### Testing Hybrid Flows

```typescript
describe('CommitTool - Hybrid Approach', () => {
  it('should support AI-generated messages', async () => {
    // Claude generates message from diff
    const result1 = await commitTool.execute({});
    expect(result1.success).toBe(true);
    expect(result1.data.changedFiles).toBeDefined();

    // Claude calls again with generated message
    const result2 = await commitTool.execute({
      message: 'feat: add authentication' // AI-generated
    });
    expect(result2.success).toBe(true);
  });

  it('should support user-provided messages', async () => {
    // User provides message directly
    const result = await commitTool.execute({
      message: 'feat: integrate Auth0 for SSO' // User-provided
    });
    expect(result.success).toBe(true);
  });

  it('should support collaborative modification', async () => {
    // Claude suggests, user modifies
    const result1 = await commitTool.execute({});
    // Claude generates: "feat: add authentication"
    // User says: "Make it more specific"
    // Claude modifies: "feat: add OAuth2 authentication with Google"

    const result2 = await commitTool.execute({
      message: 'feat: add OAuth2 authentication with Google'
    });
    expect(result2.success).toBe(true);
  });
});
```

## Real-World Examples

### Example 1: Commit Without Message

**User Request**:
```
"Commit my changes"
```

**Tool Behavior** (CommitTool):

```typescript
async execute(input: CommitToolInput): Promise<SessionToolResult> {
  // Check if message is missing
  if (!input.message) {
    // Instead of error, return success with prompt
    const changedFiles = await this.gitOps.getChangedFiles();
    const diff = await this.gitOps.getDiff();

    return {
      success: true,
      message: "No commit message provided. I can help generate one based on your changes.",
      data: {
        changedFiles,
        diffSummary: this.summarizeDiff(diff),
      },
      nextSteps: [
        "Analyze the code changes",
        "Generate a conventional commit message (e.g., 'feat:', 'fix:', 'docs:')",
        "Call devsolo_commit with the generated message",
      ],
    };
  }

  // Continue with normal commit logic
  // ...
}
```

**Claude Code's Response**:
```
User: Commit my changes

Claude: I'll analyze your changes to generate an appropriate commit message.

[Claude examines the diff and changed files]

Claude: Based on your changes, I'll commit with this message:
"feat: add user authentication with OAuth2 support"

[Claude calls devsolo_commit with the generated message]

Claude: Changes committed successfully!
```

**What Happened**:
1. User didn't provide commit message
2. Tool returned success (not error) with prompt
3. Claude saw the prompt and context (changed files, diff)
4. Claude generated appropriate commit message
5. Claude called tool again with generated message
6. Commit succeeded

### Example 2: Ship Without PR Description

**User Request**:
```
"Ship this feature"
```

**Tool Behavior** (ShipTool):

```typescript
async execute(input: ShipToolInput): Promise<GitHubToolResult> {
  // Check if PR description is missing
  if (input.createPR && !input.prDescription) {
    // Get commit history for context
    const commits = await this.gitOps.getCommitsSinceMain();
    const diff = await this.gitOps.getDiffAgainstMain();

    return {
      success: true,
      message: "No PR description provided. I can help generate a comprehensive one based on your commits.",
      data: {
        commits: commits.map(c => ({
          message: c.message,
          hash: c.hash,
          author: c.author,
        })),
        filesChanged: await this.gitOps.getChangedFilesSinceMain(),
        diffStats: this.getDiffStats(diff),
      },
      nextSteps: [
        "Review the commit history",
        "Analyze the overall changes",
        "Generate a structured PR description with Summary, Changes, and Testing sections",
        "Call devsolo_ship with the generated PR description",
      ],
    };
  }

  // Continue with normal ship logic
  // ...
}
```

**Claude Code's Response**:
```
User: Ship this feature

Claude: I'll create a comprehensive PR description for your feature.

[Claude examines commits and changes]

Claude: I'll ship your feature with this PR description:

## Summary
Adds user authentication system with OAuth2 integration and JWT tokens.

## Changes
- OAuth2 authentication flow with Google and GitHub providers
- JWT token generation and validation
- Protected route middleware
- User session management
- Comprehensive test coverage

## Testing
- All unit tests passing (32 new tests)
- Integration tests for auth flow
- Manual testing with both OAuth providers

[Claude calls devsolo_ship with the generated PR description]

Claude: Feature shipped successfully! 🚀
       PR #42 created, CI passed, and merged to main.
```

### Example 3: Launch Without Branch Name

**User Request**:
```
"Start a new feature for user profiles"
```

**Tool Behavior** (LaunchTool):

```typescript
async execute(input: LaunchToolInput): Promise<SessionToolResult> {
  // If branch name not provided but description is
  if (!input.branchName && input.description) {
    // Generate branch name from description
    const generatedBranch = this.branchNaming.generateFromDescription(input.description);

    return {
      success: true,
      message: `Generated branch name from description: ${generatedBranch}`,
      data: {
        suggestedBranchName: generatedBranch,
        description: input.description,
      },
      nextSteps: [
        `Confirm the branch name: ${generatedBranch}`,
        `Or provide a custom branch name`,
        `Call devsolo_launch with the chosen branch name`,
      ],
    };
  }

  // Continue with normal launch logic
  // ...
}
```

**Claude Code's Response**:
```
User: Start a new feature for user profiles

Claude: I'll start a new feature branch for user profiles.
        Generated branch name: feature/user-profiles

[Claude calls devsolo_launch with branchName "feature/user-profiles"]

Claude: Feature branch created successfully!
        Branch: feature/user-profiles
        Session ID: a1b2c3d4
        Ready to start coding!
```

## Benefits

### 1. Natural Conversational Flow

**Without pattern**:
```
User: Commit my changes
Claude: Error - missing commit message
User: Commit my changes with message "feat: add auth"
Claude: Committed successfully
```

**With pattern**:
```
User: Commit my changes
Claude: I'll analyze your changes and commit with an appropriate message.
        Committed with: "feat: add user authentication with OAuth2"
        Success!
```

### 2. AI-Assisted Content Generation

Claude Code can:
- Generate conventional commit messages from diffs
- Create structured PR descriptions from commit history
- Suggest appropriate branch names from descriptions
- Fill in context-dependent parameters

### 3. Reduced User Friction

Users don't need to:
- Know exact parameter names
- Manually craft commit messages
- Write PR descriptions
- Think of branch names

### 4. Flexible Interaction Models

Supports both:
- **Casual users**: "Commit my changes" (Claude fills in details)
- **Power users**: "Commit with 'feat: add auth'" (explicit parameters)

### 5. Better Error Recovery

Instead of error → retry cycle:
- Tool provides helpful context
- Claude generates solution
- Tool succeeds on retry

## Implementation Guidelines

### When to Use This Pattern

✅ **Use for**:
- Optional parameters that Claude can infer (commit messages, PR descriptions)
- Parameters with context available (branch names from descriptions)
- Content generation opportunities (descriptions, summaries)
- Multi-turn workflows that benefit from AI assistance

❌ **Don't use for**:
- Truly required parameters with no inference possible
- System state parameters (force, yes, deleteBranch)
- Parameters requiring user-specific knowledge
- Security-sensitive parameters

### Parameter Classification

**Tier 1: AI-Generatable** (Use prompt pattern)
- `message` in `devsolo_commit` - Claude can analyze diff
- `prDescription` in `devsolo_ship` - Claude can analyze commits
- `branchName` in `devsolo_launch` - Claude can generate from description

**Tier 2: Inferrable with Context** (Use prompt pattern)
- `description` in `devsolo_launch` - Claude can ask for clarification
- `issue` in `devsolo_hotfix` - Claude can prompt for details

**Tier 3: User Decision** (Don't use prompt pattern, use defaults)
- `force` - Boolean flag, default to false
- `deleteBranch` - Boolean flag, default to false
- `stagedOnly` - Boolean flag, default to false
- `merge` - Boolean flag, default to true
- `createPR` - Boolean flag, default to true

### Response Structure

```typescript
// Prompt-based response structure
interface PromptResponse {
  success: true;  // Always true for prompts
  message: string;  // Clear prompt for what's needed
  data: {
    // Context to help Claude generate the missing parameter
    // Examples: changedFiles, commits, diffSummary
  };
  nextSteps: string[];  // Guide Claude on what to do next
  warnings?: string[];  // Optional warnings
}

// Example
{
  success: true,
  message: "No commit message provided. I can help generate one based on your changes.",
  data: {
    changedFiles: ["src/auth.ts", "src/auth.test.ts"],
    diffSummary: "+120 -5 lines across 2 files",
    changes: {
      added: ["OAuth2 authentication", "JWT tokens"],
      modified: ["User model"],
      deleted: []
    }
  },
  nextSteps: [
    "Analyze the code changes to understand the purpose",
    "Generate a conventional commit message (feat/fix/docs/etc)",
    "Call devsolo_commit with the generated message"
  ]
}
```

### Context Provision

Provide enough context for Claude to make good decisions:

```typescript
// Good: Rich context
{
  message: "No commit message provided.",
  data: {
    changedFiles: ["src/auth.ts", "tests/auth.test.ts"],
    filesAdded: 2,
    filesModified: 0,
    filesDeleted: 0,
    linesAdded: 120,
    linesDeleted: 5,
    diffSummary: "Added OAuth2 authentication with Google provider",
    // Optionally include actual diff snippets
  }
}

// Bad: Insufficient context
{
  message: "No commit message provided.",
  data: {
    changedFiles: ["src/auth.ts"]
  }
}
```

### Next Steps Guidance

Guide Claude on the multi-turn flow:

```typescript
nextSteps: [
  // 1. What to analyze
  "Review the changed files and diff",

  // 2. What to generate
  "Generate a conventional commit message following the format: <type>: <description>",

  // 3. How to retry
  "Call devsolo_commit with the generated message"
]
```

## Comparison with Traditional Approaches

### Approach 1: Strict Validation (Error on Missing)

```typescript
if (!input.message) {
  return {
    success: false,
    errors: ["Commit message is required"],
  };
}
```

**Pros**:
- Simple, clear contract
- Explicit requirements

**Cons**:
- Poor UX in AI-assisted context
- Misses opportunity for AI help
- Creates error → retry cycles

### Approach 2: Elicitation (MCP Feature - Not Supported)

```typescript
if (!input.message) {
  return {
    type: "elicitation",
    prompt: "Please provide a commit message:",
    parameter: "message",
  };
}
```

**Pros**:
- Formal MCP mechanism
- Standard protocol

**Cons**:
- **Not supported in Claude Code**
- Blocks on user input
- No AI assistance

### Approach 3: Prompt-Based (Our Pattern)

```typescript
if (!input.message) {
  return {
    success: true,
    message: "No commit message provided. I can help generate one.",
    data: { /* context */ },
    nextSteps: [ /* guidance */ ],
  };
}
```

**Pros**:
- Works with Claude Code today
- Leverages AI capabilities
- Natural conversational flow
- Reduces user friction

**Cons**:
- Requires multi-turn handling
- More complex implementation
- Context gathering overhead

## Testing Considerations

### Test Both Paths

```typescript
describe('CommitTool', () => {
  it('should prompt for message when missing', async () => {
    const result = await commitTool.execute({ stagedOnly: false });

    expect(result.success).toBe(true);
    expect(result.message).toContain('No commit message provided');
    expect(result.data).toHaveProperty('changedFiles');
    expect(result.nextSteps).toBeDefined();
  });

  it('should commit when message provided', async () => {
    const result = await commitTool.execute({
      message: 'feat: add feature',
      stagedOnly: false
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Committed successfully');
  });
});
```

### Test Context Quality

```typescript
it('should provide rich context for AI generation', async () => {
  const result = await commitTool.execute({ stagedOnly: false });

  expect(result.data.changedFiles).toBeDefined();
  expect(result.data.diffSummary).toBeDefined();
  expect(result.data.changes).toHaveProperty('added');
  expect(result.data.changes).toHaveProperty('modified');
});
```

## Future Considerations

### When Elicitations Are Supported

If Claude Code adds elicitation support:

1. **Hybrid approach**: Use elicitations for simple prompts, keep prompt pattern for AI-assisted generation
2. **Configuration**: Make it configurable per-tool or per-parameter
3. **Graceful degradation**: Fall back to prompt pattern if elicitation fails

### Pattern Evolution

As Claude Code evolves, monitor:
- Elicitation support announcements
- Multi-turn conversation improvements
- Context limits and performance
- User feedback on AI-generated vs user-provided content

## Conclusion

The prompt-based parameter collection pattern is a pragmatic workaround for the lack of elicitation support in Claude Code. By returning successful results with prompts instead of errors, we:

1. Enable natural conversational workflows
2. Leverage Claude's AI capabilities for content generation
3. **Support flexible interaction models** (AI-generated, user-provided, or collaborative)
4. Reduce user friction
5. Maintain flexibility for both casual and power users
6. **Give users control** when they want it, AI assistance when they need it

The **hybrid approach** extends this pattern to support three interaction models:
- **AI-Generated**: Claude automatically generates missing parameters
- **User-Provided**: Claude asks users for input when appropriate
- **Collaborative**: Claude suggests, users modify, creating the best of both worlds

This pattern represents a shift from "fail-fast validation" to "AI-assisted completion with user control" - appropriate for tools operating in an AI-native environment like Claude Code while respecting user autonomy and expertise.

---

**Pattern Status**: ✅ Active (v2.0.0) - Extended with Hybrid Approach

**Used In**:
- `CommitTool` - Generating/collecting commit messages (AI or user)
- `ShipTool` - Generating/collecting PR descriptions (AI or user)
- `LaunchTool` - Generating/collecting branch names (AI or user)
- `HotfixTool` - Prompting for issue details (AI or user)

**Supports**:
- ✅ Fully AI-generated parameters
- ✅ User-provided parameters (via Claude asking)
- ✅ Collaborative (AI suggests, user modifies)

**Related Patterns**:
- [Pre-Flight Validation](pre-flight-validation-pattern.md) - For hard requirements
- [Structured Results](structured-results-pattern.md) - For returning context

**Last Updated**: 2025-10-10 (Extended with hybrid approach)
