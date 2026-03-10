import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { SubmitSurveyPayload } from '../../models/response.model';

@Injectable({ providedIn: 'root' })
export class ResponseService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  submitSurvey(publicToken: string, payload: SubmitSurveyPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/public-surveys/${publicToken}/submit`, payload);
  }
}
