import React from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import WindowSelector from "./common/WindowSelector";
import SpeedSelector from "./common/SpeedSelector";

const Settings: React.FC = () => {
  const {
    timelapseOptions,
    selectedWindowId,
    activeWindows,
    isLoadingWindows,
    changeTimelapseOptions,
    changeSelectedWindow,
    refreshActiveWindows,
  } = useTimelapseGenerationCapture();

  // 컴포넌트 마운트 시 창 목록 초기 로드만 수행
  React.useEffect(() => {
    // 초기 창 목록 로드
    refreshActiveWindows();
  }, []);

  // 배속 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 창 선택 핸들러
  const handleWindowChange = (windowId: string) => {
    changeSelectedWindow(windowId);
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    // 설정 저장 로직 (로컬 스토리지나 백엔드로 전송)
    alert("설정이 저장되었습니다.");
  };

  // 속도 옵션
  const speedOptions = [3, 6, 9, 20];

  return (
    <div
      className="settings-container"
      style={{
        backgroundColor: "#36393f",
        color: "#dcddde",
        minHeight: "100vh",
        width: "100%", // 가로 스크롤 방지
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        overflowX: "hidden", // 가로 스크롤 방지
      }}
    >
      <div
        className="card"
        style={{
          backgroundColor: "#2f3136",
          borderRadius: "8px",
          boxShadow: "0 2px 10px 0 rgba(0,0,0,.2)",
          padding: "20px",
          width: "98%", // 여백 더 줄임
          maxWidth: "1400px", // 최대 너비 증가
          minWidth: "auto", // 최소 너비 제거하여 가로 스크롤 방지
          margin: "0 auto",
        }}
      >
        <h2
          className="section-title"
          style={{
            color: "#fff",
            fontSize: "20px",
            marginBottom: "16px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          설정
        </h2>

        <div className="settings-section" style={{ marginBottom: "16px" }}>
          <h3 style={{ color: "#fff", fontSize: "16px", marginBottom: "16px" }}>
            타임랩스 설정
          </h3>

          <SpeedSelector
            selectedSpeed={timelapseOptions.speedFactor}
            speedOptions={speedOptions}
            onSpeedChange={handleSpeedChange}
          />

          <WindowSelector
            activeWindows={activeWindows}
            selectedWindowId={selectedWindowId}
            onWindowChange={handleWindowChange}
            isLoadingWindows={isLoadingWindows}
            onRefreshWindows={refreshActiveWindows}
          />

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label
              className="form-label"
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "14px",
              }}
            >
              출력 품질
            </label>
            <div
              className="quality-options"
              style={{ display: "flex", gap: "10px" }}
            >
              {["low", "medium", "high"].map((quality) => (
                <button
                  key={quality}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor:
                      timelapseOptions.outputQuality === quality
                        ? "#5865f2"
                        : "#4f545c",
                    color: "#fff",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    fontSize: "14px",
                    minWidth: "80px",
                  }}
                  onClick={() =>
                    changeTimelapseOptions({ outputQuality: quality as any })
                  }
                >
                  {quality === "low"
                    ? "낮음"
                    : quality === "medium"
                    ? "중간"
                    : "높음"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ textAlign: "center" }}>
          <button
            onClick={handleSaveSettings}
            style={{
              padding: "12px 24px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "#5865f2",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
              maxWidth: "240px", // 버튼 너비 증가
              width: "100%",
              minWidth: "180px",
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
