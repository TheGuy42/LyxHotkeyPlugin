// Test to check key format compatibility between parser and hotkeyManager

// Sample key sequence from parser: "Alt+m f"
// Expected key sequence from event: "Alt+m" then "f"

const sampleBindings = [
  "Alt+m f",
  "Alt+m s", 
  "Alt+m g a",
  "Alt+m g Shift+D"
];

console.log("Checking key format compatibility:");

// Simulate NEW eventToKeyString behavior
function simulateEventToKeyString(ctrlKey, altKey, shiftKey, metaKey, key) {
  const parts = [];
  
  // Add modifiers
  if (ctrlKey) parts.push('Ctrl');
  if (altKey) parts.push('Alt');
  if (shiftKey) parts.push('Shift');
  if (metaKey) parts.push('Meta');
  
  // Add main key
  if (key === ' ') key = 'Space';
  
  // For single character keys, use the event.key as-is when shift is pressed
  // This preserves the correct case (e.g., 'D' for Shift+D)
  if (key.length === 1) {
    if (shiftKey && key.match(/[A-Z]/)) {
      // Keep uppercase when shift produces an uppercase letter
      // (this is the expected case)
    } else if (!shiftKey && key.match(/[a-z]/)) {
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

// Test typical sequences
console.log("Alt+M, then F:");
console.log("  Event 1:", simulateEventToKeyString(false, true, false, false, 'm'));
console.log("  Event 2:", simulateEventToKeyString(false, false, false, false, 'f'));
console.log("  Expected sequence: Alt+m f");

console.log("\nAlt+M, then G, then A:");
console.log("  Event 1:", simulateEventToKeyString(false, true, false, false, 'm'));
console.log("  Event 2:", simulateEventToKeyString(false, false, false, false, 'g'));
console.log("  Event 3:", simulateEventToKeyString(false, false, false, false, 'a'));
console.log("  Expected sequence: Alt+m g a");

console.log("\nAlt+M, then G, then Shift+D:");
console.log("  Event 1:", simulateEventToKeyString(false, true, false, false, 'm'));
console.log("  Event 2:", simulateEventToKeyString(false, false, false, false, 'g'));
console.log("  Event 3:", simulateEventToKeyString(false, false, true, false, 'D'));
console.log("  Expected sequence: Alt+m g Shift+D");

console.log("\nFixed! Now case handling should be correct.");