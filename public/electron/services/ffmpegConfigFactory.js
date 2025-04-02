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
    // 다른 경로를 시도해 봅니다 (테스트용)
    const homedir = require("os").homedir();
    const testVideoPath = path.join(homedir, "Videos", "test_recording.mp4");

    console.log("원래 비디오 저장 경로:", videoPath);
    console.log("테스트용 비디오 저장 경로:", testVideoPath);

    const videoDir = path.dirname(testVideoPath);
    if (!fs.existsSync(videoDir)) {
      try {
        console.log("비디오 저장 디렉토리 생성:", videoDir);
        fs.mkdirSync(videoDir, { recursive: true });
      } catch (err) {
        console.error("디렉토리 생성 오류:", err);
      }
    }

    return testVideoPath; // 테스트용 경로 반환
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
      "ultrafast", // 가장 빠른 인코딩으로 변경
      "-tune",
      "zerolatency",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
    ];
  }

  /**
   * 마우스 커서 옵션 생성
   * Windows에서 gdigrab의 draw_mouse 옵션:
   * 0 = 마우스 커서 표시 안함
   * 1 = 일반 마우스 커서 표시 (깜빡임 발생 가능)
   * 2 = 하이라이트된 마우스 커서 (깜빡임 문제 해결에 도움)
   *
   * @param {boolean} showMouse 마우스 표시 여부
   * @param {number} mouseMode 마우스 표시 모드 (0, 1, 2)
   * @returns {Array} 마우스 커서 관련 FFmpeg 옵션 배열
   */
  static getMouseOptions(showMouse = true, mouseMode = 2) {
    if (!showMouse) {
      return ["-draw_mouse", "0"]; // 마우스 없음
    }

    // 깜빡임 문제 해결을 위해 기본적으로 모드 2(하이라이트) 사용
    return ["-draw_mouse", mouseMode.toString()];
  }

  /**
   * 플랫폼과 녹화 대상에 맞는 FFmpeg 옵션 생성
   * @param {Object} targetWindow 녹화 대상 창 정보
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션 (선택적)
   * @param {boolean} options.showMouse 마우스 커서 표시 여부 (기본값: false)
   * @param {string} options.logLevel 로그 레벨 (기본값: "warning")
   * @returns {Array} FFmpeg 명령어 옵션 배열
   */
  static createOptions(targetWindow, videoPath, options = {}) {
    // 비디오 저장 경로 준비
    this.prepareVideoPath(videoPath);

    // 기본 옵션 설정
    const { showMouse = false, logLevel = "warning" } = options;
    console.log(`마우스 커서 표시 설정: ${showMouse ? "표시" : "숨김"}`);
    console.log(`로그 레벨 설정: ${logLevel}`);

    let ffmpegOptions;

    if (process.platform === "win32") {
      // Windows 환경
      if (targetWindow && !targetWindow.isScreen) {
        // 개별 창 녹화
        ffmpegOptions = this.createWindowsWindowOptions(
          targetWindow,
          videoPath,
          { showMouse, logLevel }
        );
      } else {
        // 전체 화면 녹화
        ffmpegOptions = this.createWindowsScreenOptions(
          targetWindow,
          videoPath,
          { showMouse, logLevel }
        );
      }
    } else if (process.platform === "darwin") {
      // macOS 환경
      ffmpegOptions = this.createMacOSOptions(targetWindow, videoPath, {
        showMouse,
        logLevel,
      });
    } else {
      // Linux 환경
      ffmpegOptions = this.createLinuxOptions(targetWindow, videoPath, {
        showMouse,
        logLevel,
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
    const { showMouse = true, logLevel = "info" } = options;
    const windowTitle = targetWindow.name;
    console.log("녹화할 창 제목:", windowTitle);

    const { width, height } = this.getResolution(targetWindow);

    // title 옵션으로 창 제목으로 녹화
    return [
      "-loglevel",
      logLevel,
      "-f",
      "gdigrab",
      // 개별 창 녹화를 위해 title 사용
      "-i",
      `title=${windowTitle}`,
      "-vcodec",
      "libx264",
      "-preset",
      "ultrafast",
      "-qp",
      "0",
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
    const { showMouse = true, logLevel = "info" } = options;
    console.log("전체 화면 녹화 설정");

    const { width, height } = this.getResolution(targetWindow);
    console.log(`녹화 해상도 설정: ${width}x${height}`);

    // 전체 화면 녹화 시 특정 모니터 해상도와 위치 지정
    return [
      "-loglevel",
      logLevel,
      "-f",
      "gdigrab",
      // 특정 모니터 영역만 캡처하기 위한 설정
      "-offset_x",
      targetWindow?.x || "0", // 모니터 시작 X좌표
      "-offset_y",
      targetWindow?.y || "0", // 모니터 시작 Y좌표
      "-video_size",
      `${width}x${height}`, // 모니터 해상도
      "-draw_mouse",
      showMouse ? "1" : "0", // 마우스 커서 설정
      "-i",
      "desktop",
      "-vcodec",
      "libx264",
      "-preset",
      "ultrafast",
      "-qp",
      "0",
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
    const { showMouse = false, logLevel = "info" } = options;
    console.log("macOS 녹화 설정");

    const { width, height } = this.getResolution(targetWindow);
    console.log(`macOS 녹화 해상도 설정: ${width}x${height}`);

    // MacOS에서는 draw_mouse 대신 capture_cursor 옵션 사용
    // capture_cursor 0 = 마우스 커서 미포함, 1 = 포함
    const captureMouseOptions = ["-capture_cursor", showMouse ? "1" : "0"];

    return [
      "-hide_banner",
      "-loglevel",
      logLevel,
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
    const { showMouse = false, logLevel = "info" } = options;
    console.log("Linux 녹화 설정");

    const { width, height } = this.getResolution(targetWindow);
    console.log(`Linux 녹화 해상도 설정: ${width}x${height}`);

    // Linux에서는 draw_mouse 옵션 사용 (0=미표시, 1=표시)
    const drawMouseOptions = ["-draw_mouse", showMouse ? "1" : "0"];

    return [
      "-hide_banner",
      "-loglevel",
      logLevel,
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
