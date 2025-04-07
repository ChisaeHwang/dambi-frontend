const { contextBridge, ipcRenderer } = require("electron");

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - 성공 여부
 * @property {any} data - 응답 데이터
 * @property {string} [error] - 오류 메시지 (실패 시)
 */

/**
 * @typedef {function} EventUnsubscribe
 * @returns {void} 구독 해제 함수
 */

/**
 * API 버전 정보
 * @type {string}
 */
const API_VERSION = "1.0.0";

/**
 * API 호출 래퍼 함수
 * @param {string} channel - IPC 채널
 * @param {...any} args - 인자 목록
 * @returns {Promise<any>} 응답 데이터
 * @throws {Error} API 호출 오류
 */
async function invokeApi(channel, ...args) {
  try {
    const response = await ipcRenderer.invoke(channel, ...args);

    // 표준 응답 형식 처리
    if (response && typeof response === "object" && "success" in response) {
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || "알 수 없는 오류");
      }
    }

    // 기존 응답 형식 처리 (이전 버전 호환성)
    return response;
  } catch (error) {
    console.error(`API 호출 오류 (${channel}):`, error);
    throw error;
  }
}

/**
 * 이벤트 관리 클래스
 * 이벤트 리스너 등록 및 해제를 관리합니다.
 */
class EventManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} channel - 이벤트 채널
   * @param {function} callback - 이벤트 콜백 함수
   * @returns {EventUnsubscribe} 구독 해제 함수
   */
  subscribe(channel, callback) {
    // 유효성 검사
    if (!channel || typeof channel !== "string") {
      throw new Error("유효한 이벤트 채널이 필요합니다");
    }

    if (!callback || typeof callback !== "function") {
      throw new Error("유효한 콜백 함수가 필요합니다");
    }

    // 콜백 래퍼 생성 (이벤트 객체 제외하고 데이터만 전달)
    const wrappedCallback = (_, ...args) => callback(...args);

    // 리스너 등록
    ipcRenderer.on(channel, wrappedCallback);

    // 관리 맵에 추가
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel).add(wrappedCallback);

    // 구독 해제 함수 반환
    return () => this.unsubscribe(channel, wrappedCallback);
  }

  /**
   * 이벤트 리스너 해제
   * @param {string} channel - 이벤트 채널
   * @param {function} callback - 제거할 콜백 함수
   */
  unsubscribe(channel, callback) {
    if (this.listeners.has(channel)) {
      ipcRenderer.removeListener(channel, callback);
      this.listeners.get(channel).delete(callback);

      if (this.listeners.get(channel).size === 0) {
        this.listeners.delete(channel);
      }
    }
  }

  /**
   * 특정 채널의 모든 리스너 제거
   * @param {string} channel - 이벤트 채널
   */
  unsubscribeChannel(channel) {
    if (this.listeners.has(channel)) {
      for (const callback of this.listeners.get(channel)) {
        ipcRenderer.removeListener(channel, callback);
      }
      this.listeners.delete(channel);
    }
  }

  /**
   * 모든 채널의 리스너 제거
   */
  unsubscribeAll() {
    for (const [channel, callbacks] of this.listeners.entries()) {
      for (const callback of callbacks) {
        ipcRenderer.removeListener(channel, callback);
      }
    }
    this.listeners.clear();
  }
}

// 이벤트 관리자 인스턴스 생성
const eventManager = new EventManager();

