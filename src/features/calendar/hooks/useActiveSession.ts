import { useState, useEffect, useCallback } from "react";
import { WorkSession } from "../types";
import { timerService, SessionState } from "../services/TimerService";
import { formatMinutes } from "../../../utils/timeUtils";
import { isElectronEnvironment } from "../services/ElectronSessionAdapter";
import { electronSessionAdapter } from "../services/ElectronSessionAdapter";
import { browserCaptureService } from "../services/BrowserCaptureService";
import { v4 as uuidv4 } from "uuid";

/**
 * 캡처 관련 인터페이스
 */
interface CaptureActions {
  startCapture: (options?: any) => Promise<boolean>;
  stopCapture: () => Promise<boolean>;
  isCapturing: () => Promise<boolean>;
}

/**
 * 활성 작업 세션 관리 훅
 *
 * 단일 책임: 활성 세션의 UI 상태 관리 및 기본 작업 제공
 * TimerService와의 상호작용을 단순화
 */
export const useActiveSession = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    session: null,
    duration: 0,
    isActive: false,
    isPaused: false,
  });
  const [formattedTime, setFormattedTime] = useState<string>("0분");
  const [isElectron, setIsElectron] = useState<boolean>(
    isElectronEnvironment()
  );

  // 활성 세션 상태 가져오기 (구조 분해 할당으로 더 직관적인 코드)
  const { session: activeSession, duration, isPaused, isActive } = sessionState;

  // 타이머 이벤트 리스너 등록
  useEffect(() => {
    // 초기 세션 상태 로드
    const initialState = timerService.getSessionState();
    setSessionState(initialState);
    setFormattedTime(formatMinutes(initialState.duration));

    // 상태 변경 콜백 등록
    const handleStateChange = (state: SessionState) => {
      setSessionState(state);
      setFormattedTime(formatMinutes(state.duration));
    };

    timerService.setStateChangeCallback(handleStateChange);

    // 정리 함수
    return () => {
      // 콜백 제거 - undefined를 전달하여 콜백 제거 (null 대신)
      timerService.setStateChangeCallback(undefined);
    };
  }, []);

  /**
   * 캡처 동작 객체 생성 - 환경에 따라 적절한 서비스 사용 (팩토리 패턴)
   */
  const getCaptureActions = useCallback((): CaptureActions => {
    if (isElectron) {
      return {
        startCapture: async (options: any = {}) => {
          const windows = await electronSessionAdapter.getAvailableWindows();
          if (windows && windows.length > 0) {
            const windowId = windows[0].id;
            return electronSessionAdapter.startCapture(windowId, options);
          }
          return false;
        },
        stopCapture: () => electronSessionAdapter.stopCapture(),
        isCapturing: () =>
          Promise.resolve(electronSessionAdapter.isCapturing()),
      };
    } else {
      return {
        startCapture: (options: any = {}) =>
          browserCaptureService.startCapture(options),
        // Promise로 래핑하여 반환 타입 일치시키기
        stopCapture: () => Promise.resolve(browserCaptureService.stopCapture()),
        isCapturing: () => Promise.resolve(browserCaptureService.isCapturing()),
      };
    }
  }, [isElectron]);

  /**
   * 작업 세션 시작
   */
  const startSession = useCallback(
    (
      title: string,
      taskType: string,
      isRecording: boolean = false
    ): WorkSession => {
      const source = isElectron ? "electron" : "browser";
      const sessionId = uuidv4();
      const session = timerService.startSession(
        title,
        taskType,
        source,
        isRecording,
        sessionId
      );

      // 녹화 옵션이 켜져 있으면 캡처 시작
      if (isRecording) {
        const captureActions = getCaptureActions();
        captureActions.startCapture().catch((err) => {
          console.error("캡처 시작 실패:", err);
        });
      }

      return session;
    },
    [isElectron, getCaptureActions]
  );

  /**
   * 작업 세션 중지
   */
  const stopSession = useCallback((): WorkSession | null => {
    const session = timerService.stopSession();

    // 녹화 중이었다면 중지
    if (session?.isRecording) {
      const captureActions = getCaptureActions();
      captureActions.stopCapture().catch((err) => {
        console.error("캡처 중지 실패:", err);
      });
    }

    return session;
  }, [getCaptureActions]);

  /**
   * 작업 세션 일시 정지
   */
  const pauseSession = useCallback((): void => {
    timerService.pauseSession();
  }, []);

  /**
   * 작업 세션 재개
   */
  const resumeSession = useCallback((): void => {
    timerService.resumeSession();
  }, []);

  /**
   * 녹화 상태 확인
   */
  const checkCaptureStatus = useCallback(async (): Promise<boolean> => {
    const captureActions = getCaptureActions();
    return captureActions.isCapturing();
  }, [getCaptureActions]);

  return {
    // 상태
    sessionState,
    activeSession,
    duration,
    formattedTime,
    isActive,
    isPaused,
    isElectron,

    // 액션
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    checkCaptureStatus,
  };
};
