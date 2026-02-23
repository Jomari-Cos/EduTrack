// CSS-based fullscreen (no browser restrictions!)
function toggleFullScreen() {
  const body = document.body;
  const html = document.documentElement;
  
  if (!body.classList.contains('css-fullscreen')) {
    // Enter CSS fullscreen
    body.classList.add('css-fullscreen');
    html.classList.add('css-fullscreen');
    sessionStorage.setItem('fullscreenMode', 'true');
    
    // Update button text if exists
    const btn = document.getElementById('fullscreenBtn');
    if (btn) btn.textContent = 'Exit Fullscreen';
  } else {
    // Exit CSS fullscreen
    body.classList.remove('css-fullscreen');
    html.classList.remove('css-fullscreen');
    sessionStorage.setItem('fullscreenMode', 'false');
    
    // Update button text if exists
    const btn = document.getElementById('fullscreenBtn');
    if (btn) btn.textContent = 'Go Fullscreen';
  }
}

// Apply fullscreen styles
function applyFullscreenStyles() {
  if (!document.getElementById('cssFullscreenStyles')) {
    const style = document.createElement('style');
    style.id = 'cssFullscreenStyles';
    style.textContent = `
      body.css-fullscreen,
      html.css-fullscreen {
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: auto !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        background: #f9fafb !important;
        z-index: 999999 !important;
      }
      
      body.css-fullscreen {
        overflow-y: auto !important;
      }
      
      /* Hide scrollbars but keep scrolling */
      body.css-fullscreen::-webkit-scrollbar {
        width: 8px;
      }
      
      body.css-fullscreen::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      body.css-fullscreen::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
      }
      
      body.css-fullscreen::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
    `;
    document.head.appendChild(style);
  }
}

// Restore fullscreen state on page load
function restoreFullscreenState() {
  applyFullscreenStyles();
  
  const shouldBeFullscreen = sessionStorage.getItem('fullscreenMode') === 'true';
  
  if (shouldBeFullscreen) {
    document.body.classList.add('css-fullscreen');
    document.documentElement.classList.add('css-fullscreen');
    
    // Update button text if exists
    setTimeout(() => {
      const btn = document.getElementById('fullscreenBtn');
      if (btn) btn.textContent = 'Exit Fullscreen';
    }, 100);
  }
}

// Initialize immediately
restoreFullscreenState();

// Also restore when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  restoreFullscreenState();
  
  // Attach to button
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullScreen);
  }
  
  const goBackBtn = document.getElementById('goBack');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', function() {
      if (document.referrer) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    });
  }
});
