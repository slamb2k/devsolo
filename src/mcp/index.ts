// Entry point for running MCP server directly with node
import { DevSoloMCPServer } from './devsolo-mcp-server';

const server = new DevSoloMCPServer();
server.run().catch((error) => {
  console.error('[devsolo-mcp] Server error:', error);
  process.exit(1);
});
