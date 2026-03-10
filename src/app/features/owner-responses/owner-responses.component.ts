import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { OwnerSurveyResponseDetail, OwnerSurveyResponseItem } from '../../models/owner.model';

@Component({
  selector: 'app-owner-responses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './owner-responses.component.html',
  styleUrl: './owner-responses.component.css'
})
export class OwnerResponsesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  loading = true;
  surveyId = 0;
  responses: OwnerSurveyResponseItem[] = [];
  selectedResponse: OwnerSurveyResponseDetail | null = null;
  page = 1;
  readonly pageSize = 10;

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['all']
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dashboardService: OwnerDashboardService
  ) {}

  ngOnInit(): void {
    this.surveyId = Number(this.route.snapshot.paramMap.get('id') ?? '0');
    if (!this.surveyId) {
      this.loading = false;
      return;
    }

    this.loadResponses();
  }

  loadResponses(): void {
    this.loading = true;
    this.dashboardService.getResponses(this.surveyId).subscribe({
      next: (response) => {
        this.responses = response.data ?? [];
        this.page = 1;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get filteredResponses(): OwnerSurveyResponseItem[] {
    const search = this.filterForm.controls.search.value.trim().toLowerCase();
    const status = this.filterForm.controls.status.value;

    return this.responses.filter((item) => {
      const matchEmail = !search || item.respondent_email.toLowerCase().includes(search);
      const matchStatus = status === 'all' || item.status === status;
      return matchEmail && matchStatus;
    });
  }

  get pagedResponses(): OwnerSurveyResponseItem[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredResponses.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredResponses.length / this.pageSize));
  }

  applyFilter(): void {
    this.page = 1;
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
    }
  }

  viewResponse(responseId: number): void {
    this.dashboardService.getResponseDetail(this.surveyId, responseId).subscribe({
      next: (response) => {
        this.selectedResponse = response.data ?? null;
      }
    });
  }
}
