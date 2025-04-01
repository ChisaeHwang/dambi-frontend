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

  // 입력 파일 검사
  if (!videoPath || !fs.existsSync(videoPath)) {
    console.log("Main 프로세스: 녹화된 영상이 없음");
    event.sender.send("generate-timelapse-response", {
      error: "녹화된 영상이 없습니다.",
    });
    return;
  }

  // 파일 크기 확인 (빈 파일이거나 너무 작은 파일인지)
  try {
    const stats = fs.statSync(videoPath);
    if (stats.size < 10000) {
      // 10KB 미만이면 의심
      console.log(
        `Main 프로세스: 녹화된 영상이 너무 작음 (${stats.size} 바이트)`
      );
      event.sender.send("generate-timelapse-response", {
        error: "녹화된 영상이 손상되었거나 너무 짧습니다.",
      });
      return;
    }
    console.log(`비디오 파일 크기: ${stats.size} 바이트`);
  } catch (err) {
    console.error("파일 상태 확인 오류:", err);
    event.sender.send("generate-timelapse-response", {
      error: "파일 상태를 확인할 수 없습니다.",
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
    // 먼저 임시 파일로 처리하여 손상된 파일 문제 해결
    const tmpInputPath = path.join(
      outputDir,
      `tmp_input_${sessionTimestamp}.mp4`
    );

    // 1단계: 입력 파일을 재인코딩하여 손상되지 않은 임시 파일 생성
    console.log("1단계: 입력 파일 재인코딩 시작");

    // 첫 번째 명령: 입력 파일을 재인코딩
    const command1 = ffmpeg()
      .input(videoPath)
      .outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-y", // 덮어쓰기 허용
      ])
      .on("start", (cmd) => {
        console.log("1단계 명령 시작:", cmd);
      })
      .on("error", (err) => {
        console.error("입력 파일 재인코딩 오류:", err);
        event.sender.send("generate-timelapse-response", {
          error: "입력 파일을 처리할 수 없습니다. 다시 녹화를 시도해주세요.",
        });
      })
      .on("end", () => {
        console.log("1단계: 입력 파일 재인코딩 완료");
        // 2단계: 재인코딩된 파일로 타임랩스 생성
        createActualTimelapse(tmpInputPath);
      });

    // 임시 파일로 출력
    command1.save(tmpInputPath);

    // 2단계: 실제 타임랩스 생성 함수
    function createActualTimelapse(cleanInputPath) {
      console.log("2단계: 타임랩스 생성 시작");

      if (options.outputFormat === "mp4") {
        outputPath = path.join(outputDir, `${outputFilename}.mp4`);

        const command2 = ffmpeg()
          .input(cleanInputPath)
          .outputOptions([
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-vf",
            `setpts=PTS/${options.speedFactor || 3}`,
            "-movflags",
            "+faststart",
            "-pix_fmt",
            "yuv420p",
            "-y", // 덮어쓰기 허용
          ])
          .videoBitrate(videoBitrate)
          .format("mp4")
          .on("start", (cmd) => {
            console.log("2단계 명령 시작:", cmd);
          })
          .on("progress", (progress) => {
            const percent = Math.floor(progress.percent);
            console.log(`타임랩스 생성 진행률: ${percent}%`);
            event.sender.send("generate-timelapse-progress", { percent });
          })
          .on("error", (err) => {
            console.error("타임랩스 생성 오류:", err);
            cleanupTempFiles();

            let errorMessage = "타임랩스 생성 중 오류가 발생했습니다.";
            if (err.message) {
              errorMessage += ` 상세: ${err.message}`;
            }

            event.sender.send("generate-timelapse-response", {
              error: errorMessage,
            });
          })
          .on("end", () => {
            console.log("타임랩스 생성 완료:", outputPath);
            cleanupTempFiles();
            event.sender.send("generate-timelapse-response", {
              outputPath,
            });
          });

        command2.save(outputPath);
      } else {
        // GIF 생성 - 더 단순화된 과정
        outputPath = path.join(outputDir, `${outputFilename}.gif`);

        const command2 = ffmpeg()
          .input(cleanInputPath)
          .outputOptions([
            "-vf",
            `setpts=PTS/${
              options.speedFactor || 3
            },scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
            "-y", // 덮어쓰기 허용
          ])
          .format("gif")
          .on("progress", (progress) => {
            const percent = Math.floor(progress.percent);
            console.log(`GIF 생성 진행률: ${percent}%`);
            event.sender.send("generate-timelapse-progress", { percent });
          })
          .on("error", (err) => {
            console.error("GIF 생성 오류:", err);
            cleanupTempFiles();
            event.sender.send("generate-timelapse-response", {
              error: `GIF 생성 오류: ${err.message}`,
            });
          })
          .on("end", () => {
            console.log("GIF 생성 완료:", outputPath);
            cleanupTempFiles();
            event.sender.send("generate-timelapse-response", {
              outputPath,
            });
          });

        command2.save(outputPath);
      }
    }

    // 임시 파일 정리 함수
    function cleanupTempFiles() {
      try {
        if (fs.existsSync(tmpInputPath)) {
          fs.unlinkSync(tmpInputPath);
          console.log("임시 파일 삭제됨:", tmpInputPath);
        }
      } catch (err) {
        console.error("임시 파일 삭제 오류:", err);
      }
    }
  } catch (error) {
    console.error("타임랩스 생성 시작 실패:", error);
    event.sender.send("generate-timelapse-response", {
      error: `타임랩스 생성을 시작할 수 없습니다: ${error.message}`,
    });
  }
}

module.exports = {
  generateTimelapse,
};
