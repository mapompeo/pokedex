import { Injectable, effect, signal } from '@angular/core';
import { loadJsonFromStorage, saveJsonToStorage } from '../../shared/storage-utils';

const STORAGE_KEY = 'pokedex-favorites';

function loadFromStorage(): Set<number> {
  return loadJsonFromStorage<Set<number>>(STORAGE_KEY, new Set(), (parsed) =>
    Array.isArray(parsed) ? new Set(parsed) : new Set()
  );
}

function saveToStorage(ids: Set<number>): void {
  saveJsonToStorage(STORAGE_KEY, [...ids]);
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  readonly favoriteIds = signal<Set<number>>(loadFromStorage());

  constructor() {
    effect(() => saveToStorage(this.favoriteIds()));
  }

  isFavorite(id: number): boolean {
    return this.favoriteIds().has(id);
  }

  toggleFavorite(id: number): void {
    const current = new Set(this.favoriteIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.favoriteIds.set(current);
  }
}
