// Hero Carousel JavaScript Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get carousel elements
    const indicators = document.querySelectorAll('.carousel-indicator');
    const slides = document.querySelector('.carousel-slides');
    let currentSlide = 0;

    // Function to update active indicator
    function updateIndicators() {
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentSlide);
        });
    }

    // Manual slide navigation on indicator click
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            currentSlide = index;
            const translateX = -currentSlide * 20; // 20% per slide (5 slides total)
            slides.style.transform = `translateX(${translateX}%)`;
            slides.style.animation = 'none'; // Stop auto-animation temporarily
            updateIndicators();
            
            // Restart auto-animation after 5 seconds
            setTimeout(() => {
                slides.style.animation = 'slide 15s infinite';
            }, 5000);
        });
    });

    // Auto-update indicators based on animation timing
    // Each slide shows for 3 seconds (15s total / 5 slides)
    setInterval(() => {
        currentSlide = (currentSlide + 1) % 5;
        updateIndicators();
    }, 3000);

    // Optional: Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            // Previous slide
            currentSlide = (currentSlide - 1 + 5) % 5;
            const translateX = -currentSlide * 20;
            slides.style.transform = `translateX(${translateX}%)`;
            slides.style.animation = 'none';
            updateIndicators();
            
            setTimeout(() => {
                slides.style.animation = 'slide 15s infinite';
            }, 5000);
        } else if (e.key === 'ArrowRight') {
            // Next slide
            currentSlide = (currentSlide + 1) % 5;
            const translateX = -currentSlide * 20;
            slides.style.transform = `translateX(${translateX}%)`;
            slides.style.animation = 'none';
            updateIndicators();
            
            setTimeout(() => {
                slides.style.animation = 'slide 15s infinite';
            }, 5000);
        }
    });

    // Optional: Touch/swipe support for mobile devices
    let touchStartX = 0;
    let touchEndX = 0;

    slides.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    slides.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance for swipe
        const swipeDistance = touchEndX - touchStartX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                // Swipe right - previous slide
                currentSlide = (currentSlide - 1 + 5) % 5;
            } else {
                // Swipe left - next slide
                currentSlide = (currentSlide + 1) % 5;
            }

            const translateX = -currentSlide * 20;
            slides.style.transform = `translateX(${translateX}%)`;
            slides.style.animation = 'none';
            updateIndicators();

            setTimeout(() => {
                slides.style.animation = 'slide 15s infinite';
            }, 5000);
        }
    }
});