// Global variables
let recognitionInterval = null;
let isProcessing = false;
let autoRecognition = true;
let enableTracking = true;
let enableHandDetection = true;
let debugMode = false;
let showHandLandmarks = true;
let selectedSection = '';
let availableSections = [];
let lastRecognitionTime = null;
let sessionId = null;
let attendanceToggle = false; // ADDED
let markedAttendance = new Set(); // ADDED - Track already marked attendance today

// Tracking statistics
let trackingStats = {
    totalFrames: 0,
    recognitionCalls: 0,
    trackedFaces: 0,
    activeTracks: 0,
    handCount: 0
};

// Modal management variables
let modalTimer = null;
let modalCountdown = 5;
let currentModalTrackId = null;
let modal = null;

// DOM Elements
let video, overlay, toggleCameraBtn, retryCameraBtn, noCameraDiv;
let autoRecognitionCheck, enableTrackingCheck, enableHandDetectionCheck;
let debugModeCheck, showTrackIDsCheck, showLandmarksCheck, showHandLandmarksCheck;
let detectedFacesEl, recognizedFacesEl, detectedHandsEl, facesList;
let sectionFilter, selectedSectionInfo, sectionPersonCount, trackingStatus;
let searchSpeed, lastRecognitionTimeEl, processingTimeEl;
let dbSections, dbPersons, sessionIdEl, activeTracksEl;
let recognitionCountEl, optimizationRateEl, handCountEl, trackedFacesCountEl;
let attendanceToggleCheck, attendanceStatus; // ADDED

// Camera state
let cameraActive = false;
let currentStream = null;

// Voice recognition
let speechRecognition = null;
let isListening = false;
let lastCommandTime = 0;
let commandCooldown = 1000;
let voiceRecognitionBlocked = false; // Flag to prevent auto-restart after blocking errors

// MediaPipe Hands variables
let hands = null;
let handsInitialized = false;
let detectedHands = [];
let handBoundingBoxes = [];
let lastHandDetectionTime = 0;
let handDetectionThrottle = 100; // 10 FPS (100ms between detections)

// Initialize DOM elements and event listeners
function initializeDOM() {
    video = document.getElementById('video');
    overlay = document.getElementById('overlay');
    toggleCameraBtn = document.getElementById('toggleCamera');
    retryCameraBtn = document.getElementById('retryCamera');
    noCameraDiv = document.getElementById('noCamera');
    autoRecognitionCheck = document.getElementById('autoRecognition');
    enableTrackingCheck = document.getElementById('enableTracking');
    enableHandDetectionCheck = document.getElementById('enableHandDetection');
    debugModeCheck = document.getElementById('debugMode');
    showTrackIDsCheck = document.getElementById('showTrackIDs');
    showLandmarksCheck = document.getElementById('showLandmarks');
    showHandLandmarksCheck = document.getElementById('showHandLandmarks');
    detectedFacesEl = document.getElementById('detectedFaces');
    recognizedFacesEl = document.getElementById('recognizedFaces');
    detectedHandsEl = document.getElementById('detectedHands');
    facesList = document.getElementById('facesList');
    sectionFilter = document.getElementById('sectionFilter');
    selectedSectionInfo = document.getElementById('selectedSectionInfo');
    sectionPersonCount = document.getElementById('sectionPersonCount');
    trackingStatus = document.getElementById('trackingStatus');
    searchSpeed = document.getElementById('searchSpeed');
    lastRecognitionTimeEl = document.getElementById('lastRecognitionTime');
    processingTimeEl = document.getElementById('processingTime');
    dbSections = document.getElementById('dbSections');
    dbPersons = document.getElementById('dbPersons');
    sessionIdEl = document.getElementById('sessionId');
    activeTracksEl = document.getElementById('activeTracks');
    recognitionCountEl = document.getElementById('recognitionCount');
    optimizationRateEl = document.getElementById('optimizationRate');
    handCountEl = document.getElementById('handCount');
    trackedFacesCountEl = document.getElementById('trackedFacesCount');
    
    // ADDED: Attendance elements
    attendanceToggleCheck = document.getElementById('attendanceToggle');
    attendanceStatus = document.getElementById('attendanceStatus');
}

// Initialize modal when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeDOM();
    
    modal = new bootstrap.Modal(document.getElementById('handRaiseModal'));
    
    // When modal is hidden, reset state
    document.getElementById('handRaiseModal').addEventListener('hidden.bs.modal', function() {
        if (currentModalTrackId && sessionId) {
            closeModalOnServer();
        }
        resetModal();
    });
    
    // Add event listeners for checkboxes
    showHandLandmarksCheck.addEventListener('change', function(e) {
        showHandLandmarks = e.target.checked;
        if (cameraActive && autoRecognition) {
            recognizeFrame();
        }
    });
    
    // Initialize the application
    initializeApp();
    
    // Setup modal voice recognition
    setupModalVoiceRecognition();
});

// Initialize the application
function initializeApp() {
    // Generate initial session ID
    sessionId = generateSessionId();
    sessionIdEl.textContent = sessionId.substr(0, 12) + '...';
    
    // Load sections and current class
    loadSections();
    refreshDatabase();
    loadCurrentClass();
    
    // Load previously marked attendance
    loadMarkedAttendanceFromStorage(); // ADDED
    
    // Add attendance status indicator
    addAttendanceStatusIndicator(); // ADDED
    
    // Try to auto-start camera if user previously allowed
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => {
                console.log('Camera access granted');
            })
            .catch(() => {
                console.log('Camera access not granted');
            });
    }
    
    // Event listeners
    toggleCameraBtn.addEventListener('click', toggleCamera);
    retryCameraBtn.addEventListener('click', retryCamera);
    autoRecognitionCheck.addEventListener('change', toggleAutoRecognition);
    enableTrackingCheck.addEventListener('change', toggleTracking);
    enableHandDetectionCheck.addEventListener('change', toggleHandDetection);
    debugModeCheck.addEventListener('change', toggleDebugMode);
    sectionFilter.addEventListener('change', handleSectionChange);
    video.addEventListener('resize', resizeCanvasToVideo);
    
    // ADDED: Attendance event listener
    attendanceToggleCheck.addEventListener('change', toggleAttendance);
    
    // Initialize attendance
    checkAndResetAttendance();
    
    // Initialize MediaPipe Hands for hand detection
    initializeMediaPipeHands();
}

// ===================================================================
// SESSION & ATTENDANCE FUNCTIONS
// ===================================================================

// Generate session ID for tracking
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load marked attendance from localStorage
function loadMarkedAttendanceFromStorage() {
    const today = new Date().toISOString().split('T')[0];
    markedAttendance.clear();
    
    // Load all attendance keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('attendance_')) {
            // Extract student ID and date from key
            const parts = key.replace('attendance_', '').split('_');
            if (parts.length === 2 && parts[1] === today) {
                markedAttendance.add(key.replace('attendance_', ''));
            }
        }
    }
    
    console.log(`Loaded ${markedAttendance.size} previously marked attendance records`);
    updateAttendanceCounter(); // Update counter display
}

// Update attendance counter display
function updateAttendanceCounter() {
    const markedCountEl = document.getElementById('markedCount');
    if (markedCountEl) {
        markedCountEl.textContent = markedAttendance.size;
    }
}

// Check and reset attendance for new day
function checkAndResetAttendance() {
    const today = new Date().toDateString();
    const lastMarkedDate = localStorage.getItem('lastAttendanceDate');
    
    // If it's a new day, clear the marked attendance set
    if (lastMarkedDate !== today) {
        markedAttendance.clear();
        localStorage.setItem('lastAttendanceDate', today);
        
        // Clear old attendance records from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('attendance_') && !key.includes(today.split('T')[0])) {
                localStorage.removeItem(key);
            }
        }
        
        console.log('New day - attendance tracking reset');
        updateAttendanceCounter();
    }
}

// ===================================================================
// MEDIAPIPE HANDS INITIALIZATION
// ===================================================================

// Initialize MediaPipe Hands for hand detection
function initializeMediaPipeHands() {
    if (typeof Hands === 'undefined') {
        console.warn('MediaPipe Hands library not loaded');
        return;
    }
    
    console.log('[MediaPipe] Initializing MediaPipe Hands...');
    
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
    
    hands.setOptions({
        maxNumHands: 30, // Detect up to 30 hands (supports 20+ students)
        modelComplexity: 1,
        minDetectionConfidence: 0.3, // Lower threshold for better far-distance detection
        minTrackingConfidence: 0.3 // Lower threshold for better far-distance tracking
    });
    
    hands.onResults(onHandDetectionResults);
    handsInitialized = true;
    
    console.log('[MediaPipe] MediaPipe Hands initialized successfully');
}

