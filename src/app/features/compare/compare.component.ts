import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonDetail, PokemonListItem } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { getCapBackground } from '../../shared/type-colors';
import { getStatPercent } from '../../shared/stat-utils';
import { formatDecimalPtBr } from '../../shared/format-utils';

const MAX_SUGGESTIONS = 8;

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatAutocompleteModule, LoadingSpinnerComponent, TypeBadgeComponent],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.scss',
})
export class CompareComponent {
  private pokemonService = inject(PokemonService);

  allNames = signal<PokemonListItem[]>([]);

  queryA = signal('');
  queryB = signal('');

  pokemonA = signal<PokemonDetail | null>(null);
  pokemonB = signal<PokemonDetail | null>(null);
  loadingA = signal(false);
  loadingB = signal(false);

  suggestionsA = computed(() => this.suggestionsFor(this.queryA()));
  suggestionsB = computed(() => this.suggestionsFor(this.queryB()));

  constructor() {
    this.pokemonService.getAllPokemonListItems().subscribe((items) => this.allNames.set(items));
  }

  private suggestionsFor(query: string): PokemonListItem[] {
    const term = query.trim().toLowerCase();
    if (!term) {
      return [];
    }
    return this.allNames()
      .filter((item) => item.name.toLowerCase().includes(term))
      .slice(0, MAX_SUGGESTIONS);
  }

  onQueryAChange(value: string): void {
    this.queryA.set(value);
  }

  onQueryBChange(value: string): void {
    this.queryB.set(value);
  }

  selectA(item: PokemonListItem): void {
    this.queryA.set(item.name);
    this.loadingA.set(true);
    this.pokemonService.getPokemonDetail(item.name).subscribe({
      next: (detail) => {
        this.pokemonA.set(detail);
        this.loadingA.set(false);
      },
      error: () => this.loadingA.set(false),
    });
  }

  selectB(item: PokemonListItem): void {
    this.queryB.set(item.name);
    this.loadingB.set(true);
    this.pokemonService.getPokemonDetail(item.name).subscribe({
      next: (detail) => {
        this.pokemonB.set(detail);
        this.loadingB.set(false);
      },
      error: () => this.loadingB.set(false),
    });
  }

  capBackground(types: string[]): string {
    return getCapBackground(types);
  }

  statPercent(value: number): number {
    return getStatPercent(value);
  }

  formatDecimal(value: number): string {
    return formatDecimalPtBr(value);
  }
}
