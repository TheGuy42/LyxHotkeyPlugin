/**
 * Logger utility for LyX Hotkey Plugin
 * Provides configurable logging with different levels
 */
class Logger {
  constructor() {
    this.debugMode = false;
    this.logLevel = 'info'; // 'debug', 'info', 'warn', 'error'
    this.logHistory = [];
    this.maxHistorySize = 1000;
    
    // Load settings from storage
    this.loadSettings();
  }
  
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['debugMode', 'logLevel']);
      this.debugMode = result.debugMode || false;
      this.logLevel = result.logLevel || 'info';
    } catch (error) {
      console.warn('Failed to load logger settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        debugMode: this.debugMode,
        logLevel: this.logLevel
      });
    } catch (error) {
      console.warn('Failed to save logger settings:', error);
    }
  }
  
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this.saveSettings();
  }
  
  setLogLevel(level) {
    this.logLevel = level;
    this.saveSettings();
  }
  
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
  
  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    // Add to history
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
    
    // Output to console
    const consoleMethod = level === 'debug' ? 'debug' :
                         level === 'info' ? 'info' :
                         level === 'warn' ? 'warn' : 'error';
    
    const prefix = `[LyX Hotkey] ${timestamp}`;
    if (data) {
      console[consoleMethod](prefix, message, data);
    } else {
      console[consoleMethod](prefix, message);
    }
  }
  
  debug(message, data) {
    if (this.debugMode) {
      this.log('debug', message, data);
    }
  }
  
  info(message, data) {
    this.log('info', message, data);
  }
  
  warn(message, data) {
    this.log('warn', message, data);
  }
  
  error(message, data) {
    this.log('error', message, data);
  }
  
  getHistory(level = null) {
    if (level) {
      return this.logHistory.filter(entry => entry.level === level);
    }
    return [...this.logHistory];
  }
  
  clearHistory() {
    this.logHistory = [];
  }
  
  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      debugMode: this.debugMode,
      logLevel: this.logLevel,
      logs: this.logHistory
    };
  }
}

// Create global logger instance
const logger = new Logger();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Logger, logger };
} else if (typeof window !== 'undefined') {
  window.LyXLogger = { Logger, logger };
}