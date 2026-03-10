import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { SurveyService } from '../../core/services/survey.service';
import { ErrorStateService } from '../../core/services/error-state.service';
import { SurveyDetail } from '../../models/survey.model';

@Component({
  selector: 'app-enter-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './enter-email.component.html',
  styleUrl: './enter-email.component.css'
})
export class EnterEmailComponent implements OnInit {
  readonly form;

  publicToken = '';
  survey: SurveyDetail | null = null;
  loading = true;
  localError = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly surveyService: SurveyService,
    private readonly errorState: ErrorStateService
  ) {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.publicToken = this.route.snapshot.paramMap.get('publicToken') ?? '';

    this.surveyService.getPublicSurvey(this.publicToken).subscribe({
      next: (response) => {
        this.survey = response.data ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  continueToSurvey(): void {
    this.localError = '';
    this.errorState.clear();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.survey) {
      this.localError = 'Survey not found.';
      return;
    }

    void this.router.navigate(['/survey', this.publicToken, 'form'], {
      queryParams: {
        email: this.form.value.email
      }
    });
  }
}
