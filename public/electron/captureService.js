const windowManager = require("./services/windowManager");
const ffmpegManager = require("./services/ffmpegManager");
const sessionManager = require("./services/captureSessionManager");
const path = require("path");
const fs = require("fs");

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
 * @param {Object} args 캡처 설정 (windowId, customPath 등)
 */
function startCapture(event, args) {
  console.log("캡처 시작 이벤트 수신");

  try {
    // 윈도우 ID 유효성 확인
    const targetWindowId = args?.windowId || "screen:0";

    // 사용자 지정 경로 활용
    const customPath = args?.customPath || null;

    // 새 캡처 세션 초기화
    const sessionInfo = sessionManager.initCaptureSession(
      targetWindowId,
      customPath
    );

    // 녹화할 창 정보 가져오기
    getActiveWindows()
      .then((windows) => {
        // 선택된 창 또는 전체 화면 찾기
        let targetWindow = null;

        if (targetWindowId.startsWith("screen:")) {
          // 특정 모니터 찾기
          targetWindow = windows.find((win) => win.id === targetWindowId);

          if (!targetWindow) {
            // 기본 화면으로 대체
            targetWindow = windows.find((win) => win.isScreen);
          }
        } else if (targetWindowId !== "screen:0") {
          // 특정 창 찾기
          targetWindow = windows.find((win) => win.id === targetWindowId);

          if (!targetWindow) {
            // 전체 화면으로 대체
            targetWindow = windows.find((win) => win.isScreen);
          }
        } else {
          // 전체 화면 녹화 (기본값)
          targetWindow = windows.find((win) => win.isScreen);
        }

        // 캡처 대상 검증
        if (!targetWindow) {
          throw new Error("캡처할 화면을 찾을 수 없습니다.");
        }

        // 비디오 저장 경로 검증
        if (!sessionInfo.videoPath) {
          throw new Error("비디오 저장 경로가 설정되지 않았습니다.");
        }

        // 저장 디렉토리 확인 및 생성
        const videoDir = path.dirname(sessionInfo.videoPath);
        if (!fs.existsSync(videoDir)) {
          fs.mkdirSync(videoDir, { recursive: true });
        }

        // FFmpeg 명령어 옵션 설정
        const ffmpegOptions = ffmpegManager.createFFmpegOptions(
          targetWindow,
          sessionInfo.videoPath,
          {
            showMouse: args?.showMouse ?? true,
            logLevel: "debug",
            lowQuality: args?.lowQuality ?? true,
            ultraLight: args?.ultraLight ?? false,
          }
        );

        // FFmpeg 프로세스 시작
        const ffmpegProcess = ffmpegManager.startFFmpegProcess(
          ffmpegOptions,
          (logData) => {
            // 로그 출력 추가
            console.log(`FFmpeg 로그: ${logData}`);
          },
          (error) => {
            // 에러 처리
            console.error("FFmpeg 실행 오류:", error);
            event.sender.send("capture-status", {
              isCapturing: false,
              duration: 0,
              error: error.message || "녹화 중 오류가 발생했습니다.",
            });
          },
          (code) => {
            // 종료 처리
            if (code === 0 || code === 255) {
              const videoPath = sessionManager.getCaptureSession().videoPath;
              ffmpegManager.validateCaptureFile(videoPath);
            }
          }
        );

        // 프로세스 검증
        if (!ffmpegProcess) {
          throw new Error("FFmpeg 프로세스를 시작할 수 없습니다.");
        }

        // 세션에 FFmpeg 프로세스 저장
        sessionManager.setFFmpegProcess(ffmpegProcess);

        // 정기적으로 녹화 진행 시간 업데이트
        const durationInterval = setInterval(() => {
          const currentSession = sessionManager.getCaptureSession();
          if (!currentSession.isCapturing) {
            clearInterval(durationInterval);
            return;
          }

          // 경과 시간 계산
          const duration = sessionManager.calculateDuration();

          // 파일 존재 여부 확인
          const fileExists = fs.existsSync(currentSession.videoPath);

          event.sender.send("capture-status", {
            isCapturing: true,
            duration,
            fileExists,
          });
        }, 1000);

        // 세션에 인터벌 저장
        sessionManager.setDurationInterval(durationInterval);

        // 캡처 시작 상태 전송
        event.sender.send("capture-status", {
          isCapturing: true,
          duration: 0,
          filePath: sessionInfo.videoPath,
        });
      })
      .catch((error) => {
        console.error("캡처 중 오류 발생:", error);
        event.sender.send("capture-status", {
          isCapturing: false,
          duration: 0,
          error: error.message || "화면 캡처를 시작할 수 없습니다.",
        });
      });
  } catch (error) {
    console.error("캡처 시작 전 오류:", error);
    event.sender.send("capture-status", {
      isCapturing: false,
      duration: 0,
      error: error.message || "캡처 서비스 초기화 중 오류가 발생했습니다.",
    });
  }
}

/**
 * 스크린샷 캡처 중지
 * @param {Object} event IPC 이벤트 객체
 */
function stopCapture(event) {
  console.log("캡처 중지 이벤트 수신");

  try {
    const currentSession = sessionManager.getCaptureSession();
    if (!currentSession.isCapturing) {
      event.sender.send("capture-status", {
        isCapturing: false,
        duration: 0,
        message: "캡처 중인 세션이 없습니다.",
      });
      return;
    }

    // 캡처 비디오 파일 경로 저장
    const videoPath = currentSession.videoPath;

    // FFmpeg 프로세스 종료
    ffmpegManager.stopFFmpegProcess(currentSession.ffmpegProcess, () => {
      // 종료 후 파일 검증
      const isValid = ffmpegManager.validateCaptureFile(videoPath);

      // 파일 유효성 검사
      if (!isValid) {
        event.sender.send("capture-status", {
          isCapturing: false,
          error: "녹화된 파일이 유효하지 않습니다. 다시 시도해주세요.",
        });
      }
    });

    // 캡처 세션 종료
    sessionManager.endCaptureSession();

    // 경과 시간 계산 (초)
    const duration = sessionManager.calculateDuration();

    // 캡처 중지 상태 이벤트 전송
    event.sender.send("capture-status", {
      isCapturing: false,
      duration,
      videoPath,
    });
  } catch (error) {
    console.error("캡처 중지 중 오류:", error);
    event.sender.send("capture-status", {
      isCapturing: false,
      error: error.message || "캡처 중지 중 오류가 발생했습니다.",
    });
  }
}

/**
 * 캡처 세션 정보 가져오기
 * @returns {Object} 현재 캡처 세션 상태
 */
function getCaptureSession() {
  const session = sessionManager.getCaptureSession();

  // 파일 존재 여부 확인
  if (session.videoPath) {
    const fileExists = fs.existsSync(session.videoPath);
    return {
      ...session,
      fileExists,
    };
  }

  return session;
}

module.exports = {
  getActiveWindows,
  startCapture,
  stopCapture,
  getCaptureSession,
};
