import React from "react";

interface TimelapseControlsProps {
  isCapturing: boolean;
  isPaused: boolean;
  selectedWindowId: string;
  onStart: () => void;
  onStop: () => void;
  onCancel?: () => void;
  hasRecording: boolean;
}

const TimelapseControls: React.FC<TimelapseControlsProps> = ({
  isCapturing,
  isPaused,
  selectedWindowId,
  onStart,
  onStop,
  onCancel,
  hasRecording,
}) => {
  // 녹화 버튼 비활성화 여부 - 선택된 창이 없으면 비활성화
  const disabled = !selectedWindowId;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 bg-[var(--bg-tertiary)] p-6 rounded-lg shadow-sm h-full">
      {!isCapturing ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <button
            onClick={onStart}
            disabled={disabled}
            className="w-full sm:flex-1 py-3 px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="text-xl">⏺</span>
            녹화 시작
          </button>
        </div>
      ) : (
        <button
          onClick={onStop}
          className="w-full py-3 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">⏹</span>
          녹화 중지
        </button>
      )}
    </div>
  );
};

export default TimelapseControls;
