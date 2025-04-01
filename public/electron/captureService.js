const { desktopCapturer } = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const os = require("os");
const spawn = require("cross-spawn");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");

// FFmpeg 경로 설정
const ffmpegPath = ffmpegInstaller.path;
console.log("FFmpeg 실행 파일 경로:", ffmpegPath);

// 캡처 세션 상태
let captureSession = {
  isCapturing: false,
  frameCount: 0,
  startTime: null,
  captureDir: null,
  interval: 15,
  intervalId: null,
  ffmpegProcess: null,
  videoPath: null,
  targetApplication: null,
  durationInterval: null,
};

// 현재 실행 중인 창 목록 가져오기
async function getActiveWindows() {
  return new Promise(async (resolve) => {
    try {
      console.log("데스크탑 캡처러 API 호출 시작");

      // 창 정보와 썸네일을 각각 별도로 수집하여 중복 방지
      // 1. 화면 정보 가져오기 - 전체 화면
      const screenSources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 500, height: 500 },
      });

      // 2. 창 정보 가져오기 - 개별 창
      const windowSources = await desktopCapturer.getSources({
        types: ["window"],
        thumbnailSize: { width: 500, height: 500 },
        fetchWindowIcons: true,
      });

      console.log(
        `전체 화면 소스 개수: ${screenSources.length}, 창 소스 개수: ${windowSources.length}`
      );

      // 결과 목록 준비
      const resultWindows = [];

      // 전체 화면 항목 추가
      if (screenSources.length > 0) {
        resultWindows.push({
          id: "screen:0",
          name: "전체 화면",
          thumbnail: screenSources[0].thumbnail,
          appIcon: null,
          isScreen: true,
        });

        console.log("전체 화면이 추가됨");
      }

      // 고유한 창 목록 처리
      const processedWindowIds = new Set();

      // 각 창 처리
      windowSources.forEach((source) => {
        // 이미 처리한 ID 건너뛰기
        if (processedWindowIds.has(source.id)) return;

        // 빈 이름 또는 시스템 창 제외
        if (
          !source.name ||
          source.name.trim() === "" ||
          source.name.includes("MediaOutput") ||
          source.name === "Electron"
        )
          return;

        // 처리한 ID 기록
        processedWindowIds.add(source.id);

        console.log(`창 추가: ${source.id} - ${source.name}`);

        // 창 정보 추가
        resultWindows.push({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail,
          appIcon: source.appIcon,
          isScreen: false,
        });
      });

      // 고정 창 목록 (항상 표시할 앱 목록)
      const predefinedApps = [
        { id: "window:chrome", name: "Chrome", appName: "chrome" },
        { id: "window:edge", name: "Edge", appName: "edge" },
        { id: "window:firefox", name: "Firefox", appName: "firefox" },
        { id: "window:premiere", name: "Premiere Pro", appName: "premiere" },
        { id: "window:photoshop", name: "Photoshop", appName: "photoshop" },
      ];

      // 현재 목록에 없는 앱만 추가
      const existingAppNames = resultWindows.map((w) => w.name.toLowerCase());

      predefinedApps.forEach((app) => {
        // 이미 유사한 이름이 목록에 있으면 건너뛰기
        if (
          existingAppNames.some(
            (name) =>
              name.toLowerCase().includes(app.appName) ||
              app.name.toLowerCase().includes(name)
          )
        ) {
          return;
        }

        // 앱 추가
        resultWindows.push({
          id: app.id,
          name: app.name,
          thumbnail: null,
          appIcon: null,
          isScreen: false,
        });
      });

      // 정렬: 전체 화면이 첫 번째, 나머지는 이름 순
      const sortedWindows = resultWindows.sort((a, b) => {
        if (a.isScreen) return -1;
        if (b.isScreen) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log(`최종 처리된 창 목록 개수: ${sortedWindows.length}`);
      resolve(sortedWindows);
    } catch (error) {
      console.error("창 목록 가져오기 오류:", error);

      // 오류 발생 시 기본 목록 제공
      const fallbackWindows = [
        {
          id: "screen:0",
          name: "전체 화면",
          thumbnail: null,
          appIcon: null,
          isScreen: true,
        },
        {
          id: "window:chrome",
          name: "Chrome",
          thumbnail: null,
          appIcon: null,
          isScreen: false,
        },
        {
          id: "window:edge",
          name: "Edge",
          thumbnail: null,
          appIcon: null,
          isScreen: false,
        },
        {
          id: "window:premiere",
          name: "Premiere Pro",
          thumbnail: null,
          appIcon: null,
          isScreen: false,
        },
        {
          id: "window:figma",
          name: "Figma",
          thumbnail: null,
          appIcon: null,
          isScreen: false,
        },
      ];

      resolve(fallbackWindows);
    }
  });
}

