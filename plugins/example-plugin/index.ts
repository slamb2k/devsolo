import { Plugin, PluginContext } from '../../src/plugins/types';

export class ExamplePlugin implements Plugin {
  name = 'example-plugin';
  version = '1.0.0';
  description = 'Example plugin for devsolo';

  async activate(context: PluginContext): Promise<void> {
    console.log('Example plugin activated');

    // Register command
    context.registerCommand('example:hello', async (args) => {
      console.log('Hello from example plugin!', args);
      return { message: 'Hello from example plugin!' };
    });

    // Hook into workflow events
    context.on('workflow:started', (data) => {
      console.log('Workflow started:', data);
    });

    context.on('workflow:completed', (data) => {
      console.log('Workflow completed:', data);
    });

    // Hook into Git operations
    context.on('git:commit', (data) => {
      console.log('Git commit:', data);
    });

    context.on('git:push', (data) => {
      console.log('Git push:', data);
    });
  }

  async deactivate(): Promise<void> {
    console.log('Example plugin deactivated');
  }
}

export default ExamplePlugin;