const { desktopCapturer, screen } = require("electron");
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

      // 실제 화면 해상도 가져오기
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: displayWidth, height: displayHeight } =
        primaryDisplay.workAreaSize;
      console.log(`실제 화면 해상도: ${displayWidth}x${displayHeight}`);

      // 썸네일 크기를 화면 비율에 맞게 설정
      const thumbnailWidth = Math.floor(displayWidth / 4);
      const thumbnailHeight = Math.floor(displayHeight / 4);

      // 1. 화면 정보 가져오기 - 전체 화면
      const screenSources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: thumbnailWidth, height: thumbnailHeight },
      });

      // 2. 창 정보 가져오기 - 개별 창
      const windowSources = await desktopCapturer.getSources({
        types: ["window"],
        thumbnailSize: { width: thumbnailWidth, height: thumbnailHeight },
        fetchWindowIcons: true,
      });

      console.log(
        `전체 화면 소스 개수: ${screenSources.length}, 창 소스 개수: ${windowSources.length}`
      );

      // 결과 목록 준비 - 전체 화면은 항상 첫 번째로 추가
      const resultWindows = [];

      // 전체 화면 항목 추가
      if (screenSources.length > 0) {
        resultWindows.push({
          id: "screen:0",
          name: "전체 화면",
          thumbnail: screenSources[0].thumbnail,
          appIcon: null,
          isScreen: true,
          width: displayWidth,
          height: displayHeight,
        });

        console.log(`전체 화면이 추가됨 (${displayWidth}x${displayHeight})`);
      }

      // 로그에 모든 창 정보 출력
      console.log("===== 검색된 모든 창 목록 =====");
      windowSources.forEach((source, index) => {
        const hasThumbnail = source.thumbnail && !source.thumbnail.isEmpty();
        const thumbSize = hasThumbnail
          ? source.thumbnail.getSize()
          : { width: 0, height: 0 };
        console.log(
          `${index}: ${source.id} - "${source.name}" - 썸네일: ${
            hasThumbnail ? `${thumbSize.width}x${thumbSize.height}` : "없음"
          }`
        );
      });
      console.log("======================");

      // 가상 앱 이름 (실제로 앱이 실행 중이어야만 해당 앱으로 간주)
      const virtualAppNames = ["Firefox", "Photoshop", "Premiere Pro", "Edge"];

      // 처리된 창 ID와 이름 추적
      const processedWindowIds = new Set();

      // 실행 중인 앱 추적
      const runningApps = new Set();

      // 실행 중인 가상 앱 추적 (초기에는 모든 가상 앱이 실행 중이지 않다고 가정)
      const virtualAppsRunning = new Set();

      // 창 ID로 창 매핑 - 중복 검사를 위해
      const windowsByName = new Map();

      // 우선 모든 창을 검증하고 실제 앱만 추적
      console.log("모든 창 실행 여부 검증 시작");
      windowSources.forEach((source) => {
        // 유효한 창만 처리 (이름과 썸네일이 있는 창)
        if (
          source.name &&
          source.name.trim() !== "" &&
          source.thumbnail &&
          !source.thumbnail.isEmpty()
        ) {
          const sourceName = source.name.toLowerCase();
          const appName = sourceName.split(" ")[0]; // 앱 이름은 보통 첫 단어

          // 썸네일 크기 확인
          const thumbSize = source.thumbnail.getSize();
          // 실제 창으로 간주할 수 있는 조건
          if (thumbSize.width >= 20 && thumbSize.height >= 20) {
            // 이름으로 창 추적 (중복 확인용)
            if (!windowsByName.has(sourceName)) {
              windowsByName.set(sourceName, source);
            }

            // 앱 이름 추적
            runningApps.add(appName);

            // 가상 앱 이름이 포함된 경우, 해당 가상 앱을 실행 중으로 표시
            virtualAppNames.forEach((vApp) => {
              const vAppLower = vApp.toLowerCase();
              // 가상 앱 이름이 창 이름에 정확히 포함되어 있는지 확인
              if (
                sourceName === vAppLower ||
                sourceName.startsWith(vAppLower + " ") ||
                // 정확한 이름이 창 제목에 포함된 경우 (예: "Mozilla Firefox")
                sourceName.includes(` ${vAppLower}`) ||
                sourceName.includes(`${vAppLower} `)
              ) {
                console.log(`실행 중인 가상 앱 감지: ${vApp} (${sourceName})`);
                virtualAppsRunning.add(vAppLower);
              }
            });
          }
        }
      });

      console.log("실행 중인 앱 목록:", Array.from(runningApps).join(", "));
      console.log(
        "실행 중인 가상 앱 목록:",
        Array.from(virtualAppsRunning).join(", ")
      );

      // 필터링할 창 이름 (항상 제외할 창)
      const alwaysExcludePatterns = [
        "담비", // 자체 앱 제외
        "program manager", // 시스템 창 제외
        "window host",
        "mediaoutput",
        "task manager",
        "settings",
        "control panel",
        "dialog", // 시스템 대화상자 제외
        "microsoft",
        "windows",
        "시작", // Windows 11의 시작 메뉴
        "search", // 검색
      ];

      // 활성 창만 추가 (매우 엄격한 필터링)
      windowSources.forEach((source) => {
        const sourceName = source.name.toLowerCase();

        // 중복 방지
        if (processedWindowIds.has(source.id)) {
          console.log(`중복 ID 건너뜀: ${source.id} - ${source.name}`);
          return;
        }

        // 빈 이름 제외
        if (!source.name || source.name.trim() === "") {
          console.log(`빈 이름 건너뜀: ${source.id}`);
          return;
        }

        // 항상 제외할 창 필터링
        const shouldExclude = alwaysExcludePatterns.some((pattern) => {
          const isMatch = sourceName.includes(pattern);
          if (isMatch) {
            console.log(`'${source.name}'에 시스템 패턴 '${pattern}' 매치됨`);
          }
          return isMatch;
        });

        if (shouldExclude) {
          console.log(
            `시스템 패턴 매치로 건너뜀: ${source.id} - ${source.name}`
          );
          return;
        }

        // 가상 앱 필터링 - 매우 엄격하게
        const matchingVirtualApp = virtualAppNames.find((vApp) =>
          sourceName.includes(vApp.toLowerCase())
        );

        if (matchingVirtualApp) {
          const vAppLower = matchingVirtualApp.toLowerCase();

          // 실행 중인 가상 앱 목록에 없으면 제외
          if (!virtualAppsRunning.has(vAppLower)) {
            console.log(
              `가상 앱 ${matchingVirtualApp}가 실행 중이지 않음, 건너뜀: ${source.name}`
            );
            return;
          }

          // 추가적인 확인 - 이름이 정확히 일치하거나 앱 이름으로 시작하는지
          const isExactMatch =
            sourceName === vAppLower ||
            sourceName.startsWith(vAppLower + " ") ||
            sourceName.includes(` ${vAppLower}`) ||
            sourceName.includes(`${vAppLower} `);

          if (!isExactMatch) {
            console.log(
              `가상 앱 이름이 정확히 일치하지 않음, 건너뜀: ${source.name}`
            );
            return;
          }
        }

        // 유효한 썸네일 있는지 확인 (필수)
        if (!source.thumbnail || source.thumbnail.isEmpty()) {
          console.log(`썸네일 없음 건너뜀: ${source.id} - ${source.name}`);
          return;
        }

        // 썸네일 크기가 합리적인지 확인
        const thumbSize = source.thumbnail.getSize();
        if (thumbSize.width < 20 || thumbSize.height < 20) {
          console.log(
            `너무 작은 썸네일 건너뜀: ${source.id} - ${source.name} (${thumbSize.width}x${thumbSize.height})`
          );
          return;
        }

        // 실행 중인 창으로 간주하고 추가
        processedWindowIds.add(source.id);

        // 창 크기 계산 - 썸네일 비율 기반으로 실제 창 크기 추정
        let windowWidth = Math.round(thumbSize.width * 4); // 썸네일은 실제 크기의 약 1/4
        let windowHeight = Math.round(thumbSize.height * 4);

        // 비율이 너무 작으면 기본 해상도로 설정
        if (windowWidth < 640 || windowHeight < 480) {
          windowWidth = 1280;
          windowHeight = 720;
        }

        // 최종 추가 정보 로그
        console.log(
          `활성 창 추가: ${source.id} - ${source.name} (${windowWidth}x${windowHeight})`
        );

        // 창 정보 추가
        resultWindows.push({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail,
          appIcon: source.appIcon,
          isScreen: false,
          width: windowWidth,
          height: windowHeight,
        });
      });

      // 최종 결과 로깅
      console.log(`최종 처리된 창 목록 개수: ${resultWindows.length}`);
      console.log("===== 최종 캡처 가능 창 목록 =====");
      resultWindows.forEach((win, idx) => {
        console.log(
          `${idx}: ${win.id} - ${win.name} - 크기: ${win.width}x${win.height}`
        );
      });
      console.log("==========================");

      resolve(resultWindows);
    } catch (error) {
      console.error("창 목록 가져오기 오류:", error);

      // 오류 발생 시 기본 목록 제공 - 전체 화면만
      try {
        // 실제 화면 해상도 가져오기 (오류 처리 내부에서도)
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;

        const fallbackWindows = [
          {
            id: "screen:0",
            name: "전체 화면",
            thumbnail: null,
            appIcon: null,
            isScreen: true,
            width: width,
            height: height,
          },
        ];
        resolve(fallbackWindows);
      } catch (innerError) {
        console.error("화면 정보 가져오기 오류:", innerError);
        // 최후의 수단으로 기본 해상도 설정
        const fallbackWindows = [
          {
            id: "screen:0",
            name: "전체 화면",
            thumbnail: null,
            appIcon: null,
            isScreen: true,
            width: 1920,
            height: 1080,
          },
        ];
        resolve(fallbackWindows);
      }
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
          console.log(
            "창 해상도:",
            targetWindow.width,
            "x",
            targetWindow.height
          );
        } else {
          console.log("대상 창을 찾을 수 없음, 전체 화면 녹화로 진행");
          // 전체 화면으로 대체
          targetWindow = windows.find((win) => win.isScreen);
        }
      } else {
        // 전체 화면 선택 시 해당 크기 가져오기
        targetWindow = windows.find((win) => win.isScreen);
        console.log(
          "전체 화면 해상도:",
          targetWindow?.width,
          "x",
          targetWindow?.height
        );
      }

      // FFmpeg 명령어 옵션 설정
      let ffmpegOptions = [];

      if (process.platform === "win32") {
        // Windows 환경
        if (targetWindow && !targetWindow.isScreen) {
          // 개별 창 녹화
          let windowTitle = targetWindow.name;
          console.log("녹화할 창 제목:", windowTitle);

          // 창 크기 가져오기 (기본값 설정)
          const videoWidth = targetWindow.width || 1280;
          const videoHeight = targetWindow.height || 720;

          // 창 제목으로 녹화 (gdigrab) - 안정성 개선 설정 및 해상도 동적 적용
          ffmpegOptions = [
            "-hide_banner",
            "-loglevel",
            "info",
            "-f",
            "gdigrab",
            "-framerate",
            "20",
            "-draw_mouse",
            "1",
            "-offset_x",
            "0",
            "-offset_y",
            "0",
            "-video_size",
            `${videoWidth}x${videoHeight}`,
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

          // 전체 화면 해상도 가져오기 (기본값 설정)
          const videoWidth = targetWindow?.width || 1920;
          const videoHeight = targetWindow?.height || 1080;

          ffmpegOptions = [
            "-hide_banner",
            "-loglevel",
            "info",
            "-f",
            "gdigrab",
            "-framerate",
            "20",
            "-draw_mouse",
            "1",
            "-offset_x",
            "0",
            "-offset_y",
            "0",
            "-video_size",
            `${videoWidth}x${videoHeight}`,
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

        // macOS에서도 해상도 적용
        const videoWidth = targetWindow?.width || 1920;
        const videoHeight = targetWindow?.height || 1080;

        ffmpegOptions = [
          "-hide_banner",
          "-loglevel",
          "info",
          "-f",
          "avfoundation",
          "-framerate",
          "20",
          "-probesize",
          "10M",
          "-video_size",
          `${videoWidth}x${videoHeight}`,
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

        // Linux에서도 해상도 적용
        const videoWidth = targetWindow?.width || 1920;
        const videoHeight = targetWindow?.height || 1080;

        ffmpegOptions = [
          "-hide_banner",
          "-loglevel",
          "info",
          "-f",
          "x11grab",
          "-framerate",
          "20",
          "-probesize",
          "10M",
          "-video_size",
          `${videoWidth}x${videoHeight}`,
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
