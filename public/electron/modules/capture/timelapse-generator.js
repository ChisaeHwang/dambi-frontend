const { spawn } = require("child_process");
const fs = require("fs");
const windowManager = require("../window-manager");
const storageManager = require("./storage-manager");
const ffmpegCommandBuilder = require("./ffmpeg-command-builder");
const EventEmitter = require("events");

/**
 * 진행 상황 업데이트 관리
 */
class ProgressTracker {
  constructor(windowManager) {
    this.lastProgress = 0;
    this.lastUpdateTime = Date.now();
    this.minUpdateInterval = 1000; // 최소 업데이트 간격 (ms)
    this.windowManager = windowManager;
  }

  /**
   * 진행 상황 업데이트
   * @param {number} progress - 현재 진행률 (0-100)
   * @param {string} stage - 현재 단계
   * @param {string} status - 현재 상태
   */
  update(progress, stage = "인코딩 중...", status = "processing") {
    const currentTime = Date.now();

    // 최소 업데이트 간격 확인
    if (currentTime - this.lastUpdateTime < this.minUpdateInterval) {
      return;
    }

    // 이전 진행률보다 낮으면 무시 (특별한 경우 제외)
    if (progress < this.lastProgress && status === "processing") {
      return;
    }

    // 진행률 업데이트
    this.lastProgress = progress;
    this.lastUpdateTime = currentTime;

    // 이벤트 발송
    this.windowManager.sendEvent("timelapse-progress", {
      status,
      progress,
      stage,
    });
  }

  /**
   * 작업 시작 알림
   */
  start() {
    this.lastProgress = 0;
    this.update(0, "초기화", "start");
  }

  /**
   * 작업 완료 알림
   * @param {string} outputPath - 출력 파일 경로
   */
  complete(outputPath) {
    this.update(100, "완료", "complete");

    // 완료 상태 전송 (출력 경로 포함)
    this.windowManager.sendEvent("timelapse-progress", {
      status: "complete",
      progress: 100,
      stage: "완료",
      outputPath,
    });
  }

  /**
   * 오류 알림
   * @param {Error|string} error - 오류 객체 또는 메시지
   */
  error(error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    this.windowManager.sendEvent("timelapse-progress", {
      status: "error",
      progress: 0,
      stage: "오류",
      error: errorMessage,
    });
  }

  /**
   * FFmpeg 출력에서 진행 상황 파싱
   * @param {string} output - FFmpeg 출력 텍스트
   */
  parseFFmpegProgress(output) {
    // 프레임 기반 진행 상황 파싱
    const frameMatch = output.match(/frame=\s*(\d+)/);
    if (frameMatch) {
      const frame = parseInt(frameMatch[1]);

      // 프레임 개수에 따라 진행률 추정
      if (frame > 0) {
        // 기본값으로 프레임 수에 따라 진행률 설정
        // 최대 프레임 수를 예측하기 어려우므로 상한값을 가정
        const progress = Math.min(Math.floor((frame / 1000) * 100), 95);
        this.update(progress);
      }
    }

    // 시간 기반 진행 상황 파싱 (추가)
    const timeMatch = output.match(/time=(\d+):(\d+):(\d+.\d+)/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseFloat(timeMatch[3]);

      // 총 시간(초)
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      // 평균적인 비디오 길이를 알 수 없으므로 최대 10분으로 가정하고 진행률 계산
      // 10분(600초)을 기준으로 진행률 계산
      const estimatedProgress = Math.min(
        Math.floor((totalSeconds / 600) * 100),
        95
      );

      // 프레임 기반 진행률보다 높을 경우에만 업데이트
      if (estimatedProgress > this.lastProgress) {
        this.update(estimatedProgress);
      }
    }
  }
}

/**
 * 타임랩스 생성을 담당하는 클래스
 */
class TimelapseGenerator extends EventEmitter {
  constructor() {
    super();

    // 품질 설정 매핑
    this.crfMap = {
      low: "30", // 낮은 품질, 작은 파일 크기
      medium: "26", // 중간 품질 (기본값)
      high: "22", // 높은 품질, 큰 파일 크기
    };

    // 진행 상황 추적기
    this.progressTracker = new ProgressTracker(windowManager);

    // 작업 상태
    this.isProcessing = false;
    this.currentProcess = null;
  }

