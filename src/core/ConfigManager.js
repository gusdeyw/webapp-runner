const fs = require('fs-extra');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(process.cwd(), 'config');
        this.globalConfigFile = path.join(this.configPath, 'global.json');
        this.appsConfigFile = path.join(this.configPath, 'apps.json');

        this.defaultGlobalConfig = {
            version: '1.0.0',
            installPath: path.join(process.cwd()),
            runtimePath: path.join(process.cwd(), 'runtime'),
            appsPath: path.join(process.cwd(), 'apps'),
            packagesPath: path.join(process.cwd(), 'packages'),
            backupsPath: path.join(process.cwd(), 'backups'),
            autoStart: false,
            checkUpdates: true,
            logLevel: 'info',
            theme: 'light',
            language: 'en',
            ports: {
                rangeStart: 8000,
                rangeEnd: 9000,
                reserved: []
            },
            services: {
                php: {
                    autoStart: true,
                    port: 9000
                },
                nginx: {
                    autoStart: true,
                    port: 80
                },
                mysql: {
                    autoStart: true,
                    port: 3306
                }
            }
        };

        this.globalConfig = { ...this.defaultGlobalConfig };
        this.appsConfig = {};
    }

    async initialize() {
        console.log('Initializing Config Manager...');
        await this.ensureConfigDirectory();
        await this.loadGlobalConfig();
        await this.loadAppsConfig();
    }

    async ensureConfigDirectory() {
        await fs.ensureDir(this.configPath);
    }

    async loadGlobalConfig() {
        try {
            if (await fs.pathExists(this.globalConfigFile)) {
                const config = await fs.readJson(this.globalConfigFile);
                this.globalConfig = { ...this.defaultGlobalConfig, ...config };
            } else {
                await this.saveGlobalConfig();
            }
        } catch (error) {
            console.error('Failed to load global config:', error);
            this.globalConfig = { ...this.defaultGlobalConfig };
        }
    }

    async loadAppsConfig() {
        try {
            if (await fs.pathExists(this.appsConfigFile)) {
                this.appsConfig = await fs.readJson(this.appsConfigFile);
            } else {
                await this.saveAppsConfig();
            }
        } catch (error) {
            console.error('Failed to load apps config:', error);
            this.appsConfig = {};
        }
    }

    async saveGlobalConfig() {
        try {
            await fs.writeJson(this.globalConfigFile, this.globalConfig, { spaces: 2 });
        } catch (error) {
            console.error('Failed to save global config:', error);
            throw error;
        }
    }

    async saveAppsConfig() {
        try {
            await fs.writeJson(this.appsConfigFile, this.appsConfig, { spaces: 2 });
        } catch (error) {
            console.error('Failed to save apps config:', error);
            throw error;
        }
    }

    getGlobalConfig() {
        return { ...this.globalConfig };
    }

    async updateGlobalConfig(updates) {
        this.globalConfig = { ...this.globalConfig, ...updates };
        await this.saveGlobalConfig();
        return this.getGlobalConfig();
    }

    getAppConfig(appName) {
        return this.appsConfig[appName] ? { ...this.appsConfig[appName] } : null;
    }

    async updateAppConfig(appName, config) {
        this.appsConfig[appName] = { ...this.appsConfig[appName], ...config };
        await this.saveAppsConfig();
        return this.getAppConfig(appName);
    }

    async removeAppConfig(appName) {
        delete this.appsConfig[appName];
        await this.saveAppsConfig();
    }

    getAllAppsConfig() {
        return { ...this.appsConfig };
    }

    // Helper methods for specific configuration aspects

    getInstallPath() {
        return this.globalConfig.installPath;
    }

    getRuntimePath() {
        return this.globalConfig.runtimePath;
    }

    getAppsPath() {
        return this.globalConfig.appsPath;
    }

    getPackagesPath() {
        return this.globalConfig.packagesPath;
    }

    getBackupsPath() {
        return this.globalConfig.backupsPath;
    }

    getPortRange() {
        return {
            start: this.globalConfig.ports.rangeStart,
            end: this.globalConfig.ports.rangeEnd
        };
    }

    getReservedPorts() {
        return [...this.globalConfig.ports.reserved];
    }

    async reservePort(port, appName) {
        if (!this.globalConfig.ports.reserved.includes(port)) {
            this.globalConfig.ports.reserved.push(port);
            await this.saveGlobalConfig();
        }

        // Also update app config to track port assignment
        if (appName && this.appsConfig[appName]) {
            this.appsConfig[appName].assignedPorts = this.appsConfig[appName].assignedPorts || [];
            if (!this.appsConfig[appName].assignedPorts.includes(port)) {
                this.appsConfig[appName].assignedPorts.push(port);
                await this.saveAppsConfig();
            }
        }
    }

    async releasePort(port, appName) {
        const index = this.globalConfig.ports.reserved.indexOf(port);
        if (index > -1) {
            this.globalConfig.ports.reserved.splice(index, 1);
            await this.saveGlobalConfig();
        }

        // Also update app config
        if (appName && this.appsConfig[appName] && this.appsConfig[appName].assignedPorts) {
            const appPortIndex = this.appsConfig[appName].assignedPorts.indexOf(port);
            if (appPortIndex > -1) {
                this.appsConfig[appName].assignedPorts.splice(appPortIndex, 1);
                await this.saveAppsConfig();
            }
        }
    }

    getServiceConfig(serviceName) {
        return this.globalConfig.services[serviceName] ?
            { ...this.globalConfig.services[serviceName] } : null;
    }

    async updateServiceConfig(serviceName, config) {
        if (!this.globalConfig.services[serviceName]) {
            this.globalConfig.services[serviceName] = {};
        }

        this.globalConfig.services[serviceName] = {
            ...this.globalConfig.services[serviceName],
            ...config
        };

        await this.saveGlobalConfig();
        return this.getServiceConfig(serviceName);
    }

    isAutoStartEnabled() {
        return this.globalConfig.autoStart;
    }

    async setAutoStart(enabled) {
        await this.updateGlobalConfig({ autoStart: enabled });
    }

    shouldCheckUpdates() {
        return this.globalConfig.checkUpdates;
    }

    async setCheckUpdates(enabled) {
        await this.updateGlobalConfig({ checkUpdates: enabled });
    }

    getTheme() {
        return this.globalConfig.theme;
    }

    async setTheme(theme) {
        await this.updateGlobalConfig({ theme });
    }

    getLanguage() {
        return this.globalConfig.language;
    }

    async setLanguage(language) {
        await this.updateGlobalConfig({ language });
    }

    getLogLevel() {
        return this.globalConfig.logLevel;
    }

    async setLogLevel(level) {
        await this.updateGlobalConfig({ logLevel: level });
    }

    // Configuration validation

    validateGlobalConfig(config) {
        const errors = [];

        if (!config.installPath || typeof config.installPath !== 'string') {
            errors.push('Invalid install path');
        }

        if (!config.ports || typeof config.ports.rangeStart !== 'number' ||
            typeof config.ports.rangeEnd !== 'number') {
            errors.push('Invalid port configuration');
        }

        if (config.ports.rangeStart >= config.ports.rangeEnd) {
            errors.push('Port range start must be less than range end');
        }

        if (!['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
            errors.push('Invalid log level');
        }

        if (!['light', 'dark'].includes(config.theme)) {
            errors.push('Invalid theme');
        }

        return errors;
    }

    validateAppConfig(appName, config) {
        const errors = [];

        if (!appName || typeof appName !== 'string') {
            errors.push('Invalid app name');
        }

        if (!config.displayName || typeof config.displayName !== 'string') {
            errors.push('Invalid display name');
        }

        if (!config.port || typeof config.port !== 'number') {
            errors.push('Invalid port');
        }

        if (config.database) {
            if (!config.database.name || !config.database.user) {
                errors.push('Invalid database configuration');
            }
        }

        if (!config.paths || !config.paths.app) {
            errors.push('Invalid paths configuration');
        }

        return errors;
    }

    // Configuration export/import

    async exportConfiguration() {
        return {
            global: this.getGlobalConfig(),
            apps: this.getAllAppsConfig(),
            exportedAt: new Date().toISOString(),
            version: this.globalConfig.version
        };
    }

    async importConfiguration(configData) {
        try {
            // Validate imported data
            if (!configData.global || !configData.apps) {
                throw new Error('Invalid configuration data');
            }

            // Backup current configuration
            const backup = await this.exportConfiguration();
            const backupPath = path.join(this.configPath, `backup-${Date.now()}.json`);
            await fs.writeJson(backupPath, backup, { spaces: 2 });

            // Import new configuration
            this.globalConfig = { ...this.defaultGlobalConfig, ...configData.global };
            this.appsConfig = { ...configData.apps };

            // Save imported configuration
            await this.saveGlobalConfig();
            await this.saveAppsConfig();

            return {
                success: true,
                message: 'Configuration imported successfully',
                backupPath
            };

        } catch (error) {
            console.error('Failed to import configuration:', error);
            throw error;
        }
    }

    // Reset configuration

    async resetGlobalConfig() {
        this.globalConfig = { ...this.defaultGlobalConfig };
        await this.saveGlobalConfig();
    }

    async resetAppsConfig() {
        this.appsConfig = {};
        await this.saveAppsConfig();
    }

    async resetAllConfig() {
        await this.resetGlobalConfig();
        await this.resetAppsConfig();
    }
}

module.exports = { ConfigManager };