// Handle hand detection results from MediaPipe
function onHandDetectionResults(results) {
    if (!enableHandDetection) return;
    
    const currentTime = Date.now();
    if (currentTime - lastHandDetectionTime < handDetectionThrottle) {
        return; // Throttle to 10 FPS
    }
    lastHandDetectionTime = currentTime;
    
    detectedHands = results.multiHandLandmarks || [];
    handBoundingBoxes = [];
    
    // Ensure overlay has valid dimensions before calculating coordinates
    if (!overlay.width || !overlay.height) {
        console.warn('[MediaPipe] Overlay not ready, skipping hand detection frame');
        return;
    }
    
    // Calculate bounding boxes for each detected hand with adaptive padding
    // OPTIMIZED: Only process wrist + fingertips (6 landmarks) instead of all 21 landmarks
    detectedHands.forEach((landmarks, handIndex) => {
        // Use overlay dimensions to match the drawing canvas
        const videoWidth = overlay.width;
        const videoHeight = overlay.height;
        
        // Key landmark indices: Wrist(0), Thumb(4), Index(8), Middle(12), Ring(16), Pinky(20)
        const keyIndices = [0, 4, 8, 12, 16, 20];
        
        // Get min/max coordinates from key landmarks only (71% reduction in processing)
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        keyIndices.forEach(index => {
            if (landmarks[index]) {
                const landmark = landmarks[index];
                const x = landmark.x * videoWidth;
                const y = landmark.y * videoHeight;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        });
        
        // Calculate base dimensions
        const baseWidth = maxX - minX;
        const baseHeight = maxY - minY;
        const handSize = Math.max(baseWidth, baseHeight);
        
        // Adaptive padding based on hand size
        let paddingPercent;
        if (handSize < 100) {
            paddingPercent = 0.30; // 30% padding for small hands
        } else if (handSize < 150) {
            paddingPercent = 0.25; // 25% padding for medium hands
        } else {
            paddingPercent = 0.20; // 20% padding for large hands
        }
        
        const paddingX = baseWidth * paddingPercent;
        const paddingY = baseHeight * paddingPercent;
        
        // Calculate final bounding box with padding
        const finalX = Math.max(0, Math.round(minX - paddingX));
        const finalY = Math.max(0, Math.round(minY - paddingY));
        const finalWidth = Math.min(videoWidth - finalX, Math.round(baseWidth + paddingX * 2));
        const finalHeight = Math.min(videoHeight - finalY, Math.round(baseHeight + paddingY * 2));
        
        handBoundingBoxes.push({
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            landmarks: landmarks,
            keyIndices: [0, 4, 8, 12, 16, 20] // Store for drawing optimization
        });
        
        if (handIndex === 0) {
            // Log dimensions for first hand only to avoid console spam
            console.log(`[MediaPipe] Hand ${handIndex + 1}: overlay=(${videoWidth}x${videoHeight}), bbox=(${finalX}, ${finalY}, ${finalWidth}, ${finalHeight}), padding=${Math.round(paddingPercent*100)}%`);
        }
    });
    
    // Update stats
    trackingStats.handCount = detectedHands.length;
    if (handCountEl) {
        handCountEl.textContent = detectedHands.length;
    }
    if (detectedHandsEl) {
        detectedHandsEl.textContent = detectedHands.length;
    }
    
    // Note: Hand drawing happens in drawRecognitionResults() after canvas clear
    // Don't draw here to avoid accumulating boxes on top of each other
}

// Draw hands on overlay canvas
function drawHandsOnOverlay(ctx) {
    if (!detectedHands || detectedHands.length === 0) return;
    
    // Get the context if not provided
    if (!ctx) {
        ctx = overlay.getContext('2d');
    }
    
    const videoWidth = overlay.width;
    const videoHeight = overlay.height;
    
    // Draw each hand
    // Note: When called from drawRecognitionResults, context is already mirrored
    // So we need to mirror X coordinates to compensate for the transform
    detectedHands.forEach((landmarks, handIndex) => {
        const bbox = handBoundingBoxes[handIndex];
        
        if (!bbox) return;
        
        // Mirror bounding box X coordinates for the transformed context
        const mirroredX = videoWidth - bbox.x - bbox.width;
        
        // Draw bounding box
        ctx.strokeStyle = '#9C27B0'; // Purple color for hands
        ctx.lineWidth = 3;
        ctx.strokeRect(mirroredX, bbox.y, bbox.width, bbox.height);
        
        // Draw label
        ctx.fillStyle = 'rgba(156, 39, 176, 0.8)';
        ctx.fillRect(mirroredX, bbox.y - 30, 120, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`Hand ${handIndex + 1} ⚡`, mirroredX + 5, bbox.y - 10);
        
        // OPTIMIZED: Draw only wrist + fingertips (6 landmarks instead of 21)
        const keyIndices = [0, 4, 8, 12, 16, 20];
        const keyNames = ['Wrist', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
        
        keyIndices.forEach((index, keyIndex) => {
            if (landmarks[index]) {
                const landmark = landmarks[index];
                const x = landmark.x * videoWidth;
                const y = landmark.y * videoHeight;
                
                // Mirror X coordinate for the transformed context
                const mirroredLandmarkX = videoWidth - x;
                
                // Draw key points with larger size
                const isWrist = index === 0;
                ctx.fillStyle = isWrist ? '#00E5FF' : '#FFD700'; // Cyan for wrist, gold for fingertips
                ctx.beginPath();
                ctx.arc(mirroredLandmarkX, y, isWrist ? 5 : 6, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw label in debug mode
                if (debugMode) {
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 9px Arial';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.strokeText(keyNames[keyIndex], mirroredLandmarkX + 8, y + 4);
                    ctx.fillText(keyNames[keyIndex], mirroredLandmarkX + 8, y + 4);
                }
            }
        });
        
        // Draw simplified connections in debug mode
        if (debugMode) {
            // Connect wrist to fingertips for simplified visualization
            const keyIndices = [0, 4, 8, 12, 16, 20];
            const wrist = landmarks[0];
            
            if (wrist) {
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)'; // Cyan for wrist connections
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                
                // Draw lines from wrist to each fingertip
                for (let i = 1; i < keyIndices.length; i++) {
                    const fingertip = landmarks[keyIndices[i]];
                    
                    if (fingertip) {
                        // Mirror X coordinates for lines
                        const wristX = videoWidth - (wrist.x * videoWidth);
                        const tipX = videoWidth - (fingertip.x * videoWidth);
                        
                        ctx.beginPath();
                        ctx.moveTo(wristX, wrist.y * videoHeight);
                        ctx.lineTo(tipX, fingertip.y * videoHeight);
                        ctx.stroke();
                    }
                }
            }
            
            ctx.setLineDash([]); // Reset dash
        }
    });
}

// Process video frames for hand detection
async function processHandDetection() {
    if (!cameraActive || !handsInitialized || !enableHandDetection) {
        if (cameraActive && enableHandDetection) {
            // Continue checking even if not initialized yet
            requestAnimationFrame(processHandDetection);
        }
        return;
    }
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Send frame to MediaPipe Hands
        await hands.send({ image: video });
    }
    
    // Continue processing
    if (cameraActive) {
        requestAnimationFrame(processHandDetection);
    }
}

// ===================================================================
// ATTENDANCE FUNCTIONS
// ===================================================================

// Toggle attendance on/off
function toggleAttendance() {
    attendanceToggle = this.checked;
    
    if (attendanceToggle) {
        attendanceStatus.textContent = 'ON';
        attendanceStatus.className = 'badge bg-success';
        console.log('Attendance tracking enabled');
        
        // Clear previous day's tracking if it's a new day
        checkAndResetAttendance();
    } else {
        attendanceStatus.textContent = 'OFF';
        attendanceStatus.className = 'badge bg-secondary';
        console.log('Attendance tracking disabled');
    }
}

// Mark attendance for a student
async function markAttendance(studentId, studentName, section) {
    // Only proceed if attendance toggle is ON and student has valid ID
    if (!attendanceToggle) {
        console.log('Attendance toggle is OFF');
        return { success: false, reason: 'toggle_off' };
    }
    
    if (!studentId || studentId === 'N/A' || studentId === 'Unknown') {
        console.log(`Invalid student ID: ${studentId}`);
        return { success: false, reason: 'invalid_id' };
    }
    
    // Create unique key for today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceKey = `${studentId}_${today}`;
    
    // Skip if already marked today
    if (markedAttendance.has(attendanceKey)) {
        console.log(`Attendance already marked for ${studentName} today`);
        return { success: true, reason: 'already_marked' };
    }
    
    try {
        const response = await fetch('/api/mark_attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                student_name: studentName,
                section: section,
                date: today,
                status: 'present'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mark as recorded for today
            markedAttendance.add(attendanceKey);
            
            // Store in localStorage for persistence across page reloads
            localStorage.setItem(`attendance_${attendanceKey}`, 'marked');
            
            // Update counter
            updateAttendanceCounter();
            
            console.log(`✅ Attendance SUCCESSFULLY marked for ${studentName} (${studentId})`);
                document.dispatchEvent(new CustomEvent('faceRecognitionAttendance', {
                    detail: {
                        studentId: studentId,
                        studentName: studentName,
                        section: section
                    }
                }));

            // Show notification with more info
            showAttendanceNotification(studentName, true, result.message);
            
            return { 
                success: true, 
                reason: 'marked',
                data: result 
            };
        } else {
            console.error(`❌ Failed to mark attendance for ${studentName}:`, result.message);
            
            // Show error notification
            showAttendanceNotification(studentName, false, result.message);
            
            return { 
                success: false, 
                reason: 'api_error',
                message: result.message 
            };
        }
    } catch (error) {
        console.error('❌ Error marking attendance:', error);
        
        // Show error notification
        showAttendanceNotification(studentName, false, 'Network error');
        
        return { 
            success: false, 
            reason: 'network_error',
            message: error.message 
        };
    }
}

// Show attendance notification
function showAttendanceNotification(studentName, success = true, message = '') {
    // Remove existing attendance notification
    const existingNotification = document.getElementById('attendanceNotification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const bgColor = success 
        ? 'linear-gradient(135deg, #4CAF50, #2E7D32)' 
        : 'linear-gradient(135deg, #f44336, #B71C1C)';
    
    const borderColor = success ? '#1B5E20' : '#B71C1C';
    const icon = success ? 'fa-user-check' : 'fa-exclamation-triangle';
    const title = success ? 'Attendance Recorded' : 'Attendance Failed';
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'attendanceNotification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 350px;
            background: ${bgColor};
            color: white;
            padding: 12px 15px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            border-left: 4px solid ${borderColor};
            animation: slideUp 0.3s ease-out, fadeOut 0.3s ease-in 3.7s;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${icon}" style="font-size: 20px;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">
                        ${title}
                    </div>
                    <div style="font-size: 12px; opacity: 0.95;">
                        ${studentName}
                        ${message ? `<br><small>${message}</small>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-remove after appropriate time
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
            style.remove();
        }
    }, success ? 2000 : 4000);
}

// Add attendance status indicator
function addAttendanceStatusIndicator() {
    const statusHTML = `
        <div id="attendanceStatusBar" style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 9998;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 10px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            backdrop-filter: blur(5px);
        ">
            <div>
                <div><i class="fas fa-calendar-check me-1"></i>Today's Attendance</div>
                <div id="attendanceCounter">Marked: <span id="markedCount">0</span></div>
            </div>
            <button onclick="showAttendanceSummary()" class="btn btn-sm btn-info">
                <i class="fas fa-list"></i>
            </button>
        </div>
    `;
    
    // Add to body
    document.body.insertAdjacentHTML('beforeend', statusHTML);
    updateAttendanceCounter();
}

// Show attendance summary
async function showAttendanceSummary() {
    try {
        const response = await fetch('/api/today_attendance');
        const result = await response.json();
        
        if (result.success) {
            const modalHTML = `
                <div class="modal fade" id="attendanceSummaryModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">
                                    <i class="fas fa-clipboard-list me-2"></i>
                                    Today's Attendance Summary
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-success">
                                    <i class="fas fa-calendar-check me-2"></i>
                                    Date: ${result.date} | Total Present: ${result.count}
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Student Name</th>
                                                <th>Student ID</th>
                                                <th>Section</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${result.attendance_list && result.attendance_list.length > 0 ? 
                                                result.attendance_list.map((student, index) => `
                                                    <tr>
                                                        <td>${index + 1}</td>
                                                        <td>${student.name}</td>
                                                        <td><span class="badge bg-info">${student.student_id}</span></td>
                                                        <td><span class="badge bg-secondary">${student.section}</span></td>
                                                    </tr>
                                                `).join('') : 
                                                `<tr><td colspan="4" class="text-center text-muted">No attendance records for today</td></tr>`
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-success" onclick="exportAttendance()">
                                    <i class="fas fa-download me-2"></i>Export
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal
            const existingModal = document.getElementById('attendanceSummaryModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Show modal
            const attendanceModal = new bootstrap.Modal(document.getElementById('attendanceSummaryModal'));
            attendanceModal.show();
        }
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        showNotification('Error loading attendance summary', 'error');
    }
}

// Export attendance function
function exportAttendance() {
    const rows = [];
    const table = document.querySelector('#attendanceSummaryModal table tbody');
    
    if (table) {
        table.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                const rowData = [
                    cells[0].textContent,
                    cells[1].textContent,
                    cells[2].querySelector('.badge').textContent,
                    cells[3].querySelector('.badge').textContent
                ];
                rows.push(rowData.join(','));
            }
        });
    }
    
    if (rows.length > 0) {
        const csvContent = "data:text/csv;charset=utf-8," 
            + ["No.,Name,Student ID,Section", ...rows].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Test the attendance API directly
async function testAttendanceAPI() {
    const testData = {
        student_id: 'TEST123',
        student_name: 'Test Student',
        section: 'Test Section',
        date: new Date().toISOString().split('T')[0],
        status: 'present'
    };
    
    console.log('Testing attendance API with:', testData);
    
    try {
        const response = await fetch('/api/mark_attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
            showNotification(`✅ Test successful!\n${result.message}`, 'success');
        } else {
            showNotification(`❌ Test failed:\n${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Test error:', error);
        showNotification(`❌ Network error: ${error.message}`, 'error');
    }
}

// ===================================================================
// SECTION MANAGEMENT
// ===================================================================

// Load sections from API
async function loadSections() {
    try {
        const response = await fetch('/api/sections');
        const data = await response.json();
        availableSections = data.sections;
        
        sectionFilter.innerHTML = '<option value="">All Sections (Full Database Search)</option>';
        
        // Add existing sections
        data.sections.forEach(section => {
            const option = document.createElement('option');
            option.value = section.name;
            option.textContent = `${section.name} (${section.person_count} persons)`;
            sectionFilter.appendChild(option);
        });
        
        // Load section persons count
        updateSectionInfo();
        
        // After loading sections, check if we have a current class section to select
        const current = await getCurrentClassFromSession();
        if (current && current.section) {
            selectSectionInFilter(current.section);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

function refreshSections() {
    loadSections();
}

// Handle section filter change
function handleSectionChange() {
    selectedSection = this.value;
    updateSectionInfo();
    
    // Clear current results if section changed
    resetRecognitionResults();
}

// Update section info display
function updateSectionInfo() {
    if (!selectedSection) {
        selectedSectionInfo.textContent = 'All Sections';
        selectedSectionInfo.className = 'section-badge';
        sectionPersonCount.textContent = 'All persons';
        searchSpeed.textContent = enableTracking ? 'Optimized search' : 'Full search';
    } else {
        selectedSectionInfo.textContent = selectedSection;
        selectedSectionInfo.className = 'section-badge';
        
        // Get person count for selected section
        const selectedSectionData = availableSections.find(s => s.name === selectedSection);
        if (selectedSectionData) {
            sectionPersonCount.textContent = `${selectedSectionData.person_count} persons`;
            searchSpeed.textContent = enableTracking ? 'Optimized search' : 'Section search';
        } else {
            sectionPersonCount.textContent = '0 persons';
            searchSpeed.textContent = 'Section empty';
        }
    }
}

// Get current class from session
async function getCurrentClassFromSession() {
    try {
        const response = await fetch("/get-current-class");
        if (!response.ok) {
            throw new Error("Failed to fetch current class");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error getting current class from session:", error);
        return null;
    }
}

// Load current class info
async function loadCurrentClass() {
    const current = await getCurrentClassFromSession();

    if (current) {
        console.log("Grade:", current.grade);
        console.log("Section:", current.section);
        console.log("Subject:", current.subject);
        
        document.getElementById("currentGrade").textContent = current.grade;
        document.getElementById("currentSection").textContent = current.section;
        document.getElementById("currentSubject").textContent = current.subject;

        // Select the section in the sectionFilter dropdown if it exists
        selectSectionInFilter(current.section);
    }
}

function selectSectionInFilter(sectionName) {
    setTimeout(() => {
        const sectionFilter = document.getElementById('sectionFilter');
        if (!sectionFilter) {
            console.warn('sectionFilter element not found');
            return;
        }
        
        for (let i = 0; i < sectionFilter.options.length; i++) {
            const option = sectionFilter.options[i];
            if (option.value === sectionName) {
                sectionFilter.selectedIndex = i;
                selectedSection = sectionName;
                console.log(`Auto-selected section: ${sectionName}`);
                updateSectionInfo();
                break;
            }
        }
    }, 100);
}

// ===================================================================
// CAMERA FUNCTIONS
// ===================================================================

async function startCamera() {
    try {
        // Stop any existing stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });
        
        // Set stream to video element
        video.srcObject = stream;
        currentStream = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resizeCanvasToVideo();
                resolve();
            };
        });
        
        return true;
    } catch (error) {
        console.error('Camera error:', error);
        return false;
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
}

function resizeCanvasToVideo() {
    if (video.videoWidth && video.videoHeight) {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
    }
}

// Toggle camera
async function toggleCamera() {
    if (!cameraActive) {
        const success = await startCamera();
        if (success) {
            cameraActive = true;
            toggleCameraBtn.innerHTML = '<i class="fas fa-pause me-2"></i>Stop Camera';
            toggleCameraBtn.classList.remove('btn-primary');
            toggleCameraBtn.classList.add('btn-danger');
            noCameraDiv.style.display = 'none';
            
            // Generate new session ID if not exists
            if (!sessionId) {
                sessionId = generateSessionId();
                sessionIdEl.textContent = sessionId.substr(0, 12) + '...';
            }
            
            // Start recognition if auto is enabled
            if (autoRecognition) {
                startRecognition();
            }
            
            // Start hand detection processing
            if (enableHandDetection && handsInitialized) {
                processHandDetection();
            }
        } else {
            noCameraDiv.style.display = 'flex';
        }
    } else {
        stopCamera();
        cameraActive = false;
        toggleCameraBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Camera';
        toggleCameraBtn.classList.remove('btn-danger');
        toggleCameraBtn.classList.add('btn-primary');
        
        // Stop recognition
        stopRecognition();
        
        // Clear overlay
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        
        // Reset counters
        resetRecognitionResults();
    }
}

// Retry camera
async function retryCamera() {
    noCameraDiv.style.display = 'none';
    const success = await startCamera();
    if (success) {
        cameraActive = true;
        toggleCameraBtn.innerHTML = '<i class="fas fa-pause me-2"></i>Stop Camera';
        toggleCameraBtn.classList.remove('btn-primary');
        toggleCameraBtn.classList.add('btn-danger');
        
        if (autoRecognition) {
            startRecognition();
        }
        
        // Start hand detection processing
        if (enableHandDetection && handsInitialized) {
            processHandDetection();
        }
    }
}

// Auto recognition toggle
function toggleAutoRecognition(e) {
    autoRecognition = e.target.checked;
    if (cameraActive) {
        if (autoRecognition) {
            startRecognition();
        } else {
            stopRecognition();
        }
    }
}

// ===================================================================
// TRACKING FUNCTIONS
// ===================================================================

// Handle tracking toggle
function toggleTracking() {
    enableTracking = this.checked;
    trackingStatus.textContent = enableTracking ? 'Tracking ON' : 'Tracking OFF';
    trackingStatus.className = enableTracking ? 'tracking-badge' : 'badge bg-secondary';
    
    if (!enableTracking) {
        // Clear tracking if disabled
        clearTracking();
    }
}

// Handle hand detection toggle
function toggleHandDetection() {
    enableHandDetection = this.checked;
    if (!enableHandDetection) {
        // Close any active modal
        if (currentModalTrackId) {
            modal.hide();
        }
        // Clear hand detections
        detectedHands = [];
        handBoundingBoxes = [];
        trackingStats.handCount = 0;
        if (handCountEl) handCountEl.textContent = '0';
        if (detectedHandsEl) detectedHandsEl.textContent = '0';
    } else {
        // Start hand detection if camera is active
        if (cameraActive && handsInitialized) {
            processHandDetection();
        }
    }
}

// Handle debug mode toggle
function toggleDebugMode() {
    debugMode = this.checked;
}

// Clear tracking
async function clearTracking() {
    if (!sessionId) return;
    
    try {
        const response = await fetch('/api/clear_tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });
        
        const result = await response.json();
        if (result.success) {
            // Reset tracking stats
            trackingStats = {
                totalFrames: 0,
                recognitionCalls: 0,
                trackedFaces: 0,
                activeTracks: 0,
                handCount: 0
            };
            
            // Generate new session ID
            sessionId = generateSessionId();
            sessionIdEl.textContent = sessionId.substr(0, 12) + '...';
            
            // Update UI
            updateTrackingStats([]);
            handCountEl.textContent = '0';
            detectedHandsEl.textContent = '0';
            alert('Tracking cleared successfully!');
        }
    } catch (error) {
        console.error('Error clearing tracking:', error);
    }
}

// ===================================================================
// FACE RECOGNITION FUNCTIONS
// ===================================================================

// Manual recognition
async function recognizeFrame() {
    if (!cameraActive || isProcessing) return;
    
    const startTime = performance.now();
    isProcessing = true;
    
    try {
        // Capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Draw video frame to canvas (mirror it back to normal)
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, -canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Prepare request data
        const requestData = {
            image: imageData,
            session_id: enableTracking ? sessionId : null,
            enable_hand_detection: enableHandDetection
        };
        
        if (selectedSection) {
            requestData.section = selectedSection;
        }
        
        // Send to server with tracking
        trackingStats.totalFrames++;
        const response = await fetch('/api/recognize_face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            trackingStats.recognitionCalls++;
            lastRecognitionTime = new Date();
            lastRecognitionTimeEl.textContent = lastRecognitionTime.toLocaleTimeString();
            
            // Update session ID if returned
            if (result.session_id && !sessionId) {
                sessionId = result.session_id;
                sessionIdEl.textContent = sessionId.substr(0, 12) + '...';
            }
            
            updateRecognitionResults(result.faces);
            drawRecognitionResults(result.faces, canvas);
            
            // NOTE: Hand detection is now handled by MediaPipe Hands (browser-based)
            // Old backend hand detection code removed
            // MediaPipe hands are drawn automatically in drawRecognitionResults()
            
            // Update optimization statistics
            if (result.optimization_stats) {
                const opt = result.optimization_stats;
                trackingStats.optimizationRate = opt.optimization_rate || 0;
                
                // Update UI with optimization info
                const optRate = Math.round(opt.optimization_rate);
                const savedCalls = opt.total_faces - opt.recognized_count;
                
                if (opt.total_faces > 0) {
                    searchSpeed.innerHTML = `
                        <i class="fas fa-bolt me-1"></i>
                        Optimization: ${optRate}% (Saved ${savedCalls} recog calls)
                    `;
                    
                    // Update tracking stats
                    recognitionCountEl.textContent = opt.recognized_count;
                    optimizationRateEl.textContent = `${optRate}%`;
                    
                    // Color code based on optimization rate
                    if (optRate > 80) {
                        optimizationRateEl.className = 'optimization-badge';
                    } else if (optRate > 50) {
                        optimizationRateEl.className = 'badge bg-warning';
                    } else {
                        optimizationRateEl.className = 'badge bg-danger';
                    }
                }
            }
            
            // Update tracking stats
            updateTrackingStats(result.faces);
            
            // Check for hand raise modal
            if (result.faces && result.faces.length > 0) {
                // Check each face for modal_info
                for (let face of result.faces) {
                    if (face.modal_info && face.modal_info.modal_active) {
                        const modalInfo = face.modal_info;
                        
                        // Only show modal if it's a new one and hand detection is enabled
                        if (modalInfo.track_id !== currentModalTrackId && enableHandDetection) {
                            console.log('Hand raise detected for track:', modalInfo.track_id);
                            
                            // Extract face image from the frame for the modal
                            let faceImageData = null;
                            const faceWithModal = result.faces.find(f => f.track_id === modalInfo.track_id);
                            if (faceWithModal) {
                                // Crop face from canvas
                                const faceCanvas = document.createElement('canvas');
                                const [x1, y1, x2, y2] = faceWithModal.bbox;
                                const faceWidth = x2 - x1;
                                const faceHeight = y2 - y1;
                                
                                // Add padding
                                const padding = 20;
                                const cropX = Math.max(0, x1 - padding);
                                const cropY = Math.max(0, y1 - padding);
                                const cropWidth = Math.min(canvas.width - cropX, faceWidth + padding * 2);
                                const cropHeight = Math.min(canvas.height - cropY, faceHeight + padding * 2);
                                
                                faceCanvas.width = cropWidth;
                                faceCanvas.height = cropHeight;
                                const faceCtx = faceCanvas.getContext('2d');
                                
                                // Draw cropped face (mirror back to correct orientation)
                                faceCtx.scale(-1, 1);
                                faceCtx.drawImage(canvas, -cropX - cropWidth, cropY, cropWidth, cropHeight);
                                
                                faceImageData = faceCanvas.toDataURL('image/jpeg', 0.9);
                            }
                            
                            showHandRaiseModal(modalInfo, faceImageData);
                            break; // Only show first modal
                        }
                    }
                }
            }
        }
        
        const endTime = performance.now();
        processingTimeEl.textContent = `${Math.round(endTime - startTime)}ms`;
        
    } catch (error) {
        console.error('Recognition error:', error);
    } finally {
        isProcessing = false;
    }
}

// Update recognition results
async function updateRecognitionResults(faces) {
    detectedFacesEl.textContent = faces.length;
    
    const recognized = faces.filter(face => face.name !== 'Unknown').length;
    recognizedFacesEl.textContent = recognized;
    
    // Count tracked faces
    const tracked = faces.filter(face => face.tracked).length;
    trackedFacesCountEl.textContent = tracked;
    
    // ========== ATTENDANCE MARKING CODE ==========
    // Mark attendance for recognized faces
    for (const face of faces) {
        if (face.name !== 'Unknown' && face.id_number && face.id_number !== 'N/A') {
            // Use await to ensure completion
            const result = await markAttendance(
                face.id_number, 
                face.name, 
                face.section || selectedSection
            );
            
            // Log the result for debugging
            if (result.reason === 'api_error' || result.reason === 'network_error') {
                console.error(`Attendance failed for ${face.name}:`, result.message);
            }
        }
    }
    // ========== END OF ATTENDANCE CODE ==========
    
    // Update faces list
    if (faces.length > 0) {
        facesList.innerHTML = faces.map(face => {
            const confidencePercent = Math.round(face.confidence * 100);
            const isUnknown = face.name === 'Unknown';
            const isTracked = face.tracked;
            const trackId = face.track_id;
            const hasModal = face.modal_info && face.modal_info.modal_active;
            
            const sectionInfo = face.section && face.section !== 'Unknown' ? 
                `<span class="badge bg-secondary ms-2">${face.section}</span>` : '';
            
            const trackInfo = isTracked && trackId ? 
                `<span class="track-id ms-2">ID: ${trackId}</span>` : '';
            
            const optimizationBadge = isTracked ? 
                `<span class="optimization-badge ms-2">Tracked</span>` : '';
            
            const handRaiseBadge = hasModal ? 
                `<span class="raised-hand-badge ms-2">✋ Hand Raised</span>` : '';
            
            return `
                <div class="face-card ${isUnknown ? 'unknown-face' : (isTracked ? 'tracking-face' : '')}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">
                                ${face.name} 
                                ${face.id_number && face.id_number !== 'N/A' ? `<span class="badge bg-info ms-2">ID: ${face.id_number}</span>` : ''}
                                ${sectionInfo}
                                ${trackInfo}
                                ${optimizationBadge}
                                ${handRaiseBadge}
                            </h6>
                            <p class="mb-0 text-muted small">
                                <i class="fas fa-bullseye me-1"></i>Confidence: ${confidencePercent}%<br>
                                <i class="fas fa-eye me-1"></i>Detection: ${Math.round(face.det_score * 100)}%
                            </p>
                        </div>
                        <span class="recognition-badge ${isUnknown ? 'bg-danger' : (isTracked ? 'bg-primary' : 'bg-success')} text-white">
                            <i class="fas ${isUnknown ? 'fa-question' : (isTracked ? 'fa-id-card' : 'fa-check')} me-1"></i>
                            ${isUnknown ? 'Unknown' : (isTracked ? 'Tracked' : 'Recognized')}
                        </span>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            Position: X:${Math.round(face.bbox[0])}, Y:${Math.round(face.bbox[1])}
                            ${face.needs_recognition ? '<span class="text-warning ms-2"><i class="fas fa-exclamation-triangle"></i> Needs recognition</span>' : ''}
                        </small>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        facesList.innerHTML = `
            <div class="text-center text-muted p-4">
                <i class="fas fa-user-slash fa-2x mb-3"></i>
                <p>No faces detected.</p>
            </div>
        `;
    }
}

// Update tracking statistics
function updateTrackingStats(faces) {
    const trackedFaces = faces.filter(face => face.tracked);
    const recognizedFaces = faces.filter(face => face.recognized);
    
    trackingStats.activeTracks = trackedFaces.length;
    trackingStats.trackedFaces = trackedFaces.length;
    trackingStats.recognizedFaces = recognizedFaces.length;
    
    // Update UI
    activeTracksEl.textContent = trackingStats.activeTracks;
    recognitionCountEl.textContent = trackingStats.recognitionCalls;
    
    // Count tracked but not yet recognized faces
    const trackedButUnknown = faces.filter(face => face.tracked && !face.recognized);
    const trackIds = new Set(faces.map(face => face.track_id).filter(id => id));
    
    if (trackIds.size > 0) {
        optimizationRateEl.textContent = `${Math.round((trackingStats.activeTracks / trackIds.size) * 100)}%`;
    }
    
    // Show track optimization info
    if (trackedFaces.length > 0) {
        const optimizationText = `${trackedFaces.length} tracked, ${recognizedFaces.length} recognized`;
        searchSpeed.textContent = optimizationText;
    }
}

// Start/stop recognition
function startRecognition() {
    if (!recognitionInterval) {
        recognitionInterval = setInterval(recognizeFrame, 2000); // Every 2 seconds
        // Also recognize immediately
        recognizeFrame();
    }
}

function stopRecognition() {
    if (recognitionInterval) {
        clearInterval(recognitionInterval);
        recognitionInterval = null;
    }
}

// Reset recognition results
function resetRecognitionResults() {
    detectedFacesEl.textContent = '0';
    recognizedFacesEl.textContent = '0';
    detectedHandsEl.textContent = '0';
    trackedFacesCountEl.textContent = '0';
    facesList.innerHTML = `
        <div class="text-center text-muted p-4">
            <i class="fas fa-filter fa-2x mb-3"></i>
            <p>Section changed or tracking cleared.</p>
            <p>Start recognition again.</p>
        </div>
    `;
    
    // Clear canvas
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
}

// ===================================================================
// DRAWING FUNCTIONS
// ===================================================================

// NOTE: Old drawHandLandmarks() function removed
// Hand detection is now handled by MediaPipe Hands (browser-based)
// See drawHandsOnOverlay() in MEDIAPIPE HANDS INITIALIZATION section

// Draw results on canvas
function drawRecognitionResults(faces, originalCanvas = null) {
    const ctx = overlay.getContext('2d');
    
    // Clear previous drawings
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Mirror the canvas to match video
    ctx.scale(-1, 1);
    ctx.translate(-overlay.width, 0);
    
    // Draw debug mode indicator
    if (debugMode) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(10, 10, 150, 40);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('DEBUG MODE', 20, 35);
    }
    
    // Draw tracking info
    ctx.font = 'bold 18px Arial';
    const trackingText = enableTracking ? 'Face Tracking: ACTIVE' : 'Face Tracking: INACTIVE';
    const trackingTextWidth = ctx.measureText(trackingText).width;
    
    ctx.fillStyle = enableTracking ? 'rgba(33, 150, 243, 0.8)' : 'rgba(158, 158, 158, 0.8)';
    ctx.fillRect(overlay.width - trackingTextWidth - 30, 10, trackingTextWidth + 20, 40);
    
    ctx.fillStyle = 'white';
    ctx.fillText(trackingText, overlay.width - trackingTextWidth - 20, 35);
    
    // Draw hand detection status
    if (enableHandDetection) {
        ctx.font = 'bold 16px Arial';
        const handText = 'Hand Detection: ACTIVE';
        const handTextWidth = ctx.measureText(handText).width;
        
        ctx.fillStyle = 'rgba(156, 39, 176, 0.8)';
        ctx.fillRect(overlay.width - handTextWidth - 30, 60, handTextWidth + 20, 35);
        
        ctx.fillStyle = 'white';
        ctx.fillText(handText, overlay.width - handTextWidth - 20, 82);
    }
    
    // Draw section info
    ctx.font = 'bold 16px Arial';
    const sectionText = selectedSection ? `Section: ${selectedSection}` : 'All Sections';
    const sectionTextWidth = ctx.measureText(sectionText).width;
    
    ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
    ctx.fillRect(10, 60, sectionTextWidth + 20, 35);
    
    ctx.fillStyle = 'white';
    ctx.fillText(sectionText, 20, 82);
    
    // Draw hand count if available
    if (trackingStats.handCount > 0) {
        ctx.font = 'bold 16px Arial';
        const handCountText = `Hands: ${trackingStats.handCount}`;
        const handCountWidth = ctx.measureText(handCountText).width;
        
        ctx.fillStyle = 'rgba(156, 39, 176, 0.8)';
        ctx.fillRect(10, 105, handCountWidth + 20, 35);
        
        ctx.fillStyle = 'white';
        ctx.fillText(handCountText, 20, 127);
    }
    
    // Draw attendance status
    ctx.font = 'bold 16px Arial';
    const attendanceText = attendanceToggle ? 'Attendance: ON' : 'Attendance: OFF';
    const attendanceWidth = ctx.measureText(attendanceText).width;
    
    ctx.fillStyle = attendanceToggle ? 'rgba(76, 175, 80, 0.8)' : 'rgba(158, 158, 158, 0.8)';
    ctx.fillRect(overlay.width - attendanceWidth - 30, 105, attendanceWidth + 20, 35);
    
    ctx.fillStyle = 'white';
    ctx.fillText(attendanceText, overlay.width - attendanceWidth - 20, 127);
    
    // Draw marked attendance count
    if (attendanceToggle && markedAttendance.size > 0) {
        ctx.font = 'bold 14px Arial';
        const markedText = `Marked: ${markedAttendance.size}`;
        const markedWidth = ctx.measureText(markedText).width;
        
        ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
        ctx.fillRect(10, 150, markedWidth + 20, 30);
        
        ctx.fillStyle = 'white';
        ctx.fillText(markedText, 20, 170);
    }
    
    faces.forEach(face => {
        const [x1, y1, x2, y2] = face.bbox;
        const isUnknown = face.name === 'Unknown';
        const isTracked = face.tracked;
        const trackId = face.track_id;
        const hasModal = face.modal_info && face.modal_info.modal_active;
        
        // Choose color based on tracking status
        let boxColor, labelColor;
        if (hasModal) {
            boxColor = '#FF5722';  // Orange for hand raised
            labelColor = 'rgba(255, 87, 34, 0.8)';
        } else if (isTracked) {
            boxColor = '#2196F3';  // Blue for tracked
            labelColor = 'rgba(33, 150, 243, 0.8)';
        } else if (isUnknown) {
            boxColor = '#ff4444';  // Red for unknown
            labelColor = 'rgba(255, 68, 68, 0.8)';
        } else {
            boxColor = '#44ff44';  // Green for recognized
            labelColor = 'rgba(68, 255, 68, 0.8)';
        }
        
        // Draw bounding box
        ctx.strokeStyle = boxColor;
        ctx.lineWidth = hasModal ? 5 : (isTracked ? 4 : 3);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        
        // Build label with name and ID
        let nameLabel = `${face.name}`;
        let idLabel = '';
        
        // Add student ID if available
        if (face.id_number && face.id_number !== 'N/A' && face.id_number !== 'Unknown') {
            idLabel = `ID: ${face.id_number}`;
        }
        
        // Create combined text for width calculation
        let combinedText = nameLabel;
        if (idLabel) {
            combinedText += ' ' + idLabel;
        }
        combinedText += ` (${Math.round(face.confidence * 100)}%)`;
        
        ctx.font = 'bold 14px Arial';
        const textWidth = ctx.measureText(combinedText).width;
        
        // Calculate label height based on whether we have ID
        const labelHeight = idLabel ? 50 : 35; // Taller if we have ID
        
        // Draw label background
        ctx.fillStyle = labelColor;
        ctx.fillRect(x1, y1 - labelHeight, textWidth + 15, labelHeight);
        
        // Draw name (first line)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(nameLabel, x1 + 8, y1 - (idLabel ? 25 : 20));
        
        // Draw student ID (second line) if available
        if (idLabel) {
            ctx.font = 'bold 12px Arial';
            ctx.fillText(idLabel, x1 + 8, y1 - 8);
        }
        
        // Draw confidence (third line or second line if no ID)
        ctx.font = '10px Arial';
        const confidenceY = idLabel ? y1 + 3 : y1 - 5;
        ctx.fillText(`Confidence: ${Math.round(face.confidence * 100)}%`, x1 + 8, confidenceY);
        
        // Draw other info below
        let infoYOffset = idLabel ? 15 : 5;
        
        if (face.section && face.section !== 'Unknown') {
            ctx.fillText(`Section: ${face.section}`, x1 + 8, y1 + infoYOffset);
            infoYOffset += 10;
        }
        
        if (isTracked) {
            ctx.fillText(`Tracked`, x1 + 8, y1 + infoYOffset);
            infoYOffset += 10;
        }
        
        if (hasModal) {
            ctx.fillText(`✋ Hand Raised`, x1 + 8, y1 + infoYOffset);
        }
        
        // Draw landmarks if enabled
        if (showLandmarksCheck.checked && face.landmarks) {
            ctx.fillStyle = '#ffaa00';
            face.landmarks.forEach(point => {
                ctx.beginPath();
                ctx.arc(point[0], point[1], 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        // Draw track ID near the box if enabled
        if (showTrackIDsCheck.checked && trackId) {
            ctx.font = '12px monospace';
            const idText = `Track ID:${trackId}`;
            const idWidth = ctx.measureText(idText).width;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x2 - idWidth - 10, y1 + 10, idWidth + 10, 20);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(idText, x2 - idWidth - 5, y1 + 25);
        }
        
        // Draw hand raise detection zone in debug mode
        if (debugMode && enableHandDetection) {
            const faceWidth = x2 - x1;
            const faceHeight = y2 - y1;
            
            // Calculate distance factor (smaller faces = farther away = larger zone)
            // Assume typical face width is ~150px at normal distance
            const normalFaceWidth = 150;
            const distanceFactor = Math.max(1.0, Math.min(2.5, normalFaceWidth / faceWidth));
            
            // Draw hand raise detection zone (above face)
            ctx.strokeStyle = 'rgba(255, 193, 7, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            // Detection area above face - larger and distance-adaptive
            const heightMultiplier = 3.5 * distanceFactor; // Increased from 2.5, scales with distance
            const widthMultiplier = 1.5 * distanceFactor;  // Increased from 1.0, scales with distance
            
            const detectionTop = Math.max(0, y1 - faceHeight * heightMultiplier);
            const detectionBottom = y1 + faceHeight * 0.5; // Increased from 0.3
            const detectionLeft = Math.max(0, x1 - faceWidth * widthMultiplier);
            const detectionRight = Math.min(overlay.width, x2 + faceWidth * widthMultiplier);
            
            ctx.strokeRect(detectionLeft, detectionTop, detectionRight - detectionLeft, detectionBottom - detectionTop);
            
            // Draw zone label with distance info
            ctx.fillStyle = 'rgba(255, 193, 7, 0.7)';
            ctx.font = 'bold 11px Arial';
            const zoneLabel = `Hand Raise Zone (${distanceFactor.toFixed(1)}x)`;
            ctx.fillText(zoneLabel, detectionLeft + 5, detectionTop + 15);
            
            ctx.setLineDash([]); // Reset dash
        }
    });
    
    // Draw MediaPipe hand detections if available
    if (enableHandDetection && detectedHands.length > 0) {
        drawHandsOnOverlay(ctx);
    }
    
    // Reset transform for next frame
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ===================================================================
// HAND RAISE MODAL FUNCTIONS
// ===================================================================

// Show hand raise modal
function showHandRaiseModal(modalInfo, faceImageData = null) {
    // Only show if we don't already have a modal active and hand detection is enabled
    if (currentModalTrackId || !enableHandDetection) {
        console.log('Modal already active or hand detection disabled');
        return;
    }
    
    currentModalTrackId = modalInfo.track_id;
    
    // Update modal content
    document.getElementById('modalPersonName').textContent = modalInfo.person_name || 'Unknown';
    document.getElementById('modalPersonId').textContent = modalInfo.person_id_number || 'N/A';
    document.getElementById('modalPersonSection').textContent = modalInfo.section || 'Unknown';
    document.getElementById('modalPersonConfidence').textContent = 
        modalInfo.confidence ? `${Math.round(modalInfo.confidence * 100)}%` : 'N/A';
    
    // Update hand position text
    const handSideEl = document.getElementById('modalHandSide');
    if (modalInfo.hand_position === 'raised') {
        handSideEl.textContent = '✋ Hand Raised';
        handSideEl.className = 'raised-hand-badge';
    } else {
        handSideEl.textContent = 'Hand at ' + (modalInfo.hand_side || 'Unknown') + ' side';
        handSideEl.className = 'hand-side-badge';
    }
    
    // Try to capture face image from video
    let faceImageToShow = captureFaceImageFromVideo(modalInfo);
    
    // If capture failed, use provided image data
    if (!faceImageToShow && faceImageData) {
        faceImageToShow = faceImageData;
    }
    
    // Update face image in modal
    updateFaceImageInModal(faceImageToShow, modalInfo);
    
    // Show modal
    modal.show();
    
    // Play notification sound
    playNotificationSound();
}

// Helper function to capture face image from video
function captureFaceImageFromVideo(modalInfo) {
    // Check if video is ready
    if (!video || video.readyState !== 4 || !video.videoWidth || video.videoWidth <= 0) {
        console.log('Video not ready for capture');
        return null;
    }
    
    // Create canvas with video dimensions
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    try {
        // Draw current video frame (NO mirror transform for face capture)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get face bounding box from modal info
        let faceBbox = modalInfo.face_bbox;
        if (!faceBbox || faceBbox.length < 4) {
            console.log('No face bbox in modal info:', modalInfo);
            return null;
        }
        
        // IMPORTANT: Convert mirrored coordinates to actual coordinates
        const mirroredX1 = faceBbox[0];
        const mirroredX2 = faceBbox[2];
        const actualX1 = canvas.width - mirroredX2;  // Convert to actual coordinates
        const actualX2 = canvas.width - mirroredX1;  // Convert to actual coordinates
        const y1 = faceBbox[1];
        const y2 = faceBbox[3];
        
        // Calculate face dimensions
        const faceWidth = actualX2 - actualX1;
        const faceHeight = y2 - y1;
        
        if (faceWidth <= 10 || faceHeight <= 10) {
            console.log('Face too small to capture:', faceWidth, faceHeight);
            return null;
        }
        
        // Add padding around face
        const padding = 40;
        const cropX = Math.max(0, actualX1 - padding);
        const cropY = Math.max(0, y1 - padding);
        const cropWidth = Math.min(canvas.width - cropX, faceWidth + padding * 2);
        const cropHeight = Math.min(canvas.height - cropY, faceHeight + padding * 2);
        
        // Create a new canvas for the cropped face
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = cropWidth;
        faceCanvas.height = cropHeight;
        const faceCtx = faceCanvas.getContext('2d');
        
        // Crop the face region
        faceCtx.drawImage(
            canvas,
            cropX, cropY, cropWidth, cropHeight,  // Source region
            0, 0, cropWidth, cropHeight           // Destination region
        );
        
        // Convert to data URL
        return faceCanvas.toDataURL('image/jpeg', 0.9);
        
    } catch (error) {
        console.error('Error capturing face image:', error);
        return null;
    }
}

// Helper function to update face image in modal
function updateFaceImageInModal(faceImageData, modalInfo) {
    const faceImageDiv = document.getElementById('modalFaceImage');
    
    if (faceImageData) {
        faceImageDiv.innerHTML = `
            <div class="text-center">
                <img src="${faceImageData}" class="img-fluid rounded shadow" 
                     style="max-height: 200px; border: 3px solid #4facfe; object-fit: cover;" 
                     alt="${modalInfo.person_name}'s Face"
                     onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI4MCIgZmlsbD0iI0U5RUNFRiIvPjxwYXRoIGQ9Ik0xMDAgMTIwQzExNi41NjkgMTIwIDEzMCAxMDYuNTY5IDEzMCA5MEMxMzAgNzMuNDMxMSAxMTYuNTY5IDYwIDEwMCA2MEM4My40MzExIDYwIDcwIDczLjQzMTEgNzAgOTBDNzAgMTA2LjU2OSA4My40MzExIDEyMCAxMDAgMTIwWiIgZmlsbD0iI0IxQjJCMyIvPjxwYXRoIGQ9Ik02MCAxNjBDNzAgMTUwIDkwIDE1MCAxMDAgMTUwQzExMCAxNTAgMTMwIDE1MCAxNDAgMTYwIiBzdHJva2U9IiNCMUIyQjMiIHN0cm9rZS13aWR0aD0iMjAiLz48L3N2Zz4='">
                <p class="text-muted mt-2">${modalInfo.person_name}'s Face</p>
            </div>
        `;
    } else {
        // Fallback to icon if no image
        faceImageDiv.innerHTML = `
            <div class="text-center text-muted">
                <div class="mb-3" style="font-size: 4rem; color: #4facfe;">👤</div>
                <p class="mb-1">${modalInfo.person_name || 'Person'}</p>
                <small class="text-muted">Live face preview unavailable</small>
            </div>
        `;
    }
}

// Test modal function
function testModal() {
    const testModalInfo = {
        'modal_active': true,
        'track_id': 'test_' + Date.now(),
        'person_name': 'Test Person',
        'person_id_number': 'TEST001',
        'section': 'Test Section',
        'confidence': 0.95,
        'timestamp': Date.now() / 1000,
        'hand_side': 'right',
        'hand_position': 'raised'
    };
    
    showHandRaiseModal(testModalInfo, null);
}

// Reset modal state
function resetModal() {
    if (modalTimer) clearInterval(modalTimer);
    currentModalTrackId = null;
    modalCountdown = 5;
    
    // Reset modal content
    document.getElementById('modalFaceImage').innerHTML = `
        <div class="text-center text-muted">
            <i class="fas fa-user fa-3x"></i>
            <p>Face Preview</p>
        </div>
    `;
}

// Acknowledge hand raise and save points
async function acknowledgeHandRaise() {
    try {
        const studentId = document.getElementById("modalPersonId").textContent.trim();
        const subject = document.getElementById("currentSubject").textContent.trim();
        const points = document.getElementById("modalPointsInput").value;

        if (!studentId || studentId === "N/A") {
            alert("This person is not saved in the face embeddings. Please give points manually.");
            return;
        }

        const payload = {
            student_id: studentId,
            subject: subject,
            points: points,
            date: new Date().toISOString()
        };

        const response = await fetch("/save-points", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!result.success) {
            console.error("❌ Save failed:", result.message);
            showNotification("Failed to save points: " + result.message, "error");
            return;
        }

        console.log("✅ Points saved:", result.message);
        
        // Show success notification
        showNotification(
            `Points awarded successfully! ${result.points_awarded || points} points saved for ${studentId}`,
            "success"
        );
        
        // Play success sound
        playSuccessSound();

        // Show confetti effect
        showConfettiEffect();
        
        // Close modal
        if (currentModalTrackId && sessionId) {
            closeModalOnServer();
        }

        modal.hide();

    } catch (err) {
        console.error("❌ Error sending points:", err);
        showNotification("An error occurred while saving points.", "error");
    }
}

// Close modal on server
async function closeModalOnServer() {
    try {
        const response = await fetch('/api/close_modal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                track_id: currentModalTrackId
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('Failed to close modal on server:', result.message);
        }
    } catch (error) {
        console.error('Error closing modal:', error);
    }
}

// Play notification sound
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('Audio not supported or user blocked it');
    }
}

// ===================================================================
// NOTIFICATION FUNCTIONS
// ===================================================================

// Function to show notification/toast
function showNotification(message, type = "info") {
    // Remove any existing notification
    const existingNotification = document.getElementById("customNotification");
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement("div");
    notification.id = "customNotification";
    
    // Set styles based on type
    let bgColor, icon, borderColor;
    switch(type) {
        case "success":
            bgColor = "linear-gradient(135deg, #4CAF50, #45a049)";
            icon = "fas fa-check-circle";
            borderColor = "#2E7D32";
            break;
        case "error":
            bgColor = "linear-gradient(135deg, #f44336, #d32f2f)";
            icon = "fas fa-exclamation-circle";
            borderColor = "#B71C1C";
            break;
        case "warning":
            bgColor = "linear-gradient(135deg, #ff9800, #f57c00)";
            icon = "fas fa-exclamation-triangle";
            borderColor = "#E65100";
            break;
        default:
            bgColor = "linear-gradient(135deg, #2196F3, #1976D2)";
            icon = "fas fa-info-circle";
            borderColor = "#0D47A1";
    }
    
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            border-left: 5px solid ${borderColor};
            animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="${icon}" style="font-size: 24px;"></i>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 16px; margin-bottom: 3px;">
                        ${type === "success" ? "Success!" : type === "error" ? "Error" : "Notification"}
                    </div>
                    <div style="font-size: 14px; opacity: 0.95;">${message}</div>
                </div>
            </div>
        </div>
    `;
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    `;
    
    // Add to document
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
            style.remove();
        }
    }, 3000);
}

// Function to play success sound
function playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator1.frequency.value = 523.25; // C5
        oscillator2.frequency.value = 659.25; // E5
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.5);
        oscillator2.stop(audioContext.currentTime + 0.5);
        
    } catch (error) {
        console.log('Audio not supported');
    }
}

