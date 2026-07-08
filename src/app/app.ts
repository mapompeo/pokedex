import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { FavoritesService } from './core/services/favorites.service';
import { PageBackgroundService } from './core/services/page-background.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private router = inject(Router);
  private favoritesService = inject(FavoritesService);
  private pageBackground = inject(PageBackgroundService);

  title = 'Pokédex';
  subtitle = 'Busque um pokémon pelo nome ou explore a lista completa';
  // Usa a URL do browser (já correta em deep-links) em vez de router.url, que
  // pode ainda não refletir a navegação inicial neste ponto da construção.
  isDetailRoute = signal(window.location.pathname.startsWith('/pokemon/'));
  favoriteCount = computed(() => this.favoritesService.favoriteIds().size);
  isDarkMode = signal(document.body.classList.contains('dark-mode'));
  // Fundo full-bleed do frame: no detalhe varia por pokémon (PageBackgroundService);
  // nas demais telas (lista, favoritos, comparar) é sempre a mesma banda vermelha da marca.
  private static readonly BRAND_BAND = 'color-mix(in srgb, var(--pokedex-red) 65%, white)';
  frameBackground = computed(() =>
    this.isDetailRoute() ? this.pageBackground.color() ?? 'var(--dex-bg)' : App.BRAND_BAND
  );

  constructor() {
    const stored = localStorage.getItem('pokedex-dark-mode');
    if (stored === 'true') {
      document.body.classList.add('dark-mode');
    }
    this.isDarkMode.set(document.body.classList.contains('dark-mode'));

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.isDetailRoute.set(event.urlAfterRedirects.startsWith('/pokemon/'));
      });
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    this.isDarkMode.set(isDark);
    localStorage.setItem('pokedex-dark-mode', String(isDark));
  }
}
