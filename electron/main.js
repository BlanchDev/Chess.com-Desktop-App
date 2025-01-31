import { app, BrowserWindow, ipcMain } from "electron";
import { createWindow } from "./window.js";
import { createTray } from "./tray.js";
import {
  getSettings,
  updateSettings,
  setupSettingsHandlers,
} from "./settings.js";
import { createSettingsWindow } from "./settings-window.js";
import process from "process";

// Performans optimizasyonları
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("enable-gpu");
app.commandLine.appendSwitch("enable-gpu-compositing");
app.commandLine.appendSwitch("enable-gpu-driver-compositing");
app.commandLine.appendSwitch("enable-gpu-driver-compositing");
app.commandLine.appendSwitch("enable-hardware-acceleration");
app.commandLine.appendSwitch("ignore-gpu-blacklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=4096");
app.commandLine.appendSwitch("enable-gpu-memory-buffer-video-frames");
app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder");
app.commandLine.appendSwitch("enable-webgl");
app.commandLine.appendSwitch("enable-accelerated-2d-canvas");

let mainWindow = null;

app.whenReady().then(async () => {
  // Ana pencereyi oluştur
  mainWindow = createWindow();

  // Tray ikonunu oluştur
  createTray(mainWindow);

  // Settings handler'ları ayarla
  setupSettingsHandlers();

  // Performans için ön yükleme
  if (mainWindow) {
    // Pencere kapatma olayını yakala
    mainWindow.on("close", (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });

  // Uygulama kapatılmadan önce flag'i ayarla
  app.on("before-quit", () => {
    app.isQuitting = true;
  });
});

// Darwin (macOS) dışındaki platformlarda tüm pencereler kapandığında uygulamayı kapatma
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC event'lerini kaydet
ipcMain.handle("get-settings", async () => getSettings());
ipcMain.handle("update-settings", async (_, settings) =>
  updateSettings(settings),
);
ipcMain.handle("open-settings", () => createSettingsWindow());

// Yeni pencere açma isteklerini yönet
app.on("web-contents-created", (event, contents) => {
  // Yeni pencere açma isteklerini yakala
  contents.setWindowOpenHandler(({ url }) => {
    if (mainWindow) {
      // URL'i yeni sekmede aç
      mainWindow.webContents.send("new-tab", url);
    }
    return { action: "deny" }; // Yeni pencere açılmasını engelle
  });

  // Webview'dan gelen yeni pencere isteklerini yakala
  contents.on("did-create-window", (window, details) => {
    const url = details.url || window.webContents.getURL();
    if (mainWindow) {
      mainWindow.webContents.send("new-tab", url);
    }
    window.close(); // Yeni pencereyi kapat
  });
});
