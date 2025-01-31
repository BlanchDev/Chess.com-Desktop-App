import { BrowserWindow, app, Menu, clipboard, ipcMain } from "electron";
import { CONFIG } from "./config.js";
import path from "path";
import { fileURLToPath } from "url";
import { getSettings } from "./settings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

export function createWindow() {
  const settings = getSettings();
  const windowState = CONFIG.store.get("windowState");
  const notificationsState = settings.notifications;

  mainWindow = new BrowserWindow({
    width: windowState.width || CONFIG.defaultWidth,
    height: windowState.height || CONFIG.defaultHeight,
    minWidth: 750,
    minHeight: 750,
    title: CONFIG.appName,
    icon: CONFIG.iconPath,
    frame: false,
    titleBarStyle: "hidden",
    iconPath: path.join(__dirname, "assets", "chesscom.ico"),
    titleBarOverlay: {
      color: "#262522",
      symbolColor: "#989695",
      height: 40,
    },
    autoHideMenuBar: true,
    center: true,
    paintWhenInitiallyHidden: true,
    backgroundColor: "#262522",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.cjs"),
      partition: "persist:chess",
      v8CacheOptions: "code",
      notifications: true,
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
      enablePreferredSizeMode: true,
      spellcheck: true,
      enableWebSQL: false,
      webgl: true,
      plugins: true,
      enableAccelerated2dCanvas: true,
      enableHardwareAcceleration: true,
      experimentalFeatures: false,
      enableWebGL: true,
      enableWebGL2: true,
      allowPopups: true,
      javascript: true,
      disableWebSecurity: false,
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Development veya production moduna göre yükle
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile("dist/index.html");
  }

  // Webview ayarlarını güncelle
  mainWindow.webContents.on(
    "did-attach-webview",
    async (event, webContents) => {
      // Webview ayarlarını yapılandır
      webContents.setWindowOpenHandler(({ url, disposition }) => {
        console.log("setWindowOpenHandler:", {
          url,
          disposition,
        });

        // Diğer yeni sekme istekleri için
        if (
          [
            "new-window",
            "foreground-tab",
            "background-tab",
            "default",
            "other",
          ].includes(disposition)
        ) {
          mainWindow.webContents.send("new-tab", url);
          return { action: "deny" };
        }

        // Diğer tüm durumlar için (örn: "current-tab")
        return { action: "allow" };
      });

      // Webview için webPreferences ayarla
      const webPreferences = {
        allowpopups: true,
      };

      // Webview ayarlarını uygula
      Object.entries(webPreferences).forEach(([key, value]) => {
        try {
          const methodName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
          if (typeof webContents[methodName] === "function") {
            webContents[methodName](value);
          }
        } catch (error) {
          console.debug(`Failed to set ${key}:`, error);
        }
      });

      // Session ayarlarını güncelle
      const session = webContents.session;
      await session.setPreloads([]);

      // Session özelliklerini ayarla
      session.setSpellCheckerEnabled(false);
      session.setPermissionCheckHandler(async (webContents, permission) => {
        if (permission === "notifications") {
          return notificationsState;
        }
        return true;
      });

      // Context menu'yü yakala
      webContents.on("context-menu", async (event, params) => {
        console.log("Context menu tetiklendi");
        console.log("Event:", event);
        console.log("Params:", params);

        event.preventDefault();
        console.log("WebContents ID:", webContents.id);

        try {
          console.log("Context menu oluşturuluyor...");
          const menuItems = [];

          // Geri-İleri
          if (webContents.canGoBack()) {
            menuItems.push({
              label: "Back",
              click: () => webContents.goBack(),
            });
          }
          if (webContents.canGoForward()) {
            menuItems.push({
              label: "Forward",
              click: () => webContents.goForward(),
            });
          }

          // Temel işlemler
          menuItems.push(
            { type: "separator" },
            {
              label: "Refresh",
              click: () => webContents.reload(),
            },
          );

          // Seçili metin varsa
          if (params.selectionText) {
            menuItems.push(
              { type: "separator" },
              {
                label: "Copy",
                click: () => webContents.copy(),
              },
              {
                label: "Select All",
                click: () => webContents.selectAll(),
              },
            );
          }

          // Link varsa
          if (params.linkURL) {
            menuItems.push(
              { type: "separator" },
              {
                label: "Open Link in New Tab",
                click: () =>
                  mainWindow.webContents.send("new-tab", params.linkURL),
              },
              {
                label: "Copy Link",
                click: () => clipboard.writeText(params.linkURL),
              },
            );
          }

          // Resim varsa
          if (params.hasImageContents && params.srcURL) {
            menuItems.push(
              { type: "separator" },
              {
                label: "Open Image in New Tab",
                click: () =>
                  mainWindow.webContents.send("new-tab", params.srcURL),
              },
              {
                label: "Copy Image",
                click: () => webContents.copyImageAt(params.x, params.y),
              },
              {
                label: "Save Image As...",
                click: () => webContents.downloadURL(params.srcURL),
              },
            );
          }

          // Genel işlemler
          menuItems.push(
            { type: "separator" },
            {
              label: "Open Page in New Tab",
              click: () =>
                mainWindow.webContents.send("new-tab", params.pageURL),
            },
            {
              label: "View Page Source",
              click: () =>
                mainWindow.webContents.send(
                  "new-tab",
                  `view-source:${params.pageURL}`,
                ),
            },
          );

          // Menüyü göster
          console.log("Menu gösteriliyor...");
          const menu = Menu.buildFromTemplate(menuItems);
          menu.popup({
            window: mainWindow,
            x: params.x,
            y: params.y,
          });
          console.log("Menu gösterildi");
        } catch (error) {
          console.error("Context menu oluşturulurken hata:", error);
        }
      });

      // Webview için new-window olayını yakala
      webContents.on("new-window", (event, url, frameName, disposition) => {
        console.log("new-window event:", {
          url,
          frameName,
          disposition,
        });

        // Yeni pencere veya sekme istekleri için
        if (disposition === "new-window" || disposition === "foreground-tab") {
          event.preventDefault();
          mainWindow.webContents.send("new-tab", url);
        }
      });

      // Webview için will-navigate olayını yakala
      webContents.on("will-navigate", (event, url) => {
        console.log("will-navigate event:", { url });
      });

      // Element boyutunu izle
      const observeElementSize = async (selector) => {
        try {
          if (!webContents.isDestroyed()) {
            const result = await webContents.executeJavaScript(`
              new Promise((resolve) => {
                const element = document.querySelector('${selector}');
                if (!element) {
                  resolve({ error: 'Element not found' });
                  return;
                }

                const observer = new ResizeObserver((entries) => {
                  const entry = entries[0];
                  const { width, height } = entry.contentRect;
                  resolve({ width, height });
                });

                observer.observe(element);
              });
            `);

            if (result.error) {
              console.error("Element size error:", result.error);
              return null;
            }

            // Ana pencereye boyut bilgisini gönder
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send("element-size-changed", result);
            }
            return result;
          }
        } catch (error) {
          console.error("Element size check error:", error);
          return null;
        }
      };

      // Element boyutunu periyodik olarak kontrol et
      const checkElementSize = async (selector) => {
        try {
          if (!webContents.isDestroyed()) {
            const result = await webContents.executeJavaScript(`
              (() => {
                const element = document.querySelector('${selector}');
                if (!element) return { error: 'Element not found' };

                const rect = element.getBoundingClientRect();
                return {
                  width: rect.width,
                  height: rect.height,
                  top: rect.top,
                  left: rect.left
                };
              })();
            `);

            if (result.error) {
              console.error("Element size error:", result.error);
              return null;
            }

            // Ana pencereye boyut bilgisini gönder
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send("element-size-changed", result);
            }
            return result;
          }
        } catch (error) {
          console.error("Element size check error:", error);
          return null;
        }
      };

      // IPC üzerinden element boyutu isteklerini dinle
      ipcMain.handle("get-element-size", async (event, selector) => {
        return await checkElementSize(selector);
      });

      // IPC üzerinden element boyutu değişimlerini izlemeyi başlat
      ipcMain.handle("observe-element-size", async (event, selector) => {
        return await observeElementSize(selector);
      });

      // Webview için bildirim izinlerini otomatik kabul et
      webContents.session.setPermissionRequestHandler(
        async (webContents, permission, callback) => {
          if (permission === "notifications") {
            console.log("Bildirim izni istendi");
            const settings = getSettings();
            callback(settings.notifications);
            return;
          }
          callback(true);
        },
      );

      // Bildirimleri dinle ve içeriğini logla
      webContents.on("new-window", (e, url) => {
        console.log("Yeni pencere açılmaya çalışıldı:", url);
        e.preventDefault();
      });

      // Bildirim olayını dinle
      webContents.on(
        "did-create-notification",
        async (event, title, options) => {
          const settings = getSettings();
          console.log("Yeni Bildirim Oluşturuldu:", {
            title,
            body: options.body,
            icon: options.icon,
            tag: options.tag,
            origin: options.origin,
            timestamp: new Date().toISOString(),
            notificationsEnabled: settings.notifications,
          });
        },
      );

      // Notification API'sini kontrol et
      webContents.executeJavaScript(`
        async function updateNotificationState() {
          const settings = await window.Electron.ipcRenderer.invoke('get-settings');
          if (!settings.notifications) {
            delete window.Notification;
            window.Notification = class {
              constructor() {
                throw new Error('Notifications are disabled');
              }
              static requestPermission() {
                return Promise.resolve('denied');
              }
              static get permission() {
                return 'denied';
              }
            };
          }

        }
        updateNotificationState();

        // Her 5 saniyede bir kontrol et
        setInterval(updateNotificationState, 5000);
      `);

      // Webview için bildirim ve push isteklerini kontrol et
      webContents.session.webRequest.onBeforeRequest(
        {
          urls: ["*://*/*"],
          types: ["script", "xhr", "fetch", "other"],
        },
        async (details, callback) => {
          try {
            const settings = getSettings();
            console.log("İstek yakalandı:", details.url);

            if (
              !settings.notifications &&
              (details.url.includes("notifications") ||
                details.url.includes("push") ||
                details.url.includes("serviceworker") ||
                details.url.includes("firebase") ||
                details.url.includes("messaging"))
            ) {
              console.log("Bildirim/Push isteği engellendi:", details.url);
              callback({ cancel: true });
              return;
            }
            callback({ cancel: false });
          } catch (error) {
            console.error("Request handling error:", error);
          }
        },
      );

      // Storage'ı kontrol et ve temizle
      const checkAndClearStorage = async () => {
        const settings = getSettings();
        if (!settings.notifications) {
          await webContents.session.clearStorageData({
            storages: [
              "notifications",
              "serviceworkers",
              "localstorage",
              "indexdb",
              "websql",
              "cachestorage",
            ],
          });
        }
      };

      // İlk kontrol
      checkAndClearStorage();

      // Her 10 saniyede bir kontrol et
      setInterval(checkAndClearStorage, 10000);

      // Service worker'ları kontrol et
      webContents.session.setPermissionRequestHandler(
        async (webContents, permission, callback) => {
          const settings = getSettings();
          if (permission === "notifications" || permission === "push") {
            callback(settings.notifications);
            return;
          }
          if (permission === "background-sync") {
            callback(settings.notifications);
            return;
          }
          callback(true);
        },
      );

      // Service worker kayıtlarını kontrol et
      webContents.session.webRequest.onBeforeSendHeaders(
        {
          urls: ["*://*/*"],
        },
        async (details, callback) => {
          const settings = getSettings();
          const { requestHeaders } = details;
          if (!settings.notifications && requestHeaders["Service-Worker"]) {
            callback({ cancel: true });
            return;
          }
          callback({ requestHeaders });
        },
      );

      // Service worker izinlerini kontrol et
      const checkServiceWorkerPermissions = async () => {
        const settings = getSettings();
        if (!settings.notifications) {
          webContents.session.setPermissionRequestHandler(
            (webContents, permission, callback) => {
              if (
                permission === "notifications" ||
                permission === "push" ||
                permission === "background-sync"
              ) {
                callback(false);
                return;
              }
              callback(true);
            },
          );
        }
      };

      // İlk kontrol
      checkServiceWorkerPermissions();

      // Her 5 saniyede bir kontrol et
      setInterval(checkServiceWorkerPermissions, 5000);
    },
  );

  // Ana pencere için bildirim izinlerini otomatik kabul et
  mainWindow.webContents.session.setPermissionRequestHandler(
    async (webContents, permission, callback) => {
      if (permission === "notifications") {
        // Bildirimler açıksa otomatik kabul et
        if (notificationsState) {
          callback(true);
        } else {
          callback(false);
        }
        return;
      }
      callback(true);
    },
  );

  // Ana pencere için bildirimleri kontrol et
  mainWindow.webContents.session.setPermissionCheckHandler(
    async (webContents, permission) => {
      if (permission === "notifications") {
        // Bildirimler açıksa true döndür
        return notificationsState;
      }
      return true;
    },
  );

  // Pencere durumunu kaydet
  const saveWindowState = () => {
    if (!mainWindow.isMaximized()) {
      const bounds = mainWindow.getBounds();
      CONFIG.store.set("windowState", {
        ...bounds,
        isMaximized: false,
      });
    } else {
      CONFIG.store.set("windowState", {
        width: windowState.width,
        height: windowState.height,
        isMaximized: true,
      });
    }
  };

  // Performans için throttle edilmiş event listener'lar
  let saveStateTimeout;
  const throttledSaveState = () => {
    if (saveStateTimeout) clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(saveWindowState, 1000);
  };

  mainWindow.on("resize", throttledSaveState);
  mainWindow.on("move", throttledSaveState);
  mainWindow.on("close", saveWindowState);

  return mainWindow;
}

export const getMainWindow = () => mainWindow;
