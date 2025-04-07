const { app } = require("electron");

// 핵심 모듈 임포트
const AppLifecycle = require("./core/AppLifecycle");
const CleanupSystem = require("./core/CleanupSystem");
const ErrorHandler = require("./core/ErrorHandler");
const AppInitializer = require("./core/AppInitializer");
const TaskRegistry = require("./core/TaskRegistry");

// 기존 모듈 임포트
const windowManager = require("./modules/window-manager");
const ipcHandler = require("./modules/ipc-handler");

/**
 * 애플리케이션 부트스트랩
 *
 * 의존성 주입 패턴을 사용하여 모듈 간 결합도를 낮추고
 * 단일 책임 원칙(SRP)에 따라 각 모듈의 역할을 명확히 분리
 */
function bootstrap() {
  // 인스턴스 생성
  const appLifecycle = new AppLifecycle();
  const cleanupSystem = new CleanupSystem(appLifecycle);
  const errorHandler = new ErrorHandler(appLifecycle, windowManager);
  const taskRegistry = new TaskRegistry();

  // IPC 핸들러 등록
  console.log("IPC 핸들러 등록 중...");
  ipcHandler.registerHandlers();

  // 앱 초기화 담당 객체 생성 및 실행
  const initializer = new AppInitializer(
    appLifecycle,
    windowManager,
    errorHandler,
    cleanupSystem,
    taskRegistry
  );

  // 애플리케이션 초기화 실행
  initializer.initialize().catch((error) => {
    console.error("초기화 중 치명적 오류:", error);
    app.exit(1);
  });
}

// 애플리케이션 시작
bootstrap();