// Optional: Add confetti effect for extra celebration
function showConfettiEffect() {
    console.log("Points awarded! 🎉");
    
    // Optional: Add a simple confetti effect
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// ===================================================================
// DATABASE FUNCTIONS
// ===================================================================

// Refresh database info
async function refreshDatabase() {
    try {
        const response = await fetch('/api/database_stats');
        const data = await response.json();
        
        dbSections.textContent = data.total_sections;
        dbPersons.textContent = data.total_persons;
        
        // Update section filter with fresh data
        loadSections();
    } catch (error) {
        console.error('Error refreshing database:', error);
    }
}

// Copy session ID to clipboard
function copySessionId() {
    if (!sessionId) {
        alert('No active session ID to copy');
        return;
    }
    
    navigator.clipboard.writeText(sessionId).then(() => {
        alert('Session ID copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy session ID:', err);
    });
}

// ===================================================================
// VOICE RECOGNITION FUNCTIONS
// ===================================================================

// Initialize voice recognition
function initializeVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported in this browser');
        alert('Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
        return false;
    }
    
    console.log('[Voice] Initializing speech recognition...');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    
    // Configure speech recognition
    speechRecognition.continuous = true;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';
    speechRecognition.maxAlternatives = 1;
    
    console.log('[Voice] Speech recognition configured successfully');
    
    // Speech recognition event handlers
    speechRecognition.onstart = function() {
        console.log('[Voice] Voice recognition started successfully');
        isListening = true;
        voiceRecognitionBlocked = false; // Clear blocked flag on successful start
        updateVoiceStatus('active');
    };
    
    speechRecognition.onend = function() {
        console.log('Voice recognition ended');
        isListening = false;
        updateVoiceStatus('inactive');
        
        // Restart recognition if modal is still open and no blocking error occurred
        if (modal && modal._isShown && !voiceRecognitionBlocked) {
            setTimeout(() => {
                if (speechRecognition && !isListening && modal && modal._isShown && !voiceRecognitionBlocked) {
                    try {
                        speechRecognition.start();
                        console.log('Voice recognition auto-restarted');
                    } catch (error) {
                        console.error('Error auto-restarting voice recognition:', error);
                    }
                }
            }, 500);
        } else if (voiceRecognitionBlocked) {
            console.log('[Voice] Auto-restart blocked due to previous error');
        }
    };
    
    speechRecognition.onresult = function(event) {
        const now = Date.now();
        if (now - lastCommandTime < commandCooldown) {
            return;
        }
        
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log('Voice command detected:', transcript);
        
        processVoiceCommand(transcript);
        lastCommandTime = now;
    };
    
    speechRecognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        updateVoiceStatus('error');
        
        // Check if this is a blocking error that should prevent auto-restart
        const blockingErrors = ['aborted', 'not-allowed', 'no-speech', 'service-not-allowed'];
        if (blockingErrors.includes(event.error)) {
            voiceRecognitionBlocked = true; // Set flag to prevent onend from restarting
            console.log('[Voice] Blocking error detected - auto-restart disabled:', event.error);
            
            // Show user-friendly message for permission denied
            if (event.error === 'not-allowed') {
                showVoiceFeedback('Microphone permission denied. Please allow microphone access in browser settings.', 'error');
            }
        } else {
            // Only auto-restart for transient errors
            setTimeout(() => {
                if (modal && modal._isShown && speechRecognition && !isListening && !voiceRecognitionBlocked) {
                    try {
                        speechRecognition.start();
                        console.log('Voice recognition restarted after transient error');
                    } catch (error) {
                        console.error('Error restarting after error:', error);
                    }
                }
            }, 1000);
        }
    };
    
    return true;
}

