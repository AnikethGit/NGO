/**
 * HERO CAROUSEL JAVASCRIPT - Standalone Component
 * Complete functionality for hero image carousel
 */

class HeroCarousel {
    constructor(selector) {
        this.carousel = document.querySelector(selector);
        if (!this.carousel) return;

        // Elements
        this.slidesContainer = this.carousel.querySelector('.carousel-slides');
        this.slides = this.carousel.querySelectorAll('.carousel-slide');
        this.indicators = this.carousel.querySelectorAll('.indicator');
        this.prevBtn = this.carousel.querySelector('.carousel-btn--prev');
        this.nextBtn = this.carousel.querySelector('.carousel-btn--next');
        this.playPauseBtn = this.carousel.querySelector('.carousel-play-pause');
        this.progressBar = this.carousel.querySelector('.progress-bar');

        // State
        this.currentSlide = 0;
        this.totalSlides = this.slides.length;
        this.isPlaying = true;
        this.autoPlayInterval = null;
        this.autoPlayDuration = 4000; // 4 seconds per slide
        this.progressInterval = null;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.isTransitioning = false;

        // Settings
        this.pauseOnHover = false;
        this.pauseOnFocus = false;
        this.keyboardNavigation = true;
        this.touchNavigation = true;

        this.init();
    }

    init() {
        if (this.totalSlides <= 1) return;

        this.setupEventListeners();
        this.setupAccessibility();
        this.setupTouchEvents();
        this.animateNumbers();
        this.startAutoPlay();
        this.startProgress();

        // Preload next images
        this.preloadImages();

        // Handle reduced motion preference
        this.handleReducedMotion();
    }

