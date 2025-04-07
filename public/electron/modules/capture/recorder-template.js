/**
 * 녹화 HTML 템플릿 모듈
 * SOLID 원칙에 따라 화면 녹화 HTML 템플릿을 관리합니다.
 */

/**
 * 템플릿 생성 오류 클래스
 */
class TemplateError extends Error {
  constructor(message, section, config = null) {
    super(message);
    this.name = "TemplateError";
    this.section = section;
    this.config = config;
  }
}

/**
 * 설정 검증기
 */
class ConfigValidator {
  /**
   * 녹화 설정 유효성 검사
   * @param {Object} config - 검사할 녹화 설정
   * @throws {TemplateError} 유효하지 않은 설정인 경우
   */
  static validate(config) {
    if (!config) {
      throw new TemplateError("설정이 제공되지 않았습니다.", "config", config);
    }

    // videoSize 필수 검사
    if (!config.videoSize) {
      throw new TemplateError(
        "비디오 크기가 지정되지 않았습니다.",
        "videoSize",
        config
      );
    }

    // 너비와 높이 값 검사
    if (
      !config.videoSize.width ||
      !config.videoSize.height ||
      config.videoSize.width <= 0 ||
      config.videoSize.height <= 0
    ) {
      throw new TemplateError(
        "비디오 해상도가 유효하지 않습니다.",
        "videoSize",
        config.videoSize
      );
    }

    // fps 값 범위 검사 (지정되지 않았으면 기본값 사용)
    if (config.fps !== undefined && (config.fps <= 0 || config.fps > 60)) {
      throw new TemplateError(
        "FPS 값이 유효하지 않습니다. 1-60 사이의 값을 사용하세요.",
        "fps",
        config.fps
      );
    }

    // 비트레이트 값 범위 검사 (지정되지 않았으면 기본값 사용)
    if (config.videoBitrate !== undefined && config.videoBitrate <= 0) {
      throw new TemplateError(
        "비디오 비트레이트가 유효하지 않습니다.",
        "videoBitrate",
        config.videoBitrate
      );
    }

    return true;
  }
}

/**
 * HTML 템플릿 생성기
 */
class HtmlGenerator {
  /**
   * HTML 문서 생성
   * @param {string} styles - CSS 스타일 문자열
   * @param {string} script - JavaScript 코드 문자열
   * @returns {string} 완성된 HTML 문서
   */
  static generateDocument(styles, script) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Screen Recorder</title>
      ${styles}
    </head>
    <body>
      <video id="preview" width="800" height="600" autoplay muted></video>
      <div id="status">녹화 중...</div>
      <script>
        ${script}
      </script>
    </body>
    </html>
    `;
  }
}

/**
 * CSS 스타일 생성기
 */
class StyleGenerator {
  /**
   * CSS 스타일 생성
   * @param {Object} config - 녹화 설정 (현재 사용하지 않지만 확장성을 위해 유지)
   * @returns {string} 스타일 태그로 감싼 CSS 코드
   */
  static generate(config = {}) {
    return `
      <style>
        body { 
          margin: 0; 
          overflow: hidden; 
          background: #000; 
        }
        
        video { 
          width: 100%; 
          height: 100%; 
          object-fit: contain; 
        }
        
