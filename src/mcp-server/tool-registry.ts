import { AbortWorkflowTool } from './tools/abort-workflow';
import { ConfigureWorkflowTool } from './tools/configure-workflow';
import { CreateBranchTool } from './tools/create-branch';
import { CleanupOperationsTool } from './tools/cleanup-operations';
import { ExecuteWorkflowStepTool } from './tools/execute-workflow-step';
import { GetSessionsStatusTool } from './tools/get-sessions-status';
import { ManageStatusLineTool } from './tools/manage-status-line';
import { RebaseOnMainTool } from './tools/rebase-on-main';
import { StartWorkflowTool } from './tools/start-workflow';
import { SwapSessionTool } from './tools/swap-session';
import { ValidateEnvironmentTool } from './tools/validate-environment';

export interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  execute: (input: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    // Core workflow tools
    this.registerTool(new ConfigureWorkflowTool());
    this.registerTool(new StartWorkflowTool());
    this.registerTool(new ExecuteWorkflowStepTool());
    this.registerTool(new AbortWorkflowTool());

    // Session management tools
    this.registerTool(new GetSessionsStatusTool());
    this.registerTool(new SwapSessionTool());

    // Git operations tools
    this.registerTool(new CreateBranchTool());
    this.registerTool(new RebaseOnMainTool());
    this.registerTool(new CleanupOperationsTool());

    // Utility tools
    this.registerTool(new ValidateEnvironmentTool());
    this.registerTool(new ManageStatusLineTool());
  }

  public registerTool(tool: Tool): void {
    if (!tool.name) {
      throw new Error('Tool must have a name');
    }

    if (this.tools.has(tool.name)) {
      console.warn(`Tool '${tool.name}' is already registered. Overwriting.`);
    }

    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  public getToolDescriptions(): Array<{ name: string; description: string }> {
    return this.listTools().map(tool => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  public async executeTool(name: string, input: any): Promise<any> {
    const tool = this.getTool(name);

    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    // Validate input against schema if needed
    // This could be enhanced with proper JSON schema validation

    return await tool.execute(input);
  }

  public getToolSchema(name: string): any {
    const tool = this.getTool(name);

    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    return tool.inputSchema;
  }

  public exportToolsForMCP(): any[] {
    return this.listTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }
}

// Singleton instance
let registry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registry) {
    registry = new ToolRegistry();
  }
  return registry;
}

export function resetToolRegistry(): void {
  registry = null;
}