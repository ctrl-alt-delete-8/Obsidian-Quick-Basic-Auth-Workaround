import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface QuickBasicAuthSettings {
	authServers: string[]; // List of base URLs for Basic Auth servers
}

const DEFAULT_SETTINGS: QuickBasicAuthSettings = {
	authServers: []
}

export default class QuickBasicAuthPlugin extends Plugin {
	settings: QuickBasicAuthSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new QuickBasicAuthSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Authenticate with a Basic Auth server
	 * Opens a window with credentials and automatically closes it
	 */
	authenticateBasicAuth(baseUrl: string, username: string, password: string) {
		// Construct the full auth URL with credentials
		const urlObj = new URL(baseUrl);
		const authUrl = `${urlObj.protocol}//${username}:${password}@${urlObj.host}${urlObj.pathname}`;

		// Open auth URL to establish session
		window.open(authUrl);
		new Notice('Basic Auth authenticated!');

		// Retry function to find and close the tab
		const tryCloseTab = (attempt: number, maxAttempts: number = 5) => {
			try {
				// Try to find and close webviewer leaf if it opened there
				const leaves = this.app.workspace.getLeavesOfType('webviewer') as any[];

				if (leaves?.length > 0) {
					// Find the leaf that matches our exact auth URL
					// Note: Obsidian webviewer keeps credentials in URL (unlike normal browsers)
					const authLeaf = leaves.find((leaf: any) => {
						const view = leaf.view;
						if (view) {
							const viewUrl = view.url || view.getUrl?.() || '';
							// Normalize URLs by removing trailing slash for comparison
							const normalizedViewUrl = viewUrl.replace(/\/$/, '');
							const normalizedAuthUrl = authUrl.replace(/\/$/, '');
							return normalizedViewUrl === normalizedAuthUrl;
						}
						return false;
					});

					if (authLeaf) {
						authLeaf.detach();
						return; // Success, stop retrying
					}
				}

				// If not found and we have attempts left, retry
				if (attempt < maxAttempts) {
					setTimeout(() => tryCloseTab(attempt + 1, maxAttempts), 100);
				}
			} catch (e) {
				// Silently fail
			}
		};

		// Start trying to close the tab after initial delay
		setTimeout(() => tryCloseTab(1), 100);
	}
}

/**
 * Modal for entering Basic Auth credentials
 */
class BasicAuthModal extends Modal {
	baseUrl: string;
	plugin: QuickBasicAuthPlugin;
	onSubmit: (username: string, password: string) => void;

