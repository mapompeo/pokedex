import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `<div class="loading-spinner"><mat-spinner diameter="40"></mat-spinner></div>`,
  styles: [`.loading-spinner { display: flex; justify-content: center; padding: 24px; }`],
})
export class LoadingSpinnerComponent {}
