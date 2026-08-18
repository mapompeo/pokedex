import { Component, input } from '@angular/core';
import { getTypeColor } from '../../type-colors';
import { getTypeNamePt } from '../../type-translations';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  template: `<span
    class="type-badge"
    [class.type-badge--ghost]="ghost()"
    [style.background]="ghost() ? ghostBg : badgeBg"
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
        font-weight: 700;
        text-transform: capitalize;
        line-height: 1.6;
      }

      .type-badge--ghost {
        border: 1px solid rgba(255,255,255,0.25);
        color: rgba(255,255,255,0.75);
      }
    `,
  ],
})
export class TypeBadgeComponent {
  type = input.required<string>();
  ghost = input(false);

  get color(): string {
    return getTypeColor(this.type());
  }

  get label(): string {
    return getTypeNamePt(this.type());
  }

  get badgeBg(): string {
    return `color-mix(in srgb, ${this.color} 40%, white)`;
  }

  get ghostBg(): string {
    return `color-mix(in srgb, ${this.color} 15%, transparent)`;
  }
}
