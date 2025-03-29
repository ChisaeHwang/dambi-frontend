import React, { useState } from "react";
import "./App.css";
import Timelapse from "./components/Timelapse";
import TimelapsePlayer from "./components/TimelapsePlayer";
import Calendar from "./components/Calendar";

// 네비게이션 페이지 정의
type Page = "timelapseRecorder" | "timelapsePlayer" | "calendar";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("timelapseRecorder");

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
      <div className="simple-layout">
        {/* 심플한 아이콘 사이드바 */}
        <div className="icon-sidebar">
          <div
            className={`icon-button ${
              currentPage === "timelapseRecorder" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("timelapseRecorder")}
          >
            <div className="icon">📷</div>
          </div>
          <div
            className={`icon-button ${
              currentPage === "timelapsePlayer" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("timelapsePlayer")}
          >
            <div className="icon">🎬</div>
          </div>
          <div
            className={`icon-button ${
              currentPage === "calendar" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("calendar")}
          >
            <div className="icon">📅</div>
          </div>
          <div className="icon-button">
            <div className="icon">📈</div>
          </div>
          <div className="icon-button">
            <div className="icon">⚙️</div>
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <main className="main-content">{renderPageContent()}</main>
      </div>
    </div>
  );
}

export default App;
