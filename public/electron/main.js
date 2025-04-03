const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const isDev = require("electron-is-dev");

// 전역 변수로 메인 윈도우 객체 유지
let mainWindow;

// 타임랩스 캡처 클래스
class TimelapseCapture {
  constructor() {
    this.isCapturing = false;
    this.captureDir = null;
    this.startTime = null;
    this.endTime = null;
    this.videoPath = null;
    this.captureConfig = {
      fps: 10, // 캡처 프레임 속도 (낮추면 파일 크기 감소, 높이면 더 부드러움)
      videoBitrate: 2500, // 비디오 비트레이트 (낮추면 파일 크기 감소)
      videoSize: {
        // 캡처 해상도
        width: 1280,
        height: 720,
      },
    };

    // 상태 관리를 위한 변수들
    this.recordingDuration = 0;
    this.recordingInterval = null;
    this.statusUpdateInterval = null;
  }

  async startCapture(windowId, windowName) {
    // 캡처를 이미 진행 중이면 중지
    if (this.isCapturing) {
      this.stopCapture();
    }

    console.log(
      `[TimelapseCapture] 캡처 시작: windowId=${windowId}, windowName=${windowName}`
    );

    // 캡처 디렉토리 생성
    this.captureDir = path.join(
      app.getPath("userData"),
      "captures",
      `capture_${Date.now()}`
    );

    if (!fs.existsSync(this.captureDir)) {
      fs.mkdirSync(this.captureDir, { recursive: true });
    }

    // 비디오 파일 경로 설정
    this.videoPath = path.join(this.captureDir, "recording.webm");

    // 메타데이터 파일 생성
    this.startTime = Date.now();
    this.recordingDuration = 0;

    const metaData = {
      startTime: this.startTime,
      fps: this.captureConfig.fps,
      videoBitrate: this.captureConfig.videoBitrate,
      videoSize: this.captureConfig.videoSize,
      windowId,
      windowName,
    };

    fs.writeFileSync(
      path.join(this.captureDir, "metadata.json"),
      JSON.stringify(metaData, null, 2)
    );

    try {
      // 캡처할 소스 찾기
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: {
          width: 128,
          height: 128,
        },
      });

      console.log(
        `[TimelapseCapture] 사용 가능한 소스: ${sources
          .map((s) => s.id)
          .join(", ")}`
      );

      const selectedSource = sources.find((source) => source.id === windowId);

      if (!selectedSource) {
        throw new Error(`지정된 창을 찾을 수 없습니다: ${windowId}`);
      }

      console.log(
        `[TimelapseCapture] 선택된 소스: ${selectedSource.id}, ${selectedSource.name}`
      );

