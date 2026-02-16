window.SubjectClass = ""; // Global variable to hold selected subject

document.addEventListener("DOMContentLoaded", () => {
  
  console.log("Dashboard JS loaded ✅");

    fillTeacherAssignedClasses();
    fillCharts();
    setupAttendanceModal();
  populateSectionDropdown();
  displayGradeAndSection();
  setupStudentFilter();

   initTeacherProfiles();
  initAttendanceStatus();
  
  attachAttendanceListeners();
 

  document.querySelectorAll(".status-badge").forEach(badge => {
    const status = badge.dataset.status || "Absent";
    applyStatusBadgeStyle(badge, status);
  });
// 🔴 Logout Button Listener
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    showLogoutModal();
  });
}

function showLogoutModal() {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    opacity: 0;
    animation: fadeIn 0.3s ease forwards;
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
    text-align: center;
    transform: scale(0.9);
    animation: scaleIn 0.3s ease forwards;
  `;

  // Modal HTML
  modalContent.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="color: #ef4444;">
        <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
      </svg>
    </div>
    <h3 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">Confirm Logout</h3>
    <p style="margin: 0 0 1.5rem 0; color: #6b7280; line-height: 1.5;">
      Are you sure you want to log out?
    </p>
    <div style="display: flex; gap: 0.75rem; justify-content: center;">
      <button id="cancelLogout" style="
        padding: 0.75rem 1.5rem;
        border: 1px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        flex: 1;
      ">Cancel</button>

      <button id="confirmLogout" style="
        padding: 0.75rem 1.5rem;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        flex: 1;
      ">Log Out</button>
    </div>
  `;

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      to { opacity: 1; }
    }
    @keyframes scaleIn {
      to { transform: scale(1); }
    }
    #cancelLogout:hover {
      background: #f9fafb !important;
      border-color: #9ca3af !important;
    }
    #confirmLogout:hover {
      background: #dc2626 !important;
      transform: translateY(-1px);
    }
    #confirmLogout:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Event listeners
  const cancelBtn = document.getElementById('cancelLogout');
  const confirmBtn = document.getElementById('confirmLogout');

  function closeModal() {
    modalOverlay.style.animation = 'fadeIn 0.3s ease reverse forwards';
    modalContent.style.animation = 'scaleIn 0.3s ease reverse forwards';
    setTimeout(() => {
      document.body.removeChild(modalOverlay);
      document.head.removeChild(style);
    }, 300);
  }

  cancelBtn.addEventListener('click', closeModal);

  // 🟢 LOGOUT LOGIC — POST to /logout
  confirmBtn.addEventListener('click', () => {
    closeModal();

    fetch("/logout", {
      method: "POST"
    }).then(() => {
      window.location.href = "/"; // Redirect after session cleared
    });
  });

  // Close if clicked outside modal
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Close with ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

  // ✅ Fullscreen toggle function
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen(); // Enter fullscreen
        fullscreenBtn.textContent = "⏹ Exit Full Screen";
      } else {
        document.exitFullscreen(); // Exit fullscreen
        fullscreenBtn.textContent = "⛶ Full Screen";
      }
    });

    // Optional: Listen for changes (for users who press Esc)
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        fullscreenBtn.textContent = "⛶ Full Screen";
      }
    });
 //////////////////////////Dashboard/////////////////////////////////////////
// Teacher Panel JS
  // Populate dropdown with assigned classes from data attribute
// Function to show teacher details modal
// Function to attach click events to all teacher cards
function initTeacherProfiles() {
  document.querySelectorAll(".teacher-profile").forEach(profile => {
    profile.addEventListener("click", () => {
      try {
        const card = profile.closest(".teacher-card");
        const teacherData = JSON.parse(card.dataset.teacher);
        showTeacherModal(teacherData);
      } catch (err) {
        console.error("Failed to parse teacher data:", err);
      }
    });
  });
}




