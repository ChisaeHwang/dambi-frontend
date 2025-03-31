const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const fs = require("fs");
const os = require("os");
const { desktopCapturer } = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { spawn, exec } = require("child_process");

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
  ffmpegProcess: null,
  videoPath: null,
  targetApplication: null,
  durationInterval: null,
};

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
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

// 창 제어 이벤트 처리
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

ipcMain.on("window:is-maximized", (event) => {
  if (mainWindow) {
    event.sender.send("window:is-maximized-response", mainWindow.isMaximized());
  } else {
    event.sender.send("window:is-maximized-response", false);
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

// 현재 실행 중인 창 목록 가져오기
async function getActiveWindows() {
  return new Promise(async (resolve) => {
    try {
      // 데스크탑 캡처러를 사용하여 화면 소스 목록 가져오기
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 150, height: 150 },
      });

      // 전체 화면 항목 추가
      const windows = [
        {
          id: "screen:0",
          name: "전체 화면",
          thumbnail: sources.find((s) => s.id.includes("screen:0"))?.thumbnail,
        },
      ];

      // 개별 창 항목 추가
      const windowSources = sources.filter((source) =>
        source.id.includes("window")
      );

      // 창 목록을 처리하여 중복 없이 정렬
      const windowsList = windowSources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail,
      }));

      // 결과 반환
      resolve([...windows, ...windowsList]);
    } catch (error) {
      console.error("창 목록 가져오기 오류:", error);
      resolve([{ id: "screen:0", name: "전체 화면", thumbnail: null }]);
    }
  });
}

// IPC 핸들러 추가: 실행 중인 창 목록 요청
ipcMain.handle("get-active-windows", async () => {
  const windows = await getActiveWindows();
  return windows;
});

// 스크린샷 캡처 시작
ipcMain.on("start-capture", async (event, args) => {
  console.log("Main 프로세스: start-capture 이벤트 수신", args);
  const targetWindowId = args.windowId || "screen:0";

  // 이미 캡처 중이면 중지
  if (captureSession.isCapturing) {
    console.log("Main 프로세스: 이미 캡처 중. 기존 녹화 중지");
    if (captureSession.ffmpegProcess) {
      captureSession.ffmpegProcess.kill();
    }
  }

  // 새 캡처 세션 초기화
  const sessionTimestamp = new Date().toISOString().replace(/:/g, "-");
  const sessionDir = path.join(os.homedir(), "Documents", "담비", "captures");

  // 디렉토리 생성
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // 비디오 파일 경로
  const videoPath = path.join(sessionDir, `session_${sessionTimestamp}.mp4`);

  captureSession = {
    isCapturing: true,
    startTime: new Date(),
    videoPath: videoPath,
    ffmpegProcess: null,
    targetWindowId: targetWindowId,
  };

  // FFmpeg 명령어 옵션 설정
  let ffmpegOptions = [];

  if (process.platform === "win32") {
    if (targetWindowId.includes("window:")) {
      // 특정 창 녹화를 위한 정보 가져오기
      const windows = await getActiveWindows();
      const targetWindow = windows.find((win) => win.id === targetWindowId);

      if (targetWindow) {
        // 창 제목으로 녹화 (gdigrab)
        ffmpegOptions = [
          "-f",
          "gdigrab",
          "-framerate",
          "15",
          "-i",
          `title=${targetWindow.name}`,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "28",
          "-pix_fmt",
          "yuv420p",
          videoPath,
        ];
      } else {
        // 전체 화면 녹화로 대체
        ffmpegOptions = [
          "-f",
          "gdigrab",
          "-framerate",
          "15",
          "-i",
          "desktop",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-crf",
          "28",
          "-pix_fmt",
          "yuv420p",
          videoPath,
        ];
      }
    } else {
      // 전체 화면 녹화
      ffmpegOptions = [
        "-f",
        "gdigrab",
        "-framerate",
        "15",
        "-i",
        "desktop",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        videoPath,
      ];
    }
  } else if (process.platform === "darwin") {
    // macOS용 명령어 (AVFoundation)
    ffmpegOptions = [
      "-f",
      "avfoundation",
      "-framerate",
      "15",
      "-i",
      "1:0", // 화면:오디오 (오디오 없음)
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ];
  } else {
    // Linux용 명령어 (x11grab)
    ffmpegOptions = [
      "-f",
      "x11grab",
      "-framerate",
      "15",
      "-i",
      ":0.0",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ];
  }

  try {
    // FFmpeg로 화면 녹화 시작
    const ffmpegProcess = spawn("ffmpeg", ffmpegOptions);

    captureSession.ffmpegProcess = ffmpegProcess;

    ffmpegProcess.stderr.on("data", (data) => {
      console.log("FFmpeg 로그:", data.toString());
    });

    ffmpegProcess.on("close", (code) => {
      console.log(`FFmpeg 프로세스 종료, 코드: ${code}`);
    });

    // 정기적으로 녹화 진행 시간 업데이트
    const durationInterval = setInterval(() => {
      if (!captureSession.isCapturing) {
        clearInterval(durationInterval);
        return;
      }

      // 경과 시간 계산 (초)
      const duration = Math.floor(
        (new Date() - captureSession.startTime) / 1000
      );

      event.sender.send("capture-status", {
        isCapturing: true,
        duration,
      });
    }, 1000);

    captureSession.durationInterval = durationInterval;

    // 캡처 시작 상태 전송
    console.log("Main 프로세스: 캡처 시작 상태 전송");
    event.sender.send("capture-status", {
      isCapturing: true,
      duration: 0,
    });
  } catch (error) {
    console.error("화면 녹화 시작 오류:", error);
    event.sender.send("capture-status", {
      isCapturing: false,
      duration: 0,
      error: error.message,
    });
  }
});

