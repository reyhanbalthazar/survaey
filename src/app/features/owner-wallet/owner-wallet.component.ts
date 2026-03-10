import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  balanceCoin = 0;
  surveyAccessStatus = 'active';
  transactions: OwnerWalletTransaction[] = [];

  readonly topupForm = this.fb.nonNullable.group({
    amount_coin: [100, [Validators.required, Validators.min(1)]],
    notes: ['manual topup']
  });

  constructor(
    private readonly dashboardService: OwnerDashboardService
  ) {}

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
    if (this.topupForm.invalid || this.toppingUp) {
      this.topupForm.markAllAsTouched();
      return;
    }

    this.toppingUp = true;
    this.dashboardService
      .topup(this.topupForm.controls.amount_coin.value, this.topupForm.controls.notes.value ?? undefined)
      .subscribe({
        next: () => {
          this.toppingUp = false;
          this.refresh();
        },
        error: () => {
          this.toppingUp = false;
        }
      });
  }
}
