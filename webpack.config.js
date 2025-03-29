const path = require("path");
const webpack = require("webpack");

module.exports = {
  // 다른 webpack 설정들...
  resolve: {
    // 노드 모듈 폴리필 설정
    fallback: {
      fs: false,
      path: require.resolve("path-browserify"),
      os: require.resolve("os-browserify/browser"),
      electron: false,
      buffer: require.resolve("buffer/"),
      stream: require.resolve("stream-browserify"),
    },
  },
  // webpack 5에서 폴리필 관련 플러그인 설정
  plugins: [
    // webpack 5의 자동 폴리필 제거로 인한 전역 객체 제공
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ],
};
