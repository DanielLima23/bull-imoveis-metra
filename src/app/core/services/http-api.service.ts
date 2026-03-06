import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { SKIP_GLOBAL_LOADING } from '../http/http-context.tokens';

export interface ApiRequestOptions {
  silent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class HttpApiService {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>, options?: ApiRequestOptions): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${environment.apiUrl}${path}`, {
        params: this.removeEmpty(params) as Record<string, string>,
        context: this.buildContext(options)
      })
      .pipe(map((response) => response.data));
  }

  post<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${environment.apiUrl}${path}`, body, { context: this.buildContext(options) }).pipe(map((response) => response.data));
  }

  put<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${environment.apiUrl}${path}`, body, { context: this.buildContext(options) }).pipe(map((response) => response.data));
  }

  patch<T>(path: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${environment.apiUrl}${path}`, body, { context: this.buildContext(options) }).pipe(map((response) => response.data));
  }

  private buildContext(options?: ApiRequestOptions): HttpContext {
    let context = new HttpContext();
    if (options?.silent) {
      context = context.set(SKIP_GLOBAL_LOADING, true);
    }

    return context;
  }

  private removeEmpty(params?: Record<string, string | number | boolean | undefined | null>): Record<string, string> | undefined {
    if (!params) {
      return undefined;
    }

    const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
    return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]));
  }
}
