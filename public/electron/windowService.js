const { BrowserWindow } = require("electron");

// 창 제어 함수들
function minimizeWindow(mainWindow) {
  if (mainWindow) {
    mainWindow.minimize();
  }
}

function maximizeWindow(mainWindow) {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
}

function closeWindow(mainWindow) {
  if (mainWindow) {
    mainWindow.close();
  }
}

function isWindowMaximized(mainWindow, event) {
  if (mainWindow) {
    event.sender.send("window:is-maximized-response", mainWindow.isMaximized());
  } else {
    event.sender.send("window:is-maximized-response", false);
  }
}

module.exports = {
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  isWindowMaximized,
};
