// attendance.js - Attendance management system with automatic face recognition sync
function initAttendanceSystem() {
    console.log("📝 Initializing attendance system...");
    
    // Initialize basic attendance functions
    initAttendanceStatus();
    attachAttendanceListeners();
    setupAttendanceModal();
    
    // Apply status badge styles
    document.querySelectorAll(".status-badge").forEach(badge => {
        const status = badge.dataset.status || "Absent";
        applyStatusBadgeStyle(badge, status);
    });
    
    // Setup face recognition integration
    setupFaceRecognitionAttendanceListener();
    removeSyncButtonIfExists();
    
    // Start auto-sync with a small delay to ensure DOM is ready
    setTimeout(() => {
        console.log('🚀 Starting auto-sync...');
        startAutoSync();
    }, 100);
}

function initAttendanceStatus() {
    document.querySelectorAll(".status-select").forEach((select) => {
        const statusLabel = select.closest(".attendance-row")?.querySelector(".status-label");
        if (statusLabel) {
            statusLabel.textContent = select.value || "Absent";
        }

        select.addEventListener("change", async (e) => {
            if (statusLabel) statusLabel.textContent = e.target.value;

            const selected = document.getElementById("assignedClassSelect")?.value;
            if (selected && typeof loadQuickStats === 'function') {
                const [grade, section, subject] = selected.split("-").map((s) => s.trim());
                await loadQuickStats(grade, section, subject);
            }
        });
    });
}

function attachAttendanceListeners() {
    const updatingAttendance = {}; // prevent double updates

    document.querySelectorAll(".status-select").forEach((selectEl) => {
        selectEl.addEventListener("change", async (e) => {
            let studentId = selectEl.dataset.studentId;
            if (!studentId) {
                const card = selectEl.closest(".student-card");
                studentId = card?.dataset.studentId;
            }
            if (!studentId) {
                console.error("❌ Could not determine student ID for this select element.");
                return;
            }

            const newStatus = selectEl.value;
            const card = selectEl.closest(".student-card");
            const statusBadge = card?.querySelector(".status-badge");
            const oldStatus = statusBadge?.textContent || "Absent";
            const key = `${studentId}-${new Date().toDateString()}`;

            if (updatingAttendance[key]) return; // block double click
            updatingAttendance[key] = true;
            selectEl.disabled = true;

            // Show "Updating..." state
            const colorMap = {
                Present: { badge: "bg-green-100 text-green-700", card: "border-green-300 bg-green-50/40", toast: "success" },
                Late: { badge: "bg-yellow-100 text-yellow-700", card: "border-yellow-300 bg-yellow-50/40", toast: "warning" },
                Excused: { badge: "bg-blue-100 text-blue-700", card: "border-blue-300 bg-blue-50/40", toast: "info" },
                Absent: { badge: "bg-red-100 text-red-700", card: "border-red-300 bg-red-50/40", toast: "error" },
                Updating: { badge: "bg-gray-100 text-gray-600", card: "border-gray-300 bg-gray-50/40" }
            };

            if (statusBadge) {
                statusBadge.textContent = "Updating...";
                statusBadge.className = `status-badge text-xs font-medium px-2 py-1 rounded-full ${colorMap.Updating.badge}`;
            }
            if (card) {
                card.className = card.className.replace(/border-\w+-\d+|bg-\w+-\d+\/\d+/g, "").trim() + ` ${colorMap.Updating.card}`;
            }

            try {
                const response = await fetch("/update_attendance", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_id: studentId, status: newStatus }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    const updatedStatus = result.status || newStatus;

                    // Update badge text & color
                    if (statusBadge) {
                        statusBadge.textContent = updatedStatus;
                        statusBadge.className = `status-badge text-xs font-medium px-2 py-1 rounded-full ${colorMap[updatedStatus].badge}`;
                    }

                    // Update card border/background
                    if (card) {
                        card.className = card.className.replace(/border-\w+-\d+|bg-\w+-\d+\/\d+/g, "").trim() + ` ${colorMap[updatedStatus].card}`;
                    }

                    // Show toast if function exists
                    if (typeof showToast === "function") {
                        showToast(`${result.name || "Student"} marked as ${updatedStatus}`, colorMap[updatedStatus].toast);
                    }

                    // Update modal counts if modal is open
                    if (typeof updateAttendanceCounts === "function") {
                        updateAttendanceCounts();
                    }

                } else {
                    console.error("⚠️ Error:", result.message || "Unknown error");
                    if (typeof showToast === "function") {
                        showToast(`Error: ${result.message || "Could not update attendance"}`, "error");
                    }
                    if (statusBadge) statusBadge.textContent = oldStatus;
                }
            } catch (err) {
                console.error("❌ Request failed", err);
                if (typeof showToast === "function") showToast("Network error, please try again.", "error");
                if (statusBadge) statusBadge.textContent = oldStatus;
            } finally {
                selectEl.disabled = false;
                setTimeout(() => { updatingAttendance[key] = false; }, 500);
            }
        });
    });
}

