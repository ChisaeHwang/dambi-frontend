import React, { useState } from "react";
import "./App.css";
import Timelapse from "./components/Timelapse";
import TimelapsePlayer from "./components/TimelapsePlayer";
import Calendar from "./components/Calendar";
import AppTitleBar from "./components/AppTitleBar";
import { FaHome, FaVideo, FaCalendarAlt } from "react-icons/fa";

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
      <AppTitleBar />

      <div className="app-content">
        {/* 사이드바 네비게이션 */}
        <div className="app-sidebar">
          <div
            className={`sidebar-item ${
              currentPage === "timelapseRecorder" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("timelapseRecorder")}
          >
            <FaHome className="sidebar-icon" />
            <span className="sidebar-text">타임랩스 기록</span>
          </div>
          <div
            className={`sidebar-item ${
              currentPage === "timelapsePlayer" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("timelapsePlayer")}
          >
            <FaVideo className="sidebar-icon" />
            <span className="sidebar-text">타임랩스 플레이어</span>
          </div>
          <div
            className={`sidebar-item ${
              currentPage === "calendar" ? "active" : ""
            }`}
            onClick={() => setCurrentPage("calendar")}
          >
            <FaCalendarAlt className="sidebar-icon" />
            <span className="sidebar-text">작업 캘린더</span>
          </div>
        </div>

        {/* 메인 콘텐츠 영역 */}
        <main className="App-main">{renderPageContent()}</main>
      </div>

      <footer className="App-footer">
        <p>&copy; 2023 담비 - 작업 기록 및 타임랩스 앱</p>
      </footer>
    </div>
  );
}

export default App;
