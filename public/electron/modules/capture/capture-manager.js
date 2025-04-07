const { ipcMain } = require("electron");
const path = require("path");
const EventEmitter = require("events");
const windowManager = require("../window-manager");
const storageManager = require("./storage-manager");
const recorderService = require("./recorder-service");
const timelapseGenerator = require("./timelapse-generator");

/**
 * 캡처 상태 열거형
 */
const CaptureState = {
  IDLE: "idle",
  RECORDING: "recording",
  PROCESSING: "processing",
  ERROR: "error",
};

/**
 * 캡처 이벤트 관리자
 */
class CaptureEventManager extends EventEmitter {
  constructor() {
    super();
    this._setupIpcListeners();
  }

  _setupIpcListeners() {
    ipcMain.on("CAPTURE_START", (event, data) => {
      this.emit("start", data);
    });

    ipcMain.on("CAPTURE_STOP", (event, data) => {
      this.emit("stop", data);
    });

    ipcMain.on("CAPTURE_ERROR", (event, error) => {
      this.emit("error", error);
    });
  }

  notifyCaptureStarted(data) {
    this.emit("captureStarted", data);
  }

  notifyCaptureStopped(data) {
    this.emit("captureStopped", data);
  }

  notifyCaptureError(error) {
    this.emit("captureError", error);
  }

  notifyCaptureProgress(progress) {
    this.emit("captureProgress", progress);
  }
}

/**
 * 캡처 상태 머신
 */
class CaptureStateMachine {
  constructor() {
    this.currentState = CaptureState.IDLE;
    this.eventManager = new CaptureEventManager();
    this._setupStateTransitions();
  }

  _setupStateTransitions() {
    this.transitions = {
      [CaptureState.IDLE]: {
        start: () => {
          this.currentState = CaptureState.RECORDING;
          this.eventManager.notifyCaptureStarted();
        },
      },
      [CaptureState.RECORDING]: {
        stop: () => {
          this.currentState = CaptureState.PROCESSING;
          this.eventManager.notifyCaptureStopped();
        },
        error: () => {
          this.currentState = CaptureState.ERROR;
          this.eventManager.notifyCaptureError();
        },
      },
      [CaptureState.PROCESSING]: {
        complete: () => {
          this.currentState = CaptureState.IDLE;
          this.eventManager.notifyCaptureStopped();
        },
        error: () => {
          this.currentState = CaptureState.ERROR;
          this.eventManager.notifyCaptureError();
        },
      },
      [CaptureState.ERROR]: {
        reset: () => {
          this.currentState = CaptureState.IDLE;
        },
      },
    };
  }

  transition(action) {
    const currentTransitions = this.transitions[this.currentState];
    if (currentTransitions && currentTransitions[action]) {
      currentTransitions[action]();
      return true;
    }
    return false;
  }

  getState() {
    return this.currentState;
  }

  isIdle() {
    return this.currentState === CaptureState.IDLE;
  }

  isRecording() {
    return this.currentState === CaptureState.RECORDING;
  }

  isProcessing() {
    return this.currentState === CaptureState.PROCESSING;
  }

  isError() {
    return this.currentState === CaptureState.ERROR;
  }
}

/**
 * 캡처 세션
 */
class CaptureSession {
  constructor() {
    this.stateMachine = new CaptureStateMachine();
    this.eventManager = this.stateMachine.eventManager;
    this.recorderService = recorderService;
    this.captureDir = null;
    this.videoPath = null;
    this.metadataPath = null;
    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.eventManager.on("start", this._handleStart.bind(this));
    this.eventManager.on("stop", this._handleStop.bind(this));
    this.eventManager.on("error", this._handleError.bind(this));
  }

  async _handleStart(data) {
    try {
      const { windowId, captureDir } = data;

      if (!this.stateMachine.isIdle()) {
        throw new Error("이미 캡처가 진행 중입니다.");
      }

      if (!captureDir || typeof captureDir !== "string") {
        throw new Error("캡처 디렉토리가 유효하지 않습니다.");
      }

      this.captureDir = captureDir;
      this.videoPath = path.join(captureDir, "capture.mp4");
      this.metadataPath = path.join(captureDir, "metadata.json");

      const source = await this.recorderService.findCaptureSource(windowId);
      await this.recorderService.startRecording(
        source,
        this.videoPath,
        this.captureDir
      );
      this.stateMachine.transition("start");
    } catch (error) {
      this._handleError(error);
    }
  }

  async _handleStop() {
    try {
      if (!this.stateMachine.isRecording()) {
        throw new Error("현재 녹화 중이 아닙니다.");
      }

      this.stateMachine.transition("stop");
      await this.recorderService.stopRecording();
      this.stateMachine.transition("complete");
    } catch (error) {
      this._handleError(error);
    }
  }

