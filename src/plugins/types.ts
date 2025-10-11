import { EventEmitter } from 'events';

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  activate(context: PluginContext): Promise<void>;
  deactivate(): Promise<void>;
}

export interface PluginContext extends EventEmitter {
  registerCommand(name: string, handler: CommandHandler): void;
  registerHook(name: string, handler: HookHandler): void;
  getConfig(): any;
  getLogger(): Logger;
}

export type CommandHandler = (args: any[]) => Promise<any>;
export type HookHandler = (data: any) => Promise<any>;

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  main: string;
  devsolo?: {
    minVersion?: string;
    maxVersion?: string;
    hooks?: string[];
    commands?: string[];
  };
}