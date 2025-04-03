import React, { useEffect } from "react";
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
    saveFolderPath,
    setSaveFolderPath,
    selectSaveFolder,
  } = useTimelapseGenerationCapture();

  // 최초 마운트 여부 확인을 위한 ref
  const mountedRef = React.useRef(false);

  // 컴포넌트 마운트 시 창 목록 초기 로드만 수행
  useEffect(() => {
    // 초기 창 목록 로드 - 최초 마운트 시에만 실행
    if (!mountedRef.current) {
      console.log("Settings: 최초 마운트 시 창 목록 로딩");
      refreshActiveWindows();
      mountedRef.current = true;
    }
  }, []);

  // 배속 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 창 선택 핸들러
  const handleWindowChange = (windowId: string) => {
    try {
      if (!windowId) return;
      changeSelectedWindow(windowId);
    } catch (error) {
      console.error("Settings: 창 선택 변경 중 오류 발생", error);
    }
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    // 현재 타임랩스 옵션을 로컬 스토리지에 저장
    // localStorage.setItem("timelapseOptions", JSON.stringify(timelapseOptions));
    // localStorage.setItem("selectedWindowId", selectedWindowId);

    alert("설정이 저장되었습니다.");
  };

  // 저장 폴더 선택 핸들러
  const handleSelectFolder = async () => {
    try {
      await selectSaveFolder();
    } catch (error) {
      console.error("폴더 선택 오류:", error);
    }
  };

  // 속도 옵션
  const speedOptions = [3, 6, 9, 20];

  return (
    <div
      className="settings-container"
      style={{
        backgroundColor: "#36393f",
        color: "#dcddde",
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        overflowX: "hidden", // 가로 스크롤 방지
        overflowY: "auto", // 세로 스크롤 추가
      }}
    >
      <div
        className="card"
        style={{
          backgroundColor: "#2f3136",
          borderRadius: "8px",
          boxShadow: "0 2px 10px 0 rgba(0,0,0,.2)",
          padding: "20px",
          width: "98%",
          maxWidth: "1400px",
          minWidth: "auto",
          margin: "0 auto",
          marginBottom: "20px", // 하단 여백 추가
          overflow: "visible", // 내부 컨텐츠가 넘치지 않도록
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

          {/* 저장 경로 설정 */}
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label
              className="form-label"
              style={{
                display: "block",
                marginBottom: "10px",
                fontSize: "14px",
              }}
            >
              타임랩스 저장 위치
            </label>
            <div
              className="path-selector"
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={saveFolderPath || "기본 위치 (내 비디오 폴더)"}
                readOnly
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #4f545c",
                  backgroundColor: "#40444b",
                  color: "#dcddde",
                  fontSize: "14px",
                }}
              />
              <button
                onClick={handleSelectFolder}
                style={{
                  padding: "10px 16px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#4f545c",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                }}
              >
                폴더 선택
              </button>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#a0a0a0",
                marginTop: "6px",
              }}
            >
              타임랩스 영상이 저장될 폴더를 선택하세요. 기본값은 시스템의 비디오
              폴더입니다.
            </div>
          </div>

          {/* 원본 이미지 보존 설정 */}
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label
                className="form-label"
                style={{
                  fontSize: "14px",
                }}
              >
                원본 캡처 이미지 보존
              </label>

              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="preserveOriginals"
                  checked={timelapseOptions.preserveOriginals !== false}
                  onChange={(e) =>
                    changeTimelapseOptions({
                      preserveOriginals: e.target.checked,
                    })
                  }
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="preserveOriginals"
                  style={{
                    display: "inline-block",
                    width: "46px",
                    height: "24px",
                    backgroundColor:
                      timelapseOptions.preserveOriginals !== false
                        ? "#5865f2"
                        : "#72767d",
                    borderRadius: "12px",
                    position: "relative",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: "18px",
                      height: "18px",
                      backgroundColor: "#fff",
                      borderRadius: "50%",
                      position: "absolute",
                      top: "3px",
                      left:
                        timelapseOptions.preserveOriginals !== false
                          ? "25px"
                          : "3px",
                      transition: "left 0.2s",
                    }}
                  />
                </label>
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#a0a0a0",
                marginTop: "6px",
              }}
            >
              타임랩스 생성 후 원본 캡처 이미지를 보존할지 여부를 설정합니다.
              보존하면 디스크 공간을 더 많이 사용하지만 필요할 때 다시
              타임랩스를 만들 수 있습니다.
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
              maxWidth: "240px",
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
