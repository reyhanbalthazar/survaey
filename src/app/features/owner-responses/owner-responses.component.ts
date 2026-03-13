import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { OwnerSurveyResponseDetail, OwnerSurveyResponseItem } from '../../models/owner.model';
import { Question, SurveyOption } from '../../models/survey.model';

interface DisplayAnswerRow {
  questionId: number;
  questionText: string;
  answers: string[];
}

interface QuestionSummaryCard {
  questionId: number;
  questionText: string;
  questionType: string;
  canvasId: string | null;
  labels: string[];
  counts: number[];
  textAnswers: string[];
}

@Component({
  selector: 'app-owner-responses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './owner-responses.component.html',
  styleUrl: './owner-responses.component.css'
})
export class OwnerResponsesComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly isBrowser: boolean;

  loading = true;
  surveyId = 0;
  responses: OwnerSurveyResponseItem[] = [];
  selectedResponse: OwnerSurveyResponseDetail | null = null;
  displayAnswers: DisplayAnswerRow[] = [];
  summaryCards: QuestionSummaryCard[] = [];
  page = 1;
  readonly pageSize = 10;
  private questionMap = new Map<number, Question>();
  private optionMap = new Map<number, SurveyOption>();
  private chartInstances: Array<{ destroy: () => void }> = [];
  private chartJsReady: Promise<void> | null = null;
  private chartRenderToken = 0;
  private chartRenderTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['all']
  });

  // Define a clear mapping object
  readonly statusLabels: Record<string, string> = {
    'submitted': 'Submitted',
    'invalid': 'Invalid',
  };

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly route: ActivatedRoute,
    private readonly dashboardService: OwnerDashboardService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnDestroy(): void {
    this.clearPendingChartRender();
    this.destroyCharts();
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.loading = false;
      return;
    }

    this.surveyId = Number(this.route.snapshot.paramMap.get('id') ?? '0');
    if (!this.surveyId) {
      this.loading = false;
      return;
    }

    this.loadSurveyMeta();
    this.loadResponses();
  }

  loadResponses(): void {
    this.loading = true;
    this.dashboardService.getResponses(this.surveyId).subscribe({
      next: (response) => {
        this.responses = response.data ?? [];
        this.page = 1;
        this.rebuildSummary();
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
        this.displayAnswers = this.buildDisplayAnswers(this.selectedResponse);
      }
    });
  }

  private loadSurveyMeta(): void {
    this.dashboardService.getSurvey(this.surveyId).subscribe({
      next: (response) => {
        const questions = response.data?.questions ?? [];

        this.questionMap.clear();
        this.optionMap.clear();

        for (const question of questions) {
          this.questionMap.set(question.id, question);

          for (const option of question.options ?? []) {
            this.optionMap.set(option.id, option);
          }
        }

        if (this.selectedResponse) {
          this.displayAnswers = this.buildDisplayAnswers(this.selectedResponse);
        }

        this.rebuildSummary();
      }
    });
  }

  private buildDisplayAnswers(response: OwnerSurveyResponseDetail | null): DisplayAnswerRow[] {
    if (!response) {
      return [];
    }

    const grouped = new Map<number, DisplayAnswerRow>();

    for (const answer of response.answers ?? []) {
      const questionId = Number(answer.user_survey_question_id);
      const question = answer.question ?? this.questionMap.get(questionId);

      if (!grouped.has(questionId)) {
        grouped.set(questionId, {
          questionId,
          questionText: question?.question_text ?? `Question #${questionId}`,
          answers: []
        });
      }

      const row = grouped.get(questionId);
      if (!row) {
        continue;
      }

      const optionId = answer.user_survey_option_id != null ? Number(answer.user_survey_option_id) : null;
      if (optionId) {
        const option = answer.option ?? this.optionMap.get(optionId);
        row.answers.push(option?.option_text ?? `Option #${optionId}`);
      } else if (answer.answer_text && answer.answer_text.trim() !== '') {
        row.answers.push(answer.answer_text.trim());
      }
    }

    for (const row of grouped.values()) {
      if (row.answers.length === 0) {
        row.answers.push('-');
      }
    }

    return Array.from(grouped.values()).sort((a, b) => a.questionId - b.questionId);
  }

  private rebuildSummary(): void {
    const questionSourceMap = new Map<number, Question>();
    const optionTextMap = new Map<number, Map<number, string>>();

    for (const question of this.questionMap.values()) {
      questionSourceMap.set(question.id, question);
      optionTextMap.set(
        question.id,
        new Map((question.options ?? []).map((option) => [option.id, option.option_text]))
      );
    }

    for (const response of this.responses) {
      for (const answer of response.answers ?? []) {
        const answerQuestion = answer.question;
        const answerQuestionId = Number(answerQuestion?.id ?? answer.user_survey_question_id);
        if (answerQuestion && !questionSourceMap.has(answerQuestionId)) {
          questionSourceMap.set(answerQuestionId, {
            id: answerQuestionId,
            user_survey_id: this.surveyId,
            question_text: answerQuestion.question_text,
            question_type: answerQuestion.question_type ?? 'text',
            options: [],
            is_required: false,
            sort_order: answerQuestionId
          });
        }

        const answerQuestionKey = Number(answer.user_survey_question_id);
        const answerOptionId = answer.user_survey_option_id != null ? Number(answer.user_survey_option_id) : null;
        if (answerOptionId && answer.option?.option_text) {
          const optionMap = optionTextMap.get(answerQuestionKey) ?? new Map<number, string>();
          optionMap.set(answerOptionId, answer.option.option_text);
          optionTextMap.set(answerQuestionKey, optionMap);
        }
      }
    }

    const cards: QuestionSummaryCard[] = [];

    for (const question of questionSourceMap.values()) {
      if (question.question_type === 'text') {
        const textAnswers: string[] = [];

        for (const response of this.responses) {
          for (const answer of response.answers ?? []) {
            if (Number(answer.user_survey_question_id) !== question.id) {
              continue;
            }

            const text = answer.answer_text?.trim();
            if (text) {
              textAnswers.push(text);
            }
          }
        }

        cards.push({
          questionId: question.id,
          questionText: question.question_text,
          questionType: question.question_type,
          canvasId: null,
          labels: [],
          counts: [],
          textAnswers
        });
        continue;
      }

      const optionMap = optionTextMap.get(question.id) ?? new Map<number, string>();
      const orderedOptionEntries = Array.from(optionMap.entries()).sort((a, b) => a[0] - b[0]);
      const labels = orderedOptionEntries.map((entry) => entry[1]);
      const counts = orderedOptionEntries.map((entry) => {
        const optionId = entry[0];
        let count = 0;
        for (const response of this.responses) {
          for (const answer of response.answers ?? []) {
            if (
              Number(answer.user_survey_question_id) === question.id &&
              Number(answer.user_survey_option_id) === optionId
            ) {
              count += 1;
            }
          }
        }

        return count;
      });

      cards.push({
        questionId: question.id,
        questionText: question.question_text,
        questionType: question.question_type,
        canvasId: `summary-chart-${question.id}`,
        labels,
        counts,
        textAnswers: []
      });
    }

    this.summaryCards = cards.sort((a, b) => a.questionId - b.questionId);
    this.renderCharts();
  }

  private renderCharts(): void {
    this.chartRenderToken += 1;
    const renderToken = this.chartRenderToken;

    this.clearPendingChartRender();
    this.destroyCharts();

    if (!this.isBrowser) {
      return;
    }

    void this.ensureChartJsLoaded().then(() => {
      const chartConstructor = (window as unknown as { Chart?: any }).Chart;
      if (!chartConstructor) {
        return;
      }

      this.chartRenderTimeoutId = setTimeout(() => {
        if (renderToken !== this.chartRenderToken) {
          return;
        }

        for (const card of this.summaryCards) {
          if (!card.canvasId || card.labels.length === 0) {
            continue;
          }

          const canvas = document.getElementById(card.canvasId) as HTMLCanvasElement | null;
          if (!canvas) {
            continue;
          }

          const existingChart = typeof chartConstructor.getChart === 'function' ? chartConstructor.getChart(canvas) : null;
          if (existingChart) {
            existingChart.destroy();
          }

          const instance = new chartConstructor(canvas, {
            type: 'bar',
            data: {
              labels: card.labels,
              datasets: [
                {
                  label: 'Total Responses',
                  data: card.counts,
                  backgroundColor: '#A87D54',
                  borderRadius: 6
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  enabled: true
                }
              },
              scales: {
                x: {
                  ticks: {
                    color: '#064E3B'
                  },
                  grid: {
                    display: false
                  }
                },
                y: {
                  beginAtZero: true,
                  ticks: {
                    precision: 0,
                    stepSize: 1,
                    color: '#064E3B'
                  },
                  grid: {
                    color: 'rgba(6, 78, 59, 0.10)'
                  }
                }
              }
            }
          });

          this.chartInstances.push(instance);
        }

        this.chartRenderTimeoutId = null;
      }, 0);
    });
  }

  private destroyCharts(): void {
    for (const instance of this.chartInstances) {
      instance.destroy();
    }
    this.chartInstances = [];
  }

  private clearPendingChartRender(): void {
    if (this.chartRenderTimeoutId !== null) {
      clearTimeout(this.chartRenderTimeoutId);
      this.chartRenderTimeoutId = null;
    }
  }

  private ensureChartJsLoaded(): Promise<void> {
    if (!this.isBrowser) {
      return Promise.resolve();
    }

    const win = window as unknown as { Chart?: any };
    if (win.Chart) {
      return Promise.resolve();
    }

    if (this.chartJsReady) {
      return this.chartJsReady;
    }

    this.chartJsReady = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.body.appendChild(script);
    });

    return this.chartJsReady;
  }

  getQuestionTypeLabel(type: string): string {
    if (type === 'single_choice') {
      return 'Single Choice';
    }

    if (type === 'multiple_choice') {
      return 'Multiple Choice';
    }

    if (type === 'text') {
      return 'Text';
    }

    return type;
  }
}
