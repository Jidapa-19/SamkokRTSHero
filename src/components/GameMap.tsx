import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Compass, Crosshair, RotateCcw } from 'lucide-react';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MOUNTAIN_RANGES,
  RIVERS,
  STRATEGIC_PASSES,
} from '../game/mapData';
import {
  Army,
  City,
  CombatEffect,
  CommandMode,
  Faction,
  FactionId,
  Language,
} from '../game/types';

interface GameMapProps {
  cities: City[];
  armies: Army[];
  factions: Record<FactionId, Faction>;
  selectedCityId: string | null;
  selectedArmyId: string | null;
  commandMode: CommandMode;
  combatEffects: CombatEffect[];
  lang: Language;
  onSelectCity: (cityId: string) => void;
  onSelectArmy: (armyId: string) => void;
  onCancelCommandMode: () => void;
}

interface CameraState {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.38;
const MAX_SCALE = 2.25;

/**
 * Renders the static antique silk-parchment cartographic layer
 * (parchment gradient, topographical washes, grid lines, borders, rivers,
 * mountain ranges, and strategic passes) once per language switch onto an
 * offscreen canvas so the 60fps loop only blits a single texture before
 * drawing dynamic roads, cities, armies, and combat effects.
 */
function buildStaticMapCanvas(lang: Language): HTMLCanvasElement {
  const offscreen = document.createElement('canvas');
  offscreen.width = MAP_WIDTH;
  offscreen.height = MAP_HEIGHT;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return offscreen;

  // 1. Antique Silk-Parchment Base Map Surface
  const parchmentGrad = ctx.createRadialGradient(
    MAP_WIDTH * 0.5,
    MAP_HEIGHT * 0.48,
    100,
    MAP_WIDTH * 0.5,
    MAP_HEIGHT * 0.5,
    MAP_WIDTH * 0.75
  );
  parchmentGrad.addColorStop(0, '#E2D5BA');
  parchmentGrad.addColorStop(0.65, '#D2C19E');
  parchmentGrad.addColorStop(1, '#B8A27A');

  ctx.fillStyle = parchmentGrad;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Subtle regional topographical washes
  ctx.fillStyle = 'rgba(138, 115, 78, 0.12)';
  ctx.beginPath();
  ctx.ellipse(350, 600, 320, 290, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(120, 145, 115, 0.1)';
  ctx.beginPath();
  ctx.ellipse(1150, 680, 360, 240, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Subtle Imperial Cartographic Grid Lines
  ctx.strokeStyle = 'rgba(74, 59, 40, 0.11)';
  ctx.lineWidth = 1;
  const gridStep = 160;
  for (let gx = gridStep; gx < MAP_WIDTH; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 24);
    ctx.lineTo(gx, MAP_HEIGHT - 24);
    ctx.stroke();
  }
  for (let gy = gridStep; gy < MAP_HEIGHT; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(24, gy);
    ctx.lineTo(MAP_WIDTH - 24, gy);
    ctx.stroke();
  }

  // Map Ornamental Double Border Frame
  ctx.strokeStyle = '#4A3B28';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, MAP_WIDTH - 24, MAP_HEIGHT - 24);
  ctx.strokeStyle = '#6E583D';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, MAP_WIDTH - 44, MAP_HEIGHT - 44);

