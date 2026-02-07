// charts-analytics.js - Charts and analytics functions
function initCharts() {
    console.log("📈 Initializing charts...");
    
    fillCharts();
    populateSectionDropdown();
}

async function fillCharts(section = "") {
    try {
        const res = await fetch(`/chart-data${section ? `?section=${encodeURIComponent(section)}` : ""}`);
        const data = await res.json();

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

        createAttendanceChart(data.attendance);
        createScoreChart(data.scores);
        createAverageChart(data.average);
        createMetricChart(data.metric);
        createCorrelationChart(data.correlation);
        createTrendChart(data.attendance_trend);

    } catch (err) {
        console.error("Failed to fetch chart data:", err);
    }
}

function createAttendanceChart(data) {
    const ctxAttendance = document.getElementById("attendanceChart").getContext("2d");
    const gradientAttendance = ctxAttendance.createLinearGradient(0, 0, 0, ctxAttendance.canvas.height);
    gradientAttendance.addColorStop(0, "rgba(34, 197, 94, 0.8)");
    gradientAttendance.addColorStop(1, "rgba(34, 197, 94, 0.2)");

    window.attendanceChartInstance = new Chart(ctxAttendance, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Attendance (Present Days)",
                data: data.values,
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
}

function createScoreChart(data) {
    const ctxScores = document.getElementById("scoreChart").getContext("2d");
    const gradientScores = ctxScores.createLinearGradient(0, 0, 0, ctxScores.canvas.height);
    gradientScores.addColorStop(0, "rgba(59, 130, 246, 0.6)");
    gradientScores.addColorStop(1, "rgba(59, 130, 246, 0.1)");

    window.scoreChartInstance = new Chart(ctxScores, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Average Score per Subject",
                data: data.values,
                backgroundColor: gradientScores,
                borderColor: "rgba(59, 130, 246, 1)",
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function createAverageChart(data) {
    const ctxAverage = document.getElementById("averageScoreChart").getContext("2d");
    const gradientAverage = ctxAverage.createLinearGradient(0, 0, 0, ctxAverage.canvas.height);
    gradientAverage.addColorStop(0, "rgba(251, 191, 36, 0.8)");
    gradientAverage.addColorStop(1, "rgba(251, 191, 36, 0.2)");

    window.averageChartInstance = new Chart(ctxAverage, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Average Score per Class",
                data: data.values,
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
}

function createMetricChart(data) {
    const ctxMetric = document.getElementById("metricChart").getContext("2d");
    const gradientMetric = ctxMetric.createLinearGradient(0, 0, 0, ctxMetric.canvas.height);
    gradientMetric.addColorStop(0, "rgba(236, 72, 153, 0.6)");
    gradientMetric.addColorStop(1, "rgba(236, 72, 153, 0.1)");

    window.metricChartInstance = new Chart(ctxMetric, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Weekly Points Awarded",
                data: data.values,
                backgroundColor: gradientMetric,
                borderColor: "rgba(236, 72, 153, 1)",
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function createCorrelationChart(data) {
    const ctxCorrelation = document.getElementById("ScoreVsAttendance").getContext("2d");
    const gradientCorrelation = ctxCorrelation.createLinearGradient(0, 0, 0, ctxCorrelation.canvas.height);
    gradientCorrelation.addColorStop(0, "rgba(16, 185, 129, 0.6)");
    gradientCorrelation.addColorStop(1, "rgba(16, 185, 129, 0.1)");

    window.correlationChartInstance = new Chart(ctxCorrelation, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Score vs. Attendance",
                data: data.values,
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
}

function createTrendChart(data) {
    const ctxTrend = document.getElementById("attendanceTrendChart").getContext("2d");
    const gradientTrend = ctxTrend.createLinearGradient(0, 0, 0, ctxTrend.canvas.height);
    gradientTrend.addColorStop(0, "rgba(99, 102, 241, 0.7)");
    gradientTrend.addColorStop(1, "rgba(99, 102, 241, 0.1)");

    window.trendChartInstance = new Chart(ctxTrend, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Present Students per Week",
                data: data.values,
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
}

function populateSectionDropdown() {
    const container = document.querySelector("[data-assigned-classes]");
    const sectionSelect = document.getElementById("sectionSelect");
    const startDateInput = document.getElementById("sdate");
    const endDateInput = document.getElementById("edate");

    if (!container || !sectionSelect || !startDateInput || !endDateInput) return;

    const assignedClasses = JSON.parse(container.dataset.assignedClasses || "[]");

    sectionSelect.innerHTML = '<option value="">Choose Section</option>';

    const sections = [...new Set(assignedClasses.map(cls => cls.section))];

    sections.forEach(section => {
        const option = document.createElement("option");
        option.value = section;
        option.textContent = section;
        sectionSelect.appendChild(option);
    });

    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);

    const formatDate = (d) => d.toISOString().split("T")[0];
    startDateInput.value = formatDate(pastDate);
    endDateInput.value = formatDate(today);

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

        await fillCharts(selectedSection, startDate, endDate);
    }

    sectionSelect.addEventListener("change", updateCharts);
    startDateInput.addEventListener("change", updateCharts);
    endDateInput.addEventListener("change", updateCharts);

    if (sections.length > 0) {
        sectionSelect.value = sections[0];
        updateCharts();
    }
}