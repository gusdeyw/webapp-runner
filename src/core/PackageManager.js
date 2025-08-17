const fs = require('fs-extra');
const path = require('path');
const yauzl = require('yauzl');
const { spawn } = require('child_process');
const { promisify } = require('util');

class PackageManager {
    constructor() {
        this.packagesPath = path.join(process.cwd(), 'packages');
        this.appsPath = path.join(process.cwd(), 'apps');
        this.runtimePath = path.join(process.cwd(), 'runtime');
        this.installedApps = new Map();
    }

    async initialize() {
        console.log('Initializing Package Manager...');
        await fs.ensureDir(this.packagesPath);
        await fs.ensureDir(this.appsPath);
        await this.loadInstalledApps();
    }

    async loadInstalledApps() {
        try {
            const appsDir = await fs.readdir(this.appsPath);
            for (const appDir of appsDir) {
                const appPath = path.join(this.appsPath, appDir);
                const configPath = path.join(appPath, 'app-config.json');

                if (await fs.pathExists(configPath)) {
                    const config = await fs.readJson(configPath);
                    this.installedApps.set(appDir, config);
                }
            }
        } catch (error) {
            console.error('Failed to load installed apps:', error);
        }
    }

    async getAvailablePackages() {
        try {
            const packages = [];
            const packageFiles = await fs.readdir(this.packagesPath);

            for (const packageFile of packageFiles) {
                if (packageFile.endsWith('.lpkg')) {
                    const manifest = await this.extractManifest(path.join(this.packagesPath, packageFile));
                    if (manifest) {
                        packages.push({
                            filename: packageFile,
                            ...manifest
                        });
                    }
                }
            }

            return packages;
        } catch (error) {
            console.error('Failed to get available packages:', error);
            return [];
        }
    }

