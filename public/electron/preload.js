const { contextBridge, ipcRenderer } = require("electron");

// 렌더러 프로세스에 노출할 API 정의
contextBridge.exposeInMainWorld("electron", {
  // 창 관리 기능
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  close: () => ipcRenderer.invoke("close-window"),
  isMaximized: () => ipcRenderer.invoke("is-maximized"),

  // 타임랩스 캡처 관련 기능
  getActiveWindows: () => ipcRenderer.invoke("get-active-windows"),
  getRecordingStatus: () => ipcRenderer.invoke("get-recording-status"),
  startCapture: (windowId, windowName) =>
    ipcRenderer.invoke("start-capture", windowId, windowName),
  stopCapture: () => ipcRenderer.invoke("stop-capture"),
  generateTimelapse: (options) =>
    ipcRenderer.invoke("generate-timelapse", options),
  updateTimelapseOptions: (options) =>
    ipcRenderer.invoke("update-timelapse-options", options),

  // 파일 시스템 기능
  selectSaveFolder: () => ipcRenderer.invoke("select-save-folder"),

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
