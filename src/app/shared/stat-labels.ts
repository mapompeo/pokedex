export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'ATQ',
  defense: 'DEF',
  'special-attack': 'ATQ ESP',
  'special-defense': 'DEF ESP',
  speed: 'VEL',
};

export const STAT_COLORS: Record<string, string> = {
  hp: '#F85888',
  attack: '#F8A030',
  defense: '#6890F0',
  'special-attack': '#9860F8',
  'special-defense': '#78C850',
  speed: '#A8B820',
};

export function getStatLabel(name: string): string {
  return STAT_LABELS[name] ?? name.toUpperCase();
}

export function getStatColor(name: string): string {
  return STAT_COLORS[name] ?? '#999999';
}
