const { app } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

/**
 * 저장소 관련 에러 클래스
 */
class StorageError extends Error {
  constructor(message, operation, path, originalError = null) {
    super(message);
    this.name = "StorageError";
    this.operation = operation;
    this.path = path;
    this.originalError = originalError;
  }
}

/**
 * 파일 저장 및 메타데이터 관리를 담당하는 클래스
 */
class StorageManager {
  constructor() {
    // 메타데이터 캐시 (성능 향상을 위해)
    this.metadataCache = new Map();
  }

  /**
   * 캡처 디렉토리 생성
   * @returns {Promise<Object>} 생성된 디렉토리 정보
   */
  async createCaptureDirectory() {
    try {
      const captureDir = path.join(
        app.getPath("userData"),
        "captures",
        `capture_${Date.now()}`
      );

      // 디렉토리 존재 여부 확인
      try {
        await fs.access(captureDir);
      } catch (error) {
        // 디렉토리가 없으면 생성
        await fs.mkdir(captureDir, { recursive: true });
      }

      const result = {
        captureDir,
        videoPath: path.join(captureDir, "recording.webm"),
        metadataPath: path.join(captureDir, "metadata.json"),
      };

      return result;
    } catch (error) {
      throw new StorageError(
        "캡처 디렉토리 생성 실패",
        "createCaptureDirectory",
        app.getPath("userData"),
        error
      );
    }
  }

  /**
   * 메타데이터 파일 생성
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @param {Object} metadata - 저장할 메타데이터
   * @returns {Promise<void>}
   */
  async saveMetadata(metadataPath, metadata) {
    try {
      const metadataString = JSON.stringify(metadata, null, 2);
      await fs.writeFile(metadataPath, metadataString, "utf8");

      // 캐시 업데이트
      this.metadataCache.set(metadataPath, { ...metadata });
    } catch (error) {
      throw new StorageError(
        "메타데이터 저장 실패",
        "saveMetadata",
        metadataPath,
        error
      );
    }
  }