      try {
        // Electron 19 이상에서는 desktopCapturer API가 메인 프로세스에서도 사용 가능
        // electron-screen-recorder 패키지 활용
        const { ScreenRecorder } = require("electron-screen-recorder");

        console.log(`[TimelapseCapture] 일렉트론 스크린 레코더 사용 시도`);

        // 메인 프로세스에서 녹화 시작
        const recorder = new ScreenRecorder();

        // 녹화 설정
        const recordOptions = {
          fps: this.captureConfig.fps,
          videoSource: selectedSource.id,
          outputFilePath: this.videoPath,
          width: this.captureConfig.videoSize.width,
          height: this.captureConfig.videoSize.height,
          showCursor: true,
        };

        console.log(`[TimelapseCapture] 녹화 설정:`, recordOptions);

        // 녹화 시작
        await recorder.startRecording(recordOptions);

        console.log(`[TimelapseCapture] 메인 프로세스에서 녹화 시작됨`);

        // 녹화 상태 설정
        this.isCapturing = true;
        this.recordingDuration = 0;

        // 녹화 객체 저장
        this.recorder = recorder;

        // 녹화 시간 측정 시작
        this.recordingInterval = setInterval(() => {
          this.recordingDuration += 1000; // 1초씩 증가
        }, 1000);

        // 상태 업데이트 타이머 시작
        this.statusUpdateInterval = setInterval(() => {
          this.emitStatusUpdate();
        }, 1000);

        this.emitStatusUpdate();

        return { success: true, captureDir: this.captureDir };
      } catch (mainRecordingError) {
        // 메인 프로세스 녹화 실패 시 로그 출력 후 렌더러 프로세스 방식으로 폴백
        console.error(
          `[TimelapseCapture] 메인 프로세스 녹화 실패:`,
          mainRecordingError
        );
        console.log(`[TimelapseCapture] 렌더러 프로세스 녹화 방식으로 전환`);

        // 간소화된 캡처 창 사용
        const recorderWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: isDev, // 개발 모드에서만 표시 (디버깅용)
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
        const recorderHtmlPath = path.join(this.captureDir, "recorder.html");
        const recorderHtml = `
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

        fs.writeFileSync(recorderHtmlPath, recorderHtml);
        recorderWindow.loadFile(recorderHtmlPath);

        // 개발자 도구 열기 (디버깅용)
        if (isDev) {
          recorderWindow.webContents.openDevTools();
        }

        // 레코더 창 관련 이벤트 및 변수 설정
        this.recorderWindow = recorderWindow;

        // 이벤트 리스너 등록
        const handleRecordingStarted = () => {
          console.log("녹화가 시작되었습니다.");
          this.isCapturing = true;

          // 녹화 시간 측정 시작
          this.recordingDuration = 0;
          this.recordingInterval = setInterval(() => {
            this.recordingDuration += 1000; // 1초씩 증가
          }, 1000);

          // 상태 업데이트 타이머 시작
          this.statusUpdateInterval = setInterval(() => {
            this.emitStatusUpdate();
          }, 1000);

          this.emitStatusUpdate();
        };

        const handleRecordingComplete = (event, data) => {
          console.log(
            `녹화 완료: ${data.outputPath}, 파일 크기: ${(
              data.fileSize /
              1024 /
              1024
            ).toFixed(2)}MB`
          );
          this.endTime = Date.now();

          // 메타데이터 업데이트
          const metaPath = path.join(this.captureDir, "metadata.json");
          if (fs.existsSync(metaPath)) {
            const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            metadata.endTime = this.endTime;
            metadata.duration = this.endTime - this.startTime;
            metadata.fileSize = data.fileSize;
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
          }

          // 타이머 정리
          if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
          }

          if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
          }

          this.isCapturing = false;
          this.emitStatusUpdate();
        };

        const handleRecordingError = (event, error) => {
          console.error("녹화 오류:", error);

          // 타이머 정리
          if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
          }

          if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
          }

          this.isCapturing = false;
          this.emitStatusUpdate();
        };

        // 이벤트 리스너 설정
        ipcMain.once("RECORDING_STARTED", handleRecordingStarted);
        ipcMain.once("RECORDING_COMPLETE", handleRecordingComplete);
        ipcMain.once("RECORDING_ERROR", handleRecordingError);

        // 창이 준비되면 녹화 시작 메시지 전송
        recorderWindow.webContents.on("did-finish-load", () => {
          recorderWindow.webContents.send("START_RECORDING", {
            sourceId: selectedSource.id,
            outputPath: this.videoPath,
          });
        });

        // 창이 닫힐 때 리소스 정리
        recorderWindow.on("closed", () => {
          ipcMain.removeListener("RECORDING_STARTED", handleRecordingStarted);
          ipcMain.removeListener("RECORDING_COMPLETE", handleRecordingComplete);
          ipcMain.removeListener("RECORDING_ERROR", handleRecordingError);
          this.recorderWindow = null;
        });

        return { success: true, captureDir: this.captureDir };
      }
    } catch (error) {
      console.error("캡처 시작 오류:", error);
      this.isCapturing = false;
      return { success: false, error: error.message };
    }
  }

  stopCapture() {
    if (!this.isCapturing) {
      return { success: false, error: "녹화 중이 아닙니다." };
    }

    console.log(`[TimelapseCapture] 캡처 중지 요청 받음`);

    try {
      // 메인 프로세스 기반 녹화인 경우
      if (this.recorder) {
        console.log(`[TimelapseCapture] 메인 프로세스 녹화 중지 시도`);
        this.recorder.stopRecording();
        this.recorder = null;

        // 메타데이터 업데이트
        this.endTime = Date.now();
        const metaPath = path.join(this.captureDir, "metadata.json");
        if (fs.existsSync(metaPath)) {
          const metadata = JSON.parse(fs.readFileSync(metaPath, "utf8"));
          metadata.endTime = this.endTime;
          metadata.duration = this.endTime - this.startTime;
          // 파일 크기 업데이트
          if (fs.existsSync(this.videoPath)) {
            const stats = fs.statSync(this.videoPath);
            metadata.fileSize = stats.size;
          }
          fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
        }

        // 타이머 정리
        if (this.recordingInterval) {
          clearInterval(this.recordingInterval);
          this.recordingInterval = null;
        }

        if (this.statusUpdateInterval) {
          clearInterval(this.statusUpdateInterval);
          this.statusUpdateInterval = null;
        }

        this.isCapturing = false;
        this.emitStatusUpdate();

        console.log(`[TimelapseCapture] 메인 프로세스 녹화 중지 완료`);
      }
      // 렌더러 프로세스(BrowserWindow) 기반 녹화인 경우
      else if (this.recorderWindow && !this.recorderWindow.isDestroyed()) {
        console.log(`[TimelapseCapture] 렌더러 프로세스 녹화 중지 시도`);
        this.recorderWindow.webContents.send("STOP_RECORDING");
      } else {
        console.log(`[TimelapseCapture] 알 수 없는 녹화 상태 - 강제 중지`);
        // 타이머 정리
        if (this.recordingInterval) {
          clearInterval(this.recordingInterval);
          this.recordingInterval = null;
        }

        if (this.statusUpdateInterval) {
          clearInterval(this.statusUpdateInterval);
          this.statusUpdateInterval = null;
        }

        this.isCapturing = false;
        this.emitStatusUpdate();
      }

      return { success: true };
    } catch (error) {
      console.error("캡처 중지 오류:", error);
      return { success: false, error: error.message };
    }
  }

  emitStatusUpdate() {
    // 상태 업데이트 이벤트 발생
    if (mainWindow && !mainWindow.isDestroyed()) {
      const status = {
        isCapturing: this.isCapturing,
        duration: this.recordingDuration,
      };

      console.log(`[상태 업데이트] ${JSON.stringify(status)}`);
      mainWindow.webContents.send("capture-status", status);
    } else {
      console.log("[상태 업데이트] 메인 윈도우가 없거나 닫혔습니다");
    }
  }

  // 타임랩스 생성
  async generateTimelapse(options) {
    if (this.isCapturing) {
      this.stopCapture();
      // 녹화가 완전히 중지될 때까지 잠시 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!this.captureDir || !this.videoPath || !fs.existsSync(this.videoPath)) {
      throw new Error("유효한 녹화 파일이 없습니다");
    }

    const outputPath =
      options.outputPath ||
      path.join(app.getPath("videos"), `timelapse_${Date.now()}.mp4`);
    const speedFactor = options.speedFactor || 3;
    const quality = options.outputQuality || "medium";
    const preserveOriginals = options.preserveOriginals !== false;

    // 출력 디렉토리 확인 및 생성
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // FFmpeg 품질 설정
    const presetMap = {
      low: "veryfast",
      medium: "medium",
      high: "slow",
    };

    const crfMap = {
      low: "28",
      medium: "23",
      high: "18",
    };

    const preset = presetMap[quality] || "medium";
    const crf = crfMap[quality] || "23";

    // ffmpeg-static 패키지에서 ffmpeg 경로 가져오기
    const ffmpegPath = require("ffmpeg-static");

    console.log(`타임랩스 생성 시작: ${outputPath}`);
    console.log(
      `설정: 속도=${speedFactor}x, 품질=${quality}, 프리셋=${preset}, CRF=${crf}, 원본 보존=${preserveOriginals}`
    );

    // 표준 해상도로 변환 (비디오 해상도가 2의 배수가 아닐 경우 대비)
    const scaleFilter =
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2";

    return new Promise((resolve, reject) => {
      try {
        // 단순히 속도만 조절하는 FFmpeg 명령 사용
        const ffmpeg = spawn(ffmpegPath, [
          "-i",
          this.videoPath,
          "-vf",
          `${scaleFilter},setpts=PTS/${speedFactor}`,
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-preset",
          preset,
          "-crf",
          crf,
          "-an", // 오디오 제거
          "-y", // 기존 파일 덮어쓰기
          outputPath,
        ]);

        ffmpeg.stdout.on("data", (data) => {
          console.log(`ffmpeg 출력: ${data}`);
        });

        ffmpeg.stderr.on("data", (data) => {
          // ffmpeg는 stderr로 진행 상황을 출력하므로 에러가 아님
          console.log(`ffmpeg 정보: ${data}`);
        });

        ffmpeg.on("close", (code) => {
          if (code === 0) {
            console.log(`타임랩스 생성 완료: ${outputPath}`);

            // 원본 파일은 기본적으로 보존
            if (
              !preserveOriginals &&
              this.videoPath &&
              fs.existsSync(this.videoPath)
            ) {
              try {
                fs.unlinkSync(this.videoPath);
                console.log("원본 녹화 파일 삭제 완료");
              } catch (error) {
                console.error("원본 녹화 파일 삭제 오류:", error);
              }
            }

            resolve(outputPath);
          } else {
            const errorMsg = `타임랩스 생성 실패: FFmpeg 오류 코드 ${code}`;
            console.error(errorMsg);
            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        console.error("타임랩스 생성 중 오류:", error);
        reject(error);
      }
    });
  }
}

// 윈도우 생성 함수
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    frame: false, // 사용자 정의 프레임 사용
    backgroundColor: "#2f3136", // 디스코드와 유사한 배경색
  });

  // 개발/배포 환경에 따라 URL 로드
  const startUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "../../build/index.html")}`;

  mainWindow.loadURL(startUrl);

  // 개발 환경에서는 개발자 도구 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 창이 닫힐 때 이벤트
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(() => {
  createWindow();

  // MacOS에서는 앱이 닫혀도 dock에 남아있을 수 있으므로 활성화될 때 창이 없으면 다시 생성
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 창이 닫히면 앱 종료 (Windows/Linux)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 타임랩스 캡처 인스턴스 생성
const timelapseCapture = new TimelapseCapture();

// IPC 이벤트 설정
ipcMain.handle("get-active-windows", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      thumbnailSize: { width: 150, height: 150 },
    });

    // 각 소스에 대해 필요한 정보만 추출
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
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
});

ipcMain.handle("start-capture", async (event, windowId, windowName) => {
  try {
    console.log(`[IPC] 캡처 시작 요청 받음: ${windowId}, ${windowName}`);
    const result = await timelapseCapture.startCapture(windowId, windowName);
    console.log(`[IPC] 캡처 시작 결과:`, result);
    return result;
  } catch (error) {
    console.error("[IPC] 캡처 시작 오류:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("stop-capture", async () => {
  try {
    console.log(`[IPC] 캡처 중지 요청 받음`);
    const result = timelapseCapture.stopCapture();
    console.log(`[IPC] 캡처 중지 결과:`, result);
    return result;
  } catch (error) {
    console.error("[IPC] 캡처 중지 오류:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("generate-timelapse", async (event, options) => {
  try {
    // 사용자 지정 저장 경로가 있는 경우
    if (options.outputPath) {
      // 파일명 생성 (타임스탬프 추가)
      const fileName = `timelapse_${Date.now()}.mp4`;
      // 전체 경로 설정
      options.outputPath = path.join(options.outputPath, fileName);
    }

    return await timelapseCapture.generateTimelapse(options);
  } catch (error) {
    console.error("타임랩스 생성 오류:", error);
    throw error;
  }
});

// 폴더 선택 다이얼로그
ipcMain.handle("select-save-folder", async () => {
  try {
    // 다이얼로그 열기
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "타임랩스 저장 폴더 선택",
      defaultPath: app.getPath("videos"),
      properties: ["openDirectory", "createDirectory"],
      buttonLabel: "선택",
    });

    return result;
  } catch (error) {
    console.error("폴더 선택 다이얼로그 오류:", error);
    throw error;
  }
});

// 윈도우 컨트롤 (최소화, 최대화, 닫기)
ipcMain.handle("minimize-window", () => {
  if (mainWindow) mainWindow.minimize();
  return true;
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
  return mainWindow.isMaximized();
});

ipcMain.handle("close-window", () => {
  if (mainWindow) mainWindow.close();
  return true;
});

ipcMain.handle("is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