// ==============================
// Show Teacher Modal
// ==============================
function showTeacherModal(teacher) {
  // Create modal if it doesn't exist
  if (!document.getElementById("teacherModal")) {
    const modalHTML = `
      <div id="teacherModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95 opacity-0">
          <div class="p-6">

            <!-- Header -->
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-bold text-gray-900">Teacher Details</h3>
              <button id="closeTeacherModalBtn" class="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="space-y-4">
              <div class="flex items-center gap-4">
                <div id="modalTeacherAvatar" class="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl"></div>
                <div>
                  <h4 id="modalTeacherName" class="text-lg font-semibold text-gray-900"></h4>
                  <p id="modalTeacherEmail" class="text-sm text-gray-600"></p>
                  <p id="modalTeacherAge" class="text-sm text-gray-500 mt-1"></p>
                </div>
              </div>

              <div class="border-t pt-4 space-y-3">
                <div class="flex justify-between"><span class="text-gray-600">Gender:</span> <span id="modalTeacherGender" class="font-medium text-gray-900"></span></div>
                <div class="flex justify-between"><span class="text-gray-600">Phone:</span> <span id="modalTeacherPhone" class="font-medium text-gray-900"></span></div>
                <div class="flex justify-between"><span class="text-gray-600">Status:</span> <span id="modalTeacherStatus" class="font-medium text-green-600"></span></div>
              </div>

              <div id="modalClassesList" class="border-t pt-4 hidden">
                <h5 class="font-semibold text-gray-900 mb-2">Class Details:</h5>
                <div id="classesList" class="space-y-2"></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  const modal = document.getElementById("teacherModal");
  const modalContent = modal.querySelector(".bg-white");

  // -----------------------------
  // Populate Data
  // -----------------------------
  document.getElementById("modalTeacherName").textContent = teacher.name || "N/A";
  document.getElementById("modalTeacherEmail").textContent = teacher.email || "N/A";
  document.getElementById("modalTeacherGender").textContent = teacher.gender || "Not specified";
  document.getElementById("modalTeacherPhone").textContent = teacher.contact_info || teacher.phone || "Not provided";
  document.getElementById("modalTeacherStatus").textContent = teacher.status || "Active";
  document.getElementById("modalTeacherAge").textContent = teacher.age ? `Age: ${teacher.age}` : "";

  // Avatar
  const avatarEl = document.getElementById("modalTeacherAvatar");
  if (teacher.photo) {
    avatarEl.innerHTML = `<img src="${teacher.photo}" alt="${teacher.name}" class="w-20 h-20 rounded-full object-cover">`;
  } else {
    avatarEl.textContent = teacher.name ? teacher.name[0].toUpperCase() : "?";
  }

  // Classes
  const classesContainer = document.getElementById("modalClassesList");
  const classesListEl = document.getElementById("classesList");
  if (teacher.classes && teacher.classes.length > 0) {
    classesListEl.innerHTML = teacher.classes.map(cls => {
      if (cls.grade && cls.section && cls.subject) {
        return `<div class="p-2 bg-gray-50 rounded-lg text-sm font-medium">Grade ${cls.grade} - ${cls.section} | ${cls.subject}</div>`;
      } else if (cls.name) {
        return `<div class="p-2 bg-gray-50 rounded-lg text-sm font-medium">${cls.name}</div>`;
      } else {
        return `<div class="p-2 bg-gray-50 rounded-lg text-sm font-medium">N/A</div>`;
      }
    }).join("");
    classesContainer.classList.remove("hidden");
  } else {
    classesContainer.classList.add("hidden");
  }

  // -----------------------------
  // Show Modal
  // -----------------------------
  modal.classList.remove("hidden");
  setTimeout(() => {
    modalContent.classList.remove("scale-95", "opacity-0");
    modalContent.classList.add("scale-100", "opacity-100");
  }, 50);

  // Attach close event (so you don't rely on inline onclick)
  const closeBtn = document.getElementById("closeTeacherModalBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeTeacherModal);
  }
}

// ==============================
// Close Modal (single definition)
// ==============================
function closeTeacherModal() {
  const modal = document.getElementById("teacherModal");
  if (!modal) return;

  const modalContent = modal.querySelector(".bg-white");
  if (modalContent) {
    modalContent.classList.remove("scale-100", "opacity-100");
    modalContent.classList.add("scale-95", "opacity-0");
  }

  setTimeout(() => modal.classList.add("hidden"), 300);
}

// Make globally accessible (for inline onclick safety)
window.closeTeacherModal = closeTeacherModal;

// ==============================
// Global Event Listeners
// ==============================
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeTeacherModal();
});

document.addEventListener("click", (e) => {
  const modal = document.getElementById("teacherModal");
  if (!modal) return;
  if (e.target === modal) closeTeacherModal();
});


// Sidebar navigation: switch panels
const navButtons = document.querySelectorAll("nav button[data-panel]");
const panels = document.querySelectorAll(".panel");

function showPanel(panelId, clickedBtn) {
  // Hide all panels
  panels.forEach(panel => panel.classList.add("hidden"));

  // Show the selected panel
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.remove("hidden");

  // Reset all buttons
  navButtons.forEach(btn => btn.classList.remove("bg-blue-100", "text-blue-600"));

  // Highlight the clicked button
  if (clickedBtn) clickedBtn.classList.add("bg-blue-100", "text-blue-600");
}

// Attach click events
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetPanel = btn.getAttribute("data-panel");
    showPanel(targetPanel, btn);
  });
});

// Optional: show first panel by default
if (navButtons.length > 0) {
  const firstPanelId = navButtons[0].getAttribute("data-panel");
  showPanel(firstPanelId, navButtons[0]);
}


  

 // 🎯 Search filter for student cards
const searchInput = document.getElementById("search");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const studentCards = document.querySelectorAll(".student-card");

    studentCards.forEach((card) => {
      const name = card.querySelector("h4")?.textContent.toLowerCase() || "";
      card.classList.toggle("hidden", !name.includes(query));
    });
  });
}

function attachAttendanceListeners() {
  const updatingAttendance = {};

  document.querySelectorAll(".status-select").forEach((selectEl) => {
    selectEl.addEventListener("change", async (e) => {
      let studentId = selectEl.dataset.studentId;

      // 🔹 Fallback: get from parent card if missing
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

      // 🔄 Prevent duplicate updates
      if (updatingAttendance[key]) return;
      updatingAttendance[key] = true;
      selectEl.disabled = true;

      // 🎨 Define color map (badge + card background)
      const colorMap = {
        Present: {
          badge: "bg-green-100 text-green-700",
          card: "border-green-300 bg-green-50/40",
          toast: "success"
        },
        Late: {
          badge: "bg-yellow-100 text-yellow-700",
          card: "border-yellow-300 bg-yellow-50/40",
          toast: "warning"
        },
        Excused: {
          badge: "bg-blue-100 text-blue-700",
          card: "border-blue-300 bg-blue-50/40",
          toast: "info"
        },
        Absent: {
          badge: "bg-red-100 text-red-700",
          card: "border-red-300 bg-red-50/40",
          toast: "error"
        },
        Updating: {
          badge: "bg-gray-100 text-gray-600",
          card: "border-gray-300 bg-gray-50/40"
        }
      };

      // 🕓 Show temporary “updating” state
      if (statusBadge) {
        statusBadge.textContent = "Updating...";
        statusBadge.className =
          `status-badge text-xs font-medium px-2 py-1 rounded-full ${colorMap.Updating.badge}`;
      }
      if (card) {
        card.className = card.className
          .replace(/border-\w+-\d+|bg-\w+-\d+\/\d+/g, "")
          .trim() + ` ${colorMap.Updating.card}`;
      }

      try {
        const response = await fetch("/update_attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: studentId,
            status: newStatus
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // ✅ Update badge color and text
          if (statusBadge) {
            statusBadge.textContent = newStatus;
            statusBadge.className = 
              `status-badge text-xs font-medium px-2 py-1 rounded-full ${colorMap[newStatus].badge}`;
          }

          // 🎨 Apply subtle card background color
          if (card) {
            card.className = card.className
              .replace(/border-\w+-\d+|bg-\w+-\d+\/\d+/g, "")
              .trim() + ` ${colorMap[newStatus].card}`;
          }

          // 🍞 Toast notification (color-coded)
          if (typeof showToast === "function") {
            showToast(`${result.name || "Student"} marked as ${newStatus}`, colorMap[newStatus].toast);
          }

          // 🔁 Reload dashboard stats if applicable
          const selected = document.getElementById("assignedClassSelect")?.value;
          if (selected && typeof loadQuickStats === "function") {
            const [grade, section, subject] = selected.split("-").map((s) => s.trim());
            await loadQuickStats(grade, section, subject);
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
        if (typeof showToast === "function") {
          showToast("Network error, please try again.", "error");
        }
        if (statusBadge) statusBadge.textContent = oldStatus;
      } finally {
        selectEl.disabled = false;
        setTimeout(() => {
          updatingAttendance[key] = false;
        }, 1000);
      }
    });
  });
}





// ==============================
// 🔔 COLORED TOAST NOTIFICATIONS
// ==============================
function showToast(message, status = "info") {
  const toast = document.createElement("div");

  // 🎨 Color mapping per status
  const colorMap = {
    Present: "bg-green-600",
    Late: "bg-yellow-500",
    Excused: "bg-blue-600",
    Absent: "bg-red-600",
    error: "bg-red-700",
    info: "bg-gray-700",
  };

  const color = colorMap[status] || colorMap.info;

  toast.className = `
    ${color} text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg
    fixed bottom-5 right-5 z-50 opacity-0 transform translate-y-5 transition-all duration-300
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Slide + fade in
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 50);

  // Slide + fade out
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
// ==============================
// 🎨 Status Badge Styler
// ==============================
function applyStatusBadgeStyle(badge, status) {
  // Badge colors
  const badgeColorMap = {
    Present: "bg-green-100 text-green-700",
    Late: "bg-yellow-100 text-yellow-700",
    Excused: "bg-blue-100 text-blue-700",
    Absent: "bg-red-100 text-red-700",
  };

  // Row/card background colors
  const rowColorMap = {
    Present: "border-green-300 bg-green-50/40",
    Late: "border-yellow-300 bg-yellow-50/40",
    Excused: "border-blue-300 bg-blue-50/40",
    Absent: "border-red-300 bg-red-50/40",
  };

  // Apply badge color & text
  badge.className = `status-badge text-xs font-medium px-2 py-1 rounded-full ${badgeColorMap[status] || "bg-gray-100 text-gray-700"}`;
  badge.textContent = status;

  // Apply row/card background color
  const row = badge.closest(".attendance-row") || badge.closest(".student-card");
  if (row) {
    // Remove previous border/bg color classes
    row.className = row.className.replace(/border-\w+-\d+|bg-\w+-\d+\/\d+/g, "").trim();
    // Add new color
    row.className += ` ${rowColorMap[status] || "border-gray-300 bg-gray-50/40"}`;
  }
}










  ////////////////////////////////////////////////////////////////
//Live monitoring Panel JS
  const videos = document.getElementById("webcam");
  const fullscreenBtns = document.getElementById("fullscreenBtn");

  fullscreenBtns.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      videos.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  });

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

    // ✅ Get the selected class from the dropdown
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

    // 🏷️ Update modal title with selected class info
    if (modalTitle) {
      if (currentSection && currentGrade) {
        modalTitle.textContent = `📋 Attendance List – Grade ${currentGrade} ${currentSection} (${currentSubject || "All Subjects"})`;
      } else {
        modalTitle.textContent = `📋 Attendance List – All Sections`;
      }
    }

    // Get all student cards in the DOM
    const studentCards = Array.from(document.querySelectorAll(".student-card"));

    // ✅ Filter by selected grade and section
    const filteredCards = currentGrade && currentSection
      ? studentCards.filter((card) => {
          const cardGrade = card.dataset.grade || "";
          const cardSection = card.dataset.section || "";
          return cardGrade === currentGrade && cardSection === currentSection;
        })
      : studentCards; // Show all if no class selected

    // Only keep valid ones (with IDs **and names not N/A**)
    const validStudents = filteredCards.filter((card) => {
      const studentId = card.querySelector("p.text-xs")?.textContent.trim();
      const studentName = card.querySelector("p.font-semibold")?.textContent.trim();
      return studentId && studentId !== "N/A" && studentName && studentName !== "N/A";
    });

    // Initialize counters
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

        // Update counters
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

      // Add summary row
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

    // Update footer stats
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('lateCount').textContent = lateCount;
    document.getElementById('excusedCount').textContent = excusedCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('totalCount').textContent = validStudents.length;

    // Show modal
    modal.classList.remove("hidden");
  });

  // Close handlers
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
}



// ===============================
// 🟩 Acknowledge Button Handler (Modal Version with Toast)
// ===============================

// Rename modal elements to avoid conflict
const pointsModal = document.getElementById("points-modal");
const pointsInputField = document.getElementById("modal-points-input");
const pointsModalStudentName = document.getElementById("modal-student-name");
const pointsCancelBtn = document.getElementById("modal-cancel-btn");
const pointsSubmitBtn = document.getElementById("modal-submit-btn");

