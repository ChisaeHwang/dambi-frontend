const { ipcMain, dialog } = require("electron");
const windowManager = require("./window-manager");
const captureModule = require("./capture");

/**
 * 표준 응답 생성 헬퍼 함수
 * @param {boolean} success - 성공 여부
 * @param {any} data - 응답 데이터
 * @param {string} error - 오류 메시지
 * @returns {Object} 표준화된 응답
 */
function createResponse(success, data = null, error = null) {
  return { success, data, error };
}

/**
 * IPC 이벤트 처리를 담당하는 클래스
 */
class IpcHandler {
  /**
   * IPC 이벤트 핸들러 등록
   */
  registerHandlers() {
    this._registerWindowControlHandlers();
    this._registerTimelapseCaptureHandlers();
    this._registerFileSystemHandlers();
  }

  /**
   * 윈도우 컨트롤 관련 핸들러 등록
   */
  _registerWindowControlHandlers() {
    // 윈도우 최소화
    ipcMain.handle("minimize-window", () => {
      try {
        const result = windowManager.minimize();
        return createResponse(true, result);
      } catch (error) {
        console.error("[IPC] 윈도우 최소화 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 윈도우 최대화 토글
    ipcMain.handle("maximize-window", () => {
      try {
        const result = windowManager.toggleMaximize();
        return createResponse(true, result);
      } catch (error) {
        console.error("[IPC] 윈도우 최대화 토글 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 윈도우 닫기
    ipcMain.handle("close-window", () => {
      try {
        const result = windowManager.close();
        return createResponse(true, result);
      } catch (error) {
        console.error("[IPC] 윈도우 닫기 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 윈도우 최대화 상태 확인
    ipcMain.handle("is-maximized", () => {
      try {
        const result = windowManager.isMaximized();
        return createResponse(true, result);
      } catch (error) {
        console.error("[IPC] 윈도우 상태 확인 오류:", error);
        return createResponse(false, null, error.message);
      }
    });
  }

  /**
   * 타임랩스 캡처 관련 핸들러 등록
   */
  _registerTimelapseCaptureHandlers() {
    const { captureManager } = captureModule;

    // 활성 창 목록 가져오기
    ipcMain.handle("get-active-windows", async () => {
      try {
        console.log(`[IPC] 활성 창 목록 요청 받음`);
        const windows = await captureManager.getActiveWindows();
        console.log(`[IPC] 활성 창 목록 반환: ${windows.length}개 항목`);
        return createResponse(true, windows);
      } catch (error) {
        console.error("[IPC] 활성 창 목록 가져오기 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 녹화 상태 확인
    ipcMain.handle("get-recording-status", () => {
      try {
        const status = captureManager.getRecordingStatus();
        return createResponse(true, status);
      } catch (error) {
        console.error("[IPC] 녹화 상태 확인 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 캡처 시작
    ipcMain.handle("start-capture", async (event, windowId, windowName) => {
      try {
        console.log(`[IPC] 캡처 시작 요청 받음: ${windowId}, ${windowName}`);
        const result = await captureManager.startCapture(windowId, windowName);
        console.log(`[IPC] 캡처 시작 결과:`, result);
        return createResponse(true, result);
      } catch (error) {
        console.error("[IPC] 캡처 시작 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 캡처 중지
    ipcMain.handle("stop-capture", async () => {
      try {
        console.log(`[IPC] 캡처 중지 요청 받음`);
        const result = await captureManager.stopCapture();
        console.log(`[IPC] 캡처 중지 결과:`, result);
        return createResponse(true, result);
      } catch (error) {
        console.error("[IPC] 캡처 중지 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 타임랩스 생성
    ipcMain.handle("generate-timelapse", async (event, options) => {
      try {
        console.log("타임랩스 생성 요청 받음:", options);
        const result = await captureManager.generateTimelapse(options);
        console.log("타임랩스 생성 완료:", result);
        return createResponse(true, result);
      } catch (error) {
        console.error("타임랩스 생성 오류:", error);
        return createResponse(false, null, error.message);
      }
    });

    // 타임랩스 옵션 업데이트
    ipcMain.handle("update-timelapse-options", async (event, options) => {
      try {
        console.log("타임랩스 옵션 업데이트 요청 받음:", options);

        if (!options || typeof options !== "object") {
          throw new Error("잘못된 옵션 형식");
        }

        if (captureManager.updateTimelapseOptions) {
          const result = await captureManager.updateTimelapseOptions(options);
          return createResponse(true, result || options);
        }

        throw new Error("타임랩스 옵션 업데이트 기능이 구현되지 않았습니다");
      } catch (error) {
        console.error("타임랩스 옵션 업데이트 오류:", error);
        return createResponse(false, null, error.message);
      }
    });
  }

  /**
   * 파일 시스템 관련 핸들러 등록
   */
  _registerFileSystemHandlers() {
    // 폴더 선택 다이얼로그
    ipcMain.handle("select-save-folder", async () => {
      try {
        // 다이얼로그 열기
        const result = await dialog.showOpenDialog(
          windowManager.getMainWindow(),
          {
            title: "타임랩스 저장 폴더 선택",
            defaultPath: require("electron").app.getPath("videos"),
            properties: ["openDirectory", "createDirectory"],
            buttonLabel: "선택",
          }
        );

        return createResponse(true, result);
      } catch (error) {
        console.error("폴더 선택 다이얼로그 오류:", error);
        return createResponse(false, null, error.message);
      }
    });
  }
}

module.exports = new IpcHandler();
