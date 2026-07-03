import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { PokemonType } from '../../../core/models/pokemon.model';

@Component({
  selector: 'app-type-chip-filter',
  standalone: true,
  imports: [MatChipsModule],
  templateUrl: './type-chip.component.html',
})
export class TypeChipComponent {
  @Input({ required: true }) types: PokemonType[] = [];
  @Input() selectedTypeNames: string[] = [];
  @Output() selectionChanged = new EventEmitter<string[]>();

  isSelected(name: string): boolean {
    return this.selectedTypeNames.includes(name);
  }

  toggle(name: string): void {
    const next = this.isSelected(name)
      ? this.selectedTypeNames.filter((n) => n !== name)
      : [...this.selectedTypeNames, name];
    this.selectionChanged.emit(next);
  }
}
