/**
 * LOGIN PAGE FIX - Sai Seva Foundation
 * Complete fix for login/register tab switching and authentication issues
 * 
 * @version 2.0.0
 * @author Sai Seva Foundation Development Team
 */

// Login Page Manager Class
class LoginPageManager {
    constructor() {
        this.currentTab = 'login';
        this.csrfToken = null;
        this.init();
    }

    init() {
        console.log('Initializing Login Page Manager...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupLoginPage();
            });
        } else {
            this.setupLoginPage();
        }
    }

    setupLoginPage() {
        try {
            // Initialize CSRF token
            this.initializeCSRF();
            
            // Setup tab switching
            this.setupTabSwitching();
            
            // Setup form handlers
            this.setupFormHandlers();
            
            // Setup validation
            this.setupFormValidation();
            
            console.log('Login page setup completed successfully');
            
        } catch (error) {
            console.error('Error setting up login page:', error);
        }
    }

    async initializeCSRF() {
        try {
            const response = await fetch('./api/auth.php?action=csrf_token');
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.csrf_token) {
                    this.csrfToken = data.csrf_token;
                    console.log('CSRF token initialized for login');
                }
            }
        } catch (error) {
            console.warn('CSRF token initialization failed:', error);
            // Generate fallback token
            this.csrfToken = this.generateFallbackToken();
        }
    }

    generateFallbackToken() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    setupTabSwitching() {
        // Get tab elements
        const loginTab = document.querySelector('.login-tab');
        const registerTab = document.querySelector('.register-tab');
        const loginForm = document.querySelector('.login-form');
        const registerForm = document.querySelector('.register-form');

        // Alternative selectors in case the above don't exist
        const loginTabAlt = document.querySelector('[data-tab="login"]') || document.getElementById('login-tab');
        const registerTabAlt = document.querySelector('[data-tab="register"]') || document.getElementById('register-tab');
        const loginFormAlt = document.querySelector('#loginForm') || document.querySelector('[data-form="login"]');
        const registerFormAlt = document.querySelector('#registerForm') || document.querySelector('[data-form="register"]');

        // Use found elements
        const finalLoginTab = loginTab || loginTabAlt;
        const finalRegisterTab = registerTab || registerTabAlt;
        const finalLoginForm = loginForm || loginFormAlt;
        const finalRegisterForm = registerForm || registerFormAlt;

        if (!finalLoginTab || !finalRegisterTab) {
            console.warn('Login/Register tabs not found. Creating fallback handlers...');
            this.createFallbackTabHandlers();
            return;
        }

        // Clear any existing event listeners
        finalLoginTab.replaceWith(finalLoginTab.cloneNode(true));
        finalRegisterTab.replaceWith(finalRegisterTab.cloneNode(true));

        // Get fresh references after cloning
        const loginTabFresh = document.querySelector('.login-tab') || document.querySelector('[data-tab="login"]') || document.getElementById('login-tab');
        const registerTabFresh = document.querySelector('.register-tab') || document.querySelector('[data-tab="register"]') || document.getElementById('register-tab');

        // Add click event listeners
        if (loginTabFresh) {
            loginTabFresh.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showLoginTab();
                console.log('Switched to login tab');
            });
        }

        if (registerTabFresh) {
            registerTabFresh.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showRegisterTab();
                console.log('Switched to register tab');
            });
        }

        // Set initial state
        this.showLoginTab();

        console.log('Tab switching setup completed');
    }

    createFallbackTabHandlers() {
        // Create handlers for common tab patterns
        const allTabButtons = document.querySelectorAll('button, a, .tab, [role="tab"]');
        
        allTabButtons.forEach(button => {
            const text = button.textContent.toLowerCase().trim();
            const classes = button.className.toLowerCase();
            const id = button.id.toLowerCase();

            // Check if this looks like a login tab
            if (text.includes('login') || text.includes('sign in') || 
                classes.includes('login') || id.includes('login')) {
                
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showLoginTab();
                });
            }

            // Check if this looks like a register tab
            if (text.includes('register') || text.includes('sign up') || text.includes('signup') ||
                classes.includes('register') || id.includes('register') || id.includes('signup')) {
                
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showRegisterTab();
                });
            }
        });
    }

    showLoginTab() {
        // Remove active class from all tabs
        const allTabs = document.querySelectorAll('.tab, .login-tab, .register-tab, [data-tab], [role="tab"]');
        allTabs.forEach(tab => {
            tab.classList.remove('active', 'selected', 'current');
        });

        // Hide all forms
        const allForms = document.querySelectorAll('.login-form, .register-form, #loginForm, #registerForm, [data-form]');
        allForms.forEach(form => {
            form.style.display = 'none';
            form.classList.remove('active', 'show');
        });

        // Show login tab and form
        const loginTab = document.querySelector('.login-tab') || document.querySelector('[data-tab="login"]') || document.getElementById('login-tab');
        const loginForm = document.querySelector('.login-form') || document.querySelector('#loginForm') || document.querySelector('[data-form="login"]');

        if (loginTab) {
            loginTab.classList.add('active', 'selected', 'current');
        }

        if (loginForm) {
            loginForm.style.display = 'block';
            loginForm.classList.add('active', 'show');
        }

        this.currentTab = 'login';
        this.updateTabStyles();
    }

    showRegisterTab() {
        // Remove active class from all tabs
        const allTabs = document.querySelectorAll('.tab, .login-tab, .register-tab, [data-tab], [role="tab"]');
        allTabs.forEach(tab => {
            tab.classList.remove('active', 'selected', 'current');
        });

        // Hide all forms
        const allForms = document.querySelectorAll('.login-form, .register-form, #loginForm, #registerForm, [data-form]');
        allForms.forEach(form => {
            form.style.display = 'none';
            form.classList.remove('active', 'show');
        });

        // Show register tab and form
        const registerTab = document.querySelector('.register-tab') || document.querySelector('[data-tab="register"]') || document.getElementById('register-tab');
        const registerForm = document.querySelector('.register-form') || document.querySelector('#registerForm') || document.querySelector('[data-form="register"]');

        if (registerTab) {
            registerTab.classList.add('active', 'selected', 'current');
        }

        if (registerForm) {
            registerForm.style.display = 'block';
            registerForm.classList.add('active', 'show');
        }

        this.currentTab = 'register';
        this.updateTabStyles();
    }

    updateTabStyles() {
        // Add CSS for active tabs if not present
        if (!document.querySelector('#login-tab-styles')) {
            const style = document.createElement('style');
            style.id = 'login-tab-styles';
            style.textContent = `
                .tab.active, .login-tab.active, .register-tab.active,
                [data-tab].active, [role="tab"].active {
                    background-color: var(--color-brand-primary, #21808d) !important;
                    color: white !important;
                    border-bottom: 2px solid var(--color-brand-primary, #21808d) !important;
                }
                
                .login-form, .register-form, #loginForm, #registerForm, [data-form] {
                    transition: all 0.3s ease;
                }
                
                .login-form.active, .register-form.active, 
                #loginForm.show, #registerForm.show, [data-form].show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .login-form:not(.active), .register-form:not(.active) {
                    opacity: 0;
                    transform: translateY(10px);
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupFormHandlers() {
        // Setup login form
        const loginForm = document.querySelector('#loginForm') || document.querySelector('.login-form form') || document.querySelector('form[data-form="login"]');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(loginForm);
            });
        }

        // Setup register form
        const registerForm = document.querySelector('#registerForm') || document.querySelector('.register-form form') || document.querySelector('form[data-form="register"]');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(registerForm);
            });
        }

        console.log('Form handlers setup completed');
    }

    async handleLogin(form) {
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.submit-btn') || form.querySelector('input[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent || submitBtn.value : '';

        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                if (submitBtn.textContent !== undefined) {
                    submitBtn.textContent = 'Signing In...';
                } else {
                    submitBtn.value = 'Signing In...';
                }
            }

            // Get form data
            const formData = new FormData(form);
            const data = {
                email: formData.get('email') || formData.get('username'),
                password: formData.get('password'),
                user_type: formData.get('user_type') || 'user',
                csrf_token: this.csrfToken
            };

            // Validate data
            if (!data.email || !data.password) {
                throw new Error('Please enter both email and password');
            }

            console.log('Attempting login for:', data.email);

            // Send login request
            const response = await fetch('./api/auth.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Login response:', result);

            if (result.success) {
                this.showMessage('Login successful! Redirecting...', 'success');
                
                // Redirect after success
                setTimeout(() => {
                    if (result.redirect_url) {
                        window.location.href = result.redirect_url;
                    } else {
                        window.location.href = './dashboard.html';
                    }
                }, 1000);

            } else {
                throw new Error(result.error || 'Login failed');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(error.message || 'Login failed. Please try again.', 'error');

        } finally {
            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                if (submitBtn.textContent !== undefined) {
                    submitBtn.textContent = originalText || 'Sign In';
                } else {
                    submitBtn.value = originalText || 'Sign In';
                }
            }
        }
    }

    async handleRegister(form) {
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.submit-btn') || form.querySelector('input[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent || submitBtn.value : '';

        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                if (submitBtn.textContent !== undefined) {
                    submitBtn.textContent = 'Creating Account...';
                } else {
                    submitBtn.value = 'Creating Account...';
                }
            }

            // Get form data
            const formData = new FormData(form);
            const data = {
                name: formData.get('name') || formData.get('fullname'),
                email: formData.get('email'),
                password: formData.get('password'),
                confirm_password: formData.get('confirm_password') || formData.get('confirmPassword'),
                user_type: formData.get('user_type') || 'user',
                csrf_token: this.csrfToken
            };

            console.log('Attempting registration for:', data.email);

            // Send registration request
            const response = await fetch('./api/auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log('Registration response:', result);

            if (result.success) {
                this.showMessage('Registration successful! You can now log in.', 'success');
                form.reset();
                
                // Switch to login tab after successful registration
                setTimeout(() => {
                    this.showLoginTab();
                }, 1500);

            } else {
                throw new Error(result.error || 'Registration failed');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showMessage(error.message || 'Registration failed. Please try again.', 'error');

        } finally {
            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                if (submitBtn.textContent !== undefined) {
                    submitBtn.textContent = originalText || 'Create Account';
                } else {
                    submitBtn.value = originalText || 'Create Account';
                }
            }
        }
    }

    setupFormValidation() {
        // Real-time validation for email fields
        const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateEmail(input);
            });
        });

        // Password validation
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input.name === 'password') {
                input.addEventListener('blur', () => {
                    this.validatePassword(input);
                });
            }
        });

        // Confirm password validation
        const confirmPasswordInput = document.querySelector('input[name="confirm_password"], input[name="confirmPassword"]');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('blur', () => {
                this.validateConfirmPassword(confirmPasswordInput);
            });
        }
    }

    validateEmail(input) {
        const email = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.setInputError(input, 'Email is required');
            return false;
        } else if (!emailRegex.test(email)) {
            this.setInputError(input, 'Please enter a valid email address');
            return false;
        } else {
            this.clearInputError(input);
            return true;
        }
    }

    validatePassword(input) {
        const password = input.value;
        
        if (!password) {
            this.setInputError(input, 'Password is required');
            return false;
        } else if (password.length < 6) {
            this.setInputError(input, 'Password must be at least 6 characters long');
            return false;
        } else {
            this.clearInputError(input);
            return true;
        }
    }

    validateConfirmPassword(input) {
        const confirmPassword = input.value;
        const passwordInput = document.querySelector('input[name="password"]');
        const password = passwordInput ? passwordInput.value : '';
        
        if (!confirmPassword) {
            this.setInputError(input, 'Please confirm your password');
            return false;
        } else if (confirmPassword !== password) {
            this.setInputError(input, 'Passwords do not match');
            return false;
        } else {
            this.clearInputError(input);
            return true;
        }
    }

    setInputError(input, message) {
        // Remove existing error
        this.clearInputError(input);
        
        // Add error class
        input.classList.add('error', 'is-invalid');
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // Insert after input
        input.parentNode.insertBefore(errorElement, input.nextSibling);
    }

    clearInputError(input) {
        // Remove error class
        input.classList.remove('error', 'is-invalid');
        
        // Remove error message
        const errorElement = input.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.login-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `login-message login-message--${type}`;
        messageEl.textContent = message;
        
        // Add to page
        const loginContainer = document.querySelector('.login-container') || document.querySelector('.auth-container') || document.body;
        loginContainer.insertBefore(messageEl, loginContainer.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
        
        // Add styles if not present
        this.addMessageStyles();
    }

    addMessageStyles() {
        if (document.querySelector('#login-message-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'login-message-styles';
        style.textContent = `
            .login-message {
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 16px;
                font-weight: 500;
                text-align: center;
            }
            
            .login-message--success {
                background-color: #d1fae5;
                color: #065f46;
                border: 1px solid #a7f3d0;
            }
            
            .login-message--error {
                background-color: #fee2e2;
                color: #991b1b;
                border: 1px solid #fca5a5;
            }
            
            .login-message--info {
                background-color: #dbeafe;
                color: #1e40af;
                border: 1px solid #93c5fd;
            }
            
            .error-message {
                color: #dc2626;
                font-size: 14px;
                margin-top: 4px;
            }
            
            input.error, input.is-invalid {
                border-color: #dc2626 !important;
                box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize login page manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.loginPageManager = new LoginPageManager();
    });
} else {
    window.loginPageManager = new LoginPageManager();
}

console.log('Login page script loaded successfully');