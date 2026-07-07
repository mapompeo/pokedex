import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { appConfig } from './config';
import { FavoritesService } from './core/services/favorites.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private router = inject(Router);
  private favoritesService = inject(FavoritesService);

  title = appConfig.title;
  subtitle = appConfig.subtitle;
  isDetailRoute = signal(this.router.url.startsWith('/pokemon/'));
  favoriteCount = computed(() => this.favoritesService.favoriteIds().size);
  isDarkMode = signal(document.body.classList.contains('dark-mode'));

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
