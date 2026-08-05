import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private lastNonDetailUrl: string | null = null;

  /** Guarda a última rota que não é de detalhe, para o botão "voltar" do detalhe. */
  setLastNonDetailUrl(url: string): void {
    this.lastNonDetailUrl = url;
  }

  /** true se o usuário navegou dentro do app antes de chegar ao detalhe. */
  get cameFromInside(): boolean {
    return this.lastNonDetailUrl !== null;
  }
}
