const ffmpeg = require("fluent-ffmpeg");
const spawn = require("cross-spawn");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fs = require("fs");
const path = require("path");
const FFmpegConfigFactory = require("./ffmpegConfigFactory");

// FFmpeg 경로 설정 및 라이브러리 설정
const ffmpegPath = ffmpegInstaller.path;
ffmpeg.setFfmpegPath(ffmpegPath);

// FFmpeg 경로 및 상세 정보 로깅
console.log("FFmpeg 실행 파일 경로:", ffmpegPath);
console.log("FFmpeg 실행 파일 존재 여부:", fs.existsSync(ffmpegPath));
console.log("FFmpeg 실행 파일 디렉터리:", path.dirname(ffmpegPath));
console.log("FFmpeg 모듈 정보:", ffmpegInstaller);

// FFmpeg 실행 파일 존재 확인
try {
  if (fs.existsSync(ffmpegPath)) {
    console.log("FFmpeg 실행 파일이 존재합니다.");

    // 파일 크기 및 접근 권한 확인
    const stats = fs.statSync(ffmpegPath);
    console.log("FFmpeg 파일 크기:", stats.size, "바이트");
    console.log("FFmpeg 파일 권한:", stats.mode.toString(8));
    console.log("FFmpeg 파일 마지막 수정:", stats.mtime);
  } else {
    console.error(
      "경고: FFmpeg 실행 파일이 존재하지 않습니다. 녹화가 작동하지 않을 수 있습니다!"
    );
  }
} catch (err) {
  console.error("FFmpeg 경로 확인 중 오류 발생:", err);
}

/**
 * 특정 창 또는 전체 화면 녹화를 위한 FFmpeg 명령어 옵션을 생성
 * @param {Object} targetWindow 녹화할 창 정보
 * @param {string} videoPath 녹화 파일 저장 경로
 * @returns {Array} FFmpeg 명령어 옵션 배열
 */
function createFFmpegOptions(targetWindow, videoPath) {
  return FFmpegConfigFactory.createOptions(targetWindow, videoPath);
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
  // FFmpeg 경로 재확인
  if (!fs.existsSync(ffmpegPath)) {
    const error = new Error(
      `FFmpeg 실행 파일을 찾을 수 없습니다: ${ffmpegPath}`
    );
    console.error(error);
    if (onError) {
      onError(error);
    }
    return null;
  }

  try {
    // 직접 경로를 명시적으로 사용
    const ffmpegExePath = path.resolve(ffmpegPath);
    console.log("사용할 FFmpeg 실행 파일 절대 경로:", ffmpegExePath);

    // 비디오 파일 경로
    const videoPath = ffmpegOptions[ffmpegOptions.length - 1];
    console.log("녹화 대상 파일:", videoPath);

    // 비디오 파일 디렉토리 확인 및 생성
    const videoDir = path.dirname(videoPath);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
      console.log("녹화 파일 디렉토리 생성:", videoDir);
    }

    // 명령어 문자열로 직접 구성
    const commandString = [ffmpegExePath, ...ffmpegOptions].join(" ");
    console.log("FFmpeg 명령어 문자열:", commandString);

    // FFmpeg로 화면 녹화 시작
    console.log("FFmpeg 프로세스 시작 시도 중...");

    // child_process.exec 방식으로 시도 (테스트용)
    const { exec } = require("child_process");
    const ffmpegProcess = exec(commandString, (error, stdout, stderr) => {
      if (error) {
        console.error(`FFmpeg 실행 오류: ${error.message}`);
        if (onError) onError(error);
        return;
      }

      if (stderr) {
        console.log(`FFmpeg 로그: ${stderr}`);
        if (onLog) onLog(stderr);
      }

      console.log(`FFmpeg 출력: ${stdout}`);
    });

    if (!ffmpegProcess || !ffmpegProcess.pid) {
      console.error("FFmpeg 프로세스 생성 실패");
      if (onError) {
        onError(new Error("FFmpeg 프로세스를 생성할 수 없습니다."));
      }
      return null;
    }

    console.log(
      `FFmpeg 프로세스 생성됨, PID: ${ffmpegProcess.pid || "알 수 없음"}`
    );

    // stdout 출력 로깅 추가
    ffmpegProcess.stdout?.on("data", (data) => {
      console.log("FFmpeg 출력:", data.toString());
    });

    ffmpegProcess.stderr?.on("data", (data) => {
      const logData = data.toString();
      console.log("FFmpeg 로그:", logData.substring(0, 500)); // 모든 로그 출력 (디버깅)

      if (onLog) {
        onLog(logData);
      }
    });

    ffmpegProcess.on("error", (error) => {
      console.error("FFmpeg 실행 오류:", error);
      if (onError) {
        onError(error);
      }
    });

    ffmpegProcess.on("close", (code) => {
      console.log(`FFmpeg 프로세스 종료, 코드: ${code}`);

      // 파일 존재 확인
      if (fs.existsSync(videoPath)) {
        try {
          const stats = fs.statSync(videoPath);
          console.log(`녹화된 비디오 파일 크기: ${stats.size} 바이트`);
        } catch (err) {
          console.error("파일 상태 확인 오류:", err);
        }
      } else {
        console.error("녹화된 비디오 파일이 없습니다:", videoPath);
      }

      if (onClose) {
        onClose(code);
      }
    });

    return ffmpegProcess;
  } catch (error) {
    console.error("FFmpeg 프로세스 시작 중 예외 발생:", error);
    if (onError) {
      onError(error);
    }
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
    if (onTerminated) {
      onTerminated();
    }
    return;
  }

  try {
    console.log("FFmpeg 프로세스 종료 시작...");

    // q 명령어로 안전하게 종료
    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
      ffmpegProcess.stdin.setEncoding("utf-8");
      ffmpegProcess.stdin.write("q\n");
      console.log("FFmpeg 프로세스에 q 명령 전송됨");
    }

    // 5초 대기 후 아직 종료되지 않았으면 강제 종료
    const terminateTimeout = setTimeout(() => {
      try {
        console.log("FFmpeg 프로세스 강제 종료 시도");
        ffmpegProcess.kill("SIGKILL");
      } catch (e) {
        console.error("FFmpeg 강제 종료 중 오류:", e);
      } finally {
        if (onTerminated) {
          onTerminated();
        }
      }
    }, 5000);

    // 프로세스가 종료되면 콜백 실행 및 타임아웃 취소
    ffmpegProcess.on("close", (code) => {
      clearTimeout(terminateTimeout);
      console.log(`FFmpeg 프로세스가 정상 종료됨, 코드: ${code}`);
      if (onTerminated) {
        onTerminated();
      }
    });
  } catch (e) {
    console.error("FFmpeg 종료 명령 중 오류:", e);
    if (onTerminated) {
      onTerminated();
    }
  }
}

/**
 * 녹화 파일 검증 함수
 * @param {string} videoPath 검증할 비디오 파일 경로
 * @returns {boolean} 파일이 유효한지 여부
 */
function validateCaptureFile(videoPath) {
  console.log("비디오 파일 검증:", videoPath);

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
  ffmpegPath,
  createFFmpegOptions,
  startFFmpegProcess,
  stopFFmpegProcess,
  validateCaptureFile,
};
