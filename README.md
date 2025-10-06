# Obsidian @Mention Links Plugin

An Obsidian plugin that enables `@mention` syntax as an alternative to `[[wikilinks]]` for internal note linking.

## Features

### 🔗 Alternative Link Syntax
Use `@path/to/note` instead of `[[path/to/note]]` to create internal links.

**Examples:**
- `@my-note` → links to "my-note"
- `@folder/note` → links to "note" in "folder"
- `@../sibling-note` → links to note in parent directory

### ✨ Native Autocomplete
Type `@` to trigger Obsidian's native file suggestion dropdown, identical to the `[[` experience.

- **Smart filtering**: Filters files as you type
- **Relevance sorting**: Files starting with your query appear first
- **Full path display**: Shows relative paths for files in different folders
- **Keyboard navigation**: Use arrow keys and Enter/Tab to select

### 👁️ Hover Preview
Hover over `@mention` links with **Cmd (Mac)** or **Ctrl (Windows/Linux)** pressed to see a preview popover, just like regular wikilinks.

- Works with both "hover first, then press key" and "press key, then hover"
- Shows full note preview in a popover
- Click to navigate or Cmd/Ctrl+click to open in new pane

### 🎨 Consistent Styling
`@mention` links are styled identically to `[[wikilinks]]`:
- Same color and underline
- Same hover states
- Same visual feedback

### 🔄 Format Conversion Commands
Two commands for converting between link formats:

1. **Convert [[wikilink]] to @mention**: Converts selected `[[]]` links to `@` format
2. **Convert @mention to [[wikilink]]**: Converts selected `@` links to `[[]]` format

Access via Command Palette (Cmd/Ctrl+P).

### 📝 Works Everywhere
- ✅ **Edit mode (Live Preview)**: Links render and are clickable while editing
- ✅ **Reading mode**: Full support for rendered documents
- ✅ **Relative paths**: Automatically calculates correct relative paths based on current file location

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/your-repo/releases)
2. Create a folder in your vault: `<VaultFolder>/.obsidian/plugins/obsidian-mention-links/`
3. Copy the downloaded files into that folder
4. Reload Obsidian
5. Go to **Settings → Community plugins**
6. Enable "Obsidian @Mention Links"

### Development Installation

1. Clone this repo into your vault's plugins folder:
   ```bash
   cd <VaultFolder>/.obsidian/plugins/
   git clone https://github.com/your-repo obsidian-mention-links
   cd obsidian-mention-links
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```
   
   Or run in watch mode during development:
   ```bash
   npm run dev
   ```

4. Reload Obsidian and enable the plugin in Settings

## Usage

### Creating @mention Links

**Option 1: Type with autocomplete**
1. Type `@` in your note
2. Start typing a note name
3. Select from the dropdown (arrow keys + Enter, or mouse click)

**Option 2: Manual typing**
1. Type `@` followed by the relative path
2. Example: `@folder/my-note`

### Converting Existing Links

**To convert [[wikilinks]] to @mentions:**
1. Select text containing `[[wikilinks]]`
2. Open Command Palette (Cmd/Ctrl+P)
3. Run "Convert [[wikilink]] to @mention"

**To convert @mentions to [[wikilinks]]:**
1. Select text containing `@mentions`
2. Open Command Palette (Cmd/Ctrl+P)
3. Run "Convert @mention to [[wikilink]]"

## Technical Details

### Architecture

- **Live Preview rendering**: CodeMirror 6 `ViewPlugin` with custom `WidgetType` decorator
- **Reading mode rendering**: Markdown post-processor
- **Autocomplete**: Native Obsidian `EditorSuggest` API
- **Path resolution**: Uses `app.metadataCache.fileToLinktext()` for correct relative paths

### Code Structure

- `MentionWidget`: Renders clickable links in Live Preview mode
- `MentionSuggest`: Provides native autocomplete UI
- `createMentionPlugin`: CodeMirror extension for detecting and decorating `@mentions`
- Markdown post-processor: Handles Reading mode rendering

### Compatibility

- **Minimum Obsidian version**: 0.15.0
- **Desktop**: Fully supported
- **Mobile**: Fully supported

## Development

### Prerequisites

- Node.js v16 or higher
- npm or yarn

### Build Commands

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build

# Version bump
npm version patch|minor|major
```

### Testing

1. Make changes to `main.ts`
2. Run `npm run dev` (or `npm run build`)
3. Reload Obsidian (Cmd/Ctrl+R)
4. Test the plugin functionality

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

If you find this plugin helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs via [GitHub Issues](https://github.com/your-repo/issues)
- 💡 Suggesting features via [GitHub Discussions](https://github.com/your-repo/discussions)

## Changelog

### 1.0.0 (Initial Release)

- ✨ `@mention` syntax for internal links
- ✨ Native autocomplete UI
- ✨ Hover preview support
- ✨ Format conversion commands
- ✨ Full Live Preview and Reading mode support
- ✨ Relative path calculation

---

Made with ❤️ for the Obsidian community
