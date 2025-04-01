const path = require("path");
const fs = require("fs");
const os = require("os");

// 애플리케이션 디렉토리 생성
function createAppDirectories() {
  const appDataDir = path.join(os.homedir(), "Documents", "담비");
  const capturesDir = path.join(appDataDir, "captures");
  const timelapsesDir = path.join(appDataDir, "timelapses");

  // 디렉토리가 존재하지 않으면 생성
  [appDataDir, capturesDir, timelapsesDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 앱 기본 디렉토리 경로 반환
function getAppDirectories() {
  const appDataDir = path.join(os.homedir(), "Documents", "담비");
  const capturesDir = path.join(appDataDir, "captures");
  const timelapsesDir = path.join(appDataDir, "timelapses");

  return {
    appDataDir,
    capturesDir,
    timelapsesDir,
  };
}

module.exports = {
  createAppDirectories,
  getAppDirectories,
};
