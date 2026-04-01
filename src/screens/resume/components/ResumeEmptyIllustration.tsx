import React from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import { colors } from "../../../theme/color";

export function ResumeEmptyIllustration() {
  return (
    <Svg width={160} height={180} viewBox="0 0 80 100">
      <Defs>
        <SvgLinearGradient id="docGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.surfaceAlt} />
          <Stop offset="100%" stopColor={colors.surface} />
        </SvgLinearGradient>
        <Filter id="blur">
          <FeGaussianBlur stdDeviation={3} />
        </Filter>
      </Defs>
      <Ellipse
        cx={40}
        cy={88}
        rx={26}
        ry={10}
        fill={colors.primary}
        opacity={0.2}
        filter="url(#blur)"
      />
      <Rect
        x={10}
        y={14}
        width={60}
        height={72}
        rx={12}
        fill="url(#docGrad)"
        stroke={colors.primary}
        strokeOpacity={0.5}
        strokeWidth={1.2}
      />
      <Rect
        x={20}
        y={38}
        width={48}
        height={3}
        rx={2}
        fill={colors.border}
        opacity={0.9}
      />
      <Rect
        x={24}
        y={52}
        width={36}
        height={3}
        rx={2}
        fill={colors.border}
        opacity={0.85}
      />
      <Rect
        x={22}
        y={66}
        width={42}
        height={3}
        rx={2}
        fill={colors.border}
        opacity={0.8}
      />
      <Circle
        cx={62}
        cy={24}
        r={7}
        fill="rgba(108,99,255,0.12)"
        stroke={colors.primary}
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      <Path
        d="M62 18 L63.4 22 L68 23 L63.4 24 L62 29 L60.6 24 L56 23 L60.6 22 Z"
        fill={colors.primary}
      />
    </Svg>
  );
}
