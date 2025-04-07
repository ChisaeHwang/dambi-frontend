const { app } = require("electron");
const windowManager = require("./modules/window-manager");
const modules = require("./modules");
const ipcHandler = require("./modules/ipc-handler");

/**
 * 애플리케이션 상태 관리
 */
class AppState {
  constructor() {
    this.initialized = false;
    this.shutdownRequested = false;
    this.startTime = Date.now();
  }

  /**
   * 초기화 완료 설정
   */
  setInitialized() {
    this.initialized = true;
    const initTime = Date.now() - this.startTime;
    console.log(`애플리케이션 초기화 완료 (${initTime}ms)`);
  }

  /**
   * 종료 요청 처리
   */
  requestShutdown() {
    if (this.shutdownRequested) return;

    this.shutdownRequested = true;
    console.log("애플리케이션 종료 요청됨");
  }

  /**
   * 초기화 상태 확인
   */
  isInitialized() {
    return this.initialized;
  }
}

// 애플리케이션 상태 인스턴스 생성
const appState = new AppState();

/**
 * 애플리케이션 초기화
 */
async function initApp() {
  try {
    // 모듈 초기화 먼저 진행
    console.log("모듈 시스템 초기화 중...");
    await modules.initialize();

    // IPC 핸들러 등록
    console.log("IPC 이벤트 핸들러 등록 중...");
    ipcHandler.registerHandlers();

    app.whenReady().then(async () => {
      try {
        console.log("Electron 앱 준비 완료, 메인 윈도우 생성 중...");

        // 메인 윈도우 생성
        await windowManager.createWindow();
        console.log("메인 윈도우 생성 완료");

        // 초기화 완료
        appState.setInitialized();

        // macOS에서 dock 아이콘 클릭 시 창이 없으면 다시 생성
        app.on("activate", () => {
          if (windowManager.getMainWindow() === null) {
            windowManager.createWindow();
          }
        });
      } catch (error) {
        console.error("메인 윈도우 생성 중 오류 발생:", error);
        handleFatalError(error);
      }
    });

    // 모든 창이 닫히면 애플리케이션 종료 (Windows/Linux)
    app.on("window-all-closed", () => {
      console.log("모든 창이 닫힘");
      if (process.platform !== "darwin") {
        appState.requestShutdown();
        app.quit();
      }
    });

    // 앱 종료 전 정리 작업
    app.on("will-quit", async (event) => {
      if (!appState.shutdownRequested) {
        // 진행중인 작업이 있다면 종료 지연
        event.preventDefault();

        // 종료 요청 설정
        appState.requestShutdown();

        // 정리 작업 수행
        await cleanupResources();

        // 완료 후 종료
        app.quit();
      }
    });
  } catch (error) {
    console.error("앱 초기화 중 치명적 오류 발생:", error);
    handleFatalError(error);
  }
}

/**
 * 앱 종료 시 리소스 정리
 */
async function cleanupResources() {
  try {
    console.log("리소스 정리 중...");

    // 캡처 모듈이 있으면 녹화 중지
    if (modules.capture && modules.capture.captureManager) {
      try {
        console.log("녹화 세션 정리 중...");
        const status = modules.capture.captureManager.getRecordingStatus();

        if (status.isRecording) {
          await modules.capture.captureManager.stopCapture();
          console.log("녹화 세션 정리 완료");
        }
      } catch (captureError) {
        console.error("녹화 세션 정리 오류:", captureError);
      }
    }

    // 임시 파일 정리 등 필요한 추가 작업

    console.log("리소스 정리 완료");
    return true;
  } catch (error) {
    console.error("리소스 정리 실패:", error);
    return false;
  }
}

/**
 * 치명적 오류 처리
 */
function handleFatalError(error) {
  console.error("치명적 오류:", error);
  // 오류 리포팅 시스템 통합 가능
  app.exit(1);
}

// 앱 초기화 시작
initApp().catch(handleFatalError);
