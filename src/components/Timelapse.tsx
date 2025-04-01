import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../utils/timeUtils";
import type { WindowInfo } from "../hooks/useTimelapseGenerationCapture";

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
const WindowThumbnail: React.FC<{ window: WindowInfo }> = ({ window }) => {
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

const Timelapse: React.FC = () => {
  const {
    isCapturing,
    duration,
    startCapture,
    stopCapture,
    generateTimelapse,
    timelapseOptions,
    changeTimelapseOptions,
    selectedWindowId,
    activeWindows,
    isLoadingWindows,
    changeSelectedWindow,
    refreshActiveWindows,
    error,
  } = useTimelapseGenerationCapture();

  const [showGeneratePrompt, setShowGeneratePrompt] = useState<boolean>(false);
  const [workTime, setWorkTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedSpeedFactor, setSelectedSpeedFactor] = useState<number>(3); // 기본 3배속

  // 컴포넌트 마운트 시 창 목록 초기 로드만 수행
  useEffect(() => {
    // 초기 창 목록 로드
    refreshActiveWindows();
  }, []); // 의존성 배열을 빈 배열로 변경하여 마운트 시에만 실행

  // 타이머 관리
  useEffect(() => {
    if (isCapturing && !timerInterval) {
      const interval = setInterval(() => {
        setWorkTime((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else if (!isCapturing && timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isCapturing, timerInterval]);

  // 캡처 중지 핸들러
  const handleStopCapture = () => {
    stopCapture();
    if (duration > 0) {
      setShowGeneratePrompt(true);
    }
  };

  // 타임랩스 생성 핸들러
  const handleGenerateTimelapse = async () => {
    try {
      const options = {
        ...timelapseOptions,
        speedFactor: selectedSpeedFactor,
      };
      const path = await generateTimelapse(options);
      alert(`타임랩스가 생성되었습니다: ${path}`);
      setShowGeneratePrompt(false);
    } catch (error: any) {
      alert(
        `타임랩스 생성 실패: ${error instanceof Error ? error.message : error}`
      );
    }
  };

  // 배속 변경 핸들러
  const handleSpeedFactorChange = (speed: number) => {
    setSelectedSpeedFactor(speed);
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 창 선택 핸들러
  const handleWindowChange = (windowId: string) => {
    changeSelectedWindow(windowId);
  };

  // 작업 시간 포맷팅 (00:00:00 형식)
  const formattedTime = formatTime(workTime);

  return (
    <div
      className="workspace-container"
      style={{
        backgroundColor: "#36393f",
        color: "#dcddde",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        overflow: "hidden", // 전체 컨테이너에서는 스크롤 제거
      }}
    >
      <div
        className="card"
        style={{
          backgroundColor: "#2f3136",
          borderRadius: "8px",
          boxShadow: "0 2px 10px 0 rgba(0,0,0,.2)",
          padding: "20px",
          margin: "0 auto",
          width: "98%",
          maxWidth: "1400px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "auto", // 카드 내부에만 스크롤 허용
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
          워크스페이스
        </h2>

        {error && (
          <div
            style={{
              color: "#ed4245",
              backgroundColor: "rgba(237, 66, 69, 0.1)",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {!isCapturing && !showGeneratePrompt && (
          <div className="settings" style={{ marginBottom: "16px" }}>
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: "10px",
                  marginTop: "10px",
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
                ))}
              </div>
            </div>

            <div className="setting-section" style={{ marginBottom: "16px" }}>
              <h3
                style={{
                  color: "#fff",
                  fontSize: "16px",
                  marginBottom: "8px",
                }}
              >
                타임랩스 배속
              </h3>
              <div
                className="speed-selector"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                {[3, 6, 9, 20].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedFactorChange(speed)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor:
                        selectedSpeedFactor === speed ? "#5865f2" : "#4f545c",
                      color: "#fff",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      fontSize: "14px",
                      minWidth: "60px",
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          className="timer-display"
          style={{
            textAlign: "center",
            margin: "20px 0",
            border: "1px solid #40444b",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <div
            className="time-counter"
            style={{
              fontSize: "48px",
              fontWeight: "700",
              color: "#fff",
              fontFamily: "monospace",
            }}
          >
            {formattedTime}
          </div>
        </div>

        <div
          className="action-buttons"
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "16px",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={isCapturing ? handleStopCapture : startCapture}
            style={{
              padding: "12px 24px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: isCapturing ? "#ed4245" : "#5865f2",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "500",
              transition: "background-color 0.2s",
              width: "100%",
              maxWidth: "240px",
              minWidth: "180px",
            }}
          >
            {isCapturing ? "정지" : "시작"}
          </button>
        </div>

        {/* 타임랩스 생성 프롬프트 */}
        {showGeneratePrompt && (
          <div
            className="generate-prompt"
            style={{
              padding: "20px",
              marginTop: "20px",
              backgroundColor: "#40444b",
              borderRadius: "8px",
            }}
          >
            <p
              style={{
                fontSize: "16px",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              타임랩스를 만드시겠습니까?
            </p>

            <div
              className="prompt-buttons"
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
              }}
            >
              <button
                onClick={handleGenerateTimelapse}
                style={{
                  padding: "10px 20px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#43b581",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  minWidth: "100px",
                }}
              >
                예
              </button>
              <button
                onClick={() => setShowGeneratePrompt(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "#ed4245",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  minWidth: "100px",
                }}
              >
                아니오
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timelapse;
