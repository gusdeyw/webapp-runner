const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ServiceManager {
    constructor() {
        this.platform = process.platform;
        this.services = new Map();
        this.runtimePath = path.join(process.cwd(), 'runtime');
        this.servicesConfig = {
            php: {
                name: 'Laravel_PHP',
                executable: path.join(this.runtimePath, 'php', 'php.exe'),
                args: ['-S', 'localhost:9000'],
                port: 9000
            },
            nginx: {
                name: 'Laravel_Nginx',
                executable: path.join(this.runtimePath, 'nginx', 'nginx.exe'),
                configPath: path.join(this.runtimePath, 'nginx', 'conf', 'nginx.conf'),
                port: 80
            },
            mysql: {
                name: 'Laravel_MySQL',
                executable: path.join(this.runtimePath, 'mysql', 'bin', 'mysqld.exe'),
                configPath: path.join(this.runtimePath, 'mysql', 'my.ini'),
                port: 3306
            }
        };
    }

    async initialize() {
        console.log('Initializing Service Manager...');
        await this.ensureRuntimeDirectory();
        await this.detectExistingServices();
    }

    async ensureRuntimeDirectory() {
        await fs.ensureDir(this.runtimePath);

        // Create subdirectories for each service
        for (const service of Object.keys(this.servicesConfig)) {
            await fs.ensureDir(path.join(this.runtimePath, service));
        }
    }

    async detectExistingServices() {
        const existing = {};

        for (const [serviceName, config] of Object.entries(this.servicesConfig)) {
            try {
                const status = await this.getServiceStatus(serviceName);
                existing[serviceName] = status;
            } catch (error) {
                existing[serviceName] = { running: false, exists: false };
            }
        }

        return existing;
    }

    async startService(serviceName) {
        const config = this.servicesConfig[serviceName];
        if (!config) {
            throw new Error(`Unknown service: ${serviceName}`);
        }

        try {
            if (this.platform === 'win32') {
                return await this.startWindowsService(serviceName, config);
            } else {
                return await this.startUnixService(serviceName, config);
            }
        } catch (error) {
            console.error(`Failed to start service ${serviceName}:`, error);
            throw error;
        }
    }

    async stopService(serviceName) {
        const config = this.servicesConfig[serviceName];
        if (!config) {
            throw new Error(`Unknown service: ${serviceName}`);
        }

        try {
            if (this.platform === 'win32') {
                return await this.stopWindowsService(serviceName, config);
            } else {
                return await this.stopUnixService(serviceName, config);
            }
        } catch (error) {
            console.error(`Failed to stop service ${serviceName}:`, error);
            throw error;
        }
    }

    async restartService(serviceName) {
        await this.stopService(serviceName);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return await this.startService(serviceName);
    }

    async getServiceStatus(serviceName) {
        const config = this.servicesConfig[serviceName];
        if (!config) {
            return { running: false, exists: false };
        }

        try {
            if (this.platform === 'win32') {
                return await this.getWindowsServiceStatus(serviceName, config);
            } else {
                return await this.getUnixServiceStatus(serviceName, config);
            }
        } catch (error) {
            return { running: false, exists: false, error: error.message };
        }
    }

    async startWindowsService(serviceName, config) {
        // Check if service exists
        try {
            const { stdout } = await execAsync(`sc query "${config.name}"`);
            if (stdout.includes('RUNNING')) {
                return { success: true, message: 'Service already running' };
            }

            // Start existing service
            await execAsync(`sc start "${config.name}"`);
            return { success: true, message: 'Service started' };
        } catch (error) {
            // Service doesn't exist, create and start it
            return await this.createAndStartWindowsService(serviceName, config);
        }
    }

    async createAndStartWindowsService(serviceName, config) {
        const serviceCmd = `"${config.executable}" ${config.args ? config.args.join(' ') : ''}`;

        try {
            // Create the service
            await execAsync(`sc create "${config.name}" binPath= "${serviceCmd}" start= demand`);

            // Start the service
            await execAsync(`sc start "${config.name}"`);

            return { success: true, message: 'Service created and started' };
        } catch (error) {
            console.error('Failed to create Windows service:', error);
            throw error;
        }
    }

    async stopWindowsService(serviceName, config) {
        try {
            await execAsync(`sc stop "${config.name}"`);
            return { success: true, message: 'Service stopped' };
        } catch (error) {
            console.error('Failed to stop Windows service:', error);
            throw error;
        }
    }

    async getWindowsServiceStatus(serviceName, config) {
        try {
            const { stdout } = await execAsync(`sc query "${config.name}"`);
            const running = stdout.includes('RUNNING');
            const exists = !stdout.includes('does not exist');

            return {
                running,
                exists,
                status: running ? 'running' : exists ? 'stopped' : 'not_installed'
            };
        } catch (error) {
            return { running: false, exists: false, status: 'not_installed' };
        }
    }

    async startUnixService(serviceName, config) {
        // For Unix systems, we'll use systemd or direct process management
        // This is a simplified implementation
        const process = spawn(config.executable, config.args || [], {
            detached: true,
            stdio: 'ignore'
        });

        process.unref();
        this.services.set(serviceName, process);

        return { success: true, message: 'Service started', pid: process.pid };
    }

    async stopUnixService(serviceName, config) {
        const process = this.services.get(serviceName);
        if (process) {
            process.kill();
            this.services.delete(serviceName);
            return { success: true, message: 'Service stopped' };
        }

        // Try to find and kill by name
        try {
            await execAsync(`pkill -f "${path.basename(config.executable)}"`);
            return { success: true, message: 'Service stopped' };
        } catch (error) {
            throw new Error('Service not found or already stopped');
        }
    }

    async getUnixServiceStatus(serviceName, config) {
        try {
            const { stdout } = await execAsync(`pgrep -f "${path.basename(config.executable)}"`);
            return {
                running: stdout.trim().length > 0,
                exists: true,
                status: 'running',
                pids: stdout.trim().split('\n').filter(pid => pid)
            };
        } catch (error) {
            return { running: false, exists: true, status: 'stopped' };
        }
    }

    async createService(serviceName, serviceConfig) {
        this.servicesConfig[serviceName] = serviceConfig;
        return await this.startService(serviceName);
    }

    async removeService(serviceName) {
        try {
            await this.stopService(serviceName);

            if (this.platform === 'win32') {
                const config = this.servicesConfig[serviceName];
                await execAsync(`sc delete "${config.name}"`);
            }

            delete this.servicesConfig[serviceName];
            return { success: true, message: 'Service removed' };
        } catch (error) {
            console.error('Failed to remove service:', error);
            throw error;
        }
    }

    getAllServices() {
        return Object.keys(this.servicesConfig);
    }

    getServiceConfig(serviceName) {
        return this.servicesConfig[serviceName];
    }
}

module.exports = { ServiceManager };
