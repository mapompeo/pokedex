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
import { PokemonListItem } from '../../core/models/pokemon.model';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton-card/skeleton-card.component';
import { getTypeColor } from '../../shared/type-colors';
import { getTypeNamePt } from '../../shared/type-translations';
import { listStagger } from '../../shared/animations';

const PAGE_SIZE = 20;

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
  favoritesService = inject(FavoritesService);

  @ViewChild('sentinel') sentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;
  private searchSubject = new Subject<string>();
  private scrollEl?: HTMLElement;
  private onScrollHandler?: () => void;

  showScrollTop = signal(false);
  isPulling = signal(false);
  pullDistance = signal(0);
  private touchStartY = 0;
  private touchMoveY = 0;
  private readonly PULL_THRESHOLD = 60;

  allItems = signal<PokemonListItem[]>([]);
  allNames = signal<PokemonListItem[]>([]);
  loading = signal(false);
  error = signal(false);
  offset = signal(0);
  total = signal<number | null>(null);
  searchTerm = signal('');
  typesById = signal<Map<number, string[]>>(new Map());
  availableTypes = signal<{ name: string; label: string; color: string }[]>([]);
  selectedTypes = signal<Set<string>>(new Set());
  filtersOpen = signal(false);

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
    this.scrollEl = this.sentinel?.nativeElement.closest('.pokedex-frame__screen-scroll') as HTMLElement | undefined;
    if (this.scrollEl) {
      this.onScrollHandler = () => {
        this.showScrollTop.set(this.scrollEl!.scrollTop > 400);
      };
      this.scrollEl.addEventListener('scroll', this.onScrollHandler, { passive: true });
    }
    setTimeout(() => this.fillViewportIfNeeded(), 0);
  }

  private fillViewportIfNeeded(): void {
    if (this.loading() || !this.hasMore() || this.searchTerm().trim() || this.selectedTypes().size > 0) return;
    if (this.scrollEl && this.scrollEl.scrollHeight <= this.scrollEl.clientHeight + 50) {
      this.loadNextPage();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.scrollEl && this.onScrollHandler) {
      this.scrollEl.removeEventListener('scroll', this.onScrollHandler);
    }
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
  }

  randomPokemon(): void {
    const maxId = this.total() ?? 1025;
    const randomId = Math.floor(Math.random() * maxId) + 1;
    this.router.navigate(['/pokemon', randomId]);
  }

  scrollToTop(): void {
    const scrollEl = this.sentinel?.nativeElement.closest('.pokedex-frame__screen-scroll');
    if (scrollEl) {
      scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
    this.touchMoveY = this.touchStartY;
    this.isPulling.set(true);
  }

  onTouchMove(event: TouchEvent): void {
    const scrollEl = this.sentinel?.nativeElement.closest('.pokedex-frame__screen-scroll');
    if (!scrollEl || scrollEl.scrollTop > 0) return;
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
