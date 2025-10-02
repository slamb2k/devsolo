"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = void 0;
class Configuration {
    version;
    scope;
    initialized;
    components;
    preferences;
    gitPlatform;
    installPath;
    constructor(options) {
        this.version = options?.version || '1.0.0';
        this.scope = options?.scope || 'project';
        this.initialized = options?.initialized || false;
        this.installPath = options?.installPath || '.hansolo';
        this.components = options?.components || {
            mpcServer: true,
            statusLines: true,
            gitHooks: true,
            gitTemplates: true,
            utilityScripts: true,
        };
        this.preferences = options?.preferences || {
            defaultBranchPrefix: 'feature/',
            autoCleanup: true,
            confirmBeforePush: true,
            colorOutput: true,
            verboseLogging: false,
        };
        this.gitPlatform = options?.gitPlatform;
    }
    validate() {
        const errors = [];
        // Check version compatibility
        const [major] = this.version.split('.');
        if (major !== '1') {
            errors.push(`Incompatible configuration version: ${this.version}`);
        }
        // Check required components
        if (!this.components.mpcServer) {
            errors.push('MCP Server component is required');
        }
        // Validate install path
        if (!this.installPath) {
            errors.push('Install path is required');
        }
        // Validate branch prefix
        if (this.preferences.defaultBranchPrefix.endsWith('/')) {
            // This is actually valid, just ensure it's not empty
            if (this.preferences.defaultBranchPrefix === '/') {
                errors.push('Default branch prefix cannot be just "/"');
            }
        }
        // Validate Git platform if configured
        if (this.gitPlatform) {
            if (!this.gitPlatform.type) {
                errors.push('Git platform type is required when platform is configured');
            }
            if (this.gitPlatform.apiUrl && !this.isValidUrl(this.gitPlatform.apiUrl)) {
                errors.push('Invalid Git platform API URL');
            }
        }
        return errors;
    }
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
    isInitialized() {
        return this.initialized;
    }
    getInstallPath() {
        return this.installPath;
    }
    getConfigPath() {
        return `${this.installPath}/config.yaml`;
    }
    getSessionsPath() {
        return `${this.installPath}/sessions`;
    }
    getAuditPath() {
        return `${this.installPath}/audit`;
    }
    getHooksPath() {
        return `${this.installPath}/hooks`;
    }
    getTemplatesPath() {
        return `${this.installPath}/templates`;
    }
    merge(other) {
        return new Configuration({
            ...this,
            ...other,
            components: {
                ...this.components,
                ...(other.components || {}),
            },
            preferences: {
                ...this.preferences,
                ...(other.preferences || {}),
            },
            gitPlatform: other.gitPlatform || this.gitPlatform,
        });
    }
    toJSON() {
        return {
            version: this.version,
            scope: this.scope,
            initialized: this.initialized,
            components: this.components,
            preferences: this.preferences,
            gitPlatform: this.gitPlatform,
            installPath: this.installPath,
        };
    }
    static fromJSON(json) {
        return new Configuration(json);
    }
    static getDefault() {
        return new Configuration();
    }
}
exports.Configuration = Configuration;
//# sourceMappingURL=configuration.js.map