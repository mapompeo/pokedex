import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonListItem } from '../../core/models/pokemon.model';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { getTypeColor } from '../../shared/type-colors';
import { getTypeNamePt } from '../../shared/type-translations';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [MatIconModule, PokemonCardComponent, LoadingSpinnerComponent],
  templateUrl: './pokemon-list.component.html',
  styleUrl: './pokemon-list.component.scss',
})
export class PokemonListComponent implements OnInit, AfterViewInit, OnDestroy {
  private pokemonService = inject(PokemonService);
  favoritesService = inject(FavoritesService);

  @ViewChild('sentinel') sentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;

  allItems = signal<PokemonListItem[]>([]);
  allNames = signal<PokemonListItem[]>([]);
  loading = signal(false);
  offset = signal(0);
  total = signal<number | null>(null);
  searchTerm = signal('');
  typesById = signal<Map<number, string[]>>(new Map());
  availableTypes = signal<{ name: string; label: string; color: string }[]>([]);
  selectedTypes = signal<Set<string>>(new Set());

  filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const types = this.selectedTypes();
    const hasFilter = !!term || types.size > 0;
    const source = hasFilter ? this.allNames() : this.allItems();
    return source.filter((item) => {
      if (term) {
        const itemTypes = this.typesById().get(item.id) ?? [];
        const matchesName = item.name.toLowerCase().includes(term);
        const matchesId = String(item.id).includes(term);
        const matchesType = itemTypes.some((t) => t.toLowerCase().includes(term) || getTypeNamePt(t).toLowerCase().includes(term));
        if (!matchesName && !matchesId && !matchesType) {
          return false;
        }
      }
      if (types.size > 0) {
        const itemTypes = this.typesById().get(item.id) ?? [];
        if (!itemTypes.some((t) => types.has(t))) {
          return false;
        }
      }
      return true;
    });
  });

  hasMore = computed(() => this.total() === null || this.allItems().length < (this.total() ?? 0));

  ngOnInit(): void {
    this.pokemonService.getAllPokemonListItems().subscribe((items) => this.allNames.set(items));
    this.pokemonService.getTypesByPokemonId().subscribe((idToTypes) => this.typesById.set(idToTypes));
    this.pokemonService.getTypes().subscribe((types) =>
      this.availableTypes.set(
        types.map((t) => ({ name: t.name, label: getTypeNamePt(t.name), color: getTypeColor(t.name) }))
      )
    );
    this.loadNextPage();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loading() && !this.searchTerm().trim() && this.selectedTypes().size === 0 && this.hasMore()) {
        this.loadNextPage();
      }
    });
    if (this.sentinel) {
      this.observer.observe(this.sentinel.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  loadNextPage(): void {
    this.loading.set(true);
    this.pokemonService.getPokemonPage(this.offset(), PAGE_SIZE).subscribe({
      next: (page) => {
        this.allItems.update((items) => [...items, ...page.items]);
        this.total.set(page.total);
        this.offset.update((o) => o + PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  toggleTypeFilter(typeName: string): void {
    this.selectedTypes.update((set) => {
      const next = new Set(set);
      if (next.has(typeName)) {
        next.delete(typeName);
      } else {
        next.add(typeName);
      }
      return next;
    });
  }

  onFavoriteToggled(id: number): void {
    this.favoritesService.toggleFavorite(id);
  }
}