  /**
   * 메타데이터 로드
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @returns {Promise<Object|null>} 로드된 메타데이터
   */
  async loadMetadata(metadataPath) {
    try {
      // 캐시에서 먼저 확인
      if (this.metadataCache.has(metadataPath)) {
        return { ...this.metadataCache.get(metadataPath) };
      }

      // 파일 존재 여부 확인
      try {
        await fs.access(metadataPath);
      } catch (error) {
        return null; // 파일이 없으면 null 반환
      }

      const data = await fs.readFile(metadataPath, "utf8");
      const metadata = JSON.parse(data);

      // 캐시에 저장
      this.metadataCache.set(metadataPath, { ...metadata });

      return metadata;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageError(
          "메타데이터 파싱 실패: 유효하지 않은 JSON",
          "loadMetadata",
          metadataPath,
          error
        );
      }
      throw new StorageError(
        "메타데이터 로드 실패",
        "loadMetadata",
        metadataPath,
        error
      );
    }
  }

  /**
   * 메타데이터 가져오기 (별칭 메서드)
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @returns {Promise<Object|null>} 메타데이터 객체
   */
  async getMetadata(metadataPath) {
    return await this.loadMetadata(metadataPath);
  }

  /**
   * 메타데이터 업데이트
   * @param {string} metadataPath - 메타데이터 파일 경로
   * @param {Object} updatedData - 업데이트할 데이터
   * @returns {Promise<Object|null>} 업데이트된 메타데이터
   */
  async updateMetadata(metadataPath, updatedData) {
    try {
      const metadata = await this.loadMetadata(metadataPath);

      if (!metadata) {
        return null;
      }

      const updatedMetadata = { ...metadata, ...updatedData };
      await this.saveMetadata(metadataPath, updatedMetadata);

      return updatedMetadata;
    } catch (error) {
      throw new StorageError(
        "메타데이터 업데이트 실패",
        "updateMetadata",
        metadataPath,
        error
      );
    }
  }

  /**
   * 비디오 파일 크기 가져오기 (동기 버전 유지)
   * @param {string} videoPath - 비디오 파일 경로
   * @returns {number} 파일 크기 (바이트)
   */
  getVideoFileSize(videoPath) {
    try {
      if (fsSync.existsSync(videoPath)) {
        const stats = fsSync.statSync(videoPath);
        return stats.size;
      }
      return 0;
    } catch (error) {
      console.error("비디오 파일 크기 확인 오류:", error);
      return 0;
    }
  }

  /**
   * 비디오 파일 크기 가져오기 (비동기 버전)
   * @param {string} videoPath - 비디오 파일 경로
   * @returns {Promise<number>} 파일 크기 (바이트)
   */
  async getVideoFileSizeAsync(videoPath) {
    try {
      try {
        await fs.access(videoPath);
      } catch (error) {
        return 0; // 파일이 없으면 0 반환
      }

      const stats = await fs.stat(videoPath);
      return stats.size;
    } catch (error) {
      console.error("비디오 파일 크기 확인 오류:", error);
      return 0;
    }
  }

  /**
   * 출력 디렉토리 준비 (없으면 생성)
   * @param {string} outputPath - 출력 경로
   * @returns {Promise<string>} 준비된 출력 경로
   */
  async prepareOutputDirectory(outputPath) {
    try {
      // 경로에 따옴표가 포함되어 있으면 제거
      if (typeof outputPath === "string") {
        outputPath = outputPath.replace(/^["']|["']$/g, "");
      }

      const outputDir = path.dirname(outputPath);

      try {
        await fs.access(outputDir);
      } catch (error) {
        await fs.mkdir(outputDir, { recursive: true });
      }

      return outputPath;
    } catch (error) {
      throw new StorageError(
        "출력 디렉토리 준비 실패",
        "prepareOutputDirectory",
        outputPath,
        error
      );
    }
  }

  /**
   * 타임랩스 출력 경로 생성
   * @param {Object} options - 출력 옵션
   * @returns {string} 타임랩스 출력 경로
   */
  createTimelapseOutputPath(options) {
    try {
      const fileName = `timelapse_${Date.now()}.mp4`;

      if (options && options.outputPath) {
        // 경로에 따옴표가 포함되어 있으면 제거
        let outputPath = options.outputPath;
        if (typeof outputPath === "string") {
          // 시작과 끝의 따옴표 제거
          outputPath = outputPath.replace(/^["']|["']$/g, "");
        }
        return path.join(outputPath, fileName);
      }

      return path.join(app.getPath("videos"), fileName);
    } catch (error) {
      console.error("타임랩스 출력 경로 생성 오류:", error);
      // 오류 발생 시 기본 경로 사용
      return path.join(app.getPath("videos"), `timelapse_${Date.now()}.mp4`);
    }
  }

  /**
   * 파일 삭제
   * @param {string} filePath - 삭제할 파일 경로
   * @returns {Promise<boolean>} 성공 여부
   */
  async deleteFile(filePath) {
    try {
      try {
        await fs.access(filePath);
      } catch (error) {
        return false; // 파일이 없으면 false 반환
      }

      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error("파일 삭제 오류:", error);
      return false;
    }
  }

  /**
   * HTML 파일 생성
   * @param {string} filePath - 파일 경로
   * @param {string} content - 파일 내용
   * @returns {Promise<string>} 파일 경로
   */
  async createHtmlFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content, "utf8");
      return filePath;
    } catch (error) {
      throw new StorageError(
        "HTML 파일 생성 실패",
        "createHtmlFile",
        filePath,
        error
      );
    }
  }

  /**
   * 캐시 정리
   * @param {string} metadataPath - 정리할 메타데이터 경로 (생략 시 전체 캐시 정리)
   */
  clearCache(metadataPath) {
    if (metadataPath) {
      this.metadataCache.delete(metadataPath);
    } else {
      this.metadataCache.clear();
    }
  }

  /**
   * 파일 존재 여부 확인
   * @param {string} filePath - 확인할 파일 경로
   * @returns {Promise<boolean>} 파일 존재 여부
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
module.exports = new StorageManager();
