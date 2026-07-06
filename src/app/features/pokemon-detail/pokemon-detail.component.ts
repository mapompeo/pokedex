import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { EvolutionNode, PokemonDetail } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TypeBadgeComponent } from '../../shared/components/type-badge/type-badge.component';
import { getSolidCardColor } from '../../shared/type-colors';
import { getStatPercent } from '../../shared/stat-utils';
import { getStatColor, getStatLabel } from '../../shared/stat-labels';
import { formatDecimalPtBr, formatSlug } from '../../shared/format-utils';

const DETAIL_STAT_MAX = 300;

type DetailTab = 'sobre' | 'stats' | 'evolucao';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [RouterLink, MatIconModule, LoadingSpinnerComponent, TypeBadgeComponent],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
})
export class PokemonDetailComponent {
  private route = inject(ActivatedRoute);
  private pokemonService = inject(PokemonService);
  favoritesService = inject(FavoritesService);

  pokemon = signal<PokemonDetail | null>(null);
  loading = signal(true);
  statMax = DETAIL_STAT_MAX;

  activeTab = signal<DetailTab>('sobre');
  evolutions = signal<EvolutionNode[]>([]);
  evolutionsLoading = signal(true);

  isFavorite = computed(() => {
    const p = this.pokemon();
    return p ? this.favoritesService.isFavorite(p.id) : false;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.pokemonService.getPokemonDetail(id).subscribe({
      next: (detail) => {
        this.pokemon.set(detail);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.pokemonService.getEvolutionChain(id).subscribe({
      next: (evolutions) => {
        this.evolutions.set(evolutions);
        this.evolutionsLoading.set(false);
      },
      error: () => this.evolutionsLoading.set(false),
    });
  }

  toggleFavorite(): void {
    const p = this.pokemon();
    if (p) {
      this.favoritesService.toggleFavorite(p.id);
    }
  }

  typeColor(): string {
    return getSolidCardColor(this.pokemon()?.types ?? []);
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
    return formatDecimalPtBr(value);
  }

  formatAbility(name: string): string {
    return formatSlug(name);
  }
}
