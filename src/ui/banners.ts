/**
 * Text block letter-style ASCII art banners for devsolo commands
 * Used consistently across MCP, CLI, and command execution
 */

// ASCII Art Banners for each command
export const BANNERS: Record<string, string> = {
  devsolo_init: `░▀█▀░█▀█░▀█▀░▀█▀░▀█▀░█▀█░█░░░▀█▀░█▀▀░▀█▀░█▀█░█▀▀░
░░█░░█░█░░█░░░█░░░█░░█▀█░█░░░░█░░▀▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░░▀░░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  devsolo_launch: `░█░░░█▀█░█░█░█▀█░█▀▀░█░█░▀█▀░█▀█░█▀▀░
░█░░░█▀█░█░█░█░█░█░░░█▀█░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░▀░▀░▀▀▀░`,
  devsolo_ship: `░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`,
  devsolo_swap: `░█▀▀░█░█░█▀█░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▄█░█▀█░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀░▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░`,
  devsolo_abort: `░█▀█░█▀▄░█▀█░█▀▄░▀█▀░▀█▀░█▀█░█▀▀░
░█▀█░█▀▄░█░█░█▀▄░░█░░░█░░█░█░█░█░
░▀░▀░▀▀░░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀░▀▀▀░`,
  devsolo_sessions: `░█▀▀░█▀▀░█▀▀░█▀▀░▀█▀░█▀█░█▀█░█▀▀░
░▀▀█░█▀▀░▀▀█░▀▀█░░█░░█░█░█░█░▀▀█░
░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  devsolo_status: `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░`,
  devsolo_status_line: `░█▀▀░▀█▀░█▀█░▀█▀░█░█░█▀▀░░░█░░░▀█▀░█▀█░█▀▀░
░▀▀█░░█░░█▀█░░█░░█░█░▀▀█░░░█░░░░█░░█░█░█▀▀░
░▀▀▀░░▀░░▀░▀░░▀░░▀▀▀░▀▀▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀░`,
  devsolo_hotfix: `░█░█░█▀█░▀█▀░█▀▀░▀█▀░█░█░
░█▀█░█░█░░█░░█▀▀░░█░░▄▀▄░
░▀░▀░▀▀▀░░▀░░▀░░░▀▀▀░▀░▀░`,
  devsolo_cleanup: `░█▀▀░█░░░█▀▀░█▀█░█▀█░█░█░█▀█░
░█░░░█░░░█▀▀░█▀█░█░█░█░█░█▀▀░
░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀░▀░▀▀▀░▀░░░`,
  devsolo_commit: `░█▀▀░█▀█░█▀▄▀█░█▀▄▀█░▀█▀░▀█▀░
░█░░░█░█░█░▀░█░█░▀░█░░█░░░█░░
░▀▀▀░▀▀▀░▀░░░▀░▀░░░▀░▀▀▀░░▀░░`,
};

/**
 * Get banner for a command
 * @param command - Command name (e.g., 'init', 'launch', or 'devsolo_init')
 * @returns Banner string or empty string if not found
 */
export function getBanner(command: string): string {
  // Normalize command name to include 'devsolo_' prefix
  const key = command.startsWith('devsolo_') ? command : `devsolo_${command}`;
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
