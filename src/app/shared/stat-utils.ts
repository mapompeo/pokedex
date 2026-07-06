const MAX_STAT_SCALE = 150;

export function getStatPercent(value: number): number {
  return Math.min(100, Math.round((value / MAX_STAT_SCALE) * 100));
}
