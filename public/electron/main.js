const { app } = require("electron");
const windowManager = require("./modules/window-manager");
const ipcHandler = require("./modules/ipc-handler");

/**
 * 애플리케이션 초기화 함수
 */
function initApp() {
  // IPC 핸들러 등록
  ipcHandler.registerHandlers();

  // 앱이 준비되면 윈도우 생성
  app.whenReady().then(() => {
    windowManager.createWindow();

    // MacOS에서는 앱이 닫혀도 dock에 남아있을 수 있으므로 활성화될 때 창이 없으면 다시 생성
    app.on("activate", () => {
      if (!windowManager.getMainWindow()) {
        windowManager.createWindow();
      }
    });
  });

  // 모든 창이 닫히면 앱 종료 (Windows/Linux)
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

// 애플리케이션 초기화
initApp();
