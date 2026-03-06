import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { ErrorStateService } from '../../../core/services/error-state.service';

@Component({
  selector: 'app-global-error',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-error.component.html',
  styleUrl: './global-error.component.css'
})
export class GlobalErrorComponent {
  readonly message$;

  constructor(private readonly errorState: ErrorStateService) {
    this.message$ = this.errorState.message$;
  }

  clear(): void {
    this.errorState.clear();
  }
}
