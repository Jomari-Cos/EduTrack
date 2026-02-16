// ====================================================
// SETTINGS MODAL FUNCTIONALITY
// ====================================================

(function() {
    'use strict';

    // Modal elements
    const settingsModal = document.getElementById('settingsModal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');

    // Slider elements
    const scoreWeightSlider = document.getElementById('scoreWeightSlider');
    const attendanceWeightSlider = document.getElementById('attendanceWeightSlider');
    const scoreWeightValue = document.getElementById('scoreWeightValue');
    const attendanceWeightValue = document.getElementById('attendanceWeightValue');
    const currentScoreWeight = document.getElementById('currentScoreWeight');
    const currentAttendanceWeight = document.getElementById('currentAttendanceWeight');

    // Validation message
    const validationMessage = document.getElementById('validationMessage');

    // Preset buttons
    const presetButtons = document.querySelectorAll('.preset-btn');

    // Current settings (will be loaded from server)
    let originalSettings = {
        score_weight: 0.7,
        attendance_weight: 0.3
    };

    /**
     * Load current settings from server
     */
    async function loadSettings() {
        try {
            const response = await fetch('/api/teacher/settings');
            const data = await response.json();

            if (data.success) {
                originalSettings = data.settings;
                updateUIFromSettings(originalSettings);
            } else {
                showNotification('Error loading settings: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showNotification('Failed to load settings', 'error');
        }
    }

    /**
     * Update UI elements with settings values
     */
    function updateUIFromSettings(settings) {
        const scorePercent = Math.round(settings.score_weight * 100);
        const attendancePercent = Math.round(settings.attendance_weight * 100);

        scoreWeightSlider.value = scorePercent;
        attendanceWeightSlider.value = attendancePercent;

        updateDisplayValues(scorePercent, attendancePercent);
    }

    /**
     * Update display values for weights
     */
    function updateDisplayValues(scorePercent, attendancePercent) {
        scoreWeightValue.textContent = scorePercent + '%';
        attendanceWeightValue.textContent = attendancePercent + '%';
        currentScoreWeight.textContent = scorePercent;
        currentAttendanceWeight.textContent = attendancePercent;

        // Validate that weights sum to 100%
        validateWeights(scorePercent, attendancePercent);
    }

    /**
     * Validate that weights sum to 100%
     */
    function validateWeights(scorePercent, attendancePercent) {
        const total = scorePercent + attendancePercent;
        const isValid = total === 100;

        if (isValid) {
            validationMessage.classList.add('hidden');
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            validationMessage.classList.remove('hidden');
            validationMessage.className = 'px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200';
            validationMessage.querySelector('p').textContent = 
                `⚠️ Weights must sum to 100% (currently ${total}%)`;
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }

    /**
     * Open settings modal
     */
    function openModal() {
        loadSettings(); // Reload current settings
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('flex');
    }

    /**
     * Close settings modal
     */
    function closeModal() {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('flex');
        
        // Reset to original settings
        updateUIFromSettings(originalSettings);
    }

    /**
     * Save settings to server
     */
    async function saveSettings() {
        const scoreWeight = parseFloat(scoreWeightSlider.value) / 100;
        const attendanceWeight = parseFloat(attendanceWeightSlider.value) / 100;

        try {
            const response = await fetch('/api/teacher/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    score_weight: scoreWeight,
                    attendance_weight: attendanceWeight
                })
            });

            const data = await response.json();

            if (data.success) {
                originalSettings = data.settings;
                showNotification('Settings saved successfully! 🎉', 'success');
                closeModal();
                
                // Reload page data to reflect new calculations
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showNotification('Error: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotification('Failed to save settings', 'error');
        }
    }

    /**
     * Reset to default settings (70/30)
     */
    function resetToDefault() {
        scoreWeightSlider.value = 70;
        attendanceWeightSlider.value = 30;
        updateDisplayValues(70, 30);
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-[60] px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        } text-white font-medium`;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // ====================================================
    // EVENT LISTENERS
    // ====================================================

    // Open modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openModal);
    }

    // Close modal
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', closeModal);
    }

    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', closeModal);
    }

    // Close on outside click
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                closeModal();
            }
        });
    }

    // Save settings
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // Reset settings
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetToDefault);
    }

    // Score weight slider
    if (scoreWeightSlider) {
        scoreWeightSlider.addEventListener('input', (e) => {
            const scorePercent = parseInt(e.target.value);
            const attendancePercent = 100 - scorePercent;
            
            attendanceWeightSlider.value = attendancePercent;
            updateDisplayValues(scorePercent, attendancePercent);
        });
    }

    // Attendance weight slider
    if (attendanceWeightSlider) {
        attendanceWeightSlider.addEventListener('input', (e) => {
            const attendancePercent = parseInt(e.target.value);
            const scorePercent = 100 - attendancePercent;
            
            scoreWeightSlider.value = scorePercent;
            updateDisplayValues(scorePercent, attendancePercent);
        });
    }

    // Preset buttons
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const scorePercent = parseInt(btn.dataset.score);
            const attendancePercent = parseInt(btn.dataset.attendance);
            
            scoreWeightSlider.value = scorePercent;
            attendanceWeightSlider.value = attendancePercent;
            updateDisplayValues(scorePercent, attendancePercent);

            // Visual feedback
            presetButtons.forEach(b => b.classList.remove('border-blue-600', 'bg-blue-50'));
            btn.classList.add('border-blue-600', 'bg-blue-50');
        });
    });

    // ====================================================
    // INITIALIZATION
    // ====================================================

    // Load settings when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSettings);
    } else {
        loadSettings();
    }

})();
