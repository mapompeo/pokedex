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
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonListStateService } from '../../core/services/pokemon-list-state.service';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { getTypeColor } from '../../shared/type-colors';
import { getTypeNamePt } from '../../shared/type-translations';
import { listStagger } from '../../shared/animations';
import { startTypewriter } from '../../shared/typewriter';

const PAGE_SIZE = 20;

const EXAMPLE_NAMES = [
  'Pikachu', 'Charizard', 'Bulbasaur', 'Squirtle', 'Mewtwo',
  'Gengar', 'Lucario', 'Eevee', 'Dragonite', 'Gyarados',
  'Snorlax', 'Greninja', 'Sylveon', 'Arcanine', 'Blaziken',
];

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, PokemonCardComponent, SkeletonCardComponent],
  templateUrl: './pokemon-list.component.html',
  styleUrl: './pokemon-list.component.scss',
  animations: [listStagger],
})
export class PokemonListComponent implements OnInit, AfterViewInit, OnDestroy {
  private pokemonService = inject(PokemonService);
  private router = inject(Router);
  private state = inject(PokemonListStateService);
  favoritesService = inject(FavoritesService);

  @ViewChild('sentinel') sentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;
  private searchSubject = new Subject<string>();
  private onScrollHandler?: () => void;
  private placeholderTimers: ReturnType<typeof setTimeout>[] = [];

  showScrollTop = signal(false);
  isPulling = signal(false);
  pullDistance = signal(0);
  private touchStartY = 0;
  private touchMoveY = 0;
  private readonly PULL_THRESHOLD = 60;

  loading = signal(false);
  error = signal(false);
  filtersOpen = signal(false);
  placeholder = signal('');

  // Estado persistente (sobrevive à navegação para o detalhe e volta)
  allItems = this.state.allItems;
  allNames = this.state.allNames;
  typesById = this.state.typesById;
  availableTypes = this.state.availableTypes;
  offset = this.state.offset;
  total = this.state.total;
  searchTerm = this.state.searchTerm;
  selectedTypes = this.state.selectedTypes;

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
        if (!Array.from(types).every((t) => itemTypes.includes(t))) {
          return false;
        }
      }
      return true;
    });
  });

  hasMore = computed(() => this.total() === null || this.allItems().length < (this.total() ?? 0));

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((value) => this.searchTerm.set(value));
  }

  ngOnInit(): void {
    if (this.allNames().length === 0) {
      this.pokemonService.getAllPokemonListItems().subscribe((items) => this.allNames.set(items));
    }
    if (this.typesById().size === 0) {
      this.pokemonService.getTypesByPokemonId().subscribe((idToTypes) => this.typesById.set(idToTypes));
    }
    if (this.availableTypes().length === 0) {
      this.pokemonService.getTypes().subscribe((types) =>
        this.availableTypes.set(
          types.map((t) => ({ name: t.name, label: getTypeNamePt(t.name), color: getTypeColor(t.name) }))
        )
      );
    }
    if (this.allItems().length === 0) {
      this.loadNextPage();
    }
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
    this.onScrollHandler = () => {
      this.showScrollTop.set(window.scrollY > 400);
      this.state.scrollY = window.scrollY;
    };
    window.addEventListener('scroll', this.onScrollHandler, { passive: true });
    const savedScrollY = this.state.scrollY;
    if (savedScrollY > 0) {
      setTimeout(() => window.scrollTo(0, savedScrollY), 0);
    }
    setTimeout(() => this.fillViewportIfNeeded(), 0);
    this.startPlaceholderTyping();
  }

  private fillViewportIfNeeded(): void {
    if (this.loading() || !this.hasMore() || this.searchTerm().trim() || this.selectedTypes().size > 0) return;
    if (document.documentElement.scrollHeight <= window.innerHeight + 50) {
      this.loadNextPage();
    }
  }

  startPlaceholderTyping(): void {
    startTypewriter(EXAMPLE_NAMES, (text) => this.placeholder.set(text), this.placeholderTimers);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.onScrollHandler) {
      window.removeEventListener('scroll', this.onScrollHandler);
    }
    this.placeholderTimers.forEach((t) => clearTimeout(t));
  }

  loadNextPage(): void {
    this.loading.set(true);
    this.error.set(false);
    this.pokemonService.getPokemonPage(this.offset(), PAGE_SIZE).subscribe({
      next: (page) => {
        this.allItems.update((items) => [...items, ...page.items]);
        this.total.set(page.total);
        this.offset.update((o) => o + PAGE_SIZE);
        this.loading.set(false);
        setTimeout(() => this.fillViewportIfNeeded(), 0);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
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

  clearAllFilters(): void {
    this.selectedTypes.set(new Set());
    // O IntersectionObserver do infinite-scroll só dispara em transições de
    // interseção; se a sentinela já estava visível com o filtro ativo (poucos
    // resultados), limpar o filtro não gera uma nova transição por conta própria.
    setTimeout(() => this.fillViewportIfNeeded(), 0);
  }

  randomPokemon(): void {
    const maxId = Math.min(this.total() ?? 1025, 1025);
    const randomId = Math.floor(Math.random() * maxId) + 1;
    this.router.navigate(['/pokemon', randomId]);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
    this.touchMoveY = this.touchStartY;
    this.isPulling.set(true);
  }

  onTouchMove(event: TouchEvent): void {
    if (window.scrollY > 0) return;
    this.touchMoveY = event.touches[0].clientY;
    const diff = this.touchMoveY - this.touchStartY;
    if (diff > 0) {
      this.pullDistance.set(Math.min(diff * 0.5, 120));
    }
  }

  onTouchEnd(_event: TouchEvent): void {
    this.isPulling.set(false);
    if (this.pullDistance() >= this.PULL_THRESHOLD) {
      this.pullDistance.set(0);
      this.allItems.set([]);
      this.offset.set(0);
      this.total.set(null);
      this.state.scrollY = 0;
      this.loadNextPage();
      this.clearAllFilters();
    } else {
      this.pullDistance.set(0);
    }
  }

  onFavoriteToggled(id: number): void {
    this.favoritesService.toggleFavorite(id);
  }
}
