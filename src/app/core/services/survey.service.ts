import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/api-response.model';
import { Organization } from '../../models/organization.model';
import { SurveyDetail } from '../../models/survey.model';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getOrganizations(): Observable<ApiResponse<Organization[]>> {
    return this.http.get<ApiResponse<Organization[]>>(`${this.baseUrl}/organizations`);
  }

  getPublicSurvey(publicToken: string): Observable<ApiResponse<SurveyDetail>> {
    return this.http.get<ApiResponse<SurveyDetail>>(`${this.baseUrl}/public-surveys/${publicToken}`);
  }
}
