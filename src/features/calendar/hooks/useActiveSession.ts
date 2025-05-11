import { useState, useEffect, useCallback } from "react";
import { WorkSession } from "../types";
import { timerService, SessionState } from "../services/TimerService";
import { formatMinutes } from "../../../utils/timeUtils";
import { isElectronEnvironment } from "../services/ElectronSessionAdapter";
import { v4 as uuidv4 } from "uuid";
import { CaptureServiceFactory } from "../services/CaptureServiceFactory";

/**
 * 캡처 관련 인터페이스
 */
interface CaptureActions {
  startCapture: (options?: any) => Promise<boolean>;
  stopCapture: () => Promise<boolean>;
  isCapturing: () => Promise<boolean>;
}

/**
 * 활성 세션 관리 훅
 * 작업 세션 시작/중지 및 캡처 기능을 함께 처리
 */
export const useActiveSession = () => {
  // 상태 관리
  const [sessionState, setSessionState] = useState<SessionState>({
    session: null,
    duration: 0,
    isActive: false,
    isPaused: false,
  });
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isElectron] = useState<boolean>(isElectronEnvironment());

  // 포맷팅된 시간 계산
  const formattedTime = formatMinutes(duration);

  // 상태 변수 추출
  const isActive = sessionState.isActive;
  const isPaused = sessionState.isPaused;

  // 세션 상태 변경 감지
  useEffect(() => {
    // 타이머 서비스에 콜백 등록
    timerService.setStateChangeCallback((state: SessionState) => {
      setSessionState(state);
      setActiveSession(state.session);
      setDuration(state.duration);
    });

    // 컴포넌트 언마운트시 콜백 제거
    return () => {
      timerService.setStateChangeCallback(null);
    };
  }, []);

  // 캡처 서비스 인스턴스 가져오기
  const getCaptureService = useCallback(() => {
    return CaptureServiceFactory.getCaptureService();
  }, []);

  // 캡처 서비스 정리 (언마운트 시)
  useEffect(() => {
    // 컴포넌트 언마운트시 정리
    return () => {
      // ElectronSessionAdapter의 dispose 메서드 호출 (가능한 경우)
      const captureService = getCaptureService();
      if (captureService && "dispose" in captureService) {
        (captureService as any).dispose();
      }
    };
  }, [getCaptureService]);

  /**
   * 캡처 동작 객체 생성 - 팩토리에서 적절한 서비스 가져오기
   */
  const getCaptureActions = useCallback((): CaptureActions => {
    const captureService = getCaptureService();

    return {
      startCapture: captureService.startCapture.bind(captureService),
      stopCapture: captureService.stopCapture.bind(captureService),
      isCapturing: async () => Promise.resolve(captureService.isCapturing()),
    };
  }, [getCaptureService]);

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
