document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("message");

  // Password toggle elements
  const togglePasswordBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");

  // Modal elements
  const rfidModal = document.getElementById("rfidModal");
  const openRfidBtn = document.getElementById("rfid-button");
  const closeRfidBtn = document.getElementById("closeRfidModal");
  const rfidResult = document.getElementById("rfidResult");

  // Password visibility state
  let isPasswordVisible = false;

  // 👉 Password toggle functionality
  togglePasswordBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    togglePasswordVisibility();
  });

  function togglePasswordVisibility() {
    isPasswordVisible = !isPasswordVisible;
    
    // Toggle password field type
    passwordInput.type = isPasswordVisible ? 'text' : 'password';
    
    // Update button icon and accessibility
    const icon = togglePasswordBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = isPasswordVisible ? 'visibility_off' : 'visibility';
    }
    
    // Update accessibility label
    togglePasswordBtn.setAttribute('aria-label', 
      isPasswordVisible ? 'Hide password' : 'Show password'
    );
  }

  // 👉 Open RFID modal
  openRfidBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    rfidModal.classList.add("active");
    if (rfidResult) {
      rfidResult.textContent = "📱 Scan RFID card...";
      rfidResult.style.color = "";
    }
  });

  // 👉 Close RFID modal
  closeRfidBtn?.addEventListener("click", () => {
    rfidModal.classList.remove("active");
  });

  // 👉 Close modal if click outside
  rfidModal?.addEventListener("click", (e) => {
    if (e.target === rfidModal) rfidModal.classList.remove("active");
  });

// 👉 Username/Password login
form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (result.success) {
      // Show green checkmark animation
      showGreenCheckmarkAnimation();
      
      // Redirect after delay
      setTimeout(() => {
        window.location.href = result.redirect;
      }, 1500);
      
    } else {
      message.style.color = "red";
      message.textContent = result.message || "Invalid credentials!";
    }
  } catch (error) {
    console.error("Error during login:", error);
    message.style.color = "red";
    message.textContent = "Something went wrong. Try again.";
  }
});

function showGreenCheckmarkAnimation() {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'checkmark-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;

  // Create checkmark container
  const checkmarkContainer = document.createElement('div');
  checkmarkContainer.style.cssText = `
    background: white;
    padding: 3rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: scaleIn 0.4s ease-out;
  `;

  // Create checkmark circle
  const checkmarkCircle = document.createElement('div');
  checkmarkCircle.style.cssText = `
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: #10B981;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    position: relative;
    animation: circlePulse 2s ease-in-out;
  `;

  // Create checkmark icon
  const checkmarkIcon = document.createElement('div');
  checkmarkIcon.innerHTML = `
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17L4 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="checkmark-path"/>
    </svg>
  `;
  checkmarkIcon.style.cssText = `
    animation: checkmarkFill 0.5s ease-in-out 0.3s both;
  `;

  // Create success text
  const successText = document.createElement('div');
  successText.textContent = 'Login Successful!';
  successText.style.cssText = `
    font-size: 1.3rem;
    font-weight: 600;
    color: #10B981;
    margin-bottom: 0.5rem;
  `;

  // Create redirect text
  const redirectText = document.createElement('div');
  redirectText.textContent = 'Redirecting...';
  redirectText.style.cssText = `
    font-size: 1rem;
    color: #6B7280;
  `;

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.8);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes circlePulse {
      0% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
      }
      70% {
        box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
    }
    
    @keyframes checkmarkFill {
      0% {
        stroke-dasharray: 0, 100;
        opacity: 0;
      }
      100% {
        stroke-dasharray: 100, 0;
        opacity: 1;
      }
    }
    
    .checkmark-path {
      stroke-dasharray: 0, 100;
      animation: checkmarkFill 0.5s ease-in-out 0.3s both;
    }
  `;
  document.head.appendChild(style);

  // Assemble the elements
  checkmarkCircle.appendChild(checkmarkIcon);
  checkmarkContainer.appendChild(checkmarkCircle);
  checkmarkContainer.appendChild(successText);
  checkmarkContainer.appendChild(redirectText);
  overlay.appendChild(checkmarkContainer);
  document.body.appendChild(overlay);

  // Auto-remove after redirect
  setTimeout(() => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  }, 2000);
}

  // 👉 RFID login (one-time scan)
  (function() {
    let rfidBuffer = "";
    let isScanning = false;

    document.addEventListener("keydown", async (e) => {
      if (!rfidModal?.classList.contains("active")) return;

      // Handle Enter key (end of scan)
      if (e.key === "Enter" && isScanning) {
        e.preventDefault();
        if (!rfidBuffer) return;

        rfidResult.textContent = "🔄 Processing...";
        rfidResult.style.color = "blue";

        try {
          const response = await fetch("/login-rfid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rfid_code: rfidBuffer }),
          });

          const result = await response.json();

          if (result.success) {
            rfidResult.innerHTML = "✅ <strong>ACCESS GRANTED</strong>";
            rfidResult.style.color = "green";
            message.style.color = "green";
            message.textContent = "RFID Login successful! Redirecting...";

            setTimeout(() => {
              rfidModal.classList.remove("active");
              window.location.href = result.redirect;
            }, 1500);
          } else {
            rfidResult.innerHTML = "❌ <strong>ACCESS DENIED</strong>";
            rfidResult.style.color = "red";
            message.style.color = "red";
            message.textContent = result.message || "Invalid RFID card!";
            setTimeout(resetScanning, 3000);
          }
        } catch (error) {
          console.error("Error during RFID login:", error);
          rfidResult.innerHTML = "❌ <strong>SYSTEM ERROR</strong>";
          rfidResult.style.color = "red";
          message.style.color = "red";
          message.textContent = "Network error. Please try again.";
          setTimeout(resetScanning, 3000);
        }
      } 
      // Start scan on first character
      else if (!isScanning && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        isScanning = true;
        rfidBuffer = e.key;
        rfidResult.textContent = `🔍 Scanning: ${'*'.repeat(rfidBuffer.length)}`;
        rfidResult.style.color = "orange";
        message.textContent = "";
      } 
      // Continue scanning
      else if (isScanning && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        rfidBuffer += e.key;
        rfidResult.textContent = `🔍 Scanning: ${'*'.repeat(rfidBuffer.length)}`;
      } 
      // Handle backspace
      else if (isScanning && e.key === "Backspace") {
        e.preventDefault();
        rfidBuffer = rfidBuffer.slice(0, -1);
        if (rfidBuffer.length === 0) resetScanning();
        else rfidResult.textContent = `🔍 Scanning: ${'*'.repeat(rfidBuffer.length)}`;
      }
    });

    function resetScanning() {
      rfidBuffer = "";
      isScanning = false;
      if (rfidResult) {
        rfidResult.textContent = "📱 Scan RFID card...";
        rfidResult.style.color = "";
      }
      if (message) message.textContent = "";
    }
  })();
});