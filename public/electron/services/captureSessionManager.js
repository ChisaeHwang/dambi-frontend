const path = require("path");
const fs = require("fs");
const os = require("os");

// 캡처 세션 상태 객체
let captureSession = {
  isCapturing: false,
  startTime: null,
  videoPath: null,
  targetWindowId: null,
  ffmpegProcess: null,
  durationInterval: null,
};

/**
 * 새 캡처 세션을 초기화
 * @param {string} targetWindowId 캡처할 창 ID
 * @param {string} customPath 사용자 지정 저장 경로 (선택적)
 * @returns {Object} 초기화된 세션 정보
 */
function initCaptureSession(targetWindowId, customPath = null) {
  // 기존 세션 정리
  if (captureSession.isCapturing && captureSession.ffmpegProcess) {
    try {
      captureSession.ffmpegProcess.kill();
    } catch (e) {
      console.warn("기존 프로세스 종료 중 오류:", e);
    }
  }

  const sessionTimestamp = new Date().toISOString().replace(/:/g, "-");

  // 캡처 디렉토리 설정 (사용자 지정 경로 또는 기본 경로)
  const sessionDir =
    customPath || path.join(os.homedir(), "Documents", "담비", "captures");

  // 디렉토리 생성 확인
  try {
    if (!fs.existsSync(sessionDir)) {
      console.log(`캡처 저장 디렉토리 생성: ${sessionDir}`);
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // 디렉토리 쓰기 권한 테스트
    const testFile = path.join(sessionDir, ".write_test");
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    console.log(`캡처 디렉토리 쓰기 권한 확인 완료: ${sessionDir}`);
  } catch (error) {
    console.error(`디렉토리 생성 또는 접근 오류: ${error.message}`);
    throw new Error(`캡처 저장 경로에 접근할 수 없습니다: ${error.message}`);
  }

  // 비디오 파일 경로
  const videoPath = path.join(sessionDir, `session_${sessionTimestamp}.mp4`);

  // 세션 정보 업데이트
  captureSession = {
    isCapturing: true,
    startTime: new Date(),
    videoPath: videoPath,
    targetWindowId: targetWindowId || "screen:0",
    ffmpegProcess: null,
    durationInterval: null,
  };

  console.log(
    `캡처 세션 초기화: 대상=${targetWindowId}, 저장경로=${videoPath}`
  );

  return {
    videoPath,
    targetWindowId: captureSession.targetWindowId,
    sessionTimestamp,
  };
}

/**
 * 캡처 세션 정보 가져오기
 * @returns {Object} 현재 캡처 세션 상태
 */
function getCaptureSession() {
  return captureSession;
}

/**
 * 캡처 세션에 FFmpeg 프로세스 설정
 * @param {Object} ffmpegProcess FFmpeg 프로세스 객체
 */
function setFFmpegProcess(ffmpegProcess) {
  captureSession.ffmpegProcess = ffmpegProcess;
}

/**
 * 캡처 세션에 타이머 간격 설정
 * @param {Object} intervalId 인터벌 ID
 */
function setDurationInterval(intervalId) {
  captureSession.durationInterval = intervalId;
}

/**
 * 캡처 세션 종료
 */
function endCaptureSession() {
  // 타이머 중지
  if (captureSession.durationInterval) {
    clearInterval(captureSession.durationInterval);
    captureSession.durationInterval = null;
  }

  // 세션 상태 업데이트
  captureSession.isCapturing = false;

  // 비디오 파일 존재 확인
  if (captureSession.videoPath && fs.existsSync(captureSession.videoPath)) {
    try {
      const stats = fs.statSync(captureSession.videoPath);
      console.log(`비디오 파일 크기: ${stats.size} 바이트`);
    } catch (err) {
      console.error("비디오 파일 상태 확인 오류:", err);
    }
  }
}

/**
 * 현재 녹화 경과 시간 계산 (초)
 * @returns {number} 경과 시간 (초)
 */
function calculateDuration() {
  if (!captureSession.startTime) {
    return 0;
  }
  return Math.floor((new Date() - captureSession.startTime) / 1000);
}

module.exports = {
  initCaptureSession,
  getCaptureSession,
  setFFmpegProcess,
  setDurationInterval,
  endCaptureSession,
  calculateDuration,
};
