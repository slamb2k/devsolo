export declare class ConsoleOutput {
    private readonly useColor;
    constructor();
    readonly icons: {
        success: string;
        error: string;
        warning: string;
        info: string;
        pending: string;
        running: string;
        complete: string;
        rocket: string;
        fire: string;
        sparkles: string;
        check: string;
        cross: string;
        arrow: string;
        bullet: string;
    };
    success(text: string): string;
    error(text: string, err?: Error): string;
    warning(text: string): string;
    info(text: string): string;
    dim(text: string): string;
    bold(text: string): string;
    italic(text: string): string;
    underline(text: string): string;
    header(text: string): void;
    subheader(text: string): void;
    successMessage(message: string, icon?: boolean): void;
    errorMessage(message: string, icon?: boolean): void;
    warningMessage(message: string, icon?: boolean): void;
    infoMessage(message: string, icon?: boolean): void;
    list(items: string[], ordered?: boolean): void;
    tree(items: Array<{
        name: string;
        children?: string[];
    }>, indent?: number): void;
    box(content: string, title?: string): void;
    table(headers: string[], rows: string[][], options?: {
        title?: string;
    }): void;
    step(current: number, total: number, description: string): void;
    divider(char?: string, length?: number): void;
    newline(): void;
    banner(text: string): void;
    statusLine(text: string): void;
    clearStatusLine(): void;
    formatState(state: string): string;
    formatBranch(branch: string): string;
    formatSession(session: {
        id: string;
        branchName: string;
        workflowType: string;
        currentState: string;
        age?: string;
        isCurrent?: boolean;
    }): string;
    readonly logo = "\n  \u2588\u2588\u2557  \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2557    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557      \u2588\u2588\u2588\u2588\u2588\u2588\u2557\n  \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551    \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551     \u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\n  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2557 \u2588\u2588\u2551    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\n  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2557\u2588\u2588\u2551    \u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\n  \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551 \u255A\u2588\u2588\u2588\u2588\u2551    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\n  \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u2550\u2550\u255D    \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D";
    printLogo(): void;
    log(text: string): void;
    warn(text: string): void;
    printBanner(text: string): void;
    confirm(message: string, defaultValue?: boolean): Promise<boolean>;
    prompt(message: string, defaultValue?: string): Promise<string>;
    promptSecret(message: string): Promise<string>;
    select(message: string, choices: string[], defaultChoice?: string): Promise<string>;
}
//# sourceMappingURL=console-output.d.ts.map