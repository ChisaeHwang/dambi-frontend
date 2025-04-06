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

/**
 * 화면 녹화를 담당하는 클래스
 */
class RecorderService {
  constructor() {
    this.recorder = null; // 메인 프로세스 기반 레코더
    this.recorderWindow = null; // 렌더러 프로세스 기반 레코더 창
    this._hasInitializedResolution = false;

    // 기본 캡처 설정으로 초기화
    this.captureConfig = {
      fps: 30, // 캡처 프레임 속도 (기존 15에서 30으로 증가)
      videoBitrate: 6000, // 비디오 비트레이트 (기존 3000에서 6000으로 증가)
      videoSize: {
        width: 1920, // 초기 기본값
        height: 1080, // 초기 기본값
      },
    };

    // Electron 앱이 준비된 후에만 화면 해상도 초기화
    if (app.isReady()) {
      this._initializeScreenResolution();
    } else {
      console.log("Electron 앱이 준비되지 않음, ready 이벤트 대기 중");
      app.on("ready", () => {
        this._initializeScreenResolution();
      });
    }
  }

  /**
   * 실제 화면 해상도를 초기화하는 메서드
   * app ready 이벤트 이후에 호출되어야 함
   * @private
   */
  _initializeScreenResolution() {
    try {
      // Electron 앱이 준비되었는지 확인
      if (!app.isReady()) {
        console.log("Electron 앱이 아직 준비되지 않음, 기본 해상도 사용");
        return;
      }

      // screen 모듈이 사용 가능한지 확인
      const primaryDisplay = screen.getPrimaryDisplay();

      // workAreaSize 대신 bounds를 사용하여 실제 화면 전체 해상도 가져오기
      const { width, height } = primaryDisplay.bounds;

      // 작업 영역 크기 (작업 표시줄 등을 제외한 영역)도 로깅
      const { width: workWidth, height: workHeight } =
        primaryDisplay.workAreaSize;

      console.log(`주 디스플레이 실제 해상도: ${width}x${height}`);
      console.log(`주 디스플레이 작업 영역: ${workWidth}x${workHeight}`);

      // 실제 전체 해상도로 설정 업데이트
      this.updateCaptureConfig({
        videoSize: {
          width: width,
          height: height,
        },
      });

      this._hasInitializedResolution = true;
    } catch (error) {
      console.error("화면 해상도 초기화 중 오류:", error.message);
      console.log("기본 해상도(1920x1080)를 사용합니다.");
    }
  }

