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
import { PokemonListItem, PokemonType } from '../../core/models/pokemon.model';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { TypeChipComponent } from '../../shared/components/type-chip/type-chip.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [MatIconModule, PokemonCardComponent, TypeChipComponent, LoadingSpinnerComponent],
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
  types = signal<PokemonType[]>([]);
  selectedTypeNames = signal<string[]>([]);
  typeFilteredIds = signal<Set<number> | null>(null);
  typesById = signal<Map<number, string[]>>(new Map());

  filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const typeIds = this.typeFilteredIds();
    const source = term ? this.allNames() : this.allItems();
    return source.filter((item) => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term);
      const matchesType = !typeIds || typeIds.has(item.id);
      return matchesSearch && matchesType;
    });
  });

  hasMore = computed(() => this.total() === null || this.allItems().length < (this.total() ?? 0));

  ngOnInit(): void {
    this.pokemonService.getTypes().subscribe((types) => this.types.set(types));
    this.pokemonService.getAllPokemonListItems().subscribe((items) => this.allNames.set(items));
    this.pokemonService.getTypesByPokemonId().subscribe((idToTypes) => this.typesById.set(idToTypes));
    this.loadNextPage();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.loading() && !this.searchTerm().trim() && this.hasMore()) {
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

  onTypeSelectionChanged(typeNames: string[]): void {
    this.selectedTypeNames.set(typeNames);
    if (typeNames.length === 0) {
      this.typeFilteredIds.set(null);
      return;
    }
    this.pokemonService.getPokemonIdsByTypes(typeNames).subscribe((ids) => this.typeFilteredIds.set(ids));
  }

  onFavoriteToggled(id: number): void {
    this.favoritesService.toggleFavorite(id);
  }
}
