// -----------------------------
// Admin JS
// -----------------------------

// These will be loaded dynamically from system settings
let gradeLevels = ["10", "11", "12"];
let sectionsByGrade = {
  "10": ["Newton", "Einstein", "Tesla"],
  "11": ["Accountancy", "STEM", "HUMSS"],
  "12": ["ABM", "GAS", "TVL"]
};
let subjectsByGrade = {
  "10": ["Math", "Science", "English", "History"],
  "11": ["Accounting", "Business Math", "English", "Science"],
  "12": ["Practical Research", "Entrepreneurship", "English", "Economics"]
};

// Load system settings on page load
async function loadSystemSettings() {
  try {
    const response = await fetch("/admin/api/settings");
    const data = await response.json();
    
    if (data.success) {
      gradeLevels = data.settings.grade_levels || gradeLevels;
      sectionsByGrade = data.settings.sections_by_grade || sectionsByGrade;
      subjectsByGrade = data.settings.subjects_by_grade || subjectsByGrade;
      console.log("✅ System settings loaded:", data.settings);
      
      // Populate grade level dropdowns
      populateGradeLevelDropdowns();
    } else {
      console.warn("⚠️ Could not load system settings, using defaults");
    }
  } catch (error) {
    console.error("Error loading system settings:", error);
    console.warn("⚠️ Using default settings");
  }
}

// Populate all grade level dropdowns dynamically
function populateGradeLevelDropdowns() {
  const gradeSelects = document.querySelectorAll('#gradeLevel, #classLevel');
  
  gradeSelects.forEach(select => {
    if (!select) return;
    
    // Store current value if any
    const currentValue = select.value;
    
    // Clear existing options except the first placeholder
    const placeholder = select.querySelector('option[disabled][selected]');
    select.innerHTML = '';
    
    // Re-add placeholder
    if (placeholder) {
      select.appendChild(placeholder.cloneNode(true));
    } else {
      const defaultOption = document.createElement('option');
      defaultOption.disabled = true;
      defaultOption.selected = true;
      defaultOption.textContent = 'Select grade';
      select.appendChild(defaultOption);
    }
    
    // Add grade options from system settings
    gradeLevels.forEach(grade => {
      const option = document.createElement('option');
      option.value = grade;
      option.textContent = `Grade ${grade}`;
      select.appendChild(option);
    });
    
    // Restore previous value if it exists in new options
    if (currentValue && gradeLevels.includes(currentValue)) {
      select.value = currentValue;
    }
    
    console.log(`✅ Populated ${select.id} with grades:`, gradeLevels);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Admin JS Loaded");

  // Load system settings first
  await loadSystemSettings();

  // -----------------------------
  // Elements
  // -----------------------------
  const teacherToggle = document.getElementById("teacher-toggle");
  const studentToggle = document.getElementById("student-toggle");
  const teacherSection = document.getElementById("teachersView");
  const studentSection = document.getElementById("studentsView");
  const faceEnrollmentBtn = document.getElementById("faceEnrollmentBtn");

  const classLevel = document.getElementById("classLevel");
  const sectionLevel = document.getElementById("sectionLevel");
  const subjectLevel = document.getElementById("subjectLevel");

  const classModal = document.getElementById("classModal");
  const classForm = document.getElementById("classForm");
  const teacherForm = document.getElementById("teacherForm");
  const assignedClassesList = document.getElementById("assignedClassesList");

  const passwordInput = document.getElementById("teacherPassword");
  const confirmPasswordInput = document.getElementById("teacherConfirmPassword");
  const errorMsg = document.getElementById("passwordError");
  const submitBtn = teacherForm?.querySelector("button[type='submit']");
  
  // -----------------------------
  // Face Enrollment
  // -----------------------------
  if (faceEnrollmentBtn) {
    faceEnrollmentBtn.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Get student data from form
      const firstName = document.getElementById("firstName").value;
      const lastName = document.getElementById("lastName").value;
      const studentId = document.getElementById("studentId").value;
      
      console.log("Face enrollment clicked:", { firstName, lastName, studentId });
      
      if (!firstName || !lastName || !studentId) {
        alert("⚠️ Please fill in First Name, Last Name, and Student ID before proceeding to face enrollment.");
        return;
      }
      
      // Store student data in session storage for face enrollment page
      sessionStorage.setItem('enrollmentStudent', JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        studentId: studentId
      }));
      
      console.log("Redirecting to face enrollment...");
      // Redirect to face enrollment page
      window.location.href = "/face-enrollment";
    });
  } else {
    console.log("Face enrollment button not found");
  }

  // -----------------------------
  // Assigned Classes
  // -----------------------------
  let assignedClasses = [];

  function renderAssignedClasses() {
    assignedClassesList.innerHTML = "";

    if (assignedClasses.length === 0) {
      assignedClassesList.innerHTML = "<li class='text-gray-500'>No classes assigned yet.</li>";
      return;
    }

    assignedClasses.forEach((cls, index) => {
      const li = document.createElement("li");
      li.className = "flex justify-between items-center";
      li.textContent = `Grade ${cls.grade} - ${cls.section} | ${cls.subject}`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "✖";
      removeBtn.className = "ml-2 text-red-500 hover:text-red-700 text-sm font-bold";
      removeBtn.onclick = () => {
        assignedClasses.splice(index, 1);
        renderAssignedClasses();
      };

      li.appendChild(removeBtn);
      assignedClassesList.appendChild(li);
    });

    // Update hidden input for form submission
    let hiddenInput = teacherForm.querySelector("input[name='assigned_classes']");
    if (!hiddenInput) {
      hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = "assigned_classes";
      teacherForm.appendChild(hiddenInput);
    }
    hiddenInput.value = JSON.stringify(assignedClasses);
  }

  // -----------------------------
  // Populate Sections + Subjects based on Grade
  // -----------------------------
  classLevel.addEventListener("change", () => {
    const grade = classLevel.value;

    // Update Sections
    const sections = sectionsByGrade[grade] || [];
    sectionLevel.innerHTML = `<option value="" disabled selected>Select section</option>`;
    sections.forEach(sec => {
      const option = document.createElement("option");
      option.value = sec;
      option.textContent = sec;
      sectionLevel.appendChild(option);
    });

    // Update Subjects
    const subjects = subjectsByGrade[grade] || [];
    subjectLevel.innerHTML = `<option value="" disabled selected>Select subject</option>`;
    subjects.forEach(subj => {
      const option = document.createElement("option");
      option.value = subj;
      option.textContent = subj;
      subjectLevel.appendChild(option);
    });
  });

  // -----------------------------
  // Class Modal
  // -----------------------------
  window.openClassModal = () => {
    classModal.classList.remove("hidden");
    classModal.classList.add("flex");
  };

  window.closeClassModal = () => {
    classModal.classList.remove("flex");
    classModal.classList.add("hidden");
  };

