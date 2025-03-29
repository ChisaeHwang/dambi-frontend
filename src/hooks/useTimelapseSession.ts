import { useState, useEffect } from "react";

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

export interface TimelapseSession {
  id: string;
  path: string;
  frameCount: number;
  duration: number;
  interval: number;
  speedFactor: number;
}

export interface TimelapseMetadata {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  frameCount: number;
  interval: number;
  speedFactor: number;
  playbackDuration: number;
}

export const useTimelapseSession = () => {
  const [sessions, setSessions] = useState<TimelapseSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string>("");
  const [frames, setFrames] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<TimelapseMetadata | null>(null);
  const [electronAvailable, setElectronAvailable] = useState<boolean>(false);

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
      } catch (error) {
        console.error("프레임 목록 불러오기 오류:", error);
      }
    };

    loadFrames();
  }, [currentSession, sessions]);

  // 세션 선택 핸들러
  const selectSession = (sessionId: string) => {
    setCurrentSession(sessionId);
  };

  return {
    sessions,
    currentSession,
    frames,
    metadata,
    electronAvailable,
    selectSession,
  };
};
