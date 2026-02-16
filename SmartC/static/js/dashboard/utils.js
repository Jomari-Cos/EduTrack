// utils.js - Utility functions used across the application

// 🍞 Toast Notification System
function showToast(message, type = "info") {
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

    const toast = document.createElement("div");
    const toastId = "toast-" + Date.now();
    toast.id = toastId;
    
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

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = "translateX(0)";
        toast.style.opacity = "1";
    }, 10);

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

// 🗣️ Text-to-Speech
function speak(text) {
    if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-US";
        utter.rate = 1.0;
        speechSynthesis.speak(utter);
    }
}

// 🔧 Format Date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 🔢 Format Number with Commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 🎯 Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 🎨 Generate Random Color
function getRandomColor() {
    const colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#06B6D4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Export functions for use in other modules
window.showToast = showToast;
window.speak = speak;
window.formatDate = formatDate;
window.formatNumber = formatNumber;