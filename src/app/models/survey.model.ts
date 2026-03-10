export interface Question {
  id: number;
  user_survey_id: number;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text' | string;
  options: SurveyOption[];
  is_required: boolean;
  sort_order: number;
}

export interface SurveyOption {
  id: number;
  user_survey_question_id: number;
  option_text: string;
  sort_order: number;
}

export interface SurveyDetail {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: string;
  public_token: string | null;
  expires_at: string | null;
  max_responses: number;
  response_count: number;
  questions: Question[];
}
