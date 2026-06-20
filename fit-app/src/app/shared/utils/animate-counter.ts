/**
 * Animates a numeric counter from `from` to `to` over `duration` ms.
 * Calls `onTick(value)` on every animation frame.
 * Calls `onComplete()` when finished.
 * Returns a cancel function.
 */
export function animateCounter(
  from: number,
  to: number,
  duration: number,
  onTick: (value: number) => void,
  onComplete?: () => void
): () => void {
  // Determine decimal precision of `to` so integer targets round cleanly
  const toStr = String(to);
  const decimalIndex = toStr.indexOf('.');
  const precision = decimalIndex === -1 ? 0 : toStr.length - decimalIndex - 1;

  const easeOutQuad = (t: number): number => t * (2 - t);

  // Fast-path: nothing to animate
  if (from === to) {
    onTick(to);
    onComplete?.();
    return () => {};
  }

  let rafId: number;
  let startTime: number | null = null;
  let cancelled = false;
  let completed = false;

  const step = (timestamp: number): void => {
    if (cancelled) return;

    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuad(progress);
    const rawValue = from + (to - from) * easedProgress;
    const roundedValue = parseFloat(rawValue.toFixed(precision));

    if (progress < 1) {
      onTick(roundedValue);
      rafId = requestAnimationFrame(step);
    } else {
      // Emit exactly `to` once at completion — no duplicate from roundedValue
      onTick(to);
      completed = true;
      onComplete?.();
    }
  };

  rafId = requestAnimationFrame(step);

  return (): void => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    if (!completed) onTick(to);
  };
}
