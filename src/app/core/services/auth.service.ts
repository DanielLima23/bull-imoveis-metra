import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AuthToken, AuthUser, LoginRequest } from '../models/auth.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  private readonly userState = signal<AuthUser | null>(this.storage.user);
  private refreshRequest$: Observable<AuthToken | null> | null = null;

  readonly currentUser: Signal<AuthUser | null> = computed(() => this.userState());
  readonly isAuthenticated = computed(() => !!this.storage.accessToken && !!this.userState());

  bootstrapSession(): Observable<AuthUser | null> {
    if (!this.storage.accessToken) {
      return of(null);
    }

    if (this.userState()) {
      return of(this.userState());
    }

    return this.http.get<ApiResponse<AuthUser>>(`${environment.apiUrl}/auth/me`).pipe(
      map((response) => response.data),
      tap((user) => {
        this.storage.user = user;
        this.userState.set(user);
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  login(payload: LoginRequest): Observable<AuthToken> {
    return this.http
      .post<ApiResponse<AuthToken>>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(
        map((response) => response.data),
        tap((token) => this.persistSession(token))
      );
  }

  refresh(): Observable<AuthToken | null> {
    if (!this.storage.refreshToken) {
      return of(null);
    }

    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.http
      .post<ApiResponse<AuthToken>>(`${environment.apiUrl}/auth/refresh`, { refreshToken: this.storage.refreshToken })
      .pipe(
        map((response) => response.data),
        tap((token) => this.persistSession(token)),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        tap(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay(1)
      );

    return this.refreshRequest$;
  }

  logout(): void {
    const refreshToken = this.storage.refreshToken;

    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({
        next: () => undefined,
        error: () => undefined
      });
    }

    this.clearSession();
    void this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return this.storage.accessToken;
  }

  hasRole(roles: readonly string[]): boolean {
    const user = this.userState();
    return !!user && roles.includes(user.role);
  }

  private persistSession(token: AuthToken): void {
    this.storage.accessToken = token.accessToken;
    this.storage.refreshToken = token.refreshToken;
    this.storage.user = token.user;
    this.userState.set(token.user);
  }

  private clearSession(): void {
    this.storage.clear();
    this.userState.set(null);
  }
}
