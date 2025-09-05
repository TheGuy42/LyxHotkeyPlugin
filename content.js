/**
 * Content Script for LyX Hotkey Plugin
 * Coordinates all components and handles page-level functionality
 */

// Initialize components when DOM is ready
(function() {
  'use strict';
  
  // Wait for all modules to be loaded
  if (typeof window.LyXLogger === 'undefined' || 
      typeof window.LyXParser === 'undefined' ||
      typeof window.LyXHotkeyManager === 'undefined' ||
      typeof window.LyXInserter === 'undefined') {
    setTimeout(arguments.callee, 50);
    return;
  }
  
  const logger = window.LyXLogger.logger;
  const parser = new window.LyXParser();
  const hotkeyManager = new window.LyXHotkeyManager();
  const inserter = window.LyXInserter;
  
  logger.info('LyX Hotkey Plugin content script initialized');
  
  class LyXHotkeyPlugin {
    constructor() {
      this.isActive = false;
      this.loadedBindings = null;
      
      // Load settings and start
      this.initialize();
    }
    
    async initialize() {
      try {
        // Load settings from storage
        const settings = await chrome.storage.sync.get([
          'hotkeyEnabled',
          'loadedBindings',
          'debugMode',
          'sequenceTimeout'
        ]);
        
        // Configure logger
        if (settings.debugMode) {
          logger.setDebugMode(true);
        }
        
        // Configure hotkey manager
        if (settings.sequenceTimeout) {
          hotkeyManager.setSequenceTimeout(settings.sequenceTimeout);
        }
        
        // Load bindings if available
        if (settings.loadedBindings) {
          this.loadBindings(settings.loadedBindings);
        }
        
        // Enable if configured
        if (settings.hotkeyEnabled !== false) {
          this.activate();
        }
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          this.handleMessage(message, sender, sendResponse);
        });
        
        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
          this.handleStorageChange(changes, namespace);
        });
        
        logger.info('LyX Hotkey Plugin fully initialized');
        
      } catch (error) {
        logger.error('Failed to initialize plugin:', error);
      }
    }
    
    /**
     * Load key bindings from data
     * @param {Object} bindingsData - Bindings data from storage
     */
    loadBindings(bindingsData) {
      try {
        if (typeof bindingsData === 'string') {
          // Parse LyX bind file content
          const bindings = parser.parse(bindingsData);
          hotkeyManager.loadBindings(bindings);
          this.loadedBindings = bindingsData;
          logger.info('Loaded bindings from LyX file content');
        } else if (typeof bindingsData === 'object') {
          // Import previously parsed bindings
          parser.importBindings(bindingsData);
          hotkeyManager.loadBindings(parser.getBindings());
          this.loadedBindings = bindingsData;
          logger.info('Loaded bindings from parsed data');
        }
        
        // Save to storage
        chrome.storage.sync.set({ loadedBindings: this.loadedBindings });
        
      } catch (error) {
        logger.error('Failed to load bindings:', error);
      }
    }
    
    /**
     * Activate hotkey processing
     */
    activate() {
      if (this.isActive) return;
      
      hotkeyManager.setEnabled(true);
      hotkeyManager.startListening();
      this.isActive = true;
      
      logger.info('LyX Hotkey Plugin activated');
      this.showStatus('LyX Hotkey Plugin activated');
    }
    
    /**
     * Deactivate hotkey processing
     */
    deactivate() {
      if (!this.isActive) return;
      
      hotkeyManager.setEnabled(false);
      hotkeyManager.stopListening();
      this.isActive = false;
      
      logger.info('LyX Hotkey Plugin deactivated');
      this.showStatus('LyX Hotkey Plugin deactivated');
    }
    
    /**
     * Toggle activation state
     */
    toggle() {
      if (this.isActive) {
        this.deactivate();
      } else {
        this.activate();
      }
    }
    
    /**
     * Handle messages from background script or popup
     * @param {Object} message - Message object
     * @param {Object} sender - Sender information
     * @param {Function} sendResponse - Response callback
     */
    handleMessage(message, sender, sendResponse) {
      logger.debug('Received message:', message);
      
      switch (message.action) {
        case 'toggle':
          this.toggle();
          sendResponse({ success: true, active: this.isActive });
          break;
          
        case 'activate':
          this.activate();
          sendResponse({ success: true, active: this.isActive });
          break;
          
        case 'deactivate':
          this.deactivate();
          sendResponse({ success: true, active: this.isActive });
          break;
          
        case 'loadBindings':
          this.loadBindings(message.data);
          sendResponse({ success: true });
          break;
          
        case 'getStatus':
          sendResponse({
            active: this.isActive,
            bindings: hotkeyManager.getStatistics(),
            conflicts: Array.from(hotkeyManager.getConflicts()),
            currentSequence: hotkeyManager.getCurrentSequence()
          });
          break;
          
        case 'setSequenceTimeout':
          hotkeyManager.setSequenceTimeout(message.timeout);
          sendResponse({ success: true });
          break;
          
        case 'setDebugMode':
          logger.setDebugMode(message.enabled);
          sendResponse({ success: true });
          break;
          
        case 'exportLogs':
          sendResponse({ logs: logger.exportLogs() });
          break;
          
        case 'clearLogs':
          logger.clearHistory();
          sendResponse({ success: true });
          break;
          
        case 'testInsertion':
          const success = inserter.insertText(message.text, document.activeElement);
          sendResponse({ success });
          break;
          
        default:
          logger.warn('Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    }
    
    /**
     * Handle storage changes
     * @param {Object} changes - Storage changes
     * @param {string} namespace - Storage namespace
     */
    handleStorageChange(changes, namespace) {
      if (namespace !== 'sync') return;
      
      logger.debug('Storage changed:', changes);
      
      if (changes.hotkeyEnabled) {
        const enabled = changes.hotkeyEnabled.newValue;
        if (enabled && !this.isActive) {
          this.activate();
        } else if (!enabled && this.isActive) {
          this.deactivate();
        }
      }
      
      if (changes.sequenceTimeout) {
        hotkeyManager.setSequenceTimeout(changes.sequenceTimeout.newValue);
      }
      
      if (changes.debugMode) {
        logger.setDebugMode(changes.debugMode.newValue);
      }
      
      if (changes.loadedBindings) {
        this.loadBindings(changes.loadedBindings.newValue);
      }
    }
    
    /**
     * Show status message to user
     * @param {string} message - Status message
     */
    showStatus(message) {
      // Create a temporary status indicator
      const statusDiv = document.createElement('div');
      statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: #fff;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      statusDiv.textContent = message;
      
      document.body.appendChild(statusDiv);
      
      // Fade in
      setTimeout(() => {
        statusDiv.style.opacity = '1';
      }, 10);
      
      // Remove after delay
      setTimeout(() => {
        statusDiv.style.opacity = '0';
        setTimeout(() => {
          if (statusDiv.parentNode) {
            statusDiv.parentNode.removeChild(statusDiv);
          }
        }, 300);
      }, 2000);
    }
    
    /**
     * Get current plugin status
     * @returns {Object} - Status object
     */
    getStatus() {
      return {
        active: this.isActive,
        hasBindings: this.loadedBindings !== null,
        bindingCount: hotkeyManager.getStatistics().totalBindings,
        conflicts: hotkeyManager.getConflicts().size,
        currentSequence: hotkeyManager.getCurrentSequence()
      };
    }
  }
  
  // Create global plugin instance
  window.lyxHotkeyPlugin = new LyXHotkeyPlugin();
  
  // Notify background script that content script is ready
  chrome.runtime.sendMessage({ action: 'contentScriptReady' }).catch(() => {
    // Ignore errors - background script might not be ready yet
  });
  
})();