const windowManager = require("./windowManager");
const fs = require("fs");
const path = require("path");

/**
 * FFmpeg 설정 팩토리 클래스
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
   * 해상도 정보 가져오기
   * @param {Object} targetWindow 대상 창 정보
   * @returns {Object} 너비와 높이 정보
   */
  static getResolution(targetWindow) {
    if (targetWindow?.width && targetWindow?.height) {
      return { width: targetWindow.width, height: targetWindow.height };
    }
    const resolution = windowManager.getDisplayResolution();
    return { width: resolution.width, height: resolution.height };
  }

  /**
   * 품질 및 인코딩 옵션 생성
   * @param {Object} options 옵션 설정
   * @returns {Object} 비디오 설정 옵션
   */
  static getVideoOptions(options = {}) {
    const { ultraLight = false, lowQuality = true } = options;

    // 초경량 모드
    if (ultraLight) {
      return {
        framerate: "10",
        qp: "35",
        crf: "40",
        preset: "veryfast",
        bufferSize: "1000M",
        scale: 0.5,
        threadQueue: "1024",
        probesize: "10M",
        priority: "normal",
        vsync: "2",
        additional: [
          "-me_method",
          "dia",
          "-subq",
          "1",
          "-refs",
          "1",
          "-threads",
          "2",
          "-g",
          "20",
        ],
      };
    }

    // 일반 품질 모드
    if (!lowQuality) {
      return {
        framerate: "30",
        qp: "0",
        crf: "23",
        preset: "ultrafast",
        bufferSize: "4000M",
        threadQueue: "8192",
        probesize: "100M",
        priority: "high",
        vsync: "1",
        additional: [],
      };
    }

    // 저품질 모드
    return {
      framerate: "15",
      qp: "28",
      crf: "32",
      preset: "ultrafast",
      bufferSize: "4000M",
      threadQueue: "8192",
      probesize: "100M",
      priority: "high",
      vsync: "1",
      additional: [],
    };
  }

  /**
   * 플랫폼별 옵션 생성
   * @param {Object} targetWindow 녹화 대상 창 정보
   * @param {string} videoPath 비디오 저장 경로
   * @param {Object} options 추가 옵션
   * @returns {Array} FFmpeg 명령어 옵션 배열
   */
  static createOptions(targetWindow, videoPath, options = {}) {
    const validatedPath = this.prepareVideoPath(videoPath);

    // 플랫폼별 옵션 생성
    const platformOptionsMap = {
      win32: () => {
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
      },
      darwin: () =>
        this.createMacOSOptions(targetWindow, validatedPath, options),
      linux: () =>
        this.createLinuxOptions(targetWindow, validatedPath, options),
    };

    // 현재 플랫폼에 맞는 옵션 생성 함수 호출
    const platformFn =
      platformOptionsMap[process.platform] || platformOptionsMap.linux;
    return platformFn();
  }

  /**
   * Windows 개별 창 캡처 옵션 생성
   */
  static createWindowsWindowOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = true } = options;
    const videoOptions = this.getVideoOptions(options);
    const logLevel = options.logLevel || "info";

    return [
      "-loglevel",
      logLevel,
      "-f",
      "gdigrab",
      "-rtbufsize",
      "2000M",
      "-thread_queue_size",
      "4096",
      "-framerate",
      videoOptions.framerate,
      "-vsync",
      "cfr",
      "-draw_mouse",
      showMouse ? "2" : "0",
      "-i",
      `title=${targetWindow.name}`,
      "-vcodec",
      "libx264",
      "-preset",
      videoOptions.preset,
      "-qp",
      videoOptions.qp,
      videoPath,
    ];
  }

  /**
   * Windows 전체 화면 캡처 옵션 생성
   */
  static createWindowsScreenOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = true } = options;
    const videoOptions = this.getVideoOptions(options);
    const logLevel = options.logLevel || "info";
    let { width, height } = this.getResolution(targetWindow);

    // 초경량 모드에서는 해상도 축소
    const ultraLight = options.ultraLight || false;
    if (ultraLight) {
      width = Math.floor(width * videoOptions.scale);
      height = Math.floor(height * videoOptions.scale);
    }

    // 기본 옵션
    const baseOptions = [
      "-loglevel",
      logLevel,
      "-priority_class",
      videoOptions.priority,
      "-f",
      "gdigrab",
      "-rtbufsize",
      videoOptions.bufferSize,
      "-thread_queue_size",
      videoOptions.threadQueue,
      "-probesize",
      videoOptions.probesize,
      "-draw_mouse",
      showMouse ? "1" : "0",
      "-framerate",
      videoOptions.framerate,
      "-vsync",
      videoOptions.vsync,
    ];

    // 캡처 영역
    const captureOptions = [
      "-offset_x",
      targetWindow?.x || "0",
      "-offset_y",
      targetWindow?.y || "0",
      "-video_size",
      `${width}x${height}`,
      "-i",
      "desktop",
    ];

    // 인코딩
    const encodingOptions = [
      "-hwaccel",
      "auto",
      ...(process.env.HAS_NVIDIA_GPU === "true"
        ? ["-c:v", "h264_nvenc"]
        : ["-c:v", "libx264"]),
      "-preset",
      videoOptions.preset,
      "-qp",
      videoOptions.qp,
    ];

    // 스케일링 필터 (초경량 모드일 때만)
    const filterOptions = ultraLight ? [`-vf scale=${width}:${height}`] : [];

    // 최종 옵션 배열
    return [
      ...baseOptions,
      ...captureOptions,
      ...encodingOptions,
      ...videoOptions.additional,
      ...filterOptions,
      videoPath,
    ].filter(Boolean);
  }

  /**
   * macOS 화면 캡처 옵션 생성
   */
  static createMacOSOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = false } = options;
    const videoOptions = this.getVideoOptions(options);
    const logLevel = options.logLevel || "info";
    const { width, height } = this.getResolution(targetWindow);

    return [
      "-hide_banner",
      "-loglevel",
      logLevel,
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
   * Linux 화면 캡처 옵션 생성
   */
  static createLinuxOptions(targetWindow, videoPath, options = {}) {
    const { showMouse = false } = options;
    const videoOptions = this.getVideoOptions(options);
    const logLevel = options.logLevel || "info";
    const { width, height } = this.getResolution(targetWindow);

    return [
      "-hide_banner",
      "-loglevel",
      logLevel,
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
