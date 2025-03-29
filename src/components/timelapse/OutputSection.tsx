import React from "react";

interface OutputSectionProps {
  outputPath: string;
  outputFormat: "mp4" | "gif";
}

const OutputSection: React.FC<OutputSectionProps> = ({
  outputPath,
  outputFormat,
}) => {
  return (
    <div className="card">
      <h3 className="section-title">생성된 타임랩스</h3>
      <p className="mb-4 text-gray-600 break-all">파일 위치: {outputPath}</p>
      {outputFormat === "mp4" && (
        <video
          controls
          src={`file://${outputPath}`}
          className="w-full rounded-md shadow-md"
        />
      )}
      {outputFormat === "gif" && (
        <img
          src={`file://${outputPath}`}
          className="w-full rounded-md shadow-md"
          alt="Generated timelapse"
        />
      )}
    </div>
  );
};

export default OutputSection;
