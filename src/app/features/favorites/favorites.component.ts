import { Component, inject, signal } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { FavoritesService } from '../../core/services/favorites.service';
import { PokemonService } from '../../core/services/pokemon.service';
import { PokemonListItem } from '../../core/models/pokemon.model';
import { PokemonCardComponent } from '../../shared/components/pokemon-card/pokemon-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [PokemonCardComponent, LoadingSpinnerComponent, MatIconModule],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent {
  favoritesService = inject(FavoritesService);
  private pokemonService = inject(PokemonService);

  items = signal<PokemonListItem[]>([]);
  loading = signal(false);
  error = signal(false);
  typesById = signal<Map<number, string[]>>(new Map());
  private reload = signal(0);

  constructor() {
    // Dispara quando os favoritos mudam OU quando o usuário pede retry.
    // switchMap cancela a busca anterior se algo mudar antes dela responder.
    combineLatest([toObservable(this.favoritesService.favoriteIds), toObservable(this.reload)])
      .pipe(
        switchMap(([idsSet]) => {
          const ids = [...idsSet];
          if (ids.length === 0) {
            return of({ items: [] as PokemonListItem[], typesById: new Map<number, string[]>() });
          }
          this.loading.set(true);
          this.error.set(false);
          const requests = ids.map((id) => this.pokemonService.getPokemonDetail(String(id)));
          return forkJoin(requests).pipe(
            map((details) => ({
              items: details.map((d) => ({ id: d.id, name: d.name, spriteUrl: d.spriteUrl })),
              typesById: new Map(details.map((d) => [d.id, d.types])),
            }))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: ({ items, typesById }) => {
          this.items.set(items);
          this.typesById.set(typesById);
          this.loading.set(false);
          this.error.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  retry(): void {
    this.reload.update((n) => n + 1);
  }

  onFavoriteToggled(id: number): void {
    this.favoritesService.toggleFavorite(id);
  }
}
