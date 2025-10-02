"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleOutput = void 0;
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const cli_table3_1 = __importDefault(require("cli-table3"));
class ConsoleOutput {
    useColor;
    constructor() {
        this.useColor = process.env['NO_COLOR'] ? false : true;
    }
    // Status icons
    icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        pending: '⏳',
        running: '🔄',
        complete: '✨',
        rocket: '🚀',
        fire: '🔥',
        sparkles: '✨',
        check: '✓',
        cross: '✗',
        arrow: '→',
        bullet: '•',
    };
    // Color formatting methods - return formatted strings
    success(text) {
        return this.useColor ? chalk_1.default.green(text) : text;
    }
    error(text, err) {
        // Handle two-parameter version for logging
        if (err) {
            console.error(this.useColor ? chalk_1.default.red(text) : text);
            console.error(err);
            return '';
        }
        return this.useColor ? chalk_1.default.red(text) : text;
    }
    warning(text) {
        return this.useColor ? chalk_1.default.yellow(text) : text;
    }
    info(text) {
        return this.useColor ? chalk_1.default.blue(text) : text;
    }
    dim(text) {
        return this.useColor ? chalk_1.default.dim(text) : text;
    }
    bold(text) {
        return this.useColor ? chalk_1.default.bold(text) : text;
    }
    italic(text) {
        return this.useColor ? chalk_1.default.italic(text) : text;
    }
    underline(text) {
        return this.useColor ? chalk_1.default.underline(text) : text;
    }
    // Formatted output methods
    header(text) {
        console.log('\n' + this.bold(this.underline(text)));
    }
    subheader(text) {
        console.log('\n' + this.bold(text));
    }
    successMessage(message, icon = true) {
        const output = icon ? `${this.icons.success} ${message}` : message;
        console.log(this.success(output));
    }
    errorMessage(message, icon = true) {
        const output = icon ? `${this.icons.error} ${message}` : message;
        console.log(this.error(output));
    }
    warningMessage(message, icon = true) {
        const output = icon ? `${this.icons.warning} ${message}` : message;
        console.log(this.warning(output));
    }
    infoMessage(message, icon = true) {
        const output = icon ? `${this.icons.info} ${message}` : message;
        console.log(this.info(output));
    }
    // List output
    list(items, ordered = false) {
        items.forEach((item, index) => {
            const prefix = ordered ? `${index + 1}.` : this.icons.bullet;
            console.log(`  ${prefix} ${item}`);
        });
    }
    // Tree output
    tree(items, indent = 0) {
        items.forEach((item, index) => {
            const isLast = index === items.length - 1;
            const prefix = indent === 0 ? '' : '  '.repeat(indent - 1) + (isLast ? '└─ ' : '├─ ');
            console.log(prefix + item.name);
            if (item.children) {
                item.children.forEach((child, childIndex) => {
                    const childIsLast = childIndex === item.children.length - 1;
                    const childPrefix = '  '.repeat(indent) + (isLast ? '  ' : '│ ') + (childIsLast ? '└─ ' : '├─ ');
                    console.log(childPrefix + child);
                });
            }
        });
    }
    // Box output
    box(content, title) {
        const options = {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: this.useColor ? 'cyan' : undefined,
        };
        if (title) {
            options.title = title;
            options.titleAlignment = 'center';
        }
        console.log((0, boxen_1.default)(content, options));
    }
    // Table output
    table(headers, rows, options) {
        const table = new cli_table3_1.default({
            head: this.useColor ? headers.map(h => chalk_1.default.cyan(h)) : headers,
            style: this.useColor ? { head: [], border: [] } : undefined,
        });
        rows.forEach(row => table.push(row));
        if (options?.title) {
            console.log('\n' + this.bold(options.title));
        }
        console.log(table.toString());
    }
    // Progress steps
    step(current, total, description) {
        const progress = `[${current}/${total}]`;
        console.log(this.dim(progress) + ' ' + description);
    }
    // Divider
    divider(char = '─', length = 40) {
        console.log(this.dim(char.repeat(length)));
    }
    // Empty line
    newline() {
        console.log();
    }
    // Banner
    banner(text) {
        const banner = `
╔${'═'.repeat(text.length + 2)}╗
║ ${text} ║
╚${'═'.repeat(text.length + 2)}╝`;
        console.log(this.info(banner));
    }
    // Status line (for updating in place)
    statusLine(text) {
        if (process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(text);
        }
        else {
            console.log(text);
        }
    }
    // Clear status line
    clearStatusLine() {
        if (process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
    }
    // Format workflow state
    formatState(state) {
        const stateColors = {
            INIT: this.dim.bind(this),
            BRANCH_READY: this.info.bind(this),
            CHANGES_COMMITTED: this.warning.bind(this),
            PUSHED: this.success.bind(this),
            PR_CREATED: this.success.bind(this),
            COMPLETE: this.success.bind(this),
            ABORTED: this.error.bind(this),
            HOTFIX_INIT: this.warning.bind(this),
            HOTFIX_COMPLETE: this.success.bind(this),
        };
        const colorFn = stateColors[state] || this.info.bind(this);
        return colorFn(state);
    }
    // Format branch name
    formatBranch(branch) {
        if (branch === 'main' || branch === 'master') {
            return this.bold(this.error(branch));
        }
        if (branch.startsWith('hotfix/')) {
            return this.warning(branch);
        }
        return this.info(branch);
    }
    // Format session info
    formatSession(session) {
        const parts = [
            this.dim(session.id.substring(0, 8)),
            this.formatBranch(session.branchName),
            this.dim(`[${session.workflowType}]`),
            this.formatState(session.currentState),
        ];
        if (session.age) {
            parts.push(this.dim(`(${session.age})`));
        }
        if (session.isCurrent) {
            parts.push(this.success('← current'));
        }
        return parts.join(' ');
    }
    // ASCII Art
    logo = `
  ██╗  ██╗ █████╗ ███╗   ██╗    ███████╗ ██████╗ ██╗      ██████╗
  ██║  ██║██╔══██╗████╗  ██║    ██╔════╝██╔═══██╗██║     ██╔═══██╗
  ███████║███████║██╔██╗ ██║    ███████╗██║   ██║██║     ██║   ██║
  ██╔══██║██╔══██║██║╚██╗██║    ╚════██║██║   ██║██║     ██║   ██║
  ██║  ██║██║  ██║██║ ╚████║    ███████║╚██████╔╝███████╗╚██████╔╝
  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝    ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝`;
    printLogo() {
        console.log(this.info(this.logo));
    }
    // Additional utility methods for commands
    log(text) {
        console.log(text);
    }
    warn(text) {
        console.warn(this.warning(text));
    }
    printBanner(text) {
        console.log('\n' + (0, boxen_1.default)(chalk_1.default.bold(text), {
            padding: 1,
            borderStyle: 'double',
            borderColor: 'cyan',
            textAlignment: 'center',
        }) + '\n');
    }
    async confirm(message, defaultValue = false) {
        // Simple implementation - in production would use inquirer or similar
        console.log(this.warning(message + ` (${defaultValue ? 'Y/n' : 'y/N'}): `));
        // For now, return default since we can't actually prompt in this context
        return defaultValue;
    }
    async prompt(message, defaultValue) {
        console.log(this.info(message));
        if (defaultValue) {
            console.log(this.dim(`Default: ${defaultValue}`));
        }
        // Return default value for now
        return defaultValue || '';
    }
    async promptSecret(message) {
        console.log(this.info(message));
        console.log(this.dim('(input hidden)'));
        // Return empty string for now
        return '';
    }
    async select(message, choices, defaultChoice) {
        console.log(this.info(message));
        choices.forEach((choice) => {
            const prefix = choice === defaultChoice ? this.success('→') : '  ';
            console.log(`${prefix} ${choice}`);
        });
        return defaultChoice || choices[0] || '';
    }
}
exports.ConsoleOutput = ConsoleOutput;
//# sourceMappingURL=console-output.js.map