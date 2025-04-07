const {
  desktopCapturer,
  BrowserWindow,
  ipcMain,
  screen,
  app,
} = require("electron");
const path = require("path");
const storageManager = require("./storage-manager");
const RecorderTemplate = require("./recorder-template");
const EventEmitter = require("events");

/**
 * 녹화 소스 관리 클래스
 */
class SourceManager {
  constructor() {
    this._hasInitializedResolution = false;
  }

  /**
   * 화면 해상도 초기화
   */
  async initializeScreenResolution() {
    try {
      if (!app.isReady()) {
        console.log("Electron 앱이 아직 준비되지 않음, 기본 해상도 사용");
        return;
      }

      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.bounds;
      const { width: workWidth, height: workHeight } =
        primaryDisplay.workAreaSize;

      console.log(`주 디스플레이 실제 해상도: ${width}x${height}`);
      console.log(`주 디스플레이 작업 영역: ${workWidth}x${workHeight}`);

      this._hasInitializedResolution = true;
      return { width, height };
    } catch (error) {
      console.error("화면 해상도 초기화 중 오류:", error.message);
      return { width: 1920, height: 1080 };
    }
  }

  /**
   * 캡처 소스 목록 가져오기
   */
  async getCaptureSources() {
    if (!this._hasInitializedResolution) {
      await this.initializeScreenResolution();
    }

    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 300, height: 300 },
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.id.startsWith("screen:")
          ? `모니터 ${source.id.split(":")[1]}`
          : source.name,
        thumbnailDataUrl: source.thumbnail.toDataURL(),
        thumbnailWidth: source.thumbnail.getSize().width,
        thumbnailHeight: source.thumbnail.getSize().height,
        isScreen: source.id.startsWith("screen:"),
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error("활성 창 목록 가져오기 오류:", error);
      throw error;
    }
  }

  /**
   * 특정 소스 찾기
   */
  async findCaptureSource(windowId) {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: { width: 300, height: 300 },
    });

    const selectedSource = sources.find((source) => source.id === windowId);

    if (!selectedSource) {
      throw new Error(`지정된 창을 찾을 수 없습니다: ${windowId}`);
    }

    return selectedSource;
  }
}

/**
 * 녹화 설정 관리 클래스
 */
class RecorderConfig {
  constructor() {
    this.config = {
      fps: 30,
      videoBitrate: 6000,
      videoSize: {
        width: 1920,
        height: 1080,
      },
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    return this.config;
  }

  calculateEstimatedResolution(source) {
    const { width, height } = this.config.videoSize;
    let estimatedWidth = width;
    let estimatedHeight = height;

    if (!source.id.startsWith("screen:") && source.thumbnail) {
      try {
        const thumbnailSize = source.thumbnail.getSize();
        if (thumbnailSize.width > 0 && thumbnailSize.height > 0) {
          const aspectRatio = thumbnailSize.width / thumbnailSize.height;

          if (aspectRatio > 1) {
            estimatedWidth = Math.min(width, Math.round(height * aspectRatio));
            estimatedHeight = Math.min(
              height,
              Math.round(estimatedWidth / aspectRatio)
            );
          } else {
            estimatedHeight = Math.min(height, Math.round(width / aspectRatio));
            estimatedWidth = Math.min(
              width,
              Math.round(estimatedHeight * aspectRatio)
            );
          }
        }
      } catch (error) {
        console.error("해상도 추정 중 오류:", error);
      }
    }

    return { width: estimatedWidth, height: estimatedHeight };
  }
}

/**
 * 녹화 세션 관리 클래스
 */
class RecordingSession extends EventEmitter {
  constructor() {
    super();
    this.recorder = null;
    this.recorderWindow = null;
    this.sourceManager = new SourceManager();
    this.config = new RecorderConfig();
  }

