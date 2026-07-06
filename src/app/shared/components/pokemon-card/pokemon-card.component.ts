import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PokemonListItem } from '../../../core/models/pokemon.model';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import { getPastelCardColor } from '../../type-colors';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [RouterLink, MatIconModule, TypeBadgeComponent],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
})
export class PokemonCardComponent {
  @Input({ required: true }) pokemon!: PokemonListItem;
  @Input() isFavorite = false;
  @Input() types: string[] = [];

  @Output() favoriteToggled = new EventEmitter<number>();

  get cardColor(): string {
    return getPastelCardColor(this.types);
  }

  get paddedId(): string {
    return String(this.pokemon.id).padStart(3, '0');
  }
}
