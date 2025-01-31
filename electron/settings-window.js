import { BrowserWindow } from "electron";
import { CONFIG } from "./config.js";
import { getSettings } from "./settings.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SettingsWindow {
  constructor() {
    this.window = null;
  }

  createWindow() {
    if (this.window) {
      this.window.focus();
      return;
    }

    this.window = new BrowserWindow({
      width: 650,
      height: 400,
      minWidth: 650,
      minHeight: 400,
      title: "Settings",
      icon: CONFIG.iconPath,
      backgroundColor: "#262522",
      titleBarStyle: "default",
      titleBarOverlay: {
        color: "#262522",
        symbolColor: "#989695",
        height: 39,
      },
      resizable: false,
      minimizable: false,
      maximizable: false,
      autoHideMenuBar: true,
      center: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, "preload.cjs"),
      },
    });

    this.loadContent();
    this.setupEventHandlers();
  }

  loadContent() {
    const settings = getSettings();
    const html = this.generateHTML(settings);
    this.window.loadURL(
      "data:text/html;charset=UTF-8," + encodeURIComponent(html),
    );
  }

  setupEventHandlers() {
    this.window.once("ready-to-show", () => {
      this.window.show();
    });

    this.window.on("closed", () => {
      this.window = null;
    });
  }

  generateHTML(settings) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Settings</title>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            padding: 20px;
            background: #302e2b;
            color: #333;
            user-select: none;
            margin: 0;
          }
          .setting-item {
            background: #262522;
            color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.2s ease;
            position: relative;
            margin-bottom: 10px;
          }
          .setting-item:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
          }
          label {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-weight: 500;
          }
          input[type="checkbox"] {
            margin-right: 10px;
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #1a912e;
            color: #1a912e;
            background-color: #989695;
          }
          .description {
            font-size: 12px;
            color: #908f84;
            margin-top: 5px;
            margin-left: 28px;
          }
          .status {
            position: absolute;
            right: 15px;
            top: 15px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .status.show {
            opacity: 1;
          }
          .status.success {
            color: #4caf50;
          }
          .status.error {
            color: #f44336;
          }
          .disabled {
            opacity: 0.6;
            pointer-events: none;
          }
          .button-container {
            display: flex;
            gap: 10px;
            margin-top: 10px;
          }
          button {
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            background: #3a3835;
            color: #dfdede;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
          }
          button:hover {
            background: #3b3936;
          }
          button:active {
            background: #3b3936;
          }
          button.disabled {
            opacity: 0.6;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="setting-item" id="settingItem">
          <label>
            <input type="checkbox" id="autoLaunch" ${
              settings.autoLaunch ? "checked" : ""
            }>
            Start with Windows
          </label>
          <div class="description">
            Application starts automatically when Computer starts
          </div>
          <div class="status" id="status"></div>
        </div>

        <div class="setting-item">
          <div style="font-weight: 500; margin-bottom: 10px;">Data Management</div>
          <div class="description" style="margin-left: 0">Clear application data and cookies</div>
          <div class="button-container">
            <button id="clearCache">Clear Cache</button>
            <button id="clearCookies">Delete Cookies</button>
          </div>
          <div class="status" id="dataStatus"></div>
        </div>

        <script>
          const checkbox = document.getElementById('autoLaunch');
          const settingItem = document.getElementById('settingItem');
          const status = document.getElementById('status');
          const dataStatus = document.getElementById('dataStatus');
          checkbox.checked = ${settings.autoLaunch};

          let isUpdating = false;

          function showStatus(element, message, type) {
            element.textContent = message;
            element.className = 'status show ' + type;
            setTimeout(() => {
              element.className = 'status';
            }, 3000);
          }

          checkbox.addEventListener('change', async () => {
            if (isUpdating) return;

            isUpdating = true;
            settingItem.classList.add('disabled');

            try {
              await window.Electron.ipcRenderer.invoke('update-settings', {
                autoLaunch: checkbox.checked
              });
              showStatus(status, '✓ Saved', 'success');
            } catch (error) {
              console.error('Error updating settings:', error);
              checkbox.checked = !checkbox.checked;
              showStatus(status, '× Failed to save', 'error');
            } finally {
              settingItem.classList.remove('disabled');
              isUpdating = false;
            }
          });

          // Cache temizleme
          document.getElementById('clearCache').addEventListener('click', async (event) => {
            const button = event.target;
            button.classList.add('disabled');
            try {
              const result = await window.Electron.ipcRenderer.invoke('clear-cache');
              showStatus(dataStatus, result.message, result.success ? 'success' : 'error');
            } catch (error) {
              console.error('Error clearing cache:', error);
              showStatus(dataStatus, '× Failed to clear cache', 'error');
            } finally {
              button.classList.remove('disabled');
            }
          });

          // Cookie temizleme
          document.getElementById('clearCookies').addEventListener('click', async (event) => {
            const button = event.target;
            button.classList.add('disabled');
            try {
              const result = await window.Electron.ipcRenderer.invoke('clear-cookies');
              showStatus(dataStatus, result.message, result.success ? 'success' : 'error');
            } catch (error) {
              console.error('Error clearing cookies:', error);
              showStatus(dataStatus, '× Failed to clear cookies', 'error');
            } finally {
              button.classList.remove('disabled');
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}

// Singleton instance
const settingsWindow = new SettingsWindow();

// Public API
export const createSettingsWindow = () => settingsWindow.createWindow();