  /**
   * 타임랩스 생성
   * @param {string} sourcePath - 원본 비디오 경로
   * @param {Object} options - 타임랩스 생성 옵션
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  async generateTimelapse(sourcePath, options) {
    // 이미 처리 중인 작업이 있는지 확인
    if (this.isProcessing) {
      const error = new Error("이미 타임랩스 생성이 진행 중입니다");
      this.emit("error", error);
      throw error;
    }

    try {
      this.isProcessing = true;

      // 입력 파일 존재 확인
      if (!sourcePath || !fs.existsSync(sourcePath)) {
        throw new Error("유효한 원본 비디오 파일이 없습니다");
      }

      // 타임랩스 생성 옵션 처리
      const outputPath = storageManager.createTimelapseOutputPath(options);
      const speedFactor = options.speedFactor || 3;
      const quality = options.outputQuality || "medium";
      const preserveOriginals = options.preserveOriginals !== false;

      // 출력 디렉토리 확인 및 생성
      storageManager.prepareOutputDirectory(outputPath);

      // FFmpeg 품질 설정
      const crf = this.crfMap[quality] || this.crfMap.medium;

      // ffmpeg-static 패키지에서 ffmpeg 경로 가져오기
      const ffmpegPath = require("ffmpeg-static");

      console.log(`타임랩스 생성 시작: ${outputPath}`);
      console.log(
        `설정: 속도=${speedFactor}x, 품질=${quality}, CRF=${crf}, 원본 보존=${preserveOriginals}`
      );

      // 블러 영역 정보 출력
      if (options.blurRegions && options.blurRegions.length > 0) {
        console.log(
          `블러 영역 정보:`,
          JSON.stringify(options.blurRegions, null, 2)
        );
      } else {
        console.log(`블러 영역 없음`);
      }

      // options에 crf 값 추가 (누락된 부분 수정)
      options.crf = crf;

      // 타임랩스 생성 시작 이벤트 발생
      this.emit("start", { sourcePath, outputPath, options });

      // FFmpeg 프로세스 실행
      return await this._runFfmpegProcess(
        ffmpegPath,
        sourcePath,
        outputPath,
        options,
        preserveOriginals
      );
    } catch (error) {
      // 오류 이벤트 발생
      this.emit("error", error);
      this.progressTracker.error(error);
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentProcess = null;
    }
  }

  /**
   * 현재 실행 중인 FFmpeg 프로세스 중지
   * @returns {boolean} 중지 성공 여부
   */
  stopCurrentProcess() {
    if (this.currentProcess && !this.currentProcess.killed) {
      try {
        this.currentProcess.kill("SIGTERM");
        console.log("FFmpeg 프로세스가 중지되었습니다.");
        this.emit("stopped", {
          message: "사용자에 의해 작업이 중지되었습니다",
        });
        this.progressTracker.update(0, "중지됨", "stopped");
        this.isProcessing = false;
        this.currentProcess = null;
        return true;
      } catch (error) {
        console.error("FFmpeg 프로세스 중지 오류:", error);
        return false;
      }
    }
    return false;
  }

