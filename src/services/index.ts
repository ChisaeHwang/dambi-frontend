/**
 * 서비스 모듈 내보내기
 */

// Electron 서비스
export {
  isElectronAvailable,
  windowService,
  captureService,
  timelapseService,
  fileService,
} from "./electronService";

// 스토리지 서비스
export {
  saveItem,
  getItem,
  getString,
  removeItem,
  saveThumbnail,
  getThumbnail,
  removeThumbnail,
  timelapseStorageService,
  windowStorageService,
} from "./storageService";
