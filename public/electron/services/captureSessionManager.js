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
 * @returns {Object} 초기화된 세션 정보
 */
function initCaptureSession(targetWindowId) {
  // 기존 세션 정리
  if (captureSession.isCapturing && captureSession.ffmpegProcess) {
    console.log("기존 세션 정리 - 이전 프로세스가 있으면 정리");
    try {
      captureSession.ffmpegProcess.kill();
    } catch (e) {
      console.warn("기존 프로세스 종료 중 오류:", e);
    }
  }

  const sessionTimestamp = new Date().toISOString().replace(/:/g, "-");

  // 캡처 디렉토리 설정
  const sessionDir = path.join(os.homedir(), "Documents", "담비", "captures");

  // 디렉토리 생성
  if (!fs.existsSync(sessionDir)) {
    try {
      console.log("캡처 디렉토리 생성:", sessionDir);
      fs.mkdirSync(sessionDir, { recursive: true });
    } catch (err) {
      console.error("캡처 디렉토리 생성 오류:", err);
    }
  }

  // 비디오 파일 경로
  const videoPath = path.join(sessionDir, `session_${sessionTimestamp}.mp4`);
  console.log("비디오 저장 경로:", videoPath);

  // 세션 정보 업데이트
  captureSession = {
    isCapturing: true,
    startTime: new Date(),
    videoPath: videoPath,
    targetWindowId: targetWindowId || "screen:0",
    ffmpegProcess: null,
    durationInterval: null,
  };

  console.log("새 캡처 세션 초기화 완료:", {
    isCapturing: captureSession.isCapturing,
    targetWindowId: captureSession.targetWindowId,
    videoPath: captureSession.videoPath,
  });

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
  console.log(
    "FFmpeg 프로세스 설정됨:",
    ffmpegProcess ? "프로세스 있음" : "프로세스 없음"
  );
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
  if (captureSession.videoPath) {
    const videoExists = fs.existsSync(captureSession.videoPath);
    console.log(
      `캡처 세션 종료 - 비디오 파일 확인: ${captureSession.videoPath} - ${
        videoExists ? "존재함" : "존재하지 않음"
      }`
    );

    if (videoExists) {
      try {
        const stats = fs.statSync(captureSession.videoPath);
        console.log(`비디오 파일 크기: ${stats.size} 바이트`);
      } catch (err) {
        console.error("비디오 파일 상태 확인 오류:", err);
      }
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
