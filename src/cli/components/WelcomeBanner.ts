import chalk from 'chalk';
import { ThemeManager } from './ThemeManager';

export class WelcomeBanner {
  constructor(private themeManager: ThemeManager) {}

  display(): void {
    const theme = this.themeManager.getTheme();
    const useEmoji = theme.emoji;

    console.clear();
    console.log();

    // ASCII Art Banner
    const banner = `
    ██╗  ██╗ █████╗ ███╗   ██╗    ███████╗ ██████╗ ██╗      ██████╗
    ██║  ██║██╔══██╗████╗  ██║    ██╔════╝██╔═══██╗██║     ██╔═══██╗
    ███████║███████║██╔██╗ ██║    ███████╗██║   ██║██║     ██║   ██║
    ██╔══██║██╔══██║██║╚██╗██║    ╚════██║██║   ██║██║     ██║   ██║
    ██║  ██║██║  ██║██║ ╚████║    ███████║╚██████╔╝███████╗╚██████╔╝
    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝
    `;

    console.log(chalk.cyan(banner));
    console.log(chalk.gray('─'.repeat(70)));
    console.log();
    console.log(chalk.white.bold('  Welcome to han-solo Installation Wizard'));
    console.log(chalk.gray('  Git workflow automation that enforces linear history'));
    console.log();
    console.log(chalk.gray('─'.repeat(70)));
    console.log();

    if (useEmoji) {
      console.log(chalk.yellow('  🔧 Let\'s configure han-solo for your workflow'));
    } else {
      console.log(chalk.yellow('  Let\'s configure han-solo for your workflow'));
    }
    console.log();
  }

  displayCompact(): void {
    console.log();
    console.log(chalk.cyan.bold('han-solo') + chalk.gray(' - Git workflow automation'));
    console.log();
  }
}