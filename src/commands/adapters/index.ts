/**
 * Adapter Layer - V1 API Compatibility
 *
 * These adapters wrap v2 commands to provide v1 API compatibility.
 * This allows the CLI and MCP server to use v2 implementation without breaking changes.
 *
 * Key fixes:
 * - ShipCommand: Now uses v2's automatic workflow that runs cleanup after PR merge
 * - LaunchCommand: Adds resume() method missing from v2
 * - AbortCommand: Adds abortAll() method missing from v2
 * - SwapCommand: Handles v1's overloaded execute signature
 * - StatusCommand: Implements CommandHandler interface required by CLI
 * - CleanupCommand: Implements CommandHandler interface and wraps v2
 */

export { ShipCommand } from './ship-adapter';
export { LaunchCommand } from './launch-adapter';
export { AbortCommand } from './abort-adapter';
export { SwapCommand } from './swap-adapter';
export { HansoloStatusCommand } from './status-adapter';
export { SessionsCommand } from './sessions-adapter';
export { CleanupCommand } from './cleanup-adapter';
