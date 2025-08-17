// Dashboard controller
class Dashboard {
    constructor() {
        this.refreshInterval = null;
        this.systemInfo = null;
        this.installedApps = [];
        this.services = {};
        this.recentActivity = [];
    }

    async init() {
        console.log('Initializing Dashboard...');
        await this.loadData();
        this.render();
        this.setupAutoRefresh();
    }

    async loadData() {
        try {
            // Load system information
            await this.loadSystemInfo();

            // Load installed applications
            await this.loadInstalledApps();

            // Load services status
            await this.loadServicesStatus();

            // Load recent activity
            await this.loadRecentActivity();

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadSystemInfo() {
        try {
            this.systemInfo = await electronAPI.getSystemInfo();
        } catch (error) {
            console.error('Failed to load system info:', error);
            this.systemInfo = null;
        }
    }

    async loadInstalledApps() {
        try {
            // This would normally come from PackageManager
            this.installedApps = [];
        } catch (error) {
            console.error('Failed to load installed apps:', error);
            this.installedApps = [];
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
                    this.services[service] = { running: false, exists: false };
                }
            }
        } catch (error) {
            console.error('Failed to load services status:', error);
        }
    }

    async loadRecentActivity() {
        // Mock recent activity data
        this.recentActivity = [
            {
                type: 'info',
                message: 'System started',
                timestamp: new Date()
            }
        ];
    }

    render() {
        this.renderSystemInfo();
        this.renderInstalledApps();
        this.renderServicesStatus();
        this.renderRecentActivity();
    }

    renderSystemInfo() {
        if (!this.systemInfo) return;

        const platformInfo = document.getElementById('platform-info');
        const nodeVersion = document.getElementById('node-version');
        const memoryUsage = document.getElementById('memory-usage');

        if (platformInfo) {
            platformInfo.textContent = `${this.systemInfo.platform} ${this.systemInfo.arch}`;
        }

        if (nodeVersion) {
            nodeVersion.textContent = this.systemInfo.nodeVersion;
        }

        if (memoryUsage) {
            const usedMemory = this.systemInfo.totalMemory - this.systemInfo.freeMemory;
            const usagePercent = ((usedMemory / this.systemInfo.totalMemory) * 100).toFixed(1);
            memoryUsage.textContent = `${this.formatBytes(usedMemory)} / ${this.formatBytes(this.systemInfo.totalMemory)} (${usagePercent}%)`;
        }
    }

    renderInstalledApps() {
        const appsPreview = document.getElementById('apps-preview');
        const appsCount = document.getElementById('apps-count');

        if (appsCount) {
            appsCount.textContent = this.installedApps.length.toString();
        }

        if (!appsPreview) return;

        if (this.installedApps.length === 0) {
            appsPreview.innerHTML = '<p class="empty-state">No applications installed</p>';
            return;
        }

        const appsHtml = this.installedApps.slice(0, 3).map(app => `
            <div class="app-preview-item">
                <div class="app-preview-icon">${app.displayName.charAt(0).toUpperCase()}</div>
                <div class="app-preview-info">
                    <div class="app-preview-name">${app.displayName}</div>
                    <a href="${app.url}" class="app-preview-url" target="_blank">${app.url}</a>
                </div>
                <span class="app-preview-status running">Running</span>
            </div>
        `).join('');

        if (this.installedApps.length > 3) {
            appsPreview.innerHTML = appsHtml + `
                <div class="app-preview-item">
                    <div class="app-preview-info">
                        <a href="#apps" class="nav-link" data-page="apps">
                            View ${this.installedApps.length - 3} more applications →
                        </a>
                    </div>
                </div>
            `;
        } else {
            appsPreview.innerHTML = appsHtml;
        }
    }

    renderServicesStatus() {
        const servicesStatus = document.getElementById('services-status');
        if (!servicesStatus) return;

        const services = [
            { name: 'PHP', key: 'php' },
            { name: 'Nginx', key: 'nginx' },
            { name: 'MySQL', key: 'mysql' }
        ];

        const servicesHtml = services.map(service => {
            const status = this.services[service.key] || { running: false };
            const statusClass = status.running ? 'running' : 'stopped';
            const statusText = status.running ? 'Running' : 'Stopped';

            return `
                <div class="service-item">
                    <span class="service-name">${service.name}</span>
                    <span class="service-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');

        servicesStatus.innerHTML = servicesHtml;
    }

    renderRecentActivity() {
        const recentActivity = document.getElementById('recent-activity');
        if (!recentActivity) return;

        if (this.recentActivity.length === 0) {
            recentActivity.innerHTML = '<p class="empty-state">No recent activity</p>';
            return;
        }

        const activityHtml = this.recentActivity.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${this.formatRelativeTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');

        recentActivity.innerHTML = activityHtml;
    }

    getActivityIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            info: 'i',
            warning: '!'
        };
        return icons[type] || 'i';
    }

    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    setupAutoRefresh() {
        // Refresh dashboard every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 30000);
    }

    async refresh() {
        await this.loadData();
        this.render();
    }

    async refreshServices() {
        await this.loadServicesStatus();
        this.renderServicesStatus();
    }

    addActivity(type, message) {
        this.recentActivity.unshift({
            type,
            message,
            timestamp: new Date()
        });

        // Keep only last 10 activities
        this.recentActivity = this.recentActivity.slice(0, 10);

        this.renderRecentActivity();
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
