/**
 * Virtual On-Screen Keyboard with Special Characters and Enye
 * Automatically appears when any text input or textarea is focused
 */

class VirtualKeyboard {
    constructor() {
        this.activeInput = null;
        this.isCapsLock = false;
        this.isShift = false;
        this.keyboardElement = null;
        this.styleElement = null;
        
        // New properties for special characters
        this.currentLayout = 'default'; // 'default', 'special1', 'special2', 'symbols'
        this.layouts = {
            default: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
                ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
                [' ', '.com', '@', '.']
            ],
            special1: [
                ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
                ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
                ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
                [' ', '.com', '@', '.']
            ],
            special2: [
                ['[', ']', '{', '}', '(', ')', '<', '>', '=', '+'],
                ['-', '_', '|', '\\', '/', ':', ';', '"', "'", '`'],
                ['~', '!', '@', '#', '$', '%', '^', '&', '*', 'ñ'],
                ['€', '£', '¥', '¢', '©', '®', '™', '±', '÷', 'Ñ'],
                [' ', '.com', '@', '.']
            ],
            symbols: [
                ['😊', '😂', '❤️', '👍', '🎉', '✨', '🌟', '⭐', '💫', '⚡'],
                ['♠', '♥', '♦', '♣', '♤', '♡', '♢', '♧', '☀', '☁'],
                ['☂', '☃', '★', '☆', '☎', '☏', '✉', '✎', '✏', 'ñ'],
                ['✓', '✔', '✕', '✖', '✗', '✘', '♩', '♪', '♫', 'Ñ'],
                [' ', '.com', '@', '.']
            ],
            accented: [
                ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', 'Á', 'É', 'Í'],
                ['Ó', 'Ú', 'Ü', 'Ñ', 'â', 'ê', 'î', 'ô', 'û', 'Â'],
                ['Ê', 'Î', 'Ô', 'Û', 'à', 'è', 'ì', 'ò', 'ù', 'À'],
                ['È', 'Ì', 'Ò', 'Ù', 'ã', 'õ', 'Ã', 'Õ', 'ç', 'Ç'],
                [' ', '.com', '@', '.']
            ]
        };
        
