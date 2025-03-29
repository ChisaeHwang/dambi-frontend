import React from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import CaptureSection from "./timelapse/CaptureSection";
import GenerationSection from "./timelapse/GenerationSection";
import OutputSection from "./timelapse/OutputSection";

// 일렉트론 환경에서 IPC 통신을 위한 타입 정의
declare global {
  interface Window {
    electron: {
      startCapture: (interval: number) => void;
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
    captureInterval,
    frameCount,
    duration,
    timelapseOptions,
    outputPath,
    startCapture,
    stopCapture,
    changeCaptureInterval,
    changeTimelapseOptions,
    generateTimelapse,
  } = useTimelapseGenerationCapture();

  const handleGenerateTimelapse = async () => {
    try {
      const path = await generateTimelapse();
      alert(`타임랩스가 생성되었습니다: ${path}`);
    } catch (error: any) {
      alert(
        `타임랩스 생성 실패: ${error instanceof Error ? error.message : error}`
      );
    }
  };

  return (
    <div className="timelapse-container">
      {/* 타임랩스 제어 섹션 */}
      <CaptureSection
        isCapturing={isCapturing}
        captureInterval={captureInterval}
        frameCount={frameCount}
        duration={duration}
        onCaptureIntervalChange={changeCaptureInterval}
        onStartCapture={startCapture}
        onStopCapture={stopCapture}
      />

      {/* 타임랩스 생성 섹션은 필요할 때만 표시 */}
      {frameCount > 0 && !isCapturing && (
        <GenerationSection
          timelapseOptions={timelapseOptions}
          onOptionsChange={changeTimelapseOptions}
          onGenerateTimelapse={handleGenerateTimelapse}
        />
      )}

      {/* 생성된 타임랩스 결과 섹션은 필요할 때만 표시 */}
      {outputPath && (
        <OutputSection
          outputPath={outputPath}
          outputFormat={timelapseOptions.outputFormat}
        />
      )}
    </div>
  );
};

export default Timelapse;
