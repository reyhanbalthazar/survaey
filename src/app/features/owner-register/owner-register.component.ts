import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { OwnerAuthService } from '../../core/services/owner-auth.service';
import { ErrorStateService } from '../../core/services/error-state.service';

@Component({
  selector: 'app-owner-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './owner-register.component.html',
  styleUrl: './owner-register.component.css'
})
export class OwnerRegisterComponent {
  private readonly fb = inject(FormBuilder);

  loading = false;
  passwordMismatch = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(
    private readonly authService: OwnerAuthService,
    private readonly errorState: ErrorStateService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.errorState.clear();
    this.passwordMismatch = false;

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.controls.password.value !== this.form.controls.password_confirmation.value) {
      this.passwordMismatch = true;
      this.form.controls.password_confirmation.markAsTouched();
      return;
    }

    this.loading = true;

    this.authService
      .register(
        this.form.controls.name.value,
        this.form.controls.email.value,
        this.form.controls.password.value,
        this.form.controls.password_confirmation.value
      )
      .subscribe({
        next: () => {
          this.loading = false;
          void this.router.navigate(['/owner/check-email'], {
            queryParams: { email: this.form.controls.email.value }
          });
        },
        error: () => {
          this.loading = false;
        }
      });
  }
}
