import { Injectable, signal } from '@angular/core';
import { PokemonListItem } from '../models/pokemon.model';

/**
 * Estado da tela de listagem que sobrevive à navegação para o detalhe e volta.
 * Assim, ao retornar, busca, filtros, itens já carregados e a posição do scroll
 * são restaurados em vez de recomeçar do zero.
 */
@Injectable({ providedIn: 'root' })
export class PokemonListStateService {
  readonly allItems = signal<PokemonListItem[]>([]);
  readonly allNames = signal<PokemonListItem[]>([]);
  readonly typesById = signal<Map<number, string[]>>(new Map());
  readonly availableTypes = signal<{ name: string; label: string; color: string }[]>([]);
  readonly offset = signal(0);
  readonly total = signal<number | null>(null);
  readonly searchTerm = signal('');
  readonly selectedTypes = signal<Set<string>>(new Set());
  scrollY = 0;
}