  _handleError(error) {
    console.error("캡처 오류:", error);
    this.stateMachine.transition("error");
    this.eventManager.notifyCaptureError(error);
  }
}

/**
 * 캡처 매니저
 */
class CaptureManager {
  constructor() {
    this.session = new CaptureSession();
    this.eventManager = this.session.eventManager;
    this.isCapturing = false;
    this.startTime = null;
    this.endTime = null;
    this.recordingDuration = 0;
    this.recordingInterval = null;
    this.statusUpdateInterval = null;
    this.currentSource = null;
    this.timelapseEnabled = true;
    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.eventManager.on("captureStarted", (data) => {
      this.isCapturing = true;
      this.startTime = Date.now();
      this._setupRecordingStateUpdates();
      this.emitStatusUpdate();
    });

    this.eventManager.on("captureStopped", async () => {
      this.endTime = Date.now();
      this.isCapturing = false;
      this._clearTimers();

      // 메타데이터 업데이트
      if (this.session.metadataPath) {
        await this._updateMetadataAfterCapture();
      }

      this.emitStatusUpdate();
    });

    this.eventManager.on("captureError", (error) => {
      this._clearTimers();
      this.isCapturing = false;
      this.emitStatusUpdate();
      console.error("[CaptureManager] 캡처 오류:", error);
    });
  }

  /**
   * 활성 창 목록 가져오기
   * @returns {Promise<Array>} 활성 창 목록
   */
  async getActiveWindows() {
    return await recorderService.getCaptureSources();
  }

  /**
   * 녹화 상태 정보 반환
   * @returns {Object} 현재 녹화 상태
   */
  getRecordingStatus() {
    return {
      isRecording: this.isCapturing,
      duration: this.recordingDuration,
      source: this.currentSource
        ? {
            id: this.currentSource.id,
            name: this.currentSource.name,
          }
        : null,
    };
  }