    setupEventListeners() {
        // Navigation buttons
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevSlide());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }

        // Indicators
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });

        // Play/Pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => this.toggleAutoPlay());
        }

        // Pause on hover
        if (this.pauseOnHover) {
            this.carousel.addEventListener('mouseenter', () => this.pauseAutoPlay());
            this.carousel.addEventListener('mouseleave', () => this.resumeAutoPlay());
        }

        // Pause on focus
        if (this.pauseOnFocus) {
            this.carousel.addEventListener('focusin', () => this.pauseAutoPlay());
            this.carousel.addEventListener('focusout', () => this.resumeAutoPlay());
        }

        // Keyboard navigation
        if (this.keyboardNavigation) {
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        }

        // Visibility change (pause when tab is not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoPlay();
            } else {
                this.resumeAutoPlay();
            }
        });

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    setupAccessibility() {
        // Set ARIA attributes
        this.carousel.setAttribute('aria-live', 'polite');
        this.carousel.setAttribute('aria-atomic', 'false');

        // Update slide ARIA attributes
        this.slides.forEach((slide, index) => {
            slide.setAttribute('aria-hidden', index !== this.currentSlide);
            slide.setAttribute('role', 'tabpanel');
            slide.setAttribute('id', `slide-${index}`);
        });

        // Update indicator ARIA attributes
        this.indicators.forEach((indicator, index) => {
            indicator.setAttribute('aria-controls', `slide-${index}`);
            indicator.setAttribute('aria-selected', index === this.currentSlide);
        });
    }

    setupTouchEvents() {
        if (!this.touchNavigation || !('ontouchstart' in window)) return;

        this.carousel.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.carousel.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = this.touchStartX - this.touchEndX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Swipe left - next slide
                this.nextSlide();
            } else {
                // Swipe right - previous slide
                this.prevSlide();
            }
        }
    }

    handleKeyboard(e) {
        if (!this.carousel.contains(document.activeElement)) return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.prevSlide();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextSlide();
                break;
            case ' ':
                e.preventDefault();
                this.toggleAutoPlay();
                break;
            case 'Home':
                e.preventDefault();
                this.goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                this.goToSlide(this.totalSlides - 1);
                break;
        }
    }

    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.updateSlidePositions();
        }, 250);
    }

    nextSlide() {
        if (this.isTransitioning) return;
        
        const nextIndex = (this.currentSlide + 1) % this.totalSlides;
        this.goToSlide(nextIndex);
    }

    prevSlide() {
        if (this.isTransitioning) return;
        
        const prevIndex = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.goToSlide(prevIndex);
    }

    goToSlide(index) {
        if (index === this.currentSlide || this.isTransitioning) return;

        this.isTransitioning = true;
        const previousSlide = this.currentSlide;
        this.currentSlide = index;

        // Update slide classes
        this.slides.forEach((slide, i) => {
            slide.classList.remove('active', 'prev');
            if (i === this.currentSlide) {
                slide.classList.add('active');
            } else if (i === previousSlide) {
                slide.classList.add('prev');
            }
        });

        // Update indicators
        this.indicators.forEach((indicator, i) => {
            indicator.classList.toggle('active', i === this.currentSlide);
            indicator.setAttribute('aria-selected', i === this.currentSlide);
        });

        // Update slide ARIA attributes
        this.slides.forEach((slide, i) => {
            slide.setAttribute('aria-hidden', i !== this.currentSlide);
        });

        // Animate numbers for the current slide
        setTimeout(() => {
            this.animateNumbers();
        }, 300);

        // Reset transition flag
        setTimeout(() => {
            this.isTransitioning = false;
        }, 800);

        // Announce slide change to screen readers
        this.announceSlideChange();

        // Reset progress bar
        this.resetProgress();

        // Preload next images
        this.preloadImages();
    }

    animateNumbers() {
        const currentSlideElement = this.slides[this.currentSlide];
        const numberElements = currentSlideElement.querySelectorAll('[data-target]');

        numberElements.forEach(element => {
            const target = parseInt(element.getAttribute('data-target'));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateNumber = () => {
                current += increment;
                if (current < target) {
                    element.textContent = Math.ceil(current).toLocaleString('en-IN');
                    requestAnimationFrame(updateNumber);
                } else {
                    element.textContent = target.toLocaleString('en-IN');
                }
            };

            // Start animation after a delay
            setTimeout(updateNumber, 500);
        });
    }

    startAutoPlay() {
        if (!this.isPlaying) return;

        this.autoPlayInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoPlayDuration);
    }

    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }

    pauseAutoPlay() {
        this.stopAutoPlay();
        this.stopProgress();
    }

    resumeAutoPlay() {
        if (this.isPlaying) {
            this.startAutoPlay();
            this.startProgress();
        }
    }

    toggleAutoPlay() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.startAutoPlay();
            this.startProgress();
            this.updatePlayPauseButton('pause');
        } else {
            this.stopAutoPlay();
            this.stopProgress();
            this.updatePlayPauseButton('play');
        }
    }

    updatePlayPauseButton(state) {
        if (!this.playPauseBtn) return;

        const icon = this.playPauseBtn.querySelector('i');
        if (!icon) return;

        if (state === 'play') {
            icon.className = 'fas fa-play';
            this.playPauseBtn.setAttribute('aria-label', 'Play auto-advance');
        } else {
            icon.className = 'fas fa-pause';
            this.playPauseBtn.setAttribute('aria-label', 'Pause auto-advance');
        }
    }

    startProgress() {
        if (!this.progressBar) return;

        this.stopProgress();
        
        let progress = 0;
        const increment = 100 / (this.autoPlayDuration / 50);

        this.progressInterval = setInterval(() => {
            progress += increment;
            this.progressBar.style.width = `${Math.min(progress, 100)}%`;

            if (progress >= 100) {
                this.resetProgress();
            }
        }, 50);
    }

    stopProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    resetProgress() {
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
        if (this.isPlaying) {
            setTimeout(() => this.startProgress(), 100);
        }
    }

    preloadImages() {
        const nextIndex = (this.currentSlide + 1) % this.totalSlides;
        const nextSlide = this.slides[nextIndex];
        const img = nextSlide.querySelector('.slide-background img');
        
        if (img && !img.complete) {
            const preloadImg = new Image();
            preloadImg.src = img.src;
        }
    }

    announceSlideChange() {
        const currentSlideElement = this.slides[this.currentSlide];
        const title = currentSlideElement.querySelector('.slide-title');
        
        if (title) {
            // Create a live region announcement
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = `Slide ${this.currentSlide + 1} of ${this.totalSlides}: ${title.textContent}`;
            
            document.body.appendChild(announcement);
            
            // Remove after announcement
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }
    }

    updateSlidePositions() {
        // Recalculate positions if needed (for responsive adjustments)
        this.slides.forEach((slide, index) => {
            if (index !== this.currentSlide) {
                slide.style.transform = '';
            }
        });
    }

    handleReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion) {
            // Disable auto-play for users who prefer reduced motion
            this.isPlaying = false;
            this.stopAutoPlay();
            this.stopProgress();
            this.updatePlayPauseButton('play');
            
            // Add reduced motion class
            this.carousel.classList.add('reduced-motion');
        }
    }

    // Public methods for external control
    play() {
        if (!this.isPlaying) {
            this.toggleAutoPlay();
        }
    }

    pause() {
        if (this.isPlaying) {
            this.toggleAutoPlay();
        }
    }

    getCurrentSlide() {
        return this.currentSlide;
    }

    getTotalSlides() {
        return this.totalSlides;
    }

    // Cleanup method
    destroy() {
        this.stopAutoPlay();
        this.stopProgress();
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboard);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('resize', this.handleResize);
        
        // Clear timeouts
        clearTimeout(this.resizeTimeout);
    }
}

// Screen reader only class
const srOnlyStyle = document.createElement('style');
srOnlyStyle.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }
`;
document.head.appendChild(srOnlyStyle);

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize hero carousel
    const heroCarousel = new HeroCarousel('.hero-carousel');
    
    // Make it globally accessible for debugging/external control
    window.heroCarousel = heroCarousel;
    
    // Add intersection observer for performance
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.target.classList.contains('hero-carousel')) {
                    if (entry.isIntersecting) {
                        heroCarousel.play();
                    } else {
                        heroCarousel.pause();
                    }
                }
            });
        }, {
            threshold: 0.5
        });
        
        const carouselElement = document.querySelector('.hero-carousel');
        if (carouselElement) {
            observer.observe(carouselElement);
        }
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (window.heroCarousel) {
        if (document.hidden) {
            window.heroCarousel.pause();
        } else {
            window.heroCarousel.play();
        }
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeroCarousel;
}

// Add utility functions for carousel interaction
window.carouselUtils = {
    goToSlide: (index) => {
        if (window.heroCarousel) {
            window.heroCarousel.goToSlide(index);
        }
    },
    
    nextSlide: () => {
        if (window.heroCarousel) {
            window.heroCarousel.nextSlide();
        }
    },
    
    prevSlide: () => {
        if (window.heroCarousel) {
            window.heroCarousel.prevSlide();
        }
    },
    
    togglePlay: () => {
        if (window.heroCarousel) {
            window.heroCarousel.toggleAutoPlay();
        }
    }
};