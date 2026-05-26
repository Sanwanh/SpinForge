'use client';

import { useRef, useEffect, useState } from 'react';

interface StadiumCanvasProps {
  width?: number;
  height?: number;
  playerAPos?: { x: number; y: number };
  playerBPos?: { x: number; y: number };
  playerAAM?: number;
  playerBAM?: number;
  railZones?: number[];
}

/**
 * PixiJS canvas for the battle arena.
 * Dynamically imported (no SSR) to avoid window reference issues.
 */
export function StadiumCanvas({
  width = 600,
  height = 600,
  playerAPos = { x: 200, y: 300 },
  playerBPos = { x: 400, y: 300 },
  playerAAM = 80,
  playerBAM = 80,
  railZones = [0, 1, 2, 3],
}: StadiumCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const appRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || loaded) return;

    let cancelled = false;

    async function initPixi() {
      const PIXI = await import('pixi.js');

      if (cancelled || !containerRef.current) return;

      const app = new PIXI.Application({
        width,
        height,
        backgroundColor: 0x030712,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current.appendChild(app.view as HTMLCanvasElement);
      appRef.current = app;

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.42;

      // Stadium bowl
      const bowl = new PIXI.Graphics();
      bowl.lineStyle(2, 0x374151);
      bowl.beginFill(0x111827, 0.5);
      bowl.drawCircle(cx, cy, radius);
      bowl.endFill();

      // Zone rings
      bowl.lineStyle(1, 0x1F2937);
      bowl.drawCircle(cx, cy, radius * 0.33); // Center
      bowl.drawCircle(cx, cy, radius * 0.66); // Mid
      app.stage.addChild(bowl);

      // X-rail lines
      const rail = new PIXI.Graphics();
      rail.lineStyle(2, 0x3B82F6, 0.4);
      const railLen = radius * 0.95;
      // Diagonal 1
      rail.moveTo(cx - railLen * 0.7, cy - railLen * 0.7);
      rail.lineTo(cx + railLen * 0.7, cy + railLen * 0.7);
      // Diagonal 2
      rail.moveTo(cx + railLen * 0.7, cy - railLen * 0.7);
      rail.lineTo(cx - railLen * 0.7, cy + railLen * 0.7);
      app.stage.addChild(rail);

      // Zone labels
      const zoneLabels = ['CENTER', 'MID', 'WALL', 'RAIL'];
      const zonePositions = [
        { x: cx, y: cy - 12 },
        { x: cx, y: cy - radius * 0.5 },
        { x: cx, y: cy - radius * 0.82 },
        { x: cx + radius * 0.65, y: cy - radius * 0.65 },
      ];
      zoneLabels.forEach((label, i) => {
        const text = new PIXI.Text(label, {
          fontFamily: 'monospace',
          fontSize: 9,
          fill: 0x4B5563,
          align: 'center',
        });
        text.anchor.set(0.5);
        text.position.set(zonePositions[i].x, zonePositions[i].y);
        app.stage.addChild(text);
      });

      // Spinning tops
      function drawTop(x: number, y: number, color: number, am: number) {
        const g = new PIXI.Graphics();
        const topRadius = 14 + (am / 100) * 8;
        g.lineStyle(2, color, 0.8);
        g.beginFill(color, 0.3);
        g.drawCircle(0, 0, topRadius);
        g.endFill();
        // Inner glow
        g.lineStyle(0);
        g.beginFill(color, 0.6);
        g.drawCircle(0, 0, topRadius * 0.4);
        g.endFill();
        g.position.set(x, y);
        return g;
      }

      const topA = drawTop(playerAPos.x, playerAPos.y, 0x3B82F6, playerAAM);
      const topB = drawTop(playerBPos.x, playerBPos.y, 0xF97316, playerBAM);
      app.stage.addChild(topA);
      app.stage.addChild(topB);

      // Animate rotation
      let tick = 0;
      app.ticker.add(() => {
        tick += 0.05;
        topA.rotation += 0.1 * (playerAAM / 100);
        topB.rotation += 0.1 * (playerBAM / 100);
        // Pulse glow effect
        topA.alpha = 0.85 + Math.sin(tick) * 0.15;
        topB.alpha = 0.85 + Math.sin(tick + 1) * 0.15;
      });

      setLoaded(true);
    }

    initPixi();

    return () => {
      cancelled = true;
      if (appRef.current) {
        (appRef.current as { destroy: (b: boolean) => void }).destroy(true);
        appRef.current = null;
      }
    };
  }, [width, height, playerAPos, playerBPos, playerAAM, playerBAM, railZones, loaded]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-gray-800"
      style={{ width, height }}
      role="img"
      aria-label="Battle stadium arena"
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-raised">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        </div>
      )}
    </div>
  );
}
