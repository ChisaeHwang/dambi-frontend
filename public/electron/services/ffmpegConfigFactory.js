const windowManager = require("./windowManager");
const fs = require("fs");
const path = require("path");

/**
 * FFmpeg 설정 팩토리 클래스
 * 각 플랫폼 및 녹화 유형에 맞는 FFmpeg 옵션을 생성
 */
class FFmpegConfigFactory {
  /**
   * 비디오 저장 경로 준비 및 로깅
   * @param {string} videoPath 비디오 파일 저장 경로
   * @returns {string} 검증된 비디오 경로
   */
  static prepareVideoPath(videoPath) {
    console.log("비디오 저장 경로:", videoPath);
    const videoDir = path.dirname(videoPath);

    if (!fs.existsSync(videoDir)) {
      console.log("비디오 저장 디렉토리 생성:", videoDir);
      fs.mkdirSync(videoDir, { recursive: true });
    }

    return videoPath;
  }

  /**
   * 해상도 정보 가져오기
   * @param {Object} targetWindow 대상 창 정보
   * @returns {Object} 너비와 높이 정보
   */
  static getResolution(targetWindow) {
    let videoWidth, videoHeight;

    if (targetWindow?.width && targetWindow?.height) {
      videoWidth = targetWindow.width;
      videoHeight = targetWindow.height;
      console.log(`대상 창/화면 해상도: ${videoWidth}x${videoHeight}`);
    } else {
      const resolution = windowManager.getDisplayResolution();
      videoWidth = resolution.width;
      videoHeight = resolution.height;
      console.log(
        `시스템에서 감지한 화면 해상도: ${videoWidth}x${videoHeight}`
      );
    }

    return { width: videoWidth, height: videoHeight };
  }

  /**
   * 공통 인코딩 옵션 생성
   * @returns {Array} 인코딩 관련 FFmpeg 옵션 배열
   */
  static getEncodingOptions() {
    return [
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
    ];
  }

  /**
   * 마우스 커서 옵션 생성
   * Windows에서 gdigrab의 draw_mouse 옵션:
   * 0 = 마우스 커서 표시 안함 (깜빡임 방지)
   * 1 = 일반 마우스 커서 표시 (깜빡임 발생 가능)
   * 2 = 하이라이트된 마우스 커서 (더 두드러짐)
   *
   * @param {boolean} showMouse 마우스 표시 여부
   * @returns {Array} 마우스 커서 관련 FFmpeg 옵션 배열
   */
  static getMouseOptions(showMouse = false) {
    // Windows에서 마우스 깜빡임 문제가 있을 경우 0으로 설정
    return ["-draw_mouse", showMouse ? "1" : "0"];
  }

  /**
   * 플랫폼과 녹화 대상에 맞는 FFmpeg 옵션 생성
   * @param {Object} targetWindow 녹화 대상 창 정보
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션 (선택적)
   * @param {boolean} options.showMouse 마우스 커서 표시 여부 (기본값: false)
   * @returns {Array} FFmpeg 명령어 옵션 배열
   */
  static createOptions(targetWindow, videoPath, options = {}) {
    // 비디오 저장 경로 준비
    this.prepareVideoPath(videoPath);

    // 기본 옵션 설정
    const { showMouse = false } = options;
    console.log(`마우스 커서 표시 설정: ${showMouse ? "표시" : "숨김"}`);

    let ffmpegOptions;

    if (process.platform === "win32") {
      // Windows 환경
      if (targetWindow && !targetWindow.isScreen) {
        // 개별 창 녹화
        ffmpegOptions = this.createWindowsWindowOptions(
          targetWindow,
          videoPath,
          { showMouse }
        );
      } else {
        // 전체 화면 녹화
        ffmpegOptions = this.createWindowsScreenOptions(
          targetWindow,
          videoPath,
          { showMouse }
        );
      }
    } else if (process.platform === "darwin") {
      // macOS 환경
      ffmpegOptions = this.createMacOSOptions(targetWindow, videoPath, {
        showMouse,
      });
    } else {
      // Linux 환경
      ffmpegOptions = this.createLinuxOptions(targetWindow, videoPath, {
        showMouse,
      });
    }

    // FFmpeg 명령어 로깅
    console.log("실행할 FFmpeg 명령어:", "ffmpeg", ffmpegOptions.join(" "));
    return ffmpegOptions;
  }

