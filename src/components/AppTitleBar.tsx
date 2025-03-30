import React, { useState, useEffect } from "react";

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
    <div className="app-title-bar">
      <div className="app-logo">
        <span style={{ fontSize: "1.1rem" }}>🦝</span> 담비
      </div>

      <div className="title-bar-buttons">
        <div className="title-bar-button" onClick={handleMinimize}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </div>

        <div className="title-bar-button" onClick={handleMaximize}>
          {isMaximized ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.5 1H10.5C11.0523 1 11.5 1.44772 11.5 2V9C11.5 9.55229 11.0523 10 10.5 10H3.5C2.94772 10 2.5 9.55228 2.5 9V2C2.5 1.44771 2.94772 1 3.5 1Z"
                stroke="currentColor"
              />
              <path
                d="M1 3.5V10.5C1 11.0523 1.44772 11.5 2 11.5H9"
                stroke="currentColor"
              />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="1.5"
                y="1.5"
                width="9"
                height="9"
                stroke="currentColor"
              />
            </svg>
          )}
        </div>

        <div className="title-bar-button" onClick={handleClose}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L11 11M1 11L11 1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AppTitleBar;
