const { BrowserWindow } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");

/**
 * 메인 윈도우 관리 클래스
 */
class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  /**
   * 메인 윈도우 생성
   */
  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 720,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload.js"),
      },
      frame: false, // 사용자 정의 프레임 사용
      backgroundColor: "#2f3136", // 디스코드와 유사한 배경색
    });

    // 개발/배포 환경에 따라 URL 로드
    const startUrl = isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../../../build/index.html")}`;

    this.mainWindow.loadURL(startUrl);

    // 개발 환경에서는 개발자 도구 열기
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    // 창이 닫힐 때 이벤트
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  /**
   * 현재 메인 윈도우 반환
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * 메인 윈도우 최소화
   */
  minimize() {
    if (this.mainWindow) {
      this.mainWindow.minimize();
      return true;
    }
    return false;
  }

  /**
   * 메인 윈도우 최대화 토글
   */
  toggleMaximize() {
    if (!this.mainWindow) return false;

    if (this.mainWindow.isMaximized()) {
      this.mainWindow.unmaximize();
    } else {
      this.mainWindow.maximize();
    }
    return this.mainWindow.isMaximized();
  }

  /**
   * 메인 윈도우 닫기
   */
  close() {
    if (this.mainWindow) {
      this.mainWindow.close();
      return true;
    }
    return false;
  }

  /**
   * 현재 최대화 상태 확인
   */
  isMaximized() {
    return this.mainWindow ? this.mainWindow.isMaximized() : false;
  }

  /**
   * 이벤트 전송
   */
  sendEvent(channel, ...args) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
      return true;
    }
    return false;
  }
}

module.exports = new WindowManager();
