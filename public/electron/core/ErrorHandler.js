const { app, dialog } = require("electron");

/**
 * 오류 처리 모듈
 */
class ErrorHandler {
  constructor(appLifecycle, windowManager) {
    this.appLifecycle = appLifecycle;
    this.windowManager = windowManager;
  }

  /**
   * 전역 오류 처리 등록
   */
  setupGlobalHandlers() {
    // 처리되지 않은 Promise 거부 처리
    process.on("unhandledRejection", (reason, promise) => {
      console.error("처리되지 않은 Promise 거부:", reason);

      // 심각한 오류면 앱 종료
      if (this.isFatalError(reason)) {
        this.handleFatalError(reason, "처리되지 않은 Promise 거부");
      }
    });

    // 처리되지 않은 예외 처리
    process.on("uncaughtException", (error) => {
      console.error("처리되지 않은 예외:", error);

      // 거의 모든 경우 치명적 오류로 처리
      this.handleFatalError(error, "처리되지 않은 예외");
    });
  }

  /**
   * 치명적 오류 처리
   * @param {Error} error - 발생한 오류
   * @param {string} context - 오류 발생 맥락
   */
  handleFatalError(error, context = "알 수 없는 맥락") {
    try {
      console.error(`치명적 오류 [${context}]:`, error);

      // 사용자에게 오류 알림 (가능한 경우)
      this.showErrorDialog(error, context).catch(() => {});

      // 종료 요청
      this.appLifecycle.requestShutdown(`치명적 오류: ${context}`);
      this.appLifecycle.setExitCode(1);

      // 정상적인 종료 시도
      setTimeout(() => {
        app.exit(1);
      }, 1000);
    } catch (additionalError) {
      console.error("오류 처리 중 추가 오류 발생:", additionalError);
      app.exit(1);
    }
  }

  /**
   * 치명적 오류 여부 확인
   * @param {Error} error - 확인할 오류
   * @returns {boolean} 치명적 오류 여부
   */
  isFatalError(error) {
    if (!error) return false;

    // 특정 오류 타입이나 메시지로 치명적 여부 판단
    const errorStr = String(error);
    const message = error.message || errorStr;

    const fatalPatterns = [
      /cannot\s+find\s+module/i,
      /not\s+a\s+function/i,
      /unexpected\s+token/i,
      /electron/i,
      /EPERM/i,
      /EACCES/i,
      /out\s+of\s+memory/i,
    ];

    return fatalPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * 오류 다이얼로그 표시
   * @param {Error} error - 발생한 오류
   * @param {string} context - 오류 맥락
   * @returns {Promise<void>}
   */
  async showErrorDialog(error, context) {
    const message = error.message || String(error);

    try {
      // 메인 윈도우가 있는 경우에만 다이얼로그 표시
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        await dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "오류 발생",
          message: `${context} 중 오류가 발생했습니다.`,
          detail: `${message}\n\n애플리케이션이 종료됩니다.`,
          buttons: ["확인"],
          noLink: true,
        });
      }
    } catch (dialogError) {
      console.error("오류 다이얼로그 표시 실패:", dialogError);
    }
  }
}

module.exports = ErrorHandler;