// Update modal summary counts
function updateAttendanceCounts() {
    const cards = Array.from(document.querySelectorAll(".student-card"));
    let presentCount = 0, lateCount = 0, excusedCount = 0, absentCount = 0;

    cards.forEach(card => {
        const status = card.querySelector(".status-badge")?.textContent.trim();
        if (!status) return;

        switch(status) {
            case "Present": presentCount++; break;
            case "Late": lateCount++; break;
            case "Excused": excusedCount++; break;
            case "Absent": absentCount++; break;
        }
    });

    document.getElementById("presentCount").textContent = presentCount;
    document.getElementById("lateCount").textContent = lateCount;
    document.getElementById("excusedCount").textContent = excusedCount;
    document.getElementById("absentCount").textContent = absentCount;
    document.getElementById("totalCount").textContent = cards.length;
}

function applyStatusBadgeStyle(badge, status) {
    const badgeColorMap = {
        Present: "bg-green-100 text-green-700",
        Late: "bg-yellow-100 text-yellow-700",
        Excused: "bg-blue-100 text-blue-700",
        Absent: "bg-red-100 text-red-700",
    };

    const rowColorMap = {
        Present: "border-green-300 bg-green-50/40",
        Late: "border-yellow-300 bg-yellow-50/40",
        Excused: "border-blue-300 bg-blue-50/40",
        Absent: "border-red-300 bg-red-50/40",
    };

    badge.className = `status-badge text-xs font-medium px-2 py-1 rounded-full ${badgeColorMap[status] || "bg-gray-100 text-gray-700"}`;
    badge.textContent = status;

    const row = badge.closest(".attendance-row") || badge.closest(".student-card");
    if (row) {
        row.className = row.className.replace(/border-\w+-\d+|bg-\w+-\d+\/\d+/g, "").trim();
        row.className += ` ${rowColorMap[status] || "border-gray-300 bg-gray-50/40"}`;
    }
}

