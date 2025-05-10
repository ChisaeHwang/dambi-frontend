import { useState, useEffect, useCallback, useRef } from "react";
import { WindowInfo } from "../types";
import {
  windowService,
  windowStorageService,
  isElectronAvailable,
} from "../../../services";

/**
 * 창 관리를 위한 훅
 */
export const useWindowManager = () => {
  // 상태 관리
  const [electronAvailable, setElectronAvailable] = useState<boolean>(false);
  const [selectedWindowId, setSelectedWindowId] = useState<string>(() => {
    // 로컬 스토리지에서 선택된 창 ID 불러오기
    return windowStorageService.getSelectedWindowId();
  });
  const [activeWindows, setActiveWindows] = useState<WindowInfo[]>(() => {
    // 로컬 스토리지에서 활성 창 목록 불러오기
    return windowStorageService.getActiveWindows<WindowInfo>();
  });
  const [isLoadingWindows, setIsLoadingWindows] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 창 새로고침 타이머 참조
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // activeWindows 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    windowStorageService.saveActiveWindows(activeWindows);
  }, [activeWindows]);

  // 컴포넌트 초기화 시 Electron 환경 확인
  useEffect(() => {
    setElectronAvailable(isElectronAvailable());

    // 정리 함수
    return () => {
      // 타이머가 있으면 정리
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []);

  // 활성 창 목록 가져오기
  const fetchActiveWindows = useCallback(async () => {
    // 기존 타이머가 있으면 정리
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    if (!electronAvailable) {
      // Electron 환경이 아닐 때는 빈 배열 반환
      setActiveWindows([]);
      return;
    }

    try {
      setIsLoadingWindows(true);
      setError(null);

      // 현재 선택된 창 ID 저장 (새로고침 후에도 유지하기 위해)
      const currentSelectedId = selectedWindowId;

      // 서비스를 통해 활성 창 목록 가져오기
      const windows = await windowService.getActiveWindows();

      if (windows && Array.isArray(windows)) {
        // 타임스탬프 추가 및 중복 ID 처리
        const windowsWithTimestamp = windows.map((win, index) => {
          // ID가 없거나 중복될 가능성이 있으면 인덱스 기반 고유 ID 생성
          const id = win.id || `window-${index}-${Date.now()}`;
          return {
            ...win,
            id,
            timestamp: win.timestamp || Date.now(),
          };
        });

        // 창 목록 설정
        setActiveWindows(windowsWithTimestamp);

        // 선택된 창 ID 처리
        if (windowsWithTimestamp.length > 0) {
          // 현재 선택된 창이 새 목록에 존재하는지 확인
          const windowExists = windowsWithTimestamp.some(
            (win) => win.id === currentSelectedId
          );

          if (!windowExists || !currentSelectedId) {
            // 현재 선택된 창이 없거나 더 이상 존재하지 않으면 첫 번째 창 선택
            const firstWindowId = windowsWithTimestamp[0].id;

            // 로컬 상태 및 스토리지 업데이트 (이벤트 없이)
            setSelectedWindowId(firstWindowId);
            windowStorageService.saveSelectedWindowId(firstWindowId);
          }
        } else {
          // 활성 창이 없는 경우 빈 배열 설정
          setActiveWindows([]);
        }
      } else {
        console.error("잘못된 창 목록 형식:", windows);
        setActiveWindows([]);
      }
    } catch (error) {
      console.error("활성 창 목록 가져오기 실패:", error);
      setError("창 목록을 가져오는 데 실패했습니다.");
      setActiveWindows([]);
    } finally {
      setIsLoadingWindows(false);
    }
  }, [electronAvailable, selectedWindowId]);

  // 선택된 창 변경 핸들러
  const changeSelectedWindow = useCallback(
    (windowId: string) => {
      // 유효하지 않은 ID 검증
      if (!windowId) {
        console.warn("유효하지 않은 창 ID");
        return;
      }

      // 현재 선택된 창과 같은 경우 중복 처리 방지
      if (windowId === selectedWindowId) {
        return;
      }

      // 활성 창 목록에 존재하는지 확인
      if (
        activeWindows.length > 0 &&
        !activeWindows.some((win) => win.id === windowId)
      ) {
        console.warn("활성 창 목록에 존재하지 않는 ID");
        return;
      }

      // 상태 업데이트 및 로컬 스토리지에 저장
      setSelectedWindowId(windowId);
      windowStorageService.saveSelectedWindowId(windowId);
    },
    [activeWindows, selectedWindowId]
  );

  // 활성 창 목록 새로고침
  const refreshWindows = useCallback(() => {
    // 디바운스 적용: 짧은 시간 내에 여러 번 호출되면 마지막 호출만 실행
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      fetchActiveWindows();
      refreshTimerRef.current = null;
    }, 100);
  }, [fetchActiveWindows]);

  return {
    selectedWindowId,
    setSelectedWindowId,
    activeWindows,
    isLoadingWindows,
    error,
    electronAvailable,
    changeSelectedWindow,
    refreshWindows,
  };
};
