# Setup Instructions for Laravel Application Deployment System

## Initial Setup for Development

### Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (version 16.0.0 or later)
- **npm** (comes with Node.js)
- **Git** (for version control)

### Step 1: Install Dependencies

```bash
# Navigate to the project directory
cd webapp-runner

# Install all dependencies
npm install
```

### Step 2: Development Environment

```bash
# Start the development server
npm run dev
```

This will launch the Electron application in development mode with hot reloading enabled.

### Step 3: Testing the Application

1. The application should open automatically
2. Test the navigation between different pages
3. Verify that the UI loads correctly
4. Check the console for any errors

## Building for Production

### Build for Current Platform
```bash
npm run build
```

### Build for Specific Platforms
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

The built files will be in the `dist/` directory.

## Project Structure Overview

```
webapp-runner/
├── src/                    # Electron main process
│   ├── main.js            # Main entry point
│   ├── preload.js         # Preload scripts
│   └── core/              # Core modules
├── ui/                    # Frontend interface
│   ├── index.html         # Main HTML
│   ├── css/              # Stylesheets
│   └── js/               # JavaScript modules
├── assets/               # Icons and images
├── package.json          # Project configuration
└── README.md            # Documentation
```

## Development Workflow

### 1. Making Changes
- Modify files in `src/` for backend logic
- Modify files in `ui/` for frontend interface
- The app will automatically reload in development mode

### 2. Adding New Features
- Create new modules in `src/core/` for backend functionality
- Add new UI components in `ui/js/`
- Update `ui/index.html` if new pages are needed

### 3. Testing
```bash
# Run linting
npm run lint

# Run tests (when implemented)
npm test
```

## Deployment Preparation

### 1. Create Runtime Environment
The application needs runtime environments for PHP, MySQL, and Nginx. These should be:
- Downloaded as portable versions
- Placed in the `runtime/` directory (created at build time)
- Configured through the application

### 2. Package Sample Applications
Create sample Laravel applications packaged as `.lpkg` files:
- Zip Laravel applications with `manifest.json` and `install-config.json`
- Place in `packages/` directory
- Test installation process

### 3. Icons and Branding
- Add application icons to `assets/icons/`
- Ensure icons are available in multiple sizes
- Update branding elements in the UI

## Configuration Files

### Environment Configuration
The application creates these directories at runtime:
- `runtime/` - PHP, MySQL, Nginx binaries
- `apps/` - Installed Laravel applications
- `packages/` - Available application packages
- `backups/` - Database backups
- `config/` - Application configuration

### Key Configuration Files
- `config/global.json` - Global application settings
- `config/apps.json` - Installed applications metadata

## Troubleshooting Development Issues

### Application Won't Start
1. Check Node.js version: `node --version`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check for port conflicts
4. Review console output for errors

### Build Failures
1. Ensure all dependencies are installed
2. Check for syntax errors: `npm run lint`
3. Verify file permissions
4. Try building for a single platform first

### UI Issues
1. Check browser console for JavaScript errors
2. Verify CSS files are loading correctly
3. Test in development mode first
4. Check for missing dependencies

## Git Workflow for Deployment

### Initial Commit
```bash
# Add all files to git
git add .

# Create initial commit
git commit -m "Initial Laravel Deployment System setup

- Complete Electron application structure
- Core modules for service, package, database management
- Modern UI with dashboard, installer, services pages
- Cross-platform support (Windows, macOS, Linux)
- Ready for runtime environment integration"

# Push to repository
git push origin main
```

### Creating Releases
```bash
# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Next Steps for Full Implementation

### 1. Runtime Environment Setup
- Download portable PHP, MySQL, Nginx
- Create installation scripts
- Test service management on all platforms

### 2. Package System
- Implement .lpkg file creation tools
- Create sample Laravel applications
- Test installation workflows

### 3. Database Integration
- Set up MySQL configuration
- Implement database creation/management
- Test backup/restore functionality

### 4. Service Management
- Implement Windows service creation
- Add systemd support for Linux
- Test service start/stop/restart

### 5. UI Enhancements
- Complete installer wizard
- Add database management interface
- Implement settings panel
- Add backup/restore UI

### 6. Testing & QA
- Test on clean systems
- Verify all features work
- Performance optimization
- Security review

### 7. Documentation
- User manual
- Developer guide
- Package creation tutorial
- Troubleshooting guide

## Security Considerations

### File Permissions
- Ensure proper file permissions for installed applications
- Secure configuration files
- Protect database credentials

### Network Security
- Use localhost-only database connections
- Implement proper firewall rules
- Secure service communication

### Update System
- Implement secure update mechanism
- Verify package signatures
- Secure download channels

---

This setup provides a solid foundation for the Laravel Application Deployment System. The architecture is modular and extensible, making it easy to add new features and maintain the codebase.
