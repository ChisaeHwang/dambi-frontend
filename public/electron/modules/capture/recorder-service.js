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
   * @returns {Promise<Object>} 레코더 윈도우 인스턴스
   */
  async startRendererProcessRecording(source, outputPath, captureDir) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[RecorderService] 렌더러 프로세스 녹화 방식으로 전환`);

        // 캡처 설정에서 해상도 가져오기
        const width = this.captureConfig.videoSize.width;
        const height = this.captureConfig.videoSize.height;
        console.log(
          `[RecorderService] 녹화 창 해상도 설정: ${width}x${height}`
        );

        // 최적화된 캡처 창 설정
        const recorderWindow = new BrowserWindow({
          width: width,
          height: height,
          show: false, // 항상 숨김 상태로 실행
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false, // 백그라운드에서도 성능 제한 없음
            webSecurity: false,
            allowRunningInsecureContent: true,
            enableRemoteModule: true,
            // 하드웨어 가속 활성화
            accelerator: "gpu",
            // 추가 성능 최적화
            offscreen: true, // 오프스크린 렌더링 활성화
          },
          // 추가 창 설정
          frame: false,
          transparent: false,
          resizable: false,
          skipTaskbar: true, // 작업 표시줄에 표시하지 않음
          // 렌더링 성능 최적화
          paintWhenInitiallyHidden: true,
          useContentSize: true,
        });

        // 창 크기가 캡처 설정과 일치하는지 확인
        const actualSize = recorderWindow.getSize();
        console.log(
          `[RecorderService] 실제 녹화 창 크기: ${actualSize[0]}x${actualSize[1]}`
        );
        if (actualSize[0] !== width || actualSize[1] !== height) {
          console.log(`[RecorderService] 창 크기 불일치 감지, 강제 조정`);
          recorderWindow.setSize(width, height, false);
        }

        // 오프스크린 렌더링 최적화
        if (recorderWindow.webContents.setFrameRate) {
          // 프레임 레이트 설정 (일정한 캡처 주기 유지)
          recorderWindow.webContents.setFrameRate(this.captureConfig.fps);
        }

        // 로컬 HTML 파일 생성 및 로드
        const recorderHtmlPath = path.join(captureDir, "recorder.html");
        // RecorderTemplate 사용하여 HTML 생성
        const recorderHtml = RecorderTemplate.generate(this.captureConfig);

        storageManager.createHtmlFile(recorderHtmlPath, recorderHtml);
        recorderWindow.loadFile(recorderHtmlPath);

        // 레코더 창 관련 이벤트 및 변수 설정
        this.recorderWindow = recorderWindow;

        // 창이 준비되면 녹화 시작 메시지 전송
        recorderWindow.webContents.on("did-finish-load", () => {
          // 창 크기 한번 더 확인
          const finalSize = recorderWindow.getSize();
          console.log(
            `[RecorderService] 최종 녹화 창 크기: ${finalSize[0]}x${finalSize[1]}`
          );

          // 잠시 기다렸다가 녹화 시작 (창 렌더링 완료 보장)
          setTimeout(() => {
            recorderWindow.webContents.send("START_RECORDING", {
              sourceId: source.id,
              outputPath: outputPath,
            });
            resolve(recorderWindow);
          }, 500);
        });

        // 창 로드 실패 시
        recorderWindow.webContents.on(
          "did-fail-load",
          (_, __, ___, message) => {
            reject(new Error(`녹화 창 로드 실패: ${message}`));
          }
        );
      } catch (error) {
        console.error("렌더러 프로세스 녹화 시작 오류:", error);
        reject(error);
      }
    });
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
