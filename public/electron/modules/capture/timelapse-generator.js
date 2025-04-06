const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const windowManager = require("../window-manager");
const storageManager = require("./storage-manager");

/**
 * 타임랩스 생성을 담당하는 클래스
 */
class TimelapseGenerator {
  constructor() {
    // 품질 설정 매핑
    this.crfMap = {
      low: "30", // 낮은 품질, 작은 파일 크기
      medium: "26", // 중간 품질 (기본값)
      high: "22", // 높은 품질, 큰 파일 크기
    };
  }

  /**
   * 타임랩스 생성
   * @param {string} sourcePath - 원본 비디오 경로
   * @param {Object} options - 타임랩스 생성 옵션
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  async generateTimelapse(sourcePath, options) {
    // 타임랩스 생성 옵션 처리
    const outputPath = storageManager.createTimelapseOutputPath(options);
    const speedFactor = options.speedFactor || 3;
    const quality = options.outputQuality || "medium";
    const preserveOriginals = options.preserveOriginals !== false;

    // 출력 디렉토리 확인 및 생성
    storageManager.prepareOutputDirectory(outputPath);

    // FFmpeg 품질 설정
    const crf = this.crfMap[quality] || this.crfMap.medium;

    // ffmpeg-static 패키지에서 ffmpeg 경로 가져오기
    const ffmpegPath = require("ffmpeg-static");

    console.log(`타임랩스 생성 시작: ${outputPath}`);
    console.log(
      `설정: 속도=${speedFactor}x, 품질=${quality}, CRF=${crf}, 원본 보존=${preserveOriginals}`
    );

    // 블러 영역 정보 출력
    if (options.blurRegions && options.blurRegions.length > 0) {
      console.log(
        `블러 영역 정보:`,
        JSON.stringify(options.blurRegions, null, 2)
      );
    } else {
      console.log(`블러 영역 없음`);
    }

    // options에 crf 값 추가 (누락된 부분 수정)
    options.crf = crf;

    return this._runFfmpegProcess(ffmpegPath, sourcePath, outputPath, options);
  }

  /**
   * FFMPEG 프로세스 실행
   * @param {string} ffmpegPath - FFMPEG 실행 파일 경로
   * @param {string} sourcePath - 원본 비디오 경로
   * @param {string} outputPath - 출력 경로
   * @param {Object} options - 인코딩 옵션
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  _runFfmpegProcess(ffmpegPath, sourcePath, outputPath, options) {
    const { speedFactor, crf, preserveOriginals } = options;
    let lastProgress = 0;

    return new Promise((resolve, reject) => {
      try {
        // 타임랩스 생성 시작 알림
        windowManager.sendEvent("timelapse-progress", {
          status: "start",
          progress: 0,
          stage: "초기화",
        });

        // 로그 레벨 변경 (debug → info로 변경하여 로그 출력 감소)
        const ffmpegArgs = [
          "-loglevel",
          "info",
          ...this._buildFfmpegArgs(sourcePath, outputPath, options),
        ];

        // 메인 윈도우에 초기 작업 시작 알림
        windowManager.sendEvent("timelapse-progress", {
          status: "start",
          progress: 5,
          stage: "인코딩 시작 중...",
        });

        // FFmpeg 프로세스 실행
        const ffmpeg = spawn(ffmpegPath, ffmpegArgs);

        // 진행 상황 업데이트 간소화
        let lastUpdateTime = Date.now();
        const minUpdateInterval = 1000;

        ffmpeg.stderr.on("data", (data) => {
          const output = data.toString();

          // 불필요한 로그 출력을 제거하고 중요한 정보만 로깅
          if (output.includes("error") || output.includes("Error")) {
            console.error(`FFmpeg 오류: ${output}`);
          }

          // 진행 상황 업데이트
          this._updateProgress(
            output,
            lastUpdateTime,
            minUpdateInterval,
            (progress) => {
              if (progress > lastProgress) {
                lastProgress = progress;
                lastUpdateTime = Date.now();

                windowManager.sendEvent("timelapse-progress", {
                  status: "processing",
                  progress: progress,
                  stage: "인코딩 중...",
                });
              }
            }
          );
        });

        ffmpeg.on("close", (code) => {
          if (code === 0) {
            console.log(`타임랩스 생성 완료: ${outputPath}`);

            // 완료 상태 전송
            windowManager.sendEvent("timelapse-progress", {
              status: "complete",
              progress: 100,
              stage: "완료",
              outputPath,
            });

            // 원본 파일은 기본적으로 보존
            if (!preserveOriginals && fs.existsSync(sourcePath)) {
              try {
                storageManager.deleteFile(sourcePath);
                console.log("원본 녹화 파일 삭제 완료");
              } catch (error) {
                console.error("원본 녹화 파일 삭제 오류:", error);
              }
            }

            resolve(outputPath);
          } else {
            const errorMsg = `타임랩스 생성 실패: FFmpeg 오류 코드 ${code}`;
            console.error(errorMsg);

            // 에러 상태 전송
            windowManager.sendEvent("timelapse-progress", {
              status: "error",
              progress: 0,
              stage: "오류",
              error: errorMsg,
            });

            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        console.error("타임랩스 생성 중 오류:", error);

        // 에러 상태 전송
        windowManager.sendEvent("timelapse-progress", {
          status: "error",
          progress: 0,
          stage: "오류",
          error: error.message || String(error),
        });

        reject(error);
      }
    });
  }

  /**
   * FFmpeg 인코딩 진행 상황 업데이트
   * @param {string} output - FFmpeg 출력 텍스트
   * @param {number} lastUpdateTime - 마지막 업데이트 시간
   * @param {number} minUpdateInterval - 최소 업데이트 간격
   * @param {Function} callback - 업데이트 콜백
   */
  _updateProgress(output, lastUpdateTime, minUpdateInterval, callback) {
    // 현재 시간 확인 (업데이트 간격 제한)
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime < minUpdateInterval) {
      return;
    }

