const mysql = require('mysql2/promise');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

class DatabaseManager {
    constructor() {
        this.runtimePath = path.join(process.cwd(), 'runtime');
        this.mysqlPath = path.join(this.runtimePath, 'mysql');
        this.backupsPath = path.join(process.cwd(), 'backups');
        this.connection = null;
        this.rootPassword = 'root'; // Default root password
    }

    async initialize() {
        console.log('Initializing Database Manager...');
        await this.ensureDirectories();
        await this.setupMySQLConfiguration();
    }

    async ensureDirectories() {
        await fs.ensureDir(this.mysqlPath);
        await fs.ensureDir(path.join(this.mysqlPath, 'data'));
        await fs.ensureDir(path.join(this.mysqlPath, 'logs'));
        await fs.ensureDir(this.backupsPath);
    }

    async setupMySQLConfiguration() {
        const configPath = path.join(this.mysqlPath, 'my.ini');

        if (!await fs.pathExists(configPath)) {
            const config = this.generateMySQLConfig();
            await fs.writeFile(configPath, config);
        }
    }

    generateMySQLConfig() {
        const dataDir = path.join(this.mysqlPath, 'data').replace(/\\/g, '/');
        const logDir = path.join(this.mysqlPath, 'logs').replace(/\\/g, '/');

        return `
[mysqld]
# Basic settings
port = 3306
basedir = ${this.mysqlPath.replace(/\\/g, '/')}
datadir = ${dataDir}
tmpdir = ${path.join(this.mysqlPath, 'tmp').replace(/\\/g, '/')}

# Logging
log-error = ${logDir}/error.log
general_log = 1
general_log_file = ${logDir}/general.log
slow_query_log = 1
slow_query_log_file = ${logDir}/slow.log
long_query_time = 2

# InnoDB settings
default-storage-engine = INNODB
innodb_buffer_pool_size = 128M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 1
innodb_lock_wait_timeout = 50

# MyISAM settings
key_buffer_size = 32M
query_cache_size = 64M
query_cache_type = 1

# Connection settings
max_connections = 100
max_connect_errors = 10
table_open_cache = 2048
max_allowed_packet = 16M

# Security
bind-address = 127.0.0.1

[mysql]
default-character-set = utf8mb4

[mysqldump]
quick
quote-names
max_allowed_packet = 16M

[client]
port = 3306
socket = ${path.join(this.mysqlPath, 'mysql.sock').replace(/\\/g, '/')}
default-character-set = utf8mb4
`.trim();
    }

    async getConnection() {
        if (!this.connection) {
            try {
                this.connection = await mysql.createConnection({
                    host: 'localhost',
                    port: 3306,
                    user: 'root',
                    password: this.rootPassword,
                    multipleStatements: true
                });
            } catch (error) {
                console.error('Failed to connect to MySQL:', error);
                throw error;
            }
        }
        return this.connection;
    }