        #status { 
          position: fixed; 
          bottom: 10px; 
          right: 10px; 
          background: rgba(0,0,0,0.5); 
          color: white; 
          padding: 5px 10px; 
          border-radius: 4px; 
          font-family: Arial, sans-serif;
          display: none;
        }
      </style>
    `;
  }
}

/**
 * JavaScript 코드 생성기
 */
class ScriptGenerator {
  /**
   * 녹화 스크립트 생성
   * @param {Object} config - 녹화 설정
   * @returns {string} JavaScript 코드
   */
  static generate(config) {
    const { videoSize, fps = 30, videoBitrate = 6000 } = config;

    // 캡처 설정 로깅
    console.log(
      `[ScriptGenerator] 스크립트 생성 - 해상도: ${videoSize.width}x${videoSize.height}, FPS: ${fps}, 비트레이트: ${videoBitrate}`
    );

    return `
      // 녹화 설정
      const config = {
        fps: ${fps},
        videoBitrate: ${videoBitrate},
        width: ${videoSize.width},
        height: ${videoSize.height}
      };
      
      console.log('설정된 녹화 해상도:', config.width, 'x', config.height);

      const { ipcRenderer } = require('electron');
      const fs = require('fs');
      const path = require('path');
      
      // 전역 상태 변수
      let mediaRecorder;
      let recordedChunks = [];
      let startTime;
      let outputPath;
      
      // 이벤트 리스너 등록
      setupEventListeners();
      
      /**
       * 이벤트 리스너 설정
       */
      function setupEventListeners() {
        // 녹화 시작 이벤트 리스너
        ipcRenderer.on('START_RECORDING', handleStartRecording);
        
        // 녹화 중지 이벤트 리스너
        ipcRenderer.on('STOP_RECORDING', handleStopRecording);
      }
      
      /**
       * 녹화 시작 요청 처리
       * @param {Event} event - 이벤트 객체
       * @param {Object} data - 녹화 데이터
       */
      async function handleStartRecording(event, data) {
        try {
          const { sourceId, outputPath: outputFilePath } = data;
          outputPath = outputFilePath;
          
          console.log('녹화 시작 요청 받음:', sourceId);
          console.log('출력 경로:', outputPath);
          console.log('설정:', config);
          
          await startRecording(sourceId);
        } catch (error) {
          console.error('녹화 시작 오류:', error);
          ipcRenderer.send('RECORDING_ERROR', { error: error.message });
        }
      }
      
      /**
       * 녹화 중지 요청 처리
       */
      function handleStopRecording() {
        console.log('녹화 중지 요청 받음');
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }
      
      /**
       * 녹화 시작
       * @param {string} sourceId - 녹화할 소스 ID
       */
      async function startRecording(sourceId) {
        try {
          // 스트림 가져오기
          const stream = await getMediaStream(sourceId);
          
          // 비디오 미리보기 설정
          setupVideoPreview(stream);
          
          // 미디어 레코더 초기화 및 시작
          initializeRecorder(stream);
          
          // 녹화 시작 상태 표시
          document.getElementById('status').style.display = 'block';
          
          // 녹화 시작 알림
          ipcRenderer.send('RECORDING_STARTED');
          console.log('녹화가 시작되었습니다');
        } catch (error) {
          console.error('스트림 가져오기 오류:', error);
          ipcRenderer.send('RECORDING_ERROR', { error: error.message });
        }
      }
      
      /**
       * 미디어 스트림 가져오기
       * @param {string} sourceId - 캡처할 소스 ID
       * @returns {Promise<MediaStream>} 미디어 스트림
       */
      async function getMediaStream(sourceId) {
        return await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              minWidth: config.width,
              maxWidth: config.width,
              minHeight: config.height,
              maxHeight: config.height,
              frameRate: config.fps
            }
          }
        });
      }
      
      /**
       * 비디오 미리보기 설정
       * @param {MediaStream} stream - 미디어 스트림
       */
      function setupVideoPreview(stream) {
        const videoElement = document.getElementById('preview');
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = (e) => {
          videoElement.play();
          console.log('실제 비디오 크기:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        };
      }
      
      /**
       * 미디어 레코더 초기화 및 시작
       * @param {MediaStream} stream - 미디어 스트림
       */
      function initializeRecorder(stream) {
        // 녹화 설정
        const options = {
          mimeType: 'video/webm; codecs=vp9',
          videoBitsPerSecond: config.videoBitrate * 1000
        };
        
        // 미디어 레코더 초기화
        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];
        
        // 미디어 레코더 이벤트 핸들러
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.onstop = handleStop;
        
        // 녹화 시작
        mediaRecorder.start(1000); // 1초마다 데이터 청크 생성
        startTime = Date.now();
      }
      
      /**
       * 녹화 데이터 처리
       * @param {BlobEvent} e - Blob 이벤트
       */
      function handleDataAvailable(e) {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      }
      
      /**
       * 녹화 중지 처리
       */
      async function handleStop() {
        console.log('녹화 중지됨');
        document.getElementById('status').style.display = 'none';
        
        // 스트림 리소스 해제
        releaseStreamResources();
        
        // 청크 데이터를 블롭으로 변환
        const blob = new Blob(recordedChunks, {
          type: 'video/webm'
        });
        
        // 녹화 파일 저장
        await saveRecording(blob);
      }
      
      /**
       * 스트림 리소스 해제
       */
      function releaseStreamResources() {
        try {
          const videoElement = document.getElementById('preview');
          if (videoElement && videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => {
              track.stop();
              console.log('미디어 트랙 중지:', track.kind);
            });
            videoElement.srcObject = null;
            console.log('스트림 리소스 해제 완료');
          }
        } catch (error) {
          console.error('스트림 리소스 해제 중 오류:', error);
        }
      }
      
      /**
       * 녹화 파일 저장
       * @param {Blob} blob - 녹화 데이터
       */
      async function saveRecording(blob) {
        try {
          const buffer = Buffer.from(await blob.arrayBuffer());
          
          // 파일로 저장
          fs.writeFile(outputPath, buffer, (err) => {
            if (err) {
              handleSaveError(err);
              return;
            }
            
            // 파일 크기 확인
            fs.stat(outputPath, (err, stats) => {
              const recordingData = {
                outputPath,
                fileSize: err ? buffer.length : stats.size,
                duration: Date.now() - startTime
              };
              
              if (err) {
                console.error('파일 정보 가져오기 오류:', err);
              }
              
              // 녹화 완료 메시지 전송
              ipcRenderer.send('RECORDING_COMPLETE', recordingData);
              
              if (!err) {
                console.log('녹화 파일 저장 완료:', outputPath);
                console.log('파일 크기:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
              }
            });
          });
        } catch (error) {
          handleSaveError(error);
        }
      }
      
      /**
       * 저장 오류 처리
       * @param {Error} error - 발생한 오류
       */
      function handleSaveError(error) {
        console.error('녹화 파일 저장 오류:', error);
        ipcRenderer.send('RECORDING_ERROR', { 
          error: error.message || '파일 저장 중 오류가 발생했습니다.'
        });
      }
    `;
  }
}

/**
 * 녹화 HTML 템플릿 생성기
 */
class RecorderTemplate {
  /**
   * 녹화 HTML 템플릿 생성
   * @param {Object} config - 녹화 설정
   * @returns {string} 생성된 HTML 템플릿
   * @throws {TemplateError} 설정 유효성 검사 실패 시
   */
  static generate(config) {
    try {
      // 설정 유효성 검사
      ConfigValidator.validate(config);

      // 실제 해상도 로깅
      console.log(
        `[RecorderTemplate] HTML 생성 - 설정된 해상도: ${config.videoSize.width}x${config.videoSize.height}`
      );

      // 각 구성 요소 생성
      const styles = StyleGenerator.generate(config);
      const script = ScriptGenerator.generate(config);

      // 최종 HTML 문서 생성
      return HtmlGenerator.generateDocument(styles, script);
    } catch (error) {
      if (error instanceof TemplateError) {
        console.error(`[RecorderTemplate] 템플릿 생성 오류: ${error.message}`);
        throw error;
      }
      // 기타 오류 처리
      console.error("[RecorderTemplate] 예기치 않은 오류:", error);
      throw new TemplateError(
        `템플릿 생성 중 오류가 발생했습니다: ${error.message}`,
        "unknown",
        config
      );
    }
  }

  /**
   * 기본 HTML 템플릿 생성 (설정 없이)
   * @returns {string} 생성된 기본 HTML 템플릿
   */
  static generateDefault() {
    const defaultConfig = {
      videoSize: { width: 1920, height: 1080 },
      fps: 30,
      videoBitrate: 6000,
    };

    return this.generate(defaultConfig);
  }
}

module.exports = RecorderTemplate;
