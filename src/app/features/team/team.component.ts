import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkDrag, CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TeamService, TEAM_MAX_SIZE } from '../../core/services/team.service';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonListItem, PokemonStat } from '../../core/models/pokemon.model';
import { getTypeColor } from '../../shared/type-colors';
import { getTypeNamePt } from '../../shared/type-translations';
import { TYPE_CHART, getDefenseMultiplier } from '../../shared/type-chart';
import { loadDataParts } from '../../shared/load-data-parts';
import { capitalizeFirst, formatPokemonId } from '../../shared/format-utils';
import { getStatLabel } from '../../shared/stat-labels';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PokemonPickerComponent } from '../../shared/components/pokemon-picker/pokemon-picker.component';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';

const ATTACKING_TYPES = Object.keys(TYPE_CHART);

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    MatIconModule,
    MatTooltipModule,
    TypeBadgeComponent,
    DragDropModule,
    LoadingSpinnerComponent,
    PokemonPickerComponent,
    PokemonCardComponent,
  ],
  templateUrl: './team.component.html',
  styleUrl: './team.component.scss',
})
export class TeamComponent {
  teamService = inject(TeamService);
  private pokemonService = inject(PokemonService);
  private snackBar = inject(MatSnackBar);

  maxSize = TEAM_MAX_SIZE;

  typesById = signal<Map<number, string[]>>(new Map());
  allNames = signal<PokemonListItem[]>([]);
  statsById = signal<Map<number, PokemonStat[]>>(new Map());
  pickerOpen = signal(false);
  pickerPreselect = signal<string[]>([]);
  analysisId = signal<number | null>(null);
  surpriseLoading = signal(false);
  confirmClear = signal(false);
  typeTableOpen = signal(false);
  replacingIndex = signal<number | null>(null);
  confirmRemoveId = signal<number | null>(null);
  dataLoading = signal(true);
  dataError = signal(false);

  allTypes = ATTACKING_TYPES;

  slots = computed(() => {
    const team = this.teamService.team();
    const slots: (PokemonListItem | null)[] = [];
    for (let i = 0; i < TEAM_MAX_SIZE; i++) {
      slots.push(team[i] ?? null);
    }
    return slots;
  });

  teamCoverage = computed(() => {
    const team = this.teamService.team();
    if (team.length === 0) return null;
    const byId = this.typesById();
    if (team.some((m) => (byId.get(m.id)?.length ?? 0) === 0)) return null;

    const size = team.length;
    const weakThreshold = Math.max(1, Math.floor(size / 2));
    const resistThreshold = Math.max(1, Math.ceil(size / 2));

    const rows = ATTACKING_TYPES.map((type) => {
      let weak = 0;
      let resist = 0;
      for (const member of team) {
        const types = byId.get(member.id) ?? [];
        const mult = getDefenseMultiplier(type, types);
        if (mult > 1) weak++;
        else if (mult < 1) resist++;
      }
      return { type, weak, resist };
    });

    return {
      size,
      weakThreshold,
      resistThreshold,
      all: rows,
      weaknesses: rows.filter((r) => r.weak >= weakThreshold).sort((a, b) => b.weak - a.weak).slice(0, 6),
      resistances: rows.filter((r) => r.resist >= resistThreshold).sort((a, b) => b.resist - a.resist).slice(0, 6),
    };
  });

  /** Tipos que nenhum membro acerta super efetivo com golpes STAB (mesmo tipo). */
  offensiveGaps = computed(() => {
    const team = this.teamService.team();
    if (team.length === 0) return null;
    const byId = this.typesById();
    if (team.some((m) => (byId.get(m.id)?.length ?? 0) === 0)) return null;

    const memberTypes = team.flatMap((m) => byId.get(m.id) ?? []);
    const isCovered = (target: string) =>
      memberTypes.some((atk) => (TYPE_CHART[atk]?.[target] ?? 1) > 1);

    return {
      gaps: ATTACKING_TYPES.filter((t) => !isCovered(t)),
      coveredCount: ATTACKING_TYPES.filter(isCovered).length,
      total: ATTACKING_TYPES.length,
    };
  });

