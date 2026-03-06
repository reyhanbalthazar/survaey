import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SurveyService } from '../../core/services/survey.service';
import { ResponseService } from '../../core/services/response.service';
import { ErrorStateService } from '../../core/services/error-state.service';
import { Question, SurveyDetail } from '../../models/survey.model';
import { SubmitSurveyPayload } from '../../models/response.model';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './survey.component.html',
  styleUrl: './survey.component.css'
})
export class SurveyComponent implements OnInit {
  survey: SurveyDetail | null = null;
  email = '';
  slug = '';
  surveyCode = '';

  loadingSurvey = true;
  submitting = false;
  submitted = false;

  readonly form = new FormGroup({});

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly surveyService: SurveyService,
    private readonly responseService: ResponseService,
    private readonly errorState: ErrorStateService
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.surveyCode = this.route.snapshot.paramMap.get('surveyCode') ?? '';
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';

    if (!this.email) {
      void this.router.navigate(['/enter-email', this.slug]);
      return;
    }

    this.surveyService.getSurvey(this.slug, this.surveyCode).subscribe({
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

  controlFor(questionId: number): FormControl {
    return this.form.get(String(questionId)) as FormControl;
  }

  toggleCheckbox(questionId: number, option: string): void {
    const control = this.controlFor(questionId);
    const current = Array.isArray(control.value) ? [...control.value] : [];
    const index = current.indexOf(option);

    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(option);
    }

    control.setValue(current);
    control.markAsTouched();
  }

  isChecked(questionId: number, option: string): boolean {
    const value = this.controlFor(questionId).value;
    return Array.isArray(value) && value.includes(option);
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
    return this.normalizeType(question.type) === 'text';
  }

  isTextareaType(question: Question): boolean {
    return this.normalizeType(question.type) === 'textarea';
  }

  isRatingType(question: Question): boolean {
    return this.normalizeType(question.type) === 'rating';
  }

  isCheckboxType(question: Question): boolean {
    const type = this.normalizeType(question.type);
    return type === 'checkbox' || type === 'multiple_select' || type === 'multi_select';
  }

  isSingleChoiceType(question: Question): boolean {
    const type = this.normalizeType(question.type);
    if (['radio', 'multiple_choice', 'yes_no', 'single_choice'].includes(type)) {
      return true;
    }

    if (this.isRatingType(question) || this.isCheckboxType(question)) {
      return false;
    }

    return Array.isArray(question.options) && question.options.length > 0;
  }

  submit(): void {
    this.errorState.clear();

    if (!this.survey || this.form.invalid || this.submitting || this.submitted) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: SubmitSurveyPayload = {
      survey_id: this.survey.id,
      email: this.email,
      answers: this.survey.questions.map((question) => ({
        question_id: question.id,
        answer: this.mapAnswer(question.id)
      }))
    };

    this.submitting = true;

    this.responseService.submitSurvey(payload).subscribe({
      next: (response) => {
        this.submitting = false;
        this.submitted = true;

        void this.router.navigate(['/thank-you'], {
          queryParams: {
            email: this.email,
            voucher: response.voucher_code ?? ''
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
      const initialValue = this.isCheckboxType(question) ? [] : '';
      this.form.addControl(String(question.id), new FormControl(initialValue, validators));
    }
  }

  private getQuestionValidators(question: Question): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (question.is_required !== false) {
      validators.push(this.isCheckboxType(question) ? this.checkboxRequiredValidator() : Validators.required);
    }

    const rules = question.validation_rules;
    if (!rules) {
      return validators;
    }

    if (typeof rules['min'] === 'number') {
      validators.push(Validators.min(rules['min']));
    }

    if (typeof rules['max'] === 'number') {
      validators.push(Validators.max(rules['max']));
    }

    if (typeof rules['minLength'] === 'number') {
      validators.push(Validators.minLength(rules['minLength']));
    }

    if (typeof rules['maxLength'] === 'number') {
      validators.push(Validators.maxLength(rules['maxLength']));
    }

    if (typeof rules['pattern'] === 'string') {
      validators.push(Validators.pattern(rules['pattern']));
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

  private mapAnswer(questionId: number): string {
    const value = this.controlFor(questionId).value;

    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    return String(value ?? '');
  }

  private normalizeType(type: string | null | undefined): string {
    return String(type ?? '')
      .trim()
      .toLowerCase();
  }
}
