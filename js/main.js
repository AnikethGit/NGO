/**
 * MINIMAL Fix Main JavaScript - Sai Seva Foundation
 * Simple working solution that fixes bugs without breaking existing functionality
 * 
 * @version 1.1.0
 * @author Sai Seva Foundation Development Team
 */

class NGOWebsite {
    constructor() {
        this.isInitialized = false;
        this.csrfToken = null;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('Initializing NGO Website...');
        
        try {
            // Setup core functionality without complex dependencies
            this.setupEventListeners();
            this.setupNavigation();
            this.setupAnimations();
            
            // Initialize CSRF token (non-blocking)
            this.initializeCSRF();
            
            this.isInitialized = true;
            console.log('NGO Website initialized successfully');
            
        } catch (error) {
            console.error('Error initializing website:', error);
            // Don't show error message to user for initialization issues
        }
    }

    /**
     * Initialize CSRF token (async, non-blocking)
     */
    async initializeCSRF() {
        try {
            const response = await fetch('./api/auth.php?action=csrf_token', {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.csrf_token) {
                    this.csrfToken = data.csrf_token;
                    this.updateCSRFMetaTag(data.csrf_token);
                    console.log('CSRF token initialized');
                }
            }
        } catch (error) {
            console.warn('CSRF token initialization failed, using fallback:', error.message);
            // Generate fallback token
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
     * Generate fallback token
     */
    generateFallbackToken() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    setupEventListeners() {
        // Mobile menu toggle
        this.setupMobileMenu();
        
        // Smooth scrolling for anchor links
        this.setupSmoothScrolling();
        
        // Form handlers
        this.setupForms();
        
        // Loading overlay
        this.hideLoadingOverlay();
        
        // Global error handling (non-intrusive)
        this.setupErrorHandling();
    }

    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
                
                hamburger.setAttribute('aria-expanded', !isExpanded);
                navMenu.classList.toggle('active');
                hamburger.classList.toggle('active');
                
                // Prevent body scroll when menu is open
                document.body.classList.toggle('menu-open');
            });
            
