const { app, dialog } = require("electron");
const path = require("path");
const windowManager = require("./modules/window-manager");
const ipcHandler = require("./modules/ipc-handler");

/**
 * 애플리케이션 상태 관리 클래스
 * 앱의 생명주기 및 상태를 추적하고 관리합니다.
 */
class AppLifecycle {
  constructor() {
    this.state = {
      initialized: false,
      shutdownRequested: false,
      startTime: Date.now(),
      exitCode: 0,
    };

    // 종료 이유 기록용
    this.exitReason = null;

    // 리소스 정리 관련 플래그
    this.cleanupInProgress = false;
    this.cleanupCompleted = false;

    // 로거
    this.logger = console;
  }

  /**
   * 앱 초기화 완료 설정
   * @returns {void}
   */
  setInitialized() {
    this.state.initialized = true;
    const initTime = Date.now() - this.state.startTime;
    this.logger.log(`애플리케이션 초기화 완료 (${initTime}ms)`);
  }

  /**
   * 종료 요청 처리
   * @param {string} reason - 종료 이유
   * @returns {void}
   */
  requestShutdown(reason = "사용자 요청") {
    if (this.state.shutdownRequested) return;

    this.state.shutdownRequested = true;
    this.exitReason = reason;
    this.logger.log(`애플리케이션 종료 요청됨: ${reason}`);
  }

  /**
   * 초기화 상태 확인
   * @returns {boolean} 초기화 완료 여부
   */
  isInitialized() {
    return this.state.initialized;
  }

  /**
   * 종료 요청 상태 확인
   * @returns {boolean} 종료 요청 여부
   */
  isShutdownRequested() {
    return this.state.shutdownRequested;
  }

  /**
   * 종료 코드 설정
   * @param {number} code - 종료 코드
   */
  setExitCode(code) {
    this.state.exitCode = code;
  }

  /**
   * 종료 코드 반환
   * @returns {number} 종료 코드
   */
  getExitCode() {
    return this.state.exitCode;
  }

  /**
   * 진행 중인 정리 작업 상태 설정
   * @param {boolean} inProgress - 진행 중 여부
   */
  setCleanupInProgress(inProgress) {
    this.cleanupInProgress = inProgress;
  }

  /**
   * 정리 작업 완료 상태 설정
   * @param {boolean} completed - 완료 여부
   */
  setCleanupCompleted(completed) {
    this.cleanupCompleted = completed;
  }

  /**
   * 상태 로깅
   * @returns {Object} 현재 앱 상태
   */
  logState() {
    const state = {
      ...this.state,
      exitReason: this.exitReason,
      uptime: (Date.now() - this.state.startTime) / 1000,
      cleanupInProgress: this.cleanupInProgress,
      cleanupCompleted: this.cleanupCompleted,
    };

    this.logger.log("애플리케이션 상태:", state);
    return state;
  }
}

// 애플리케이션 생명주기 관리 인스턴스 생성
const appLifecycle = new AppLifecycle();

/**
 * 리소스 정리 시스템
 * 앱 종료 시 리소스를 적절히 정리합니다.
 */
class CleanupSystem {
  constructor(appLifecycle) {
    this.lifecycle = appLifecycle;
    this.cleanupTasks = [];
    this.timeoutDuration = 3000; // 정리 작업 타임아웃 (ms)
  }

  /**
   * 정리 작업 등록
   * @param {string} name - 작업 이름
   * @param {Function} task - 정리 작업 함수 (Promise 반환)
   */
  registerTask(name, task) {
    this.cleanupTasks.push({ name, task });
  }

  /**
   * 모든 정리 작업 실행
   * @returns {Promise<boolean>} 성공 여부
   */
  async runAllTasks() {
    if (this.cleanupTasks.length === 0) {
      console.log("등록된 정리 작업 없음, 건너뜀");
      return true;
    }

    try {
      console.log(`${this.cleanupTasks.length}개의 정리 작업 실행 중...`);
      this.lifecycle.setCleanupInProgress(true);

      // 각 작업 실행 (타임아웃 적용)
      const results = await Promise.allSettled(
        this.cleanupTasks.map(({ name, task }) =>
          this._runTaskWithTimeout(name, task)
        )
      );

      // 결과 로깅
      const succeeded = results.filter(
        (r) => r.status === "fulfilled" && r.value
      ).length;
      const failed = results.filter(
        (r) => r.status === "rejected" || !r.value
      ).length;

      console.log(`정리 작업 완료: 성공 ${succeeded}, 실패 ${failed}`);
      this.lifecycle.setCleanupInProgress(false);
      this.lifecycle.setCleanupCompleted(true);

      return failed === 0;
    } catch (error) {
      console.error("정리 작업 실행 중 오류:", error);
      this.lifecycle.setCleanupInProgress(false);
      return false;
    }
  }

  /**
   * 타임아웃 적용된 작업 실행
   * @private
   * @param {string} name - 작업 이름
   * @param {Function} task - 작업 함수
   * @returns {Promise<boolean>} 성공 여부
   */
  async _runTaskWithTimeout(name, task) {
    return new Promise((resolve) => {
      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        console.warn(`정리 작업 '${name}' 타임아웃`);
        resolve(false);
      }, this.timeoutDuration);

      // 작업 실행
      try {
        Promise.resolve(task())
          .then((result) => {
            clearTimeout(timeoutId);
            console.log(`정리 작업 '${name}' 완료`);
            resolve(result !== false);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            console.error(`정리 작업 '${name}' 실패:`, error);
            resolve(false);
          });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`정리 작업 '${name}' 실행 중 예외:`, error);
        resolve(false);
      }
    });
  }
}

