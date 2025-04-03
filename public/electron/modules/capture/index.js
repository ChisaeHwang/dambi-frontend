/**
 * 캡처 모듈 진입점
 * 타임랩스 캡처와 관련된 모든 기능을 제공합니다.
 */

// 캡처 모듈들 내보내기
module.exports = {
  /**
   * 캡처 관리자 - 전체 캡처 흐름 조정
   */
  captureManager: require("./capture-manager"),

  /**
   * 녹화 서비스 - 실제 화면 녹화 담당
   */
  recorderService: require("./recorder-service"),

  /**
   * 타임랩스 생성기 - 녹화 후 타임랩스 생성 담당
   */
  timelapseGenerator: require("./timelapse-generator"),

  /**
   * 스토리지 관리자 - 파일 저장 및 메타데이터 관리
   */
  storageManager: require("./storage-manager"),
};
