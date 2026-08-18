import { Component, computed, effect, inject, signal, OnDestroy, AfterViewInit, NgZone, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, Subscription, catchError, filter, forkJoin, map, of, switchMap } from 'rxjs';
import { MoveDetail, PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { TeamService } from '../../core/services/team.service';
import { PageBackgroundService } from '../../core/services/page-background.service';
import { NavigationService } from '../../core/services/navigation.service';
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
  private router = inject(Router);
  private pokemonService = inject(PokemonService);
  private titleService = inject(Title);
  private pageBackground = inject(PageBackgroundService);
  private navigationService = inject(NavigationService);
  private location = inject(Location);
  private ngZone = inject(NgZone);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  favoritesService = inject(FavoritesService);
  teamService = inject(TeamService);

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
  isShiny = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('shiny') === '1')),
    { initialValue: false }
  );

  evolutions = computed(() => this.extras()?.evolutions ?? []);

  totalBaseStats = computed(() => {
    const p = this.pokemon();
    return p ? p.stats.reduce((sum, s) => sum + s.baseStat, 0) : 0;
  });

  isFavorite = computed(() => {
    const p = this.pokemon();
    return p ? this.favoritesService.isFavorite(p.id) : false;
  });

  isInTeam = computed(() => {
    const p = this.pokemon();
    return p ? this.teamService.isInTeam(p.id) : false;
  });

  teamFull = computed(() => this.teamService.isFull());

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

  movesWithDetails = signal<Map<string, MoveDetail>>(new Map());
  movesLoading = signal(false);
  abilityNames = signal<Map<string, string>>(new Map());

  moveInsights = computed(() => {
    const moves = this.pokemon()?.moves ?? [];
    const details = this.movesWithDetails();
    const withPower = moves
      .map((m) => ({ ...m, detail: details.get(m.name) }))
      .filter((m) => m.detail?.power != null && m.detail.power > 0);

    const sorted = [...withPower].sort((a, b) => (b.detail?.power ?? 0) - (a.detail?.power ?? 0));
    const best = sorted.slice(0, 3);
    const worst = sorted.filter((m) => m.detail?.power != null && m.detail.power <= 40).slice(0, 3);

    const byClass = { physical: 0, special: 0, status: 0 };
    moves.forEach((m) => {
      const dc = details.get(m.name)?.damageClass;
      if (dc === 'physical') byClass.physical++;
      else if (dc === 'special') byClass.special++;
      else if (dc === 'status') byClass.status++;
    });

    const totalMoves = moves.length;
    const physicalPct = totalMoves ? Math.round((byClass.physical / totalMoves) * 100) : 0;
    const specialPct = totalMoves ? Math.round((byClass.special / totalMoves) * 100) : 0;
    const statusPct = totalMoves ? Math.round((byClass.status / totalMoves) * 100) : 0;

    return {
      totalMoves,
      best,
      worst,
      byClass,
      physicalPct,
      specialPct,
      statusPct,
      hasBest: best.length > 0,
    };
  });

  movesByMethod = computed(() => {
    const moves = this.pokemon()?.moves ?? [];
    const details = this.movesWithDetails();
    const groups = new Map<string, { name: string; level: number; detail: MoveDetail | undefined }[]>();

    for (const move of moves) {
      const key = move.learnMethod === 'level-up' ? 'level-up' : move.learnMethod;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ name: move.name, level: move.level, detail: details.get(move.name) });
    }

    const order = ['level-up', 'machine', 'egg', 'tutor', 'form-change'];
    // Métodos fora da whitelist (raros na PokeAPI) ainda entram num grupo
    // próprio no final, senão o move fica contado no total mas não aparece
    // em nenhum acordeão.
    const extra = [...groups.keys()].filter((key) => !order.includes(key));
    return [...order, ...extra]
      .filter((key) => groups.has(key))
      .map((key) => {
        const items = groups.get(key)!;
        if (key === 'level-up') items.sort((a, b) => a.level - b.level);
        return { method: key, label: LEARN_METHOD_LABELS[key] ?? fmt.formatSlug(key), items };
      });
  });

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
    // Cancela o forkJoin anterior ao trocar de Pokémon antes dele responder,
    // senão uma resposta antiga pode sobrescrever os moves do Pokémon atual
    // (mesmo risco de race condition do id$ acima, daí o mesmo tratamento).
    let movesSub: Subscription | undefined;
    effect(() => {
      const p = this.pokemon();
      movesSub?.unsubscribe();
      if (!p) return;
      this.movesLoading.set(true);
      const moveNames = p.moves.map((m) => m.name);
      if (moveNames.length === 0) {
        this.movesLoading.set(false);
        return;
      }
      // catchError por move: um move com erro (404, rede) não deve travar o
      // loading para sempre nem impedir os demais de aparecer.
      movesSub = forkJoin(
        moveNames.map((name) => this.pokemonService.getMoveDetail(name).pipe(catchError(() => of(undefined))))
      )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((details) => {
          const map = new Map<string, MoveDetail>();
          moveNames.forEach((name, i) => {
            if (details[i]) map.set(name, details[i]!);
          });
          this.movesWithDetails.set(map);
          this.movesLoading.set(false);
        });
    });

    // Carrega nomes traduzidos das habilidades (mesmo cuidado de cancelamento e catchError acima)
    let abilitiesSub: Subscription | undefined;
    effect(() => {
      const p = this.pokemon();
      abilitiesSub?.unsubscribe();
      if (!p || p.abilities.length === 0) return;
      abilitiesSub = forkJoin(
        p.abilities.map((name) => this.pokemonService.getAbilityDisplayName(name).pipe(catchError(() => of(undefined))))
      )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((names) => {
          const map = new Map<string, string>();
          p.abilities.forEach((name, i) => {
            if (names[i]) map.set(name, names[i]!);
          });
          this.abilityNames.set(map);
        });
    });

    // Título da guia: "Pokédex | Nome (Shiny) · Aba"
    effect(() => {
      const p = this.pokemon();
      if (!p) {
        this.titleService.setTitle('Pokédex');
        return;
      }
      const shinyLabel = this.isShiny() ? ' (Shiny)' : '';
      this.titleService.setTitle(
        `Pokédex | ${fmt.capitalizeFirst(p.name)}${shinyLabel} · ${TAB_LABELS[this.activeTab()]}`
      );
    });
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

  toggleTeam(): void {
    const p = this.pokemon();
    if (!p) return;
    if (this.isInTeam()) {
      this.teamService.remove(p.id);
      this.snackBar.open(`${fmt.capitalizeFirst(p.name)} removido do time`, 'Fechar', {
        duration: 2500,
        panelClass: 'app-snackbar',
      });
      return;
    }
    if (this.teamFull()) {
      this.snackBar.open('Time cheio — remova um pokémon antes de adicionar', 'Fechar', {
        duration: 3000,
        panelClass: 'app-snackbar',
      });
      return;
    }
    this.teamService.add({ id: p.id, name: p.name, spriteUrl: p.spriteUrl });
    this.snackBar.open(`${fmt.capitalizeFirst(p.name)} adicionado ao time`, 'Ver time', {
      duration: 3000,
      panelClass: 'app-snackbar',
    }).onAction().subscribe(() => this.router.navigate(['/time']));
  }

  teamButtonLabel(): string {
    if (this.isInTeam()) return 'Remover do time';
    if (this.teamFull()) return 'Time cheio';
    return 'Adicionar ao time';
  }

  goBack(): void {
    if (this.navigationService.cameFromInside) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  toggleShiny(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { shiny: this.isShiny() ? null : '1' },
      queryParamsHandling: 'merge',
    });
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

  paddedId(id: number): string {
    return fmt.formatPokemonId(id);
  }

  formatAbility(name: string): string {
    return this.abilityNames().get(name) ?? fmt.formatSlug(name);
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
    return this.movesWithDetails().get(name)?.displayName ?? fmt.formatSlug(name);
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
      const onScroll = () => {
        const progress = Math.min(window.scrollY / 160, 1);
        this.scrollProgress.set(progress);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
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
