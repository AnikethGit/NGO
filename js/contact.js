// Contact Form JavaScript for NGO Website
class ContactForm {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.forgotForm = document.getElementById('forgotPasswordForm');
        
        if (this.form) {
            this.init();
        }
        
        if (this.forgotForm) {
            this.initForgotPassword();
        }
    }

    init() {
        this.setupFormSubmission();
        this.setupFormValidation();
        this.setupForgotPasswordModal();
        this.initializeCSRFToken();
    }

    setupFormSubmission() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.validateForm()) {
                return;
            }
            
            const submitButton = this.form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            try {
                // Show loading state
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                const formData = new FormData(this.form);
                const data = Object.fromEntries(formData.entries());
                
                // Add CSRF token
                data.csrf_token = await this.getCSRFToken();
                
                const response = await fetch('./api/contact.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': data.csrf_token
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    this.showNotification('Message sent successfully! We will get back to you soon.', 'success');
                    this.form.reset();
                } else {
                    throw new Error(result.error || 'Failed to send message');
                }

            } catch (error) {
                console.error('Contact form error:', error);
                this.showNotification(error.message || 'Failed to send message. Please try again.', 'error');
            } finally {
                // Restore button
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }

    setupFormValidation() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Real-time validation
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
            
            // Phone number formatting
            if (input.type === 'tel') {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 10) {
                        value = value.substring(0, 10);
                    }
                    e.target.value = value;
                });
            }
        });
    }

    setupForgotPasswordModal() {
        const forgotLink = document.querySelector('[href="#forgot-password"]');
        const modal = document.getElementById('forgotPasswordModal');
        const closeBtn = document.querySelector('.modal-close');
        
        if (forgotLink && modal) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
        
        // Close on backdrop click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    }

    initForgotPassword() {
        this.forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = this.forgotForm.querySelector('input[name="email"]');
            const submitButton = this.forgotForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            try {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                const response = await fetch('./api/reset-password.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': await this.getCSRFToken()
                    },
                    body: JSON.stringify({
                        email: emailInput.value,
                        csrf_token: await this.getCSRFToken()
                    })
                });

                const result = await response.json();

                if (result.success) {
                    this.showNotification('Password reset link sent to your email', 'success');
                    document.getElementById('forgotPasswordModal').classList.remove('active');
                    document.body.style.overflow = '';
                    this.forgotForm.reset();
                } else {
                    throw new Error(result.error || 'Failed to send reset link');
                }

            } catch (error) {
                console.error('Password reset error:', error);
                this.showNotification(error.message || 'Failed to send reset link', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }

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
        
        // Message length validation
        else if (input.name === 'message' && value && value.length < 10) {
            errorMessage = 'Message must be at least 10 characters long';
            isValid = false;
        }

        if (!isValid) {
            this.showFieldError(input, errorMessage);
        } else {
            this.clearFieldError(input);
        }

        return isValid;
    }

    validateForm() {
        const requiredFields = this.form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        // Validate privacy checkbox
        const privacyCheckbox = document.getElementById('privacy');
        if (privacyCheckbox && !privacyCheckbox.checked) {
            this.showNotification('Please agree to the Privacy Policy', 'error');
            isValid = false;
        }
        
        return isValid;
    }

    showFieldError(input, message) {
        input.classList.add('error');
        
        // Remove existing error message
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        // Insert after input or its parent container
        if (input.parentNode.classList.contains('input-group')) {
            input.parentNode.parentNode.appendChild(errorDiv);
        } else {
            input.parentNode.appendChild(errorDiv);
        }
    }

    clearFieldError(input) {
        input.classList.remove('error');
        
        // Look in both possible locations for error message
        let errorMessage = input.parentNode.querySelector('.error-message');
        if (!errorMessage && input.parentNode.classList.contains('input-group')) {
            errorMessage = input.parentNode.parentNode.querySelector('.error-message');
        }
        
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    async initializeCSRFToken() {
        try {
            const token = await this.getCSRFToken();
            const csrfInput = document.getElementById('csrf_token');
            if (csrfInput) {
                csrfInput.value = token;
            }
            
            const forgotCsrfInput = document.getElementById('forgot_csrf_token');
            if (forgotCsrfInput) {
                forgotCsrfInput.value = token;
            }
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
        }
    }

    async getCSRFToken() {
        try {
            const response = await fetch('./api/auth.php?action=csrf_token');
            if (!response.ok) {
                throw new Error('Failed to fetch CSRF token');
            }
            const data = await response.json();
            return data.csrf_token || '';
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
            // Return empty string as fallback
            return '';
        }
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.notification');
        existing.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }
}

// FAQ functionality
class FAQHandler {
    constructor() {
        this.setupFAQ();
    }

    setupFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const icon = question.querySelector('i');
            
            if (!question || !answer) return;
            
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all FAQ items
                faqItems.forEach(faq => {
                    faq.classList.remove('active');
                    const faqIcon = faq.querySelector('.faq-question i');
                    if (faqIcon) {
                        faqIcon.classList.remove('fa-minus');
                        faqIcon.classList.add('fa-plus');
                    }
                });
                
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                    if (icon) {
                        icon.classList.remove('fa-plus');
                        icon.classList.add('fa-minus');
                    }
                }
            });
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contactForm = new ContactForm();
    window.faqHandler = new FAQHandler();
});

// Export for global access
window.ContactForm = ContactForm;
window.FAQHandler = FAQHandler;