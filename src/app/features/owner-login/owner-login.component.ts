import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { OwnerAuthService } from '../../core/services/owner-auth.service';
import { ErrorStateService } from '../../core/services/error-state.service';

@Component({
  selector: 'app-owner-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './owner-login.component.html',
  styleUrl: './owner-login.component.css'
})
export class OwnerLoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  loading = false;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly authService: OwnerAuthService,
    private readonly errorState: ErrorStateService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/owner/dashboard']);
    }
  }

  submit(): void {
    this.errorState.clear();

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    this.authService.login(this.form.controls.email.value, this.form.controls.password.value).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigate(['/owner/dashboard']);
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
