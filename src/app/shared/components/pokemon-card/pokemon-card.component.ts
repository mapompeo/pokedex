import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PokemonListItem } from '../../../core/models/pokemon.model';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule],
  templateUrl: './pokemon-card.component.html',
  styleUrl: './pokemon-card.component.scss',
})
export class PokemonCardComponent {
  @Input({ required: true }) pokemon!: PokemonListItem;
  @Input() isFavorite = false;

  @Output() favoriteToggled = new EventEmitter<number>();
}
