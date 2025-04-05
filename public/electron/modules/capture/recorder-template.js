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
      </style>
    `;
  }

  /**
   * 스크립트 코드 생성
   * @param {Object} config - 녹화 설정
   * @returns {string} 스크립트 코드
   */
  static _generateScript(config) {
    return `
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
                config.videoBitrate * 2000
              } // 2배 더 높은 비트레이트
            };
            mediaRecorder = new MediaRecorder(stream, options);
          } catch (e) {
            console.log('VP9 지원하지 않음, VP8로 대체:', e);
            // VP8로 대체
            options = { 
              mimeType: 'video/webm; codecs=vp8',
              videoBitsPerSecond: ${
                config.videoBitrate * 1500
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
    `;
  }
}

module.exports = RecorderTemplate;