// 정리 시스템 인스턴스 생성
const cleanupSystem = new CleanupSystem(appLifecycle);

/**
 * 애플리케이션 초기화
 * 앱 시작 시 필요한 초기화 작업 수행
 */
async function initializeApp() {
  try {
    console.log("============================================");
    console.log("애플리케이션 초기화 시작");
    console.log("============================================");

    // 기본 정리 작업 등록
    registerCleanupTasks();

    // 전역 오류 처리 등록
    setupGlobalErrorHandlers();

    // IPC 핸들러 등록
    console.log("IPC 핸들러 등록 중...");
    ipcHandler.registerHandlers();

    // 앱 준비 완료 시 실행
    app.whenReady().then(async () => {
      try {
        // 메인 윈도우 생성
        console.log("메인 윈도우 생성 중...");
        await windowManager.createWindow();
        console.log("메인 윈도우 생성 완료");

        // 앱이 활성화될 때 새 창 생성 (macOS 지원)
        app.on("activate", () => {
          if (windowManager.getMainWindow() === null) {
            windowManager.createWindow();
          }
        });

        // 초기화 완료
        appLifecycle.setInitialized();
      } catch (error) {
        handleFatalError(error, "창 초기화 실패");
      }
    });

    // 모든 창이 닫히면 앱 종료 (Windows/Linux)
    app.on("window-all-closed", () => {
      console.log("모든 창이 닫힘");
      if (process.platform !== "darwin") {
        appLifecycle.requestShutdown("모든 창 닫힘");
        app.quit();
      }
    });

    // 앱 종료 전 정리 작업
    app.on("will-quit", async (event) => {
      // 이미 정리 작업이 완료되었으면 그대로 종료
      if (appLifecycle.cleanupCompleted) return;

      // 정리 작업이 진행 중이면 종료 지연
      if (appLifecycle.cleanupInProgress) {
        event.preventDefault();
        return;
      }

      // 정리 작업이 필요하면 종료 지연
      if (!appLifecycle.isShutdownRequested()) {
        event.preventDefault();
        appLifecycle.requestShutdown("앱 종료 요청");

        // 정리 작업 수행
        await runCleanupTasks();

        // 다시 종료 요청
        app.quit();
      }
    });

    // 종료 코드 설정
    app.on("quit", () => {
      const exitCode = appLifecycle.getExitCode();
      console.log(`애플리케이션 종료: 코드 ${exitCode}`);

      if (process.env.NODE_ENV !== "production") {
        // 개발 환경에서만 상태 로깅
        appLifecycle.logState();
      }
    });

    console.log("============================================");
    console.log("초기화 단계 완료");
    console.log("============================================");

    return true;
  } catch (error) {
    handleFatalError(error, "앱 초기화 실패");
    return false;
  }
}

/**
 * 정리 작업 등록
 */
function registerCleanupTasks() {
  // 녹화 관련 리소스 정리
  cleanupSystem.registerTask("캡처 세션 정리", async () => {
    const { capture } = require("./modules");

    if (capture && capture.captureManager) {
      try {
        const status = capture.captureManager.getRecordingStatus();

        if (status.isRecording) {
          await capture.captureManager.stopCapture();
          return true;
        }
      } catch (error) {
        console.error("녹화 중지 실패:", error);
        return false;
      }
    }

    return true;
  });

  // 임시 파일 정리
  cleanupSystem.registerTask("임시 파일 정리", () => {
    try {
      // 임시 파일 정리 로직
      return true;
    } catch (error) {
      console.error("임시 파일 정리 실패:", error);
      return false;
    }
  });
}

/**
 * 정리 작업 실행
 */
async function runCleanupTasks() {
  try {
    console.log("============================================");
    console.log("애플리케이션 종료 중, 리소스 정리 시작");
    console.log("============================================");

    const success = await cleanupSystem.runAllTasks();

    console.log("============================================");
    console.log(`리소스 정리 ${success ? "성공" : "일부 실패"}`);
    console.log("============================================");

    return success;
  } catch (error) {
    console.error("리소스 정리 중 예기치 않은 오류:", error);
    return false;
  }
}

/**
 * 전역 오류 처리 등록
 */
function setupGlobalErrorHandlers() {
  // 처리되지 않은 Promise 거부 처리
  process.on("unhandledRejection", (reason, promise) => {
    console.error("처리되지 않은 Promise 거부:", reason);

    // 심각한 오류면 앱 종료
    if (isFatalError(reason)) {
      handleFatalError(reason, "처리되지 않은 Promise 거부");
    }
  });

  // 처리되지 않은 예외 처리
  process.on("uncaughtException", (error) => {
    console.error("처리되지 않은 예외:", error);

    // 거의 모든 경우 치명적 오류로 처리
    handleFatalError(error, "처리되지 않은 예외");
  });
}

/**
 * 치명적 오류 처리
 * @param {Error} error - 발생한 오류
 * @param {string} context - 오류 발생 맥락
 */
function handleFatalError(error, context = "알 수 없는 맥락") {
  try {
    console.error(`치명적 오류 [${context}]:`, error);

    // 사용자에게 오류 알림 (가능한 경우)
    showErrorDialog(error, context).catch(() => {});

    // 종료 요청
    appLifecycle.requestShutdown(`치명적 오류: ${context}`);
    appLifecycle.setExitCode(1);

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
function isFatalError(error) {
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
async function showErrorDialog(error, context) {
  const message = error.message || String(error);

  try {
    // 메인 윈도우가 있는 경우에만 다이얼로그 표시
    const mainWindow = windowManager.getMainWindow();
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

// 앱 초기화 시작
initializeApp().catch((error) => {
  console.error("초기화 중 치명적 오류:", error);
  app.exit(1);
});
