import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonListItem } from '../../core/models/pokemon.model';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink, MatButtonModule, PokemonCardComponent, LoadingSpinnerComponent],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent {
  favoritesService = inject(FavoritesService);
  private pokemonService = inject(PokemonService);

  items = signal<PokemonListItem[]>([]);
  loading = signal(false);

  constructor() {
    effect(() => {
      const ids = [...this.favoritesService.favoriteIds()];
      if (ids.length === 0) {
        this.items.set([]);
        return;
      }
      this.loading.set(true);
      const requests = ids.map((id) => this.pokemonService.getPokemonDetail(String(id)));
      forkJoin(requests).subscribe({
        next: (details) => {
          this.items.set(details.map((d) => ({ id: d.id, name: d.name, spriteUrl: d.spriteUrl })));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  onFavoriteToggled(id: number): void {
    this.favoritesService.toggleFavorite(id);
  }
}
