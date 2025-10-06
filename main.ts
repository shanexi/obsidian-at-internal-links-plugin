import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, editorLivePreviewField, TFile, EditorSuggest, EditorPosition, EditorSuggestTriggerInfo, EditorSuggestContext } from 'obsidian';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

// Widget for rendering @mention links in edit mode
class MentionWidget extends WidgetType {
	constructor(private path: string, private app: App, private sourcePath: string) {
		super();
	}

	toDOM(): HTMLElement {
		const span = document.createElement('span');
		span.className = 'cm-underline internal-link';
		span.textContent = `@${this.path}`;
		span.style.cursor = 'pointer';
		span.style.color = 'var(--link-color)';
		
		let isHovering = false;
		let lastMouseEvent: MouseEvent | null = null;

		span.addEventListener('click', (e) => {
			e.preventDefault();
			this.app.workspace.openLinkText(this.path, this.sourcePath, e.ctrlKey || e.metaKey);
		});

		// Listen for keyboard events while hovering
		const keyDownHandler = (e: KeyboardEvent) => {
			if (isHovering && lastMouseEvent && (e.key === 'Control' || e.key === 'Meta' || e.ctrlKey || e.metaKey)) {
				this.triggerHoverPreview(lastMouseEvent, span);
			}
		};

		// Track hover state and mouse position
		span.addEventListener('mouseenter', (e) => {
			isHovering = true;
			lastMouseEvent = e;
			document.addEventListener('keydown', keyDownHandler);
			
			if (e.ctrlKey || e.metaKey) {
				this.triggerHoverPreview(e, span);
			}
		});

		// Update mouse position while hovering
		span.addEventListener('mousemove', (e) => {
			lastMouseEvent = e;
		});

		span.addEventListener('mouseleave', () => {
			isHovering = false;
			lastMouseEvent = null;
			document.removeEventListener('keydown', keyDownHandler);
		});

		return span;
	}

	private triggerHoverPreview(e: MouseEvent, targetEl: HTMLElement) {
		this.app.workspace.trigger('hover-link', {
			event: e,
			source: 'preview',
			hoverParent: targetEl,
			targetEl: targetEl,
			linktext: this.path,
			sourcePath: this.sourcePath,
		});
	}
}

// ViewPlugin to detect and decorate @mentions
function createMentionPlugin(app: App) {
	return ViewPlugin.fromClass(class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		buildDecorations(view: EditorView): DecorationSet {
			const builder = new RangeSetBuilder<Decoration>();
			const isLivePreview = view.state.field(editorLivePreviewField);
			
			if (!isLivePreview) {
				return builder.finish();
			}

			// Get the active file path for link resolution
			const markdownView = app.workspace.getActiveViewOfType(MarkdownView);
			const sourcePath = markdownView?.file?.path || '';

			for (const { from, to } of view.visibleRanges) {
				const text = view.state.doc.sliceString(from, to);
				const regex = /@([^\s@`]+)/g;
				let match;

				while ((match = regex.exec(text)) !== null) {
					const start = from + match.index;
					const end = start + match[0].length;
					const path = match[1];

					// Check if we're inside a code block or inline code
					const line = view.state.doc.lineAt(start);
					const lineText = line.text;
					const posInLine = start - line.from;
					
					// Skip if inside backticks
					let inBackticks = false;
					let backtickCount = 0;
					for (let i = 0; i < posInLine; i++) {
						if (lineText[i] === '`') {
							backtickCount++;
						}
					}
					if (backtickCount % 2 === 1) {
						inBackticks = true;
					}

					if (!inBackticks) {
						builder.add(
							start,
							end,
							Decoration.replace({
								widget: new MentionWidget(path, app, sourcePath),
							})
						);
					}
				}
			}

			return builder.finish();
		}
	}, {
		decorations: v => v.decorations
	});
}

// EditorSuggest for @mentions - uses native Obsidian UI
class MentionSuggest extends EditorSuggest<TFile> {
	constructor(app: App) {
		super(app);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const textBefore = line.substring(0, cursor.ch);
		
		// Match @ followed by any characters
		const match = textBefore.match(/@([^\s@]*)$/);
		if (!match) {
			return null;
		}

		return {
			start: { line: cursor.line, ch: cursor.ch - match[1].length },
			end: cursor,
			query: match[1]
		};
	}