    async closeConnection() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }

    async createDatabase(config) {
        const { name, user, password } = config;

        try {
            const connection = await this.getConnection();

            // Create database
            await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

            // Create user if specified
            if (user && password) {
                await connection.execute(`CREATE USER IF NOT EXISTS '${user}'@'localhost' IDENTIFIED BY '${password}'`);
                await connection.execute(`GRANT ALL PRIVILEGES ON \`${name}\`.* TO '${user}'@'localhost'`);
                await connection.execute('FLUSH PRIVILEGES');
            }

            return {
                success: true,
                message: `Database ${name} created successfully`,
                database: name,
                user: user || 'root'
            };

        } catch (error) {
            console.error('Failed to create database:', error);
            throw error;
        }
    }

    async dropDatabase(name) {
        try {
            const connection = await this.getConnection();
            await connection.execute(`DROP DATABASE IF EXISTS \`${name}\``);

            return {
                success: true,
                message: `Database ${name} dropped successfully`
            };

        } catch (error) {
            console.error('Failed to drop database:', error);
            throw error;
        }
    }

    async listDatabases() {
        try {
            const connection = await this.getConnection();
            const [rows] = await connection.execute('SHOW DATABASES');

            // Filter out system databases
            const systemDatabases = ['information_schema', 'mysql', 'performance_schema', 'sys'];
            const userDatabases = rows
                .map(row => row.Database)
                .filter(db => !systemDatabases.includes(db));

            return userDatabases;

        } catch (error) {
            console.error('Failed to list databases:', error);
            throw error;
        }
    }

    async getDatabaseInfo(name) {
        try {
            const connection = await this.getConnection();

            // Get database size
            const [sizeResult] = await connection.execute(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [name]);

            // Get table count
            const [tableResult] = await connection.execute(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [name]);

            // Get character set and collation
            const [charsetResult] = await connection.execute(`
        SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
        FROM information_schema.SCHEMATA 
        WHERE SCHEMA_NAME = ?
      `, [name]);

            return {
                name,
                size_mb: sizeResult[0].size_mb || 0,
                table_count: tableResult[0].table_count,
                character_set: charsetResult[0]?.DEFAULT_CHARACTER_SET_NAME,
                collation: charsetResult[0]?.DEFAULT_COLLATION_NAME
            };

        } catch (error) {
            console.error('Failed to get database info:', error);
            throw error;
        }
    }

    async backupDatabase(appName, options = {}) {
        const { ConfigManager } = require('./ConfigManager');
        const configManager = new ConfigManager();
        const appConfig = configManager.getAppConfig(appName);

        if (!appConfig || !appConfig.database) {
            throw new Error(`No database configuration found for app: ${appName}`);
        }

        const { name: dbName, user, password } = appConfig.database;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `${appName}_${dbName}_${timestamp}.sql`;
        const backupPath = path.join(this.backupsPath, backupFileName);

        try {
            await this.createMySQLDump(dbName, backupPath, { user, password, ...options });

            return {
                success: true,
                message: `Database backup created successfully`,
                backupPath,
                backupFileName,
                size: (await fs.stat(backupPath)).size
            };

        } catch (error) {
            console.error('Failed to backup database:', error);
            throw error;
        }
    }

    async restoreDatabase(appName, backupFile, options = {}) {
        const { ConfigManager } = require('./ConfigManager');
        const configManager = new ConfigManager();
        const appConfig = configManager.getAppConfig(appName);

        if (!appConfig || !appConfig.database) {
            throw new Error(`No database configuration found for app: ${appName}`);
        }

        const { name: dbName, user, password } = appConfig.database;
        const backupPath = path.isAbsolute(backupFile) ?
            backupFile : path.join(this.backupsPath, backupFile);

        if (!await fs.pathExists(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        try {
            // Drop and recreate database if specified
            if (options.dropFirst) {
                await this.dropDatabase(dbName);
                await this.createDatabase({
                    name: dbName,
                    user,
                    password
                });
            }

            await this.restoreMySQLDump(dbName, backupPath, { user, password, ...options });

            return {
                success: true,
                message: `Database restored successfully from ${path.basename(backupPath)}`
            };

        } catch (error) {
            console.error('Failed to restore database:', error);
            throw error;
        }
    }

    async createMySQLDump(database, outputPath, options = {}) {
        const mysqldumpPath = path.join(this.mysqlPath, 'bin', 'mysqldump.exe');
        const { user = 'root', password = this.rootPassword, ...dumpOptions } = options;

        const args = [
            `--user=${user}`,
            `--password=${password}`,
            '--single-transaction',
            '--routines',
            '--triggers'
        ];

        if (dumpOptions.noData) {
            args.push('--no-data');
        }

        if (dumpOptions.dataOnly) {
            args.push('--no-create-info');
        }

        args.push(database);

        return new Promise((resolve, reject) => {
            const mysqldump = spawn(mysqldumpPath, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            const writeStream = fs.createWriteStream(outputPath);
            mysqldump.stdout.pipe(writeStream);

            let errorOutput = '';
            mysqldump.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            mysqldump.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`mysqldump failed with code ${code}: ${errorOutput}`));
                }
            });

            mysqldump.on('error', reject);
        });
    }

    async restoreMySQLDump(database, backupPath, options = {}) {
        const mysqlPath = path.join(this.mysqlPath, 'bin', 'mysql.exe');
        const { user = 'root', password = this.rootPassword } = options;

        const args = [
            `--user=${user}`,
            `--password=${password}`,
            database
        ];

        return new Promise((resolve, reject) => {
            const mysql = spawn(mysqlPath, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const readStream = fs.createReadStream(backupPath);
            readStream.pipe(mysql.stdin);

            let errorOutput = '';
            mysql.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            mysql.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`mysql restore failed with code ${code}: ${errorOutput}`));
                }
            });

            mysql.on('error', reject);
        });
    }

    async listBackups(appName = null) {
        try {
            const backupFiles = await fs.readdir(this.backupsPath);
            const backups = [];

            for (const file of backupFiles) {
                if (file.endsWith('.sql')) {
                    const filePath = path.join(this.backupsPath, file);
                    const stats = await fs.stat(filePath);

                    // Parse backup filename to extract app name and database
                    const parts = file.replace('.sql', '').split('_');
                    const backupAppName = parts[0];

                    if (!appName || backupAppName === appName) {
                        backups.push({
                            fileName: file,
                            appName: backupAppName,
                            size: stats.size,
                            created: stats.mtime,
                            path: filePath
                        });
                    }
                }
            }

            // Sort by creation date (newest first)
            backups.sort((a, b) => b.created - a.created);

            return backups;

        } catch (error) {
            console.error('Failed to list backups:', error);
            throw error;
        }
    }

    async deleteBackup(fileName) {
        const backupPath = path.join(this.backupsPath, fileName);

        if (!await fs.pathExists(backupPath)) {
            throw new Error(`Backup file not found: ${fileName}`);
        }

        try {
            await fs.remove(backupPath);
            return {
                success: true,
                message: `Backup ${fileName} deleted successfully`
            };
        } catch (error) {
            console.error('Failed to delete backup:', error);
            throw error;
        }
    }

    async testConnection(config = {}) {
        const { host = 'localhost', port = 3306, user = 'root', password = this.rootPassword } = config;

        try {
            const testConnection = await mysql.createConnection({
                host,
                port,
                user,
                password,
                connectTimeout: 5000
            });

            await testConnection.ping();
            await testConnection.end();

            return {
                success: true,
                message: 'Database connection successful'
            };

        } catch (error) {
            return {
                success: false,
                message: `Database connection failed: ${error.message}`
            };
        }
    }

    async executeQuery(database, query, params = []) {
        try {
            const connection = await this.getConnection();
            await connection.execute(`USE \`${database}\``);
            const [results] = await connection.execute(query, params);
            return results;
        } catch (error) {
            console.error('Failed to execute query:', error);
            throw error;
        }
    }

    async getTableList(database) {
        try {
            const connection = await this.getConnection();
            const [rows] = await connection.execute(`
        SELECT TABLE_NAME, TABLE_ROWS, 
               ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb'
        FROM information_schema.TABLES 
        WHERE table_schema = ?
        ORDER BY TABLE_NAME
      `, [database]);

            return rows;
        } catch (error) {
            console.error('Failed to get table list:', error);
            throw error;
        }
    }

    async optimizeDatabase(database) {
        try {
            const tables = await this.getTableList(database);
            const connection = await this.getConnection();

            for (const table of tables) {
                await connection.execute(`OPTIMIZE TABLE \`${database}\`.\`${table.TABLE_NAME}\``);
            }

            return {
                success: true,
                message: `Database ${database} optimized successfully`,
                tablesOptimized: tables.length
            };

        } catch (error) {
            console.error('Failed to optimize database:', error);
            throw error;
        }
    }

    async cleanupOldBackups(retentionDays = 30) {
        try {
            const backups = await this.listBackups();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const deletedBackups = [];

            for (const backup of backups) {
                if (backup.created < cutoffDate) {
                    await this.deleteBackup(backup.fileName);
                    deletedBackups.push(backup.fileName);
                }
            }

            return {
                success: true,
                message: `Cleanup completed`,
                deletedBackups,
                deletedCount: deletedBackups.length
            };

        } catch (error) {
            console.error('Failed to cleanup old backups:', error);
            throw error;
        }
    }
}

module.exports = { DatabaseManager };
