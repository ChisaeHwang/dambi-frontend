/**
 * 캡처 모듈 진입점
 * 타임랩스 캡처와 관련된 모든 기능을 제공합니다.
 */

const captureManager = require("./capture-manager");
const recorderService = require("./recorder-service");
const timelapseGenerator = require("./timelapse-generator");
const storageManager = require("./storage-manager");

/**
 * 캡처 모듈 인터페이스
 * 모든 캡처 관련 기능에 대한 통합된 인터페이스를 제공합니다.
 */
class CaptureModule {
  constructor() {
    this.captureManager = captureManager;
    this.recorderService = recorderService;
    this.timelapseGenerator = timelapseGenerator;
    this.storageManager = storageManager;
  }

  /**
   * 캡처 가능한 윈도우 목록 조회
   * @returns {Promise<Array>} 캡처 가능한 윈도우 목록
   */
  async getAvailableWindows() {
    return await this.captureManager.getActiveWindows();
  }

  /**
   * 캡처 시작
   * @param {string} windowId - 캡처할 윈도우 ID
   * @param {string} windowName - 캡처할 윈도우 이름
   * @returns {Promise<Object>} 캡처 시작 결과
   */
  async startCapture(windowId, windowName) {
    return await this.captureManager.startCapture(windowId, windowName);
  }

  /**
   * 캡처 중지
   * @returns {Promise<Object>} 캡처 중지 결과
   */
  async stopCapture() {
    return await this.captureManager.stopCapture();
  }

  /**
   * 타임랩스 생성
   * @param {Object} options - 타임랩스 생성 옵션
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  async generateTimelapse(options) {
    return await this.captureManager.generateTimelapse(options);
  }

  /**
   * 캡처 설정 업데이트
   * @param {Object} config - 새로운 캡처 설정
   * @returns {Object} 업데이트된 설정
   */
  updateCaptureConfig(config) {
    return this.recorderService.updateCaptureConfig(config);
  }

  /**
   * 캡처 상태 조회
   * @returns {Object} 현재 캡처 상태
   */
  getCaptureStatus() {
    return this.captureManager.getRecordingStatus();
  }

  /**
   * 이벤트 리스너 설정
   * @param {Object} callbacks - 이벤트 콜백 함수들
   * @returns {Function} 이벤트 리스너 제거 함수
   */
  setupEventListeners(callbacks) {
    return this.captureManager.setupEventListeners(callbacks);
  }
}

// 모듈 내보내기
module.exports = {
  /**
   * 캡처 관리자 - 전체 캡처 흐름 조정
   * 캡처 프로세스의 시작, 중지, 상태 관리를 담당합니다.
   */
  captureManager,

  /**
   * 녹화 서비스 - 실제 화면 녹화 담당
   * 화면 녹화의 하드웨어 수준 제어를 담당합니다.
   */
  recorderService,

  /**
   * 타임랩스 생성기 - 녹화 후 타임랩스 생성 담당
   * 녹화된 영상을 타임랩스로 변환하는 작업을 담당합니다.
   */
  timelapseGenerator,

  /**
   * 스토리지 관리자 - 파일 저장 및 메타데이터 관리
   * 캡처된 파일과 관련 메타데이터의 저장 및 관리를 담당합니다.
   */
  storageManager,
};
