const { screen } = require("electron");

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

// 시스템 환경 정보 진단
function getSystemInfo() {
  const systemInfo = {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    displays: [],
  };

  // 모니터 정보 가져오기
  if (screen) {
    const displays = screen.getAllDisplays();
    systemInfo.displays = displays.map((display, index) => ({
      id: index,
      bounds: display.bounds,
      workArea: display.workArea,
      scaleFactor: display.scaleFactor,
      isPrimary: display.id === screen.getPrimaryDisplay().id,
    }));
  }

  return systemInfo;
}

module.exports = {
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  isWindowMaximized,
  getSystemInfo,
};
