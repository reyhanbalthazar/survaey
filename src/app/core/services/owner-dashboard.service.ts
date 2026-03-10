import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import {
  OwnerSurvey,
  OwnerSurveyQuestionPayload,
  OwnerSurveyResponseDetail,
  OwnerSurveyResponseItem,
  OwnerWallet,
  OwnerWalletTransaction
} from '../../models/owner.model';
import { SurveyDetail } from '../../models/survey.model';

@Injectable({ providedIn: 'root' })
export class OwnerDashboardService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getWallet(): Observable<ApiResponse<OwnerWallet>> {
    return this.http.get<ApiResponse<OwnerWallet>>(`${this.baseUrl}/user/wallet`);
  }

  getWalletTransactions(): Observable<ApiResponse<OwnerWalletTransaction[]>> {
    return this.http.get<ApiResponse<OwnerWalletTransaction[]>>(`${this.baseUrl}/user/wallet/transactions`);
  }

  topup(amountCoin: number, notes?: string): Observable<{ success: boolean; message: string; balance_coin: number }> {
    return this.http.post<{ success: boolean; message: string; balance_coin: number }>(`${this.baseUrl}/user/wallet/topup`, {
      amount_coin: amountCoin,
      notes: notes ?? 'manual topup'
    });
  }

  getSurveys(): Observable<ApiResponse<OwnerSurvey[]>> {
    return this.http.get<ApiResponse<OwnerSurvey[]>>(`${this.baseUrl}/user/surveys`);
  }

  createDraft(payload: {
    title: string;
    description?: string;
    expires_at: string;
    max_responses: number;
    questions: OwnerSurveyQuestionPayload[];
  }): Observable<ApiResponse<SurveyDetail>> {
    return this.http.post<ApiResponse<SurveyDetail>>(`${this.baseUrl}/user/surveys`, payload);
  }

  publishSurvey(surveyId: number): Observable<ApiResponse<OwnerSurvey>> {
    return this.http.post<ApiResponse<OwnerSurvey>>(`${this.baseUrl}/user/surveys/${surveyId}/publish`, {});
  }

  getResponses(surveyId: number): Observable<ApiResponse<OwnerSurveyResponseItem[]>> {
    return this.http.get<ApiResponse<OwnerSurveyResponseItem[]>>(`${this.baseUrl}/user/surveys/${surveyId}/responses`);
  }

  getResponseDetail(surveyId: number, responseId: number): Observable<ApiResponse<OwnerSurveyResponseDetail>> {
    return this.http.get<ApiResponse<OwnerSurveyResponseDetail>>(
      `${this.baseUrl}/user/surveys/${surveyId}/responses/${responseId}`
    );
  }
}

