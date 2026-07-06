import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PokemonType } from '../../../core/models/pokemon.model';
import { getTypeNamePt } from '../../type-translations';

@Component({
  selector: 'app-type-chip-filter',
  standalone: true,
  imports: [],
  templateUrl: './type-chip.component.html',
  styleUrl: './type-chip.component.scss',
})
export class TypeChipComponent {
  @Input({ required: true }) types: PokemonType[] = [];
  @Input() selectedTypeNames: string[] = [];
  @Output() selectionChanged = new EventEmitter<string[]>();

  isSelected(name: string): boolean {
    return this.selectedTypeNames.includes(name);
  }

  label(name: string): string {
    return getTypeNamePt(name);
  }

  toggle(name: string): void {
    const next = this.isSelected(name)
      ? this.selectedTypeNames.filter((n) => n !== name)
      : [...this.selectedTypeNames, name];
    this.selectionChanged.emit(next);
  }
}
