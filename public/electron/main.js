const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const isDev = require("electron-is-dev");

// 전역 변수로 메인 윈도우 객체 유지
let mainWindow;

// 타임랩스 캡처 클래스
class TimelapseCapture {
  constructor() {
    this.isCapturing = false;
    this.captureInterval = null;
    this.captureDir = null;
    this.startTime = null;
    this.frameCount = 0;
    this.captureConfig = {
      interval: 1000, // 1초 간격으로 변경 (기존 2000ms에서 1000ms로)
      quality: 80, // JPEG 품질 (0-100)
    };
  }

  async startCapture(windowId, windowName) {
    // 캡처를 이미 진행 중이면 중지
    if (this.isCapturing) {
      this.stopCapture();
    }

    this.captureDir = path.join(
      app.getPath("userData"),
      "captures",
      `capture_${Date.now()}`
    );

    // 캡처 디렉토리 생성
    if (!fs.existsSync(this.captureDir)) {
      fs.mkdirSync(this.captureDir, { recursive: true });
    }

    // 메타데이터 파일 생성
    this.startTime = Date.now();
    const metaData = {
      startTime: this.startTime,
      interval: this.captureConfig.interval,
      windowId,
      windowName,
    };
    fs.writeFileSync(
      path.join(this.captureDir, "metadata.json"),
      JSON.stringify(metaData, null, 2)
    );

    this.isCapturing = true;
    this.frameCount = 0;

    // 정기적 캡처 시작
    this.captureInterval = setInterval(async () => {
      try {
        const timestamp = Date.now();
        const framePath = path.join(
          this.captureDir,
          `frame_${this.frameCount.toString().padStart(6, "0")}.png`
        );

        // 지정된 창 캡처
        const sources = await desktopCapturer.getSources({
          types: ["window", "screen"],
          thumbnailSize: { width: 1920, height: 1080 }, // 원하는 해상도
        });

        const source = sources.find((s) => s.id === windowId);
        if (!source) {
          console.warn(
            "선택한 창을 찾을 수 없습니다. 전체 화면으로 대체합니다."
          );
          // 전체 화면으로 대체
          const screenSource = sources.find((s) => s.id.startsWith("screen:"));
          if (screenSource) {
            fs.writeFileSync(framePath, screenSource.thumbnail.toPNG());
          } else {
            throw new Error("사용 가능한 화면 소스가 없습니다");
          }
        } else {
          // 이미지로 저장 - PNG 형식으로 변경
          fs.writeFileSync(framePath, source.thumbnail.toPNG());
        }

        // 프레임 카운터 증가
        this.frameCount++;

        // 상태 이벤트 발생
        this.emitStatusUpdate();
      } catch (error) {
        console.error("캡처 오류:", error);
      }
    }, this.captureConfig.interval);

    this.emitStatusUpdate();
    return { success: true, captureDir: this.captureDir };
  }

  stopCapture() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    // 메타데이터 업데이트
    if (this.captureDir) {
      const metaPath = path.join(this.captureDir, "metadata.json");
      if (fs.existsSync(metaPath)) {
        const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        metadata.endTime = Date.now();
        metadata.totalFrames = this.frameCount;
        metadata.duration = metadata.endTime - metadata.startTime;
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
      }
    }

    this.isCapturing = false;
    this.emitStatusUpdate();

