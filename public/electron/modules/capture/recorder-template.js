/**
 * 녹화 HTML 템플릿 모듈
 * SOLID 원칙에 따라 화면 녹화 HTML 템플릿을 관리합니다.
 */

/**
 * 녹화 HTML 템플릿 생성기
 */
class RecorderTemplate {
  /**
   * 녹화 HTML 템플릿 생성
   * @param {Object} config - 녹화 설정
   * @returns {string} 생성된 HTML 템플릿
   */
  static generate(config) {
    // 캡처 설정에서 필요한 값 가져오기
    const { videoSize, fps, videoBitrate } = config;

    // 실제 해상도 로깅
    console.log(
      `[RecorderTemplate] HTML 생성 - 설정된 해상도: ${videoSize.width}x${videoSize.height}`
    );

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Screen Recorder</title>
      ${this._generateStyles()}
    </head>
    <body>
      <video id="preview" width="800" height="600" autoplay muted></video>
      <div id="status">녹화 중...</div>
      <script>
        ${this._generateScript(config)}
      </script>
    </body>
    </html>
    `;
  }

  /**
   * 스타일 코드 생성
   * @returns {string} 스타일 코드
   */
  static _generateStyles() {
    return `
      <style>
        body { margin: 0; overflow: hidden; background: #000; }
        video { width: 100%; height: 100%; object-fit: contain; }
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

  /**
   * 스크립트 코드 생성
   * @param {Object} config - 녹화 설정
   * @returns {string} 스크립트 코드
   */
  static _generateScript(config) {
    const { videoSize, fps, videoBitrate } = config;

    // 캡처 설정 로깅
    console.log(
      `[RecorderTemplate] 스크립트 생성 - 해상도: ${videoSize.width}x${videoSize.height}, FPS: ${fps}, 비트레이트: ${videoBitrate}`
    );

    return `
      // 녹화 설정
      const config = {
        fps: ${fps || 30},
        videoBitrate: ${videoBitrate || 6000},
        width: ${videoSize.width},
        height: ${videoSize.height}
      };
      
      console.log('설정된 녹화 해상도:', config.width, 'x', config.height);

      const { ipcRenderer } = require('electron');
      const fs = require('fs');
      const path = require('path');
      
      let mediaRecorder;
      let recordedChunks = [];
      let startTime;
      let outputPath;
      
      // 녹화 시작 이벤트 리스너
      ipcRenderer.on('START_RECORDING', async (event, data) => {
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
      });
      
      // 녹화 중지 이벤트 리스너
      ipcRenderer.on('STOP_RECORDING', () => {
        console.log('녹화 중지 요청 받음');
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      });
      
      /**
       * 녹화 시작
       * @param {string} sourceId - 녹화할 소스 ID
       */
      async function startRecording(sourceId) {
        try {
          // 스트림 가져오기
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              // 데스크톱 캡처 제약 조건
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
          
          // 비디오 미리보기 설정
          const videoElement = document.getElementById('preview');
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = (e) => {
            videoElement.play();
            console.log('실제 비디오 크기:', videoElement.videoWidth, 'x', videoElement.videoHeight);
          };
          
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
        
        // 청크 데이터를 블롭으로 변환
        const blob = new Blob(recordedChunks, {
          type: 'video/webm'
        });
        
        // 녹화 파일 저장
        await saveRecording(blob);
      }
      
      /**
       * 녹화 파일 저장
       * @param {Blob} blob - 녹화 데이터
       */
      async function saveRecording(blob) {
        const buffer = Buffer.from(await blob.arrayBuffer());
        
        // 파일로 저장
        fs.writeFile(outputPath, buffer, (err) => {
          if (err) {
            console.error('녹화 파일 저장 오류:', err);
            ipcRenderer.send('RECORDING_ERROR', { error: err.message });
            return;
          }
          
          // 파일 크기 확인
          fs.stat(outputPath, (err, stats) => {
            if (err) {
              console.error('파일 정보 가져오기 오류:', err);
              ipcRenderer.send('RECORDING_COMPLETE', { 
                outputPath,
                fileSize: buffer.length,
                duration: Date.now() - startTime
              });
              return;
            }
            
            // 녹화 완료 메시지 전송
            ipcRenderer.send('RECORDING_COMPLETE', {
              outputPath,
              fileSize: stats.size,
              duration: Date.now() - startTime
            });
            
            console.log('녹화 파일 저장 완료:', outputPath);
            console.log('파일 크기:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
          });
        });
      }
    `;
  }
}

module.exports = RecorderTemplate;
