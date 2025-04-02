const windowManager = require("./windowManager");
const fs = require("fs");
const path = require("path");

/**
 * FFmpeg 설정 팩토리 클래스 - 단순화된 버전
 * 각 플랫폼 및 녹화 유형에 맞는 FFmpeg 옵션을 생성
 */
class FFmpegConfigFactory {
  /**
   * 비디오 저장 경로 준비
   * @param {string} videoPath 비디오 파일 저장 경로
   * @returns {string} 검증된 비디오 경로
   */
  static prepareVideoPath(videoPath) {
    const videoDir = path.dirname(videoPath);
    if (!fs.existsSync(videoDir)) {
      try {
        fs.mkdirSync(videoDir, { recursive: true });
      } catch (err) {
        console.error("디렉토리 생성 오류:", err);
      }
    }
    return videoPath;
  }

  /**
   * 해상도 정보 가져오기 및 2의 배수로 맞추기
   * @param {Object} targetWindow 대상 창 정보
   * @returns {Object} 조정된 너비와 높이 정보
   */
  static getResolution(targetWindow) {
    let width, height;

    if (targetWindow?.width && targetWindow?.height) {
      width = targetWindow.width;
      height = targetWindow.height;
    } else {
      const resolution = windowManager.getDisplayResolution();
      width = resolution.width;
      height = resolution.height;
    }

    // 너비와 높이를 2의 배수로 조정 (libx264 요구사항)
    width = Math.floor(width / 2) * 2;
    height = Math.floor(height / 2) * 2;

    return { width, height };
  }

  /**
   * 품질 설정 생성 - 단순화된 버전
   * @param {boolean} lowQuality 저품질 모드 사용 여부
   * @returns {Object} 비디오 설정 옵션
   */
  static getVideoOptions(lowQuality = true) {
    // 저품질 모드 (기본)
    if (lowQuality) {
      return {
        framerate: "15",
        preset: "ultrafast",
        crf: "28",
        bufferSize: "2000M",
        threadQueue: "4096",
      };
    }

    // 고품질 모드
    return {
      framerate: "30",
      preset: "veryfast",
      crf: "23",
      bufferSize: "3000M",
      threadQueue: "8192",
    };
  }

  /**
   * FFmpeg 옵션 생성 - 단순화된 인터페이스
   * @param {Object} targetWindow 녹화 대상 창 정보
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션
   * @returns {Array} FFmpeg 명령어 옵션 배열
   */
  static createOptions(targetWindow, videoPath, options = {}) {
    const validatedPath = this.prepareVideoPath(videoPath);

    // 플랫폼별 분기 처리
    const platform = process.platform;

    if (platform === "win32") {
      if (targetWindow && !targetWindow.isScreen) {
        return this.createWindowsWindowOptions(
          targetWindow,
          validatedPath,
          options
        );
      }
      return this.createWindowsScreenOptions(
        targetWindow,
        validatedPath,
        options
      );
    } else if (platform === "darwin") {
      return this.createMacOSOptions(targetWindow, validatedPath, options);
    } else {
      return this.createLinuxOptions(targetWindow, validatedPath, options);
    }
  }