function setupRfidModal(modalId, openBtnId, closeBtnId, resultId, hiddenInputId) {
    const rfidModal = document.getElementById(modalId);
    const openRfidBtn = document.getElementById(openBtnId);
    const closeRfidBtn = document.getElementById(closeBtnId);
    const rfidResult = document.getElementById(resultId);
    const rfidInput = document.getElementById(hiddenInputId);

    if (!rfidModal || !openRfidBtn || !closeRfidBtn || !rfidResult || !rfidInput) {
        console.error('RFID Modal: One or more elements not found');
        return;
    }

    let rfidBuffer = "";
    let isModalOpen = false;

    // Function to display password-style text (hidden characters)
    function getPasswordDisplay(text) {
        return '*'.repeat(text.length);
    }

    // Open modal function
    function openModal() {
        rfidModal.classList.remove("hidden");
        rfidResult.textContent = "Scanning... Ready for RFID input";
        rfidBuffer = "";
        isModalOpen = true;
        rfidModal.focus();
    }

    // Close modal function
    function closeModal() {
        rfidModal.classList.add("hidden");
        isModalOpen = false;
        rfidBuffer = "";
    }

    // Open modal
    openRfidBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openModal();
    });

    // Close modal events
    closeRfidBtn.addEventListener("click", closeModal);

    // Close clicking outside content
    rfidModal.addEventListener("click", (e) => {
        if (e.target === rfidModal) closeModal();
    });

    // Close with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isModalOpen) {
            closeModal();
        }
    });

    // Listen for keyboard input (RFID scanners usually act like a keyboard)
    document.addEventListener("keydown", (e) => {
        if (!isModalOpen) return;

        // Prevent default for Enter key to avoid form submission
        if (e.key === "Enter") {
            e.preventDefault();
            
            // End of scan
            if (rfidBuffer.trim() !== "") {
                rfidResult.textContent = rfidBuffer; // Show actual value briefly
                rfidInput.value = rfidBuffer;

                console.log(`✅ RFID ${rfidBuffer} successfully stored!`);
                
                // Visual feedback - show success but keep password hidden
                rfidResult.textContent = `✅  Successfully stored!`;
                rfidResult.style.color = "green";
                
                // Auto-close after delay
                setTimeout(closeModal, 1000);
            }
        } 
        // Handle backspace (optional - for manual correction)
        else if (e.key === "Backspace") {
            e.preventDefault();
            rfidBuffer = rfidBuffer.slice(0, -1);
            rfidResult.textContent = rfidBuffer ? getPasswordDisplay(rfidBuffer) : "Scanning...";
        }
        // Only append alphanumeric characters (prevents special keys)
        else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
            rfidBuffer += e.key;
            rfidResult.textContent = getPasswordDisplay(rfidBuffer);
        }
    });

    // Reset result styling when opening modal
    rfidModal.addEventListener('click', (e) => {
        if (e.target === openRfidBtn) {
            rfidResult.style.color = "";
        }
    });
}

// Initialize
setupRfidModal("rfidModal", "openRfidModal", "closeRfidModal", "rfidResult", "rfidInput");



  // -----------------------------
  // Handle Form Submission
  // -----------------------------
  classForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const grade = classLevel.value;
    const section = sectionLevel.value;
    const subject = subjectLevel.value;

    if (!grade || !section || !subject) {
      alert("⚠️ Please select grade, section, and subject.");
      return;
    }

    assignedClasses.push({ grade, section, subject });
    renderAssignedClasses();
    closeClassModal();
    classForm.reset();
  });

  // -----------------------------
  // Populate Teacher Dropdown
  // -----------------------------
  function populateTeacherDropdown() {
    const teacherData = document.getElementById("teacher-data");
    const select = document.getElementById("teacherSelect");

    if (!teacherData || !select) return; // prevent errors

    let teachers = [];
    try {
      teachers = JSON.parse(teacherData.dataset.teachers || "[]");
    } catch (err) {
      console.error("❌ Could not parse teacher data", err);
      return;
    }

    // Clear existing options
    select.innerHTML = '<option value="">-- Select a Teacher --</option>';

    teachers.forEach(teacher => {
      const option = document.createElement("option");
      option.value = teacher.id;
      option.textContent = teacher.name;
      select.appendChild(option);
    });
  }

  // ✅ Call it once DOM is ready
  populateTeacherDropdown();
  
function setupGradeSectionDropdown(gradeSelectId, sectionSelectId) {
  const gradeSelect = document.getElementById(gradeSelectId);
  const sectionSelect = document.getElementById(sectionSelectId);
  if (!gradeSelect || !sectionSelect) return;

  gradeSelect.addEventListener("change", function () {
    const grade = this.value;
    const sections = sectionsByGrade[grade] || [];
    sectionSelect.innerHTML = '<option value="" disabled selected>Select section</option>';

    if (sections.length > 0) {
      sectionSelect.disabled = false;
      sections.forEach(sec => {
        const option = document.createElement("option");
        option.value = sec;
        option.textContent = sec;
        sectionSelect.appendChild(option);
      });
    } else {
      sectionSelect.disabled = true;
    }
  });
}

setupGradeSectionDropdown("gradeLevel", "section");

  // -----------------------------
  // Toggle Teacher / Student section
  // -----------------------------
  function updateSection() {
    if (teacherToggle?.checked) {
      teacherSection.classList.remove("hidden");
      studentSection.classList.add("hidden");
    } else if (studentToggle?.checked) {
      studentSection.classList.remove("hidden");
      teacherSection.classList.add("hidden");
    }
  }

  updateSection();
  teacherToggle?.addEventListener("change", updateSection);
  studentToggle?.addEventListener("change", updateSection);

  // -----------------------------
  // Password validation
  // -----------------------------
  function checkPasswordsMatch() {
    if (!passwordInput.value || !confirmPasswordInput.value) {
      errorMsg.classList.add("hidden");
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-50", "cursor-not-allowed");
      return;
    }

    if (passwordInput.value !== confirmPasswordInput.value) {
      errorMsg.classList.remove("hidden");
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      errorMsg.classList.add("hidden");
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }

  passwordInput?.addEventListener("input", checkPasswordsMatch);
  confirmPasswordInput?.addEventListener("input", checkPasswordsMatch);

  teacherForm?.addEventListener("submit", (event) => {
    if (passwordInput.value !== confirmPasswordInput.value) {
      event.preventDefault();
      errorMsg.classList.remove("hidden");
      alert("⚠️ Passwords do not match!");
    }
  });

  checkPasswordsMatch();
});
// 🔴 Modern Logout Button with Modal Confirmation
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

  // Add modal content
  modalContent.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="color: #ef4444;">
        <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
      </svg>
    </div>
    <h3 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">Confirm Logout</h3>
    <p style="margin: 0 0 1.5rem 0; color: #6b7280; line-height: 1.5;">Are you sure you want to log out? You'll need to sign in again to access your account.</p>
    <div style="display: flex; gap: 0.75rem; justify-content: center;">
      <button id="cancelLogout" style="
        padding: 0.75rem 1.5rem;
        border: 1px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
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
        transition: all 0.2s ease;
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

  // Append modal to page
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Add event listeners
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
  
