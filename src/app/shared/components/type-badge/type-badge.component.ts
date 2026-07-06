import { Component, Input } from '@angular/core';
import { getTypeColor } from '../../type-colors';
import { getTypeNamePt } from '../../type-translations';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  template: `<span class="type-badge" [style.background-color]="color">{{ label }}</span>`,
  styles: [
    `
      .type-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;
        line-height: 1.6;
      }
    `,
  ],
})
export class TypeBadgeComponent {
  @Input({ required: true }) type!: string;

  get color(): string {
    return getTypeColor(this.type);
  }

  get label(): string {
    return getTypeNamePt(this.type);
  }
}
