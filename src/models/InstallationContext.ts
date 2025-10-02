export class InstallationContext {
  installationType: 'global' | 'local' | 'npx' = 'local';
  isCI: boolean = false;
  hasTTY: boolean = true;
  isDocker: boolean = false;
  globalPath: string = '';
  localPath: string = '';
  currentPath: string = '';
  isUpgrade: boolean = false;
  currentVersion?: string;
  hasGitHub: boolean = false;
  hasGitLab: boolean = false;
  hasBitbucket: boolean = false;
  packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
  nodeVersion: string = '';
  platform: NodeJS.Platform = 'linux';
  hasClaudeCode: boolean = false;
}