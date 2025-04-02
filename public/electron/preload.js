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
  startCapture: (windowId, windowName) =>
    ipcRenderer.invoke("start-capture", windowId, windowName),
  stopCapture: () => ipcRenderer.invoke("stop-capture"),
  generateTimelapse: (options) =>
    ipcRenderer.invoke("generate-timelapse", options),

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
});
