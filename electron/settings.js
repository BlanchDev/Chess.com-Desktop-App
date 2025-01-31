import { CONFIG } from "./config.js";
import AutoLaunch from "auto-launch";
import process from "process";
import { ipcMain, session } from "electron";

class SettingsManager {
  constructor() {
    this.autoLauncher = new AutoLaunch({
      name: CONFIG.appName,
      path: process.execPath,
      isHidden: true,
    });

    // İlk çalıştırmada varsayılan ayarları yükle
    if (!CONFIG.store.has("settings")) {
      CONFIG.store.set("settings", {
        autoLaunch: false,
        notifications: true,
      });
    }
  }

  // Async init metodu
  async initialize() {
    try {
      const isEnabled = await this.autoLauncher.isEnabled();
      console.log("AutoLaunch current status:", isEnabled);

      const settings = CONFIG.store.get("settings");
      if (settings?.autoLaunch !== isEnabled) {
        CONFIG.store.set("settings", { ...settings, autoLaunch: isEnabled });
      }
    } catch (err) {
      console.error("Error initializing settings:", err);
    }
  }

  getSettings() {
    return CONFIG.store.get("settings");
  }

  async updateSettings(newSettings) {
    console.log("Updating settings:", newSettings);
    const oldSettings = this.getSettings();

    try {
      // Ayarları güncelle
      CONFIG.store.set("settings", { ...oldSettings, ...newSettings });

      // Bildirim ayarı değiştiyse ve kapatıldıysa
      if (
        oldSettings.notifications !== newSettings.notifications &&
        !newSettings.notifications
      ) {
        // Varsayılan session'ı temizle
        const defaultSession = session.defaultSession;
        await defaultSession.clearStorageData({
          storages: ["notifications", "serviceworkers"],
        });
        await defaultSession.clearCache();

        // Persist session'ı temizle
        const persistSession = session.fromPartition("persist:chess");
        await persistSession.clearStorageData({
          storages: ["notifications", "serviceworkers"],
        });
        await persistSession.clearCache();
      }

      // AutoLaunch ayarını güncelle
      if (
        process.platform === "win32" &&
        oldSettings.autoLaunch !== newSettings.autoLaunch
      ) {
        const currentStatus = await this.autoLauncher.isEnabled();
        console.log("Current AutoLaunch status:", currentStatus);
        console.log("Requested AutoLaunch status:", newSettings.autoLaunch);

        if (newSettings.autoLaunch) {
          await this.autoLauncher.enable();
          console.log("AutoLaunch enabled successfully");
        } else {
          await this.autoLauncher.disable();
          console.log("AutoLaunch disabled successfully");
        }

        // Doğrulama kontrolü
        const newStatus = await this.autoLauncher.isEnabled();
        console.log("New AutoLaunch status:", newStatus);

        if (newStatus !== newSettings.autoLaunch) {
          throw new Error("AutoLaunch status mismatch");
        }
      }

      return this.getSettings();
    } catch (error) {
      console.error("Settings update error:", error);
      // Hata durumunda eski ayarlara geri dön
      CONFIG.store.set("settings", oldSettings);
      throw error;
    }
  }
}

// Singleton instance oluştur
const settingsManager = new SettingsManager();

// İlk başlatmada initialize et
settingsManager.initialize().catch(console.error);

// Public API
export const getSettings = () => settingsManager.getSettings();

export const updateSettings = (newSettings) =>
  settingsManager.updateSettings(newSettings);

// Cache ve Cookie temizleme fonksiyonları
async function clearCache() {
  try {
    const ses = session.defaultSession;
    await ses.clearCache();
    return { success: true, message: "Cache successfully cleared" };
  } catch (error) {
    console.error("Cache clearing error:", error);
    return {
      success: false,
      message: `Cache clearing error: ${error.message || "Unknown error"}`,
      error: error.message,
    };
  }
}

async function clearCookies() {
  try {
    const ses = session.defaultSession;
    await ses.clearStorageData({
      storages: [
        "cookies",
        "localstorage",
        "websql",
        "indexdb",
        "shadercache",
        "serviceworkers",
      ],
    });
    return {
      success: true,
      message: "Cookies and site data cleared successfully",
    };
  } catch (error) {
    console.error("Cookie clearing error:", error);
    return {
      success: false,
      message: `Cookie clearing error: ${error.message || "Unknown error"}`,
      error: error.message,
    };
  }
}

export function setupSettingsHandlers() {
  // Cache temizleme
  ipcMain.handle("clear-cache", async () => {
    return await clearCache();
  });

  // Cookie temizleme
  ipcMain.handle("clear-cookies", async () => {
    return await clearCookies();
  });
}
