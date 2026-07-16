import { AfterViewInit, Component, ElementRef, NgZone, QueryList, ViewChildren, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { FavoritesService } from './core/services/favorites.service';
import { PageBackgroundService } from './core/services/page-background.service';
import { routeFade } from './shared/animations';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [routeFade],
})
export class App implements AfterViewInit {
  router = inject(Router);
  private ngZone = inject(NgZone);
  private favoritesService = inject(FavoritesService);
  private pageBackground = inject(PageBackgroundService);

  @ViewChildren('tab0, tab1, tab2') tabs!: QueryList<ElementRef<HTMLElement>>;

  title = 'Pokédex';
  subtitle = signal('Seu guia completo do mundo pokémon');
  isDetailRoute = signal(window.location.pathname.startsWith('/pokemon/'));
  favoriteCount = computed(() => this.favoritesService.favoriteIds().size);
  isDarkMode = signal(document.body.classList.contains('dark-mode'));

  private static readonly BRAND_BAND = '#f1f1f1';
  frameBackground = computed(() =>
    this.isDetailRoute() ? this.pageBackground.color() ?? 'var(--dex-bg)' : App.BRAND_BAND
  );

  pillLeft = signal('0px');
  pillWidth = signal('0px');

  activeTabIndex = signal(0);

  constructor() {
    const stored = localStorage.getItem('pokedex-dark-mode');
    if (stored === 'true') {
      document.body.classList.add('dark-mode');
    }
    this.isDarkMode.set(document.body.classList.contains('dark-mode'));

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
          this.updatePill();
        });
      });

    effect(() => {
      this.activeTabIndex();
      // Re-run on favoriteCount changes since tabs might re-render
      this.favoriteCount();
      setTimeout(() => this.updatePill(), 50);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updatePill(), 100);
  }

  private updatePill(): void {
    const tabList = this.tabs?.toArray();
    if (!tabList || tabList.length === 0) return;
    const idx = this.activeTabIndex();
    const el = tabList[idx]?.nativeElement;
    if (!el) return;
    const nav = el.closest<HTMLElement>('.pokedex-frame__bottom-nav');
    if (!nav) return;
    const borderLeft = parseFloat(getComputedStyle(nav).borderLeftWidth) || 0;
    this.pillLeft.set((el.offsetLeft - borderLeft) + 'px');
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    this.isDarkMode.set(isDark);
    localStorage.setItem('pokedex-dark-mode', String(isDark));
  }
}
