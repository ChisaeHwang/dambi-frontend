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
 * 스크린샷 캡처 시작 - 단순화된 버전
 * @param {Object} event IPC 이벤트 객체
 * @param {Object} args 캡처 설정 (windowId, customPath 등)
 */
function startCapture(event, args) {
  console.log("캡처 시작 이벤트 수신");

  try {
    // 1. 윈도우 ID와 저장 경로 설정
    let targetWindowId = args?.windowId || "screen:0";
    const customPath = args?.customPath || null;
    const windowName = args?.windowName || "";

    // ID 형식 정확하게 처리 (screen:0:0 형식이면 screen:0으로 변환)
    if (targetWindowId.includes(":")) {
      const parts = targetWindowId.split(":");
      if (parts.length > 2 && parts[0] === "screen") {
        // displayId 형식 단순화
        targetWindowId = `screen:${parts[1]}`;
        console.log(`윈도우 ID 정리: ${targetWindowId}`);
      }
    }

    // 2. 세션 초기화
    const sessionInfo = sessionManager.initCaptureSession(
      targetWindowId,
      customPath
    );

    // 3. 창 목록 가져와서 선택된 창 찾기
    getActiveWindows()
      .then((windows) => {
        // 캡처 대상 창 검색 (단순화된 로직)
        let targetWindow = null;

        // 선택된 창 찾기 (ID 기반 - 정확히 일치하거나 부분 일치)
        targetWindow = windows.find(
          (win) =>
            win.id === targetWindowId ||
            (targetWindowId.startsWith("screen:") &&
              win.id.startsWith(targetWindowId))
        );

        // 선택된 창을 못 찾았을 경우
        if (!targetWindow) {
          // 이름으로 찾기 시도 (제공된 경우)
          if (windowName) {
            targetWindow = windows.find(
              (win) => win.name && win.name.includes(windowName)
            );

            if (targetWindow) {
              console.log(`창 이름으로 찾음: ${targetWindow.name}`);
            }
          }

          // 마지막 대안: 모니터 0 또는 주 모니터 사용
          if (!targetWindow) {
            console.log("선택된 창을 찾을 수 없어 기본 화면 사용");

            // 주 모니터 먼저 시도
            targetWindow = windows.find(
              (win) => win.isScreen && win.isMainScreen
            );

            // 모니터 0 시도
            if (!targetWindow) {
              targetWindow = windows.find(
                (win) => win.isScreen && win.id.includes("screen:0")
              );
            }

            // 다른 모니터라도 찾기
            if (!targetWindow) {
              targetWindow = windows.find((win) => win.isScreen);
            }

            // 화면도 못 찾을 경우 오류
            if (!targetWindow) {
              throw new Error("캡처할 창 또는 화면을 찾을 수 없습니다");
            }
          }
        }

        console.log(`캡처 대상: ${targetWindow.name} (ID: ${targetWindow.id})`);

        // 4. 저장 경로 확인 및 디렉토리 생성
        if (!sessionInfo.videoPath) {
          throw new Error("비디오 저장 경로가 설정되지 않았습니다");
        }

        const videoDir = path.dirname(sessionInfo.videoPath);
        if (!fs.existsSync(videoDir)) {
          fs.mkdirSync(videoDir, { recursive: true });
        }

        // 5. FFmpeg 옵션 설정 (단순화)
        const ffmpegOptions = ffmpegManager.createFFmpegOptions(
          targetWindow,
          sessionInfo.videoPath,
          {
            showMouse: true,
            logLevel: "info", // warning에서 info로 변경하여 더 자세한 로그 확인
            lowQuality: true,
          }
        );

        // 6. FFmpeg 프로세스 시작
        const ffmpegProcess = ffmpegManager.startFFmpegProcess(
          ffmpegOptions,
          (logData) => {
            // FFmpeg 로그 자세히 출력
            console.log(`FFmpeg 로그: ${logData}`);
          },
          (error) => {
            // 오류 처리
            console.error("FFmpeg 오류:", error.message);
            event.sender.send("capture-status", {
              isCapturing: false,
              error: "녹화를 시작할 수 없습니다. 다른 창을 선택해 보세요.",
            });
          },
          (code) => {
            // 종료 처리
            const videoPath = sessionManager.getCaptureSession().videoPath;
            ffmpegManager.validateCaptureFile(videoPath);
          }
        );

        // 프로세스 유효성 검사
        if (!ffmpegProcess) {
          throw new Error("FFmpeg 프로세스를 시작할 수 없습니다");
        }

        // 7. 세션 정보 업데이트
        sessionManager.setFFmpegProcess(ffmpegProcess);

        // 8. 진행 상태 업데이트 인터벌 설정
        const durationInterval = setInterval(() => {
          const currentSession = sessionManager.getCaptureSession();
          if (!currentSession.isCapturing) {
            clearInterval(durationInterval);
            return;
          }

          const duration = sessionManager.calculateDuration();
          const fileExists = fs.existsSync(currentSession.videoPath);

          event.sender.send("capture-status", {
            isCapturing: true,
            duration,
            fileExists,
          });
        }, 1000);

        sessionManager.setDurationInterval(durationInterval);

        // 9. 클라이언트에 시작 상태 알림
        event.sender.send("capture-status", {
          isCapturing: true,
          duration: 0,
          filePath: sessionInfo.videoPath,
        });
      })
      .catch((error) => {
        console.error("캡처 시작 오류:", error.message);
        event.sender.send("capture-status", {
          isCapturing: false,
          error: error.message || "화면 캡처를 시작할 수 없습니다",
        });
      });
  } catch (error) {
    console.error("캡처 초기화 오류:", error.message);
    event.sender.send("capture-status", {
      isCapturing: false,
      error: error.message || "캡처 초기화에 실패했습니다",
    });
  }
}

/**
 * 스크린샷 캡처 중지 - 단순화된 버전
 * @param {Object} event IPC 이벤트 객체
 */
function stopCapture(event) {
  console.log("캡처 중지 이벤트 수신");

  try {
    const currentSession = sessionManager.getCaptureSession();

    // 캡처 중인지 확인
    if (!currentSession.isCapturing) {
      event.sender.send("capture-status", {
        isCapturing: false,
        message: "현재 캡처 중인 세션이 없습니다",
      });
      return;
    }

    // 비디오 파일 경로 저장
    const videoPath = currentSession.videoPath;

    // FFmpeg 프로세스 종료
    ffmpegManager.stopFFmpegProcess(currentSession.ffmpegProcess, () => {
      // 파일 검증
      const isValid = ffmpegManager.validateCaptureFile(videoPath);

      if (!isValid) {
        event.sender.send("capture-status", {
          isCapturing: false,
          error: "녹화된 파일이 유효하지 않습니다. 다시 시도해보세요.",
        });
      }
    });

    // 세션 종료
    sessionManager.endCaptureSession();

    // 녹화 시간 계산
    const duration = sessionManager.calculateDuration();

    // 상태 전송
    event.sender.send("capture-status", {
      isCapturing: false,
      duration,
      videoPath,
    });
  } catch (error) {
    console.error("캡처 중지 오류:", error.message);
    event.sender.send("capture-status", {
      isCapturing: false,
      error: "캡처 중지 중 오류가 발생했습니다",
    });
  }
}

/**
 * 캡처 세션 정보 가져오기 - 단순화된 버전
 * @returns {Object} 현재 캡처 세션 상태
 */
function getCaptureSession() {
  const session = sessionManager.getCaptureSession();

  // 파일 존재 여부 확인
  if (session.videoPath) {
    return {
      ...session,
      fileExists: fs.existsSync(session.videoPath),
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
