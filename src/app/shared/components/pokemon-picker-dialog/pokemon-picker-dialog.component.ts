import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PokemonListItem } from '../../../core/models/pokemon.model';
import { IconButtonComponent } from '../icon-button/icon-button.component';
import { PokemonPickerComponent } from '../pokemon-picker/pokemon-picker.component';

export interface PokemonPickerDialogData {
  title: string;
  hint: string;
  excludeIds: number[];
  preselectTypes: string[];
}

/**
 * Casca do diálogo: abre `PokemonPickerComponent` (busca + filtro + lista)
 * dentro de um `MatDialog`, em vez do `.pp-overlay`/`.pp-dialog` hand-rolled
 * de antes. Ganha de graça o que o CDK Overlay por trás do MatDialog já
 * resolve: focus trap, Escape/clique-fora fecham nativamente, `role="dialog"`
 * + `aria-modal`, e a animação de abertura/fechamento.
 *
 * O card visual (fundo/raio/sombra/max-height) é todo deste componente, não
 * do Material — o `panelClass: 'pp-dialog-panel'` (ver styles.scss) neutraliza
 * o container padrão do MatDialog pra não sobrepor o design existente.
 *
 * Uso: `dialog.open(PokemonPickerDialogComponent, { data, panelClass: 'pp-dialog-panel', autoFocus: '.dex-search__input' })`
 * — resolve com o Pokémon escolhido, ou `undefined` se fechado sem escolher.
 */
@Component({
  selector: 'app-pokemon-picker-dialog',
  standalone: true,
  imports: [IconButtonComponent, PokemonPickerComponent],
  template: `
    <div class="pp-dialog">
      <div class="pp-dialog-head">
        <div class="pp-dialog-head-text">
          <h3 class="pp-dialog-title">{{ data.title }}</h3>
          @if (data.hint) {
            <p class="pp-dialog-hint">{{ data.hint }}</p>
          }
        </div>
        <app-icon-button icon="close" ariaLabel="Fechar" size="sm" (clicked)="dialogRef.close()" />
      </div>

      <app-pokemon-picker
        [alwaysOpen]="true"
        [excludeIds]="data.excludeIds"
        [preselectTypes]="data.preselectTypes"
        (pokemonSelected)="dialogRef.close($event)"
      />
    </div>
  `,
  styleUrl: './pokemon-picker-dialog.component.scss',
})
export class PokemonPickerDialogComponent {
  dialogRef = inject(MatDialogRef<PokemonPickerDialogComponent, PokemonListItem | undefined>);
  data = inject<PokemonPickerDialogData>(MAT_DIALOG_DATA);
}
