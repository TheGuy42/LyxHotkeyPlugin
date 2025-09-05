// Simple test script to check if the parser works correctly
// This simulates the browser environment for testing

// Mock window object
global.window = {
  LyXLogger: {
    logger: {
      debug: (...args) => console.log('DEBUG:', ...args),
      info: (...args) => console.log('INFO:', ...args),
      warn: (...args) => console.log('WARN:', ...args),
      error: (...args) => console.log('ERROR:', ...args)
    }
  }
};

// Load the parser
const fs = require('fs');
const path = require('path');

// Read and execute parser code in proper context
const parserCode = fs.readFileSync(path.join(__dirname, 'src/parser.js'), 'utf8');

// Create a function to execute the parser code in the correct context
const vm = require('vm');
const context = {
  window: global.window,
  console: console,
  Array: Array,
  Map: Map,
  Object: Object,
  JSON: JSON,
  String: String
};

// Execute parser code in the context
vm.createContext(context);
vm.runInContext(parserCode, context);

// Get the LyXParser class from the context
const LyXParser = context.window.LyXParser;

// Read sample bind file
const sampleBindFile = fs.readFileSync(path.join(__dirname, 'example.bind'), 'utf8');

console.log('Testing LyX Parser...');
console.log('Sample bind file length:', sampleBindFile.length);
console.log('First few lines:', sampleBindFile.split('\n').slice(0, 10).join('\n'));

// Test the parser
const parser = new LyXParser();
const bindings = parser.parse(sampleBindFile);

console.log('\nParsing results:');
console.log('Number of bindings parsed:', bindings.size);
console.log('Sample bindings:');

let count = 0;
for (const [key, value] of bindings) {
  console.log(`  ${key} -> ${value.command} (action: ${JSON.stringify(value.action)})`);
  count++;
  if (count >= 5) break; // Show first 5
}

if (bindings.size === 0) {
  console.log('\nERROR: No bindings were parsed!');
  console.log('Checking first bind line manually...');
  
  const lines = sampleBindFile.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('\\bind')) {
      console.log('Found bind line:', trimmed);
      try {
        const binding = parser.parseBindLine(trimmed);
        console.log('Parsed result:', binding);
      } catch (error) {
        console.log('Parse error:', error);
      }
      break;
    }
  }
}