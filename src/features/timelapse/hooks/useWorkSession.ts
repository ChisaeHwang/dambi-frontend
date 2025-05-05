import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { WorkSession } from "../../calendar/types";
import { electronSessionAdapter } from "../../calendar/services/ElectronSessionAdapter";
import { sessionManager } from "../../calendar/services/SessionManager";
import { formatDuration } from "../../../utils/timeUtils";

/**
 * 타임랩스 작업 세션 관리를 위한 훅
 *
 * 단일 책임: 타임랩스 관련 세션 상태 관리 및 UI 연동
 * SessionManager를 통해 세션 데이터 접근
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
    const { sessions } = sessionManager.getSessionsByDate(today, true);
    setTodaySessions(sessions);

    // 활성 세션 찾기
    const activeSessionData = sessionManager.getActiveSession();
    if (activeSessionData) {
      setActiveSession(activeSessionData);

      // 경과 시간 계산
      const start = new Date(activeSessionData.startTime).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000); // 초 단위로 변환
      setElapsedTime(elapsed);

      // 녹화 상태 확인
      setIsRecording(activeSessionData.isRecording || false);
    } else {
      setActiveSession(null);
      setElapsedTime(0);
      setIsRecording(false);
    }
  }, []);

  // 모든 세션 로드
  const loadAllSessions = useCallback(() => {
    const sessions = sessionManager.getAllSessions(true);
    setAllSessions(sessions);
  }, []);

  // 초기 로드 및 세션 정리
  useEffect(() => {
    // 이전에 비정상적으로 종료된 세션들을 정리
    sessionManager.cleanupIncompleteSessions();

    // 정상적인 세션 로드
    loadTodaySessions();
    loadAllSessions();

    // SessionManager의 변경 감지
    const removeListener = sessionManager.addChangeListener(() => {
      loadTodaySessions();
      loadAllSessions();
    });

    return () => {
      removeListener();
    };
  }, [loadTodaySessions, loadAllSessions]);

  // 활성 세션 타이머 효과
  useEffect(() => {
    if (!activeSession || !activeSession.isActive) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // 녹화 상태 확인 효과
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
        if (!recordingStatus.isRecording && isRecording && activeSession) {
          console.log("녹화 상태 불일치 감지: 상태 수정");

          // 세션 상태 업데이트
          const updatedSession = {
            ...activeSession,
            isRecording: false,
          };

          sessionManager.updateSession(updatedSession);
          setActiveSession(updatedSession);
          setIsRecording(false);
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

      // 새 세션 생성
      const newSession: WorkSession = {
        id: uuidv4(),
        date: today,
        duration: 0,
        ...sessionData,
      };

      // 활성 세션이 있으면 중지
      if (activeSession && activeSession.isActive) {
        // 직접 SessionManager 호출로 의존성 순환 문제 해결
        sessionManager.stopSession();

        // 상태 초기화 (stopSession 함수의 일부 로직 인라인으로 구현)
        setActiveSession(null);
        setElapsedTime(0);
        setIsRecording(false);
      }

      // 저장 및 타이머 시작
      const createdSession = sessionManager.startSession(
        newSession.title,
        newSession.taskType,
        newSession.source || "manual",
        newSession.isRecording || false
      );

      // 화면 상태 업데이트
      setActiveSession(createdSession);
      setElapsedTime(0);
      setIsRecording(createdSession.isRecording || false);

      // 세션 목록 갱신
      loadTodaySessions();

      return createdSession;
    },
    [activeSession, loadTodaySessions]
  );

  // 세션 종료
  const stopSession = useCallback(() => {
    if (!activeSession) return;

    // SessionManager를 통해 세션 종료
    sessionManager.stopSession();

    // 상태 초기화
    setActiveSession(null);
    setElapsedTime(0);
    setIsRecording(false);

    // 세션 목록 갱신
    loadTodaySessions();
    loadAllSessions();
  }, [activeSession, loadTodaySessions, loadAllSessions]);

  // 세션 일시 정지
  const pauseSession = useCallback(() => {
    if (!activeSession) return;

    // SessionManager를 통해 세션 일시 정지
    sessionManager.pauseSession();

    // 세션 업데이트 (UI 상태만 업데이트)
    const updatedSession = {
      ...activeSession,
      isActive: false,
    };
    setActiveSession(updatedSession);

    // 세션 목록 갱신
    loadTodaySessions();
  }, [activeSession, loadTodaySessions]);

  // 세션 재개
  const resumeSession = useCallback(() => {
    if (!activeSession) return;

    // SessionManager를 통해 세션 재개
    sessionManager.resumeSession();

    // 세션 업데이트 (UI 상태만 업데이트)
    const updatedSession = {
      ...activeSession,
      isActive: true,
    };
    setActiveSession(updatedSession);

    // 세션 목록 갱신
    loadTodaySessions();
  }, [activeSession, loadTodaySessions]);

  // 사람이 읽기 쉬운 형태의 경과 시간
  const formattedElapsedTime = formatDuration(elapsedTime);

  return {
    // 세션 상태
    activeSession,
    elapsedTime,
    formattedElapsedTime,
    isRecording,
    todaySessions,
    allSessions,
    userTaskTypes,

    // 액션
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    addTaskType,
    loadTodaySessions,
    loadAllSessions,
  };
}
