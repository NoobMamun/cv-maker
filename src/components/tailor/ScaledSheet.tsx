"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

const A4_WIDTH_PX = 794; // 210mm at 96dpi

/** Scales a full-size A4 sheet down to fit its container while keeping layout identical. */
export function ScaledSheet({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(1123);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const ro = new ResizeObserver(() => {
      const s = Math.min(1, o.clientWidth / A4_WIDTH_PX);
      setScale(s);
      setHeight(i.offsetHeight * s);
    });
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="w-full overflow-hidden rounded-lg shadow-lg ring-1 ring-slate-200" style={{ height }}>
      <div ref={inner} style={{ width: A4_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}
