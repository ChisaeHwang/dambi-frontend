// 이 파일은 Electron 환경에서만 실행됩니다.
// Electron과 Node.js 모듈을 조건부로 임포트
let electron: any = null;
let fs: any = null;
let path: any = null;
let os: any = null;

// Electron 환경인지 확인
const isElectron = () => {
  return typeof window !== "undefined" && window.process && window.process.type;
};

// Electron 환경일 때만 모듈 로드
if (isElectron() && typeof window !== "undefined" && window.require) {
  try {
    electron = window.require("electron");
    fs = window.require("fs");
    path = window.require("path");
    os = window.require("os");
  } catch (err) {
    console.error("Node.js 모듈 로드 오류:", err);
  }
}

// 캡처 세션의 상태 인터페이스
interface CaptureSession {
  id: string;
  isActive: boolean;
  startTime: Date;
  frameCount: number;
  interval: number;
  captureDir: string;
  intervalId?: NodeJS.Timeout;
  speedFactor: number;
}

// 활성 캡처 세션
let activeSession: CaptureSession | null = null;

/**
 * 새로운 캡처 세션 ID 생성
 * @returns 타임스탬프 기반 세션 ID
 */
const generateSessionId = (): string => {
  return `session_${new Date().toISOString().replace(/[:.]/g, "-")}`;
};

/**
 * 캡처 이미지 저장 디렉토리 생성
 * @param sessionId 세션 ID
 * @returns 생성된 디렉토리 경로
 */
const createCaptureDirectory = async (sessionId: string): Promise<string> => {
  if (!isElectron() || !fs || !path || !os) {
    throw new Error("Electron 환경에서만 지원됩니다.");
  }

  // 사용자 홈 디렉토리 내에 담비 데이터 폴더 생성
  const baseDir = path.join(os.homedir(), "Documents", "담비", "captures");
  const sessionDir = path.join(baseDir, sessionId);

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(baseDir)) {
    await fs.promises.mkdir(baseDir, { recursive: true });
  }

  if (!fs.existsSync(sessionDir)) {
    await fs.promises.mkdir(sessionDir, { recursive: true });
  }

  return sessionDir;
};

/**
 * 화면 스크린샷 캡처
 * @returns 캡처된 이미지 데이터 (Base64)
 */
