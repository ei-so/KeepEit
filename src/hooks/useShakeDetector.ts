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
  threshold = 11,
  cooldownMs = 1500,
}: ShakeDetectorOptions) {
  const onShakeRef = useRef(onShake);
  const lastShakeTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ x: number | null; y: number | null; z: number | null }>({
    x: null,
    y: null,
    z: null,
  });

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (!enabled) {
      lastCoordsRef.current = { x: null, y: null, z: null };
      return;
    }

    // Reset coordinates and add a short 800ms cooldown buffer upon unlock
    lastShakeTimeRef.current = Date.now() - (cooldownMs - 800);
    lastCoordsRef.current = { x: null, y: null, z: null };

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = event.accelerationIncludingGravity || event.acceleration;
      if (!current || current.x === null || current.y === null || current.z === null) return;

      const { x, y, z } = current;
      const { x: lastX, y: lastY, z: lastZ } = lastCoordsRef.current;

      if (lastX !== null && lastY !== null && lastZ !== null) {
        const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
        const now = Date.now();

        if (delta > threshold && now - lastShakeTimeRef.current > cooldownMs) {
          lastShakeTimeRef.current = now;
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
