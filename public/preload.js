const { contextBridge, ipcRenderer } = require("electron");

// 일렉트론 API를 웹 콘텐츠에 노출
contextBridge.exposeInMainWorld("electron", {
  // 스크린샷 캡처 시작
  startCapture: (interval) => {
    ipcRenderer.send("start-capture", { interval });
  },

  // 스크린샷 캡처 중지
  stopCapture: () => {
    ipcRenderer.send("stop-capture");
  },

  // 타임랩스 생성
  generateTimelapse: (options) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.once("generate-timelapse-response", (event, result) => {
        if (result.error) {
          reject(result.error);
        } else {
          resolve(result.outputPath);
        }
      });

      ipcRenderer.send("generate-timelapse", options);
    });
  },

  // 캡처 상태 이벤트 구독
  onCaptureStatus: (callback) => {
    const captureStatusListener = (event, status) => {
      callback(status);
    };

    ipcRenderer.on("capture-status", captureStatusListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 정리를 위한 함수 반환
    return () => {
      ipcRenderer.removeListener("capture-status", captureStatusListener);
    };
  },
});
