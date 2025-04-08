import React from "react";
import { Timelapse } from "../features/timelapse";

/**
 * 타임랩스 워크스페이스 페이지
 * - 실제 작업은 Timelapse 컴포넌트로 위임하며, 필요한 경우 페이지 레벨 로직 추가 가능
 */
const TimelapseWorkspacePage: React.FC = () => {
  return <Timelapse />;
};

export default TimelapseWorkspacePage;