    // 진행 상황 파싱 - 프레임 기반
    const frameMatch = output.match(/frame=\s*(\d+)/);
    if (frameMatch) {
      const frame = parseInt(frameMatch[1]);

      // 프레임 개수에 따라 진행률 추정
      let progress = 0;
      if (frame > 0) {
        // 기본값으로 프레임 수에 따라 진행률 설정
        // 최대 프레임 수를 예측하기 어려우므로 상한값을 가정
        progress = Math.min(Math.floor((frame / 1000) * 100), 95);
      }

      callback(progress);
    }
  }

  /**
   * FFmpeg 명령행 인자 구성
   * @param {string} inputPath - 입력 파일 경로
   * @param {string} outputPath - 출력 파일 경로
   * @param {Object} options - 인코딩 옵션
   * @returns {Array<string>} FFmpeg 명령행 인자
   */
  _buildFfmpegArgs(inputPath, outputPath, options) {
    const { speedFactor, crf, blurRegions = [] } = options;
    const cpuCount = Math.max(4, os.cpus().length);

    // 필터 체인 구성 (속도 팩터에 따라 다른 방식 적용)
    let filterChain;
    let framerate = "30"; // 기본 출력 프레임 레이트

    // 원본 비디오 해상도 (옵션에서 제공되지 않으면 기본값 사용)
    const videoWidth = options.videoWidth || 1920;
    const videoHeight = options.videoHeight || 1080;

    // 썸네일 해상도 (옵션에서 제공되지 않으면 기본값 사용)
    const thumbnailWidth = options.thumbnailWidth || 320;
    const thumbnailHeight = options.thumbnailHeight || 240;

    // 스케일링 비율 계산
    const scaleX = videoWidth / thumbnailWidth;
    const scaleY = videoHeight / thumbnailHeight;

    console.log(
      `비디오 해상도: ${videoWidth}x${videoHeight}, 썸네일: ${thumbnailWidth}x${thumbnailHeight}`
    );
    console.log(
      `스케일링 비율: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`
    );

    // 기본 속도 필터 생성
    let speedFilter;
    if (speedFactor <= 5) {
      // 낮은 속도 팩터: 모든 프레임 유지하면서 속도 조절
      speedFilter = `fps=60,setpts=${1 / speedFactor}*PTS`;
      framerate = "60"; // 더 높은 프레임 레이트로 부드러운 결과
    } else if (speedFactor <= 10) {
      // 중간 속도 팩터: 균일하게 프레임 선택
      speedFilter = `select='not(mod(n,${Math.floor(
        speedFactor / 2
      )}))',setpts=N/(30*TB)`;
    } else {
      // 높은 속도 팩터: 키 프레임 우선 선택 (씬 변화 감지)
      const sceneThreshold = Math.min(0.2, 0.5 / speedFactor); // 속도에 따른 임계값 조정
      speedFilter = `select='eq(pict_type,I) + gt(scene,${sceneThreshold})',setpts=N/(24*TB)`;
      framerate = "24"; // 영화같은 느낌의 프레임 레이트
    }

    // 블러 영역이 있는 경우 처리
    if (blurRegions && blurRegions.length > 0) {
      console.log(`블러 영역: ${blurRegions.length}개 적용`);

      // 단순화된 필터 체인 접근법 사용
      if (blurRegions.length === 1) {
        // 단일 블러 영역에 대한 간단한 처리 방식
        const region = blurRegions[0];

        // 썸네일에서 원본 비디오 해상도로 좌표 변환
        const x = Math.round(region.x * scaleX);
        const y = Math.round(region.y * scaleY);
        const width = Math.round(region.width * scaleX);
        const height = Math.round(region.height * scaleY);

        // 블러 영역이 유효한지 확인
        if (
          x >= 0 &&
          y >= 0 &&
          width > 0 &&
          height > 0 &&
          x + width <= videoWidth &&
          y + height <= videoHeight
        ) {
          // 단일 필터 체인 구성 (더 단순한 구문으로 변경)
          filterChain = [
            speedFilter,
            `split=2[base][crop]`,
            `[crop]crop=${width}:${height}:${x}:${y},boxblur=20:2[blurred]`,
            `[base][blurred]overlay=${x}:${y}`,
            `scale=-2:1080:flags=lanczos`,
          ].join(",");

          console.log(
            `블러 필터 적용 (x=${x}, y=${y}, width=${width}, height=${height})`
          );
        } else {
          // 유효하지 않은 블러 영역인 경우 기본 필터만 적용
          filterChain = `${speedFilter},scale=-2:1080:flags=lanczos`;
          console.log(`유효하지 않은 블러 영역 - 기본 필터만 적용`);
        }
      } else {
        // 다중 블러 영역을 처리하기 위한 복잡한 체인 구성
        // 첫 번째 블러만 적용하여 안정성 확보 (향후 다중 블러 개선 예정)
        const region = blurRegions[0];

        // 썸네일에서 원본 비디오 해상도로 좌표 변환
        const x = Math.round(region.x * scaleX);
        const y = Math.round(region.y * scaleY);
        const width = Math.round(region.width * scaleX);
        const height = Math.round(region.height * scaleY);

        // 블러 영역이 유효한지 확인
        if (
          x >= 0 &&
          y >= 0 &&
          width > 0 &&
          height > 0 &&
          x + width <= videoWidth &&
          y + height <= videoHeight
        ) {
          // 단일 필터 체인 구성
          filterChain = [
            speedFilter,
            `split=2[base][crop]`,
            `[crop]crop=${width}:${height}:${x}:${y},boxblur=20:2[blurred]`,
            `[base][blurred]overlay=${x}:${y}`,
            `scale=-2:1080:flags=lanczos`,
          ].join(",");

          console.log(
            `첫 번째 블러 영역만 적용 (x=${x}, y=${y}, width=${width}, height=${height})`
          );
        } else {
          // 유효하지 않은 블러 영역인 경우 기본 필터만 적용
          filterChain = `${speedFilter},scale=-2:1080:flags=lanczos`;
          console.log(`유효하지 않은 블러 영역 - 기본 필터만 적용`);
        }
      }
    } else {
      // 블러 없는 경우 기본 필터만 적용
      filterChain = `${speedFilter},scale=-2:1080:flags=lanczos`;
    }

    console.log(`최종 필터 체인: ${filterChain}`);

    return [
      // 입력 파일
      "-i",
      inputPath,

      // 스레드 최적화
      "-threads",
      cpuCount.toString(),

      // 필터 체인 적용
      "-vf",
      filterChain,

      // 출력 프레임 레이트 고정
      "-r",
      framerate,

      // 인코더 옵션
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "medium",
      "-tune",
      "film",
      "-crf",
      crf || "26",

      // 추가 인코딩 최적화
      "-profile:v",
      "high",
      "-level",
      "4.2",
      "-g",
      "50",
      "-movflags",
      "+faststart",
      "-an",
      "-metadata",
      `title=담비 타임랩스 (${speedFactor}x)`,
      "-y",
      outputPath,
    ];
  }

  /**
   * 지원 가능한 품질 옵션 가져오기
   * @returns {Object} 품질 옵션 설정
   */
  getQualityOptions() {
    return {
      low: "낮은 품질 (작은 파일 크기)",
      medium: "중간 품질 (권장)",
      high: "높은 품질 (큰 파일 크기)",
    };
  }

  /**
   * 권장 속도 팩터 범위 가져오기
   * @returns {Object} 속도 팩터 범위
   */
  getRecommendedSpeedFactors() {
    return {
      min: 1,
      max: 20,
      default: 3,
      recommended: [1, 2, 3, 5, 10, 20],
    };
  }
}

module.exports = new TimelapseGenerator();
