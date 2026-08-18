import { Injectable, effect, signal } from '@angular/core';
import { PokemonListItem } from '../models/pokemon.model';
import { loadJsonFromStorage, saveJsonToStorage } from '../../shared/storage-utils';

const STORAGE_KEY = 'pokedex-team';
export const TEAM_MAX_SIZE = 6;

function loadFromStorage(): PokemonListItem[] {
  return loadJsonFromStorage<PokemonListItem[]>(STORAGE_KEY, [], (parsed) =>
    Array.isArray(parsed)
      ? parsed.filter((p) => p && typeof p.id === 'number' && typeof p.name === 'string').slice(0, TEAM_MAX_SIZE)
      : []
  );
}

function saveToStorage(team: PokemonListItem[]): void {
  saveJsonToStorage(STORAGE_KEY, team);
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

  /** Substitui o membro do índice indicado. Retorna false se o índice é inválido ou o pokémon já está no time. */
  replace(index: number, pokemon: PokemonListItem): boolean {
    if (this.isInTeam(pokemon.id) || index < 0 || index >= this.team().length) {
      return false;
    }
    this.team.update((team) => {
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
