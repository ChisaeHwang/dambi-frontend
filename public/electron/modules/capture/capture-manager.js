const windowManager = require("../window-manager");
const storageManager = require("./storage-manager");
const recorderService = require("./recorder-service");
const timelapseGenerator = require("./timelapse-generator");

/**
 * 타임랩스 캡처 전체 과정을 관리하는 클래스
 */
class CaptureManager {
  constructor() {
    // 캡처 상태 관리
    this.isCapturing = false;
    this.captureDir = null;
    this.videoPath = null;
    this.metadataPath = null;
    this.startTime = null;
    this.endTime = null;

    // 상태 관리를 위한 변수들
    this.recordingDuration = 0;
    this.recordingInterval = null;
    this.statusUpdateInterval = null;
    this.currentSource = null; // 현재 녹화 중인 소스 정보
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
   * @param {string} windowId - 캡처할 윈도우 ID
   * @param {string} windowName - 캡처할 윈도우 이름
   * @returns {Promise<Object>} 캡처 시작 결과
   */
  async startCapture(windowId, windowName) {
    // 캡처를 이미 진행 중이면 중지
    if (this.isCapturing) {
      this.stopCapture();
    }

    console.log(
      `[CaptureManager] 캡처 시작: windowId=${windowId}, windowName=${windowName}`
    );

    try {
      // 1. 캡처 디렉토리 및 파일 경로 생성
      const captureInfo = storageManager.createCaptureDirectory();
      this.captureDir = captureInfo.captureDir;
      this.videoPath = captureInfo.videoPath;
      this.metadataPath = captureInfo.metadataPath;

      // 2. 메타데이터 초기화
      this.startTime = Date.now();
      this.recordingDuration = 0;
      const captureConfig = recorderService.getCaptureConfig();

      const metaData = {
        startTime: this.startTime,
        fps: captureConfig.fps,
        videoBitrate: captureConfig.videoBitrate,
        videoSize: captureConfig.videoSize,
        windowId,
        windowName,
      };

      storageManager.saveMetadata(this.metadataPath, metaData);

      // 3. 캡처할 소스 찾기
      this.currentSource = await recorderService.findCaptureSource(windowId);

      // 4. 녹화 시작 (메인 프로세스 기반)
      try {
        await recorderService.startMainProcessRecording(
          this.currentSource,
          this.videoPath
        );
        this._setupRecordingStateUpdates();

        return { success: true, captureDir: this.captureDir };
      } catch (mainProcessError) {
        console.error(
          "[CaptureManager] 메인 프로세스 녹화 실패, 렌더러 프로세스로 전환",
          mainProcessError
        );

        // 5. 메인 프로세스 실패 시 렌더러 프로세스 기반 녹화 시도
        const callbacks = this._createRendererProcessCallbacks();

        // 이벤트 리스너 설정
        recorderService.setupRendererProcessEventListeners(callbacks);

        // 렌더러 프로세스 녹화 시작
        await recorderService.startRendererProcessRecording(
          this.currentSource,
          this.videoPath,
          this.captureDir
        );

        return { success: true, captureDir: this.captureDir };
      }
    } catch (error) {
      console.error("[CaptureManager] 캡처 시작 오류:", error);
      this.isCapturing = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * 캡처 중지
   * @returns {Object} 캡처 중지 결과
   */
  stopCapture() {
    if (!this.isCapturing) {
      return { success: false, error: "녹화 중이 아닙니다." };
    }

    console.log(`[CaptureManager] 캡처 중지 요청 받음`);

    try {
      // 녹화 중지
      recorderService.stopRecording();

      // 메타데이터 업데이트
      this.endTime = Date.now();
      this._updateMetadataAfterCapture();

      // 타이머 정리
      this._clearTimers();

      // 상태 업데이트
      this.isCapturing = false;
      this.emitStatusUpdate();

      console.log(`[CaptureManager] 캡처 중지 완료`);
      this.currentSource = null; // 녹화 중인 소스 정보 초기화

      return { success: true };
    } catch (error) {
      console.error("[CaptureManager] 캡처 중지 오류:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 타임랩스 생성
   * @param {Object} options - 타임랩스 생성 옵션
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  async generateTimelapse(options) {
    // 녹화 중이면 먼저 중지
    if (this.isCapturing) {
      this.stopCapture();
      // 녹화가 완전히 중지될 때까지 잠시 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 유효한 녹화 파일 확인
    if (
      !this.captureDir ||
      !this.videoPath ||
      !storageManager.getVideoFileSize(this.videoPath)
    ) {
      throw new Error("유효한 녹화 파일이 없습니다");
    }

    // 타임랩스 생성 요청
    return await timelapseGenerator.generateTimelapse(this.videoPath, options);
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
   * 렌더러 프로세스 녹화용 콜백 생성
   * @returns {Object} 콜백 함수들
   */
  _createRendererProcessCallbacks() {
    return {
      onStart: () => {
        console.log("[CaptureManager] 렌더러 프로세스 녹화가 시작되었습니다.");
        this._setupRecordingStateUpdates();
      },

      onComplete: (event, data) => {
        console.log(
          `[CaptureManager] 녹화 완료: ${data.outputPath}, 파일 크기: ${(
            data.fileSize /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
        this.endTime = Date.now();

        // 메타데이터 업데이트
        this._updateMetadataWithData({
          endTime: this.endTime,
          duration: this.endTime - this.startTime,
          fileSize: data.fileSize,
        });

        // 타이머 정리
        this._clearTimers();

        this.isCapturing = false;
        this.emitStatusUpdate();
      },

      onError: (event, error) => {
        console.error("[CaptureManager] 녹화 오류:", error);

        // 타이머 정리
        this._clearTimers();

        this.isCapturing = false;
        this.emitStatusUpdate();
      },
    };
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
   */
  _updateMetadataAfterCapture() {
    if (this.metadataPath) {
      const updateData = {
        endTime: this.endTime,
        duration: this.endTime - this.startTime,
      };

      // 파일 크기 업데이트
      const fileSize = storageManager.getVideoFileSize(this.videoPath);
      if (fileSize > 0) {
        updateData.fileSize = fileSize;
      }

      storageManager.updateMetadata(this.metadataPath, updateData);
    }
  }

  /**
   * 메타데이터 업데이트 (데이터 포함)
   * @param {Object} data - 업데이트할 데이터
   */
  _updateMetadataWithData(data) {
    if (this.metadataPath) {
      storageManager.updateMetadata(this.metadataPath, data);
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
   * 추천 속도 옵션 가져오기
   * @returns {Object} 속도 옵션
   */
  getRecommendedSpeedFactors() {
    return timelapseGenerator.getRecommendedSpeedFactors();
  }
}

module.exports = new CaptureManager();
