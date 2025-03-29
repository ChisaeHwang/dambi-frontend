import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from "electron";
import * as path from "path";
import * as fs from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// 캡처 관련 상태
let isCapturing = false;
let captureInterval: NodeJS.Timeout | null = null;
let frameCount = 0;
let startTime = 0;
let currentSessionPath = "";

// 메인 윈도우 인스턴스 저장
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // 브라우저 창 생성
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#202225", // 다크 테마 배경색
    frame: false, // 프레임 제거 (타이틀바 및 메뉴바 제거)
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 개발 모드일 때는 개발 서버 URL 로드
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
    // 개발자 도구 열기
    mainWindow.webContents.openDevTools();
  } else {
    // 배포 모드일 때는 빌드된 앱 로드
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // 메뉴바 제거
  mainWindow.setMenu(null);

  // 창 제어 이벤트 핸들러
  ipcMain.on("window:minimize", () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on("window:maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("window:close", () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle("window:is-maximized", () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // 캡처 시작 IPC 핸들러
  ipcMain.on("timelapse:start-capture", async (event, { interval = 5 }) => {
    if (isCapturing) return;

    // 캡처 시작
    isCapturing = true;
    frameCount = 0;
    startTime = Date.now();

    // 세션 폴더 생성
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const baseDir = path.join(homeDir, "Documents", "담비", "captures");

    // 디렉토리 생성
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // 세션 식별자 생성 (날짜 기반)
    const sessionId = `session_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}`;
    currentSessionPath = path.join(baseDir, sessionId);

    // 세션 디렉토리 생성
    fs.mkdirSync(currentSessionPath);

    // 캡처 간격 타이머 설정
    captureInterval = setInterval(async () => {
      try {
        // 화면 캡처
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: {
            width: 1920,
            height: 1080,
          },
        });

        if (sources.length > 0) {
          const primaryDisplay = screen.getPrimaryDisplay();
          const source =
            sources.find(
              (s) => s.display_id === primaryDisplay.id.toString()
            ) || sources[0];

          // 이미지 데이터
          const image = source.thumbnail.toPNG();

          // 이미지 저장
          const framePath = path.join(
            currentSessionPath,
            `frame_${frameCount.toString().padStart(6, "0")}.png`
          );
          fs.writeFileSync(framePath, image);

          // 상태 업데이트
          frameCount++;
          const duration = Math.floor((Date.now() - startTime) / 1000);

          // 클라이언트에 상태 전송
          event.sender.send("timelapse:capture-status", {
            isCapturing,
            frameCount,
            duration,
          });
        }
      } catch (error) {
        console.error("캡처 오류:", error);
      }
    }, interval * 1000);

    // 초기 상태 전송
    event.sender.send("timelapse:capture-status", {
      isCapturing: true,
      frameCount: 0,
      duration: 0,
    });
  });

  // 캡처 중지 IPC 핸들러
  ipcMain.on("timelapse:stop-capture", (event) => {
    if (!isCapturing) return;

    // 타이머 중지
    if (captureInterval) {
      clearInterval(captureInterval);
      captureInterval = null;
    }

    // 상태 업데이트
    isCapturing = false;
    const duration = Math.floor((Date.now() - startTime) / 1000);

    // 세션 메타데이터 저장
    if (currentSessionPath) {
      const metadataPath = path.join(currentSessionPath, "metadata.json");
      const metadata = {
        id: path.basename(currentSessionPath),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration,
        frameCount,
        interval: 5, // 기본값, 실제로는 인자로 받은 값 사용
        speedFactor: 10, // 기본 속도 배율
        playbackDuration: Math.floor(duration / 10), // 기본값: 재생 시간 = 캡처 시간 / 속도 배율
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    // 클라이언트에 상태 전송
    event.sender.send("timelapse:capture-status", {
      isCapturing: false,
      frameCount,
      duration,
    });
  });

  // 타임랩스 생성 IPC 핸들러
  ipcMain.handle("timelapse:generate", async (event, options) => {
    if (!currentSessionPath || frameCount === 0) {
      throw new Error("생성할 프레임이 없습니다.");
    }

    const {
      fps = 30,
      outputQuality = "medium",
      outputFormat = "mp4",
    } = options;

    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const outputDir = path.join(homeDir, "Documents", "담비", "outputs");

    // 출력 디렉토리 생성
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 출력 파일 경로
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(
      outputDir,
      `timelapse_${timestamp}.${outputFormat}`
    );

    try {
      // TODO: FFmpeg를 사용하여 타임랩스 생성 구현
      // 예시: ffmpeg -r 30 -i frame_%06d.png -c:v libx264 -pix_fmt yuv420p output.mp4

      // 지금은 임시로 프레임 복사로 대체
      const firstFramePath = path.join(
        currentSessionPath,
        `frame_${(0).toString().padStart(6, "0")}.png`
      );
      fs.copyFileSync(firstFramePath, outputPath);

      return outputPath;
    } catch (error) {
      console.error("타임랩스 생성 오류:", error);
      throw error;
    }
  });
}

// Electron이 준비되면 창 생성
app.whenReady().then(() => {
  createWindow();

  // macOS에서 모든 창이 닫혔을 때 앱을 종료하지 않는 처리
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // macOS에서 dock 아이콘 클릭 시 창이 없으면 다시 창 생성
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
