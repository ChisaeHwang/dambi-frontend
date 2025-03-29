import React from "react";
import { TimelapseSession } from "../../hooks/useTimelapseSession";
import { formatTime } from "../../utils/timeUtils";

interface SessionSelectorProps {
  sessions: TimelapseSession[];
  currentSession: string;
  onSessionChange: (sessionId: string) => void;
}

const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  currentSession,
  onSessionChange,
}) => {
  const handleSessionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = event.target.value;
    onSessionChange(sessionId);
  };

  return (
    <div className="form-group">
      <label className="form-label">세션 선택</label>
      <select
        value={currentSession}
        onChange={handleSessionChange}
        className="form-input"
      >
        <option value="">세션 선택</option>
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.id.replace("session_", "")} ({session.frameCount}
            프레임, {formatTime(session.duration)})
          </option>
        ))}
      </select>
    </div>
  );
};

export default SessionSelector;
