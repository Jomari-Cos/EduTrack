// dashboard-core.js - Core dashboard functionality
window.SubjectClass = "";

function initDashboard() {
    console.log("📊 Initializing dashboard...");
    
    fillTeacherAssignedClasses();
    displayGradeAndSection();
    setupStudentFilter();
    initViewButtons();
    setupLogout();
    setupSearch();
}

function fillTeacherAssignedClasses() {
    const container = document.querySelector("[data-assigned-classes]");
    const select = document.getElementById("assignedClassSelect");
    if (!container || !select) return;

    const assignedClasses = JSON.parse(container.dataset.assignedClasses || "[]");
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

    if (select.options.length <= 1) {
        hideAllStudentCards();
        return;
    }

    select.addEventListener("change", async () => {
        const selected = select.value;
        if (!selected) return;

        const [grade, section, subject] = selected.split("-").map(s => s.trim());
        SubjectClass = subject;
        
        filterStudentsBySection(grade, section);
        
            // Save to server session
    await fetch("/set-current-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grade,
            section,
            subject,
            index: select.selectedIndex
        })
    });
        await Promise.all([
            loadQuickStats(grade, section, subject),
            loadTopStudents(grade, section, subject),
        ]);
    });
}

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

async function setupStudentFilter() {
    const select = document.getElementById("assignedClassSelect");
    if (!select) return;

    if (select.options.length <= 1) {
        hideAllStudentCards();
        return;
    }

    let index = 1; // default

    try {
        const res = await fetch("/get-current-class");
        const data = await res.json();

        if (data.index > 0 && data.index < select.options.length) {
            index = data.index;
        }
    } catch (err) {
        console.warn("Could not load saved class from session", err);
    }

    select.selectedIndex = index;

    const event = new Event("change");
    select.dispatchEvent(event);
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

function hideAllStudentCards() {
    const students = document.querySelectorAll(".student-card");
    students.forEach(student => {
        student.style.display = "none";
    });
    console.log("🟡 No assigned classes - all student cards hidden");
}

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

        if (!stats) return;

        // Update stats elements
        const setText = (id, value, fallback = "—") => {
            const el = document.getElementById(id);
            if (el) el.textContent = value ?? fallback;
        };

        setText("activeStudents", stats.active_students);
        setText("activeStudentsChange", `${stats.active_students_change}%`);
        const activeIcon = document.getElementById("activeStudentsChangeIcon");
        if (activeIcon) {
            const up = stats.active_students_change >= 0;
            activeIcon.textContent = up ? "arrow_upward" : "arrow_downward";
            activeIcon.className = `material-symbols-outlined text-base ${up ? "text-green-500" : "text-red-500"}`;
        }

        setText("averageEngagement", stats.average_engagement);
        setText("averageEngagementChange", `${stats.average_engagement_change}%`);
        const engagementIcon = document.getElementById("averageEngagementChangeIcon");
        if (engagementIcon) {
            const up = stats.average_engagement_change >= 0;
            engagementIcon.textContent = up ? "arrow_upward" : "arrow_downward";
            engagementIcon.className = `material-symbols-outlined text-base ${up ? "text-green-500" : "text-red-500"}`;
        }

        setText("needsAssistance", stats.needs_assistance);
        setText("needsAssistanceChange", stats.needs_assistance_change);

        updateAttendanceBar(stats.present, stats.total, stats.attendance_percent);
        
        loadTopStudents(grade, section, subject);
        
    } catch (err) {
        console.error("❌ Error loading quick stats:", err);
    }
}

function updateAttendanceBar(present, total, percent) {
    const countEl = document.getElementById("attendanceCount");
    const percentEl = document.getElementById("attendancePercent");
    const barEl = document.getElementById("attendanceBar");

    if (countEl) countEl.textContent = `${present ?? 0} / ${total ?? 0}`;
    if (percentEl) percentEl.textContent = `${percent ?? 0}%`;

    if (barEl) {
        barEl.style.transition = "width 0.7s ease-in-out";
        barEl.style.width = `${Math.min(percent, 100)}%`;

        barEl.classList.remove("bg-green-500", "bg-yellow-400", "bg-red-500");

        if (percent >= 90) {
            barEl.classList.add("bg-green-500");
        } else if (percent >= 70) {
            barEl.classList.add("bg-yellow-400");
        } else {
            barEl.classList.add("bg-red-500");
        }
    }
}

async function loadTopStudents(grade = "", section = "", subject = "") {
    try {
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

        if (!topStudents.length) {
            container.innerHTML = `
                <p class="text-gray-500 text-center py-4">
                    ${grade && section
                        ? `No top students found for Grade ${grade} - ${section}${subject ? ` (${subject})` : ""}`
                        : "No top students available."}
                </p>`;
            return;
        }

        const rankColors = ["text-green-600", "text-blue-600", "text-yellow-600"];
        const ringColors = ["ring-green-500", "ring-blue-500", "ring-yellow-500"];
        const bgColors = [
            "bg-gradient-to-r from-green-100/80 to-green-50/40",
            "bg-gradient-to-r from-blue-100/80 to-blue-50/40",
            "bg-gradient-to-r from-yellow-100/80 to-yellow-50/40"
        ];
        const rankEmojis = ["🥇", "🥈", "🥉"];

        const headerText = `🏆 Top Performers${grade && section ? ` - Grade ${grade} ${section}` : ""}${subject ? ` (${subject})` : ""}`;
        container.innerHTML += `
            <div class="mb-4 text-center">
                <h3 class="text-lg font-bold text-gray-800">${headerText}</h3>
                <p class="text-sm text-gray-600">Based on 70% academic performance + 30% attendance</p>
            </div>`;

        const getGradientBadge = (value) => {
            if (value >= 90) return "bg-gradient-to-r from-green-200/80 to-green-100/40 text-green-800";
            if (value >= 75) return "bg-gradient-to-r from-yellow-200/80 to-yellow-100/40 text-yellow-800";
            return "bg-gradient-to-r from-red-200/80 to-red-100/40 text-red-800";
        };

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

function setupSearch() {
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
}

function setupLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", showLogoutModal);
    }
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

    confirmBtn.addEventListener('click', () => {
        closeModal();
        fetch("/logout", {
            method: "POST"
        }).then(() => {
            window.location.href = "/";
        });
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}