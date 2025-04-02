import React from "react";
import { WorkSession } from "../../types/calendar";

interface SessionsListProps {
  selectedDate: Date;
  sessions: WorkSession[];
}

const SessionsList: React.FC<SessionsListProps> = ({
  selectedDate,
  sessions,
}) => {
  // 날짜 포맷 함수
  const formatSessionTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  return (
    <div
      className="selected-date-info"
      style={{
        marginTop: "20px",
        borderTop: "1px solid #40444b",
        paddingTop: "16px",
      }}
    >
      <h3
        style={{
          color: "#fff",
          fontSize: "16px",
          marginBottom: "12px",
        }}
      >
        {`${selectedDate.getFullYear()}년 ${
          selectedDate.getMonth() + 1
        }월 ${selectedDate.getDate()}일 작업`}
      </h3>

      {sessions.length === 0 ? (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          이 날짜에 기록된 작업이 없습니다.
        </div>
      ) : (
        <div>
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                padding: "12px",
                marginBottom: "8px",
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "8px",
                borderLeft: "4px solid var(--brand-experiment)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontWeight: "bold" }}>{session.title}</span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    backgroundColor: "var(--bg-modifier-accent)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  {session.category}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.9rem",
                  color: "var(--text-muted)",
                }}
              >
                <span>
                  {session.date.getHours().toString().padStart(2, "0")}:
                  {session.date.getMinutes().toString().padStart(2, "0")}
                </span>
                <span>{formatSessionTime(session.duration)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionsList;
