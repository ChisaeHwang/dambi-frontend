const { contextBridge, ipcRenderer } = require("electron");

/**
 * API 호출 래퍼 함수
 * @param {string} channel - IPC 채널
 * @param {Array} args - 인자 목록
 * @returns {Promise<any>} 응답 데이터
 */
async function invokeApi(channel, ...args) {
  try {
    const response = await ipcRenderer.invoke(channel, ...args);

    // 새로운 표준 응답 형식 처리
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

// 렌더러 프로세스에 노출할 API 정의
contextBridge.exposeInMainWorld("electron", {
  // 창 관리 기능
  minimize: () => invokeApi("minimize-window"),
  maximize: () => invokeApi("maximize-window"),
  close: () => invokeApi("close-window"),
  isMaximized: () => invokeApi("is-maximized"),

  // 타임랩스 캡처 관련 기능
  getActiveWindows: () => invokeApi("get-active-windows"),
  getRecordingStatus: () => invokeApi("get-recording-status"),
  startCapture: (windowId, windowName) =>
    invokeApi("start-capture", windowId, windowName),
  stopCapture: () => invokeApi("stop-capture"),
  generateTimelapse: (options) => invokeApi("generate-timelapse", options),
  updateTimelapseOptions: (options) =>
    invokeApi("update-timelapse-options", options),

  // 파일 시스템 기능
  selectSaveFolder: () => invokeApi("select-save-folder"),

  // 이벤트 리스너
  onCaptureStatus: (callback) => {
    // IPC 이벤트 리스너 등록
    const captureStatusHandler = (_, status) => callback(status);
    ipcRenderer.on("capture-status", captureStatusHandler);

    // 클린업 함수 반환 (이벤트 리스너 제거용)
    return () => {
      ipcRenderer.removeListener("capture-status", captureStatusHandler);
    };
  },

  // 타임랩스 생성 진행 상황 이벤트 리스너
  onTimelapseProgress: (callback) => {
    // IPC 이벤트 리스너 등록
    const progressHandler = (_, progress) => callback(progress);
    ipcRenderer.on("timelapse-progress", progressHandler);

    // 클린업 함수 반환 (이벤트 리스너 제거용)
    return () => {
      ipcRenderer.removeListener("timelapse-progress", progressHandler);
    };
  },
});
