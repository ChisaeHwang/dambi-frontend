const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const fs = require("fs");

// 분리된 서비스 모듈 가져오기
const captureService = require("./captureService");
const timelapseService = require("./timelapseService");
const windowService = require("./windowService");
const fileService = require("./fileService");

let mainWindow;

// 메인 창 생성
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "../preload.js"),
    },
  });

  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../../build/index.html")}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 앱 시작 시 창 생성
app.whenReady().then(() => {
  createWindow();
  fileService.createAppDirectories();
});

// 모든 창이 닫히면 앱 종료 (macOS 제외)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 앱 활성화 시 창이 없으면 생성
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC 이벤트 핸들러 등록
function setupIpcHandlers() {
  // 창 제어 이벤트
  ipcMain.on("window:minimize", () => {
    windowService.minimizeWindow(mainWindow);
  });

  ipcMain.on("window:maximize", () => {
    windowService.maximizeWindow(mainWindow);
  });

  ipcMain.on("window:close", () => {
    windowService.closeWindow(mainWindow);
  });

  ipcMain.on("window:is-maximized", (event) => {
    windowService.isWindowMaximized(mainWindow, event);
  });

  // 시스템 정보 진단 이벤트 추가
  ipcMain.handle("get-system-info", async () => {
    console.log("시스템 정보 요청 수신");
    const systemInfo = windowService.getSystemInfo();
    console.log("시스템 정보:", JSON.stringify(systemInfo, null, 2));
    return systemInfo;
  });

  // 캡처 관련 이벤트
  ipcMain.handle("get-active-windows", async () => {
    return await captureService.getActiveWindows();
  });

  ipcMain.on("start-capture", (event, args) => {
    captureService.startCapture(event, args);
  });

  ipcMain.on("stop-capture", (event) => {
    captureService.stopCapture(event);
  });

  // 타임랩스 생성 이벤트
  ipcMain.on("generate-timelapse", (event, options) => {
    const captureSession = captureService.getCaptureSession();

    // 세션에서 비디오 경로를 가져옴
    const videoPath = captureSession.videoPath;

    console.log("타임랩스 생성 요청 - 캡처 세션 정보:", {
      isCapturing: captureSession.isCapturing,
      videoPath,
      videoExists: videoPath ? fs.existsSync(videoPath) : false,
    });

    // 파일이 실제로 존재하는지 확인
    if (videoPath && fs.existsSync(videoPath)) {
      // 파일 크기 확인
      try {
        const stats = fs.statSync(videoPath);
        console.log(`비디오 파일 크기: ${stats.size} 바이트`);

        if (stats.size < 10000) {
          event.sender.send("generate-timelapse-response", {
            error: "녹화된 파일이 너무 작습니다. 다시 녹화해주세요.",
          });
          return;
        }
      } catch (err) {
        console.error("파일 상태 확인 오류:", err);
      }

      // 타임랩스 생성 실행
      timelapseService.generateTimelapse(event, options, videoPath);
    } else {
      console.error("비디오 파일을 찾을 수 없음:", videoPath);
      event.sender.send("generate-timelapse-response", {
        error: "녹화된 영상을 찾을 수 없습니다. 먼저 화면 녹화를 진행해주세요.",
      });
    }
  });
}

// IPC 핸들러 설정
app.whenReady().then(setupIpcHandlers);

// 개발 환경에서 빠른 새로고침을 위한 이벤트 핸들러
if (isDev) {
  app.on("ready", () => {
    const { globalShortcut } = require("electron");

    // F5 키로 새로고침
    globalShortcut.register("F5", () => {
      if (mainWindow) mainWindow.reload();
    });

    // Ctrl+R로 새로고침
    globalShortcut.register("CommandOrControl+R", () => {
      if (mainWindow) mainWindow.reload();
    });
  });
}
