export function formatDecimalPtBr(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

export function formatSlug(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
