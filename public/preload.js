const { contextBridge, ipcRenderer } = require("electron");

// API 그룹 정의
const captureAPI = {
  // 활성 창 목록 가져오기
  getActiveWindows: async () => {
    return await ipcRenderer.invoke("get-active-windows");
  },

  // 스크린샷 캡처 시작
  startCapture: (windowId) => {
    console.log("Preload: startCapture 호출됨", windowId);
    ipcRenderer.send("start-capture", { windowId });
  },

  // 스크린샷 캡처 중지
  stopCapture: () => {
    console.log("Preload: stopCapture 호출됨");
    ipcRenderer.send("stop-capture");
  },

  // 캡처 상태 이벤트 구독
  onCaptureStatus: (callback) => {
    console.log("Preload: onCaptureStatus 이벤트 구독 설정");
    const captureStatusListener = (event, status) => {
      callback(status);
    };

    ipcRenderer.on("capture-status", captureStatusListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 정리를 위한 함수 반환
    return () => {
      console.log("Preload: 캡처 상태 이벤트 구독 해제");
      ipcRenderer.removeListener("capture-status", captureStatusListener);
    };
  },
};

const timelapseAPI = {
  // 타임랩스 생성
  generateTimelapse: (options) => {
    console.log("Preload: generateTimelapse 호출됨", options);
    return new Promise((resolve, reject) => {
      ipcRenderer.once("generate-timelapse-response", (event, response) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.outputPath);
        }
      });

      ipcRenderer.send("generate-timelapse", options);
    });
  },
};

const windowAPI = {
  // 창 제어 API
  minimize: () => {
    ipcRenderer.send("window:minimize");
  },

  maximize: () => {
    ipcRenderer.send("window:maximize");
  },

  close: () => {
    ipcRenderer.send("window:close");
  },

  isMaximized: () => {
    return new Promise((resolve) => {
      ipcRenderer.once("window:is-maximized-response", (event, isMaximized) => {
        resolve(isMaximized);
      });
      ipcRenderer.send("window:is-maximized");
    });
  },
};

// 모든 API를 통합하여 노출
contextBridge.exposeInMainWorld("electron", {
  ...captureAPI,
  ...timelapseAPI,
  ...windowAPI,
});
