import React from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";

const Settings: React.FC = () => {
  const {
    captureInterval,
    timelapseOptions,
    selectedScreen,
    changeCaptureInterval,
    changeTimelapseOptions,
    changeSelectedScreen,
  } = useTimelapseGenerationCapture();

  // 가상의 화면 목록 (실제로는 백엔드에서 가져올 수 있음)
  const availableScreens = ["전체 화면", "주 모니터", "보조 모니터"];

  // 배속 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    // 설정 저장 로직 (로컬 스토리지나 백엔드로 전송)
    alert("설정이 저장되었습니다.");
  };

  return (
    <div className="settings-container">
      <div className="card">
        <h2 className="section-title">설정</h2>

        <div className="settings-section">
          <h3>타임랩스 설정</h3>

          <div className="form-group">
            <label className="form-label">배속 설정</label>
            <div className="speed-options">
              {[1, 3, 6, 10].map((speed) => (
                <button
                  key={speed}
                  className={`speed-option ${
                    timelapseOptions.speedFactor === speed ? "active" : ""
                  }`}
                  onClick={() => handleSpeedChange(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">캡처 간격 (초)</label>
            <div className="interval-slider">
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={captureInterval}
                onChange={(e) => changeCaptureInterval(Number(e.target.value))}
                className="form-slider"
              />
              <span className="interval-value">{captureInterval}초</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">캡처할 화면</label>
            <select
              value={selectedScreen}
              onChange={(e) => changeSelectedScreen(e.target.value)}
              className="form-select"
            >
              {availableScreens.map((screen) => (
                <option key={screen} value={screen}>
                  {screen}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button
            onClick={handleSaveSettings}
            className="custom-button primary"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
