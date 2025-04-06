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

    // 원본 비디오 해상도 (options에서 가져오기)
    let videoWidth, videoHeight;

    // 1. 옵션에서 직접 제공된 실제 해상도 사용
    if (options.videoWidth && options.videoHeight) {
      videoWidth = options.videoWidth;
      videoHeight = options.videoHeight;
      console.log(
        `옵션에서 제공된 비디오 해상도: ${videoWidth}x${videoHeight}`
      );
    }
    // 2. FFprobe를 시도해 볼 수 있는 경우에만 시도
    else {
      try {
        // FFprobe 모듈 존재 여부 확인
        const ffprobeStatic = require("ffprobe-static");
        const ffprobePath = ffprobeStatic.path;

        // 동기식으로 비디오 해상도 가져오기
        const { execSync } = require("child_process");
        const cmd = `"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`;
        const result = execSync(cmd).toString().trim();

        if (result && result.includes("x")) {
          const [width, height] = result.split("x").map(Number);
          videoWidth = width;
          videoHeight = height;
          console.log(
            `FFprobe로 확인된 실제 비디오 해상도: ${videoWidth}x${videoHeight}`
          );
        } else {
          // 기본값 사용
          videoWidth = 1920;
          videoHeight = 1080;
          console.log(
            `FFprobe 결과가 없어 기본 해상도 사용: ${videoWidth}x${videoHeight}`
          );
        }
      } catch (e) {
        // FFprobe 오류 시 기본값 사용
        console.error("비디오 해상도 확인 중 오류:", e.message);
        videoWidth = options.videoWidth || 1920;
        videoHeight = options.videoHeight || 1080;
        console.log(
          `오류로 인해 기본 해상도 사용: ${videoWidth}x${videoHeight}`
        );
      }
    }

    // 썸네일 해상도 (옵션에서 제공되지 않으면 기본값 사용)
    const thumbnailWidth = options.thumbnailWidth || 320;
    const thumbnailHeight = options.thumbnailHeight || 240;

    console.log(`============ 해상도 정보 ============`);
    console.log(`원본 비디오 해상도: ${videoWidth}x${videoHeight}`);
    console.log(`썸네일 해상도: ${thumbnailWidth}x${thumbnailHeight}`);

    // 종횡비 확인
    const videoAspectRatio = videoWidth / videoHeight;
    const thumbnailAspectRatio = thumbnailWidth / thumbnailHeight;

    console.log(`비디오 종횡비: ${videoAspectRatio.toFixed(3)}`);
    console.log(`썸네일 종횡비: ${thumbnailAspectRatio.toFixed(3)}`);

    // 종횡비 차이 확인
    const aspectRatioDifference = Math.abs(
      videoAspectRatio - thumbnailAspectRatio
    );
    console.log(`종횡비 차이: ${aspectRatioDifference.toFixed(3)}`);

    // 스케일링 비율 계산 - 종횡비 차이 고려
    let scaleX = videoWidth / thumbnailWidth;
    let scaleY = videoHeight / thumbnailHeight;

    // 종횡비 차이가 유의미한 경우 (1% 이상) 보정 로직 적용
    if (aspectRatioDifference > 0.01) {
      console.log(`종횡비 불일치 감지됨: 좌표 변환 보정 적용`);

      // 스케일링 방식 결정 (비디오 프레임에 맞추기)
      // 블러 영역이 비디오 범위 내에 정확히 위치하도록 조정
      const thumbToVideoRatio = Math.min(
        videoWidth / thumbnailWidth,
        videoHeight / thumbnailHeight
      );

      // 비디오 중앙을 기준으로 정렬할 때 오프셋 계산
      const centerOffsetX =
        (videoWidth - thumbnailWidth * thumbToVideoRatio) / 2;
      const centerOffsetY =
        (videoHeight - thumbnailHeight * thumbToVideoRatio) / 2;

      console.log(`조정된 변환 비율: ${thumbToVideoRatio.toFixed(3)}`);
      console.log(
        `중앙 오프셋 X: ${centerOffsetX.toFixed(1)}, Y: ${centerOffsetY.toFixed(
          1
        )}`
      );

      // 이 정보를 블러 영역 변환에 활용
      scaleX = thumbToVideoRatio;
      scaleY = thumbToVideoRatio;
    }

    console.log(
      `스케일링 비율: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`
    );
    console.log(`======================================`);

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
      console.log(`블러 영역 원본 좌표:`, JSON.stringify(blurRegions[0]));

      // 블러 필터 체인 구성을 위한 배열
      const blurFilters = [];
      const validBlurRegions = [];

      // 각 블러 영역을 처리
      for (let i = 0; i < blurRegions.length; i++) {
        const region = blurRegions[i];

        // 경계 확인 - 영역이 음수 값이거나 너무 작은 경우 보정
        const safeRegion = {
          x: Math.max(0, region.x),
          y: Math.max(0, region.y),
          width: Math.max(10, region.width),
          height: Math.max(10, region.height),
        };

        // 썸네일에서 원본 비디오 해상도로 좌표 변환
        const x = Math.round(safeRegion.x * scaleX);
        const y = Math.round(safeRegion.y * scaleY);
        const width = Math.round(safeRegion.width * scaleX);
        const height = Math.round(safeRegion.height * scaleY);

        // 너무 작은 블러 영역은 크기 보정
        const minBlurSize = 20; // 최소 블러 크기
        const adjustedWidth = Math.max(minBlurSize, width);
        const adjustedHeight = Math.max(minBlurSize, height);

        console.log(
          `원본 블러 좌표(썸네일) #${i + 1}: x=${safeRegion.x}, y=${
            safeRegion.y
          }, width=${safeRegion.width}, height=${safeRegion.height}`
        );
        console.log(
          `변환된 블러 좌표(비디오) #${
            i + 1
          }: x=${x}, y=${y}, width=${adjustedWidth}, height=${adjustedHeight}`
        );

        // 변환된 좌표가 비디오 안에 있는지 확인
        const isWithinVideo =
          x >= 0 &&
          y >= 0 &&
          adjustedWidth > 0 &&
          adjustedHeight > 0 &&
          x + adjustedWidth <= videoWidth &&
          y + adjustedHeight <= videoHeight;

        console.log(`비디오 크기 내에 있는지 #${i + 1}: ${isWithinVideo}`);

        // 유효한 블러 영역만 추가
        if (isWithinVideo) {
          validBlurRegions.push({
            index: i,
            x,
            y,
            width: adjustedWidth,
            height: adjustedHeight,
          });
        } else {
          console.log(`블러 영역 #${i + 1}이 비디오 범위를 벗어나 무시됩니다.`);
        }
      }

      // 유효한 블러 영역이 있는 경우
      if (validBlurRegions.length > 0) {
        console.log(`유효한 블러 영역 수: ${validBlurRegions.length}`);

        // 단일 블러 영역일 경우 단순한 필터 체인 사용
        if (validBlurRegions.length === 1) {
          const { x, y, width, height } = validBlurRegions[0];

          // 단일 필터 체인 구성 (향상된 블러 파라미터)
          filterChain = [
            speedFilter,
            `split=2[base][crop]`,
            `[crop]crop=${width}:${height}:${x}:${y},boxblur=20:2[blurred]`,
            `[base][blurred]overlay=${x}:${y}`,
            `scale=-2:1080:flags=lanczos`,
          ].join(",");

          console.log(
            `단일 블러 필터 적용 (x=${x}, y=${y}, width=${width}, height=${height})`
          );
        }
        // 다중 블러 영역 처리 (최대 3개까지만 처리)
        else {
          const maxBlurRegions = Math.min(3, validBlurRegions.length);
          console.log(`다중 블러 필터 적용: ${maxBlurRegions}개`);

          // 복잡한 필터 체인 구성 (다중 블러)
          let filterParts = [speedFilter];

          // 베이스 스트림 분할 (N+1개 스트림으로)
          filterParts.push(
            `split=${maxBlurRegions + 1}[base]${Array(maxBlurRegions)
              .fill("")
              .map((_, i) => `[crop${i}]`)
              .join("")}`
          );

          // 각 블러 영역별 처리
          for (let i = 0; i < maxBlurRegions; i++) {
            const { x, y, width, height } = validBlurRegions[i];
            filterParts.push(
              `[crop${i}]crop=${width}:${height}:${x}:${y},boxblur=20:2[blurred${i}]`
            );
          }

          // 오버레이 적용 (역순으로)
          let currentBase = "[base]";
          for (let i = 0; i < maxBlurRegions; i++) {
            const { x, y } = validBlurRegions[i];
            const nextBase = i < maxBlurRegions - 1 ? `[base${i + 1}]` : "";
            filterParts.push(
              `${currentBase}[blurred${i}]overlay=${x}:${y}${nextBase}`
            );
            currentBase = `[base${i + 1}]`;
          }

          // 최종 스케일링
          filterParts.push("scale=-2:1080:flags=lanczos");

          // 필터 체인 조합
          filterChain = filterParts.join(",");
        }
      } else {
        // 유효한 블러 영역이 없는 경우 기본 필터만 적용
        console.log(`유효한 블러 영역이 없어 기본 필터만 적용합니다.`);
        filterChain = `${speedFilter},scale=-2:1080:flags=lanczos`;
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
