/**
 * Hotkey Manager for LyX Hotkey Plugin
 * Handles multi-step key sequence detection and timeout management
 */
class HotkeyManager {
  constructor() {
    this.bindings = new Map();
    this.currentSequence = [];
    this.sequenceTimeout = 1500; // Default 1.5 seconds
    this.timeoutId = null;
    this.enabled = true;
    this.conflicts = new Set();
    this.logger = window.LyXLogger?.logger;
    
    // Load settings
    this.loadSettings();
    
    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.resetSequence = this.resetSequence.bind(this);
  }
  
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['sequenceTimeout', 'hotkeyEnabled']);
      this.sequenceTimeout = result.sequenceTimeout || 1500;
      this.enabled = result.hotkeyEnabled !== false; // Default to true
    } catch (error) {
      this.logger?.warn('Failed to load hotkey settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        sequenceTimeout: this.sequenceTimeout,
        hotkeyEnabled: this.enabled
      });
    } catch (error) {
      this.logger?.warn('Failed to save hotkey settings:', error);
    }
  }
  
  /**
   * Set the sequence timeout
   * @param {number} timeout - Timeout in milliseconds
   */
  setSequenceTimeout(timeout) {
    this.sequenceTimeout = Math.max(500, Math.min(5000, timeout));
    this.saveSettings();
    this.logger?.info(`Sequence timeout set to ${this.sequenceTimeout}ms`);
  }
  
  /**
   * Enable or disable hotkey processing
   * @param {boolean} enabled - Whether hotkeys should be enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.saveSettings();
    
    if (!enabled) {
      this.resetSequence();
    }
    
    this.logger?.info(`Hotkey processing ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Load key bindings from parser
   * @param {Map} bindings - Bindings from LyXParser
   */
  loadBindings(bindings) {
    this.bindings = new Map(bindings);
    this.detectConflicts();
    this.logger?.info(`Loaded ${this.bindings.size} key bindings`);
  }
  
  /**
   * Detect conflicts between key sequences
   */
  detectConflicts() {
    this.conflicts.clear();
    const sequences = Array.from(this.bindings.keys());
    
    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        const seq1 = sequences[i];
        const seq2 = sequences[j];
        
        if (this.hasConflict(seq1, seq2)) {
          this.conflicts.add(`${seq1} <-> ${seq2}`);
          this.logger?.warn(`Hotkey conflict detected: ${seq1} conflicts with ${seq2}`);
        }
      }
    }
    
    if (this.conflicts.size > 0) {
      this.logger?.warn(`Found ${this.conflicts.size} hotkey conflicts`);
    }
  }
  
  /**
   * Check if two sequences conflict
   * @param {string} seq1 - First sequence
   * @param {string} seq2 - Second sequence
   * @returns {boolean} - True if they conflict
   */
  hasConflict(seq1, seq2) {
    const parts1 = seq1.split(' ');
    const parts2 = seq2.split(' ');
    
    // One sequence is a prefix of another
    const minLength = Math.min(parts1.length, parts2.length);
    for (let i = 0; i < minLength; i++) {
      if (parts1[i] !== parts2[i]) {
        return false;
      }
    }
    
    return parts1.length !== parts2.length;
  }
  
  /**
   * Start listening for key events
   */
  startListening() {
    document.addEventListener('keydown', this.handleKeyDown, true);
    this.logger?.debug('Started listening for key events');
  }
  
  /**
   * Stop listening for key events
   */
  stopListening() {
    document.removeEventListener('keydown', this.handleKeyDown, true);
    this.resetSequence();
    this.logger?.debug('Stopped listening for key events');
  }
  
  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
    if (!this.enabled) return;
    
    // Skip if inside non-editable content and not a special key
    if (!this.isEditableContext(event.target) && !this.isSpecialKey(event)) {
      return;
    }
    
    const keyString = this.eventToKeyString(event);
    if (!keyString) return;
    
    this.logger?.debug(`Key pressed: ${keyString}`, {
      currentSequence: this.currentSequence,
      target: event.target.tagName
    });
    
    // Add to current sequence
    this.currentSequence.push(keyString);
    const currentSequenceString = this.currentSequence.join(' ');
    
    // Check for exact match
    const exactMatch = this.bindings.get(currentSequenceString);
    if (exactMatch) {
      this.logger?.info(`Hotkey sequence completed: ${currentSequenceString}`, exactMatch);
      this.executeAction(exactMatch, event);
      this.resetSequence();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    
    // Check if current sequence is a prefix of any binding
    const hasPrefix = this.hasMatchingPrefix(currentSequenceString);
    if (hasPrefix) {
      this.logger?.debug(`Partial sequence match: ${currentSequenceString}`);
      this.startSequenceTimeout();
      event.preventDefault();
      event.stopPropagation();
    } else {
      // No match, reset sequence
      this.logger?.debug(`No sequence match for: ${currentSequenceString}`);
      this.resetSequence();
    }
  }
  
  /**
   * Convert keyboard event to key string
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string|null} - Key string or null
   */
  eventToKeyString(event) {
    const parts = [];
    
    // Add modifiers
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    // Add main key
    let key = event.key;
    
    // Handle special cases
    if (key === ' ') key = 'Space';
    
    // For single character keys, use the event.key as-is when shift is pressed
    // This preserves the correct case (e.g., 'D' for Shift+D)
    if (key.length === 1) {
      if (event.shiftKey && key.match(/[A-Z]/)) {
        // Keep uppercase when shift produces an uppercase letter
        // (this is the expected case)
      } else if (!event.shiftKey && key.match(/[a-z]/)) {
        // Keep lowercase when no shift produces a lowercase letter
        // (this is the expected case)
      } else {
        // For other cases, normalize to lowercase
        key = key.toLowerCase();
      }
    }
    
    parts.push(key);
    
    return parts.join('+');
  }
  
  /**
   * Check if current sequence is a prefix of any binding
   * @param {string} sequence - Current sequence
   * @returns {boolean} - True if it's a prefix
   */
  hasMatchingPrefix(sequence) {
    for (const binding of this.bindings.keys()) {
      if (binding.startsWith(sequence + ' ')) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Start sequence timeout
   */
  startSequenceTimeout() {
    this.clearSequenceTimeout();
    this.timeoutId = setTimeout(() => {
      this.logger?.debug(`Sequence timeout after ${this.sequenceTimeout}ms: ${this.currentSequence.join(' ')}`);
      this.resetSequence();
    }, this.sequenceTimeout);
  }
  
  /**
   * Clear sequence timeout
   */
  clearSequenceTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  /**
   * Reset current sequence
   */
  resetSequence() {
    this.currentSequence = [];
    this.clearSequenceTimeout();
    this.logger?.debug('Sequence reset');
  }
  
  /**
   * Check if target is in editable context
   * @param {Element} target - Event target
   * @returns {boolean} - True if editable
   */
  isEditableContext(target) {
    if (!target) return false;
    
    // Check for editable elements
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return true;
    }
    
    // Check for contentEditable
    if (target.contentEditable === 'true') {
      return true;
    }
    
    // Check if inside contentEditable
    let parent = target.parentElement;
    while (parent) {
      if (parent.contentEditable === 'true') {
        return true;
      }
      parent = parent.parentElement;
    }
    
    return false;
  }
  
  /**
   * Check if this is a special key that should always be processed
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {boolean} - True if special key
   */
  isSpecialKey(event) {
    // Process Alt combinations even in non-editable contexts
    return event.altKey || event.ctrlKey;
  }
  
  /**
   * Execute the action for a matched binding
   * @param {Object} binding - The matched binding
   * @param {KeyboardEvent} event - The keyboard event
   */
  executeAction(binding, event) {
    try {
      if (binding.action.type === 'insert') {
        // Use the inserter to insert text
        if (window.LyXInserter) {
          window.LyXInserter.insertText(binding.action.text, event.target);
        } else {
          this.logger?.error('LyXInserter not available');
        }
      } else if (binding.action.type === 'command') {
        this.logger?.info(`Executing command: ${binding.action.command}`);
        // Handle custom commands here if needed
      }
      
      this.logger?.info(`Action executed: ${binding.command}`, {
        keySequence: binding.keySequence,
        action: binding.action
      });
    } catch (error) {
      this.logger?.error('Failed to execute action:', error);
    }
  }
  
  /**
   * Get current sequence
   * @returns {Array} - Current key sequence
   */
  getCurrentSequence() {
    return [...this.currentSequence];
  }
  
  /**
   * Get all conflicts
   * @returns {Set} - Set of conflict descriptions
   */
  getConflicts() {
    return new Set(this.conflicts);
  }
  
  /**
   * Get binding statistics
   * @returns {Object} - Statistics object
   */
  getStatistics() {
    const multiStepBindings = Array.from(this.bindings.keys())
      .filter(key => key.includes(' '));
    
    return {
      totalBindings: this.bindings.size,
      singleStepBindings: this.bindings.size - multiStepBindings.length,
      multiStepBindings: multiStepBindings.length,
      conflicts: this.conflicts.size,
      enabled: this.enabled,
      sequenceTimeout: this.sequenceTimeout
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HotkeyManager };
} else if (typeof window !== 'undefined') {
  window.LyXHotkeyManager = HotkeyManager;
}