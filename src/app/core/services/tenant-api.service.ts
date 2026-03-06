import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResult, TenantDto } from '../models/domain.model';
import { ApiRequestOptions, HttpApiService } from './http-api.service';

export interface TenantPayload {
  name: string;
  documentNumber: string;
  email: string;
  phone: string;
}

export interface TenantListOptions extends ApiRequestOptions {
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TenantApiService {
  constructor(private readonly api: HttpApiService) {}

  list(search = '', page = 1, pageSize = 80, options?: TenantListOptions): Observable<PagedResult<TenantDto>> {
    return this.api.get<PagedResult<TenantDto>>('/locatarios', { search, page, pageSize, active: options?.active }, options);
  }

  getById(id: string, options?: ApiRequestOptions): Observable<TenantDto> {
    return this.api.get<TenantDto>(`/locatarios/${id}`, undefined, options);
  }

  create(payload: TenantPayload): Observable<TenantDto> {
    return this.api.post<TenantDto>('/locatarios', payload);
  }

  update(id: string, payload: TenantPayload & { isActive: boolean }): Observable<TenantDto> {
    return this.api.put<TenantDto>(`/locatarios/${id}`, payload);
  }
}
