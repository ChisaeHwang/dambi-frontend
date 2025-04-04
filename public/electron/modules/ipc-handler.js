const { ipcMain, dialog } = require("electron");
const windowManager = require("./window-manager");
const captureModule = require("./capture");

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
      return windowManager.minimize();
    });

    // 윈도우 최대화 토글
    ipcMain.handle("maximize-window", () => {
      return windowManager.toggleMaximize();
    });

    // 윈도우 닫기
    ipcMain.handle("close-window", () => {
      return windowManager.close();
    });

    // 윈도우 최대화 상태 확인
    ipcMain.handle("is-maximized", () => {
      return windowManager.isMaximized();
    });
  }

  /**
   * 타임랩스 캡처 관련 핸들러 등록
   */
  _registerTimelapseCaptureHandlers() {
    const { captureManager } = captureModule;

    // 활성 창 목록 가져오기
    ipcMain.handle("get-active-windows", async () => {
      return await captureManager.getActiveWindows();
    });

    // 녹화 상태 확인
    ipcMain.handle("get-recording-status", () => {
      return captureManager.getRecordingStatus();
    });

    // 캡처 시작
    ipcMain.handle("start-capture", async (event, windowId, windowName) => {
      try {
        console.log(`[IPC] 캡처 시작 요청 받음: ${windowId}, ${windowName}`);
        const result = await captureManager.startCapture(windowId, windowName);
        console.log(`[IPC] 캡처 시작 결과:`, result);
        return result;
      } catch (error) {
        console.error("[IPC] 캡처 시작 오류:", error);
        return { success: false, error: error.message };
      }
    });

    // 캡처 중지
    ipcMain.handle("stop-capture", async () => {
      try {
        console.log(`[IPC] 캡처 중지 요청 받음`);
        const result = captureManager.stopCapture();
        console.log(`[IPC] 캡처 중지 결과:`, result);
        return result;
      } catch (error) {
        console.error("[IPC] 캡처 중지 오류:", error);
        return { success: false, error: error.message };
      }
    });

    // 타임랩스 생성
    ipcMain.handle("generate-timelapse", async (event, options) => {
      try {
        console.log("타임랩스 생성 요청 받음:", options);
        const result = await captureManager.generateTimelapse(options);
        console.log("타임랩스 생성 완료:", result);
        return result;
      } catch (error) {
        console.error("타임랩스 생성 오류:", error);
        throw error;
      }
    });

    // 타임랩스 옵션 업데이트
    ipcMain.handle("update-timelapse-options", async (event, options) => {
      try {
        console.log("타임랩스 옵션 업데이트 요청 받음:", options);
        // 옵션 업데이트 처리 (필요시 captureManager에 해당 기능 추가)
        if (options && typeof options === "object") {
          // 여기서 captureManager 또는 다른 모듈에 옵션을 전달
          // 실제 기능은 이후 구현이 필요할 수 있음
          if (captureManager.updateTimelapseOptions) {
            await captureManager.updateTimelapseOptions(options);
          }
          return { success: true };
        }
        return { success: false, error: "잘못된 옵션 형식" };
      } catch (error) {
        console.error("타임랩스 옵션 업데이트 오류:", error);
        return { success: false, error: error.message };
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

        return result;
      } catch (error) {
        console.error("폴더 선택 다이얼로그 오류:", error);
        throw error;
      }
    });
  }
}

module.exports = new IpcHandler();
