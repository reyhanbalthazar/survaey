import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { SurveyService } from '../../core/services/survey.service';
import { ResponseService } from '../../core/services/response.service';
import { ErrorStateService } from '../../core/services/error-state.service';
import { Question, SurveyDetail } from '../../models/survey.model';
import { SubmitSurveyPayload } from '../../models/response.model';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './survey.component.html',
  styleUrl: './survey.component.css'
})
export class SurveyComponent implements OnInit, OnDestroy {
  survey: SurveyDetail | null = null;
  email = '';
  publicToken = '';

  loadingSurvey = true;
  submitting = false;
  submitted = false;

  readonly form = new FormGroup({});
  private readonly popStateHandler = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.history.pushState(null, '', window.location.href);
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly surveyService: SurveyService,
    private readonly responseService: ResponseService,
    private readonly errorState: ErrorStateService
  ) {}

  ngOnInit(): void {
    this.lockBackNavigation();

    this.publicToken = this.route.snapshot.paramMap.get('publicToken') ?? '';
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';

    if (!this.email) {
      void this.router.navigate(['/survey', this.publicToken]);
      return;
    }

    this.surveyService.getPublicSurvey(this.publicToken).subscribe({
      next: (response) => {
        this.survey = response.data ?? null;
        this.buildForm();
        this.loadingSurvey = false;
      },
      error: () => {
        this.loadingSurvey = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.unlockBackNavigation();
  }

  controlFor(questionId: number): FormControl {
    return this.form.get(String(questionId)) as FormControl;
  }

  toggleCheckbox(questionId: number, optionId: number): void {
    const control = this.controlFor(questionId);
    const current = Array.isArray(control.value) ? [...(control.value as number[])] : [];
    const index = current.indexOf(optionId);

    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(optionId);
    }

    control.setValue(current);
    control.markAsTouched();
  }

  isChecked(questionId: number, optionId: number): boolean {
    const value = this.controlFor(questionId).value;
    return Array.isArray(value) && (value as number[]).includes(optionId);
  }

  get requiredQuestions(): Question[] {
    return (this.survey?.questions ?? []).filter((q) => q.is_required !== false);
  }

  get answeredRequiredCount(): number {
    return this.requiredQuestions.filter((question) => this.hasAnswer(question)).length;
  }

  get progressPercent(): number {
    const total = this.requiredQuestions.length;
    if (total === 0) {
      return 100;
    }
    return Math.round((this.answeredRequiredCount / total) * 100);
  }

  hasError(question: Question): boolean {
    const control = this.controlFor(question.id);
    return control.invalid && (control.touched || control.dirty);
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

  submit(): void {
    this.errorState.clear();

    if (!this.survey || this.form.invalid || this.submitting || this.submitted) {
      this.form.markAllAsTouched();
      return;
    }

    const answers = this.survey.questions
      .filter((question) => this.hasAnswer(question))
      .map((question) => this.mapAnswer(question));

    const payload: SubmitSurveyPayload = {
      respondent_email: this.email,
      answers
    };

    this.submitting = true;

    this.responseService.submitSurvey(this.publicToken, payload).subscribe({
      next: (response) => {
        this.submitting = false;
        this.submitted = true;
        const voucherCode = response.data?.voucher_code ?? response.voucher_code ?? '';

        void this.router.navigate(['/survey', this.publicToken, 'done'], {
          queryParams: {
            email: this.email,
            voucher: voucherCode || null
          }
        });
      },
      error: () => {
        this.submitting = false;
      }
    });
  }

  private buildForm(): void {
    for (const question of this.survey?.questions ?? []) {
      const validators = this.getQuestionValidators(question);
      const initialValue = this.isMultipleChoiceType(question) ? [] : '';
      this.form.addControl(String(question.id), new FormControl(initialValue, validators));
    }
  }

  private getQuestionValidators(question: Question): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (question.is_required) {
      validators.push(this.isMultipleChoiceType(question) ? this.checkboxRequiredValidator() : Validators.required);
    }

    return validators;
  }

  private checkboxRequiredValidator(): ValidatorFn {
    return (control) => {
      const value = control.value;
      return Array.isArray(value) && value.length > 0 ? null : { required: true };
    };
  }

  private hasAnswer(question: Question): boolean {
    const value = this.controlFor(question.id).value;
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return String(value ?? '').trim().length > 0;
  }

  private mapAnswer(question: Question): SubmitSurveyPayload['answers'][number] {
    const value = this.controlFor(question.id).value;
    const normalizedType = this.normalizeType(question.question_type);

    if (normalizedType === 'single_choice') {
      return {
        question_id: question.id,
        option_id: Number(value)
      };
    }

    if (normalizedType === 'multiple_choice') {
      return {
        question_id: question.id,
        option_ids: Array.isArray(value) ? (value as number[]).map((v) => Number(v)) : []
      };
    }

    return {
      question_id: question.id,
      answer_text: String(value ?? '')
    };
  }

  private normalizeType(type: string | null | undefined): string {
    return String(type ?? '')
      .trim()
      .toLowerCase();
  }

  private lockBackNavigation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', this.popStateHandler);
  }

  private unlockBackNavigation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('popstate', this.popStateHandler);
  }
}
