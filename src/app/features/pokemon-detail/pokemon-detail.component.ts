import { Component, computed, effect, inject, signal, OnDestroy, AfterViewInit, ElementRef, NgZone, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EMPTY, catchError, filter, forkJoin, map, switchMap } from 'rxjs';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PageBackgroundService } from '../../core/services/page-background.service';
import { PokemonDetail, PokemonExtras } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { RadarChartComponent } from '../../shared/components/radar-chart/radar-chart.component';
import { getPastelCardColor, getTypeColor } from '../../shared/type-colors';
import { getStatPercent } from '../../shared/stat-utils';
import { getStatColor, getStatLabel } from '../../shared/stat-labels';
import { getEffectivenessSummary } from '../../shared/type-chart';
import { tabFade } from '../../shared/animations';
import * as fmt from '../../shared/format-utils';

const DETAIL_STAT_MAX = 300;

type DetailTab = 'sobre' | 'estatisticas' | 'evolucoes' | 'movimentos';

const TAB_LABELS: Record<DetailTab, string> = {
  sobre: 'Sobre',
  estatisticas: 'Estatísticas',
  evolucoes: 'Evoluções',
  movimentos: 'Movimentos',
};

const LEARN_METHOD_LABELS: Record<string, string> = {
  'level-up': 'Nível',
  egg: 'Ovo',
  machine: 'TM',
  tutor: 'Tutor',
  'form-change': 'Mud. Forma',
};

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatTooltipModule, LoadingSpinnerComponent, TypeBadgeComponent, RadarChartComponent],
  animations: [tabFade],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
})
export class PokemonDetailComponent implements OnDestroy, AfterViewInit {
  private route = inject(ActivatedRoute);
  private pokemonService = inject(PokemonService);
  private titleService = inject(Title);
  private pageBackground = inject(PageBackgroundService);
  private el = inject(ElementRef);
  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);
  favoritesService = inject(FavoritesService);

  pokemon = signal<PokemonDetail | null>(null);
  loading = signal(true);
  error = signal(false);
  scrollProgress = signal(0);

  activeTab = signal<DetailTab>('sobre');
  activeTabIndex = computed(() => {
    const map: Record<DetailTab, number> = { sobre: 0, estatisticas: 1, evolucoes: 2, movimentos: 3 };
    return map[this.activeTab()] ?? 0;
  });
  evolutionsLoading = signal(true);
  extras = signal<PokemonExtras | null>(null);

  evolutions = computed(() => this.extras()?.evolutions ?? []);

  totalBaseStats = computed(() => {
    const p = this.pokemon();
    return p ? p.stats.reduce((sum, s) => sum + s.baseStat, 0) : 0;
  });

  isFavorite = computed(() => {
    const p = this.pokemon();
    return p ? this.favoritesService.isFavorite(p.id) : false;
  });

  prevId = computed(() => {
    const p = this.pokemon();
    return p && p.id > 1 ? p.id - 1 : null;
  });

  nextId = computed(() => {
    const p = this.pokemon();
    return p && p.id < 1025 ? p.id + 1 : null;
  });

  effectivenessSummary = computed(() => {
    const p = this.pokemon();
    return p ? getEffectivenessSummary(p.types) : [];
  });

  effectivenessGroups = computed(() => {
    const summary = this.effectivenessSummary();
    const multipliers = [0, 0.25, 0.5, 2, 4];
    const groups: { multiplier: number; types: string[] }[] = [];
    for (const m of multipliers) {
      const types = summary.filter((e) => e.multiplier === m).map((e) => e.type);
      if (types.length) {
        groups.push({ multiplier: m, types });
      }
    }
    return groups;
  });

  movesWithDetails = signal<Map<string, { power: number | null; accuracy: number | null; pp: number | null; damageClass: string | null }>>(new Map());
  movesLoading = signal(false);

  constructor() {
    // Reage a cada mudança de :id (o Angular reaproveita este componente ao
    // navegar entre /pokemon/:id, então snapshot no construtor não bastaria).
    // switchMap cancela a requisição anterior quando o :id muda antes dela
    // responder, evitando que uma resposta antiga sobrescreva a mais nova.
    const id$ = this.route.paramMap.pipe(
      map((params) => params.get('id')),
      filter((id): id is string => !!id)
    );

    id$
      .pipe(
        switchMap((id) => {
          this.loading.set(true);
          this.error.set(false);
          return this.pokemonService.getPokemonDetail(id).pipe(
            catchError(() => {
              this.loading.set(false);
              this.error.set(true);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((detail) => {
        this.pokemon.set(detail);
        this.loading.set(false);
        this.error.set(false);
        this.setAppBg(detail.types);
      });

    id$
      .pipe(
        switchMap((id) => {
          this.evolutionsLoading.set(true);
          this.extras.set(null);
          return this.pokemonService.getPokemonExtras(id).pipe(
            catchError(() => {
              this.evolutionsLoading.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((extras) => {
        this.extras.set(extras);
        this.evolutionsLoading.set(false);
      });

    // Carrega detalhes dos movimentos
    effect(() => {
      const p = this.pokemon();
      if (!p) return;
      this.movesLoading.set(true);
      const moveNames = p.moves.map((m) => m.name);
      if (moveNames.length === 0) {
        this.movesLoading.set(false);
        return;
      }
      forkJoin(moveNames.map((name) => this.pokemonService.getMoveDetail(name)))
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((details) => {
          const map = new Map<string, { power: number | null; accuracy: number | null; pp: number | null; damageClass: string | null }>();
          moveNames.forEach((name, i) => map.set(name, details[i]));
          this.movesWithDetails.set(map);
          this.movesLoading.set(false);
        });
    });

    // Título da guia: "Pokédex | Nome · Aba"
    effect(() => {
      const p = this.pokemon();
      this.titleService.setTitle(
        p ? `Pokédex | ${this.capitalize(p.name)} · ${TAB_LABELS[this.activeTab()]}` : 'Pokédex'
      );
    });
  }

  private capitalize(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private setAppBg(types: string[]): void {
    this.pageBackground.color.set(getPastelCardColor(types));
  }

  ngOnDestroy(): void {
    this.pageBackground.color.set(null);
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
    return LEARN_METHOD_LABELS[method] ?? method;
  }

  damageClassIcon(move: { name: string }): string {
    const detail = this.movesWithDetails().get(move.name);
    switch (detail?.damageClass) {
      case 'physical': return 'handyman';
      case 'special': return 'auto_fix_high';
      case 'status': return 'psychology';
      default: return 'help_outline';
    }
  }

  damageClassLabel(move: { name: string }): string {
    const detail = this.movesWithDetails().get(move.name);
    switch (detail?.damageClass) {
      case 'physical': return 'Físico';
      case 'special': return 'Especial';
      case 'status': return 'Status';
      default: return '—';
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const el = this.el.nativeElement as HTMLElement;
      const scrollEl = el.closest('[data-scroll-root]') ?? el;
      scrollEl.addEventListener('scroll', () => {
        const progress = Math.min(scrollEl.scrollTop / 160, 1);
        this.scrollProgress.set(progress);
      }, { passive: true });
    });
  }

  playCry(): void {
    const p = this.pokemon();
    if (!p) return;
    const audio = new Audio(p.cryUrl);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }
}
