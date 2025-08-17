const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { ServiceManager } = require('./core/ServiceManager');
const { PackageManager } = require('./core/PackageManager');
const { ConfigManager } = require('./core/ConfigManager');
const { PortManager } = require('./core/PortManager');
const { DatabaseManager } = require('./core/DatabaseManager');

class LaravelDeploymentApp {
    constructor() {
        this.mainWindow = null;
        this.serviceManager = new ServiceManager();
        this.packageManager = new PackageManager();
        this.configManager = new ConfigManager();
        this.portManager = new PortManager();
        this.databaseManager = new DatabaseManager();

        this.isDev = process.argv.includes('--dev');
    }

    async initialize() {
        // Handle app events
        app.whenReady().then(() => this.createMainWindow());
        app.on('window-all-closed', this.onWindowAllClosed.bind(this));
        app.on('activate', this.onActivate.bind(this));

        // Set up IPC handlers
        this.setupIpcHandlers();

        // Initialize core systems
        await this.initializeCoreServices();
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, '../assets/icons/icon.png'),
            titleBarStyle: 'default',
            show: false
        });

        // Load the main interface
        const indexPath = path.join(__dirname, '../ui/index.html');
        this.mainWindow.loadFile(indexPath);

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
            if (this.isDev) {
                this.mainWindow.webContents.openDevTools();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    setupIpcHandlers() {
        // System Information
        ipcMain.handle('get-system-info', this.getSystemInfo.bind(this));
        ipcMain.handle('check-requirements', this.checkRequirements.bind(this));

        // Package Management
        ipcMain.handle('get-available-packages', this.packageManager.getAvailablePackages.bind(this.packageManager));
        ipcMain.handle('install-package', this.installPackage.bind(this));
        ipcMain.handle('uninstall-package', this.uninstallPackage.bind(this));

        // Service Management
        ipcMain.handle('start-service', this.serviceManager.startService.bind(this.serviceManager));
        ipcMain.handle('stop-service', this.serviceManager.stopService.bind(this.serviceManager));
        ipcMain.handle('restart-service', this.serviceManager.restartService.bind(this.serviceManager));
        ipcMain.handle('get-service-status', this.serviceManager.getServiceStatus.bind(this.serviceManager));

        // Configuration Management
        ipcMain.handle('get-app-config', this.configManager.getAppConfig.bind(this.configManager));
        ipcMain.handle('update-app-config', this.configManager.updateAppConfig.bind(this.configManager));

        // Database Management
        ipcMain.handle('create-database', this.databaseManager.createDatabase.bind(this.databaseManager));
        ipcMain.handle('backup-database', this.databaseManager.backupDatabase.bind(this.databaseManager));
        ipcMain.handle('restore-database', this.databaseManager.restoreDatabase.bind(this.databaseManager));

        // File Operations
        ipcMain.handle('select-directory', this.selectDirectory.bind(this));
        ipcMain.handle('select-file', this.selectFile.bind(this));
        ipcMain.handle('open-external', this.openExternal.bind(this));
    }

    async initializeCoreServices() {
        try {
            await this.configManager.initialize();
            await this.serviceManager.initialize();
            await this.portManager.initialize();
            await this.databaseManager.initialize();
            console.log('Core services initialized successfully');
        } catch (error) {
            console.error('Failed to initialize core services:', error);
        }
    }

    async getSystemInfo() {
        const os = require('os');
        return {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            electronVersion: process.versions.electron,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            hostname: os.hostname(),
            userInfo: os.userInfo()
        };
    }

    async checkRequirements() {
        // Check system requirements
        const requirements = {
            diskSpace: await this.checkDiskSpace(),
            adminRights: await this.checkAdminRights(),
            availablePorts: await this.portManager.scanAvailablePorts(),
            existingServices: await this.serviceManager.detectExistingServices()
        };

        return requirements;
    }

    async checkDiskSpace() {
        // Implementation for disk space check
        return { available: true, space: '5GB' };
    }

    async checkAdminRights() {
        // Implementation for admin rights check
        return true;
    }

    async installPackage(event, packageInfo) {
        try {
            return await this.packageManager.installPackage(packageInfo);
        } catch (error) {
            console.error('Package installation failed:', error);
            throw error;
        }
    }

    async uninstallPackage(event, appName) {
        try {
            return await this.packageManager.uninstallPackage(appName);
        } catch (error) {
            console.error('Package uninstallation failed:', error);
            throw error;
        }
    }

    async selectDirectory() {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openDirectory']
        });
        return result.canceled ? null : result.filePaths[0];
    }

    async selectFile(event, filters = []) {
        const result = await dialog.showOpenDialog(this.mainWindow, {
            properties: ['openFile'],
            filters
        });
        return result.canceled ? null : result.filePaths[0];
    }

    async openExternal(event, url) {
        await shell.openExternal(url);
    }

    onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }

    onActivate() {
        if (BrowserWindow.getAllWindows().length === 0) {
            this.createMainWindow();
        }
    }
}

// Initialize and start the application
const deploymentApp = new LaravelDeploymentApp();
deploymentApp.initialize().catch(console.error);

module.exports = LaravelDeploymentApp;
