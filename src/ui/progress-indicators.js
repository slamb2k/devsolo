"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.progress = exports.WorkflowProgress = exports.ProgressIndicator = void 0;
const ora_1 = __importDefault(require("ora"));
class ProgressIndicator {
    spinner = null;
    useSpinner;
    constructor() {
        this.useSpinner = process.stdout.isTTY && !process.env['NO_COLOR'];
    }
    start(text) {
        if (this.useSpinner) {
            this.spinner = (0, ora_1.default)({
                text,
                color: 'cyan',
                spinner: 'dots',
            }).start();
        }
        else {
            console.log(`${text}...`);
        }
    }
    update(text) {
        if (this.spinner) {
            this.spinner.text = text;
        }
        else {
            console.log(text);
        }
    }
    succeed(text) {
        if (this.spinner) {
            this.spinner.succeed(text);
            this.spinner = null;
        }
        else if (text) {
            console.log(`✅ ${text}`);
        }
    }
    fail(text) {
        if (this.spinner) {
            this.spinner.fail(text);
            this.spinner = null;
        }
        else if (text) {
            console.log(`❌ ${text}`);
        }
    }
    warn(text) {
        if (this.spinner) {
            this.spinner.warn(text);
            this.spinner = null;
        }
        else if (text) {
            console.log(`⚠️ ${text}`);
        }
    }
    info(text) {
        if (this.spinner) {
            this.spinner.info(text);
            this.spinner = null;
        }
        else if (text) {
            console.log(`ℹ️ ${text}`);
        }
    }
    stop() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }
    stopAndPersist(symbol, text) {
        if (this.spinner) {
            this.spinner.stopAndPersist({ symbol, text });
            this.spinner = null;
        }
        else if (text) {
            console.log(`${symbol || '•'} ${text}`);
        }
    }
    // Multi-step progress
    async runSteps(steps) {
        const results = [];
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (!step) {
                continue;
            }
            const stepNumber = `[${i + 1}/${steps.length}]`;
            const stepText = `${stepNumber} ${step.name}`;
            this.start(stepText);
            try {
                const result = await step.action();
                results.push(result);
                this.succeed(`${stepNumber} ${step.name}`);
            }
            catch (error) {
                this.fail(`${stepNumber} ${step.name}`);
                throw error;
            }
        }
        return results;
    }
    // Progress bar for determinate operations
    progressBar(current, total, text) {
        const percentage = Math.round((current / total) * 100);
        const barLength = 30;
        const filledLength = Math.round((current / total) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        const output = `${text ? text + ' ' : ''}[${bar}] ${percentage}%`;
        if (process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(output);
            if (current === total) {
                console.log(); // New line when complete
            }
        }
        else {
            console.log(output);
        }
    }
    // Countdown timer
    async countdown(seconds, text = 'Waiting') {
        for (let i = seconds; i > 0; i--) {
            this.update(`${text} (${i}s remaining)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.stop();
    }
    // Loading animation for indeterminate operations
    loadingAnimation(text, duration = 3000) {
        return new Promise(resolve => {
            this.start(text);
            setTimeout(() => {
                this.stop();
                resolve();
            }, duration);
        });
    }
}
exports.ProgressIndicator = ProgressIndicator;
// Pre-configured progress indicators for specific operations
class WorkflowProgress extends ProgressIndicator {
    async gitOperation(operation, action) {
        this.start(`Running Git ${operation}`);
        try {
            await action();
            this.succeed(`Git ${operation} completed`);
        }
        catch (error) {
            this.fail(`Git ${operation} failed`);
            throw error;
        }
    }
    async apiCall(platform, operation, action) {
        this.start(`${platform}: ${operation}`);
        try {
            await action();
            this.succeed(`${platform}: ${operation} successful`);
        }
        catch (error) {
            this.fail(`${platform}: ${operation} failed`);
            throw error;
        }
    }
    async stateTransition(from, to, action) {
        this.start(`Transitioning: ${from} → ${to}`);
        try {
            await action();
            this.succeed(`State: ${to}`);
        }
        catch (error) {
            this.fail(`Transition failed: ${from} → ${to}`);
            throw error;
        }
    }
    async fileOperation(operation, path, action) {
        this.start(`${operation}: ${path}`);
        try {
            await action();
            this.succeed(`${operation}: ${path}`);
        }
        catch (error) {
            this.fail(`${operation} failed: ${path}`);
            throw error;
        }
    }
}
exports.WorkflowProgress = WorkflowProgress;
// Singleton instance for global use
exports.progress = new WorkflowProgress();
//# sourceMappingURL=progress-indicators.js.map