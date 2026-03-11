export interface OwnerUser {
  id: number;
  name: string;
  email: string;
  survey_access_status: 'active' | 'blocked_insufficient_coin' | string;
}

export interface OwnerLoginResponse {
  success: boolean;
  token: string;
  user: OwnerUser;
  message?: string;
}

export interface OwnerWallet {
  balance_coin: number;
  survey_access_status: string;
}

export interface OwnerWalletTransaction {
  id: number;
  direction: 'debit' | 'credit';
  amount_coin: number;
  reason: string;
  status: 'success' | 'failed';
  balance_before: number;
  balance_after: number;
  created_at: string;
  notes?: string | null;
}

export interface OwnerSurvey {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'closed' | 'expired' | 'suspended' | string;
  public_token: string | null;
  published_at: string | null;
  expires_at: string | null;
  max_responses: number;
  response_count: number;
}

export interface OwnerSurveyQuestionPayload {
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text';
  is_required: boolean;
  sort_order: number;
  options?: Array<{
    option_text: string;
    sort_order: number;
  }>;
}

export interface OwnerSurveyResponseItem {
  id: number;
  respondent_email: string;
  submitted_at: string | null;
  status: string;
  answers?: Array<{
    id: number;
    user_survey_question_id: number;
    user_survey_option_id: number | null;
    answer_text: string | null;
  }>;
}

export interface OwnerSurveyResponseDetail {
  id: number;
  respondent_email: string;
  submitted_at: string | null;
  status: string;
  answers: Array<{
    id: number;
    user_survey_question_id: number;
    user_survey_option_id: number | null;
    answer_text: string | null;
  }>;
}

export interface OwnerSurveyVoucher {
  id: number;
  user_id: number;
  user_survey_id: number;
  user_survey_response_id: number;
  voucher_type: string;
  voucher_code: string;
  status: 'issued' | 'redeemed' | string;
  issued_at: string;
  redeemed_at: string | null;
  redeem_notes?: string | null;
  survey?: {
    id: number;
    title: string;
  } | null;
  response?: {
    id: number;
    respondent_email: string;
  } | null;
}
