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
            onClick={onRefreshWindows}
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
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "10px",
          marginTop: "10px",
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
          activeWindows.map((window) => (
            <div
              key={window.id}
              onClick={() => onWindowChange(window.id)}
              style={{
                backgroundColor:
                  selectedWindowId === window.id ? "#5865f2" : "#4f545c",
                borderRadius: "4px",
                padding: "8px",
                cursor: "pointer",
                transition: "background-color 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "160px",
                  height: "120px",
                  backgroundColor: "#2f3136",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  overflow: "hidden",
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
