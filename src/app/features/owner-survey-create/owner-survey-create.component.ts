import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormArray, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { ErrorStateService } from '../../core/services/error-state.service';
import { OwnerSurveyQuestionPayload } from '../../models/owner.model';
import { SurveyDetail } from '../../models/survey.model';

@Component({
  selector: 'app-owner-survey-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './owner-survey-create.component.html',
  styleUrl: './owner-survey-create.component.css'
})
export class OwnerSurveyCreateComponent implements OnInit {
  private readonly fb = inject(UntypedFormBuilder);
  private readonly route = inject(ActivatedRoute);

  saving = false;
  loadingSurvey = false;
  isEditMode = false;
  private surveyId: number | null = null;

  readonly form = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    expires_at: ['', [Validators.required]],
    max_responses: [100, [Validators.required, Validators.min(1)]],
    questions: this.fb.array([this.createQuestionGroup()])
  });

  constructor(
    private readonly dashboardService: OwnerDashboardService,
    private readonly errorState: ErrorStateService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id');
    if (!rawId) {
      return;
    }

    const parsedId = Number(rawId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      void this.router.navigate(['/owner/dashboard']);
      return;
    }

    this.surveyId = parsedId;
    this.isEditMode = true;
    this.loadSurveyForEdit(parsedId);
  }

  get submitButtonLabel(): string {
    if (this.saving) {
      return this.isEditMode ? 'Updating...' : 'Saving...';
    }

    return this.isEditMode ? 'Update Draft' : 'Save Draft';
  }

  get questions(): UntypedFormArray {
    return this.form.get('questions') as UntypedFormArray;
  }

  addQuestion(): void {
    this.questions.push(this.createQuestionGroup());
  }

  removeQuestion(index: number): void {
    if (this.questions.length <= 1) {
      return;
    }

    this.questions.removeAt(index);
  }

  optionsAt(index: number): UntypedFormArray {
    return this.questions.at(index).get('options') as UntypedFormArray;
  }

  addOption(questionIndex: number): void {
    this.optionsAt(questionIndex).push(
      this.fb.group({
        option_text: ['', [Validators.required]]
      })
    );
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const options = this.optionsAt(questionIndex);
    if (options.length <= 2) {
      return;
    }
    options.removeAt(optionIndex);
  }

  onTypeChange(questionIndex: number): void {
    const group = this.questions.at(questionIndex);
    const type = String(group.get('question_type')?.value ?? 'text');
    const options = group.get('options') as UntypedFormArray;

    if (type === 'text') {
      options.clear();
      return;
    }

    if (options.length === 0) {
      options.push(this.fb.group({ option_text: ['', [Validators.required]] }));
      options.push(this.fb.group({ option_text: ['', [Validators.required]] }));
    }
  }

  submit(): void {
    this.errorState.clear();

    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const questionPayloads: OwnerSurveyQuestionPayload[] = this.questions.controls.map((control, index) => {
      const type = String(control.get('question_type')?.value ?? 'text') as OwnerSurveyQuestionPayload['question_type'];
      const rawOptions = (control.get('options')?.value as Array<{ option_text: string }>) ?? [];
      const payload: OwnerSurveyQuestionPayload = {
        question_text: String(control.get('question_text')?.value ?? ''),
        question_type: type,
        is_required: Boolean(control.get('is_required')?.value),
        sort_order: index + 1
      };

      if (type !== 'text') {
        payload.options = rawOptions.map((item, optionIndex) => ({
          option_text: item.option_text,
          sort_order: optionIndex + 1
        }));
      }

      return payload;
    });

    const payload = {
      title: String(this.form.controls['title'].value ?? ''),
      description: String(this.form.controls['description'].value ?? ''),
      expires_at: String(this.form.controls['expires_at'].value ?? ''),
      max_responses: Number(this.form.controls['max_responses'].value ?? 100),
      questions: questionPayloads
    };

    const request$ =
      this.isEditMode && this.surveyId
        ? this.dashboardService.updateDraft(this.surveyId, payload)
        : this.dashboardService.createDraft(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        void this.router.navigate(['/owner/dashboard']);
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  private createQuestionGroup() {
    return this.fb.group({
      question_text: ['', [Validators.required]],
      question_type: ['text', [Validators.required]],
      is_required: [true],
      options: this.fb.array([])
    });
  }

  private loadSurveyForEdit(surveyId: number): void {
    this.loadingSurvey = true;
    this.dashboardService.getSurvey(surveyId).subscribe({
      next: (response) => {
        const survey = response.data;
        if (!survey) {
          this.loadingSurvey = false;
          void this.router.navigate(['/owner/dashboard']);
          return;
        }

        if (survey.status !== 'draft') {
          this.errorState.setMessage('Only draft surveys can be edited.');
          this.loadingSurvey = false;
          void this.router.navigate(['/owner/dashboard']);
          return;
        }

        this.patchFormFromSurvey(survey);
        this.loadingSurvey = false;
      },
      error: () => {
        this.loadingSurvey = false;
        void this.router.navigate(['/owner/dashboard']);
      }
    });
  }

  private patchFormFromSurvey(survey: SurveyDetail): void {
    this.form.patchValue({
      title: survey.title ?? '',
      description: survey.description ?? '',
      expires_at: this.toDatetimeLocal(survey.expires_at),
      max_responses: survey.max_responses ?? 100
    });

    const questions = this.fb.array([this.createQuestionGroup()]);
    questions.clear();
    for (const question of survey.questions ?? []) {
      const optionsArray = this.fb.array(
        (question.options ?? []).map((option) =>
          this.fb.group({
            option_text: [option.option_text, [Validators.required]]
          })
        )
      );

      questions.push(
        this.fb.group({
          question_text: [question.question_text, [Validators.required]],
          question_type: [question.question_type, [Validators.required]],
          is_required: [Boolean(question.is_required)],
          options: optionsArray
        })
      );
    }

    if (questions.length === 0) {
      questions.push(this.createQuestionGroup());
    }

    this.form.setControl('questions', questions);
  }

  private toDatetimeLocal(raw: string | null): string {
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (value: number) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
