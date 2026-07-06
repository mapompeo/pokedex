import { Component, Input } from '@angular/core';
import { getTypeColor } from '../../type-colors';
import { getTypeNamePt } from '../../type-translations';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  template: `<span
    class="type-badge"
    [class.type-badge--large]="large"
    [class.type-badge--ghost]="ghost"
    [style.background-color]="ghost ? null : color"
    >{{ label }}</span
  >`,
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

      .type-badge--large {
        padding: 6px 18px;
        border-radius: 999px;
        font-size: 0.9rem;
      }

      .type-badge--ghost {
        background: rgba(255, 255, 255, 0.3) !important;
        color: #fff;
      }
    `,
  ],
})
export class TypeBadgeComponent {
  @Input({ required: true }) type!: string;
  @Input() large = false;
  @Input() ghost = false;

  get color(): string {
    return getTypeColor(this.type);
  }

  get label(): string {
    return getTypeNamePt(this.type);
  }
}
