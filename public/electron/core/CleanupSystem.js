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

module.exports = CleanupSystem;
