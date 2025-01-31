import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store({
  defaults: {
    windowState: {
      width: 1200,
      height: 800,
      isMaximized: true,
    },
    settings: {
      autoLaunch: false,
      notifications: true,
    },
  },
});

export const CONFIG = {
  defaultWidth: 1200,
  defaultHeight: 800,
  defaultIsMaximized: true,
  appName: "Chess.com - Play Chess Online",
  iconPath: path.join(__dirname, "assets", "chesscom.ico"),
  store,
};
