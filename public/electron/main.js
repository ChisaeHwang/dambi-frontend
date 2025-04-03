const { app } = require("electron");
const windowManager = require("./modules/window-manager");
const ipcHandler = require("./modules/ipc-handler");

/**
 * 애플리케이션 초기화
 */
function initApp() {
  // IPC 핸들러 등록
  ipcHandler.registerHandlers();

  app.whenReady().then(() => {
    // 메인 윈도우 생성
    windowManager.createWindow();

    app.on("activate", () => {
      // macOS에서는 독 아이콘 클릭 시 창이 없으면 다시 생성
      if (windowManager.getMainWindow() === null) {
        windowManager.createWindow();
      }
    });
  });

  // 모든 창이 닫히면 애플리케이션 종료 (Windows/Linux)
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

// 앱 초기화
initApp();
