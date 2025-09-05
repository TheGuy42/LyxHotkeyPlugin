/**
 * Content Script for LyX Hotkey Plugin
 * Coordinates all components and handles page-level functionality
 */

// Initialize components when DOM is ready
(function() {
  'use strict';
  
  let initAttempts = 0;
  const maxAttempts = 100; // 5 seconds max wait time
  
  function initializePlugin() {
    initAttempts++;
    
    // Wait for all modules to be loaded
    if (typeof window.LyXLogger === 'undefined' || 
        typeof window.LyXParser === 'undefined' ||
        typeof window.LyXHotkeyManager === 'undefined' ||
        typeof window.LyXInserter === 'undefined') {
      
      if (initAttempts >= maxAttempts) {
        console.error('LyX Hotkey Plugin: Failed to load required modules after maximum attempts');
        return;
      }
      
      setTimeout(initializePlugin, 50);
      return;
    }
    
    console.log('LyX Hotkey Plugin: All modules loaded, initializing...');
    
    const logger = window.LyXLogger.logger;
    const parser = new window.LyXParser();
    const hotkeyManager = new window.LyXHotkeyManager();
    const inserter = window.LyXInserter;
    
    logger.info('LyX Hotkey Plugin content script initialized');
    
    class LyXHotkeyPlugin {
    constructor() {
      this.isActive = false;
      this.loadedBindings = null;
      this.isInitialized = false;
      
      // Start initialization (async)
      this.initialize().then(() => {
        this.isInitialized = true;
        logger.info('LyX Hotkey Plugin initialization completed');
      }).catch((error) => {
        logger.error('Failed to initialize LyX Hotkey Plugin:', error);
      });
    }
    
    async initialize() {
      try {
        // Load settings from storage
        logger.debug('Loading settings from storage...');
        const settings = await chrome.storage.sync.get([
          'hotkeyEnabled',
          'loadedBindings',
          'debugMode',
          'sequenceTimeout'
        ]);
        
        logger.debug('Loaded settings:', settings);
        
        // Configure logger
        if (settings.debugMode) {
          logger.setDebugMode(true);
          logger.debug('Debug mode enabled');
        }
        
        // Configure hotkey manager
        if (settings.sequenceTimeout) {
          logger.debug('Setting sequence timeout:', settings.sequenceTimeout);
          hotkeyManager.setSequenceTimeout(settings.sequenceTimeout);
        }
        
        // Load bindings if available
        if (settings.loadedBindings) {
          logger.debug('Found loaded bindings in storage, loading...');
          this.loadBindings(settings.loadedBindings);
        } else {
          logger.debug('No loaded bindings found in storage');
        }
        
        // Enable if configured
        if (settings.hotkeyEnabled !== false) {
          logger.debug('Activating plugin...');
          this.activate();
        } else {
          logger.debug('Plugin disabled in settings');
        }
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          this.handleMessage(message, sender, sendResponse);
        });
        
        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
          this.handleStorageChange(changes, namespace);
        });
        
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
        logger.debug('Loading bindings with data type:', typeof bindingsData, 'data:', bindingsData);
        
        if (typeof bindingsData === 'string') {
          // Parse LyX bind file content
          logger.debug('Parsing LyX bind file content, length:', bindingsData.length);
          const bindings = parser.parse(bindingsData);
          logger.debug('Parser returned bindings map with size:', bindings.size);
          hotkeyManager.loadBindings(bindings);
          this.loadedBindings = bindingsData;
          logger.info(`Loaded ${bindings.size} bindings from LyX file content`);
        } else if (typeof bindingsData === 'object' && bindingsData !== null) {
          // Import previously parsed bindings
          logger.debug('Importing previously parsed bindings, keys:', Object.keys(bindingsData));
          parser.importBindings(bindingsData);
          const bindings = parser.getBindings();
          logger.debug('Imported bindings map with size:', bindings.size);
          hotkeyManager.loadBindings(bindings);
          this.loadedBindings = bindingsData;
          logger.info(`Loaded ${bindings.size} bindings from parsed data`);
        } else {
          logger.warn('Invalid bindings data format:', typeof bindingsData, bindingsData);
          return;
        }
        
        // Save to storage
        chrome.storage.sync.set({ loadedBindings: this.loadedBindings });
        
        // Log final statistics
        const stats = hotkeyManager.getStatistics();
        logger.info('Final hotkey manager stats:', stats);
        
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
      
      try {
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
            try {
              if (!this.isInitialized) {
                sendResponse({
                  success: true,
                  active: false,
                  bindings: { totalBindings: 0, enabled: false },
                  conflicts: [],
                  currentSequence: [],
                  initializing: true
                });
                break;
              }
              
              const stats = hotkeyManager.getStatistics();
              const conflicts = Array.from(hotkeyManager.getConflicts());
              const currentSequence = hotkeyManager.getCurrentSequence();
              
              sendResponse({
                success: true,
                active: this.isActive,
                bindings: stats,
                conflicts: conflicts,
                currentSequence: currentSequence
              });
            } catch (error) {
              logger.error('Error getting status:', error);
              sendResponse({
                success: false,
                error: error.message,
                active: this.isActive,
                bindings: { totalBindings: 0 },
                conflicts: [],
                currentSequence: []
              });
            }
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
            sendResponse({ success: true, logs: logger.exportLogs() });
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
      } catch (error) {
        logger.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
      
      // Return true to indicate we'll send response asynchronously if needed
      return true;
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
    chrome.runtime.sendMessage({ action: 'contentScriptReady' }).catch((error) => {
      console.warn('LyX Hotkey Plugin: Could not notify background script (this is normal during extension startup):', error.message);
    });
  }
  
  // Start initialization
  initializePlugin();
  
})();