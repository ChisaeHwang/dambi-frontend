const windowManager = require("./services/windowManager");
const ffmpegManager = require("./services/ffmpegManager");
const sessionManager = require("./services/captureSessionManager");

/**
 * 활성 창 목록 가져오기
 * @returns {Promise<Array>} 활성 창 목록
 */
async function getActiveWindows() {
  return await windowManager.getActiveWindows();
}

/**
 * 스크린샷 캡처 시작
 * @param {Object} event IPC 이벤트 객체
 * @param {Object} args 캡처 설정 (windowId 등)
 */
function startCapture(event, args) {
  console.log("Main 프로세스: start-capture 이벤트 수신", args);
  const targetWindowId = args.windowId || "screen:0";
  console.log("캡처 대상 창 ID:", targetWindowId);

  // 이미 캡처 중이면 중지
  const currentSession = sessionManager.getCaptureSession();
  if (currentSession.isCapturing) {
    console.log("Main 프로세스: 이미 캡처 중. 기존 녹화 중지");
    if (currentSession.ffmpegProcess) {
      currentSession.ffmpegProcess.kill();
    }
  }

  // 새 캡처 세션 초기화
  const sessionInfo = sessionManager.initCaptureSession(targetWindowId);

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
      const ffmpegOptions = ffmpegManager.createFFmpegOptions(
        targetWindow,
        sessionInfo.videoPath
      );

      // FFmpeg 프로세스 시작
      const ffmpegProcess = ffmpegManager.startFFmpegProcess(
        ffmpegOptions,
        null, // 로그 콜백
        (error) => {
          // 에러 콜백
          console.error("FFmpeg 실행 오류:", error);
          event.sender.send("capture-status", {
            isCapturing: false,
            duration: 0,
            error: error.message,
          });
        },
        (code) => {
          // 종료 콜백
          console.log(`FFmpeg 프로세스 종료, 코드: ${code}`);
        }
      );

      // 세션에 FFmpeg 프로세스 저장
      sessionManager.setFFmpegProcess(ffmpegProcess);

      // 정기적으로 녹화 진행 시간 업데이트
      const durationInterval = setInterval(() => {
        const currentSession = sessionManager.getCaptureSession();
        if (!currentSession.isCapturing) {
          clearInterval(durationInterval);
          return;
        }

        // 경과 시간 계산 (초)
        const duration = sessionManager.calculateDuration();

        event.sender.send("capture-status", {
          isCapturing: true,
          duration,
        });
      }, 1000);

      // 세션에 인터벌 저장
      sessionManager.setDurationInterval(durationInterval);

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

/**
 * 스크린샷 캡처 중지
 * @param {Object} event IPC 이벤트 객체
 */
function stopCapture(event) {
  console.log("Main 프로세스: stop-capture 이벤트 수신");

  const currentSession = sessionManager.getCaptureSession();
  if (!currentSession.isCapturing) {
    console.log("Main 프로세스: 캡처 중인 세션 없음");
    return;
  }

  // 캡처 비디오 파일 경로 저장
  const videoPath = currentSession.videoPath;

  // FFmpeg 프로세스 종료 (녹화 중지)
  ffmpegManager.stopFFmpegProcess(currentSession.ffmpegProcess, () => {
    // 종료 후 파일 검증
    ffmpegManager.validateCaptureFile(videoPath);
  });

  // 캡처 세션 종료
  sessionManager.endCaptureSession();

  // 경과 시간 계산 (초)
  const duration = sessionManager.calculateDuration();

  // 캡처 중지 상태 이벤트 전송
  console.log("Main 프로세스: 캡처 중지 상태 전송");
  event.sender.send("capture-status", {
    isCapturing: false,
    duration,
  });
}

/**
 * 캡처 세션 정보 가져오기
 * @returns {Object} 현재 캡처 세션 상태
 */
function getCaptureSession() {
  return sessionManager.getCaptureSession();
}

module.exports = {
  getActiveWindows,
  startCapture,
  stopCapture,
  getCaptureSession,
};
