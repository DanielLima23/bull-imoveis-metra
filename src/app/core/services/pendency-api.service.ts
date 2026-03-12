import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpApiService } from './http-api.service';
import { PagedResult, PendencyDto, PendencyTypeDto } from '../models/domain.model';

export interface PendencyPayload {
  propertyId: string;
  pendencyTypeId: string;
  title: string;
  description?: string;
  dueAtUtc: string;
}

export interface PendencyUpdatePayload {
  title: string;
  description?: string;
  dueAtUtc: string;
}

export interface PendencyTypePayload {
  code?: string;
  name: string;
  description?: string;
  defaultSlaDays: number;
}

export interface PendencyListFilters extends Record<string, string | number | boolean | undefined> {
  propertyId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class PendencyApiService {
  constructor(private readonly api: HttpApiService) {}

  listTypes(): Observable<PendencyTypeDto[]> {
    return this.api.get<PendencyTypeDto[]>('/pendencias/tipos');
  }

  createType(payload: PendencyTypePayload): Observable<PendencyTypeDto> {
    return this.api.post<PendencyTypeDto>('/pendencias/tipos', payload);
  }

  updateType(id: string, payload: PendencyTypePayload): Observable<PendencyTypeDto> {
    return this.api.put<PendencyTypeDto>(`/pendencias/tipos/${id}`, payload);
  }

  list(filters: PendencyListFilters = {}): Observable<PagedResult<PendencyDto>> {
    return this.api.get<PagedResult<PendencyDto>>('/pendencias', filters);
  }

  getById(id: string): Observable<PendencyDto> {
    return this.api.get<PendencyDto>(`/pendencias/${id}`);
  }

  create(payload: PendencyPayload): Observable<PendencyDto> {
    return this.api.post<PendencyDto>('/pendencias', payload);
  }

  update(id: string, payload: PendencyUpdatePayload): Observable<PendencyDto> {
    return this.api.put<PendencyDto>(`/pendencias/${id}`, payload);
  }

  resolve(id: string): Observable<PendencyDto> {
    return this.api.patch<PendencyDto>(`/pendencias/${id}/resolver`, {});
  }
}
