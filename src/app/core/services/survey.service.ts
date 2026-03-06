import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { Organization } from '../../models/organization.model';
import { SurveyDetail, SurveySummary } from '../../models/survey.model';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(`${this.baseUrl}/organizations`);
  }

  getSurveysByOrganization(slug: string): Observable<ApiResponse<SurveySummary[]>> {
    return this.http.get<ApiResponse<SurveySummary[]>>(`${this.baseUrl}/organizations/${slug}/surveys`);
  }

  getSurvey(slug: string, surveyCode: string): Observable<ApiResponse<SurveyDetail>> {
    return this.http.get<ApiResponse<SurveyDetail>>(`${this.baseUrl}/organizations/${slug}/surveys/${surveyCode}`);
  }

  checkEmailUnique(surveyId: number, email: string): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/check-email`, {
      survey_id: surveyId,
      email
    });
  }
}
