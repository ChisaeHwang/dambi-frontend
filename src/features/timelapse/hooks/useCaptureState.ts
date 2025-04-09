import { useState, useEffect, useCallback } from "react";
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
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  // 상태 로딩 여부 추가
  const [isStatusInitialized, setIsStatusInitialized] =
    useState<boolean>(false);

  // 컴포넌트 초기화 시 이벤트 리스너 등록
  useEffect(() => {
    let cleanup: (() => void) | null = null;

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
      cleanup = captureService.onCaptureStatus((status: CaptureStatus) => {
        setIsCapturing(status.isCapturing);
        setDuration(status.duration);
        setIsStatusInitialized(true);

        if (status.error) {
          setError(status.error);
        }
      });
    } else {
      // Electron 없는 환경에서도 초기화 완료로 표시
      setIsStatusInitialized(true);
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      if (cleanup) {
        cleanup();
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
