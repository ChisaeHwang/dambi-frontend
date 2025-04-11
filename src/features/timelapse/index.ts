/**
 * 타임랩스 기능 모듈
 */

import Timelapse from "./components/Timelapse";
import TimelapseTimer from "./components/TimelapseTimer";
import TimelapseControls from "./components/TimelapseControls";
import GeneratePrompt from "./components/GeneratePrompt";
import BlurRegionSelector from "./components/BlurRegionSelector";
import WorkspaceSessionForm from "./components/WorkspaceSessionForm";
import ActiveSessionPanel from "./components/ActiveSessionPanel";

// 훅 내보내기
import { useTimelapseGenerationCapture } from "./hooks/useTimelapseGenerationCapture";
import { useCaptureState } from "./hooks/useCaptureState";
import { useTimelapseGeneration } from "./hooks/useTimelapseGeneration";
import { useWorkSession } from "./hooks/useWorkSession";

// 컴포넌트 내보내기
export {
  Timelapse,
  TimelapseTimer,
  TimelapseControls,
  GeneratePrompt,
  BlurRegionSelector,
  WorkspaceSessionForm,
  ActiveSessionPanel,
};

// 훅 내보내기
export {
  useTimelapseGenerationCapture,
  useCaptureState,
  useTimelapseGeneration,
  useWorkSession,
};

// 타입 내보내기
export * from "./types";
