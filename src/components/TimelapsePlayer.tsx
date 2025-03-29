import React, { useState, useEffect, useRef } from "react";

// 일렉트론 환경에서만 사용할 수 있는 모듈들을 조건부로 로드
let fs: any = null;
let path: any = null;

// Electron 환경인지 확인
const isElectron = () => {
  return window && window.process && window.process.type;
};

// Electron 환경인 경우 fs 및 path 모듈 가져오기
if (isElectron() && window.require) {
  try {
    fs = window.require("fs");
    path = window.require("path");
  } catch (err) {
    console.error("Node.js 모듈 로드 오류:", err);
  }
}

interface TimelapseSession {
  id: string;
  path: string;
  frameCount: number;
  duration: number;
  interval: number;
  speedFactor: number;
}

interface TimelapseMetadata {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  frameCount: number;
  interval: number;
  speedFactor: number;
  playbackDuration: number;
}

const TimelapsePlayer: React.FC = () => {
  const [sessions, setSessions] = useState<TimelapseSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string>("");
  const [frames, setFrames] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<TimelapseMetadata | null>(null);
  const [electronAvailable, setElectronAvailable] = useState<boolean>(false);

  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(30); // 기본 FPS 설정

  // 초기화: 세션 목록 가져오기
  useEffect(() => {
    const loadSessions = async () => {
      try {
        if (!isElectron()) {
          console.log("일렉트론 환경이 아닙니다. 세션을 불러올 수 없습니다.");
          return;
        }

        setElectronAvailable(true);

        const homeDir = process.env.HOME || process.env.USERPROFILE;
        if (!homeDir) throw new Error("홈 디렉토리를 찾을 수 없습니다.");

        const baseDir = path.join(homeDir, "Documents", "담비", "captures");
        if (!fs.existsSync(baseDir)) {
          console.log("캡처 디렉토리가 없습니다:", baseDir);
          return;
        }

        const folders = await fs.promises.readdir(baseDir, {
          withFileTypes: true,
        });
        const sessionDirs = folders
          .filter(
            (dirent: any) =>
              dirent.isDirectory() && dirent.name.startsWith("session_")
          )
          .map((dirent: any) => dirent.name);

        const sessionsData: TimelapseSession[] = [];

        for (const dir of sessionDirs) {
          const sessionPath = path.join(baseDir, dir);
          const metadataPath = path.join(sessionPath, "metadata.json");

          if (fs.existsSync(metadataPath)) {
            try {
              const metadataContent = fs.readFileSync(metadataPath, "utf-8");
              const metadata = JSON.parse(metadataContent) as TimelapseMetadata;

              sessionsData.push({
                id: dir,
                path: sessionPath,
                frameCount: metadata.frameCount,
                duration: metadata.duration,
                interval: metadata.interval,
                speedFactor: metadata.speedFactor,
              });
            } catch (err) {
              console.error(`메타데이터 읽기 오류 (${dir}):`, err);
            }
          }
        }

        setSessions(sessionsData);
      } catch (error) {
        console.error("세션 목록 불러오기 오류:", error);
      }
    };

    loadSessions();
  }, []);

  // 세션 변경 시 프레임 목록 로드
  useEffect(() => {
    const loadFrames = async () => {
      if (!currentSession || !isElectron()) return;

      try {
        const selectedSession = sessions.find((s) => s.id === currentSession);
        if (!selectedSession) return;

        // 메타데이터 로드
        const metadataPath = path.join(selectedSession.path, "metadata.json");
        if (fs.existsSync(metadataPath)) {
          const metadataContent = fs.readFileSync(metadataPath, "utf-8");
          const meta = JSON.parse(metadataContent) as TimelapseMetadata;
          setMetadata(meta);

          // FPS 계산 (메타데이터 기반)
          // 타임랩스 속도를 고려한 FPS 계산
          const calculatedFps = (1 / meta.interval) * meta.speedFactor;
          fpsRef.current = Math.min(Math.max(calculatedFps, 1), 30); // 1~30fps 범위로 제한
        }

        // 프레임 목록 로드
        const files = await fs.promises.readdir(selectedSession.path);
        const imageFiles = files
          .filter((file: string) => file.endsWith(".png"))
          .sort((a: string, b: string) => {
            const numA = parseInt(a.replace(/\D/g, ""));
            const numB = parseInt(b.replace(/\D/g, ""));
            return numA - numB;
          })
          .map((file: string) => path.join(selectedSession.path, file));

        setFrames(imageFiles);
        setCurrentFrame(0);
        setIsPlaying(false);
      } catch (error) {
        console.error("프레임 목록 불러오기 오류:", error);
      }
    };

    loadFrames();

    // 컴포넌트 언마운트 시 애니메이션 정리
    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentSession, sessions]);

  // 애니메이션 프레임 함수
  const animate = (time: number) => {
    if (!isPlaying) return;

    // FPS 제어
    const frameInterval = 1000 / fpsRef.current;
    const elapsed = time - lastFrameTimeRef.current;

    if (elapsed > frameInterval) {
      lastFrameTimeRef.current = time - (elapsed % frameInterval);

      setCurrentFrame((prevFrame) => {
        if (prevFrame >= frames.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prevFrame + 1;
      });
    }

    animationRef.current = window.requestAnimationFrame(animate);
  };

  // 재생 상태 변경 시 애니메이션 제어
  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = window.performance.now();
      animationRef.current = window.requestAnimationFrame(animate);
    } else if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

  // 재생/일시정지 토글
  const togglePlay = () => {
    if (frames.length === 0) return;

    if (currentFrame >= frames.length - 1 && !isPlaying) {
      setCurrentFrame(0);
    }

    setIsPlaying(!isPlaying);
  };

  // 세션 선택 핸들러
  const handleSessionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = event.target.value;
    setCurrentSession(sessionId);
  };

  // 프레임 슬라이더 핸들러
  const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frameIndex = parseInt(event.target.value, 10);
    setCurrentFrame(frameIndex);
  };

  // 시간 포맷 함수 (초 -> MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

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

          {metadata && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--primary-color)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      marginBottom: "2px",
                    }}
                  >
                    촬영 시간
                  </div>
                  <div>{formatTime(metadata.duration)}</div>
                </div>
                <div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      marginBottom: "2px",
                    }}
                  >
                    프레임 수
                  </div>
                  <div>{metadata.frameCount}개</div>
                </div>
                <div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      marginBottom: "2px",
                    }}
                  >
                    캡처 간격
                  </div>
                  <div>{metadata.interval}초</div>
                </div>
                <div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      marginBottom: "2px",
                    }}
                  >
                    타임랩스 속도
                  </div>
                  <div>{metadata.speedFactor}배속</div>
                </div>
                <div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      marginBottom: "2px",
                    }}
                  >
                    재생 시간
                  </div>
                  <div>{formatTime(metadata.playbackDuration)}</div>
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              width: "100%",
              height: "450px",
              backgroundColor: "var(--bg-tertiary)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "16px",
              marginBottom: "16px",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
            }}
          >
            {frames.length > 0 && currentFrame < frames.length ? (
              <img
                src={`file://${frames[currentFrame]}`}
                alt={`프레임 ${currentFrame + 1}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain" as const,
                }}
              />
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>
                선택된 이미지 없음
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={togglePlay}
              className={`custom-button ${
                frames.length === 0 ? "secondary" : ""
              }`}
              disabled={frames.length === 0}
            >
              {isPlaying ? "일시정지" : "재생"}
            </button>

            <input
              type="range"
              min={0}
              max={frames.length > 0 ? frames.length - 1 : 0}
              value={currentFrame}
              onChange={handleFrameChange}
              disabled={frames.length === 0 || isPlaying}
              style={{
                flex: "1",
                height: "10px",
                borderRadius: "5px",
                backgroundColor: "var(--bg-tertiary)",
                accentColor: "var(--primary-color)",
              }}
            />

            <span style={{ minWidth: "70px", textAlign: "right" }}>
              {frames.length > 0
                ? `${currentFrame + 1} / ${frames.length}`
                : "0 / 0"}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default TimelapsePlayer;
