const captureModule = require("./capture");

/**
 * 타임랩스 캡처 래퍼 클래스
 *
 * 이 클래스는 하위호환성을 위해 유지되며,
 * 내부적으로는 리팩토링된 capture 모듈을 사용합니다.
 * 새로운 기능을 추가할 때는 capture 모듈을 직접 사용하는 것을 권장합니다.
 */

class TimelapseCapture {
  constructor() {
    // 내부적으로 captureManager 사용
    this.captureManager = captureModule.captureManager;

    // captureManager의 상태를 this에 프록시
    Object.defineProperty(this, "isCapturing", {
      get: () => this.captureManager.isCapturing,
    });

    Object.defineProperty(this, "captureDir", {
      get: () => this.captureManager.captureDir,
    });

    Object.defineProperty(this, "startTime", {
      get: () => this.captureManager.startTime,
    });

    Object.defineProperty(this, "endTime", {
      get: () => this.captureManager.endTime,
    });

    Object.defineProperty(this, "videoPath", {
      get: () => this.captureManager.videoPath,
    });

    Object.defineProperty(this, "recordingDuration", {
      get: () => this.captureManager.recordingDuration,
    });

    Object.defineProperty(this, "currentSource", {
      get: () => this.captureManager.currentSource,
    });

    this.captureConfig = {
      fps: 15, // 캡처 프레임 속도 향상 (더 부드러운 결과물)
      videoBitrate: 3000, // 비디오 비트레이트 (품질 향상)
      videoSize: {
        // 캡처 해상도
        width: 1280,
        height: 720,
      },
    };

    // 상태 관리를 위한 변수들
    this.recordingInterval = null;
    this.statusUpdateInterval = null;
  }

  /**
   * 활성 창 목록 가져오기
   */
  async getActiveWindows() {
    return await this.captureManager.getActiveWindows();
  }

  /**
   * 녹화 상태 정보 반환
   */
  getRecordingStatus() {
    return this.captureManager.getRecordingStatus();
  }

  /**
   * 캡처 시작
   */
  async startCapture(windowId, windowName) {
    return await this.captureManager.startCapture(windowId, windowName);
  }

  /**
   * 캡처 중지
   */
  stopCapture() {
    return this.captureManager.stopCapture();
  }

  /**
   * 상태 업데이트 이벤트 발송
   */
  emitStatusUpdate() {
    this.captureManager.emitStatusUpdate();
  }

  /**
   * 타임랩스 생성
   */
  async generateTimelapse(options) {
    return await this.captureManager.generateTimelapse(options);
  }
}

module.exports = new TimelapseCapture();
