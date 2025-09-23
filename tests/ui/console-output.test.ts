import { ConsoleOutput } from '../../src/ui/console-output';
import chalk from 'chalk';

// Mock chalk
jest.mock('chalk', () => ({
  green: jest.fn((str: string) => `[GREEN]${str}[/GREEN]`),
  red: jest.fn((str: string) => `[RED]${str}[/RED]`),
  yellow: jest.fn((str: string) => `[YELLOW]${str}[/YELLOW]`),
  blue: jest.fn((str: string) => `[BLUE]${str}[/BLUE]`),
  cyan: jest.fn((str: string) => `[CYAN]${str}[/CYAN]`),
  magenta: jest.fn((str: string) => `[MAGENTA]${str}[/MAGENTA]`),
  gray: jest.fn((str: string) => `[GRAY]${str}[/GRAY]`),
  bold: jest.fn((str: string) => `[BOLD]${str}[/BOLD]`),
  dim: jest.fn((str: string) => `[DIM]${str}[/DIM]`),
  bgRed: {
    white: jest.fn((str: string) => `[BG_RED]${str}[/BG_RED]`)
  },
  bgGreen: {
    black: jest.fn((str: string) => `[BG_GREEN]${str}[/BG_GREEN]`)
  },
  bgYellow: {
    black: jest.fn((str: string) => `[BG_YELLOW]${str}[/BG_YELLOW]`)
  }
}));

describe('ConsoleOutput', () => {
  let consoleOutput: ConsoleOutput;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleOutput = new ConsoleOutput();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('success', () => {
    it('should output success message with green color and check icon', () => {
      consoleOutput.success('Operation completed successfully');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[GREEN]'));
    });

    it('should include timestamp if enabled', () => {
      consoleOutput = new ConsoleOutput({ timestamps: true });
      consoleOutput.success('Test success');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\]/));
    });
  });

  describe('error', () => {
    it('should output error message with red color and cross icon', () => {
      consoleOutput.error('Operation failed');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✗'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[RED]'));
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error message');
      consoleOutput.error(error);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
    });
  });

  describe('warning', () => {
    it('should output warning message with yellow color and warning icon', () => {
      consoleOutput.warning('This is a warning');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[YELLOW]'));
    });
  });

  describe('info', () => {
    it('should output info message with blue color and info icon', () => {
      consoleOutput.info('Information message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[BLUE]'));
    });
  });

  describe('step', () => {
    it('should output step message with cyan color and arrow icon', () => {
      consoleOutput.step('Step 1: Initialize project');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('➤'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[CYAN]'));
    });

    it('should track step numbers', () => {
      consoleOutput.step('First step');
      consoleOutput.step('Second step');

      expect(consoleLogSpy).toHaveBeenNthCalledWith(1, expect.stringContaining('[1/'));
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, expect.stringContaining('[2/'));
    });
  });

  describe('banner', () => {
    it('should output ASCII art banner', () => {
      consoleOutput.banner('HANSOLO');

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('═');
      expect(output).toContain('HANSOLO');
    });

    it('should center text in banner', () => {
      consoleOutput.banner('TEST', { width: 20 });

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toMatch(/\s+TEST\s+/);
    });
  });

  describe('statusLine', () => {
    it('should output colored status line based on state', () => {
      consoleOutput.statusLine('BRANCH_READY', 'launch', 'feature/test');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('BRANCH_READY'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('launch'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('feature/test'));
    });

    it('should use appropriate colors for different states', () => {
      consoleOutput.statusLine('COMPLETE', 'ship', 'main');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[GREEN]'));

      consoleOutput.statusLine('ERROR', 'hotfix', 'hotfix/critical');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[RED]'));

      consoleOutput.statusLine('WAITING_APPROVAL', 'launch', 'feature/new');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[YELLOW]'));
    });
  });

  describe('progress', () => {
    it('should display progress bar', () => {
      consoleOutput.progress(50, 100, 'Processing files');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('50%'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Processing files'));
    });

    it('should show visual progress bar', () => {
      consoleOutput.progress(75, 100);

      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('█');
      expect(output).toContain('░');
    });
  });

  describe('list', () => {
    it('should output bulleted list', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      consoleOutput.list(items);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 2'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('• Item 3'));
    });

    it('should support numbered lists', () => {
      const items = ['First', 'Second'];
      consoleOutput.list(items, { numbered: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1. First'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2. Second'));
    });
  });

  describe('json', () => {
    it('should output formatted JSON', () => {
      const data = { key: 'value', nested: { prop: true } };
      consoleOutput.json(data);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"key": "value"'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"prop": true'));
    });

    it('should apply syntax highlighting', () => {
      consoleOutput.json({ test: 123, bool: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      // Check that color functions were called
      expect(chalk.cyan).toHaveBeenCalled();
      expect(chalk.yellow).toHaveBeenCalled();
    });
  });

  describe('divider', () => {
    it('should output horizontal divider', () => {
      consoleOutput.divider();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/─{40,}/));
    });

    it('should support custom character and length', () => {
      consoleOutput.divider('=', 20);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/={20}/));
    });
  });

  describe('indent', () => {
    it('should indent text by specified level', () => {
      consoleOutput.indent('Indented text', 2);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('    Indented text'));
    });

    it('should handle multi-line text', () => {
      consoleOutput.indent('Line 1\nLine 2\nLine 3', 1);

      const calls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(calls).toContain('  Line 1');
      expect(calls).toContain('  Line 2');
      expect(calls).toContain('  Line 3');
    });
  });

  describe('clear', () => {
    it('should clear the console', () => {
      const clearSpy = jest.spyOn(console, 'clear').mockImplementation();

      consoleOutput.clear();

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  describe('newline', () => {
    it('should output empty line', () => {
      consoleOutput.newline();

      expect(consoleLogSpy).toHaveBeenCalledWith('');
    });

    it('should output multiple empty lines', () => {
      consoleOutput.newline(3);

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });
  });
});