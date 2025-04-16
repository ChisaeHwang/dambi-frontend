/**
 * 로컬 스토리지 관련 서비스
 * - 로컬 스토리지 접근을 추상화하여 일관된 인터페이스 제공
 * - 향후 서버 스토리지로 전환 시 이 인터페이스만 변경하면 되도록 설계
 */
import { STORAGE_KEYS } from "../constants/storage";

/**
 * 로컬 스토리지에 객체를 저장
 * @param key 로컬 스토리지 키
 * @param value 저장할 값
 */
export const saveItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`로컬 스토리지 저장 실패 (${key}):`, error);
  }
};

/**
 * 로컬 스토리지에서 객체 불러오기
 * @param key 로컬 스토리지 키
 * @param defaultValue 기본값
 * @returns 저장된 값 또는 기본값
 */
export const getItem = <T>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (error) {
    console.error(`로컬 스토리지 불러오기 실패 (${key}):`, error);
    return defaultValue;
  }
};

/**
 * 로컬 스토리지에서 단순 문자열 불러오기
 * @param key 로컬 스토리지 키
 * @param defaultValue 기본값
 * @returns 저장된 문자열 또는 기본값
 */
export const getString = (
  key: string,
  defaultValue: string | null = ""
): string | null => {
  const value = localStorage.getItem(key);
  return value !== null ? value : defaultValue;
};

/**
 * 로컬 스토리지 항목 삭제
 * @param key 로컬 스토리지 키
 */
export const removeItem = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * 썸네일 데이터를 로컬 스토리지에 저장
 * @param windowId 창 ID
 * @param thumbnailData 썸네일 데이터 URL
 */
export const saveThumbnail = (
  windowId: string,
  thumbnailData: string
): void => {
  try {
    localStorage.setItem(
      `${STORAGE_KEYS.THUMBNAIL_PREFIX}${windowId}`,
      thumbnailData
    );
  } catch (error) {
    console.warn("썸네일 데이터 저장 실패 (데이터 크기가 너무 큼):", error);
  }
};

/**
 * 썸네일 데이터를 로컬 스토리지에서 불러오기
 * @param windowId 창 ID
 * @returns 썸네일 데이터 URL 또는 null
 */
export const getThumbnail = (windowId: string): string | null => {
  return localStorage.getItem(`${STORAGE_KEYS.THUMBNAIL_PREFIX}${windowId}`);
};

/**
 * 썸네일 데이터를 로컬 스토리지에서 삭제
 * @param windowId 창 ID
 */
export const removeThumbnail = (windowId: string): void => {
  localStorage.removeItem(`${STORAGE_KEYS.THUMBNAIL_PREFIX}${windowId}`);
};

// 특정 기능에 대한 스토리지 서비스
export const timelapseStorageService = {
  /**
   * 타임랩스 옵션 저장
   */
  saveOptions: <T>(options: T): void => {
    saveItem(STORAGE_KEYS.TIMELAPSE_OPTIONS, options);
  },

  /**
   * 타임랩스 옵션 불러오기
   */
  getOptions: <T>(defaultOptions: T): T => {
    return getItem<T>(STORAGE_KEYS.TIMELAPSE_OPTIONS, defaultOptions);
  },

  /**
   * 타임랩스 저장 경로 설정
   */
  savePath: (path: string): void => {
    saveItem(STORAGE_KEYS.SAVE_PATH, path);
  },

  /**
   * 타임랩스 저장 경로 가져오기
   */
  getPath: (): string | null => {
    const path = getString(STORAGE_KEYS.SAVE_PATH, null);
    if (path) {
      // 경로에 따옴표가 포함된 경우 제거
      return path.replace(/^["']|["']$/g, "");
    }
    return path;
  },
};

// 윈도우 설정 관련 스토리지 서비스
export const windowStorageService = {
  /**
   * 선택된 창 ID 저장
   */
  saveSelectedWindowId: (windowId: string): void => {
    saveItem(STORAGE_KEYS.SELECTED_WINDOW_ID, windowId);
  },

  /**
   * 선택된 창 ID 불러오기
   */
  getSelectedWindowId: (): string => {
    return getString(STORAGE_KEYS.SELECTED_WINDOW_ID, "") || "";
  },

  /**
   * 활성 창 목록 저장
   */
  saveActiveWindows: <T>(windows: T[]): void => {
    saveItem(STORAGE_KEYS.ACTIVE_WINDOWS, windows);
  },

  /**
   * 활성 창 목록 불러오기
   */
  getActiveWindows: <T>(): T[] => {
    return getItem<T[]>(STORAGE_KEYS.ACTIVE_WINDOWS, [] as unknown as T[]);
  },
};