// Track current student
let currentStudent = null;

// 🍞 Toast Notification System
function showToast(message, type = "info") {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement("div");
    const toastId = "toast-" + Date.now();
    toast.id = toastId;
    
    // Type-specific styles
    const typeStyles = {
        success: `
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            border-left: 4px solid #22c55e;
        `,
        error: `
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            border-left: 4px solid #ef4444;
        `,
        warning: `
            background: #fffbeb;
            border: 1px solid #fed7aa;
            color: #ea580c;
            border-left: 4px solid #f59e0b;
        `,
        info: `
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1e40af;
            border-left: 4px solid #3b82f6;
        `
    };

    // Base toast styles
    toast.style.cssText = `
        min-width: 300px;
        max-width: 400px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px 16px;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        ${typeStyles[type] || typeStyles.info}
    `;

    // Icons for each type
    const icons = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️"
    };

    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div style="display: flex; align-items: flex-start; flex: 1;">
                <span style="font-size: 16px; margin-right: 12px; line-height: 1.2;">${icons[type] || icons.info}</span>
                <div style="flex: 1;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; line-height: 1.4; word-wrap: break-word;">${message}</p>
                </div>
            </div>
            <button 
                onclick="this.closest('[id^=toast-]').remove()" 
                style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #6b7280;
                    margin-left: 8px;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='rgba(0,0,0,0.1)'"
                onmouseout="this.style.backgroundColor='transparent'"
            >
                ×
            </button>
        </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = "translateX(0)";
        toast.style.opacity = "1";
    }, 10);

    // Auto remove after 5 seconds
    const autoRemove = setTimeout(() => {
        if (document.getElementById(toastId)) {
            toast.style.transform = "translateX(400px)";
            toast.style.opacity = "0";
            setTimeout(() => {
                if (document.getElementById(toastId)) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);

    // Click to dismiss
    toast.addEventListener('click', (e) => {
        if (e.target === toast || e.target.tagName === 'BUTTON') {
            clearTimeout(autoRemove);
            toast.style.transform = "translateX(400px)";
            toast.style.opacity = "0";
            setTimeout(() => {
                if (document.getElementById(toastId)) {
                    toast.remove();
                }
            }, 300);
        }
    });
}
  const studentCards = document.querySelectorAll(".student-card");

  studentCards.forEach(card => {
    const isPresent = card.getAttribute("data-present") === "true";
    const acknowledgeBtn = card.querySelector(".acknowledge-btn");

    if (!isPresent && acknowledgeBtn) {
      acknowledgeBtn.disabled = true; // disable the button
      acknowledgeBtn.classList.add("bg-gray-300", "text-gray-500", "cursor-not-allowed"); // optional styling
      acknowledgeBtn.classList.remove("bg-green-500", "hover:bg-green-600");
    }
  });
// 🟢 Acknowledge button click
document.querySelectorAll(".acknowledge-btn").forEach(button => {
  button.addEventListener("click", (e) => {
    const studentCard = e.target.closest(".student-card");
    const studentId = studentCard.dataset.studentId;
    const studentName = studentCard.dataset.studentName;

    if (!studentId || !studentName) {
      showToast("⚠ Unable to identify student. Please refresh the page.", "error");
      return;
    }

    currentStudent = { studentId, studentName };

    // Show modal
    pointsModalStudentName.textContent = `Award Points to ${studentName}`;
    pointsInputField.value = "";
    pointsModal.classList.remove("hidden");
    pointsInputField.focus();
  });
});

// ❌ Cancel modal
pointsCancelBtn.addEventListener("click", () => {
  pointsModal.classList.add("hidden");
  currentStudent = null;
});

// ✅ Submit modal
pointsSubmitBtn.addEventListener("click", async () => {
  if (!currentStudent) return;

  const points = pointsInputField.value.trim();
  if (points === "" || isNaN(points) || Number(points) <= 0) {
    showToast("⚠ Please enter a valid positive number of points.", "warning");
    pointsInputField.focus();
    return;
  }

  // Show loading state
  const originalText = pointsSubmitBtn.textContent;
  pointsSubmitBtn.textContent = "Awarding...";
  pointsSubmitBtn.disabled = true;

  const subject = typeof SubjectClass !== "undefined" ? SubjectClass : "Unknown Subject";
  const date = new Date().toISOString();
  const { studentId, studentName } = currentStudent;
  const studentInfo = `Name (${studentName}), Student ID (${studentId})`;

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

    if (result.success) {
      showToast(` ${studentName} awarded ${points} points for ${subject}.`, "success");
    } else {
      showToast(" Failed to save points: " + (result.message || "Unknown error."), "error");
    }
  } catch (error) {
    console.error("Error saving points:", error);
    showToast("❌ Something went wrong while saving points.", "error");
  } finally {
    // Reset button state
    pointsSubmitBtn.textContent = originalText;
    pointsSubmitBtn.disabled = false;
  }

  pointsModal.classList.add("hidden");
  currentStudent = null;

  // Refresh UI
  if (typeof fillCharts === "function") fillCharts();
  if (typeof initViewButtons === "function") initViewButtons();
});

// Optional: Close modal with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !pointsModal.classList.contains("hidden")) {
    pointsModal.classList.add("hidden");
    currentStudent = null;
  }
});

// Optional: Press Enter to submit modal
pointsInputField.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    pointsSubmitBtn.click();
  }
});

// Close modal when clicking outside
pointsModal.addEventListener("click", (e) => {
  if (e.target === pointsModal) {
    pointsModal.classList.add("hidden");
    currentStudent = null;
  }
});



// -------------------------
// 1️⃣ Populate Dropdown
// -------------------------
function fillTeacherAssignedClasses() {
  const container = document.querySelector("[data-assigned-classes]");
  const select = document.getElementById("assignedClassSelect");
  if (!container || !select) return;

  const assignedClasses = JSON.parse(container.dataset.assignedClasses || "[]");

  // Reset options
  select.innerHTML = '<option value="">Select a class</option>';

  assignedClasses.forEach(cls => {
    const grade = cls.grade || "?";
    const section = cls.section || "?";
    const subject = cls.subject || "No Subject";

    const option = document.createElement("option");
    option.value = `${grade}-${section}-${subject}`;
    option.dataset.subject = subject;
    option.textContent = `Grade ${grade} - ${section} (${subject})`;
    select.appendChild(option);
  });

  // 🟢 Hide all student cards if no classes available
  if (select.options.length <= 1) {
    hideAllStudentCards();
    return; // Stop further execution
  }

  // 🟢 Attach listener only once
  select.addEventListener("change", async () => {
    const selected = select.value;
    if (!selected) return;

    const [grade, section, subject] = selected.split("-").map(s => s.trim());
    SubjectClass = subject;
    console.log("Selected:", { grade, section, subject });

    // 🔹 Filter student cards
    filterStudentsBySection(grade, section);

    // 🔹 Fetch data for this class
    await Promise.all([
      loadQuickStats(grade, section, subject),
      loadTopStudents(grade, section, subject),
   
    ]);
  });
}

// -------------------------
// 2️⃣ Display Grade & Section Labels
// -------------------------
function displayGradeAndSection() {
  const students = document.querySelectorAll(".student-card");

  students.forEach(student => {
    const grade = student.dataset.grade;
    const section = student.dataset.section;

    if (student.querySelector(".grade-section-label")) return;

    const label = document.createElement("p");
    label.className = "grade-section-label text-sm text-gray-600";
    label.textContent = `Grade ${grade} - ${section}`;

    const nameEl = student.querySelector("p.font-medium");
    if (nameEl) {
      nameEl.insertAdjacentElement("afterend", label);
    } else {
      student.prepend(label);
    }
  });
}

// -------------------------
// 3️⃣ Student Filter Setup
// -------------------------
function setupStudentFilter() {
  const select = document.getElementById("assignedClassSelect");
  if (!select) return;

  // If no classes available, hide all student cards and return
  if (select.options.length <= 1) {
    hideAllStudentCards();
    return;
  }

  // Auto-select the first available class
  if (select.options.length > 1) {
    select.selectedIndex = 1;
    const event = new Event("change");
    select.dispatchEvent(event);
  }
}

function filterStudentsBySection(grade, section) {
  const students = document.querySelectorAll(".student-card");

  students.forEach(student => {
    const studentGrade = student.dataset.grade?.trim();
    const studentSection = student.dataset.section?.trim();
    student.style.display =
      studentGrade === grade && studentSection === section ? "" : "none";
  });
}

