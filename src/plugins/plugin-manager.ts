import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  hooks?: string[];
  commands?: string[];
  dependencies?: Record<string, string>;
}

export interface Plugin {
  metadata: PluginMetadata;
  activate: (context: PluginContext) => Promise<void>;
  deactivate?: () => Promise<void>;
  onCommand?: (command: string, args: any[]) => Promise<any>;
  onHook?: (hook: string, data: any) => Promise<any>;
}

export interface PluginContext {
  workingDirectory: string;
  config: Record<string, any>;
  logger: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };
  api: {
    executeCommand: (command: string, args?: any[]) => Promise<any>;
    registerCommand: (name: string, handler: Function) => void;
    registerHook: (name: string, handler: Function) => void;
    getSession: () => any;
    getGitStatus: () => Promise<any>;
  };
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private pluginPaths: string[] = [];
  private context: PluginContext;

  constructor() {
    super();
    this.context = this.createContext();
    this.initializePluginPaths();
  }

  private initializePluginPaths(): void {
    // Default plugin directories
    this.pluginPaths = [
      path.join(process.cwd(), '.devsolo', 'plugins'),
      path.join(process.env['HOME'] || '', '.devsolo', 'plugins'),
      path.join(__dirname, '..', '..', 'plugins'),
    ];

    // Add custom plugin paths from environment
    const customPath = process.env['DEVSOLO_PLUGIN_PATH'];
    if (customPath) {
      this.pluginPaths.unshift(...customPath.split(':'));
    }
  }

  private createContext(): PluginContext {
    return {
      workingDirectory: process.cwd(),
      config: {},
      logger: {
        info: (message: string) => console.log(`[Plugin] ${message}`),
        warn: (message: string) => console.warn(`[Plugin] ⚠️  ${message}`),
        error: (message: string) => console.error(`[Plugin] ❌ ${message}`),
        debug: (message: string) => {
          if (process.env['DEBUG']) {
            console.debug(`[Plugin] 🔍 ${message}`);
          }
        },
      },
      api: {
        executeCommand: async (command: string, args?: any[]) => {
          return this.emit('command', command, args);
        },
        registerCommand: (name: string, handler: Function) => {
          this.on(`command:${name}`, handler as (...args: any[]) => void);
        },
        registerHook: (name: string, handler: Function) => {
          this.on(`hook:${name}`, handler as (...args: any[]) => void);
        },
        getSession: () => {
          // This would be connected to the actual session repository
          return null;
        },
        getGitStatus: async () => {
          // This would be connected to git operations
          return null;
        },
      },
    };
  }

  async loadPlugin(pluginPath: string): Promise<void> {
    try {
      // Check if plugin directory exists
      const stats = await fs.stat(pluginPath);
      if (!stats.isDirectory()) {
        throw new Error(`Not a directory: ${pluginPath}`);
      }

      // Load plugin package.json
      const packagePath = path.join(pluginPath, 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packagePath, 'utf-8')
      );

      // Load plugin metadata
      const metadata: PluginMetadata = {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description || '',
        author: packageJson.author,
        hooks: packageJson.devsolo?.hooks || [],
        commands: packageJson.devsolo?.commands || [],
        dependencies: packageJson.dependencies || {},
      };

      // Load plugin main file
      const mainFile = packageJson.main || 'index.js';
      const pluginModule = await import(path.join(pluginPath, mainFile));

      // Create plugin instance
      const plugin: Plugin = {
        metadata,
        activate: pluginModule.activate || (async () => {}),
        deactivate: pluginModule.deactivate,
        onCommand: pluginModule.onCommand,
        onHook: pluginModule.onHook,
      };

      // Register plugin
      this.plugins.set(metadata.name, plugin);

      // Activate plugin
      await plugin.activate(this.context);

      // Register commands
      if (metadata.commands) {
        for (const command of metadata.commands) {
          if (plugin.onCommand) {
            this.context.api.registerCommand(command, plugin.onCommand);
          }
        }
      }

      // Register hooks
      if (metadata.hooks) {
        for (const hook of metadata.hooks) {
          if (plugin.onHook) {
            this.context.api.registerHook(hook, plugin.onHook);
          }
        }
      }

      this.context.logger.info(`Loaded plugin: ${metadata.name} v${metadata.version}`);
      this.emit('plugin:loaded', metadata);
    } catch (error) {
      this.context.logger.error(`Failed to load plugin from ${pluginPath}: ${error}`);
      this.emit('plugin:error', { path: pluginPath, error });
    }
  }

  async loadAllPlugins(): Promise<void> {
    for (const pluginDir of this.pluginPaths) {
      try {
        const files = await fs.readdir(pluginDir);
        for (const file of files) {
          const pluginPath = path.join(pluginDir, file);
          const stats = await fs.stat(pluginPath);
          if (stats.isDirectory()) {
            await this.loadPlugin(pluginPath);
          }
        }
      } catch (error) {
        // Directory doesn't exist or isn't readable
        this.context.logger.debug(`Plugin directory not accessible: ${pluginDir}`);
      }
    }
  }

  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    // Call deactivate if available
    if (plugin.deactivate) {
      await plugin.deactivate();
    }

    // Remove from registry
    this.plugins.delete(pluginName);

    // Remove event listeners
    if (plugin.metadata.commands) {
      for (const command of plugin.metadata.commands) {
        this.removeAllListeners(`command:${command}`);
      }
    }

    if (plugin.metadata.hooks) {
      for (const hook of plugin.metadata.hooks) {
        this.removeAllListeners(`hook:${hook}`);
      }
    }

    this.context.logger.info(`Unloaded plugin: ${pluginName}`);
    this.emit('plugin:unloaded', pluginName);
  }

  async reloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }

    // Find plugin path
    let pluginPath: string | undefined;
    for (const dir of this.pluginPaths) {
      const testPath = path.join(dir, pluginName);
      try {
        await fs.stat(testPath);
        pluginPath = testPath;
        break;
      } catch {}
    }

    if (!pluginPath) {
      throw new Error(`Cannot find plugin path for: ${pluginName}`);
    }

    // Unload and reload
    await this.unloadPlugin(pluginName);
    await this.loadPlugin(pluginPath);
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginMetadata(name: string): PluginMetadata | undefined {
    return this.plugins.get(name)?.metadata;
  }

  async executeHook(hookName: string, data: any): Promise<any[]> {
    const results: any[] = [];

    for (const [name, plugin] of this.plugins) {
      if (plugin.metadata.hooks?.includes(hookName) && plugin.onHook) {
        try {
          const result = await plugin.onHook(hookName, data);
          results.push({ plugin: name, result });
        } catch (error) {
          this.context.logger.error(`Plugin ${name} failed on hook ${hookName}: ${error}`);
        }
      }
    }

    this.emit(`hook:${hookName}`, data, results);
    return results;
  }

  async executeCommand(commandName: string, args: any[]): Promise<any> {
    for (const [name, plugin] of this.plugins) {
      if (plugin.metadata.commands?.includes(commandName) && plugin.onCommand) {
        try {
          return await plugin.onCommand(commandName, args);
        } catch (error) {
          this.context.logger.error(`Plugin ${name} failed on command ${commandName}: ${error}`);
          throw error;
        }
      }
    }

    throw new Error(`No plugin handles command: ${commandName}`);
  }

  listAvailableCommands(): string[] {
    const commands = new Set<string>();
    for (const plugin of this.plugins.values()) {
      if (plugin.metadata.commands) {
        for (const command of plugin.metadata.commands) {
          commands.add(command);
        }
      }
    }
    return Array.from(commands);
  }

  listAvailableHooks(): string[] {
    const hooks = new Set<string>();
    for (const plugin of this.plugins.values()) {
      if (plugin.metadata.hooks) {
        for (const hook of plugin.metadata.hooks) {
          hooks.add(hook);
        }
      }
    }
    return Array.from(hooks);
  }
}