	constructor(app: App, plugin: QuickBasicAuthPlugin, baseUrl: string, onSubmit: (username: string, password: string) => void) {
		super(app);
		this.plugin = plugin;
		this.baseUrl = baseUrl;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Basic Authentication' });
		contentEl.createEl('p', { text: `Enter credentials for: ${this.baseUrl}` });

		let username = '';
		let password = '';

		// Username input
		new Setting(contentEl)
			.setName('Username')
			.addText(text => text
				.setPlaceholder('Username')
				.onChange(value => {
					username = value;
				}));

		// Password input
		new Setting(contentEl)
			.setName('Password')
			.addText(text => {
				text.setPlaceholder('Password');
				text.inputEl.type = 'password';
				text.onChange(value => {
					password = value;
				});
				// Submit on Enter key
				text.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						this.submit(username, password);
					}
				});
			});

		// Buttons
		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}))
			.addButton(btn => btn
				.setButtonText('Authenticate')
				.setCta()
				.onClick(() => {
					this.submit(username, password);
				}));
	}

	submit(username: string, password: string) {
		if (!username || !password) {
			new Notice('Please enter both username and password');
			return;
		}
		this.onSubmit(username, password);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Settings Tab for Quick Basic Auth
 */
class QuickBasicAuthSettingTab extends PluginSettingTab {
	plugin: QuickBasicAuthPlugin;

	constructor(app: App, plugin: QuickBasicAuthPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Quick Basic Auth Workaround' });

		containerEl.createEl('h3', { text: 'Purpose', attr: { style: 'margin-top: 10px;' } });
		containerEl.createEl('p', {
			text: 'Workaround for accessing HTTP Basic Auth protected resources in Obsidian\'s webviewer. The webviewer doesn\'t support authentication popups, so this plugin pre-authenticates by opening a credential URL and automatically closing it.'
		});

		containerEl.createEl('p', {
			text: 'Use cases: WebDAV servers (e.g., Nginx WebDAV, Apache WebDAV), self-hosted Git web interfaces (Gitea, Gogs), or any HTTP Basic Auth protected web applications.',
			attr: { style: 'font-style: italic; color: var(--text-muted); margin-bottom: 20px;' }
		});

		// Important reminder box
		const reminderBox = containerEl.createDiv();
		reminderBox.setAttribute('style', 'background-color: var(--background-modifier-warning); border-left: 4px solid var(--text-warning); padding: 12px; margin: 15px 0; border-radius: 4px;');

		const reminderTitle = reminderBox.createEl('strong', { text: '⚠️ Important: ' });
		reminderTitle.setAttribute('style', 'color: var(--text-warning);');

		reminderBox.createEl('span', {
			text: 'Some servers use stateless authentication (session-based, not cookie-based). You may need to re-authenticate after restarting Obsidian completely.'
		});

		// Security caution box
		const cautionBox = containerEl.createDiv();
		cautionBox.setAttribute('style', 'background-color: var(--background-secondary); border-left: 4px solid var(--text-muted); padding: 12px; margin: 15px 0; border-radius: 4px;');

		const cautionRow = cautionBox.createDiv();
		const cautionTitle = cautionRow.createEl('strong', { text: '🔒 Security Notice: ' });
		cautionTitle.setAttribute('style', 'color: var(--text-normal); display: inline;');
		cautionRow.createSpan({
			text: 'While credentials are never stored, the plugin reads your username and password in plain text when you enter them (to construct the authentication URL). Only use this plugin on your own device. Avoid using on shared or public computers.',
			attr: { style: 'margin-left: 0;' }
		});

		const sourceLink = cautionBox.createEl('p', {
			attr: { style: 'margin: 0;' }
		});
		sourceLink.createEl('span', { text: 'If unsure, check the ' });
		sourceLink.createEl('a', {
			text: 'open source code',
			href: 'https://github.com/EllenGYY/obsidian-toolbox/blob/master/quick-basic-auth-workaround/main.ts',
			attr: { style: 'color: var(--text-accent);' }
		});
		sourceLink.createEl('span', { text: '.' });

		containerEl.createEl('h3', { text: 'Manage Servers', attr: { style: 'margin-top: 20px;' } });
		containerEl.createEl('p', {
			text: 'Add server base URLs and use the Authorize button to authenticate with your credentials.'
		});

		const serversContainer = containerEl.createDiv('auth-servers-container');

		const renderAuthServers = () => {
			serversContainer.empty();

			// Display existing auth servers
			this.plugin.settings.authServers.forEach((serverUrl) => {
				const serverDiv = serversContainer.createDiv('auth-server-item');
				serverDiv.setAttribute('style', 'display: flex; align-items: center; gap: 5px; margin-bottom: 5px;');

				const urlInput = serverDiv.createEl('input', {
					type: 'text',
					placeholder: 'https://example.com',
					value: serverUrl,
					cls: 'auth-url',
					attr: { style: 'flex: 1; min-width: 300px;' }
				});

				// Auto-save URL changes on blur
				urlInput.addEventListener('blur', async () => {
					const newUrl = urlInput.value.trim();
					if (newUrl && newUrl !== serverUrl) {
						const index = this.plugin.settings.authServers.indexOf(serverUrl);
						if (index !== -1) {
							this.plugin.settings.authServers[index] = newUrl;
							await this.plugin.saveSettings();
							renderAuthServers();
						}
					}
				});

				const authButton = serverDiv.createEl('button', {
					cls: 'mod-cta',
					text: 'Authorize',
					attr: {
						style: 'padding: 4px 12px;'
					}
				});
				authButton.addEventListener('click', () => {
					const modal = new BasicAuthModal(this.app, this.plugin, serverUrl, (username, password) => {
						this.plugin.authenticateBasicAuth(serverUrl, username, password);
					});
					modal.open();
				});

				const deleteButton = serverDiv.createEl('button', {
					cls: 'mod-warning',
					attr: {
						title: 'Delete',
						style: 'width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center;'
					}
				});
				deleteButton.innerHTML = '✕';
				deleteButton.addEventListener('click', async () => {
					this.plugin.settings.authServers = this.plugin.settings.authServers.filter(url => url !== serverUrl);
					await this.plugin.saveSettings();
					renderAuthServers();
				});
			});

			// Add new server button
			const addDiv = serversContainer.createDiv('add-auth-server');
			addDiv.setAttribute('style', 'display: flex; align-items: center; gap: 5px; margin-top: 10px;');

			const newUrlInput = addDiv.createEl('input', {
				type: 'text',
				placeholder: 'https://example.com',
				cls: 'auth-url',
				attr: { style: 'flex: 1; min-width: 300px;' }
			});

			const addButton = addDiv.createEl('button', {
				cls: 'mod-cta',
				attr: {
					title: 'Add',
					style: 'width: 30px; height: 30px; padding: 0; display: flex; align-items: center; justify-content: center;'
				}
			});
			addButton.innerHTML = '+';
			addButton.addEventListener('click', async () => {
				const url = newUrlInput.value.trim();
				if (url) {
					// Validate URL format
					try {
						new URL(url);
						if (!this.plugin.settings.authServers.includes(url)) {
							this.plugin.settings.authServers.push(url);
							await this.plugin.saveSettings();
							newUrlInput.value = '';
							renderAuthServers();
						} else {
							new Notice('This server URL already exists');
						}
					} catch (e) {
						new Notice('Please enter a valid URL (e.g., https://example.com)');
					}
				}
			});
		};

		renderAuthServers();

		// Author and Support section
		containerEl.createEl('hr', { attr: { style: 'margin: 30px 0 20px 0; border: none; border-top: 1px solid var(--background-modifier-border);' } });

		const authorSection = containerEl.createDiv();
		authorSection.setAttribute('style', 'text-align: center; margin: 15px 0;');

		authorSection.createEl('p', {
			text: 'Created by @tinkerer-ctrl-alt-del',
			attr: { style: 'margin: 5px 0; font-weight: bold;' }
		});

		authorSection.createEl('p', {
			text: 'Have questions, found a bug, or want to request a feature? Join the Discord server!',
			attr: { style: 'margin: 5px 0; color: var(--text-muted);' }
		});

		const buttonsContainer = containerEl.createDiv();
		buttonsContainer.setAttribute('style', 'text-align: center; margin: 20px 0; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;');

		// Buy Me a Coffee button
		const coffeeButton = buttonsContainer.createEl('a', {
			text: 'Buy me a coffee',
			href: 'https://www.buymeacoffee.com/tinkerer.ctrl.alt.del',
			attr: {
				target: '_blank',
				style: 'display: inline-block; padding: 10px 20px; background-color: #FFDD00; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; border: 2px solid #000000; transition: opacity 0.2s;'
			}
		});

		coffeeButton.addEventListener('mouseenter', () => {
			coffeeButton.style.opacity = '0.8';
		});

		coffeeButton.addEventListener('mouseleave', () => {
			coffeeButton.style.opacity = '1';
		});

		// Discord button
		const discordButton = buttonsContainer.createEl('a', {
			text: '💬 Join Discord',
			href: 'https://discord.com/invite/bXMpCTBMcg',
			attr: {
				target: '_blank',
				style: 'display: inline-block; padding: 10px 20px; background-color: #5865F2; color: #FFFFFF; text-decoration: none; border-radius: 5px; font-weight: bold; border: 2px solid #4752C4; transition: opacity 0.2s;'
			}
		});

		discordButton.addEventListener('mouseenter', () => {
			discordButton.style.opacity = '0.8';
		});

		discordButton.addEventListener('mouseleave', () => {
			discordButton.style.opacity = '1';
		});
	}
}
