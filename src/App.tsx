import React, { useState } from "react";
import "./App.css";
import Timelapse from "./components/Timelapse";
import TimelapsePlayer from "./components/TimelapsePlayer";
import Calendar from "./components/Calendar";
import AppTitleBar from "./components/AppTitleBar";

// 네비게이션 페이지 정의
type Page = "timelapseRecorder" | "timelapsePlayer" | "calendar";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("timelapseRecorder");

  // 일렉트론 환경에서 실행 중인지 확인
  const isElectron = window.electron !== undefined;

  // 페이지 컨텐츠 렌더링
  const renderPageContent = () => {
    switch (currentPage) {
      case "timelapseRecorder":
        return <Timelapse />;
      case "timelapsePlayer":
        return <TimelapsePlayer />;
      case "calendar":
        return <Calendar />;
      default:
        return <Timelapse />;
    }
  };

  return (
    <div className="App">
      {isElectron && <AppTitleBar />}
      <div className="simple-layout">
        {/* 심플한 아이콘 사이드바 */}
        <div className="icon-sidebar">
          <div
            className={`icon-button ${
              currentPage === "timelapseRecorder" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("timelapseRecorder")}
            title="타임랩스 캡처"
          >
            <div className="icon">
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
            className={`icon-button ${
              currentPage === "timelapsePlayer" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("timelapsePlayer")}
            title="타임랩스 재생"
          >
            <div className="icon">
              <svg
                fill="currentColor"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path d="M18 4l-4 4h3v8c0 1.1-.9 2-2 2s-2-.9-2-2V8c0-2.21-1.79-4-4-4S5 5.79 5 8v8H2l4 4 4-4H7V8c0-1.1.9-2 2-2s2 .9 2 2v8c0 2.21 1.79 4 4 4s4-1.79 4-4V8h3l-4-4z" />
              </svg>
            </div>
          </div>
          <div
            className={`icon-button ${
              currentPage === "calendar" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("calendar")}
            title="작업 캘린더"
          >
            <div className="icon">
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
        </div>

        {/* 메인 컨텐츠 영역 */}
        <main className="main-content">{renderPageContent()}</main>
      </div>
    </div>
  );
}

export default App;
