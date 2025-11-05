/**
 * DEBUG AUTH SYSTEM - Sri Dutta Sai Manga Bharadwaja Trust
 * Simplified authentication with enhanced debugging for troubleshooting
 * 
 * @version DEBUG-1.1 - FIXED: Action parameter in URL
 * @priority CRITICAL - Fixes non-working login/registration
 */

class DebugAuthSystem {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api/auth-debug.php';
        this.csrfToken = '';
        this.debugMode = true;
        
        this.init();
    }

    /**
     * Initialize debug auth system
     */
    async init() {
        this.debugLog('🚀 Debug Auth System Initializing...');
        
        try {
            await this.testAPIConnection();
            await this.initializeCSRFToken();
            this.setupEventListeners();
            this.fixFormDisplay();
            this.setupFormValidation();
            this.setupTabSwitching();
            
            this.debugLog('✅ Debug Auth System Initialized Successfully');
            this.showDebugNotification('Debug mode active. Check console for detailed logs.', 'info');
            
        } catch (error) {
            this.debugLog('❌ Initialization failed:', error);
            this.showDebugNotification('Auth system initialization failed: ' + error.message, 'error');
        }
    }

    /**
     * Test API connection
     */
    async testAPIConnection() {
        this.debugLog('🔍 Testing API connection...');
        
        try {
            const response = await fetch(`${this.apiURL}?action=test`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            this.debugLog('API Response Status:', response.status);
            this.debugLog('API Response Headers:', Object.fromEntries(response.headers.entries()));
            
            const data = await response.json();
            this.debugLog('API Test Response:', data);
            
            if (!data.success) {
                throw new Error('API test failed: ' + data.error);
            }
            
            this.showDebugNotification('✅ API connection working', 'success');
            
        } catch (error) {
            this.debugLog('❌ API connection failed:', error);
            throw new Error('Cannot connect to authentication API: ' + error.message);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.debugLog('🎧 Setting up event listeners...');
        
        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.debugLog('📝 Login form submitted');
                this.handleLogin(e);
            });
            this.debugLog('✅ Login form listener attached');
        } else {
            this.debugLog('⚠️ Login form not found');
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.debugLog('📝 Register form submitted');
                this.handleRegister(e);
            });
            this.debugLog('✅ Register form listener attached');
        } else {
            this.debugLog('⚠️ Register form not found');
        }
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                this.debugLog(`🔄 Tab ${index} clicked:`, btn.dataset.tab);
                this.switchTab(e);
            });
        });
    }

    /**
     * Initialize CSRF token with debugging
     */
    async initializeCSRFToken() {
        this.debugLog('🔐 Initializing CSRF token...');
        
        try {
            const response = await fetch(`${this.apiURL}?action=csrf_token`);
            
            this.debugLog('CSRF Response Status:', response.status);
            this.debugLog('CSRF Response Headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.debugLog('CSRF Response Data:', data);
            
            if (data.success && data.csrf_token) {
                this.csrfToken = data.csrf_token;
                
                // Update all CSRF inputs
                const csrfInputs = document.querySelectorAll('input[name="csrf_token"]');
                csrfInputs.forEach(input => {
                    input.value = this.csrfToken;
                });
                
                this.debugLog('✅ CSRF token set successfully:', this.csrfToken.substring(0, 10) + '...');
                
            } else {
                throw new Error('Invalid CSRF response: ' + JSON.stringify(data));
            }
            
        } catch (error) {
            this.debugLog('❌ CSRF token initialization failed:', error);
            this.showDebugNotification('Failed to initialize security token: ' + error.message, 'error');
        }
    }

    /**
     * Handle login with enhanced debugging - FIXED VERSION
     */
    async handleLogin(e) {
        this.debugLog('🔑 Starting login process...');
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Collect form data
            const formData = new FormData(form);
            const loginData = {
                email: formData.get('email'),
                password: formData.get('password'),
                user_type: formData.get('user_type') || 'user',
                remember_me: formData.get('remember_me') === 'on',
                csrf_token: this.csrfToken
            };
            
            this.debugLog('📤 Sending login data:', {
                email: loginData.email,
                user_type: loginData.user_type,
                password_length: loginData.password?.length,
                csrf_token_length: loginData.csrf_token?.length
            });
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            
            // FIXED: Send action as query parameter
            const response = await fetch(`${this.apiURL}?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            this.debugLog('📥 Login API Response Status:', response.status);
            
            const responseData = await response.json();
            this.debugLog('📥 Login API Response Data:', responseData);
            
            if (responseData.success) {
                this.debugLog('✅ Login successful!');
                this.showDebugNotification('Login successful! Redirecting...', 'success');
                
                // Store user info for debugging
                localStorage.setItem('debug_user_info', JSON.stringify(responseData.user));
                
                setTimeout(() => {
                    window.location.href = responseData.redirect_url || './admin-dashboard.html';
                }, 1500);
                
            } else {
                this.debugLog('❌ Login failed:', responseData.error);
                this.showDebugNotification(responseData.error || 'Login failed', 'error');
                
                // Show debug info for troubleshooting
                if (responseData.debug_info) {
                    console.table(responseData.debug_info);
                }
            }
            
        } catch (error) {
            this.debugLog('💥 Login error:', error);
            this.showDebugNotification('Login error: ' + error.message, 'error');
            
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    /**
     * Handle registration with enhanced debugging - FIXED VERSION
     */
    async handleRegister(e) {
        this.debugLog('📝 Starting registration process...');
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Collect form data
            const formData = new FormData(form);
            const registerData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                password: formData.get('password'),
                confirm_password: formData.get('confirm_password'),
                user_type: formData.get('user_type') || 'user',
                newsletter: formData.get('newsletter') === '1',
                csrf_token: this.csrfToken
            };
            
            this.debugLog('📤 Sending registration data:', {
                name: registerData.name,
                email: registerData.email,
                phone: registerData.phone,
                user_type: registerData.user_type,
                password_length: registerData.password?.length,
                csrf_token_length: registerData.csrf_token?.length
            });
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            
            // FIXED: Send action as query parameter
            const response = await fetch(`${this.apiURL}?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(registerData)
            });
            
            this.debugLog('📥 Registration API Response Status:', response.status);
            
            const responseData = await response.json();
            this.debugLog('📥 Registration API Response Data:', responseData);
            
            if (responseData.success) {
                this.debugLog('✅ Registration successful!');
                this.showDebugNotification('Registration successful! You can now log in.', 'success');
                
                // Reset form and switch to login
                form.reset();
                setTimeout(() => {
                    this.switchToLogin(registerData.email);
                }, 2000);
                
            } else {
                this.debugLog('❌ Registration failed:', responseData.error);
                this.showDebugNotification(responseData.error || 'Registration failed', 'error');
                
                // Show debug info
                if (responseData.validation_errors) {
                    console.table(responseData.validation_errors);
                }
            }
            
        } catch (error) {
            this.debugLog('💥 Registration error:', error);
            this.showDebugNotification('Registration error: ' + error.message, 'error');
            
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    /**
     * Switch to login tab and prefill email
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
                        this.debugLog('📧 Pre-filled email for login:', email);
                    }
                }, 300);
            }
        }
    }

    /**
     * Enhanced tab switching with debugging
     */
    switchTab(e) {
        e.preventDefault();
        
        const clickedBtn = e.target.closest('.tab-btn');
        const targetTab = clickedBtn.dataset.tab;
        
        this.debugLog('🔄 Switching to tab:', targetTab);
        
        if (!targetTab) {
            this.debugLog('⚠️ No target tab specified');
            return;
        }
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        const targetContent = document.getElementById(targetTab + '-tab');
        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('active');
            
            this.debugLog('✅ Tab switched successfully');
        } else {
            this.debugLog('❌ Target tab content not found:', targetTab + '-tab');
        }
    }

    /**
     * Fix form display issues
     */
    fixFormDisplay() {
        this.debugLog('🔧 Fixing form display...');
        
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        
        if (loginTab && registerTab) {
            // Ensure proper initial state
            loginTab.style.display = 'block';
            loginTab.classList.add('tab-content', 'active');
            
            registerTab.style.display = 'none';
            registerTab.classList.add('tab-content');
            registerTab.classList.remove('active');
            
            this.debugLog('✅ Form display fixed');
        } else {
            this.debugLog('⚠️ Form tabs not found:', { loginTab: !!loginTab, registerTab: !!registerTab });
        }
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        this.debugLog('📋 Setting up form validation...');
        
        // Add validation styles
        const style = document.createElement('style');
        style.id = 'debug-auth-styles';
        style.textContent = `
            .debug-notification {
                position: fixed;
                top: 60px;
                left: 10px;
                right: 10px;
                z-index: 10003;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 0.5rem;
                font-family: monospace;
                font-size: 0.875rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                animation: slideInDown 0.3s ease;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            }
            
            .debug-notification.success {
                background: rgba(34, 197, 94, 0.1);
                border: 1px solid rgba(34, 197, 94, 0.2);
                color: #059669;
            }
            
            .debug-notification.error {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.2);
                color: #dc2626;
            }
            
            .debug-notification.info {
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.2);
                color: #2563eb;
            }
            
            @keyframes slideInDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .debug-credentials {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 1rem;
                border-radius: 8px;
                font-family: monospace;
                font-size: 0.75rem;
                max-width: 300px;
                z-index: 1000;
                border: 2px solid #fbbf24;
            }
            
            .debug-credentials h4 {
                margin: 0 0 0.5rem 0;
                color: #fbbf24;
            }
            
            .debug-credentials ul {
                margin: 0;
                padding-left: 1rem;
                list-style: none;
            }
            
            .debug-credentials li {
                margin-bottom: 0.5rem;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 4px;
                transition: background 0.2s;
            }
            
            .debug-credentials li:hover {
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
            }
            
            .debug-status {
                position: fixed;
                top: 60px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #10b981;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                font-family: monospace;
                font-size: 0.75rem;
                z-index: 1001;
            }
        `;
        
        document.head.appendChild(style);
        this.addDebugCredentials();
        this.addDebugStatus();
        this.debugLog('✅ Form validation setup complete');
    }

    /**
     * Add debug credentials helper
     */
    addDebugCredentials() {
        const debugBox = document.createElement('div');
        debugBox.className = 'debug-credentials';
        debugBox.innerHTML = `
            <h4>🔑 Test Accounts</h4>
            <ul>
                <li onclick="window.debugAuth.fillLogin('admin@sadgurubharadwaja.org', 'admin123', 'admin')" title="Click to auto-fill">
                    👑 Admin: admin@...org<br>
                    <small style="color: #9ca3af;">Password: admin123</small>
                </li>
                <li onclick="window.debugAuth.fillLogin('volunteer@sadgurubharadwaja.org', 'volunteer123', 'volunteer')" title="Click to auto-fill">
                    🤝 Volunteer: volunteer@...org<br>
                    <small style="color: #9ca3af;">Password: volunteer123</small>
                </li>
                <li onclick="window.debugAuth.fillLogin('donor@sadgurubharadwaja.org', 'donor123', 'user')" title="Click to auto-fill">
                    ❤️ Donor: donor@...org<br>
                    <small style="color: #9ca3af;">Password: donor123</small>
                </li>
            </ul>
            <small>↑ Click any account to auto-fill form</small>
        `;
        
        document.body.appendChild(debugBox);
    }

    /**
     * Add debug status indicator
     */
    addDebugStatus() {
        const statusBox = document.createElement('div');
        statusBox.className = 'debug-status';
        statusBox.innerHTML = '🟢 API Ready';
        statusBox.id = 'debug-status-indicator';
        
        document.body.appendChild(statusBox);
        
        // Update status based on API connectivity
        setTimeout(() => {
            if (this.csrfToken) {
                statusBox.innerHTML = '🟢 Fully Ready';
                statusBox.style.color = '#10b981';
            } else {
                statusBox.innerHTML = '🔴 API Issue';
                statusBox.style.color = '#ef4444';
            }
        }, 2000);
    }

    /**
     * Fill login form with test credentials
     */
    fillLogin(email, password, userType) {
        this.debugLog('🎯 Auto-filling login form:', { email, userType });
        
        // Switch to login tab first
        const loginTabBtn = document.querySelector('[data-tab="login"]');
        if (loginTabBtn) {
            loginTabBtn.click();
        }
        
        setTimeout(() => {
            const emailInput = document.getElementById('login_email');
            const passwordInput = document.getElementById('login_password');
            const userTypeSelect = document.getElementById('user_type');
            
            if (emailInput) emailInput.value = email;
            if (passwordInput) passwordInput.value = password;
            if (userTypeSelect) userTypeSelect.value = userType;
            
            this.showDebugNotification(`Filled with ${userType} credentials. Click Login!`, 'info');
        }, 500);
    }

    /**
     * Debug logging function
     */
    debugLog(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        
        if (data !== null) {
            console.log(`[${timestamp}] ${message}`, data);
        } else {
            console.log(`[${timestamp}] ${message}`);
        }
    }

    /**
     * Show debug notification
     */
    showDebugNotification(message, type = 'info') {
        // Remove existing debug notifications
        document.querySelectorAll('.debug-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `debug-notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:auto;font-size:1.2rem;">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 8 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 8000);
    }

    /**
     * Get current status for debugging
     */
    getDebugStatus() {
        return {
            apiURL: this.apiURL,
            csrfToken: this.csrfToken ? this.csrfToken.substring(0, 10) + '...' : 'not set',
            userInfo: JSON.parse(localStorage.getItem('debug_user_info') || 'null'),
            sessionInfo: {
                sessionId: document.cookie.match(/PHPSESSID=([^;]+)/)?.[1] || 'not found'
            },
            formElements: {
                loginForm: !!document.getElementById('loginForm'),
                registerForm: !!document.getElementById('registerForm'),
                csrfInputs: document.querySelectorAll('input[name="csrf_token"]').length
            }
        };
    }

    /**
     * Enhanced setup tab switching
     */
    setupTabSwitching() {
        // Make sure tabs work properly
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e);
            });
        });
    }
}

// Initialize debug auth system
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Debug Auth System...');
    console.log('🔧 This version sends action as query parameter to fix PHP routing issues');
    
    window.debugAuth = new DebugAuthSystem();
    
    // Add global debug helper
    window.authDebugStatus = () => {
        console.table(window.debugAuth.getDebugStatus());
    };
    
    console.log('💡 Use authDebugStatus() to check system status');
    console.log('💡 Test accounts are available in bottom-right corner');
});

// Export for global access
window.DebugAuthSystem = DebugAuthSystem;