import { Tray, Menu, app } from "electron";
import { CONFIG } from "./config.js";
import { getMainWindow } from "./window.js";

let tray = null;

export function createTray() {
  tray = new Tray(CONFIG.iconPath);
  const mainWindow = getMainWindow();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => mainWindow.show(),
    },
    {
      label: "Hide",
      click: () => mainWindow.hide(),
    },
    { type: "separator" },
    {
      label: "Exit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip(CONFIG.appName);
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  return tray;
}
