/**
 * 로컬 스토리지 관련 유틸리티 함수
 */

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  TIMELAPSE_OPTIONS: "timelapseOptions",
  SELECTED_WINDOW_ID: "selectedWindowId",
  ACTIVE_WINDOWS: "activeWindows",
  SAVE_PATH: "timelapse_save_path",
  THUMBNAIL_PREFIX: "window_thumbnail_",
};

/**
 * 로컬 스토리지에 객체를 저장
 * @param key 로컬 스토리지 키
 * @param value 저장할 값
 */
export const saveToLocalStorage = <T>(key: string, value: T): void => {
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
export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
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
export const loadStringFromLocalStorage = (
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
export const removeFromLocalStorage = (key: string): void => {
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
    console.warn("썸네일 데이터 저장 실패 (데이터 크기가 클 수 있음):", error);
  }
};

/**
 * 썸네일 데이터를 로컬 스토리지에서 불러오기
 * @param windowId 창 ID
 * @returns 썸네일 데이터 URL 또는 null
 */
export const loadThumbnail = (windowId: string): string | null => {
  return localStorage.getItem(`${STORAGE_KEYS.THUMBNAIL_PREFIX}${windowId}`);
};

/**
 * 썸네일 데이터를 로컬 스토리지에서 삭제
 * @param windowId 창 ID
 */
export const removeThumbnail = (windowId: string): void => {
  localStorage.removeItem(`${STORAGE_KEYS.THUMBNAIL_PREFIX}${windowId}`);
};