// Process voice commands
function processVoiceCommand(command) {
    if (!modal || !modal._isShown) {
        console.log('Modal not active - ignoring voice command');
        return;
    }
    
    const pointsInput = document.getElementById('modalPointsInput');
    if (!pointsInput) return;
    
    let points = 0;
    
    // Parse number commands
    const numberWords = {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
        'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
        'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
        'eighty': 80, 'ninety': 90, 'hundred': 100
    };
    
    // Check for specific number words
    for (const [word, value] of Object.entries(numberWords)) {
        if (command.includes(word)) {
            points = value;
            break;
        }
    }
    
    // Check for numeric values
    const numericMatch = command.match(/\b(\d+)\b/);
    if (numericMatch) {
        points = parseInt(numericMatch[1]);
    }
    
    // Check for special commands
    if (command.includes('clear') || command.includes('reset')) {
        pointsInput.value = '';
        pointsInput.focus();
        showVoiceFeedback('Points cleared', 'info');
        return;
    }
    
    if (command.includes('maximum') || command.includes('max') || command.includes('one hundred')) {
        points = 100;
    }
    
    if (command.includes('half') || command.includes('fifty')) {
        points = 50;
    }
    
    if (command.includes('minimum') || command.includes('min')) {
        points = 1;
    }
    
    // Check for increment/decrement commands
    if (command.includes('increase') || command.includes('increment') || command.includes('add') || command.includes('plus')) {
        const currentValue = parseInt(pointsInput.value) || 0;
        const incrementMatch = command.match(/\b(\d+)\b/);
        const increment = incrementMatch ? parseInt(incrementMatch[1]) : 5;
        points = currentValue + increment;
    }
    
    if (command.includes('decrease') || command.includes('decrement') || command.includes('subtract') || command.includes('minus')) {
        const currentValue = parseInt(pointsInput.value) || 0;
        const decrementMatch = command.match(/\b(\d+)\b/);
        const decrement = decrementMatch ? parseInt(decrementMatch[1]) : 5;
        points = Math.max(0, currentValue - decrement);
    }
    
    // Check for save/submit commands
    if (command.includes('save') || command.includes('submit') || command.includes('award')) {
        acknowledgeHandRaise();
        showVoiceFeedback('Saving points...', 'success');
        return;
    }
    
    // Check for cancel/close commands
    if (command.includes('cancel') || command.includes('close') || command.includes('dismiss')) {
        modal.hide();
        showVoiceFeedback('Modal dismissed', 'info');
        return;
    }
    
    // If we found points to update
    if (points > 0 || (command.includes('zero') && points === 0)) {
        // Validate points range
        if (points > 100) {
            points = 100;
            showVoiceFeedback('Maximum points is 100', 'warning');
        } else if (points < 0) {
            points = 0;
            showVoiceFeedback('Minimum points is 0', 'warning');
        }
        
        pointsInput.value = points;
        pointsInput.focus();
        
        // Show visual feedback
        showVoiceFeedback(`Set to ${points} points`, 'success');
        highlightPointsInput();
        
        // Play feedback sound
        playVoiceCommandSound();
    } else {
        // No valid points command found
        console.log('No valid points command detected');
        showVoiceFeedback('Command not recognized', 'error');
    }
}

