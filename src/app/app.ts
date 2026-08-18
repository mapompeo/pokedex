import { Component, NgZone, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { FavoritesService } from './core/services/favorites.service';
import { PageBackgroundService } from './core/services/page-background.service';
import { NavigationService } from './core/services/navigation.service';
import { routeFade } from './shared/animations';

/**
 * Resolve qualquer cor CSS (color-mix(), color(srgb ...), etc.) para um
 * "#rrggbb" simples que o parser de meta[name=theme-color] do Safari entende.
 * getComputedStyle() nao serve sozinho aqui: em alguns navegadores ele devolve
 * a cor resolvida em notacoes modernas (ex.: "color(srgb ...)") que o Safari
 * tambem nao reconhece no meta tag. Pintar num canvas e ler o pixel de volta
 * sempre da valores RGB concretos (0-255), independente da funcao de origem.
 */
function resolveToRgb(cssColor: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cssColor;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

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
  private navigationService = inject(NavigationService);
  private swUpdate = inject(SwUpdate);
  private snackBar = inject(MatSnackBar);

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
    // Scroll é restaurado manualmente pela listagem (voltar do detalhe mantém posição).
    history.scrollRestoration = 'manual';

    // Ao contrário dos outros serviços do app, essa leitura roda direto no
    // bootstrap do componente raiz - sem try/catch, um localStorage bloqueado
    // (política do navegador/empresa) travaria a inicialização do app inteiro.
    try {
      if (localStorage.getItem('pokedex-dark-mode') === 'true') {
        document.body.classList.add('dark-mode');
      }
    } catch {
      // localStorage indisponível - segue com o tema padrão (claro).
    }
    this.isDarkMode.set(document.body.classList.contains('dark-mode'));

    // Atualiza theme-color dinamicamente p/ Safari tingir notch + toolbar.
    // O parser de cor do meta[name=theme-color] nao entende color-mix() (usado
    // em getPastelCardColor) - por isso resolvemos via getComputedStyle antes,
    // que sempre devolve um rgb() simples que o Safari consegue ler.
    effect(() => {
      const isDetail = this.isDetailRoute();
      const heroColor = this.pageBackground.color();
      const _dm = this.isDarkMode(); // dependência p/ re-avaliar ao trocar modo

      const rawColor =
        isDetail && heroColor
          ? heroColor
          : getComputedStyle(document.documentElement).getPropertyValue('--dex-bg').trim() || '#ffffff';

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', resolveToRgb(rawColor));
      }
    });

    if (this.swUpdate.isEnabled) {
      // Não recarrega sozinho: um reload forçado sem aviso pode interromper
      // o usuário no meio de uma ação (ex.: montando o time). Deixa a escolha
      // por um snackbar, como o resto do app já faz para avisos.
      this.swUpdate.versionUpdates
        .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
        .subscribe(() => {
          this.snackBar
            .open('Nova versão disponível', 'Atualizar', { duration: 10000, panelClass: 'app-snackbar' })
            .onAction()
            .subscribe(() => document.location.reload());
        });
    }

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.ngZone.run(() => {
          this.isDetailRoute.set(event.urlAfterRedirects.startsWith('/pokemon/'));
          if (!this.isDetailRoute()) {
            this.navigationService.setLastNonDetailUrl(event.urlAfterRedirects);
          }
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
          } else if (url.startsWith('/time')) {
            this.activeTabIndex.set(3);
            this.subtitle.set('Monte sua equipe com até 6 pokémons!');
          }
        });
      });
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    this.isDarkMode.set(isDark);
    try {
      localStorage.setItem('pokedex-dark-mode', String(isDark));
    } catch {
      // localStorage indisponível - o tema não persiste, mas o toggle continua funcionando.
    }
  }
}
