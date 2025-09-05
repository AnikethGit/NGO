/**
 * PRODUCTION Main JavaScript - Sai Seva Foundation
 * Enhanced with error handling, performance optimization, and security features
 * 
 * @version 1.0.0
 * @author Sai Seva Foundation Development Team
 */

class NGOWebsite {
    constructor() {
        this.baseURL = window.location.origin;
        this.apiURL = this.baseURL + '/api';
        this.isProduction = !window.location.hostname.includes('localhost');
        this.csrfToken = '4ff0c3a6f7cdb69870b0963c2cbd2f648d39f851f7bc00b42a8e69aacc8955b0';
        this.retryAttempts = 3;
        this.requestTimeout = 30000; // 30 seconds
        
        this.init();
    }

    /**
     * Initialize the website functionality
     */
    init() {
        this.setupEventListeners();
        this.initializeComponents();
        this.handleRouting();
        this.initializePerformanceMonitoring();
        
        // Initialize CSRF token
        this.initializeCSRFToken();
        
        // Set up error handling
        this.setupGlobalErrorHandling();
        
        // Initialize accessibility features
        this.initializeAccessibility();
    }

    /**
     * Set up all event listeners
     */
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
        
        // Newsletter subscription
        this.setupNewsletterSubscription();
        
        // Search functionality
        this.setupSearch();
        
