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
      className="flex items-center justify-between h-8 bg-[var(--bg-tertiary)] px-4 select-none"
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
    >
      <div className="flex items-center">
        <span className="text-lg mr-2">🦝</span>
        <span className="font-semibold">담비</span>
      </div>

      <div
        className="flex items-center space-x-2"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-[#ffbd4c] flex items-center justify-center hover:brightness-90 transition-all"
          aria-label="최소화"
        >
          <svg
            className="w-2 h-2 opacity-0 group-hover:opacity-100"
            viewBox="0 0 8 8"
            fill="none"
          >
            <rect x="1" y="3.5" width="6" height="1" fill="#996209" />
          </svg>
        </button>

        <button
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-[#00ca56] flex items-center justify-center hover:brightness-90 transition-all"
          aria-label={isMaximized ? "복원" : "최대화"}
        >
          {isMaximized ? (
            <svg
              className="w-2 h-2 opacity-0 group-hover:opacity-100"
              viewBox="0 0 8 8"
              fill="none"
            >
              <path
                d="M1.5 3.5V1.5H6.5V6.5H4.5"
                stroke="#0d6128"
                strokeWidth="1"
              />
              <rect
                x="1.5"
                y="3.5"
                width="5"
                height="3"
                stroke="#0d6128"
                strokeWidth="1"
              />
            </svg>
          ) : (
            <svg
              className="w-2 h-2 opacity-0 group-hover:opacity-100"
              viewBox="0 0 8 8"
              fill="none"
            >
              <rect
                x="1.5"
                y="1.5"
                width="5"
                height="5"
                stroke="#0d6128"
                strokeWidth="1"
              />
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-[#ff5f57] flex items-center justify-center hover:brightness-90 transition-all"
          aria-label="닫기"
        >
          <svg
            className="w-2 h-2 opacity-0 group-hover:opacity-100"
            viewBox="0 0 8 8"
            fill="none"
          >
            <path
              d="M1.5 1.5L6.5 6.5M1.5 6.5L6.5 1.5"
              stroke="#96221b"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AppTitleBar;
