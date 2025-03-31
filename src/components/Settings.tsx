import React from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";

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

  // 배속 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 창 선택 핸들러
  const handleWindowChange = (windowId: string) => {
    changeSelectedWindow(windowId);
  };

  // 활성 창 목록 새로고침 핸들러
  const handleRefreshWindows = () => {
    refreshActiveWindows();
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    // 설정 저장 로직 (로컬 스토리지나 백엔드로 전송)
    alert("설정이 저장되었습니다.");
  };

  return (
    <div
      className="settings-container"
      style={{
        backgroundColor: "#36393f",
        color: "#dcddde",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}
    >
      <div
        className="card"
        style={{
          backgroundColor: "#2f3136",
          borderRadius: "8px",
          boxShadow: "0 2px 10px 0 rgba(0,0,0,.2)",
          padding: "20px",
          maxWidth: "800px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <h2
          className="section-title"
          style={{
            color: "#fff",
            fontSize: "24px",
            marginBottom: "20px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          설정
        </h2>

        <div className="settings-section" style={{ marginBottom: "20px" }}>
          <h3 style={{ color: "#fff", fontSize: "18px", marginBottom: "15px" }}>
            타임랩스 설정
          </h3>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label
              className="form-label"
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "16px",
              }}
            >
              배속 설정
            </label>
            <div
              className="speed-options"
              style={{ display: "flex", gap: "10px" }}
            >
              {[3, 6, 9, 20].map((speed) => (
                <button
                  key={speed}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor:
                      timelapseOptions.speedFactor === speed
                        ? "#5865f2"
                        : "#4f545c",
                    color: "#fff",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    fontSize: "14px",
                  }}
                  onClick={() => handleSpeedChange(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

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
                  display: "block",
                  margin: 0,
                  fontSize: "16px",
                }}
              >
                녹화할 화면
              </label>
              <button
                onClick={handleRefreshWindows}
                style={{
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#4f545c",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                disabled={isLoadingWindows}
              >
                {isLoadingWindows ? "로딩 중..." : "새로고침"}
              </button>
            </div>
            <div
              className="windows-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "10px",
              }}
            >
              {activeWindows.map((window) => (
                <div
                  key={window.id}
                  onClick={() => handleWindowChange(window.id)}
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
                      width: "150px",
                      height: "100px",
                      backgroundColor: "#2f3136",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    {window.thumbnail ? (
                      <img
                        src={`data:image/png;base64,${Buffer.from(
                          window.thumbnail.toPNG()
                        ).toString("base64")}`}
                        alt={window.name}
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                    ) : (
                      <div style={{ color: "#72767d" }}>미리보기 없음</div>
                    )}
                  </div>
                  <div
                    style={{
                      color: "#fff",
                      fontSize: "12px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {window.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label
              className="form-label"
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "16px",
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
              fontSize: "16px",
              fontWeight: "500",
              transition: "background-color 0.2s",
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
