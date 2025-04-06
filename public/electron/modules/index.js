// 모듈별 지연 로드 객체
let recorderService = null;

// 공통 모듈 및 서비스 내보내기
module.exports = {
  windowManager: require("./window-manager"),
  settingsManager: require("./settings-manager"),
  updaterService: require("./updater-service"),
  capture: require("./capture"),
  timelapse: require("./timelapse-capture"),

  // recorder-service는 앱이 ready 상태가 된 후에만 액세스 가능하도록 게터 사용
  get recorderService() {
    if (!recorderService) {
      try {
        // 필요한 시점에 모듈 로드
        recorderService = require("./capture/recorder-service");
      } catch (error) {
        console.error("화면 녹화 서비스 로드 실패:", error.message);
        // 더미 객체 반환 (에러 방지)
        return {
          getCaptureConfig: () => ({
            fps: 30,
            videoBitrate: 6000,
            videoSize: { width: 1920, height: 1080 },
          }),
          getCaptureSources: async () => [],
        };
      }
    }
    return recorderService;
  },
};
