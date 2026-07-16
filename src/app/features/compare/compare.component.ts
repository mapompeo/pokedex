import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonDetail, PokemonListItem } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { getCapBackground, getTypeColor } from '../../shared/type-colors';
import { getStatPercent } from '../../shared/stat-utils';
import { getStatLabel } from '../../shared/stat-labels';
import { formatDecimalPtBr } from '../../shared/format-utils';

const MAX_SUGGESTIONS = 8;

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [MatIconModule, MatAutocompleteModule, LoadingSpinnerComponent, TypeBadgeComponent],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.scss',
})
export class CompareComponent implements AfterViewInit, OnDestroy {
  private pokemonService = inject(PokemonService);

  @ViewChild('dotsRef') dotsRef!: ElementRef<HTMLDivElement>;

  allNames = signal<PokemonListItem[]>([]);

  queryA = signal('');
  queryB = signal('');

  pokemonA = signal<PokemonDetail | null>(null);
  pokemonB = signal<PokemonDetail | null>(null);
  loadingA = signal(false);
  loadingB = signal(false);
  errorA = signal(false);
  errorB = signal(false);

  activeDot = signal(0);

  placeholderA = signal('');
  placeholderB = signal('');

  suggestionsA = computed(() => this.suggestionsFor(this.queryA()));
  suggestionsB = computed(() => this.suggestionsFor(this.queryB()));

  private typingTimers: ReturnType<typeof setTimeout>[] = [];
  private exampleNames = [
    'Pikachu', 'Charizard', 'Bulbasaur', 'Squirtle', 'Mewtwo',
    'Gengar', 'Lucario', 'Eevee', 'Dragonite', 'Gyarados',
    'Snorlax', 'Greninja', 'Sylveon', 'Arcanine', 'Blaziken',
  ];

  constructor() {
    this.pokemonService.getAllPokemonListItems().subscribe((items) => this.allNames.set(items));
  }

  ngAfterViewInit(): void {
    this.startTyping('A');
    this.startTyping('B');

    const grid = document.querySelector('.compare__grid');
    if (grid) {
      grid.addEventListener('scroll', () => {
        const scrollLeft = grid.scrollLeft;
        const cardWidth = (grid as HTMLElement).querySelector('.compare__card')?.getBoundingClientRect().width ?? 1;
        const index = Math.round(scrollLeft / cardWidth);
        this.activeDot.set(Math.min(index, 1));
      });
    }
  }

  ngOnDestroy(): void {
    this.typingTimers.forEach(t => clearTimeout(t));
  }

  scrollToCard(index: number): void {
    const grid = document.querySelector('.compare__grid');
    if (!grid) return;
    const cards = grid.querySelectorAll('.compare__card');
    const card = cards[index];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
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
    this.errorA.set(false);
    this.pokemonService.getPokemonDetail(item.name).subscribe({
      next: (detail) => {
        this.pokemonA.set(detail);
        this.loadingA.set(false);
      },
      error: () => {
        this.loadingA.set(false);
        this.errorA.set(true);
      },
    });
  }

  selectB(item: PokemonListItem): void {
    this.queryB.set(item.name);
    this.loadingB.set(true);
    this.errorB.set(false);
    this.pokemonService.getPokemonDetail(item.name).subscribe({
      next: (detail) => {
        this.pokemonB.set(detail);
        this.loadingB.set(false);
      },
      error: () => {
        this.loadingB.set(false);
        this.errorB.set(true);
      },
    });
  }

  isStatHigher(current: PokemonDetail | null, statName: string): boolean {
    if (!current || !this.pokemonA() || !this.pokemonB()) return false;
    const other = this.pokemonA() === current ? this.pokemonB()! : this.pokemonA()!;
    const currentVal = current.stats.find((s) => s.name === statName)?.baseStat ?? 0;
    const otherVal = other.stats.find((s) => s.name === statName)?.baseStat ?? 0;
    return currentVal > otherVal;
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

  statPercent(value: number): number {
    return getStatPercent(value);
  }

  statLabel(name: string): string {
    return getStatLabel(name);
  }

  formatDecimal(value: number): string {
    return formatDecimalPtBr(value);
  }
}
