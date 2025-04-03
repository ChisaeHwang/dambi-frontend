import React from "react";

export interface TimelapseTimerProps {
  formattedTime: string;
}

const TimelapseTimer: React.FC<TimelapseTimerProps> = ({ formattedTime }) => {
  return (
    <div className="flex justify-center items-center my-5 flex-grow">
      <div className="p-10 rounded-lg bg-[var(--bg-tertiary)] flex justify-center items-center w-3/5 max-w-[400px] min-h-[120px] shadow-md">
        <span className="text-5xl font-mono text-white font-semibold tracking-wider">
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default TimelapseTimer;
