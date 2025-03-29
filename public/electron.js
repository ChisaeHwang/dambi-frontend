const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const fs = require("fs");
const os = require("os");
const { desktopCapturer } = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

// FFmpeg 경로 설정
ffmpeg.setFfmpegPath(ffmpegPath);

// 캡처 세션 상태
let captureSession = {
  isCapturing: false,
  frameCount: 0,
  startTime: null,
  captureDir: null,
  interval: 5,
  intervalId: null,
};

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 애플리케이션 시작 시 필요한 디렉토리 생성
app.on("ready", () => {
  createAppDirectories();
});

// 애플리케이션 디렉토리 생성
function createAppDirectories() {
  const appDataDir = path.join(os.homedir(), "Documents", "담비");
  const capturesDir = path.join(appDataDir, "captures");
  const timelapsesDir = path.join(appDataDir, "timelapses");

  // 디렉토리가 존재하지 않으면 생성
  [appDataDir, capturesDir, timelapsesDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 스크린샷 캡처 시작
ipcMain.on("start-capture", (event, args) => {
  console.log("Main 프로세스: start-capture 이벤트 수신", args);
  const interval = args.interval || 5;

  // 이미 캡처 중이면 중지
  if (captureSession.isCapturing) {
    console.log("Main 프로세스: 이미 캡처 중. 기존 인터벌 제거");
    clearInterval(captureSession.intervalId);
  }

  // 새 캡처 세션 초기화
  const sessionTimestamp = new Date().toISOString().replace(/:/g, "-");
  const sessionDir = path.join(
    os.homedir(),
    "Documents",
    "담비",
    "captures",
    `session_${sessionTimestamp}`
  );

  console.log("Main 프로세스: 캡처 디렉토리 생성", sessionDir);
  // 디렉토리 생성
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  captureSession = {
    isCapturing: true,
    frameCount: 0,
    startTime: new Date(),
    captureDir: sessionDir,
    interval,
    intervalId: null,
  };

  // 스크린샷 캡처 함수
  const captureScreen = async () => {
    if (!captureSession.isCapturing) return;

    try {
      // 스크린 캡처 소스 가져오기
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
      });

      // 첫 번째 화면 (주 화면) 선택
      const mainSource = sources[0];
      if (!mainSource) {
        console.error("화면 소스를 찾을 수 없습니다.");
        return;
      }

      // 프레임 번호 (4자리 숫자, 앞에 0 채움)
      const frameNumber = String(captureSession.frameCount + 1).padStart(
        4,
        "0"
      );

      // 이미지 저장 경로
      const imagePath = path.join(
        captureSession.captureDir,
        `${frameNumber}.png`
      );

      // 썸네일 저장
      fs.writeFileSync(imagePath, mainSource.thumbnail.toPNG());

      // 프레임 카운트 증가
      captureSession.frameCount++;

      // 경과 시간 계산 (초)
      const duration = Math.floor(
        (new Date() - captureSession.startTime) / 1000
      );

      // 캡처 상태 이벤트 전송
      event.sender.send("capture-status", {
        isCapturing: true,
        frameCount: captureSession.frameCount,
        duration,
      });
    } catch (error) {
      console.error("스크린샷 캡처 오류:", error);
    }
  };

  // 첫 번째 캡처 실행
  captureScreen();

  // 정해진 간격으로 캡처 실행
  captureSession.intervalId = setInterval(captureScreen, interval * 1000);

  // 캡처 시작 상태 전송
  console.log("Main 프로세스: 캡처 시작 상태 전송");
  event.sender.send("capture-status", {
    isCapturing: true,
    frameCount: captureSession.frameCount,
    duration: 0,
  });
});

// 스크린샷 캡처 중지
ipcMain.on("stop-capture", (event) => {
  console.log("Main 프로세스: stop-capture 이벤트 수신");
  if (!captureSession.isCapturing) {
    console.log("Main 프로세스: 캡처 중인 세션 없음");
    return;
  }

  // 인터벌 타이머 중지
  if (captureSession.intervalId) {
    clearInterval(captureSession.intervalId);
  }

  // 캡처 중지 상태 설정
  captureSession.isCapturing = false;

  // 경과 시간 계산 (초)
  const duration = Math.floor((new Date() - captureSession.startTime) / 1000);

  // 캡처 중지 상태 이벤트 전송
  console.log("Main 프로세스: 캡처 중지 상태 전송");
  event.sender.send("capture-status", {
    isCapturing: false,
    frameCount: captureSession.frameCount,
    duration,
  });
});

// 타임랩스 생성
ipcMain.on("generate-timelapse", (event, options) => {
  console.log("Main 프로세스: generate-timelapse 이벤트 수신", options);
  if (captureSession.frameCount === 0) {
    console.log("Main 프로세스: 캡처된 프레임이 없음");
    event.sender.send("generate-timelapse-response", {
      error: "캡처된 프레임이 없습니다.",
    });
    return;
  }

  const sessionTimestamp = new Date().toISOString().replace(/:/g, "-");
  const outputFilename = `timelapse_${sessionTimestamp}`;
  const outputDir = path.join(os.homedir(), "Documents", "담비", "timelapses");
  let outputPath;

  // 품질 설정에 따른 비트레이트
  let videoBitrate;
  switch (options.outputQuality) {
    case "low":
      videoBitrate = "1000k";
      break;
    case "medium":
      videoBitrate = "2500k";
      break;
    case "high":
      videoBitrate = "5000k";
      break;
    default:
      videoBitrate = "2500k";
  }

  try {
    let command = ffmpeg();

    // 이미지 시퀀스 입력
    command = command
      .input(path.join(captureSession.captureDir, "%04d.png"))
      .inputFPS(1) // 이미지 캡처 속도 (초당)
      .outputFPS(options.fps || 30);

    if (options.outputFormat === "mp4") {
      outputPath = path.join(outputDir, `${outputFilename}.mp4`);

      command = command
        .output(outputPath)
        .videoCodec("libx264")
        .videoBitrate(videoBitrate)
        .format("mp4")
        .outputOptions([
          "-pix_fmt yuv420p",
          "-preset faster",
          "-movflags +faststart",
        ]);
    } else {
      outputPath = path.join(outputDir, `${outputFilename}.gif`);

      command = command
        .output(outputPath)
        .format("gif")
        .size("640x?") // GIF 크기 제한 (너비 640px, 비율 유지)
        .outputOptions([
          "-vf scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        ]);
    }

    // 진행 상황 콜백 (React로 진행 상황 전송 가능)
    command.on("progress", (progress) => {
      console.log(`타임랩스 생성 진행률: ${Math.floor(progress.percent)}%`);
    });

    // 완료 콜백
    command.on("end", () => {
      console.log("타임랩스 생성 완료:", outputPath);
      event.sender.send("generate-timelapse-response", {
        outputPath,
      });
    });

    // 오류 콜백
    command.on("error", (err) => {
      console.error("타임랩스 생성 오류:", err);
      event.sender.send("generate-timelapse-response", {
        error: `타임랩스 생성 중 오류가 발생했습니다: ${err.message}`,
      });
    });

    // FFmpeg 실행
    command.run();
  } catch (error) {
    console.error("타임랩스 생성 실패:", error);
    event.sender.send("generate-timelapse-response", {
      error: `타임랩스 생성 중 오류가 발생했습니다: ${error.message}`,
    });
  }
});
