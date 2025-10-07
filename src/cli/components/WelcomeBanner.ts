import chalk from 'chalk';
import { ThemeManager } from './ThemeManager';

export class WelcomeBanner {
  constructor(private themeManager: ThemeManager) {}

  display(): void {
    const theme = this.themeManager.getTheme();
    const useEmoji = theme.emoji;

    console.clear();
    console.log();

    // ASCII Art Banner - Colorful!
    console.log();
    console.log(chalk.gray('           ,-----.'));
    console.log(chalk.gray('         ,') + chalk.yellow('\'_/_|_\\_') + chalk.gray('`.'));
    console.log(chalk.gray('        /') + chalk.yellow('<<::8') + chalk.red('[O]') + chalk.yellow('::>') + chalk.gray('\\'));
    console.log(chalk.gray('       _|-----------|_           ') + chalk.yellowBright.bold('██╗  ██╗ █████╗ ███╗   ██╗') + chalk.cyanBright.bold('    ███████╗ ██████╗ ██╗      ██████╗'));
    console.log(chalk.blue('   :::|  | ====-=- |  |:::       ') + chalk.yellowBright.bold('██║  ██║██╔══██╗████╗  ██║') + chalk.cyanBright.bold('    ██╔════╝██╔═══██╗██║     ██╔═══██╗'));
    console.log(chalk.blue('   :::|  | -=-==== |  |:::       ') + chalk.yellowBright.bold('███████║███████║██╔██╗ ██║') + chalk.cyanBright.bold('    ███████╗██║   ██║██║     ██║   ██║'));
    console.log(chalk.blue('   :::\\  | ::::|()||  /:::       ') + chalk.yellowBright.bold('██╔══██║██╔══██║██║╚██╗██║') + chalk.cyanBright.bold('    ╚════██║██║   ██║██║     ██║   ██║'));
    console.log(chalk.blue('   ::::| | ....|()|| |::::       ') + chalk.yellowBright.bold('██║  ██║██║  ██║██║ ╚████║') + chalk.cyanBright.bold('    ███████║╚██████╔╝███████╗╚██████╔╝'));
    console.log(chalk.gray('       | |_________| |           ') + chalk.gray('╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝') + chalk.gray('    ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝'));
    console.log(chalk.gray('       | |\\_______/| |'));
    console.log(chalk.gray('      /   \\ /   \\ /   \\') + chalk.yellow.bold('                             Turn the ship around...'));
    console.log(chalk.gray('      `---\' `---\' `---\''));
    console.log();
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

  displayBannerOnly(): void {
    console.log();
    console.log(chalk.gray('           ,-----.'));
    console.log(chalk.gray('         ,') + chalk.yellow('\'_/_|_\\_') + chalk.gray('`.'));
    console.log(chalk.gray('        /') + chalk.yellow('<<::8') + chalk.red('[O]') + chalk.yellow('::>') + chalk.gray('\\'));
    console.log(chalk.gray('       _|-----------|_           ') + chalk.yellowBright.bold('██╗  ██╗ █████╗ ███╗   ██╗') + chalk.cyanBright.bold('    ███████╗ ██████╗ ██╗      ██████╗'));
    console.log(chalk.blue('   :::|  | ====-=- |  |:::       ') + chalk.yellowBright.bold('██║  ██║██╔══██╗████╗  ██║') + chalk.cyanBright.bold('    ██╔════╝██╔═══██╗██║     ██╔═══██╗'));
    console.log(chalk.blue('   :::|  | -=-==== |  |:::       ') + chalk.yellowBright.bold('███████║███████║██╔██╗ ██║') + chalk.cyanBright.bold('    ███████╗██║   ██║██║     ██║   ██║'));
    console.log(chalk.blue('   :::\\  | ::::|()||  /:::       ') + chalk.yellowBright.bold('██╔══██║██╔══██║██║╚██╗██║') + chalk.cyanBright.bold('    ╚════██║██║   ██║██║     ██║   ██║'));
    console.log(chalk.blue('   ::::| | ....|()|| |::::       ') + chalk.yellowBright.bold('██║  ██║██║  ██║██║ ╚████║') + chalk.cyanBright.bold('    ███████║╚██████╔╝███████╗╚██████╔╝'));
    console.log(chalk.gray('       | |_________| |           ') + chalk.gray('╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝') + chalk.gray('    ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝'));
    console.log(chalk.gray('       | |\\_______/| |'));
    console.log(chalk.gray('      /   \\ /   \\ /   \\') + chalk.yellow.bold('                             Turn the ship around...'));
    console.log(chalk.gray('      `---\' `---\' `---\''));
    console.log();
  }
}