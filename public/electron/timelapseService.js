const path = require("path");
const fs = require("fs");
const os = require("os");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

// FFmpeg 경로 설정
console.log("타임랩스 서비스: FFmpeg 경로 설정", ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath);

// FFmpeg 경로 확인
if (!fs.existsSync(ffmpegPath)) {
  console.error("경고: FFmpeg 실행 파일을 찾을 수 없습니다:", ffmpegPath);
} else {
  console.log("FFmpeg 실행 파일 확인됨:", ffmpegPath);
}

/**
 * 타임랩스 생성 함수
 * @param {Object} event IPC 이벤트 객체
 * @param {Object} options 타임랩스 옵션
 * @param {string} videoPath 원본 비디오 경로
 */
function generateTimelapse(event, options, videoPath) {
  console.log("Main 프로세스: generate-timelapse 이벤트 수신", options);
  console.log("입력 비디오 경로:", videoPath);

  // 입력 파일 검사
  if (!videoPath || !fs.existsSync(videoPath)) {
    const error = "녹화된 영상이 없습니다. 먼저 화면 녹화를 진행해주세요.";
    console.error(error, videoPath);
    event.sender.send("generate-timelapse-response", { error });
    return;
  }

  try {
    // 파일 크기 확인
    const stats = fs.statSync(videoPath);
    console.log(`입력 비디오 파일 크기: ${stats.size} 바이트`);

    if (stats.size < 10000) {
      // 10KB 미만은 의심
      const error =
        "녹화된 영상이 너무 짧거나 손상되었습니다. 다시 녹화해주세요.";
      console.error(error);
      event.sender.send("generate-timelapse-response", { error });
      return;
    }
  } catch (err) {
    console.error("파일 상태 확인 오류:", err);
    event.sender.send("generate-timelapse-response", {
      error: "파일 상태를 확인할 수 없습니다: " + err.message,
    });
    return;
  }

  // 타임스탬프 생성 및 출력 경로 설정
  const sessionTimestamp = new Date().toISOString().replace(/:/g, "-");
  const outputDir = path.join(os.homedir(), "Documents", "담비", "timelapses");

  // 출력 디렉토리 확인 및 생성
  if (!fs.existsSync(outputDir)) {
    try {
      console.log("타임랩스 저장 디렉토리 생성:", outputDir);
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      const error =
        "타임랩스 저장 디렉토리를 생성할 수 없습니다: " + err.message;
      console.error(error);
      event.sender.send("generate-timelapse-response", { error });
      return;
    }
  }

  // 파일명 설정
  const outputFilename = `timelapse_${sessionTimestamp}`;
  let outputPath = "";

  // 품질 설정
  const speedFactor = options.speedFactor || 3;
  const outputFormat = options.outputFormat || "mp4";
  let videoBitrate = "2500k"; // 기본값

  switch (options.outputQuality) {
    case "low":
      videoBitrate = "1000k";
      break;
    case "medium":
      videoBitrate = "2500k";
      break;
    case "high":
      videoBitrate = "5000k";
      break;
  }

  console.log(
    `타임랩스 설정: ${speedFactor}배속, ${videoBitrate} 비트레이트, ${outputFormat} 형식`
  );

  try {
    // 출력 경로 설정
    outputPath = path.join(outputDir, `${outputFilename}.${outputFormat}`);
    console.log("타임랩스 출력 경로:", outputPath);

    // FFmpeg 명령어
    const command = ffmpeg(videoPath)
      .outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-vf",
        `setpts=PTS/${speedFactor}`,
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        "-y", // 덮어쓰기 허용
      ])
      .videoBitrate(videoBitrate)
      .format(outputFormat)
      .on("start", (cmd) => {
        console.log("FFmpeg 명령어 시작:", cmd);
        event.sender.send("generate-timelapse-progress", { percent: 0 });
      })
      .on("progress", (progress) => {
        const percent = Math.floor(progress.percent || 0);
        console.log(`타임랩스 생성 진행률: ${percent}%`);
        event.sender.send("generate-timelapse-progress", { percent });
      })
      .on("error", (err) => {
        console.error("타임랩스 생성 오류:", err);
        event.sender.send("generate-timelapse-response", {
          error: "타임랩스 생성 중 오류 발생: " + err.message,
        });
      })
      .on("end", () => {
        console.log("타임랩스 생성 완료:", outputPath);

        // 파일 존재 확인
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`생성된 타임랩스 파일 크기: ${stats.size} 바이트`);

          if (stats.size < 1000) {
            event.sender.send("generate-timelapse-response", {
              error: "생성된 타임랩스 파일이 너무 작습니다. 다시 시도해주세요.",
            });
            return;
          }

          event.sender.send("generate-timelapse-response", { outputPath });
        } else {
          event.sender.send("generate-timelapse-response", {
            error: "타임랩스 파일 생성에 실패했습니다.",
          });
        }
      });

    // 출력 저장
    command.save(outputPath);
  } catch (error) {
    console.error("타임랩스 생성 시작 실패:", error);
    event.sender.send("generate-timelapse-response", {
      error: "타임랩스 생성을 시작할 수 없습니다: " + error.message,
    });
  }
}

module.exports = {
  generateTimelapse,
};
