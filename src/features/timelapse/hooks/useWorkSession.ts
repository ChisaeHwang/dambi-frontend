import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { WorkSession } from "../../calendar/types";
import { electronSessionAdapter } from "../../calendar/services/ElectronSessionAdapter";
import { timerService } from "../../calendar/services/TimerService";
import { sessionStorageService } from "../../calendar/utils";

/**
 * 작업 세션 관리를 위한 훅
 */
export function useWorkSession() {
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0); // 초 단위
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [userTaskTypes, setUserTaskTypes] = useState<string[]>(() => {
    const savedTypes = localStorage.getItem("userTaskTypes");
    return savedTypes
      ? JSON.parse(savedTypes)
      : ["개발", "디자인", "회의", "기획", "리서치"];
  });
  const [todaySessions, setTodaySessions] = useState<WorkSession[]>([]);
  const [allSessions, setAllSessions] = useState<WorkSession[]>([]);

  // 사용자 작업 유형 추가
  const addTaskType = useCallback((taskType: string) => {
    setUserTaskTypes((prev) => {
      const updated = [...prev, taskType];
      localStorage.setItem("userTaskTypes", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 오늘 작업 세션 로드
  const loadTodaySessions = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = sessionStorageService.getSessionsByDate(today);
    setTodaySessions(sessions);

    // 활성 세션 찾기
    const active = sessions.find((session) => session.isActive);
    if (active) {
      setActiveSession(active);

      // 경과 시간 계산
      const start = new Date(active.startTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000); // 초 단위로 변환
      setElapsedTime(elapsed);

      // 녹화 상태 확인
      setIsRecording(active.isRecording);
    } else {
      setActiveSession(null);
      setElapsedTime(0);
      setIsRecording(false);
    }
  }, []);

  // 모든 세션 로드
  const loadAllSessions = useCallback(() => {
    const sessions = sessionStorageService.getSessions();
    setAllSessions(sessions);
  }, []);

  // 초기 로드
  useEffect(() => {
    // 이전에 비정상적으로 종료된 세션들을 정리
    cleanupIncompleteSessions();

    // 정상적인 세션 로드
    loadTodaySessions();
    loadAllSessions();
  }, [loadTodaySessions, loadAllSessions]);

  // 비정상적으로 종료된 세션 정리
  const cleanupIncompleteSessions = useCallback(() => {
    const sessions = sessionStorageService.getSessions();
    let hasChanges = false;

    // 오늘 날짜 (0시 0분 0초)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedSessions = sessions.map((session) => {
      // 케이스 1: 활성 상태인데 오늘 날짜가 아닌 세션 정리
      if (
        session.isActive &&
        new Date(session.date).getTime() < today.getTime()
      ) {
        hasChanges = true;
        const endTime = new Date(session.startTime);
        // 최대 8시간으로 제한
        const maxDuration = 8 * 60;
        // 실제 지속 시간 계산 (최대 8시간으로 제한)
        const calculatedDuration = Math.min(
          maxDuration,
          session.duration || 60
        );

        endTime.setMinutes(endTime.getMinutes() + calculatedDuration);

        return {
          ...session,
          endTime,
          isActive: false,
          duration: calculatedDuration,
          tags: [...(session.tags || []), "자동완료"],
        };
      }

      // 케이스 2: 비활성 상태인데 endTime이 없는 경우
      if (!session.isActive && !session.endTime) {
        hasChanges = true;
        const endTime = new Date(session.startTime);
        endTime.setMinutes(endTime.getMinutes() + (session.duration || 60));

        return {
          ...session,
          endTime,
          tags: [...(session.tags || []), "자동완료"],
        };
      }

      return session;
    });

    // 변경사항이 있으면 저장
    if (hasChanges) {
      console.log("비정상 종료된 세션 정리 완료");
      sessionStorageService.saveSessions(updatedSessions);
    }
  }, []);

  // 타이머 효과
  useEffect(() => {
    if (!activeSession || !activeSession.isActive) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // 세션 종료
  const stopSession = useCallback(() => {
    if (!activeSession) return;

    const now = new Date();
    const start = new Date(activeSession.startTime);
    const durationMs = now.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));

    const updatedSession = {
      ...activeSession,
      endTime: now,
      duration: durationMinutes,
      isActive: false,
      isRecording: false,
    };

    sessionStorageService.updateSession(updatedSession);
    setActiveSession(null);
    setElapsedTime(0);
    setIsRecording(false);

    // 녹화 중이었다면 중지
    if (isRecording && electronSessionAdapter.isElectronEnvironment()) {
      electronSessionAdapter.stopCapture();
    }

    // 연관된 '녹화' 세션도 함께 종료
    const todaySess = sessionStorageService.getSessionsByDate(new Date());
    const electronicSessions = todaySess.filter(
      (s) => s.isActive && s.source === "electron" && s.taskType === "녹화"
    );

    if (electronicSessions.length > 0) {
      electronicSessions.forEach((session) => {
        const updatedElectronicSession = {
          ...session,
          endTime: now,
          duration: Math.floor(
            (now.getTime() - new Date(session.startTime).getTime()) /
              (1000 * 60)
          ),
          isActive: false,
          isRecording: false,
        };
        sessionStorageService.updateSession(updatedElectronicSession);
      });
    }

    loadTodaySessions();
    loadAllSessions();
  }, [activeSession, isRecording, loadTodaySessions, loadAllSessions]);

  // 추가: 녹화 상태 주기적 확인
  useEffect(() => {
    // 활성 세션이 있고 녹화 중으로 표시된 경우에만 실행
    if (
      !activeSession ||
      !isRecording ||
      !electronSessionAdapter.isElectronEnvironment()
    ) {
      return;
    }

    // 10초마다 실제 녹화 상태 확인
    const checkInterval = setInterval(async () => {
      try {
        const recordingStatus =
          await electronSessionAdapter.getRecordingStatus();

        // 실제로는 녹화 중이 아닌데 상태는 녹화 중이라면 상태 수정
        if (!recordingStatus.isRecording && isRecording) {
          console.log("녹화 상태 불일치 감지: 상태 수정");

          // 세션 상태 업데이트
          if (activeSession) {
            const updatedSession = {
              ...activeSession,
              isRecording: false,
            };

            sessionStorageService.updateSession(updatedSession);
            setActiveSession(updatedSession);
            setIsRecording(false);
          }
        }
      } catch (error) {
        console.error("녹화 상태 확인 중 오류:", error);
      }
    }, 10000); // 10초마다 체크

    return () => clearInterval(checkInterval);
  }, [activeSession, isRecording]);

  // 세션 시작
  const startSession = useCallback(
    (sessionData: Omit<WorkSession, "id" | "date" | "duration">) => {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      // 디버깅 로그 추가
      console.log("세션 시작 데이터:", {
        ...sessionData,
        startTime: now.toISOString(),
      });

      const newSession: WorkSession = {
        id: uuidv4(),
        date: today,
        duration: 0,
        ...sessionData,
      };

      // 디버깅 로그 추가
      console.log("새 세션 생성:", {
        id: newSession.id,
        title: newSession.title,
        taskType: newSession.taskType,
        isRecording: newSession.isRecording,
      });

      // 활성 세션이 있으면 중지
      if (activeSession && activeSession.isActive) {
        stopSession();
      }

      // 추가: 동일 날짜의 활성 '녹화' 세션 종료 처리
      const todaySess = sessionStorageService.getSessionsByDate(today);
      const electronicSessions = todaySess.filter(
        (s) => s.isActive && s.source === "electron" && s.taskType === "녹화"
      );

      if (electronicSessions.length > 0) {
        electronicSessions.forEach((session) => {
          const updatedElectronicSession = {
            ...session,
            endTime: now,
            duration: Math.floor(
              (now.getTime() - new Date(session.startTime).getTime()) /
                (1000 * 60)
            ),
            isActive: false,
            isRecording: false,
          };
          sessionStorageService.updateSession(updatedElectronicSession);
        });
      }

      // 저장 및 상태 업데이트
      sessionStorageService.addSession(newSession);
      setActiveSession(newSession);
      setElapsedTime(0);
      setIsRecording(newSession.isRecording);

      // 녹화 옵션이 켜져 있으면 녹화 시작
      if (
        newSession.isRecording &&
        electronSessionAdapter.isElectronEnvironment()
      ) {
        // 먼저 창 목록을 다시 가져옵니다
        electronSessionAdapter.getAvailableWindows().then((windows) => {
          if (windows.length > 0) {
            // 첫 번째 창을 기본으로 선택
            const firstWindow = windows[0];
            electronSessionAdapter.startCapture(
              firstWindow.id,
              firstWindow.name || ""
            );
          }
        });
      }

      loadTodaySessions();
      return newSession;
    },
    [activeSession, loadTodaySessions, stopSession]
  );

  // 세션 일시 정지
  const pauseSession = useCallback(() => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      isActive: false,
    };

    sessionStorageService.updateSession(updatedSession);
    setActiveSession(updatedSession);

    // 녹화 중이었다면 일시 정지
    if (isRecording && electronSessionAdapter.isElectronEnvironment()) {
      electronSessionAdapter.pauseCapture();
    }

    loadTodaySessions();
  }, [activeSession, isRecording, loadTodaySessions]);

  // 세션 재개
  const resumeSession = useCallback(() => {
    if (!activeSession) return;

    const updatedSession = {
      ...activeSession,
      isActive: true,
    };

    sessionStorageService.updateSession(updatedSession);
    setActiveSession(updatedSession);

    // 녹화 옵션이 켜져 있었다면 녹화 재개
    if (isRecording && electronSessionAdapter.isElectronEnvironment()) {
      electronSessionAdapter.resumeCapture();
    }

    loadTodaySessions();
  }, [activeSession, isRecording, loadTodaySessions]);

  return {
    activeSession,
    elapsedTime,
    isRecording,
    todaySessions,
    allSessions,
    userTaskTypes,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    addTaskType,
    loadTodaySessions,
    loadAllSessions,
  };
}
