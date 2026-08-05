import { AfterViewInit, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { trigger, transition, style, animate } from '@angular/animations';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonDetail, PokemonListItem } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { PokemonPickerComponent } from '../../shared/components/pokemon-picker/pokemon-picker.component';
import { getCapBackground, getTypeColor } from '../../shared/type-colors';
import { getStatPercent } from '../../shared/stat-utils';
import { getStatLabel } from '../../shared/stat-labels';
import { formatDecimalPtBr } from '../../shared/format-utils';

@Component({
  selector: 'app-compare',
  standalone: true,
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
    this.pokemonService.getAllPokemonListItems().subscribe((items) => {
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
    this.pokemonService.getPokemonDetail(name).subscribe({
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
    const shuffled = [...this.exampleNames].sort(() => Math.random() - 0.5);
    let nameIdx = 0;
    let charIdx = 0;
    let deleting = false;
    const setter = side === 'A' ? this.placeholderA : this.placeholderB;

    const tick = () => {
      const name = shuffled[nameIdx % shuffled.length];
      if (!deleting) {
        charIdx++;
        setter.set(name.slice(0, charIdx));
        if (charIdx === name.length) {
          this.typingTimers.push(setTimeout(tick, 1800));
          deleting = true;
          return;
        }
        this.typingTimers.push(setTimeout(tick, 90 + Math.random() * 60));
      } else {
        charIdx--;
        setter.set(name.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          nameIdx++;
          this.typingTimers.push(setTimeout(tick, 500));
          return;
        }
        this.typingTimers.push(setTimeout(tick, 50 + Math.random() * 30));
      }
    };
    this.typingTimers.push(setTimeout(tick, 600 + (side === 'B' ? 400 : 0)));
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

  winnerStat(statName: string): 'a' | 'b' | 'tie' {
    const a = this.pokemonA()?.stats.find((s) => s.name === statName)?.baseStat ?? 0;
    const b = this.pokemonB()?.stats.find((s) => s.name === statName)?.baseStat ?? 0;
    if (a > b) return 'a';
    if (b > a) return 'b';
    return 'tie';
  }

  statPercentA(name: string): number {
    const s = this.pokemonA()?.stats.find((st) => st.name === name);
    return s ? getStatPercent(s.baseStat) : 0;
  }

  statPercentB(name: string): number {
    const s = this.pokemonB()?.stats.find((st) => st.name === name);
    return s ? getStatPercent(s.baseStat) : 0;
  }

  statValueA(name: string): number {
    return this.pokemonA()?.stats.find((st) => st.name === name)?.baseStat ?? 0;
  }

  statValueB(name: string): number {
    return this.pokemonB()?.stats.find((st) => st.name === name)?.baseStat ?? 0;
  }

  capBackground(types: string[]): string {
    return getCapBackground(types);
  }

  solidColor(types: string[]): string {
    return types.length ? getTypeColor(types[0]) : '#CBB994';
  }

  paddedId(id: number): string {
    return String(id).padStart(3, '0');
  }

  statLabel(name: string): string {
    return getStatLabel(name);
  }

  totalStats(p: PokemonDetail | null): number {
    return p ? p.stats.reduce((sum, s) => sum + s.baseStat, 0) : 0;
  }

  formatDecimal(value: number): string {
    return formatDecimalPtBr(value);
  }
}
