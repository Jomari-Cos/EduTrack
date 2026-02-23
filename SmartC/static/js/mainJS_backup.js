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

  // Forgot Password elements
  const forgotPasswordLink = document.getElementById("forgot-password");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const closeForgotPasswordBtn = document.getElementById("closeForgotPasswordModal");

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

  // ============================================================================
  // FORGOT PASSWORD FUNCTIONALITY
  // ============================================================================

  // Open Forgot Password Modal
  forgotPasswordLink?.addEventListener("click", (e) => {
    e.preventDefault();
    forgotPasswordModal.classList.add("active");
  });

  // Close Forgot Password Modal
  closeForgotPasswordBtn?.addEventListener("click", () => {
    forgotPasswordModal.classList.remove("active");
    resetForgotPasswordForms();
  });

  // Close modal if click outside
  forgotPasswordModal?.addEventListener("click", (e) => {
    if (e.target === forgotPasswordModal) {
      forgotPasswordModal.classList.remove("active");
      resetForgotPasswordForms();
    }
  });

  // Tab switching
  const resetTabs = document.querySelectorAll(".reset-tab");
  const resetTabContents = document.querySelectorAll(".reset-tab-content");

  resetTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");
      
      // Update active tab
      resetTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      // Update active content
      resetTabContents.forEach(content => {
        content.classList.remove("active");
      });
      document.getElementById(`${tabName}ResetTab`).classList.add("active");
      
      // Reset forms when switching tabs
      resetForgotPasswordForms();
    });
  });

  // ============================================================================
  // EMAIL RESET FUNCTIONALITY
  // ============================================================================

  const emailResetForm = document.getElementById("emailResetForm");
  const emailResetMessage = document.getElementById("email-reset-message");

  emailResetForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const identifier = document.getElementById("reset-identifier").value.trim();
    const submitBtn = emailResetForm.querySelector(".reset-submit-btn");
    
    if (!identifier) {
      showResetMessage(emailResetMessage, "Please enter your Teacher ID or email", "error");
      return;
    }
    
    // Show loading state
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    emailResetMessage.classList.remove("show");
    
    try {
      const response = await fetch("/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showResetMessage(emailResetMessage, result.message, "success");
        emailResetForm.reset();
        
        // Close modal after 3 seconds
        setTimeout(() => {
          forgotPasswordModal.classList.remove("active");
          resetForgotPasswordForms();
        }, 3000);
      } else {
        showResetMessage(emailResetMessage, result.message, "error");
      }
    } catch (error) {
      console.error("Error requesting password reset:", error);
      showResetMessage(emailResetMessage, "Something went wrong. Please try again.", "error");
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });

  // ============================================================================
  // RFID RESET FUNCTIONALITY
  // ============================================================================

  const rfidResetForm = document.getElementById("rfidResetForm");
  const rfidScanStatus = document.getElementById("rfid-scan-status");
  const rfidCodeInput = document.getElementById("rfid-code-input");
  const passwordFields = document.getElementById("password-fields");
  const rfidResetMessage = document.getElementById("rfid-reset-message");
  
  const toggleNewPasswordBtn = document.getElementById("toggleNewPassword");
  const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPassword");
  const rfidNewPasswordInput = document.getElementById("rfid-new-password");
  const rfidConfirmPasswordInput = document.getElementById("rfid-confirm-password");

  // RFID scanning for password reset
  let rfidResetBuffer = "";
  let isRfidResetScanning = false;

  // Password visibility toggles for RFID reset
  toggleNewPasswordBtn?.addEventListener("click", () => {
    togglePasswordField(rfidNewPasswordInput, toggleNewPasswordBtn);
  });

  toggleConfirmPasswordBtn?.addEventListener("click", () => {
    togglePasswordField(rfidConfirmPasswordInput, toggleConfirmPasswordBtn);
  });

  function togglePasswordField(input, button) {
    const icon = button.querySelector(".material-symbols-outlined");
    if (input.type === "password") {
      input.type = "text";
      icon.textContent = "visibility_off";
    } else {
      input.type = "password";
      icon.textContent = "visibility";
    }
  }

  // RFID scanning logic for password reset
  document.addEventListener("keydown", (e) => {
    // Only scan when RFID reset tab is active and modal is open
    const rfidTab = document.getElementById("rfidResetTab");
    if (!forgotPasswordModal?.classList.contains("active") || 
        !rfidTab?.classList.contains("active")) {
      return;
    }

    // Handle Enter key (end of scan)
    if (e.key === "Enter" && isRfidResetScanning) {
      e.preventDefault();
      if (!rfidResetBuffer) return;

      rfidCodeInput.value = rfidResetBuffer;
      rfidScanStatus.textContent = "✅ RFID card verified! Please enter your new password.";
      rfidScanStatus.classList.remove("scanning");
      rfidScanStatus.style.color = "#059669";
      
      // Show password fields
      passwordFields.style.display = "block";
      
      isRfidResetScanning = false;
      rfidResetBuffer = "";
    }
    // Start scan on first character
    else if (!isRfidResetScanning && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      isRfidResetScanning = true;
      rfidResetBuffer = e.key;
      rfidScanStatus.textContent = `🔍 Scanning: ${'*'.repeat(rfidResetBuffer.length)}`;
      rfidScanStatus.classList.add("scanning");
      rfidResetMessage.classList.remove("show");
    }
    // Continue scanning
    else if (isRfidResetScanning && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      rfidResetBuffer += e.key;
      rfidScanStatus.textContent = `🔍 Scanning: ${'*'.repeat(rfidResetBuffer.length)}`;
    }
    // Handle backspace
    else if (isRfidResetScanning && e.key === "Backspace") {
      e.preventDefault();
      rfidResetBuffer = rfidResetBuffer.slice(0, -1);
      if (rfidResetBuffer.length === 0) {
        resetRfidResetScanning();
      } else {
        rfidScanStatus.textContent = `🔍 Scanning: ${'*'.repeat(rfidResetBuffer.length)}`;
      }
    }
  });

  function resetRfidResetScanning() {
    rfidResetBuffer = "";
    isRfidResetScanning = false;
    rfidScanStatus.textContent = "Please scan your RFID card...";
    rfidScanStatus.classList.remove("scanning");
    rfidScanStatus.style.color = "";
  }

  // RFID Reset Form Submission
  rfidResetForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const rfidCode = rfidCodeInput.value.trim();
    const newPassword = rfidNewPasswordInput.value.trim();
    const confirmPassword = rfidConfirmPasswordInput.value.trim();
    const submitBtn = rfidResetForm.querySelector(".reset-submit-btn");
    
    // Validation
    if (!rfidCode) {
      showResetMessage(rfidResetMessage, "Please scan your RFID card first", "error");
      return;
    }
    
    if (!newPassword || newPassword.length < 6) {
      showResetMessage(rfidResetMessage, "Password must be at least 6 characters long", "error");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showResetMessage(rfidResetMessage, "Passwords do not match", "error");
      return;
    }
    
    // Show loading state
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    rfidResetMessage.classList.remove("show");
    
    try {
      const response = await fetch("/reset-password-rfid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfid_code: rfidCode,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showResetMessage(rfidResetMessage, result.message, "success");
        
        // Close modal and redirect after 2 seconds
        setTimeout(() => {
          forgotPasswordModal.classList.remove("active");
          resetForgotPasswordForms();
        }, 2000);
      } else {
        showResetMessage(rfidResetMessage, result.message, "error");
      }
    } catch (error) {
      console.error("Error resetting password with RFID:", error);
      showResetMessage(rfidResetMessage, "Something went wrong. Please try again.", "error");
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function showResetMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = `reset-message ${type} show`;
  }

  function resetForgotPasswordForms() {
    // Reset email form
    emailResetForm?.reset();
    emailResetMessage?.classList.remove("show");
    
    // Reset RFID form
    rfidResetForm?.reset();
    rfidCodeInput.value = "";
    passwordFields.style.display = "none";
    rfidResetMessage?.classList.remove("show");
    resetRfidResetScanning();
    
    // Reset password field types
    if (rfidNewPasswordInput) rfidNewPasswordInput.type = "password";
    if (rfidConfirmPasswordInput) rfidConfirmPasswordInput.type = "password";
    
    // Reset toggle button icons
    const newPwdIcon = toggleNewPasswordBtn?.querySelector(".material-symbols-outlined");
    const confirmPwdIcon = toggleConfirmPasswordBtn?.querySelector(".material-symbols-outlined");
    if (newPwdIcon) newPwdIcon.textContent = "visibility";
    if (confirmPwdIcon) confirmPwdIcon.textContent = "visibility";
  }
});