const captureScreen = async (): Promise<string> => {
  if (!isElectron() || !electron) {
    throw new Error("Electron 환경에서만 지원됩니다.");
  }

  try {
    // 모든 화면 소스 가져오기
    const { desktopCapturer } = electron;
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    // 주 화면 선택 (첫 번째 화면)
    const mainScreen = sources[0];
    if (!mainScreen) {
      throw new Error("캡처할 수 있는 화면을 찾을 수 없습니다.");
    }

    // 썸네일 이미지 데이터 가져오기
    return mainScreen.thumbnail.toDataURL();
  } catch (error: unknown) {
    console.error("화면 캡처 오류:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Base64 이미지 데이터를 파일로 저장
 * @param dataUrl Base64 이미지 데이터
 * @param filePath 저장할 파일 경로
 */
const saveBase64Image = async (
  dataUrl: string,
  filePath: string
): Promise<void> => {
  if (!isElectron() || !fs) {
    throw new Error("Electron 환경에서만 지원됩니다.");
  }

  try {
    // Base64 데이터에서 헤더 제거
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    // 바이너리 데이터로 변환
    const buffer = Buffer.from(base64Data, "base64");
    // 파일로 저장
    await fs.promises.writeFile(filePath, buffer);
  } catch (error: unknown) {
    console.error("이미지 저장 오류:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * 캡처 세션 시작
 * @param interval 캡처 간격 (초)
 * @param speedFactor 타임랩스 속도 배율 (3, 5, 10 등)
 * @returns 생성된 캡처 세션 ID
 */
export const startCaptureSession = async (
  interval: number = 5,
  speedFactor: number = 1
): Promise<string> => {
  if (!isElectron()) {
    console.log("모의 환경: 실제 캡처는 Electron 환경에서만 지원됩니다.");
    return "mock_session_id";
  }

  // 이미 활성화된 세션이 있으면 중지
  if (activeSession && activeSession.isActive) {
    await stopCaptureSession();
  }

  // 새 세션 ID 생성
  const sessionId = generateSessionId();
  // 캡처 디렉토리 생성
  const captureDir = await createCaptureDirectory(sessionId);

  // 새 세션 객체 생성
  activeSession = {
    id: sessionId,
    isActive: true,
    startTime: new Date(),
    frameCount: 0,
    interval,
    captureDir,
    speedFactor,
  };

  // 주기적 캡처 시작
  const captureAndSave = async () => {
    if (!activeSession || !activeSession.isActive) return;

    try {
      // 화면 캡처
      const imageData = await captureScreen();

      // 파일명 생성 (프레임 번호 기반)
      const frameNumber = (activeSession.frameCount + 1)
        .toString()
        .padStart(4, "0");
      const filePath = path.join(
        activeSession.captureDir,
        `${frameNumber}.png`
      );

      // 이미지 저장
      await saveBase64Image(imageData, filePath);

      // 프레임 카운트 증가
      activeSession.frameCount++;
    } catch (error: unknown) {
      console.error(
        "캡처 및 저장 오류:",
        error instanceof Error ? error.message : error
      );
    }
  };

  // 첫 번째 캡처 실행
  await captureAndSave();

  // 주기적으로 캡처 실행
  activeSession.intervalId = setInterval(captureAndSave, interval * 1000);

  // 세션 메타데이터 저장
  await saveSessionMetadata();

  return sessionId;
};

/**
 * 세션 메타데이터를 JSON 파일로 저장
 */
const saveSessionMetadata = async (): Promise<void> => {
  if (!activeSession || !isElectron() || !fs || !path) return;

  const metadata = {
    id: activeSession.id,
    startTime: activeSession.startTime.toISOString(),
    interval: activeSession.interval,
    speedFactor: activeSession.speedFactor,
    createdAt: new Date().toISOString(),
  };

  const metadataPath = path.join(activeSession.captureDir, "metadata.json");
  await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
};

/**
 * 캡처 세션 중지
 * @returns 캡처된 프레임 수와 세션 정보
 */
export const stopCaptureSession = async (): Promise<{
  sessionId: string;
  frameCount: number;
  captureDir: string;
  speedFactor: number;
} | null> => {
  if (!isElectron()) {
    console.log("모의 환경: 실제 캡처는 Electron 환경에서만 지원됩니다.");
    return null;
  }

  if (!activeSession || !activeSession.isActive) {
    return null;
  }

  // 인터벌 타이머 중지
  if (activeSession.intervalId) {
    clearInterval(activeSession.intervalId);
  }

  // 최종 메타데이터 업데이트
  await updateFinalMetadata();

  // 세션 정보 보존
  const result = {
    sessionId: activeSession.id,
    frameCount: activeSession.frameCount,
    captureDir: activeSession.captureDir,
    speedFactor: activeSession.speedFactor,
  };

  // 세션 비활성화
  activeSession.isActive = false;

  return result;
};

/**
 * 최종 메타데이터 업데이트
 */
const updateFinalMetadata = async (): Promise<void> => {
  if (!activeSession || !isElectron() || !fs || !path) return;

  const duration = Math.floor(
    (new Date().getTime() - activeSession.startTime.getTime()) / 1000
  );

  const metadata = {
    id: activeSession.id,
    startTime: activeSession.startTime.toISOString(),
    endTime: new Date().toISOString(),
    duration,
    frameCount: activeSession.frameCount,
    interval: activeSession.interval,
    speedFactor: activeSession.speedFactor,
    playbackDuration: Math.floor(duration / activeSession.speedFactor), // 실제 재생 시간 (속도 배율 적용)
  };

  const metadataPath = path.join(activeSession.captureDir, "metadata.json");
  await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
};

/**
 * 현재 캡처 세션 상태 조회
 * @returns 캡처 세션 상태
 */
export const getCaptureSessionStatus = (): {
  isActive: boolean;
  frameCount: number;
  duration: number;
  speedFactor: number;
  estimatedPlaybackDuration?: number;
} => {
  if (!activeSession) {
    return { isActive: false, frameCount: 0, duration: 0, speedFactor: 1 };
  }

  const duration = Math.floor(
    (new Date().getTime() - activeSession.startTime.getTime()) / 1000
  );

  return {
    isActive: activeSession.isActive,
    frameCount: activeSession.frameCount,
    duration,
    speedFactor: activeSession.speedFactor,
    estimatedPlaybackDuration: Math.floor(duration / activeSession.speedFactor),
  };
};

export enum SpeedFactorPreset {
  NORMAL = 1,
  FAST = 3,
  FASTER = 5,
  FASTEST = 10,
}

/**
 * 타임랩스 속도 설정
 * @param speedFactor 새 속도 배율
 */
export const setTimelapseSpeed = (speedFactor: number): void => {
  console.log(`다음 세션부터 ${speedFactor}배속이 적용됩니다.`);
  // 다음 세션부터 적용됨
};