  /** Sugere tipos de Pokémon que resistem à maior fraqueza do time. */
  coverageTip = computed(() => {
    const cov = this.teamCoverage();
    if (!cov || cov.weaknesses.length === 0) return null;
    const top = cov.weaknesses[0];
    const counters = ATTACKING_TYPES.filter((t) => (TYPE_CHART[top.type]?.[t] ?? 1) < 1).slice(0, 3);
    if (counters.length === 0) return null;
    return { weakness: top.type, counters };
  });

  // Guarda quais membros já tiveram a busca de stats disparada, fora de um
  // signal: se o effect abaixo checasse statsById() (que ele mesmo escreve)
  // para decidir quem já foi pedido, cada resposta que chega faria o effect
  // reexecutar e disparar de novo a requisição dos membros ainda em voo.
  private requestedStatIds = new Set<number>();

  constructor() {
    this.loadData();

    effect(() => {
      const team = this.teamService.team();
      for (const member of team) {
        if (this.requestedStatIds.has(member.id)) continue;
        this.requestedStatIds.add(member.id);
        this.pokemonService.getPokemonDetail(String(member.id)).subscribe({
          next: (d) => {
            this.statsById.update((map) => {
              if (map.has(d.id)) return map;
              const next = new Map(map);
              next.set(d.id, d.stats);
              return next;
            });
          },
          // Libera o id para tentar de novo no próximo disparo do effect
          // (ex.: membro removido e adicionado de volta), em vez de deixar
          // o membro permanentemente sem stats após uma falha de rede.
          error: () => {
            this.requestedStatIds.delete(member.id);
          },
        });
      }
    });
  }

  loadData(): void {
    loadDataParts(
      [
        { obs: this.pokemonService.getAllPokemonListItems(), apply: (items) => this.allNames.set(items) },
        { obs: this.pokemonService.getTypesByPokemonId(), apply: (map) => this.typesById.set(map) },
      ],
      this.dataLoading,
      this.dataError
    );
  }

  openPicker(): void {
    this.replacingIndex.set(null);
    this.pickerPreselect.set([]);
    this.pickerOpen.set(true);
  }

  openReplace(index: number): void {
    this.replacingIndex.set(index);
    this.pickerPreselect.set([]);
    this.pickerOpen.set(true);
  }

  /** Abre o picker já filtrado pelos tipos que cobrem a maior fraqueza do time. */
  openTipPicker(counters: string[]): void {
    this.replacingIndex.set(null);
    this.pickerPreselect.set(counters);
    this.pickerOpen.set(true);
  }

  /** Preenche os slots vazios com Pokémon aleatórios ainda não usados. */
  surprise(): void {
    const team = this.teamService.team();
    const fill = TEAM_MAX_SIZE - team.length;
    if (fill <= 0) {
      this.snackBar.open('Seu time já está cheio', 'Fechar', {
        duration: 2000,
        panelClass: 'app-snackbar',
      });
      return;
    }
    const pool = this.allNames().filter((p) => !this.teamService.isInTeam(p.id));
    if (pool.length === 0) return;
    this.surpriseLoading.set(true);
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    for (const pick of shuffled.slice(0, fill)) {
      this.teamService.add(pick);
    }
    this.surpriseLoading.set(false);
  }

  closePicker(): void {
    this.pickerOpen.set(false);
    this.replacingIndex.set(null);
    this.pickerPreselect.set([]);
  }

  teamExcludeIds(): number[] {
    return this.teamService.team().map((m) => m.id);
  }

  handlePicked(item: PokemonListItem): void {
    const index = this.replacingIndex();
    if (this.teamService.isInTeam(item.id)) {
      this.snackBar.open(`${capitalizeFirst(item.name)} já está no seu time`, 'Fechar', {
        duration: 2500,
        panelClass: 'app-snackbar',
      });
      return;
    }
    const ok = index !== null ? this.teamService.replace(index, item) : this.teamService.add(item);
    if (ok) {
      this.closePicker();
    }
  }

  requestRemove(id: number): void {
    this.confirmRemoveId.set(id);
  }

  cancelRemove(): void {
    this.confirmRemoveId.set(null);
  }

  confirmRemove(): void {
    const id = this.confirmRemoveId();
    if (id !== null) {
      this.teamService.remove(id);
    }
    this.confirmRemoveId.set(null);
  }

  requestClear(): void {
    this.confirmClear.set(true);
  }

  cancelClear(): void {
    this.confirmClear.set(false);
  }

