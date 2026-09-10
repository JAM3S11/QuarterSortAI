import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  /** Current sidebar width in px */
  width: number;
  /** Called continuously during drag with new width */
  onResize: (width: number) => void;
  /** Called when a drag starts */
  onResizeStart?: () => void;
  /** Called when a drag ends */
  onResizeEnd?: () => void;
  /** Min width in px (default 64) */
  minWidth?: number;
  /** Max width in px (default 400) */
  maxWidth?: number;
}

const MIN_DEFAULT = 64;
const MAX_DEFAULT = 400;

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  width,
  onResize,
  onResizeStart,
  onResizeEnd,
  minWidth = MIN_DEFAULT,
  maxWidth = MAX_DEFAULT,
}) => {
  const startX = useRef(0);
  const startW = useRef(0);
  const [dragging, setDragging] = useState(false);

  const clamp = (v: number) => Math.max(minWidth, Math.min(maxWidth, Math.round(v)));

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startX.current = e.clientX;
      startW.current = width;
      setDragging(true);
      onResizeStart?.();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [width, onResizeStart],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientX - startX.current;
      onResize(clamp(startW.current + delta));
    },
    [dragging, onResize, minWidth, maxWidth],
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      setDragging(false);
      onResizeEnd?.();
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [dragging, onResizeEnd]);

  const onDoubleClick = useCallback(() => {
    onResize(clamp(256));
  }, [onResize, minWidth, maxWidth]);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      title="Drag to resize sidebar — double-click to reset"
      className={`relative z-50 hidden lg:flex shrink-0 w-1.5 cursor-col-resize group transition-colors ${
        dragging
          ? 'bg-emerald-500/40'
          : 'bg-transparent hover:bg-emerald-500/20'
      }`}
    >
      <div
        className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors ${
          dragging ? 'bg-emerald-400' : 'bg-transparent group-hover:bg-emerald-500/50'
        }`}
      />
      <div
        className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 rounded bg-slate-600 dark:bg-slate-500 transition-opacity ${
          dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{ width: 2, height: 24 }}
      />
    </div>
  );
};
