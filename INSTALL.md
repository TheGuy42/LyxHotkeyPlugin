# Installation and Testing Guide

## 🚀 Quick Installation

### Step 1: Load the Extension
1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked" button
5. Select this folder (`LyxHotkeyPlugin/`)
6. The extension icon should appear in your toolbar

### Step 2: Configure Bindings
1. Click the LyX extension icon in the toolbar
2. Click "Open Settings"
3. In the settings page:
   - Click "Load Sample Math Bindings" for a quick start, OR
   - Upload the `example.bind` file, OR  
   - Paste LyX bind content directly into the text area
4. Click "Load Bindings"
5. Verify bindings are loaded (should show count > 0)

### Step 3: Test the Extension
1. Open `demo.html` in your browser
2. Click in any of the test areas
3. Try these key sequences:
   - `Alt+M F` → should insert `\frac{}{}`
   - `Alt+M G A` → should insert `α`
   - `Alt+M S` → should insert `\sqrt{}`

## 🧪 Testing Scenarios

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Settings page opens and works
- [ ] Bindings can be loaded from text/file
- [ ] Popup shows correct status
- [ ] Toggle on/off works

### Hotkey Sequences
- [ ] Single-step: `Alt+M F` → `\frac{}{}`
- [ ] Multi-step: `Alt+M G A` → `α`
- [ ] Timeout: Wait 2+ seconds between keys (should reset)
- [ ] Invalid sequence: Random keys (should reset)

### Input Targets
- [ ] Regular input field (`<input>`)
- [ ] Textarea (`<textarea>`)
- [ ] ContentEditable div
- [ ] Focus handling (click different elements)

### Edge Cases
- [ ] Rapid key sequences
- [ ] Conflicting browser shortcuts
- [ ] Page navigation during sequence
- [ ] Multiple tabs with extension

## 🐛 Troubleshooting

### Extension Won't Load
- Check manifest.json is valid
- Ensure all files are present
- Look for JavaScript errors in DevTools

### Hotkeys Don't Work
- Verify extension is enabled (icon shows "ON")
- Check bindings are loaded (settings page)
- Try clicking in an input field first
- Enable debug mode and check console

### Debug Information
Enable debug mode in settings, then check browser console (F12) for detailed logs:
- Key events being captured
- Sequence matching progress
- Text insertion attempts
- Error messages

## 📊 Expected Behavior

### Key Sequence Processing
1. **Alt+M** pressed → Sequence starts, 1.5s timeout begins
2. **G** pressed → Sequence continues, timeout resets
3. **A** pressed → Complete match found, inserts `α`

### Text Insertion
- Cursor position maintained
- Selected text replaced
- LaTeX constructs get proper cursor positioning
- Input events fired for framework compatibility

### Status Indicators
- **Green "ON"** → Extension active, bindings loaded
- **Yellow "!"** → Extension active, no bindings
- **Red "OFF"** → Extension disabled

## 🔧 Development Testing

### Manual Testing Checklist
```
[ ] Load extension from source
[ ] Open demo.html  
[ ] Test in each input type:
    [ ] Basic text insertion
    [ ] LaTeX constructs (\frac{}{})
    [ ] Unicode symbols (α, β, π)
    [ ] Multi-step sequences
[ ] Test settings page:
    [ ] File upload
    [ ] Direct text input
    [ ] Export/import
    [ ] Timeout adjustment
[ ] Test popup:
    [ ] Status display
    [ ] Toggle functionality
    [ ] Statistics
[ ] Error scenarios:
    [ ] Invalid bind files
    [ ] Network issues
    [ ] Permission problems
```

### Performance Considerations
- Key event handling should be < 1ms
- Parser should handle 1000+ bindings
- Memory usage should be reasonable
- No blocking operations on main thread

## 📈 Success Criteria

The extension is working correctly if:
1. ✅ Loads without console errors
2. ✅ Parses example.bind successfully  
3. ✅ Responds to Alt+M F with fraction insertion
4. ✅ Handles multi-step sequences (Alt+M G A)
5. ✅ Works across different input element types
6. ✅ Settings persist across browser restarts
7. ✅ Popup shows accurate status information