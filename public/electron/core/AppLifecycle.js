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

module.exports = AppLifecycle;
