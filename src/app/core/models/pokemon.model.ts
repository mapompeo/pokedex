export interface PokemonListItem {
  id: number;
  name: string;
  spriteUrl: string;
}

export interface PokemonListPage {
  items: PokemonListItem[];
  total: number;
  nextOffset: number | null;
}

export interface PokemonStat {
  name: string;
  baseStat: number;
  effort: number;
}

export interface PokemonMove {
  name: string;
  learnMethod: string;
  level: number;
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  spriteUrl: string;
  cryUrl: string;
  baseExperience: number;
  types: string[];
  stats: PokemonStat[];
  abilities: string[];
  moves: PokemonMove[];
}

export interface PokemonType {
  id: number;
  name: string;
}

export interface EvolutionNode {
  id: number;
  name: string;
  spriteUrl: string;
  method: string | null;
  children: EvolutionNode[];
}

export interface EvolutionStage {
  stage: number;
  pokemon: EvolutionNode[];
}

export interface PokemonExtras {
  description: string;
  category: string;
  evolutions: EvolutionStage[];
  captureRate: number;
  baseHappiness: number;
  growthRate: string;
  eggGroups: string[];
  genderRate: number;
  habitat: string | null;
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  generation: string;
}
