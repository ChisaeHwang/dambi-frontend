/**
 * 캡처 모듈 진입점
 * 타임랩스 캡처와 관련된 모든 기능을 제공합니다.
 */

// 상수 정의
const MODULE_ERRORS = {
  INIT_FAILED: "모듈 초기화 실패",
  ACCESS_BEFORE_INIT: "모듈이 초기화되기 전에 접근",
};

/**
 * 모듈 의존성 관리
 * 모듈의 지연 로딩 및 의존성 관리를 담당합니다.
 */
class ModuleDependencyManager {
  constructor() {
    this._modules = {};
    this._initialized = false;
    this._initError = null;
  }

  /**
   * 모듈 초기화
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  async initialize() {
    try {
      if (this._initialized) return true;

      // 핵심 모듈 로드
      this._modules.storageManager = require("./storage-manager");
      this._modules.recorderService = require("./recorder-service");
      this._modules.timelapseGenerator = require("./timelapse-generator");
      this._modules.captureManager = require("./capture-manager");

      // 모듈 초기화 검증
      this._validateModules();

      this._initialized = true;
      console.log("[CaptureModule] 모듈 초기화 완료");
      return true;
    } catch (error) {
      this._initError = error;
      console.error("[CaptureModule] 초기화 오류:", error);
      return false;
    }
  }

  /**
   * 모듈 유효성 검사
   * @private
   */
  _validateModules() {
    const requiredMethods = {
      captureManager: ["getActiveWindows", "startCapture", "stopCapture"],
      recorderService: ["getCaptureSources", "startRecording", "stopRecording"],
      timelapseGenerator: ["generateTimelapse"],
      storageManager: ["createCaptureDirectory", "getMetadata"],
    };

    for (const [moduleName, methods] of Object.entries(requiredMethods)) {
      const module = this._modules[moduleName];

      if (!module) {
        throw new Error(`${moduleName} 모듈을 로드할 수 없습니다.`);
      }

      for (const method of methods) {
        if (typeof module[method] !== "function") {
          throw new Error(`${moduleName} 모듈에 ${method} 메서드가 없습니다.`);
        }
      }
    }
  }

  /**
   * 모듈 가져오기
   * @param {string} moduleName - 모듈 이름
   * @returns {Object} 요청된 모듈
   */
  getModule(moduleName) {
    if (!this._initialized) {
      if (this._initError) {
        throw this._initError;
      }
      throw new Error(MODULE_ERRORS.ACCESS_BEFORE_INIT);
    }

    const module = this._modules[moduleName];
    if (!module) {
      throw new Error(`요청된 모듈을 찾을 수 없음: ${moduleName}`);
    }

    return module;
  }

  /**
   * 모듈이 초기화되었는지 확인
   * @returns {boolean} 초기화 상태
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * 모든 모듈 가져오기
   * @returns {Object} 로드된 모든 모듈
   */
  getAllModules() {
    if (!this._initialized) {
      throw new Error(MODULE_ERRORS.ACCESS_BEFORE_INIT);
    }
    return { ...this._modules };
  }
}

// 모듈 의존성 관리자 인스턴스 생성
const dependencyManager = new ModuleDependencyManager();

// 비동기 초기화 즉시 실행
(async () => {
  await dependencyManager.initialize();
})();

// 모듈 내보내기
module.exports = {
  /**
   * 캡처 관리자 - 전체 캡처 흐름 조정
   * 캡처 프로세스의 시작, 중지, 상태 관리를 담당합니다.
   */
  get captureManager() {
    return dependencyManager.getModule("captureManager");
  },

  /**
   * 녹화 서비스 - 실제 화면 녹화 담당
   * 화면 녹화의 하드웨어 수준 제어를 담당합니다.
   */
  get recorderService() {
    return dependencyManager.getModule("recorderService");
  },

  /**
   * 타임랩스 생성기 - 녹화 후 타임랩스 생성 담당
   * 녹화된 영상을 타임랩스로 변환하는 작업을 담당합니다.
   */
  get timelapseGenerator() {
    return dependencyManager.getModule("timelapseGenerator");
  },

  /**
   * 스토리지 관리자 - 파일 저장 및 메타데이터 관리
   * 캡처된 파일과 관련 메타데이터의 저장 및 관리를 담당합니다.
   */
  get storageManager() {
    return dependencyManager.getModule("storageManager");
  },

  /**
   * 모듈 초기화
   * 외부에서 초기화 완료를 기다릴 수 있는 방법 제공
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  initialize: async () => {
    return await dependencyManager.initialize();
  },

  /**
   * 모듈 초기화 상태 확인
   * @returns {boolean} 초기화 완료 여부
   */
  isInitialized: () => {
    return dependencyManager.isInitialized();
  },
};
