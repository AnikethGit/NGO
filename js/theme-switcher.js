/**
 * THEME SWITCHER - Sri Dutta Sai Manga Bharadwaja Trust
 * Manual theme switching functionality
 * 
 * @version 1.0.0
 * @requires theme-compatibility.css
 */

class ThemeSwitcher {
    constructor() {
        this.currentTheme = this.detectInitialTheme();
        this.init();
    }

    init() {
        this.createThemeToggle();
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
    }

    /**
     * Detect initial theme based on user preference or system setting
     */
    detectInitialTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme-preference');
        if (savedTheme) {
            return savedTheme;
        }

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    /**
     * Create theme toggle button
     */
    createThemeToggle() {
        // Check if toggle already exists
        if (document.querySelector('.theme-toggle')) {
            return;
        }

        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle theme');
        toggle.innerHTML = `<i class="fas ${this.currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>`;
        
        document.body.appendChild(toggle);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Theme toggle click
        document.addEventListener('click', (e) => {
            if (e.target.closest('.theme-toggle')) {
                this.toggleTheme();
            }
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem('theme-preference')) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme(this.currentTheme);
                    this.updateToggleIcon();
                }
            });
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        this.updateToggleIcon();
        this.saveThemePreference();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: this.currentTheme }
        }));
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.classList.add('theme-transition');
        
        // Remove transition class after animation
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }

    /**
     * Update toggle button icon
     */
    updateToggleIcon() {
        const toggle = document.querySelector('.theme-toggle');
        const icon = toggle?.querySelector('i');
        
        if (icon) {
            icon.className = `fas ${this.currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}`;
        }
        
        if (toggle) {
            toggle.setAttribute('aria-label', 
                `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} theme`
            );
        }
    }

    /**
     * Save theme preference to localStorage
     */
    saveThemePreference() {
        localStorage.setItem('theme-preference', this.currentTheme);
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme programmatically
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            this.applyTheme(theme);
            this.updateToggleIcon();
            this.saveThemePreference();
        }
    }
}

// Initialize theme switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeSwitcher = new ThemeSwitcher();
});

// Export for global access
window.ThemeSwitcher = ThemeSwitcher;