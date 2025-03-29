import React from "react";
import { TimelapseOptions } from "../../hooks/useTimelapseGenerationCapture";

interface GenerationSectionProps {
  timelapseOptions: TimelapseOptions;
  onOptionsChange: (options: Partial<TimelapseOptions>) => void;
  onGenerateTimelapse: () => void;
}

const GenerationSection: React.FC<GenerationSectionProps> = ({
  timelapseOptions,
  onOptionsChange,
  onGenerateTimelapse,
}) => {
  // FPS 변경 핸들러
  const handleFpsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onOptionsChange({ fps: parseInt(e.target.value, 10) });
  };

  // 품질 변경 핸들러
  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onOptionsChange({
      outputQuality: e.target.value as "low" | "medium" | "high",
    });
  };

  // 출력 형식 변경 핸들러
  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onOptionsChange({
      outputFormat: e.target.value as "mp4" | "gif",
    });
  };

  return (
    <div className="card">
      <h3 className="section-title">타임랩스 생성</h3>

      <div className="flex flex-wrap gap-4 mb-5">
        <label className="form-group">
          <span className="form-label">FPS:</span>
          <select
            value={timelapseOptions.fps}
            onChange={handleFpsChange}
            className="form-input"
          >
            <option value="15">15</option>
            <option value="30">30</option>
            <option value="60">60</option>
          </select>
        </label>

        <label className="form-group">
          <span className="form-label">화질:</span>
          <select
            value={timelapseOptions.outputQuality}
            onChange={handleQualityChange}
            className="form-input"
          >
            <option value="low">낮음</option>
            <option value="medium">중간</option>
            <option value="high">높음</option>
          </select>
        </label>

        <label className="form-group">
          <span className="form-label">출력 형식:</span>
          <select
            value={timelapseOptions.outputFormat}
            onChange={handleFormatChange}
            className="form-input"
          >
            <option value="mp4">MP4 비디오</option>
            <option value="gif">GIF 애니메이션</option>
          </select>
        </label>
      </div>

      <div className="text-center">
        <button onClick={onGenerateTimelapse} className="custom-button">
          타임랩스 생성
        </button>
      </div>
    </div>
  );
};

export default GenerationSection;