// 렌더러 프로세스에 노출할 API 정의
const electronAPI = {
  /**
   * API 버전 정보
   */
  apiVersion: API_VERSION,

  /**
   * 창 관리 API
   */
  window: {
    /**
     * 창 최소화
     * @returns {Promise<boolean>} 성공 여부
     */
    minimize: () => invokeApi("minimize-window"),

    /**
     * 창 최대화 토글
     * @returns {Promise<boolean>} 최대화 상태
     */
    maximize: () => invokeApi("maximize-window"),

    /**
     * 창 닫기
     * @returns {Promise<boolean>} 성공 여부
     */
    close: () => invokeApi("close-window"),

    /**
     * 창 최대화 상태 확인
     * @returns {Promise<boolean>} 최대화 상태
     */
    isMaximized: () => invokeApi("is-maximized"),
  },

  /**
   * 캡처 관련 API
   */
  capture: {
    /**
     * 활성 창 목록 가져오기
     * @returns {Promise<Array>} 활성 창 목록
     */
    getActiveWindows: () => invokeApi("get-active-windows"),

    /**
     * 녹화 상태 확인
     * @returns {Promise<Object>} 녹화 상태 정보
     */
    getRecordingStatus: () => invokeApi("get-recording-status"),

    /**
     * 캡처 시작
     * @param {string} windowId - 캡처할 윈도우 ID
     * @param {string} windowName - 캡처할 윈도우 이름
     * @returns {Promise<Object>} 캡처 시작 결과
     */
    startCapture: (windowId, windowName) =>
      invokeApi("start-capture", windowId, windowName),

    /**
     * 캡처 중지
     * @returns {Promise<Object>} 캡처 중지 결과
     */
    stopCapture: () => invokeApi("stop-capture"),
  },

  /**
   * 타임랩스 관련 API
   */
  timelapse: {
    /**
     * 타임랩스 생성
     * @param {Object} options - 타임랩스 생성 옵션
     * @returns {Promise<string>} 생성된 타임랩스 파일 경로
     */
    generate: (options) => invokeApi("generate-timelapse", options),

    /**
     * 타임랩스 옵션 업데이트
     * @param {Object} options - 업데이트할 옵션
     * @returns {Promise<Object>} 업데이트된 옵션
     */
    updateOptions: (options) => invokeApi("update-timelapse-options", options),
  },

  /**
   * 파일 시스템 API
   */
  filesystem: {
    /**
     * 저장 폴더 선택
     * @returns {Promise<Object>} 선택 결과
     */
    selectSaveFolder: () => invokeApi("select-save-folder"),
  },

  /**
   * 이벤트 API
   */
  events: {
    /**
     * 캡처 상태 이벤트 구독
     * @param {function} callback - 상태 업데이트 콜백
     * @returns {EventUnsubscribe} 구독 해제 함수
     */
    onCaptureStatus: (callback) =>
      eventManager.subscribe("capture-status", callback),

    /**
     * 타임랩스 진행 상황 이벤트 구독
     * @param {function} callback - 진행 상황 업데이트 콜백
     * @returns {EventUnsubscribe} 구독 해제 함수
     */
    onTimelapseProgress: (callback) =>
      eventManager.subscribe("timelapse-progress", callback),

    /**
     * 특정 채널의 모든 이벤트 구독 취소
     * @param {string} channel - 이벤트 채널 명
     */
    unsubscribeChannel: (channel) => eventManager.unsubscribeChannel(channel),

    /**
     * 모든 이벤트 구독 취소
     */
    unsubscribeAll: () => eventManager.unsubscribeAll(),
  },
};

// 레거시 API 지원을 위한 호환성 계층
const legacyAPI = {
  minimize: () => electronAPI.window.minimize(),
  maximize: () => electronAPI.window.maximize(),
  close: () => electronAPI.window.close(),
  isMaximized: () => electronAPI.window.isMaximized(),
  getActiveWindows: () => electronAPI.capture.getActiveWindows(),
  getRecordingStatus: () => electronAPI.capture.getRecordingStatus(),
  startCapture: (windowId, windowName) =>
    electronAPI.capture.startCapture(windowId, windowName),
  stopCapture: () => electronAPI.capture.stopCapture(),
  generateTimelapse: (options) => electronAPI.timelapse.generate(options),
  updateTimelapseOptions: (options) =>
    electronAPI.timelapse.updateOptions(options),
  selectSaveFolder: () => electronAPI.filesystem.selectSaveFolder(),

  // 이벤트 리스너 등록 메서드
  onCaptureStatus: (callback) => {
    console.warn(
      "사용 중단 예정: 대신 electron.events.onCaptureStatus 사용 권장"
    );
    return electronAPI.events.onCaptureStatus(callback);
  },
  onTimelapseProgress: (callback) => {
    console.warn(
      "사용 중단 예정: 대신 electron.events.onTimelapseProgress 사용 권장"
    );
    return electronAPI.events.onTimelapseProgress(callback);
  },
};

// 최종 API 노출 (구조화된 API + 레거시 지원)
contextBridge.exposeInMainWorld("electron", {
  ...electronAPI,
  ...legacyAPI,
});
