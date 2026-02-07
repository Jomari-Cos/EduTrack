// navigation.js - Sidebar and panel navigation
function initNavigation() {
    console.log("🚀 Initializing navigation...");
    
    setupPanelNavigation();
    setupLiveMonitoring();
}

function setupPanelNavigation() {
    const navButtons = document.querySelectorAll("nav button[data-panel]");
    const panels = document.querySelectorAll(".panel");

    function showPanel(panelId, clickedBtn) {
        panels.forEach(panel => panel.classList.add("hidden"));
        
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.remove("hidden");

        navButtons.forEach(btn => btn.classList.remove("bg-blue-100", "text-blue-600"));
        
        if (clickedBtn) clickedBtn.classList.add("bg-blue-100", "text-blue-600");
    }

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetPanel = btn.getAttribute("data-panel");
            showPanel(targetPanel, btn);
        });
    });

    if (navButtons.length > 0) {
        const firstPanelId = navButtons[0].getAttribute("data-panel");
        showPanel(firstPanelId, navButtons[0]);
    }
}

function setupLiveMonitoring() {
    const videos = document.getElementById("webcam");
    const fullscreenBtns = document.getElementById("fullscreenBtn");

    if (fullscreenBtns && videos) {
        fullscreenBtns.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                videos.requestFullscreen().catch(err => console.error(err));
            } else {
                document.exitFullscreen();
            }
        });
    }

    const startBtn = document.getElementById("startCam");
    const stopBtn = document.getElementById("stopCam");
    const video = document.getElementById("webcam");
    let stream;

    if (startBtn && stopBtn && video) {
        startBtn.addEventListener("click", async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        aspectRatio: 16 / 9,
                        facingMode: "user",
                    },
                    audio: false,
                });
                video.srcObject = stream;
            } catch (err) {
                alert("Error accessing webcam: " + err.message);
            }
        });

        stopBtn.addEventListener("click", () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                video.srcObject = null;
            }
        });
    }
}