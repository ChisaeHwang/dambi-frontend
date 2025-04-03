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
      fps: 15, // 캡처 프레임 속도
      videoBitrate: 3000, // 비디오 비트레이트
      videoSize: {
        width: 1280,
        height: 720,
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

      // 올바른 방식으로 레코더 인스턴스 생성
      const recorder = new electronScreenRecorder.default();

      console.log(`[RecorderService] 레코더 인스턴스 생성됨:`, typeof recorder);

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

      // 녹화 시작
      await recorder.startRecording(recordOptions);
      console.log(`[RecorderService] 메인 프로세스에서 녹화 시작됨`);

      // 녹화 객체 저장
      this.recorder = recorder;

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

        // 간소화된 캡처 창 사용
        const recorderWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: false, // 항상 숨김 상태로 실행
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            backgroundThrottling: false,
            webSecurity: false,
            allowRunningInsecureContent: true,
            enableRemoteModule: true,
          },
        });

        // 로컬 HTML 파일 생성 및 로드
        const recorderHtmlPath = path.join(captureDir, "recorder.html");
        const recorderHtml = this._generateRecorderHtml();

        storageManager.createHtmlFile(recorderHtmlPath, recorderHtml);
        recorderWindow.loadFile(recorderHtmlPath);

        // 레코더 창 관련 이벤트 및 변수 설정
        this.recorderWindow = recorderWindow;

        // 창이 준비되면 녹화 시작 메시지 전송
        recorderWindow.webContents.on("did-finish-load", () => {
          recorderWindow.webContents.send("START_RECORDING", {
            sourceId: source.id,
            outputPath: outputPath,
          });
          resolve(recorderWindow);
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
            
            // MediaRecorder 생성
            const options = { 
              mimeType: 'video/webm; codecs=vp8',
              videoBitsPerSecond: ${this.captureConfig.videoBitrate * 1000}
            };
            
            mediaRecorder = new MediaRecorder(stream, options);
            console.log('MediaRecorder 생성됨:', mediaRecorder);
            
            mediaRecorder.ondataavailable = (e) => {
              console.log('데이터 청크 받음:', e.data.size);
              if (e.data.size > 0) {
                recordedChunks.push(e.data);
              }
            };
            
            mediaRecorder.onstop = async () => {
              console.log('녹화 중지됨, 파일 저장 중...');
              const blob = new Blob(recordedChunks, { type: 'video/webm' });
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
            
            // 5초마다 데이터 청크 생성 (메모리 관리를 위함)
            mediaRecorder.start(5000);
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
