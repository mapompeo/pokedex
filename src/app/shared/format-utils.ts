export function formatDecimalPtBr(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

export function formatSlug(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Deixa só a primeira letra maiúscula, preservando o resto da string (hífens inclusive). */
export function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Formata o ID do Pokémon com zero-padding, ex.: 7 -> "007". */
export function formatPokemonId(id: number): string {
  return String(id).padStart(3, '0');
}

export function formatGenderRate(rate: number): string {
  if (rate === -1) return 'Sem gênero';
  const female = (rate / 8) * 100;
  const male = 100 - female;
  return `${male}% ♂ / ${female}% ♀`;
}

export function formatGrowthRate(rate: string): string {
  const labels: Record<string, string> = {
    'slow': 'Lenta',
    'medium': 'Média',
    'fast': 'Rápida',
    'medium-slow': 'Média-Lenta',
    'medium-fast': 'Média-Rápida',
    'slow-then-very-fast': 'Lenta→Muito Rápida',
    'fast-then-very-slow': 'Rápida→Muito Lenta',
  };
  return labels[rate] ?? formatSlug(rate);
}

export function formatGeneration(gen: string): string {
  const labels: Record<string, string> = {
    'generation-i': 'Geração I',
    'generation-ii': 'Geração II',
    'generation-iii': 'Geração III',
    'generation-iv': 'Geração IV',
    'generation-v': 'Geração V',
    'generation-vi': 'Geração VI',
    'generation-vii': 'Geração VII',
    'generation-viii': 'Geração VIII',
    'generation-ix': 'Geração IX',
  };
  return labels[gen] ?? formatSlug(gen);
}

export function formatEggGroup(group: string): string {
  const labels: Record<string, string> = {
    'monster': 'Monstro',
    'water1': 'Água 1',
    'water2': 'Água 2',
    'water3': 'Água 3',
    'bug': 'Inseto',
    'flying': 'Voador',
    'field': 'Campo',
    'fairy': 'Fada',
    'grass': 'Planta',
    'human-like': 'Humanoide',
    'mineral': 'Mineral',
    'ditto': 'Ditto',
    'dragon': 'Dragão',
    'undiscovered': 'Indescobrível',
  };
  return labels[group] ?? formatSlug(group);
}

export function formatHabitat(habitat: string): string {
  const labels: Record<string, string> = {
    'cave': 'Caverna',
    'forest': 'Floresta',
    'grassland': 'Campo',
    'mountain': 'Montanha',
    'rare': 'Raro',
    'rough-terrain': 'Terreno Áspero',
    'sea': 'Mar',
    'urban': 'Urbano',
    'waters-edge': 'Beira da Água',
  };
  return labels[habitat] ?? formatSlug(habitat);
}
