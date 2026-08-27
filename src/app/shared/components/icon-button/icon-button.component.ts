import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule, TooltipPosition } from '@angular/material/tooltip';

/**
 * Botão-ícone circular compartilhado. Absorve o padrão que se repetia
 * reinventado (com pequenas variações de tamanho/cor) em pokemon-picker,
 * team, pokemon-detail, pokemon-list e app.scss — ver STYLEGUIDE.md.
 *
 * Não cobre: botões de navegação que precisam ser `<a routerLink>` (ex.:
 * pdetail__nav-btn) — semântica de link importa (abrir em nova aba, SEO).
 *
 * Uso:
 *   <app-icon-button icon="close" ariaLabel="Fechar" (clicked)="dismiss()" />
 *   <app-icon-button icon="close" ariaLabel="Limpar busca" size="xs" (clicked)="clear()" />
 *   <app-icon-button icon="favorite" ariaLabel="Favoritar" tone="on-photo" size="lg" (clicked)="toggle()" />
 *   <app-icon-button icon="dark_mode" ariaLabel="Modo escuro" tooltip="Modo escuro" (clicked)="toggle()" />
 *   <app-icon-button icon="group_add" ariaLabel="Adicionar ao time" tone="on-photo" [active]="isInTeam()" (clicked)="toggle()" />
 *   <app-icon-button icon="close" ariaLabel="Remover" tone="on-photo" size="xxs" [dangerHover]="true" (clicked)="remove()" />
 */
@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  template: `
    <button
      type="button"
      class="dex-icon-btn"
      [class]="'dex-icon-btn--' + size() + ' dex-icon-btn--' + tone()"
      [class.dex-icon-btn--active]="active()"
      [class.dex-icon-btn--danger-hover]="dangerHover()"
      [attr.aria-label]="ariaLabel()"
      [disabled]="disabled()"
      [matTooltip]="tooltip()"
      [matTooltipPosition]="tooltipPosition()"
      (click)="clicked.emit()"
    >
      <mat-icon>{{ icon() }}</mat-icon>
    </button>
  `,
  styles: [
    `
      .dex-icon-btn {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        padding: 0;
        border: none;
        border-radius: var(--dex-radius-circle);
        cursor: pointer;
        transition: background var(--dex-duration-fast) var(--dex-ease-standard),
                    color var(--dex-duration-fast) var(--dex-ease-standard);

        // Expande a área de toque pra perto de 44x44px sem aumentar o botão
        // visualmente — mesmo truque que já existia nos botões reinventados.
        &::before {
          content: '';
          position: absolute;
          inset: -6px;
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        &:focus-visible {
          outline: 2px solid var(--dex-gold);
          outline-offset: 2px;
        }

        mat-icon {
          display: block;
        }
      }

      // ---- Tamanho -------------------------------------------------------
      // xxs: par compacto de ação em card (ex.: slot do time) — não cabe
      // o padding do xs, então tem sua própria área de toque expandida menor.
      .dex-icon-btn--xxs { width: 28px; height: 28px; mat-icon { font-size: 16px; width: 16px; height: 16px; } &::before { inset: -8px; } }
      .dex-icon-btn--xs { width: 24px; height: 24px; mat-icon { font-size: 14px; width: 14px; height: 14px; } }
      .dex-icon-btn--sm { width: 32px; height: 32px; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
      .dex-icon-btn--md { width: 40px; height: 40px; mat-icon { font-size: 20px; width: 20px; height: 20px; } }
      .dex-icon-btn--lg { width: 44px; height: 44px; mat-icon { font-size: 22px; width: 22px; height: 22px; } }

      // ---- Tom -------------------------------------------------------------
      // ghost: uso padrão sobre fundo do app (cards, painéis).
      .dex-icon-btn--ghost {
        background: color-mix(in srgb, var(--dex-ink) 8%, transparent);
        color: var(--dex-ink);

        &:hover:not(:disabled) {
          background: color-mix(in srgb, var(--dex-ink) 16%, transparent);
        }
      }

      // on-photo: sobre foto/artwork de Pokémon (hero, splash).
      .dex-icon-btn--on-photo {
        background: color-mix(in srgb, var(--dex-white) 20%, transparent);
        color: var(--dex-white);

        &:hover:not(:disabled) {
          background: color-mix(in srgb, var(--dex-white) 35%, transparent);
        }

        // Estado ativo (ex.: já está no time) — mesmo tratamento em toda
        // ação on-photo que alterna estado, não só uma tela específica.
        &.dex-icon-btn--active {
          background: var(--dex-gold);
          color: var(--dex-black);
        }
      }

      // transparent: hit-area de 44px sem fundo, ícone branco sobre foto/hero
      // (ex.: voltar no topo do detalhe) — sem estado de hover, igual ao original.
      .dex-icon-btn--transparent {
        background: transparent;
        color: var(--dex-white);
      }

      // solid-accent: ação primária de destaque (ex.: voltar ao topo).
      .dex-icon-btn--solid-accent {
        background: var(--pokedex-red);
        color: var(--dex-white);

        &:hover:not(:disabled) {
          background: var(--pokedex-red-dark);
        }
      }

      // soft-accent: ação de destaque, tom suave (ex.: confirmar, tentar de novo).
      .dex-icon-btn--soft-accent {
        background: color-mix(in srgb, var(--pokedex-red) 10%, transparent);
        color: color-mix(in srgb, var(--pokedex-red) 55%, var(--dex-bg));

        &:hover:not(:disabled) {
          background: color-mix(in srgb, var(--pokedex-red) 18%, transparent);
        }
      }

      // Modificador ortogonal ao tom: hover vira vermelho independente da cor
      // base (ex.: remover do time) — depois dos tons de propósito pra vencer
      // no empate de especificidade.
      .dex-icon-btn--danger-hover:hover:not(:disabled) {
        background: color-mix(in srgb, var(--pokedex-red) 30%, transparent);
        color: var(--dex-white);
      }
    `,
  ],
})
export class IconButtonComponent {
  /** Nome do ícone Material (ex.: 'close', 'favorite', 'refresh'). */
  icon = input.required<string>();
  /** Obrigatório — botão-ícone não tem texto visível, precisa de label acessível. */
  ariaLabel = input.required<string>();
  size = input<'xxs' | 'xs' | 'sm' | 'md' | 'lg'>('sm');
  tone = input<'ghost' | 'on-photo' | 'solid-accent' | 'soft-accent' | 'transparent'>('ghost');
  disabled = input(false);
  /** Estado "ligado" de um botão que alterna (ex.: já favoritado/no time) — só visual no tom on-photo. */
  active = input(false);
  /** Hover fica vermelho independente do tom — ações destrutivas (ex.: remover do time). */
  dangerHover = input(false);
  /** Texto do tooltip do Material. Vazio = sem tooltip (padrão do próprio MatTooltip). */
  tooltip = input('');
  tooltipPosition = input<TooltipPosition>('above');

  clicked = output<void>();
}
