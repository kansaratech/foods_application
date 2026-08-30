import { FC } from "react";
import { Svg, Path } from "react-native-svg";

interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

/**
 * "Earnings" icon — a rising bar chart. Currency-neutral (the app is ₹, not $);
 * the old glyph drew a dollar sign in a circle.
 */
const CurrencyIcon: FC<IconProps> = ({
  width = 16,
  height = 16,
  color = "#000",
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h16M6 20V13M12 20V8M18 20V4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default CurrencyIcon;
