import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'pokedex-favorites';

function loadFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: number[] = JSON.parse(raw);
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveToStorage(ids: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage indisponível (ex: modo privado) — favorito não persiste, app segue funcional
  }
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
