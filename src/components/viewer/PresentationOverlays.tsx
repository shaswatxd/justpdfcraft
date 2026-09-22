import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export const PresentationOverlays: React.FC<{
  containerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ containerRef }) => {
  const {
    isLaserPointerActive,
    isSpotlightActive,
    toggleLaserPointer,
    toggleSpotlight,
    addToast,
  } = useUIStore();

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Global Keyboard Shortcuts (L = Laser, S = Spotlight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleLaserPointer();
          const nextState = !isLaserPointerActive;
          addToast({
            type: 'info',
            title: nextState ? 'Laser Pointer Activated' : 'Laser Pointer Off',
            message: nextState ? 'Glowing laser pointer is active. Press L to toggle off.' : 'Standard cursor restored.',
            durationMs: 2000,
          });
        }
      }

      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleSpotlight();
          const nextState = !isSpotlightActive;
          addToast({
            type: 'info',
            title: nextState ? 'Spotlight Focus Activated' : 'Spotlight Focus Off',
            message: nextState ? 'Reading focus beam is active. Press S to toggle off.' : 'Full document lighting restored.',
            durationMs: 2000,
          });
        }
      }

      if (e.key === 'Escape') {
        if (isLaserPointerActive) toggleLaserPointer();
        if (isSpotlightActive) toggleSpotlight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLaserPointerActive, isSpotlightActive, toggleLaserPointer, toggleSpotlight, addToast]);

  // Pointer position tracking relative to the viewport container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePos({ x, y });

      if (isLaserPointerActive) {
        trailRef.current.push({ x, y, time: performance.now() });
      }
    };

    const handlePointerLeave = () => {
      setMousePos(null);
      trailRef.current = [];
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [containerRef, isLaserPointerActive]);

  // Laser Pointer Smooth Particle Trail Render Loop
  useEffect(() => {
    if (!isLaserPointerActive) {
      trailRef.current = [];
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      // Clean up points older than 600ms
      const maxAge = 600;
      trailRef.current = trailRef.current.filter((p) => now - p.time <= maxAge);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Laser Trail
      const trail = trailRef.current;
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const age = now - p2.time;
          const progress = 1 - age / maxAge; // 1 = newest, 0 = oldest

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 30, 80, ${progress * 0.85})`;
          ctx.lineWidth = Math.max(1, progress * 4.5);
          ctx.lineCap = 'round';
          ctx.shadowBlur = 10 * progress;
          ctx.shadowColor = '#FF0055';
          ctx.stroke();
        }
      }

      // Draw Glowing Head Dot
      if (mousePos) {
        // Outer halo
        const grad = ctx.createRadialGradient(mousePos.x, mousePos.y, 0, mousePos.x, mousePos.y, 16);
        grad.addColorStop(0, 'rgba(255, 40, 90, 0.95)');
        grad.addColorStop(0.35, 'rgba(255, 20, 70, 0.6)');
        grad.addColorStop(1, 'rgba(255, 0, 50, 0)');

        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#FF0055';
        ctx.fill();

        // Hot center core
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#FFFFFF';
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLaserPointerActive, mousePos]);

  // Sync canvas dimensions with viewport container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width;
        canvas.height = entry.contentRect.height;
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  if (!isLaserPointerActive && !isSpotlightActive) {
    return null;
  }

  return (
    <>
      {/* Spotlight Reading Focus Dimmer Overlay */}
      {isSpotlightActive && (
        <div
          className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-150 select-none"
          style={{
            background: mousePos
              ? `radial-gradient(circle 140px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent 70%, rgba(0, 0, 0, 0.78) 100%)`
              : 'rgba(0, 0, 0, 0.78)',
          }}
        />
      )}

      {/* Laser Pointer Glowing Canvas Overlay */}
      {isLaserPointerActive && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-40 pointer-events-none select-none block"
        />
      )}
    </>
  );
};
