import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PokemonListItem } from '../../../core/models/pokemon.model';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import { getPastelCardColor } from '../../type-colors';
import { formatPokemonId } from '../../format-utils';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [RouterLink, MatIconModule, TypeBadgeComponent],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
})
export class PokemonCardComponent {
  pokemon = input.required<PokemonListItem>();
  isFavorite = input(false);
  types = input<string[]>([]);
  /** false esconde o botão de favorito (ex.: no card do time, onde não faz sentido). */
  showFavorite = input(true);

  favoriteToggled = output<number>();

  get cardColor(): string {
    return getPastelCardColor(this.types());
  }

  get paddedId(): string {
    return formatPokemonId(this.pokemon().id);
  }
}
