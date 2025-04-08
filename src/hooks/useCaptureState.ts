import { useState, useEffect, useCallback } from "react";

/**
 * 캡처 상태 관리를 위한 훅
 */
export const useCaptureState = (
  selectedWindowId: string,
  electronAvailable: boolean,
  activeWindows: any[] = []
) => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 초기화 시 이벤트 리스너 등록
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    if (electronAvailable) {
      // 캡처 상태 이벤트 리스너 등록
      cleanup = window.electron.onCaptureStatus((status) => {
        setIsCapturing(status.isCapturing);
        setDuration(status.duration);

        if (status.error) {
          setError(status.error);
        }
      });
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

      try {
        // ID와 이름 모두 전달하고 그 결과를 로그로 출력
        window.electron
          .startCapture(selectedWindowId, windowName)
          .then((result: any) => {
            console.log("캡처 시작 결과:", result);
            if (!result.success) {
              setError(result.error || "캡처 시작 실패");
            }
          })
          .catch((err: Error) => {
            console.error("캡처 시작 오류:", err);
            setError(err.message || "캡처 시작 중 오류 발생");
          });
      } catch (error) {
        console.error("캡처 시작 예외:", error);
        setError(String(error));
      }
    } else {
      console.log("모의 환경: 캡처 시작");
      setIsCapturing(true);
    }
  }, [electronAvailable, selectedWindowId, activeWindows]);

  // 캡처 중지
  const stopCapture = useCallback(() => {
    if (electronAvailable) {
      console.log("캡처 중지 요청");
      window.electron
        .stopCapture()
        .then((result: any) => {
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
  };
};