// Start voice recognition when modal opens
function startVoiceRecognition() {
    console.log('[Voice] startVoiceRecognition called');
    
    if (!speechRecognition) {
        console.log('[Voice] Speech recognition not initialized, initializing now...');
        const initialized = initializeVoiceRecognition();
        if (!initialized) {
            console.warn('[Voice] Voice recognition not available');
            return;
        }
    }
    
    if (!isListening) {
        try {
            console.log('[Voice] Starting speech recognition...');
            speechRecognition.start();
            showVoiceFeedback('Voice commands active', 'success');
        } catch (error) {
            console.error('[Voice] Error starting speech recognition:', error);
            
            if (error.name === 'NotAllowedError') {
                showVoiceFeedback('Microphone access denied. Please allow microphone permissions.', 'error');
            } else {
                showVoiceFeedback('Failed to start voice recognition: ' + error.message, 'error');
            }
        }
    } else {
        console.log('[Voice] Voice recognition already listening');
    }
}

// Stop voice recognition
function stopVoiceRecognition() {
    if (speechRecognition && isListening) {
        try {
            speechRecognition.stop();
        } catch (error) {
            console.error('Error stopping speech recognition:', error);
        }
        isListening = false;
        updateVoiceStatus('inactive');
    }
}

// Show voice command feedback
function showVoiceFeedback(message, type = 'info') {
    const existingFeedback = document.getElementById('voiceFeedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    const feedback = document.createElement('div');
    feedback.id = 'voiceFeedback';
    
    let bgColor, icon;
    switch(type) {
        case 'success':
            bgColor = 'linear-gradient(135deg, #4CAF50, #2E7D32)';
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            bgColor = 'linear-gradient(135deg, #f44336, #B71C1C)';
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            bgColor = 'linear-gradient(135deg, #ff9800, #E65100)';
            icon = 'fas fa-exclamation-triangle';
            break;
        default:
            bgColor = 'linear-gradient(135deg, #2196F3, #0D47A1)';
            icon = 'fas fa-info-circle';
    }
    
    feedback.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            min-width: 300px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideDown 0.3s ease-out, fadeOut 0.3s ease-in 2.7s;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <i class="${icon}" style="font-size: 20px;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">
                    Voice Command
                </div>
                <div style="font-size: 13px; opacity: 0.95;">${message}</div>
            </div>
            <i class="fas fa-microphone" style="font-size: 16px; opacity: 0.8;"></i>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.remove();
            style.remove();
        }
    }, 3000);
}

