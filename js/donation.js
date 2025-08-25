// Enhanced Donation Form JavaScript for NGO Website
class DonationForm {
    constructor() {
        this.form = document.getElementById('donationForm');
        this.selectedCause = 'general';
        this.selectedAmount = 2000;
        this.selectedFrequency = 'one-time';
        
        if (this.form) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.updateSummary();
        this.initializeCSRFToken();
    }

    setupEventListeners() {
        // Cause selection
        this.setupCauseSelection();
        
        // Amount selection
        this.setupAmountSelection();
        
        // Frequency selection
        this.setupFrequencySelection();
        
        // Form submission
        this.setupFormSubmission();
        
        // Real-time validation
        this.setupRealTimeValidation();
        
        // Password visibility toggles
        this.setupPasswordToggles();
        
        // PAN formatting
        this.setupPANFormatting();
        
        // Phone formatting
        this.setupPhoneFormatting();
    }

    setupCauseSelection() {
        const causeButtons = document.querySelectorAll('.cause-btn');
        
        causeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all buttons
                causeButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Update selected cause
                this.selectedCause = button.dataset.cause;
                document.getElementById('selected_cause').value = this.selectedCause;
                
                // Update summary
                this.updateSummary();
            });
        });
    }

    setupAmountSelection() {
        const amountButtons = document.querySelectorAll('.amount-btn');
        const customAmountInput = document.getElementById('customAmount');
        const donationAmountInput = document.getElementById('donation_amount');
        
        // Predefined amount buttons
        amountButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all buttons
                amountButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Update selected amount
                this.selectedAmount = parseInt(button.dataset.amount);
                donationAmountInput.value = this.selectedAmount;
                
                // Clear custom amount input
                customAmountInput.value = '';
                
                // Update summary
                this.updateSummary();
            });
        });
        
        // Custom amount input
        customAmountInput.addEventListener('input', (e) => {
            const amount = parseInt(e.target.value) || 0;
            
            if (amount > 0) {
                // Remove active class from predefined buttons
                amountButtons.forEach(btn => btn.classList.remove('active'));
                
                // Update selected amount
                this.selectedAmount = amount;
                donationAmountInput.value = this.selectedAmount;
                
                // Update summary
                this.updateSummary();
            }
        });
        
        // Validate amount range
        customAmountInput.addEventListener('blur', (e) => {
            const amount = parseInt(e.target.value) || 0;
            
            if (amount > 0 && (amount < 1 || amount > 1000000)) {
                this.showFieldError(e.target, 'Amount must be between ₹1 and ₹10,00,000');
            } else {
                this.clearFieldError(e.target);
            }
        });
    }

    setupFrequencySelection() {
        const frequencyInputs = document.querySelectorAll('input[name="frequency"]');
        
        frequencyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.selectedFrequency = e.target.value;
                this.updateSummary();
            });
        });
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
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                this.showLoadingOverlay(true, 'Processing your donation...');
                
                // Prepare form data
                const formData = new FormData(this.form);
                const data = this.prepareFormData(formData);
                
                // Add CSRF token
                data.csrf_token = await this.getCSRFToken();
                
                // Submit donation
                const response = await fetch('./api/donations.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': data.csrf_token
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    // Redirect to PhonePe payment
                    if (result.payment_url) {
                        this.showNotification('Redirecting to payment gateway...', 'info');
                        setTimeout(() => {
                            window.location.href = result.payment_url;
                        }, 1500);
                    } else {
                        throw new Error('Payment URL not received');
                    }
                } else {
                    throw new Error(result.error || 'Failed to process donation');
                }

            } catch (error) {
                console.error('Donation form error:', error);
                this.showNotification(error.message || 'Failed to process donation. Please try again.', 'error');
            } finally {
                // Restore button
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                this.showLoadingOverlay(false);
            }
        });
    }

    prepareFormData(formData) {
        const data = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Add calculated fields
        data.amount = this.selectedAmount;
        data.cause = this.selectedCause;
        data.frequency = this.selectedFrequency;
        
        // Clean phone number
        if (data.donor_phone) {
            data.donor_phone = data.donor_phone.replace(/\D/g, '');
        }
        
        // Uppercase PAN
        if (data.donor_pan) {
            data.donor_pan = data.donor_pan.toUpperCase();
        }
        
        // Generate transaction ID
        data.transaction_id = this.generateTransactionId();
        
        return data;
    }

    generateTransactionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `TXN_${timestamp}_${random}`.toUpperCase();
    }

    setupRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Validation on blur
            input.addEventListener('blur', () => this.validateField(input));
            
            // Clear errors on input
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    setupPasswordToggles() {
        const toggleButtons = document.querySelectorAll('.password-toggle');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = button.dataset.target;
                const targetInput = document.getElementById(targetId);
                const icon = button.querySelector('i');
                
                if (targetInput.type === 'password') {
                    targetInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    targetInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    setupPANFormatting() {
        const panInput = document.getElementById('donor_pan');
        if (!panInput) return;
        
        panInput.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });
    }

    setupPhoneFormatting() {
        const phoneInput = document.getElementById('donor_phone');
        if (!phoneInput) return;
        
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            e.target.value = value;
        });
    }

    setupFormValidation() {
        // Add custom validation methods if needed
        this.validationRules = {
            donor_name: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s]+$/,
                message: 'Please enter a valid name'
            },
            donor_email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            donor_phone: {
                required: false,
                pattern: /^[6-9]\d{9}$/,
                message: 'Please enter a valid 10-digit phone number'
            },
            donor_pan: {
                required: false,
                pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                message: 'Please enter a valid PAN number (ABCDE1234F)'
            }
        };
    }

    validateField(input) {
        const fieldName = input.name;
        const value = input.value.trim();
        const rules = this.validationRules[fieldName];
        
        if (!rules) return true;
        
        // Required field validation
        if (rules.required && !value) {
            this.showFieldError(input, 'This field is required');
            return false;
        }
        
        // Skip other validations if field is empty and not required
        if (!value && !rules.required) {
            this.clearFieldError(input);
            return true;
        }
        
        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            this.showFieldError(input, rules.message);
            return false;
        }
        
        // Minimum length validation
        if (rules.minLength && value.length < rules.minLength) {
            this.showFieldError(input, `Minimum ${rules.minLength} characters required`);
            return false;
        }
        
        // Amount validation
        if (fieldName === 'amount' || input.id === 'customAmount') {
            const amount = parseInt(value) || 0;
            if (amount < 1 || amount > 1000000) {
                this.showFieldError(input, 'Amount must be between ₹1 and ₹10,00,000');
                return false;
            }
        }
        
        this.clearFieldError(input);
        return true;
    }

    validateForm() {
        const inputs = this.form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        // Validate amount
        if (this.selectedAmount < 1 || this.selectedAmount > 1000000) {
            this.showNotification('Please select a valid donation amount', 'error');
            isValid = false;
        }
        
        // Validate terms checkbox
        const termsCheckbox = document.getElementById('terms');
        if (termsCheckbox && !termsCheckbox.checked) {
            this.showNotification('Please agree to the terms and conditions', 'error');
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
        input.parentNode.appendChild(errorDiv);
    }

    clearFieldError(input) {
        input.classList.remove('error');
        const errorMessage = input.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    updateSummary() {
        // Update cause display
        const causeButton = document.querySelector(`.cause-btn[data-cause="${this.selectedCause}"]`);
        const causeName = causeButton ? causeButton.textContent.trim() : 'General Fund';
        const summaryElementCause = document.getElementById('summary-cause');
        if (summaryElementCause) {
            summaryElementCause.textContent = causeName;
        }
        
        // Update amount display
        const summaryElementAmount = document.getElementById('summary-amount');
        if (summaryElementAmount) {
            summaryElementAmount.textContent = this.formatCurrency(this.selectedAmount);
        }
        
        // Update frequency display
        const frequencyLabels = {
            'one-time': 'One Time',
            'monthly': 'Monthly',
            'yearly': 'Yearly'
        };
        const summaryElementFrequency = document.getElementById('summary-frequency');
        if (summaryElementFrequency) {
            summaryElementFrequency.textContent = frequencyLabels[this.selectedFrequency];
        }
        
        // Update total amount
        const summaryElementTotal = document.getElementById('summary-total');
        if (summaryElementTotal) {
            summaryElementTotal.textContent = this.formatCurrency(this.selectedAmount);
        }
        
        // Update tax deduction (50% of amount for 80G)
        const taxDeduction = Math.floor(this.selectedAmount * 0.5);
        const taxDeductionElement = document.getElementById('tax-deduction');
        if (taxDeductionElement) {
            taxDeductionElement.textContent = this.formatCurrency(taxDeduction);
        }
    }

    async initializeCSRFToken() {
        try {
            const token = await this.getCSRFToken();
            const csrfInput = document.getElementById('csrf_token');
            if (csrfInput) {
                csrfInput.value = token;
            }
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
        }
    }

    async getCSRFToken() {
        try {
            const response = await fetch('./api/auth.php?action=csrf_token');
            const data = await response.json();
            return data.csrf_token || '';
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
            return '';
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
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

    showLoadingOverlay(show = true, message = 'Processing...') {
        let overlay = document.getElementById('loadingOverlay');
        
        if (show && !overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <h3>${message}</h3>
                    <p>Please do not close or refresh this page...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else if (!show && overlay) {
            overlay.remove();
        }
    }
}

// Additional utility functions for donation handling
class DonationUtils {
    static async trackDonation(donationId, event) {
        try {
            await fetch('./api/track-donation.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    donation_id: donationId,
                    event: event,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Failed to track donation event:', error);
        }
    }

    static generateReceiptNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        return `SSF${year}${month}${day}${random}`;
    }

    static validateDonationData(data) {
        const errors = [];
        
        // Required fields
        if (!data.donor_name || data.donor_name.trim().length < 2) {
            errors.push('Donor name is required and must be at least 2 characters');
        }
        
        if (!data.donor_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.donor_email)) {
            errors.push('Valid email address is required');
        }
        
        if (!data.amount || data.amount < 1 || data.amount > 1000000) {
            errors.push('Donation amount must be between ₹1 and ₹10,00,000');
        }
        
        if (!data.cause || !['general', 'poor-feeding', 'education', 'medical', 'disaster'].includes(data.cause)) {
            errors.push('Valid cause selection is required');
        }
        
        // Optional field validations
        if (data.donor_phone && !/^[6-9]\d{9}$/.test(data.donor_phone.replace(/\D/g, ''))) {
            errors.push('Phone number must be a valid 10-digit Indian mobile number');
        }
        
        if (data.donor_pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.donor_pan.toUpperCase())) {
            errors.push('PAN number must be in valid format (ABCDE1234F)');
        }
        
        return errors;
    }

    static formatDonationData(data) {
        return {
            ...data,
            donor_name: data.donor_name.trim(),
            donor_email: data.donor_email.trim().toLowerCase(),
            donor_phone: data.donor_phone ? data.donor_phone.replace(/\D/g, '') : null,
            donor_pan: data.donor_pan ? data.donor_pan.toUpperCase().trim() : null,
            amount: parseFloat(data.amount),
            anonymous: Boolean(data.anonymous),
            updates: Boolean(data.updates)
        };
    }
}

// Initialize donation form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.donationForm = new DonationForm();
    
    // Handle URL parameters for pre-selection
    const urlParams = new URLSearchParams(window.location.search);
    const cause = urlParams.get('cause');
    const amount = urlParams.get('amount');
    
    if (cause && window.donationForm) {
        const causeButton = document.querySelector(`[data-cause="${cause}"]`);
        if (causeButton) {
            causeButton.click();
        }
    }
    
    if (amount && window.donationForm) {
        const amountValue = parseInt(amount);
        if (amountValue >= 1 && amountValue <= 1000000) {
            const customAmountInput = document.getElementById('customAmount');
            if (customAmountInput) {
                customAmountInput.value = amountValue;
                customAmountInput.dispatchEvent(new Event('input'));
            }
        }
    }
});

