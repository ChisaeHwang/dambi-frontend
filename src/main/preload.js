const { contextBridge, ipcRenderer } = require("electron");
const { join } = require("path");
const fs = require("fs");
const path = require("path");

// IPC 통신을 통해 메인 프로세스와 렌더러 프로세스 간 통신 가능하게 하는 API
contextBridge.exposeInMainWorld("electron", {
  // 캡처 시작 (interval: 캡처 간격(초))
  startCapture: (interval) => {
    ipcRenderer.send("timelapse:start-capture", { interval });
  },

  // 캡처 중지
  stopCapture: () => {
    ipcRenderer.send("timelapse:stop-capture");
  },

  // 타임랩스 생성 (옵션: fps, outputQuality, outputFormat)
  generateTimelapse: (options) => {
    return ipcRenderer.invoke("timelapse:generate", options);
  },

  // 캡처 상태 업데이트 콜백 등록
  onCaptureStatus: (callback) => {
    ipcRenderer.on("timelapse:capture-status", (_, data) => callback(data));
  },

  // 창 최소화
  minimize: () => {
    ipcRenderer.send("window:minimize");
  },

  // 창 최대화/복원
  maximize: () => {
    ipcRenderer.send("window:maximize");
  },

  // 창 닫기
  close: () => {
    ipcRenderer.send("window:close");
  },

  // 창 최대화 상태 확인
  isMaximized: () => {
    return ipcRenderer.invoke("window:is-maximized");
  },
});
