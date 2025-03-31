import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";

// 앱 아이콘 컴포넌트
const AppIcon: React.FC<{ name: string }> = ({ name }) => {
  // 앱 이름에 따라 색상과 아이콘 첫 글자 결정
  const getIconInfo = (appName: string) => {
    appName = appName.toLowerCase();

    if (appName.includes("chrome")) {
      return { color: "#4285F4", letter: "C" };
    } else if (appName.includes("edge")) {
      return { color: "#0078D7", letter: "E" };
    } else if (appName.includes("cursor")) {
      return { color: "#5865F2", letter: "C" };
    } else if (appName.includes("settings")) {
      return { color: "#888", letter: "S" };
    } else if (appName.includes("firefox")) {
      return { color: "#FF9500", letter: "F" };
    } else if (appName.includes("premiere")) {
      return { color: "#9999FF", letter: "P" };
    } else if (appName.includes("photoshop")) {
      return { color: "#31A8FF", letter: "P" };
    } else {
      // 기본값 (임의의 컬러, 첫 글자 사용)
      return {
        color: `#${Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, "0")}`,
        letter: appName.charAt(0).toUpperCase(),
      };
    }
  };

  const { color, letter } = getIconInfo(name);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: color,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
        fontWeight: "bold",
      }}
    >
      {letter}
    </div>
  );
};

// 윈도우 썸네일 컴포넌트
const WindowThumbnail: React.FC<{ window: any }> = ({ window }) => {
  const [imageError, setImageError] = useState(false);

  // 썸네일 이미지 에러 처리
  const handleImageError = () => {
    setImageError(true);
  };

  // 썸네일이 없거나 로드 실패 시 앱 아이콘 표시
  if (!window.thumbnail || imageError) {
    return <AppIcon name={window.name} />;
  }

  // 썸네일 있는 경우 이미지 표시
  try {
    const dataUrl = window.thumbnail.toDataURL();

    return (
      <img
        src={dataUrl}
        alt={window.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        onError={handleImageError}
      />
    );
  } catch (error) {
    // 예외 발생 시 앱 아이콘으로 폴백
    return <AppIcon name={window.name} />;
  }
};

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
  useEffect(() => {
    // 초기 창 목록 로드
    refreshActiveWindows();
  }, [refreshActiveWindows]);

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

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label
              className="form-label"
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "14px",
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
                    minWidth: "60px",
                  }}
                  onClick={() => handleSpeedChange(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
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
                  fontSize: "14px",
                }}
              >
                녹화할 화면
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                {isLoadingWindows && (
                  <span style={{ color: "#a0a0a0", fontSize: "12px" }}>
                    새로고침 중...
                  </span>
                )}
                <button
                  onClick={refreshActiveWindows}
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
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", // 그리드 셀 크기 증가
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
                      width: "160px", // 썸네일 크기 증가
                      height: "120px", // 썸네일 크기 증가
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
              ))}
            </div>
          </div>

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
