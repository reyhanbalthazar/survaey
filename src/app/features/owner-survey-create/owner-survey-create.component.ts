import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { OwnerDashboardService } from '../../core/services/owner-dashboard.service';
import { ErrorStateService } from '../../core/services/error-state.service';
import { OwnerSurveyQuestionPayload } from '../../models/owner.model';

@Component({
  selector: 'app-owner-survey-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './owner-survey-create.component.html',
  styleUrl: './owner-survey-create.component.css'
})
export class OwnerSurveyCreateComponent {
  private readonly fb = inject(FormBuilder);

  saving = false;

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

  get questions(): FormArray {
    return this.form.get('questions') as FormArray;
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

  optionsAt(index: number): FormArray {
    return this.questions.at(index).get('options') as FormArray;
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
    const options = group.get('options') as FormArray;

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

    this.dashboardService
      .createDraft({
        title: String(this.form.controls.title.value ?? ''),
        description: String(this.form.controls.description.value ?? ''),
        expires_at: String(this.form.controls.expires_at.value ?? ''),
        max_responses: Number(this.form.controls.max_responses.value ?? 100),
        questions: questionPayloads
      })
      .subscribe({
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
}