        // Lazy loading
        this.setupLazyLoading();
    }

    /**
     * Setup navigation with active link highlighting and scroll spy
     */
    setupNavigation() {
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

    /**
     * Setup scroll spy for single page navigation
     */
    setupScrollSpy() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -80% 0px',
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

    /**
     * Setup mobile menu with proper accessibility
     */
    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');

        if (!hamburger || !navMenu) return;

        hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Update ARIA attributes
            hamburger.setAttribute('aria-expanded', isOpen);
            navMenu.setAttribute('aria-hidden', !isOpen);
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = isOpen ? 'hidden' : '';
            
            // Focus management
            if (isOpen) {
                navMenu.querySelector('.nav-link')?.focus();
            }
        });

        // Close menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                this.closeMobileMenu();
                hamburger.focus();
            }
        });
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            navMenu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }

    /**
     * Setup smooth scrolling with better performance
     */
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
                    
                    // Use modern scroll API if available
                    if ('scrollBehavior' in document.documentElement.style) {
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    } else {
                        // Fallback for older browsers
                        this.smoothScrollPolyfill(targetPosition);
                    }
                    
                    // Update URL without triggering page reload
                    if (history.pushState) {
                        history.pushState(null, null, `#${targetId}`);
                    }
                }
            });
        });
    }

    /**
     * Smooth scroll polyfill for older browsers
     */
    smoothScrollPolyfill(targetPosition) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 800;
        let start = null;
        
        const animateScroll = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const run = this.easeInOutQuad(progress, startPosition, distance, duration);
            window.scrollTo(0, run);
            
            if (progress < duration) {
                requestAnimationFrame(animateScroll);
            }
        };
        
        requestAnimationFrame(animateScroll);
    }

    /**
     * Easing function for smooth scroll
     */
    easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    /**
     * Setup animated statistics counter
     */
    setupStatsCounter() {
        const statNumbers = document.querySelectorAll('[data-target]');
        
        const animateStats = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.getAttribute('data-target'));
                    const element = entry.target;
                    const duration = 2000;
                    const increment = target / (duration / 16);
                    
                    let current = 0;
                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            element.textContent = Math.ceil(current).toLocaleString('en-IN');
                            requestAnimationFrame(updateCounter);
                        } else {
                            element.textContent = target.toLocaleString('en-IN');
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

    /**
     * Setup testimonials carousel with auto-play and touch support
     */
    setupTestimonials() {
        const testimonials = document.querySelectorAll('.testimonial');
        const dots = document.querySelectorAll('.testimonial-dot');
        let currentTestimonial = 0;
        let autoPlayInterval = null;
        let isAutoPlaying = true;

        if (testimonials.length === 0) return;

        const showTestimonial = (index) => {
            // Hide all testimonials
            testimonials.forEach(testimonial => {
                testimonial.classList.remove('active');
                testimonial.setAttribute('aria-hidden', 'true');
            });
            
            // Remove active class from all dots
            dots.forEach(dot => {
                dot.classList.remove('active');
                dot.setAttribute('aria-pressed', 'false');
            });
            
            // Show current testimonial and activate dot
            if (testimonials[index]) {
                testimonials[index].classList.add('active');
                testimonials[index].setAttribute('aria-hidden', 'false');
            }
            if (dots[index]) {
                dots[index].classList.add('active');
                dots[index].setAttribute('aria-pressed', 'true');
            }
        };

        const nextTestimonial = () => {
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            showTestimonial(currentTestimonial);
        };

        const startAutoPlay = () => {
            if (isAutoPlaying) {
                autoPlayInterval = setInterval(nextTestimonial, 5000);
            }
        };

        const stopAutoPlay = () => {
            if (autoPlayInterval) {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            }
        };

        // Dot click handlers
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentTestimonial = index;
                showTestimonial(currentTestimonial);
                stopAutoPlay();
                // Restart auto-play after user interaction
                setTimeout(startAutoPlay, 3000);
            });
        });

        // Pause auto-play on hover
        const testimonialContainer = document.querySelector('.testimonials');
        if (testimonialContainer) {
            testimonialContainer.addEventListener('mouseenter', stopAutoPlay);
            testimonialContainer.addEventListener('mouseleave', startAutoPlay);
            
            // Pause on focus (accessibility)
            testimonialContainer.addEventListener('focusin', stopAutoPlay);
            testimonialContainer.addEventListener('focusout', startAutoPlay);
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.activeElement?.closest('.testimonials')) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    currentTestimonial = currentTestimonial === 0 ? testimonials.length - 1 : currentTestimonial - 1;
                    showTestimonial(currentTestimonial);
                    stopAutoPlay();
                    setTimeout(startAutoPlay, 3000);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    nextTestimonial();
                    stopAutoPlay();
                    setTimeout(startAutoPlay, 3000);
                }
            }
        });

        // Touch support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        if (testimonialContainer) {
            testimonialContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            });

            testimonialContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const swipeThreshold = 50;
                
                if (touchStartX - touchEndX > swipeThreshold) {
                    // Swipe left - next testimonial
                    nextTestimonial();
                    stopAutoPlay();
                    setTimeout(startAutoPlay, 3000);
                } else if (touchEndX - touchStartX > swipeThreshold) {
                    // Swipe right - previous testimonial
                    currentTestimonial = currentTestimonial === 0 ? testimonials.length - 1 : currentTestimonial - 1;
                    showTestimonial(currentTestimonial);
                    stopAutoPlay();
                    setTimeout(startAutoPlay, 3000);
                }
            });
        }

        // Start auto-play
        startAutoPlay();

        // Pause auto-play when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                isAutoPlaying = false;
                stopAutoPlay();
            } else {
                isAutoPlaying = true;
                startAutoPlay();
            }
        });
    }

    /**
     * Setup FAQ accordion with accessibility
     */
    setupFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const icon = question.querySelector('i');
            
            if (!question || !answer) return;
            
            // Set initial ARIA attributes
            const questionId = `faq-question-${Math.random().toString(36).substr(2, 9)}`;
            const answerId = `faq-answer-${Math.random().toString(36).substr(2, 9)}`;
            
            question.setAttribute('id', questionId);
            question.setAttribute('aria-expanded', 'false');
            question.setAttribute('aria-controls', answerId);
            question.setAttribute('role', 'button');
            question.setAttribute('tabindex', '0');
            
            answer.setAttribute('id', answerId);
            answer.setAttribute('aria-labelledby', questionId);
            answer.setAttribute('role', 'region');
            
            const toggleFAQ = () => {
                const isActive = item.classList.contains('active');
                
                // Close all FAQ items
                faqItems.forEach(faq => {
                    faq.classList.remove('active');
                    const faqQuestion = faq.querySelector('.faq-question');
                    const faqIcon = faq.querySelector('.faq-question i');
                    if (faqQuestion) faqQuestion.setAttribute('aria-expanded', 'false');
                    if (faqIcon) {
                        faqIcon.classList.remove('fa-minus');
                        faqIcon.classList.add('fa-plus');
                    }
                });
                
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                    question.setAttribute('aria-expanded', 'true');
                    if (icon) {
                        icon.classList.remove('fa-plus');
                        icon.classList.add('fa-minus');
                    }
                    
                    // Scroll to FAQ item if needed
                    const rect = item.getBoundingClientRect();
                    if (rect.top < 100) {
                        item.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            };
            
            question.addEventListener('click', toggleFAQ);
            
            // Keyboard support
            question.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFAQ();
                }
            });
        });
    }

    /**
     * Setup newsletter subscription
     */
    setupNewsletterSubscription() {
        const newsletterForms = document.querySelectorAll('.newsletter-form');
        
        newsletterForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const emailInput = form.querySelector('input[type="email"]');
                const submitButton = form.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                
                if (!emailInput || !submitButton) return;
                
                try {
                    submitButton.disabled = true;
                    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
                    
                    const response = await this.makeAPICall('/newsletter.php', {
                        method: 'POST',
                        body: JSON.stringify({
                            email: emailInput.value,
                            csrf_token: this.csrfToken
                        })
                    });

                    if (response.success) {
                        this.showNotification('Successfully subscribed to newsletter!', 'success');
                        emailInput.value = '';
                        
                        // Track newsletter subscription
                        this.trackEvent('newsletter_subscribe', { email: emailInput.value });
                    } else {
                        throw new Error(response.error || 'Subscription failed');
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

    /**
     * Setup search functionality
     */
    setupSearch() {
        const searchInputs = document.querySelectorAll('.search-input');
        
        searchInputs.forEach(input => {
            let searchTimeout;
            
            input.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length >= 3) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 300);
                }
            });
        });
    }

    /**
     * Perform search operation
     */
    async performSearch(query) {
        try {
            const response = await this.makeAPICall(`/search.php?q=${encodeURIComponent(query)}`);
            
            if (response.success) {
                this.displaySearchResults(response.results);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    /**
     * Setup scroll animations with Intersection Observer
     */
    setupScrollAnimations() {
        const animatedElements = document.querySelectorAll('.animate-on-scroll, .service-card, .project-card, .event-card, .impact-item, .about-item');
        
        const animateOnScroll = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.classList.add('animated');
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

    /**
     * Setup lazy loading for images
     */
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    img.addEventListener('load', () => {
                        img.classList.add('loaded');
                    });
                    observer.unobserve(img);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        images.forEach(img => {
            img.classList.add('lazy');
            imageObserver.observe(img);
        });
    }

    /**
     * Setup forms with enhanced validation and submission
     */
    setupForms() {
        // Contact form
        this.setupContactForm();
        
        // Form validation
        this.setupFormValidation();
        
        // File uploads
        this.setupFileUploads();
    }

    /**
     * Setup contact form with enhanced features
     */
    setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.validateForm(contactForm)) {
                return;
            }
            
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            try {
                // Show loading state
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                const formData = new FormData(contactForm);
                const data = Object.fromEntries(formData.entries());
                
                // Add CSRF token
                data.csrf_token = this.csrfToken;
                
                const response = await this.makeAPICall('/contact.php', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                if (response.success) {
                    this.showNotification('Message sent successfully! We will get back to you soon.', 'success');
                    contactForm.reset();
                    
                    // Track contact form submission
                    this.trackEvent('contact_form_submit', { category: data.category });
                } else {
                    throw new Error(response.error || 'Failed to send message');
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

    /**
     * Setup enhanced form validation
     */
    setupFormValidation() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                // Real-time validation
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
                
                // Special formatting
                if (input.type === 'tel') {
                    input.addEventListener('input', (e) => this.formatPhoneNumber(e));
                }
                
                if (input.id === 'donor_pan' || input.name === 'pan') {
                    input.addEventListener('input', (e) => this.formatPAN(e));
                }
            });
        });
    }

    /**
     * Validate individual form field
     */
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
                if (!this.isStrongPassword(value)) {
                    errorMessage = 'Password must contain at least one uppercase letter, lowercase letter, number, and special character';
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

    /**
     * Check if password is strong enough
     */
    isStrongPassword(password) {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
        return strongPasswordRegex.test(password);
    }

    /**
     * Validate entire form
     */
    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
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
        input.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error message
     */
    clearFieldError(input) {
        input.classList.remove('error');
        input.removeAttribute('aria-invalid');
        const errorMessage = input.parentNode.querySelector('.error-message');
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
     * Initialize CSRF token
     */
    async initializeCSRFToken() {
        try {
            const token = await this.getCSRFToken();
            const csrfInputs = document.querySelectorAll('input[name="csrf_token"]');
            csrfInputs.forEach(input => {
                input.value = token;
            });
        } catch (error) {
            console.error('Failed to initialize CSRF token:', error);
        }
    }

    /**
     * Get CSRF token from API
     */
    async getCSRFToken() {
        try {
            const response = await fetch(`${this.apiURL}/auth.php?action=csrf_token`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const htmlText = await response.text();
                console.error('Expected JSON but got:', htmlText.substring(0, 200));
                throw new Error('Server returned invalid response format');
            }
            
            const data = await response.json();
            
            if (data.success && data.csrf_token) {
                this.csrfToken = data.csrf_token;
                return data.csrf_token;
            } else {
                throw new Error('Invalid CSRF token response');
            }
            
        } catch (error) {
            console.error('CSRF token fetch error:', error);
            return '';
        }
    }

    /**
     * Make API call with retry logic and error handling
     */
    async makeAPICall(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.csrfToken
            },
            timeout: this.requestTimeout
        };

        const finalOptions = { ...defaultOptions, ...options };
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
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
                
                const data = await response.json();
                return data;
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.message.includes('HTTP 4')) {
                    break;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < this.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        
        throw lastError;
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
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('JavaScript Error:', event.error);
            
            if (this.isProduction) {
                // Send error to logging service
                this.logError(event.error, 'javascript_error');
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise Rejection:', event.reason);
            
            if (this.isProduction) {
                // Send error to logging service
                this.logError(event.reason, 'promise_rejection');
            }
        });
    }

    /**
     * Initialize accessibility features
     */
    initializeAccessibility() {
        // Skip to content link
        this.setupSkipLink();
        
        // Focus management
        this.setupFocusManagement();
        
        // Keyboard navigation
        this.setupKeyboardNavigation();
    }

    /**
     * Setup skip to content link
     */
    setupSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: fixed;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 10000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        // Monitor page load time
        window.addEventListener('load', () => {
            if ('performance' in window && 'timing' in performance) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                console.log(`Page load time: ${loadTime}ms`);
                
                if (this.isProduction) {
                    // Send performance metrics to analytics
                    this.trackPerformance('page_load_time', loadTime);
                }
            }
        });

        // Monitor Core Web Vitals
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.entryType === 'largest-contentful-paint') {
                            console.log(`LCP: ${entry.startTime}ms`);
                        }
                        if (entry.entryType === 'first-input') {
                            console.log(`FID: ${entry.processingStart - entry.startTime}ms`);
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
            } catch (e) {
                // Performance Observer not supported
                console.log('Performance Observer not supported');
            }
        }
    }

    /**
     * Track events for analytics
     */
    trackEvent(eventName, properties = {}) {
        if (this.isProduction && typeof gtag === 'function') {
            gtag('event', eventName, properties);
        }
        
        console.log('Event tracked:', eventName, properties);
    }

    /**
     * Track performance metrics
     */
    trackPerformance(metric, value) {
        if (this.isProduction && typeof gtag === 'function') {
            gtag('event', 'timing_complete', {
                name: metric,
                value: Math.round(value)
            });
        }
    }

    /**
     * Log errors to external service
     */
    logError(error, type) {
        // Implement error logging service integration
        console.log('Error logged:', type, error);
    }

    /**
     * Initialize components
     */
    initializeComponents() {
        // Initialize tooltips
        this.setupTooltips();
        
        // Initialize modals
        this.setupModals();
    }

    /**
     * Setup tooltips
     */
    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.dataset.tooltip;
                tooltip.setAttribute('role', 'tooltip');
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

    /**
     * Setup modals
     */
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

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Focus first focusable element
            const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = '';
    }

    /**
     * Handle routing for SPA-like behavior
     */
    handleRouting() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.updatePageContent();
        });
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

    /**
     * Format date for display
     */
    formatDate(dateString, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return new Date(dateString).toLocaleDateString('en-IN', { ...defaultOptions, ...options });
    }

    /**
     * Debounce utility
     */
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

    /**
     * Throttle utility
     */
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
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden');
    } else {
        console.log('Page visible');
        // Refresh CSRF token if needed
        if (window.ngoWebsite) {
            window.ngoWebsite.initializeCSRFToken();
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.ngoWebsite) {
        window.ngoWebsite.showNotification('Connection restored', 'success');
    }
});

window.addEventListener('offline', () => {
    if (window.ngoWebsite) {
        window.ngoWebsite.showNotification('Connection lost. Some features may not work.', 'warning');
    }
});

// Export for global access
window.NGOWebsite = NGOWebsite;