# Laravel Application Deployment System

A comprehensive desktop application deployment system that automates the installation and management of Laravel applications on Windows/Mac/Linux. Works like Docker but with a GUI installer, handling everything from environment setup to application deployment.

## 🚀 Features

- **One-Click Laravel App Installation** - No technical knowledge required
- **Complete Environment Isolation** - Each app gets its own environment
- **Professional User Experience** - Modern Electron-based GUI
- **Multi-Platform Support** - Windows, macOS, and Linux
- **Service Management** - Start/stop/restart PHP, Nginx, MySQL services
- **Database Management** - Automatic database creation and management
- **Backup & Restore** - Easy backup and restore operations
- **Port Management** - Automatic port allocation and management
- **Update System** - Seamless application updates

## 📋 System Requirements

### Windows
- Windows 10 or later (64-bit)
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space
- Administrator privileges for service installation

### macOS
- macOS 10.14 or later
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space
- Administrator privileges

### Linux
- Ubuntu 18.04+ / CentOS 7+ / Debian 9+ (64-bit)
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space
- sudo privileges

## 🛠️ Installation

### For End Users

1. Download the latest installer from the [Releases](https://github.com/gusdeyw/webapp-runner/releases) page
2. Run the installer with administrator privileges
3. Follow the installation wizard
4. Launch the application from the desktop shortcut or start menu

### For Developers

#### Prerequisites
- Node.js 16.0.0 or later
- npm or yarn
- Git

#### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/gusdeyw/webapp-runner.git
   cd webapp-runner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   # Build for current platform
   npm run build
   
   # Build for specific platforms
   npm run build:win     # Windows
   npm run build:mac     # macOS
   npm run build:linux   # Linux
   ```

## 🏗️ Project Structure

```
webapp-runner/
├── src/                    # Main application source
│   ├── main.js            # Electron main process
│   ├── preload.js         # Preload scripts
│   └── core/              # Core modules
│       ├── ServiceManager.js      # Service management
│       ├── PackageManager.js      # Package management
│       ├── ConfigManager.js       # Configuration management
│       ├── PortManager.js         # Port management
│       └── DatabaseManager.js     # Database management
├── ui/                    # User interface
│   ├── index.html         # Main HTML file
│   ├── css/              # Stylesheets
│   └── js/               # JavaScript modules
├── assets/               # Application assets
│   └── icons/           # Application icons
├── runtime/              # Runtime environment (created at runtime)
├── apps/                 # Installed applications (created at runtime)
├── packages/             # Application packages (created at runtime)
├── backups/              # Database backups (created at runtime)
└── config/               # Configuration files (created at runtime)
```

## 🎯 Usage

### Installing a Laravel Application

1. **Launch the Application**
   - Open Laravel App Deployer from your desktop or start menu

2. **Navigate to Install Apps**
   - Click on "Install Apps" in the sidebar

3. **Select an Application**
   - Choose from available Laravel application packages
   - Click on the package you want to install

4. **Configure Installation**
   - Set application name and installation path
   - Configure port settings (auto-assigned if left empty)
   - Review database settings

5. **Install**
   - Click "Install" and wait for the process to complete
   - The installer will handle all setup automatically

6. **Access Your Application**
   - Click "Open Application" when installation completes
   - Or navigate to the provided URL in your browser

### Managing Services

1. **Go to Services Page**
   - Click on "Services" in the sidebar

2. **Control Services**
   - Start, stop, or restart PHP, Nginx, and MySQL services
   - Monitor service status in real-time

### Database Management

1. **Access Database Tools**
   - Click on "Databases" in the sidebar

2. **Backup & Restore**
   - Create database backups
   - Restore from previous backups
   - Schedule automatic backups

## 📦 Creating Application Packages

### Package Structure

Laravel applications should be packaged as `.lpkg` files with the following structure:

```
MyLaravelApp.lpkg
├── app/                  # Laravel application files
├── database/            # Migrations and seeders
├── public/              # Public assets
├── vendor/              # Composer dependencies (optional)
├── package.json         # Frontend dependencies
├── manifest.json        # App metadata
└── install-config.json  # Installation configuration
```

### Manifest File Example

```json
{
  "name": "My Laravel App",
  "version": "1.0.0",
  "description": "Description of the Laravel application",
  "author": "Developer Name",
  "requirements": {
    "php": ">=8.1",
    "mysql": ">=8.0",
    "node": ">=16.0"
  },
  "configuration": {
    "defaultPort": 8000,
    "databaseRequired": true,
    "frontendBuild": true,
    "migrations": true,
    "seeders": false
  },
  "icon": "icon.png",
  "screenshots": ["screen1.png", "screen2.png"]
}
```

### Installation Configuration

```json
{
  "databaseRequired": true,
  "frontendBuild": true,
  "migrations": true,
  "seeders": false,
  "postInstallCommands": [
    "php artisan storage:link",
    "php artisan config:cache"
  ]
}
```

## 🔧 Configuration

### Global Configuration

The application stores its configuration in `config/global.json`:

```json
{
  "version": "1.0.0",
  "installPath": "C:/LaravelApps",
  "autoStart": false,
  "checkUpdates": true,
  "theme": "light",
  "language": "en",
  "ports": {
    "rangeStart": 8000,
    "rangeEnd": 9000
  },
  "services": {
    "php": { "autoStart": true, "port": 9000 },
    "nginx": { "autoStart": true, "port": 80 },
    "mysql": { "autoStart": true, "port": 3306 }
  }
}
```

### Application Configuration

Each installed application has its own configuration in `config/apps.json`:

```json
{
  "myapp": {
    "appName": "myapp",
    "displayName": "My Laravel App",
    "version": "1.0.0",
    "port": 8001,
    "url": "http://localhost:8001",
    "database": {
      "host": "localhost",
      "port": 3306,
      "name": "myapp_db",
      "user": "myapp_user",
      "password": "generated_password"
    },
    "paths": {
      "app": "C:/LaravelApps/apps/myapp",
      "php": "C:/LaravelApps/runtime/php",
      "nginx": "C:/LaravelApps/runtime/nginx",
      "mysql": "C:/LaravelApps/runtime/mysql"
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**Application won't start**
- Check if all services are running (PHP, MySQL, Nginx)
- Verify port availability
- Check application logs in the installation directory

**Database connection errors**
- Ensure MySQL service is running
- Check database credentials in `.env` file
- Verify database exists

**Port conflicts**
- Check if another service is using the same port
- Use the port management tools to find available ports
- Restart the application with a different port

**Installation fails**
- Run the installer as administrator
- Check available disk space
- Temporarily disable antivirus software

### Log Files

Application logs are stored in:
- **Windows**: `%APPDATA%/Laravel App Deployer/logs/`
- **macOS**: `~/Library/Logs/Laravel App Deployer/`
- **Linux**: `~/.local/share/Laravel App Deployer/logs/`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use ESLint configuration provided
- Follow conventional commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Laravel Framework for providing the excellent PHP framework
- Electron for enabling cross-platform desktop applications
- All contributors who help improve this project

## 📞 Support

- **Documentation**: [Wiki](https://github.com/gusdeyw/webapp-runner/wiki)
- **Issues**: [GitHub Issues](https://github.com/gusdeyw/webapp-runner/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gusdeyw/webapp-runner/discussions)

## 🗺️ Roadmap

- [ ] Plugin system for extensions
- [ ] Multi-environment support (dev/staging/prod)
- [ ] Docker integration
- [ ] Cloud deployment support
- [ ] Package marketplace
- [ ] Automated testing framework
- [ ] Performance monitoring
- [ ] SSL certificate management

---

**Made with ❤️ for the Laravel community**
