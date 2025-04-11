import { useState, useEffect, useCallback } from "react";
import { WorkSession } from "../types";
import { timerService } from "../services/TimerService";
import { formatWorkTime } from "../utils";
import { isElectronEnvironment } from "../services/ElectronSessionAdapter";
import { electronSessionAdapter } from "../services/ElectronSessionAdapter";
import { browserCaptureService } from "../services/BrowserCaptureService";

/**
 * 활성 작업 세션 관리 훅
 */
export const useActiveSession = () => {
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [formattedTime, setFormattedTime] = useState<string>("0분");
  const [isElectron, setIsElectron] = useState<boolean>(
    isElectronEnvironment()
  );

  // 타이머 이벤트 리스너 등록
  useEffect(() => {
    // 활성 세션 초기 로드
    const initialActiveSession = timerService.getActiveSession();
    if (initialActiveSession) {
      setActiveSession(initialActiveSession);
      setDuration(initialActiveSession.duration);
      setFormattedTime(formatWorkTime(initialActiveSession.duration));
      setIsPaused(timerService.isSessionPaused());
    }

    // 타이머 이벤트 구독
    const removeListener = timerService.addEventListener(
      (event, session, currentDuration) => {
        switch (event) {
          case "start":
            setActiveSession(session);
            setDuration(currentDuration);
            setFormattedTime(formatWorkTime(currentDuration));
            setIsPaused(false);
            break;
          case "stop":
            setActiveSession(null);
            setDuration(0);
            setFormattedTime("0분");
            setIsPaused(false);
            break;
          case "pause":
            setIsPaused(true);
            setDuration(currentDuration);
            setFormattedTime(formatWorkTime(currentDuration));
            break;
          case "resume":
            setIsPaused(false);
            setDuration(currentDuration);
            setFormattedTime(formatWorkTime(currentDuration));
            break;
          case "tick":
            if (session) {
              setDuration(currentDuration);
              setFormattedTime(formatWorkTime(currentDuration));
            }
            break;
        }
      }
    );

    // 일렉트론 환경일 경우 캡처 상태 리스너 등록
    let removeElectronListener: (() => void) | null = null;
    if (isElectron) {
      removeElectronListener = electronSessionAdapter.addChangeListener(() => {
        // 캡처 상태가 변경되면 타이머 서비스가 알아서 처리
        // 여기서는 필요한 경우 추가 작업만 수행
      });
    } else {
      // 브라우저 환경일 경우 브라우저 캡처 상태 리스너 등록
      removeElectronListener = browserCaptureService.addChangeListener(() => {
        // 캡처 상태가 변경되면 타이머 서비스가 알아서 처리
      });
    }

    // 정리 함수
    return () => {
      removeListener();
      if (removeElectronListener) {
        removeElectronListener();
      }
    };
  }, []);

  /**
   * 작업 세션 시작 함수
   */
  const startSession = useCallback(
    (title: string, category: string) => {
      const source = isElectron ? "electron" : "browser";
      return timerService.startSession(title, category, source);
    },
    [isElectron]
  );

  /**
   * 작업 세션 종료 함수
   */
  const stopSession = useCallback(() => {
    return timerService.stopSession();
  }, []);

  /**
   * 작업 세션 일시정지 함수
   */
  const pauseSession = useCallback(() => {
    if (isElectron) {
      electronSessionAdapter.pauseCapture();
    } else {
      browserCaptureService.pauseCapture();
    }
    timerService.pauseSession();
  }, [isElectron]);

  /**
   * 작업 세션 재개 함수
   */
  const resumeSession = useCallback(() => {
    if (isElectron) {
      electronSessionAdapter.resumeCapture();
    } else {
      browserCaptureService.resumeCapture();
    }
    timerService.resumeSession();
  }, [isElectron]);

  /**
   * 화면 캡처 시작 함수
   */
  const startCapture = useCallback(
    async (options: any = {}) => {
      if (isElectron) {
        // 일렉트론 환경에서는 창 목록 가져와서 첫번째 창 캡처
        const windows = await electronSessionAdapter.getAvailableWindows();
        if (windows && windows.length > 0) {
          const windowId = windows[0].id;
          return electronSessionAdapter.startCapture(windowId, options);
        }
        return false;
      } else {
        // 브라우저 환경에서는 화면 공유 API 사용
        return browserCaptureService.startCapture(options);
      }
    },
    [isElectron]
  );

  /**
   * 화면 캡처 중지 함수
   */
  const stopCapture = useCallback(async () => {
    if (isElectron) {
      return electronSessionAdapter.stopCapture();
    } else {
      return browserCaptureService.stopCapture();
    }
  }, [isElectron]);

  /**
   * 캡처 상태 확인 함수
   */
  const isCapturing = useCallback(async () => {
    if (isElectron) {
      return electronSessionAdapter.isCapturing();
    } else {
      return browserCaptureService.isCapturing();
    }
  }, [isElectron]);

  return {
    activeSession,
    duration,
    formattedTime,
    isPaused,
    isElectron,
    isCapturing: isCapturing,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    startCapture,
    stopCapture,
  };
};
