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
}

export interface PokemonDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  spriteUrl: string;
  types: string[];
  stats: PokemonStat[];
  abilities: string[];
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
}

export interface PokemonExtras {
  description: string;
  category: string;
  evolutions: EvolutionNode[];
}