  /**
   * Windows 개별 창 캡처 옵션 생성
   * @param {Object} targetWindow 대상 창 정보
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션
   * @returns {Array} FFmpeg 옵션 배열
   */
  static createWindowsWindowOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = false } = options;
    const windowTitle = targetWindow.name;
    console.log("녹화할 창 제목:", windowTitle);

    const { width, height } = this.getResolution(targetWindow);

    return [
      "-hide_banner",
      "-loglevel",
      "warning",
      "-f",
      "gdigrab",
      "-framerate",
      "60",
      ...this.getMouseOptions(showMouse),
      "-avoid_negative_ts",
      "make_zero",
      "-probesize",
      "42M",
      "-thread_queue_size",
      "1024",
      "-offset_x",
      "0",
      "-offset_y",
      "0",
      "-video_size",
      `${width}x${height}`,
      "-i",
      `title=${windowTitle}`,
      ...this.getEncodingOptions(),
      videoPath,
    ];
  }

  /**
   * Windows 전체 화면 캡처 옵션 생성
   * @param {Object} targetWindow 대상 창 정보 (선택적)
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션
   * @returns {Array} FFmpeg 옵션 배열
   */
  static createWindowsScreenOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = false } = options;
    console.log("전체 화면 녹화 설정");

    const { width, height } = this.getResolution(targetWindow);
    console.log(`녹화 해상도 설정: ${width}x${height}`);

    return [
      "-hide_banner",
      "-loglevel",
      "warning",
      "-f",
      "gdigrab",
      "-framerate",
      "60",
      ...this.getMouseOptions(showMouse),
      "-avoid_negative_ts",
      "make_zero",
      "-probesize",
      "42M",
      "-thread_queue_size",
      "1024",
      "-offset_x",
      "0",
      "-offset_y",
      "0",
      "-video_size",
      `${width}x${height}`,
      "-i",
      "desktop",
      ...this.getEncodingOptions(),
      videoPath,
    ];
  }

  /**
   * macOS 화면 캡처 옵션 생성
   * @param {Object} targetWindow 대상 창 정보 (선택적)
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션
   * @returns {Array} FFmpeg 옵션 배열
   */
  static createMacOSOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = false } = options;
    console.log("macOS 녹화 설정");

    const { width, height } = this.getResolution(targetWindow);
    console.log(`macOS 녹화 해상도 설정: ${width}x${height}`);

    // MacOS에서는 draw_mouse 대신 capture_cursor 옵션 사용
    // capture_cursor 0 = 마우스 커서 미포함, 1 = 포함
    const captureMouseOptions = ["-capture_cursor", showMouse ? "1" : "0"];

    return [
      "-hide_banner",
      "-loglevel",
      "info",
      "-f",
      "avfoundation",
      "-framerate",
      "20",
      ...captureMouseOptions,
      "-video_size",
      `${width}x${height}`,
      "-i",
      "1:0", // 화면:오디오 (오디오 없음)
      ...this.getEncodingOptions(),
      videoPath,
    ];
  }

  /**
   * Linux 화면 캡처 옵션 생성
   * @param {Object} targetWindow 대상 창 정보 (선택적)
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션
   * @returns {Array} FFmpeg 옵션 배열
   */
  static createLinuxOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = false } = options;
    console.log("Linux 녹화 설정");

    const { width, height } = this.getResolution(targetWindow);
    console.log(`Linux 녹화 해상도 설정: ${width}x${height}`);

    // Linux에서는 draw_mouse 옵션 사용 (0=미표시, 1=표시)
    const drawMouseOptions = ["-draw_mouse", showMouse ? "1" : "0"];

    return [
      "-hide_banner",
      "-loglevel",
      "info",
      "-f",
      "x11grab",
      "-framerate",
      "20",
      ...drawMouseOptions,
      "-video_size",
      `${width}x${height}`,
      "-i",
      ":0.0",
      ...this.getEncodingOptions(),
      videoPath,
    ];
  }
}

module.exports = FFmpegConfigFactory;
