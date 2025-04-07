/**
 * 애플리케이션 모듈 관리
 * 모든 모듈의 중앙 접근 지점 및 초기화 관리를 담당합니다.
 */

// 상수 정의
const MODULE_STATE = {
  UNINITIALIZED: "uninitialized",
  INITIALIZING: "initializing",
  INITIALIZED: "initialized",
  ERROR: "error",
};

/**
 * 모듈 초기화 관리자
 * 모듈 초기화 순서와 의존성을 관리합니다.
 */
class ModuleInitializer {
  constructor() {
    this.modules = new Map();
    this.state = MODULE_STATE.UNINITIALIZED;
    this.error = null;
  }

  /**
   * 모듈 등록
   * @param {string} name - 모듈 이름
   * @param {Function|Object} moduleProvider - 모듈 객체 또는 모듈을 반환하는 함수
   * @param {Array<string>} dependencies - 의존하는 모듈 이름 목록
   */
  register(name, moduleProvider, dependencies = []) {
    this.modules.set(name, {
      name,
      provider: moduleProvider,
      dependencies,
      instance: null,
      state: MODULE_STATE.UNINITIALIZED,
    });
  }

  /**
   * 모든 모듈 초기화
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  async initializeAll() {
    try {
      if (
        this.state === MODULE_STATE.INITIALIZING ||
        this.state === MODULE_STATE.INITIALIZED
      ) {
        return this.state === MODULE_STATE.INITIALIZED;
      }

      this.state = MODULE_STATE.INITIALIZING;

      // 기본 모듈 등록
      this._registerCoreModules();

      // 의존성 확인
      this._validateDependencies();

      // 모듈 초기화 순서 결정
      const initOrder = this._calculateInitializationOrder();

      // 순서대로 모듈 초기화
      for (const moduleName of initOrder) {
        await this._initializeModule(moduleName);
      }

      this.state = MODULE_STATE.INITIALIZED;
      console.log("[ModuleInitializer] 모든 모듈 초기화 완료");
      return true;
    } catch (error) {
      this.state = MODULE_STATE.ERROR;
      this.error = error;
      console.error("[ModuleInitializer] 초기화 오류:", error);
      return false;
    }
  }

  /**
   * 핵심 모듈 등록
   * @private
   */
  _registerCoreModules() {
    // 이미 등록된 모듈이 있다면 건너뜀
    if (this.modules.size > 0) return;

    // 기본 모듈 등록 (의존성 순서대로)
    this.register("windowManager", () => require("./window-manager"), []);
    this.register("settingsManager", () => require("./settings-manager"), [
      "windowManager",
    ]);
    this.register("updaterService", () => require("./updater-service"), [
      "windowManager",
    ]);
    this.register("capture", () => require("./capture"), ["windowManager"]);
    this.register("timelapse", () => require("./timelapse-capture"), [
      "capture",
      "windowManager",
    ]);

    // recorder-service는 capture 모듈을 통해 접근
    this.register(
      "recorderService",
      () => {
        const capture = this.get("capture");
        return capture && capture.recorderService;
      },
      ["capture"]
    );
  }

  /**
   * 의존성 검증
   * @private
   */
  _validateDependencies() {
    const moduleNames = Array.from(this.modules.keys());

    for (const [name, config] of this.modules.entries()) {
      for (const dependency of config.dependencies) {
        if (!moduleNames.includes(dependency)) {
          throw new Error(
            `모듈 ${name}의 의존성 ${dependency}를 찾을 수 없습니다.`
          );
        }
      }
    }
  }

  /**
   * 초기화 순서 계산 (위상 정렬)
   * @private
   * @returns {Array<string>} 초기화 순서
   */
  _calculateInitializationOrder() {
    const visited = new Set();
    const visiting = new Set();
    const result = [];

    const visit = (name) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`모듈 의존성에 순환 참조가 있습니다: ${name}`);
      }

      visiting.add(name);

      const config = this.modules.get(name);
      if (config) {
        for (const dependency of config.dependencies) {
          visit(dependency);
        }
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of this.modules.keys()) {
      if (!visited.has(name)) {
        visit(name);
      }
    }

    return result;
  }

  /**
   * 개별 모듈 초기화
   * @private
   * @param {string} name - 모듈 이름
   * @returns {Promise<Object>} 초기화된 모듈
   */
  async _initializeModule(name) {
    const config = this.modules.get(name);
    if (!config) throw new Error(`모듈 ${name}을 찾을 수 없습니다.`);

    if (config.state === MODULE_STATE.INITIALIZED) {
      return config.instance;
    }

    if (config.state === MODULE_STATE.INITIALIZING) {
      throw new Error(`모듈 ${name}의 초기화에 순환 참조가 있습니다.`);
    }

    try {
      config.state = MODULE_STATE.INITIALIZING;

      // 모듈 제공자 실행
      const module =
        typeof config.provider === "function"
          ? config.provider()
          : config.provider;

      // 모듈 초기화 (initialize 메서드가 있다면 호출)
      if (module && typeof module.initialize === "function") {
        await module.initialize();
      }

      config.instance = module;
      config.state = MODULE_STATE.INITIALIZED;
      return module;
    } catch (error) {
      config.state = MODULE_STATE.ERROR;
      throw new Error(`모듈 ${name} 초기화 실패: ${error.message}`);
    }
  }

  /**
   * 모듈 가져오기
   * @param {string} name - 모듈 이름
   * @returns {Object} 모듈 인스턴스
   */
  get(name) {
    const config = this.modules.get(name);
    if (!config) return null;

    // 초기화되지 않았으면 null 반환
    if (config.state !== MODULE_STATE.INITIALIZED) return null;

    return config.instance;
  }

  /**
   * 모듈 상태 확인
   * @param {string} name - 모듈 이름
   * @returns {string} 모듈 상태
   */
  getModuleState(name) {
    return this.modules.get(name)?.state || "unknown";
  }

  /**
   * 초기화 상태 확인
   * @returns {boolean} 모든 모듈 초기화 완료 여부
   */
  isInitialized() {
    return this.state === MODULE_STATE.INITIALIZED;
  }
}

// 모듈 초기화 관리자 인스턴스 생성
const initializer = new ModuleInitializer();

// 비동기 초기화 즉시 실행
(async () => {
  await initializer.initializeAll();
})();

// 모듈 내보내기 (게터를 통한 지연 접근)
module.exports = {
  /**
   * 창 관리 모듈
   */
  get windowManager() {
    return initializer.get("windowManager");
  },

  /**
   * 설정 관리 모듈
   */
  get settingsManager() {
    return initializer.get("settingsManager");
  },

  /**
   * 업데이터 서비스
   */
  get updaterService() {
    return initializer.get("updaterService");
  },

  /**
   * 캡처 모듈
   */
  get capture() {
    return initializer.get("capture");
  },

  /**
   * 타임랩스 모듈
   */
  get timelapse() {
    return initializer.get("timelapse");
  },

  /**
   * 녹화 서비스
   * capture 모듈을 통해 접근합니다.
   */
  get recorderService() {
    return initializer.get("recorderService");
  },

  /**
   * 모듈 초기화
   * 외부에서 초기화 완료를 기다릴 수 있는 방법 제공
   * @returns {Promise<boolean>} 초기화 성공 여부
   */
  initialize: async () => {
    return await initializer.initializeAll();
  },

  /**
   * 모듈 초기화 상태 확인
   * @returns {boolean} 초기화 완료 여부
   */
  isInitialized: () => {
    return initializer.isInitialized();
  },
};
