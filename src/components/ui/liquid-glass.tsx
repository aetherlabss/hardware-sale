import React, { useRef, useCallback } from 'react';

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds the hover-lift + brighter specular treatment for clickable surfaces. */
  interactive?: boolean;
  /** Adds a slow travelling sheen (hero / feature panels). */
  sheen?: boolean;
}

/**
 * iOS 26 "Liquid Glass" surface. A translucent material whose specular highlight
 * tracks the pointer: we write the cursor position into the --lg-x / --lg-y
 * custom properties (rAF-throttled) and the CSS in index.css renders the glow.
 * Falls back gracefully — with no pointer the highlight just sits at the top.
 */
export const LiquidGlass = React.forwardRef<HTMLDivElement, LiquidGlassProps>(
  ({ interactive = false, sheen = false, className = '', style, children, onMouseMove, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLDivElement | null>(null);
    const frame = useRef<number | null>(null);

    const setRef = useCallback(
      (node: HTMLDivElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [forwardedRef],
    );

    const handleMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseMove?.(e);
        if (!interactive) return;
        const el = innerRef.current;
        if (!el) return;
        const { clientX, clientY } = e;
        if (frame.current) return; // coalesce to one update per frame
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          const rect = el.getBoundingClientRect();
          const x = ((clientX - rect.left) / rect.width) * 100;
          const y = ((clientY - rect.top) / rect.height) * 100;
          el.style.setProperty('--lg-x', `${x}%`);
          el.style.setProperty('--lg-y', `${y}%`);
        });
      },
      [interactive, onMouseMove],
    );

    return (
      <div
        ref={setRef}
        onMouseMove={handleMove}
        className={`liquid-glass${interactive ? ' liquid-glass-interactive' : ''}${sheen ? ' liquid-sheen' : ''} ${className}`}
        style={style}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
LiquidGlass.displayName = 'LiquidGlass';
