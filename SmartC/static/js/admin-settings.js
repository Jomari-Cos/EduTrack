// ====================================================
// ADMIN SYSTEM SETTINGS
// ====================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Admin Settings JS Loaded");

  // Elements
  const systemSettingsBtn = document.getElementById("system-settings-btn");
  const systemSettingsModal = document.getElementById("systemSettingsModal");
  const closeSettingsModal = document.getElementById("closeSettingsModal");
  const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
  const systemSettingsForm = document.getElementById("systemSettingsForm");
  const settingsNotification = document.getElementById("settingsNotification");
  
  // Form elements
  const schoolName = document.getElementById("schoolName");
  const schoolLogo = document.getElementById("schoolLogo");
  const schoolLogoFile = document.getElementById("schoolLogoFile");
  const logoImage = document.getElementById("logoImage");
  const logoPlaceholder = document.getElementById("logoPlaceholder");
  const schoolAddress = document.getElementById("schoolAddress");
  const schoolContact = document.getElementById("schoolContact");
  const schoolEmail = document.getElementById("schoolEmail");
  const academicYear = document.getElementById("academicYear");
  const currentTerm = document.getElementById("currentTerm");
  const defaultScoreWeight = document.getElementById("defaultScoreWeight");
  const defaultAttendanceWeight = document.getElementById("defaultAttendanceWeight");
  const scoreWeightDisplay = document.getElementById("scoreWeightDisplay");
  const attendanceWeightDisplay = document.getElementById("attendanceWeightDisplay");
  const allowTeacherOverride = document.getElementById("allowTeacherOverride");
  const minimumAttendance = document.getElementById("minimumAttendance");
  const passingGrade = document.getElementById("passingGrade");
  const honorRollGrade = document.getElementById("honorRollGrade");
  const gradeLevelsList = document.getElementById("gradeLevelsList");
  const addGradeBtn = document.getElementById("addGradeBtn");
  const sectionsList = document.getElementById("sectionsList");
  const subjectsList = document.getElementById("subjectsList");

  let currentSettings = null;

  // Open settings modal
  systemSettingsBtn?.addEventListener("click", () => {
    openSettingsModal();
  });

  // Close settings modal
  closeSettingsModal?.addEventListener("click", closeSettings);
  cancelSettingsBtn?.addEventListener("click", closeSettings);

  // Sync sliders
  defaultScoreWeight?.addEventListener("input", (e) => {
    const value = parseInt(e.target.value);
    scoreWeightDisplay.textContent = `${value}%`;
    defaultAttendanceWeight.value = 100 - value;
    attendanceWeightDisplay.textContent = `${100 - value}%`;
  });

  defaultAttendanceWeight?.addEventListener("input", (e) => {
    const value = parseInt(e.target.value);
    attendanceWeightDisplay.textContent = `${value}%`;
    defaultScoreWeight.value = 100 - value;
    scoreWeightDisplay.textContent = `${100 - value}%`;
  });

  // Add grade level button
  addGradeBtn?.addEventListener("click", () => {
    const grade = prompt("Enter grade level (e.g., 7, 8, 9, 10, 11, 12):");
    if (grade) {
      const trimmedGrade = grade.trim();
      
      // Validate input
      if (!/^\d+$/.test(trimmedGrade)) {
        showNotification("⚠️ Please enter a valid number (e.g., 7, 10, 12)", "error");
        return;
      }
      
      if (!currentSettings.grade_levels.includes(trimmedGrade)) {
        currentSettings.grade_levels.push(trimmedGrade);
        currentSettings.grade_levels.sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
        currentSettings.sections_by_grade[trimmedGrade] = [];
        currentSettings.subjects_by_grade[trimmedGrade] = [];
        renderGradeLevels();
        renderSections();
        renderSubjects();
        showNotification(`✅ Grade ${trimmedGrade} added successfully`, "success");
      } else {
        showNotification("⚠️ Grade level already exists", "error");
      }
    }
  });

  // Handle logo file selection
  schoolLogoFile?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        showNotification("⚠️ Logo file size must be less than 2MB", "error");
        schoolLogoFile.value = "";
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showNotification("⚠️ Please select a valid image file", "error");
        schoolLogoFile.value = "";
        return;
      }
      
      // Preview the image
      const reader = new FileReader();
      reader.onload = (e) => {
        logoImage.src = e.target.result;
        logoImage.classList.remove("hidden");
        logoPlaceholder.classList.add("hidden");
      };
      reader.readAsDataURL(file);
    }
  });

  // Submit form
  systemSettingsForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings();
  });

  // ====================================================
  // FUNCTIONS
  // ====================================================

  function openSettingsModal() {
    systemSettingsModal.classList.remove("hidden");
    systemSettingsModal.classList.add("flex");
    loadSettings();
  }

  function closeSettings() {
    systemSettingsModal.classList.remove("flex");
    systemSettingsModal.classList.add("hidden");
  }

  async function loadSettings() {
    try {
      const response = await fetch("/admin/api/settings");
      const data = await response.json();

      if (data.success) {
        currentSettings = data.settings;
        populateForm(currentSettings);
      } else {
        showNotification("Error loading settings: " + data.message, "error");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      showNotification("Failed to load settings", "error");
    }
  }

  function populateForm(settings) {
    // School Information
    schoolName.value = settings.school_name || "";
    schoolLogo.value = settings.school_logo || "";
    
    // Display current logo if exists
    if (settings.school_logo) {
      logoImage.src = `/static/uploads/${settings.school_logo}`;
      logoImage.classList.remove("hidden");
      logoPlaceholder.classList.add("hidden");
    } else {
      logoImage.classList.add("hidden");
      logoPlaceholder.classList.remove("hidden");
    }
    
    schoolAddress.value = settings.school_address || "";
    schoolContact.value = settings.school_contact || "";
    schoolEmail.value = settings.school_email || "";

    // Academic Year
    academicYear.value = settings.academic_year || "";
    currentTerm.value = settings.current_term || "";

    // Default Weights
    const scorePercent = Math.round(settings.default_score_weight * 100);
    const attendancePercent = Math.round(settings.default_attendance_weight * 100);
    defaultScoreWeight.value = scorePercent;
    defaultAttendanceWeight.value = attendancePercent;
    scoreWeightDisplay.textContent = `${scorePercent}%`;
    attendanceWeightDisplay.textContent = `${attendancePercent}%`;
    allowTeacherOverride.checked = settings.allow_teacher_override;

    // System Preferences
    minimumAttendance.value = settings.minimum_attendance_percentage || 75;
    passingGrade.value = settings.passing_grade || 60;
    honorRollGrade.value = settings.honor_roll_grade || 90;

    // Grade Configuration
    renderGradeLevels();
    renderSections();
    renderSubjects();
  }

  function renderGradeLevels() {
    if (!currentSettings) return;

    gradeLevelsList.innerHTML = "";
    currentSettings.grade_levels.forEach((grade) => {
      const div = document.createElement("div");
      div.className = "flex items-center gap-2";
      div.innerHTML = `
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded">Grade ${grade}</span>
        <button type="button" class="text-red-500 hover:text-red-700" onclick="removeGrade('${grade}')">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      `;
      gradeLevelsList.appendChild(div);
    });
  }

  function renderSections() {
    if (!currentSettings) return;

    sectionsList.innerHTML = "";
    currentSettings.grade_levels.forEach((grade) => {
      const sections = currentSettings.sections_by_grade[grade] || [];
      const div = document.createElement("div");
      div.className = "border rounded-lg p-3";
      div.innerHTML = `
        <div class="font-medium mb-2">Grade ${grade}</div>
        <div class="flex flex-wrap gap-2 mb-2" id="sections-${grade}">
          ${sections.map(section => `
            <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm flex items-center gap-1">
              ${section}
              <button type="button" class="text-red-500 hover:text-red-700" onclick="removeSection('${grade}', '${section}')">×</button>
            </span>
          `).join("")}
        </div>
        <button type="button" class="text-sm text-blue-500 hover:text-blue-700" onclick="addSection('${grade}')">
          + Add Section
        </button>
      `;
      sectionsList.appendChild(div);
    });
  }

  function renderSubjects() {
    if (!currentSettings) return;

    subjectsList.innerHTML = "";
    currentSettings.grade_levels.forEach((grade) => {
      const subjects = currentSettings.subjects_by_grade[grade] || [];
      const div = document.createElement("div");
      div.className = "border rounded-lg p-3";
      div.innerHTML = `
        <div class="font-medium mb-2">Grade ${grade}</div>
        <div class="flex flex-wrap gap-2 mb-2" id="subjects-${grade}">
          ${subjects.map(subject => `
            <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-sm flex items-center gap-1">
              ${subject}
              <button type="button" class="text-red-500 hover:text-red-700" onclick="removeSubject('${grade}', '${subject}')">×</button>
            </span>
          `).join("")}
        </div>
        <button type="button" class="text-sm text-green-500 hover:text-green-700" onclick="addSubject('${grade}')">
          + Add Subject
        </button>
      `;
      subjectsList.appendChild(div);
    });
  }

  async function saveSettings() {
    try {
      // Validate inputs before saving
      const minAttendance = parseFloat(minimumAttendance.value);
      const passing = parseFloat(passingGrade.value);
      const honor = parseFloat(honorRollGrade.value);
      
      // Validation checks
      if (minAttendance < 0 || minAttendance > 100) {
        showNotification("⚠️ Minimum attendance must be between 0-100%", "error");
        minimumAttendance.focus();
        return;
      }
      
      if (passing < 0 || passing > 100) {
        showNotification("⚠️ Passing grade must be between 0-100", "error");
        passingGrade.focus();
        return;
      }
      
      if (honor < 0 || honor > 100) {
        showNotification("⚠️ Honor roll grade must be between 0-100", "error");
        honorRollGrade.focus();
        return;
      }
      
      if (honor < passing) {
        showNotification("⚠️ Honor roll grade should be higher than passing grade", "error");
        honorRollGrade.focus();
        return;
      }
      
      if (!schoolName.value.trim()) {
        showNotification("⚠️ School name is required", "error");
        schoolName.focus();
        return;
      }
      
      if (!academicYear.value.trim()) {
        showNotification("⚠️ Academic year is required", "error");
        academicYear.focus();
        return;
      }
      
      if (currentSettings.grade_levels.length === 0) {
        showNotification("⚠️ At least one grade level is required", "error");
        return;
      }

      // Handle logo upload if a new file was selected
      let logoFilename = schoolLogo.value;
      if (schoolLogoFile.files.length > 0) {
        const formData = new FormData();
        formData.append("logo", schoolLogoFile.files[0]);
        
        const uploadResponse = await fetch("/admin/api/upload-logo", {
          method: "POST",
          body: formData,
        });
        
        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          logoFilename = uploadResult.filename;
          showNotification("✅ Logo uploaded successfully", "success");
        } else {
          showNotification("⚠️ Logo upload failed: " + uploadResult.message, "error");
          // Continue anyway with other settings
        }
      }

      const settingsData = {
        school_name: schoolName.value,
        school_logo: logoFilename,
        school_address: schoolAddress.value,
        school_contact: schoolContact.value,
        school_email: schoolEmail.value,
        academic_year: academicYear.value,
        current_term: currentTerm.value,
        grade_levels: currentSettings.grade_levels,
        sections_by_grade: currentSettings.sections_by_grade,
        subjects_by_grade: currentSettings.subjects_by_grade,
        default_score_weight: parseFloat(defaultScoreWeight.value) / 100,
        default_attendance_weight: parseFloat(defaultAttendanceWeight.value) / 100,
        allow_teacher_override: allowTeacherOverride.checked,
        minimum_attendance_percentage: minAttendance,
        passing_grade: passing,
        honor_roll_grade: honor,
      };

      const response = await fetch("/admin/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsData),
      });

      const data = await response.json();

      if (data.success) {
        showNotification("✅ Settings saved successfully! Refreshing...", "success");
        setTimeout(() => {
          closeSettings();
          // Reload to apply new settings
          window.location.reload();
        }, 1500);
      } else {
        showNotification("❌ Error: " + data.message, "error");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      showNotification("❌ Failed to save settings", "error");
    }
  }

  function showNotification(message, type) {
    settingsNotification.textContent = message;
    settingsNotification.className = `mb-4 p-3 rounded-lg ${
      type === "success"
        ? "bg-green-100 text-green-700 border border-green-200"
        : "bg-red-100 text-red-700 border border-red-200"
    }`;
    settingsNotification.classList.remove("hidden");

    setTimeout(() => {
      settingsNotification.classList.add("hidden");
    }, 5000);
  }

  // ====================================================
  // GLOBAL FUNCTIONS (called from inline onclick)
  // ====================================================

  window.removeGrade = (grade) => {
    if (confirm(`Remove Grade ${grade} and all its sections/subjects?`)) {
      currentSettings.grade_levels = currentSettings.grade_levels.filter(g => g !== grade);
      delete currentSettings.sections_by_grade[grade];
      delete currentSettings.subjects_by_grade[grade];
      renderGradeLevels();
      renderSections();
      renderSubjects();
    }
  };

  window.addSection = (grade) => {
    const section = prompt(`Add section name for Grade ${grade}:`);
    if (section) {
      const trimmedSection = section.trim();
      
      if (!trimmedSection) {
        showNotification("⚠️ Section name cannot be empty", "error");
        return;
      }
      
      if (!currentSettings.sections_by_grade[grade]) {
        currentSettings.sections_by_grade[grade] = [];
      }
      if (!currentSettings.sections_by_grade[grade].includes(trimmedSection)) {
        currentSettings.sections_by_grade[grade].push(trimmedSection);
        renderSections();
        showNotification(`✅ Section "${trimmedSection}" added to Grade ${grade}`, "success");
      } else {
        showNotification("⚠️ Section already exists for this grade", "error");
      }
    }
  };

  window.removeSection = (grade, section) => {
    if (confirm(`Remove section "${section}" from Grade ${grade}?`)) {
      if (currentSettings.sections_by_grade[grade]) {
        currentSettings.sections_by_grade[grade] = currentSettings.sections_by_grade[grade].filter(s => s !== section);
        renderSections();
        showNotification(`✅ Section "${section}" removed`, "success");
      }
    }
  };

  window.addSubject = (grade) => {
    const subject = prompt(`Add subject name for Grade ${grade}:`);
    if (subject) {
      const trimmedSubject = subject.trim();
      
      if (!trimmedSubject) {
        showNotification("⚠️ Subject name cannot be empty", "error");
        return;
      }
      
      if (!currentSettings.subjects_by_grade[grade]) {
        currentSettings.subjects_by_grade[grade] = [];
      }
      if (!currentSettings.subjects_by_grade[grade].includes(trimmedSubject)) {
        currentSettings.subjects_by_grade[grade].push(trimmedSubject);
        renderSubjects();
        showNotification(`✅ Subject "${trimmedSubject}" added to Grade ${grade}`, "success");
      } else {
        showNotification("⚠️ Subject already exists for this grade", "error");
      }
    }
  };

  window.removeSubject = (grade, subject) => {
    if (confirm(`Remove subject "${subject}" from Grade ${grade}?`)) {
      if (currentSettings.subjects_by_grade[grade]) {
        currentSettings.subjects_by_grade[grade] = currentSettings.subjects_by_grade[grade].filter(s => s !== subject);
        renderSubjects();
        showNotification(`✅ Subject "${subject}" removed`, "success");
      }
    }
  };
});
