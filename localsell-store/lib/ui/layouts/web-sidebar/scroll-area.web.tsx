import { CSSProperties, ReactNode } from "react";

/** Browser scrolling supports wheel, touch, keyboard and content resizing. */
export default function ScrollArea({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: CSSProperties;
  deps?: unknown[];
}) {
  return (
    <div
      className="ls-scrollarea"
      tabIndex={0}
      role="region"
      aria-label="Store navigation"
      style={{
        ...contentStyle,
        position: "relative",
        flex: "1 1 0%",
        minHeight: 0,
        minWidth: 0,
        overflowY: "auto",
        overflowX: "hidden",
        overscrollBehaviorY: "contain",
      }}
    >
      {children}
    </div>
  );
}
