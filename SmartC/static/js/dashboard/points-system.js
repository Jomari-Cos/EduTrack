// points-system.js - Fixed version with working submit button
// Version: 2.0.4 - Added extensive debugging for data attributes
console.log("🚀 Points system JS loaded - Version 2.0.4");

let currentStudent = null; // Make this a global variable in this file scope

function initPointsSystem() {
    console.log("🎯 Initializing points system...");
    
    setupPointsModal();
    setupAcknowledgeButtons();
    setupStudentAnalyticsModal();
    
    // Initialize view buttons for student modal
    initViewButtons();
    console.log("✅ View buttons initialized");
}

function setupPointsModal() {
    const pointsModal = document.getElementById("points-modal");
    const pointsInputField = document.getElementById("modal-points-input");
    const pointsModalStudentName = document.getElementById("modal-student-name");
    const pointsCancelBtn = document.getElementById("modal-cancel-btn");
    const pointsSubmitBtn = document.getElementById("modal-submit-btn");

    console.log("Points modal elements:", {
        pointsModal: !!pointsModal,
        pointsInputField: !!pointsInputField,
        pointsModalStudentName: !!pointsModalStudentName,
        pointsCancelBtn: !!pointsCancelBtn,
        pointsSubmitBtn: !!pointsSubmitBtn
    });

    if (!pointsModal || !pointsInputField || !pointsModalStudentName || 
        !pointsCancelBtn || !pointsSubmitBtn) {
        console.error("❌ Points modal elements not found!");
        createFallbackPointsModal();
        return;
    }

    // Cancel button
    pointsCancelBtn.addEventListener("click", () => {
        console.log("Cancel button clicked");
        pointsModal.classList.add("hidden");
        currentStudent = null;
    });

    // Submit button
    pointsSubmitBtn.addEventListener("click", async () => {
        console.log("Submit button clicked, currentStudent:", currentStudent);
        
        if (!currentStudent) {
            console.error("No student selected!");
            if (typeof showToast === "function") {
                showToast("⚠ No student selected. Please select a student first.", "warning");
            }
            return;
        }

        const points = pointsInputField.value.trim();
        console.log("Points value:", points);
        
        if (points === "" || isNaN(points) || Number(points) <= 0) {
            if (typeof showToast === "function") {
                showToast("⚠ Please enter a valid positive number of points.", "warning");
            }
            pointsInputField.focus();
            return;
        }

        // Show loading state
        const originalText = pointsSubmitBtn.textContent;
        pointsSubmitBtn.textContent = "Awarding...";
        pointsSubmitBtn.disabled = true;

        const subject = typeof window.SubjectClass !== "undefined" ? window.SubjectClass : "Unknown Subject";
        const date = new Date().toISOString();
        const { studentId, studentName } = currentStudent;
        const studentInfo = `Name (${studentName}), Student ID (${studentId})`;

        console.log("Submitting points:", {
            studentId,
            studentName,
            points: parseInt(points),
            subject,
            date
        });

        try {
            const response = await fetch("/save-points", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_info: studentInfo,
                    student_id: studentId,
                    student_name: studentName,
                    subject: subject,
                    points: parseInt(points),
                    date: date
                })
            });

            const result = await response.json();
            console.log("Server response:", result);

            if (result.success) {
                if (typeof showToast === "function") {
                    showToast(`✅ ${studentName} awarded ${points} points for ${subject}.`, "success");
                }
                
                // Show celebration
                showSuccessCelebration(studentName, points);
                
                // Refresh charts if needed
                if (typeof fillCharts === "function") {
                    setTimeout(fillCharts, 1000);
                }
            } else {
                if (typeof showToast === "function") {
                    showToast("❌ Failed to save points: " + (result.message || "Unknown error."), "error");
                }
            }
        } catch (error) {
            console.error("Error saving points:", error);
            if (typeof showToast === "function") {
                showToast("❌ Something went wrong while saving points.", "error");
            }
        } finally {
            pointsSubmitBtn.textContent = originalText;
            pointsSubmitBtn.disabled = false;
            pointsModal.classList.add("hidden");
            currentStudent = null;
            
            // Refresh view buttons if needed
            if (typeof initViewButtons === "function") {
                setTimeout(initViewButtons, 500);
            }
        }
    });

    // Enter key support
    pointsInputField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            console.log("Enter key pressed");
            pointsSubmitBtn.click();
        }
    });

    // Escape key to close
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !pointsModal.classList.contains("hidden")) {
            pointsModal.classList.add("hidden");
            currentStudent = null;
        }
    });

    // Close on outside click
    pointsModal.addEventListener("click", (e) => {
        if (e.target === pointsModal) {
            pointsModal.classList.add("hidden");
            currentStudent = null;
        }
    });
}

