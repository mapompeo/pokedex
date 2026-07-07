import { Component, computed, effect, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { EvolutionStage, PokemonDetail } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { getPastelCardColor, getTypeColor } from '../../shared/type-colors';
import { getStatPercent } from '../../shared/stat-utils';
import { getStatColor, getStatLabel } from '../../shared/stat-labels';
import * as fmt from '../../shared/format-utils';

const DETAIL_STAT_MAX = 300;

type DetailTab = 'sobre' | 'estatisticas' | 'evolucoes' | 'movimentos';

const TAB_LABELS: Record<DetailTab, string> = {
  sobre: 'Sobre',
  estatisticas: 'Estatísticas',
  evolucoes: 'Evoluções',
  movimentos: 'Movimentos',
};

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [RouterLink, MatIconModule, LoadingSpinnerComponent, TypeBadgeComponent],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
})
export class PokemonDetailComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private pokemonService = inject(PokemonService);
  private titleService = inject(Title);
  favoritesService = inject(FavoritesService);

  pokemon = signal<PokemonDetail | null>(null);
  loading = signal(true);
  statMax = DETAIL_STAT_MAX;

  activeTab = signal<DetailTab>('sobre');
  evolutions = signal<EvolutionStage[]>([]);
  evolutionsLoading = signal(true);
  description = signal('');
  category = signal('');
  captureRate = signal(0);
  baseHappiness = signal(0);
  growthRate = signal('');
  eggGroups = signal<string[]>([]);
  genderRate = signal(0);
  habitat = signal<string | null>(null);
  color = signal('');
  shape = signal<string | null>(null);
  isLegendary = signal(false);
  isMythical = signal(false);
  isBaby = signal(false);
  generation = signal('');

  totalBaseStats = computed(() => {
    const p = this.pokemon();
    return p ? p.stats.reduce((sum, s) => sum + s.baseStat, 0) : 0;
  });

  isFavorite = computed(() => {
    const p = this.pokemon();
    return p ? this.favoritesService.isFavorite(p.id) : false;
  });

  constructor() {
    // Reage a cada mudança de :id (o Angular reaproveita este componente ao
    // navegar entre /pokemon/:id, então snapshot no construtor não bastaria).
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });

    // Título da guia: "Pokédex | Nome · Aba"
    effect(() => {
      const p = this.pokemon();
      this.titleService.setTitle(
        p ? `Pokédex | ${this.capitalize(p.name)} · ${TAB_LABELS[this.activeTab()]}` : 'Pokédex'
      );
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.evolutionsLoading.set(true);
    this.pokemonService.getPokemonDetail(id).subscribe({
      next: (detail) => {
        this.pokemon.set(detail);
        this.loading.set(false);
        this.setAppBg(detail.types);
      },
      error: () => this.loading.set(false),
    });
    this.pokemonService.getPokemonExtras(id).subscribe({
      next: (extras) => {
        this.evolutions.set(extras.evolutions);
        this.description.set(extras.description);
        this.category.set(extras.category);
        this.captureRate.set(extras.captureRate);
        this.baseHappiness.set(extras.baseHappiness);
        this.growthRate.set(extras.growthRate);
        this.eggGroups.set(extras.eggGroups);
        this.genderRate.set(extras.genderRate);
        this.habitat.set(extras.habitat);
        this.color.set(extras.color);
        this.shape.set(extras.shape);
        this.isLegendary.set(extras.isLegendary);
        this.isMythical.set(extras.isMythical);
        this.isBaby.set(extras.isBaby);
        this.generation.set(extras.generation);
        this.evolutionsLoading.set(false);
      },
      error: () => this.evolutionsLoading.set(false),
    });
  }

  private capitalize(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private appBgColor = '';

  private setAppBg(types: string[]): void {
    this.appBgColor = getPastelCardColor(types);
    document.body.style.background = this.appBgColor;
  }

  ngOnDestroy(): void {
    document.body.style.background = '';
    this.titleService.setTitle('Pokédex');
  }

  toggleFavorite(): void {
    const p = this.pokemon();
    if (p) {
      this.favoritesService.toggleFavorite(p.id);
    }
  }

  paddedId(id: number): string {
    return String(id).padStart(3, '0');
  }

  typeColor(): string {
    return getPastelCardColor(this.pokemon()?.types ?? []);
  }

  solidColor(): string {
    const types = this.pokemon()?.types;
    return types?.length ? getTypeColor(types[0]) : '#CBB994';
  }

  statPercent(value: number): number {
    return getStatPercent(value, DETAIL_STAT_MAX);
  }

  statLabel(name: string): string {
    return getStatLabel(name);
  }

  statColor(name: string): string {
    return getStatColor(name);
  }

  formatDecimal(value: number): string {
    return fmt.formatDecimalPtBr(value);
  }

  formatAbility(name: string): string {
    return fmt.formatSlug(name);
  }

  generationLabel(gen: string): string {
    return fmt.formatGeneration(gen);
  }

  genderLabel(rate: number): string {
    return fmt.formatGenderRate(rate);
  }

  growthLabel(rate: string): string {
    return fmt.formatGrowthRate(rate);
  }

  habitatLabel(habitat: string): string {
    return fmt.formatHabitat(habitat);
  }

  eggGroupLabel(group: string): string {
    return fmt.formatEggGroup(group);
  }

  formatMoveName(name: string): string {
    return fmt.formatSlug(name);
  }

  learnMethodLabel(method: string): string {
    switch (method) {
      case 'level-up': return 'Nível';
      case 'egg': return 'Ovo';
      case 'machine': return 'TM';
      case 'tutor': return 'Tutor';
      case 'form-change': return 'Mud. Forma';
      default: return method;
    }
  }

  playCry(): void {
    const p = this.pokemon();
    if (!p) return;
    const audio = new Audio(p.cryUrl);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }
}
