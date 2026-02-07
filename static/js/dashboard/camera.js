    // static/js/camera.js
    // static/js/camera.js
    let currentStream = null;

    async function startCamera() {
        try {
            // Stop any existing stream
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
            
            // Get video element
            const video = document.getElementById('video');
            
            // Get camera stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
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
        
        const video = document.getElementById('video');
        if (video) {
            video.srcObject = null;
        }
    }

    // Helper function to resize canvas to match video
    function resizeCanvasToVideo() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('overlay');
        
        if (video && canvas && video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }
    }

    // For browsers that don't support async/await
    if (window.Promise === undefined) {
        console.warn('Promise not supported - using polyfill');
        // You might want to add a Promise polyfill here
    }

    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        
        const video = document.getElementById('video');
        if (video) {
            video.srcObject = null;
        }
    }

    // For browsers that don't support async/await
    if (window.Promise === undefined) {
        console.warn('Promise not supported - using polyfill');
        // You might want to add a Promise polyfill here
    }