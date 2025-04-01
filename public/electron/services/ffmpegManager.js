const ffmpeg = require("fluent-ffmpeg");
const spawn = require("cross-spawn");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const fs = require("fs");

// FFmpeg 경로 설정
const ffmpegPath = ffmpegInstaller.path;
console.log("FFmpeg 실행 파일 경로:", ffmpegPath);

/**
 * 특정 창 또는 전체 화면 녹화를 위한 FFmpeg 명령어 옵션을 생성
 * @param {Object} targetWindow 녹화할 창 정보
 * @param {string} videoPath 녹화 파일 저장 경로
 * @returns {Array} FFmpeg 명령어 옵션 배열
 */
function createFFmpegOptions(targetWindow, videoPath) {
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
  return ffmpegOptions;
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
  // FFmpeg로 화면 녹화 시작
  const ffmpegProcess = spawn(ffmpegPath, ffmpegOptions);

  ffmpegProcess.stderr.on("data", (data) => {
    const logData = data.toString();
    const truncatedLog =
      logData.substring(0, 150) + (logData.length > 150 ? "..." : "");
    console.log("FFmpeg 로그:", truncatedLog);

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
    if (onClose) {
      onClose(code);
    }
  });

  return ffmpegProcess;
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

    // 안전하게 종료하기 위해 q 명령어 전송 시도
    if (ffmpegProcess.stdin && !ffmpegProcess.stdin.destroyed) {
      ffmpegProcess.stdin.setEncoding("utf-8");
      ffmpegProcess.stdin.write("q\n");
      console.log("FFmpeg 프로세스에 q 명령 전송됨");
    } else {
      console.log("FFmpeg stdin이 사용 불가능하여 시그널로 종료 시도");
    }

    // 3초 후에도 종료되지 않으면 SIGTERM 시그널 보내기
    const killTimeout = setTimeout(() => {
      try {
        if (ffmpegProcess) {
          console.log("FFmpeg 프로세스가 여전히 실행 중, SIGTERM 시그널 전송");
          ffmpegProcess.kill("SIGTERM");

          // 추가 3초 후에도 종료되지 않으면 SIGKILL로 강제 종료
          setTimeout(() => {
            try {
              if (ffmpegProcess) {
                console.log(
                  "FFmpeg 프로세스가 여전히 종료되지 않음, SIGKILL로 강제 종료"
                );
                ffmpegProcess.kill("SIGKILL");

                if (onTerminated) {
                  onTerminated();
                }
              }
            } catch (e) {
              console.error("FFmpeg 강제 종료 시 오류:", e);
              if (onTerminated) {
                onTerminated();
              }
            }
          }, 3000);
        }
      } catch (e) {
        console.error("FFmpeg SIGTERM 전송 시 오류:", e);
        if (onTerminated) {
          onTerminated();
        }
      }
    }, 3000);

    // 프로세스가 종료되면 타임아웃 취소
    ffmpegProcess.on("close", (code) => {
      clearTimeout(killTimeout);
      console.log(`FFmpeg 프로세스가 코드 ${code}로 종료됨`);
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
  ffmpegPath,
  createFFmpegOptions,
  startFFmpegProcess,
  stopFFmpegProcess,
  validateCaptureFile,
};
