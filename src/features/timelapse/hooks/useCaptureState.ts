import { useState, useEffect, useCallback, useRef } from "react";
import { WindowInfo } from "../../window/types";
import { CaptureStatus } from "../types";
import { captureService } from "../../../services";

/**
 * 캡처 상태 관리를 위한 훅
 */
export const useCaptureState = (
  selectedWindowId: string,
  electronAvailable: boolean,
  activeWindows: WindowInfo[] = []
) => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(() => {
    // localStorage에서 이전 상태를 가져와 초기값으로 사용
    try {
      const cachedState = localStorage.getItem("capture_state");
      if (cachedState) {
        const parsed = JSON.parse(cachedState);
        return parsed.isCapturing || false;
      }
    } catch (e) {
      console.error("캐시된 상태 로드 실패:", e);
    }
    return false;
  });

  const [duration, setDuration] = useState<number>(() => {
    // localStorage에서 이전 duration을 가져와 초기값으로 사용
    try {
      const cachedState = localStorage.getItem("capture_state");
      if (cachedState) {
        const parsed = JSON.parse(cachedState);
        return parsed.duration || 0;
      }
    } catch (e) {
      console.error("캐시된 상태 로드 실패:", e);
    }
    return 0;
  });

  const [error, setError] = useState<string | null>(null);
  // 상태 로딩 여부
  const [isStatusInitialized, setIsStatusInitialized] =
    useState<boolean>(false);

  // lastKnownState를 ref로 관리
  const lastKnownStateRef = useRef({ isCapturing, duration });
  // 이벤트 리스너 정리 함수를 ref로 관리
  const cleanupFnRef = useRef<(() => void) | null>(null);

  // 상태가 변경될 때마다 localStorage에 캐시
  useEffect(() => {
    try {
      // 현재 상태 저장
      lastKnownStateRef.current = { isCapturing, duration };
      localStorage.setItem(
        "capture_state",
        JSON.stringify({ isCapturing, duration })
      );
    } catch (e) {
      console.error("상태 캐싱 실패:", e);
    }
  }, [isCapturing, duration]);

  // 컴포넌트 초기화 시 이벤트 리스너 등록
  useEffect(() => {
    // 이전 리스너가 있으면 정리
    if (cleanupFnRef.current) {
      cleanupFnRef.current();
      cleanupFnRef.current = null;
    }

    if (electronAvailable) {
      // 마운트 시 즉시 현재 녹화 상태 요청
      const initializeStatus = async () => {
        try {
          const status = await captureService.getRecordingStatus();
          // Electron API 호환성을 위한 필드 매핑
          setIsCapturing(status.isRecording || status.isCapturing || false);
          setDuration(status.duration || 0);
          setIsStatusInitialized(true);
          console.log("[useCaptureState] 초기 상태 로드 완료:", status);
        } catch (err) {
          console.error("[useCaptureState] 초기 상태 로드 오류:", err);
          setIsStatusInitialized(true); // 오류 발생해도 초기화 완료로 간주
        }
      };

      // 초기 상태 로드 실행
      initializeStatus();

      // 캡처 상태 이벤트 리스너 등록
      const cleanup = captureService.onCaptureStatus(
        (status: CaptureStatus) => {
          setIsCapturing(status.isCapturing);
          setDuration(status.duration);
          setIsStatusInitialized(true);

          if (status.error) {
            setError(status.error);
          }
        }
      );

      // 정리 함수 저장
      cleanupFnRef.current = cleanup;
    } else {
      // Electron 없는 환경에서도 초기화 완료로 표시
      setIsStatusInitialized(true);
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      // 명시적으로 리스너 제거 함수 호출
      if (cleanupFnRef.current) {
        try {
          cleanupFnRef.current();
        } catch (e) {
          console.error("[useCaptureState] 리스너 정리 중 오류:", e);
        } finally {
          cleanupFnRef.current = null;
        }
      }

      // 로컬 스토리지에 마지막 상태 저장
      try {
        localStorage.setItem(
          "capture_state",
          JSON.stringify(lastKnownStateRef.current)
        );
      } catch (e) {
        console.error("[useCaptureState] 상태 저장 중 오류:", e);
      }
    };
  }, [electronAvailable]);

  // 캡처 시작
  const startCapture = useCallback(() => {
    setError(null);

    if (electronAvailable) {
      console.log(`선택된 창 ID로 캡처 시작: ${selectedWindowId}`);

      // 선택한 창 이름 찾기
      const selectedWindow = activeWindows.find(
        (window) => window.id === selectedWindowId
      );
      const windowName = selectedWindow ? selectedWindow.name : "";

      console.log(`선택된 창 이름: ${windowName}`);

      // 서비스를 통해 캡처 시작
      captureService
        .startCapture(selectedWindowId, windowName)
        .then((result) => {
          console.log("캡처 시작 결과:", result);
          if (!result.success) {
            setError(result.error || "캡처 시작 실패");
          }
        })
        .catch((err: Error) => {
          console.error("캡처 시작 오류:", err);
          setError(err.message || "캡처 시작 중 오류 발생");
        });
    } else {
      console.log("모의 환경: 캡처 시작");
      setIsCapturing(true);
    }
  }, [electronAvailable, selectedWindowId, activeWindows]);

  // 캡처 중지
  const stopCapture = useCallback(() => {
    if (electronAvailable) {
      console.log("캡처 중지 요청");

      // 서비스를 통해 캡처 중지
      captureService
        .stopCapture()
        .then((result) => {
          console.log("캡처 중지 결과:", result);
          if (!result.success) {
            setError(result.error || "캡처 중지 실패");
          }
        })
        .catch((err: Error) => {
          console.error("캡처 중지 오류:", err);
          setError(err.message || "캡처 중지 중 오류 발생");
        });
    } else {
      console.log("모의 환경: 캡처 중지");
      setIsCapturing(false);
    }
  }, [electronAvailable]);

  return {
    isCapturing,
    duration,
    error,
    startCapture,
    stopCapture,
    isStatusInitialized,
  };
};
