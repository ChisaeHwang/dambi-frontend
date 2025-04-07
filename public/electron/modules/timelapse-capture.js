const captureModule = require("./capture");

/**
 * 타임랩스 캡처 래퍼 클래스
 * 캡처 모듈의 기능들을 통합하고 고수준의 인터페이스를 제공합니다.
 */
class TimelapseCapture {
  constructor() {
    // 내부적으로 captureManager 사용
    this.captureManager = captureModule.captureManager;
    this._setupStateProxy();
    this._initializeConfig();
  }

  /**
   * 상태 프록시 설정
   * 캡처 매니저의 상태를 직접 접근 가능하도록 합니다.
   * @private
   */
  _setupStateProxy() {
    const proxyProperties = [
      "isCapturing",
      "captureDir",
      "startTime",
      "endTime",
      "videoPath",
      "recordingDuration",
      "currentSource",
    ];

    proxyProperties.forEach((prop) => {
      Object.defineProperty(this, prop, {
        get: () => this.captureManager[prop],
      });
    });
  }

  /**
   * 기본 설정 초기화
   * 캡처 및 타임랩스 생성을 위한 기본 설정을 정의합니다.
   * @private
   */
  _initializeConfig() {
    this.captureConfig = {
      fps: 15, // 캡처 프레임 속도 (부드러운 결과물)
      videoBitrate: 3000, // 비디오 비트레이트 (품질)
      videoSize: {
        width: 1280, // 캡처 해상도 너비
        height: 720, // 캡처 해상도 높이
      },
    };

    this.recordingInterval = null;
    this.statusUpdateInterval = null;
  }

  /**
   * 활성 창 목록 가져오기
   * 현재 캡처 가능한 모든 윈도우 목록을 반환합니다.
   * @returns {Promise<Array>} 활성 창 목록
   */
  async getActiveWindows() {
    return await this.captureManager.getActiveWindows();
  }

  /**
   * 녹화 상태 정보 반환
   * 현재 녹화 상태에 대한 상세 정보를 제공합니다.
   * @returns {Object} 녹화 상태 정보
   */
  getRecordingStatus() {
    return this.captureManager.getRecordingStatus();
  }

  /**
   * 캡처 시작
   * 지정된 윈도우의 캡처를 시작합니다.
   * @param {string} windowId - 캡처할 윈도우 ID
   * @param {string} windowName - 캡처할 윈도우 이름
   * @returns {Promise<Object>} 캡처 시작 결과
   */
  async startCapture(windowId, windowName) {
    return await this.captureManager.startCapture(windowId, windowName);
  }

  /**
   * 캡처 중지
   * 현재 진행 중인 캡처를 중지합니다.
   * @returns {Promise<Object>} 캡처 중지 결과
   */
  async stopCapture() {
    return await this.captureManager.stopCapture();
  }

  /**
   * 상태 업데이트 이벤트 발송
   * 캡처 상태 변경을 알립니다.
   */
  emitStatusUpdate() {
    this.captureManager.emitStatusUpdate();
  }

  /**
   * 타임랩스 생성
   * 캡처된 영상을 타임랩스로 변환합니다.
   * @param {Object} options - 타임랩스 생성 옵션
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  async generateTimelapse(options) {
    return await this.captureManager.generateTimelapse(options);
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
module.exports = new TimelapseCapture();
