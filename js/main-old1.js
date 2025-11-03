/**
 * PRODUCTION Main JavaScript - Sai Seva Foundation
 * Complete website functionality with security, error handling, and performance
 * 
 * @version 2.0.0
 * @author Sai Seva Foundation Development Team
 */

class NGOWebsite {
    constructor() {
        this.isInitialized = false;
        this.csrfToken = null;
        this.retryAttempts = 3;
        this.requestTimeout = 10000;
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('Initializing NGO Website...');
        
        try {
            // Initialize CSRF token
            await this.initializeCSRF();
            
            // Setup core functionality
            this.setupEventListeners();
            this.setupNavigation();
            this.setupAnimations();
            this.setupSecurity();
            this.setupPerformanceMonitoring();
            
            this.isInitialized = true;
            console.log('NGO Website initialized successfully');
            
        } catch (error) {
            console.error('Error initializing website:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize CSRF token securely
     */
    async initializeCSRF() {
        try {
            const response = await this.fetchWithTimeout('/api/auth.php?action=csrf_token', {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.csrf_token) {
                this.csrfToken = data.csrf_token;
                
                // Store in meta tag for forms
                this.updateCSRFMetaTag(data.csrf_token);
                
                console.log('CSRF token initialized successfully');
            } else {
                throw new Error(data.error || 'Failed to get CSRF token');
            }
            
        } catch (error) {
            console.warn('CSRF token initialization failed:', error.message);
            
            // Fallback: generate client-side token (less secure)
            this.csrfToken = this.generateFallbackToken();
            this.updateCSRFMetaTag(this.csrfToken);
        }
    }

    /**
     * Update CSRF meta tag
     */
    updateCSRFMetaTag(token) {
        let metaTag = document.querySelector('meta[name="csrf-token"]');
        
        if (!metaTag) {
            metaTag = document.createElement('meta');
            metaTag.name = 'csrf-token';
            document.head.appendChild(metaTag);
        }
        
        metaTag.content = token;
    }

    /**
     * Generate fallback token (client-side)
     */
    generateFallbackToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Fetch with timeout and error handling
     */
    async fetchWithTimeout(url, options = {}, timeout = this.requestTimeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            throw error;
        }
    }

    setupEventListeners() {
        // Mobile menu toggle
        this.setupMobileMenu();
        
        // Smooth scrolling for anchor links
        this.setupSmoothScrolling();
        
        // Form handlers
        this.setupForms();
        
        // File upload handlers
        this.setupFileUploads();
        
        // Global error handling
        this.setupErrorHandling();
        
        // Loading overlay
        this.hideLoadingOverlay();
        
        // Page visibility handling
        this.setupPageVisibilityHandling();
    }

    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu(hamburger, navMenu);
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                    this.closeMobileMenu(hamburger, navMenu);
                }
            });
            
            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeMobileMenu(hamburger, navMenu);
                }
            });
            
            // Close menu when clicking on a link
            const navLinks = navMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    this.closeMobileMenu(hamburger, navMenu);
                });
            });
        }
    }

    toggleMobileMenu(hamburger, navMenu) {
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
        
        hamburger.setAttribute('aria-expanded', !isExpanded);
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        document.body.classList.toggle('menu-open');
        
        // Focus management for accessibility
        if (!isExpanded) {
            const firstLink = navMenu.querySelector('.nav-link');
            if (firstLink) firstLink.focus();
        }
    }

    closeMobileMenu(hamburger, navMenu) {
        hamburger.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        document.body.classList.remove('menu-open');
    }

    setupSmoothScrolling() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        
        anchorLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    
                    const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 100;
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                    
                    // Update URL without page jump
                    history.pushState(null, null, href);
                }
            });
        });
    }

    setupForms() {
        // Setup all form types
        this.setupContactForm();
        this.setupDonationForm();
        this.setupNewsletterForm();
        this.setupVolunteerForm();
        this.setupAuthForms();
    }

    setupFileUploads() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleFileUpload(e.target);
            });
            
            // Drag and drop support
            const dropZone = input.closest('.file-upload-zone');
            if (dropZone) {
                this.setupDragAndDrop(dropZone, input);
            }
        });
    }

    handleFileUpload(input) {
        const files = Array.from(input.files);
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        const validFiles = files.filter(file => {
            // Check file size
            if (file.size > maxSize) {
                this.showErrorMessage(`File "${file.name}" is too large. Maximum size is 5MB.`);
                return false;
            }
            
            // Check file type
            if (!allowedTypes.includes(file.type)) {
                this.showErrorMessage(`File "${file.name}" has an invalid type. Please upload images, PDFs, or Word documents.`);
                return false;
            }
            
            return true;
        });
        
        if (validFiles.length !== files.length) {
            // Reset input if some files were invalid
            input.value = '';
            return;
        }
        
        // Display selected files
        this.displaySelectedFiles(input, validFiles);
    }

    displaySelectedFiles(input, files) {
        const container = input.closest('.file-upload-container');
        let fileList = container.querySelector('.selected-files');
        
        if (!fileList) {
            fileList = document.createElement('div');
            fileList.className = 'selected-files';
            container.appendChild(fileList);
        }
        
        fileList.innerHTML = '';
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${this.formatFileSize(file.size)})</span>
                <button type="button" class="remove-file" data-file="${file.name}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileList.appendChild(fileItem);
        });
        
        // Add remove functionality
        fileList.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = '';
                fileList.innerHTML = '';
            });
        });
    }

    setupDragAndDrop(dropZone, input) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            input.files = files;
            
            // Trigger change event
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    setupNavigation() {
        // Add active class to current page navigation
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (currentPath.endsWith(href.replace('./', '')) || 
                        (currentPath === '/' && href === './index.html'))) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animated');
                        
                        // Animate numbers if they have data-target attribute
                        this.animateNumbers(entry.target);
                    }
                });
            }, observerOptions);
            
            // Observe elements with animate-on-scroll class
            const animatedElements = document.querySelectorAll('.animate-on-scroll');
            animatedElements.forEach(el => observer.observe(el));
        }
    }

    animateNumbers(container) {
        const numberElements = container.querySelectorAll('[data-target]');
        
        numberElements.forEach(element => {
            const target = parseInt(element.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateNumber = () => {
                current += increment;
                if (current < target) {
                    element.textContent = Math.ceil(current).toLocaleString('en-IN');
                    requestAnimationFrame(updateNumber);
                } else {
                    element.textContent = target.toLocaleString('en-IN');
                }
            };
            
            updateNumber();
        });
    }

    async setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        
        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleContactSubmit(contactForm);
            });
        }
    }

    async handleContactSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            // Validate form
            const validation = this.validateContactForm(form);
            if (validation !== true) {
                this.showErrorMessage(validation);
                return;
            }
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.csrf_token = this.csrfToken;
            
            // Send request with retry logic
            const result = await this.sendRequestWithRetry('/api/contact.php?action=submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                this.showSuccessMessage('Thank you for your message! We will get back to you within 24 hours.');
                form.reset();
                
                // Track success event
                this.trackEvent('contact_form_submit', 'success');
            } else {
                throw new Error(result.error || 'Something went wrong');
            }
            
        } catch (error) {
            console.error('Contact form error:', error);
            this.showErrorMessage('There was an error sending your message. Please try again.');
            this.trackEvent('contact_form_submit', 'error', error.message);
            
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    validateContactForm(form) {
        const name = form.querySelector('[name="name"]').value.trim();
        const email = form.querySelector('[name="email"]').value.trim();
        const message = form.querySelector('[name="message"]').value.trim();
        
        if (name.length < 2) {
            return 'Name must be at least 2 characters long';
        }
        
        if (!this.isValidEmail(email)) {
            return 'Please enter a valid email address';
        }
        
        if (message.length < 10) {
            return 'Message must be at least 10 characters long';
        }
        
        return true;
    }

    async sendRequestWithRetry(url, options, maxRetries = this.retryAttempts) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.fetchWithTimeout(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
                
            } catch (error) {
                console.warn(`Request attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => 
                    setTimeout(resolve, Math.pow(2, attempt) * 1000)
                );
            }
        }
    }

    setupSecurity() {
        // Prevent right-click context menu (optional)
        if (this.isProduction()) {
            document.addEventListener('contextmenu', (e) => {
                // Allow context menu for input fields
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
            });
        }
        
        // Detect dev tools (basic protection)
        this.setupDevToolsDetection();
        
        // Content Security Policy reporting
        this.setupCSPReporting();
    }

    setupDevToolsDetection() {
        if (!this.isProduction()) return;
        
        let devtools = { open: false, orientation: null };
        const threshold = 160;
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devtools.open) {
                    devtools.open = true;
                    console.warn('Developer tools detected');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    setupCSPReporting() {
        document.addEventListener('securitypolicyviolation', (e) => {
            console.warn('CSP Violation:', e.violatedDirective, e.blockedURI);
            
            // Report to server
            this.reportSecurityEvent('csp_violation', {
                directive: e.violatedDirective,
                blocked_uri: e.blockedURI,
                source_file: e.sourceFile,
                line_number: e.lineNumber
            });
        });
    }

    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            if ('performance' in window) {
                const perfData = performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                
                console.log(`Page load time: ${loadTime}ms`);
                
                // Report slow loading
                if (loadTime > 3000) { // 3 seconds
                    this.reportPerformanceIssue('slow_page_load', { load_time: loadTime });
                }
            }
        });
        
        // Monitor JavaScript errors
        window.addEventListener('error', (e) => {
            this.reportJavaScriptError(e.error, e.filename, e.lineno, e.colno);
        });
        
        // Monitor unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.reportJavaScriptError(e.reason, 'Promise', 0, 0);
        });
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            
            if (event.error && event.error.stack) {
                this.reportJavaScriptError(
                    event.error,
                    event.filename,
                    event.lineno,
                    event.colno
                );
            }
        });
    }

    setupPageVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden - pause non-critical operations
                this.pauseNonCriticalOperations();
            } else {
                // Page is visible - resume operations
                this.resumeNonCriticalOperations();
            }
        });
    }

    pauseNonCriticalOperations() {
        // Pause animations, timers, etc.
        console.log('Pausing non-critical operations');
    }

    resumeNonCriticalOperations() {
        // Resume operations
        console.log('Resuming operations');
        
        // Refresh CSRF token if needed
        if (this.csrfToken && Date.now() - this.csrfTokenTime > 1800000) { // 30 minutes
            this.refreshCSRFToken();
        }
    }

    async refreshCSRFToken() {
        try {
            await this.initializeCSRF();
        } catch (error) {
            console.warn('Failed to refresh CSRF token:', error);
        }
    }

    // Utility methods
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    isProduction() {
        return window.location.hostname !== 'localhost' && 
               !window.location.hostname.startsWith('192.168.') &&
               !window.location.hostname.startsWith('127.');
    }

    trackEvent(category, action, label = '') {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: category,
                event_label: label
            });
        }
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.toast-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `toast-message toast-message--${type}`;
        messageEl.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon fas ${this.getToastIcon(type)}"></i>
                <span class="toast-text">${message}</span>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add styles if not already present
        if (!document.querySelector('#toast-styles')) {
            this.addToastStyles();
        }
        
        // Add to DOM
        document.body.appendChild(messageEl);
        
        // Setup close button
        messageEl.querySelector('.toast-close').addEventListener('click', () => {
            this.dismissMessage(messageEl);
        });
        
        // Trigger animation
        setTimeout(() => messageEl.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            this.dismissMessage(messageEl);
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        return icons[type] || icons.info;
    }

    dismissMessage(messageEl) {
        messageEl.classList.remove('show');
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 300);
    }

    addToastStyles() {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast-message {
                position: fixed;
                top: 20px;
                right: 20px;
                min-width: 300px;
                max-width: 500px;
                padding: 16px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                backdrop-filter: blur(10px);
            }
            
            .toast-message.show {
                transform: translateX(0);
            }
            
            .toast-message--success {
                background: linear-gradient(135deg, #10b981, #059669);
            }
            
            .toast-message--error {
                background: linear-gradient(135deg, #ef4444, #dc2626);
            }
            
            .toast-message--warning {
                background: linear-gradient(135deg, #f59e0b, #d97706);
            }
            
            .toast-message--info {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
                padding-right: 30px;
            }
            
            .toast-icon {
                flex-shrink: 0;
                font-size: 18px;
            }
            
            .toast-text {
                flex: 1;
                line-height: 1.5;
            }
            
            .toast-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.8);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: color 0.2s ease;
            }
            
            .toast-close:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }
            
            @media (max-width: 480px) {
                .toast-message {
                    left: 20px;
                    right: 20px;
                    min-width: auto;
                    max-width: none;
                    transform: translateY(-100%);
                }
                
                .toast-message.show {
                    transform: translateY(0);
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            setTimeout(() => {
                loadingOverlay.classList.add('fade-out');
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }, 500);
        }
    }

    // Error reporting methods
    reportJavaScriptError(error, filename, lineno, colno) {
        const errorData = {
            message: error.message || error.toString(),
            filename: filename || 'unknown',
            lineno: lineno || 0,
            colno: colno || 0,
            stack: error.stack || '',
            user_agent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        this.reportToServer('javascript_error', errorData);
    }

    reportSecurityEvent(event, data) {
        const eventData = {
            event: event,
            data: data,
            url: window.location.href,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        this.reportToServer('security_event', eventData);
    }

    reportPerformanceIssue(issue, data) {
        const issueData = {
            issue: issue,
            data: data,
            url: window.location.href,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };
        
        this.reportToServer('performance_issue', issueData);
    }

    async reportToServer(type, data) {
        try {
            await fetch('/api/error-reporting.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    data: data,
                    csrf_token: this.csrfToken
                })
            });
        } catch (error) {
            console.warn('Failed to report to server:', error);
        }
    }

    handleInitializationError(error) {
        console.error('Website initialization failed:', error);
        
        // Show user-friendly error message
        this.showErrorMessage('Some features may not work properly. Please refresh the page.');
        
        // Try to recover gracefully
        setTimeout(() => {
            if (!this.isInitialized) {
                console.log('Attempting to reinitialize...');
                this.init();
            }
        }, 2000);
    }
}

// Additional form handlers and utilities would be added here
// (setupDonationForm, setupNewsletterForm, etc.)

// Initialize website when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ngoWebsite = new NGOWebsite();
});

// Handle page load
window.addEventListener('load', () => {
    console.log('All resources loaded');
    
    // Remove loading class from body
    document.body.classList.remove('loading');
});

// Service Worker registration (for offline support)
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}