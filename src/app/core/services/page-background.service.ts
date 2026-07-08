import { Injectable, signal } from '@angular/core';

/** Cor de fundo full-bleed da página atual (null = padrão). */
@Injectable({ providedIn: 'root' })
export class PageBackgroundService {
  readonly color = signal<string | null>(null);
}
