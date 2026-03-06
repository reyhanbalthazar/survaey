import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { SurveyService } from '../../core/services/survey.service';
import { ErrorStateService } from '../../core/services/error-state.service';
import { SurveySummary } from '../../models/survey.model';

@Component({
  selector: 'app-enter-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './enter-email.component.html',
  styleUrl: './enter-email.component.css'
})
export class EnterEmailComponent implements OnInit {
  readonly form;

  slug = '';
  surveys: SurveySummary[] = [];
  loading = true;
  checking = false;
  localError = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly surveyService: SurveyService,
    private readonly errorState: ErrorStateService
  ) {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      surveyCode: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';

    this.surveyService.getSurveysByOrganization(this.slug).subscribe({
      next: (response) => {
        this.surveys = response.data ?? [];
        if (this.surveys.length > 0) {
          this.form.patchValue({ surveyCode: this.surveys[0].survey_code });
        }
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

    if (this.form.invalid || this.checking) {
      this.form.markAllAsTouched();
      return;
    }

    const selected = this.surveys.find((survey) => survey.survey_code === this.form.value.surveyCode);

    if (!selected) {
      this.localError = 'Selected survey not found.';
      return;
    }

    this.checking = true;

    this.surveyService.checkEmailUnique(selected.id, this.form.value.email ?? '').subscribe({
      next: (response) => {
        this.checking = false;

        if (!response.success) {
          this.localError = response.message ?? 'Email has already submitted this survey.';
          return;
        }

        void this.router.navigate(['/survey', this.slug, selected.survey_code], {
          queryParams: {
            email: this.form.value.email
          }
        });
      },
      error: () => {
        this.checking = false;
      }
    });
  }
}
