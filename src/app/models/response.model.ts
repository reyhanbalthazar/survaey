export interface SubmitSurveyPayload {
  respondent_email: string;
  answers: Array<{
    question_id: number;
    answer_text?: string;
    option_id?: number;
    option_ids?: number[];
  }>;
}

export interface SubmitSurveyResult {
  voucher_code?: string;
}
