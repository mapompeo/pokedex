import { Component, computed, effect, ElementRef, HostListener, inject, input, output, signal, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PokemonService } from '../../../core/services/pokemon.service';
import { PokemonListItem } from '../../../core/models/pokemon.model';
import { getTypeColor } from '../../type-colors';
import { getTypeNamePt } from '../../type-translations';
import { TYPE_CHART } from '../../type-chart';
import { loadDataParts } from '../../load-data-parts';
import { formatPokemonId } from '../../format-utils';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { IconButtonComponent } from '../icon-button/icon-button.component';

const ATTACKING_TYPES = Object.keys(TYPE_CHART);

/**
 * Busca/autocomplete de Pokémon. Uso padrão: dropdown inline sobre o campo
 * de busca (ex.: compare). Para uso como diálogo modal, ver
 * `PokemonPickerDialogComponent` — este componente não sabe mais nada sobre
 * overlay/modal, só sobre "estou expandido preenchendo o espaço do meu pai
 * ou sou um dropdown flutuante" (`alwaysOpen`).
 */
@Component({
  selector: 'app-pokemon-picker',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TypeBadgeComponent, LoadingSpinnerComponent, IconButtonComponent],
  templateUrl: './pokemon-picker.component.html',
  styleUrl: './pokemon-picker.component.scss',
  host: {
    '[class.pp--expanded]': 'alwaysOpen()',
  },
})
export class PokemonPickerComponent {
  private pokemonService = inject(PokemonService);

  /** Mantém a lista de resultados sempre visível, em vez de só ao focar/digitar
   *  (uso: dentro de `PokemonPickerDialogComponent`, onde o painel é o próprio
   *  conteúdo do diálogo, não um dropdown flutuante). */
  alwaysOpen = input(false);
  /** Valor exibido no campo quando o usuário não está digitando (ex.: Pokémon já escolhido). */
  value = input('');
  /** IDs que não devem aparecer na lista (ex.: os que já estão no time). */
  excludeIds = input<number[]>([]);
  /** Tipos pré-selecionados no filtro ao abrir. */
  preselectTypes = input<string[]>([]);
  /** Mostra o botão de filtro por tipo dentro da searchbar. */
  filterButton = input(true);
  /** Título exibido no painel (opcional). */
  title = input('');
  /** Dica de contexto exibida no painel (opcional). */
  hint = input('');
  /** Texto do placeholder do campo de busca. */
  placeholder = input('Buscar por nome ou ID');
  /** Mostra um botão de limpar a busca quando há texto digitado. */
  clearable = input(false);

  pokemonSelected = output<PokemonListItem>();
  dismissed = output<void>();
  /** Emite a consulta digitada (para o pai sincronizar filtros externos). */
  queryChange = output<string>();
  /** Emite quando o usuário limpa o campo de busca. */
  cleared = output<void>();

  allTypes = ATTACKING_TYPES;

  allNames = signal<PokemonListItem[]>([]);
  typesById = signal<Map<number, string[]>>(new Map());
  query = signal('');
  typeFilter = signal<string[]>([]);
  filtersOpen = signal(false);
  dataLoading = signal(true);
  dataError = signal(false);

  /** Abre ao focar/digitar (uso como autocomplete). */
  show = signal(false);
  fieldFocused = signal(false);
  panelVisible = computed(() => this.show() || this.alwaysOpen());

  @ViewChild('root') root?: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

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
    // Seed único na criação (não um effect): cada instância nasce e morre
    // com uma "sessão" de busca — não deve resetar o filtro do usuário se
    // o pai re-renderizar com o mesmo array por outro motivo.
    this.typeFilter.set(this.preselectTypes());

    effect(() => {
      const v = this.value();
      if (v && !this.fieldFocused()) {
        this.query.set(v);
      }
    });
  }

  onQueryInput(value: string): void {
    this.query.set(value);
    this.show.set(true);
    this.queryChange.emit(value);
  }

  onFocus(): void {
    this.fieldFocused.set(true);
    this.show.set(true);
  }

  onBlur(): void {
    this.fieldFocused.set(false);
  }

  loadData(): void {
    loadDataParts(
      [
        { obs: this.pokemonService.getAllPokemonListItems(), apply: (items) => this.allNames.set(items) },
        { obs: this.pokemonService.getTypesByPokemonId(), apply: (map) => this.typesById.set(map) },
      ],
      this.dataLoading,
      this.dataError
    );
  }

  toggleTypeFilter(type: string): void {
    this.typeFilter.update((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  }

  clearTypeFilter(): void {
    this.typeFilter.set([]);
  }

  clearQuery(): void {
    this.query.set('');
    this.queryChange.emit('');
    this.cleared.emit();
    this.show.set(true);
    this.searchInput?.nativeElement?.focus();
  }

  select(item: PokemonListItem): void {
    this.show.set(false);
    this.pokemonSelected.emit(item);
  }

  dismiss(): void {
    this.show.set(false);
    this.dismissed.emit();
  }

  @HostListener('document:pointerdown', ['$event'])
  onGlobalClick(event: PointerEvent): void {
    if (this.alwaysOpen()) return;
    if (this.show() && this.root && !this.root.nativeElement.contains(event.target as Node)) {
      this.dismiss();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.alwaysOpen()) return;
    if (this.show()) {
      this.dismiss();
    }
  }

  typeColor(type: string): string {
    return getTypeColor(type);
  }

  typeNamePt(type: string): string {
    return getTypeNamePt(type);
  }

  paddedId(id: number): string {
    return formatPokemonId(id);
  }
}
