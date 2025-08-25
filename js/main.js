// Main JavaScript file for NGO Website functionality
class NGOWebsite {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeComponents();
        this.handleRouting();
    }

    setupEventListeners() {
        // Navigation
        this.setupNavigation();
        
        // Forms
        this.setupForms();
        
        // Animations
        this.setupScrollAnimations();
        
        // Mobile menu
        this.setupMobileMenu();
        
        // Smooth scrolling
        this.setupSmoothScroll();
        
        // Statistics counter
        this.setupStatsCounter();
        
        // Testimonials
        this.setupTestimonials();
        
        // FAQ accordion
        this.setupFAQ();
    }

    setupNavigation() {
        // Active nav link highlighting
        const navLinks = document.querySelectorAll('.nav-link');
        const currentPage = window.location.pathname;

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || 
                (currentPage.includes(href.replace('.html', '')) && href !== 'index.html')) {
                link.classList.add('active');
            }
        });

        // Scroll-based nav highlighting for single page
        if (currentPage === '/' || currentPage === '/index.html' || currentPage === '') {
            this.setupScrollSpy();
        }
    }

    setupScrollSpy() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    
                    // Remove active class from all nav links
                    navLinks.forEach(link => link.classList.remove('active'));
                    
                    // Add active class to current section link
                    const activeLink = document.querySelector(`.nav-link[href="#${id}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    }

    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');

        if (!hamburger || !navMenu) return;

        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    setupSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = link.getAttribute('href').slice(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 80;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    setupStatsCounter() {
        const statNumbers = document.querySelectorAll('[data-target]');
        
        const animateStats = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.getAttribute('data-target'));
                    const element = entry.target;
                    const duration = 2000; // 2 seconds
                    const increment = target / (duration / 16); // 60fps
                    
                    let current = 0;
                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            element.textContent = Math.ceil(current).toLocaleString();
                            requestAnimationFrame(updateCounter);
                        } else {
                            element.textContent = target.toLocaleString();
                        }
                    };
                    
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        };

        const observer = new IntersectionObserver(animateStats, {
            threshold: 0.5
        });

        statNumbers.forEach(stat => observer.observe(stat));
    }

    setupTestimonials() {
        const testimonials = document.querySelectorAll('.testimonial');
        const dots = document.querySelectorAll('.testimonial-dot');
        let currentTestimonial = 0;

        if (testimonials.length === 0) return;

        const showTestimonial = (index) => {
            // Hide all testimonials
            testimonials.forEach(testimonial => {
                testimonial.classList.remove('active');
            });
            
            // Remove active class from all dots
            dots.forEach(dot => {
                dot.classList.remove('active');
            });
            
            // Show current testimonial and activate dot
            if (testimonials[index]) {
                testimonials[index].classList.add('active');
            }
            if (dots[index]) {
                dots[index].classList.add('active');
            }
        };

        // Dot click handlers
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentTestimonial = index;
                showTestimonial(currentTestimonial);
            });
        });

        // Auto-rotate testimonials
        setInterval(() => {
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            showTestimonial(currentTestimonial);
        }, 5000);
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

    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll, .service-card, .project-card, .event-card, .impact-item, .about-item');
        
        const animateOnScroll = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        };

        const observer = new IntersectionObserver(animateOnScroll, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });
    }

    setupForms() {
        // Contact form
        this.setupContactForm();
        
        // Newsletter subscription
        this.setupNewsletterForms();
        
        // Form validation
        this.setupFormValidation();
    }

    setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            try {
                // Show loading state
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                const formData = new FormData(contactForm);
                const data = Object.fromEntries(formData.entries());
                
                // Add CSRF token
                data.csrf_token = await this.getCSRFToken();
                
                const response = await fetch('/api/contact.php', {
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
                    contactForm.reset();
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

    setupNewsletterForms() {
        const newsletterForms = document.querySelectorAll('.newsletter-form');
        
        newsletterForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const emailInput = form.querySelector('input[type="email"]');
                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                
                try {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    const response = await fetch('/api/newsletter.php', {
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
                        this.showNotification('Successfully subscribed to newsletter!', 'success');
                        emailInput.value = '';
                    } else {
                        throw new Error(result.error || 'Subscription failed');
                    }

                } catch (error) {
                    console.error('Newsletter subscription error:', error);
                    this.showNotification(error.message || 'Subscription failed. Please try again.', 'error');
                } finally {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalText;
                }
            });
        });
    }

    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                // Real-time validation
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
                
                // Special validation for specific field types
                if (input.type === 'tel') {
                    input.addEventListener('input', (e) => this.formatPhoneNumber(e));
                }
                
                if (input.id === 'donor_pan' || input.name === 'pan') {
                    input.addEventListener('input', (e) => this.formatPAN(e));
                }
            });
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
        
        // PAN validation
        else if ((input.id === 'donor_pan' || input.name === 'pan') && value) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(value.toUpperCase())) {
                errorMessage = 'Please enter a valid PAN number (ABCDE1234F)';
                isValid = false;
            }
        }
        
        // Password validation
        else if (input.type === 'password' && value) {
            if (value.length < 8) {
                errorMessage = 'Password must be at least 8 characters long';
                isValid = false;
            } else if (input.id === 'register_password') {
                // Strong password validation for registration
                const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
                if (!strongPasswordRegex.test(value)) {
                    errorMessage = 'Password must contain at least one lowercase letter, uppercase letter, number, and special character';
                    isValid = false;
                }
            }
        }
        
        // Confirm password validation
        else if (input.id === 'confirm_password' && value) {
            const passwordInput = document.getElementById('register_password');
            if (passwordInput && value !== passwordInput.value) {
                errorMessage = 'Passwords do not match';
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

    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        e.target.value = value;
    }

    formatPAN(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        e.target.value = value;
    }

    initializeComponents() {
        // Initialize progress circles
        this.setupProgressCircles();
        
        // Initialize modals
        this.setupModals();
        
        // Initialize tooltips
        this.setupTooltips();
        
        // Initialize image lazy loading
        this.setupLazyLoading();
    }

    setupProgressCircles() {
        const progressCircles = document.querySelectorAll('.progress-circle');
        
        progressCircles.forEach(circle => {
            const progress = parseInt(circle.dataset.progress);
            if (progress) {
                circle.style.setProperty('--progress', progress);
                
                // Animate on scroll
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.style.animation = 'progressAnimation 2s ease-out forwards';
                            observer.unobserve(entry.target);
                        }
                    });
                });
                
                observer.observe(circle);
            }
        });
    }

    setupModals() {
        // Modal triggers
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal]')) {
                const modalId = e.target.dataset.modal;
                this.openModal(modalId);
            }
            
            if (e.target.matches('.modal-close') || e.target.closest('.modal-close')) {
                this.closeModal();
            }
        });

        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal')) {
                this.closeModal();
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.dataset.tooltip;
                document.body.appendChild(tooltip);
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
                
                setTimeout(() => tooltip.classList.add('visible'), 10);
            });
            
            element.addEventListener('mouseleave', () => {
                const tooltip = document.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.remove();
                }
            });
        });
    }

    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => {
            img.classList.add('lazy');
            imageObserver.observe(img);
        });
    }

    handleRouting() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.updatePageContent();
        });
    }

    // Utility functions
    async getCSRFToken() {
        try {
            const response = await fetch('/api/auth.php?action=csrf_token');
            const data = await response.json();
            return data.csrf_token;
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
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

    showLoading(show = true, message = 'Loading...') {
        let overlay = document.getElementById('loadingOverlay');
        
        if (show && !overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <h3>${message}</h3>
                </div>
            `;
            document.body.appendChild(overlay);
        } else if (!show && overlay) {
            overlay.remove();
        }
    }

    // API helper function
    async makeAPICall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': await this.getCSRFToken()
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(endpoint, finalOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API call error:', error);
            throw error;
        }
    }

    // Format currency helper
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    // Format date helper
    formatDate(dateString, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return new Date(dateString).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
    }

    // Debounce helper
    debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    // Throttle helper
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize the website when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ngoWebsite = new NGOWebsite();
    
    // Initialize CSRF token in meta tag
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        fetch('/api/auth.php?action=csrf_token')
            .then(response => response.json())
            .then(data => {
                csrfMeta.setAttribute('content', data.csrf_token);
                
                // Update all CSRF token inputs
                const csrfInputs = document.querySelectorAll('input[name="csrf_token"]');
                csrfInputs.forEach(input => {
                    input.value = data.csrf_token;
                });
            })
            .catch(error => console.error('Failed to initialize CSRF token:', error));
    }
});

// Export for global access
window.NGOWebsite = NGOWebsite;

// Additional utility functions
window.ngoUtils = {
    formatCurrency: (amount) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount),
    
    formatDate: (dateString) => new Date(dateString).toLocaleDateString('en-IN'),
    
    showNotification: (message, type = 'info') => {
        if (window.ngoWebsite) {
            window.ngoWebsite.showNotification(message, type);
        }
    },
    
    makeAPICall: async (endpoint, options = {}) => {
        if (window.ngoWebsite) {
            return await window.ngoWebsite.makeAPICall(endpoint, options);
        }
    }
};

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden
        console.log('Page hidden');
    } else {
        // Page is visible
        console.log('Page visible');
        // Refresh CSRF token if needed
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta && window.ngoWebsite) {
            window.ngoWebsite.getCSRFToken().then(token => {
                csrfMeta.setAttribute('content', token);
            });
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    window.ngoUtils.showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    window.ngoUtils.showNotification('Connection lost. Some features may not work.', 'warning');
});

// Performance monitoring
window.addEventListener('load', () => {
    if ('performance' in window && 'timing' in performance) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
        
        // Report slow loading times
        if (loadTime > 3000) {
            console.warn('Slow page load detected');
        }
    }
});