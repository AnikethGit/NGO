/**
 * ENHANCED AUTHENTICATION SYSTEM - Sri Dutta Sai Manga Bharadwaja Trust
 * Comprehensive login/registration fixes with smooth UX
 * 
 * @version 2.1.0 - FIXED: Action parameter routing
 * @priority HIGH - Fixes choppy login and registration form issues
 */

class EnhancedAuthSystem {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.csrfToken = '';
        this.loginAttempts = 0;
        this.maxAttempts = 3;
        this.lockoutTime = 30 * 60 * 1000; // 30 minutes
        
        this.init();
    }

    /**
     * Initialize authentication system
     */
    async init() {
        await this.initializeCSRFToken();
        this.setupEventListeners();
        this.fixFormDisplay();
        this.setupFormValidation();
        this.setupPasswordFeatures();
        this.setupTabSwitching();
        this.checkAuthStatus();
    }

    /**
     * Fix form display issues
     */
    fixFormDisplay() {
        // Ensure both forms are properly structured
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        if (loginTab && registerTab) {
            // Reset display states
            loginTab.style.display = 'block';
            loginTab.classList.add('tab-content', 'active');
            
            registerTab.style.display = 'none';
            registerTab.classList.add('tab-content');
            registerTab.classList.remove('active');
            
            // Ensure tab buttons work
            tabButtons.forEach(btn => {
                if (btn.dataset.tab === 'login') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        // Add smooth transition styles
        this.addTransitionStyles();
    }

    /**
     * Add CSS transitions for smooth animations
     */
    addTransitionStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tab-content {
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                pointer-events: none;
            }
            .tab-content.active {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }
            .tab-btn {
                transition: all 0.3s ease;
            }
            .form-group {
                margin-bottom: 1.5rem;
            }
            .error-message {
                color: var(--color-error);
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: flex;
                align-items: center;
                gap: 0.25rem;
                animation: slideIn 0.3s ease;
            }
            .form-group input.error,
            .form-group select.error {
                border-color: var(--color-error) !important;
                box-shadow: 0 0 0 3px rgba(var(--color-error-rgb), 0.1) !important;
            }
            .success-message {
                background: rgba(var(--color-success-rgb), 0.1);
                border: 1px solid rgba(var(--color-success-rgb), 0.2);
                color: var(--color-success);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .loading-btn {
                opacity: 0.7;
                pointer-events: none;
            }
            .loading-btn .fa-spinner {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });
        
        // Password toggles
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => this.togglePasswordVisibility(e));
        });
        
        // Real-time validation
        document.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
        
        // Phone number formatting
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(input => {
            input.addEventListener('input', (e) => this.formatPhoneNumber(e));
        });
    }

    /**
     * Enhanced tab switching
     */
    switchTab(e) {
        e.preventDefault();
        
        const clickedBtn = e.target.closest('.tab-btn');
        const targetTab = clickedBtn.dataset.tab;
        
        if (!targetTab) return;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');
        
        // Update tab content with animation
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        const targetContent = document.getElementById(targetTab + '-tab');
        if (targetContent) {
            targetContent.style.display = 'block';
            
            // Trigger reflow for animation
            targetContent.offsetHeight;
            
            setTimeout(() => {
                targetContent.classList.add('active');
                
                // Focus first input
                const firstInput = targetContent.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 50);
        }
    }

    /**
     * Handle login submission - FIXED VERSION
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Check lockout
        if (this.isLockedOut()) {
            this.showNotification('Too many failed attempts. Please try again later.', 'error');
            return;
        }
        
        if (!this.validateForm(form)) {
            return;
        }
        
        try {
            this.setLoadingState(submitBtn, 'Signing In...');
            
            const formData = new FormData(form);
            const data = {
                email: formData.get('email'),
                password: formData.get('password'),
                user_type: formData.get('user_type') || 'user',
                remember_me: formData.get('remember_me') === 'on',
                csrf_token: this.csrfToken
            };
            
            // FIXED: Send action as query parameter
            const response = await fetch(`${this.apiURL}/auth.php?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const responseData = await response.json();
            
            if (responseData.success) {
                this.loginAttempts = 0;
                this.clearLockout();
                
                this.showNotification('Login successful! Redirecting...', 'success');
                
                // Smooth redirect
                setTimeout(() => {
                    window.location.href = responseData.redirect_url || this.getRedirectURL(data.user_type);
                }, 1500);
            } else {
                this.handleLoginFailure(responseData.error);
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleLoginFailure(error.message || 'Login failed. Please try again.');
        } finally {
            this.clearLoadingState(submitBtn, originalText);
        }
    }

    /**
     * Handle registration submission - FIXED VERSION
     */
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        if (!this.validateForm(form)) {
            return;
        }
        
        // Password confirmation check
        const password = form.querySelector('#register_password').value;
        const confirmPassword = form.querySelector('#confirm_password').value;
        
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            this.setLoadingState(submitBtn, 'Creating Account...');
            
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: password,
                confirm_password: confirmPassword,
                user_type: formData.get('user_type') || 'user',
                newsletter: formData.get('newsletter') === '1',
                csrf_token: this.csrfToken
            };
            
            // FIXED: Send action as query parameter
            const response = await fetch(`${this.apiURL}/auth.php?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const responseData = await response.json();
            
            if (responseData.success) {
                this.showNotification('Registration successful! You can now log in.', 'success');
                
                // Reset form and switch to login
                form.reset();
                
                setTimeout(() => {
                    this.switchToLogin(data.email);
                }, 2000);
            } else {
                this.showNotification(responseData.error || 'Registration failed', 'error');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification(error.message || 'Registration failed. Please try again.', 'error');
        } finally {
            this.clearLoadingState(submitBtn, originalText);
        }
    }

    /**
     * Switch to login tab and pre-fill email
     */
    switchToLogin(email = '') {
        const loginTabBtn = document.querySelector('[data-tab="login"]');
        if (loginTabBtn) {
            loginTabBtn.click();
            
            if (email) {
                setTimeout(() => {
                    const loginEmailInput = document.getElementById('login_email');
                    if (loginEmailInput) {
                        loginEmailInput.value = email;
                    }
                }, 300);
            }
        }
    }

    /**
     * Comprehensive form validation
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
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
        
        // Additional validations for registration
        if (form.id === 'registerForm') {
            const password = form.querySelector('#register_password').value;
            const confirmPassword = form.querySelector('#confirm_password').value;
            const termsCheckbox = form.querySelector('#terms_agreement');
            
            if (password !== confirmPassword) {
                this.showFieldError(form.querySelector('#confirm_password'), 'Passwords do not match');
                isValid = false;
            }
            
            if (termsCheckbox && !termsCheckbox.checked) {
                this.showNotification('Please agree to the terms and conditions', 'error');
                isValid = false;
            }
        }
        
        if (!isValid && firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
        }
        
        return isValid;
    }

    /**
     * Enhanced field validation
     */
    validateField(input) {
        const value = input.value.trim();
        let isValid = true;
        let message = '';
        
        // Required validation
        if (input.required && !value) {
            message = 'This field is required';
            isValid = false;
        }
        // Email validation
        else if (input.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                message = 'Please enter a valid email address';
                isValid = false;
            }
        }
        // Phone validation
        else if (input.type === 'tel' && value) {
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(value.replace(/\D/g, ''))) {
                message = 'Please enter a valid 10-digit phone number';
                isValid = false;
            }
        }
        // Password validation
        else if (input.type === 'password' && value && input.id === 'register_password') {
            if (value.length < 6) {
                message = 'Password must be at least 6 characters long';
                isValid = false;
            }
        }
        // Name validation
        else if (input.id === 'register_name' && value) {
            if (value.length < 2) {
                message = 'Name must be at least 2 characters long';
                isValid = false;
            } else if (!/^[a-zA-Z\s\-'.]+$/.test(value)) {
                message = 'Name contains invalid characters';
                isValid = false;
            }
        }
        
        if (!isValid) {
            this.showFieldError(input, message);
        } else {
            this.clearFieldError(input);
        }
        
        return isValid;
    }

    /**
     * Show field error with animation
     */
    showFieldError(input, message) {
        input.classList.add('error');
        
        // Remove existing error
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        input.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error
     */
    clearFieldError(input) {
        input.classList.remove('error');
        const errorDiv = input.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * Setup password features
     */
    setupPasswordFeatures() {
        const passwordInput = document.getElementById('register_password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
        
        // Password confirmation matching
        const confirmPasswordInput = document.getElementById('confirm_password');
        if (confirmPasswordInput && passwordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.checkPasswordMatch();
            });
        }
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(password) {
        const strengthMeter = document.querySelector('.password-strength');
        if (!strengthMeter) return;
        
        let strength = 0;
        
        if (password.length >= 6) strength++;
        if (password.match(/[a-z]/)) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        
        const strengthTexts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthClasses = ['very-weak', 'weak', 'fair', 'good', 'strong'];
        
        const strengthText = strengthTexts[Math.min(strength, 4)];
        const strengthClass = strengthClasses[Math.min(strength, 4)];
        
        const strengthFill = strengthMeter.querySelector('.strength-fill');
        const strengthLabel = strengthMeter.querySelector('#strength-level');
        
        if (strengthFill) {
            strengthFill.style.width = `${(strength / 5) * 100}%`;
            strengthFill.className = `strength-fill ${strengthClass}`;
        }
        
        if (strengthLabel) {
            strengthLabel.textContent = strengthText;
        }
    }

    /**
     * Check password confirmation match
     */
    checkPasswordMatch() {
        const password = document.getElementById('register_password')?.value;
        const confirmPassword = document.getElementById('confirm_password')?.value;
        const matchIndicator = document.querySelector('.password-match');
        
        if (matchIndicator && confirmPassword) {
            const checkIcon = matchIndicator.querySelector('.fa-check');
            const timesIcon = matchIndicator.querySelector('.fa-times');
            
            if (password === confirmPassword) {
                checkIcon.style.display = 'inline';
                timesIcon.style.display = 'none';
                checkIcon.style.color = 'var(--color-success)';
            } else {
                checkIcon.style.display = 'none';
                timesIcon.style.display = 'inline';
                timesIcon.style.color = 'var(--color-error)';
            }
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
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
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
     * Handle login failure with lockout
     */
    handleLoginFailure(error) {
        this.loginAttempts++;
        
        if (this.loginAttempts >= this.maxAttempts) {
            this.setLockout();
            this.showNotification('Too many failed attempts. Account locked for 30 minutes.', 'error');
        } else {
            const remaining = this.maxAttempts - this.loginAttempts;
            this.showNotification(`${error} (${remaining} attempts remaining)`, 'error');
        }
    }

    /**
     * Set loading state for button
     */
    setLoadingState(button, text) {
        button.disabled = true;
        button.classList.add('loading-btn');
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }

    /**
     * Clear loading state for button
     */
    clearLoadingState(button, originalText) {
        button.disabled = false;
        button.classList.remove('loading-btn');
        button.innerHTML = originalText;
    }

    /**
     * Check if user is locked out
     */
    isLockedOut() {
        const lockoutTime = localStorage.getItem('auth_lockout');
        if (!lockoutTime) return false;
        
        const lockoutExpiry = parseInt(lockoutTime) + this.lockoutTime;
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
        localStorage.setItem('auth_lockout', Date.now().toString());
    }

    /**
     * Clear lockout
     */
    clearLockout() {
        localStorage.removeItem('auth_lockout');
        this.loginAttempts = 0;
    }

    /**
     * Get redirect URL based on user type
     */
    getRedirectURL(userType) {
        const redirectUrls = {
            'admin': './admin-dashboard.html',
            'volunteer': './volunteer-dashboard.html',
            'user': './donor-dashboard.html'
        };
        
        return redirectUrls[userType] || './index.html';
    }

    /**
     * Initialize CSRF token - FIXED VERSION
     */
    async initializeCSRFToken() {
        try {
            // FIXED: Use query parameter for action
            const response = await fetch(`${this.apiURL}/auth.php?action=csrf_token`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.csrf_token) {
                this.csrfToken = data.csrf_token;
                
                // Update all CSRF inputs
                document.querySelectorAll('input[name="csrf_token"]').forEach(input => {
                    input.value = this.csrfToken;
                });
            } else {
                throw new Error('Invalid CSRF token response');
            }
            
        } catch (error) {
            console.error('CSRF token initialization failed:', error);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.auth-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            font-family: var(--font-family-base);
            ${type === 'success' ? 'background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #059669;' : ''}
            ${type === 'error' ? 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #dc2626;' : ''}
            ${type === 'info' ? 'background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #2563eb;' : ''}
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        // Add animation styles if not exists
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    margin-left: auto;
                    padding: 0;
                    line-height: 1;
                    opacity: 0.7;
                    color: inherit;
                }
                .notification-close:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    /**
     * Check authentication status - FIXED VERSION
     */
    async checkAuthStatus() {
        try {
            // FIXED: Use query parameter for action
            const response = await fetch(`${this.apiURL}/auth.php?action=check_session`);
            const data = await response.json();
            
            if (data.authenticated) {
                // User is already logged in, redirect to appropriate dashboard
                window.location.href = this.getRedirectURL(data.user.user_type);
            }
        } catch (error) {
            // Not authenticated, stay on login page
            console.log('User not authenticated');
        }
    }

    /**
     * Setup tab switching
     */
    setupTabSwitching() {
        // Already handled in setupEventListeners
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedAuth = new EnhancedAuthSystem();
});

// Export for global access
window.EnhancedAuthSystem = EnhancedAuthSystem;