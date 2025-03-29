import React from "react";
import { useTimelapseSession } from "../hooks/useTimelapseSession";
import { useFramePlayer } from "../hooks/useFramePlayer";
import SessionSelector from "./timelapse/SessionSelector";
import MetadataDisplay from "./timelapse/MetadataDisplay";
import FrameViewer from "./timelapse/FrameViewer";
import PlayerControls from "./timelapse/PlayerControls";

const TimelapsePlayer: React.FC = () => {
  const {
    sessions,
    currentSession,
    frames,
    metadata,
    electronAvailable,
    selectSession,
  } = useTimelapseSession();

  const { currentFrame, isPlaying, togglePlay, changeFrame } = useFramePlayer(
    frames,
    metadata
  );

  return (
    <div className="card">
      <h2 className="section-title">타임랩스 플레이어</h2>

      {!electronAvailable && (
        <div
          style={{
            margin: "16px 0",
            padding: "10px",
            backgroundColor: "#ffecb3",
            borderRadius: "4px",
            color: "#664d03",
          }}
        >
          <p>
            데스크톱 앱(Electron) 환경에서만 타임랩스 플레이어를 사용할 수
            있습니다.
          </p>
        </div>
      )}

      {electronAvailable && (
        <>
          <SessionSelector
            sessions={sessions}
            currentSession={currentSession}
            onSessionChange={selectSession}
          />

          {metadata && <MetadataDisplay metadata={metadata} />}

          <FrameViewer currentFrame={currentFrame} frames={frames} />

          <PlayerControls
            currentFrame={currentFrame}
            framesCount={frames.length}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onFrameChange={changeFrame}
          />
        </>
      )}
    </div>
  );
};

export default TimelapsePlayer;