    return { success: true, totalFrames: this.frameCount };
  }

  emitStatusUpdate() {
    // 상태 업데이트 이벤트 발생
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("capture-status", {
        isCapturing: this.isCapturing,
        duration: this.startTime ? Date.now() - this.startTime : 0,
        frameCount: this.frameCount,
      });
    }
  }

  // 타임랩스 생성
  async generateTimelapse(options) {
    // 캡처가 진행 중이면 중지
    if (this.isCapturing) {
      this.stopCapture();
    }

    if (!this.captureDir || !fs.existsSync(this.captureDir)) {
      throw new Error("캡처 디렉토리가 없습니다");
    }

    const outputPath =
      options.outputPath ||
      path.join(app.getPath("videos"), `timelapse_${Date.now()}.mp4`);
    const speedFactor = options.speedFactor || 3;
    const quality = options.outputQuality || "medium";

    // 출력 디렉토리 확인 및 생성
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 프레임레이트 계산 (간격과 속도 고려)
    const fps = 30;
    const inputFps = 1000 / this.captureConfig.interval;

    // FFmpeg 품질 설정
    const presetMap = {
      low: "veryfast",
      medium: "medium",
      high: "slow",
    };

    const crfMap = {
      low: "28",
      medium: "23",
      high: "18",
    };

    const preset = presetMap[quality] || "medium";
    const crf = crfMap[quality] || "23";

    // ffmpeg-static 패키지에서 ffmpeg 경로 가져오기
    const ffmpegPath = require("ffmpeg-static");

    console.log(`타임랩스 생성 시작: ${outputPath}`);
    console.log(
      `설정: 속도=${speedFactor}x, 품질=${quality}, 프리셋=${preset}, CRF=${crf}`
    );

    return new Promise((resolve, reject) => {
      try {
        // FFmpeg를 사용하여 이미지 시퀀스를 비디오로 변환 - PNG 형식으로 변경
        const ffmpeg = spawn(ffmpegPath, [
          "-framerate",
          inputFps.toString(),
          "-i",
          path.join(this.captureDir, "frame_%06d.png"),
          "-vf",
          `setpts=PTS/${speedFactor}`, // 속도 조절
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-preset",
          preset,
          "-crf",
          crf,
          "-y", // 기존 파일 덮어쓰기
          outputPath,
        ]);

        ffmpeg.stdout.on("data", (data) => {
          console.log(`ffmpeg 출력: ${data}`);
        });

        ffmpeg.stderr.on("data", (data) => {
          console.log(`ffmpeg 오류: ${data}`);
        });

        ffmpeg.on("close", (code) => {
          if (code === 0) {
            console.log(`타임랩스 생성 완료: ${outputPath}`);
            // 성공적으로 생성됨
            if (options.deleteOriginals) {
              // 원본 이미지 삭제
              this.deleteOriginalFrames();
            }
            resolve(outputPath);
          } else {
            const errorMsg = `타임랩스 생성 실패: FFmpeg 오류 코드 ${code}`;
            console.error(errorMsg);
            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        console.error("타임랩스 생성 중 오류:", error);
        reject(error);
      }
    });
  }

  // 원본 이미지 삭제
  deleteOriginalFrames() {
    if (this.captureDir && fs.existsSync(this.captureDir)) {
      const files = fs.readdirSync(this.captureDir);
      for (const file of files) {
        if (
          file.startsWith("frame_") &&
          (file.endsWith(".jpg") || file.endsWith(".png"))
        ) {
          fs.unlinkSync(path.join(this.captureDir, file));
        }
      }
      console.log("원본 캡처 이미지 삭제 완료");
    }
  }
}

// 윈도우 생성 함수
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    frame: false, // 사용자 정의 프레임 사용
    backgroundColor: "#2f3136", // 디스코드와 유사한 배경색
  });

  // 개발/배포 환경에 따라 URL 로드
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../../build/index.html")}`;

  mainWindow.loadURL(startUrl);

  // 개발 환경에서는 개발자 도구 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 창이 닫힐 때 이벤트
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(() => {
  createWindow();

  // MacOS에서는 앱이 닫혀도 dock에 남아있을 수 있으므로 활성화될 때 창이 없으면 다시 생성
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 창이 닫히면 앱 종료 (Windows/Linux)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 타임랩스 캡처 인스턴스 생성
const timelapseCapture = new TimelapseCapture();

// IPC 이벤트 설정
ipcMain.handle("get-active-windows", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: { width: 150, height: 150 },
    });

    // 각 소스에 대해 필요한 정보만 추출
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnailDataUrl: source.thumbnail.toDataURL(),
      thumbnailWidth: source.thumbnail.getSize().width,
      thumbnailHeight: source.thumbnail.getSize().height,
      isScreen: source.id.startsWith("screen:"),
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error("활성 창 목록 가져오기 오류:", error);
    throw error;
  }
});

ipcMain.handle("start-capture", async (event, windowId, windowName) => {
  try {
    return await timelapseCapture.startCapture(windowId, windowName);
  } catch (error) {
    console.error("캡처 시작 오류:", error);
    throw error;
  }
});

ipcMain.handle("stop-capture", async () => {
  try {
    return timelapseCapture.stopCapture();
  } catch (error) {
    console.error("캡처 중지 오류:", error);
    throw error;
  }
});

ipcMain.handle("generate-timelapse", async (event, options) => {
  try {
    return await timelapseCapture.generateTimelapse(options);
  } catch (error) {
    console.error("타임랩스 생성 오류:", error);
    throw error;
  }
});

// 윈도우 컨트롤 (최소화, 최대화, 닫기)
ipcMain.handle("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
  return true;
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
  return mainWindow.isMaximized();
});

ipcMain.handle("close-window", () => {
  if (mainWindow) mainWindow.close();
  return true;
});

ipcMain.handle("is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
