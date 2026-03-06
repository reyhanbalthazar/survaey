export interface Question {
  id: number;
  survey_id: number;
  question_text: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'rating' | string;
  options: string[] | number[] | null;
  is_required?: boolean;
  placeholder?: string | null;
  help_text?: string | null;
  validation_rules?: Record<string, string | number | boolean> | null;
  order: number;
}

export interface SurveySummary {
  id: number;
  organization_id: number;
  title: string;
  survey_code: string;
  active: boolean;
  created_at: string;
}

export interface SurveyDetail {
  id: number;
  organization_id: number;
  title: string;
  survey_code: string;
  active: boolean;
  questions: Question[];
}
