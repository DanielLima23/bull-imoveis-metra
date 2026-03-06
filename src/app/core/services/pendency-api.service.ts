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

@Injectable({ providedIn: 'root' })
export class PendencyApiService {
  constructor(private readonly api: HttpApiService) {}

  listTypes(): Observable<PendencyTypeDto[]> {
    return this.api.get<PendencyTypeDto[]>('/pendencias/tipos');
  }

  list(status = '', page = 1, pageSize = 100, propertyId = ''): Observable<PagedResult<PendencyDto>> {
    return this.api.get<PagedResult<PendencyDto>>('/pendencias', { status, page, pageSize, propertyId });
  }

  getById(id: string): Observable<PendencyDto> {
    return this.api.get<PendencyDto>(`/pendencias/${id}`);
  }

  create(payload: PendencyPayload): Observable<PendencyDto> {
    return this.api.post<PendencyDto>('/pendencias', payload);
  }

  update(id: string, payload: Omit<PendencyPayload, 'propertyId' | 'pendencyTypeId'>): Observable<PendencyDto> {
    return this.api.put<PendencyDto>(`/pendencias/${id}`, payload);
  }

  resolve(id: string): Observable<PendencyDto> {
    return this.api.patch<PendencyDto>(`/pendencias/${id}/resolver`, {});
  }
}

