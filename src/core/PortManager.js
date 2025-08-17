const net = require('net');

class PortManager {
    constructor() {
        this.reservedPorts = new Set();
        this.defaultRangeStart = 8000;
        this.defaultRangeEnd = 9000;
        this.systemReservedPorts = new Set([
            21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, // Common system ports
            3306, 5432, 6379, 27017, // Database ports
            9000, 9001 // Common PHP-FPM ports
        ]);
    }

    async initialize() {
        console.log('Initializing Port Manager...');
        // Load any previously reserved ports from configuration
        await this.loadReservedPorts();
    }

    async loadReservedPorts() {
        try {
            const { ConfigManager } = require('./ConfigManager');
            const configManager = new ConfigManager();
            const reservedPorts = configManager.getReservedPorts();
            this.reservedPorts = new Set(reservedPorts);
        } catch (error) {
            console.error('Failed to load reserved ports:', error);
        }
    }

    async findAvailablePort(startPort = null, endPort = null) {
        const rangeStart = startPort || this.defaultRangeStart;
        const rangeEnd = endPort || this.defaultRangeEnd;

        for (let port = rangeStart; port <= rangeEnd; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }

        throw new Error(`No available ports in range ${rangeStart}-${rangeEnd}`);
    }

    async findMultipleAvailablePorts(count, startPort = null, endPort = null) {
        const ports = [];
        const rangeStart = startPort || this.defaultRangeStart;
        const rangeEnd = endPort || this.defaultRangeEnd;

        for (let port = rangeStart; port <= rangeEnd && ports.length < count; port++) {
            if (await this.isPortAvailable(port)) {
                ports.push(port);
            }
        }

        if (ports.length < count) {
            throw new Error(`Could not find ${count} available ports in range ${rangeStart}-${rangeEnd}`);
        }

        return ports;
    }

    async isPortAvailable(port) {
        // Check if port is system reserved
        if (this.systemReservedPorts.has(port)) {
            return false;
        }

        // Check if port is already reserved by us
        if (this.reservedPorts.has(port)) {
            return false;
        }

        // Check if port is actually in use
        return new Promise((resolve) => {
            const server = net.createServer();

            server.listen(port, () => {
                server.once('close', () => {
                    resolve(true);
                });
                server.close();
            });

            server.on('error', () => {
                resolve(false);
            });
        });
    }

    async reservePort(port, appName = null) {
        if (!await this.isPortAvailable(port)) {
            throw new Error(`Port ${port} is not available`);
        }

        this.reservedPorts.add(port);

        // Save to configuration
        try {
            const { ConfigManager } = require('./ConfigManager');
            const configManager = new ConfigManager();
            await configManager.reservePort(port, appName);
        } catch (error) {
            console.error('Failed to save reserved port:', error);
        }

        return port;
    }

    async releasePort(port, appName = null) {
        this.reservedPorts.delete(port);

        // Remove from configuration
        try {
            const { ConfigManager } = require('./ConfigManager');
            const configManager = new ConfigManager();
            await configManager.releasePort(port, appName);
        } catch (error) {
            console.error('Failed to remove reserved port:', error);
        }

        return port;
    }

    async releaseAppPorts(appName) {
        try {
            const { ConfigManager } = require('./ConfigManager');
            const configManager = new ConfigManager();
            const appConfig = configManager.getAppConfig(appName);

            if (appConfig && appConfig.assignedPorts) {
                for (const port of appConfig.assignedPorts) {
                    await this.releasePort(port, appName);
                }
            }
        } catch (error) {
            console.error('Failed to release app ports:', error);
        }
    }

    getReservedPorts() {
        return Array.from(this.reservedPorts);
    }

    getSystemReservedPorts() {
        return Array.from(this.systemReservedPorts);
    }

    async scanAvailablePorts(startPort = null, endPort = null, maxResults = 50) {
        const rangeStart = startPort || this.defaultRangeStart;
        const rangeEnd = endPort || this.defaultRangeEnd;
        const availablePorts = [];

        for (let port = rangeStart; port <= rangeEnd && availablePorts.length < maxResults; port++) {
            if (await this.isPortAvailable(port)) {
                availablePorts.push(port);
            }
        }

        return availablePorts;
    }

