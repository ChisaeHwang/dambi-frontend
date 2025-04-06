const { app } = require("electron");
const path = require("path");
const fs = require("fs");

/**
 * 파일 저장 및 메타데이터 관리를 담당하는 클래스
 */
class StorageManager {
  /**
   * 캡처 디렉토리 생성
   * @returns {Object} 생성된 디렉토리 정보
   */
  createCaptureDirectory() {
    const captureDir = path.join(
      app.getPath("userData"),
      "captures",
      `capture_${Date.now()}`
    );

    if (!fs.existsSync(captureDir)) {
      fs.mkdirSync(captureDir, { recursive: true });
    }

    return {
      captureDir,
      videoPath: path.join(captureDir, "recording.webm"),
      metadataPath: path.join(captureDir, "metadata.json"),
    };
  }

  /**
   * 메타데이터 파일 생성
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @param {Object} metadata - 저장할 메타데이터
   */
  saveMetadata(metadataPath, metadata) {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * 메타데이터 로드
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @returns {Object} 로드된 메타데이터
   */
  loadMetadata(metadataPath) {
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    }
    return null;
  }

  /**
   * 메타데이터 가져오기 (별칭 메서드)
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @returns {Object} 메타데이터 객체
   */
  getMetadata(metadataPath) {
    return this.loadMetadata(metadataPath);
  }

  /**
   * 메타데이터 업데이트
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @param {Object} updatedData - 업데이트할 데이터
   */
  updateMetadata(metadataPath, updatedData) {
    if (fs.existsSync(metadataPath)) {
      const metadata = this.loadMetadata(metadataPath);
      const updatedMetadata = { ...metadata, ...updatedData };
      this.saveMetadata(metadataPath, updatedMetadata);
      return updatedMetadata;
    }
    return null;
  }

  /**
   * 비디오 파일 크기 가져오기
   * @param {string} videoPath - 비디오 파일 경로
   * @returns {number} 파일 크기 (바이트)
   */
  getVideoFileSize(videoPath) {
    if (fs.existsSync(videoPath)) {
      const stats = fs.statSync(videoPath);
      return stats.size;
    }
    return 0;
  }

  /**
   * 출력 디렉토리 준비 (없으면 생성)
   * @param {string} outputPath - 출력 경로
   * @returns {string} 준비된 출력 경로
   */
  prepareOutputDirectory(outputPath) {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    return outputPath;
  }

  /**
   * 타임랩스 출력 경로 생성
   * @param {Object} options - 출력 옵션
   * @returns {string} 타임랩스 출력 경로
   */
  createTimelapseOutputPath(options) {
    if (options.outputPath) {
      // 파일명 생성 (타임스탬프 추가)
      const fileName = `timelapse_${Date.now()}.mp4`;
      // 전체 경로 설정
      return path.join(options.outputPath, fileName);
    }

    // 기본 경로 사용
    return path.join(app.getPath("videos"), `timelapse_${Date.now()}.mp4`);
  }

  /**
   * 파일 삭제
   * @param {string} filePath - 삭제할 파일 경로
   * @returns {boolean} 성공 여부
   */
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error("파일 삭제 오류:", error);
      return false;
    }
  }

  /**
   * HTML 파일 생성
   * @param {string} filePath - 파일 경로
   * @param {string} content - 파일 내용
   */
  createHtmlFile(filePath, content) {
    fs.writeFileSync(filePath, content);
    return filePath;
  }
}

module.exports = new StorageManager();