// 스크린샷 캡처 시작
function startCapture(event, args) {
  console.log("Main 프로세스: start-capture 이벤트 수신", args);
  const targetWindowId = args.windowId || "screen:0";
  console.log("캡처 대상 창 ID:", targetWindowId);

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
  console.log("비디오 저장 경로:", videoPath);

  captureSession = {
    isCapturing: true,
    startTime: new Date(),
    videoPath: videoPath,
    ffmpegProcess: null,
    targetWindowId: targetWindowId,
  };

  try {
    // 녹화할 창 정보 가져오기
    getActiveWindows().then((windows) => {
      let targetWindow = null;

      if (targetWindowId !== "screen:0") {
        targetWindow = windows.find((win) => win.id === targetWindowId);

        if (targetWindow) {
          console.log("녹화할 창 찾음:", targetWindow.name);
        } else {
          console.log("대상 창을 찾을 수 없음, 전체 화면 녹화로 진행");
        }
      }

      // FFmpeg 명령어 옵션 설정
      let ffmpegOptions = [];

      if (process.platform === "win32") {
        // Windows 환경
        if (targetWindow && targetWindowId !== "screen:0") {
          // 하드코딩된 앱 명칭 기준으로 창 찾기 (fallback 대응)
          let windowTitle = targetWindow.name;

          // 일반적인 앱 창 명칭 처리
          if (targetWindowId.includes("cursor")) {
            windowTitle = "Cursor";
          } else if (targetWindowId.includes("premiere")) {
            windowTitle = "Adobe Premiere Pro";
          } else if (targetWindowId.includes("photoshop")) {
            windowTitle = "Adobe Photoshop";
          }

          console.log("녹화할 창 제목:", windowTitle);

          // 창 제목으로 녹화 (gdigrab) - 안정성 개선 설정
          ffmpegOptions = [
            "-hide_banner",
            "-loglevel",
            "info",
            "-f",
            "gdigrab",
            "-framerate",
            "15",
            "-draw_mouse",
            "1",
            "-offset_x",
            "0",
            "-offset_y",
            "0",
            "-video_size",
            "1920x1080",
            "-probesize",
            "10M",
            "-analyzeduration",
            "10M",
            "-i",
            `title=${windowTitle}`,
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-tune",
            "zerolatency",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-g",
            "30",
            "-keyint_min",
            "15",
            videoPath,
          ];
        } else {
          // 전체 화면 녹화 - 안정성 개선 설정
          console.log("전체 화면 녹화 설정");
          ffmpegOptions = [
            "-hide_banner",
            "-loglevel",
            "info",
            "-f",
            "gdigrab",
            "-framerate",
            "15",
            "-draw_mouse",
            "1",
            "-offset_x",
            "0",
            "-offset_y",
            "0",
            "-video_size",
            "1920x1080",
            "-probesize",
            "10M",
            "-analyzeduration",
            "10M",
            "-i",
            "desktop",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-tune",
            "zerolatency",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-g",
            "30",
            "-keyint_min",
            "15",
            videoPath,
          ];
        }
      } else if (process.platform === "darwin") {
        // macOS용 명령어 (AVFoundation)
        console.log("macOS 녹화 설정");
        ffmpegOptions = [
          "-hide_banner",
          "-loglevel",
          "info",
          "-f",
          "avfoundation",
          "-framerate",
          "15",
          "-probesize",
          "10M",
          "-i",
          "1:0", // 화면:오디오 (오디오 없음)
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-tune",
          "zerolatency",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          videoPath,
        ];
      } else {
        // Linux용 명령어 (x11grab)
        console.log("Linux 녹화 설정");
        ffmpegOptions = [
          "-hide_banner",
          "-loglevel",
          "info",
          "-f",
          "x11grab",
          "-framerate",
          "15",
          "-probesize",
          "10M",
          "-i",
          ":0.0",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-tune",
          "zerolatency",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          videoPath,
        ];
      }

      // FFmpeg 명령어 로깅
      console.log("실행할 FFmpeg 명령어:", "ffmpeg", ffmpegOptions.join(" "));

      // FFmpeg로 화면 녹화 시작
      const ffmpegProcess = spawn(ffmpegPath, ffmpegOptions);

      captureSession.ffmpegProcess = ffmpegProcess;

      ffmpegProcess.stderr.on("data", (data) => {
        const logData = data.toString();
        console.log(
          "FFmpeg 로그:",
          logData.substring(0, 150) + (logData.length > 150 ? "..." : "")
        );
      });

      ffmpegProcess.on("error", (error) => {
        console.error("FFmpeg 실행 오류:", error);
        event.sender.send("capture-status", {
          isCapturing: false,
          duration: 0,
          error: error.message,
        });
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
    });
  } catch (error) {
    console.error("화면 녹화 시작 오류:", error);
    event.sender.send("capture-status", {
      isCapturing: false,
      duration: 0,
      error: error.message,
    });
  }
}

// 스크린샷 캡처 중지
function stopCapture(event) {
  console.log("Main 프로세스: stop-capture 이벤트 수신");
  if (!captureSession.isCapturing) {
    console.log("Main 프로세스: 캡처 중인 세션 없음");
    return;
  }

  // 캡처 비디오 파일 경로 저장
  const videoPath = captureSession.videoPath;

  // FFmpeg 프로세스 종료 (녹화 중지)
  if (captureSession.ffmpegProcess) {
    try {
      console.log("FFmpeg 프로세스 종료 시작...");

      // 안전하게 종료하기 위해 q 명령어 전송 시도
      if (
        captureSession.ffmpegProcess.stdin &&
        !captureSession.ffmpegProcess.stdin.destroyed
      ) {
        captureSession.ffmpegProcess.stdin.setEncoding("utf-8");
        captureSession.ffmpegProcess.stdin.write("q\n");
        console.log("FFmpeg 프로세스에 q 명령 전송됨");
      } else {
        console.log("FFmpeg stdin이 사용 불가능하여 시그널로 종료 시도");
      }

      // 3초 후에도 종료되지 않으면 SIGTERM 시그널 보내기
      const killTimeout = setTimeout(() => {
        try {
          if (captureSession.ffmpegProcess) {
            console.log(
              "FFmpeg 프로세스가 여전히 실행 중, SIGTERM 시그널 전송"
            );
            captureSession.ffmpegProcess.kill("SIGTERM");

            // 추가 3초 후에도 종료되지 않으면 SIGKILL로 강제 종료
            setTimeout(() => {
              try {
                if (captureSession.ffmpegProcess) {
                  console.log(
                    "FFmpeg 프로세스가 여전히 종료되지 않음, SIGKILL로 강제 종료"
                  );
                  captureSession.ffmpegProcess.kill("SIGKILL");
                }
              } catch (e) {
                console.error("FFmpeg 강제 종료 시 오류:", e);
              }
            }, 3000);
          }
        } catch (e) {
          console.error("FFmpeg SIGTERM 전송 시 오류:", e);
        }
      }, 3000);

      // 프로세스가 종료되면 타임아웃 취소
      captureSession.ffmpegProcess.on("close", (code) => {
        clearTimeout(killTimeout);
        console.log(`FFmpeg 프로세스가 코드 ${code}로 종료됨`);

        // 녹화 파일 검증
        validateCaptureFile(videoPath);
      });
    } catch (e) {
      console.error("FFmpeg 종료 명령 중 오류:", e);
    }
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
}

// 녹화 파일 검증 함수
function validateCaptureFile(videoPath) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    console.error("검증할 비디오 파일이 존재하지 않습니다:", videoPath);
    return false;
  }

  try {
    // 파일 크기 확인
    const stats = fs.statSync(videoPath);
    console.log(`녹화 완료된 비디오 파일 크기: ${stats.size} 바이트`);

    if (stats.size < 10000) {
      // 10KB 미만은 너무 작은 파일
      console.error(
        "녹화된 비디오 파일이 너무 작습니다. 손상되었을 가능성이 높습니다."
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("비디오 파일 검증 오류:", err);
    return false;
  }
}

module.exports = {
  getActiveWindows,
  startCapture,
  stopCapture,
  getCaptureSession: () => captureSession,
};
