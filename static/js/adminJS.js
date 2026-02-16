// -----------------------------
// Admin JS
// -----------------------------

const sectionsByGrade = {
  "10": ["Newton", "Einstein", "Tesla"],
  "11": ["Accountancy", "STEM", "HUMSS"],
  "12": ["ABM", "GAS", "TVL"]
};
const subjectsByGrade = {
  "10": ["Math", "Science", "English", "History"],
  "11": ["Accounting", "Business Math", "English", "Science"],
  "12": ["Practical Research", "Entrepreneurship", "English", "Economics"]
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Admin JS Loaded");

  // -----------------------------
  // Elements
  // -----------------------------
  const teacherToggle = document.getElementById("teacher-toggle");
  const studentToggle = document.getElementById("student-toggle");
  const teacherSection = document.getElementById("teacher-section");
  const studentSection = document.getElementById("student-section");
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

// Get the form element
const studentForm = document.querySelector("#student-section form");

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
  const studentSection = document.getElementById("student-section");
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