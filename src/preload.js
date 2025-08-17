const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // System Information
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    checkRequirements: () => ipcRenderer.invoke('check-requirements'),

    // Package Management
    getAvailablePackages: () => ipcRenderer.invoke('get-available-packages'),
    installPackage: (packageInfo) => ipcRenderer.invoke('install-package', packageInfo),
    uninstallPackage: (appName) => ipcRenderer.invoke('uninstall-package', appName),

    // Service Management
    startService: (serviceName) => ipcRenderer.invoke('start-service', serviceName),
    stopService: (serviceName) => ipcRenderer.invoke('stop-service', serviceName),
    restartService: (serviceName) => ipcRenderer.invoke('restart-service', serviceName),
    getServiceStatus: (serviceName) => ipcRenderer.invoke('get-service-status', serviceName),

    // Configuration Management
    getAppConfig: (appName) => ipcRenderer.invoke('get-app-config', appName),
    updateAppConfig: (appName, config) => ipcRenderer.invoke('update-app-config', appName, config),

    // Database Management
    createDatabase: (config) => ipcRenderer.invoke('create-database', config),
    backupDatabase: (appName) => ipcRenderer.invoke('backup-database', appName),
    restoreDatabase: (appName, backupFile) => ipcRenderer.invoke('restore-database', appName, backupFile),

    // File Operations
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Event Listeners
    onInstallProgress: (callback) => ipcRenderer.on('install-progress', callback),
    onServiceStatus: (callback) => ipcRenderer.on('service-status', callback),
    onError: (callback) => ipcRenderer.on('error', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
