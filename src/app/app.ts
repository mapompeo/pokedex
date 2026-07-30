import { Component, NgZone, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { FavoritesService } from './core/services/favorites.service';
import { PageBackgroundService } from './core/services/page-background.service';
import { routeFade } from './shared/animations';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [routeFade],
})
export class App {
  router = inject(Router);
  private ngZone = inject(NgZone);
  private favoritesService = inject(FavoritesService);
  private pageBackground = inject(PageBackgroundService);
  private swUpdate = inject(SwUpdate);

  title = 'Pokédex';
  subtitle = signal('Seu guia completo do mundo pokémon');
  isDetailRoute = signal(this.router.url.startsWith('/pokemon/'));
  favoriteCount = computed(() => this.favoritesService.favoriteIds().size);
  isDarkMode = signal(document.body.classList.contains('dark-mode'));

  private static readonly BRAND_BAND = 'var(--dex-bg)';
  frameBackground = computed(() =>
    this.isDetailRoute() ? this.pageBackground.color() ?? 'var(--dex-bg)' : App.BRAND_BAND
  );

  activeTabIndex = signal(0);

  constructor() {
    const stored = localStorage.getItem('pokedex-dark-mode');
    if (stored === 'true') {
      document.body.classList.add('dark-mode');
    }
    this.isDarkMode.set(document.body.classList.contains('dark-mode'));

    // Atualiza theme-color dinamicamente p/ Safari tingir notch + toolbar
    effect(() => {
      const isDetail = this.isDetailRoute();
      const heroColor = this.pageBackground.color();
      const _dm = this.isDarkMode(); // dependência p/ re-avaliar ao trocar modo

      let themeColor: string;
      if (isDetail && heroColor) {
        themeColor = heroColor;
      } else {
        themeColor =
          getComputedStyle(document.documentElement).getPropertyValue('--dex-bg').trim() ||
          '#ffffff';
      }

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', themeColor);
      }
    });

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
        .subscribe(() => document.location.reload());
    }

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.ngZone.run(() => {
          this.isDetailRoute.set(event.urlAfterRedirects.startsWith('/pokemon/'));
          const url = event.urlAfterRedirects;
          if (url === '/') {
            this.activeTabIndex.set(0);
            this.subtitle.set('Seu guia completo do mundo pokémon!');
          } else if (url.startsWith('/favoritos')) {
            this.activeTabIndex.set(1);
            this.subtitle.set('Seus pokémons favoritos em um só lugar!');
          } else if (url.startsWith('/comparar')) {
            this.activeTabIndex.set(2);
            this.subtitle.set('Compare status de dois pokémons!');
          }
        });
      });
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    this.isDarkMode.set(isDark);
    localStorage.setItem('pokedex-dark-mode', String(isDark));
  }
}
