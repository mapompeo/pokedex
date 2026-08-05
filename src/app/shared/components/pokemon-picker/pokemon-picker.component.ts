import { Component, computed, effect, ElementRef, HostListener, inject, input, output, signal, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { PokemonService } from '../../../core/services/pokemon.service';
import { PokemonListItem } from '../../../core/models/pokemon.model';
import { getTypeColor } from '../../type-colors';
import { getTypeNamePt } from '../../type-translations';
import { TYPE_CHART } from '../../type-chart';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

const ATTACKING_TYPES = Object.keys(TYPE_CHART);

@Component({
  selector: 'app-pokemon-picker',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TypeBadgeComponent, LoadingSpinnerComponent],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
})
export class PokemonPickerComponent {
  private pokemonService = inject(PokemonService);

  /** Controla a abertura do popup. Quando fica true, o picker se reinicia e foca a busca. */
  open = input(false);
  title = input('Escolher Pokémon');
  hint = input('');
  /** IDs que não devem aparecer na lista (ex.: os que já estão no time). */
  excludeIds = input<number[]>([]);
  /** Tipos pré-selecionados no filtro ao abrir. */
  preselectTypes = input<string[]>([]);

  pokemonSelected = output<PokemonListItem>();
  dismissed = output<void>();

  allTypes = ATTACKING_TYPES;

  allNames = signal<PokemonListItem[]>([]);
  typesById = signal<Map<number, string[]>>(new Map());
  query = signal('');
  typeFilter = signal<string[]>([]);
  filtersOpen = signal(false);
  dataLoading = signal(true);
  dataError = signal(false);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  private pendingData = 0;

  suggestions = computed(() => {
    const term = this.query().trim().toLowerCase();
    const filters = this.typeFilter();
    const excluded = new Set(this.excludeIds());
    return this.allNames()
      .filter((item) => !excluded.has(item.id))
      .filter((item) => !term || item.name.toLowerCase().includes(term) || String(item.id).includes(term))
      .filter((item) => {
        if (filters.length === 0) return true;
        const types = this.typesById().get(item.id) ?? [];
        return filters.every((t) => types.includes(t));
      })
      .slice(0, 30);
  });

  constructor() {
    this.loadData();

    effect(() => {
      if (this.open()) {
        this.reset();
      }
    });
  }

  private reset(): void {
    this.filtersOpen.set(false);
    this.typeFilter.set(this.preselectTypes());
    this.query.set('');
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
  }

  loadData(): void {
    this.dataLoading.set(true);
    this.dataError.set(false);
    this.pendingData = 2;
    this.loadPart(this.pokemonService.getAllPokemonListItems(), (items) => this.allNames.set(items));
    this.loadPart(this.pokemonService.getTypesByPokemonId(), (map) => this.typesById.set(map));
  }

  private loadPart<T>(obs: Observable<T>, apply: (value: T) => void): void {
    obs.subscribe({
      next: apply,
      error: () => {
        this.pendingData--;
        this.dataError.set(true);
        if (this.pendingData <= 0) this.dataLoading.set(false);
      },
      complete: () => {
        this.pendingData--;
        if (this.pendingData <= 0) this.dataLoading.set(false);
      },
    });
  }

  toggleTypeFilter(type: string): void {
    this.typeFilter.update((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  }

  clearTypeFilter(): void {
    this.typeFilter.set([]);
  }

  select(item: PokemonListItem): void {
    this.pokemonSelected.emit(item);
  }

  dismiss(): void {
    if (this.open()) {
      this.dismissed.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dismiss();
  }

  typeColor(type: string): string {
    return getTypeColor(type);
  }

  typeNamePt(type: string): string {
    return getTypeNamePt(type);
  }

  paddedId(id: number): string {
    return String(id).padStart(3, '0');
  }
}