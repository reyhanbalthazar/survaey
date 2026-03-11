import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { OwnerSurveyVoucher } from '../../models/owner.model';

@Component({
  selector: 'app-owner-vouchers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './owner-vouchers.component.html',
  styleUrl: './owner-vouchers.component.css'
})
export class OwnerVouchersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  loading = true;
  redeemingVoucherId: number | null = null;
  vouchers: OwnerSurveyVoucher[] = [];
  errorMessage = '';

  readonly filterForm = this.fb.nonNullable.group({
    status: ['all'],
    search: ['']
  });

  constructor(private readonly dashboardService: OwnerDashboardService) {}

  ngOnInit(): void {
    this.loadVouchers();
  }

  loadVouchers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.dashboardService
      .getVouchers({
        status: this.filterForm.controls.status.value as 'all' | 'issued' | 'redeemed',
        search: this.filterForm.controls.search.value.trim()
      })
      .subscribe({
        next: (response) => {
          this.vouchers = response.data ?? [];
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load vouchers.';
          this.vouchers = [];
          this.loading = false;
        }
      });
  }

  redeemVoucher(voucher: OwnerSurveyVoucher): void {
    if (voucher.status === 'redeemed' || this.redeemingVoucherId) {
      return;
    }

    this.redeemingVoucherId = voucher.id;
    this.dashboardService.redeemVoucher(voucher.id).subscribe({
      next: (response) => {
        const updated = response.data;
        if (updated) {
          this.vouchers = this.vouchers.map((item) => (item.id === voucher.id ? updated : item));
        }
        this.redeemingVoucherId = null;
      },
      error: () => {
        this.redeemingVoucherId = null;
      }
    });
  }
}