  confirmClearTeam(): void {
    this.teamService.clear();
    this.confirmClear.set(false);
  }

  memberName(id: number): string {
    const name = this.teamService.team().find((m) => m.id === id)?.name;
    return name ? capitalizeFirst(name) : '';
  }

  memberSprite(id: number): string {
    return this.teamService.team().find((m) => m.id === id)?.spriteUrl ?? '';
  }

  onDrop(event: CdkDragDrop<unknown>): void {
    // Lê a ordem visual FINAL de todos os 6 slots (incluindo os vazios, data null).
    // Isso dispensa o índice do CDK, que falha em grids, e permite reposicionar
    // também "para dentro" de posições vazias.
    const ordered = (event.container.getSortedItems() as CdkDrag<PokemonListItem | null>[]).map((d) => d.data);
    this.teamService.setTeam(ordered.filter((x): x is PokemonListItem => !!x));
  }

  /** Soma dos status de todos os membros (status total do time). */
  totalPower = computed(() => {
    const team = this.teamService.team();
    if (team.length === 0) return 0;
    const stats = this.statsById();
    return team.reduce((sum, m) => sum + (stats.get(m.id) ?? []).reduce((s, st) => s + st.baseStat, 0), 0);
  });

  bstOf(id: number): number {
    return (this.statsById().get(id) ?? []).reduce((s, st) => s + st.baseStat, 0);
  }

  /** Quantos membros do time têm cada tipo. */
  composition = computed(() => {
    const byId = this.typesById();
    return ATTACKING_TYPES.map((type) => ({
      type,
      count: this.teamService.team().reduce((n, m) => (byId.get(m.id)?.includes(type) ? n + 1 : n), 0),
    })).filter((c) => c.count > 0);
  });

  /** Fraquezas, resistências e tipos que o membro golpeia com vantagem. */
  memberCoverage(id: number): { weaknesses: { type: string; mult: number }[]; resistances: { type: string; mult: number }[]; offenses: string[] } {
    const types = this.typesById().get(id) ?? [];
    if (types.length === 0) return { weaknesses: [], resistances: [], offenses: [] };
    const rows = ATTACKING_TYPES.map((type) => ({ type, mult: getDefenseMultiplier(type, types) }));
    const covered = new Set<string>();
    for (const atk of types) {
      for (const target of ATTACKING_TYPES) {
        if ((TYPE_CHART[atk]?.[target] ?? 1) > 1) covered.add(target);
      }
    }
    return {
      weaknesses: rows.filter((r) => r.mult > 1).sort((a, b) => b.mult - a.mult),
      resistances: rows.filter((r) => r.mult < 1).sort((a, b) => a.mult - b.mult),
      offenses: ATTACKING_TYPES.filter((t) => covered.has(t)),
    };
  }

  statLabel(name: string): string {
    return getStatLabel(name);
  }

  /** Percentual do valor máximo possível (255) para dimensionar a barra. */
  statPct(value: number): number {
    return Math.min(100, Math.round((value / 255) * 100));
  }

  openAnalysis(id: number): void {
    this.analysisId.set(id);
  }

  closeAnalysis(): void {
    this.analysisId.set(null);
  }

  openReplaceFor(id: number): void {
    const index = this.teamService.team().findIndex((m) => m.id === id);
    this.analysisId.set(null);
    if (index !== -1) this.openReplace(index);
  }

  /** Remove o membro analisado, passando para a confirmação centralizada. */
  analysisRemove(): void {
    const id = this.analysisId();
    this.analysisId.set(null);
    if (id !== null) this.requestRemove(id);
  }


  typeColor(type: string): string {
    return getTypeColor(type);
  }

  typeNamePt(type: string): string {
    return getTypeNamePt(type);
  }

  typeAbbr(type: string): string {
    return getTypeNamePt(type).slice(0, 3).toUpperCase();
  }

  /** Maior atributo base do Pokémon (para destacar o ponto forte). */
  statBest(stats: PokemonStat[]): number {
    return stats.reduce((max, s) => Math.max(max, s.baseStat), 0);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.analysisId() !== null) {
      this.closeAnalysis();
    } else if (this.confirmClear()) {
      this.cancelClear();
    } else if (this.confirmRemoveId() !== null) {
      this.cancelRemove();
    }
  }

  paddedId(id: number): string {
    return formatPokemonId(id);
  }
}