// Update voice status indicator
function updateVoiceStatus(status) {
    let voiceStatusEl = document.getElementById('voiceStatus');
    if (!voiceStatusEl) {
        voiceStatusEl = document.createElement('div');
        voiceStatusEl.id = 'voiceStatus';
        voiceStatusEl.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9998;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        document.body.appendChild(voiceStatusEl);
    }
    
    switch(status) {
        case 'active':
            voiceStatusEl.innerHTML = `<i class="fas fa-microphone" style="color: #4CAF50;"></i> Listening...`;
            voiceStatusEl.style.background = 'rgba(76, 175, 80, 0.9)';
            break;
        case 'error':
            voiceStatusEl.innerHTML = `<i class="fas fa-microphone-slash" style="color: #f44336;"></i> Voice Error`;
            voiceStatusEl.style.background = 'rgba(244, 67, 54, 0.9)';
            break;
        case 'inactive':
            voiceStatusEl.innerHTML = `<i class="fas fa-microphone" style="color: #9E9E9E;"></i> Voice Ready`;
            voiceStatusEl.style.background = 'rgba(158, 158, 158, 0.9)';
            break;
    }
}

// Highlight points input when changed by voice
function highlightPointsInput() {
    const pointsInput = document.getElementById('modalPointsInput');
    if (!pointsInput) return;
    
    pointsInput.style.transition = 'all 0.3s ease';
    pointsInput.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.5)';
    pointsInput.style.borderColor = '#4CAF50';
    
    setTimeout(() => {
        pointsInput.style.boxShadow = '';
        pointsInput.style.borderColor = '';
    }, 1000);
}

