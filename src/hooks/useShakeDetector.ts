import { useEffect, useRef } from 'react';

interface ShakeDetectorOptions {
  onShake: () => void;
  enabled: boolean;
  threshold?: number;
  cooldownMs?: number;
}

export function useShakeDetector({
  onShake,
  enabled,
  threshold = 15,
  cooldownMs = 1500,
}: ShakeDetectorOptions) {
  const onShakeRef = useRef(onShake);
  const enabledRef = useRef(enabled);
  const lastShakeTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ x: number | null; y: number | null; z: number | null }>({
    x: null,
    y: null,
    z: null,
  });

  // Keep refs synchronized with latest props
  useEffect(() => {
    onShakeRef.current = onShake;
    enabledRef.current = enabled;
  }, [onShake, enabled]);

  useEffect(() => {
    if (!enabled) {
      // Clear previous coordinates when disabled/locked
      lastCoordsRef.current = { x: null, y: null, z: null };
      return;
    }

    // Set an initial cooldown on mount/unlock to prevent Face ID lift from locking
    lastShakeTimeRef.current = Date.now();

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!enabledRef.current) return;

      const current = event.accelerationIncludingGravity || event.acceleration;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const { x, y, z } = current;
      const { x: lastX, y: lastY, z: lastZ } = lastCoordsRef.current;

      if (lastX !== null && lastY !== null && lastZ !== null) {
        const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
        const now = Date.now();

        if (delta > threshold && now - lastShakeTimeRef.current > cooldownMs) {
          lastShakeTimeRef.current = now;
          // Reset coordinates before executing lock
          lastCoordsRef.current = { x: null, y: null, z: null };
          onShakeRef.current();
        }
      }

      lastCoordsRef.current = { x, y, z };
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [enabled, threshold, cooldownMs]);
}
