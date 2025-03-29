// @ts-nocheck
import ffmpeg from "fluent-ffmpeg";
import { createWriteStream } from "fs";
import { join } from "path";
import { homedir } from "os";

// FFmpeg 실행 파일 경로 설정 (일렉트론 환경에서 필요)
const ffmpegSetup = () => {
  try {
    const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    return true;
  } catch (error) {
    console.error("FFmpeg 설정 오류:", error);
    return false;
  }
};

interface TimelapseOptions {
  fps: number;
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
}

/**
 * 이미지 시퀀스로부터 타임랩스 비디오를 생성합니다.
 * @param inputDir 입력 이미지 파일들이 있는 디렉토리
 * @param outputFilename 출력 파일명 (확장자 제외)
 * @param options 타임랩스 생성 옵션
 * @returns 생성된 타임랩스 파일의 경로
 */
export const createTimelapse = (
  inputDir: string,
  outputFilename: string,
  options: TimelapseOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // FFmpeg 설정
    const isSetupSuccess = ffmpegSetup();
    if (!isSetupSuccess) {
      reject(new Error("FFmpeg 설정 실패"));
      return;
    }

    // 출력 디렉토리 (사용자 홈 디렉토리 내 Documents/담비)
    const outputDir = join(homedir(), "Documents", "담비", "timelapses");

    // 품질 설정
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

    // 현재 날짜 및 시간으로 파일명 생성 (중복 방지)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const finalOutputFilename = `${outputFilename}_${timestamp}`;

    let outputPath: string;
    let command = ffmpeg();

    // 이미지 시퀀스 입력 설정
    command = command
      .input(`${inputDir}/%04d.png`)
      .inputFPS(1) // 실제 이미지 캡처 속도 (1초에 1장)
      .outputFPS(options.fps); // 출력 FPS

    if (options.outputFormat === "mp4") {
      outputPath = `${outputDir}/${finalOutputFilename}.mp4`;

      command = command
        .output(outputPath)
        .videoCodec("libx264")
        .videoBitrate(videoBitrate)
        .format("mp4")
        .outputOptions([
          "-pix_fmt yuv420p", // 호환성을 위한 픽셀 포맷
          "-preset faster", // 인코딩 속도 설정
          "-movflags +faststart", // 웹 스트리밍에 적합하도록 설정
        ]);
    } else {
      outputPath = `${outputDir}/${finalOutputFilename}.gif`;

      command = command
        .output(outputPath)
        .format("gif")
        .outputOptions([
          `-filter_complex scale=640:-1:flags=lanczos[x];[x]split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        ]);
    }

    // 진행 상황 콜백
    command.on("progress", (progress) => {
      console.log(`처리 중: ${Math.floor(progress.percent)}%`);
    });

    // 완료 또는 오류 콜백
    command
      .on("end", () => {
        console.log("타임랩스 생성 완료");
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("타임랩스 생성 오류:", err);
        reject(err);
      });

    // FFmpeg 명령 실행
    command.run();
  });
};

/**
 * 로그 파일에 FFmpeg 명령 로그 작성
 * @param logPath 로그 파일 경로
 */
export const enableFFmpegLogging = (logPath: string): void => {
  const logStream = createWriteStream(logPath, { flags: "a" });

  ffmpeg.setLogger({
    debug: (message) => {
      logStream.write(`[DEBUG] ${message}\n`);
    },
    info: (message) => {
      logStream.write(`[INFO] ${message}\n`);
    },
    warn: (message) => {
      logStream.write(`[WARN] ${message}\n`);
    },
    error: (message) => {
      logStream.write(`[ERROR] ${message}\n`);
    },
  });
};