// Use this in your logout handler - prevents back button from working
confirmBtn.addEventListener('click', () => {
  closeModal();
  
  fetch("/logout", {
    method: "POST"
  })
  .then(response => {
    if (response.ok) {
      // Use replace instead of href to prevent back navigation
      window.location.replace("/");
    } else {
      alert('Logout failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Logout error:', error);
    alert('Logout failed. Please check your connection.');
  });
});
  // Close modal when clicking outside
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}
// ================================
// 🔹 BASE ELEMENTS
// ================================
const viewBtn = document.getElementById("view-teachers-btn");
const modal = document.getElementById("teacherModal");
const closeModal = document.getElementById("closeModal");
const tableBody = document.getElementById("teacherTableBody");

// ✅ Adjust this to your blueprint prefix (e.g., /admin if using admin_bp)
const API_BASE = "/admin/api";

// ================================
// 🔹 SHOW TEACHER LIST MODAL
// ================================
viewBtn.addEventListener("click", async () => {
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  try {
    const res = await fetch(`${API_BASE}/teachers`);
    const teachers = await res.json();

    tableBody.innerHTML = "";

    if (!teachers || teachers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-gray-500">
            No teachers found
          </td>
        </tr>`;
      return;
    }

    teachers.forEach((t) => {
      const photoUrl = t.photo
        ? `/static/${t.photo}`
        : "https://via.placeholder.com/60?text=No+Image";

      const row = `
        <tr class="hover:bg-gray-50 transition">
          <td class="py-2 px-3 text-center">
            <img src="${photoUrl}" alt="${t.name}" 
                 class="w-14 h-14 object-cover rounded-full border shadow-sm">
          </td>
          <td class="py-2 px-3 font-semibold text-gray-800">${t.name}</td>
          <td class="py-2 px-3">${t.teacher_id}</td>
          <td class="py-2 px-3">${t.email}</td>
          <td class="py-2 px-3">${t.age ?? "N/A"}</td>
          <td class="py-2 px-3">${t.gender ?? "N/A"}</td>
          <td class="py-2 px-3 text-sm text-gray-700">
            ${t.assigned_classes?.length > 0 
              ? t.assigned_classes.join("<br>")
              : "None"}
          </td>
          <td class="py-2 px-3 text-center">
            <button 
              class="edit-btn bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 mr-2 transition"
              data-id="${t.id}">
              Edit
            </button>
            <button 
              class="delete-btn bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition"
              data-id="${t.id}">
              Delete
            </button>
          </td>
        </tr>
      `;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  } catch (err) {
    console.error("Error fetching teachers:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-red-500">
          Error loading data
        </td>
      </tr>`;
  }
});

// ================================
// 🔹 CLOSE MAIN MODAL
// ================================
closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
});

// ================================
// 🔹 EDIT MODAL ELEMENTS
// ================================
const editModal = document.getElementById("editTeacherModal");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editForm = document.getElementById("editTeacherForm");

// -------------------------
// 🔹 Function: Open Edit Modal
// -------------------------
async function openEditModal(id) {
  try {
    const res = await fetch(`${API_BASE}/teacher/${id}`);
    if (!res.ok) throw new Error("Failed to load teacher");
    const t = await res.json();

    // ✅ Populate fields
    document.getElementById("editTeacherId").value = t.id;
    document.getElementById("editName").value = t.name || "";
    document.getElementById("editEmail").value = t.email || "";
    document.getElementById("editGender").value = t.gender || "";
    document.getElementById("editContact").value = t.contact_info || "";

    // ✅ Convert assigned_classes into editable text
    document.getElementById("editClasses").value =
      t.assigned_classes?.map(
        (cls) => `${cls.grade}, ${cls.section}, ${cls.subject}`
      ).join("\n") || "";

    // Show modal
    editModal.classList.remove("hidden");
    editModal.classList.add("flex");
  } catch (err) {
    alert("Error loading teacher data");
    console.error(err);
  }
}

// -------------------------
// 🔹 Close Edit Modal
// -------------------------
function closeEditModalFn() {
  editModal.classList.add("hidden");
  editModal.classList.remove("flex");
}
closeEditModal.addEventListener("click", closeEditModalFn);
cancelEditBtn.addEventListener("click", closeEditModalFn);

// -------------------------
// 🔹 Submit Updated Teacher
// -------------------------
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editTeacherId").value;

  const data = {
    name: document.getElementById("editName").value.trim(),
    email: document.getElementById("editEmail").value.trim(),
    gender: document.getElementById("editGender").value.trim(),
    contact_info: document.getElementById("editContact").value.trim(),

    // ✅ Convert textarea lines into JSON objects
    assigned_classes: document
      .getElementById("editClasses")
      .value.split("\n")
      .map((line) => {
        const [grade, section, subject] = line.split(",").map((s) => s.trim());
        return { grade, section, subject };
      })
      .filter((c) => c.grade && c.section && c.subject),
  };

  try {
    const res = await fetch(`${API_BASE}/teacher/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (res.ok) {
      alert("✅ Teacher updated successfully!");
      closeEditModalFn();
      document.getElementById("view-teachers-btn").click(); // refresh list
    } else {
      alert(`❌ Failed: ${result.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Update error:", error);
    alert("Failed to connect to server.");
  }
});

