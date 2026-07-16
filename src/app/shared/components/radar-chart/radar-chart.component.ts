import { Component, computed, input } from '@angular/core';
import { PokemonStat } from '../../../core/models/pokemon.model';
import { getStatLabel } from '../../stat-labels';

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const MAX_STAT = 255;

@Component({
  selector: 'app-radar-chart',
  standalone: true,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + S + ' ' + S"
      class="radar"
      xmlns="http://www.w3.org/2000/svg"
    >
      @for (level of [50, 100, 150, 200, 255]; track level) {
        <polygon
          [attr.points]="polygonPoints(level)"
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          stroke-width="1"
        />
      }

      @for (stat of orderedStats(); track stat.name; let i = $index) {
        <line
          [attr.x1]="CX"
          [attr.y1]="CY"
          [attr.x2]="vertX(i, R)"
          [attr.y2]="vertY(i, R)"
          stroke="rgba(0,0,0,0.08)"
          stroke-width="1"
        />
      }

      @if (orderedStats().length) {
        <polygon
          [attr.points]="dataPoints()"
          [attr.fill]="typeColor()"
          fill-opacity="0.25"
          stroke="none"
        />
        <polygon
          [attr.points]="dataPoints()"
          fill="none"
          [attr.stroke]="typeColor()"
          stroke-width="2"
          stroke-linejoin="round"
        />
      }

      @for (stat of orderedStats(); track stat.name; let i = $index) {
        <circle
          [attr.cx]="dataX(i, stat.baseStat)"
          [attr.cy]="dataY(i, stat.baseStat)"
          r="2.5"
          [attr.fill]="typeColor()"
        />
      }

      @for (stat of orderedStats(); track stat.name; let i = $index) {
        <text
          [attr.x]="vertX(i, LABEL_R)"
          [attr.y]="vertY(i, LABEL_R)"
          text-anchor="middle"
          dominant-baseline="central"
          class="radar__label"
        >{{ shortLabel(stat.name) }}</text>
      }

      @for (stat of orderedStats(); track stat.name; let i = $index) {
        <text
          [attr.x]="vertX(i, VALUE_R)"
          [attr.y]="vertY(i, VALUE_R)"
          text-anchor="middle"
          dominant-baseline="central"
          class="radar__value"
        >{{ stat.baseStat }}</text>
      }
    </svg>
  `,
  styles: [
    `
      .radar {
        display: block;
        margin: 0 auto;
        max-width: 260px;
        width: 100%;
        height: auto;
      }

      .radar__label {
        font-size: 8px;
        font-weight: 700;
        fill: #444;
      }

      .radar__value {
        font-size: 7px;
        font-weight: 600;
        fill: #555;
      }
    `,
  ],
})
export class RadarChartComponent {
  stats = input.required<PokemonStat[]>();
  typeColor = input('');

  readonly S = 180;
  readonly CX = this.S / 2;
  readonly CY = this.S / 2;
  readonly R = 72;
  readonly LABEL_R = 86;
  readonly VALUE_R = 58;

  orderedStats = computed(() => {
    const map = new Map(this.stats().map((s) => [s.name, s]));
    return STAT_ORDER.filter((n) => map.has(n)).map((n) => map.get(n)!);
  });

  private angle(i: number): number {
    return (i * Math.PI * 2) / 6 - Math.PI / 2;
  }

  vertX(i: number, r: number): number {
    return this.CX + r * Math.cos(this.angle(i));
  }

  vertY(i: number, r: number): number {
    return this.CY + r * Math.sin(this.angle(i));
  }

  polygonPoints(level: number): string {
    return STAT_ORDER.map((_, i) => {
      const r = (this.R * level) / MAX_STAT;
      return `${this.vertX(i, r)},${this.vertY(i, r)}`;
    }).join(' ');
  }

  dataX(i: number, value: number): number {
    const r = (this.R * Math.min(value, MAX_STAT)) / MAX_STAT;
    return this.vertX(i, r);
  }

  dataY(i: number, value: number): number {
    const r = (this.R * Math.min(value, MAX_STAT)) / MAX_STAT;
    return this.vertY(i, r);
  }

  dataPoints(): string {
    return this.orderedStats().map((s, i) => {
      const r = (this.R * Math.min(s.baseStat, MAX_STAT)) / MAX_STAT;
      return `${this.vertX(i, r)},${this.vertY(i, r)}`;
    }).join(' ');
  }

  shortLabel(name: string): string {
    const full = getStatLabel(name);
    if (full === 'Ataque Especial') return 'Atq. Esp.';
    if (full === 'Defesa Especial') return 'Def. Esp.';
    return full;
  }
}