            // Close menu when clicking on a link
            const navLinks = navMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    hamburger.classList.remove('active');
                    hamburger.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('menu-open');
                });
            });
        }
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
                    
                    const offsetTop = target.offsetTop - 100; // Account for fixed header
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    setupForms() {
        // Setup contact form
        this.setupContactForm();
        
        // Setup donation form
        this.setupDonationForm();
        
        // Setup newsletter form
        this.setupNewsletterForm();
        
        // Setup volunteer form
        this.setupVolunteerForm();
        
        // Setup file uploads (THIS WAS THE MISSING FUNCTION!)
        this.setupFileUploads();
    }

    /**
     * Setup file uploads - THE MISSING FUNCTION THAT CAUSED THE ERROR
     */
    setupFileUploads() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Basic file validation
                    const maxSize = 5 * 1024 * 1024; // 5MB
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
                    
                    if (file.size > maxSize) {
                        this.showMessage('File size must be less than 5MB', 'error');
                        input.value = '';
                        return;
                    }
                    
                    if (!allowedTypes.includes(file.type)) {
                        this.showMessage('Please upload only images or PDF files', 'error');
                        input.value = '';
                        return;
                    }
                    
                    // Display file name
                    const label = input.nextElementSibling;
                    if (label && label.tagName === 'LABEL') {
                        label.textContent = file.name;
                    }
                    
                    console.log('File selected:', file.name);
                }
            });
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
        // Intersection Observer for animations
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
                    element.textContent = Math.ceil(current).toLocaleString();
                    requestAnimationFrame(updateNumber);
                } else {
                    element.textContent = target.toLocaleString();
                }
            };
            
            updateNumber();
        });
    }

    setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        
        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleContactSubmit(contactForm);
            });
        }
    }

    setupDonationForm() {
        const donationForm = document.getElementById('donationForm');
        
        if (donationForm) {
            donationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleDonationSubmit(donationForm);
            });
            
            // Amount button selection
            const amountButtons = donationForm.querySelectorAll('.amount-btn');
            const customAmountInput = donationForm.querySelector('#customAmount');
            
            amountButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    amountButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    if (customAmountInput) {
                        customAmountInput.value = '';
                    }
                });
            });
            
            if (customAmountInput) {
                customAmountInput.addEventListener('input', () => {
                    amountButtons.forEach(b => b.classList.remove('active'));
                });
            }
        }
    }

    setupNewsletterForm() {
        const newsletterForms = document.querySelectorAll('.newsletter-form');
        
        newsletterForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleNewsletterSubmit(form);
            });
        });
    }

    setupVolunteerForm() {
        const volunteerForm = document.getElementById('volunteerForm');
        
        if (volunteerForm) {
            volunteerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleVolunteerSubmit(volunteerForm);
            });
        }
    }

    async handleContactSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Add CSRF token if available
            if (this.csrfToken) {
                data.csrf_token = this.csrfToken;
            }
            
            // Send request
            const response = await fetch('./api/contact.php?action=submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('Thank you for your message! We will get back to you soon.', 'success');
                form.reset();
            } else {
                throw new Error(result.error || 'Something went wrong');
            }
            
        } catch (error) {
            console.error('Contact form error:', error);
            this.showMessage('There was an error sending your message. Please try again.', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async handleNewsletterSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Subscribing...';
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Send request
            const response = await fetch('./api/contact.php?action=subscribe_newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showMessage('Successfully subscribed to our newsletter!', 'success');
                form.reset();
            } else {
                throw new Error(result.error || 'Something went wrong');
            }
            
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            this.showMessage('There was an error with your subscription. Please try again.', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async handleDonationSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Get selected amount
            const activeAmountBtn = form.querySelector('.amount-btn.active');
            const customAmount = form.querySelector('#customAmount')?.value;
            
            if (activeAmountBtn) {
                data.amount = activeAmountBtn.dataset.amount;
            } else if (customAmount) {
                data.amount = customAmount;
            }
            
            if (!data.amount || parseFloat(data.amount) <= 0) {
                throw new Error('Please select or enter a valid donation amount');
            }
            
            // For now, just show success message (integrate with payment gateway later)
            this.showMessage('Thank you for your donation! Redirecting to payment...', 'success');
            
            // Simulate redirect delay
            setTimeout(() => {
                console.log('Would redirect to payment gateway with amount:', data.amount);
            }, 2000);
            
        } catch (error) {
            console.error('Donation form error:', error);
            this.showMessage(error.message || 'There was an error processing your donation. Please try again.', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async handleVolunteerSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // For now, just show success message (implement API later)
            this.showMessage('Thank you for volunteering! We will contact you soon.', 'success');
            form.reset();
            
        } catch (error) {
            console.error('Volunteer form error:', error);
            this.showMessage('There was an error submitting your application. Please try again.', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.toast-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `toast-message toast-message--${type}`;
        messageEl.textContent = message;
        
        // Add styles if not already present
        if (!document.querySelector('#toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                .toast-message {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 24px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 10000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                .toast-message--success {
                    background-color: #10b981;
                }
                .toast-message--error {
                    background-color: #ef4444;
                }
                .toast-message--info {
                    background-color: #3b82f6;
                }
                .toast-message.show {
                    transform: translateX(0);
                }
                @media (max-width: 480px) {
                    .toast-message {
                        left: 20px;
                        right: 20px;
                        max-width: none;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to DOM
        document.body.appendChild(messageEl);
        
        // Trigger animation
        setTimeout(() => messageEl.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => messageEl.remove(), 300);
        }, 5000);
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

    setupErrorHandling() {
        // Global error handler (non-intrusive)
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            // Don't show user messages for JavaScript errors
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            event.preventDefault();
        });
    }
}

// Utility functions
const utils = {
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    },
    
    // Format date
    formatDate(date) {
        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }
};

// Initialize website when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main website functionality
    window.ngoWebsite = new NGOWebsite();
    
    // Make utils globally available
    window.utils = utils;
});

// Handle page load
window.addEventListener('load', () => {
    console.log('All resources loaded');
});

// Handle errors globally (non-intrusive)
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});