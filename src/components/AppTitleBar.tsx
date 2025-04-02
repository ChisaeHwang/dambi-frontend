import React, { useState, useEffect, CSSProperties } from "react";

const AppTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  // 일렉트론 환경인지 확인
  const isElectron = window.electron !== undefined;

  useEffect(() => {
    const checkMaximized = async () => {
      if (isElectron && window.electron?.isMaximized) {
        try {
          const maximized = await window.electron.isMaximized();
          setIsMaximized(maximized);
        } catch (error) {
          console.error("창 상태 확인 중 오류 발생:", error);
        }
      }
    };

    checkMaximized();

    // 창 상태 변경 이벤트 리스너 등록
    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isElectron]);

  const handleMinimize = () => {
    if (isElectron && window.electron?.minimize) {
      window.electron.minimize();
    }
  };

  const handleMaximize = () => {
    if (isElectron && window.electron?.maximize) {
      window.electron.maximize();
    }
  };

  const handleClose = () => {
    if (isElectron && window.electron?.close) {
      window.electron.close();
    }
  };

  // Electron 환경이 아니면 타이틀바를 표시하지 않음
  if (!isElectron) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between h-8 bg-[var(--bg-tertiary)] pl-4 select-none"
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
    >
      <div className="flex items-center">
        <span className="text-lg mr-2">🦝</span>
        <span className="font-semibold">담비</span>
      </div>

      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="h-full px-3 text-gray-200 hover:bg-gray-600 transition-colors flex items-center justify-center"
          aria-label="최소화"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="h-full px-3 text-gray-200 hover:bg-gray-600 transition-colors flex items-center justify-center"
          aria-label={isMaximized ? "복원" : "최대화"}
        >
          {isMaximized ? (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="9" width="10" height="10"></rect>
              <polyline points="15 5 19 5 19 9"></polyline>
              <line x1="19" y1="5" x2="14" y2="10"></line>
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          className="h-full px-3 text-gray-200 hover:bg-red-600 transition-colors flex items-center justify-center"
          aria-label="닫기"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AppTitleBar;
