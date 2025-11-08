# Quick Basic Auth Workaround

A workaround plugin for accessing HTTP Basic Auth protected resources in Obsidian's webviewer.

## Problem

Obsidian's webviewer doesn't support HTTP Basic Authentication popups. When you try to access a Basic Auth protected resource, you find yourself staring at 'Unauthorized' with no way to enter the credentials. 

## Solution

This plugin pre-authenticates by opening a URL with embedded credentials (`https://user:pass@server.com`), establishing a session, then automatically closing the window. After authentication, you can access the protected resources in the webviewer.

## Use Cases

- **WebDAV Servers**: Nginx WebDAV, Apache WebDAV, Nextcloud
- **Self-hosted Git**: Gitea, Gogs, GitLab
- **Any HTTP Basic Auth protected web applications**

## How to Use

1. Open Settings → Quick Basic Auth Workaround
2. Add your server base URL (e.g., `https://your-server.com`)
3. Click the "Authorize" button next to the server
4. Enter your username and password in the modal
5. The plugin opens an auth window with credentials and automatically closes it
6. You can now access protected resources in Obsidian's webviewer

## ⚠️ Important Note

Some servers use stateless authentication (session-based, not cookie-based). If you completely quit and restart Obsidian, you may need to re-authenticate. This is because the authentication session is stored in memory and cleared when Obsidian closes.

## 🔒 Security Notice

While credentials are **never stored**, the plugin reads your username and password in plain text when you enter them (to construct the authentication URL). Only use this plugin on your own device. Avoid using on shared or public computers.

If unsure, check the [open source code](https://github.com/xxx/blob/main/main.ts).

## Installation

### Install from Release
Download the zipped file with the name 'Quick-Basic-Auth-v...' from the release section, drag it into the plugins folder and unzip it, reload and enable in Obsidian settings.

### Development and Manual Installation
1. `git clone` to download this repo, `npm install` to install depdendencies, and then `npm run build` to build.
1. Copy the files to a new folder under your vault's plugins folder:
   - `main.js`
   - `manifest.json`
2. Reload Obsidian Plugins
3. Enable the plugin in Settings → Community Plugins
