const os = require("os");
const { execSync } = require("child_process");
const fs = require("fs");

/**
 * FFmpeg 명령 생성을 담당하는 클래스
 * 타임랩스 생성에 필요한 FFmpeg 명령어를 구성합니다.
 */
class FFmpegCommandBuilder {
  constructor() {
    this.cpuCount = Math.max(4, os.cpus().length);
  }

  /**
   * 비디오 해상도 추출
   * @param {string} ffprobePath - FFprobe 실행 파일 경로
   * @param {string} inputPath - 입력 비디오 경로
   * @returns {Object|null} 비디오 해상도 (width, height) 또는 null
   */
  getVideoResolution(ffprobePath, inputPath) {
    try {
      if (!fs.existsSync(inputPath)) {
        console.error(
          `FFprobe 오류: 입력 파일이 존재하지 않습니다 - ${inputPath}`
        );
        return null;
      }

      const cmd = `"${ffprobePath}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`;
      const result = execSync(cmd).toString().trim();

      if (result && result.includes("x")) {
        const [width, height] = result.split("x").map(Number);
        console.log(`FFprobe로 확인된 실제 비디오 해상도: ${width}x${height}`);
        return { width, height };
      }
    } catch (error) {
      console.error("비디오 해상도 확인 중 오류:", error.message);
    }

    return null;
  }

  /**
   * 블러 필터 생성
   * @param {Array} blurRegions - 블러 영역 배열
   * @param {number} scaleX - X축 스케일링 비율
   * @param {number} scaleY - Y축 스케일링 비율
   * @param {number} videoWidth - 비디오 너비
   * @param {number} videoHeight - 비디오 높이
   * @returns {Object} 블러 필터 정보 (filterChain, validRegions)
   */
  buildBlurFilter(blurRegions, scaleX, scaleY, videoWidth, videoHeight) {
    // 유효한 블러 영역이 없는 경우
    if (!blurRegions || blurRegions.length === 0) {
      return { validRegions: [], hasValidRegions: false };
    }

    console.log(`블러 영역: ${blurRegions.length}개 적용`);

    // 블러 필터 체인 구성을 위한 배열
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

    return {
      validRegions: validBlurRegions,
      hasValidRegions: validBlurRegions.length > 0,
    };
  }

  /**
   * 스케일링 비율 계산
   * @param {number} videoWidth - 비디오 너비
   * @param {number} videoHeight - 비디오 높이
   * @param {number} thumbnailWidth - 썸네일 너비
   * @param {number} thumbnailHeight - 썸네일 높이
   * @returns {Object} 스케일링 비율 및 정보
   */
  calculateScalingRatio(
    videoWidth,
    videoHeight,
    thumbnailWidth,
    thumbnailHeight
  ) {
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
    let needsAspectRatioCorrection = false;
    let thumbToVideoRatio = 1;
    let centerOffsetX = 0;
    let centerOffsetY = 0;

    if (aspectRatioDifference > 0.01) {
      console.log(`종횡비 불일치 감지됨: 좌표 변환 보정 적용`);
      needsAspectRatioCorrection = true;

      // 스케일링 방식 결정 (비디오 프레임에 맞추기)
      // 블러 영역이 비디오 범위 내에 정확히 위치하도록 조정
      thumbToVideoRatio = Math.min(
        videoWidth / thumbnailWidth,
        videoHeight / thumbnailHeight
      );

      // 비디오 중앙을 기준으로 정렬할 때 오프셋 계산
      centerOffsetX = (videoWidth - thumbnailWidth * thumbToVideoRatio) / 2;
      centerOffsetY = (videoHeight - thumbnailHeight * thumbToVideoRatio) / 2;

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

    return {
      scaleX,
      scaleY,
      needsAspectRatioCorrection,
      thumbToVideoRatio,
      centerOffsetX,
      centerOffsetY,
      aspectRatioDifference,
    };
  }

  /**
   * 속도 필터 생성
   * @param {number} speedFactor - 속도 팩터
   * @returns {Object} 속도 필터 및 프레임 레이트 정보
   */
  buildSpeedFilter(speedFactor) {
    let speedFilter;
    let framerate = "30"; // 기본 출력 프레임 레이트

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

    return { speedFilter, framerate };
  }

  /**
   * 필터 체인 구성
   * @param {string} speedFilter - 속도 필터
   * @param {Array} validBlurRegions - 유효한 블러 영역
   * @returns {string} 완성된 필터 체인
   */
  buildFilterChain(speedFilter, validBlurRegions) {
    // 블러 영역이 없는 경우 기본 필터만 적용
    if (!validBlurRegions || validBlurRegions.length === 0) {
      return `${speedFilter},scale=-2:1080:flags=lanczos`;
    }

    // 단일 블러 영역일 경우 단순한 필터 체인 사용
    if (validBlurRegions.length === 1) {
      const { x, y, width, height } = validBlurRegions[0];

      // 단일 필터 체인 구성 (향상된 블러 파라미터)
      return [
        speedFilter,
        `split=2[base][crop]`,
        `[crop]crop=${width}:${height}:${x}:${y},boxblur=20:2[blurred]`,
        `[base][blurred]overlay=${x}:${y}`,
        `scale=-2:1080:flags=lanczos`,
      ].join(",");
    }

    // 다중 블러 영역 처리 (최대 3개까지만 처리)
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
    return filterParts.join(",");
  }

  /**
   * FFmpeg 명령행 인자 구성
   * @param {string} inputPath - 입력 파일 경로
   * @param {string} outputPath - 출력 파일 경로
   * @param {Object} options - 인코딩 옵션
   * @returns {Array<string>} FFmpeg 명령행 인자
   */
  buildFFmpegArgs(inputPath, outputPath, options) {
    const { speedFactor, crf, blurRegions = [] } = options;

    // 원본 비디오 해상도 (options에서 가져오기)
    let videoWidth = options.videoWidth || 1920;
    let videoHeight = options.videoHeight || 1080;

    // 썸네일 해상도 (옵션에서 제공되지 않으면 기본값 사용)
    const thumbnailWidth = options.thumbnailWidth || 320;
    const thumbnailHeight = options.thumbnailHeight || 240;

    console.log(`============ 해상도 정보 ============`);
    console.log(`원본 비디오 해상도: ${videoWidth}x${videoHeight}`);
    console.log(`썸네일 해상도: ${thumbnailWidth}x${thumbnailHeight}`);

    // 스케일링 비율 계산
    const scaling = this.calculateScalingRatio(
      videoWidth,
      videoHeight,
      thumbnailWidth,
      thumbnailHeight
    );

    // 속도 필터 생성
    const { speedFilter, framerate } = this.buildSpeedFilter(speedFactor);

    // 블러 필터 생성
    const blurInfo = this.buildBlurFilter(
      blurRegions,
      scaling.scaleX,
      scaling.scaleY,
      videoWidth,
      videoHeight
    );

    // 최종 필터 체인 구성
    const filterChain = this.buildFilterChain(
      speedFilter,
      blurInfo.validRegions
    );
    console.log(`최종 필터 체인: ${filterChain}`);

    return [
      // 입력 파일
      "-i",
      inputPath,

      // 스레드 최적화
      "-threads",
      this.cpuCount.toString(),

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
}

module.exports = new FFmpegCommandBuilder();
