// Navigation controller
class Navigation {
    constructor() {
        this.currentPage = 'dashboard';
        this.pages = ['dashboard', 'apps', 'install', 'services', 'databases', 'backups', 'settings'];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.activatePage('dashboard');
    }

    setupEventListeners() {
        // Navigation link clicks
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                if (page && this.pages.includes(page)) {
                    this.navigateTo(page);
                }
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || 'dashboard';
            this.activatePage(page, false);
        });

        // Handle hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && this.pages.includes(hash)) {
                this.activatePage(hash, false);
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                const pageIndex = parseInt(e.key) - 1;
                if (pageIndex >= 0 && pageIndex < this.pages.length) {
                    e.preventDefault();
                    this.navigateTo(this.pages[pageIndex]);
                }
            }
        });
    }

    navigateTo(page) {
        if (!this.pages.includes(page) || page === this.currentPage) {
            return;
        }

        // Update URL
        window.history.pushState({ page }, '', `#${page}`);

        // Activate the page
        this.activatePage(page);
    }

    activatePage(page, updateHistory = true) {
        // Deactivate current page
        this.deactivateCurrentPage();

        // Update current page
        this.currentPage = page;

        // Activate new page
        this.activateNewPage(page);

        // Update navigation state
        this.updateNavigationState();

        // Dispatch page change event
        document.dispatchEvent(new CustomEvent('page-change', {
            detail: { page, previousPage: this.currentPage }
        }));

        // Update URL if needed
        if (updateHistory && window.location.hash !== `#${page}`) {
            window.history.replaceState({ page }, '', `#${page}`);
        }
    }

    deactivateCurrentPage() {
        // Remove active class from current page
        const currentPageElement = document.getElementById(`${this.currentPage}-page`);
        if (currentPageElement) {
            currentPageElement.classList.remove('active');
        }

        // Remove active class from current nav link
        const currentNavLink = document.querySelector(`.nav-link[data-page="${this.currentPage}"]`);
        if (currentNavLink) {
            currentNavLink.classList.remove('active');
        }
    }

    activateNewPage(page) {
        // Add active class to new page
        const newPageElement = document.getElementById(`${page}-page`);
        if (newPageElement) {
            newPageElement.classList.add('active');

            // Trigger page-specific initialization if needed
            this.initializePage(page);
        }

        // Add active class to new nav link
        const newNavLink = document.querySelector(`.nav-link[data-page="${page}"]`);
        if (newNavLink) {
            newNavLink.classList.add('active');
        }
    }

    updateNavigationState() {
        // Update any navigation-dependent UI elements
        this.updateBreadcrumbs();
        this.updatePageTitle();
    }

    updateBreadcrumbs() {
        // Update breadcrumbs if they exist
        const breadcrumbs = document.querySelector('.breadcrumbs');
        if (breadcrumbs) {
            const pageNames = {
                dashboard: 'Dashboard',
                apps: 'Applications',
                install: 'Install Apps',
                services: 'Services',
                databases: 'Databases',
                backups: 'Backups',
                settings: 'Settings'
            };

            breadcrumbs.innerHTML = `
                <span class="breadcrumb-item">
                    <a href="#dashboard">Home</a>
                </span>
                ${this.currentPage !== 'dashboard' ? `
                    <span class="breadcrumb-separator">></span>
                    <span class="breadcrumb-item active">
                        ${pageNames[this.currentPage]}
                    </span>
                ` : ''}
            `;
        }
    }

    updatePageTitle() {
        const pageNames = {
            dashboard: 'Dashboard',
            apps: 'Applications',
            install: 'Install Apps',
            services: 'Services',
            databases: 'Databases',
            backups: 'Backups',
            settings: 'Settings'
        };

        // Update page title in header
        const pageTitleElement = document.getElementById('page-title');
        if (pageTitleElement) {
            pageTitleElement.textContent = pageNames[this.currentPage] || 'Dashboard';
        }

        // Update document title
        document.title = `${pageNames[this.currentPage]} - Laravel App Deployer`;
    }

    initializePage(page) {
        // Initialize page-specific functionality
        switch (page) {
            case 'dashboard':
                if (window.app && window.app.dashboard) {
                    window.app.dashboard.refresh();
                }
                break;

            case 'apps':
                this.initializeAppsPage();
                break;

            case 'install':
                if (window.app && window.app.installer) {
                    window.app.installer.refreshPackages();
                }
                break;

            case 'services':
                if (window.app && window.app.servicesManager) {
                    window.app.servicesManager.refresh();
                }
                break;

            case 'databases':
                this.initializeDatabasesPage();
                break;

            case 'backups':
                this.initializeBackupsPage();
                break;

            case 'settings':
                this.initializeSettingsPage();
                break;
        }
    }

    initializeAppsPage() {
        // Initialize apps page
        const installNewAppBtn = document.getElementById('install-new-app');
        if (installNewAppBtn) {
            installNewAppBtn.addEventListener('click', () => {
                this.navigateTo('install');
            });
        }

        // Load and display installed apps
        this.loadInstalledApps();
    }

    async loadInstalledApps() {
        const appsGrid = document.getElementById('apps-grid');
        if (!appsGrid) return;

        try {
            // This would normally load from the package manager
            const apps = []; // await electronAPI.getInstalledApps();

            if (apps.length === 0) {
                appsGrid.innerHTML = `
                    <div class="empty-state-card">
                        <p>No applications installed yet.</p>
                        <button class="btn btn-primary" onclick="window.app.navigation.navigateTo('install')">
                            Install Your First App
                        </button>
                    </div>
                `;
            } else {
                appsGrid.innerHTML = apps.map(app => this.createAppCard(app)).join('');
            }
        } catch (error) {
            console.error('Failed to load installed apps:', error);
            appsGrid.innerHTML = `
                <div class="error-state-card">
                    <p>Failed to load applications.</p>
                    <button class="btn btn-secondary" onclick="window.app.navigation.loadInstalledApps()">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    createAppCard(app) {
        return `
            <div class="app-card">
                <div class="app-card-header">
                    <div class="app-card-title">${app.displayName}</div>
                    <a href="${app.url}" class="app-card-url" target="_blank">${app.url}</a>
                </div>
                <div class="app-card-content">
                    <div class="app-card-info">
                        <div class="app-info-item">
                            <div class="app-info-label">Version</div>
                            <div class="app-info-value">${app.version}</div>
                        </div>
                        <div class="app-info-item">
                            <div class="app-info-label">Port</div>
                            <div class="app-info-value">${app.port}</div>
                        </div>
                        <div class="app-info-item">
                            <div class="app-info-label">Database</div>
                            <div class="app-info-value">${app.database?.name || 'None'}</div>
                        </div>
                        <div class="app-info-item">
                            <div class="app-info-label">Status</div>
                            <div class="app-info-value">
                                <span class="app-preview-status running">Running</span>
                            </div>
                        </div>
                    </div>
                    <div class="app-card-actions">
                        <button class="btn btn-primary" onclick="window.electronAPI.openExternal('${app.url}')">
                            Open App
                        </button>
                        <button class="btn btn-secondary" onclick="this.configureApp('${app.appName}')">
                            Configure
                        </button>
                        <button class="btn btn-warning" onclick="this.uninstallApp('${app.appName}')">
                            Uninstall
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    initializeDatabasesPage() {
        // Initialize databases page functionality
        console.log('Initializing databases page...');
    }

    initializeBackupsPage() {
        // Initialize backups page functionality
        console.log('Initializing backups page...');
    }

    initializeSettingsPage() {
        // Initialize settings page functionality
        console.log('Initializing settings page...');
    }

    // Utility methods for navigation
    getCurrentPage() {
        return this.currentPage;
    }

    isPageActive(page) {
        return this.currentPage === page;
    }

    getAvailablePages() {
        return [...this.pages];
    }

    // Mobile navigation support
    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    // Page transition effects
    addPageTransition(fromPage, toPage) {
        const fromElement = document.getElementById(`${fromPage}-page`);
        const toElement = document.getElementById(`${toPage}-page`);

        if (fromElement && toElement) {
            // Add transition classes
            fromElement.classList.add('page-exit');
            toElement.classList.add('page-enter');

            // Clean up after transition
            setTimeout(() => {
                fromElement.classList.remove('page-exit');
                toElement.classList.remove('page-enter');
            }, 300);
        }
    }

    // Accessibility improvements
    updateAriaStates() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            const isActive = page === this.currentPage;

            link.setAttribute('aria-current', isActive ? 'page' : 'false');
            link.setAttribute('tabindex', isActive ? '-1' : '0');
        });
    }

    // Navigation history management
    getNavigationHistory() {
        return this.navigationHistory || [];
    }

    goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.navigateTo('dashboard');
        }
    }

    goForward() {
        window.history.forward();
    }
}

// Global navigation helper functions
function switchPage(page) {
    if (window.app && window.app.navigation) {
        window.app.navigation.navigateTo(page);
    }
}

function getCurrentPage() {
    return window.app && window.app.navigation ?
        window.app.navigation.getCurrentPage() : 'dashboard';
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
}
