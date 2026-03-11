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
  OwnerSurveyVoucher,
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

  createTopupCheckout(payload: {
    amount_coin: number;
    payer_email?: string;
    description?: string;
    success_redirect_url?: string;
    failure_redirect_url?: string;
  }): Observable<{
    success: boolean;
    message: string;
    data?: {
      payment_order_id: number;
      order_code: string;
      provider_reference: string | null;
      checkout_url: string | null;
      status: string;
      amount_coin: number;
      currency: string;
      expires_at: string | null;
    };
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data?: {
        payment_order_id: number;
        order_code: string;
        provider_reference: string | null;
        checkout_url: string | null;
        status: string;
        amount_coin: number;
        currency: string;
        expires_at: string | null;
      };
    }>(`${this.baseUrl}/user/wallet/topup/checkout`, payload);
  }

  reconcileTopup(orderCode: string): Observable<{ success: boolean; message: string; data?: { order_code: string; status: string } }> {
    return this.http.post<{ success: boolean; message: string; data?: { order_code: string; status: string } }>(
      `${this.baseUrl}/user/wallet/topup/reconcile`,
      { order_code: orderCode }
    );
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

  getSurvey(surveyId: number): Observable<ApiResponse<SurveyDetail>> {
    return this.http.get<ApiResponse<SurveyDetail>>(`${this.baseUrl}/user/surveys/${surveyId}`);
  }

  updateDraft(
    surveyId: number,
    payload: {
      title: string;
      description?: string;
      expires_at: string;
      max_responses: number;
      questions: OwnerSurveyQuestionPayload[];
    }
  ): Observable<ApiResponse<SurveyDetail>> {
    return this.http.put<ApiResponse<SurveyDetail>>(`${this.baseUrl}/user/surveys/${surveyId}`, payload);
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

  getVouchers(params?: { status?: 'all' | 'issued' | 'redeemed'; search?: string }): Observable<ApiResponse<OwnerSurveyVoucher[]>> {
    return this.http.get<ApiResponse<OwnerSurveyVoucher[]>>(`${this.baseUrl}/user/vouchers`, {
      params: {
        status: params?.status ?? 'all',
        search: params?.search ?? ''
      }
    });
  }

  redeemVoucher(voucherId: number, redeemNotes?: string): Observable<ApiResponse<OwnerSurveyVoucher>> {
    return this.http.post<ApiResponse<OwnerSurveyVoucher>>(`${this.baseUrl}/user/vouchers/${voucherId}/redeem`, {
      redeem_notes: redeemNotes ?? ''
    });
  }
}
