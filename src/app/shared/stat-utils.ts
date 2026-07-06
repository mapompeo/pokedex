const DEFAULT_MAX_STAT = 150;

export function getStatPercent(value: number, max: number = DEFAULT_MAX_STAT): number {
  return Math.min(100, Math.round((value / max) * 100));
}