  /**
   * Windows 개별 창 캡처 옵션 생성 - 단순화된 버전
   */
  static createWindowsWindowOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = true, lowQuality = true } = options;
    const videoOptions = this.getVideoOptions(lowQuality);
    const { width, height } = this.getResolution(targetWindow);

    // 창 이름에 특수문자나 한글이 있는지 확인
    const hasSpecialChars = /[<>:"\/\\|?*]/.test(targetWindow.name);

    // 특수문자가 있거나 창 좌표가 있으면 좌표 기반 캡처 사용
    if (
      hasSpecialChars ||
      (targetWindow.x !== undefined && targetWindow.width)
    ) {
      console.log("좌표 기반 창 캡처 모드 사용");

      // 좌표 기반 캡처
      return [
        "-loglevel",
        options.logLevel || "warning",
        "-f",
        "gdigrab",
        "-rtbufsize",
        videoOptions.bufferSize,
        "-thread_queue_size",
        videoOptions.threadQueue,
        "-framerate",
        videoOptions.framerate,
        "-draw_mouse",
        showMouse ? "1" : "0",
        "-offset_x",
        Math.max(0, targetWindow.x || 0).toString(),
        "-offset_y",
        Math.max(0, targetWindow.y || 0).toString(),
        "-video_size",
        `${width}x${height}`,
        "-i",
        "desktop",
        "-c:v",
        "libx264",
        "-preset",
        videoOptions.preset,
        "-crf",
        videoOptions.crf,
        "-pix_fmt",
        "yuv420p",
        videoPath,
      ];
    }

    // 창 이름 기반 캡처 (기본)
    console.log("창 이름 기반 캡처 모드 사용");
    return [
      "-loglevel",
      options.logLevel || "warning",
      "-f",
      "gdigrab",
      "-rtbufsize",
      videoOptions.bufferSize,
      "-thread_queue_size",
      videoOptions.threadQueue,
      "-framerate",
      videoOptions.framerate,
      "-draw_mouse",
      showMouse ? "1" : "0",
      "-i",
      `title=${targetWindow.name}`,
      "-c:v",
      "libx264",
      "-preset",
      videoOptions.preset,
      "-crf",
      videoOptions.crf,
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ];
  }

  /**
   * Windows 전체 화면 캡처 옵션 생성 - 단순화된 버전
   */
  static createWindowsScreenOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = true, lowQuality = true } = options;
    const videoOptions = this.getVideoOptions(lowQuality);

    // 특정 모니터 캡처를 위한 좌표 및 크기 설정
    let offsetX = 0;
    let offsetY = 0;
    let width = 1920;
    let height = 1080;

    if (targetWindow && targetWindow.isScreen) {
      // 선택된 모니터의 좌표와 크기를 사용
      console.log(
        `모니터 캡처 - 좌표: (${targetWindow.x}, ${targetWindow.y}), 크기: ${targetWindow.width}x${targetWindow.height}`
      );
      offsetX = Math.max(0, targetWindow.x || 0);
      offsetY = Math.max(0, targetWindow.y || 0);
      width = targetWindow.width || width;
      height = targetWindow.height || height;
    } else {
      // 선택된 모니터 정보가 없으면 주 모니터 정보 사용
      const resolution = this.getResolution(targetWindow);
      width = resolution.width;
      height = resolution.height;
      console.log(`주 모니터 캡처 - 크기: ${width}x${height}`);
    }

    // 너비와 높이가 2의 배수가 되도록 조정
    width = Math.floor(width / 2) * 2;
    height = Math.floor(height / 2) * 2;

    return [
      "-loglevel",
      options.logLevel || "warning",
      "-f",
      "gdigrab",
      "-rtbufsize",
      videoOptions.bufferSize,
      "-thread_queue_size",
      videoOptions.threadQueue,
      "-framerate",
      videoOptions.framerate,
      "-draw_mouse",
      showMouse ? "1" : "0",
      "-offset_x",
      offsetX.toString(),
      "-offset_y",
      offsetY.toString(),
      "-video_size",
      `${width}x${height}`,
      "-i",
      "desktop",
      "-c:v",
      "libx264",
      "-preset",
      videoOptions.preset,
      "-crf",
      videoOptions.crf,
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ];
  }

  /**
   * macOS 화면 캡처 옵션 생성 - 단순화된 버전
   */
  static createMacOSOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = true, lowQuality = true } = options;
    const videoOptions = this.getVideoOptions(lowQuality);
    const { width, height } = this.getResolution(targetWindow);

    return [
      "-loglevel",
      options.logLevel || "warning",
      "-f",
      "avfoundation",
      "-framerate",
      "20",
      "-capture_cursor",
      showMouse ? "1" : "0",
      "-video_size",
      `${width}x${height}`,
      "-i",
      "1:0",
      "-c:v",
      "libx264",
      "-preset",
      videoOptions.preset,
      "-crf",
      videoOptions.crf,
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ];
  }

  /**
   * Linux 화면 캡처 옵션 생성 - 단순화된 버전
   */
  static createLinuxOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = true, lowQuality = true } = options;
    const videoOptions = this.getVideoOptions(lowQuality);
    const { width, height } = this.getResolution(targetWindow);

    return [
      "-loglevel",
      options.logLevel || "warning",
      "-f",
      "x11grab",
      "-framerate",
      "20",
      "-draw_mouse",
      showMouse ? "1" : "0",
      "-video_size",
      `${width}x${height}`,
      "-i",
      ":0.0",
      "-c:v",
      "libx264",
      "-preset",
      videoOptions.preset,
      "-crf",
      videoOptions.crf,
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ];
  }
}

module.exports = FFmpegConfigFactory;
