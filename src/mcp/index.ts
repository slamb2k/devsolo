// Entry point for running MCP server directly with node
import { HanSoloMCPServer } from './hansolo-mcp-server';

const server = new HanSoloMCPServer();
server.run().catch((error) => {
  console.error('[hansolo-mcp] Server error:', error);
  process.exit(1);
});