  /**
   * FFMPEG 프로세스 실행
   * @param {string} ffmpegPath - FFMPEG 실행 파일 경로
   * @param {string} sourcePath - 원본 비디오 경로
   * @param {string} outputPath - 출력 경로
   * @param {Object} options - 인코딩 옵션
   * @param {boolean} preserveOriginals - 원본 파일 보존 여부
   * @returns {Promise<string>} 생성된 타임랩스 파일 경로
   */
  _runFfmpegProcess(
    ffmpegPath,
    sourcePath,
    outputPath,
    options,
    preserveOriginals
  ) {
    return new Promise((resolve, reject) => {
      try {
        // 진행 상황 초기화
        this.progressTracker.start();

        // 로그 레벨 변경 (debug → info로 변경하여 로그 출력 감소)
        const ffmpegArgs = [
          "-loglevel",
          "info",
          ...ffmpegCommandBuilder.buildFFmpegArgs(
            sourcePath,
            outputPath,
            options
          ),
        ];

        // 메인 윈도우에 초기 작업 시작 알림
        this.progressTracker.update(5, "인코딩 시작 중...");

        // FFmpeg 프로세스 실행
        this.currentProcess = spawn(ffmpegPath, ffmpegArgs);

        // 표준 출력 리스너
        this.currentProcess.stdout.on("data", (data) => {
          const output = data.toString();

          // 디버깅용 로그
          if (output.includes("info") || output.includes("Info")) {
            console.log(`FFmpeg 정보: ${output}`);
          }
        });

        // 표준 오류 리스너
        this.currentProcess.stderr.on("data", (data) => {
          const output = data.toString();

          // 불필요한 로그 출력을 제거하고 중요한 정보만 로깅
          if (output.includes("error") || output.includes("Error")) {
            console.error(`FFmpeg 오류: ${output}`);
            this.emit("warning", { message: output });
          }

          // 진행 상황 업데이트
          this.progressTracker.parseFFmpegProgress(output);
        });

        // 프로세스 종료 리스너
        this.currentProcess.on("close", (code) => {
          if (code === 0) {
            console.log(`타임랩스 생성 완료: ${outputPath}`);

            // 완료 상태 전송
            this.progressTracker.complete(outputPath);

            // 완료 이벤트 발생
            this.emit("complete", { outputPath });

            // 원본 파일은 기본적으로 보존
            if (!preserveOriginals && fs.existsSync(sourcePath)) {
              try {
                storageManager.deleteFile(sourcePath);
                console.log("원본 녹화 파일 삭제 완료");
              } catch (error) {
                console.error("원본 녹화 파일 삭제 오류:", error);
                this.emit("warning", {
                  message: `원본 파일 삭제 오류: ${error.message}`,
                });
              }
            }

            resolve(outputPath);
          } else {
            let errorMsg;

            if (code === null || code === 255) {
              errorMsg = "타임랩스 생성이 취소되었습니다";
              this.emit("stopped", { message: errorMsg });
            } else {
              errorMsg = `타임랩스 생성 실패: FFmpeg 오류 코드 ${code}`;
              this.emit("error", new Error(errorMsg));
            }

            console.error(errorMsg);

            // 에러 상태 전송
            this.progressTracker.error(errorMsg);

            reject(new Error(errorMsg));
          }

          // 프로세스 참조 정리
          this.currentProcess = null;
          this.isProcessing = false;
        });

        // 프로세스 오류 리스너
        this.currentProcess.on("error", (error) => {
          console.error("FFmpeg 프로세스 오류:", error);
          this.emit("error", error);
          this.progressTracker.error(error);

          // 프로세스 참조 정리
          this.currentProcess = null;
          this.isProcessing = false;

          reject(error);
        });
      } catch (error) {
        console.error("타임랩스 생성 중 오류:", error);
        this.emit("error", error);
        this.progressTracker.error(error);

        // 프로세스 참조 정리
        this.currentProcess = null;
        this.isProcessing = false;

        reject(error);
      }
    });
  }

  /**
   * 지원 가능한 품질 옵션 가져오기
   * @returns {Object} 품질 옵션 설정
   */
  getQualityOptions() {
    return {
      low: "낮은 품질 (작은 파일 크기)",
      medium: "중간 품질 (권장)",
      high: "높은 품질 (큰 파일 크기)",
    };
  }

  /**
   * 권장 속도 팩터 범위 가져오기
   * @returns {Object} 속도 팩터 범위
   */
  getRecommendedSpeedFactors() {
    return {
      min: 1,
      max: 20,
      default: 3,
      recommended: [1, 2, 3, 5, 10, 20],
    };
  }

  /**
   * 현재 처리 중인지 확인
   * @returns {boolean} 처리 중 여부
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * 진행 상황 직접 구독 (이벤트 대신)
   * @param {Function} callback - 진행 상황 업데이트 콜백
   * @returns {Function} 구독 해제 함수
   */
  subscribeToProgress(callback) {
    const progressListener = (data) => {
      callback(data);
    };

    this.on("progress", progressListener);

    // 구독 해제 함수 반환
    return () => {
      this.off("progress", progressListener);
    };
  }
}

module.exports = new TimelapseGenerator();
