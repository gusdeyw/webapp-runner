// Services Manager
class ServicesManager {
    constructor() {
        this.services = {};
        this.refreshInterval = null;
    }

    async init() {
        console.log('Initializing Services Manager...');
        await this.loadServicesStatus();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadServicesStatus() {
        const serviceNames = ['php', 'nginx', 'mysql'];

        for (const serviceName of serviceNames) {
            try {
                const status = await electronAPI.getServiceStatus(serviceName);
                this.services[serviceName] = status;
            } catch (error) {
                console.error(`Failed to get status for ${serviceName}:`, error);
                this.services[serviceName] = { running: false, exists: false };
            }
        }

        this.updateUI();
    }

    setupEventListeners() {
        // Service action buttons
        document.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.matches('[data-action][data-service]')) {
                e.preventDefault();

                const action = target.getAttribute('data-action');
                const service = target.getAttribute('data-service');

                await this.handleServiceAction(action, service);
            }
        });

        // Refresh services button
        const refreshBtn = document.getElementById('refresh-services');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    async handleServiceAction(action, serviceName) {
        try {
            let result;

            switch (action) {
                case 'start':
                    result = await electronAPI.startService(serviceName);
                    break;
                case 'stop':
                    result = await electronAPI.stopService(serviceName);
                    break;
                case 'restart':
                    result = await electronAPI.restartService(serviceName);
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            if (result.success) {
                if (window.app) {
                    window.app.showSuccess(`${serviceName} service ${action}ed successfully`);
                }
            } else {
                throw new Error(result.message || `Failed to ${action} ${serviceName}`);
            }

            // Refresh status after action
            await this.refresh();

        } catch (error) {
            console.error(`Failed to ${action} ${serviceName}:`, error);
            if (window.app) {
                window.app.showError(`Failed to ${action} ${serviceName}: ${error.message}`);
            }
        }
    }

    updateUI() {
        // Update service status badges
        Object.entries(this.services).forEach(([serviceName, status]) => {
            const statusElement = document.getElementById(`${serviceName}-status`);
            if (statusElement) {
                const isRunning = status.running;
                statusElement.textContent = isRunning ? 'Running' : 'Stopped';
                statusElement.className = `service-badge ${isRunning ? 'running' : 'stopped'}`;
            }

            // Update service action buttons
            const serviceCard = document.getElementById(`${serviceName}-service`);
            if (serviceCard) {
                const startBtn = serviceCard.querySelector('[data-action="start"]');
                const stopBtn = serviceCard.querySelector('[data-action="stop"]');
                const restartBtn = serviceCard.querySelector('[data-action="restart"]');

                if (startBtn) startBtn.disabled = status.running;
                if (stopBtn) stopBtn.disabled = !status.running;
                if (restartBtn) restartBtn.disabled = !status.running;
            }
        });
    }

    startAutoRefresh() {
        // Refresh every 10 seconds
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 10000);
    }

    async refresh() {
        await this.loadServicesStatus();

        // Dispatch event for dashboard updates
        document.dispatchEvent(new CustomEvent('service-status-changed', {
            detail: { services: this.services }
        }));
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    getServiceStatus(serviceName) {
        return this.services[serviceName] || { running: false, exists: false };
    }

    getAllServicesStatus() {
        return { ...this.services };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServicesManager;
}
