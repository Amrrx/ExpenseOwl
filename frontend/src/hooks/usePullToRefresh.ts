import { useEffect, useRef, useState, useCallback } from 'react';

interface PullToRefreshConfig {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh(config: PullToRefreshConfig) {
  const { onRefresh, threshold = 80, enabled = true } = config;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only start pull if at top of page
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startYRef.current);

    // Apply resistance
    const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
    setPullDistance(resistedDistance);
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;

    isPullingRef.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullDistance,
    isPulling: pullDistance > 0,
  };
}
