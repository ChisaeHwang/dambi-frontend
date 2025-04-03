import React, { useEffect } from "react";
import type { WindowInfo } from "../../hooks/useTimelapseGenerationCapture";
import WindowThumbnail from "./window/WindowThumbnail";
import { STORAGE_KEYS } from "../../utils/localStorage";

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
  // 컴포넌트 마운트 시 로컬 스토리지에서 선택된 창 ID 확인
  useEffect(() => {
    const savedWindowId = localStorage.getItem(STORAGE_KEYS.SELECTED_WINDOW_ID);

    // 저장된 ID가 있고, 현재 선택된 ID와 다르며, 활성 창 목록에 있는 경우
    if (
      savedWindowId &&
      savedWindowId !== selectedWindowId &&
      activeWindows.some((window) => window.id === savedWindowId)
    ) {
      console.log("로컬 스토리지에 저장된 창 ID로 복원:", savedWindowId);
      onWindowChange(savedWindowId);
    }
  }, [activeWindows, onWindowChange]);

  // 새로고침 버튼 처리기
  const handleRefreshWindows = () => {
    // 현재 선택된 ID를 기억
    const currentSelectedId = selectedWindowId;

    // 창 목록 새로고침
    onRefreshWindows();

    // 새로고침 후에도 기존 선택 상태를 유지하기 위해 로컬 스토리지에 강제로 저장
    if (currentSelectedId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_WINDOW_ID, currentSelectedId);
    }
  };

  // 선택한 창 변경 시 로컬 스토리지에 저장
  const handleWindowChange = (windowId: string) => {
    if (!windowId) return; // 유효하지 않은 ID 방지

    // 로컬 스토리지와 상태 모두 업데이트
    localStorage.setItem(STORAGE_KEYS.SELECTED_WINDOW_ID, windowId);
    onWindowChange(windowId);

    // 디버깅을 위한 로그
    console.log("창 선택 변경:", windowId);
  };

  // 활성 창 목록이 변경될 때 선택 상태 확인
  useEffect(() => {
    // 현재 선택된 창이 활성 창 목록에 없는 경우, 첫 번째 창 선택
    if (
      selectedWindowId &&
      !activeWindows.some((window) => window.id === selectedWindowId) &&
      activeWindows.length > 0
    ) {
      const newWindowId = activeWindows[0].id;
      console.log("선택한 창이 목록에 없어 첫 번째 창으로 변경:", newWindowId);
      localStorage.setItem(STORAGE_KEYS.SELECTED_WINDOW_ID, newWindowId);
      onWindowChange(newWindowId);
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
          onClick={handleRefreshWindows}
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
            녹화할 수 있는 창이 없습니다.
            <div
              style={{ marginTop: "10px", fontSize: "12px", color: "#a0a0a0" }}
            >
              다른 앱을 실행하고 새로고침 버튼을 클릭하세요.
            </div>
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
              onClick={() => handleWindowChange(window.id)}
            >
              <div
                className="thumbnail"
                style={{
                  backgroundColor: "#2f3136",
                  aspectRatio: "16/9",
                  position: "relative",
                }}
              >
                <WindowThumbnail window={window} />

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
                      zIndex: 10,
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
