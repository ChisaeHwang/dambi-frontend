import React from "react";

interface AppIconProps {
  name: string;
}

const AppIcon: React.FC<AppIconProps> = ({ name }) => {
  // 앱 이름의 첫 글자를 아이콘으로 사용하고 색상 생성
  const getLetter = (appName: string) => {
    return appName.charAt(0).toUpperCase();
  };

  // 앱 이름에서 해시 기반으로 고유한 색상 생성 (안정적인 색상)
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // 색상 범위 제한 (너무 어둡거나 밝지 않게)
    const h = hash % 360;
    return `hsl(${h}, 70%, 60%)`; // HSL 색상 사용하여 적절한 밝기 유지
  };

  const letter = getLetter(name);
  const color = getColorFromName(name);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: color,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
        fontWeight: "bold",
      }}
    >
      {letter}
    </div>
  );
};

export default AppIcon;