  /**
   * 캡처 시작
   * @param {string} windowId - 캡처할 창 ID
   * @param {string} windowName - 캡처할 창 이름
   * @returns {Promise<Object>} 캡처 시작 결과
   */
  async startCapture(windowId, windowName) {
    try {
      if (this.isCapturing) {
        return { success: false, error: "이미 캡처가 진행 중입니다." };
      }

      const { captureDir } = await storageManager.createCaptureDirectory();

      if (!captureDir || typeof captureDir !== "string") {
        throw new Error("캡처 디렉토리 생성에 실패했습니다.");
      }

      await this.eventManager.emit("start", {
        windowId,
        windowName,
        captureDir,
      });

      return { success: true, captureDir };
    } catch (error) {
      this.eventManager.notifyCaptureError(error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 캡처 중지
   * @returns {Promise<Object>} 캡처 중지 결과
   */
  async stopCapture() {
    try {
      if (!this.isCapturing) {
        return { success: false, error: "녹화 중이 아닙니다." };
      }

      await this.eventManager.emit("stop");
      return { success: true };
    } catch (error) {
      this.eventManager.notifyCaptureError(error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 타임랩스 생성
   * @param {Object} options - 타임랩스 생성 옵션
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  async generateTimelapse(options) {
    try {
      // 녹화 중이면 먼저 중지하고 완료될 때까지 대기
      if (this.isCapturing) {
        await this.stopCapture();
        // 녹화가 완전히 중지될 때까지 대기
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // 세션에서 경로 정보 가져오기
      const { captureDir, videoPath, metadataPath } = this.session;

      // 유효한 녹화 파일 확인
      if (!captureDir || !videoPath) {
        throw new Error("캡처 경로 정보가 없습니다");
      }

      const fileSize = await storageManager.getVideoFileSizeAsync(videoPath);
      if (!fileSize || fileSize <= 0) {
        throw new Error("유효한 녹화 파일이 없거나 파일이 비어있습니다");
      }

      // 메타데이터에서 원본 비디오 해상도 가져오기
      try {
        const metadata = await storageManager.getMetadata(metadataPath);

        console.log("==========================================");
        console.log("타임랩스 생성 옵션:", JSON.stringify(options, null, 2));
        console.log("캡처 경로:", captureDir);
        console.log("비디오 파일:", videoPath);
        console.log("파일 크기:", fileSize, "bytes");

        // 메타데이터에서 해상도 정보 확인
        if (metadata && metadata.videoSize) {
          const origWidth = metadata.videoSize.width;
          const origHeight = metadata.videoSize.height;

          console.log(`원본 녹화 해상도 정보: ${origWidth}x${origHeight}`);

          // 옵션에 실제 캡처 해상도 추가
          options.videoWidth = origWidth;
          options.videoHeight = origHeight;
        }

        console.log("==========================================");
      } catch (error) {
        console.warn("메타데이터 읽기 실패:", error);
        // 메타데이터 읽기 실패 시 recorderService의 설정 사용
        const config = this.getCaptureConfig();
        if (config && config.videoSize) {
          options.videoWidth = config.videoSize.width;
          options.videoHeight = config.videoSize.height;
        }
      }

      // 타임랩스 생성 요청
      return await timelapseGenerator.generateTimelapse(videoPath, options);
    } catch (error) {
      console.error("타임랩스 생성 오류:", error);
      throw error;
    }
  }

  /**
   * 녹화 상태 업데이트 타이머 설정
   */
  _setupRecordingStateUpdates() {
    this.isCapturing = true;
    this.recordingDuration = 0;

    // 녹화 시간 측정 시작
    this.recordingInterval = setInterval(() => {
      this.recordingDuration += 1000; // 1초씩 증가
    }, 1000);

    // 상태 업데이트 타이머 시작
    this.statusUpdateInterval = setInterval(() => {
      this.emitStatusUpdate();
    }, 1000);

    this.emitStatusUpdate();
  }

  /**
   * 타이머 정리
   */
  _clearTimers() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  /**
   * 메타데이터 업데이트 (캡처 후)
   * @private
   */
  async _updateMetadataAfterCapture() {
    if (!this.session.metadataPath) return;

    try {
      // endTime과 recordingDuration 업데이트
      const metaDataUpdates = {
        endTime: this.endTime,
        recordingDuration: this.endTime - this.startTime,
      };

      // 파일 크기 정보 추가 (비동기 버전 사용)
      if (this.session.videoPath) {
        const fileSize = await storageManager.getVideoFileSizeAsync(
          this.session.videoPath
        );
        if (fileSize > 0) {
          metaDataUpdates.fileSize = fileSize;
        }
      }

      // 비동기 방식으로 메타데이터 업데이트
      await storageManager.updateMetadata(
        this.session.metadataPath,
        metaDataUpdates
      );
    } catch (error) {
      console.error("[CaptureManager] 메타데이터 업데이트 오류:", error);
    }
  }

  /**
   * 메타데이터 업데이트 (데이터 포함)
   * @param {Object} data - 업데이트할 데이터
   */
  _updateMetadataWithData(data) {
    if (this.session.metadataPath) {
      storageManager.updateMetadata(this.session.metadataPath, data);
    }
  }

  /**
   * 상태 업데이트 이벤트 발송
   */
  emitStatusUpdate() {
    // 상태 업데이트 이벤트 발생
    const status = {
      isCapturing: this.isCapturing,
      duration: this.recordingDuration,
    };

    console.log(`[상태 업데이트] ${JSON.stringify(status)}`);
    windowManager.sendEvent("capture-status", status);
  }

  /**
   * 캡처 설정 가져오기
   * @returns {Object} 현재 캡처 설정
   */
  getCaptureConfig() {
    return recorderService.getCaptureConfig();
  }

  /**
   * 캡처 설정 업데이트
   * @param {Object} newConfig - 새로운 설정
   * @returns {Object} 업데이트된 설정
   */
  updateCaptureConfig(newConfig) {
    return recorderService.updateCaptureConfig(newConfig);
  }

  /**
   * 타임랩스 품질 옵션 가져오기
   * @returns {Object} 품질 옵션
   */
  getTimelapseQualityOptions() {
    return timelapseGenerator.getQualityOptions();
  }

  /**
   * 타임랩스 옵션 업데이트
   * @param {Object} options - 업데이트할 타임랩스 옵션
   * @returns {Promise<boolean>} 업데이트 성공 여부
   */
  async updateTimelapseOptions(options) {
    try {
      console.log("타임랩스 옵션 업데이트:", options);

      // 여기서 필요한 옵션을 내부 상태에 저장하거나 적용할 수 있음
      // 예: 활성화 상태를 캡처 관련 클래스에 저장
      if (options.hasOwnProperty("enabled")) {
        // 타임랩스 활성화 상태 저장
        this.timelapseEnabled = options.enabled !== false;
        console.log(`타임랩스 활성화 상태 변경: ${this.timelapseEnabled}`);
      }

      return true;
    } catch (error) {
      console.error("타임랩스 옵션 업데이트 오류:", error);
      return false;
    }
  }

  /**
   * 추천 속도 옵션 가져오기
   * @returns {Object} 속도 옵션
   */
  getRecommendedSpeedFactors() {
    return timelapseGenerator.getRecommendedSpeedFactors();
  }
}

module.exports = new CaptureManager();
