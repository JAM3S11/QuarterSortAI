import React, { useEffect, useRef } from 'react';

interface CyberMatrixCanvasProps {
  opacity?: number;
}

export const CyberMatrixCanvas: React.FC<CyberMatrixCanvasProps> = ({ opacity = 0.85 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const chars = '0123456789ABCDEFQUARTER_SORT_AI_SECURITY_SCAN_SHA256_FINANCE_AUDIT_2026';
    const fontSize = 13;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      // Translucent black background for motion blur
      ctx.fillStyle = 'rgba(6, 11, 20, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#00FF66'; // Neon matrix green
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Make lead char brighter white/cyan
        if (Math.random() > 0.85) {
          ctx.fillStyle = '#00F0FF';
        } else {
          ctx.fillStyle = '#00FF66';
        }

        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none transition-opacity duration-500"
      style={{ opacity }}
    />
  );
};
