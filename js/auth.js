// Authentication functionality with API integration
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                action: 'login',
                email: document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value,
                user_type: document.getElementById('userType').value
            };

            if (!validateForm(this)) {
                showNotification('Please fill all required fields', 'error');
                return;
            }

            try {
                showLoading(true);
                const response = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Login successful!');
                    // Store user data
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    
                    setTimeout(() => {
                        window.location.href = result.redirect;
                    }, 1000);
                } else {
                    showNotification(result.error || 'Login failed', 'error');
                }
            } catch (error) {
                showNotification('Network error. Please try again.', 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                action: 'register',
                name: document.getElementById('registerName').value,
                email: document.getElementById('registerEmail').value,
                phone: document.getElementById('registerPhone').value,
                password: document.getElementById('registerPassword').value,
                user_type: document.getElementById('registerUserType').value
            };

            if (!validateForm(this)) {
                showNotification('Please fill all required fields', 'error');
                return;
            }

            try {
                showLoading(true);
                const response = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('Registration successful! Please login.');
                    document.querySelector('[data-tab="login"]').click();
                    this.reset();
                } else {
                    showNotification(result.error || 'Registration failed', 'error');
                }
            } catch (error) {
                showNotification('Network error. Please try again.', 'error');
            } finally {
                showLoading(false);
            }
        });
    }

    // Check authentication on page load
    checkAuth();
});

async function checkAuth() {
    if (window.location.pathname.includes('login.html')) {
        try {
            const response = await fetch('api/auth.php?action=verify');
            const result = await response.json();
            
            if (result.success) {
                // User is already logged in, redirect to dashboard
                const dashboardUrl = getDashboardUrl(result.user.user_type);
                window.location.href = dashboardUrl;
            }
        } catch (error) {
            // User not authenticated, stay on login page
        }
    }
}

function getDashboardUrl(userType) {
    const urls = {
        'admin': 'admin-dashboard.html',
        'volunteer': 'volunteer-dashboard.html',
        'user': 'user-dashboard.html'
    };
    return urls[userType] || 'index.html';
}

function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });

    return isValid;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showLoading(show) {
    let loader = document.getElementById('loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loader';
        loader.innerHTML = '<div class="spinner"></div>';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        document.body.appendChild(loader);
    }
    
    loader.style.display = show ? 'flex' : 'none';
}

// Auth utility functions
window.auth = {
    getCurrentUser: () => {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
    },
    
    logout: async () => {
        try {
            await fetch('api/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'logout' })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },
    
    requireAuth: async (requiredType = null) => {
        try {
            const response = await fetch('api/auth.php?action=verify');
            const result = await response.json();
            
            if (!result.success) {
                window.location.href = 'login.html';
                return false;
            }
            
            if (requiredType && result.user.user_type !== requiredType) {
                showNotification('Access denied', 'error');
                window.location.href = 'index.html';
                return false;
            }
            
            return result.user;
        } catch (error) {
            window.location.href = 'login.html';
            return false;
        }
    }
};
