import React, { useEffect } from "react";
import type { WindowInfo } from "../../features/window/types";
import WindowThumbnail from "./window/WindowThumbnail";
import { STORAGE_KEYS } from "../../utils/localStorage";

interface WindowSelectorProps {
  activeWindows: WindowInfo[];
  selectedWindowId: string;
  onSelect: (windowId: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  disabled?: boolean;
}

const WindowSelector: React.FC<WindowSelectorProps> = ({
  activeWindows,
  selectedWindowId,
  onSelect,
  isLoading,
  onRefresh,
  disabled = false,
}) => {
  // 컴포넌트 마운트 시 로컬 스토리지에서 선택된 창 ID 확인
  useEffect(() => {
    // 활성 창 목록이 비어있으면 처리하지 않음
    if (activeWindows.length === 0) {
      return;
    }

    // 이미 선택된 창이 있으면 검증 (활성 창 목록에 있는지 확인)
    if (
      selectedWindowId &&
      activeWindows.some((window) => window.id === selectedWindowId)
    ) {
      // 이미 유효한 선택이 있으므로 처리 불필요
      return;
    }

    // 로컬 스토리지에서 저장된 ID 확인
    const savedWindowId = localStorage.getItem(STORAGE_KEYS.SELECTED_WINDOW_ID);

    // 저장된 ID가 있고, 활성 창 목록에 있는 경우에만 처리
    if (
      savedWindowId &&
      activeWindows.some((window) => window.id === savedWindowId)
    ) {
      // 이전 선택 내용 복원
      onSelect(savedWindowId);
    } else if (activeWindows.length > 0) {
      // 저장된 ID가 없거나 유효하지 않으면 첫 번째 창으로 설정
      onSelect(activeWindows[0].id);
    }
  }, [activeWindows, selectedWindowId, onSelect]);

  // 선택한 창 변경 시 로컬 스토리지에 저장
  const handleWindowChange = (windowId: string) => {
    if (!windowId || disabled) return; // 유효하지 않은 ID 방지

    // 이미 선택된 창이면 중복 이벤트 방지
    if (windowId === selectedWindowId) {
      return;
    }

    try {
      // 로컬 스토리지에 저장
      localStorage.setItem(STORAGE_KEYS.SELECTED_WINDOW_ID, windowId);

      // 부모 컴포넌트에 알림
      onSelect(windowId);
    } catch (error) {
      console.error("WindowSelector: 창 선택 변경 중 오류 발생", error);
    }
  };

  return (
    <div className="mb-5">
      <div
        className={`grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mt-2.5 ${disabled ? "opacity-60" : "opacity-100"}`}
      >
        {isLoading ? (
          <div className="col-span-full p-5 text-center rounded bg-[var(--input-bg)] text-[var(--text-normal)]">
            창 목록 불러오는 중...
          </div>
        ) : activeWindows.length === 0 ? (
          <div className="col-span-full p-5 text-center rounded bg-[var(--input-bg)] text-[var(--text-normal)]">
            녹화할 수 있는 창이 없습니다.
            <div className="mt-2.5 text-xs text-[#a0a0a0]">
              다른 앱을 실행하고 새로고침 버튼을 클릭하세요.
            </div>
          </div>
        ) : (
          activeWindows.map((window) => (
            <div
              key={`${window.id}-${window.timestamp}`}
              className={`rounded-lg overflow-hidden cursor-pointer ${
                selectedWindowId === window.id
                  ? "bg-gradient-to-br from-[#35395c] to-[#2d3249] scale-[1.02] shadow-lg ring-2 ring-[var(--primary-color)]"
                  : "bg-gradient-to-br from-[#33363f] to-[#2a2d36] scale-100 hover:from-[#373a44] hover:to-[#2e313a]"
              } transition-all duration-200 ${disabled ? "cursor-not-allowed" : ""}`}
              onClick={() => !disabled && handleWindowChange(window.id)}
            >
              <div className="aspect-video relative overflow-hidden">
                <WindowThumbnail window={window} />

                {selectedWindowId === window.id && (
                  <div className="absolute top-2 right-2 bg-[var(--primary-color)] rounded-full w-6 h-6 flex justify-center items-center text-white font-bold text-sm z-10 shadow-md">
                    ✓
                  </div>
                )}
              </div>
              <div className="p-3 bg-[rgba(0,0,0,0.15)]">
                <div className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                  {window.name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WindowSelector;