	getSuggestions(context: EditorSuggestContext): TFile[] {
		const query = context.query.toLowerCase();
		const files = this.app.vault.getMarkdownFiles();

		// Filter files
		const filtered = files.filter((file: TFile) => {
			const basename = file.basename.toLowerCase();
			const path = file.path.toLowerCase();
			return basename.includes(query) || path.includes(query);
		});

		// Sort by relevance
		filtered.sort((a, b) => {
			const aBasename = a.basename.toLowerCase();
			const bBasename = b.basename.toLowerCase();
			const aStarts = aBasename.startsWith(query);
			const bStarts = bBasename.startsWith(query);
			
			if (aStarts && !bStarts) return -1;
			if (!aStarts && bStarts) return 1;
			
			return aBasename.localeCompare(bBasename);
		});

		return filtered.slice(0, 50);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createDiv({ cls: 'suggestion-content' }, (div) => {
			div.createDiv({ cls: 'suggestion-title', text: file.basename });
			if (file.path !== file.basename + '.md') {
				div.createDiv({ cls: 'suggestion-note', text: file.path });
			}
		});
	}

	selectSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
		if (!this.context) return;
		
		const editor = this.context.editor;
		const currentFile = this.context.file;
		
		// Calculate relative path from current file to target file
		let linktext: string;
		if (currentFile) {
			linktext = this.app.metadataCache.fileToLinktext(file, currentFile.path);
		} else {
			linktext = file.path.replace(/\.md$/, '');
		}
		
		// Replace the @query with relative path
		editor.replaceRange(
			linktext,
			this.context.start,
			this.context.end
		);
		
		// Move cursor to end
		const newCursor = {
			line: this.context.start.line,
			ch: this.context.start.ch + linktext.length
		};
		editor.setCursor(newCursor);
	}
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// Register editor extension for Live Preview mode
		this.registerEditorExtension(createMentionPlugin(this.app));
		
		// Register native Obsidian suggestion UI for @mentions
		this.registerEditorSuggest(new MentionSuggest(this.app));

		// Register markdown post processor to convert @path to internal links
		this.registerMarkdownPostProcessor((element, context) => {
			const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
			const nodesToReplace: { node: Node; matches: RegExpMatchArray[] }[] = [];
			
			// First pass: find all text nodes with @mentions
			let node;
			while ((node = walker.nextNode())) {
				const text = node.textContent || '';
				// Match @path pattern (not preceded by backtick, not inside code blocks)
				const matches = Array.from(text.matchAll(/(?<!`|\\)@([^\s@]+)/g));
				if (matches.length > 0) {
					nodesToReplace.push({ node, matches });
				}
			}

			// Second pass: replace matches with links
			nodesToReplace.forEach(({ node, matches }) => {
				const text = node.textContent || '';
				const parent = node.parentNode;
				if (!parent) return;

				// Check if we're inside a code block
				let currentEl = parent as HTMLElement;
				while (currentEl && currentEl !== element) {
					if (currentEl.tagName === 'CODE' || currentEl.tagName === 'PRE') {
						return; // Skip if inside code block
					}
					currentEl = currentEl.parentElement as HTMLElement;
				}

				let lastIndex = 0;
				const fragment = document.createDocumentFragment();

				matches.forEach((match) => {
					const fullMatch = match[0];
					const path = match[1];
					const matchIndex = match.index!;

					// Add text before the match
					if (matchIndex > lastIndex) {
						fragment.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
					}

					// Create internal link
					const link = document.createElement('a');
					link.className = 'internal-link';
					link.setAttribute('data-href', path);
					link.setAttribute('href', path);
					link.setAttribute('target', '_blank');
					link.setAttribute('rel', 'noopener');
					link.textContent = fullMatch;
					
					// Add click handler to open the file
					link.addEventListener('click', (e) => {
						e.preventDefault();
						this.app.workspace.openLinkText(path, context.sourcePath, false);
					});

					fragment.appendChild(link);
					lastIndex = matchIndex + fullMatch.length;
				});

				// Add remaining text
				if (lastIndex < text.length) {
					fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
				}

				parent.replaceChild(fragment, node);
			});
		});

		// Optional: Add command to convert selection from [[]] to @
		this.addCommand({
			id: 'convert-wikilink-to-at',
			name: 'Convert [[wikilink]] to @mention',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const converted = selection.replace(/\[\[([^\]]+)\]\]/g, '@$1');
				editor.replaceSelection(converted);
			}
		});

		// Optional: Add command to convert selection from @ to [[]]
		this.addCommand({
			id: 'convert-at-to-wikilink',
			name: 'Convert @mention to [[wikilink]]',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				const converted = selection.replace(/@([^\s@]+)/g, '[[$1]]');
				editor.replaceSelection(converted);
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
