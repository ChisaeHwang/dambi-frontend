/**
 * 캡처 세션 정리 작업
 */
class CaptureCleaner {
  /**
   * 진행 중인 캡처 세션 정리
   * @returns {Promise<boolean>} 성공 여부
   */
  static async cleanup() {
    try {
      const { capture } = require("../../modules");

      if (capture && capture.captureManager) {
        try {
          const status = capture.captureManager.getRecordingStatus();

          if (status.isRecording) {
            await capture.captureManager.stopCapture();
            console.log("진행 중인 녹화 세션 중지 완료");
          } else {
            console.log("진행 중인 녹화 세션 없음");
          }
        } catch (error) {
          console.error("녹화 중지 실패:", error);
          return false;
        }
      } else {
        console.log("캡처 관리자가 초기화되지 않음");
      }

      return true;
    } catch (error) {
      console.error("캡처 세션 정리 실패:", error);
      return false;
    }
  }
}

module.exports = CaptureCleaner;
