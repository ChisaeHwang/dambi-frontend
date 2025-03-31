import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../utils/timeUtils";

// 일렉트론 환경에서 IPC 통신을 위한 타입 정의
declare global {
  interface Window {
    electron: {
      getActiveWindows: () => Promise<any[]>;
      startCapture: (windowId: string) => void;
      stopCapture: () => void;
      generateTimelapse: (options: any) => Promise<string>;
      onCaptureStatus: (callback: (status: any) => void) => void;
      isMaximized: () => Promise<boolean>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

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
  } = useTimelapseGenerationCapture();

  const [showGeneratePrompt, setShowGeneratePrompt] = useState<boolean>(false);
  const [workTime, setWorkTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedSpeedFactor, setSelectedSpeedFactor] = useState<number>(3); // 기본 3배속

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

  // 활성 창 목록 새로고침 핸들러
  const handleRefreshWindows = () => {
    refreshActiveWindows();
  };

  // 작업 시간 포맷팅 (00:00:00 형식)
  const formattedTime = formatTime(workTime);

  return (
    <div
      className="workspace-container"
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
          워크스페이스
        </h2>

        {!isCapturing && !showGeneratePrompt && (
          <div className="settings" style={{ marginBottom: "20px" }}>
            <div className="setting-section" style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3
                  style={{
                    color: "#fff",
                    fontSize: "18px",
                    margin: 0,
                  }}
                >
                  녹화할 화면
                </h3>
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
                  marginTop: "15px",
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
                          src={
                            window.thumbnail &&
                            typeof window.thumbnail.toDataURL === "function"
                              ? window.thumbnail.toDataURL()
                              : ""
                          }
                          alt={window.name}
                          style={{ maxWidth: "100%", maxHeight: "100%" }}
                          onError={(e) => {
                            if (
                              e.currentTarget &&
                              e.currentTarget.parentElement
                            ) {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.parentElement.innerHTML = `<div style="color: #72767d">미리보기 없음</div>`;
                            }
                          }}
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

            <div className="setting-section" style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  color: "#fff",
                  fontSize: "18px",
                  marginBottom: "10px",
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
            margin: "30px 0",
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
            marginTop: "20px",
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
              maxWidth: "200px",
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
                marginBottom: "20px",
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
                gap: "10px",
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