    async scanUsedPorts(startPort = null, endPort = null) {
        const rangeStart = startPort || this.defaultRangeStart;
        const rangeEnd = endPort || this.defaultRangeEnd;
        const usedPorts = [];

        for (let port = rangeStart; port <= rangeEnd; port++) {
            if (!await this.isPortAvailable(port)) {
                usedPorts.push({
                    port,
                    reserved: this.reservedPorts.has(port),
                    system: this.systemReservedPorts.has(port)
                });
            }
        }

        return usedPorts;
    }

    async getPortInfo(port) {
        const available = await this.isPortAvailable(port);

        return {
            port,
            available,
            reserved: this.reservedPorts.has(port),
            system: this.systemReservedPorts.has(port),
            inUse: !available && !this.reservedPorts.has(port) && !this.systemReservedPorts.has(port)
        };
    }

    async getAppPorts(appName) {
        try {
            const { ConfigManager } = require('./ConfigManager');
            const configManager = new ConfigManager();
            const appConfig = configManager.getAppConfig(appName);

            if (appConfig && appConfig.assignedPorts) {
                const portInfos = [];
                for (const port of appConfig.assignedPorts) {
                    const info = await this.getPortInfo(port);
                    portInfos.push(info);
                }
                return portInfos;
            }

            return [];
        } catch (error) {
            console.error('Failed to get app ports:', error);
            return [];
        }
    }

    // Port range management

    setPortRange(startPort, endPort) {
        if (startPort >= endPort) {
            throw new Error('Start port must be less than end port');
        }

        if (startPort < 1024) {
            throw new Error('Start port should be above 1024 to avoid system ports');
        }

        if (endPort > 65535) {
            throw new Error('End port cannot exceed 65535');
        }

        this.defaultRangeStart = startPort;
        this.defaultRangeEnd = endPort;
    }

    getPortRange() {
        return {
            start: this.defaultRangeStart,
            end: this.defaultRangeEnd
        };
    }

    // Utility methods

    isValidPort(port) {
        return Number.isInteger(port) && port >= 1 && port <= 65535;
    }

    isPrivilegedPort(port) {
        return port < 1024;
    }

    generatePortSuggestions(count = 5, startPort = null) {
        const suggestions = [];
        const rangeStart = startPort || this.defaultRangeStart;

        // Generate some common port suggestions
        const commonPorts = [8000, 8080, 8888, 3000, 4000, 5000, 8001, 8002, 8003, 8004];

        for (const port of commonPorts) {
            if (port >= rangeStart && suggestions.length < count) {
                suggestions.push(port);
            }
        }

        // Fill remaining with sequential ports
        let currentPort = rangeStart;
        while (suggestions.length < count && currentPort <= this.defaultRangeEnd) {
            if (!suggestions.includes(currentPort)) {
                suggestions.push(currentPort);
            }
            currentPort++;
        }

        return suggestions.slice(0, count);
    }

    async getPortStatistics() {
        const available = await this.scanAvailablePorts();
        const used = await this.scanUsedPorts();

        return {
            range: this.getPortRange(),
            total: this.defaultRangeEnd - this.defaultRangeStart + 1,
            available: available.length,
            used: used.length,
            reserved: this.reservedPorts.size,
            systemReserved: Array.from(this.systemReservedPorts).filter(
                port => port >= this.defaultRangeStart && port <= this.defaultRangeEnd
            ).length
        };
    }

    // Advanced port management

    async allocatePortsForApp(appName, requirements = {}) {
        const {
            web = 1,
            database = 0,
            redis = 0,
            custom = 0
        } = requirements;

        const totalPorts = web + database + redis + custom;
        const ports = await this.findMultipleAvailablePorts(totalPorts);

        const allocation = {
            appName,
            web: ports.slice(0, web),
            database: ports.slice(web, web + database),
            redis: ports.slice(web + database, web + database + redis),
            custom: ports.slice(web + database + redis)
        };

        // Reserve all allocated ports
        for (const port of ports) {
            await this.reservePort(port, appName);
        }

        return allocation;
    }

    async deallocatePortsForApp(appName) {
        try {
            const { ConfigManager } = require('./ConfigManager');
            const configManager = new ConfigManager();
            const appConfig = configManager.getAppConfig(appName);

            if (appConfig && appConfig.assignedPorts) {
                for (const port of appConfig.assignedPorts) {
                    await this.releasePort(port, appName);
                }

                return {
                    success: true,
                    releasedPorts: appConfig.assignedPorts
                };
            }

            return {
                success: true,
                releasedPorts: []
            };
        } catch (error) {
            console.error('Failed to deallocate app ports:', error);
            throw error;
        }
    }
}

module.exports = { PortManager };
