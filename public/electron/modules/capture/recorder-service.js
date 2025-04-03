const { desktopCapturer, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const storageManager = require("./storage-manager");

/**
 * 화면 녹화를 담당하는 클래스
 */
class RecorderService {
  constructor() {
    this.recorder = null; // 메인 프로세스 기반 레코더
    this.recorderWindow = null; // 렌더러 프로세스 기반 레코더 창
    this.captureConfig = {
      fps: 30, // 캡처 프레임 속도 (기존 15에서 30으로 증가)
      videoBitrate: 6000, // 비디오 비트레이트 (기존 3000에서 6000으로 증가)
      videoSize: {
        width: 1920, // 해상도 증가 (기존 1280에서 1920으로)
        height: 1080, // 해상도 증가 (기존 720에서 1080으로)
      },
    };
  }

  /**
   * 사용 가능한 캡처 소스 가져오기
   * @returns {Promise<Array>} 캡처 가능한 소스 목록
   */
  async getCaptureSources() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 150, height: 150 },
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
      thumbnailSize: { width: 128, height: 128 },
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

        // 최적화된 캡처 창 설정
        const recorderWindow = new BrowserWindow({
          width: this.captureConfig.videoSize.width,
          height: this.captureConfig.videoSize.height,
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

        // 오프스크린 렌더링 최적화
        if (recorderWindow.webContents.setFrameRate) {
          // 프레임 레이트 설정 (일정한 캡처 주기 유지)
          recorderWindow.webContents.setFrameRate(this.captureConfig.fps);
        }

        // 로컬 HTML 파일 생성 및 로드
        const recorderHtmlPath = path.join(captureDir, "recorder.html");
        const recorderHtml = this._generateRecorderHtml();

        storageManager.createHtmlFile(recorderHtmlPath, recorderHtml);
        recorderWindow.loadFile(recorderHtmlPath);

        // 레코더 창 관련 이벤트 및 변수 설정
        this.recorderWindow = recorderWindow;

        // 창이 준비되면 녹화 시작 메시지 전송
        recorderWindow.webContents.on("did-finish-load", () => {
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
   * 녹화 HTML 템플릿 생성
   * @returns {string} HTML 템플릿
   */
  _generateRecorderHtml() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Screen Recorder</title>
      <style>
        body { margin: 0; overflow: hidden; background: #000; }
        video { width: 100%; height: 100%; object-fit: contain; }
      </style>
    </head>
    <body>
      <video id="preview" width="800" height="600" autoplay muted></video>
      <script>
        const { ipcRenderer } = require('electron');
        const fs = require('fs');
        
        let mediaRecorder;
        let recordedChunks = [];
        
        // 녹화 시작
        async function startRecording(sourceId, outputPath) {
          try {
            console.log('녹화를 시작합니다. 소스 ID:', sourceId);
            
            const constraints = {
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: sourceId
                }
              }
            };
            
            console.log('getUserMedia 호출 전:', navigator.mediaDevices);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('스트림 획득 성공');
            
            document.getElementById('preview').srcObject = stream;
            
            // MediaRecorder 생성 - 향상된 설정
            let options;
            try {
              // VP9 코덱 시도 (더 나은 압축률과 품질)
              options = { 
                mimeType: 'video/webm; codecs=vp9',
                videoBitsPerSecond: ${
                  this.captureConfig.videoBitrate * 2000
                } // 2배 더 높은 비트레이트
              };
              mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
              console.log('VP9 지원하지 않음, VP8로 대체:', e);
              // VP8로 대체
              options = { 
                mimeType: 'video/webm; codecs=vp8',
                videoBitsPerSecond: ${
                  this.captureConfig.videoBitrate * 1500
                } // 1.5배 더 높은 비트레이트
              };
              mediaRecorder = new MediaRecorder(stream, options);
            }
            
            console.log('MediaRecorder 생성됨:', mediaRecorder, '설정:', options);
            
            mediaRecorder.ondataavailable = (e) => {
              console.log('데이터 청크 받음:', e.data.size);
              if (e.data.size > 0) {
                recordedChunks.push(e.data);
              }
            };
            
            mediaRecorder.onstop = async () => {
              console.log('녹화 중지됨, 파일 저장 중...');
              // 모든 청크 수집 완료 확인
              await new Promise(resolve => setTimeout(resolve, 200));
              
              const blob = new Blob(recordedChunks, { type: options.mimeType });
              const buffer = Buffer.from(await blob.arrayBuffer());
              fs.writeFileSync(outputPath, buffer);
              
              ipcRenderer.send('RECORDING_COMPLETE', {
                success: true,
                outputPath,
                fileSize: buffer.length
              });
              
              stream.getTracks().forEach(track => track.stop());
              recordedChunks = [];
            };
            
            // 더 짧은 주기로 데이터 청크 생성 (1초마다)
            // 더 자주 청크를 생성하면 프레임 손실을 줄이고 깨짐 현상을 완화
            mediaRecorder.start(1000);
            console.log('MediaRecorder 시작됨');
            ipcRenderer.send('RECORDING_STARTED');
          } catch (error) {
            console.error('녹화 시작 오류:', error);
            ipcRenderer.send('RECORDING_ERROR', {
              message: error.message,
              stack: error.stack
            });
          }
        }
        
        // 이벤트 리스너
        ipcRenderer.on('START_RECORDING', (event, data) => {
          console.log('START_RECORDING 이벤트 받음', data);
          startRecording(data.sourceId, data.outputPath);
        });
        
        ipcRenderer.on('STOP_RECORDING', () => {
          console.log('STOP_RECORDING 이벤트 받음');
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        });
      </script>
    </body>
    </html>
    `;
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
