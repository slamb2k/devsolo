/**
 * Text block letter-style ASCII art banners for han-solo commands
 * Used consistently across MCP, CLI, and command execution
 */

// ASCII Art Banners for each command
export const BANNERS: Record<string, string> = {
  hansolo_init: `░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_launch: `░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_ship: `░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_swap: `░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_abort: `░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_sessions: `░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_status: `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░`,
  hansolo_status_line: `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░░░█░░░▀█▀░█▀█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░░░█░░░░█░░█░█░█▀▀░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  hansolo_hotfix: `░█░█░█▀█░▀█▀░█▀▀░▀█▀░█░█░
░█▀█░█░█░░█░░█▀▀░░█░░▄▀▄░
░▀░▀░▀▀▀░░▀░░▀░░░▀▀▀░▀░▀░`,
  hansolo_cleanup: `░█▀▀░█░░░█▀▀░█▀█░█▀█░█░█░█▀█░
░█░░░█░░░█▀▀░█▀█░█░█░█░█░█▀▀░
░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░░░`,
  hansolo_commit: `░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░`,
};

/**
 * Get banner for a command
 * @param command - Command name (e.g., 'init', 'launch', or 'hansolo_init')
 * @returns Banner string or empty string if not found
 */
export function getBanner(command: string): string {
  // Normalize command name to include 'hansolo_' prefix
  const key = command.startsWith('hansolo_') ? command : `hansolo_${command}`;
  return BANNERS[key] || '';
}

/**
 * Get tool name from command for banner display
 * @param toolName - Tool class name (e.g., 'LaunchTool', 'ShipTool')
 * @returns Command name for banner lookup (e.g., 'launch', 'ship')
 */
export function getCommandFromToolName(toolName: string): string {
  // Remove 'Tool' suffix and convert to lowercase
  return toolName.replace(/Tool$/, '').toLowerCase();
}
