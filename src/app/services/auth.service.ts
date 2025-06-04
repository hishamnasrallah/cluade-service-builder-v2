// services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    // Load token from localStorage on service initialization
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      this.tokenSubject.next(savedToken);
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const baseUrl = this.configService.getBaseUrl();
    if (!baseUrl) {
      return throwError(() => new Error('Base URL not configured'));
    }

    return this.http.post<LoginResponse>(`${baseUrl}/auth/login/`, credentials)
      .pipe(
        tap(response => {
          if (response.access) {
            this.tokenSubject.next(response.access);
            localStorage.setItem('access_token', response.access);
            if (response.refresh) {
              localStorage.setItem('refresh_token', response.refresh);
            }
          }
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    this.tokenSubject.next(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    const baseUrl = this.configService.getBaseUrl();

    if (!refreshToken || !baseUrl) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<LoginResponse>(`${baseUrl}/auth/token/refresh/`, {
      refresh: refreshToken
    }).pipe(
      tap(response => {
        if (response.access) {
          this.tokenSubject.next(response.access);
          localStorage.setItem('access_token', response.access);
        }
      })
    );
  }
}