  /**
   * 사용 가능한 캡처 소스 가져오기
   * @returns {Promise<Array>} 캡처 가능한 소스 목록
   */
  async getCaptureSources() {
    // 이 메서드 호출 전에 해상도 초기화 시도
    if (!this._hasInitializedResolution) {
      this._initializeScreenResolution();
      this._hasInitializedResolution = true;
    }

    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 300, height: 300 },
      });

      // 각 소스에 대해 필요한 정보만 추출
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
   * 캡처할 소스 찾기
   * @param {string} windowId - 윈도우 ID
   * @returns {Promise<Object>} 선택된 소스
   */
  async findCaptureSource(windowId) {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: { width: 300, height: 300 },
    });

    console.log(
      `[RecorderService] 사용 가능한 소스: ${sources
        .map((s) => s.id)
        .join(", ")}`
    );

    const selectedSource = sources.find((source) => source.id === windowId);

    if (!selectedSource) {
      throw new Error(`지정된 창을 찾을 수 없습니다: ${windowId}`);
    }

    console.log(
      `[RecorderService] 선택된 소스: ${selectedSource.id}, ${selectedSource.name}`
    );

    return selectedSource;
  }

  /**
   * 메인 프로세스 기반 녹화 시작
   * @param {Object} source - 캡처할 소스
   * @param {string} outputPath - 출력 파일 경로
   * @returns {Promise<boolean>} 성공 여부
   */
  async startMainProcessRecording(source, outputPath) {
    try {
      const electronScreenRecorder = require("electron-screen-recorder");
      console.log(
        `[RecorderService] 일렉트론 스크린 레코더 로드됨:`,
        Object.keys(electronScreenRecorder)
      );

      // electron-screen-recorder v0.0.3에서는 default가 생성자가 아님
      // 라이브러리 API에 맞게 사용
      if (typeof electronScreenRecorder.createRecorder === "function") {
        // createRecorder 함수를 사용하는 API 형태인 경우
        this.recorder = electronScreenRecorder.createRecorder();
      } else if (typeof electronScreenRecorder.ScreenRecorder === "function") {
        // ScreenRecorder 클래스를 사용하는 API 형태인 경우
        this.recorder = new electronScreenRecorder.ScreenRecorder();
      } else if (
        electronScreenRecorder.default &&
        typeof electronScreenRecorder.default !== "function"
      ) {
        // default가 객체인 경우
        this.recorder = electronScreenRecorder.default;
      } else {
        throw new Error(
          "지원되지 않는 electron-screen-recorder API 형식입니다."
        );
      }

      console.log(
        `[RecorderService] 레코더 인스턴스 생성됨:`,
        typeof this.recorder
      );

      // 녹화 설정
      const recordOptions = {
        fps: this.captureConfig.fps,
        videoSource: source.id,
        outputFilePath: outputPath,
        width: this.captureConfig.videoSize.width,
        height: this.captureConfig.videoSize.height,
        showCursor: true,
      };

      console.log(`[RecorderService] 녹화 설정:`, recordOptions);

      // 녹화 시작 - API에 따라 메서드 이름이 다를 수 있음
      if (typeof this.recorder.startRecording === "function") {
        await this.recorder.startRecording(recordOptions);
      } else if (typeof this.recorder.start === "function") {
        await this.recorder.start(recordOptions);
      } else {
        throw new Error("레코더에 녹화 시작 메서드가 없습니다.");
      }

      console.log(`[RecorderService] 메인 프로세스에서 녹화 시작됨`);
      return true;
    } catch (error) {
      console.error("메인 프로세스 녹화 시작 오류:", error);
      throw error;
    }
  }

  /**
   * 메인 프로세스 기반 녹화 중지
   */
  stopMainProcessRecording() {
    if (this.recorder) {
      console.log(`[RecorderService] 메인 프로세스 녹화 중지 시도`);
      this.recorder.stopRecording();
      this.recorder = null;
      console.log(`[RecorderService] 메인 프로세스 녹화 중지 완료`);
      return true;
    }
    return false;
  }

  /**
   * 렌더러 프로세스 기반 녹화 시작
   * @param {Object} source - 캡처할 소스
   * @param {string} outputPath - 출력 파일 경로
   * @param {string} captureDir - 캡처 디렉토리 경로
   * @returns {Promise<boolean>} 성공 여부
   */
  async startRendererProcessRecording(source, outputPath, captureDir) {
    try {
      console.log(`[RecorderService] 렌더러 프로세스 녹화 시작`);

      // 1. 이미 생성된 창이 있으면 닫기
      if (this.recorderWindow && !this.recorderWindow.isDestroyed()) {
        this.recorderWindow.close();
        this.recorderWindow = null;
      }

      // 2. 녹화 설정 계산
      const width = this.captureConfig.videoSize.width;
      const height = this.captureConfig.videoSize.height;
      const fps = this.captureConfig.fps;
      const videoBitrate = this.captureConfig.videoBitrate;

      // 3. 소스 ID 타입 및 이름 가져오기 (debugging용)
      const sourceId = source.id;
      const sourceName = source.name || "Unknown";
      const isScreenCapture = sourceId.startsWith("screen:");

      // 4. 소스 유형에 따라 캡처 크기 조정 시도 (더 정확한 해상도 추정)
      let estimatedWidth = width;
      let estimatedHeight = height;

      // 특정 애플리케이션 창의 경우, 썸네일 크기를 기반으로 실제 크기 추정
      if (!isScreenCapture && source.thumbnail) {
        try {
          // 썸네일 비율을 사용하여 실제 애플리케이션 창 해상도 추정
          const thumbnailSize = source.thumbnail.getSize();
          if (thumbnailSize.width > 0 && thumbnailSize.height > 0) {
            // 썸네일의 비율이 원본 캡처물의 비율과 동일하다고 가정
            const aspectRatio = thumbnailSize.width / thumbnailSize.height;

            // 전체 화면 해상도 내에서 해당 애플리케이션 창의 해상도 추정
            // 기본 캡처 설정의 크기를 넘지 않도록 함
            if (aspectRatio > 1) {
              // 가로가 더 긴 경우
              estimatedWidth = Math.min(
                width,
                Math.round(height * aspectRatio)
              );
              estimatedHeight = Math.min(
                height,
                Math.round(estimatedWidth / aspectRatio)
              );
            } else {
              // 세로가 더 긴 경우
              estimatedHeight = Math.min(
                height,
                Math.round(width / aspectRatio)
              );
              estimatedWidth = Math.min(
                width,
                Math.round(estimatedHeight * aspectRatio)
              );
            }

            console.log(
              `[RecorderService] 썸네일 비율 기반 추정 해상도: ${estimatedWidth}x${estimatedHeight}`
            );
            console.log(
              `[RecorderService] 썸네일 크기: ${thumbnailSize.width}x${thumbnailSize.height}`
            );
          }
        } catch (error) {
          console.error("[RecorderService] 해상도 추정 중 오류:", error);
        }
      }

      console.log(
        `[RecorderService] 소스 정보: ${sourceName} (${sourceId}), 캡처 유형: ${
          isScreenCapture ? "전체 화면" : "애플리케이션 창"
        }`
      );
      console.log(
        `[RecorderService] 최종 캡처 해상도: ${estimatedWidth}x${estimatedHeight}, FPS: ${fps}, 비트레이트: ${videoBitrate}kbps`
      );

      // 5. 메타데이터 파일 업데이트 (추정된 해상도 포함)
      const metadataPath = path.join(captureDir, "metadata.json");
      const metaDataUpdates = {
        captureType: isScreenCapture ? "screen" : "window",
        videoSize: {
          width: estimatedWidth,
          height: estimatedHeight,
          original: {
            width,
            height,
          },
        },
        sourceId,
        sourceName,
        thumbnailInfo: source.thumbnail
          ? {
              width: source.thumbnail.getSize().width,
              height: source.thumbnail.getSize().height,
            }
          : null,
      };

      storageManager.updateMetadata(metadataPath, metaDataUpdates);

      // 6. 로컬 HTML 파일 생성
      const recorderHtmlPath = path.join(captureDir, "recorder.html");

      // RecorderTemplate 사용하여 HTML 생성
      const recorderOptions = {
        videoSize: {
          width: estimatedWidth,
          height: estimatedHeight,
        },
        fps,
        videoBitrate,
      };

      const recorderHtml = RecorderTemplate.generate(recorderOptions);
      storageManager.createHtmlFile(recorderHtmlPath, recorderHtml);

      console.log(`[RecorderService] 녹화용 HTML 생성: ${recorderHtmlPath}`);

      // 7. 새 창 생성 - 자체 preload 없이 nodeIntegration 활성화로 변경
      this.recorderWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false, // 숨김 모드로 실행
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          backgroundThrottling: false,
        },
      });

      // HTML 파일 로드
      await this.recorderWindow.loadFile(recorderHtmlPath);

      // 창이 준비될 때까지 기다림 - 중요: 이 부분을 추가합니다
      await new Promise((resolve) => {
        this.recorderWindow.once("ready-to-show", () => {
          console.log(`[RecorderService] 녹화 창이 준비되었습니다.`);
          resolve();
        });

        // 타임아웃 설정 (5초)
        setTimeout(() => {
          console.log(
            `[RecorderService] 녹화 창 준비 타임아웃, 계속 진행합니다.`
          );
          resolve();
        }, 5000);
      });

      // 개발 모드에서만 DevTools 열기
      if (process.env.NODE_ENV === "development") {
        this.recorderWindow.webContents.openDevTools({ mode: "detach" });
      }

      // 8. 실제 녹화 시작
      // webContents가 준비되었는지 확인 - 중요: 여기도 검사 추가
      if (
        this.recorderWindow &&
        !this.recorderWindow.isDestroyed() &&
        this.recorderWindow.webContents
      ) {
        this.recorderWindow.webContents.send("START_RECORDING", {
          sourceId: source.id,
          outputPath,
          width: estimatedWidth,
          height: estimatedHeight,
          fps,
          videoBitrate,
        });
        console.log(`[RecorderService] 렌더러 프로세스 녹화 요청 완료`);
        return true;
      } else {
        throw new Error("녹화 창이 준비되지 않았습니다.");
      }
    } catch (error) {
      console.error("[RecorderService] 렌더러 프로세스 녹화 오류:", error);
      throw error;
    }
  }

  /**
   * 렌더러 프로세스 기반 녹화 중지
   */
  stopRendererProcessRecording() {
    if (this.recorderWindow && !this.recorderWindow.isDestroyed()) {
      console.log(`[RecorderService] 렌더러 프로세스 녹화 중지 시도`);
      this.recorderWindow.webContents.send("STOP_RECORDING");
      return true;
    }
    return false;
  }

  /**
   * 녹화 중지 (메인 또는 렌더러 프로세스)
   */
  stopRecording() {
    if (this.recorder) {
      return this.stopMainProcessRecording();
    } else if (this.recorderWindow && !this.recorderWindow.isDestroyed()) {
      return this.stopRendererProcessRecording();
    }

    return false;
  }

  /**
   * 렌더러 프로세스 녹화용 이벤트 리스너 설정
   * @param {Object} callbacks - 콜백 함수들
   * @returns {Array<Function>} 이벤트 리스너 제거 함수들
   */
  setupRendererProcessEventListeners(callbacks) {
    // 이벤트 리스너 등록
    const handleRecordingStarted = callbacks.onStart || (() => {});
    const handleRecordingComplete = callbacks.onComplete || (() => {});
    const handleRecordingError = callbacks.onError || (() => {});

    // 이벤트 리스너 설정
    ipcMain.once("RECORDING_STARTED", handleRecordingStarted);
    ipcMain.once("RECORDING_COMPLETE", handleRecordingComplete);
    ipcMain.once("RECORDING_ERROR", handleRecordingError);

    // 레코더 창이 닫힐 때 리소스 정리를 위한 이벤트 핸들러
    if (this.recorderWindow) {
      this.recorderWindow.on("closed", () => {
        ipcMain.removeListener("RECORDING_STARTED", handleRecordingStarted);
        ipcMain.removeListener("RECORDING_COMPLETE", handleRecordingComplete);
        ipcMain.removeListener("RECORDING_ERROR", handleRecordingError);
        this.recorderWindow = null;
      });
    }

    // 이벤트 리스너 제거 함수 반환
    return [
      () => ipcMain.removeListener("RECORDING_STARTED", handleRecordingStarted),
      () =>
        ipcMain.removeListener("RECORDING_COMPLETE", handleRecordingComplete),
      () => ipcMain.removeListener("RECORDING_ERROR", handleRecordingError),
    ];
  }

  /**
   * 현재 녹화 설정 가져오기
   * @returns {Object} 현재 녹화 설정
   */
  getCaptureConfig() {
    return { ...this.captureConfig };
  }

  /**
   * 녹화 설정 업데이트
   * @param {Object} newConfig - 새로운 설정
   */
  updateCaptureConfig(newConfig) {
    this.captureConfig = {
      ...this.captureConfig,
      ...newConfig,
    };
    return this.captureConfig;
  }
}

module.exports = new RecorderService();