// ================================
// 🔹 HANDLE EDIT & DELETE BUTTONS
// ================================
tableBody.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  // ✅ Edit Teacher
  if (e.target.classList.contains("edit-btn")) {
    openEditModal(id);
  }

  // ✅ Delete Teacher
  if (e.target.classList.contains("delete-btn")) {
    if (confirm("Are you sure you want to delete this teacher?")) {
      try {
        const res = await fetch(`${API_BASE}/teacher/${id}`, { method: "DELETE" });
        const result = await res.json();

        if (res.ok) {
          alert("🗑️ Teacher deleted successfully!");
          e.target.closest("tr").remove();
        } else {
          alert(`❌ Failed: ${result.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to connect to server.");
      }
    }
  }
});

// ===============================
// 📘 View Students Functionality
// ===============================
const viewStudentsBtn = document.getElementById("view-student-btn");
const studentsModal = document.getElementById("studentsModal");
const closeStudentsModal = document.getElementById("closeStudentsModal");
const studentsTableBody = document.getElementById("studentsTableBody");
const sectionFilter = document.getElementById("Section_level");

let allStudents = []; // store all students for filtering

// Fetch students from API and populate modal
async function fetchStudents() {
  try {
    const res = await fetch("/admin/api/students"); // Update with your Flask route
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allStudents = data; // keep a copy for filtering
    populateSectionDropdown(data);
    displayStudents(data);

    // Show modal
    studentsModal.classList.remove("hidden");
    studentsModal.classList.add("flex");
  } catch (err) {
    console.error("Error loading students:", err);
    alert("Failed to load students.");
  }
}

// Populate <select> with unique sections
function populateSectionDropdown(students) {
  const sections = [...new Set(students.map(s => s.section))]; // unique sections
  sectionFilter.innerHTML = `<option value="all">All Sections</option>`;
  sections.forEach(sec => {
    const option = document.createElement("option");
    option.value = sec;
    option.textContent = sec;
    sectionFilter.appendChild(option);
  });
}

// Display students in the table
function displayStudents(students) {
  studentsTableBody.innerHTML = "";

  if (!Array.isArray(students) || students.length === 0) {
    studentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3">No students found</td></tr>`;
    return;
  }

  students.forEach(student => {
    const photoUrl = student.image
      ? `/static/uploads/${student.image}` // Use your actual path
      : "https://via.placeholder.com/60?text=No+Image";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border p-2 text-center">
        <img src="${photoUrl}" alt="${student.name}" class="w-12 h-12 object-cover rounded-full mx-auto">
      </td>
      <td class="border p-2">${student.student_id}</td>
      <td class="border p-2">${student.name}</td>
      <td class="border p-2">Grade ${student.grade_level} - ${student.section}</td>
      <td class="border p-2">${student.email}</td>
      <td class="border p-2">${student.gender}</td>
    `;
    studentsTableBody.appendChild(row);
  });
}

// Filter students when a section is selected
sectionFilter.addEventListener("change", () => {
  const selected = sectionFilter.value;
  if (selected === "all") {
    displayStudents(allStudents);
  } else {
    const filtered = allStudents.filter(s => s.section === selected);
    displayStudents(filtered);
  }
});

// Event listeners
viewStudentsBtn.addEventListener("click", fetchStudents);
closeStudentsModal.addEventListener("click", () => {
  studentsModal.classList.add("hidden");
  studentsModal.classList.remove("flex");
});
const studentsCount = document.getElementById("studentsCount");

// Display students in the table and update count
function displayStudents(students) {
  studentsTableBody.innerHTML = "";

  if (!Array.isArray(students) || students.length === 0) {
    studentsTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-3">No students found</td></tr>`;
    studentsCount.textContent = "Total Students: 0";
    return;
  }

  students.forEach(student => {
    const photoUrl = student.image
      ? `/static/uploads/${student.image}`
      : "https://via.placeholder.com/60?text=No+Image";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="border p-2 text-center">
        <img src="${photoUrl}" alt="${student.name}" class="w-12 h-12 object-cover rounded-full mx-auto">
      </td>
      <td class="border p-2">${student.student_id}</td>
      <td class="border p-2">${student.name}</td>
      <td class="border p-2">Grade ${student.grade_level} - ${student.section}</td>
      <td class="border p-2">${student.email}</td>
      <td class="border p-2">${student.gender}</td>
    `;
    studentsTableBody.appendChild(row);
  });

  // ✅ Update student count
  studentsCount.textContent = `Total Students: ${students.length}`;
}
const addStudentBtn = document.getElementById("addStudentBtn");
const termsModal = document.getElementById("termsModal");
const acceptBtn = document.getElementById("acceptTerms");
const declineBtn = document.getElementById("declineTerms");

// Get the form element - Updated selector for new layout
const studentForm = document.querySelector("#studentsView form");

// ================================
// 🔹 GENERATE STUDENT ID
// ================================
const generateStudentIdBtn = document.getElementById("generateStudentIdBtn");
const studentIdInput = document.querySelector("input[name='student_id']");

if (generateStudentIdBtn && studentIdInput) {
  generateStudentIdBtn.addEventListener("click", async () => {
    try {
      // Generate ID using current year and 4 random digits
      const currentYear = new Date().getFullYear(); // Get current year (e.g., 2026)
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 4 random digits
      const generatedId = `S${currentYear}${random}`;
      
      // Populate the input field
      studentIdInput.value = generatedId;
      
      // Visual feedback
      generateStudentIdBtn.textContent = "✓ Generated!";
      generateStudentIdBtn.classList.remove("bg-blue-500", "hover:bg-blue-600");
      generateStudentIdBtn.classList.add("bg-green-500");
      
      // Reset button after 2 seconds
      setTimeout(() => {
        generateStudentIdBtn.textContent = "Generate ID";
        generateStudentIdBtn.classList.remove("bg-green-500");
        generateStudentIdBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
      }, 2000);
    } catch (err) {
      console.error("Error generating student ID:", err);
      alert("Error generating ID. Please try again.");
    }
  });
}

// ================================
// 🔹 GENERATE TEACHER ID
// ================================
const generateTeacherIdBtn = document.getElementById("generateTeacherIdBtn");
const teacherIdInput = document.querySelector("input[name='teacher_id']");

if (generateTeacherIdBtn && teacherIdInput) {
  generateTeacherIdBtn.addEventListener("click", async () => {
    try {
      // Generate ID using current year and 4 random digits
      const currentYear = new Date().getFullYear(); // Get current year (e.g., 2026)
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0'); // 4 random digits
      const generatedId = `T${currentYear}${random}`;
      
      // Populate the input field
      teacherIdInput.value = generatedId;
      
      // Visual feedback
      generateTeacherIdBtn.textContent = "✓ Generated!";
      generateTeacherIdBtn.classList.remove("bg-blue-500", "hover:bg-blue-600");
      generateTeacherIdBtn.classList.add("bg-green-500");
      
      // Reset button after 2 seconds
      setTimeout(() => {
        generateTeacherIdBtn.textContent = "Generate ID";
        generateTeacherIdBtn.classList.remove("bg-green-500");
        generateTeacherIdBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
      }, 2000);
    } catch (err) {
      console.error("Error generating teacher ID:", err);
      alert("Error generating ID. Please try again.");
    }
  });
}

// Show modal when clicking Add Student
addStudentBtn.addEventListener("click", () => {
  termsModal.classList.remove("hidden");
  termsModal.classList.add("flex");
});

// Function to validate required fields
function validateStudentForm() {
  const studentSection = document.getElementById("studentsView");
  const firstName = studentSection.querySelector("input[name='first_name']").value.trim();
  const lastName = studentSection.querySelector("input[name='last_name']").value.trim();
  const studentId = studentSection.querySelector("input[name='student_id']").value.trim();
  const gradeLevel = studentSection.querySelector("select[name='grade_level']").value;
  const section = studentSection.querySelector("select[name='section']").value;

  if (!firstName || !lastName || !studentId || !gradeLevel || !section) {
    alert("Please fill in all required fields including Grade Level and Section!");
    return false;
  }
  return true;
}

// Accept Terms → set next_action to "accept" and submit
acceptBtn.addEventListener("click", (e) => {
  e.preventDefault();

  if (!validateStudentForm()) return;

  // Set hidden input to "accept"
  document.getElementById("nextAction").value = "accept";

  // Submit form
  studentForm.submit();
});

// Decline → set next_action to "decline" and submit
declineBtn.addEventListener("click", (e) => {
  e.preventDefault();

  if (!validateStudentForm()) return;

  // Set hidden input to "decline"
  document.getElementById("nextAction").value = "decline";

  // Hide modal
  termsModal.classList.add("hidden");

  // Submit form
  studentForm.submit();
});
document.getElementById("face-list-btn").addEventListener("click", function () {
  // If using a blueprint with a prefix, include it here
  window.location.href = "/admin/face_list";
});

// ===============================
// 📊 ENHANCED TEACHERS LIST FUNCTIONALITY
// ===============================

let allTeachersData = [];
let filteredTeachersData = [];
let currentTeachersPage = 1;
let teachersPerPage = 10;
let teachersSortColumn = '';
let teachersSortDirection = {};

// Update statistics
function updateTeachersStats(teachers) {
  const total = teachers.length;
  const male = teachers.filter(t => t.gender === 'Male').length;
  const female = teachers.filter(t => t.gender === 'Female').length;
  const avgClasses = total > 0 ? (teachers.reduce((sum, t) => sum + (t.assigned_classes?.length || 0), 0) / total).toFixed(1) : 0;
  
  document.getElementById('totalTeachersCount').textContent = total;
  document.getElementById('maleTeachersCount').textContent = male;
  document.getElementById('femaleTeachersCount').textContent = female;
  document.getElementById('avgClassLoad').textContent = avgClasses;
}

// Populate subject filter dropdown
function populateTeacherSubjectFilter(teachers) {
  const subjects = new Set();
  teachers.forEach(t => {
    if (t.assigned_classes && Array.isArray(t.assigned_classes)) {
      t.assigned_classes.forEach(cls => {
        if (typeof cls === 'object') {
          const subject = cls.subject || cls.subject_Level || cls.subjectLevel;
          if (subject) subjects.add(subject);
        }
      });
    }
  });
  
  const filterSelect = document.getElementById('filterTeacherSubject');
  filterSelect.innerHTML = '<option value="">All Subjects</option>';
  Array.from(subjects).sort().forEach(subject => {
    filterSelect.innerHTML += `<option value="${subject}">${subject}</option>`;
  });
}

// Apply filters and search
function filterTeachers() {
  const searchTerm = document.getElementById('teacherSearch').value.toLowerCase();
  const genderFilter = document.getElementById('filterTeacherGender').value;
  const gradeFilter = document.getElementById('filterTeacherGrade').value;
  const subjectFilter = document.getElementById('filterTeacherSubject').value;
  
  filteredTeachersData = allTeachersData.filter(teacher => {
    // Search filter
    const matchesSearch = !searchTerm || 
      teacher.name.toLowerCase().includes(searchTerm) ||
      teacher.teacher_id.toLowerCase().includes(searchTerm) ||
      (teacher.email && teacher.email.toLowerCase().includes(searchTerm)) ||
      (teacher.assigned_classes && Array.isArray(teacher.assigned_classes) && teacher.assigned_classes.some(cls => {
        if (typeof cls === 'object') {
          const subject = cls.subject || cls.subject_Level || cls.subjectLevel || '';
          return subject.toLowerCase().includes(searchTerm);
        }
        return false;
      }));
    
    // Gender filter
    const matchesGender = !genderFilter || teacher.gender === genderFilter;
    
    // Grade filter
    const matchesGrade = !gradeFilter || 
      (teacher.assigned_classes && Array.isArray(teacher.assigned_classes) && teacher.assigned_classes.some(cls => {
        if (typeof cls === 'object') {
          const grade = cls.grade || cls.class_Level || cls.gradeLevel;
          return grade === gradeFilter;
        }
        return false;
      }));
    
    // Subject filter
    const matchesSubject = !subjectFilter || 
      (teacher.assigned_classes && Array.isArray(teacher.assigned_classes) && teacher.assigned_classes.some(cls => {
        if (typeof cls === 'object') {
          const subject = cls.subject || cls.subject_Level || cls.subjectLevel;
          return subject === subjectFilter;
        }
        return false;
      }));
    
    return matchesSearch && matchesGender && matchesGrade && matchesSubject;
  });
  
  currentTeachersPage = 1;
  updateTeachersStats(filteredTeachersData);
  displayTeachersPage();
}

// Sort teachers table
function sortTeachersTable(column) {
  if (column === 'photo') return; // Don't sort by photo
  
  teachersSortDirection[column] = teachersSortDirection[column] === 'asc' ? 'desc' : 'asc';
  
  filteredTeachersData.sort((a, b) => {
    let valA = a[column];
    let valB = b[column];
    
    // Handle null/undefined
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    
    // Convert to string for comparison
    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();
    
    if (teachersSortDirection[column] === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  displayTeachersPage();
}

// Display current page of teachers
function displayTeachersPage() {
  const tableBody = document.getElementById('teacherTableBody');
  const startIndex = (currentTeachersPage - 1) * teachersPerPage;
  const endIndex = startIndex + teachersPerPage;
  const pageData = filteredTeachersData.slice(startIndex, endIndex);
  
  tableBody.innerHTML = '';
  
  if (pageData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-gray-500">
          <div class="flex flex-col items-center gap-2">
            <span class="material-symbols-outlined text-4xl">search_off</span>
            <p>No teachers found</p>
          </div>
        </td>
      </tr>`;
  } else {
    pageData.forEach((t) => {
      const photoUrl = t.photo || "https://via.placeholder.com/60?text=No+Image";
      
      // Format classes with badges - Handle multiple formats
      let classesHTML = '';
      if (t.assigned_classes && Array.isArray(t.assigned_classes) && t.assigned_classes.length > 0) {
        classesHTML = t.assigned_classes.map(cls => {
          // Handle both object format and string format
          if (typeof cls === 'string') {
            // If it's a string, display as-is
            return `<span class="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-1 mb-1 whitespace-nowrap">
              ${cls}
            </span>`;
          } else if (typeof cls === 'object') {
            // Check for the property names (could be 'grade' or 'class_Level', etc.)
            const grade = cls.grade || cls.class_Level || cls.gradeLevel || '?';
            const section = cls.section || cls.section_Level || cls.sectionLevel || '?';
            const subject = cls.subject || cls.subject_Level || cls.subjectLevel || '?';
            
            // Only display if we have valid data
            if (grade !== '?' && section !== '?' && subject !== '?') {
              return `<span class="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-1 mb-1 whitespace-nowrap">
                Grade ${grade} - ${section} | ${subject}
              </span>`;
            }
          }
          return ''; // Skip invalid entries
        }).filter(html => html).join(''); // Remove empty strings
      }
      
      if (!classesHTML) {
        classesHTML = '<span class="text-gray-400 text-xs">No classes assigned</span>';
      }
      
      const row = `
        <tr class="hover:bg-purple-50 transition">
          <td class="py-2 px-3 text-center">
            <img src="${photoUrl}" alt="${t.name}" 
                 class="w-12 h-12 object-cover rounded-full border shadow-sm mx-auto">
          </td>
          <td class="py-2 px-3 font-semibold text-gray-800">${t.name}</td>
          <td class="py-2 px-3">${t.teacher_id}</td>
          <td class="py-2 px-3 hide-mobile">${t.email || 'N/A'}</td>
          <td class="py-2 px-3 hide-mobile">${t.age ?? 'N/A'}</td>
          <td class="py-2 px-3 hide-mobile">${t.gender ?? 'N/A'}</td>
          <td class="py-2 px-3 text-sm">
            ${classesHTML}
          </td>
          <td class="py-2 px-3 text-center">
            <div class="flex gap-1 justify-center flex-wrap">
              <button 
                class="edit-btn bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition text-xs"
                data-id="${t.id}">
                Edit
              </button>
              <button 
                class="delete-btn bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition text-xs"
                data-id="${t.id}">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  }
  
  updateTeachersPagination();
}

// Update pagination controls
function updateTeachersPagination() {
  const totalRecords = filteredTeachersData.length;
  const totalPages = Math.ceil(totalRecords / teachersPerPage);
  const startIndex = (currentTeachersPage - 1) * teachersPerPage + 1;
  const endIndex = Math.min(startIndex + teachersPerPage - 1, totalRecords);
  
  document.getElementById('teachersShowingFrom').textContent = totalRecords > 0 ? startIndex : 0;
  document.getElementById('teachersShowingTo').textContent = endIndex;
  document.getElementById('teachersTotalRecords').textContent = totalRecords;
  document.getElementById('teachersCurrentPage').textContent = `Page ${currentTeachersPage} of ${totalPages || 1}`;
  
  const prevBtn = document.getElementById('teachersPrevPage');
  const nextBtn = document.getElementById('teachersNextPage');
  
  prevBtn.disabled = currentTeachersPage === 1;
  nextBtn.disabled = currentTeachersPage >= totalPages;
}

// Export teachers to CSV
function exportTeachersToCSV() {
  const data = filteredTeachersData.map(t => ({
    'Teacher ID': t.teacher_id,
    'Name': t.name,
    'Email': t.email || '',
    'Gender': t.gender || '',
    'Age': t.age || '',
    'Contact': t.contact_info || '',
    'Classes': t.assigned_classes ? t.assigned_classes.map(c => `${c.grade}-${c.section} ${c.subject}`).join('; ') : ''
  }));
  
  if (data.length === 0) {
    alert('No data to export');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(field => {
      const value = row[field] || '';
      return `"${value.toString().replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `teachers_list_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// Initialize teachers modal event listeners
function initTeachersModalListeners() {
  // Search
  document.getElementById('teacherSearch')?.addEventListener('input', filterTeachers);
  
  // Filters
  document.getElementById('filterTeacherGender')?.addEventListener('change', filterTeachers);
  document.getElementById('filterTeacherGrade')?.addEventListener('change', filterTeachers);
  document.getElementById('filterTeacherSubject')?.addEventListener('change', filterTeachers);
  
  // Clear filters
  document.getElementById('clearTeacherFilters')?.addEventListener('click', () => {
    document.getElementById('teacherSearch').value = '';
    document.getElementById('filterTeacherGender').value = '';
    document.getElementById('filterTeacherGrade').value = '';
    document.getElementById('filterTeacherSubject').value = '';
    filterTeachers();
  });
  
  // Export
  document.getElementById('exportTeachersCSV')?.addEventListener('click', exportTeachersToCSV);
  
  // Refresh
  document.getElementById('refreshTeachersList')?.addEventListener('click', () => {
    document.getElementById('view-teachers-btn')?.click();
  });
  
  // Pagination
  document.getElementById('teachersPrevPage')?.addEventListener('click', () => {
    if (currentTeachersPage > 1) {
      currentTeachersPage--;
      displayTeachersPage();
    }
  });
  
  document.getElementById('teachersNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredTeachersData.length / teachersPerPage);
    if (currentTeachersPage < totalPages) {
      currentTeachersPage++;
      displayTeachersPage();
    }
  });
  
  document.getElementById('teachersItemsPerPage')?.addEventListener('change', (e) => {
    teachersPerPage = parseInt(e.target.value);
    currentTeachersPage = 1;
    displayTeachersPage();
  });
}

// Override the original view teachers button click
const originalViewTeachersBtn = document.getElementById("view-teachers-btn");
if (originalViewTeachersBtn) {
  originalViewTeachersBtn.removeEventListener('click', originalViewTeachersBtn.onclick);
  originalViewTeachersBtn.addEventListener("click", async () => {
    const modal = document.getElementById("teacherModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    try {
      const res = await fetch(`${API_BASE}/teachers`);
      const teachers = await res.json();

      // Debug: Log the first teacher's classes structure
      if (teachers.length > 0 && teachers[0].assigned_classes) {
        console.log('🔍 Sample teacher data:', teachers[0]);
        console.log('🔍 Sample assigned_classes type:', typeof teachers[0].assigned_classes);
        console.log('🔍 Sample assigned_classes content:', teachers[0].assigned_classes);
        if (Array.isArray(teachers[0].assigned_classes) && teachers[0].assigned_classes.length > 0) {
          console.log('🔍 First class object:', teachers[0].assigned_classes[0]);
        }
      }

      allTeachersData = teachers;
      filteredTeachersData = teachers;
      
      updateTeachersStats(teachers);
      populateTeacherSubjectFilter(teachers);
      displayTeachersPage();
      
    } catch (err) {
      console.error("Error fetching teachers:", err);
      document.getElementById('teacherTableBody').innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-8">
            <div class="text-red-500 mb-2">
              <span class="material-symbols-outlined text-4xl">error</span>
            </div>
            <p class="text-gray-700">Failed to load teachers</p>
            <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
              Retry
            </button>
          </td>
        </tr>`;
    }
  });
}

// ===============================
// 📚 ENHANCED STUDENTS LIST FUNCTIONALITY
// ===============================

let allStudentsData = [];
let filteredStudentsData = [];
let currentStudentsPage = 1;
let studentsPerPage = 10;
let studentsSortColumn = '';
let studentsSortDirection = {};
let selectedStudents = new Set();

// Update statistics
function updateStudentsStats(students) {
  const total = students.length;
  const male = students.filter(s => s.gender === 'Male').length;
  const female = students.filter(s => s.gender === 'Female').length;
  const sections = new Set(students.map(s => s.section)).size;
  
  document.getElementById('totalStudentsCount').textContent = total;
  document.getElementById('maleStudentsCount').textContent = male;
  document.getElementById('femaleStudentsCount').textContent = female;
  document.getElementById('activeSectionsCount').textContent = sections;
}

// Apply filters and search
function filterStudents() {
  const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
  const gradeFilter = document.getElementById('filterStudentGrade').value;
  const sectionFilter = document.getElementById('Section_level').value;
  const genderFilter = document.getElementById('filterStudentGender').value;
  
  filteredStudentsData = allStudentsData.filter(student => {
    // Search filter
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm) ||
      student.student_id.toLowerCase().includes(searchTerm) ||
      (student.email && student.email.toLowerCase().includes(searchTerm));
    
    // Grade filter
    const matchesGrade = !gradeFilter || student.grade_level === gradeFilter;
    
    // Section filter  
    const matchesSection = !sectionFilter || student.section === sectionFilter;
    
    // Gender filter
    const matchesGender = !genderFilter || student.gender === genderFilter;
    
    return matchesSearch && matchesGrade && matchesSection && matchesGender;
  });
  
  currentStudentsPage = 1;
  updateStudentsStats(filteredStudentsData);
  displayStudentsPage();
}

// Sort students table
function sortStudentsTable(column) {
  if (column === 'photo') return;
  
  studentsSortDirection[column] = studentsSortDirection[column] === 'asc' ? 'desc' : 'asc';
  
  filteredStudentsData.sort((a, b) => {
    let valA = a[column];
    let valB = b[column];
    
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    
    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();
    
    if (studentsSortDirection[column] === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  displayStudentsPage();
}

// Display current page of students
function displayStudentsPage() {
  const tableBody = document.getElementById('studentsTableBody');
  const startIndex = (currentStudentsPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const pageData = filteredStudentsData.slice(startIndex, endIndex);
  
  tableBody.innerHTML = '';
  
  if (pageData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-gray-500">
          <div class="flex flex-col items-center gap-2">
            <span class="material-symbols-outlined text-4xl">search_off</span>
            <p>No students found</p>
          </div>
        </td>
      </tr>`;
  } else {
    pageData.forEach(student => {
      const photoUrl = student.image
        ? `/static/uploads/${student.image}`
        : "https://via.placeholder.com/60?text=No+Image";
      
      const isSelected = selectedStudents.has(student.id);
      
      const row = document.createElement("tr");
      row.className = isSelected ? "bg-blue-50" : "hover:bg-blue-50 transition";
      row.innerHTML = `
        <td class="border p-2 text-center">
          <input type="checkbox" class="student-checkbox w-4 h-4 cursor-pointer" 
                 data-id="${student.id}" ${isSelected ? 'checked' : ''}>
        </td>
        <td class="border p-2 text-center">
          <img src="${photoUrl}" alt="${student.name}" 
               class="w-12 h-12 object-cover rounded-full mx-auto border shadow-sm">
        </td>
        <td class="border p-2 font-semibold">${student.student_id}</td>
        <td class="border p-2">${student.name}</td>
        <td class="border p-2">Grade ${student.grade_level} - ${student.section}</td>
        <td class="border p-2 hide-mobile">${student.email || 'N/A'}</td>
        <td class="border p-2 hide-mobile">${student.gender || 'N/A'}</td>
        <td class="border p-2 text-center">
          <div class="flex gap-1 justify-center">
            <button class="view-student-btn bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                    data-id="${student.id}" title="View Details">
              <span class="material-symbols-outlined text-sm">visibility</span>
            </button>
            <button class="edit-student-btn bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                    data-id="${student.id}" title="Edit">
              <span class="material-symbols-outlined text-sm">edit</span>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });
    
    // Add event listeners for checkboxes
    document.querySelectorAll('.student-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', handleStudentSelection);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.view-student-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentId = e.currentTarget.dataset.id;
        viewStudentDetails(studentId);
      });
    });
    
    document.querySelectorAll('.edit-student-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentId = e.currentTarget.dataset.id;
        editStudent(studentId);
      });
    });
  }
  
  updateStudentsPagination();
}

// Handle student selection
function handleStudentSelection(e) {
  const studentId = parseInt(e.target.dataset.id);
  if (e.target.checked) {
    selectedStudents.add(studentId);
  } else {
    selectedStudents.delete(studentId);
  }
  updateBulkActionBar();
}

// Update bulk action bar
function updateBulkActionBar() {
  const bulkBar = document.getElementById('bulkActionBar');
  const selectedCount = document.getElementById('selectedCount');
  
  if (selectedStudents.size > 0) {
    bulkBar.classList.remove('hidden');
    selectedCount.textContent = selectedStudents.size;
  } else {
    bulkBar.classList.add('hidden');
  }
}

// Update pagination controls
function updateStudentsPagination() {
  const totalRecords = filteredStudentsData.length;
  const totalPages = Math.ceil(totalRecords / studentsPerPage);
  const startIndex = (currentStudentsPage - 1) * studentsPerPage + 1;
  const endIndex = Math.min(startIndex + studentsPerPage - 1, totalRecords);
  
  document.getElementById('studentsShowingFrom').textContent = totalRecords > 0 ? startIndex : 0;
  document.getElementById('studentsShowingTo').textContent = endIndex;
  document.getElementById('studentsTotalRecords').textContent = totalRecords;
  document.getElementById('studentsCurrentPage').textContent = `Page ${currentStudentsPage} of ${totalPages || 1}`;
  
  const prevBtn = document.getElementById('studentsPrevPage');
  const nextBtn = document.getElementById('studentsNextPage');
  
  prevBtn.disabled = currentStudentsPage === 1;
  nextBtn.disabled = currentStudentsPage >= totalPages;
}

// Export students to CSV
function exportStudentsToCSV(selectedOnly = false) {
  let dataToExport = filteredStudentsData;
  
  if (selectedOnly && selectedStudents.size > 0) {
    dataToExport = filteredStudentsData.filter(s => selectedStudents.has(s.id));
  }
  
  const data = dataToExport.map(s => ({
    'Student ID': s.student_id,
    'Name': s.name,
    'Grade Level': s.grade_level,
    'Section': s.section,
    'Email': s.email || '',
    'Gender': s.gender || '',
    'Guardian Name': s.guardian_name || '',
    'Guardian Contact': s.guardian_contact || ''
  }));
  
  if (data.length === 0) {
    alert('No data to export');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(field => {
      const value = row[field] || '';
      return `"${value.toString().replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `students_list_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// View student details (placeholder)
function viewStudentDetails(studentId) {
  const student = allStudentsData.find(s => s.id == studentId);
  if (student) {
    alert(`Student Details:\n\nID: ${student.student_id}\nName: ${student.name}\nGrade: ${student.grade_level}\nSection: ${student.section}\nEmail: ${student.email}\nGuardian: ${student.guardian_name}`);
  }
}

// Edit student
function editStudent(studentId) {
  const student = allStudentsData.find(s => s.id == studentId);
  if (!student) {
    alert('Student not found');
    return;
  }
  
  // Handle name fields - parse from full name if individual fields not available
  let firstName = student.first_name || '';
  let lastName = student.last_name || '';
  let middleInitial = student.middle_initial || '';
  
  // If individual fields are empty but we have a full name, parse it
  if (!firstName && !lastName && student.name) {
    const nameParts = student.name.split(' ');
    if (nameParts.length >= 2) {
      firstName = nameParts[0];
      lastName = nameParts[nameParts.length - 1];
      // Check for middle initial (single letter or letter with period)
      if (nameParts.length > 2) {
        const middle = nameParts.slice(1, -1).join(' ');
        if (middle.length <= 2) {
          middleInitial = middle.replace('.', '');
        }
      }
    }
  }
  
  // Populate the edit form
  document.getElementById('editStudentId').value = student.id;
  document.getElementById('editStudentFirstName').value = firstName;
  document.getElementById('editStudentLastName').value = lastName;
  document.getElementById('editStudentMiddleInitial').value = middleInitial;
  document.getElementById('editStudentStudentId').value = student.student_id || '';
  document.getElementById('editStudentEmail').value = student.email || '';
  document.getElementById('editStudentGender').value = student.gender || '';
  document.getElementById('editStudentGradeLevel').value = student.grade_level || '';
  document.getElementById('editStudentSection').value = student.section || '';
  document.getElementById('editStudentContact').value = student.contact_info || '';
  document.getElementById('editStudentGuardianName').value = student.guardian_name || '';
  document.getElementById('editStudentGuardianContact').value = student.guardian_contact || '';
  
  // Show modal
  const modal = document.getElementById('editStudentModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// Close edit student modal
function closeEditStudentModal() {
  const modal = document.getElementById('editStudentModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Handle edit student form submission
async function handleEditStudentSubmit(e) {
  e.preventDefault();
  
  const studentId = document.getElementById('editStudentId').value;
  const data = {
    first_name: document.getElementById('editStudentFirstName').value,
    last_name: document.getElementById('editStudentLastName').value,
    middle_initial: document.getElementById('editStudentMiddleInitial').value,
    student_id: document.getElementById('editStudentStudentId').value,
    email: document.getElementById('editStudentEmail').value,
    gender: document.getElementById('editStudentGender').value,
    grade_level: document.getElementById('editStudentGradeLevel').value,
    section: document.getElementById('editStudentSection').value,
    contact_info: document.getElementById('editStudentContact').value,
    guardian_name: document.getElementById('editStudentGuardianName').value,
    guardian_contact: document.getElementById('editStudentGuardianContact').value
  };
  
  try {
    const response = await fetch(`/admin/api/student/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      alert('✅ Student updated successfully!');
      closeEditStudentModal();
      // Refresh the students list
      document.getElementById('view-student-btn')?.click();
    } else {
      alert(`❌ Failed: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Update error:', error);
    alert('Failed to connect to server.');
  }
}

// Initialize students modal event listeners
function initStudentsModalListeners() {
  // Search
  document.getElementById('studentSearch')?.addEventListener('input', filterStudents);
  
  // Filters
  document.getElementById('filterStudentGrade')?.addEventListener('change', filterStudents);
  document.getElementById('Section_level')?.addEventListener('change', filterStudents);
  document.getElementById('filterStudentGender')?.addEventListener('change', filterStudents);
  
  // Clear filters
  document.getElementById('clearStudentFilters')?.addEventListener('click', () => {
    document.getElementById('studentSearch').value = '';
    document.getElementById('filterStudentGrade').value = '';
    document.getElementById('Section_level').value = '';
    document.getElementById('filterStudentGender').value = '';
    filterStudents();
  });
  
  // Export
  document.getElementById('exportStudentsCSV')?.addEventListener('click', () => exportStudentsToCSV(false));
  document.getElementById('bulkExportSelected')?.addEventListener('click', () => exportStudentsToCSV(true));
  
  // Refresh
  document.getElementById('refreshStudentsList')?.addEventListener('click', () => {
    document.getElementById('view-student-btn')?.click();
  });
  
  // Select all checkbox
  document.getElementById('selectAllStudents')?.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => {
      cb.checked = e.target.checked;
      const studentId = parseInt(cb.dataset.id);
      if (e.target.checked) {
        selectedStudents.add(studentId);
      } else {
        selectedStudents.delete(studentId);
      }
    });
    updateBulkActionBar();
    displayStudentsPage();
  });
  
  // Deselect all
  document.getElementById('deselectAll')?.addEventListener('click', () => {
    selectedStudents.clear();
    document.getElementById('selectAllStudents').checked = false;
    updateBulkActionBar();
    displayStudentsPage();
  });
  
  // Pagination
  document.getElementById('studentsPrevPage')?.addEventListener('click', () => {
    if (currentStudentsPage > 1) {
      currentStudentsPage--;
      displayStudentsPage();
    }
  });
  
  document.getElementById('studentsNextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredStudentsData.length / studentsPerPage);
    if (currentStudentsPage < totalPages) {
      currentStudentsPage++;
      displayStudentsPage();
    }
  });
  
  document.getElementById('studentsItemsPerPage')?.addEventListener('change', (e) => {
    studentsPerPage = parseInt(e.target.value);
    currentStudentsPage = 1;
    displayStudentsPage();
  });
  
  // Edit student modal event listeners
  document.getElementById('closeEditStudentModal')?.addEventListener('click', closeEditStudentModal);
  document.getElementById('cancelEditStudentBtn')?.addEventListener('click', closeEditStudentModal);
  document.getElementById('editStudentForm')?.addEventListener('submit', handleEditStudentSubmit);
}

// Override the original view students button
const originalViewStudentsBtn = document.getElementById("view-student-btn");
if (originalViewStudentsBtn) {
  // Remove old listeners
  const newViewStudentsBtn = originalViewStudentsBtn.cloneNode(true);
  originalViewStudentsBtn.parentNode.replaceChild(newViewStudentsBtn, originalViewStudentsBtn);
  
  newViewStudentsBtn.addEventListener("click", async () => {
    const modal = document.getElementById("studentsModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    try {
      const res = await fetch("/admin/api/students");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const students = await res.json();

      allStudentsData = students;
      filteredStudentsData = students;
      selectedStudents.clear();
      
      // Populate section filter
      const sections = [...new Set(students.map(s => s.section))].sort();
      const sectionFilter = document.getElementById('Section_level');
      sectionFilter.innerHTML = '<option value="">All Sections</option>';
      sections.forEach(sec => {
        sectionFilter.innerHTML += `<option value="${sec}">${sec}</option>`;
      });
      
      updateStudentsStats(students);
      displayStudentsPage();
      
    } catch (err) {
      console.error("Error loading students:", err);
      document.getElementById('studentsTableBody').innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-8">
            <div class="text-red-500 mb-2">
              <span class="material-symbols-outlined text-4xl">error</span>
            </div>
            <p class="text-gray-700">Failed to load students</p>
            <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
              Retry
            </button>
          </td>
        </tr>`;
    }
  });
}

// Make sort functions globally available
window.sortTeachersTable = sortTeachersTable;
window.sortStudentsTable = sortStudentsTable;

// Initialize all listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initTeachersModalListeners();
  initStudentsModalListeners();
});
