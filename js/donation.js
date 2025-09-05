/**
 * PRODUCTION Donation JavaScript - Sai Seva Foundation
 * Enhanced donation form with PhonePe integration, validation, and analytics
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class DonationForm {
    constructor() {
        this.form = document.getElementById('donationForm');
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.selectedCause = 'general';
        this.selectedAmount = 2000;
        this.selectedFrequency = 'one-time';
        this.isProcessing = false;
        this.csrfToken = '4ff0c3a6f7cdb69870b0963c2cbd2f648d39f851f7bc00b42a8e69aacc8955b0';
        
        if (this.form) {
            this.init();
        }
    }

    /**
     * Initialize donation form
     */
    init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.updateSummary();
        this.initializeCSRFToken();
        this.setupAnalytics();
        this.handleURLParameters();
    }

    /**
     * Setup all event listeners
     */
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
        
        // Form enhancements
        this.setupFormEnhancements();
        
        // Payment method selection
        this.setupPaymentMethodSelection();
    }

    /**
     * Setup cause selection with enhanced UX
     */
    setupCauseSelection() {
        const causeButtons = document.querySelectorAll('.cause-btn');
        
        causeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (this.isProcessing) return;
                
                // Remove active class from all buttons
                causeButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                
                // Add active class to clicked button
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
                
                // Update selected cause
                this.selectedCause = button.dataset.cause;
                document.getElementById('selected_cause').value = this.selectedCause;
                
                // Update summary and impact info
                this.updateSummary();
                this.updateImpactInfo();
                
                // Track cause selection
                this.trackEvent('cause_selected', { cause: this.selectedCause });
            });
            
            // Keyboard support
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        });
    }

    /**
     * Setup amount selection with custom input handling
     */
    setupAmountSelection() {
        const amountButtons = document.querySelectorAll('.amount-btn');
        const customAmountInput = document.getElementById('customAmount');
        const donationAmountInput = document.getElementById('donation_amount');
        
        // Predefined amount buttons
        amountButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (this.isProcessing) return;
                
                // Remove active class from all buttons
                amountButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                
                // Add active class to clicked button
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
                
                // Update selected amount
                this.selectedAmount = parseInt(button.dataset.amount);
                donationAmountInput.value = this.selectedAmount;
                
                // Clear custom amount input
                if (customAmountInput) {
                    customAmountInput.value = '';
                }
                
                // Update summary and impact info
                this.updateSummary();
                this.updateImpactInfo();
                
                // Track amount selection
                this.trackEvent('amount_selected', { 
                    amount: this.selectedAmount,
                    type: 'predefined'
                });
            });
            
            // Keyboard support
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        });
        
        // Custom amount input
        if (customAmountInput) {
            customAmountInput.addEventListener('input', (e) => {
                const amount = parseInt(e.target.value) || 0;
                
                if (amount > 0) {
                    // Remove active class from predefined buttons
                    amountButtons.forEach(btn => {
                        btn.classList.remove('active');
                        btn.setAttribute('aria-pressed', 'false');
                    });
                    
                    // Update selected amount
                    this.selectedAmount = amount;
                    donationAmountInput.value = this.selectedAmount;
                    
                    // Update summary and impact info
                    this.updateSummary();
                    this.updateImpactInfo();
                    
                    // Track custom amount
                    this.trackEvent('amount_selected', { 
                        amount: this.selectedAmount,
                        type: 'custom'
                    });
                }
            });
            
            // Format input as currency
            customAmountInput.addEventListener('blur', (e) => {
                const amount = parseInt(e.target.value) || 0;
                
                if (amount > 0) {
                    if (amount < 1) {
                        this.showFieldError(e.target, 'Minimum donation amount is ₹1');
                    } else if (amount > 1000000) {
                        this.showFieldError(e.target, 'Maximum donation amount is ₹10,00,000');
                    } else {
                        this.clearFieldError(e.target);
                    }
                }
            });
            
            // Prevent non-numeric input
            customAmountInput.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }
    }

    /**
     * Setup frequency selection
     */
    setupFrequencySelection() {
        const frequencyInputs = document.querySelectorAll('input[name="frequency"]');
        
        frequencyInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.selectedFrequency = e.target.value;
                this.updateSummary();
                this.updateImpactInfo();
                
                // Track frequency selection
                this.trackEvent('frequency_selected', { frequency: this.selectedFrequency });
            });
        });
    }

    /**
     * Setup payment method selection
     */
    setupPaymentMethodSelection() {
        const paymentMethods = document.querySelectorAll('input[name="payment_method"]');
        
        paymentMethods.forEach(method => {
            method.addEventListener('change', (e) => {
                const selectedMethod = e.target.value;
                this.updatePaymentMethodInfo(selectedMethod);
                
                // Track payment method selection
                this.trackEvent('payment_method_selected', { method: selectedMethod });
            });
        });
    }

    /**
     * Setup form submission with enhanced error handling
     */
    setupFormSubmission() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (this.isProcessing) return;
            
            if (!this.validateForm()) {
                return;
            }
            
            this.isProcessing = true;
            const submitButton = this.form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            try {
                // Show loading state
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Donation...';
                this.showLoadingOverlay(true, 'Processing your generous donation...');
                
                // Track donation start
                this.trackEvent('donation_initiated', {
                    amount: this.selectedAmount,
                    cause: this.selectedCause,
                    frequency: this.selectedFrequency
                });
                
                // Prepare form data
                const formData = new FormData(this.form);
                const data = this.prepareFormData(formData);
                
                // Add CSRF token
                data.csrf_token = await this.getCSRFToken();
                
                // Create donation record
                const response = await this.makeAPICall('/donations.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': data.csrf_token
                    },
                    body: JSON.stringify(data)
                });

                if (response.success) {
                    // Store donation details for later verification
                    this.storeDonationDetails({
                        donationId: response.donation_id,
                        transactionId: data.transaction_id,
                        amount: this.selectedAmount,
                        receiptNumber: response.receipt_number
                    });
                    
                    // Track donation created
                    this.trackEvent('donation_created', {
                        donation_id: response.donation_id,
                        amount: this.selectedAmount,
                        payment_method: 'phonepe'
                    });
                    
                    // Show success message and redirect to PhonePe
                    this.showNotification('Redirecting to secure payment gateway...', 'info');
                    
                    // Redirect to PhonePe payment
                    setTimeout(() => {
                        window.location.href = response.payment_url;
                    }, 1500);
                    
                } else {
                    throw new Error(response.error || 'Failed to create donation');
                }

            } catch (error) {
                console.error('Donation form error:', error);
                
                // Track donation error
                this.trackEvent('donation_error', {
                    error: error.message,
                    amount: this.selectedAmount,
                    step: 'creation'
                });
                
                this.showNotification(
                    error.message || 'Failed to process donation. Please try again.',
                    'error'
                );
            } finally {
                // Restore button state
                this.isProcessing = false;
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
                this.showLoadingOverlay(false);
            }
        });
    }

    /**
     * Prepare form data for submission
     */
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
        
        // Clean and validate phone number
        if (data.donor_phone) {
            data.donor_phone = data.donor_phone.replace(/\D/g, '');
            if (data.donor_phone.length !== 10 || !data.donor_phone.match(/^[6-9]/)) {
                delete data.donor_phone; // Remove invalid phone
            }
        }
        
        // Clean and validate PAN
        if (data.donor_pan) {
            data.donor_pan = data.donor_pan.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (!data.donor_pan.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
                delete data.donor_pan; // Remove invalid PAN
            }
        }
        
        // Generate unique transaction ID
        data.transaction_id = this.generateTransactionId();
        
        // Add metadata
        data.source = 'website';
        data.user_agent = navigator.userAgent;
        data.referrer = document.referrer;
        data.timestamp = new Date().toISOString();
        
        return data;
    }

    /**
     * Generate unique transaction ID
     */
    generateTransactionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();
        return `SSF${timestamp}${random}${suffix}`;
    }

    /**
     * Setup real-time form validation
     */
    setupRealTimeValidation() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Validation on blur
            input.addEventListener('blur', () => this.validateField(input));
            
            // Clear errors on input
            input.addEventListener('input', () => this.clearFieldError(input));
            
            // Special formatting
            if (input.type === 'tel') {
                input.addEventListener('input', (e) => this.formatPhoneNumber(e));
            }
            
            if (input.id === 'donor_pan') {
                input.addEventListener('input', (e) => this.formatPAN(e));
            }
        });
    }

    /**
     * Setup form enhancements
     */
    setupFormEnhancements() {
        // Anonymous donation toggle
        const anonymousCheckbox = document.getElementById('anonymous');
        if (anonymousCheckbox) {
            anonymousCheckbox.addEventListener('change', (e) => {
                const donorFields = document.querySelectorAll('.donor-info input');
                const isAnonymous = e.target.checked;
                
                donorFields.forEach(field => {
                    if (field.id !== 'donor_email') { // Email is always required
                        field.required = !isAnonymous;
                        field.parentElement.style.opacity = isAnonymous ? '0.6' : '1';
                    }
                });
                
                this.trackEvent('anonymous_toggle', { anonymous: isAnonymous });
            });
        }
        
        // Address autofill
        this.setupAddressAutofill();
        
        // Donation purpose explanation
        this.setupDonationPurposeInfo();
    }

    /**
     * Setup address autofill (basic implementation)
     */
    setupAddressAutofill() {
        const addressInput = document.getElementById('donor_address');
        if (!addressInput) return;
        
        // Implement address suggestions/autofill if needed
        // This could integrate with Google Places API or similar service
    }

    /**
     * Setup donation purpose information
     */
    setupDonationPurposeInfo() {
        const causeButtons = document.querySelectorAll('.cause-btn');
        const purposeInfo = document.getElementById('purpose-info');
        
        if (!purposeInfo) return;
        
        const purposeDescriptions = {
            'general': 'Your donation will be used where it\'s needed most to support our various programs and operations.',
            'poor-feeding': 'Directly supports our food distribution programs, providing nutritious meals to underprivileged communities.',
            'education': 'Funds educational materials, school supplies, and scholarship programs for disadvantaged children.',
            'medical': 'Supports medical camps, healthcare services, and emergency medical assistance for the needy.',
            'disaster': 'Enables rapid response and relief efforts during natural disasters and emergencies.'
        };
        
        causeButtons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                const cause = button.dataset.cause;
                purposeInfo.textContent = purposeDescriptions[cause] || purposeDescriptions.general;
            });
        });
    }

    /**
     * Validate form before submission
     */
    validateForm() {
        const requiredFields = this.form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        let firstErrorField = null;
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
                if (!firstErrorField) {
                    firstErrorField = field;
                }
            }
        });
        
        // Validate amount
        if (this.selectedAmount < 1 || this.selectedAmount > 1000000) {
            this.showNotification('Please select a valid donation amount between ₹1 and ₹10,00,000', 'error');
            isValid = false;
        }
        
        // Validate terms checkbox
        const termsCheckbox = document.getElementById('terms');
        if (termsCheckbox && !termsCheckbox.checked) {
            this.showNotification('Please agree to the terms and conditions', 'error');
            isValid = false;
        }
        
        // Focus first error field
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
        const fieldName = input.name || input.id;
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
                errorMessage = 'Please enter a valid 10-digit Indian mobile number';
                isValid = false;
            }
        }
        
        // PAN validation
        else if (fieldName === 'donor_pan' && value) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(value.toUpperCase())) {
                errorMessage = 'Please enter a valid PAN number (ABCDE1234F format)';
                isValid = false;
            }
        }
        
        // Name validation
        else if (fieldName === 'donor_name' && value) {
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
     * Show field error message
     */
    showFieldError(input, message) {
        input.classList.add('error');
        input.setAttribute('aria-invalid', 'true');
        
        // Remove existing error message
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.setAttribute('role', 'alert');
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        // Insert after input or its container
        if (input.parentNode.classList.contains('input-group')) {
            input.parentNode.parentNode.appendChild(errorDiv);
        } else {
            input.parentNode.appendChild(errorDiv);
        }
    }

    /**
     * Clear field error message
     */
    clearFieldError(input) {
        input.classList.remove('error');
        input.removeAttribute('aria-invalid');
        
        // Look for error message in multiple possible locations
        let errorMessage = input.parentNode.querySelector('.error-message');
        if (!errorMessage && input.parentNode.classList.contains('input-group')) {
            errorMessage = input.parentNode.parentNode.querySelector('.error-message');
        }
        
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
     * Format PAN input
     */
    formatPAN(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        e.target.value = value;
    }

    /**
     * Update donation summary
     */
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
        
        // Update tax deduction (80G - 100% for registered NGOs)
        const taxDeduction = Math.floor(this.selectedAmount);
        const taxDeductionElement = document.getElementById('tax-deduction');
        if (taxDeductionElement) {
            taxDeductionElement.textContent = this.formatCurrency(taxDeduction);
        }
        
        // Update processing fee (if any)
        const processingFee = this.calculateProcessingFee(this.selectedAmount);
        const processingFeeElement = document.getElementById('processing-fee');
        if (processingFeeElement) {
            processingFeeElement.textContent = this.formatCurrency(processingFee);
        }
    }

    /**
     * Update impact information based on amount and cause
     */
    updateImpactInfo() {
        const impactElement = document.getElementById('impact-info');
        if (!impactElement) return;
        
        const impactCalculations = {
            'poor-feeding': (amount) => {
                const meals = Math.floor(amount / 25); // Assuming ₹25 per meal
                return `Your donation can provide approximately <strong>${meals} nutritious meals</strong> to hungry families.`;
            },
            'education': (amount) => {
                const supplies = Math.floor(amount / 500); // Assuming ₹500 per child for supplies
                return `Your donation can provide <strong>school supplies for ${supplies} children</strong> for a month.`;
            },
            'medical': (amount) => {
                const consultations = Math.floor(amount / 200); // Assuming ₹200 per consultation
                return `Your donation can provide <strong>${consultations} medical consultations</strong> to those in need.`;
            },
            'disaster': (amount) => {
                const kits = Math.floor(amount / 1000); // Assuming ₹1000 per relief kit
                return `Your donation can provide <strong>${kits} emergency relief kits</strong> to disaster-affected families.`;
            },
            'general': (amount) => {
                return `Your generous donation of <strong>${this.formatCurrency(amount)}</strong> will make a meaningful impact across all our programs.`;
            }
        };
        
        const impactText = impactCalculations[this.selectedCause] || impactCalculations['general'];
        impactElement.innerHTML = impactText(this.selectedAmount);
    }

    /**
     * Calculate processing fee (PhonePe charges)
     */
    calculateProcessingFee(amount) {
        // PhonePe typically charges ~2% + GST
        return Math.ceil(amount * 0.024); // 2.4% including GST
    }

    /**
     * Update payment method information
     */
    updatePaymentMethodInfo(method) {
        const paymentInfo = document.getElementById('payment-method-info');
        if (!paymentInfo) return;
        
        const methodInfo = {
            'phonepe': 'Secure payment via PhonePe. Supports UPI, cards, net banking, and wallets.',
            'bank_transfer': 'Direct bank transfer. You will receive bank details after form submission.',
            'cheque': 'Cheque payments can be sent to our registered office address.'
        };
        
        paymentInfo.textContent = methodInfo[method] || '';
    }

    /**
     * Initialize CSRF token
     */
    async initializeCSRFToken() {
        try {
            this.csrfToken = await this.getCSRFToken();
            const csrfInput = document.getElementById('csrf_token');
            if (csrfInput) {
                csrfInput.value = this.csrfToken;
            }
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
     * Make API call with error handling
     */
    async makeAPICall(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);
            
            const response = await fetch(`${this.apiURL}${endpoint}`, {
                ...finalOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please check your connection and try again.');
            }
            throw error;
        }
    }

    /**
     * Store donation details in session storage for verification
     */
    storeDonationDetails(details) {
        try {
            sessionStorage.setItem('donationDetails', JSON.stringify({
                ...details,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to store donation details:', error);
        }
    }

    /**
     * Handle URL parameters for pre-filled forms
     */
    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Pre-select cause
        const cause = urlParams.get('cause');
        if (cause) {
            const causeButton = document.querySelector(`[data-cause="${cause}"]`);
            if (causeButton) {
                causeButton.click();
            }
        }
        
        // Pre-fill amount
        const amount = urlParams.get('amount');
        if (amount) {
            const amountValue = parseInt(amount);
            if (amountValue >= 1 && amountValue <= 1000000) {
                const customAmountInput = document.getElementById('customAmount');
                if (customAmountInput) {
                    customAmountInput.value = amountValue;
                    customAmountInput.dispatchEvent(new Event('input'));
                }
            }
        }
        
        // Pre-select frequency
        const frequency = urlParams.get('frequency');
        if (frequency) {
            const frequencyInput = document.querySelector(`input[name="frequency"][value="${frequency}"]`);
            if (frequencyInput) {
                frequencyInput.checked = true;
                frequencyInput.dispatchEvent(new Event('change'));
            }
        }
    }

    /**
     * Setup analytics tracking
     */
    setupAnalytics() {
        // Track page view
        this.trackEvent('donation_page_view', {
            timestamp: new Date().toISOString(),
            referrer: document.referrer
        });
        
        // Track form interactions
        const formInputs = this.form.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('focus', () => {
                this.trackEvent('form_field_focus', { field: input.name || input.id });
            }, { once: true });
        });
    }

    /**
     * Track events for analytics
     */
    trackEvent(eventName, properties = {}) {
        // Google Analytics 4
        if (typeof gtag === 'function') {
            gtag('event', eventName, properties);
        }
        
        // Facebook Pixel
        if (typeof fbq === 'function') {
            fbq('track', 'CustomEvent', { event_name: eventName, ...properties });
        }
        
        console.log('Event tracked:', eventName, properties);
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
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

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    /**
     * Show/hide loading overlay
     */
    showLoadingOverlay(show = true, message = 'Processing...') {
        let overlay = document.getElementById('loadingOverlay');
        
        if (show && !overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner">
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <h3>${message}</h3>
                    <p>Please do not close or refresh this page...</p>
                    <p class="secure-notice"><i class="fas fa-shield-alt"></i> Your transaction is secured with 256-bit SSL encryption</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else if (!show && overlay) {
            overlay.remove();
        }
    }

    /**
     * Format currency for display
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}

/**
 * Handle payment success/failure callbacks
 */
class PaymentHandler {
    constructor() {
        this.handlePaymentCallback();
    }

    handlePaymentCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const transactionId = urlParams.get('transaction_id');
        
        if (status && transactionId) {
            if (status === 'success') {
                this.showPaymentSuccess(transactionId);
            } else if (status === 'failed') {
                this.showPaymentFailure(transactionId);
            }
        }
    }

    showPaymentSuccess(transactionId) {
        const donationDetails = this.getDonationDetails();
        
        const message = `
            <div class="payment-success">
                <i class="fas fa-check-circle"></i>
                <h2>Thank You for Your Generous Donation!</h2>
                <p>Your donation has been processed successfully.</p>
                <div class="donation-details">
                    <p><strong>Transaction ID:</strong> ${transactionId}</p>
                    ${donationDetails.receiptNumber ? `<p><strong>Receipt Number:</strong> ${donationDetails.receiptNumber}</p>` : ''}
                    ${donationDetails.amount ? `<p><strong>Amount:</strong> ${this.formatCurrency(donationDetails.amount)}</p>` : ''}
                </div>
                <p class="receipt-info">You will receive an email receipt and tax exemption certificate shortly.</p>
                <div class="social-share">
                    <p>Help us spread the word:</p>
                    <button onclick="this.shareOnSocialMedia('facebook')" class="share-btn facebook">
                        <i class="fab fa-facebook-f"></i> Share
                    </button>
                    <button onclick="this.shareOnSocialMedia('twitter')" class="share-btn twitter">
                        <i class="fab fa-twitter"></i> Tweet
                    </button>
                    <button onclick="this.shareOnSocialMedia('whatsapp')" class="share-btn whatsapp">
                        <i class="fab fa-whatsapp"></i> Share
                    </button>
                </div>
            </div>
        `;
        
        this.showPaymentModal(message, 'success');
        
        // Track successful payment
        this.trackEvent('donation_completed', {
            transaction_id: transactionId,
            amount: donationDetails.amount
        });
    }

    showPaymentFailure(transactionId) {
        const message = `
            <div class="payment-failure">
                <i class="fas fa-times-circle"></i>
                <h2>Payment Could Not Be Processed</h2>
                <p>Unfortunately, your payment could not be completed.</p>
                <div class="donation-details">
                    <p><strong>Transaction ID:</strong> ${transactionId}</p>
                </div>
                <p>Please try again or contact our support team if the issue persists.</p>
                <div class="contact-info">
                    <p><strong>Support:</strong> support@saisevafoundation.org</p>
                    <p><strong>Phone:</strong> +91-XXXXX-XXXXX</p>
                </div>
            </div>
        `;
        
        this.showPaymentModal(message, 'error');
        
        // Track failed payment
        this.trackEvent('donation_failed', {
            transaction_id: transactionId
        });
    }

    showPaymentModal(content, type) {
        const modal = document.createElement('div');
        modal.className = `payment-status-modal ${type}`;
        modal.innerHTML = `
            <div class="modal-content">
                ${content}
                <div class="modal-actions">
                    <button onclick="window.location.href='./index.html'" class="btn btn-primary">
                        Go to Homepage
                    </button>
                    ${type === 'error' ? `
                        <button onclick="window.location.href='./donate.html'" class="btn btn-secondary">
                            Try Again
                        </button>
                        <button onclick="window.location.href='./contact.html'" class="btn btn-outline">
                            Contact Support
                        </button>
                    ` : `
                        <button onclick="window.location.href='./donate.html'" class="btn btn-secondary">
                            Make Another Donation
                        </button>
                    `}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Prevent closing modal by clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
            }
        });
    }

    getDonationDetails() {
        try {
            const stored = sessionStorage.getItem('donationDetails');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to get donation details:', error);
            return {};
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

    trackEvent(eventName, properties = {}) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, properties);
        }
        console.log('Event tracked:', eventName, properties);
    }

    shareOnSocialMedia(platform) {
        const message = "I just donated to Sai Seva Foundation! Join me in making a difference. Every contribution counts!";
        const url = window.location.origin;
        
        const shareUrls = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(message + ' ' + url)}`
        };
        
        if (shareUrls[platform]) {
            window.open(shareUrls[platform], '_blank', 'width=550,height=350');
        }
    }
}

// Initialize donation form and payment handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.donationForm = new DonationForm();
    window.paymentHandler = new PaymentHandler();
});

// Export for global access
window.DonationForm = DonationForm;
window.PaymentHandler = PaymentHandler;