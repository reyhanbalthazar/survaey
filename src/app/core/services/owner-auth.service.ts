import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { OwnerLoginResponse, OwnerUser } from '../../models/owner.model';

@Injectable({ providedIn: 'root' })
export class OwnerAuthService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly tokenKey = 'owner_access_token';
  private readonly userKey = 'owner_user_profile';

  constructor(private readonly http: HttpClient) {}

  register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/user-auth/register`, {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation
    });
  }

  verifyEmail(token: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/user-auth/verify-email`, {
      token
    });
  }

  resendVerification(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/user-auth/resend-verification`, {
      email
    });
  }

  login(email: string, password: string): Observable<OwnerUser> {
    return this.http
      .post<OwnerLoginResponse>(`${this.baseUrl}/user-auth/login`, { email, password })
      .pipe(
        tap((response) => {
          if (!this.hasStorage()) {
            return;
          }

          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.userKey, JSON.stringify(response.user));
        }),
        map((response) => response.user)
      );
  }

  logout(): void {
    if (!this.hasStorage()) {
      return;
    }

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getToken(): string {
    if (!this.hasStorage()) {
      return '';
    }

    return localStorage.getItem(this.tokenKey) ?? '';
  }

  isAuthenticated(): boolean {
    return this.getToken().length > 0;
  }

  getCurrentUser(): OwnerUser | null {
    if (!this.hasStorage()) {
      return null;
    }

    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as OwnerUser;
    } catch {
      return null;
    }
  }

  private hasStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }
}
