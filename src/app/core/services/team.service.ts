import { Injectable, effect, signal } from '@angular/core';
import { PokemonListItem } from '../models/pokemon.model';

const STORAGE_KEY = 'pokedex-team';
export const TEAM_MAX_SIZE = 6;

function loadFromStorage(): PokemonListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: PokemonListItem[] = JSON.parse(raw);
    return parsed
      .filter((p) => p && typeof p.id === 'number' && typeof p.name === 'string')
      .slice(0, TEAM_MAX_SIZE);
  } catch {
    return [];
  }
}

function saveToStorage(team: PokemonListItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  } catch {
    // localStorage indisponível (ex: modo privado) — time não persiste, app segue funcional
  }
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  readonly team = signal<PokemonListItem[]>(loadFromStorage());

  constructor() {
    effect(() => saveToStorage(this.team()));
  }

  isInTeam(id: number): boolean {
    return this.team().some((p) => p.id === id);
  }

  isFull(): boolean {
    return this.team().length >= TEAM_MAX_SIZE;
  }

  /** Retorna false se o time está cheio ou o pokémon já está no time. */
  add(pokemon: PokemonListItem): boolean {
    if (this.isFull() || this.isInTeam(pokemon.id)) {
      return false;
    }
    this.team.update((team) => [...team, pokemon]);
    return true;
  }

  remove(id: number): void {
    this.team.update((team) => team.filter((p) => p.id !== id));
  }

  /** Substitui o membro do índice indicado. Retorna false se o pokémon já está no time. */
  replace(index: number, pokemon: PokemonListItem): boolean {
    if (this.isInTeam(pokemon.id)) {
      return false;
    }
    this.team.update((team) => {
      if (index < 0 || index >= team.length) {
        return team;
      }
      const next = [...team];
      next[index] = pokemon;
      return next;
    });
    return true;
  }

  /** Substitui o time inteiro pela ordem recebida (usado pelo drag-and-drop). */
  setTeam(items: PokemonListItem[]): void {
    this.team.set(items.slice(0, TEAM_MAX_SIZE));
  }

  clear(): void {
    this.team.set([]);
  }
}
