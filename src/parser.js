/**
 * Parser for LyX bind files
 * Handles the parsing of LyX hotkey configuration files
 */
class LyXParser {
  constructor() {
    this.bindings = new Map();
    this.logger = window.LyXLogger?.logger;
  }
  
  /**
   * Parse a LyX bind file content
   * @param {string} content - The content of the bind file
   * @returns {Map} - Map of key sequences to commands
   */
  parse(content) {
    this.bindings.clear();
    const lines = content.split('\n');
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Parse bind directives
      if (trimmed.startsWith('\\bind')) {
        try {
          const binding = this.parseBindLine(trimmed);
          if (binding) {
            this.bindings.set(binding.keySequence, binding);
            this.logger?.debug(`Parsed binding: ${binding.keySequence} -> ${binding.command}`, binding);
          }
        } catch (error) {
          this.logger?.warn(`Failed to parse line ${lineNumber}: ${trimmed}`, error);
        }
      }
    }
    
    this.logger?.info(`Parsed ${this.bindings.size} key bindings from LyX file`);
    return this.bindings;
  }
  
  /**
   * Parse a single bind line
   * @param {string} line - The bind line to parse
   * @returns {Object|null} - Parsed binding object or null
   */
  parseBindLine(line) {
    // Match pattern: \bind "key-sequence" "command"
    const bindRegex = /\\bind\s+"([^"]+)"\s+"([^"]+)"/;
    const match = line.match(bindRegex);
    
    if (!match) {
      this.logger?.warn(`Invalid bind line format: ${line}`);
      return null;
    }
    
    const [, keySequence, command] = match;
    
    return {
      keySequence: this.normalizeKeySequence(keySequence),
      originalKeySequence: keySequence,
      command: command,
      action: this.parseCommand(command)
    };
  }
  
  /**
   * Normalize key sequence to internal format
   * @param {string} keySequence - Original LyX key sequence
   * @returns {string} - Normalized key sequence
   */
  normalizeKeySequence(keySequence) {
    // Convert LyX modifiers to standard format
    let normalized = keySequence
      .replace(/M-/g, 'Alt+')      // M- = Alt
      .replace(/C-/g, 'Ctrl+')     // C- = Ctrl
      .replace(/S-/g, 'Shift+')    // S- = Shift
      .replace(/A-/g, 'Alt+');     // A- = Alt (alternative notation)
    
    // Handle special keys
    normalized = normalized
      .replace(/space/g, 'Space')
      .replace(/Return/g, 'Enter')
      .replace(/BackSpace/g, 'Backspace')
      .replace(/Delete/g, 'Delete')
      .replace(/Tab/g, 'Tab')
      .replace(/Escape/g, 'Escape')
      .replace(/Up/g, 'ArrowUp')
      .replace(/Down/g, 'ArrowDown')
      .replace(/Left/g, 'ArrowLeft')
      .replace(/Right/g, 'ArrowRight')
      .replace(/Prior/g, 'PageUp')
      .replace(/Next/g, 'PageDown')
      .replace(/Home/g, 'Home')
      .replace(/End/g, 'End');
    
    // Handle special characters that need escaping
    normalized = normalized
      .replace(/~S-/g, '')         // ~S- means "not shift"
      .replace(/~C-/g, '')         // ~C- means "not ctrl"
      .replace(/~M-/g, '');        // ~M- means "not meta"
    
    return normalized;
  }
  
  /**
   * Parse command to determine action type
   * @param {string} command - The LyX command
   * @returns {Object} - Action object with type and parameters
   */
  parseCommand(command) {
    // Handle math-insert commands
    if (command.startsWith('math-insert')) {
      const symbol = command.replace('math-insert ', '').trim();
      return {
        type: 'insert',
        text: this.convertLaTeXSymbol(symbol)
      };
    }
    
    // Handle other insert commands
    if (command.includes('insert')) {
      return {
        type: 'insert',
        text: this.extractInsertText(command)
      };
    }
    
    // Handle self-insert commands
    if (command.startsWith('self-insert')) {
      const text = command.replace('self-insert ', '').trim();
      return {
        type: 'insert',
        text: text
      };
    }
    
    // Handle quote-insert commands
    if (command.startsWith('quote-insert')) {
      return {
        type: 'insert',
        text: this.handleQuoteInsert(command)
      };
    }
    
    // Handle specialchar-insert commands
    if (command.startsWith('specialchar-insert')) {
      return {
        type: 'insert',
        text: this.handleSpecialChar(command)
      };
    }
    
    // Default: treat as custom command
    return {
      type: 'command',
      command: command
    };
  }
  
  /**
   * Convert LaTeX symbols to appropriate text
   * @param {string} symbol - LaTeX symbol
   * @returns {string} - Converted text
   */
  convertLaTeXSymbol(symbol) {
    // Handle fraction
    if (symbol === '\\frac') {
      return '\\frac{}{}';
    }
    
    // Handle square root
    if (symbol === '\\sqrt') {
      return '\\sqrt{}';
    }
    
    // Handle common mathematical symbols
    const symbolMap = {
      '\\alpha': 'α',
      '\\beta': 'β',
      '\\gamma': 'γ',
      '\\delta': 'δ',
      '\\epsilon': 'ε',
      '\\zeta': 'ζ',
      '\\eta': 'η',
      '\\theta': 'θ',
      '\\iota': 'ι',
      '\\kappa': 'κ',
      '\\lambda': 'λ',
      '\\mu': 'μ',
      '\\nu': 'ν',
      '\\xi': 'ξ',
      '\\pi': 'π',
      '\\rho': 'ρ',
      '\\sigma': 'σ',
      '\\tau': 'τ',
      '\\upsilon': 'υ',
      '\\phi': 'φ',
      '\\chi': 'χ',
      '\\psi': 'ψ',
      '\\omega': 'ω',
      '\\sum': '∑',
      '\\int': '∫',
      '\\infty': '∞',
      '\\pm': '±',
      '\\neq': '≠',
      '\\leq': '≤',
      '\\geq': '≥'
    };
    
    // Return Unicode symbol if available, otherwise return LaTeX code
    return symbolMap[symbol] || symbol;
  }
  
  /**
   * Extract text from insert commands
   * @param {string} command - Insert command
   * @returns {string} - Text to insert
   */
  extractInsertText(command) {
    // Extract text after the command name
    const parts = command.split(' ');
    return parts.slice(1).join(' ');
  }
  
  /**
   * Handle quote-insert commands
   * @param {string} command - Quote insert command
   * @returns {string} - Quote character(s)
   */
  handleQuoteInsert(command) {
    if (command.includes('inner')) {
      return '"';
    }
    if (command.includes('outer')) {
      return '"';
    }
    return '"';
  }
  
  /**
   * Handle special character commands
   * @param {string} command - Special char command
   * @returns {string} - Special character
   */
  handleSpecialChar(command) {
    if (command.includes('hyphenation')) {
      return '­'; // Soft hyphen
    }
    if (command.includes('nobreakdash')) {
      return '‑'; // Non-breaking hyphen
    }
    if (command.includes('ligature-break')) {
      return '‌'; // Zero-width non-joiner
    }
    if (command.includes('end-of-sentence')) {
      return '.';
    }
    if (command.includes('dots')) {
      return '…';
    }
    return '';
  }
  
  /**
   * Get all bindings
   * @returns {Map} - All parsed bindings
   */
  getBindings() {
    return this.bindings;
  }
  
  /**
   * Get binding for a specific key sequence
   * @param {string} keySequence - The key sequence to look up
   * @returns {Object|null} - Binding object or null
   */
  getBinding(keySequence) {
    return this.bindings.get(keySequence) || null;
  }
  
  /**
   * Export bindings as JSON
   * @returns {Object} - Serializable bindings object
   */
  exportBindings() {
    const exported = {};
    for (const [key, value] of this.bindings) {
      exported[key] = value;
    }
    return exported;
  }
  
  /**
   * Import bindings from JSON
   * @param {Object} exported - Previously exported bindings
   */
  importBindings(exported) {
    this.bindings.clear();
    for (const [key, value] of Object.entries(exported)) {
      this.bindings.set(key, value);
    }
    this.logger?.info(`Imported ${this.bindings.size} key bindings`);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LyXParser };
} else if (typeof window !== 'undefined') {
  window.LyXParser = LyXParser;
}