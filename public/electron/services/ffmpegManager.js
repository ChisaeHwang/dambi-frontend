const ffmpeg = require("fluent-ffmpeg");
const spawn = require("cross-spawn");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fs = require("fs");
const path = require("path");
const FFmpegConfigFactory = require("./ffmpegConfigFactory");

// FFmpeg 경로 설정
const ffmpegPath = ffmpegInstaller.path;
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * 특정 창 또는 전체 화면 녹화를 위한 FFmpeg 명령어 옵션을 생성
 * @param {Object} targetWindow 녹화할 창 정보
 * @param {string} videoPath 녹화 파일 저장 경로
 * @returns {Array} FFmpeg 명령어 옵션 배열
 */
function createFFmpegOptions(targetWindow, videoPath, options = {}) {
  return FFmpegConfigFactory.createOptions(targetWindow, videoPath, options);
}

/**
 * FFmpeg 프로세스를 시작
 * @param {Array} ffmpegOptions FFmpeg 명령어 옵션 배열
 * @param {Function} onLog 로그 콜백
 * @param {Function} onError 에러 콜백
 * @param {Function} onClose 프로세스 종료 콜백
 * @returns {Object} FFmpeg 프로세스
 */
function startFFmpegProcess(ffmpegOptions, onLog, onError, onClose) {
  // FFmpeg 경로 확인
  if (!fs.existsSync(ffmpegPath)) {
    const error = new Error(
      `FFmpeg 실행 파일을 찾을 수 없습니다: ${ffmpegPath}`
    );
    console.error(error);
    if (onError) onError(error);
    return null;
  }

  try {
    // 비디오 파일 경로
    const videoPath = ffmpegOptions[ffmpegOptions.length - 1];

    // 비디오 파일 디렉토리 확인 및 생성
    const videoDir = path.dirname(videoPath);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    // FFmpeg로 화면 녹화 시작
    console.log("FFmpeg 프로세스 시작...");

    // child_process 모듈로 직접 실행
    const ffmpegProcess = spawn(ffmpegPath, ffmpegOptions, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!ffmpegProcess || !ffmpegProcess.pid) {
      const error = new Error("FFmpeg 프로세스를 생성할 수 없습니다.");
      console.error(error);
      if (onError) onError(error);
      return null;
    }

    // 로그 출력 설정
    ffmpegProcess.stdout?.on("data", (data) => {
      const logData = data.toString();
      if (onLog) onLog(logData);
    });

    ffmpegProcess.stderr?.on("data", (data) => {
      const logData = data.toString();
      if (onLog) onLog(logData);
    });

    // 오류 처리
    ffmpegProcess.on("error", (error) => {
      console.error("FFmpeg 실행 오류:", error);
      if (onError) onError(error);
    });

    // 종료 처리
    ffmpegProcess.on("close", (code) => {
      console.log(`FFmpeg 프로세스 종료, 코드: ${code}`);

      // 종료 후 파일 검증
      if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        console.log(`녹화된 비디오 파일 크기: ${stats.size} 바이트`);
      } else {
        console.error("녹화된 비디오 파일이 없습니다:", videoPath);
      }

      if (onClose) onClose(code);
    });

    return ffmpegProcess;
  } catch (error) {
    console.error("FFmpeg 프로세스 시작 중 오류:", error);
    if (onError) onError(error);
    return null;
  }
}

/**
 * FFmpeg 프로세스를 안전하게 종료
 * @param {Object} ffmpegProcess 종료할 FFmpeg 프로세스
 * @param {Function} onTerminated 완전히 종료된 후 콜백
 */
function stopFFmpegProcess(ffmpegProcess, onTerminated) {
  if (!ffmpegProcess) {
    console.log("종료할 FFmpeg 프로세스가 없음");
    if (onTerminated) onTerminated();
    return;
  }

  try {
    console.log("FFmpeg 프로세스 종료 시작...");

    // q 명령어로 안전하게 종료 시도
    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
      ffmpegProcess.stdin.setEncoding("utf-8");
      ffmpegProcess.stdin.write("q\n");
    }

    // 5초 대기 후 아직 종료되지 않았으면 강제 종료
    const terminateTimeout = setTimeout(() => {
      try {
        console.log("FFmpeg 프로세스 강제 종료");
        ffmpegProcess.kill("SIGKILL");
      } catch (e) {
        console.error("FFmpeg 강제 종료 중 오류:", e);
      } finally {
        if (onTerminated) onTerminated();
      }
    }, 5000);

    // 프로세스가 종료되면 콜백 실행 및 타임아웃 취소
    ffmpegProcess.on("close", (code) => {
      clearTimeout(terminateTimeout);
      console.log(`FFmpeg 프로세스가 정상 종료됨, 코드: ${code}`);
      if (onTerminated) onTerminated();
    });
  } catch (e) {
    console.error("FFmpeg 종료 명령 중 오류:", e);
    if (onTerminated) onTerminated();
  }
}

/**
 * 녹화 파일 검증 함수
 * @param {string} videoPath 검증할 비디오 파일 경로
 * @returns {boolean} 파일이 유효한지 여부
 */
function validateCaptureFile(videoPath) {
  if (!videoPath) {
    console.error("검증할 파일 경로가 없습니다.");
    return false;
  }

  if (!fs.existsSync(videoPath)) {
    console.error("검증할 비디오 파일이 존재하지 않습니다:", videoPath);
    return false;
  }

  try {
    // 파일 크기 확인
    const stats = fs.statSync(videoPath);

    // 10KB 미만은 손상된 파일로 간주
    if (stats.size < 10000) {
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
  ffmpegPath,
  createFFmpegOptions,
  startFFmpegProcess,
  stopFFmpegProcess,
  validateCaptureFile,
};
