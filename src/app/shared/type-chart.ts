export const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, electric: 2, grass: 0.5, ice: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { fire: 0.5, water: 0.5, electric: 0.5, grass: 0.5, ice: 0.5, dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, bug: 0.5, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, poison: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5 },
};

export function getDefenseMultiplier(attackingType: string, defendingTypes: string[]): number {
  return defendingTypes.reduce((mult, def) => mult * (TYPE_CHART[attackingType]?.[def] ?? 1), 1);
}

const MULT_LABELS = [
  { max: 0, label: '0×', className: 'immunity' },
  { max: 0.26, label: '¼×', className: 'quad-resist' },
  { max: 0.51, label: '½×', className: 'resist' },
  { max: 2, label: '1×', className: 'normal' },
  { max: 3, label: '2×', className: 'weak' },
  { max: 9, label: '4×', className: 'quad-weak' },
];

export function getMultiplierLabel(mult: number): { label: string; className: string } {
  for (const entry of MULT_LABELS) {
    if (mult <= entry.max) return entry;
  }
  return { label: `${mult}×`, className: 'unknown' };
}
