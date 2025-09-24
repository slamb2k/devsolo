import chalk from 'chalk';

export interface Theme {
  colors: boolean;
  emoji: boolean;
  timestamps: boolean;
  verbose: boolean;
}

export class ThemeManager {
  private theme: Theme;

  constructor() {
    // Detect terminal capabilities
    const supportsColor = chalk.level > 0;
    const supportsUnicode = process.platform !== 'win32' || process.env['CI'] !== undefined;

    this.theme = {
      colors: supportsColor,
      emoji: supportsUnicode,
      timestamps: false,
      verbose: false
    };

    // Check environment variables for overrides
    if (process.env['NO_COLOR']) {
      this.theme.colors = false;
    }

    if (process.env['NO_EMOJI']) {
      this.theme.emoji = false;
    }

    if (process.env['HANSOLO_VERBOSE']) {
      this.theme.verbose = true;
    }
  }

  getTheme(): Theme {
    return { ...this.theme };
  }

  setTheme(theme: Partial<Theme>): void {
    this.theme = { ...this.theme, ...theme };
  }

  format(text: string, style?: keyof typeof styles): string {
    if (!this.theme.colors || !style) {
      return text;
    }

    const formatter = styles[style];
    return formatter ? formatter(text) : text;
  }

  icon(emoji: string, fallback: string): string {
    return this.theme.emoji ? emoji : fallback;
  }

  timestamp(): string {
    if (!this.theme.timestamps) {
      return '';
    }

    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    return chalk.gray(`[${time}] `);
  }
}

const styles = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.cyan,
  muted: chalk.gray,
  bold: chalk.bold,
  highlight: chalk.white.bold
};