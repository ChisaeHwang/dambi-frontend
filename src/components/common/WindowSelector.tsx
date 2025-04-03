import React, { useEffect } from "react";
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
  // 컴포넌트 마운트 또는 새로고침 버튼 클릭 시에도 선택 상태 유지
  useEffect(() => {
    // selectedWindowId가 현재 활성 창 목록에 없는 경우, 첫 번째 창을 선택
    if (
      selectedWindowId &&
      !activeWindows.some((window) => window.id === selectedWindowId) &&
      activeWindows.length > 0
    ) {
      onWindowChange(activeWindows[0].id);
    }
  }, [activeWindows, selectedWindowId, onWindowChange]);

  return (
    <div className="form-group" style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <label
          className="form-label"
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#fff",
          }}
        >
          녹화할 화면
        </label>
        <button
          onClick={onRefreshWindows}
          disabled={isLoadingWindows}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#4f545c",
            color: "#fff",
            cursor: isLoadingWindows ? "wait" : "pointer",
            fontSize: "14px",
            opacity: isLoadingWindows ? 0.7 : 1,
          }}
        >
          새로고침
        </button>
      </div>

      <div
        className="windows-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px",
          marginTop: "10px",
        }}
      >
        {isLoadingWindows ? (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "20px",
              textAlign: "center",
              borderRadius: "4px",
              backgroundColor: "#40444b",
              color: "#dcddde",
            }}
          >
            창 목록 불러오는 중...
          </div>
        ) : activeWindows.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "20px",
              textAlign: "center",
              borderRadius: "4px",
              backgroundColor: "#40444b",
              color: "#dcddde",
            }}
          >
            창 목록이 없습니다
          </div>
        ) : (
          activeWindows.map((window) => (
            <div
              key={`${window.id}-${window.timestamp}`}
              className={`window-card ${
                selectedWindowId === window.id ? "selected" : ""
              }`}
              style={{
                backgroundColor: "#40444b",
                borderRadius: "8px",
                overflow: "hidden",
                cursor: "pointer",
                border:
                  selectedWindowId === window.id
                    ? "2px solid #5865f2"
                    : "2px solid transparent",
                transition: "border-color 0.2s, transform 0.2s",
                transform:
                  selectedWindowId === window.id ? "scale(1.02)" : "scale(1)",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              }}
              onClick={() => onWindowChange(window.id)}
            >
              <div
                className="thumbnail"
                style={{
                  backgroundColor: "#2f3136",
                  aspectRatio: "16/9",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {window.thumbnailDataUrl ? (
                  <img
                    src={window.thumbnailDataUrl}
                    alt={window.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      color: "#a0a0a0",
                      fontSize: "14px",
                      padding: "40px",
                      textAlign: "center",
                    }}
                  >
                    {window.isScreen ? "전체 화면" : "썸네일이 없습니다"}
                  </div>
                )}
                {selectedWindowId === window.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      backgroundColor: "#5865f2",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
              <div
                className="window-info"
                style={{
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {window.name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WindowSelector;
