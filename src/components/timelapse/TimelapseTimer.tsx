import React from "react";

export interface TimelapseTimerProps {
  formattedTime: string;
}

const TimelapseTimer: React.FC<TimelapseTimerProps> = ({ formattedTime }) => {
  return (
    <div className="flex justify-center items-center my-5 flex-grow">
      <div className="p-8 rounded-lg bg-[var(--bg-tertiary)] flex justify-center items-center w-[300px] h-[120px] shadow-md">
        <span className="text-4xl font-mono text-white font-semibold tracking-[0.2em]">
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default TimelapseTimer;