  // 2. Rivers (Yellow River, Yangtze River, Han River)
  for (const river of RIVERS) {
    if (river.points.length < 2) continue;

    ctx.beginPath();
    ctx.moveTo(river.points[0].x, river.points[0].y);
    for (let i = 1; i < river.points.length - 1; i++) {
      const xc = (river.points[i].x + river.points[i + 1].x) / 2;
      const yc = (river.points[i].y + river.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(river.points[i].x, river.points[i].y, xc, yc);
    }
    const lastPt = river.points[river.points.length - 1];
    ctx.lineTo(lastPt.x, lastPt.y);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(62, 92, 108, 0.35)';
    ctx.lineWidth = river.width + 8;
    ctx.stroke();

    ctx.strokeStyle = '#4C7A8C';
    ctx.lineWidth = river.width;
    ctx.stroke();

    ctx.strokeStyle = '#7FA9B8';
    ctx.lineWidth = Math.max(2, river.width * 0.35);
    ctx.stroke();

    const midPt = river.points[Math.floor(river.points.length / 2)];
    ctx.save();
    ctx.font = 'italic 600 13px "Cinzel", "Noto Serif Thai", serif';
    ctx.fillStyle = '#2C4C59';
    ctx.textAlign = 'center';
    ctx.fillText(river.name[lang], midPt.x, midPt.y - river.width - 4);
    ctx.restore();
  }

  // 3. Mountain Ranges (Ink-wash peaks)
  for (const range of MOUNTAIN_RANGES) {
    for (const peak of range.peaks) {
      const w = 48 * peak.scale;
      const h = peak.height;

      ctx.fillStyle = 'rgba(72, 60, 46, 0.22)';
      ctx.beginPath();
      ctx.ellipse(peak.x, peak.y + 6, w * 0.9, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#594A38';
      ctx.beginPath();
      ctx.moveTo(peak.x - w, peak.y);
      ctx.lineTo(peak.x, peak.y - h);
      ctx.lineTo(peak.x + w * 0.15, peak.y + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#7D6A52';
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y - h);
      ctx.lineTo(peak.x + w, peak.y);
      ctx.lineTo(peak.x + w * 0.15, peak.y + 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#33291F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(peak.x - w, peak.y);
      ctx.lineTo(peak.x, peak.y - h);
      ctx.lineTo(peak.x + w, peak.y);
      ctx.stroke();
    }

    const firstPeak = range.peaks[0];
    if (firstPeak) {
      ctx.font = '600 11px "Cinzel", "Noto Serif Thai", serif';
      ctx.fillStyle = '#4A3C2C';
      ctx.textAlign = 'center';
      ctx.fillText(range.name[lang], firstPeak.x + 40, firstPeak.y + 22);
    }
  }

  // 4. Strategic Passes & Fortifications
  for (const pass of STRATEGIC_PASSES) {
    ctx.save();
    ctx.translate(pass.position.x, pass.position.y);
    ctx.rotate(pass.rotation);

    ctx.fillStyle = '#5C4D3C';
    ctx.strokeStyle = '#2B231A';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-16, -6, 32, 12);
    ctx.strokeRect(-16, -6, 32, 12);

    for (let bx = -14; bx <= 10; bx += 8) {
      ctx.fillRect(bx, -10, 5, 4);
    }
    ctx.restore();

    ctx.font = '500 10px "Plus Jakarta Sans", "Noto Sans Thai", sans-serif';
    ctx.fillStyle = '#4A3C2C';
    ctx.textAlign = 'center';
    ctx.fillText(pass.name[lang], pass.position.x, pass.position.y + 19);
  }

  return offscreen;
}

export const GameMap: React.FC<GameMapProps> = ({
  cities,
  armies,
  factions,
  selectedCityId,
  selectedArmyId,
  commandMode,
  combatEffects,
  lang,
  onSelectCity,
  onSelectArmy,
  onCancelCommandMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cached viewport dimensions updated via ResizeObserver to avoid layout thrashing in rAF
  const viewSizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 1280,
    height: 800,
    dpr: 1,
  });

  // Cached offscreen static map layer
  const staticMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticMapLangRef = useRef<Language | null>(null);

  // Reduced motion preference ref
  const prefersReducedMotionRef = useRef<boolean>(false);

  // Store latest props in refs so the 60fps requestAnimationFrame loop never recreates
  const stateRef = useRef({
    cities,
    armies,
    factions,
    selectedCityId,
    selectedArmyId,
    commandMode,
    combatEffects,
    lang,
  });

  useEffect(() => {
    stateRef.current = {
      cities,
      armies,
      factions,
      selectedCityId,
      selectedArmyId,
      commandMode,
      combatEffects,
      lang,
    };
  }, [
    cities,
    armies,
    factions,
    selectedCityId,
    selectedArmyId,
    commandMode,
    combatEffects,
    lang,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const cameraRef = useRef<CameraState>({
    x: 0,
    y: 0,
    scale: 0.85,
  });

  const [zoomPercent, setZoomPercent] = useState<number>(85);
  const hoveredItemRef = useRef<{ type: 'city' | 'army'; id: string } | null>(
    null
  );

  // Unified Pointer Event tracking for single-finger pan, two-finger pinch zoom, and tap selection
  const activePointersRef = useRef<
    Map<number, { x: number; y: number; pointerType: string }>
  >(new Map());
  const maxPointersInGestureRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedDistanceRef = useRef<number>(0);
  const pinchDistanceRef = useRef<number | null>(null);
  const keysHeldRef = useRef<Set<string>>(new Set());

  const clampCamera = useCallback(
    (
      x: number,
      y: number,
      scale: number,
      viewW: number,
      viewH: number
    ): CameraState => {
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
      const mapScaledW = MAP_WIDTH * clampedScale;
      const mapScaledH = MAP_HEIGHT * clampedScale;

      const marginX = Math.max(100, viewW * 0.28);
      const marginY = Math.max(100, viewH * 0.28);

      const minX = viewW - mapScaledW - marginX;
      const maxX = marginX;
      const minY = viewH - mapScaledH - marginY;
      const maxY = marginY;

      return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
        scale: clampedScale,
      };
    },
    []
  );

  const centerMap = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const isNarrowMobile = rect.width < 640;
    const minFitScale = isNarrowMobile ? 0.42 : 0.58;
    const fitScale = Math.min(
      0.95,
      Math.max(
        minFitScale,
        Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT) *
          (isNarrowMobile ? 1.05 : 0.96)
      )
    );
    const x = (rect.width - MAP_WIDTH * fitScale) / 2;
    const y = (rect.height - MAP_HEIGHT * fitScale) / 2;
    cameraRef.current = clampCamera(x, y, fitScale, rect.width, rect.height);
    setZoomPercent(Math.round(cameraRef.current.scale * 100));
  }, [clampCamera]);

  const focusOnSelected = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const {
      selectedArmyId: sArmyId,
      selectedCityId: sCityId,
      armies: aList,
      cities: cList,
    } = stateRef.current;

    const targetArmy = aList.find((a) => a.id === sArmyId);
    const targetCity = cList.find((c) => c.id === sCityId);
    const targetPos = targetArmy?.position || targetCity?.position;
    if (!targetPos) {
      centerMap();
      return;
    }

    const targetScale = rect.width < 640 ? 0.78 : 0.92;
    const scale = Math.max(cameraRef.current.scale, targetScale);
    const x = rect.width / 2 - targetPos.x * scale;
    const y = rect.height / 2 - targetPos.y * scale;
    cameraRef.current = clampCamera(x, y, scale, rect.width, rect.height);
    setZoomPercent(Math.round(cameraRef.current.scale * 100));
  }, [centerMap, clampCamera]);

  // Initialize camera and handle ResizeObserver + orientation changes
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let prevWidth = 0;
    let prevHeight = 0;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      // Cap DPR at 2 on mobile devices to avoid excessive canvas memory usage
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const widthChangedSignificantly =
        prevWidth > 0 &&
        (Math.abs(rect.width - prevWidth) > 120 ||
          Math.abs(rect.height - prevHeight) > 120);

      prevWidth = rect.width;
      prevHeight = rect.height;

      viewSizeRef.current = {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        dpr,
      };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      if (widthChangedSignificantly) {
        centerMap();
      } else {
        cameraRef.current = clampCamera(
          cameraRef.current.x,
          cameraRef.current.y,
          cameraRef.current.scale,
          rect.width,
          rect.height
        );
      }
    };

    updateCanvasSize();
    centerMap();

    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });
    observer.observe(container);

    const handleOrientationOrResize = () => {
      updateCanvasSize();
      centerMap();
    };
    window.addEventListener('orientationchange', handleOrientationOrResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', handleOrientationOrResize);
    };
  }, [centerMap, clampCamera]);

  // Keyboard WASD / Arrow panning + Escape to cancel command mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'Escape') {
        onCancelCommandMode();
      }
      keysHeldRef.current.add(e.key.toLowerCase());
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.key.toLowerCase());
    };

    const onBlur = () => {
      keysHeldRef.current.clear();
      activePointersRef.current.clear();
      pinchDistanceRef.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [onCancelCommandMode]);

  // Convert screen coordinates to map world coordinates
  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - cameraRef.current.x) / cameraRef.current.scale,
      y: (sy - cameraRef.current.y) / cameraRef.current.scale,
    };
  };

  // Hit-test world coordinates for Armies first (top layer), then Cities
  const findHitAtWorld = (wx: number, wy: number, isTouchInput = false) => {
    const { armies: aList, cities: cList, commandMode: cMode } = stateRef.current;
    // Scale hit radius inversely when zoomed out so touch targets remain >= 44px on screen
    const zoomInverse = Math.max(1, 0.85 / cameraRef.current.scale);
    const cityRadius = (isTouchInput ? 44 : 36) * zoomInverse;
    const armyRadius = (isTouchInput ? 32 : 24) * zoomInverse;

    // If player is in Move or Attack command mode, prioritize City hit-testing so connected cities are easy to tap
    if (cMode === 'move' || cMode === 'attack') {
      let closestCity: { id: string; dist: number } | null = null;
      for (const city of cList) {
        const dist = Math.hypot(wx - city.position.x, wy - city.position.y);
        if (dist <= cityRadius * 1.15 && (!closestCity || dist < closestCity.dist)) {
          closestCity = { id: city.id, dist };
        }
      }
      if (closestCity) {
        return { type: 'city' as const, id: closestCity.id };
      }
    }

    // Check armies first
    let closestArmy: { id: string; dist: number } | null = null;
    for (let i = aList.length - 1; i >= 0; i--) {
      const army = aList[i];
      const dist = Math.hypot(wx - army.position.x, wy - army.position.y);
      if (dist <= armyRadius && (!closestArmy || dist < closestArmy.dist)) {
        closestArmy = { id: army.id, dist };
      }
    }
    if (closestArmy) {
      return { type: 'army' as const, id: closestArmy.id };
    }

    // Check cities (including city label plaque region below node)
    let closestCity: { id: string; dist: number } | null = null;
    for (const city of cList) {
      const dist = Math.hypot(wx - city.position.x, wy - city.position.y);
      const inPlaque =
        Math.abs(wx - city.position.x) <= 52 &&
        wy >= city.position.y &&
        wy <= city.position.y + 68;
      if (
        (dist <= cityRadius || inPlaque) &&
        (!closestCity || dist < closestCity.dist)
      ) {
        closestCity = { id: city.id, dist };
      }
    }
    if (closestCity) {
      return { type: 'city' as const, id: closestCity.id };
    }

    return null;
  };

  // Zoom around a specific screen point
  const zoomAtPoint = useCallback(
    (deltaScaleFactor: number, screenX: number, screenY: number) => {
      const { width, height } = viewSizeRef.current;
      const prevCam = cameraRef.current;
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, prevCam.scale * deltaScaleFactor)
      );

      const worldX = (screenX - prevCam.x) / prevCam.scale;
      const worldY = (screenY - prevCam.y) / prevCam.scale;

      const newX = screenX - worldX * newScale;
      const newY = screenY - worldY * newScale;

      cameraRef.current = clampCamera(newX, newY, newScale, width, height);
      setZoomPercent(Math.round(cameraRef.current.scale * 100));
    },
    [clampCamera]
  );

  // Unified Pointer Event Handlers (Supports Mouse, Touch, and Stylus without duplicate events)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.currentTarget.setPointerCapture?.(e.pointerId);
    activePointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
    });

    const pointerCount = activePointersRef.current.size;
    maxPointersInGestureRef.current = Math.max(
      maxPointersInGestureRef.current,
      pointerCount
    );

    if (pointerCount === 1) {
      pinchDistanceRef.current = null;
      dragMovedDistanceRef.current = 0;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      cameraStartRef.current = {
        x: cameraRef.current.x,
        y: cameraRef.current.y,
      };
    } else if (pointerCount === 2) {
      const pts = Array.from(activePointersRef.current.values());
      pinchDistanceRef.current = Math.hypot(
        pts[1].x - pts[0].x,
        pts[1].y - pts[0].y
      );
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pointers = activePointersRef.current;
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        pointerType: e.pointerType,
      });
    }

    const { width, height } = viewSizeRef.current;

    if (pointers.size === 1) {
      const pt = pointers.get(e.pointerId);
      if (!pt) return;
      const dx = pt.x - dragStartRef.current.x;
      const dy = pt.y - dragStartRef.current.y;
      dragMovedDistanceRef.current = Math.max(
        dragMovedDistanceRef.current,
        Math.hypot(dx, dy)
      );

      cameraRef.current = clampCamera(
        cameraStartRef.current.x + dx,
        cameraStartRef.current.y + dy,
        cameraRef.current.scale,
        width,
        height
      );
      return;
    }

    if (pointers.size >= 2) {
      const pts = Array.from(pointers.values());
      const p1 = pts[0];
      const p2 = pts[1];
      const newDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const centerX = (p1.x + p2.x) / 2 - (rect?.left || 0);
      const centerY = (p1.y + p2.y) / 2 - (rect?.top || 0);

      if (pinchDistanceRef.current !== null && pinchDistanceRef.current > 12) {
        const factor = newDist / pinchDistanceRef.current;
        if (Math.abs(factor - 1) > 0.004) {
          zoomAtPoint(factor, centerX, centerY);
        }
      }
      pinchDistanceRef.current = newDist;
      return;
    }

    // Desktop hover highlight when no pointer is pressed
    if (e.pointerType === 'mouse' && pointers.size === 0) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      hoveredItemRef.current = findHitAtWorld(worldPos.x, worldPos.y, false);
    }
  };

  const handlePointerUpOrCancel = (
    e: React.PointerEvent<HTMLCanvasElement>,
    isCancel: boolean
  ) => {
    const pointers = activePointersRef.current;
    const hadPointer = pointers.has(e.pointerId);
    pointers.delete(e.pointerId);

    const isTouch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const tapThreshold = isTouch ? 14 : 8;

    // Trigger tap/click selection only if this was a single-pointer gesture that didn't pan
    if (
      !isCancel &&
      hadPointer &&
      maxPointersInGestureRef.current === 1 &&
      dragMovedDistanceRef.current < tapThreshold &&
      pointers.size === 0
    ) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const hit = findHitAtWorld(worldPos.x, worldPos.y, isTouch);
      if (hit) {
        if (hit.type === 'army') {
          onSelectArmy(hit.id);
        } else {
          onSelectCity(hit.id);
        }
      }
    }

    if (pointers.size === 1) {
      // Transition cleanly from 2-finger pinch back to 1-finger pan without jumping
      const remaining = Array.from(pointers.values())[0];
      dragStartRef.current = { x: remaining.x, y: remaining.y };
      cameraStartRef.current = {
        x: cameraRef.current.x,
        y: cameraRef.current.y,
      };
      pinchDistanceRef.current = null;
    } else if (pointers.size === 0) {
      maxPointersInGestureRef.current = 0;
      dragMovedDistanceRef.current = 0;
      pinchDistanceRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    zoomAtPoint(factor, sx, sy);
  };

  // Main 60fps Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const { width: viewW, height: viewH, dpr } = viewSizeRef.current;

          // Apply continuous keyboard panning
          const keys = keysHeldRef.current;
          if (keys.size > 0) {
            const panSpeed = 420 * dt;
            let panX = 0;
            let panY = 0;
            if (keys.has('w') || keys.has('arrowup')) panY += panSpeed;
            if (keys.has('s') || keys.has('arrowdown')) panY -= panSpeed;
            if (keys.has('a') || keys.has('arrowleft')) panX += panSpeed;
            if (keys.has('d') || keys.has('arrowright')) panX -= panSpeed;
            if (panX !== 0 || panY !== 0) {
              cameraRef.current = clampCamera(
                cameraRef.current.x + panX,
                cameraRef.current.y + panY,
                cameraRef.current.scale,
                viewW,
                viewH
              );
            }
          }

          const cam = cameraRef.current;
          const {
            cities: cList,
            armies: aList,
            factions: fMap,
            selectedCityId: sCityId,
            selectedArmyId: sArmyId,
            commandMode: cMode,
            combatEffects: fxList,
            lang: curLang,
          } = stateRef.current;

          // Rebuild static offscreen terrain layer only when language changes
          if (
            !staticMapCanvasRef.current ||
            staticMapLangRef.current !== curLang
          ) {
            staticMapCanvasRef.current = buildStaticMapCanvas(curLang);
            staticMapLangRef.current = curLang;
          }

          const reducedMotion = prefersReducedMotionRef.current;

          ctx.save();
          ctx.scale(dpr, dpr);

          // 1. Dark Ink Outer Void
          ctx.fillStyle = '#12100E';
          ctx.fillRect(0, 0, viewW, viewH);

          // Transform into World Space
          ctx.translate(cam.x, cam.y);
          ctx.scale(cam.scale, cam.scale);

          // 2. Blit Cached Static Parchment, Rivers, Mountains & Passes Layer
          if (staticMapCanvasRef.current) {
            ctx.drawImage(
              staticMapCanvasRef.current,
              0,
              0,
              MAP_WIDTH,
              MAP_HEIGHT
            );
          }

          // Determine active army origin city for highlighting valid connected destinations
          const selectedArmy = aList.find((a) => a.id === sArmyId);
          const originCityIdForHighlighter =
            selectedArmy?.currentCityId || sCityId;
          const originCityObj = cList.find(
            (c) => c.id === originCityIdForHighlighter
          );
          const validTargetCityIds = new Set<string>(
            originCityObj ? originCityObj.connectedCityIds : []
          );

          // 3. Roads Connecting Cities
          const drawnPairs = new Set<string>();
          for (const city of cList) {
            for (const targetId of city.connectedCityIds) {
              const pairKey = [city.id, targetId].sort().join('--');
              if (drawnPairs.has(pairKey)) continue;
              drawnPairs.add(pairKey);

              const targetCity = cList.find((c) => c.id === targetId);
              if (!targetCity) continue;

              const isHighlightedRoute =
                (originCityIdForHighlighter === city.id &&
                  validTargetCityIds.has(targetCity.id)) ||
                (originCityIdForHighlighter === targetCity.id &&
                  validTargetCityIds.has(city.id));

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(city.position.x, city.position.y);
              ctx.lineTo(targetCity.position.x, targetCity.position.y);

              if (
                isHighlightedRoute &&
                (cMode === 'move' || cMode === 'attack')
              ) {
                ctx.strokeStyle = cMode === 'attack' ? '#DC2626' : '#D97706';
                ctx.lineWidth = 5;
                ctx.setLineDash([10, 6]);
                if (!reducedMotion) {
                  ctx.lineDashOffset = -(now / 30) % 16;
                }
                ctx.stroke();
              } else if (isHighlightedRoute) {
                ctx.strokeStyle = 'rgba(180, 115, 32, 0.7)';
                ctx.lineWidth = 4;
                ctx.setLineDash([8, 6]);
                ctx.stroke();
              } else {
                ctx.strokeStyle = 'rgba(87, 68, 44, 0.55)';
                ctx.lineWidth = 3;
                ctx.setLineDash([7, 7]);
                ctx.stroke();
              }
              ctx.restore();
            }
          }

          // 4. Cities
          const pulse = reducedMotion ? 0.5 : (Math.sin(now / 220) + 1) * 0.5;

          for (const city of cList) {
            const faction = fMap[city.ownerFactionId] || fMap.neutral;
            const isSelected = city.id === sCityId;
            const isHovered =
              hoveredItemRef.current?.type === 'city' &&
              hoveredItemRef.current.id === city.id;
            const isCommandActive =
              (cMode === 'move' || cMode === 'attack') && Boolean(selectedArmy);
            const isValidCommandTarget =
              isCommandActive && validTargetCityIds.has(city.id);
            const isUnreachableInCommandMode =
              isCommandActive &&
              !validTargetCityIds.has(city.id) &&
              city.id !== originCityIdForHighlighter;

            const { x, y } = city.position;

            // Active Siege Warning Ring
            if (city.underSiege) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x, y, 39 + pulse * 6, 0, Math.PI * 2);
              ctx.strokeStyle = '#EF4444';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([6, 4]);
              ctx.stroke();
              ctx.restore();
            }

            // Valid command target pulsing ring
            if (isValidCommandTarget) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x, y, 38 + pulse * 7, 0, Math.PI * 2);
              ctx.strokeStyle = cMode === 'attack' ? '#EF4444' : '#F59E0B';
              ctx.lineWidth = 3.5;
              ctx.stroke();

              ctx.fillStyle =
                cMode === 'attack'
                  ? 'rgba(239, 68, 68, 0.18)'
                  : 'rgba(245, 158, 11, 0.18)';
              ctx.fill();
              ctx.restore();
            } else if (isUnreachableInCommandMode) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x, y, 31, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(120, 113, 108, 0.55)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.stroke();
              ctx.restore();
            }

            // Selected or Hovered halo
            if (isSelected || isHovered) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x, y, isSelected ? 33 + pulse * 3 : 31, 0, Math.PI * 2);
              ctx.strokeStyle = isSelected ? '#F59E0B' : '#FFFBEB';
              ctx.lineWidth = isSelected ? 3 : 2;
              ctx.stroke();
              ctx.restore();
            }

            // Outer stone fortification ring (scaled by wallLevel)
            const outerRadius = 22 + city.wallLevel * 1.2;
            ctx.fillStyle = '#26211B';
            ctx.beginPath();
            ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = faction.color;
            ctx.lineWidth = 3.5;
            ctx.stroke();

            // Inner keep square
            ctx.fillStyle = faction.bannerBg;
            ctx.fillRect(x - 12, y - 12, 24, 24);
            ctx.strokeStyle = '#F3ECE0';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x - 12, y - 12, 24, 24);

            // Dynasty character / Capital seal inside city node
            ctx.font = 'bold 12px "Cinzel", "Noto Serif Thai", serif';
            ctx.fillStyle = '#F3ECE0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              city.isCapital ? `*${faction.dynastySeal}` : faction.dynastySeal,
              x,
              y + 0.5
            );

            // City Name & Garrison Plaque below city
            const cityName = `[${faction.dynastySeal}] ${city.name[curLang]}`;
            ctx.font = 'bold 12.5px "Cinzel", "Noto Serif Thai", serif';
            const nameWidth = ctx.measureText(cityName).width;
            const plaqueW = Math.max(96, nameWidth + 20);
            const plaqueH = 34;
            const plaqueX = x - plaqueW / 2;
            const plaqueY = y + outerRadius + 6;

            ctx.fillStyle = 'rgba(22, 19, 16, 0.92)';
            ctx.strokeStyle = city.underSiege
              ? '#EF4444'
              : isValidCommandTarget
              ? '#F59E0B'
              : isSelected
              ? '#F59E0B'
              : faction.color;
            ctx.lineWidth =
              isSelected || city.underSiege || isValidCommandTarget ? 2 : 1.2;
            ctx.beginPath();
            ctx.roundRect(plaqueX, plaqueY, plaqueW, plaqueH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#F3ECE0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(cityName, x, plaqueY + 4);

            // Garrison & Wall Level sub-row (or Reachable Order cue)
            ctx.font = '600 10.5px "JetBrains Mono", monospace';
            if (isValidCommandTarget) {
              ctx.fillStyle = cMode === 'attack' ? '#FCA5A5' : '#FDE68A';
              const actionCue =
                cMode === 'attack'
                  ? curLang === 'en'
                    ? '-> TAP TO ASSAULT'
                    : '-> แตะเพื่อบุกตี'
                  : curLang === 'en'
                  ? '-> TAP TO MARCH'
                  : '-> แตะเพื่อเดินทัพ';
              ctx.fillText(actionCue, x, plaqueY + 19);
            } else {
              ctx.fillStyle = city.underSiege ? '#FCA5A5' : '#D6CEBF';
              ctx.fillText(
                `${city.garrison.toLocaleString()} · Lv.${city.wallLevel}`,
                x,
                plaqueY + 19
              );
            }
          }

          // 5. Marching Trajectory Lines for Active Armies
          for (const army of aList) {
            if (
              (army.status === 'marching' ||
                army.status === 'attacking' ||
                army.status === 'retreating') &&
              army.targetCityId
            ) {
              const targetCity = cList.find((c) => c.id === army.targetCityId);
              if (targetCity) {
                const fac = fMap[army.ownerFactionId] || fMap.neutral;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(army.position.x, army.position.y);
                ctx.lineTo(targetCity.position.x, targetCity.position.y);
                ctx.strokeStyle =
                  army.status === 'attacking'
                    ? '#EF4444'
                    : army.status === 'retreating'
                    ? '#F59E0B'
                    : fac.secondaryColor;
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                if (!reducedMotion) {
                  ctx.lineDashOffset = -(now / 25) % 10;
                }
                ctx.stroke();
                ctx.restore();
              }
            }
          }

          // 6. Armies (Warlord Battle Banners)
          for (const army of aList) {
            const fac = fMap[army.ownerFactionId] || fMap.neutral;
            const isSelected = army.id === sArmyId;
            const isHovered =
              hoveredItemRef.current?.type === 'army' &&
              hoveredItemRef.current.id === army.id;

            const { x, y } = army.position;
            const bobOffset =
              !reducedMotion &&
              (army.status === 'marching' ||
                army.status === 'attacking' ||
                army.status === 'retreating')
                ? Math.sin(now / 110) * 2.5
                : 0;
            const ay = y + bobOffset;

            // Selection ring under army
            if (isSelected || isHovered) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(
                x,
                ay,
                isSelected ? 22 + pulse * 3 : 20,
                0,
                Math.PI * 2
              );
              ctx.strokeStyle = isSelected ? '#F59E0B' : '#FFFBEB';
              ctx.lineWidth = 2.5;
              ctx.stroke();
              ctx.restore();
            }

            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(x, y + 14, 14, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Shield / Banner Token Body
            ctx.fillStyle = fac.bannerBg;
            ctx.strokeStyle = isSelected ? '#FBBF24' : '#F3ECE0';
            ctx.lineWidth = isSelected ? 2.5 : 1.6;

            ctx.beginPath();
            ctx.moveTo(x - 13, ay - 13);
            ctx.lineTo(x + 13, ay - 13);
            ctx.lineTo(x + 13, ay + 3);
            ctx.lineTo(x, ay + 15);
            ctx.lineTo(x - 13, ay + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Status / General Icon inside shield
            ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const statusSymbol =
              army.status === 'defending'
                ? 'DEF'
                : army.status === 'attacking' || army.status === 'capturing'
                ? 'ATK'
                : army.status === 'retreating'
                ? 'RET'
                : fac.dynastySeal;
            ctx.fillText(statusSymbol, x, ay - 1);

            // General Name & Troop Count Flag above Army
            const label = `[${fac.dynastySeal}] ${army.general.name[curLang]} (${army.troopCount.toLocaleString()})`;
            ctx.font =
              '600 10.5px "Plus Jakarta Sans", "Noto Sans Thai", sans-serif';
            const tw = ctx.measureText(label).width;
            const tagW = tw + 12;
            const tagH = 18;
            const tagX = x - tagW / 2;
            const tagY = ay - 34;

            ctx.fillStyle = 'rgba(20, 18, 15, 0.92)';
            ctx.strokeStyle = isSelected ? '#F59E0B' : fac.color;
            ctx.lineWidth = isSelected ? 1.8 : 1.2;
            ctx.beginPath();
            ctx.roundRect(tagX, tagY, tagW, tagH, 3);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#F3ECE0';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, tagY + tagH / 2);
          }

          // 7. Combat & Capture Visual Shockwaves
          const nowEpoch = Date.now();
          for (const fx of fxList) {
            const elapsed = (nowEpoch - fx.createdAt) / 1000;
            if (elapsed < 0 || elapsed > 1.8) continue;
            const progress = elapsed / 1.8;
            const alpha = Math.max(0, 1 - progress);
            const radius = 18 + progress * 65;

            ctx.save();
            ctx.beginPath();
            ctx.arc(fx.position.x, fx.position.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = fx.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = fx.type === 'capture' ? 4 : 2.5;
            ctx.stroke();
            ctx.restore();
          }

          ctx.restore();
        }
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [clampCamera]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#12100E] select-none"
    >
      <canvas
        ref={canvasRef}
        data-testid="campaign-map-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerUpOrCancel(e, false)}
        onPointerCancel={(e) => handlePointerUpOrCancel(e, true)}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            hoveredItemRef.current = null;
          }
        }}
        onWheel={handleWheel}
        className={`w-full h-full block touch-none ${
          commandMode !== 'none'
            ? 'cursor-crosshair'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Active Command Mode Banner Overlay */}
      {commandMode !== 'none' && (
        <div
          role="region"
          aria-label={lang === 'en' ? 'Active Tactical Order' : 'โหมดสั่งการยุทธวิธี'}
          className="absolute top-2.5 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-xl z-20 pointer-events-auto flex items-center justify-between gap-2.5 px-3 py-2 rounded bg-[#181613]/95 border-2 border-[#D97706] shadow-2xl text-xs sm:text-sm text-[#F3ECE0]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Crosshair className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="leading-snug">
              {commandMode === 'attack'
                ? lang === 'en'
                  ? 'ATTACK MODE: Tap a highlighted connected city to assault.'
                  : 'โหมดบุกโจมตี: แตะเมืองที่เชื่อมต่อบนแผนที่เพื่อเคลื่อนทัพเข้าตี'
                : lang === 'en'
                ? 'MOVE MODE: Tap a highlighted connected city to march.'
                : 'โหมดเดินทัพ: แตะเมืองที่เชื่อมต่อบนแผนที่เพื่อเคลื่อนพล'}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelCommandMode}
            className="min-h-[38px] px-3 py-1.5 rounded bg-[#2C251E] hover:bg-[#3D3426] border border-[#D97706]/60 text-xs text-[#F59E0B] font-semibold shrink-0 cursor-pointer"
          >
            {lang === 'en' ? 'Cancel' : 'ยกเลิก'}
          </button>
        </div>
      )}

      {/* Map Legend & Camera Controls Cluster (Centered on Desktop so sidebars never overlap, Top-Right on Mobile/Tablet) */}
      <div className="absolute top-2.5 right-2.5 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 z-10 flex flex-col items-end lg:items-center gap-1.5 pointer-events-none">
        {/* Faction Key with Seal + Color */}
        {commandMode === 'none' && (
          <div className="pointer-events-auto bg-[#161411]/95 border border-[#3D3426] rounded px-2.5 py-1 flex items-center gap-2.5 text-[11px] text-[#D6CEBF] shadow">
            {(['wei', 'shu', 'wu', 'neutral'] as FactionId[]).map((fid) => {
              const f = factions[fid];
              return (
                <div
                  key={fid}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block border border-white/30 shrink-0"
                    style={{ backgroundColor: f.color }}
                  />
                  <span className="font-display font-bold text-[10px] text-[#F3ECE0]">
                    {f.dynastySeal}
                  </span>
                  <span className="hidden sm:inline">
                    {f.name[lang].split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Touch-Friendly Zoom & Camera Reset Controls */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#161411]/95 border border-[#3D3426] rounded p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              const { width, height } = viewSizeRef.current;
              zoomAtPoint(1.2, width / 2, height / 2);
            }}
            className="min-w-[40px] min-h-[40px] sm:min-w-[34px] sm:min-h-[34px] p-1.5 rounded hover:bg-[#2A241D] active:bg-[#3D3426] text-[#E5DEC9] flex items-center justify-center transition-colors cursor-pointer"
            title={lang === 'en' ? 'Zoom In' : 'ขยายแผนที่'}
            aria-label={lang === 'en' ? 'Zoom In' : 'ขยายแผนที่'}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="font-mono-num text-xs px-1 text-[#A89F8E] min-w-[3ch] text-center">
            {zoomPercent}%
          </span>
          <button
            type="button"
            onClick={() => {
              const { width, height } = viewSizeRef.current;
              zoomAtPoint(0.83, width / 2, height / 2);
            }}
            className="min-w-[40px] min-h-[40px] sm:min-w-[34px] sm:min-h-[34px] p-1.5 rounded hover:bg-[#2A241D] active:bg-[#3D3426] text-[#E5DEC9] flex items-center justify-center transition-colors cursor-pointer"
            title={lang === 'en' ? 'Zoom Out' : 'ย่อแผนที่'}
            aria-label={lang === 'en' ? 'Zoom Out' : 'ย่อแผนที่'}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-[#3D3426] mx-0.5" />
          <button
            type="button"
            onClick={focusOnSelected}
            className="min-h-[40px] sm:min-h-[34px] px-2.5 py-1 rounded hover:bg-[#2A241D] active:bg-[#3D3426] text-xs text-[#E5DEC9] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title={
              lang === 'en'
                ? 'Focus Selected City/Army'
                : 'เลื่อนไปยังเมืองหรือทัพที่เลือก'
            }
            aria-label={lang === 'en' ? 'Focus Selected' : 'โฟกัสที่เลือก'}
          >
            <Compass className="w-4 h-4 text-[#D97706] shrink-0" />
            <span className="hidden sm:inline">
              {lang === 'en' ? 'Focus' : 'โฟกัส'}
            </span>
          </button>
          <button
            type="button"
            onClick={centerMap}
            className="min-w-[40px] min-h-[40px] sm:min-w-[34px] sm:min-h-[34px] px-2 py-1 rounded hover:bg-[#2A241D] active:bg-[#3D3426] text-xs text-[#E5DEC9] flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
            title={lang === 'en' ? 'Reset Full Map View' : 'รีเซ็ตมุมมองแผนที่ทั้งหมด'}
            aria-label={lang === 'en' ? 'Reset Map View' : 'รีเซ็ตมุมมองแผนที่'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#A89F8E] shrink-0" />
            <span className="hidden md:inline">
              {lang === 'en' ? 'Reset' : 'รีเซ็ต'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
