export interface SubmitSurveyPayload {
  survey_id: number;
  email: string;
  answers: Array<{
    question_id: number;
    answer: string;
  }>;
}
