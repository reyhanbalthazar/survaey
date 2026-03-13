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
  publishConfirmOpen = false;
  pendingPublishSurvey: OwnerSurvey | null = null;
  copiedSurveyId: number | null = null;
  downloadingQrSurveyId: number | null = null;
  copyError = '';
  qrError = '';

  balanceCoin = 0;
  surveyAccessStatus = 'active';
  surveys: OwnerSurvey[] = [];
  private qrLibReady: Promise<void> | null = null;

  // Define a clear mapping object
  readonly statusLabels: Record<string, string> = {
    'active': 'Active',
    'blocked_insufficient_coin': 'Account Blocked (Insufficient Coin)',
  };

  // Different colors for a badge
  readonly statusColors: Record<string, string> = {
    'active': 'text-green-600 bg-green-100',
    'blocked_insufficient_coin': 'text-red-600 bg-red-100'
  };

  readonly surveyStatusLabels: Record<string, string> = {
    'draft': 'Draft',
    'published': 'Published',
    'closed': 'Closed',
    'expired': 'Expired',
    'suspended': 'Suspended'
  };

  constructor(private readonly dashboardService: OwnerDashboardService) { }

  ngOnInit(): void {
    this.refresh(true);
  }

  refresh(showLoading = true): void {
    if (showLoading) {
      this.loading = true;
    }

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
      .pipe(
        finalize(() => {
          if (showLoading) {
            this.loading = false;
          }
        })
      )
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

  openPublishConfirm(survey: OwnerSurvey): void {
    if (this.publishingId || survey.status !== 'draft') {
      return;
    }

    this.pendingPublishSurvey = survey;
    this.publishConfirmOpen = true;
  }

  closePublishConfirm(): void {
    if (this.publishingId) {
      return;
    }

    this.publishConfirmOpen = false;
    this.pendingPublishSurvey = null;
  }

  confirmPublishSurvey(): void {
    const survey = this.pendingPublishSurvey;
    if (!survey) {
      return;
    }

    this.publishConfirmOpen = false;
    this.pendingPublishSurvey = null;
    this.publishSurvey(survey);
  }

  private publishSurvey(survey: OwnerSurvey): void {
    if (this.publishingId || survey.status !== 'draft') {
      return;
    }

    this.publishingId = survey.id;

    this.dashboardService.publishSurvey(survey.id).subscribe({
      next: (response) => {
        const updated = response.data;
        if (updated) {
          this.surveys = this.surveys.map((item) => (item.id === survey.id ? { ...item, ...updated } : item));
        }
        // Reflect publish fee immediately in UI, then reconcile from API in background.
        this.balanceCoin = Math.max(0, this.balanceCoin - 100);

        this.publishingId = null;
        // Keep data consistent with backend without blocking the whole page.
        this.refresh(false);
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

  downloadQr(survey: OwnerSurvey): void {
    this.qrError = '';

    const link = this.getPublicLink(survey.public_token);
    if (!survey.public_token || link === '-') {
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.qrError = 'QR download is only available in browser mode.';
      return;
    }

    if (this.downloadingQrSurveyId) {
      return;
    }

    this.downloadingQrSurveyId = survey.id;
    void this.ensureQrLibLoaded()
      .then(() => this.buildAndDownloadQr(survey, link))
      .catch(() => {
        this.qrError = 'Failed to generate QR code.';
      })
      .finally(() => {
        this.downloadingQrSurveyId = null;
      });
  }

  private async buildAndDownloadQr(survey: OwnerSurvey, link: string): Promise<void> {
    const win = window as unknown as {
      qrcode?: (typeNumber: number, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H') => {
        addData: (data: string) => void;
        make: () => void;
        getModuleCount: () => number;
        isDark: (row: number, col: number) => boolean;
      };
    };

    if (!win.qrcode) {
      throw new Error('QR library not loaded');
    }

    const qr = win.qrcode(0, 'H');
    qr.addData(link);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const qrPixelSize = 2000;
    const padding = 48;
    const width = qrPixelSize + padding * 2;
    const height = qrPixelSize + padding * 2;
    const startX = (width - qrPixelSize) / 2;
    const startY = (height - qrPixelSize) / 2;
    const cellSize = qrPixelSize / moduleCount;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (!qr.isDark(row, col)) {
          continue;
        }

        const x = startX + col * cellSize;
        const y = startY + row * cellSize;
        ctx.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Failed to create image');
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `survey-${survey.title}-qr.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private ensureQrLibLoaded(): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.reject(new Error('No browser context'));
    }

    const win = window as unknown as { qrcode?: unknown };
    if (win.qrcode) {
      return Promise.resolve();
    }

    if (this.qrLibReady) {
      return this.qrLibReady;
    }

    this.qrLibReady = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load QR library'));
      document.body.appendChild(script);
    });

    return this.qrLibReady;
  }
}
