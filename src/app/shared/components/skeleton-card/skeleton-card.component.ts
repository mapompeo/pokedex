import { Component } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  template: `<div class="skeleton-card">
    <div class="skeleton-card__shimmer"></div>
    <div class="skeleton-card__body">
      <div class="skeleton-card__line skeleton-card__line--short"></div>
      <div class="skeleton-card__line skeleton-card__line--long"></div>
      <div class="skeleton-card__line skeleton-card__line--medium"></div>
    </div>
    <div class="skeleton-card__thumb"></div>
  </div>`,
  styles: [
    `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      .skeleton-card {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        background: color-mix(in srgb, var(--dex-bg-card) 60%, transparent);
        min-height: 140px;
        padding: 16px 110px 16px 16px;
      }

      .skeleton-card__shimmer {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255,255,255,0.3) 50%,
          transparent 100%
        );
        animation: shimmer 1.5s ease-in-out infinite;
        pointer-events: none;
        z-index: 1;
      }

      .skeleton-card__body {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .skeleton-card__line {
        height: 12px;
        border-radius: 6px;
        background: color-mix(in srgb, var(--dex-text-muted) 15%, transparent);
      }

      .skeleton-card__line--short { width: 40px; }
      .skeleton-card__line--long { width: 120px; height: 22px; border-radius: 8px; }
      .skeleton-card__line--medium { width: 70px; }

      .skeleton-card__thumb {
        position: absolute;
        right: 10px;
        bottom: 6px;
        width: 100px;
        height: 100px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--dex-text-muted) 12%, transparent);
      }
    `,
  ],
})
export class SkeletonCardComponent {}