function setupAttendanceModal() {
    const modal = document.getElementById("attendanceModal");
    const openBtn = document.getElementById("openAttendanceModal");
    const closeBtn = document.getElementById("closeAttendanceModal");
    const tableBody = document.getElementById("attendanceModalBody");
    const modalTitle = document.getElementById("attendanceModalTitle");

    if (!modal || !openBtn || !closeBtn || !tableBody) {
        console.warn("⚠️ Attendance modal elements not found.");
        return;
    }

    openBtn.addEventListener("click", () => {
        tableBody.innerHTML = "";

        const classSelect = document.getElementById("assignedClassSelect");
        const selectedOption = classSelect?.value;

        let currentGrade = "";
        let currentSection = "";
        let currentSubject = "";

        if (selectedOption) {
            const parts = selectedOption.split("-").map(part => part.trim());
            if (parts.length >= 3) {
                currentGrade = parts[0];
                currentSection = parts[1];
                currentSubject = parts[2];
            }
        }

        const today = new Date();
        const todayFormatted = today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        });

        if (modalTitle) {
            if (currentSection && currentGrade) {
                modalTitle.textContent = `📋 Attendance List – Grade ${currentGrade} ${currentSection} (${currentSubject || "All Subjects"})`;
            } else {
                modalTitle.textContent = `📋 Attendance List – All Sections`;
            }
        }

        const studentCards = Array.from(document.querySelectorAll(".student-card"));

        const filteredCards = currentGrade && currentSection
            ? studentCards.filter((card) => {
                const cardGrade = card.dataset.grade || "";
                const cardSection = card.dataset.section || "";
                return cardGrade === currentGrade && cardSection === currentSection;
            })
            : studentCards;

        const validStudents = filteredCards.filter((card) => {
            const studentId = card.querySelector("p.text-xs")?.textContent.trim();
            const studentName = card.querySelector("p.font-semibold")?.textContent.trim();
            return studentId && studentId !== "N/A" && studentName && studentName !== "N/A";
        });

        let presentCount = 0;
        let lateCount = 0;
        let excusedCount = 0;
        let absentCount = 0;

        if (validStudents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500 text-sm">
                        ${currentGrade && currentSection 
                            ? `No students found for Grade ${currentGrade} - ${currentSection}` 
                            : 'No valid attendance records found for today.'}
                    </td>
                </tr>`;
        } else {
            let count = 1;

            validStudents.forEach((card) => {
                const name = card.querySelector("p.font-semibold")?.textContent.trim();
                const studentId = card.querySelector("p.text-xs")?.textContent.trim();
                const gradeLevel = card.dataset.grade || "N/A";
                const section = card.dataset.section || "N/A";
                const status = card.querySelector(".status-badge")?.textContent.trim() || "Absent";

                switch(status) {
                    case 'Present': presentCount++; break;
                    case 'Late': lateCount++; break;
                    case 'Excused': excusedCount++; break;
                    case 'Absent': absentCount++; break;
                }

                const row = document.createElement("tr");
                row.className = "hover:bg-gray-50 transition-colors duration-150";
                row.innerHTML = `
                    <td class="px-6 py-4 text-sm font-medium text-gray-900 text-center">${count}</td>
                    <td class="px-6 py-4 text-sm font-mono text-gray-700">${studentId}</td>
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${name}</td>
                    <td class="px-6 py-4 text-sm text-gray-600 text-center">${gradeLevel}</td>
                    <td class="px-6 py-4 text-sm text-gray-600 text-center">${section}</td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            status === 'Present' ? 'bg-green-100 text-green-800 border border-green-200' :
                            status === 'Late' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                            status === 'Excused' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-red-100 text-red-800 border border-red-200'
                        }">
                            ${status}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">${today.toLocaleDateString()}</td>
                `;
                tableBody.appendChild(row);
                count++;
            });

            const summaryRow = document.createElement("tr");
            summaryRow.className = "bg-gray-50 border-t-2 border-gray-300";
            summaryRow.innerHTML = `
                <td class="px-6 py-4 text-sm font-semibold text-gray-900 text-center">Total</td>
                <td class="px-6 py-4 text-sm font-semibold text-gray-700" colspan="6">
                    ${validStudents.length} student${validStudents.length !== 1 ? 's' : ''} • ${todayFormatted}
                </td>
            `;
            tableBody.appendChild(summaryRow);
        }

        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('lateCount').textContent = lateCount;
        document.getElementById('excusedCount').textContent = excusedCount;
        document.getElementById('absentCount').textContent = absentCount;
        document.getElementById('totalCount').textContent = validStudents.length;

        modal.classList.remove("hidden");
    });

    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    });
}

// ===================================================================
// FACE RECOGNITION ATTENDANCE INTEGRATION - AUTO SYNC
// ===================================================================

// Function to update attendance UI when face recognition marks someone
function updateAttendanceUIFromFaceRecognition(studentId, studentName, section) {
    console.log(`🔄 Syncing attendance UI for ${studentName} (${studentId})`);
    
    // Find the student card by ID
    const allCards = document.querySelectorAll('.student-card');
    let targetCard = null;
    
    allCards.forEach(card => {
        const cardStudentId = card.querySelector('p.text-xs')?.textContent.trim();
        const cardName = card.querySelector('p.font-semibold')?.textContent.trim();
        const cardSection = card.dataset.section;
        
        // Match by student ID
        if (cardStudentId === studentId) {
            targetCard = card;
            return;
        }
        
        // Fallback: Match by name and section
        if (!targetCard && cardName === studentName && cardSection === section) {
            targetCard = card;
        }
    });
    
    if (!targetCard) {
        console.log(`❌ Could not find card for ${studentName} (${studentId})`);
        return false;
    }
    
    // Find the status badge and select dropdown
    const statusBadge = targetCard.querySelector('.status-badge');
    const statusSelect = targetCard.querySelector('.status-select');
    
    if (!statusBadge || !statusSelect) {
        console.log(`❌ Could not find status elements for ${studentName}`);
        return false;
    }
    
    // Only update if not already marked as Present/Late/Excused
    const currentStatus = statusBadge.textContent.trim();
    if (['Present', 'Late', 'Excused'].includes(currentStatus)) {
        console.log(`ℹ️ ${studentName} already marked as ${currentStatus}, skipping update`);
        return false;
    }
    
    // Update to "Present" status
    const newStatus = 'Present';
    
    // Update the select dropdown
    statusSelect.value = newStatus;
    
    // Update the badge using existing function
    applyStatusBadgeStyle(statusBadge, newStatus);
    
    // Also update the status label if it exists
    const statusLabel = targetCard.querySelector('.status-label');
    if (statusLabel) {
        statusLabel.textContent = newStatus;
    }
    
    // Update the modal counts if modal is open
    if (typeof updateAttendanceCounts === 'function') {
        updateAttendanceCounts();
    }
    
    console.log(`✅ Updated UI: ${studentName} marked as ${newStatus}`);
    return true;
}

// Function to check if attendance was already marked for a student today
function isAttendanceMarkedToday(studentId) {
    const allCards = document.querySelectorAll('.student-card');
    
    for (const card of allCards) {
        const cardStudentId = card.querySelector('p.text-xs')?.textContent.trim();
        if (cardStudentId === studentId) {
            const statusBadge = card.querySelector('.status-badge');
            const currentStatus = statusBadge?.textContent.trim();
            
            // Return true if already marked as Present, Late, or Excused
            return ['Present', 'Late', 'Excused'].includes(currentStatus);
        }
    }
    
    return false;
}

// Function to get current class info from the UI
function getCurrentClassInfo() {
    const classSelect = document.getElementById('assignedClassSelect');
    if (!classSelect || !classSelect.value) return null;
    
    const [grade, section, subject] = classSelect.value.split('-').map(s => s.trim());
    return { grade, section, subject };
}

// Function to listen for face recognition attendance events
function setupFaceRecognitionAttendanceListener() {
    // Listen for custom events from face recognition system
    document.addEventListener('faceRecognitionAttendance', function(event) {
        const { studentId, studentName, section } = event.detail;
        
        // Update UI immediately when face recognition detects someone
        const updated = updateAttendanceUIFromFaceRecognition(studentId, studentName, section);
        
        // Show a toast notification if update was successful
        if (updated && typeof showToast === 'function') {
            showToast(`🎥 Face recognition: ${studentName} marked present`, 'success');
        }
    });
    
    console.log('👂 Listening for face recognition attendance events');
}

// Function to automatically sync face recognition attendance
async function syncFaceRecognitionAttendance() {
    console.log('🔄 Syncing face recognition attendance...');
    
    try {
        const classInfo = getCurrentClassInfo();
        
        if (!classInfo) {
            console.log('ℹ️ No class selected yet for auto-sync');
            return;
        }
        
        console.log(`📚 Fetching attendance for Grade ${classInfo.grade}, Section ${classInfo.section}`);
        
        // Fetch attendance from face recognition system
        const response = await fetch('/api/today_attendance', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            console.error(`❌ API returned error status: ${response.status}`);
            return;
        }

        const data = await response.json();
        
        if (data.success) {
            let updatedCount = 0;
            
            // Update each student
            if (data.attendance_list && Array.isArray(data.attendance_list)) {
                console.log(`📊 Found ${data.attendance_list.length} attendance records`);
                
                data.attendance_list.forEach(record => {
                    // Check if this student is in the current class
                    if (record.section === classInfo.section) {
                        const updated = updateAttendanceUIFromFaceRecognition(
                            record.student_id,
                            record.name,
                            record.section
                        );
                        if (updated) updatedCount++;
                    }
                });
            }
            
            // Log result
            if (updatedCount > 0) {
                console.log(`✅ Auto-synced ${updatedCount} students from face recognition`);
                
                // Show brief notification
                if (typeof showToast === 'function') {
                    showToast(`Face recognition: ${updatedCount} students marked present`, 'success', 3000);
                }
            } else {
                console.log('ℹ️ No new face recognition attendance to sync');
            }
            
            // Refresh counts
            if (typeof updateAttendanceCounts === 'function') {
                updateAttendanceCounts();
            }
        } else {
            console.error('Auto-sync error:', data.message);
        }
    } catch (error) {
        console.error('❌ Auto-sync failed:', error);
    }
}

// Function to remove the sync button if it exists
function removeSyncButtonIfExists() {
    const syncButton = document.getElementById('syncAttendanceBtn');
    if (syncButton) {
        syncButton.remove();
        console.log('🗑️ Removed sync button (auto-sync enabled)');
    }
}

// Function to check if student cards are loaded
function areStudentCardsLoaded() {
    const cards = document.querySelectorAll('.student-card');
    const cardsLoaded = cards.length > 0;
    console.log(`📋 Student cards loaded: ${cardsLoaded} (${cards.length} cards)`);
    return cardsLoaded;
}

// Function to set up automatic periodic syncing
function startAutoSync() {
    console.log('🔄 Starting face recognition auto-sync system...');
    
    // Check if student cards are loaded first
    if (!areStudentCardsLoaded()) {
        console.log('⏳ Waiting for student cards to load...');
        // Retry after 500ms
        setTimeout(startAutoSync, 500);
        return;
    }
    
    // Sync immediately
    console.log('🚀 Performing initial sync...');
    syncFaceRecognitionAttendance();
    
    // Also listen for class selection changes to auto-sync
    const classSelect = document.getElementById('assignedClassSelect');
    if (classSelect) {
        classSelect.addEventListener('change', () => {
            console.log('📚 Class selection changed, auto-syncing...');
            setTimeout(() => syncFaceRecognitionAttendance(), 300);
        });
    }
    
    // Set up periodic syncing every 30 seconds
    const syncInterval = setInterval(() => {
        console.log('⏰ Periodic auto-sync check...');
        syncFaceRecognitionAttendance();
    }, 30000); // 30 seconds
    
    // Store interval ID for cleanup if needed
    window.faceRecognitionSyncInterval = syncInterval;
    
    console.log('✅ Auto-sync system enabled');
    console.log('   • Initial sync completed');
    console.log('   • Listening for class changes');
    console.log('   • Periodic sync every 30 seconds');
}

// ===================================================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ===================================================================

// Export functions for global access (if other scripts need them)
window.updateAttendanceUIFromFaceRecognition = updateAttendanceUIFromFaceRecognition;
window.isAttendanceMarkedToday = isAttendanceMarkedToday;
window.syncFaceRecognitionAttendance = syncFaceRecognitionAttendance; // Keep for manual trigger if needed