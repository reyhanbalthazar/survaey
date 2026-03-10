import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { OwnerAuthService } from '../../core/services/owner-auth.service';

@Component({
  selector: 'app-owner-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-verify-email.component.html',
  styleUrl: './owner-verify-email.component.css'
})
export class OwnerVerifyEmailComponent implements OnInit, OnDestroy {
  verifying = true;
  verifySuccess = false;
  countdown = 5;
  statusMessage = 'Verifying email...';
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: OwnerAuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!token) {
      this.verifying = false;
      this.verifySuccess = false;
      this.statusMessage = 'Verification token was not found in the URL.';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.verifying = false;
        this.verifySuccess = true;
        this.statusMessage = response.message || 'Verification successful.';
        this.startCountdownRedirect();
      },
      error: () => {
        this.verifying = false;
        this.verifySuccess = false;
        this.statusMessage = 'Verification failed. Token is invalid or has expired.';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private startCountdownRedirect(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.countdown = 5;
    this.timerId = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        if (this.timerId) {
          clearInterval(this.timerId);
          this.timerId = null;
        }
        void this.router.navigate(['/owner/login']);
      }
    }, 1000);
  }
}