    async extractManifest(packagePath) {
        return new Promise((resolve, reject) => {
            yauzl.open(packagePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(err);
                    return;
                }

                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    if (entry.fileName === 'manifest.json') {
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            let data = '';
                            readStream.on('data', (chunk) => data += chunk);
                            readStream.on('end', () => {
                                try {
                                    const manifest = JSON.parse(data);
                                    resolve(manifest);
                                } catch (parseErr) {
                                    reject(parseErr);
                                }
                            });
                        });
                    } else {
                        zipfile.readEntry();
                    }
                });

                zipfile.on('end', () => {
                    resolve(null);
                });
            });
        });
    }

    async installPackage(packageInfo) {
        const { filename, name } = packageInfo;
        const packagePath = path.join(this.packagesPath, filename);
        const appName = this.sanitizeAppName(name);
        const installPath = path.join(this.appsPath, appName);

        try {
            // Check if app already exists
            if (await fs.pathExists(installPath)) {
                throw new Error(`Application ${name} is already installed`);
            }

            // Create installation directory
            await fs.ensureDir(installPath);

            // Extract package
            await this.extractPackage(packagePath, installPath);

            // Read installation configuration
            const installConfigPath = path.join(installPath, 'install-config.json');
            const installConfig = await fs.readJson(installConfigPath);

            // Set up application configuration
            const appConfig = await this.setupAppConfiguration(appName, packageInfo, installConfig);

            // Install dependencies
            await this.installDependencies(installPath, installConfig);

            // Set up database
            if (installConfig.databaseRequired) {
                await this.setupDatabase(appName, appConfig);
            }

            // Run Laravel setup
            await this.setupLaravelApp(installPath, appConfig);

            // Configure web server
            await this.configureWebServer(appName, appConfig);

            // Save app configuration
            await fs.writeJson(path.join(installPath, 'app-config.json'), appConfig, { spaces: 2 });

            // Add to installed apps
            this.installedApps.set(appName, appConfig);

            return {
                success: true,
                message: `${name} installed successfully`,
                appConfig
            };

        } catch (error) {
            // Cleanup on failure
            if (await fs.pathExists(installPath)) {
                await fs.remove(installPath);
            }
            throw error;
        }
    }

    async extractPackage(packagePath, extractPath) {
        return new Promise((resolve, reject) => {
            yauzl.open(packagePath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(err);
                    return;
                }

                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    if (/\/$/.test(entry.fileName)) {
                        // Directory entry
                        fs.ensureDir(path.join(extractPath, entry.fileName))
                            .then(() => zipfile.readEntry())
                            .catch(reject);
                    } else {
                        // File entry
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            const filePath = path.join(extractPath, entry.fileName);
                            fs.ensureDir(path.dirname(filePath))
                                .then(() => {
                                    const writeStream = fs.createWriteStream(filePath);
                                    readStream.pipe(writeStream);
                                    writeStream.on('close', () => zipfile.readEntry());
                                    writeStream.on('error', reject);
                                })
                                .catch(reject);
                        });
                    }
                });

                zipfile.on('end', () => resolve());
                zipfile.on('error', reject);
            });
        });
    }

    async setupAppConfiguration(appName, packageInfo, installConfig) {
        const { PortManager } = require('./PortManager');
        const portManager = new PortManager();

        const appPort = await portManager.findAvailablePort(8000);
        const dbPort = await portManager.findAvailablePort(3306);

        return {
            appName,
            displayName: packageInfo.name,
            version: packageInfo.version,
            port: appPort,
            url: `http://localhost:${appPort}`,
            database: {
                host: 'localhost',
                port: dbPort,
                name: `${appName}_db`,
                user: `${appName}_user`,
                password: this.generatePassword()
            },
            paths: {
                app: path.join(this.appsPath, appName),
                php: path.join(this.runtimePath, 'php'),
                nginx: path.join(this.runtimePath, 'nginx'),
                mysql: path.join(this.runtimePath, 'mysql')
            },
            installConfig,
            installedAt: new Date().toISOString()
        };
    }

    async installDependencies(installPath, installConfig) {
        // Install Composer dependencies
        if (await fs.pathExists(path.join(installPath, 'composer.json'))) {
            await this.runComposerInstall(installPath);
        }

        // Install NPM dependencies
        if (installConfig.frontendBuild && await fs.pathExists(path.join(installPath, 'package.json'))) {
            await this.runNpmInstall(installPath);
        }
    }

    async runComposerInstall(installPath) {
        return new Promise((resolve, reject) => {
            const phpPath = path.join(this.runtimePath, 'php', 'php.exe');
            const composerPath = path.join(this.runtimePath, 'composer', 'composer.phar');

            const process = spawn(phpPath, [composerPath, 'install', '--no-dev', '--optimize-autoloader'], {
                cwd: installPath,
                stdio: 'pipe'
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Composer install failed with code ${code}`));
                }
            });

            process.on('error', reject);
        });
    }

    async runNpmInstall(installPath) {
        return new Promise((resolve, reject) => {
            const process = spawn('npm', ['install'], {
                cwd: installPath,
                stdio: 'pipe'
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`NPM install failed with code ${code}`));
                }
            });

            process.on('error', reject);
        });
    }

    async setupDatabase(appName, appConfig) {
        const { DatabaseManager } = require('./DatabaseManager');
        const dbManager = new DatabaseManager();

        await dbManager.createDatabase({
            name: appConfig.database.name,
            user: appConfig.database.user,
            password: appConfig.database.password
        });
    }

    async setupLaravelApp(installPath, appConfig) {
        // Create .env file
        await this.createEnvFile(installPath, appConfig);

        // Generate application key
        await this.generateAppKey(installPath);

        // Run migrations
        if (appConfig.installConfig.migrations) {
            await this.runMigrations(installPath);
        }

        // Run seeders
        if (appConfig.installConfig.seeders) {
            await this.runSeeders(installPath);
        }

        // Build frontend assets
        if (appConfig.installConfig.frontendBuild) {
            await this.buildAssets(installPath);
        }
    }

    async createEnvFile(installPath, appConfig) {
        const envTemplate = `
APP_NAME="${appConfig.displayName}"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=${appConfig.url}

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=${appConfig.database.host}
DB_PORT=${appConfig.database.port}
DB_DATABASE=${appConfig.database.name}
DB_USERNAME=${appConfig.database.user}
DB_PASSWORD=${appConfig.database.password}

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

MEMCACHED_HOST=127.0.0.1

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="\${APP_NAME}"
`.trim();

        await fs.writeFile(path.join(installPath, '.env'), envTemplate);
    }

    async generateAppKey(installPath) {
        return new Promise((resolve, reject) => {
            const phpPath = path.join(this.runtimePath, 'php', 'php.exe');

            const process = spawn(phpPath, ['artisan', 'key:generate'], {
                cwd: installPath,
                stdio: 'pipe'
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Key generation failed with code ${code}`));
                }
            });

            process.on('error', reject);
        });
    }

    async runMigrations(installPath) {
        return new Promise((resolve, reject) => {
            const phpPath = path.join(this.runtimePath, 'php', 'php.exe');

            const process = spawn(phpPath, ['artisan', 'migrate', '--force'], {
                cwd: installPath,
                stdio: 'pipe'
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Migrations failed with code ${code}`));
                }
            });

            process.on('error', reject);
        });
    }

    async runSeeders(installPath) {
        return new Promise((resolve, reject) => {
            const phpPath = path.join(this.runtimePath, 'php', 'php.exe');

            const process = spawn(phpPath, ['artisan', 'db:seed', '--force'], {
                cwd: installPath,
                stdio: 'pipe'
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Seeding failed with code ${code}`));
                }
            });

            process.on('error', reject);
        });
    }

    async buildAssets(installPath) {
        return new Promise((resolve, reject) => {
            const process = spawn('npm', ['run', 'build'], {
                cwd: installPath,
                stdio: 'pipe'
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Asset build failed with code ${code}`));
                }
            });

            process.on('error', reject);
        });
    }

    async configureWebServer(appName, appConfig) {
        // Configure Nginx virtual host
        const vhostConfig = this.generateNginxVirtualHost(appName, appConfig);
        const vhostPath = path.join(this.runtimePath, 'nginx', 'conf', 'sites', `${appName}.conf`);

        await fs.ensureDir(path.dirname(vhostPath));
        await fs.writeFile(vhostPath, vhostConfig);
    }

    generateNginxVirtualHost(appName, appConfig) {
        return `
server {
    listen ${appConfig.port};
    server_name localhost;
    root ${path.join(appConfig.paths.app, 'public').replace(/\\/g, '/')};
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }
}
`.trim();
    }

    async uninstallPackage(appName) {
        try {
            const appConfig = this.installedApps.get(appName);
            if (!appConfig) {
                throw new Error(`Application ${appName} is not installed`);
            }

            const installPath = path.join(this.appsPath, appName);

            // Stop any running services for this app
            // Remove virtual host configuration
            const vhostPath = path.join(this.runtimePath, 'nginx', 'conf', 'sites', `${appName}.conf`);
            if (await fs.pathExists(vhostPath)) {
                await fs.remove(vhostPath);
            }

            // Remove database
            if (appConfig.database) {
                const { DatabaseManager } = require('./DatabaseManager');
                const dbManager = new DatabaseManager();
                await dbManager.dropDatabase(appConfig.database.name);
            }

            // Remove application files
            if (await fs.pathExists(installPath)) {
                await fs.remove(installPath);
            }

            // Remove from installed apps
            this.installedApps.delete(appName);

            return {
                success: true,
                message: `${appConfig.displayName} uninstalled successfully`
            };

        } catch (error) {
            console.error('Failed to uninstall package:', error);
            throw error;
        }
    }

    sanitizeAppName(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }

    generatePassword(length = 16) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    getInstalledApps() {
        return Array.from(this.installedApps.values());
    }

    getAppConfig(appName) {
        return this.installedApps.get(appName);
    }
}

module.exports = { PackageManager };
