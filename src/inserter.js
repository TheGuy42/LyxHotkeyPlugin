/**
 * Text Inserter for LyX Hotkey Plugin
 * Handles insertion of text and commands into editable fields
 */
class TextInserter {
  constructor() {
    this.logger = window.LyXLogger?.logger;
  }
  
  /**
   * Insert text at cursor position in editable element
   * @param {string} text - Text to insert
   * @param {Element} target - Target element
   * @returns {boolean} - Success status
   */
  insertText(text, target) {
    if (!text || !target) {
      this.logger?.warn('Invalid parameters for text insertion', { text, target });
      return false;
    }
    
    try {
      // Handle different types of editable elements
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return this.insertIntoInputElement(text, target);
      } else if (this.isContentEditable(target)) {
        return this.insertIntoContentEditable(text, target);
      } else {
        // Try to find the nearest editable element
        const editableParent = this.findEditableParent(target);
        if (editableParent) {
          return this.insertText(text, editableParent);
        }
      }
      
      this.logger?.warn('Target is not editable', { target: target.tagName });
      return false;
    } catch (error) {
      this.logger?.error('Failed to insert text:', error);
      return false;
    }
  }
  
  /**
   * Insert text into input or textarea element
   * @param {string} text - Text to insert
   * @param {HTMLInputElement|HTMLTextAreaElement} element - Input element
   * @returns {boolean} - Success status
   */
  insertIntoInputElement(text, element) {
    const startPos = element.selectionStart;
    const endPos = element.selectionEnd;
    const currentValue = element.value;
    
    // Calculate new cursor position
    let newCursorPos = startPos + text.length;
    
    // Handle special cursor positioning for LaTeX constructs
    const cursorOffset = this.calculateCursorOffset(text);
    if (cursorOffset !== null) {
      newCursorPos = startPos + cursorOffset;
    }
    
    // Insert text
    const newValue = currentValue.substring(0, startPos) + 
                    text + 
                    currentValue.substring(endPos);
    
    element.value = newValue;
    
    // Set cursor position
    element.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input events
    this.triggerInputEvents(element);
    
    this.logger?.debug(`Inserted text into ${element.tagName}:`, {
      text,
      startPos,
      endPos,
      newCursorPos
    });
    
    return true;
  }
  
  /**
   * Insert text into contentEditable element
   * @param {string} text - Text to insert
   * @param {Element} element - ContentEditable element
   * @returns {boolean} - Success status
   */
  insertIntoContentEditable(text, element) {
    const selection = window.getSelection();
    
    if (selection.rangeCount === 0) {
      // No selection, insert at the end
      element.focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    const range = selection.getRangeAt(0);
    
    // Delete selected content
    range.deleteContents();
    
    // Handle special LaTeX constructs
    if (this.isLaTeXConstruct(text)) {
      return this.insertLaTeXConstruct(text, range);
    }
    
    // Insert plain text
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Trigger input events
    this.triggerInputEvents(element);
    
    this.logger?.debug(`Inserted text into contentEditable:`, { text });
    
    return true;
  }
  
  /**
   * Insert LaTeX construct with proper cursor positioning
   * @param {string} text - LaTeX construct
   * @param {Range} range - DOM range for insertion
   * @returns {boolean} - Success status
   */
  insertLaTeXConstruct(text, range) {
    // Handle \frac{}{}
    if (text === '\\frac{}{}') {
      const span = document.createElement('span');
      span.innerHTML = '\\frac{<span class="lyx-cursor-placeholder"></span>}{}';
      range.insertNode(span);
      
      // Position cursor in first placeholder
      const placeholder = span.querySelector('.lyx-cursor-placeholder');
      if (placeholder) {
        range.selectNodeContents(placeholder);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      return true;
    }
    
    // Handle \sqrt{}
    if (text === '\\sqrt{}') {
      const span = document.createElement('span');
      span.innerHTML = '\\sqrt{<span class="lyx-cursor-placeholder"></span>}';
      range.insertNode(span);
      
      // Position cursor in placeholder
      const placeholder = span.querySelector('.lyx-cursor-placeholder');
      if (placeholder) {
        range.selectNodeContents(placeholder);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      return true;
    }
    
    // Default: insert as text
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    
    return true;
  }
  
  /**
   * Check if text is a LaTeX construct that needs special handling
   * @param {string} text - Text to check
   * @returns {boolean} - True if LaTeX construct
   */
  isLaTeXConstruct(text) {
    return text.includes('{}') || text.match(/\\[a-zA-Z]+\{.*\}/);
  }
  
  /**
   * Calculate cursor offset for special constructs
   * @param {string} text - Inserted text
   * @returns {number|null} - Cursor offset or null for default
   */
  calculateCursorOffset(text) {
    // For \frac{}{}, position cursor in first braces
    if (text === '\\frac{}{}') {
      return text.indexOf('{}') + 1; // Position after first {
    }
    
    // For \sqrt{}, position cursor in braces
    if (text === '\\sqrt{}') {
      return text.indexOf('{}') + 1; // Position after {
    }
    
    // For constructs with single {}, position cursor inside
    if (text.includes('{}')) {
      const braceIndex = text.indexOf('{}');
      return braceIndex + 1; // Position after {
    }
    
    return null; // Use default cursor position
  }
  
  /**
   * Check if element is contentEditable
   * @param {Element} element - Element to check
   * @returns {boolean} - True if contentEditable
   */
  isContentEditable(element) {
    return element.contentEditable === 'true' || 
           element.isContentEditable;
  }
  
  /**
   * Find nearest editable parent element
   * @param {Element} element - Starting element
   * @returns {Element|null} - Editable parent or null
   */
  findEditableParent(element) {
    let current = element;
    
    while (current && current !== document.body) {
      if (current.tagName === 'INPUT' || 
          current.tagName === 'TEXTAREA' || 
          this.isContentEditable(current)) {
        return current;
      }
      current = current.parentElement;
    }
    
    return null;
  }
  
  /**
   * Trigger input events on element
   * @param {Element} element - Target element
   */
  triggerInputEvents(element) {
    // Create and dispatch input event
    const inputEvent = new Event('input', { 
      bubbles: true, 
      cancelable: true 
    });
    element.dispatchEvent(inputEvent);
    
    // Create and dispatch change event
    const changeEvent = new Event('change', { 
      bubbles: true, 
      cancelable: true 
    });
    element.dispatchEvent(changeEvent);
    
    // For modern frameworks, also try to trigger additional events
    try {
      // React-style events
      const reactInputEvent = new Event('input', { bubbles: true });
      Object.defineProperty(reactInputEvent, 'target', {
        writable: false,
        value: element
      });
      element.dispatchEvent(reactInputEvent);
    } catch (error) {
      // Ignore errors - some frameworks might not support this
    }
  }
  
  /**
   * Insert text with selection replacement
   * @param {string} text - Text to insert
   * @param {Element} target - Target element
   * @param {boolean} replaceSelection - Whether to replace selection
   * @returns {boolean} - Success status
   */
  insertTextWithSelection(text, target, replaceSelection = true) {
    if (!replaceSelection) {
      return this.insertText(text, target);
    }
    
    // For input elements, we already handle selection replacement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return this.insertText(text, target);
    }
    
    // For contentEditable, ensure we replace selection
    if (this.isContentEditable(target)) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          range.deleteContents();
        }
      }
      return this.insertText(text, target);
    }
    
    return false;
  }
  
  /**
   * Get current cursor position information
   * @param {Element} element - Target element
   * @returns {Object|null} - Cursor position info
   */
  getCursorPosition(element) {
    try {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return {
          start: element.selectionStart,
          end: element.selectionEnd,
          text: element.value.substring(element.selectionStart, element.selectionEnd)
        };
      } else if (this.isContentEditable(element)) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          return {
            range: range,
            text: range.toString(),
            collapsed: range.collapsed
          };
        }
      }
    } catch (error) {
      this.logger?.warn('Failed to get cursor position:', error);
    }
    
    return null;
  }
  
  /**
   * Test text insertion capability
   * @param {Element} element - Element to test
   * @returns {boolean} - True if insertion is possible
   */
  canInsertText(element) {
    if (!element) return false;
    
    try {
      return element.tagName === 'INPUT' || 
             element.tagName === 'TEXTAREA' || 
             this.isContentEditable(element) ||
             this.findEditableParent(element) !== null;
    } catch (error) {
      return false;
    }
  }
}

// Create global instance
const textInserter = new TextInserter();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TextInserter, textInserter };
} else if (typeof window !== 'undefined') {
  window.LyXInserter = textInserter;
  window.LyXTextInserter = TextInserter;
}