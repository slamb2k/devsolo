import { ComponentConfig, UserPreferences, GitPlatformConfig } from './types';
export declare class Configuration {
    version: string;
    scope: 'user' | 'project';
    initialized: boolean;
    components: ComponentConfig;
    preferences: UserPreferences;
    gitPlatform?: GitPlatformConfig;
    installPath: string;
    constructor(options?: Partial<Configuration>);
    validate(): string[];
    private isValidUrl;
    isInitialized(): boolean;
    getInstallPath(): string;
    getConfigPath(): string;
    getSessionsPath(): string;
    getAuditPath(): string;
    getHooksPath(): string;
    getTemplatesPath(): string;
    merge(other: Partial<Configuration>): Configuration;
    toJSON(): Record<string, unknown>;
    static fromJSON(json: Record<string, unknown>): Configuration;
    static getDefault(): Configuration;
}
//# sourceMappingURL=configuration.d.ts.map