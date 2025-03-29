import React, { useState } from "react";
import TimelapseControls from "../components/TimelapseControls";
import TimelapsePlayer from "../components/TimelapsePlayer";
import AppTitleBar from "../components/AppTitleBar";

enum TabType {
  CONTROLS = "controls",
  PLAYER = "player",
}

const TimelapsePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.CONTROLS);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppTitleBar />

      <div className="app-container">
        <div className="sidebar">
          <div style={{ padding: "16px" }}>
            <h1
              style={{
                color: "var(--text-normal)",
                fontSize: "18px",
                fontWeight: "bold",
                marginBottom: "16px",
              }}
            >
              담비
            </h1>

            <div style={{ marginBottom: "8px" }}>
              <button
                className={`sidebar-tab ${
                  activeTab === TabType.CONTROLS ? "active" : ""
                }`}
                onClick={() => setActiveTab(TabType.CONTROLS)}
              >
                <span style={{ marginRight: "8px" }}>📷</span>
                화면 캡처
              </button>
            </div>

            <div>
              <button
                className={`sidebar-tab ${
                  activeTab === TabType.PLAYER ? "active" : ""
                }`}
                onClick={() => setActiveTab(TabType.PLAYER)}
              >
                <span style={{ marginRight: "8px" }}>▶️</span>
                타임랩스 재생
              </button>
            </div>
          </div>
        </div>

        <div className="main-content">
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "24px",
                color: "var(--text-normal)",
              }}
            >
              {activeTab === TabType.CONTROLS ? "화면 캡처" : "타임랩스 재생"}
            </h1>

            {activeTab === TabType.CONTROLS ? (
              <TimelapseControls />
            ) : (
              <TimelapsePlayer />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelapsePage;
