// teacher-profiles.js - Teacher profile modals
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

function showTeacherModal(teacher) {
    if (!document.getElementById("teacherModal")) {
        const modalHTML = `
            <div id="teacherModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-95 opacity-0">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-xl font-bold text-gray-900">Teacher Details</h3>
                            <button id="closeTeacherModalBtn" class="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
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

    document.getElementById("modalTeacherName").textContent = teacher.name || "N/A";
    document.getElementById("modalTeacherEmail").textContent = teacher.email || "N/A";
    document.getElementById("modalTeacherGender").textContent = teacher.gender || "Not specified";
    document.getElementById("modalTeacherPhone").textContent = teacher.contact_info || teacher.phone || "Not provided";
    document.getElementById("modalTeacherStatus").textContent = teacher.status || "Active";
    document.getElementById("modalTeacherAge").textContent = teacher.age ? `Age: ${teacher.age}` : "";

    const avatarEl = document.getElementById("modalTeacherAvatar");
    if (teacher.photo) {
        avatarEl.innerHTML = `<img src="${teacher.photo}" alt="${teacher.name}" class="w-20 h-20 rounded-full object-cover">`;
    } else {
        avatarEl.textContent = teacher.name ? teacher.name[0].toUpperCase() : "?";
    }

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

    modal.classList.remove("hidden");
    setTimeout(() => {
        modalContent.classList.remove("scale-95", "opacity-0");
        modalContent.classList.add("scale-100", "opacity-100");
    }, 50);

    const closeBtn = document.getElementById("closeTeacherModalBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeTeacherModal);
    }
}

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

window.closeTeacherModal = closeTeacherModal;

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTeacherModal();
});

document.addEventListener("click", (e) => {
    const modal = document.getElementById("teacherModal");
    if (!modal) return;
    if (e.target === modal) closeTeacherModal();
});