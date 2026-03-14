import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PartyDto, PagedResult } from '../models/domain.model';
import { ApiRequestOptions, HttpApiService } from './http-api.service';

export interface PartyPayload {
  kind?: string;
  name?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  oab?: string;
  notes?: string;
}

export interface PartyUpdatePayload extends PartyPayload {
  isActive: boolean;
}

export interface PartyListFilters extends Record<string, string | number | boolean | string[] | undefined> {
  search?: string;
  kind?: string | string[];
  active?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class PartyApiService {
  constructor(private readonly api: HttpApiService) {}

  list(filters: PartyListFilters = {}, options?: ApiRequestOptions): Observable<PagedResult<PartyDto>> {
    return this.api.get<PagedResult<PartyDto>>('/pessoas', filters, options);
  }

  getById(id: string, options?: ApiRequestOptions): Observable<PartyDto> {
    return this.api.get<PartyDto>(`/pessoas/${id}`, undefined, options);
  }

  create(payload: PartyPayload): Observable<PartyDto> {
    return this.api.post<PartyDto>('/pessoas', payload);
  }

  update(id: string, payload: PartyUpdatePayload): Observable<PartyDto> {
    return this.api.put<PartyDto>(`/pessoas/${id}`, payload);
  }

  delete(id: string): Observable<{ message?: string }> {
    return this.api.delete<{ message?: string }>(`/pessoas/${id}`);
  }
}
