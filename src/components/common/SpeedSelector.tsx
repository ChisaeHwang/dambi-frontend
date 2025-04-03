import React from "react";

interface SpeedSelectorProps {
  selectedSpeed: number;
  speedOptions: number[];
  onSpeedChange: (speed: number) => void;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  selectedSpeed,
  speedOptions,
  onSpeedChange,
}) => {
  // 각 배속에 대한 설명 추가
  const speedDescriptions: Record<number, string> = {
    3: "짧은 작업에 적합 (1시간 → 20분)",
    6: "중간 길이 작업에 추천 (1시간 → 10분)",
    9: "긴 작업에 효율적 (1시간 → 7분)",
    20: "매우 긴 작업에 최적화 (1시간 → 3분)",
  };

  return (
    <div className="setting-section" style={{ marginBottom: "24px" }}>
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
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {speedOptions.map((speed) => (
          <div
            key={speed}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <button
              onClick={() => onSpeedChange(speed)}
              style={{
                padding: "10px 16px",
                borderRadius: "4px",
                border: "none",
                backgroundColor:
                  selectedSpeed === speed ? "#5865f2" : "#4f545c",
                color: "#fff",
                cursor: "pointer",
                transition: "background-color 0.2s",
                fontSize: "14px",
                fontWeight: selectedSpeed === speed ? "600" : "400",
                minWidth: "240px",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    backgroundColor:
                      selectedSpeed === speed ? "#ffffff30" : "#ffffff15",
                    borderRadius: "4px",
                    padding: "4px 10px",
                    marginRight: "10px",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  {speed}x
                </span>
                {speedDescriptions[speed]}
              </span>
              {selectedSpeed === speed && (
                <span
                  style={{
                    fontSize: "16px",
                    marginLeft: "8px",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#a0a0a0",
          marginTop: "8px",
        }}
      >
        높은 배속일수록 더 짧은 영상이 생성되지만, 작업 과정의 세부 내용이
        생략될 수 있습니다.
      </div>
    </div>
  );
};

export default SpeedSelector;
