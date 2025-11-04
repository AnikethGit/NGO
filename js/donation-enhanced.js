/**
 * ENHANCED DONATION SYSTEM - Sri Dutta Sai Manga Bharadwaja Trust
 * Comprehensive donation form with working interactions and dynamic updates
 * 
 * @version 2.0.0
 * @priority HIGH - Fixes non-working donation form interactions
 */

class EnhancedDonationSystem {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.csrfToken = '';
        this.selectedCause = 'general';
        this.selectedAmount = 2000;
        this.selectedFrequency = 'one-time';
        
        this.init();
    }

    /**
     * Initialize donation system
     */
    async init() {
        await this.initializeCSRFToken();
        this.setupEventListeners();
        this.initializeForm();
        this.setupFormValidation();
        this.loadRecentDonations();
        this.setupSummaryUpdates();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Cause selection
        document.querySelectorAll('.cause-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCauseSelection(e));
        });

        // Amount selection
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAmountSelection(e));
        });

        // Custom amount input
        const customAmountInput = document.getElementById('customAmount');
        if (customAmountInput) {
            customAmountInput.addEventListener('input', (e) => this.handleCustomAmount(e));
            customAmountInput.addEventListener('focus', () => this.clearAmountButtons());
        }

        // Frequency selection
        document.querySelectorAll('input[name="frequency"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleFrequencyChange(e));
        });

        // Form submission
        const donationForm = document.getElementById('donationForm');
        if (donationForm) {
            donationForm.addEventListener('submit', (e) => this.handleFormSubmission(e));
        }

        // Real-time form validation
        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        // Phone number formatting
        const phoneInput = document.getElementById('donor_phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => this.formatPhoneNumber(e));
        }

        // PAN number formatting
        const panInput = document.getElementById('donor_pan');
        if (panInput) {
            panInput.addEventListener('input', (e) => this.formatPANNumber(e));
        }
    }

    /**
     * Initialize form with default values
     */
    initializeForm() {
        // Set default cause
        this.updateCauseSelection('general');
        
        // Set default amount
        this.updateAmountSelection(2000);
        
        // Set default frequency
        this.updateFrequencySelection('one-time');
        
        // Update summary
        this.updateSummary();
    }

    /**
     * Handle cause selection
     */
    handleCauseSelection(e) {
        e.preventDefault();
        
        const cause = e.target.closest('.cause-btn').dataset.cause;
        this.updateCauseSelection(cause);
        this.updateSummary();
    }

    /**
     * Update cause selection UI
     */
    updateCauseSelection(cause) {
        this.selectedCause = cause;
        
        // Update button states
        document.querySelectorAll('.cause-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cause === cause);
        });
        
        // Update hidden input
        const hiddenInput = document.getElementById('selected_cause');
        if (hiddenInput) {
            hiddenInput.value = cause;
        }
    }

    /**
     * Handle amount selection
     */
    handleAmountSelection(e) {
        e.preventDefault();
        
        const amount = parseInt(e.target.closest('.amount-btn').dataset.amount);
        this.updateAmountSelection(amount);
        
        // Clear custom amount input
        const customInput = document.getElementById('customAmount');
        if (customInput) {
            customInput.value = '';
        }
        
        this.updateSummary();
    }

    /**
     * Update amount selection UI
     */
    updateAmountSelection(amount) {
        this.selectedAmount = amount;
        
        // Update button states
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.amount) === amount);
        });
        
        // Update hidden input
        const hiddenInput = document.getElementById('donation_amount');
        if (hiddenInput) {
            hiddenInput.value = amount;
        }
    }

    /**
     * Handle custom amount input
     */
    handleCustomAmount(e) {
        const amount = parseInt(e.target.value);
        
        if (amount && amount > 0) {
            this.selectedAmount = amount;
            this.clearAmountButtons();
            
            // Update hidden input
            const hiddenInput = document.getElementById('donation_amount');
            if (hiddenInput) {
                hiddenInput.value = amount;
            }
            
            this.updateSummary();
        }
    }

    /**
     * Clear amount button selections
     */
    clearAmountButtons() {
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    /**
     * Handle frequency change
     */
    handleFrequencyChange(e) {
        this.selectedFrequency = e.target.value;
        this.updateSummary();
    }

    /**
     * Update frequency selection UI
     */
    updateFrequencySelection(frequency) {
        this.selectedFrequency = frequency;
        
        const radioInput = document.querySelector(`input[name="frequency"][value="${frequency}"]`);
        if (radioInput) {
            radioInput.checked = true;
        }
    }

    /**
     * Setup dynamic summary updates
     */
    setupSummaryUpdates() {
        // Update summary whenever form changes
        document.addEventListener('change', () => this.updateSummary());
    }

    /**
     * Update donation summary in real-time
     */
    updateSummary() {
        const causeDisplay = {
            'general': 'General Fund',
            'poor-feeding': 'Poor Feeding',
            'education': 'Education Support',
            'medical': 'Medical Care',
            'disaster': 'Disaster Relief'
        }[this.selectedCause] || 'General Fund';
        
        const frequencyDisplay = {
            'one-time': 'One Time',
            'monthly': 'Monthly',
            'yearly': 'Yearly'
        }[this.selectedFrequency] || 'One Time';
        
        // Update summary display
        const summaryElements = {
            'summary-cause': causeDisplay,
            'summary-amount': `₹${this.selectedAmount.toLocaleString()}`,
            'summary-frequency': frequencyDisplay,
            'summary-total': `₹${this.selectedAmount.toLocaleString()}`,
            'tax-deduction': `₹${Math.floor(this.selectedAmount * 0.5).toLocaleString()}`
        };
        
        Object.entries(summaryElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                
                // Add animation class
                element.classList.add('updated');
                setTimeout(() => element.classList.remove('updated'), 300);
            }
        });
        
        // Add CSS for update animation if not exists
        if (!document.querySelector('#summary-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'summary-animation-styles';
            style.textContent = `
                .updated {
                    animation: highlight 0.3s ease;
                }
                @keyframes highlight {
                    0% { background-color: rgba(var(--color-primary-rgb), 0.2); }
                    100% { background-color: transparent; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Load and display recent donations
     */
    async loadRecentDonations() {
        try {
            // Demo data - replace with actual API call
            const recentDonations = [
                { donor: 'Rajesh K.', amount: 5000, time: '2 hours ago', initial: 'R' },
                { donor: 'Priya M.', amount: 2000, time: '4 hours ago', initial: 'P' },
                { donor: 'Anonymous', amount: 10000, time: '6 hours ago', initial: 'A' },
                { donor: 'Amit P.', amount: 3500, time: '8 hours ago', initial: 'A' },
                { donor: 'Suresh T.', amount: 1500, time: '1 day ago', initial: 'S' }
            ];
            
            this.renderRecentDonations(recentDonations);
            
        } catch (error) {
            console.error('Error loading recent donations:', error);
        }
    }

    /**
     * Render recent donations feed
     */
    renderRecentDonations(donations) {
        const feedContainer = document.querySelector('.donation-feed');
        if (!feedContainer) return;
        
        const donationHTML = donations.map(donation => `
            <div class="donation-item">
                <div class="donor-info">
                    <div class="donor-initial">${donation.initial}</div>
                    <div>
                        <div class="donor-name">${donation.donor}</div>
                        <div class="donation-time">${donation.time}</div>
                    </div>
                </div>
                <div class="donation-amount">₹${donation.amount.toLocaleString()}</div>
            </div>
        `).join('');
        
        feedContainer.innerHTML = donationHTML;
        
        // Add animation to donation items
        feedContainer.querySelectorAll('.donation-item').forEach((item, index) => {
            item.style.animationDelay = `${index * 0.1}s`;
            item.classList.add('fade-in');
        });
    }

    /**
     * Handle form submission
     */
    async handleFormSubmission(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('.donate-submit');
        const originalText = submitBtn.innerHTML;
        
        // Validate form
        if (!this.validateForm(form)) {
            return;
        }
        
        try {
            this.setLoadingState(submitBtn, 'Processing...');
            
            const formData = new FormData(form);
            const donationData = {
                cause: this.selectedCause,
                amount: this.selectedAmount,
                frequency: this.selectedFrequency,
                donor_name: formData.get('donor_name'),
                donor_email: formData.get('donor_email'),
                donor_phone: formData.get('donor_phone'),
                donor_pan: formData.get('donor_pan'),
                donor_address: formData.get('donor_address'),
                anonymous: formData.get('anonymous') === '1',
                updates: formData.get('updates') === '1',
                csrf_token: this.csrfToken
            };
            
            // Since payment gateway is not set up yet, show success message
            this.showNotification('Donation form submitted successfully! Payment gateway integration pending.', 'success');
            
            // Log donation data for debugging
            console.log('Donation data prepared:', donationData);
            
            // Reset form after successful submission
            setTimeout(() => {
                this.resetForm(form);
            }, 2000);
            
        } catch (error) {
            console.error('Donation submission error:', error);
            this.showNotification(error.message || 'Donation submission failed', 'error');
        } finally {
            this.clearLoadingState(submitBtn, originalText);
        }
    }

    /**
     * Comprehensive form validation
     */
    validateForm(form) {
        const requiredFields = form.querySelectorAll('input[required], select[required]');
        let isValid = true;
        let firstErrorField = null;
        
        // Clear existing errors
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
                if (!firstErrorField) {
                    firstErrorField = field;
                }
            }
        });
        
        // Check terms agreement
        const termsCheckbox = document.getElementById('terms');
        if (termsCheckbox && !termsCheckbox.checked) {
            this.showNotification('Please agree to the terms and conditions', 'error');
            isValid = false;
        }
        
        // Validate amount
        if (this.selectedAmount < 1) {
            this.showNotification('Please select or enter a valid donation amount', 'error');
            isValid = false;
        }
        
        if (!isValid && firstErrorField) {
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorField.focus();
        }
        
        return isValid;
    }

    /**
     * Validate individual field
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
        else if (input.id === 'donor_phone' && value) {
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(value.replace(/\D/g, ''))) {
                message = 'Please enter a valid 10-digit phone number';
                isValid = false;
            }
        }
        // PAN validation
        else if (input.id === 'donor_pan' && value) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(value.toUpperCase())) {
                message = 'Please enter a valid PAN number (ABCDE1234F)';
                isValid = false;
            }
        }
        // Name validation
        else if (input.id === 'donor_name' && value) {
            if (value.length < 2) {
                message = 'Name must be at least 2 characters';
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
     * Show field error
     */
    showFieldError(input, message) {
        input.classList.add('error');
        
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        errorDiv.style.cssText = `
            color: var(--color-error);
            font-size: 0.875rem;
            margin-top: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            animation: slideIn 0.3s ease;
        `;
        
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
     * Format phone number
     */
    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        e.target.value = value;
    }

    /**
     * Format PAN number
     */
    formatPANNumber(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        e.target.value = value;
    }

    /**
     * Reset form to default state
     */
    resetForm(form) {
        form.reset();
        this.initializeForm();
        
        // Clear any error states
        document.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        
        this.showNotification('Form reset successfully', 'info');
    }

    /**
     * Set loading state for button
     */
    setLoadingState(button, text) {
        button.disabled = true;
        button.classList.add('loading');
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }

    /**
     * Clear loading state for button
     */
    clearLoadingState(button, originalText) {
        button.disabled = false;
        button.classList.remove('loading');
        button.innerHTML = originalText;
    }

    /**
     * Initialize CSRF token
     */
    async initializeCSRFToken() {
        try {
            const response = await fetch(`${this.apiURL}/auth.php?action=csrf_token`);
            const data = await response.json();
            this.csrfToken = data.csrf_token || '';
            
            // Update CSRF inputs
            document.querySelectorAll('input[name="csrf_token"]').forEach(input => {
                input.value = this.csrfToken;
            });
            
        } catch (error) {
            console.error('CSRF token initialization failed:', error);
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.donation-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `donation-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;
        
        // Style notification
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
            ${type === 'success' ? 'background: rgba(var(--color-success-rgb), 0.1); border: 1px solid rgba(var(--color-success-rgb), 0.2); color: var(--color-success);' : ''}
            ${type === 'error' ? 'background: rgba(var(--color-error-rgb), 0.1); border: 1px solid rgba(var(--color-error-rgb), 0.2); color: var(--color-error);' : ''}
            ${type === 'info' ? 'background: rgba(var(--color-info-rgb), 0.1); border: 1px solid rgba(var(--color-info-rgb), 0.2); color: var(--color-info);' : ''}
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    /**
     * Get selected donation data
     */
    getDonationData() {
        return {
            cause: this.selectedCause,
            amount: this.selectedAmount,
            frequency: this.selectedFrequency
        };
    }

    /**
     * Setup form validation styling
     */
    setupFormValidation() {
        const style = document.createElement('style');
        style.textContent = `
            .cause-btn {
                transition: all 0.3s ease;
                border: 2px solid var(--color-border);
                background: var(--color-surface);
                color: var(--color-text);
                padding: 1rem;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                text-align: center;
            }
            
            .cause-btn:hover {
                border-color: var(--color-primary);
                background: rgba(var(--color-primary-rgb), 0.05);
            }
            
            .cause-btn.active {
                border-color: var(--color-primary);
                background: rgba(var(--color-primary-rgb), 0.1);
                color: var(--color-primary);
            }
            
            .amount-btn {
                transition: all 0.3s ease;
                border: 2px solid var(--color-border);
                background: var(--color-surface);
                color: var(--color-text);
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.1rem;
                font-weight: 500;
            }
            
            .amount-btn:hover {
                border-color: var(--color-primary);
                background: rgba(var(--color-primary-rgb), 0.05);
            }
            
            .amount-btn.active {
                border-color: var(--color-primary);
                background: var(--color-primary);
                color: var(--color-btn-primary-text);
            }
            
            .frequency-option input[type="radio"]:checked + .frequency-card {
                border-color: var(--color-primary);
                background: rgba(var(--color-primary-rgb), 0.1);
                color: var(--color-primary);
            }
            
            .fade-in {
                animation: fadeInUp 0.3s ease forwards;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
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
        document.head.appendChild(style);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedDonation = new EnhancedDonationSystem();
});

// Export for global access
window.EnhancedDonationSystem = EnhancedDonationSystem;