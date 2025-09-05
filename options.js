/**
 * Options Script for LyX Hotkey Plugin
 * Handles the settings page functionality
 */

document.addEventListener('DOMContentLoaded', async function() {
  const elements = {
    messageContainer: document.getElementById('messageContainer'),
    enableExtension: document.getElementById('enableExtension'),
    sequenceTimeout: document.getElementById('sequenceTimeout'),
    timeoutDisplay: document.getElementById('timeoutDisplay'),
    debugMode: document.getElementById('debugMode'),
    fileUpload: document.getElementById('fileUpload'),
    fileInput: document.getElementById('fileInput'),
    bindingsText: document.getElementById('bindingsText'),
    loadBindings: document.getElementById('loadBindings'),
    loadSample: document.getElementById('loadSample'),
    clearBindings: document.getElementById('clearBindings'),
    totalBindings: document.getElementById('totalBindings'),
    multiStepBindings: document.getElementById('multiStepBindings'),
    conflictCount: document.getElementById('conflictCount'),
    hotkeyList: document.getElementById('hotkeyList'),
    conflictsList: document.getElementById('conflictsList'),
    conflictsContent: document.getElementById('conflictsContent'),
    exportSettings: document.getElementById('exportSettings'),
    importSettings: document.getElementById('importSettings'),
    exportLogs: document.getElementById('exportLogs'),
    resetSettings: document.getElementById('resetSettings'),
    importFile: document.getElementById('importFile')
  };
  
  let currentBindings = {};
  let currentConflicts = [];
  
  // Initialize the page
  await loadSettings();
  setupEventListeners();
  await updateBindingsList();
  
  function setupEventListeners() {
    // Settings changes
    elements.enableExtension.addEventListener('change', saveSettings);
    elements.sequenceTimeout.addEventListener('input', updateTimeoutDisplay);
    elements.sequenceTimeout.addEventListener('change', saveSettings);
    elements.debugMode.addEventListener('change', saveSettings);
    
    // File upload
    elements.fileUpload.addEventListener('click', () => {
      elements.fileInput.click();
    });
    
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    elements.fileUpload.addEventListener('dragover', handleDragOver);
    elements.fileUpload.addEventListener('drop', handleDrop);
    elements.fileUpload.addEventListener('dragleave', handleDragLeave);
    
    // Bindings management
    elements.loadBindings.addEventListener('click', loadBindingsFromText);
    elements.loadSample.addEventListener('click', loadSampleBindings);
    elements.clearBindings.addEventListener('click', clearBindings);
    
    // Advanced features
    elements.exportSettings.addEventListener('click', exportSettings);
    elements.importSettings.addEventListener('click', () => {
      elements.importFile.click();
    });
    elements.importFile.addEventListener('change', importSettings);
    elements.exportLogs.addEventListener('click', exportLogs);
    elements.resetSettings.addEventListener('click', resetSettings);
  }
  
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'hotkeyEnabled',
        'sequenceTimeout',
        'debugMode',
        'loadedBindings'
      ]);
      
      elements.enableExtension.checked = settings.hotkeyEnabled !== false;
      elements.sequenceTimeout.value = settings.sequenceTimeout || 1500;
      elements.debugMode.checked = settings.debugMode || false;
      
      if (settings.loadedBindings && typeof settings.loadedBindings === 'string') {
        elements.bindingsText.value = settings.loadedBindings;
      }
      
      updateTimeoutDisplay();
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      showMessage('Failed to load settings', 'error');
    }
  }
  
  async function saveSettings() {
    try {
      const settings = {
        hotkeyEnabled: elements.enableExtension.checked,
        sequenceTimeout: parseInt(elements.sequenceTimeout.value),
        debugMode: elements.debugMode.checked
      };
      
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: settings
      });
      
      showMessage('Settings saved successfully', 'success');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      showMessage('Failed to save settings', 'error');
    }
  }
  
  function updateTimeoutDisplay() {
    elements.timeoutDisplay.textContent = `${elements.sequenceTimeout.value}ms`;
  }
  
  function handleDragOver(event) {
    event.preventDefault();
    elements.fileUpload.classList.add('dragover');
  }
  
  function handleDragLeave(event) {
    event.preventDefault();
    elements.fileUpload.classList.remove('dragover');
  }
  
  function handleDrop(event) {
    event.preventDefault();
    elements.fileUpload.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }
  
  function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }
  
  async function handleFile(file) {
    try {
      const content = await readFileAsText(file);
      elements.bindingsText.value = content;
      showMessage(`Loaded file: ${file.name}`, 'success');
    } catch (error) {
      console.error('Failed to read file:', error);
      showMessage('Failed to read file', 'error');
    }
  }
  
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }
  
  async function loadBindingsFromText() {
    try {
      const content = elements.bindingsText.value.trim();
      if (!content) {
        showMessage('Please enter bind file content or upload a file', 'error');
        return;
      }
      
      elements.loadBindings.disabled = true;
      elements.loadBindings.textContent = 'Loading...';
      
      const response = await chrome.runtime.sendMessage({
        action: 'loadBindingsFile',
        content: content
      });
      
      if (response.success) {
        showMessage('Bindings loaded successfully', 'success');
        await updateBindingsList();
      } else {
        showMessage('Failed to load bindings', 'error');
      }
      
    } catch (error) {
      console.error('Failed to load bindings:', error);
      showMessage('Failed to load bindings', 'error');
    } finally {
      elements.loadBindings.disabled = false;
      elements.loadBindings.textContent = 'Load Bindings';
    }
  }
  
  async function loadSampleBindings() {
    const sampleBindings = `# Sample LyX Math Bindings
Format 4

# Basic math functions
\\bind "M-m f"		"math-insert \\frac"
\\bind "M-m s"		"math-insert \\sqrt"
\\bind "M-m x"		"math-subscript"
\\bind "M-m e"		"math-superscript"

# Greek letters
\\bind "M-m g a"		"math-insert \\alpha"
\\bind "M-m g b"		"math-insert \\beta"
\\bind "M-m g g"		"math-insert \\gamma"
\\bind "M-m g d"		"math-insert \\delta"
\\bind "M-m g e"		"math-insert \\epsilon"
\\bind "M-m g l"		"math-insert \\lambda"
\\bind "M-m g m"		"math-insert \\mu"
\\bind "M-m g p"		"math-insert \\pi"
\\bind "M-m g s"		"math-insert \\sigma"
\\bind "M-m g t"		"math-insert \\tau"
\\bind "M-m g o"		"math-insert \\omega"

# Mathematical operators
\\bind "M-m u"		"math-insert \\sum"
\\bind "M-m i"		"math-insert \\int"
\\bind "M-m 8"		"math-insert \\infty"
\\bind "M-m ~S-plus"	"math-insert \\pm"
\\bind "M-m ~S-equal"	"math-insert \\neq"`;
    
    elements.bindingsText.value = sampleBindings;
    showMessage('Sample bindings loaded. Click "Load Bindings" to activate them.', 'success');
  }
  
  async function clearBindings() {
    if (!confirm('Are you sure you want to clear all bindings?')) {
      return;
    }
    
    try {
      await chrome.storage.sync.remove('loadedBindings');
      elements.bindingsText.value = '';
      currentBindings = {};
      currentConflicts = [];
      
      updateBindingsDisplay();
      showMessage('Bindings cleared', 'success');
      
    } catch (error) {
      console.error('Failed to clear bindings:', error);
      showMessage('Failed to clear bindings', 'error');
    }
  }
  
  async function updateBindingsList() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'forwardToContent',
        contentMessage: { action: 'getStatus' }
      });
      
      if (response.success) {
        const { bindings, conflicts } = response;
        
        if (bindings) {
          currentBindings = bindings;
          elements.totalBindings.textContent = bindings.totalBindings || 0;
          elements.multiStepBindings.textContent = bindings.multiStepBindings || 0;
        }
        
        if (conflicts) {
          currentConflicts = conflicts;
          elements.conflictCount.textContent = conflicts.length || 0;
        }
        
        updateBindingsDisplay();
        updateConflictsDisplay();
      }
      
    } catch (error) {
      console.error('Failed to update bindings list:', error);
    }
  }
  
  function updateBindingsDisplay() {
    if (!currentBindings || currentBindings.totalBindings === 0) {
      elements.hotkeyList.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666;">
          No bindings loaded
        </div>
      `;
      return;
    }
    
    // For now, show basic stats. In a full implementation, 
    // we'd fetch the actual binding details from the content script
    elements.hotkeyList.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #666;">
        ${currentBindings.totalBindings} bindings loaded successfully
        <br><small>Use the popup or test in an input field to see them in action</small>
      </div>
    `;
  }
  
  function updateConflictsDisplay() {
    if (!currentConflicts || currentConflicts.length === 0) {
      elements.conflictsList.classList.add('hidden');
      return;
    }
    
    elements.conflictsList.classList.remove('hidden');
    elements.conflictsContent.innerHTML = currentConflicts
      .map(conflict => `<div class="conflict-item">${conflict}</div>`)
      .join('');
  }
  
  async function exportSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'exportData' });
      
      if (response.success) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lyx-hotkey-settings-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showMessage('Settings exported successfully', 'success');
      }
      
    } catch (error) {
      console.error('Failed to export settings:', error);
      showMessage('Failed to export settings', 'error');
    }
  }
  
  async function importSettings(event) {
    try {
      const files = event.target.files;
      if (files.length === 0) return;
      
      const content = await readFileAsText(files[0]);
      const data = JSON.parse(content);
      
      const response = await chrome.runtime.sendMessage({
        action: 'importData',
        data: data
      });
      
      if (response.success) {
        showMessage('Settings imported successfully. Please reload the page.', 'success');
        setTimeout(() => location.reload(), 2000);
      }
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      showMessage('Failed to import settings. Please check the file format.', 'error');
    }
  }
  
  async function exportLogs() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'forwardToContent',
        contentMessage: { action: 'exportLogs' }
      });
      
      if (response.success && response.logs) {
        const blob = new Blob([JSON.stringify(response.logs, null, 2)], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lyx-hotkey-logs-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showMessage('Debug logs exported successfully', 'success');
      } else {
        showMessage('No logs available to export', 'error');
      }
      
    } catch (error) {
      console.error('Failed to export logs:', error);
      showMessage('Failed to export logs', 'error');
    }
  }
  
  async function resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.storage.sync.clear();
      showMessage('Settings reset to defaults. Please reload the page.', 'success');
      setTimeout(() => location.reload(), 2000);
      
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showMessage('Failed to reset settings', 'error');
    }
  }
  
  function showMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    
    elements.messageContainer.appendChild(messageDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 5000);
  }
});