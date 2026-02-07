// main.js - Main entry point that loads all modules
document.addEventListener("DOMContentLoaded", () => {
    console.log("📱 Dashboard loaded");
    
    // Load core dashboard functionality
    if (typeof initDashboard === 'function') {
        initDashboard();
    }
    
    // Load teacher profiles
    if (typeof initTeacherProfiles === 'function') {
        initTeacherProfiles();
    }
    
    // Load attendance system
    if (typeof initAttendanceSystem === 'function') {
        initAttendanceSystem();
    }
    
    // Load charts
    if (typeof initCharts === 'function') {
        initCharts();
    }
    
    // Load points system
    if (typeof initPointsSystem === 'function') {
        initPointsSystem();
    }
    
    // Initialize navigation
    if (typeof initNavigation === 'function') {
        initNavigation();
    }
    
    // Global event listeners
    setupGlobalListeners();
});

function setupGlobalListeners() {
    // Close modals with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeAllModals();
        }
    });
    
    // Fullscreen toggle
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function toggleFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        if (fullscreenBtn) fullscreenBtn.textContent = "⏹ Exit Full Screen";
    } else {
        document.exitFullscreen();
        if (fullscreenBtn) fullscreenBtn.textContent = "⛶ Full Screen";
    }
}