        this.init();
    }

    init() {
        // Add CSS styles
        this.addStyles();
        
        // Create keyboard HTML
        this.createKeyboard();
        
        // Attach event listeners
        this.attachInputListeners();
        
        // Handle outside clicks
        this.handleOutsideClicks();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.activeInput) {
                this.adjustKeyboardPosition();
            }
        });

        // Add global input listener
        document.addEventListener('input', (e) => {
            if (e.target === this.activeInput) {
                this.updatePreview();
            }
        });
    }

    addStyles() {
        const styles = `
            .virtual-keyboard-container {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #D1D5DB;
                padding: 10px 5px;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
                transform: translateY(100%);
                transition: transform 0.3s ease;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .virtual-keyboard-container.show {
                transform: translateY(0);
            }
            
            .keyboard-header {
                display: flex;
                justify-content: space-between;
                padding: 5px 10px;
                background: #9CA3AF;
                border-radius: 8px 8px 0 0;
                margin: -10px -5px 10px -5px;
            }
            
            .keyboard-layout-tools {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            .keyboard-layout-btn {
                background: #4B5563;
                border: none;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s;
            }
            
            .keyboard-layout-btn:hover {
                background: #374151;
            }
            
            .keyboard-layout-btn.active {
                background: #10B981;
                box-shadow: 0 2px 0 #047857;
            }
            
            .keyboard-close-btn {
                background: #4B5563;
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .keyboard-close-btn:hover {
                background: #374151;
            }
            
            .keyboard-close-btn:active {
                background: #1F2937;
            }
            
            .keyboard-preview {
                background: white;
                border-radius: 8px;
                padding: 12px 15px;
                margin-bottom: 15px;
                min-height: 50px;
                display: flex;
                align-items: center;
                font-size: 16px;
                border: 2px solid #9CA3AF;
                box-shadow: inset 0 2px 5px rgba(0,0,0,0.1);
                position: relative;
                overflow-x: auto;
                white-space: nowrap;
                cursor: text;
            }
            
            .preview-content {
                display: inline-flex;
                align-items: center;
                position: relative;
                min-height: 24px;
                font-family: monospace;
            }
            
            .preview-text {
                display: inline-block;
                white-space: pre;
                color: #1F2937;
            }
            
            .preview-text.placeholder {
                color: #9CA3AF;
                font-style: italic;
            }
            
            .preview-cursor-container {
                display: inline-block;
                position: relative;
                width: 0;
                height: 24px;
            }
            
            .preview-cursor {
                position: absolute;
                width: 2px;
                height: 24px;
                background: #3B82F6;
                animation: blink 1s infinite;
                transform: translateX(-50%);
            }
            
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
            
            .keyboard-keys {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .keyboard-row {
                display: flex;
                gap: 5px;
                justify-content: center;
            }
            
            .keyboard-key {
                background: white;
                border: none;
                border-radius: 8px;
                padding: 15px 0;
                min-width: 40px;
                flex: 1;
                font-size: 18px;
                font-weight: 500;
                color: #1F2937;
                box-shadow: 0 3px 0 #9CA3AF;
                cursor: pointer;
                transition: all 0.1s ease;
                text-align: center;
                user-select: none;
                touch-action: manipulation;
            }
            
            .keyboard-key:active {
                transform: translateY(3px);
                box-shadow: none;
                background: #E5E7EB;
            }
            
            .keyboard-key.special {
                background: #9CA3AF;
                color: white;
                box-shadow: 0 3px 0 #4B5563;
                font-weight: bold;
            }
            
            .keyboard-key.special:active {
                background: #6B7280;
            }
            
            .keyboard-key.arrow {
                background: #6B7280;
                color: white;
                box-shadow: 0 3px 0 #374151;
                font-size: 20px;
            }
            
            .keyboard-key.arrow:active {
                background: #4B5563;
            }
            
            .keyboard-key.space {
                flex: 3;
            }
            
            .keyboard-key.enter {
                background: #3B82F6;
                box-shadow: 0 3px 0 #1E40AF;
                color: white;
            }
            
            .keyboard-key.enter:active {
                background: #2563EB;
            }
            
            .keyboard-key.backspace {
                background: #EF4444;
                box-shadow: 0 3px 0 #B91C1C;
                color: white;
            }
            
            .keyboard-key.backspace:active {
                background: #DC2626;
            }
            
            .keyboard-key.shift.active,
            .keyboard-key.capslock.active {
                background: #10B981;
                box-shadow: 0 3px 0 #047857;
                color: white;
            }
            
            .keyboard-key.capslock {
                background: #F59E0B;
                box-shadow: 0 3px 0 #B45309;
                color: white;
                font-weight: bold;
            }
            
            .keyboard-key.capslock:active {
                background: #D97706;
            }
            
            .keyboard-key.symbol {
                background: #8B5CF6;
                box-shadow: 0 3px 0 #5B21B6;
                color: white;
            }
            
            .keyboard-key.symbol:active {
                background: #7C3AED;
            }
            
            .keyboard-key.enye {
                background: #EC4899;
                box-shadow: 0 3px 0 #9D174D;
                color: white;
                font-weight: bold;
            }
            
            .keyboard-key.enye:active {
                background: #DB2777;
            }
            
            .keyboard-active-input {
                outline: 3px solid #3B82F6 !important;
                outline-offset: 2px !important;
                transition: outline 0.2s ease;
            }
            
            @media (max-width: 600px) {
                .keyboard-key {
                    padding: 12px 0;
                    font-size: 16px;
                    min-width: 30px;
                }
                
                .keyboard-preview {
                    min-height: 40px;
                    padding: 8px 12px;
                }
                
                .keyboard-layout-btn {
                    padding: 4px 6px;
                    font-size: 12px;
                }
            }
        `;
        
        this.styleElement = document.createElement('style');
        this.styleElement.textContent = styles;
        document.head.appendChild(this.styleElement);
    }

    createKeyboard() {
        const keyboardHTML = `
            <div class="virtual-keyboard-container" id="virtualKeyboard">
                <div class="keyboard-header">
                    <div class="keyboard-layout-tools">
                        <button class="keyboard-layout-btn" data-layout="default">ABC</button>
                        <button class="keyboard-layout-btn" data-layout="special1">!@#</button>
                        <button class="keyboard-layout-btn" data-layout="special2">{}[]</button>
                        <button class="keyboard-layout-btn" data-layout="accented">áéí</button>
                        <button class="keyboard-layout-btn" data-layout="symbols">😊✨</button>
                    </div>
                    <button class="keyboard-close-btn" id="keyboardCloseBtn">✕</button>
                </div>
                <div class="keyboard-preview" id="keyboardPreview">
                    <div class="preview-content" id="previewContent">
                        <span class="preview-text" id="previewText"></span>
                        <span class="preview-cursor-container" id="cursorContainer">
                            <span class="preview-cursor"></span>
                        </span>
                    </div>
                </div>
                <div class="keyboard-keys" id="keyboardKeys"></div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', keyboardHTML);
        this.keyboardElement = document.getElementById('virtualKeyboard');
        
        // Create initial keyboard layout
        this.renderKeyboardLayout('default');
        
        // Attach layout toggle listeners
        this.attachLayoutListeners();
        
        // Attach keyboard key listeners
        this.attachKeyListeners();
        
        // Close button
        document.getElementById('keyboardCloseBtn').addEventListener('click', () => {
            this.hideKeyboard();
        });
        
        // Add click handler to preview to move cursor
        document.getElementById('keyboardPreview').addEventListener('click', (e) => {
            if (this.activeInput) {
                this.activeInput.focus();
            }
        });
    }

    renderKeyboardLayout(layoutName) {
        const keysContainer = document.getElementById('keyboardKeys');
        if (!keysContainer) return;
        
        const layout = this.layouts[layoutName] || this.layouts.default;
        let html = '';
        
        // Add standard control keys at the top of each layout
        for (let i = 0; i < layout.length; i++) {
            html += '<div class="keyboard-row">';
            
            // Add shift key before letter rows if this is the default layout
            if (layoutName === 'default' && i === 3) {
                html += '<button class="keyboard-key special shift" data-key="Shift">⇧</button>';
            }
            
            // Add CapsLock key before the third row (where enye is)
            if (layoutName === 'default' && i === 2) {
                html += '<button class="keyboard-key special capslock" data-key="CapsLock">⇪</button>';
            }
            
            for (let j = 0; j < layout[i].length; j++) {
                const key = layout[i][j];
                let keyClass = 'keyboard-key';
                let dataKey = key;
                
                if (key === ' ') {
                    keyClass += ' space';
                    dataKey = ' ';
                } else if (key === '.com') {
                    keyClass += ' special';
                } else if (key === '@' || key === '.') {
                    keyClass += ' special';
                } else if (key === 'ñ' || key === 'Ñ') {
                    keyClass += ' enye';
                } else if (key.length > 1 && !key.match(/[a-z0-9]/i)) {
                    // For multi-character symbols or emojis
                    keyClass += ' symbol';
                }
                
                html += `<button class="${keyClass}" data-key="${dataKey}">${key}</button>`;
            }
            
            // Add backspace and other control keys
            if (layoutName === 'default') {
                if (i === 0) {
                    // No backspace on first row
                } else if (i === 3) {
                    html += '<button class="keyboard-key special backspace" data-key="Backspace">⌫</button>';
                }
            } else {
                if (i === layout.length - 1) {
                    // Add backspace at end of last row
                    html += '<button class="keyboard-key special backspace" data-key="Backspace">⌫</button>';
                }
            }
            
            html += '</div>';
        }
        
        // Add bottom row with special keys including left and right arrows between . and Enter
        html += `
            <div class="keyboard-row">
                <button class="keyboard-key special" data-key="123">123</button>
                <button class="keyboard-key special shift" data-key="Shift">⇧</button>
                <button class="keyboard-key special space" data-key=" ">space</button>
                <button class="keyboard-key special" data-key=".">.</button>
                <button class="keyboard-key special arrow" data-key="ArrowLeft">←</button>
                <button class="keyboard-key special arrow" data-key="ArrowRight">→</button>
                <button class="keyboard-key special enter" data-key="Enter">↵ Enter</button>
            </div>
        `;
        
        keysContainer.innerHTML = html;
        
        // Update active states
        this.updateKeyDisplay();
    }

    attachLayoutListeners() {
        const layoutBtns = this.keyboardElement.querySelectorAll('.keyboard-layout-btn');
        
        layoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const layout = btn.dataset.layout;
                
                // Remove active class from all layout buttons
                layoutBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Change layout
                this.currentLayout = layout;
                this.renderKeyboardLayout(layout);
                
                // Re-attach key listeners for new keys
                this.attachKeyListeners();
                
                // Reset shift state
                this.isShift = false;
                this.updateKeyDisplay();
            });
        });
    }

    attachInputListeners() {
        // Listen for focus events on all inputs and textareas
        document.addEventListener('focusin', (e) => {
            const target = e.target;
            
            // Check if target is an input or textarea
            if ((target.tagName === 'INPUT' && 
                 ['text', 'email', 'tel', 'number', 'password', 'search', 'url'].includes(target.type)) ||
                target.tagName === 'TEXTAREA') {
                
                // Skip if it's a readonly or disabled field
                if (target.readOnly || target.disabled) {
                    return;
                }
                
                this.activeInput = target;
                this.showKeyboard();
                
                // Move cursor to the end for all field types including email
                setTimeout(() => {
                    if (this.activeInput) {
                        const len = this.activeInput.value.length;
                        
                        // For email inputs, store virtual cursor position
                        if (this.activeInput.type === 'email') {
                            this.activeInput.dataset.virtualCursor = len;
                        } else {
                            // For other inputs, we can use setSelectionRange
                            this.activeInput.focus();
                            this.activeInput.setSelectionRange(len, len);
                        }
                        
                        // Force update preview after cursor is set
                        this.updatePreview();
                    }
                }, 50);
                
                target.classList.add('keyboard-active-input');
            }
        });
        
        // Remove highlight when input loses focus
        document.addEventListener('focusout', (e) => {
            if (e.target.classList.contains('keyboard-active-input')) {
                e.target.classList.remove('keyboard-active-input');
            }
            
            // Don't immediately clear activeInput to allow for preview updates
            setTimeout(() => {
                if (this.activeInput && document.activeElement !== this.activeInput) {
                    // Only clear if focus is truly gone
                    if (!document.activeElement || document.activeElement !== this.activeInput) {
                        this.activeInput = null;
                        this.updatePreview();
                    }
                }
            }, 100);
        });
        
        // Track cursor position changes
        document.addEventListener('selectionchange', () => {
            if (this.activeInput && document.activeElement === this.activeInput) {
                this.updatePreview();
            }
        });
    }

    attachKeyListeners() {
        const keys = this.keyboardElement.querySelectorAll('.keyboard-key');
        
        keys.forEach(key => {
            // Remove existing listeners to avoid duplicates
            key.removeEventListener('click', this.keyClickHandler);
            key.removeEventListener('touchstart', this.touchHandler);
            key.removeEventListener('mousedown', this.mouseDownHandler);
            
            // Add new listeners
            key.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const keyValue = key.dataset.key;
                this.handleKeyPress(keyValue, key);
            });
            
            // Prevent touch events from triggering other handlers
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
            });
            
            // Add mousedown to prevent blur
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
        });
    }

    handleKeyPress(keyValue, keyElement) {
        if (!this.activeInput) return;
        
        const input = this.activeInput;
        const isEmail = input.type === 'email';
        
        // Get current cursor position
        let start, end;
        
        if (isEmail) {
            // For email fields, use virtual cursor
            start = parseInt(input.dataset.virtualCursor);
            end = start;
            if (isNaN(start) || start < 0) {
                start = input.value.length;
                end = input.value.length;
            }
        } else {
            // For normal inputs, use actual selection
            start = input.selectionStart;
            end = input.selectionEnd;
            
            // If selection is invalid or null, move to end
            if (start === null || start === undefined || start < 0) {
                start = input.value.length;
                end = input.value.length;
            }
        }
        
        const value = input.value;
        
        // Handle special layout toggle
        if (keyValue === '123') {
            // Toggle to numbers/symbols layout
            const layoutBtns = this.keyboardElement.querySelectorAll('.keyboard-layout-btn');
            if (this.currentLayout === 'default') {
                layoutBtns[1].click(); // Switch to special1
            } else {
                layoutBtns[0].click(); // Switch back to default
            }
            return;
        }
        
        // Don't allow spaces in email fields
        if (isEmail && keyValue === ' ') {
            return;
        }
        
        // Handle arrow keys and special keys
        switch(keyValue) {
            case 'ArrowLeft':
                if (isEmail) {
                    // For email fields, use virtual cursor
                    let virtualPos = start;
                    if (virtualPos > 0) {
                        virtualPos--;
                        input.dataset.virtualCursor = virtualPos;
                    }
                } else {
                    // Normal input fields
                    if (start > 0) {
                        input.setSelectionRange(start - 1, start - 1);
                    }
                }
                break;
                
            case 'ArrowRight':
                if (isEmail) {
                    // For email fields, use virtual cursor
                    let virtualPos = start;
                    if (virtualPos < value.length) {
                        virtualPos++;
                        input.dataset.virtualCursor = virtualPos;
                    }
                } else {
                    // Normal input fields
                    if (start < value.length) {
                        input.setSelectionRange(start + 1, start + 1);
                    }
                }
                break;
                
            case 'Backspace':
                if (isEmail) {
                    // For email fields, use virtual cursor for backspace
                    let virtualPos = start;
                    if (virtualPos > 0) {
                        const newValue = value.substring(0, virtualPos - 1) + value.substring(virtualPos);
                        input.value = newValue;
                        virtualPos--;
                        input.dataset.virtualCursor = virtualPos;
                    }
                } else {
                    // Normal input fields
                    if (start > 0 && start === end) {
                        // Delete character before cursor
                        const newValue = value.substring(0, start - 1) + value.substring(end);
                        input.value = newValue;
                        input.setSelectionRange(start - 1, start - 1);
                    } else if (start !== end) {
                        // Delete selected text
                        const newValue = value.substring(0, start) + value.substring(end);
                        input.value = newValue;
                        input.setSelectionRange(start, start);
                    }
                }
                break;
                
            case 'Enter':
                if (input.tagName === 'TEXTAREA') {
                    const newValue = value.substring(0, start) + '\n' + value.substring(end);
                    input.value = newValue;
                    
                    if (isEmail) {
                        input.dataset.virtualCursor = start + 1;
                    } else {
                        input.setSelectionRange(start + 1, start + 1);
                    }
                } else {
                    // Handle form submission or next input
                    const form = input.closest('form');
                    if (form) {
                        const inputs = Array.from(form.querySelectorAll('input:not([type=hidden]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'));
                        const currentIndex = inputs.indexOf(input);
                        
                        if (currentIndex < inputs.length - 1) {
                            inputs[currentIndex + 1].focus();
                        } else {
                            input.blur();
                            form.dispatchEvent(new Event('submit', { cancelable: true }));
                        }
                    }
                }
                break;
                
            case 'CapsLock':
                this.isCapsLock = !this.isCapsLock;
                keyElement.classList.toggle('active', this.isCapsLock);
                this.updateKeyDisplay();
                this.updatePreview();
                return;
                
            case 'Shift':
                this.isShift = !this.isShift;
                const shiftKeys = this.keyboardElement.querySelectorAll('.shift');
                shiftKeys.forEach(sk => sk.classList.toggle('active', this.isShift));
                this.updateKeyDisplay();
                this.updatePreview();
                return;
                
            case '.com':
                // Insert .com at cursor position
                {
                    const newValue = value.substring(0, start) + '.com' + value.substring(end);
                    input.value = newValue;
                    
                    if (isEmail) {
                        input.dataset.virtualCursor = start + 4;
                    } else {
                        input.setSelectionRange(start + 4, start + 4);
                    }
                }
                break;
                
            case '@':
            case '.':
            case ' ':
                // Insert special characters at cursor position
                {
                    const newValue = value.substring(0, start) + keyValue + value.substring(end);
                    input.value = newValue;
                    
                    if (isEmail) {
                        input.dataset.virtualCursor = start + 1;
                    } else {
                        input.setSelectionRange(start + 1, start + 1);
                    }
                }
                break;
                
            default:
                // Handle regular characters (including enye, emojis, and symbols)
                {
                    let char = keyValue;
                    
                    // Handle enye case with CapsLock or Shift
                    if (char === 'ñ' || char === 'Ñ') {
                        if (this.isCapsLock || this.isShift) {
                            char = 'Ñ';
                        } else {
                            char = 'ñ';
                        }
                    }
                    // Handle letter case only for default layout
                    else if (this.currentLayout === 'default' && char.length === 1 && char.match(/[a-z]/i)) {
                        if (isEmail) {
                            // Email fields should be lowercase
                            char = char.toLowerCase();
                        } else {
                            // Apply caps lock or shift for regular fields
                            if (this.isCapsLock || this.isShift) {
                                char = char.toUpperCase();
                            } else {
                                char = char.toLowerCase();
                            }
                        }
                    } else if (this.isShift && this.currentLayout === 'default' && char.length === 1 && char.match(/[0-9]/)) {
                        // Handle shift + numbers
                        const shiftNumMap = {
                            '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                            '6': '^', '7': '&', '8': '*', '9': '(', '0': ')'
                        };
                        char = shiftNumMap[char] || char;
                    }
                    
                    // Insert character at cursor position
                    const newValue = value.substring(0, start) + char + value.substring(end);
                    input.value = newValue;
                    
                    // Move cursor after the inserted character
                    const newCursorPos = start + char.length;
                    
                    if (isEmail) {
                        // For email fields, store virtual cursor position
                        input.dataset.virtualCursor = newCursorPos;
                    } else {
                        input.setSelectionRange(newCursorPos, newCursorPos);
                    }
                }
                break;
        }
        
        // Reset shift after typing (except for modifier keys)
        const modifiers = ['Shift', 'CapsLock', 'ArrowLeft', 'ArrowRight', 'Control', 'Alt', 'Meta'];
        if (!modifiers.includes(keyValue) && this.isShift) {
            this.isShift = false;
            const shiftKeys = this.keyboardElement.querySelectorAll('.shift');
            shiftKeys.forEach(sk => sk.classList.remove('active'));
            this.updateKeyDisplay();
        }
        
        // Trigger events
        const inputEvent = new Event('input', { 
            bubbles: true, 
            cancelable: true 
        });
        input.dispatchEvent(inputEvent);
        
        const changeEvent = new Event('change', { 
            bubbles: true, 
            cancelable: true 
        });
        input.dispatchEvent(changeEvent);
        
        // Ensure input stays focused and update preview
        input.focus();
        this.updatePreview();
    }

    updateKeyDisplay() {
        const keys = this.keyboardElement.querySelectorAll('.keyboard-key');
        
        keys.forEach(key => {
            const keyValue = key.dataset.key;
            
            // Skip special keys
            if (key.classList.contains('special') || key.classList.contains('enter') || 
                key.classList.contains('backspace') || key.classList.contains('space') ||
                key.classList.contains('symbol') || key.classList.contains('arrow')) {
                return;
            }
            
            // Handle enye case changes
            if (keyValue === 'ñ' || keyValue === 'Ñ') {
                if (this.isCapsLock || this.isShift) {
                    key.textContent = 'Ñ';
                    key.dataset.key = 'Ñ';
                } else {
                    key.textContent = 'ñ';
                    key.dataset.key = 'ñ';
                }
                return;
            }
            
            // Only apply case changes for default layout
            if (this.currentLayout === 'default' && keyValue && keyValue.length === 1 && keyValue.match(/[a-z]/i)) {
                if (this.isCapsLock || this.isShift) {
                    key.textContent = keyValue.toUpperCase();
                    key.dataset.key = keyValue.toUpperCase();
                } else {
                    key.textContent = keyValue.toLowerCase();
                    key.dataset.key = keyValue.toLowerCase();
                }
            }
        });
    }

    showKeyboard() {
        if (!this.keyboardElement) return;
        
        this.keyboardElement.classList.add('show');
        
        // Add padding to body to prevent content from being hidden
        setTimeout(() => {
            const keyboardHeight = this.keyboardElement.offsetHeight;
            document.body.style.paddingBottom = keyboardHeight + 'px';
            this.adjustKeyboardPosition();
            this.updatePreview();
        }, 50);
    }

    hideKeyboard() {
        if (!this.keyboardElement) return;
        
        this.keyboardElement.classList.remove('show');
        
        // Remove padding from body
        document.body.style.paddingBottom = '0';
        
        if (this.activeInput) {
            this.activeInput.classList.remove('keyboard-active-input');
            this.activeInput.blur();
            this.activeInput = null;
        }
    }

    adjustKeyboardPosition() {
        if (this.activeInput) {
            const inputRect = this.activeInput.getBoundingClientRect();
            const keyboardHeight = this.keyboardElement.offsetHeight;
            const safeMargin = 20;
            
            if (inputRect.bottom > window.innerHeight - keyboardHeight - safeMargin) {
                const scrollOffset = inputRect.top - (window.innerHeight - keyboardHeight) + inputRect.height + safeMargin;
                if (scrollOffset > 0) {
                    window.scrollBy({ 
                        top: scrollOffset, 
                        behavior: 'smooth' 
                    });
                }
            }
        }
    }

    updatePreview() {
        const previewContent = document.getElementById('previewContent');
        if (!previewContent) return;
        
        if (!this.activeInput) {
            previewContent.innerHTML = '<span class="preview-text placeholder"></span>';
            return;
        }
        
        const value = this.activeInput.value;
        const placeholder = this.activeInput.placeholder || 'Type here...';
        const isEmail = this.activeInput.type === 'email';
        
        // Get current cursor position
        let cursorPos;
        
        if (isEmail) {
            // For email fields, use virtual cursor
            cursorPos = parseInt(this.activeInput.dataset.virtualCursor);
            if (isNaN(cursorPos) || cursorPos < 0 || cursorPos > value.length) {
                cursorPos = value.length;
                this.activeInput.dataset.virtualCursor = cursorPos;
            }
        } else {
            // For normal fields, use actual selection
            cursorPos = this.activeInput.selectionStart;
            if (cursorPos === null || cursorPos === undefined || cursorPos < 0) {
                cursorPos = value.length;
            }
        }
        
        // Clear the preview content
        previewContent.innerHTML = '';
        
        if (value && value.length > 0) {
            // Handle password fields
            let displayText = value;
            if (this.activeInput.type === 'password') {
                displayText = '•'.repeat(value.length);
            }
            
            // For email fields, we still show the actual text (not password dots)
            if (this.activeInput.type === 'email') {
                displayText = value; // Show actual email text
            }
            
            // Split text at cursor position
            const beforeCursor = displayText.substring(0, cursorPos);
            const afterCursor = displayText.substring(cursorPos);
            
            // Create text before cursor
            const beforeSpan = document.createElement('span');
            beforeSpan.className = 'preview-text';
            beforeSpan.textContent = beforeCursor;
            
            // Create cursor
            const cursorSpan = document.createElement('span');
            cursorSpan.className = 'preview-cursor-container';
            cursorSpan.innerHTML = '<span class="preview-cursor"></span>';
            
            // Create text after cursor
            const afterSpan = document.createElement('span');
            afterSpan.className = 'preview-text';
            afterSpan.textContent = afterCursor;
            
            // Append all parts
            previewContent.appendChild(beforeSpan);
            previewContent.appendChild(cursorSpan);
            previewContent.appendChild(afterSpan);
        } else {
            // Handle placeholder
            const placeholderSpan = document.createElement('span');
            placeholderSpan.className = 'preview-text placeholder';
            placeholderSpan.textContent = placeholder;
            
            const cursorSpan = document.createElement('span');
            cursorSpan.className = 'preview-cursor-container';
            cursorSpan.innerHTML = '<span class="preview-cursor"></span>';
            
            previewContent.appendChild(cursorSpan);
            previewContent.appendChild(placeholderSpan);
        }
        
        // Scroll to keep cursor visible
        setTimeout(() => this.scrollPreviewToCursor(), 10);
    }
    
    scrollPreviewToCursor() {
        const previewElement = document.getElementById('keyboardPreview');
        const cursorContainer = document.querySelector('.preview-cursor-container');
        
        if (!previewElement || !cursorContainer) return;
        
        // Get cursor position
        const previewRect = previewElement.getBoundingClientRect();
        const cursorRect = cursorContainer.getBoundingClientRect();
        
        // Calculate if cursor is outside visible area
        const cursorLeft = cursorRect.left - previewRect.left + previewElement.scrollLeft;
        const previewWidth = previewElement.clientWidth;
        
        if (cursorLeft < previewElement.scrollLeft) {
            // Cursor is to the left of visible area
            previewElement.scrollLeft = cursorLeft - 20;
        } else if (cursorLeft > previewElement.scrollLeft + previewWidth - 30) {
            // Cursor is to the right of visible area
            previewElement.scrollLeft = cursorLeft - previewWidth + 50;
        }
    }

    handleOutsideClicks() {
        document.addEventListener('click', (e) => {
            if (this.keyboardElement && 
                !this.keyboardElement.contains(e.target) && 
                e.target !== this.activeInput &&
                !e.target.matches('input, textarea')) {
                // Optional: hide keyboard on outside click
                // this.hideKeyboard();
            }
        });
        
        // Track input events from real keyboard
        document.addEventListener('input', (e) => {
            if (e.target === this.activeInput) {
                this.updatePreview();
            }
        });
        
        // Track clicks on the input itself
        document.addEventListener('click', (e) => {
            if (e.target === this.activeInput && this.activeInput) {
                setTimeout(() => {
                    if (this.activeInput) {
                        // Get the cursor position from the actual input
                        if (this.activeInput.type === 'email') {
                            // For email fields, update virtual cursor to match actual cursor
                            // Since we can't get actual cursor position, we'll keep it at the end
                            this.activeInput.dataset.virtualCursor = this.activeInput.value.length;
                        }
                        this.updatePreview();
                    }
                }, 10);
            }
        });
        
        // Track key events for cursor movement with physical keyboard
        document.addEventListener('keyup', (e) => {
            if (this.activeInput && document.activeElement === this.activeInput) {
                setTimeout(() => this.updatePreview(), 10);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (this.activeInput && document.activeElement === this.activeInput) {
                // Allow time for the cursor to move
                setTimeout(() => this.updatePreview(), 10);
            }
        });
    }
}

// Initialize keyboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.virtualKeyboard = new VirtualKeyboard();
    });
} else {
    window.virtualKeyboard = new VirtualKeyboard();
}