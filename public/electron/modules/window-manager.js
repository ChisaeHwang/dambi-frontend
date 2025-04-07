const { BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const EventEmitter = require("events");

/**
 * 창 상태 관리 클래스
 */
class WindowState {
  constructor(id, type, instance) {
    this.id = id;
    this.type = type;
    this.isMaximized = false;
    this.isMinimized = false;
    this.isFocused = true;
    this.bounds = instance.getBounds();
    this.instance = instance;
  }

  /**
   * 창 상태 업데이트
   */
  update() {
    if (!this.instance || this.instance.isDestroyed()) return;

    this.isMaximized = this.instance.isMaximized();
    this.isMinimized = this.instance.isMinimized();
    this.isFocused = this.instance.isFocused();
    this.bounds = this.instance.getBounds();

    return this;
  }
}

/**
 * 윈도우 관리 클래스
 * 이벤트 기반 창 관리 시스템
 */
class WindowManager extends EventEmitter {
  constructor() {
    super();

    // 윈도우 저장소
    this.windows = new Map();

    // 기본 윈도우 타입
    this.mainWindowId = null;

    // 이벤트 리스너 설정
    this._setupEventListeners();
  }

  /**
   * 내부 이벤트 리스너 설정
   * @private
   */
  _setupEventListeners() {
    // 앱 종료 전 정리 작업
    process.on("exit", () => {
      this.closeAll();
    });
  }

  /**
   * 메인 윈도우 생성
   * @param {Object} options - 추가 옵션
   * @returns {BrowserWindow} 생성된 메인 윈도우
   */
  createWindow(options = {}) {
    const defaultOptions = {
      width: 1280,
      height: 720,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload.js"),
      },
      frame: false, // 사용자 정의 프레임 사용
      useContentSize: true, // 컨텐츠 크기 사용
      backgroundColor: "#2f3136", // 디스코드와 유사한 배경색
      titleBarStyle: "hidden", // 타이틀바 숨김
      titleBarOverlay: false, // 타이틀바 오버레이 사용 안함
    };

    // 옵션 병합
    const windowOptions = { ...defaultOptions, ...options };

    // 창 생성
    const window = new BrowserWindow(windowOptions);

    // 개발/배포 환경에 따라 URL 로드
    const startUrl = isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../../../build/index.html")}`;

    window.loadURL(startUrl);

    // 개발 환경에서는 개발자 도구 열기
    if (isDev) {
      window.webContents.openDevTools();
    }

    // 윈도우 ID 생성
    const id = `window-${Date.now()}`;

    // 윈도우 상태 초기화 및 등록
    const state = new WindowState(id, "main", window);
    this.windows.set(id, { window, state });

    // 첫 번째 창은 메인으로 설정
    if (!this.mainWindowId) {
      this.mainWindowId = id;
    }

    // 창 이벤트 연결
    this._setupWindowEvents(id, window);

    // 창 생성 이벤트 발생
    this.emit("window-created", { id, type: "main" });

    return window;
  }

  /**
   * 특정 창의 이벤트 리스너 설정
   * @param {string} id - 창 ID
   * @param {BrowserWindow} window - 창 인스턴스
   * @private
   */
  _setupWindowEvents(id, window) {
    // 창이 닫힐 때
    window.on("closed", () => {
      this.windows.delete(id);
      this.emit("window-closed", { id });

      // 메인 윈도우가 닫히면 mainWindowId 초기화
      if (id === this.mainWindowId) {
        this.mainWindowId =
          this.windows.size > 0 ? Array.from(this.windows.keys())[0] : null;
      }
    });

    // 창 상태 변경 시 이벤트 발생
    window.on("maximize", () => {
      const state = this.windows.get(id)?.state;
      if (state) {
        state.update();
        this.emit("window-state-changed", { id, state: { isMaximized: true } });
      }
    });

    window.on("unmaximize", () => {
      const state = this.windows.get(id)?.state;
      if (state) {
        state.update();
        this.emit("window-state-changed", {
          id,
          state: { isMaximized: false },
        });
      }
    });

    window.on("minimize", () => {
      const state = this.windows.get(id)?.state;
      if (state) {
        state.update();
        this.emit("window-state-changed", { id, state: { isMinimized: true } });
      }
    });

    window.on("restore", () => {
      const state = this.windows.get(id)?.state;
      if (state) {
        state.update();
        this.emit("window-state-changed", {
          id,
          state: { isMinimized: false },
        });
      }
    });

    window.on("focus", () => {
      const state = this.windows.get(id)?.state;
      if (state) {
        state.update();
        this.emit("window-state-changed", { id, state: { isFocused: true } });
      }
    });

    window.on("blur", () => {
      const state = this.windows.get(id)?.state;
      if (state) {
        state.update();
        this.emit("window-state-changed", { id, state: { isFocused: false } });
      }
    });

    // 크기 변경 이벤트는 쓰로틀링 적용
    let resizeTimeout = null;
    window.on("resize", () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        const state = this.windows.get(id)?.state;
        if (state) {
          state.update();
          this.emit("window-state-changed", {
            id,
            state: { bounds: state.bounds },
          });
        }
        resizeTimeout = null;
      }, 500);
    });
  }

  /**
   * 모든 윈도우 목록 반환
   * @returns {Array} 윈도우 목록
   */
  getAllWindows() {
    return Array.from(this.windows.entries()).map(
      ([id, { window, state }]) => ({
        id,
        state: state.update(),
      })
    );
  }

  /**
   * 메인 윈도우 반환
   * @returns {BrowserWindow} 메인 윈도우
   */
  getMainWindow() {
    if (!this.mainWindowId) return null;
    return this.windows.get(this.mainWindowId)?.window || null;
  }

  /**
   * 특정 ID의 윈도우 반환
   * @param {string} id - 윈도우 ID
   * @returns {BrowserWindow} 윈도우 인스턴스
   */
  getWindow(id) {
    return this.windows.get(id)?.window || null;
  }

  /**
   * 특정 윈도우 상태 반환
   * @param {string} id - 윈도우 ID
   * @returns {WindowState} 윈도우 상태
   */
  getWindowState(id) {
    const windowEntry = this.windows.get(id);
    if (!windowEntry) return null;

    return windowEntry.state.update();
  }

  /**
   * 윈도우 최소화
   * @param {string} id - 윈도우 ID (기본값: 메인 윈도우)
   * @returns {boolean} 성공 여부
   */
  minimize(id = null) {
    const windowId = id || this.mainWindowId;
    const window = this.getWindow(windowId);

    if (window) {
      window.minimize();
      return true;
    }
    return false;
  }

  /**
   * 윈도우 최대화 토글
   * @param {string} id - 윈도우 ID (기본값: 메인 윈도우)
   * @returns {boolean} 최대화 상태
   */
  toggleMaximize(id = null) {
    const windowId = id || this.mainWindowId;
    const window = this.getWindow(windowId);

    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      return window.isMaximized();
    }
    return false;
  }

  /**
   * 윈도우 닫기
   * @param {string} id - 윈도우 ID (기본값: 메인 윈도우)
   * @returns {boolean} 성공 여부
   */
  close(id = null) {
    const windowId = id || this.mainWindowId;
    const window = this.getWindow(windowId);

    if (window) {
      window.close();
      return true;
    }
    return false;
  }

  /**
   * 모든 윈도우 닫기
   */
  closeAll() {
    for (const [id, { window }] of this.windows.entries()) {
      if (window && !window.isDestroyed()) {
        window.close();
      }
    }
    this.windows.clear();
    this.mainWindowId = null;
  }

  /**
   * 윈도우 최대화 상태 확인
   * @param {string} id - 윈도우 ID (기본값: 메인 윈도우)
   * @returns {boolean} 최대화 상태
   */
  isMaximized(id = null) {
    const windowId = id || this.mainWindowId;
    const window = this.getWindow(windowId);

    return window ? window.isMaximized() : false;
  }

  /**
   * 이벤트 전송
   * @param {string} channel - 이벤트 채널
   * @param {any} data - 전송할 데이터
   * @param {string} targetId - 대상 윈도우 ID (기본값: 메인 윈도우)
   * @returns {boolean} 성공 여부
   */
  sendEvent(channel, data, targetId = null) {
    const windowId = targetId || this.mainWindowId;
    const window = this.getWindow(windowId);

    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data);
      return true;
    }
    return false;
  }

  /**
   * 모든 윈도우에 이벤트 브로드캐스트
   * @param {string} channel - 이벤트 채널
   * @param {any} data - 전송할 데이터
   * @returns {number} 전송 성공한 윈도우 수
   */
  broadcastEvent(channel, data) {
    let successCount = 0;

    for (const [id, { window }] of this.windows.entries()) {
      if (window && !window.isDestroyed()) {
        window.webContents.send(channel, data);
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * 모든 윈도우의 현재 상태 반환
   * @returns {Object} 윈도우 상태 맵
   */
  getWindowsState() {
    const state = {};

    for (const [id, { state: windowState }] of this.windows.entries()) {
      state[id] = windowState.update();
    }

    return state;
  }
}

module.exports = new WindowManager();
