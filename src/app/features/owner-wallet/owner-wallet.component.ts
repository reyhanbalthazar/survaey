import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { OwnerWalletTransaction } from '../../models/owner.model';

@Component({
  selector: 'app-owner-wallet',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './owner-wallet.component.html',
  styleUrl: './owner-wallet.component.css'
})
export class OwnerWalletComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  loading = true;
  toppingUp = false;
  topupError = '';
  paymentBanner = '';
  paymentBannerType: 'success' | 'error' | '' = '';
  balanceCoin = 0;
  surveyAccessStatus = 'active';
  transactions: OwnerWalletTransaction[] = [];

  readonly ownerStatusLabels: Record<string, string> = {
    'active': 'Active',
    'blocked_insufficient_coin': 'Account Blocked (Insufficient Coin)',
  };

  readonly directionLabels: Record<string, string> = {
    'debit': 'Debit',
    'credit': 'Credit'
  };
  // ENUM('topup', 'publish_fee', 'response_fee', 'refund', 'adjustment')
  readonly reasonLabels: Record<string, string> = {
    'topup': 'Topup',
    'publish_fee': 'Publish Fee',
    'response_fee': 'Response Fee',
    'refund': 'Refund',
    'adjustment': 'Adjustment'
  };

  readonly transactionStatusLabels: Record<string, string> = {
    'success': 'Success',
    'failed': 'Failed',
  };

  readonly topupForm = this.fb.nonNullable.group({
    amount_coin: [100, [Validators.required, Validators.min(1)]],
    notes: ['manual topup']
  });

  constructor(
    private readonly dashboardService: OwnerDashboardService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    this.handlePostPaymentState();
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
      transactions: this.dashboardService.getWalletTransactions().pipe(
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
        next: ({ wallet, transactions }) => {
          this.balanceCoin = wallet.data?.balance_coin ?? 0;
          this.surveyAccessStatus = wallet.data?.survey_access_status ?? 'active';
          this.transactions = transactions.data ?? [];
        },
        error: () => {
          this.balanceCoin = 0;
          this.surveyAccessStatus = 'active';
          this.transactions = [];
        }
      });
  }

  topup(): void {
    this.topupError = '';

    if (this.topupForm.invalid || this.toppingUp) {
      this.topupForm.markAllAsTouched();
      return;
    }

    this.toppingUp = true;
    const amountCoin = this.topupForm.controls.amount_coin.value;
    const notes = this.topupForm.controls.notes.value ?? undefined;
    const successRedirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/owner/wallet?payment=success` : undefined;
    const failureRedirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/owner/wallet?payment=failed` : undefined;

    this.dashboardService
      .createTopupCheckout({
        amount_coin: amountCoin,
        description: notes,
        success_redirect_url: successRedirectUrl,
        failure_redirect_url: failureRedirectUrl,
      })
      .subscribe({
        next: (response) => {
          this.toppingUp = false;

          const checkoutUrl = response.data?.checkout_url ?? '';
          const orderCode = response.data?.order_code ?? '';
          if (!checkoutUrl) {
            this.topupError = 'Checkout URL is not available from payment provider.';
            return;
          }

          if (typeof window !== 'undefined' && orderCode) {
            localStorage.setItem('pending_topup_order_code', orderCode);
          }

          if (typeof window !== 'undefined') {
            window.location.href = checkoutUrl;
          }
        },
        error: () => {
          this.toppingUp = false;
          this.topupError = 'Unable to create top-up checkout. Please try again.';
        }
      });
  }

  private handlePostPaymentState(): void {
    const paymentState = this.route.snapshot.queryParamMap.get('payment') ?? '';
    const orderCodeFromQuery = this.route.snapshot.queryParamMap.get('order_code') ?? '';
    const orderCodeFromStorage =
      typeof window !== 'undefined' ? localStorage.getItem('pending_topup_order_code') ?? '' : '';
    const orderCode = orderCodeFromQuery || orderCodeFromStorage;

    if (paymentState === 'failed') {
      this.paymentBanner = 'Payment was not completed. Please try again.';
      this.paymentBannerType = 'error';
      this.clearPaymentQueryParams();
      return;
    }

    if (paymentState !== 'success') {
      return;
    }

    if (!orderCode) {
      this.paymentBanner = 'Payment return detected, but order code is missing.';
      this.paymentBannerType = 'error';
      this.clearPaymentQueryParams();
      return;
    }

    this.dashboardService.reconcileTopup(orderCode).subscribe({
      next: (response) => {
        this.paymentBanner = response.message || 'Payment confirmed.';
        this.paymentBannerType = 'success';
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pending_topup_order_code');
        }
        this.refresh();
        this.clearPaymentQueryParams();
      },
      error: () => {
        this.paymentBanner = 'Payment return detected, but confirmation is still pending. Please refresh in a moment.';
        this.paymentBannerType = 'error';
        this.clearPaymentQueryParams();
      }
    });
  }

  private clearPaymentQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { payment: null, order_code: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
