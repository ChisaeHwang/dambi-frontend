import React from "react";
import type { WindowInfo } from "../../hooks/useTimelapseGenerationCapture";
import WindowThumbnail from "./window/WindowThumbnail";

interface WindowSelectorProps {
  activeWindows: WindowInfo[];
  selectedWindowId: string;
  onWindowChange: (windowId: string) => void;
  isLoadingWindows: boolean;
  onRefreshWindows: () => void;
}

const WindowSelector: React.FC<WindowSelectorProps> = ({
  activeWindows,
  selectedWindowId,
  onWindowChange,
  isLoadingWindows,
  onRefreshWindows,
}) => {
  // 새로고침 핸들러
  const handleRefresh = () => {
    onRefreshWindows();
  };

  return (
    <div className="setting-section" style={{ marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h3
          style={{
            color: "#fff",
            fontSize: "16px",
            margin: 0,
          }}
        >
          녹화할 화면
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {isLoadingWindows && (
            <span style={{ color: "#a0a0a0", fontSize: "12px" }}>
              새로고침 중...
            </span>
          )}
          <button
            onClick={handleRefresh}
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "#4f545c",
              color: "#fff",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
            }}
            disabled={isLoadingWindows}
          >
            새로고침
          </button>
        </div>
      </div>

      <div
        className="windows-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "12px",
          marginTop: "12px",
        }}
      >
        {activeWindows.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "20px",
              color: "#a0a0a0",
            }}
          >
            표시할 창이 없습니다. 새로고침을 눌러보세요.
          </div>
        ) : (
          activeWindows.map((window, index) => (
            <div
              key={`window-${window.id}-${index}-${
                window.timestamp || Date.now()
              }`}
              onClick={() => onWindowChange(window.id)}
              style={{
                backgroundColor:
                  selectedWindowId === window.id ? "#5865f2" : "#4f545c",
                borderRadius: "6px",
                padding: "10px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                boxShadow:
                  selectedWindowId === window.id
                    ? "0 0 8px rgba(88, 101, 242, 0.5)"
                    : "none",
                transform:
                  selectedWindowId === window.id ? "scale(1.02)" : "scale(1)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "140px",
                  backgroundColor: "#2f3136",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <WindowThumbnail window={window} />
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: "13px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                  whiteSpace: "nowrap",
                }}
              >
                {window.name}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WindowSelector;
