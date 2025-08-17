// Main application controller
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.isLoading = false;
        this.systemInfo = null;
        this.installedApps = [];
        this.services = {};

        this.init();
    }

    async init() {
        console.log('Initializing Laravel Deployment App...');

        try {
            // Initialize components
            this.navigation = new Navigation();
            this.dashboard = new Dashboard();
            this.installer = new Installer();
            this.servicesManager = new ServicesManager();

            // Load initial data
            await this.loadSystemInfo();
            await this.loadInstalledApps();
            await this.loadServicesStatus();

            // Set up event listeners
            this.setupEventListeners();

            // Initialize the dashboard
            await this.dashboard.init();

            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    setupEventListeners() {
        // Navigation events
        document.addEventListener('page-change', (event) => {
            this.currentPage = event.detail.page;
            this.updatePageTitle();
        });

        // Installation events
        document.addEventListener('app-installed', async (event) => {
            await this.loadInstalledApps();
            await this.dashboard.refresh();
            this.showSuccess(`${event.detail.appName} installed successfully!`);
        });

        // Service events
        document.addEventListener('service-status-changed', async (event) => {
            await this.loadServicesStatus();
            await this.dashboard.refreshServices();
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }

        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Error handling
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('An unexpected error occurred');
        });

        window.addEventListener('error', (event) => {
            console.error('Unhandled error:', event.error);
            this.showError('An unexpected error occurred');
        });
    }

    async loadSystemInfo() {
        try {
            this.systemInfo = await electronAPI.getSystemInfo();
            this.updateSystemStatus();
        } catch (error) {
            console.error('Failed to load system info:', error);
        }
    }

    async loadInstalledApps() {
        try {
            // This would normally come from the package manager
            this.installedApps = [];
            this.updateAppsCount();
        } catch (error) {
            console.error('Failed to load installed apps:', error);
        }
    }

    async loadServicesStatus() {
        try {
            const services = ['php', 'nginx', 'mysql'];
            this.services = {};

            for (const service of services) {
                try {
                    const status = await electronAPI.getServiceStatus(service);
                    this.services[service] = status;
                } catch (error) {
                    console.error(`Failed to get status for ${service}:`, error);
                    this.services[service] = { running: false, exists: false };
                }
            }

            this.updateSystemStatus();
        } catch (error) {
            console.error('Failed to load services status:', error);
        }
    }

    updateSystemStatus() {
        const statusIndicator = document.getElementById('system-status');
        const statusText = document.getElementById('status-text');

        if (!statusIndicator || !statusText) return;

        // Check if all critical services are running
        const criticalServices = ['php', 'mysql'];
        const allRunning = criticalServices.every(service =>
            this.services[service] && this.services[service].running
        );

        if (allRunning) {
            statusIndicator.textContent = '🟢';
            statusText.textContent = 'System Online';
        } else {
            statusIndicator.textContent = '🟡';
            statusText.textContent = 'Services Starting';
        }
    }

    updateAppsCount() {
        const appsCountElement = document.getElementById('apps-count');
        if (appsCountElement) {
            appsCountElement.textContent = this.installedApps.length.toString();
        }
    }

    updatePageTitle() {
        const pageTitleElement = document.getElementById('page-title');
        if (pageTitleElement) {
            const pageNames = {
                dashboard: 'Dashboard',
                apps: 'Applications',
                install: 'Install Apps',
                services: 'Services',
                databases: 'Databases',
                backups: 'Backups',
                settings: 'Settings'
            };
            pageTitleElement.textContent = pageNames[this.currentPage] || 'Dashboard';
        }
    }

    async refresh() {
        if (this.isLoading) return;

        this.setLoading(true);

        try {
            await this.loadSystemInfo();
            await this.loadInstalledApps();
            await this.loadServicesStatus();

            // Refresh current page
            switch (this.currentPage) {
                case 'dashboard':
                    await this.dashboard.refresh();
                    break;
                case 'services':
                    await this.servicesManager.refresh();
                    break;
                case 'apps':
                    // Refresh apps page
                    break;
                case 'install':
                    await this.installer.refreshPackages();
                    break;
            }

            this.showSuccess('Data refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh:', error);
            this.showError('Failed to refresh data');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }

        // Update refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = loading;
            if (loading) {
                refreshBtn.querySelector('span').textContent = '⏳';
            } else {
                refreshBtn.querySelector('span').textContent = '🔄';
            }
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showWarning(message) {
        this.showToast(message, 'warning');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    cleanup() {
        // Cleanup resources before app closes
        console.log('Cleaning up application...');

        // Remove event listeners
        electronAPI.removeAllListeners('install-progress');
        electronAPI.removeAllListeners('service-status');
        electronAPI.removeAllListeners('error');
    }

    // Utility methods
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    formatDate(date) {
        return new Date(date).toLocaleString();
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error('Global error:', { message, source, lineno, colno, error });
    if (window.app) {
        window.app.showError('An unexpected error occurred');
    }
    return false;
};
