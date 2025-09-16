/**
 * PRODUCTION Authentication JavaScript - Sai Seva Foundation
 * Complete authentication system with enhanced security and user experience
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class AuthenticationHandler {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.csrfToken = '';
        this.loginAttempts = 0;
        this.maxLoginAttempts = 3;
        this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
        
        this.init();
    }

    /**
     * Initialize authentication handler
     */
    init() {
        this.setupEventListeners();
        this.initializeCSRFToken();
        this.checkAuthStatus();
        this.setupPasswordStrengthMeter();
        this.setupFormSwitching();
        this.handleURLParameters();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Registration form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Forgot password form
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        // Reset password form
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        // Show/hide password toggles
        const passwordToggles = document.querySelectorAll('.password-toggle');
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });

        // Real-time validation
        this.setupRealTimeValidation();

        // Logout buttons
        const logoutBtns = document.querySelectorAll('.logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleLogout(e));
        });
    }

    /**
     * Handle login form submission
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        // Check if user is locked out
        if (this.isLockedOut()) {
            this.showNotification('Too many failed attempts. Please try again later.', 'error');
            return;
        }
        
        if (!this.validateForm(form)) {
            return;
        }
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            
            const data = {
                email: formData.get('email'),
                password: formData.get('password'),
                user_type: formData.get('user_type') || 'user',
                remember_me: formData.get('remember_me') === 'on',
                csrf_token: this.csrfToken
            };
            
            const response = await this.makeAPICall('/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify(data)
            });

            if (response.success) {
                // Reset login attempts
                this.loginAttempts = 0;
                this.clearLockout();
                
                // Track successful login
                this.trackEvent('login_success', { 
                    user_type: data.user_type,
                    remember_me: data.remember_me
                });
                
                // Show success message
                this.showNotification('Login successful! Redirecting...', 'success');
                
                // Redirect based on user type
                setTimeout(() => {
                    window.location.href = response.redirect_url || this.getRedirectURL(data.user_type);
                }, 1000);
                
            } else {
                this.handleLoginError(response.error);
            }

        } catch (error) {
            console.error('Login error:', error);
            this.handleLoginError(error.message || 'Login failed. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    /**
     * Handle registration form submission
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        if (!this.validateForm(form)) {
            return;
        }
        
        // Check password confirmation
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: password,
                confirm_password: confirmPassword,
                user_type: formData.get('user_type') || 'user',
                agree_terms: formData.get('agree_terms') === 'on',
                agree_privacy: formData.get('agree_privacy') === 'on',
                csrf_token: this.csrfToken
            };
            
            // Additional validation
            if (!data.agree_terms || !data.agree_privacy) {
                this.showNotification('Please agree to the terms and privacy policy', 'error');
                return;
            }
            
            const response = await this.makeAPICall('/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify(data)
            });

            if (response.success) {
                // Track successful registration
                this.trackEvent('registration_success', { 
                    user_type: data.user_type 
                });
                
                // Show success message
                this.showNotification('Account created successfully! You can now log in.', 'success');
                
                // Switch to login tab
                setTimeout(() => {
                    this.switchToLoginTab();
                    // Pre-fill email in login form
                    const loginEmailInput = document.getElementById('login_email');
                    if (loginEmailInput) {
                        loginEmailInput.value = data.email;
                    }
                }, 1000);
                
                // Reset form
                form.reset();
                
            } else {
                this.showNotification(response.error || 'Registration failed', 'error');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    /**
     * Handle forgot password form submission
     */
    async handleForgotPassword(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        if (!this.validateForm(form)) {
            return;
        }
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Reset Link...';
            
            const data = {
                email: formData.get('email'),
                csrf_token: this.csrfToken
            };
            
            const response = await this.makeAPICall('/auth.php?action=forgot_password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showNotification('Password reset link sent to your email', 'success');
                form.reset();
                
                // Track password reset request
                this.trackEvent('password_reset_requested', {
                    email: data.email
                });
            } else {
                this.showNotification(response.error || 'Failed to send reset link', 'error');
            }

        } catch (error) {
            console.error('Forgot password error:', error);
            this.showNotification(error.message || 'Failed to send reset link', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    /**
     * Handle reset password form submission
     */
    async handleResetPassword(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        if (!this.validateForm(form)) {
            return;
        }
        
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting Password...';
            
            const urlParams = new URLSearchParams(window.location.search);
            const resetToken = urlParams.get('token');
            
            if (!resetToken) {
                this.showNotification('Invalid reset link', 'error');
                return;
            }
            
            const data = {
                token: resetToken,
                password: password,
                confirm_password: confirmPassword,
                csrf_token: this.csrfToken
            };
            
            const response = await this.makeAPICall('/auth.php?action=reset_password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify(data)
            });

            if (response.success) {
                this.showNotification('Password reset successfully! You can now log in.', 'success');
                
                // Redirect to login page
                setTimeout(() => {
                    window.location.href = './login.html';
                }, 2000);
                
                // Track successful password reset
                this.trackEvent('password_reset_completed');
            } else {
                this.showNotification(response.error || 'Failed to reset password', 'error');
            }

        } catch (error) {
            console.error('Reset password error:', error);
            this.showNotification(error.message || 'Failed to reset password', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }

    /**
     * Handle logout
     */
    async handleLogout(e) {
        e.preventDefault();
        
        try {
            const response = await this.makeAPICall('/auth.php?action=logout', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': this.csrfToken
                }
            });

            if (response.success) {
                this.showNotification('Logged out successfully', 'success');
                
                // Track logout
                this.trackEvent('logout');
                
                // Clear any stored user data
                this.clearUserData();
                
                // Redirect to home page
                setTimeout(() => {
                    window.location.href = './index.html';
                }, 1000);
            }

        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout failed', 'error');
        }
    }

    /**
     * Handle login errors with lockout mechanism
     */
    handleLoginError(errorMessage) {
        this.loginAttempts++;
        
        if (this.loginAttempts >= this.maxLoginAttempts) {
            this.setLockout();
            this.showNotification(
                `Too many failed attempts. Account locked for 30 minutes.`,
                'error'
            );
        } else {
            const remainingAttempts = this.maxLoginAttempts - this.loginAttempts;
            this.showNotification(
                `${errorMessage} (${remainingAttempts} attempts remaining)`,
                'error'
            );
        }
        
        // Track failed login
        this.trackEvent('login_failed', {
            attempts: this.loginAttempts,
            locked_out: this.loginAttempts >= this.maxLoginAttempts
        });
    }

    /**
     * Check if user is currently locked out
     */
    isLockedOut() {
        const lockoutTime = localStorage.getItem('lockoutTime');
        if (!lockoutTime) return false;
        
        const lockoutExpiry = parseInt(lockoutTime) + this.lockoutDuration;
        const now = Date.now();
        
        if (now < lockoutExpiry) {
            return true;
        } else {
            this.clearLockout();
            return false;
        }
    }

    /**
     * Set lockout timestamp
     */
    setLockout() {
        localStorage.setItem('lockoutTime', Date.now().toString());
    }

    /**
     * Clear lockout
     */
    clearLockout() {
        localStorage.removeItem('lockoutTime');
        this.loginAttempts = 0;
    }

    /**
     * Switch between login/register tabs
     */
    switchTab(e) {
        e.preventDefault();
        
        const clickedTab = e.target;
        const targetTab = clickedTab.dataset.tab;
        
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.setAttribute('aria-hidden', 'true');
        });
        
        // Add active class to clicked tab and its content
        clickedTab.classList.add('active');
        clickedTab.setAttribute('aria-selected', 'true');
        
        const targetContent = document.getElementById(targetTab);
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.setAttribute('aria-hidden', 'false');
            
            // Focus first input in active tab
            const firstInput = targetContent.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
        
        // Track tab switch
        this.trackEvent('auth_tab_switch', { tab: targetTab });
    }

    /**
     * Switch to login tab programmatically
     */
    switchToLoginTab() {
        const loginTabBtn = document.querySelector('[data-tab="login"]');
        if (loginTabBtn) {
            loginTabBtn.click();
        }
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(e) {
        const toggle = e.target.closest('.password-toggle');
        const input = toggle.parentElement.querySelector('input');
        const icon = toggle.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            toggle.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            toggle.setAttribute('aria-label', 'Show password');
        }
    }

    /**
     * Setup password strength meter
     */
    setupPasswordStrengthMeter() {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        
        passwordInputs.forEach(input => {
            if (input.id === 'register_password' || input.id === 'reset_password') {
                input.addEventListener('input', (e) => {
                    this.updatePasswordStrength(e.target);
                });
            }
        });
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(input) {
        const password = input.value;
        let strengthScore = 0;
        let strengthText = '';
        let strengthClass = '';
        
        // Calculate strength
        if (password.length >= 8) strengthScore++;
        if (password.match(/[a-z]/)) strengthScore++;
        if (password.match(/[A-Z]/)) strengthScore++;
        if (password.match(/[0-9]/)) strengthScore++;
        if (password.match(/[^a-zA-Z0-9]/)) strengthScore++;
        
        // Determine strength level
        switch (strengthScore) {
            case 0:
            case 1:
                strengthText = 'Very Weak';
                strengthClass = 'very-weak';
                break;
            case 2:
                strengthText = 'Weak';
                strengthClass = 'weak';
                break;
            case 3:
                strengthText = 'Fair';
                strengthClass = 'fair';
                break;
            case 4:
                strengthText = 'Good';
                strengthClass = 'good';
                break;
            case 5:
                strengthText = 'Strong';
                strengthClass = 'strong';
                break;
        }
        
        // Update or create strength meter
        let strengthMeter = input.parentElement.querySelector('.password-strength');
        
        if (!strengthMeter && password.length > 0) {
            strengthMeter = document.createElement('div');
            strengthMeter.className = 'password-strength';
            strengthMeter.innerHTML = `
                <div class="strength-bar">
                    <div class="strength-progress"></div>
                </div>
                <div class="strength-text"></div>
            `;
            input.parentElement.appendChild(strengthMeter);
        }
        
        if (strengthMeter) {
            if (password.length === 0) {
                strengthMeter.remove();
            } else {
                const progressBar = strengthMeter.querySelector('.strength-progress');
                const strengthTextEl = strengthMeter.querySelector('.strength-text');
                
                progressBar.className = `strength-progress ${strengthClass}`;
                progressBar.style.width = `${(strengthScore / 5) * 100}%`;
                strengthTextEl.textContent = strengthText;
            }
        }
    }

    /**
     * Setup real-time form validation
     */
    setupRealTimeValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
                
                // Format phone number
                if (input.type === 'tel') {
                    input.addEventListener('input', (e) => this.formatPhoneNumber(e));
                }
            });
        });
    }

    /**
     * Validate entire form
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        let firstErrorField = null;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
                if (!firstErrorField) {
                    firstErrorField = input;
                }
            }
        });
        
        if (!isValid && firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (input.required && !value) {
            errorMessage = 'This field is required';
            isValid = false;
        }
        
        // Email validation
        else if (input.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                errorMessage = 'Please enter a valid email address';
                isValid = false;
            }
        }
        
        // Phone validation
        else if (input.type === 'tel' && value) {
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(value.replace(/\D/g, ''))) {
                errorMessage = 'Please enter a valid 10-digit phone number';
                isValid = false;
            }
        }
        
        // Password validation
        else if (input.type === 'password' && value && (input.id === 'register_password' || input.id === 'reset_password')) {
            if (value.length < 8) {
                errorMessage = 'Password must be at least 8 characters long';
                isValid = false;
            } else if (!this.isStrongPassword(value)) {
                errorMessage = 'Password must contain uppercase, lowercase, number, and special character';
                isValid = false;
            }
        }
        
        // Password confirmation
        else if (input.id === 'confirm_password' || input.id === 'reset_confirm_password') {
            const passwordField = input.form.querySelector('#register_password, #reset_password');
            if (passwordField && value !== passwordField.value) {
                errorMessage = 'Passwords do not match';
                isValid = false;
            }
        }
        
        // Name validation
        else if (input.id === 'register_name' && value) {
            if (value.length < 2) {
                errorMessage = 'Name must be at least 2 characters long';
                isValid = false;
            } else if (!/^[a-zA-Z\s\-'.]+$/.test(value)) {
                errorMessage = 'Name contains invalid characters';
                isValid = false;
            }
        }

        if (!isValid) {
            this.showFieldError(input, errorMessage);
        } else {
            this.clearFieldError(input);
        }

        return isValid;
    }

    /**
     * Check if password meets strength requirements
     */
    isStrongPassword(password) {
        return password.length >= 8 &&
               /[a-z]/.test(password) &&
               /[A-Z]/.test(password) &&
               /[0-9]/.test(password) &&
               /[^a-zA-Z0-9]/.test(password);
    }

    /**
     * Show field error
     */
    showFieldError(input, message) {
        input.classList.add('error');
        input.setAttribute('aria-invalid', 'true');
        
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.setAttribute('role', 'alert');
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        input.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error
     */
    clearFieldError(input) {
        input.classList.remove('error');
        input.removeAttribute('aria-invalid');
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    /**
     * Format phone number input
     */
    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        e.target.value = value;
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const response = await this.makeAPICall('/auth.php?action=check_session');
            
            if (response.authenticated) {
                this.handleAuthenticatedUser(response.user);
            } else {
                this.handleUnauthenticatedUser();
            }
        } catch (error) {
            console.error('Auth status check error:', error);
        }
    }

    /**
     * Handle authenticated user
     */
    handleAuthenticatedUser(user) {
        // Update UI for authenticated user
        const userInfo = document.querySelectorAll('.user-info');
        userInfo.forEach(info => {
            info.textContent = `Welcome, ${user.name}`;
        });
        
        // Show/hide appropriate elements
        const authRequiredElements = document.querySelectorAll('.auth-required');
        authRequiredElements.forEach(el => el.style.display = 'block');
        
        const noAuthElements = document.querySelectorAll('.no-auth');
        noAuthElements.forEach(el => el.style.display = 'none');
    }

    /**
     * Handle unauthenticated user
     */
    handleUnauthenticatedUser() {
        // Hide authenticated content
        const authRequiredElements = document.querySelectorAll('.auth-required');
        authRequiredElements.forEach(el => el.style.display = 'none');
        
        const noAuthElements = document.querySelectorAll('.no-auth');
        noAuthElements.forEach(el => el.style.display = 'block');
    }

    /**
     * Setup form switching animations
     */
    setupFormSwitching() {
        const forms = document.querySelectorAll('.tab-content');
        forms.forEach(form => {
            form.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        });
    }

    /**
     * Handle URL parameters
     */
    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Auto-switch to register tab if specified
        const tab = urlParams.get('tab');
        if (tab === 'register') {
            const registerTab = document.querySelector('[data-tab="register"]');
            if (registerTab) {
                registerTab.click();
            }
        }
        
        // Pre-fill email if provided
        const email = urlParams.get('email');
        if (email) {
            const emailInputs = document.querySelectorAll('input[type="email"]');
            emailInputs.forEach(input => {
                input.value = email;
            });
        }
    }

    /**
     * Get redirect URL based on user type
     */
    getRedirectURL(userType) {
        const redirectUrls = {
            'admin': './admin-dashboard.html',
            'volunteer': './volunteer-dashboard.html',
            'user': './index.html'
        };
        
        return redirectUrls[userType] || './index.html';
    }

    /**
     * Clear user data on logout
     */
    clearUserData() {
        // Clear any stored user-specific data
        const keysToRemove = ['donationDetails', 'userPreferences'];
        keysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
        });
    }

    /**
     * Initialize CSRF token
     */
    async initializeCSRFToken() {
        try {
            this.csrfToken = await this.getCSRFToken();
            const csrfInputs = document.querySelectorAll('input[name="csrf_token"]');
            csrfInputs.forEach(input => {
                input.value = this.csrfToken;
            });
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
        }
    }

    /**
     * Get CSRF token from API
     */
    async getCSRFToken() {
        try {
            const response = await fetch(`${this.apiURL}/auth.php?action=csrf_token`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.csrf_token || '';
            
        } catch (error) {
            console.error('CSRF token fetch error:', error);
            return '';
        }
    }

    /**
     * Make API call
     */
    async makeAPICall(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        const response = await fetch(`${this.apiURL}${endpoint}`, finalOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 5000) {
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <button class="notification-close" aria-label="Close notification" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    /**
     * Track authentication events
     */
    trackEvent(eventName, properties = {}) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, properties);
        }
        console.log('Auth event tracked:', eventName, properties);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authHandler = new AuthenticationHandler();
});

// Export for global access
window.AuthenticationHandler = AuthenticationHandler;