// Handle payment success/failure callbacks
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const transactionId = urlParams.get('transaction_id');
    
    if (status && transactionId) {
        if (status === 'success') {
            showPaymentSuccess(transactionId);
        } else if (status === 'failed') {
            showPaymentFailure(transactionId);
        }
    }
});

function showPaymentSuccess(transactionId) {
    const message = `
        <div class="payment-success">
            <i class="fas fa-check-circle"></i>
            <h3>Donation Successful!</h3>
            <p>Thank you for your generous contribution.</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p>You will receive an email receipt shortly.</p>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', `
        <div class="payment-status-modal">
            <div class="modal-content">
                ${message}
                <button onclick="this.parentElement.parentElement.remove(); window.location.href='./index.html';">
                    Continue to Homepage
                </button>
            </div>
        </div>
    `);
}

function showPaymentFailure(transactionId) {
    const message = `
        <div class="payment-failure">
            <i class="fas fa-times-circle"></i>
            <h3>Payment Failed</h3>
            <p>Unfortunately, your payment could not be processed.</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p>Please try again or contact support if the issue persists.</p>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', `
        <div class="payment-status-modal">
            <div class="modal-content">
                ${message}
                <div class="modal-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove();">
                        Try Again
                    </button>
                    <button onclick="window.location.href='./contact.html';">
                        Contact Support
                    </button>
                </div>
            </div>
        </div>
    `);
}

// Export for global access
window.DonationForm = DonationForm;
window.DonationUtils = DonationUtils;