// Face Enrollment JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const cameraFeed = document.getElementById('cameraFeed');
    const startEnrollmentBtn = document.getElementById('startEnrollmentBtn');
    const captureSampleBtn = document.getElementById('captureSampleBtn');
    const completeEnrollmentBtn = document.getElementById('completeEnrollmentBtn');
    const stopEnrollmentBtn = document.getElementById('stopEnrollmentBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const samplesCount = document.getElementById('samplesCount');
    const statusMessage = document.getElementById('statusMessage');
    const cameraStatus = document.getElementById('cameraStatus');
    
    // Student info elements
    const studentFirstName = document.getElementById('studentFirstName');
    const studentLastName = document.getElementById('studentLastName');
    const studentId = document.getElementById('studentId');

    // State variables
    let enrollmentActive = false;
    let samplesCollected = 0;
    const totalSamplesNeeded = 10;
    let studentData = null;

    // Initialize
    function initialize() {
        // Get student data from URL parameters or session storage
        const urlParams = new URLSearchParams(window.location.search);
        studentData = {
            firstName: urlParams.get('first_name') || 'Unknown',
            lastName: urlParams.get('last_name') || 'Unknown',
            studentId: urlParams.get('student_id') || 'Unknown'
        };

        // Update student info display
        studentFirstName.textContent = studentData.firstName;
        studentLastName.textContent = studentData.lastName;
        studentId.textContent = studentData.studentId;

        // Start camera feed
        startCameraFeed();

        updateStatus('Ready to start face enrollment', 'info');
    }

    // Start camera feed
    function startCameraFeed() {
        cameraFeed.src = '/admin/face-enrollment/video_feed';
        cameraStatus.textContent = 'Camera feed active';
    }

    // Update status message
    function updateStatus(message, type = 'info') {
        statusMessage.innerHTML = `<p class="${getStatusColor(type)}">${message}</p>`;
    }

    // Get status color based on type
    function getStatusColor(type) {
        switch(type) {
            case 'success': return 'text-green-800';
            case 'error': return 'text-red-800';
            case 'warning': return 'text-yellow-800';
            default: return 'text-blue-800';
        }
    }

    // Update progress
    function updateProgress() {
        const progress = Math.min(100, (samplesCollected / totalSamplesNeeded) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        samplesCount.textContent = `${samplesCollected}/${totalSamplesNeeded}`;
    }

    // Start enrollment
    async function startEnrollment() {
        if (!studentData) {
            updateStatus('Error: No student data available', 'error');
            return;
        }

        try {
            const response = await fetch('/admin/start-face-enrollment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    student_id: studentData.studentId,
                    first_name: studentData.firstName,
                    last_name: studentData.lastName
                })
            });

            const result = await response.json();

            if (result.success) {
                enrollmentActive = true;
                samplesCollected = 0;
                
                // Update UI
                startEnrollmentBtn.classList.add('hidden');
                captureSampleBtn.classList.remove('hidden');
                stopEnrollmentBtn.classList.remove('hidden');
                
                updateStatus('Face enrollment started! Click "Capture Face Sample" to begin collecting face data.', 'success');
                updateProgress();
            } else {
                updateStatus(`Error: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Error starting enrollment:', error);
            updateStatus('Error starting face enrollment. Please try again.', 'error');
        }
    }

    // Capture face sample
    async function captureSample() {
        if (!enrollmentActive) {
            updateStatus('Enrollment not active. Please start enrollment first.', 'error');
            return;
        }

        try {
            const response = await fetch('/admin/capture-face-sample', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (result.success) {
                samplesCollected = result.samples_collected;
                updateProgress();
                
                if (result.completed) {
                    // Enrollment completed
                    enrollmentCompleted();
                } else {
                    updateStatus(result.message, 'success');
                }
            } else {
                updateStatus(result.message, 'warning');
            }
        } catch (error) {
            console.error('Error capturing sample:', error);
            updateStatus('Error capturing face sample. Please try again.', 'error');
        }
    }

    // Stop enrollment
    async function stopEnrollment() {
        try {
            const response = await fetch('/admin/stop-face-enrollment', {
                method: 'POST'
            });

            resetEnrollmentUI();
            updateStatus('Face enrollment stopped.', 'info');
        } catch (error) {
            console.error('Error stopping enrollment:', error);
            updateStatus('Error stopping enrollment.', 'error');
        }
    }

    // Enrollment completed
    function enrollmentCompleted() {
        enrollmentActive = false;
        
        // Update UI
        captureSampleBtn.classList.add('hidden');
        stopEnrollmentBtn.classList.add('hidden');
        completeEnrollmentBtn.classList.remove('hidden');
        
        updateStatus('🎉 Face enrollment completed successfully! The system has learned your face features.', 'success');
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    }

    // Reset enrollment UI
    function resetEnrollmentUI() {
        enrollmentActive = false;
        samplesCollected = 0;
        
        startEnrollmentBtn.classList.remove('hidden');
        captureSampleBtn.classList.add('hidden');
        completeEnrollmentBtn.classList.add('hidden');
        stopEnrollmentBtn.classList.add('hidden');
        
        updateProgress();
    }

    // Complete enrollment and redirect
    function completeEnrollment() {
        window.location.href = '/';
    }

    // Event listeners
    startEnrollmentBtn.addEventListener('click', startEnrollment);
    captureSampleBtn.addEventListener('click', captureSample);
    stopEnrollmentBtn.addEventListener('click', stopEnrollment);
    completeEnrollmentBtn.addEventListener('click', completeEnrollment);

    // Check enrollment status periodically
    setInterval(async () => {
        if (enrollmentActive) {
            try {
                const response = await fetch('/admin/get-enrollment-status');
                const status = await response.json();
                
                if (status.active) {
                    samplesCollected = status.samples_collected;
                    updateProgress();
                }
            } catch (error) {
                console.error('Error checking enrollment status:', error);
            }
        }
    }, 2000);

    // Initialize the page
    initialize();
});
