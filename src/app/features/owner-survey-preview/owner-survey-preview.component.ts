import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { Question, SurveyDetail } from '../../models/survey.model';

@Component({
  selector: 'app-owner-survey-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-survey-preview.component.html',
  styleUrl: './owner-survey-preview.component.css'
})
export class OwnerSurveyPreviewComponent implements OnInit {
  loading = true;
  survey: SurveyDetail | null = null;
  localError = '';
  readonly previewEmail = 'example@mail.com';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dashboardService: OwnerDashboardService
  ) {}

  ngOnInit(): void {
    const surveyId = Number(this.route.snapshot.paramMap.get('id') ?? '0');
    if (!surveyId) {
      this.loading = false;
      this.localError = 'Survey not found.';
      return;
    }

    this.dashboardService.getSurvey(surveyId).subscribe({
      next: (response) => {
        const survey = response.data ?? null;
        this.loading = false;

        if (!survey) {
          this.localError = 'Survey not found.';
          return;
        }

        if (survey.status !== 'draft') {
          this.localError = 'Only draft surveys can be previewed from the owner panel.';
          return;
        }

        this.survey = survey;
      },
      error: () => {
        this.loading = false;
        this.localError = 'Failed to load survey preview.';
      }
    });
  }

  isTextType(question: Question): boolean {
    return this.normalizeType(question.question_type) === 'text';
  }

  isMultipleChoiceType(question: Question): boolean {
    return this.normalizeType(question.question_type) === 'multiple_choice';
  }

  isSingleChoiceType(question: Question): boolean {
    return this.normalizeType(question.question_type) === 'single_choice';
  }

  backToDashboard(): void {
    void this.router.navigate(['/owner/dashboard']);
  }

  get requiredQuestions(): Question[] {
    return (this.survey?.questions ?? []).filter((question) => question.is_required !== false);
  }

  private normalizeType(type: string | null | undefined): string {
    return String(type ?? '').trim().toLowerCase();
  }
}
