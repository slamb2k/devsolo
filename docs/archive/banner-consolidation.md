# Banner Consolidation Plan

## Objective
Ensure consistent text block letter-style banner display across all access methods:
- MCP slash commands (`/devsolo:ship`)
- MCP direct tool calls (`mcp__devsolo__devsolo_ship`)
- CLI commands (`devsolo ship`)

## Phase 1: Extract and Standardize BANNERS

### 1.1 Create Shared Banner Module (`src/ui/banners.ts`)
- Move BANNERS Record from `src/mcp/devsolo-mcp-server.ts` (lines 64-89)
- Add missing banners: `devsolo_hotfix`, `devsolo_cleanup`
- Export const BANNERS
- Export helper function `getBanner(command: string): string` that:
  - Takes command name (e.g., 'ship', 'launch')
  - Returns `BANNERS[devsolo_${command}]` or empty string if not found

### 1.2 Update MCP Server Imports
- Import `{ getBanner }` from `../ui/banners`
- Remove BANNERS object definition (lines 64-89)
- Fix typo line 481: "One that has been shown" → "Once that has been shown"

## Phase 2: Ensure Banner Display in MCP Direct Tool Calls

### 2.1 Add Banner Output to All Tool Call Cases
In CallToolRequestSchema handler, add `console.log(getBanner('command_name'))` at START of each case:
- `case 'devsolo_init'` (line ~522): Add `console.log(getBanner('init'));`
- `case 'devsolo_launch'` (line ~536): Add `console.log(getBanner('launch'));`
- `case 'devsolo_sessions'` (line ~584): Add `console.log(getBanner('sessions'));`
- `case 'devsolo_swap'` (line ~629): Add `console.log(getBanner('swap'));`
- `case 'devsolo_abort'` (line ~706): Add `console.log(getBanner('abort'));`
- `case 'devsolo_ship'` (line ~782): Add `console.log(getBanner('ship'));`
- `case 'devsolo_status'` (line ~841): Add `console.log(getBanner('status'));`
- `case 'devsolo_status_line'` (line ~876): Add `console.log(getBanner('status-line'));`

**Why this works:** Console capture is already active (lines 502-518), so banner output will be included in capturedOutput and returned to Claude Code.

## Phase 3: Add Missing MCP Support for Hotfix

### 3.1 Add Hotfix Tool Definition (ListToolsRequestSchema handler, ~line 265)
Add after devsolo_ship tool definition

### 3.2 Add Hotfix Prompt Definition (ListPromptsRequestSchema handler, ~line 380)
Add after ship prompt definition

### 3.3 Add Hotfix Tool Call Handler (CallToolRequestSchema handler, ~line 840)
```typescript
case 'devsolo_hotfix': {
  console.log(getBanner('hotfix'));
  const params = HotfixSchema.parse(args);
  const hotfixCommand = new HotfixCommand(this.basePath);
  await hotfixCommand.execute(params);
  return { content: [{ type: 'text', text: capturedOutput.join('\n') || 'Hotfix workflow started' }] };
}
```

### 3.4 Add HotfixSchema (line ~61)
Define parameter schema for hotfix command

### 3.5 Import HotfixCommand (line ~16)
Add to existing import section

## Phase 4: Replace Box Banners with Text Block Banners in Commands

### 4.1 Update V2 Command Classes
Replace `console.log(AsciiArt.xxx())` with `console.log(getBanner('xxx'))`:
- `src/commands/devsolo-launch-v2.ts:473`
- `src/commands/devsolo-ship-v2.ts:373`
- `src/commands/devsolo-abort-v2.ts:164`
- `src/commands/devsolo-swap-v2.ts:162`
- `src/commands/devsolo-sessions-v2.ts:67`
- `src/commands/devsolo-status-v2.ts:81`
- `src/commands/devsolo-cleanup-v2.ts:169`

### 4.2 Add Import to All Modified Files
`import { getBanner } from '../ui/banners';`

## Phase 5: Update CLI to Show Banners

### 5.1 Modify src/cli.ts
- Import `{ getBanner }` from './ui/banners'
- Add `console.log(getBanner('command_name'));` at start of each run function:
  - `runInit()` → `getBanner('init')`
  - `runStatus()` → `getBanner('status')`
  - `runLaunch()` → `getBanner('launch')`
  - `runSessions()` → `getBanner('sessions')`
  - `runResume()` → `getBanner('launch')` (uses launch banner)
  - `runSwap()` → `getBanner('swap')`
  - `runAbort()` → `getBanner('abort')`
  - `runShip()` → `getBanner('ship')`
  - `runHotfix()` → `getBanner('hotfix')`

## Phase 6: Clean Up and Investigate

### 6.1 Deprecate AsciiArt Box-Style Banners
- Remove or mark as deprecated: launch(), ship(), abort(), swap(), sessions(), status(), cleanup(), hotfix()
- Keep init(), validate(), config() if still needed elsewhere
- Or delete entire class if no longer used

## Result: Consistent Banner Display

**After these changes:**
1. ✅ MCP slash commands (`/devsolo:ship`) → Show text block banner via prompt
2. ✅ MCP direct tools (`mcp__devsolo__devsolo_ship`) → Show text block banner via console.log
3. ✅ CLI commands (`devsolo ship`) → Show text block banner via console.log
4. ✅ All command classes internally → Show text block banner (no duplicate box banners)

## Files to Create/Modify

**Create:**
- `src/ui/banners.ts` (new file)
- `docs/BANNER_CONSOLIDATION.md` (this file)

**Modify:**
- `src/mcp/devsolo-mcp-server.ts` (remove BANNERS, add getBanner calls, fix typo, add hotfix)
- `src/cli.ts` (add banner displays)
- `src/commands/devsolo-launch-v2.ts` (replace banner)
- `src/commands/devsolo-ship-v2.ts` (replace banner)
- `src/commands/devsolo-abort-v2.ts` (replace banner)
- `src/commands/devsolo-swap-v2.ts` (replace banner)
- `src/commands/devsolo-sessions-v2.ts` (replace banner)
- `src/commands/devsolo-status-v2.ts` (replace banner)
- `src/commands/devsolo-cleanup-v2.ts` (replace banner)

**Investigate/Potentially Remove:**
- `src/ui/ascii-art.ts` (deprecate or remove box-style methods)
