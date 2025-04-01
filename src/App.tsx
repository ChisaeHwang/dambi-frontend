import React, { useState } from "react";
import "./App.css";
import Timelapse from "./components/Timelapse";
import Calendar from "./components/Calendar";
import Settings from "./components/Settings";
import AppTitleBar from "./components/AppTitleBar";

// 네비게이션 페이지 정의
type Page = "workspace" | "calendar" | "settings";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("workspace");

  // 일렉트론 환경에서 실행 중인지 확인
  const isElectron = window.electron !== undefined;

  // 페이지 컨텐츠 렌더링
  const renderPageContent = () => {
    switch (currentPage) {
      case "workspace":
        return <Timelapse />;
      case "calendar":
        return <Calendar />;
      case "settings":
        return <Settings />;
      default:
        return <Timelapse />;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-tertiary)] text-[var(--text-normal)]">
      {isElectron && <AppTitleBar />}
      <div className="flex flex-1 overflow-hidden">
        {/* 심플한 아이콘 사이드바 */}
        <div className="w-[72px] py-3 flex flex-col items-center bg-[var(--bg-tertiary)] shadow-sm">
          <div
            className={`w-12 h-12 mb-2 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-accent)] hover:text-[var(--text-normal)] hover:rounded-2xl hover:-translate-y-0.5 ${
              currentPage === "workspace"
                ? "bg-[var(--primary-color)] text-white rounded-2xl relative"
                : ""
            }`}
            onClick={() => setCurrentPage("workspace")}
            title="워크스페이스"
          >
            {currentPage === "workspace" && (
              <div className="absolute left-[-16px] w-2 h-8 bg-white rounded-r"></div>
            )}
            <div className="w-6 h-6 flex items-center justify-center">
              <svg
                fill="currentColor"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-3.31 0-6 2.69-6 6v8c0 3.31 2.69 6 6 6s6-2.69 6-6v-8c0-3.31-2.69-6-6-6zm0 2c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4s-4-1.79-4-4v-8c0-2.21 1.79-4 4-4z" />
              </svg>
            </div>
          </div>
          <div
            className={`w-12 h-12 mb-2 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-accent)] hover:text-[var(--text-normal)] hover:rounded-2xl hover:-translate-y-0.5 ${
              currentPage === "calendar"
                ? "bg-[var(--primary-color)] text-white rounded-2xl relative"
                : ""
            }`}
            onClick={() => setCurrentPage("calendar")}
            title="작업 캘린더"
          >
            {currentPage === "calendar" && (
              <div className="absolute left-[-16px] w-2 h-8 bg-white rounded-r"></div>
            )}
            <div className="w-6 h-6 flex items-center justify-center">
              <svg
                fill="currentColor"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
              </svg>
            </div>
          </div>
          <div
            className={`w-12 h-12 mb-2 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-accent)] hover:text-[var(--text-normal)] hover:rounded-2xl hover:-translate-y-0.5 ${
              currentPage === "settings"
                ? "bg-[var(--primary-color)] text-white rounded-2xl relative"
                : ""
            }`}
            onClick={() => setCurrentPage("settings")}
            title="설정"
          >
            {currentPage === "settings" && (
              <div className="absolute left-[-16px] w-2 h-8 bg-white rounded-r"></div>
            )}
            <div className="w-6 h-6 flex items-center justify-center">
              <svg
                fill="currentColor"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <main className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
          {renderPageContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
