const TempFileCleaner = require("./tasks/TempFileCleaner");
const CaptureCleaner = require("./tasks/CaptureCleaner");

/**
 * 정리 작업 등록을 담당하는 클래스
 */
class TaskRegistry {
  /**
   * 기본 정리 작업 등록
   * @param {CleanupSystem} cleanupSystem - 정리 시스템 인스턴스
   */
  registerTasks(cleanupSystem) {
    // 캡처 세션 정리 작업 등록
    cleanupSystem.registerTask("캡처 세션 정리", async () => {
      return await CaptureCleaner.cleanup();
    });

    // 임시 파일 정리 작업 등록
    cleanupSystem.registerTask("임시 파일 정리", () => {
      return TempFileCleaner.cleanup();
    });

    // 필요에 따라 여기에 추가 작업 등록
  }
}

module.exports = TaskRegistry;
