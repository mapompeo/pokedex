import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { PokemonService } from '../../core/services/pokemon.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonDetail } from '../../core/models/pokemon.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatChipsModule, LoadingSpinnerComponent],
  templateUrl: './pokemon-detail.component.html',
  styleUrl: './pokemon-detail.component.scss',
})
export class PokemonDetailComponent {
  private route = inject(ActivatedRoute);
  private pokemonService = inject(PokemonService);
  favoritesService = inject(FavoritesService);

  pokemon = signal<PokemonDetail | null>(null);
  loading = signal(true);

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
  }

  toggleFavorite(): void {
    const p = this.pokemon();
    if (p) {
      this.favoritesService.toggleFavorite(p.id);
    }
  }
}
