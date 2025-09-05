# LyX Hotkey Plugin

A Chrome extension that replicates LyX hotkey behavior in the browser for easy mathematical notation input.

## 🌟 Features

- **Multi-step key sequences** - Support for complex LyX-style hotkey combinations (e.g., Alt+M G A for α)
- **LaTeX symbol insertion** - Automatically converts LaTeX commands to Unicode symbols or LaTeX code
- **Universal compatibility** - Works in input fields, textareas, and contentEditable elements
- **Configurable timeouts** - Adjustable sequence timeout (500ms - 5000ms)
- **Conflict detection** - Automatically detects and reports overlapping key sequences
- **Debug logging** - Comprehensive logging for troubleshooting
- **Import/Export** - Save and share your hotkey configurations

## 🚀 Installation

### From Source
1. Clone this repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The LyX Hotkey Plugin icon should appear in your toolbar

### Configuration
1. Click the extension icon in the toolbar
2. Click "Open Settings" 
3. Load the included `example.bind` file or paste your own LyX bind file content
4. Adjust the sequence timeout if needed (default: 1500ms)
5. Enable the extension if it's not already active

## 📖 Usage

### Basic Workflow
1. Click in any editable field (input, textarea, or contentEditable element)
2. Use LyX-style key sequences to insert mathematical notation
3. The extension converts LaTeX commands to Unicode symbols automatically

### Example Key Sequences
- `Alt+M F` → `\frac{}{}` (fraction)
- `Alt+M S` → `\sqrt{}` (square root)  
- `Alt+M G A` → `α` (alpha)
- `Alt+M G P` → `π` (pi)
- `Alt+M U` → `∑` (sum)
- `Alt+M I` → `∫` (integral)
- `Alt+M 8` → `∞` (infinity)

### Multi-step Sequences
Key sequences work in steps with configurable timeout:
1. Press `Alt+M` (starts sequence)
2. Press `G` (continues sequence) 
3. Press `A` (completes sequence → inserts α)

If you wait too long between keys, the sequence resets.

## 📁 File Structure

```
LyxHotkeyPlugin/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Background service worker
├── content.js            # Content script coordinator
├── popup.html/js         # Toolbar popup interface
├── options.html/js       # Settings page
├── src/
│   ├── logger.js         # Logging utility
│   ├── parser.js         # LyX bind file parser
│   ├── hotkeyManager.js  # Key sequence management
│   └── inserter.js       # Text insertion logic
├── icons/               # Extension icons
├── example.bind         # Sample LyX bindings
├── demo.html           # Test page
└── README.md
```

## 🔧 LyX Bind File Format

The extension parses standard LyX bind files with the format:
```
\bind "key-sequence" "command"
```

### Supported Modifiers
- `M-` = Alt key
- `C-` = Ctrl key  
- `S-` = Shift key
- `~S-` = Not Shift (special characters)

### Example Bindings
```
# Basic math
\bind "M-m f"        "math-insert \frac"
\bind "M-m s"        "math-insert \sqrt"

# Greek letters  
\bind "M-m g a"      "math-insert \alpha"
\bind "M-m g b"      "math-insert \beta"

# Operators
\bind "M-m u"        "math-insert \sum"
\bind "M-m i"        "math-insert \int"
```

## ⚙️ Configuration Options

### Settings Page
- **Enable/Disable Extension** - Toggle hotkey processing
- **Sequence Timeout** - How long to wait between keys (500-5000ms)
- **Debug Mode** - Enable detailed console logging
- **Conflict Detection** - Automatic detection of overlapping sequences

### Toolbar Popup
- Quick toggle for extension enable/disable
- Current sequence display
- Binding statistics
- Test insertion functionality

## 🐛 Troubleshooting

### Common Issues
1. **Hotkeys not working**
   - Check that extension is enabled (toolbar icon shows "ON")
   - Verify bindings are loaded in settings
   - Try clicking in an editable field first

2. **Sequences timing out**
   - Increase sequence timeout in settings
   - Practice the key combinations
   - Check for browser hotkey conflicts

3. **Conflicts with browser shortcuts**
   - Review conflicts list in settings
   - Modify problematic key sequences
   - Use alternative LyX bindings

### Debug Mode
Enable debug mode in settings to see detailed logs:
- Key press events
- Sequence matching
- Text insertion attempts
- Error messages

## 🔄 Import/Export

### Export Settings
- Settings page → "Export Settings" 
- Saves all configuration as JSON file
- Includes bindings, preferences, and metadata

### Import Settings  
- Settings page → "Import Settings"
- Restore configuration from JSON file
- Useful for sharing setups or backup/restore

## 🎯 Demo

Open `demo.html` in your browser to test the extension:
1. Load the extension and configure bindings
2. Open the demo page
3. Try various hotkey sequences in the test areas
4. See real-time insertion of mathematical notation

## 🏗️ Architecture

### Modular Design
- **Parser** - Handles LyX bind file parsing and format conversion
- **HotkeyManager** - Manages multi-step sequences and timeout logic  
- **Inserter** - Handles text insertion across different element types
- **Logger** - Configurable logging with history and export

### Chrome Extension APIs
- **Manifest V3** - Modern extension architecture
- **Storage API** - Persistent settings and bindings
- **Content Scripts** - Page-level hotkey capture
- **Background Service Worker** - Global state management

## 📋 Requirements

- Chrome 88+ (Manifest V3 support)
- LyX bind file or manual hotkey configuration
- Editable web content (input fields, textareas, contentEditable)

## 🤝 Contributing

Contributions welcome! The extension is designed to be modular and extensible:

### Adding Features
- New parsers for different hotkey formats
- Additional text insertion modes
- Enhanced conflict resolution
- Custom symbol mappings

### Code Structure
- Follow existing module patterns
- Add comprehensive logging
- Include error handling
- Update documentation

## 📜 License

This project is part of the LyX ecosystem for mathematical document preparation. Check individual file headers for specific license information.

## 🔗 Related Projects

- [LyX](https://www.lyx.org/) - The original document processor
- [LyX Bind Files](https://wiki.lyx.org/Tips/KeyboardShortcuts) - Official documentation
- [Mathematical Input Tools](https://support.google.com/docs/answer/160749) - Google's math input