// Play feedback sound for voice commands
function playVoiceCommandSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 523.25; // C5
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('Voice feedback audio not supported');
    }
}

// Add voice command help to modal
function addVoiceCommandHelp() {
    const modalFooter = document.querySelector('#handRaiseModal .modal-footer');
    if (!modalFooter) return;
    
    // Check if the button already exists to prevent duplicates
    const existingButton = modalFooter.querySelector('.btn-outline-info.me-auto');
    if (existingButton) {
        console.log('[Voice] Voice command help button already exists, skipping');
        return;
    }
    
    const helpButton = document.createElement('button');
    helpButton.type = 'button';
    helpButton.className = 'btn btn-outline-info btn-sm me-auto';
    helpButton.innerHTML = '<i class="fas fa-microphone me-1"></i> Voice Commands';
    helpButton.onclick = showVoiceCommandHelpModal;
    
    modalFooter.prepend(helpButton);
}

// Show voice command help modal
// Show voice command help modal
function showVoiceCommandHelpModal() {
    const helpModalHTML = `
        <style>
            #voiceHelpModal .modal-dialog {
                max-width: 1200px;
                margin: 1.75rem auto;
            }
            @media (min-width: 1400px) {
                #voiceHelpModal .modal-dialog {
                    max-width: 1400px;
                }
            }
            @media (min-width: 1200px) and (max-width: 1399px) {
                #voiceHelpModal .modal-dialog {
                    max-width: 1200px;
                }
            }
            @media (min-width: 992px) and (max-width: 1199px) {
                #voiceHelpModal .modal-dialog {
                    max-width: 1000px;
                }
            }
            @media (max-width: 768px) {
                #voiceHelpModal .modal-dialog {
                    max-width: 95%;
                    margin: 0.5rem;
                }
                #voiceHelpModal .row .col-md-6,
                #voiceHelpModal .row .col-md-12 {
                    margin-bottom: 0.75rem;
                }
            }
            #voiceHelpModal .modal-body {
                padding: 1.25rem;
                overflow-x: hidden;
                overflow-y: auto;
                max-height: 70vh;
            }
            #voiceHelpModal .card {
                margin-bottom: 0.75rem;
            }
            #voiceHelpModal .list-group-item {
                padding: 0.5rem 0.75rem;
                font-size: 0.9rem;
            }
            #voiceHelpModal code {
                font-size: 0.85rem;
                white-space: nowrap;
            }
        </style>
        <div class="modal fade" id="voiceHelpModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-microphone me-2"></i>Voice Commands</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info mb-2" style="padding: 0.75rem; font-size: 0.9rem;">
                            <i class="fas fa-info-circle me-1"></i>
                            Voice commands auto-activate when modal opens. Speak clearly.
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-2">
                                    <div class="card-header bg-success text-white py-2">
                                        <i class="fas fa-calculator me-1"></i>Set Points
                                    </div>
                                    <div class="card-body p-0">
                                        <ul class="list-group list-group-flush">
                                            <li class="list-group-item"><code>"five points"</code> → Sets to 5</li>
                                            <li class="list-group-item"><code>"ten"</code> → Sets to 10</li>
                                            <li class="list-group-item"><code>"twenty five"</code> → Sets to 25</li>
                                            <li class="list-group-item"><code>"maximum"</code> → Sets to 100</li>
                                            <li class="list-group-item"><code>"half"</code> → Sets to 50</li>
                                            <li class="list-group-item"><code>"zero"</code> → Sets to 0</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="card mb-2">
                                    <div class="card-header bg-warning text-dark py-2">
                                        <i class="fas fa-exchange-alt me-1"></i>Adjust Points
                                    </div>
                                    <div class="card-body p-0">
                                        <ul class="list-group list-group-flush">
                                            <li class="list-group-item"><code>"increase by five"</code> → Adds 5</li>
                                            <li class="list-group-item"><code>"decrease by ten"</code> → Subtracts 10</li>
                                            <li class="list-group-item"><code>"add three points"</code> → Adds 3</li>
                                            <li class="list-group-item"><code>"minus two"</code> → Subtracts 2</li>
                                            <li class="list-group-item"><code>"clear points"</code> → Clears input</li>
                                            <li class="list-group-item"><code>"reset"</code> → Clears input</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                            <div class="col-12">
                                <div class="card mb-2">
                                    <div class="card-header bg-primary text-white py-2">
                                        <i class="fas fa-play-circle me-1"></i>Actions
                                    </div>
                                    <div class="card-body p-0">
                                        <ul class="list-group list-group-flush">
                                            <li class="list-group-item"><code>"save points"</code> → Saves and closes</li>
                                            <li class="list-group-item"><code>"submit"</code> → Saves and closes</li>
                                            <li class="list-group-item"><code>"cancel"</code> → Closes without saving</li>
                                            <li class="list-group-item"><code>"dismiss"</code> → Closes modal</li>
                                            <li class="list-group-item"><code>"award points"</code> → Saves points</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-2 p-2 bg-light rounded">
                            <h6 class="mb-2" style="font-size: 0.95rem;"><i class="fas fa-lightbulb me-1"></i>Tips:</h6>
                            <ul class="mb-0" style="padding-left: 1.25rem; font-size: 0.85rem;">
                                <li>Speak clearly in a normal tone</li>
                                <li>Allow microphone access when prompted</li>
                                <li>Works best in quiet environments</li>
                                <li>Wait for feedback sound after speaking</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-sm btn-success" onclick="testVoiceCommand()">
                            <i class="fas fa-play me-2"></i>Test Voice Recognition
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('voiceHelpModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', helpModalHTML);
    
    const voiceHelpModal = new bootstrap.Modal(document.getElementById('voiceHelpModal'));
    voiceHelpModal.show();
}

// Test voice recognition
function testVoiceCommand() {
    if (!speechRecognition) {
        initializeVoiceRecognition();
    }
    
    if (speechRecognition && !isListening) {
        try {
            speechRecognition.start();
            showVoiceFeedback('Testing voice recognition... Say something!', 'info');
            
            setTimeout(() => {
                if (isListening) {
                    stopVoiceRecognition();
                    showVoiceFeedback('Voice test complete', 'success');
                }
            }, 5000);
        } catch (error) {
            showVoiceFeedback('Error starting voice test: ' + error.message, 'error');
        }
    }
}

// Setup modal voice recognition
function setupModalVoiceRecognition() {
    const modalElement = document.getElementById('handRaiseModal');
    
    if (!modalElement) {
        console.error('handRaiseModal element not found - voice recognition disabled');
        console.log('Retrying voice recognition setup in 1 second...');
        // Retry after a delay in case DOM isn't fully loaded
        setTimeout(() => {
            const retryElement = document.getElementById('handRaiseModal');
            if (retryElement) {
                console.log('Retry successful - setting up voice recognition');
                setupModalVoiceRecognitionListeners(retryElement);
            } else {
                console.error('Modal element still not found after retry');
            }
        }, 1000);
        return;
    }
    
    setupModalVoiceRecognitionListeners(modalElement);
}

// Setup modal voice recognition event listeners
function setupModalVoiceRecognitionListeners(modalElement) {
    console.log('[Voice] Setting up modal event listeners for voice recognition');
    
    modalElement.addEventListener('show.bs.modal', function() {
        const modalHeader = modalElement.querySelector('.modal-header');
        if (modalHeader && !modalHeader.querySelector('.voice-indicator')) {
            const voiceIndicator = document.createElement('span');
            voiceIndicator.className = 'voice-indicator badge bg-success ms-2';
            voiceIndicator.innerHTML = '<i class="fas fa-microphone me-1"></i>Voice Active';
            voiceIndicator.id = 'modalVoiceIndicator';
            modalHeader.appendChild(voiceIndicator);
        }
        
        setTimeout(() => {
            startVoiceRecognition();
        }, 500);
        
        // Voice command help button is already in the HTML modal footer, no need to add dynamically
        // addVoiceCommandHelp();
    });
    
    modalElement.addEventListener('hidden.bs.modal', function() {
        stopVoiceRecognition();
        voiceRecognitionBlocked = false; // Reset blocked flag when modal closes
        
        const voiceIndicator = document.getElementById('modalVoiceIndicator');
        if (voiceIndicator) {
            voiceIndicator.remove();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (modal && modal._isShown && e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            if (isListening) {
                stopVoiceRecognition();
                showVoiceFeedback('Voice commands disabled', 'info');
            } else {
                startVoiceRecognition();
                showVoiceFeedback('Voice commands enabled', 'success');
            }
        }
    });
}

// Manual voice toggle function
function toggleVoiceRecognition() {
    if (!isListening) {
        startVoiceRecognition();
        const voiceToggleBtn = document.getElementById('voiceToggleBtn');
        const voiceStatusBadge = document.getElementById('voiceStatusBadge');
        
        if (voiceToggleBtn) {
            voiceToggleBtn.innerHTML = '<i class="fas fa-microphone-slash me-1"></i> Stop Voice';
            voiceToggleBtn.classList.remove('btn-outline-success');
            voiceToggleBtn.classList.add('btn-success');
        }
        
        if (voiceStatusBadge) {
            voiceStatusBadge.innerHTML = '<i class="fas fa-microphone"></i> Listening...';
            voiceStatusBadge.classList.remove('bg-info');
            voiceStatusBadge.classList.add('bg-success');
        }
    } else {
        stopVoiceRecognition();
        const voiceToggleBtn = document.getElementById('voiceToggleBtn');
        const voiceStatusBadge = document.getElementById('voiceStatusBadge');
        
        if (voiceToggleBtn) {
            voiceToggleBtn.innerHTML = '<i class="fas fa-microphone me-1"></i> Start Voice';
            voiceToggleBtn.classList.remove('btn-success');
            voiceToggleBtn.classList.add('btn-outline-success');
        }
        
        if (voiceStatusBadge) {
            voiceStatusBadge.innerHTML = '<i class="fas fa-microphone"></i> Ready';
            voiceStatusBadge.classList.remove('bg-success');
            voiceStatusBadge.classList.add('bg-info');
        }
    }
}

// Add CSS for voice feedback
document.addEventListener('DOMContentLoaded', function() {
    const voiceCSS = `
        .voice-active {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
        
        #modalPointsInput:focus {
            border-color: #4CAF50;
            box-shadow: 0 0 0 0.2rem rgba(76, 175, 80, 0.25);
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = voiceCSS;
    document.head.appendChild(style);
});