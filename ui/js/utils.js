// Utility functions used throughout the application

// Date and time utilities
const DateUtils = {
    formatDate(date, format = 'default') {
        const d = new Date(date);

        switch (format) {
            case 'short':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            case 'time':
                return d.toLocaleTimeString();
            case 'datetime':
                return d.toLocaleString();
            default:
                return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        }
    },

    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

        return this.formatDate(date, 'short');
    },

    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return today.toDateString() === checkDate.toDateString();
    },

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
};

// File size utilities
const FileUtils = {
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    parseSize(sizeString) {
        const units = { 'B': 1, 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 };
        const match = sizeString.match(/^([\d.]+)\s*([A-Z]+)$/i);
        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        return value * (units[unit] || 1);
    },

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    getFileName(path) {
        return path.split(/[\\/]/).pop();
    },

    getFileNameWithoutExtension(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    }
};

// String utilities
const StringUtils = {
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    },

    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    truncate(text, length, suffix = '...') {
        if (text.length <= length) return text;
        return text.substring(0, length - suffix.length) + suffix;
    },

    sanitize(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
    },

    camelCase(text) {
        return text.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    },

    kebabCase(text) {
        return text.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
};

// Array utilities
const ArrayUtils = {
    unique(array) {
        return [...new Set(array)];
    },

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },

    sortBy(array, key, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            if (direction === 'desc') {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
    },

    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
};

// Validation utilities
const ValidationUtils = {
    isEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    isPort(port) {
        const portNum = parseInt(port);
        return portNum >= 1 && portNum <= 65535;
    },

    isValidAppName(name) {
        // App name should be alphanumeric with hyphens/underscores
        const appNameRegex = /^[a-zA-Z0-9_-]+$/;
        return appNameRegex.test(name) && name.length >= 3 && name.length <= 50;
    },

    isEmpty(value) {
        return value === null || value === undefined ||
            (typeof value === 'string' && value.trim() === '') ||
            (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'object' && Object.keys(value).length === 0);
    },

    isNumeric(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    }
};

// DOM utilities
const DOMUtils = {
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);

        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    },

    addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    },

    removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    },

    toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    },

    hasClass(element, className) {
        return element && element.classList.contains(className);
    },

    closest(element, selector) {
        return element ? element.closest(selector) : null;
    },

    show(element) {
        if (element) {
            element.style.display = '';
        }
    },

    hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    },

    fadeIn(element, duration = 300) {
        if (!element) return;

        element.style.opacity = '0';
        element.style.display = '';

        const start = performance.now();

        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    },

    fadeOut(element, duration = 300) {
        if (!element) return;

        const start = performance.now();
        const startOpacity = parseFloat(getComputedStyle(element).opacity);

        function animate(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);

            element.style.opacity = startOpacity * (1 - progress);

            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }
};

// Performance utilities
const PerformanceUtils = {
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    measure(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    },

    measureAsync(name, fn) {
        return async (...args) => {
            const start = performance.now();
            const result = await fn(...args);
            const end = performance.now();
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        };
    }
};

// Storage utilities
const StorageUtils = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch {
            return false;
        }
    },

    exists(key) {
        return localStorage.getItem(key) !== null;
    }
};

// Color utilities
const ColorUtils = {
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    generateRandomColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    },

    getContrastColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return '#000000';

        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }
};

// Export utilities for use in other modules
if (typeof window !== 'undefined') {
    window.Utils = {
        Date: DateUtils,
        File: FileUtils,
        String: StringUtils,
        Array: ArrayUtils,
        Validation: ValidationUtils,
        DOM: DOMUtils,
        Performance: PerformanceUtils,
        Storage: StorageUtils,
        Color: ColorUtils
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DateUtils,
        FileUtils,
        StringUtils,
        ArrayUtils,
        ValidationUtils,
        DOMUtils,
        PerformanceUtils,
        StorageUtils,
        ColorUtils
    };
}
