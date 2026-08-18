import { AfterViewInit, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonDetail, PokemonListItem } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { PokemonPickerComponent } from '../../shared/components/pokemon-picker/pokemon-picker.component';
import { getTypeColor } from '../../shared/type-colors';
import { MAX_TOTAL_STAT, getStatPercent } from '../../shared/stat-utils';
import { getStatLabel } from '../../shared/stat-labels';
import { formatDecimalPtBr, formatPokemonId } from '../../shared/format-utils';
import { startTypewriter } from '../../shared/typewriter';

@Component({
  selector: 'app-compare',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, LoadingSpinnerComponent, TypeBadgeComponent, PokemonPickerComponent],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.scss',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('0.25s ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class CompareComponent implements AfterViewInit, OnDestroy {
  private pokemonService = inject(PokemonService);
  private destroyRef = inject(DestroyRef);

  private static readonly STORAGE_KEY_A = 'pokedex:compare:a';
  private static readonly STORAGE_KEY_B = 'pokedex:compare:b';

  allNames = signal<PokemonListItem[]>([]);

  queryA = signal('');
  queryB = signal('');

  pokemonA = signal<PokemonDetail | null>(null);
  pokemonB = signal<PokemonDetail | null>(null);
  loadingA = signal(false);
  loadingB = signal(false);
  errorA = signal(false);
  errorB = signal(false);

  bothLoaded = computed(() => this.pokemonA() && this.pokemonB());

  colorA = computed(() => this.solidColor(this.pokemonA()?.types ?? []));
  colorB = computed(() => this.solidColor(this.pokemonB()?.types ?? []));

  // Memoizado: recalcula só quando pokemonA()/pokemonB() mudam, em vez de
  // buscar no array de stats a cada ciclo de change detection (o template
  // chamava winnerStat/statPercentA/statValueA etc. direto, sem OnPush).
  statsRows = computed(() => {
    const a = this.pokemonA();
    const b = this.pokemonB();
    return this.statLabels.map((name) => {
      const valueA = a?.stats.find((s) => s.name === name)?.baseStat ?? 0;
      const valueB = b?.stats.find((s) => s.name === name)?.baseStat ?? 0;
      const winner: 'a' | 'b' | 'tie' = valueA > valueB ? 'a' : valueB > valueA ? 'b' : 'tie';
      return {
        name,
        label: getStatLabel(name),
        valueA,
        valueB,
        percentA: getStatPercent(valueA),
        percentB: getStatPercent(valueB),
        winner,
      };
    });
  });

  totalRow = computed(() => {
    const totalA = this.totalStats(this.pokemonA());
    const totalB = this.totalStats(this.pokemonB());
    const winner: 'a' | 'b' | 'tie' = totalA > totalB ? 'a' : totalB > totalA ? 'b' : 'tie';
    return {
      totalA,
      totalB,
      percentA: getStatPercent(totalA, MAX_TOTAL_STAT),
      percentB: getStatPercent(totalB, MAX_TOTAL_STAT),
      winner,
    };
  });

  placeholderA = signal('');
  placeholderB = signal('');

  private typingTimers: ReturnType<typeof setTimeout>[] = [];
  private exampleNames = [
    'Pikachu', 'Charizard', 'Bulbasaur', 'Squirtle', 'Mewtwo',
    'Gengar', 'Lucario', 'Eevee', 'Dragonite', 'Gyarados',
    'Snorlax', 'Greninja', 'Sylveon', 'Arcanine', 'Blaziken',
  ];

  statLabels = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

  constructor() {
    this.pokemonService
      .getAllPokemonListItems()
      .pipe(takeUntilDestroyed())
      .subscribe((items) => {
        this.allNames.set(items);
        this.restoreFromStorage();
      });
  }

  private restoreFromStorage(): void {
    const savedA = localStorage.getItem(CompareComponent.STORAGE_KEY_A);
    const savedB = localStorage.getItem(CompareComponent.STORAGE_KEY_B);
    if (savedA) {
      this.queryA.set(savedA);
      this.loadPokemon('A', savedA);
    }
    if (savedB) {
      this.queryB.set(savedB);
      this.loadPokemon('B', savedB);
    }
  }

  private loadPokemon(side: 'A' | 'B', name: string): void {
    const setLoading = side === 'A' ? this.loadingA : this.loadingB;
    const setError = side === 'A' ? this.errorA : this.errorB;
    const setPokemon = side === 'A' ? this.pokemonA : this.pokemonB;

    setLoading.set(true);
    setError.set(false);
    this.pokemonService
      .getPokemonDetail(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => { setPokemon.set(detail); setLoading.set(false); },
        error: () => { setLoading.set(false); setError.set(true); },
      });
  }

  ngAfterViewInit(): void {
    this.startTyping('A');
    this.startTyping('B');
  }

  ngOnDestroy(): void {
    this.typingTimers.forEach(t => clearTimeout(t));
  }

  private startTyping(side: 'A' | 'B'): void {
    const setter = side === 'A' ? this.placeholderA : this.placeholderB;
    startTypewriter(this.exampleNames, (text) => setter.set(text), this.typingTimers, 600 + (side === 'B' ? 400 : 0));
  }

  onQueryAChange(value: string): void {
    this.queryA.set(value);
    if (!value) {
      this.pokemonA.set(null);
      localStorage.removeItem(CompareComponent.STORAGE_KEY_A);
    }
  }

  onQueryBChange(value: string): void {
    this.queryB.set(value);
    if (!value) {
      this.pokemonB.set(null);
      localStorage.removeItem(CompareComponent.STORAGE_KEY_B);
    }
  }

  clearA(): void {
    this.queryA.set('');
    this.pokemonA.set(null);
    localStorage.removeItem(CompareComponent.STORAGE_KEY_A);
  }

  clearB(): void {
    this.queryB.set('');
    this.pokemonB.set(null);
    localStorage.removeItem(CompareComponent.STORAGE_KEY_B);
  }

  selectA(item: PokemonListItem): void {
    this.queryA.set(item.name);
    localStorage.setItem(CompareComponent.STORAGE_KEY_A, item.name);
    this.loadPokemon('A', item.name);
  }

  selectB(item: PokemonListItem): void {
    this.queryB.set(item.name);
    localStorage.setItem(CompareComponent.STORAGE_KEY_B, item.name);
    this.loadPokemon('B', item.name);
  }

  private solidColor(types: string[]): string {
    return types.length ? getTypeColor(types[0]) : '#CBB994';
  }

  paddedId(id: number): string {
    return formatPokemonId(id);
  }

  private totalStats(p: PokemonDetail | null): number {
    return p ? p.stats.reduce((sum, s) => sum + s.baseStat, 0) : 0;
  }

  formatDecimal(value: number): string {
    return formatDecimalPtBr(value);
  }
}