// 스크린샷 캡처 중지
ipcMain.on("stop-capture", (event) => {
  console.log("Main 프로세스: stop-capture 이벤트 수신");
  if (!captureSession.isCapturing) {
    console.log("Main 프로세스: 캡처 중인 세션 없음");
    return;
  }

  // FFmpeg 프로세스 종료 (녹화 중지)
  if (captureSession.ffmpegProcess) {
    // SIGINT 시그널 보내기
    captureSession.ffmpegProcess.stdin.write("q");
    captureSession.ffmpegProcess.kill("SIGINT");
  }

  // 인터벌 타이머 중지
  if (captureSession.durationInterval) {
    clearInterval(captureSession.durationInterval);
  }

  // 캡처 중지 상태 설정
  captureSession.isCapturing = false;

  // 경과 시간 계산 (초)
  const duration = Math.floor((new Date() - captureSession.startTime) / 1000);

  // 캡처 중지 상태 이벤트 전송
  console.log("Main 프로세스: 캡처 중지 상태 전송");
  event.sender.send("capture-status", {
    isCapturing: false,
    duration,
  });
});

// 타임랩스 생성
ipcMain.on("generate-timelapse", (event, options) => {
  console.log("Main 프로세스: generate-timelapse 이벤트 수신", options);
  if (!captureSession.videoPath || !fs.existsSync(captureSession.videoPath)) {
    console.log("Main 프로세스: 녹화된 영상이 없음");
    event.sender.send("generate-timelapse-response", {
      error: "녹화된 영상이 없습니다.",
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

    // 녹화 영상 입력
    command = command.input(captureSession.videoPath);

    // 속도 조절 필터 (배속)
    const speedFactor = options.speedFactor || 3;

    if (options.outputFormat === "mp4") {
      outputPath = path.join(outputDir, `${outputFilename}.mp4`);

      command = command
        .output(outputPath)
        .videoCodec("libx264")
        .videoBitrate(videoBitrate)
        .format("mp4")
        .videoFilters([
          `setpts=PTS/${speedFactor}`, // 영상 속도 조절
          "pix_fmt=yuv420p",
        ])
        .outputOptions(["-preset faster", "-movflags +faststart"]);
    } else {
      outputPath = path.join(outputDir, `${outputFilename}.gif`);

      command = command
        .output(outputPath)
        .format("gif")
        .size("640x?") // GIF 크기 제한 (너비 640px, 비율 유지)
        .videoFilters([
          `setpts=PTS/${speedFactor}`, // 영상 속도 조절
          "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
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
