const DEFAULT_MAX_STAT = 150;

// Teto de referência para a soma das 6 stats base, na mesma escala usada
// pelas barras individuais (6 × DEFAULT_MAX_STAT).
export const MAX_TOTAL_STAT = DEFAULT_MAX_STAT * 6;

export function getStatPercent(value: number, max: number = DEFAULT_MAX_STAT): number {
  return Math.min(100, Math.round((value / max) * 100));
}
