import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { OwnerSurvey } from '../../models/owner.model';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.css'
})
export class OwnerDashboardComponent implements OnInit {
  loading = true;
  publishingId: number | null = null;
  copiedSurveyId: number | null = null;
  copyError = '';

  balanceCoin = 0;
  surveyAccessStatus = 'active';
  surveys: OwnerSurvey[] = [];

  constructor(private readonly dashboardService: OwnerDashboardService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;

    forkJoin({
      wallet: this.dashboardService.getWallet().pipe(
        timeout(15000),
        catchError(() =>
          of({
            success: false,
            data: {
              balance_coin: 0,
              survey_access_status: 'active'
            }
          })
        )
      ),
      surveys: this.dashboardService.getSurveys().pipe(
        timeout(15000),
        catchError(() =>
          of({
            success: false,
            data: []
          })
        )
      )
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ wallet, surveys }) => {
          this.balanceCoin = wallet.data?.balance_coin ?? 0;
          this.surveyAccessStatus = wallet.data?.survey_access_status ?? 'active';
          this.surveys = surveys.data ?? [];
        },
        error: () => {
          this.balanceCoin = 0;
          this.surveyAccessStatus = 'active';
          this.surveys = [];
        }
      });
  }

  publishSurvey(survey: OwnerSurvey): void {
    if (this.publishingId || survey.status !== 'draft') {
      return;
    }

    this.publishingId = survey.id;

    this.dashboardService.publishSurvey(survey.id).subscribe({
      next: () => {
        this.publishingId = null;
        this.refresh();
      },
      error: () => {
        this.publishingId = null;
      }
    });
  }

  getPublicLink(token: string | null): string {
    if (!token) {
      return '-';
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/survey/${token}`;
  }

  copyPublicLink(survey: OwnerSurvey): void {
    this.copyError = '';
    this.copiedSurveyId = null;

    const link = this.getPublicLink(survey.public_token);
    if (!survey.public_token || link === '-') {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.copyError = 'Clipboard is not available in this browser.';
      return;
    }

    navigator.clipboard
      .writeText(link)
      .then(() => {
        this.copiedSurveyId = survey.id;
        setTimeout(() => {
          this.copiedSurveyId = null;
        }, 1200);
      })
      .catch(() => {
        this.copyError = 'Failed to copy link.';
      });
  }
}
