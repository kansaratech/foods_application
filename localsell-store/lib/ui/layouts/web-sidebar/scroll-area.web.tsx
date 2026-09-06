import PerfectScrollbar from "perfect-scrollbar";
import { CSSProperties, ReactNode, useEffect, useRef } from "react";

// perfect-scrollbar's own stylesheet, inlined once (avoids a node_modules CSS
// import going through the Metro web pipeline).
const PS_CSS =
  ".ps{overflow:hidden!important;overflow-anchor:none;-ms-overflow-style:none;touch-action:auto}" +
  ".ps__rail-x,.ps__rail-y{display:none;opacity:0;transition:opacity .2s linear;position:absolute}" +
  ".ps__rail-x{height:15px;bottom:0}.ps__rail-y{width:15px;right:0}" +
  ".ps--active-x>.ps__rail-x,.ps--active-y>.ps__rail-y{display:block;background:transparent}" +
  ".ps:hover>.ps__rail-x,.ps:hover>.ps__rail-y,.ps--focus>.ps__rail-x,.ps--focus>.ps__rail-y,.ps--scrolling-x>.ps__rail-x,.ps--scrolling-y>.ps__rail-y{opacity:.6}" +
  ".ps__thumb-x,.ps__thumb-y{background:#aaa;border-radius:6px;position:absolute;transition:background .2s linear,width .2s ease,height .2s ease}" +
  ".ps__thumb-x{height:6px;bottom:2px}.ps__thumb-y{width:6px;right:2px}";

if (typeof document !== "undefined" && !document.getElementById("ls-ps-css")) {
  const tag = document.createElement("style");
  tag.id = "ls-ps-css";
  tag.textContent = PS_CSS;
  document.head.appendChild(tag);
}

/**
 * Web scroll container backed by perfect-scrollbar — a thin, unobtrusive
 * overlay scrollbar that looks the same in every browser. The native build
 * uses `scroll-area.tsx` (a plain ScrollView) instead.
 */
export default function ScrollArea({
  children,
  contentStyle,
  deps = [],
}: {
  children: ReactNode;
  contentStyle?: CSSProperties;
  deps?: unknown[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const ps = useRef<PerfectScrollbar | null>(null);

  useEffect(() => {
    if (!box.current) return;
    ps.current = new PerfectScrollbar(box.current, {
      suppressScrollX: true,
      wheelPropagation: false,
    });
    return () => {
      ps.current?.destroy();
      ps.current = null;
    };
  }, []);

  useEffect(() => {
    ps.current?.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <div
      ref={box}
      className="ls-scrollarea"
      style={{ position: "relative", flex: 1, overflow: "auto", ...contentStyle }}
    >
      {children}
    </div>
  );
}
