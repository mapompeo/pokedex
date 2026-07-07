import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `<div class="loading-spinner"><div class="loading-spinner__ball"></div></div>`,
  styles: [
    `
      .loading-spinner {
        display: flex;
        justify-content: center;
        padding: 24px;
      }

      .loading-spinner__ball {
        width: 40px;
        height: 40px;
        background: url('/pokeball.png') no-repeat center / contain;
        opacity: 0.35;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `,
  ],
})
export class LoadingSpinnerComponent {}
