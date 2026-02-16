/**
 * Virtual On-Screen Keyboard
 * Automatically appears when any text input or textarea is focused
 */

class VirtualKeyboard {
    constructor() {
        this.activeInput = null;
        this.isCapsLock = false;
        this.isShift = false;
        this.keyboardElement = null;
        
        this.init();
    }

    init() {
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
    }

    createKeyboard() {
        const keyboardHTML = `
            <div class="virtual-keyboard-container" id="virtualKeyboard">
                <div class="keyboard-header">
                    <button class="keyboard-close-btn" id="keyboardCloseBtn">✕</button>
                </div>
                <div class="keyboard-keys">
                    <div class="keyboard-row">
                        <button class="keyboard-key" data-key="1">1</button>
                        <button class="keyboard-key" data-key="2">2</button>
                        <button class="keyboard-key" data-key="3">3</button>
                        <button class="keyboard-key" data-key="4">4</button>
                        <button class="keyboard-key" data-key="5">5</button>
                        <button class="keyboard-key" data-key="6">6</button>
                        <button class="keyboard-key" data-key="7">7</button>
                        <button class="keyboard-key" data-key="8">8</button>
                        <button class="keyboard-key" data-key="9">9</button>
                        <button class="keyboard-key" data-key="0">0</button>
                    </div>
                    <div class="keyboard-row">
                        <button class="keyboard-key" data-key="q">Q</button>
                        <button class="keyboard-key" data-key="w">W</button>
                        <button class="keyboard-key" data-key="e">E</button>
                        <button class="keyboard-key" data-key="r">R</button>
                        <button class="keyboard-key" data-key="t">T</button>
                        <button class="keyboard-key" data-key="y">Y</button>
                        <button class="keyboard-key" data-key="u">U</button>
                        <button class="keyboard-key" data-key="i">I</button>
                        <button class="keyboard-key" data-key="o">O</button>
                        <button class="keyboard-key" data-key="p">P</button>
                    </div>
                    <div class="keyboard-row">
                        <button class="keyboard-key" data-key="a">A</button>
                        <button class="keyboard-key" data-key="s">S</button>
                        <button class="keyboard-key" data-key="d">D</button>
                        <button class="keyboard-key" data-key="f">F</button>
                        <button class="keyboard-key" data-key="g">G</button>
                        <button class="keyboard-key" data-key="h">H</button>
                        <button class="keyboard-key" data-key="j">J</button>
                        <button class="keyboard-key" data-key="k">K</button>
                        <button class="keyboard-key" data-key="l">L</button>
                    </div>
                    <div class="keyboard-row">
                        <button class="keyboard-key special shift" data-key="Shift">⇧</button>
                        <button class="keyboard-key" data-key="z">Z</button>
                        <button class="keyboard-key" data-key="x">X</button>
                        <button class="keyboard-key" data-key="c">C</button>
                        <button class="keyboard-key" data-key="v">V</button>
                        <button class="keyboard-key" data-key="b">B</button>
                        <button class="keyboard-key" data-key="n">N</button>
                        <button class="keyboard-key" data-key="m">M</button>
                        <button class="keyboard-key special backspace" data-key="Backspace">⌫</button>
                    </div>
                    <div class="keyboard-row">
                        <button class="keyboard-key special" data-key=".com">.com</button>
                        <button class="keyboard-key special" data-key="@">@</button>
                        <button class="keyboard-key special space" data-key=" ">space</button>
                        <button class="keyboard-key special" data-key=".">.</button>
                        <button class="keyboard-key special enter" data-key="Enter">return</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', keyboardHTML);
        this.keyboardElement = document.getElementById('virtualKeyboard');
        
        // Attach keyboard key listeners
        this.attachKeyListeners();
        
        // Close button
        document.getElementById('keyboardCloseBtn').addEventListener('click', () => {
            this.hideKeyboard();
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
                target.classList.add('keyboard-active-input');
            }
        });
        
        // Remove highlight when input loses focus
        document.addEventListener('focusout', (e) => {
            if (e.target.classList.contains('keyboard-active-input')) {
                e.target.classList.remove('keyboard-active-input');
            }
        });
    }

    attachKeyListeners() {
        const keys = this.keyboardElement.querySelectorAll('.keyboard-key');
        
        keys.forEach(key => {
            key.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const keyValue = key.dataset.key;
                this.handleKeyPress(keyValue, key);
            });
        });
    }

    handleKeyPress(keyValue, keyElement) {
        if (!this.activeInput) return;
        
        const input = this.activeInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const value = input.value;
        
        switch(keyValue) {
            case 'Backspace':
                if (start === end && start > 0) {
                    input.value = value.substring(0, start - 1) + value.substring(end);
                    input.setSelectionRange(start - 1, start - 1);
                } else if (start !== end) {
                    input.value = value.substring(0, start) + value.substring(end);
                    input.setSelectionRange(start, start);
                }
                break;
                
            case 'Enter':
                if (input.tagName === 'TEXTAREA') {
                    input.value = value.substring(0, start) + '\n' + value.substring(end);
                    input.setSelectionRange(start + 1, start + 1);
                } else {
                    // Trigger form submit or go to next input
                    const inputs = Array.from(document.querySelectorAll('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'));
                    const currentIndex = inputs.indexOf(input);
                    if (currentIndex < inputs.length - 1) {
                        inputs[currentIndex + 1].focus();
                    } else {
                        input.blur();
                        const form = input.closest('form');
                        if (form) {
                            form.dispatchEvent(new Event('submit', { cancelable: true }));
                        }
                    }
                }
                break;
                
            case 'CapsLock':
                this.isCapsLock = !this.isCapsLock;
                keyElement.classList.toggle('active', this.isCapsLock);
                this.updateKeyDisplay();
                break;
                
            case 'Shift':
                this.isShift = !this.isShift;
                const shiftKeys = this.keyboardElement.querySelectorAll('.shift');
                shiftKeys.forEach(sk => sk.classList.toggle('active', this.isShift));
                this.updateKeyDisplay();
                break;
                
            default:
                let char = keyValue;
                
                // Handle letter case
                if (char.length === 1 && char.match(/[a-z]/)) {
                    if (this.isCapsLock || this.isShift) {
                        char = char.toUpperCase();
                    }
                } else if (this.isShift && char.length === 1 && char.match(/[0-9]/)) {
                    // Handle shift + numbers
                    const shiftNumMap = {
                        '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                        '6': '^', '7': '&', '8': '*', '9': '(', '0': ')'
                    };
                    char = shiftNumMap[char] || char;
                }
                
                // Insert character
                input.value = value.substring(0, start) + char + value.substring(end);
                input.setSelectionRange(start + char.length, start + char.length);
                
                // Turn off shift after typing
                if (this.isShift) {
                    this.isShift = false;
                    const shiftKeys = this.keyboardElement.querySelectorAll('.shift');
                    shiftKeys.forEach(sk => sk.classList.remove('active'));
                    this.updateKeyDisplay();
                }
                break;
        }
        
        // Trigger input event for reactivity
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    }

    updateKeyDisplay() {
        const keys = this.keyboardElement.querySelectorAll('.keyboard-key:not(.special)');
        
        keys.forEach(key => {
            const keyValue = key.dataset.key;
            
            if (keyValue.length === 1 && keyValue.match(/[a-z]/)) {
                // Always display uppercase for letters (iOS style)
                key.textContent = keyValue.toUpperCase();
            } else if (this.isShift && keyValue.length === 1 && keyValue.match(/[0-9]/)) {
                // Show shift symbols for numbers
                const shiftMap = {
                    '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                    '6': '^', '7': '&', '8': '*', '9': '(', '0': ')'
                };
                key.textContent = shiftMap[keyValue] || keyValue;
            } else {
                // Reset numbers to normal
                if (keyValue.match(/[0-9]/)) {
                    key.textContent = keyValue;
                }
            }
        });
    }

    showKeyboard() {
        if (!this.keyboardElement) return;
        
        this.keyboardElement.classList.add('show');
        this.adjustKeyboardPosition();
    }

    hideKeyboard() {
        if (!this.keyboardElement) return;
        
        this.keyboardElement.classList.remove('show');
        if (this.activeInput) {
            this.activeInput.classList.remove('keyboard-active-input');
            this.activeInput = null;
        }
    }

    adjustKeyboardPosition() {
        // Keyboard is fixed at bottom, but we might need to scroll the input into view
        if (this.activeInput) {
            const inputRect = this.activeInput.getBoundingClientRect();
            const keyboardHeight = this.keyboardElement.offsetHeight;
            
            // If input is hidden behind keyboard, scroll it into view
            if (inputRect.bottom > window.innerHeight - keyboardHeight) {
                this.activeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    handleOutsideClicks() {
        document.addEventListener('click', (e) => {
            // Don't close if clicking on keyboard or active input
            if (this.keyboardElement && 
                !this.keyboardElement.contains(e.target) && 
                e.target !== this.activeInput &&
                !e.target.matches('input, textarea')) {
                
                // Optional: uncomment to hide keyboard on outside click
                // this.hideKeyboard();
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
