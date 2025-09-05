/**
 * Background Script for LyX Hotkey Plugin
 * Handles global state, communication, and chrome extension APIs
 */

// Service worker for Manifest V3
console.log('LyX Hotkey Plugin background script loaded');

class BackgroundController {
  constructor() {
    this.activeTabId = null;
    this.extensionState = {
      enabled: true,
      bindingsLoaded: false,
      totalBindings: 0
    };
    
    this.setupEventListeners();
    this.loadSettings();
  }
  
  setupEventListeners() {
    // Handle extension installation/startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });
    
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });
    
    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
    
    // Handle tab changes
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.activeTabId = activeInfo.tabId;
    });
    
    // Handle action (toolbar button) clicks
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });
    
    // Monitor storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }
  
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'hotkeyEnabled',
        'loadedBindings',
        'sequenceTimeout',
        'debugMode'
      ]);
      
      this.extensionState.enabled = settings.hotkeyEnabled !== false;
      this.extensionState.bindingsLoaded = !!settings.loadedBindings;
      
      // Update badge based on state
      this.updateBadge();
      
      console.log('Background controller initialized with settings:', settings);
      
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  handleStartup() {
    console.log('Extension startup');
    this.loadSettings();
  }
  
  handleInstall(details) {
    console.log('Extension installed/updated:', details);
    
    if (details.reason === 'install') {
      // Set default settings on first install
      chrome.storage.sync.set({
        hotkeyEnabled: true,
        sequenceTimeout: 1500,
        debugMode: true  // Enable debug mode by default for troubleshooting
      });
      
      // Open options page on first install
      chrome.runtime.openOptionsPage();
    }
  }
  
  async handleMessage(message, sender, sendResponse) {
    console.log('Background received message:', message, 'from:', sender);
    
    try {
      switch (message.action) {
        case 'contentScriptReady':
          this.handleContentScriptReady(sender.tab.id);
          sendResponse({ success: true });
          break;
          
        case 'toggleExtension':
          await this.toggleExtension();
          sendResponse({ success: true, enabled: this.extensionState.enabled });
          break;
          
        case 'getState':
          sendResponse({
            success: true,
            state: this.extensionState,
            activeTabId: this.activeTabId
          });
          break;
          
        case 'loadBindingsFile':
          await this.loadBindingsFile(message.content);
          sendResponse({ success: true });
          break;
          
        case 'updateSettings':
          await this.updateSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'forwardToContent':
          // Forward message to active content script
          this.forwardToContentScript(message.contentMessage, sendResponse);
          break;
          
        case 'exportData':
          const exportData = await this.exportExtensionData();
          sendResponse({ success: true, data: exportData });
          break;
          
        case 'importData':
          await this.importExtensionData(message.data);
          sendResponse({ success: true });
          break;
          
        default:
          console.warn('Unknown background message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  handleContentScriptReady(tabId) {
    console.log('Content script ready on tab:', tabId);
    // Could send initial configuration here if needed
  }
  
  async toggleExtension() {
    this.extensionState.enabled = !this.extensionState.enabled;
    
    await chrome.storage.sync.set({
      hotkeyEnabled: this.extensionState.enabled
    });
    
    this.updateBadge();
    
    // Notify all content scripts
    this.broadcastToContentScripts({
      action: this.extensionState.enabled ? 'activate' : 'deactivate'
    });
    
    console.log('Extension toggled:', this.extensionState.enabled);
  }
  
  async handleActionClick(tab) {
    // Toggle extension when toolbar button is clicked
    await this.toggleExtension();
  }
  
  async loadBindingsFile(content) {
    try {
      await chrome.storage.sync.set({
        loadedBindings: content
      });
      
      this.extensionState.bindingsLoaded = true;
      this.updateBadge();
      
      // Notify content scripts about new bindings
      this.broadcastToContentScripts({
        action: 'loadBindings',
        data: content
      });
      
      console.log('Bindings file loaded successfully');
      
    } catch (error) {
      console.error('Failed to load bindings file:', error);
      throw error;
    }
  }
  
  async updateSettings(settings) {
    try {
      await chrome.storage.sync.set(settings);
      
      // Update local state
      if ('hotkeyEnabled' in settings) {
        this.extensionState.enabled = settings.hotkeyEnabled;
        this.updateBadge();
      }
      
      console.log('Settings updated:', settings);
      
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }
  
  forwardToContentScript(message, sendResponse) {
    if (!this.activeTabId) {
      console.warn('No active tab available for forwarding message');
      sendResponse({ success: false, error: 'No active tab' });
      return;
    }
    
    console.log('Forwarding message to content script on tab:', this.activeTabId, 'message:', message);
    
    chrome.tabs.sendMessage(this.activeTabId, message)
      .then(response => {
        console.log('Content script response:', response);
        sendResponse(response || { success: false, error: 'No response from content script' });
      })
      .catch(error => {
        console.error('Failed to forward message to content script:', error);
        // Try to find any active tab with the content script
        this.findActiveContentScript()
          .then(tabId => {
            if (tabId && tabId !== this.activeTabId) {
              console.log('Retrying with different tab:', tabId);
              this.activeTabId = tabId;
              return chrome.tabs.sendMessage(tabId, message);
            }
            throw error;
          })
          .then(response => {
            console.log('Retry content script response:', response);
            sendResponse(response || { success: false, error: 'No response from content script' });
          })
          .catch(retryError => {
            console.error('Retry also failed:', retryError);
            sendResponse({ success: false, error: error.message });
          });
      });
  }
  
  async findActiveContentScript() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        return tabs[0].id;
      }
      
      // Fallback: try all tabs
      const allTabs = await chrome.tabs.query({});
      for (const tab of allTabs) {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          return tab.id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding active content script:', error);
      return null;
    }
  }
  
  broadcastToContentScripts(message) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors - tab might not have content script
        });
      });
    });
  }
  
  updateBadge() {
    let text = '';
    let color = '#666666';
    
    if (!this.extensionState.enabled) {
      text = 'OFF';
      color = '#ff4444';
    } else if (!this.extensionState.bindingsLoaded) {
      text = '!';
      color = '#ffaa00';
    } else {
      text = 'ON';
      color = '#44ff44';
    }
    
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    
    // Update title
    const title = this.extensionState.enabled 
      ? (this.extensionState.bindingsLoaded 
         ? 'LyX Hotkey Plugin (Active)' 
         : 'LyX Hotkey Plugin (No bindings loaded)')
      : 'LyX Hotkey Plugin (Disabled)';
    
    chrome.action.setTitle({ title });
  }
  
  handleStorageChange(changes, namespace) {
    if (namespace !== 'sync') return;
    
    console.log('Storage changed:', changes);
    
    if (changes.hotkeyEnabled) {
      this.extensionState.enabled = changes.hotkeyEnabled.newValue;
      this.updateBadge();
    }
    
    if (changes.loadedBindings) {
      this.extensionState.bindingsLoaded = !!changes.loadedBindings.newValue;
      this.updateBadge();
    }
  }
  
  async exportExtensionData() {
    try {
      const data = await chrome.storage.sync.get();
      return {
        timestamp: new Date().toISOString(),
        version: chrome.runtime.getManifest().version,
        data: data
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }
  
  async importExtensionData(importData) {
    try {
      if (!importData.data) {
        throw new Error('Invalid import data format');
      }
      
      await chrome.storage.sync.set(importData.data);
      await this.loadSettings();
      
      console.log('Data imported successfully');
      
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }
  
  // Handle context menu (could be added later)
  setupContextMenu() {
    chrome.contextMenus.create({
      id: 'lyx-hotkey-toggle',
      title: 'Toggle LyX Hotkeys',
      contexts: ['editable']
    });
    
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'lyx-hotkey-toggle') {
        this.toggleExtension();
      }
    });
  }
}

// Initialize background controller
const backgroundController = new BackgroundController();