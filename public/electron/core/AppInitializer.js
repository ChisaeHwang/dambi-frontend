const { app } = require("electron");

/**
 * 애플리케이션 초기화 담당 클래스
 */
class AppInitializer {
  constructor(
    appLifecycle,
    windowManager,
    errorHandler,
    cleanupSystem,
    taskRegistry
  ) {
    this.appLifecycle = appLifecycle;
    this.windowManager = windowManager;
    this.errorHandler = errorHandler;
    this.cleanupSystem = cleanupSystem;
    this.taskRegistry = taskRegistry;
  }

  /**
   * 앱 초기화 실행
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  async initialize() {
    try {
      console.log("============================================");
      console.log("애플리케이션 초기화 시작");
      console.log("============================================");

      // 기본 정리 작업 등록
      this.taskRegistry.registerTasks(this.cleanupSystem);

      // 전역 오류 처리 등록
      this.errorHandler.setupGlobalHandlers();

      // 이벤트 핸들러 등록
      this._setupAppEventHandlers();

      console.log("============================================");
      console.log("초기화 단계 완료");
      console.log("============================================");

      return true;
    } catch (error) {
      this.errorHandler.handleFatalError(error, "앱 초기화 실패");
      return false;
    }
  }

  /**
   * 앱 이벤트 핸들러 설정
   * @private
   */
  _setupAppEventHandlers() {
    // 앱 준비 완료 시 실행
    app.whenReady().then(async () => {
      try {
        // 메인 윈도우 생성
        console.log("메인 윈도우 생성 중...");
        await this.windowManager.createWindow();
        console.log("메인 윈도우 생성 완료");

        // 앱이 활성화될 때 새 창 생성 (macOS 지원)
        app.on("activate", () => {
          if (this.windowManager.getMainWindow() === null) {
            this.windowManager.createWindow();
          }
        });

        // 초기화 완료
        this.appLifecycle.setInitialized();
      } catch (error) {
        this.errorHandler.handleFatalError(error, "창 초기화 실패");
      }
    });

    // 모든 창이 닫히면 앱 종료 (Windows/Linux)
    app.on("window-all-closed", () => {
      console.log("모든 창이 닫힘");
      if (process.platform !== "darwin") {
        this.appLifecycle.requestShutdown("모든 창 닫힘");
        app.quit();
      }
    });

    // 앱 종료 전 정리 작업
    app.on("will-quit", async (event) => {
      // 이미 정리 작업이 완료되었으면 그대로 종료
      if (this.appLifecycle.cleanupCompleted) return;

      // 정리 작업이 진행 중이면 종료 지연
      if (this.appLifecycle.cleanupInProgress) {
        event.preventDefault();
        return;
      }

      // 정리 작업이 필요하면 종료 지연
      if (!this.appLifecycle.isShutdownRequested()) {
        event.preventDefault();
        this.appLifecycle.requestShutdown("앱 종료 요청");

        // 정리 작업 수행
        await this._runCleanupTasks();

        // 다시 종료 요청
        app.quit();
      }
    });

    // 종료 코드 설정
    app.on("quit", () => {
      const exitCode = this.appLifecycle.getExitCode();
      console.log(`애플리케이션 종료: 코드 ${exitCode}`);

      if (process.env.NODE_ENV !== "production") {
        // 개발 환경에서만 상태 로깅
        this.appLifecycle.logState();
      }
    });
  }

  /**
   * 정리 작업 실행
   * @private
   * @returns {Promise<boolean>} 성공 여부
   */
  async _runCleanupTasks() {
    try {
      console.log("============================================");
      console.log("애플리케이션 종료 중, 리소스 정리 시작");
      console.log("============================================");

      const success = await this.cleanupSystem.runAllTasks();

      console.log("============================================");
      console.log(`리소스 정리 ${success ? "성공" : "일부 실패"}`);
      console.log("============================================");

      return success;
    } catch (error) {
      console.error("리소스 정리 중 예기치 않은 오류:", error);
      return false;
    }
  }
}

module.exports = AppInitializer;