function createFallbackPointsModal() {
    console.log("Creating fallback points modal...");
    
    const modalHTML = `
        <div id="points-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 hidden">
            <div class="relative bg-white rounded-lg p-6 max-w-md mx-4">
                <button id="closePointsModal" class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                <h3 id="modal-student-name" class="text-lg font-bold mb-4 text-center">Award Points</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Points to award:</label>
                        <input type="number" id="modal-points-input" min="1" max="100" value="5" 
                               class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div class="flex space-x-3">
                        <button id="quickPoints5" class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg transition duration-200">
                            5 pts
                        </button>
                        <button id="quickPoints10" class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg transition duration-200">
                            10 pts
                        </button>
                        <button id="quickPoints15" class="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg transition duration-200">
                            15 pts
                        </button>
                    </div>
                    
                    <div class="flex space-x-3 pt-2">
                        <button id="modal-cancel-btn" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200">
                            Cancel
                        </button>
                        <button id="modal-submit-btn" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition duration-200">
                            Award Points
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Re-initialize with the new modal
    setupPointsModal();
    
    // Add quick points buttons functionality
    document.getElementById('quickPoints5').addEventListener('click', () => {
        document.getElementById('modal-points-input').value = 5;
    });
    document.getElementById('quickPoints10').addEventListener('click', () => {
        document.getElementById('modal-points-input').value = 10;
    });
    document.getElementById('quickPoints15').addEventListener('click', () => {
        document.getElementById('modal-points-input').value = 15;
    });
    
    // Close button
    document.getElementById('closePointsModal').addEventListener('click', () => {
        document.getElementById('points-modal').classList.add('hidden');
        currentStudent = null;
    });
}

function showSuccessCelebration(studentName, points) {
    // Remove existing celebration if any
    const existingCelebration = document.getElementById("celebrationOverlay");
    if (existingCelebration) existingCelebration.remove();
    
    const celebration = document.createElement('div');
    celebration.id = 'celebrationOverlay';
    celebration.className = 'fixed inset-0 flex items-center justify-center z-[100] pointer-events-none';
    celebration.innerHTML = `
        <div class="text-center bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 border-4 border-green-500 animate-bounce">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-3xl font-bold text-green-600 mb-2">Success!</h2>
            <p class="text-xl text-gray-700 mb-4">
                <span class="font-bold">${points} points</span> awarded to
            </p>
            <p class="text-2xl font-bold text-blue-600 mb-6">${studentName}</p>
            <div class="flex justify-center space-x-4 text-3xl">
                <span class="animate-pulse">⭐</span>
                <span class="animate-pulse delay-100">🌟</span>
                <span class="animate-pulse delay-200">✨</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(celebration);

    // Add confetti
    createConfetti();
    
    // Remove celebration after 4 seconds
    setTimeout(() => {
        if (document.getElementById('celebrationOverlay')) {
            document.body.removeChild(celebration);
        }
    }, 4000);
}

function createConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'fixed inset-0 pointer-events-none z-[99]';
    confettiContainer.id = 'confettiContainer';
    document.body.appendChild(confettiContainer);

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'absolute w-3 h-3 rounded-sm';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.opacity = '0.8';
        
        confettiContainer.appendChild(confetti);

        const animation = confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 100}px) rotate(${360 * (Math.random() * 2 + 1)}deg)`, opacity: 0 }
        ], {
            duration: Math.random() * 3000 + 2000,
            easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
        });

        animation.onfinish = () => confetti.remove();
    }

    setTimeout(() => {
        if (document.getElementById('confettiContainer')) {
            document.body.removeChild(confettiContainer);
        }
    }, 5000);
}

function setupAcknowledgeButtons() {
    console.log("Setting up acknowledge buttons...");
    
    // Disable buttons for absent students
    const studentCards = document.querySelectorAll(".student-card");
    
    studentCards.forEach(card => {
        const isPresent = card.getAttribute("data-present") === "true";
        const acknowledgeBtn = card.querySelector(".acknowledge-btn");

        if (!isPresent && acknowledgeBtn) {
            acknowledgeBtn.disabled = true;
            acknowledgeBtn.classList.add("bg-gray-300", "text-gray-500", "cursor-not-allowed");
            acknowledgeBtn.classList.remove("bg-green-500", "hover:bg-green-600");
        }
    });

    // Add click event listeners to all acknowledge buttons
    document.querySelectorAll(".acknowledge-btn").forEach(button => {
        // Remove existing listeners to prevent duplicates
        button.removeEventListener("click", handleAcknowledgeClick);
        button.addEventListener("click", handleAcknowledgeClick);
    });
}

function handleAcknowledgeClick(e) {
    console.log("Acknowledge button clicked");
    
    const studentCard = e.target.closest(".student-card");
    if (!studentCard) {
        console.error("No student card found");
        return;
    }
    
    const studentId = studentCard.dataset.studentId;
    const studentName = studentCard.dataset.studentName;
    
    console.log("Student data:", { studentId, studentName });

    if (!studentId || !studentName) {
        console.error("Missing student data");
        if (typeof showToast === "function") {
            showToast("⚠ Unable to identify student. Please refresh the page.", "error");
        }
        return;
    }

    // Set the current student
    currentStudent = { studentId, studentName };
    console.log("Current student set to:", currentStudent);

    // Get modal elements
    const pointsModal = document.getElementById("points-modal");
    const pointsModalStudentName = document.getElementById("modal-student-name");
    const pointsInputField = document.getElementById("modal-points-input");

    if (pointsModal && pointsModalStudentName && pointsInputField) {
        pointsModalStudentName.textContent = `Award Points to ${studentName}`;
        pointsInputField.value = "5"; // Default value
        pointsModal.classList.remove("hidden");
        pointsInputField.focus();
        pointsInputField.select();
        console.log("Points modal opened");
    } else {
        console.error("Points modal elements not found");
        if (typeof showToast === "function") {
            showToast("⚠ Points system not loaded properly. Please refresh.", "error");
        }
    }
}

function setupStudentAnalyticsModal() {
    const modal = document.getElementById('studentModal');
    const closeBtn = document.getElementById('closeModal');

    if (!modal || !closeBtn) return;

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const fallback = modal.querySelector('.modal-student-initials');
        if (fallback) fallback.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            const fallback = modal.querySelector('.modal-student-initials');
            if (fallback) fallback.remove();
        }
    });
}

function initViewButtons() {
    console.log("Initializing view buttons...");
    
    document.querySelectorAll('.view-btn').forEach((btn) => {
        if (btn.dataset.listenerAdded === "true") return;
        btn.dataset.listenerAdded = "true";

        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.student-card');
            if (!card) return;

            console.log("🎯 View button clicked!");
            console.log("🔍 RAW DATA ATTRIBUTES:");
            console.log("  data-subject_scores:", card.dataset.subject_scores);
            console.log("  data-raw_subject_scores:", card.dataset.raw_subject_scores);
            console.log("  data-subject_totals:", card.dataset.subject_totals);
            console.log("  data-subject_counts:", card.dataset.subject_counts);
            
            // Try to parse
            try {
                const parsed_subject_scores = JSON.parse(card.dataset.subject_scores || '{}');
                const parsed_raw = JSON.parse(card.dataset.raw_subject_scores || '{}');
                const parsed_totals = JSON.parse(card.dataset.subject_totals || '{}');
                const parsed_counts = JSON.parse(card.dataset.subject_counts || '{}');
                
                console.log("✅ PARSED DATA:");
                console.log("  subject_scores:", parsed_subject_scores);
                console.log("  raw_subject_scores:", parsed_raw);
                console.log("  subject_totals:", parsed_totals);
                console.log("  subject_counts:", parsed_counts);
            } catch (err) {
                console.error("❌ JSON PARSE ERROR:", err);
            }

            console.log("Card data:", {
                name: card.dataset.name,
                student_id: card.dataset.studentId,  // Fixed: use camelCase for data-student-id
                grade: card.dataset.grade,
                section: card.dataset.section,
                image: card.dataset.image,
                attendance: card.dataset.attendance,
                subject_scores: card.dataset.subject_scores,
                raw_subject_scores: card.dataset.raw_subject_scores,
                subject_totals: card.dataset.subject_totals,
                subject_counts: card.dataset.subject_counts
            });

            const modal = document.getElementById('studentModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }

            // Set student basic info in modal header
            const studentName = card.dataset.name || card.querySelector('h4')?.textContent || 'Unknown Student';
            const studentId = card.dataset.studentId || 'N/A';  // Fixed: use camelCase
            const grade = card.dataset.grade || 'N/A';
            const section = card.dataset.section || 'N/A';
            const imageUrl = card.dataset.image || '';

            console.log("📝 Setting modal data:", { studentName, studentId, grade, section, imageUrl });

            // Update modal header information
            const modalStudentName = document.querySelector('.modal-student-name');
            const modalStudentClass = document.querySelector('.modal-student-class');
            const modalStudentId = document.getElementById('modalStudentId');
            const modalStudentPhoto = document.querySelector('.modal-student-photo');

            console.log("🎨 Modal elements found:", {
                modalStudentName: !!modalStudentName,
                modalStudentClass: !!modalStudentClass,
                modalStudentId: !!modalStudentId,
                modalStudentPhoto: !!modalStudentPhoto
            });

            if (modalStudentName) {
                modalStudentName.textContent = studentName;
                console.log("✅ Set student name:", studentName);
            }
            if (modalStudentClass) {
                modalStudentClass.textContent = `Grade ${grade} - Section ${section}`;
                console.log("✅ Set class:", `Grade ${grade} - Section ${section}`);
            }
            if (modalStudentId) {
                modalStudentId.textContent = studentId;
                console.log("✅ Set student ID:", studentId);
            }
            
            if (modalStudentPhoto) {
                if (imageUrl && imageUrl.trim() !== '') {
                    modalStudentPhoto.src = imageUrl;
                    modalStudentPhoto.alt = `${studentName} Photo`;
                    modalStudentPhoto.classList.remove('hidden');
                    modalStudentPhoto.onerror = function() {
                        // If image fails to load, hide it
                        this.classList.add('hidden');
                        console.log("⚠️ Image failed to load:", imageUrl);
                    };
                    console.log("✅ Set photo URL:", imageUrl);
                } else {
                    // Hide photo if no URL available
                    modalStudentPhoto.classList.add('hidden');
                    console.log("ℹ️ No photo URL available");
                }
            }

            // Set student info in modal
            if (document.getElementById("modalAttendanceRate")) {
                document.getElementById("modalAttendanceRate").textContent = `${card.dataset.attendance || 0}%`;
                document.getElementById("modalPresentCount").textContent = card.dataset.present_count || 0;
                document.getElementById("modalLateCount").textContent = card.dataset.late_count || 0;
                document.getElementById("modalAbsentCount").textContent = card.dataset.absent_count || 0;
            }

            // Declare subjectScores outside the try block so it's available in the entire function scope
            let subjectScores = {};
            
            // Handle subject scores
            try {
                subjectScores = JSON.parse(card.dataset.subject_scores || '{}');
                const rawScores = JSON.parse(card.dataset.raw_subject_scores || '{}');
                const subjectTotals = JSON.parse(card.dataset.subject_totals || '{}');
                const subjectCounts = JSON.parse(card.dataset.subject_counts || '{}');
                
                const scoresContainer = document.getElementById('modalSubjectScores');
                const chartCanvas = document.getElementById('modalPerformanceChart');

                if (scoresContainer) {
                    scoresContainer.innerHTML = `
                        <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-purple-500">grade</span>
                            Subject Scores Breakdown
                        </h3>
                    `;

                    if (Object.keys(subjectScores).length === 0) {
                        scoresContainer.innerHTML += `<p class="text-gray-500 text-sm">No subject data available.</p>`;
                        if (window.performanceChart) window.performanceChart.destroy();
                        return;
                    }

                    Object.entries(subjectScores).forEach(([subject, weightedScore]) => {
                        const rawAvg = rawScores[subject] || 0;
                        const total = subjectTotals[subject] || 0;
                        const count = subjectCounts[subject] || 0;
                        
                        const barColor =
                            weightedScore >= 85 ? 'bg-green-500' :
                            weightedScore >= 75 ? 'bg-blue-500' :
                            weightedScore >= 60 ? 'bg-yellow-500' :
                            'bg-red-500';

                        scoresContainer.innerHTML += `
                            <div class="mb-4 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="font-semibold text-gray-800">${subject}</span>
                                    <span class="text-sm text-gray-500">${count} score${count !== 1 ? 's' : ''}</span>
                                </div>
                                
                                <!-- Score Breakdown -->
                                <div class="space-y-1 mb-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">📊 Total Sum:</span>
                                        <span class="font-bold text-blue-600">${total} pts</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">📈 Raw Average:</span>
                                        <span class="font-semibold text-indigo-600">${rawAvg}%</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">⚖️ Weighted Score:</span>
                                        <span class="font-semibold text-purple-600">${weightedScore}%</span>
                                    </div>
                                </div>
                                
                                <!-- Progress Bar -->
                                <div class="w-full bg-gray-200 rounded-full h-2.5">
                                    <div class="${barColor} h-2.5 rounded-full transition-all duration-300" style="width: ${weightedScore}%;"></div>
                                </div>
                            </div>
                        `;
                    });
                }

                if (chartCanvas) {
                    const subjects = Object.keys(subjectScores);
                    const scores = Object.values(subjectScores);

                    if (window.performanceChart) window.performanceChart.destroy();

                    window.performanceChart = new Chart(chartCanvas, {
                        type: 'radar',
                        data: {
                            labels: subjects,
                            datasets: [{
                                label: 'Subject Performance',
                                data: scores,
                                fill: true,
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderColor: 'rgba(59, 130, 246, 0.3)',
                                borderWidth: 2,
                                pointBackgroundColor: subjects.map((_, i) => 
                                    ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][i % 6]
                                ),
                                pointBorderColor: '#fff',
                                pointHoverBackgroundColor: '#fff',
                                pointHoverBorderColor: '#3b82f6',
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: { padding: 20 },
                            scales: {
                                r: {
                                    min: 0,
                                    max: 100,
                                    ticks: { stepSize: 20, color: '#4B5563', backdropColor: 'transparent' },
                                    grid: { color: 'rgba(156,163,175,0.3)', circular: true },
                                    pointLabels: { color: '#1F2937', font: { size: 12, weight: '500' } },
                                    startAngle: -0.5 * Math.PI,
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(17,24,39,0.9)',
                                    titleColor: '#F9FAFB',
                                    bodyColor: '#E5E7EB',
                                    borderColor: 'rgba(59,130,246,0.6)',
                                    borderWidth: 1,
                                    cornerRadius: 6,
                                    callbacks: {
                                        label: (context) => `${context.label}: ${context.formattedValue}%`
                                    }
                                }
                            },
                            animation: { duration: 1000, easing: 'easeOutQuart' }
                        }
                    });
                }
            } catch (error) {
                console.error("Error parsing subject scores:", error);
                // Initialize as empty object if parsing fails
                subjectScores = {};
            }

            // AI Insight - Now subjectScores is available here
            const aiInsightBox = document.getElementById('modalAIInsight');
            if (aiInsightBox) {
                aiInsightBox.innerHTML = `<p class="text-gray-500 italic">✨ Generating AI feedback...</p>`;

                const payload = {
                    name: card.dataset.name || "Student",
                    attendance: parseFloat(card.dataset.attendance || 0),
                    subjects: subjectScores
                };

                fetch("/generate_student_insight", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(data => {
                    const formattedInsight = data.insight
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-600 block mt-3 mb-1">$1</strong>')
                        .replace(/\n\d+\./g, '<br><br><strong class="text-indigo-600 font-semibold">$&</strong>')
                        .replace(/\n-/g, '<br>•')
                        .replace(/\n\n/g, '<br>')
                        .replace(/\n/g, '<br>');

                    aiInsightBox.innerHTML = `
                        <div class="bg-white/70 p-5 rounded-xl border border-gray-200 shadow-inner">
                            <div class="flex items-center gap-2 mb-3">
                                <span class="material-symbols-outlined text-indigo-500">insights</span>
                                <h3 class="font-semibold text-base text-gray-800">AI Performance Summary</h3>
                            </div>
                            <div class="text-gray-800 text-sm leading-relaxed">${formattedInsight}</div>
                        </div>
                    `;
                })
                .catch(err => {
                    console.error("AI Insight Error:", err);
                    aiInsightBox.innerHTML = `<p class="text-red-500">⚠ Unable to generate insight right now.</p>`;
                });
            }

            // ---------------------------
            // Setup Send Email Button Handler
            // ---------------------------
            const sendEmailBtn = document.getElementById('sendEmailBtn');
            if (sendEmailBtn) {
                // Remove existing listener if any
                const newSendBtn = sendEmailBtn.cloneNode(true);
                sendEmailBtn.parentNode.replaceChild(newSendBtn, sendEmailBtn);
                
                newSendBtn.addEventListener('click', async () => {
                    const studentIdElement = document.getElementById('modalStudentId');
                    const studentNameElement = document.querySelector('.modal-student-name');
                    
                    if (!studentIdElement) {
                        showEmailStatus('error', 'Error', 'Student information not found');
                        return;
                    }
                    
                    const studentId = studentIdElement.textContent.replace('#', '').trim();
                    const studentName = studentNameElement ? studentNameElement.textContent.trim() : 'Student';
                    
                    // Hide any previous status
                    const emailStatusBanner = document.getElementById('emailStatusBanner');
                    if (emailStatusBanner) emailStatusBanner.classList.add('hidden');
                    
                    // Show loading state
                    const originalText = newSendBtn.innerHTML;
                    newSendBtn.disabled = true;
                    newSendBtn.innerHTML = `
                        <span class="material-symbols-outlined text-xl animate-spin">sync</span>
                        <span>Sending...</span>
                    `;
                    
                    try {
                        const response = await fetch('/send-student-report', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ student_id: studentId })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            // Show success message
                            newSendBtn.innerHTML = `
                                <span class="material-symbols-outlined text-xl">check_circle</span>
                                <span>Sent!</span>
                            `;
                            newSendBtn.classList.remove('bg-white', 'text-blue-600', 'hover:bg-blue-50');
                            newSendBtn.classList.add('bg-green-500', 'text-white');
                            
                            // Show success banner
                            showEmailStatus('success', 'Email Sent Successfully!', data.message || `Performance report sent to ${studentName}`);
                            
                            // Reset button after 4 seconds
                            setTimeout(() => {
                                newSendBtn.innerHTML = originalText;
                                newSendBtn.classList.remove('bg-green-500', 'text-white');
                                newSendBtn.classList.add('bg-white', 'text-blue-600', 'hover:bg-blue-50');
                                newSendBtn.disabled = false;
                            }, 4000);
                            
                            // Show toast notification
                            showToast('✓ Report sent successfully!', 'success');
                        } else {
                            throw new Error(data.message || 'Failed to send email');
                        }
                    } catch (error) {
                        console.error('Error sending email:', error);
                        
                        // Show error state
                        newSendBtn.innerHTML = `
                            <span class="material-symbols-outlined text-xl">error</span>
                            <span>Failed</span>
                        `;
                        newSendBtn.classList.remove('bg-white', 'text-blue-600');
                        newSendBtn.classList.add('bg-red-500', 'text-white');
                        
                        // Show error banner
                        showEmailStatus('error', 'Failed to Send Email', error.message || 'An error occurred while sending the report. Please try again.');
                        
                        // Reset button after 4 seconds
                        setTimeout(() => {
                            newSendBtn.innerHTML = originalText;
                            newSendBtn.classList.remove('bg-red-500', 'text-white');
                            newSendBtn.classList.add('bg-white', 'text-blue-600', 'hover:bg-blue-50');
                            newSendBtn.disabled = false;
                        }, 4000);
                        
                        // Show error toast
                        showToast('✗ ' + (error.message || 'Failed to send email'), 'error');
                    }
                });
            }
        });
    });
}

// Email status banner helper
function showEmailStatus(type, title, message) {
    const banner = document.getElementById('emailStatusBanner');
    const icon = document.getElementById('emailStatusIcon');
    const titleEl = document.getElementById('emailStatusTitle');
    const messageEl = document.getElementById('emailStatusMessage');
    
    if (!banner || !icon || !titleEl || !messageEl) return;
    
    if (type === 'success') {
        banner.className = 'mx-5 mt-5 p-4 rounded-lg border-l-4 border-green-500 bg-green-50 animate-fade-in';
        icon.className = 'material-symbols-outlined text-2xl text-green-600';
        icon.textContent = 'check_circle';
        titleEl.className = 'font-semibold text-sm text-green-800';
        messageEl.className = 'text-xs mt-1 text-green-700';
    } else {
        banner.className = 'mx-5 mt-5 p-4 rounded-lg border-l-4 border-red-500 bg-red-50 animate-fade-in';
        icon.className = 'material-symbols-outlined text-2xl text-red-600';
        icon.textContent = 'error';
        titleEl.className = 'font-semibold text-sm text-red-800';
        messageEl.className = 'text-xs mt-1 text-red-700';
    }
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    banner.classList.remove('hidden');
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        banner.classList.add('hidden');
    }, 8000);
}

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = type === 'success' ? 'check_circle' : 'error';
    
    toast.className = `fixed top-20 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl z-[60] flex items-center gap-3 animate-slide-in`;
    toast.style.minWidth = '300px';
    toast.innerHTML = `
        <span class="material-symbols-outlined text-2xl">${icon}</span>
        <span class="font-medium">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Make functions available globally if needed
window.openPointsModal = function(studentId, studentName) {
    currentStudent = { studentId, studentName };
    
    const pointsModal = document.getElementById("points-modal");
    const pointsModalStudentName = document.getElementById("modal-student-name");
    const pointsInputField = document.getElementById("modal-points-input");

    if (pointsModal && pointsModalStudentName && pointsInputField) {
        pointsModalStudentName.textContent = `Award Points to ${studentName}`;
        pointsInputField.value = "5";
        pointsModal.classList.remove("hidden");
        pointsInputField.focus();
        pointsInputField.select();
    }
};