  async startMainProcessRecording(source, outputPath) {
    try {
      const electronScreenRecorder = require("electron-screen-recorder");

      if (typeof electronScreenRecorder.createRecorder === "function") {
        this.recorder = electronScreenRecorder.createRecorder();
      } else if (typeof electronScreenRecorder.ScreenRecorder === "function") {
        this.recorder = new electronScreenRecorder.ScreenRecorder();
      } else if (
        electronScreenRecorder.default &&
        typeof electronScreenRecorder.default !== "function"
      ) {
        this.recorder = electronScreenRecorder.default;
      } else {
        throw new Error(
          "지원되지 않는 electron-screen-recorder API 형식입니다."
        );
      }

      const recordOptions = {
        fps: this.config.config.fps,
        videoSource: source.id,
        outputFilePath: outputPath,
        width: this.config.config.videoSize.width,
        height: this.config.config.videoSize.height,
        showCursor: true,
      };

      if (typeof this.recorder.startRecording === "function") {
        await this.recorder.startRecording(recordOptions);
      } else if (typeof this.recorder.start === "function") {
        await this.recorder.start(recordOptions);
      } else {
        throw new Error("레코더에 녹화 시작 메서드가 없습니다.");
      }

      this.emit("recordingStarted");
      return true;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  async startRendererProcessRecording(source, outputPath, captureDir) {
    try {
      if (this.recorderWindow) {
        this.recorderWindow.close();
        this.recorderWindow = null;
      }

      const { width, height } =
        this.config.calculateEstimatedResolution(source);
      const { fps, videoBitrate } = this.config.config;

      const metadataPath = path.join(captureDir, "metadata.json");
      const metaDataUpdates = {
        captureType: source.id.startsWith("screen:") ? "screen" : "window",
        videoSize: {
          width,
          height,
          original: this.config.config.videoSize,
        },
        sourceId: source.id,
        sourceName: source.name,
        thumbnailInfo: source.thumbnail
          ? {
              width: source.thumbnail.getSize().width,
              height: source.thumbnail.getSize().height,
            }
          : null,
      };

      await storageManager.updateMetadata(metadataPath, metaDataUpdates);

      const recorderHtmlPath = path.join(captureDir, "recorder.html");
      const recorderHtml = RecorderTemplate.generate({
        videoSize: { width, height },
        fps,
        videoBitrate,
      });

      await storageManager.createHtmlFile(recorderHtmlPath, recorderHtml);

      this.recorderWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          backgroundThrottling: false,
        },
      });

      await this.recorderWindow.loadFile(recorderHtmlPath);

      if (process.env.NODE_ENV === "development") {
        this.recorderWindow.webContents.openDevTools({ mode: "detach" });
      }

      this.recorderWindow.webContents.send("START_RECORDING", {
        sourceId: source.id,
        outputPath,
        width,
        height,
        fps,
        videoBitrate,
      });

      this.emit("recordingStarted");
      return true;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  stopMainProcessRecording() {
    if (this.recorder) {
      this.recorder.stopRecording();
      this.recorder = null;
      this.emit("recordingStopped");
      return true;
    }
    return false;
  }

  stopRendererProcessRecording() {
    if (this.recorderWindow && !this.recorderWindow.isDestroyed()) {
      this.recorderWindow.webContents.send("STOP_RECORDING");
      setTimeout(() => {
        this.recorderWindow.close();
        this.recorderWindow = null;
        this.emit("recordingStopped");
      }, 1000);
      return true;
    }
    return false;
  }

  stopRecording() {
    if (this.recorder) {
      return this.stopMainProcessRecording();
    } else if (this.recorderWindow && !this.recorderWindow.isDestroyed()) {
      return this.stopRendererProcessRecording();
    }
    return false;
  }
}

/**
 * 녹화 서비스 인터페이스
 */
class IRecorderService {
  async getCaptureSources() {}
  async findCaptureSource(windowId) {}
  async startRecording(source, outputPath, captureDir) {}
  stopRecording() {}
  getCaptureConfig() {}
  updateCaptureConfig(newConfig) {}
  setupEventListeners(callbacks) {}
}

/**
 * 녹화 서비스 구현체
 */
class RecorderService extends IRecorderService {
  constructor() {
    super();
    this.session = new RecordingSession();
    this.sourceManager = new SourceManager();
    this.config = new RecorderConfig();
  }

  async getCaptureSources() {
    return this.sourceManager.getCaptureSources();
  }

  async findCaptureSource(windowId) {
    return this.sourceManager.findCaptureSource(windowId);
  }

  async startRecording(source, outputPath, captureDir) {
    try {
      const { width, height } =
        await this.sourceManager.initializeScreenResolution();
      this.config.updateConfig({ videoSize: { width, height } });

      return await this.session.startRendererProcessRecording(
        source,
        outputPath,
        captureDir
      );
    } catch (error) {
      console.error("녹화 시작 오류:", error);
      throw error;
    }
  }

  stopRecording() {
    return this.session.stopRecording();
  }

  getCaptureConfig() {
    return this.config.getConfig();
  }

  updateCaptureConfig(newConfig) {
    return this.config.updateConfig(newConfig);
  }

  setupEventListeners(callbacks) {
    const handleRecordingStarted = callbacks.onStart || (() => {});
    const handleRecordingComplete = callbacks.onComplete || (() => {});
    const handleRecordingError = callbacks.onError || (() => {});

    ipcMain.removeAllListeners("RECORDING_STARTED");
    ipcMain.removeAllListeners("RECORDING_COMPLETE");
    ipcMain.removeAllListeners("RECORDING_ERROR");

    ipcMain.on("RECORDING_STARTED", handleRecordingStarted);
    ipcMain.on("RECORDING_COMPLETE", handleRecordingComplete);
    ipcMain.on("RECORDING_ERROR", handleRecordingError);

    return [
      () => ipcMain.removeListener("RECORDING_STARTED", handleRecordingStarted),
      () =>
        ipcMain.removeListener("RECORDING_COMPLETE", handleRecordingComplete),
      () => ipcMain.removeListener("RECORDING_ERROR", handleRecordingError),
    ];
  }
}

module.exports = new RecorderService();
