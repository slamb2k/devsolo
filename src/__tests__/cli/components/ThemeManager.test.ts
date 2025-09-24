import { ThemeManager } from '../../../cli/components/ThemeManager';

jest.mock('chalk', () => ({
  level: 1,
  green: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
  yellow: jest.fn((text: string) => text),
  cyan: jest.fn((text: string) => text),
  gray: jest.fn((text: string) => text),
  bold: jest.fn((text: string) => text),
  white: { bold: jest.fn((text: string) => text) },
}));

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Reset environment variables
    delete process.env['NO_COLOR'];
    delete process.env['NO_EMOJI'];
    delete process.env['HANSOLO_VERBOSE'];
    delete process.env['CI'];

    themeManager = new ThemeManager();
  });

  describe('constructor', () => {
    it('should detect color support', () => {
      const theme = themeManager.getTheme();
      expect(theme.colors).toBe(true);
    });

    it('should detect unicode support on non-Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });

      themeManager = new ThemeManager();
      const theme = themeManager.getTheme();
      expect(theme.emoji).toBe(true);
    });

    it('should disable emoji on Windows without CI', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      themeManager = new ThemeManager();
      const theme = themeManager.getTheme();
      expect(theme.emoji).toBe(false);
    });

    it('should enable emoji on Windows with CI', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });
      process.env['CI'] = 'true';

      themeManager = new ThemeManager();
      const theme = themeManager.getTheme();
      expect(theme.emoji).toBe(true);
    });

    it('should respect NO_COLOR environment variable', () => {
      process.env['NO_COLOR'] = '1';
      themeManager = new ThemeManager();
      const theme = themeManager.getTheme();
      expect(theme.colors).toBe(false);
    });

    it('should respect NO_EMOJI environment variable', () => {
      process.env['NO_EMOJI'] = '1';
      themeManager = new ThemeManager();
      const theme = themeManager.getTheme();
      expect(theme.emoji).toBe(false);
    });

    it('should respect HANSOLO_VERBOSE environment variable', () => {
      process.env['HANSOLO_VERBOSE'] = '1';
      themeManager = new ThemeManager();
      const theme = themeManager.getTheme();
      expect(theme.verbose).toBe(true);
    });
  });

  describe('getTheme', () => {
    it('should return a copy of theme', () => {
      const theme1 = themeManager.getTheme();
      const theme2 = themeManager.getTheme();

      expect(theme1).not.toBe(theme2);
      expect(theme1).toEqual(theme2);
    });
  });

  describe('setTheme', () => {
    it('should update theme settings', () => {
      // Ensure we're on a platform that supports emoji by default
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
      });
      themeManager = new ThemeManager();

      themeManager.setTheme({ colors: false, verbose: true });
      const theme = themeManager.getTheme();

      expect(theme.colors).toBe(false);
      expect(theme.verbose).toBe(true);
      expect(theme.emoji).toBe(true); // Unchanged
    });

    it('should merge partial theme updates', () => {
      const originalTheme = themeManager.getTheme();
      themeManager.setTheme({ verbose: true });
      const updatedTheme = themeManager.getTheme();

      expect(updatedTheme.verbose).toBe(true);
      expect(updatedTheme.colors).toBe(originalTheme.colors);
      expect(updatedTheme.emoji).toBe(originalTheme.emoji);
    });
  });

  describe('format', () => {
    it('should apply color styles when colors enabled', () => {
      themeManager.setTheme({ colors: true });

      expect(themeManager.format('test', 'success')).toContain('test');
      expect(themeManager.format('test', 'error')).toContain('test');
    });

    it('should not apply styles when colors disabled', () => {
      themeManager.setTheme({ colors: false });

      expect(themeManager.format('test', 'success')).toBe('test');
      expect(themeManager.format('test', 'error')).toBe('test');
    });

    it('should return text unchanged for unknown style', () => {
      expect(themeManager.format('test', 'unknown' as any)).toBe('test');
    });

    it('should return text unchanged when no style provided', () => {
      expect(themeManager.format('test')).toBe('test');
    });
  });

  describe('icon', () => {
    it('should return emoji when enabled', () => {
      themeManager.setTheme({ emoji: true });
      expect(themeManager.icon('✅', '[OK]')).toBe('✅');
    });

    it('should return fallback when emoji disabled', () => {
      themeManager.setTheme({ emoji: false });
      expect(themeManager.icon('✅', '[OK]')).toBe('[OK]');
    });
  });

  describe('timestamp', () => {
    it('should return timestamp when enabled', () => {
      themeManager.setTheme({ timestamps: true });
      const timestamp = themeManager.timestamp();

      expect(timestamp).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
    });

    it('should return empty string when disabled', () => {
      themeManager.setTheme({ timestamps: false });
      expect(themeManager.timestamp()).toBe('');
    });
  });
});