// -------------------------
// NEW: Hide All Student Cards Function
// -------------------------
function hideAllStudentCards() {
  const students = document.querySelectorAll(".student-card");
  students.forEach(student => {
    student.style.display = "none";
  });
  console.log("🟡 No assigned classes - all student cards hidden");
}

// ==============================
// 4️⃣ Load Quick Stats (Per Class Section)
// ==============================
async function loadQuickStats(grade = "", section = "", subject = "") {
  if (!grade || !section) {
    console.warn("⚠️ loadQuickStats skipped: grade/section not specified.");
    return;
  }

  try {
    const url = `/quick-stats?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&subject=${encodeURIComponent(subject)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stats = await res.json();

    if (!stats) {
      console.warn("⚠️ No stats data returned for this section.");
      return;
    }

    // 🧮 Helper to safely update text content
    const setText = (id, value, fallback = "—") => {
      const el = document.getElementById(id);
      if (el) el.textContent = value ?? fallback;
    };

    // 🔹 Active Students
    setText("activeStudents", stats.active_students);
    setText("activeStudentsChange", `${stats.active_students_change}%`);
    const activeIcon = document.getElementById("activeStudentsChangeIcon");
    if (activeIcon) {
      const up = stats.active_students_change >= 0;
      activeIcon.textContent = up ? "arrow_upward" : "arrow_downward";
      activeIcon.className = `material-symbols-outlined text-base ${up ? "text-green-500" : "text-red-500"}`;
    }

    // 🔹 Average Engagement
    setText("averageEngagement", stats.average_engagement);
    setText("averageEngagementChange", `${stats.average_engagement_change}%`);
    const engagementIcon = document.getElementById("averageEngagementChangeIcon");
    if (engagementIcon) {
      const up = stats.average_engagement_change >= 0;
      engagementIcon.textContent = up ? "arrow_upward" : "arrow_downward";
      engagementIcon.className = `material-symbols-outlined text-base ${up ? "text-green-500" : "text-red-500"}`;
    }

    // 🔹 Students Needing Assistance
    setText("needsAssistance", stats.needs_assistance);
    setText("needsAssistanceChange", stats.needs_assistance_change);

    // 🔹 Attendance
    updateAttendanceBar(stats.present, stats.total, stats.attendance_percent);

    console.log(`✅ Quick stats updated for Grade ${grade} - ${section} (${subject})`);
  } catch (err) {
    console.error("❌ Error loading quick stats:", err);
  }
      loadTopStudents(grade, section, subject);
}


// ==============================
// 🧍 INIT ATTENDANCE STATUS LABELS
// ==============================
function initAttendanceStatus() {
  document.querySelectorAll(".status-select").forEach((select) => {
    // Initial load
    const statusLabel = select.closest(".attendance-row")?.querySelector(".status-label");
    if (statusLabel) {
      statusLabel.textContent = select.value || "Absent";
    }

    // Live update on change
    select.addEventListener("change", async (e) => {
      if (statusLabel) statusLabel.textContent = e.target.value;

      // ✅ Refresh Quick Stats dynamically (like loadQuickStats)
      const selected = document.getElementById("assignedClassSelect")?.value;
      if (selected && typeof loadQuickStats === "function") {
        const [grade, section, subject] = selected.split("-").map((s) => s.trim());
        await loadQuickStats(grade, section, subject);
        
      }
      
    });
  });
}


// ==============================
// 🎨 Reusable Function: Update Attendance Bar
// ==============================
function updateAttendanceBar(present, total, percent) {
  const countEl = document.getElementById("attendanceCount");
  const percentEl = document.getElementById("attendancePercent");
  const barEl = document.getElementById("attendanceBar");

  if (countEl) countEl.textContent = `${present ?? 0} / ${total ?? 0}`;
  if (percentEl) percentEl.textContent = `${percent ?? 0}%`;

  if (barEl) {
    // Smooth transition
    barEl.style.transition = "width 0.7s ease-in-out";

    // Update width (with cap)
    barEl.style.width = `${Math.min(percent, 100)}%`;

    // Reset old colors
    barEl.classList.remove("bg-green-500", "bg-yellow-400", "bg-red-500");

    // Set color based on performance
    if (percent >= 90) {
      barEl.classList.add("bg-green-500");
    } else if (percent >= 70) {
      barEl.classList.add("bg-yellow-400");
    } else {
      barEl.classList.add("bg-red-500");
    }
  }
}



// -------------------------
// 6️⃣ Load Top 3 Students (per section and subject) - UPDATED with gradient badges
// -------------------------
async function loadTopStudents(grade = "", section = "", subject = "") {
  try {
    // Build URL with parameters
    const params = new URLSearchParams();
    if (grade) params.append("grade", grade);
    if (section) params.append("section", section);
    if (subject) params.append("subject", subject);

    const url = "/top-students-data" + (params.toString() ? "?" + params.toString() : "");
    const res = await fetch(url);
    const topStudents = await res.json();

    const container = document.getElementById("top-students-container");
    if (!container) return;
    container.innerHTML = "";

    // No students found
    if (!topStudents.length) {
      container.innerHTML = `
        <p class="text-gray-500 text-center py-4">
          ${grade && section
            ? `No top students found for Grade ${grade} - ${section}${subject ? ` (${subject})` : ""}`
            : "No top students available."
          }
        </p>`;
      return;
    }

    // Colors and emojis for ranks
    const rankColors = ["text-green-600", "text-blue-600", "text-yellow-600"];
    const ringColors = ["ring-green-500", "ring-blue-500", "ring-yellow-500"];
    const bgColors = [
      "bg-gradient-to-r from-green-100/80 to-green-50/40",
      "bg-gradient-to-r from-blue-100/80 to-blue-50/40",
      "bg-gradient-to-r from-yellow-100/80 to-yellow-50/40"
    ];
    const rankEmojis = ["🥇", "🥈", "🥉"];

    // Header
    const headerText = `🏆 Top Performers${grade && section ? ` - Grade ${grade} ${section}` : ""}${subject ? ` (${subject})` : ""}`;
    container.innerHTML += `
      <div class="mb-4 text-center">
        <h3 class="text-lg font-bold text-gray-800">${headerText}</h3>
        <p class="text-sm text-gray-600">Based on 70% academic performance + 30% attendance</p>
      </div>`;

    // Helper function for gradient badge based on value
    const getGradientBadge = (value) => {
      if (value >= 90) return "bg-gradient-to-r from-green-200/80 to-green-100/40 text-green-800";
      if (value >= 75) return "bg-gradient-to-r from-yellow-200/80 to-yellow-100/40 text-yellow-800";
      return "bg-gradient-to-r from-red-200/80 to-red-100/40 text-red-800";
    };

    // Student cards
    const cardsHTML = topStudents.map(student => {
      const rankIdx = (student.rank || 1) - 1;
      const rankColor = rankColors[rankIdx] || "text-gray-600";
      const ringColor = ringColors[rankIdx] || "ring-gray-400";
      const cardBg = bgColors[rankIdx] || "bg-gray-50/20";
      const rankEmoji = rankEmojis[rankIdx] || "";

      const hasPhoto = student.photo && student.photo.trim() !== "" && !student.photo.endsWith("default_avatar.png");
      const firstLetter = student.name.charAt(0).toUpperCase();
      const avatarHTML = hasPhoto
        ? `<img src="${student.photo}" alt="Student Photo" class="w-12 h-12 rounded-full object-cover border-2 ${ringColor} ring-offset-2">`
        : `<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg border-2 ${ringColor} ring-offset-2">${firstLetter}</div>`;

      return `
        <div class="flex items-center gap-4 ${cardBg} hover:bg-opacity-90 rounded-xl p-4 transition-all duration-200 shadow-sm border border-gray-100 mb-3">
          ${avatarHTML}
          <div class="flex-1">
            <p class="font-semibold text-gray-900 text-lg">${student.name}</p>
            <p class="text-sm text-gray-600">
              <span class="font-medium">${student.performance}% Overall</span>
              ${student.subject && student.subject !== 'Overall' ? `<span class="text-gray-400 ml-2">• ${student.subject}</span>` : ''}
            </p>
            <p class="text-xs text-gray-500 mt-1">Grade ${student.grade} - ${student.section}</p>
            <div class="mt-2 flex gap-2 flex-wrap text-xs">
              <span class="px-2 py-1 rounded-full ${getGradientBadge(student.average_score)}">${student.average_score}% Score</span>
              <span class="px-2 py-1 rounded-full ${getGradientBadge(student.attendance)}">${student.attendance}% Attendance</span>
            </div>
          </div>
          <div class="text-right flex flex-col items-end">
            <span class="font-bold ${rankColor} text-xl">#${student.rank}</span>
            <span class="text-2xl">${rankEmoji}</span>
          </div>
        </div>`;
    }).join("");

    container.innerHTML += cardsHTML;

  } catch (err) {
    console.error("Error loading top students:", err);
    const container = document.getElementById("top-students-container");
    if (container) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-red-500 font-medium">Failed to load top students</p>
          <p class="text-gray-500 text-sm mt-2">Please try again later</p>
        </div>`;
    }
  }
}


  ////////////////////////////////////////////////////////////////
// =============================
// Modal JS for Student Analytics
// =============================

const modal = document.getElementById('studentModal');
const closeBtn = document.getElementById('closeModal');

// Attach click event to all "View" buttons
document.querySelectorAll('.view-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    const studentCard = e.target.closest('.student-card');

    // -----------------------
    // 1️⃣ Get student info
    // -----------------------
    const studentName = studentCard.querySelector('h4').textContent.trim();
    const grade = studentCard.dataset.grade || "N/A";
    const section = studentCard.dataset.section || "N/A";
    const imageSrc = studentCard.dataset.image || ''; // Student photo path
    const initials = studentName.split(" ").map(n => n[0]).join(""); // e.g., "Emily Carter" → "EC"

    // -----------------------
    // 2️⃣ Populate modal content
    // -----------------------
    modal.querySelector('.modal-student-name').textContent = `${studentName}'s Analytics`;
    modal.querySelector('.modal-student-class').textContent = `Grade ${grade}, Section ${section}`;
     modal.querySelector('.modal-student-id').textContent = `student ID: ${studentCard.dataset.studentId || "#00000"}`;

    const modalPhoto = modal.querySelector('.modal-student-photo');

    if (imageSrc) {
      // Show student photo
      modalPhoto.src = imageSrc;
      modalPhoto.style.display = 'block';
      // Remove any fallback initials div if present
      const fallback = modal.querySelector('.modal-student-initials');
      if (fallback) fallback.remove();
    } else {
      // No photo → show initials
      modalPhoto.style.display = 'none';
      // Add fallback initials if not already added
      if (!modal.querySelector('.modal-student-initials')) {
        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'modal-student-initials w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-2xl ring-2 ring-slate-200';
        initialsDiv.textContent = initials;
        modalPhoto.parentElement.insertBefore(initialsDiv, modalPhoto);
      }
    }

    // -----------------------
    // 3️⃣ Show modal
    // -----------------------
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });
});
// -----------------------------
// Handle "View" button click
// -----------------------------
function initViewButtons() {
  document.querySelectorAll('.view-btn').forEach((btn) => {
    if (btn.dataset.listenerAdded === "true") return;
    btn.dataset.listenerAdded = "true";

    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.student-card');
      if (!card) return;

      // ---------------------------
      // 🪟 Show modal
      // ---------------------------
      const modal = document.getElementById('studentModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      // ---------------------------
      // 🧩 Attendance & Punctuality
      // ---------------------------
      document.getElementById("modalAttendanceRate").textContent = `${card.dataset.attendance || 0}%`;
      document.getElementById("modalPresentCount").textContent = card.dataset.present_count || 0;
      document.getElementById("modalLateCount").textContent = card.dataset.late_count || 0;
      document.getElementById("modalAbsentCount").textContent = card.dataset.absent_count || 0;

      // ---------------------------
      // 🧩 Subject Scores
      // ---------------------------
      const subjectScores = JSON.parse(card.dataset.subject_scores || '{}');
      const scoresContainer = document.getElementById('modalSubjectScores');
      const chartCanvas = document.getElementById('modalPerformanceChart');

      // Reset subject list
      scoresContainer.innerHTML = `<h3 class="font-semibold text-base mb-3">Average Score per Subject</h3>`;

      if (Object.keys(subjectScores).length === 0) {
        scoresContainer.innerHTML += `<p class="text-gray-500 text-sm">No subject data available.</p>`;
        if (window.performanceChart) window.performanceChart.destroy();
        return;
      }

      // Create progress bars
      Object.entries(subjectScores).forEach(([subject, score]) => {
        const barColor =
          score >= 85 ? 'bg-green-500' :
          score >= 75 ? 'bg-blue-500' :
          score >= 60 ? 'bg-yellow-500' :
          'bg-red-500';

        scoresContainer.innerHTML += `
          <div class="mb-3">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-gray-700">${subject}</span>
              <span class="text-gray-600">${score}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div class="${barColor} h-2.5 rounded-full" style="width: ${score}%;"></div>
            </div>
          </div>
        `;
      });

      // ---------------------------
      // 🌈 Radar Chart
      // ---------------------------
      const subjects = Object.keys(subjectScores);
      const scores = Object.values(subjectScores);

      const colorPalette = [
        'rgba(239, 68, 68, 0.8)',   // red-500
        'rgba(234, 179, 8, 0.8)',   // yellow-500
        'rgba(34, 197, 94, 0.8)',   // green-500
        'rgba(59, 130, 246, 0.8)',  // blue-500
        'rgba(168, 85, 247, 0.8)',  // purple-500
        'rgba(249, 115, 22, 0.8)',  // orange-500
        'rgba(20, 184, 166, 0.8)',  // teal-500
        'rgba(236, 72, 153, 0.8)'   // pink-500
      ];

      const pointColors = subjects.map((_, i) => colorPalette[i % colorPalette.length]);

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
            pointBackgroundColor: pointColors,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: pointColors,
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

       // ---------------------------
      // 🤖 Fetch AI Insight (OpenAI via Flask)
      // ---------------------------
      const aiInsightBox = document.getElementById('modalAIInsight');
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
        // Convert markdown-like sections into readable HTML
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
          const studentName = studentNameElement ? studentNameElement.textContent.replace("'s Analytics", "").trim() : 'Student';
          
          // Hide any previous status
          document.getElementById('emailStatusBanner').classList.add('hidden');
          
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
              
              // Show success banner with email address
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

// Email status banner helper
function showEmailStatus(type, title, message) {
  const banner = document.getElementById('emailStatusBanner');
  const icon = document.getElementById('emailStatusIcon');
  const titleEl = document.getElementById('emailStatusTitle');
  const messageEl = document.getElementById('emailStatusMessage');
  
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

initViewButtons();

// ✅ Fetch and render all charts (supports section filter)
async function fillCharts(section = "") {
  try {
    // Fetch chart data from backend (filter by section if provided)
    const res = await fetch(`/chart-data${section ? `?section=${encodeURIComponent(section)}` : ""}`);
    const data = await res.json();

    // Destroy existing charts if already initialized
    [
      "attendanceChartInstance",
      "scoreChartInstance",
      "averageChartInstance",
      "metricChartInstance",
      "correlationChartInstance",
      "trendChartInstance"
    ].forEach(chart => {
      if (window[chart]) window[chart].destroy();
    });

    // -----------------------------
    // Attendance Chart (Bar)
    // -----------------------------
    const ctxAttendance = document.getElementById("attendanceChart").getContext("2d");
    const gradientAttendance = ctxAttendance.createLinearGradient(0, 0, 0, ctxAttendance.canvas.height);
    gradientAttendance.addColorStop(0, "rgba(34, 197, 94, 0.8)");
    gradientAttendance.addColorStop(1, "rgba(34, 197, 94, 0.2)");

    window.attendanceChartInstance = new Chart(ctxAttendance, {
      type: "bar",
      data: {
        labels: data.attendance.labels,
        datasets: [{
          label: "Attendance (Present Days)",
          data: data.attendance.values,
          backgroundColor: gradientAttendance,
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });

    // -----------------------------
    // Scores Chart (Line)
    // -----------------------------
    const ctxScores = document.getElementById("scoreChart").getContext("2d");
    const gradientScores = ctxScores.createLinearGradient(0, 0, 0, ctxScores.canvas.height);
    gradientScores.addColorStop(0, "rgba(59, 130, 246, 0.6)");
    gradientScores.addColorStop(1, "rgba(59, 130, 246, 0.1)");

    window.scoreChartInstance = new Chart(ctxScores, {
      type: "line",
      data: {
        labels: data.scores.labels,
        datasets: [{
          label: "Average Score per Subject",
          data: data.scores.values,
          backgroundColor: gradientScores,
          borderColor: "rgba(59, 130, 246, 1)",
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    // -----------------------------
    // Average Score per Class (Bar)
    // -----------------------------
    const ctxAverage = document.getElementById("averageScoreChart").getContext("2d");
    const gradientAverage = ctxAverage.createLinearGradient(0, 0, 0, ctxAverage.canvas.height);
    gradientAverage.addColorStop(0, "rgba(251, 191, 36, 0.8)");
    gradientAverage.addColorStop(1, "rgba(251, 191, 36, 0.2)");

    window.averageChartInstance = new Chart(ctxAverage, {
      type: "bar",
      data: {
        labels: data.average.labels,
        datasets: [{
          label: "Average Score per Class",
          data: data.average.values,
          backgroundColor: gradientAverage,
          borderColor: "rgba(251, 191, 36, 1)",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });

    // -----------------------------
    // Weekly Points (Line)
    // -----------------------------
    const ctxMetric = document.getElementById("metricChart").getContext("2d");
    const gradientMetric = ctxMetric.createLinearGradient(0, 0, 0, ctxMetric.canvas.height);
    gradientMetric.addColorStop(0, "rgba(236, 72, 153, 0.6)");
    gradientMetric.addColorStop(1, "rgba(236, 72, 153, 0.1)");

    window.metricChartInstance = new Chart(ctxMetric, {
      type: "line",
      data: {
        labels: data.metric.labels,
        datasets: [{
          label: "Weekly Points Awarded",
          data: data.metric.values,
          backgroundColor: gradientMetric,
          borderColor: "rgba(236, 72, 153, 1)",
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    // -----------------------------
    // Score vs. Attendance Correlation (Line)
    // -----------------------------
    const ctxCorrelation = document.getElementById("ScoreVsAttendance").getContext("2d");
    const gradientCorrelation = ctxCorrelation.createLinearGradient(0, 0, 0, ctxCorrelation.canvas.height);
    gradientCorrelation.addColorStop(0, "rgba(16, 185, 129, 0.6)");
    gradientCorrelation.addColorStop(1, "rgba(16, 185, 129, 0.1)");

    window.correlationChartInstance = new Chart(ctxCorrelation, {
      type: "line",
      data: {
        labels: data.correlation.labels,
        datasets: [{
          label: "Score vs. Attendance",
          data: data.correlation.values,
          backgroundColor: gradientCorrelation,
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#10B981",
          pointBorderColor: "#fff",
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            backgroundColor: "rgba(16,185,129,0.9)",
            titleColor: "#fff",
            bodyColor: "#fff",
          },
          legend: {
            labels: {
              color: "#374151",
              font: { size: 12, weight: "500" }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#6B7280" },
            grid: { color: "rgba(209,213,219,0.3)" }
          },
          x: {
            ticks: { color: "#6B7280" },
            grid: { display: false }
          }
        }
      }
    });

    // -----------------------------
    // Attendance Trend Over Time (Line)
    // -----------------------------
    const ctxTrend = document.getElementById("attendanceTrendChart").getContext("2d");
    const gradientTrend = ctxTrend.createLinearGradient(0, 0, 0, ctxTrend.canvas.height);
    gradientTrend.addColorStop(0, "rgba(99, 102, 241, 0.7)");
    gradientTrend.addColorStop(1, "rgba(99, 102, 241, 0.1)");

    window.trendChartInstance = new Chart(ctxTrend, {
      type: "line",
      data: {
        labels: data.attendance_trend.labels,
        datasets: [{
          label: "Present Students per Week",
          data: data.attendance_trend.values,
          backgroundColor: gradientTrend,
          borderColor: "rgba(99, 102, 241, 1)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "#6366F1",
          pointBorderColor: "#fff",
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(99,102,241,0.9)",
            titleColor: "#fff",
            bodyColor: "#fff",
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Present Count", color: "#6B7280" },
            ticks: { color: "#6B7280" },
            grid: { color: "rgba(209,213,219,0.3)" }
          },
          x: {
            title: { display: true, text: "Week", color: "#6B7280" },
            ticks: { color: "#6B7280" },
            grid: { display: false }
          }
        }
      }
    });

  } catch (err) {
    console.error("Failed to fetch chart data:", err);
  }
}


// ✅ Populate Section Dropdown + Date Filters + Update Charts
function populateSectionDropdown() {
  const container = document.querySelector("[data-assigned-classes]");
  const sectionSelect = document.getElementById("sectionSelect");
  const startDateInput = document.getElementById("sdate");
  const endDateInput = document.getElementById("edate");

  if (!container || !sectionSelect || !startDateInput || !endDateInput) return;

  const assignedClasses = JSON.parse(container.dataset.assignedClasses || "[]");

  // 🧹 Clear old options
  sectionSelect.innerHTML = '<option value="">Choose Section</option>';

  // 🧩 Get unique sections
  const sections = [...new Set(assignedClasses.map(cls => cls.section))];

  // 🪄 Populate dropdown
  sections.forEach(section => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    sectionSelect.appendChild(option);
  });

  // 🗓️ Set default date range (last 30 days)
  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - 30);

  const formatDate = (d) => d.toISOString().split("T")[0];
  startDateInput.value = formatDate(pastDate);
  endDateInput.value = formatDate(today);

  // 🔄 Function to update charts based on filters
  async function updateCharts() {
    const selectedSection = sectionSelect.value;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!selectedSection) return;

    console.log("🔍 Filtering charts for:", {
      section: selectedSection,
      start: startDate,
      end: endDate,
    });

    // 👉 Pass section + date range to your chart update function
    await fillCharts(selectedSection, startDate, endDate);
  }

  // 🎯 Event listeners for filter changes
  sectionSelect.addEventListener("change", updateCharts);
  startDateInput.addEventListener("change", updateCharts);
  endDateInput.addEventListener("change", updateCharts);

  // 🚀 Auto-load charts for first section
  if (sections.length > 0) {
    sectionSelect.value = sections[0];
    updateCharts();
  }
}



  //////////////////////////Dashboard2////////////////////////////////////////


  // 📷 Start webcam
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
          facingMode: "user", // front camera; "environment" for back camera
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
});









//////////////////// Dito Ang Zoom pop up 
let recognition;
let currentPhase = "idle";
let tempStudentId = "";
let currentStudent = null;
let shownHandRaisePopup = false;
let popupCooldown = false;

/* ===============================
   🎉 SUCCESS CELEBRATION SYSTEM
=============================== */

function showSuccessCelebration(studentName, points) {
    // Create celebration overlay
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

    // Add confetti effect
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

        // Animate confetti
        const animation = confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 100}px) rotate(${360 * (Math.random() * 2 + 1)}deg)`, opacity: 0 }
        ], {
            duration: Math.random() * 3000 + 2000,
            easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
        });

        animation.onfinish = () => confetti.remove();
    }

    // Remove confetti container after animation
    setTimeout(() => {
        if (document.getElementById('confettiContainer')) {
            document.body.removeChild(confettiContainer);
        }
    }, 5000);
}

/* ===============================
   🪟 Zoom Popup for Raised Hand
=============================== */
function createZoomPopup(face, imageData) {
    if (popupCooldown) return;
    
    shownHandRaisePopup = true;
    popupCooldown = true;
    
    // Remove existing popup if any
    const existingPopup = document.getElementById("zoomGivePopup");
    if (existingPopup) existingPopup.remove();

    const zoomPopup = document.createElement('div');
    zoomPopup.id = 'zoomGivePopup';
    zoomPopup.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    zoomPopup.innerHTML = `
        <div class="relative bg-white rounded-lg p-6 max-w-2xl mx-4">
            <button id="closeZoom" class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            <h3 class="text-lg font-bold mb-4 text-center">✋ Hand Raised - ${face.name}</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="relative">
                    <canvas id="zoomCanvas" class="border border-gray-300 rounded-lg w-full"></canvas>
                </div>
                
                <div class="flex flex-col justify-center">
                    <div class="text-center mb-4">
                        <p class="text-gray-700 mb-2">Student: <span class="font-semibold">${face.name}</span></p>
                        <p class="text-gray-600 text-sm">ID: ${face.id || 'Unknown'}</p>
                    </div>
                    
                    <div class="space-y-3">
                        <button id="giveButton" class="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition duration-200">
                            ✅ Give Points
                        </button>
                        <button id="otherButton" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition duration-200">
                            🔄 Other Action
                        </button>
                        <button id="ignoreButton" class="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold transition duration-200">
                            ❌ Ignore
                        </button>
                    </div>
                    
                    <div class="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <p class="text-sm text-yellow-700 text-center">
                            🎤 You can also say: <br>
                            <span class="font-mono">"Give 5 points"</span> or <br>
                            <span class="font-mono">"Acknowledge"</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(zoomPopup);

    // Draw zoomed face
    const zoomCanvas = document.getElementById('zoomCanvas');
    const ctx = zoomCanvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        const [top, right, bottom, left] = face.face_location;
        const faceWidth = right - left;
        const faceHeight = bottom - top;
        
        // Set canvas size to show the face with some padding
        const padding = 20;
        zoomCanvas.width = faceWidth + (padding * 2);
        zoomCanvas.height = faceHeight + (padding * 2);
        
        // Draw the zoomed face
        ctx.drawImage(
            img,
            left, top, faceWidth, faceHeight,
            padding, padding, faceWidth, faceHeight
        );
    };
    
    img.src = imageData;

    // Event listeners for buttons
    document.getElementById('closeZoom').addEventListener('click', () => {
        zoomPopup.remove();
        resetPopupCooldown();
    });

    document.getElementById('giveButton').addEventListener('click', () => {
        showPointsModal(face);
        zoomPopup.remove();
    });

    document.getElementById('otherButton').addEventListener('click', () => {
        showToast(`Other action selected for ${face.name}`, 'info');
        zoomPopup.remove();
        resetPopupCooldown();
    });

    document.getElementById('ignoreButton').addEventListener('click', () => {
        zoomPopup.remove();
        resetPopupCooldown();
    });

    // Close popup when clicking outside
    zoomPopup.addEventListener('click', (e) => {
        if (e.target === zoomPopup) {
            zoomPopup.remove();
            resetPopupCooldown();
        }
    });

    // Reset cooldown after 5 seconds
    setTimeout(() => {
        popupCooldown = false;
        shownHandRaisePopup = false;
    }, 5000);
}

function resetPopupCooldown() {
    setTimeout(() => {
        popupCooldown = false;
        shownHandRaisePopup = false;
    }, 3000);
}

/* ===============================
   📋 Points Modal
=============================== */
function showPointsModal(face) {
    const pointsModal = document.createElement('div');
    pointsModal.id = 'pointsModal';
    pointsModal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    pointsModal.innerHTML = `
        <div class="relative bg-white rounded-lg p-6 max-w-md mx-4">
            <button id="closePointsModal" class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            <h3 class="text-lg font-bold mb-4 text-center">Award Points to ${face.name}</h3>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Points to award:</label>
                    <input type="number" id="pointsInput" min="1" max="100" value="5" 
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
                    <button id="cancelPoints" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200">
                        Cancel
                    </button>
                    <button id="submitPoints" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition duration-200">
                        Award Points
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(pointsModal);

    const pointsInput = document.getElementById('pointsInput');
    
    // Quick points buttons
    document.getElementById('quickPoints5').addEventListener('click', () => pointsInput.value = 5);
    document.getElementById('quickPoints10').addEventListener('click', () => pointsInput.value = 10);
    document.getElementById('quickPoints15').addEventListener('click', () => pointsInput.value = 15);

    // Cancel button
    document.getElementById('cancelPoints').addEventListener('click', () => {
        pointsModal.remove();
        resetPopupCooldown();
    });

    document.getElementById('closePointsModal').addEventListener('click', () => {
        pointsModal.remove();
        resetPopupCooldown();
    });

    // Submit button
    document.getElementById('submitPoints').addEventListener('click', async () => {
        const points = parseInt(pointsInput.value);
        if (points < 1 || points > 100) {
            showToast('Please enter points between 1 and 100', 'warning');
            return;
        }
        
        await awardPoints(face, points);
        pointsModal.remove();
        resetPopupCooldown();
    });

    // Close on outside click
    pointsModal.addEventListener('click', (e) => {
        if (e.target === pointsModal) {
            pointsModal.remove();
            resetPopupCooldown();
        }
    });

    pointsInput.focus();
}

/* ===============================
   🎯 ENHANCED AWARD POINTS FUNCTION
=============================== */
async function awardPoints(face, points) {
    // Show loading state immediately
    showToast(`⏳ Awarding ${points} points to ${face.name}...`, 'info');
    
    try {
        const subject = typeof SubjectClass !== "undefined" ? SubjectClass : "Unknown Subject";
        const response = await fetch("/save-points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_id: face.id,
                student_name: face.name,
                points: points,
                subject: subject,
                date: new Date().toISOString(),
                student_info: `Name (${face.name}), Student ID (${face.id})`
            })
        });

        const result = await response.json();

        if (result.success) {
            // Show big success celebration
            showSuccessCelebration(face.name, points);
            
            // Show success toast
            showToast(`✅ ${points} points awarded to ${face.name}!`, "success");
            
            // Speak congratulatory message
            const congratsMessages = [
                `Excellent! ${points} points awarded to ${face.name}!`,
                `Well done! ${face.name} earned ${points} points!`,
                `Congratulations ${face.name}! You've earned ${points} points!`,
                `Fantastic! ${points} points added for ${face.name}!`,
                `Great participation! ${points} points for ${face.name}!`
            ];
            const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
            speak(randomMessage);
            
        } else {
            showToast(`❌ Failed to save points: ${result.message}`, "error");
            speak("Sorry, I couldn't save the points. Please try again.");
        }
    } catch (err) {
        console.error("Error awarding points:", err);
        showToast("❌ Network error while saving points", "error");
        speak("Network error while saving points");
    }
}

/* ===============================
   🧠 ENHANCED SPEECH RECOGNITION
=============================== */
function startRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.SpeechRecognition) {
        console.warn("Speech Recognition not supported");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = async (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        console.log("🎤 Heard:", transcript);

        // Handle "Give X points" command
        if (transcript.includes("give") && transcript.includes("points")) {
            const pointsMatch = transcript.match(/give\s+(\d+)\s+points/);
            if (pointsMatch) {
                const points = parseInt(pointsMatch[1]);
                
                // Show immediate feedback
                showToast(`🎯 Processing: Give ${points} points...`, 'info');
                speak(`Awarding ${points} points...`);
                
                // If we have a current student from hand raise, award points
                if (currentStudent) {
                    await awardPoints(currentStudent, points);
                    currentStudent = null; // Reset after awarding
                } else {
                    showToast("❌ No student has raised their hand yet", "warning");
                    speak("Please wait for a student to raise their hand first");
                }
                return;
            }
        }

        // Handle "acknowledge" command
        if (transcript.includes("acknowledge") && currentPhase === "idle") {
            if (currentStudent) {
                // If we have a student from hand raise, show points modal
                showPointsModal(currentStudent);
                speak(`Opening points menu for ${currentStudent.name}`);
            } else {
                // Otherwise start the manual ID flow
                createVoiceModal("Please say the student ID.");
                speak("Please say the student ID.");
                currentPhase = "awaiting_id";
            }
            return;
        }

        // Handle "cancel" command
        if (transcript.includes("cancel")) {
            const existingPopup = document.getElementById("zoomGivePopup");
            if (existingPopup) {
                existingPopup.remove();
                resetPopupCooldown();
                speak("Cancelled");
            }
            return;
        }

        // Existing manual ID flow
        if (currentPhase === "awaiting_id") {
            tempStudentId = transcript.replace(/\D/g, "");
            if (tempStudentId.length < 3) {
                updateVoiceModal("⚠ Please say a valid student ID.", "text-yellow-600");
                speak("Please say a valid student ID.");
                return;
            }

            updateVoiceModal(`🔍 Checking student ID ${tempStudentId}...`, "text-blue-600");

            const res = await fetch(`/get-student/${tempStudentId}`);
            const data = await res.json();

            if (data.success) {
                currentStudent = {
                    studentId: tempStudentId,
                    studentName: data.student_name,
                    isPresent: data.is_present
                };

                if (!currentStudent.isPresent) {
                    updateVoiceModal(`❌ Sorry, ${currentStudent.studentName} is currently absent.`, "text-red-600");
                    speak(`Sorry, ${currentStudent.studentName} is currently absent.`);
                    currentPhase = "idle";
                    return;
                }

                updateVoiceModal(`✅ Student found: ${data.student_name}. Please say the number of points.`, "text-green-600");
                speak(`Student found: ${data.student_name}. Please say the number of points.`);
                currentPhase = "awaiting_points";

            } else {
                updateVoiceModal(`❌ ID ${tempStudentId} not found. Please try again.`, "text-red-600");
                speak(`Student ID ${tempStudentId} not found.`);
                currentPhase = "awaiting_id";
            }
            return;
        }

        // Points Phase for manual ID flow
        if (currentPhase === "awaiting_points") {
            const num = parseInt(transcript.match(/\d+/)?.[0]);
            if (!num || num <= 0) {
                updateVoiceModal("⚠ Please say a valid number of points.", "text-yellow-600");
                speak("Please say a valid number of points.");
                return;
            }

            updateVoiceModal(`🎯 Awarding ${num} points to ${currentStudent.studentName}...`, "text-blue-600");
            speak(`Awarding ${num} points to ${currentStudent.studentName}.`);

            try {
                const subject = typeof SubjectClass !== "undefined" ? SubjectClass : "Unknown Subject";
                const response = await fetch("/save-points", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        student_id: currentStudent.studentId,
                        student_name: currentStudent.studentName,
                        points: num,
                        subject: subject,
                        date: new Date().toISOString()
                    })
                });
                const result = await response.json();

                if (result.success) {
                    // Show celebration for manual flow too
                    showSuccessCelebration(currentStudent.studentName, num);
                    updateVoiceModal(`✅ ${num} points awarded to ${currentStudent.studentName}!`, "text-green-600");
                    
                    const congratsMessages = [
                        `Excellent! ${num} points awarded to ${currentStudent.studentName}!`,
                        `Well done! ${currentStudent.studentName} earned ${num} points!`
                    ];
                    const randomMessage = congratsMessages[Math.floor(Math.random() * congratsMessages.length)];
                    speak(randomMessage);
                } else {
                    updateVoiceModal(`❌ Failed to save points: ${result.message || "Unknown error."}`, "text-red-600");
                    speak("Failed to save points.");
                }
            } catch (err) {
                console.error(err);
                updateVoiceModal("❌ Network error while saving points.", "text-red-600");
                speak("Network error while saving points.");
            }

            setTimeout(() => {
                const modal = document.getElementById("voiceModal");
                if (modal) modal.remove();
            }, 4000);

            currentPhase = "idle";
        }
    };

    recognition.onend = () => {
        if (!popupCooldown) {
            recognition.start();
        }
    };
    recognition.start();
    console.log("🎙 Voice recognition started!");
}

/* ===============================
   🍞 ENHANCED TOAST NOTIFICATION
=============================== */
function showToast(message, type = "info") {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement("div");
    const toastId = "toast-" + Date.now();
    toast.id = toastId;
    
    // Type-specific styles and icons
    const typeConfig = {
        success: {
            style: `background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; border-left: 4px solid #22c55e;`,
            icon: "✅"
        },
        error: {
            style: `background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-left: 4px solid #ef4444;`,
            icon: "❌"
        },
        warning: {
            style: `background: #fffbeb; border: 1px solid #fed7aa; color: #ea580c; border-left: 4px solid #f59e0b;`,
            icon: "⚠️"
        },
        info: {
            style: `background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-left: 4px solid #3b82f6;`,
            icon: "ℹ️"
        }
    };

    const config = typeConfig[type] || typeConfig.info;

    toast.style.cssText = `
        min-width: 300px;
        max-width: 400px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px 16px;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        ${config.style}
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between;">
            <div style="display: flex; align-items: flex-start; flex: 1;">
                <span style="font-size: 16px; margin-right: 12px; line-height: 1.2;">${config.icon}</span>
                <div style="flex: 1;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; line-height: 1.4; word-wrap: break-word;">${message}</p>
                </div>
            </div>
            <button 
                onclick="this.closest('[id^=toast-]').remove()" 
                style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #6b7280;
                    margin-left: 8px;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='rgba(0,0,0,0.1)'"
                onmouseout="this.style.backgroundColor='transparent'"
            >
                ×
            </button>
        </div>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = "translateX(0)";
        toast.style.opacity = "1";
    }, 10);

    // Auto remove after appropriate time
    const autoRemoveTime = type === 'success' ? 3000 : 5000;
    const autoRemove = setTimeout(() => {
        if (document.getElementById(toastId)) {
            toast.style.transform = "translateX(400px)";
            toast.style.opacity = "0";
            setTimeout(() => {
                if (document.getElementById(toastId)) {
                    toast.remove();
                }
            }, 300);
        }
    }, autoRemoveTime);

    // Click to dismiss
    toast.addEventListener('click', (e) => {
        if (e.target === toast || e.target.tagName === 'BUTTON') {
            clearTimeout(autoRemove);
            toast.style.transform = "translateX(400px)";
            toast.style.opacity = "0";
            setTimeout(() => {
                if (document.getElementById(toastId)) {
                    toast.remove();
                }
            }, 300);
        }
    });
}

function speak(text) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    speechSynthesis.speak(utter);
}

/* ===============================
   📹 Webcam and Hand Detection
=============================== */
const video = document.getElementById('webcam');
const videoContainer = document.getElementById('videoContainer');
const result = document.getElementById('result');
const alertBox = document.getElementById('alert');
const detectionMessage = document.getElementById('detectionMessage');

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error("Camera access error:", err));

// Draw face boxes over the video
function drawFaces(faces) {
    document.querySelectorAll('.face-box').forEach(el => el.remove());

    faces.forEach(face => {
        const [top, right, bottom, left] = face.face_location;

        const box = document.createElement('div');
        box.classList.add('face-box');
        box.style.borderColor = face.name !== "Unknown" ? 'green' : 'red';
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${right - left}px`;
        box.style.height = `${bottom - top}px`;

        const label = document.createElement('div');
        label.classList.add('face-label');
        label.innerText = face.name;
        box.appendChild(label);

        videoContainer.appendChild(box);
    });
}

// Update the table of recognized faces
function updateTable(faces, raisedHands) {
    if (faces.length === 0) {
        result.innerHTML = "<p class='text-gray-500'>No faces recognized</p>";
        return;
    }

    let html = `
        <table class="table-auto border-collapse border border-gray-300 w-full text-sm">
            <thead>
                <tr class="bg-gray-200">
                    <th class="border px-2 py-1 text-left">Name</th>
                    <th class="border px-2 py-1 text-left">ID</th>
                    <th class="border px-2 py-1 text-left">Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    faces.forEach(face => {
        html += `
            <tr class="${face.name === 'Unknown' ? 'bg-red-50' : 'bg-green-50'}">
                <td class="border px-2 py-1">${face.name}</td>
                <td class="border px-2 py-1">${face.id || 'Unknown'}</td>
                <td class="border px-2-py-1">
                    ${raisedHands && face.name !== 'Unknown' ? '✋ Hand Raised' : ''}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    result.innerHTML = html;
}

// Capture frames and send to server
async function processFrame() {
    if (video.readyState !== 4) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg');

    try {
        const res = await fetch('/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });

        const data = await res.json();

        // Draw rectangles
        drawFaces(data.recognized);

        // Update table
        updateTable(data.recognized, data.raised_hands);

        // Show hand raised message and popup
        if (data.message && data.raised_hands) {
            detectionMessage.innerText = data.message;
            detectionMessage.classList.remove('hidden');
            
            // Find the recognized face that raised hand
            const recognizedFace = data.recognized.find(face => 
                face.name !== 'Unknown' && data.raised_hands
            );
            
            // Show zoom popup if we have a recognized face
            if (recognizedFace && !shownHandRaisePopup && !popupCooldown) {
                currentStudent = recognizedFace; // Store for voice commands
                createZoomPopup(recognizedFace, imageData);
            }
        } else {
            detectionMessage.classList.add('hidden');
        }

    } catch (err) {
        console.error("Detection error:", err);
    }
}

// Run every 800ms
setInterval(processFrame, 800);

// Start voice recognition
if (!/Mobi|Android/i.test(navigator.userAgent)) {
    startRecognition();
} else {
    const btn = document.createElement("button");
    btn.textContent = "🎤 Enable Voice";
    btn.className = "fixed bottom-5 right-5 bg-blue-600 text-white rounded-full px-5 py-3 shadow-lg";
    btn.onclick = () => {
        startRecognition();
        btn.remove();
    };
    document.body.appendChild(btn);
}



  document.getElementById("Raised").addEventListener("click", () => {
    document.getElementById("raisedStudents").classList.toggle("hidden");
  });

const container = document.querySelector("[data-assigned-classes]");
console.log('container element:', container);
console.log('getAttribute raw:', container?.getAttribute('data-assigned-classes'));
console.log('dataset prop:', container?.dataset?.assignedClasses);



