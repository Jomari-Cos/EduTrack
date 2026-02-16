document.addEventListener("DOMContentLoaded", () => {
    const liveBtn = document.getElementById("liveBtn");

    if (liveBtn) {
        liveBtn.addEventListener("click", goToFaceRecognize);
    }
});

function goToFaceRecognize() {
    // Redirect to Flask route that renders face_recognize.html
    window.location.href = "/face_recognize";
}
