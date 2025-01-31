const { contextBridge, ipcRenderer } = require("electron");

// Güvenli IPC iletişimi için validasyon fonksiyonu
const validateArgs = (args) => {
  return args.every(
    (arg) =>
      typeof arg === "string" ||
      typeof arg === "number" ||
      typeof arg === "boolean" ||
      (typeof arg === "object" && !arg?.prototype && !Array.isArray(arg)),
  );
};

// Ana process ile iletişim için API'leri expose et
contextBridge.exposeInMainWorld("Electron", {
  ipcRenderer: {
    invoke: (channel, ...args) => {
      // Sadece izin verilen kanalları kullanabilir
      const allowedChannels = [
        "update-settings",
        "clear-cache",
        "clear-cookies",
        "get-settings",
        "open-settings",
        "get-element-size",
        "observe-element-size",
      ];
      console.log("Preload: Channel isteği:", channel);
      if (allowedChannels.includes(channel) && validateArgs(args)) {
        console.log("Preload: İzin verilen kanal, gönderiliyor...");
        return ipcRenderer.invoke(channel, ...args);
      }
      console.error("Preload: İzin verilmeyen kanal veya geçersiz argümanlar");
      return Promise.reject(new Error("Operation not permitted"));
    },
    on: (channel, func) => {
      const allowedChannels = ["new-tab", "element-size-changed"];
      console.log("Preload: Event dinleyici ekleniyor:", channel);
      if (allowedChannels.includes(channel)) {
        const subscription = (event, ...args) => {
          console.log("Preload: Event alındı:", channel);
          if (validateArgs(args)) {
            console.log("Preload: Event işleniyor...");
            func(...args);
          } else {
            console.error("Preload: Geçersiz event argümanları");
          }
        };
        ipcRenderer.on(channel, subscription);
        return () => {
          console.log("Preload: Event dinleyici kaldırılıyor:", channel);
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      console.error("Preload: İzin verilmeyen kanal:", channel);
    },
    removeAllListeners: (channel) => {
      const allowedChannels = ["new-tab", "element-size-changed"];
      if (allowedChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    },
  },
  webview: {
    loadURL: (url) => {
      return new Promise((resolve, reject) => {
        try {
          const webview = document.querySelector("webview");
          if (webview) {
            webview.loadURL(url);
            resolve();
          } else {
            reject(new Error("Webview not found"));
          }
        } catch (error) {
          reject(error);
        }
      });
    },
  },
});
