import { ConfigManager } from '../../services/ConfigManager';
import { InstallationContext } from '../../models/InstallationContext';
import fs from 'fs';
import * as yaml from 'yaml';

jest.mock('fs');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new ConfigManager();
    process.env['USER'] = 'testuser';
  });

  describe('load', () => {
    it('should load configuration from file', async () => {
      const context = new InstallationContext();
      context.globalPath = '/home/user/.devsolo';

      const configData = {
        version: '1.0.0',
        workflow: { autoRebase: true },
        ui: { colors: true },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(yaml.stringify(configData));

      const config = await configManager.load(context);

      expect(config).toMatchObject(configData);
    });

    it('should return null if config file does not exist', async () => {
      const context = new InstallationContext();

      mockFs.existsSync.mockReturnValue(false);

      const config = await configManager.load(context);

      expect(config).toBeNull();
    });

    it('should return null for invalid config', async () => {
      const context = new InstallationContext();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(yaml.stringify({ invalid: 'config' }));

      const config = await configManager.load(context);

      expect(config).toBeNull();
    });

    it('should handle YAML parse errors gracefully', async () => {
      const context = new InstallationContext();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid: yaml: content:');

      const config = await configManager.load(context);

      expect(config).toBeNull();
    });
  });

  describe('save', () => {
    it('should save configuration with defaults', async () => {
      const context = new InstallationContext();
      context.globalPath = '/home/user/.devsolo';
      context.installationType = 'global';
      context.hasGitHub = true;

      const data = {
        workflow: { autoRebase: true },
        ui: { colors: true },
      };

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.chmodSync.mockImplementation(() => {});

      await configManager.save(data, context);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.yaml'),
        expect.stringContaining('version: 1.0.0'),
        'utf8'
      );
      expect(mockFs.chmodSync).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      const context = new InstallationContext();
      context.localPath = '/project/.devsolo';

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined as any);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.chmodSync.mockImplementation(() => {});

      await configManager.save({}, context);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.devsolo'),
        { recursive: true }
      );
    });

    it('should include metadata in saved config', async () => {
      const context = new InstallationContext();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.chmodSync.mockImplementation(() => {});

      await configManager.save({}, context);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('modifiedBy: testuser'),
        'utf8'
      );
    });

    it('should throw error if save fails', async () => {
      const context = new InstallationContext();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(configManager.save({}, context)).rejects.toThrow(
        'Could not save configuration'
      );
    });
  });

  describe('migrate', () => {
    it('should migrate old configuration to new version', async () => {
      const oldConfig = {
        version: '0.9.0',
        workflow: { autoRebase: false },
      };

      const migrated = await configManager.migrate(oldConfig, '1.0.0');

      expect(migrated.version).toBe('1.0.0');
      expect(migrated.workflow.autoRebase).toBe(false); // Preserves old value
      expect(migrated.workflow.squashMerge).toBe(true); // Adds default
      expect(migrated.metadata?.migratedFrom).toBe('0.9.0');
    });

    it('should handle missing fields in old config', async () => {
      const oldConfig = {};

      const migrated = await configManager.migrate(oldConfig, '1.0.0');

      expect(migrated.version).toBe('1.0.0');
      expect(migrated.workflow).toBeDefined();
      expect(migrated.integrations).toBeDefined();
      expect(migrated.ui).toBeDefined();
    });

    it('should preserve existing data during migration', async () => {
      const oldConfig = {
        workflow: {
          customField: 'custom-value',
          autoRebase: false,
        },
        ui: {
          colors: false,
        },
      };

      const migrated = await configManager.migrate(oldConfig, '1.0.0');

      expect(migrated.workflow.autoRebase).toBe(false);
      expect(migrated.ui.colors).toBe(false);
    });
  });

  describe('getConfigPath', () => {
    it('should return global path for global installation', () => {
      const context = new InstallationContext();
      context.installationType = 'global';
      context.globalPath = '/home/user/.devsolo';

      const path = configManager.getConfigPath(context);

      expect(path).toBe('/home/user/.devsolo/config.yaml');
    });

    it('should return local path for local installation', () => {
      const context = new InstallationContext();
      context.installationType = 'local';
      context.localPath = '/project/.devsolo';

      const path = configManager.getConfigPath(context);

      expect(path).toBe('/project/.devsolo/config.yaml');
    });

    it('should return local path for npx installation', () => {
      const context = new InstallationContext();
      context.installationType = 'npx';
      context.localPath = '/tmp/.devsolo';

      const path = configManager.getConfigPath(context);

      expect(path).toBe('/tmp/.devsolo/config.yaml');
    });
  });
});