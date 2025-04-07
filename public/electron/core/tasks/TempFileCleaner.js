const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * 임시 파일 정리 작업
 */
class TempFileCleaner {
  /**
   * 임시 파일 정리
   * @returns {boolean} 성공 여부
   */
  static cleanup() {
    try {
      // 앱 관련 임시 디렉토리 경로
      const tempDir = path.join(os.tmpdir(), "dambi-app-temp");

      // 디렉토리가 존재하는지 확인
      if (fs.existsSync(tempDir)) {
        // 디렉토리 내 파일 목록 가져오기
        const files = fs.readdirSync(tempDir);

        // 각 파일 삭제
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          try {
            fs.unlinkSync(filePath);
            console.log(`임시 파일 삭제: ${filePath}`);
          } catch (err) {
            console.error(`임시 파일 삭제 실패: ${filePath}`, err);
          }
        }

        console.log(`임시 파일 정리 완료: ${files.length}개 파일 처리됨`);
      } else {
        console.log("임시 디렉토리가 존재하지 않음, 정리 작업 건너뜀");
      }

      return true;
    } catch (error) {
      console.error("임시 파일 정리 실패:", error);
      return false;
    }
  }
}

module.exports = TempFileCleaner;
