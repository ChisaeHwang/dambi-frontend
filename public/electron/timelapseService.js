const path = require("path");
const fs = require("fs");
const os = require("os");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

// FFmpeg 경로 설정
ffmpeg.setFfmpegPath(ffmpegPath);

// 타임랩스 생성 함수
function generateTimelapse(event, options, videoPath) {
  console.log("Main 프로세스: generate-timelapse 이벤트 수신", options);
  if (!videoPath || !fs.existsSync(videoPath)) {
    console.log("Main 프로세스: 녹화된 영상이 없음");
    event.sender.send("generate-timelapse-response", {
      error: "녹화된 영상이 없습니다.",
    });
    return;
  }

  const sessionTimestamp = new Date().toISOString().replace(/:/g, "-");
  const outputFilename = `timelapse_${sessionTimestamp}`;
  const outputDir = path.join(os.homedir(), "Documents", "담비", "timelapses");
  let outputPath;

  // 출력 디렉토리가 없으면 생성
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 품질 설정에 따른 비트레이트
  let videoBitrate;
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
    default:
      videoBitrate = "2500k";
  }

  try {
    let command = ffmpeg();

    // 녹화 영상 입력
    command = command.input(videoPath);

    // 속도 조절 필터 (배속)
    const speedFactor = options.speedFactor || 3;

    if (options.outputFormat === "mp4") {
      outputPath = path.join(outputDir, `${outputFilename}.mp4`);

      command = command
        .output(outputPath)
        .videoCodec("libx264")
        .videoBitrate(videoBitrate)
        .format("mp4")
        .videoFilters([
          `setpts=PTS/${speedFactor}`, // 영상 속도 조절
          "pix_fmt=yuv420p",
        ])
        .outputOptions(["-preset faster", "-movflags +faststart"]);
    } else {
      outputPath = path.join(outputDir, `${outputFilename}.gif`);

      command = command
        .output(outputPath)
        .format("gif")
        .size("640x?") // GIF 크기 제한 (너비 640px, 비율 유지)
        .videoFilters([
          `setpts=PTS/${speedFactor}`, // 영상 속도 조절
          "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        ]);
    }

    // 진행 상황 콜백
    command.on("progress", (progress) => {
      console.log(`타임랩스 생성 진행률: ${Math.floor(progress.percent)}%`);
    });

    // 완료 콜백
    command.on("end", () => {
      console.log("타임랩스 생성 완료:", outputPath);
      event.sender.send("generate-timelapse-response", {
        outputPath,
      });
    });

    // 오류 콜백
    command.on("error", (err) => {
      console.error("타임랩스 생성 오류:", err);
      event.sender.send("generate-timelapse-response", {
        error: `타임랩스 생성 중 오류가 발생했습니다: ${err.message}`,
      });
    });

    // FFmpeg 실행
    command.run();
  } catch (error) {
    console.error("타임랩스 생성 실패:", error);
    event.sender.send("generate-timelapse-response", {
      error: `타임랩스 생성 중 오류가 발생했습니다: ${error.message}`,
    });
  }
}

module.exports = {
  generateTimelapse,
};
