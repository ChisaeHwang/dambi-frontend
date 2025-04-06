const { app } = require("electron");
const windowManager = require("./modules/window-manager");
const ipcHandler = require("./modules/ipc-handler");

/**
 * 애플리케이션 초기화
 */
function initApp() {
  // IPC 핸들러 등록
  ipcHandler.registerHandlers();

  app.whenReady().then(async () => {
    try {
      // 메인 윈도우 생성
      await windowManager.createWindow();

      // 화면 녹화 모듈 지연 로드 (앱 ready 이후에 로드하기 위해)
      const recorderService = require("./modules/capture/recorder-service");
      console.log("화면 녹화 서비스 초기화 완료");

      app.on("activate", () => {
        // macOS에서는 독 아이콘 클릭 시 창이 없으면 다시 생성
        if (windowManager.getMainWindow() === null) {
          windowManager.createWindow();
        }
      });
    } catch (error) {
      console.error("앱 초기화 중 오류 발생:", error);
    }
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
