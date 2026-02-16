// header-enhancements.js - Header scroll and mobile navigation enhancements

// ============================================
// Header Scroll Enhancement
// ============================================
function initHeaderScroll() {
    const header = document.querySelector('header.w-full');
    const main = document.querySelector('main');
    
    if (!main || !header) return;
    
    main.addEventListener('scroll', () => {
        if (main.scrollTop > 20) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ============================================
// Mobile Navigation Handler
// ============================================
function initMobileNavigation() {
    const liveBtnMobile = document.getElementById('liveBtn-mobile');
    if (liveBtnMobile) {
        liveBtnMobile.addEventListener('click', () => {
            // Trigger the main live button click
            const liveBtn = document.getElementById('liveBtn');
            if (liveBtn) {
                liveBtn.click();
            }
        });
    }
}

// Initialize header enhancements
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initHeaderScroll();
        initMobileNavigation();
    });
} else {
    initHeaderScroll();
    initMobileNavigation();
}
