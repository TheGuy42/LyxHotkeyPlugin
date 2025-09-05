/**
 * Popup Script for LyX Hotkey Plugin
 * Handles the popup interface and communication with background script
 */

document.addEventListener('DOMContentLoaded', async function() {
  const elements = {
    status: document.getElementById('status'),
    statusText: document.getElementById('statusText'),
    currentSequence: document.getElementById('currentSequence'),
    sequenceText: document.getElementById('sequenceText'),
    toggleBtn: document.getElementById('toggleBtn'),
    optionsBtn: document.getElementById('optionsBtn'),
    bindingCount: document.getElementById('bindingCount'),
    conflictCount: document.getElementById('conflictCount'),
    timeoutValue: document.getElementById('timeoutValue')
  };
  
  let currentState = null;
  
  // Initialize popup
  await loadStatus();
  setupEventListeners();
  
  // Auto-refresh sequence display
  setInterval(updateSequenceDisplay, 500);
  
  function setupEventListeners() {
    elements.toggleBtn.addEventListener('click', async () => {
      await toggleExtension();
    });
    
    elements.optionsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }
  
  async function loadStatus() {
    try {
      elements.status.classList.add('loading');
      
      // Get extension state
      const response = await chrome.runtime.sendMessage({ action: 'getState' });
      if (response.success) {
        currentState = response.state;
        updateStatusDisplay();
      }
      
      // Get content script status
      const contentResponse = await chrome.runtime.sendMessage({
        action: 'forwardToContent',
        contentMessage: { action: 'getStatus' }
      });
      
      if (contentResponse.success) {
        updateDetailedStatus(contentResponse);
      }
      
    } catch (error) {
      console.error('Failed to load status:', error);
      showError('Failed to load extension status');
    } finally {
      elements.status.classList.remove('loading');
    }
  }
  
  function updateStatusDisplay() {
    if (!currentState) return;
    
    const { enabled, bindingsLoaded } = currentState;
    
    if (!enabled) {
      elements.status.className = 'status inactive';
      elements.statusText.textContent = 'Extension is disabled';
      elements.toggleBtn.textContent = 'Enable Extension';
      elements.toggleBtn.className = 'button primary';
    } else if (!bindingsLoaded) {
      elements.status.className = 'status warning';
      elements.statusText.textContent = 'No hotkey bindings loaded';
      elements.toggleBtn.textContent = 'Disable Extension';
      elements.toggleBtn.className = 'button danger';
    } else {
      elements.status.className = 'status active';
      elements.statusText.textContent = 'Extension is active and ready';
      elements.toggleBtn.textContent = 'Disable Extension';
      elements.toggleBtn.className = 'button danger';
    }
  }
  
  function updateDetailedStatus(response) {
    if (!response.success) return;
    
    const { bindings, conflicts, currentSequence } = response;
    
    // Update statistics
    elements.bindingCount.textContent = bindings?.totalBindings || '0';
    elements.conflictCount.textContent = conflicts?.length || '0';
    elements.timeoutValue.textContent = bindings?.sequenceTimeout ? 
      `${bindings.sequenceTimeout}ms` : '-';
    
    // Update sequence display
    if (currentSequence && currentSequence.length > 0) {
      elements.sequenceText.textContent = currentSequence.join(' ');
      elements.currentSequence.classList.remove('hidden');
    } else {
      elements.currentSequence.classList.add('hidden');
    }
    
    // Show conflicts warning
    if (conflicts && conflicts.length > 0) {
      elements.conflictCount.style.color = '#f57c00';
      elements.conflictCount.title = 'Click Settings to view conflicts';
    } else {
      elements.conflictCount.style.color = '#666';
      elements.conflictCount.title = '';
    }
  }
  
  async function updateSequenceDisplay() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'forwardToContent',
        contentMessage: { action: 'getStatus' }
      });
      
      if (response.success && response.currentSequence) {
        if (response.currentSequence.length > 0) {
          elements.sequenceText.textContent = response.currentSequence.join(' ');
          elements.currentSequence.classList.remove('hidden');
        } else {
          elements.currentSequence.classList.add('hidden');
        }
      }
    } catch (error) {
      // Ignore errors during sequence update
    }
  }
  
  async function toggleExtension() {
    try {
      elements.toggleBtn.disabled = true;
      elements.toggleBtn.textContent = 'Please wait...';
      
      const response = await chrome.runtime.sendMessage({ action: 'toggleExtension' });
      
      if (response.success) {
        currentState.enabled = response.enabled;
        updateStatusDisplay();
        
        // Show feedback
        showSuccess(response.enabled ? 'Extension enabled' : 'Extension disabled');
      } else {
        showError('Failed to toggle extension');
      }
      
    } catch (error) {
      console.error('Failed to toggle extension:', error);
      showError('Failed to toggle extension');
    } finally {
      elements.toggleBtn.disabled = false;
      updateStatusDisplay();
    }
  }
  
  function showSuccess(message) {
    showMessage(message, 'success');
  }
  
  function showError(message) {
    showMessage(message, 'error');
  }
  
  function showMessage(message, type) {
    // Create temporary message
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      ${type === 'success' ? 
        'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' :
        'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
      }
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Fade in
    setTimeout(() => {
      messageDiv.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 2000);
  }
});